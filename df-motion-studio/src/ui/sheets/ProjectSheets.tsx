import React, { useRef, useState } from 'react';
import { useStudio } from '../../store/useStudio';
import { ASPECT_SIZE, parseProject, type Aspect } from '../../schema/project';
import { createBlankProject, createSampleProject } from '../../schema/defaults';
import { buildClaudePayload, extractProject, summarizeChanges } from '../../lib/claude';
import { copyText, downloadText, readText } from '../../lib/clipboard';
import { Sheet } from '../Sheet';
import { Icon } from '../Icon';
import { toast } from '../Chrome';

const fileName = (name: string, ext: string) => `${name.trim().replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-').toLowerCase() || 'project'}.${ext}`;

// ---------- Claude ----------
export function ClaudeSheet() {
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const apply = (raw: string) => {
    const s = useStudio.getState();
    const r = extractProject(raw, s.project);
    if (!r.ok) { setErrors(r.errors); return; }
    const summary = summarizeChanges(s.project, r.project);
    s.replaceProject(r.project, summary);
    s.openSheet('none');
    setText(''); setErrors([]);
  };
  const pasteFromClipboard = async () => {
    const t = await readText();
    if (t) { setText(t); apply(t); } else toast('Clipboard access was blocked. Paste into the box instead.');
  };
  const copyProject = async () => {
    const ok = await copyText(buildClaudePayload(useStudio.getState().project));
    toast(ok ? 'Project copied. Paste it into your chat with Claude.' : 'Copy was blocked by the browser.');
  };
  return (
    <Sheet title="Work with Claude">
      <p className="hint" style={{ marginBottom: 12 }}>
        Claude edits the same project.json this editor uses. Copy the project, ask for a change in chat, then paste the reply here.
        Nothing is sent anywhere by this app.
      </p>
      <div className="row" style={{ marginBottom: 14 }}>
        <button className="btn" onClick={copyProject}><Icon name="copy" />Copy project for Claude</button>
        <button className="btn" onClick={pasteFromClipboard}><Icon name="paste" />Paste from clipboard</button>
      </div>
      <label className="field-label" htmlFor="claude-reply"><span>Claude's reply</span></label>
      <textarea id="claude-reply" className="paste" value={text} onChange={e => { setText(e.target.value); setErrors([]); }}
        placeholder="Paste the whole reply or just the json block" spellCheck={false} />
      {errors.length ? <ul className="errors" role="alert">{errors.map(e => <li key={e}>{e}</li>)}</ul> : null}
      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn primary" disabled={!text.trim()} onClick={() => apply(text)}>Apply changes</button>
        <span className="hint">You can undo this in one step.</span>
      </div>
    </Sheet>
  );
}

// ---------- project ----------
export function ProjectSheet() {
  const fileRef = useRef<HTMLInputElement>(null);
  const project = useStudio(s => s.project);
  const [errors, setErrors] = useState<string[]>([]);
  const replace = (p: ReturnType<typeof createSampleProject>, msg: string) => {
    useStudio.getState().replaceProject(p);
    useStudio.getState().openSheet('none');
    toast(msg);
  };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 60 * 1024 * 1024) { setErrors(['That file is larger than 60 MB.']); return; }
    try {
      const r = parseProject(JSON.parse(await f.text()));
      if (!r.ok) { setErrors(r.errors); return; }
      replace(r.project, `Opened ${r.project.name}`);
    } catch { setErrors(['That file is not valid JSON.']); }
  };
  return (
    <Sheet title="Project">
      <div className="field">
        <label className="field-label" htmlFor="pname"><span>Name</span></label>
        <input id="pname" className="text-input" value={project.name} maxLength={120}
          onChange={e => useStudio.getState().edit(p => { p.name = e.target.value || 'Untitled'; }, 'rename')} />
      </div>
      <button className="list-btn" onClick={() => downloadText(fileName(project.name, 'json'), JSON.stringify(project, null, 2))}>
        <Icon name="download" /><span>Export project.json<small>Save a copy you can reopen or render on your computer</small></span>
      </button>
      <button className="list-btn" onClick={() => fileRef.current?.click()}>
        <Icon name="upload" /><span>Import project.json<small>Replaces the current project. You can undo it.</small></span>
      </button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
      <button className="list-btn" onClick={() => replace(createSampleProject(), 'Loaded the studio reveal sample')}>
        <Icon name="sparkle" /><span>Load the sample<small>A six second studio reveal of the DF monogram</small></span>
      </button>
      <button className="list-btn" onClick={() => replace(createBlankProject(), 'Started a blank project')}>
        <Icon name="file" /><span>New blank project<small>Keeps the studio lights, removes all layers</small></span>
      </button>
      <QualityRow />
      {errors.length ? <ul className="errors" role="alert">{errors.map(e => <li key={e}>{e}</li>)}</ul> : null}
    </Sheet>
  );
}

function QualityRow() {
  const quality = useStudio(s => s.quality);
  return (
    <div className="field" style={{ marginTop: 16 }}>
      <div className="field-label"><span>Preview quality</span></div>
      <div className="seg" role="group" aria-label="Preview quality">
        <button aria-pressed={quality === 'draft'} onClick={() => useStudio.getState().setQuality('draft')}>Draft</button>
        <button aria-pressed={quality === 'full'} onClick={() => useStudio.getState().setQuality('full')}>Full</button>
      </div>
      <p className="hint">Draft lowers resolution and skips shadows and effects so playback stays smooth on a phone. Exports always use full quality.</p>
    </div>
  );
}

// ---------- export ----------
export function ExportSheet() {
  const project = useStudio(s => s.project);
  const [aspect, setAspect] = useState<Aspect>(project.aspect);
  const { width, height } = ASPECT_SIZE[aspect];
  const name = fileName(project.name, 'json');
  const cmd = `npm run render -- ${name} --aspect ${aspect}`;
  return (
    <Sheet title="Export video">
      <div className="seg" role="group" aria-label="Aspect ratio">
        {(['9:16', '1:1', '16:9'] as Aspect[]).map(a => <button key={a} aria-pressed={aspect === a} onClick={() => setAspect(a)}>{a}</button>)}
      </div>
      <p className="hint" style={{ marginBottom: 12 }}>
        MP4 renders run on your computer with Remotion: {width}×{height}, {project.fps} fps, {project.duration.toFixed(1)} s.
      </p>
      <ol className="steps">
        <li><button className="btn primary" onClick={() => downloadText(name, JSON.stringify({ ...project, aspect }, null, 2))}><Icon name="download" />Download {name}</button></li>
        <li><span>In the <span className="mono">df-motion-studio</span> folder, run:</span>
          <button className="code" onClick={async () => toast((await copyText(cmd)) ? 'Command copied' : 'Copy was blocked')} aria-label="Copy render command">{cmd}</button></li>
        <li><span>The MP4 appears in <span className="mono">out/</span>.</span></li>
      </ol>
    </Sheet>
  );
}
