import { useRef, useState } from 'react';
import type { Asset, Layer, Project } from '../../schema/project';
import { Layer as LayerSchema } from '../../schema/project';
import { useStudio, editLayer, newId } from '../../store/useStudio';
import { importFile, LIMITS } from '../../lib/assetStore';
import { applyPreset, PRESETS } from '../../engine/presets';
import { Sheet } from '../Sheet';
import { Icon } from '../Icon';
import { toast } from '../Chrome';
import { ColorProp, NumberProp, Seg, Toggle, Vec3Prop, PlainNumber } from '../fields';

const TYPE_ICON: Record<Layer['type'], string> = { text: 'text', shape: 'shape', model: 'cube', image: 'image', video: 'film', audio: 'audio' };
const SHAPES = ['box', 'roundedBox', 'sphere', 'torus', 'cylinder', 'plane', 'df-monogram'] as const;

function addLayer(make: (p: Project) => Record<string, unknown>) {
  let id = '';
  useStudio.getState().edit(p => {
    const raw = make(p);
    const layer = LayerSchema.parse(raw);
    p.layers.push(layer);
    id = layer.id;
  });
  useStudio.getState().select(id);
  useStudio.getState().openSheet('layer');
}

// ---------- layers list + add ----------
export function LayersSheet() {
  const layers = useStudio(s => s.project.layers);
  const selectedId = useStudio(s => s.selectedId);
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Asset['kind'] | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = (kind: Asset['kind']) => { setPending(kind); requestAnimationFrame(() => file.current?.click()); };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f || !pending) return;
    setBusy(true);
    try {
      const { id, asset } = await importFile(pending, f);
      const t = useStudio.getState().time;
      useStudio.getState().edit(p => { p.assets[id] = asset; });
      const base = asset.name.replace(/\.[^.]+$/, '').slice(0, 40) || pending;
      addLayer(p => {
        const dur = Math.min(p.duration - Math.min(t, p.duration - 0.5), asset.duration ?? p.duration);
        const common = { id: newId(pending, p), name: base, start: pending === 'audio' ? 0 : Math.min(t, p.duration - 0.5), duration: Math.max(0.5, dur), asset: id };
        if (pending === 'model') return { ...common, type: 'model', transform: { position: [0, 1, 0], rotation: [0, 0, 0], scale: [1, 1, 1], opacity: 1 } };
        if (pending === 'audio') return { ...common, type: 'audio' };
        return { ...common, type: pending, width: 3, transform: { position: [0, 1.6, 1], rotation: [0, 0, 0], scale: [1, 1, 1], opacity: 1 } };
      });
      toast(`Added ${asset.name}`);
    } catch (err) { toast((err as Error).message, 4000); }
    finally { setBusy(false); setPending(null); }
  };

  const t = () => useStudio.getState().time;
  return (
    <Sheet title="Layers" tool="layers">
      <h3 className="section-title" style={{ marginTop: 0 }}>Add</h3>
      <div className="add-grid">
        <button className="add-btn" onClick={() => addLayer(p => ({ id: newId('text', p), name: 'Text', type: 'text', text: 'Your words', start: t(), duration: Math.max(0.5, p.duration - t()), transform: { position: [0, 3.2, 0.5], rotation: [0, 0, 0], scale: [1, 1, 1], opacity: 1 } }))}><Icon name="text" />Text</button>
        <button className="add-btn" onClick={() => addLayer(p => ({ id: newId('shape', p), name: 'Sphere', type: 'shape', shape: 'sphere', start: t(), duration: Math.max(0.5, p.duration - t()), color: '#d9cbb4', transform: { position: [2, 1, 1], rotation: [0, 0, 0], scale: [0.5, 0.5, 0.5], opacity: 1 } }))}><Icon name="shape" />Shape</button>
        <button className="add-btn" onClick={() => pick('image')} disabled={busy}><Icon name="image" />Image</button>
        <button className="add-btn" onClick={() => pick('video')} disabled={busy}><Icon name="film" />Video</button>
        <button className="add-btn" onClick={() => pick('model')} disabled={busy}><Icon name="cube" />3D model</button>
        <button className="add-btn" onClick={() => pick('audio')} disabled={busy}><Icon name="audio" />Audio</button>
      </div>
      <input ref={file} type="file" hidden accept={pending ? LIMITS[pending].accept : undefined} onChange={onFile} />
      <h3 className="section-title">In this video</h3>
      {layers.length === 0 ? <p className="hint">No layers yet. Add text, a shape, or import your own media.</p> : null}
      <ul className="layer-list">
        {[...layers].reverse().map(l => (
          <li key={l.id} className={l.id === selectedId ? 'on' : ''}>
            <button className="layer-main" onClick={() => { useStudio.getState().select(l.id); useStudio.getState().openSheet('layer'); }}>
              <Icon name={TYPE_ICON[l.type]} />
              <span>{l.name}<small>{l.start.toFixed(1)}–{(l.start + l.duration).toFixed(1)} s{l.protect ? ', kept in frame' : ''}{l.locked ? ', locked' : ''}</small></span>
            </button>
            <button className={`ib${l.visible ? '' : ' dim'}`} aria-label={l.visible ? `Hide ${l.name}` : `Show ${l.name}`} aria-pressed={!l.visible}
              onClick={() => editLayer(l.id, x => { x.visible = !x.visible; })}><Icon name="eye" /></button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

// ---------- single layer inspector ----------
export function LayerSheet() {
  const id = useStudio(s => s.selectedId);
  const layer = useStudio(s => s.project.layers.find(l => l.id === s.selectedId));
  const [tab, setTab] = useState<'look' | 'move' | 'time'>('look');
  if (!id || !layer) return <Sheet title="Layer" tool="layers"><p className="hint">Select a layer in the timeline or the layers list.</p></Sheet>;

  const L = (p: Project) => p.layers.find(l => l.id === id)!;
  const tr = (p: Project) => L(p).transform;
  const actions = (
    <>
      <button className="ib" aria-label="Duplicate layer" onClick={() => {
        let nid = '';
        useStudio.getState().edit(p => { const c = structuredClone(L(p)); c.id = nid = newId(c.id.replace(/-\d+$/, ''), p); c.name = `${c.name} copy`; p.layers.push(c); });
        useStudio.getState().select(nid); toast('Duplicated');
      }}><Icon name="copy" /></button>
      <button className="ib" aria-label="Delete layer" onClick={() => {
        useStudio.getState().edit(p => { p.layers = p.layers.filter(l => l.id !== id); });
        useStudio.getState().select(null); useStudio.getState().openSheet('layers'); toast('Layer deleted. Undo to bring it back.');
      }}><Icon name="trash" /></button>
    </>
  );

  return (
    <Sheet title={layer.name} actions={actions} tool="layers" label={`Layer ${layer.name}`}>
      <Seg label="Section" value={tab} onChange={setTab} options={[{ id: 'look', label: 'Look' }, { id: 'move', label: 'Motion' }, { id: 'time', label: 'Timing' }]} />
      {tab === 'look' ? <LookFields layer={layer} L={L} /> : null}
      {tab === 'move' ? (
        <>
          <Vec3Prop label="Position" get={p => tr(p).position} set={(p, v) => { tr(p).position = v; }} />
          <Vec3Prop label="Rotation" step={1} get={p => tr(p).rotation} set={(p, v) => { tr(p).rotation = v; }} />
          <Vec3Prop label="Scale" step={0.02} get={p => tr(p).scale} set={(p, v) => { tr(p).scale = v; }} />
          <NumberProp label="Opacity" min={0} max={1} get={p => tr(p).opacity} set={(p, v) => { tr(p).opacity = v; }} format={v => `${Math.round(v * 100)}%`} />
          <h3 className="section-title">Presets</h3>
          <div className="chips">
            {PRESETS.filter(x => x.target === 'layer').map(x => (
              <button key={x.id} className="chip-btn" onClick={() => { useStudio.getState().edit(p => applyPreset(p, x.id, L(p))); toast(`${x.label} applied`); }}>{x.label}</button>
            ))}
          </div>
        </>
      ) : null}
      {tab === 'time' ? (
        <>
          <PlainNumber label="Starts at" value={layer.start} min={0} max={Math.max(0, useStudio.getState().project.duration - 0.1)} step={1 / 30} format={v => `${v.toFixed(2)} s`}
            onChange={v => editLayer(id, l => { l.start = v; }, 'start')} />
          <PlainNumber label="Length" value={layer.duration} min={0.1} max={useStudio.getState().project.duration} step={1 / 30} format={v => `${v.toFixed(2)} s`}
            onChange={v => editLayer(id, l => { l.duration = v; }, 'dur')} />
          <Toggle label="Keep inside the frame" hint="Warns if this layer ever leaves the safe area. Use it for your logo." checked={layer.protect} onChange={v => editLayer(id, l => { l.protect = v; })} />
          <Toggle label="Visible" checked={layer.visible} onChange={v => editLayer(id, l => { l.visible = v; })} />
          <Toggle label="Locked" hint="Stops accidental edits in the timeline" checked={layer.locked} onChange={v => useStudio.getState().edit(p => { L(p).locked = v; })} />
        </>
      ) : null}
    </Sheet>
  );
}

function LookFields({ layer, L }: { layer: Layer; L: (p: Project) => Layer }) {
  const id = layer.id;
  const nameField = (
    <div className="field">
      <label className="field-label" htmlFor="lname"><span>Name</span></label>
      <input id="lname" className="text-input" value={layer.name} maxLength={120} onChange={e => editLayer(id, l => { l.name = e.target.value; }, 'lname')} />
    </div>
  );
  switch (layer.type) {
    case 'text': {
      const T = (p: Project) => L(p) as Extract<Layer, { type: 'text' }>;
      return (<>
        <div className="field">
          <label className="field-label" htmlFor="ltext"><span>Text</span></label>
          <textarea id="ltext" className="paste" style={{ minHeight: 64, fontFamily: 'var(--sans)', fontSize: 15 }} value={layer.text} maxLength={2000}
            onChange={e => editLayer(id, l => { if (l.type === 'text') { l.text = e.target.value; l.name = e.target.value.slice(0, 32) || 'Text'; } }, 'ltext')} />
        </div>
        <Seg label="Font" value={layer.font} onChange={v => editLayer(id, l => { if (l.type === 'text') l.font = v; })}
          options={[{ id: 'newsreader', label: 'Serif' }, { id: 'geist', label: 'Sans' }, { id: 'geist-mono', label: 'Mono' }]} />
        <PlainNumberLike label="Size" value={layer.size} min={0.05} max={3} onChange={v => editLayer(id, l => { if (l.type === 'text') l.size = v; }, 'tsize')} />
        <Seg label="Align" value={layer.align} onChange={v => editLayer(id, l => { if (l.type === 'text') l.align = v; })}
          options={[{ id: 'left', label: 'Left' }, { id: 'center', label: 'Centre' }, { id: 'right', label: 'Right' }]} />
        <ColorProp label="Colour" get={p => T(p).color} set={(p, v) => { T(p).color = v; }} />
      </>);
    }
    case 'shape': {
      const S = (p: Project) => L(p) as Extract<Layer, { type: 'shape' }>;
      return (<>
        {nameField}
        <div className="field-label"><span>Shape</span></div>
        <div className="chips" style={{ marginBottom: 12 }}>
          {SHAPES.map(s => <button key={s} className="chip-btn" aria-pressed={layer.shape === s} onClick={() => editLayer(id, l => { if (l.type === 'shape') l.shape = s; })}>{s === 'df-monogram' ? 'DF mark' : s === 'roundedBox' ? 'Rounded box' : s[0].toUpperCase() + s.slice(1)}</button>)}
        </div>
        <ColorProp label="Colour" get={p => S(p).color} set={(p, v) => { S(p).color = v; }} />
        <PlainNumberLike label="Metalness" value={layer.metalness} min={0} max={1} onChange={v => editLayer(id, l => { if (l.type === 'shape') l.metalness = v; }, 'metal')} />
        <PlainNumberLike label="Roughness" value={layer.roughness} min={0} max={1} onChange={v => editLayer(id, l => { if (l.type === 'shape') l.roughness = v; }, 'rough')} />
        <NumberProp label="Glow" min={0} max={3} get={p => S(p).emissive} set={(p, v) => { S(p).emissive = v; }} />
      </>);
    }
    case 'image': case 'video': {
      return (<>
        {nameField}
        <PlainNumberLike label="Width" value={layer.width} min={0.2} max={20} onChange={v => editLayer(id, l => { if (l.type === 'image' || l.type === 'video') l.width = v; }, 'w')} />
        {layer.type === 'video' ? <NumberProp label="Volume" min={0} max={1} get={p => (L(p) as Extract<Layer, { type: 'video' }>).volume} set={(p, v) => { (L(p) as Extract<Layer, { type: 'video' }>).volume = v; }} format={v => `${Math.round(v * 100)}%`} /> : null}
      </>);
    }
    case 'audio':
      return (<>{nameField}<NumberProp label="Volume" min={0} max={1} get={p => (L(p) as Extract<Layer, { type: 'audio' }>).volume} set={(p, v) => { (L(p) as Extract<Layer, { type: 'audio' }>).volume = v; }} format={v => `${Math.round(v * 100)}%`} /></>);
    case 'model':
      return (<>{nameField}<p className="hint">Use the Motion tab to place and animate the model. Turn on “Keep inside the frame” in Timing if this is your logo.</p></>);
  }
}

function PlainNumberLike(props: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return <PlainNumber {...props} step={0.01} />;
}
