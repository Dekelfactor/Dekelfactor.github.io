import React, { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { saveState, useStudio, type SheetId } from '../store/useStudio';
import type { Aspect, Project } from '../schema/project';
import { isAnimated } from '../engine/evaluate';
import { buildClaudePayload } from '../lib/claude';
import { copyText } from '../lib/clipboard';
import { Icon } from './Icon';
import { seek, togglePlay } from './player';

// ---------- toast ----------
let toastMsg: string | null = null;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
const toastSubs = new Set<() => void>();
export function toast(msg: string, ms = 2600) {
  toastMsg = msg; toastSubs.forEach(f => f());
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg = null; toastSubs.forEach(f => f()); }, ms);
}
export function Toast() {
  const msg = useSyncExternalStore(f => { toastSubs.add(f); return () => toastSubs.delete(f); }, () => toastMsg);
  return msg ? <div className="toast glass" role="status" aria-live="polite">{msg}</div> : <div className="sr-only" role="status" aria-live="polite" />;
}

// ---------- top bar ----------
const ASPECTS: Aspect[] = ['9:16', '1:1', '16:9'];
export function TopBar() {
  const name = useStudio(s => s.project.name);
  const aspect = useStudio(s => s.project.aspect);
  const canUndo = useStudio(s => s.past.length > 0);
  const canRedo = useStudio(s => s.future.length > 0);
  const { undo, redo, edit, openSheet } = useStudio.getState();
  const save = useSyncExternalStore(f => { saveState.listeners.add(f); return () => saveState.listeners.delete(f); }, () => saveState.current);
  const nextAspect = () => edit(p => { p.aspect = ASPECTS[(ASPECTS.indexOf(p.aspect) + 1) % ASPECTS.length]; });
  return (
    <header className="topbar glass">
      <button className="ib" aria-label="Project menu" onClick={() => openSheet('project')}><Icon name="menu" /></button>
      <div className="title">
        <b>{name}</b>
        <span aria-live="polite">{save === 'saving' ? 'Saving…' : save === 'error' ? 'Not saved: storage full' : 'Saved'}</span>
      </div>
      <button className="chip" aria-label={`Aspect ratio ${aspect}. Change`} onClick={nextAspect}>{aspect}</button>
      <button className="ib" aria-label="Undo" disabled={!canUndo} onClick={undo}><Icon name="undo" /></button>
      <button className="ib hide-narrow" aria-label="Redo" disabled={!canRedo} onClick={redo}><Icon name="redo" /></button>
      <button className="btn primary" onClick={() => openSheet('export')}>Export</button>
    </header>
  );
}

// ---------- tool rail ----------
export const TOOLS: { id: SheetId; icon: string; label: string }[] = [
  { id: 'timeline', icon: 'timeline', label: 'Timeline' },
  { id: 'layers', icon: 'layers', label: 'Layers' },
  { id: 'camera', icon: 'camera', label: 'Camera' },
  { id: 'light', icon: 'light', label: 'Lights' },
  { id: 'scene', icon: 'scene', label: 'Scene' },
  { id: 'effects', icon: 'fx', label: 'Effects' },
];
export function Rail() {
  const sheet = useStudio(s => s.sheet);
  const openSheet = useStudio(s => s.openSheet);
  return (
    <nav className="rail glass" aria-label="Tools">
      {TOOLS.map(t => (
        <button key={t.id} className={`ib${sheet === t.id ? ' on' : ''}`} aria-label={t.label} aria-pressed={sheet === t.id}
          onClick={() => openSheet(sheet === t.id ? 'none' : t.id)}>
          <Icon name={t.icon} />
        </button>
      ))}
    </nav>
  );
}

// ---------- scrub bar ----------
function collectKeyTimes(project: Project, layerId: string | null): number[] {
  const times = new Set<number>();
  const visit = (v: unknown) => {
    if (!v || typeof v !== 'object') return;
    if (isAnimated(v)) { v.keys.forEach(k => times.add(Math.round(k.t * 1000) / 1000)); return; }
    if (Array.isArray(v)) return;
    Object.values(v).forEach(visit);
  };
  if (layerId) visit(project.layers.find(l => l.id === layerId));
  else { visit(project.layers); visit(project.camera); visit(project.lights); }
  return [...times].sort((a, b) => a - b);
}

export function formatTime(t: number) {
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
}

export function ScrubBar() {
  const time = useStudio(s => s.time);
  const playing = useStudio(s => s.playing);
  const project = useStudio(s => s.project);
  const selectedId = useStudio(s => s.selectedId);
  const keys = useMemo(() => collectKeyTimes(project, selectedId), [project, selectedId]);
  const track = useRef<HTMLDivElement>(null);
  const d = project.duration;
  const pct = (t: number) => `${(t / d) * 100}%`;

  const scrubTo = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    seek(((clientX - r.left) / r.width) * d);
  };
  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    scrubTo(e.clientX);
  };
  const onMove = (e: React.PointerEvent) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) scrubTo(e.clientX); };
  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 1 : 1 / project.fps;
    if (e.key === 'ArrowRight') { seek(time + step); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { seek(time - step); e.preventDefault(); }
    if (e.key === 'Home') seek(0);
    if (e.key === 'End') seek(d);
  };
  return (
    <div className="scrub glass" role="group" aria-label="Playback">
      <button className="play" aria-label={playing ? 'Pause' : 'Play'} onClick={togglePlay}><Icon name={playing ? 'pause' : 'play'} /></button>
      <div className="scrub-track" ref={track} onPointerDown={onDown} onPointerMove={onMove}
        role="slider" tabIndex={0} aria-label="Playhead" aria-valuemin={0} aria-valuemax={d} aria-valuenow={Number(time.toFixed(2))}
        aria-valuetext={`${time.toFixed(2)} of ${d} seconds`} onKeyDown={onKey}>
        <div className="rail-line" />
        <div className="fill" style={{ width: pct(time) }} />
        {keys.map(k => <span key={k} className={`kf${Math.abs(k - time) < 0.5 / project.fps ? ' on' : ''}`} style={{ left: pct(k) }} />)}
        <div className="head" style={{ left: pct(time) }} />
      </div>
      <span className="tc">{formatTime(time)}</span>
    </div>
  );
}

// ---------- prompt bar (Claude) ----------
export function PromptBar() {
  const [text, setText] = useState('');
  const openSheet = useStudio(s => s.openSheet);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildClaudePayload(useStudio.getState().project, text);
    const ok = await copyText(payload);
    if (ok) {
      toast('Copied for Claude. Paste it in chat, then bring the reply back here.', 4200);
      setText('');
      openSheet('claude');
    } else {
      openSheet('claude');
      toast('Copy was blocked. Use “Copy project” in the Claude sheet.');
    }
  };
  return (
    <form className="prompt" onSubmit={submit} aria-label="Ask Claude to change the video">
      <button type="button" className="ib" aria-label="Paste Claude's reply" onClick={() => openSheet('claude')}><Icon name="paste" /></button>
      <label className="sr-only" htmlFor="prompt-input">Describe a change for Claude</label>
      <input id="prompt-input" value={text} onChange={e => setText(e.target.value)} placeholder="Describe a change for Claude" autoComplete="off" enterKeyHint="send" maxLength={1000} />
      <button type="submit" className="send" aria-label="Copy for Claude"><Icon name="send" /></button>
    </form>
  );
}

export function NoticeLine() {
  const notice = useStudio(s => s.notice);
  const issue = useStudio(s => s.safeAreaIssue);
  if (issue) return (
    <div className="notice warn glass" role="alert">
      <p>{issue.text}</p>
      <button className="btn" onClick={() => seek(issue.time)}>Show frame</button>
    </div>
  );
  if (!notice) return null;
  const [lead, ...rest] = notice.text.split('. ');
  return (
    <div className="notice glass" role="status">
      <p><b>{lead}{rest.length ? '.' : ''}</b> {rest.join('. ')}</p>
      <button className="btn" onClick={() => { useStudio.getState().replaceProject(notice.undoTo); useStudio.getState().dismissNotice(); }}>Undo</button>
      <button className="ib" aria-label="Dismiss" onClick={() => useStudio.getState().dismissNotice()}><Icon name="close" /></button>
    </div>
  );
}
