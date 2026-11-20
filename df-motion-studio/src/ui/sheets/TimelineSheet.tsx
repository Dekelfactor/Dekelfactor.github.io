import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Layer, Project } from '../../schema/project';
import { keyTimes, moveKeys, deleteKeysAt, shiftKeys, snap, snapTargets, splitLayer } from '../../engine/keys';
import { applyPreset, PRESETS } from '../../engine/presets';
import { useStudio, frameDur, newId } from '../../store/useStudio';
import { Sheet } from '../Sheet';
import { Icon } from '../Icon';
import { seek } from '../player';
import { CurveEditor, ownerOf } from '../CurveEditor';
import { toast } from '../Chrome';

const ROW = 48, RULER = 28, PADR = 40;
/** left gutter so keys at 0 s are fully visible and tappable */
const PADL = 16;
const TYPE_ICON: Record<Layer['type'], string> = { text: 'text', shape: 'shape', model: 'cube', image: 'image', video: 'film', audio: 'audio' };

/** Frame-throttled seek so ruler scrubbing stays at display rate. */
let pendingSeek: number | null = null;
function scrubSeek(t: number) {
  if (pendingSeek === null) requestAnimationFrame(() => { if (pendingSeek !== null) seek(pendingSeek); pendingSeek = null; });
  pendingSeek = t;
}

export function TimelineSheet() {
  const project = useStudio(s => s.project);
  const selectedId = useStudio(s => s.selectedId);
  const selectedKey = useStudio(s => s.selectedKey);
  const snapOn = useStudio(s => s.snapOn);
  const scroller = useRef<HTMLDivElement>(null);
  const [pps, setPps] = useState(60); // pixels per second
  const fitted = useRef(false);

  // fit the whole duration on first open
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || fitted.current) return;
    fitted.current = true;
    setPps(Math.max(24, Math.min(400, (el.clientWidth - PADR - PADL) / project.duration)));
  }, [project.duration]);

  // pinch (two pointers) and ctrl/⌘ + wheel zoom around the focal point
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const pts = new Map<number, number>();
    let base: { dist: number; pps: number; t: number; x: number } | null = null;
    const zoomTo = (next: number, t: number, x: number) => {
      const z = Math.max(16, Math.min(600, next));
      setPps(z);
      requestAnimationFrame(() => { el.scrollLeft = PADL + t * z - x; });
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      pts.set(e.pointerId, e.clientX);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const r = el.getBoundingClientRect(); const x = (a + b) / 2 - r.left;
        base = { dist: Math.abs(a - b) || 1, pps: ppsRef.current, t: (el.scrollLeft + x - PADL) / ppsRef.current, x };
      }
    };
    const move = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, e.clientX);
      if (pts.size === 2 && base) { const [a, b] = [...pts.values()]; zoomTo(base.pps * (Math.abs(a - b) / base.dist), base.t, base.x); }
    };
    const up = (e: PointerEvent) => { pts.delete(e.pointerId); if (pts.size < 2) base = null; };
    const wheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const r = el.getBoundingClientRect(); const x = e.clientX - r.left;
      zoomTo(ppsRef.current * Math.exp(-e.deltaY * 0.01), (el.scrollLeft + x - PADL) / ppsRef.current, x);
    };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
  }, []);
  const ppsRef = useRef(pps); ppsRef.current = pps;

  const width = PADL + project.duration * pps + PADR;
  const selected = project.layers.find(l => l.id === selectedId) ?? null;

  const split = () => {
    const s = useStudio.getState();
    const l = s.project.layers.find(x => x.id === s.selectedId);
    if (!l) { toast('Select a clip to split'); return; }
    if (l.locked) { toast('Unlock the clip first'); return; }
    let ok = false;
    s.edit(p => {
      const idx = p.layers.findIndex(x => x.id === l.id);
      const b = splitLayer(p.layers[idx], s.time, newId(l.id.replace(/-\d+$/, ''), p));
      if (b) { p.layers.splice(idx + 1, 0, b); ok = true; }
    });
    toast(ok ? 'Split at the playhead' : 'Move the playhead inside the clip to split it');
  };

  const actions = (
    <>
      <button className={`ib${snapOn ? ' on' : ''}`} aria-pressed={snapOn} aria-label="Snap" onClick={() => useStudio.getState().setSnap(!snapOn)}><Icon name="magnet" /></button>
      <button className="ib" aria-label="Split clip at playhead" onClick={split}><Icon name="split" /></button>
      <button className="ib" aria-label="Add layer" onClick={() => useStudio.getState().openSheet('layers')}><Icon name="plus" /></button>
    </>
  );

  return (
    <Sheet title="Timeline" actions={actions} tool="timeline">
      <div className="tl" style={{ ['--row' as string]: `${ROW}px` }}>
        <div className="tl-heads" aria-hidden="true">
          <div style={{ height: RULER }} />
          <div className="tl-head"><Icon name="camera" /></div>
          <div className="tl-head"><Icon name="light" /></div>
          {project.layers.map(l => <div key={l.id} className={`tl-head${l.id === selectedId ? ' on' : ''}`}><Icon name={TYPE_ICON[l.type]} /></div>)}
        </div>
        <div className="tl-scroll" ref={scroller}>
          <div className="tl-inner" style={{ width }}>
            <Ruler pps={pps} duration={project.duration} />
            <KeyRow owner="camera" label="Camera" project={project} pps={pps} />
            <KeyRow owner="lights" label="Lights" project={project} pps={pps} />
            {project.layers.map(l => <ClipRow key={l.id} layer={l} project={project} pps={pps} selected={l.id === selectedId} />)}
            <Playhead pps={pps} scroller={scroller} />
          </div>
        </div>
      </div>
      <p className="hint tl-hint">Pinch to zoom. Tap a clip, then drag it or its edges. Tap a diamond to shape that move.</p>
      {selectedKey ? <CurveEditor owner={selectedKey.owner} t={selectedKey.t} /> : selected ? <Presets layer={selected} /> : <CameraShake />}
    </Sheet>
  );
}

function Ruler({ pps, duration }: { pps: number; duration: number }) {
  const step = pps > 160 ? 0.25 : pps > 70 ? 0.5 : pps > 30 ? 1 : 2;
  const ticks: number[] = [];
  for (let t = 0; t <= duration + 1e-6; t += step) ticks.push(Math.round(t * 100) / 100);
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = e.currentTarget.getBoundingClientRect();
    scrubSeek((e.clientX - r.left - PADL) / pps);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const r = e.currentTarget.getBoundingClientRect();
    scrubSeek((e.clientX - r.left - PADL) / pps);
  };
  return (
    <div className="tl-ruler" style={{ height: RULER }} onPointerDown={onDown} onPointerMove={onMove} aria-hidden="true">
      {ticks.map(t => (
        <span key={t} className={Number.isInteger(t) ? 'major' : ''} style={{ left: PADL + t * pps }}>{Number.isInteger(t) ? `${t}s` : ''}</span>
      ))}
    </div>
  );
}

function Playhead({ pps, scroller }: { pps: number; scroller: React.RefObject<HTMLDivElement | null> }) {
  const time = useStudio(s => s.time);
  const playing = useStudio(s => s.playing);
  useEffect(() => {
    const el = scroller.current;
    if (!el || !playing) return;
    const x = PADL + time * pps;
    if (x < el.scrollLeft || x > el.scrollLeft + el.clientWidth - 30) el.scrollLeft = x - 30;
  }, [time, pps, playing, scroller]);
  return <div className="tl-playhead" style={{ transform: `translateX(${PADL + time * pps}px)` }} aria-hidden="true" />;
}

/** Diamonds for every key time on an owner; tap selects, drag retimes. */
function Diamonds({ owner, obj, pps, min = 0, max = Infinity, interactive = true }: { owner: string; obj: unknown; pps: number; min?: number; max?: number; interactive?: boolean }) {
  const selectedKey = useStudio(s => s.selectedKey);
  const times = useMemo(() => keyTimes(obj), [obj]);
  const fd = frameDur();
  if (!interactive) return <>{times.map(t => <span key={t} className="tl-tick" style={{ left: PADL + t * pps }} aria-hidden="true" />)}</>;
  return (
    <>
      {times.map(t => {
        const on = selectedKey?.owner === owner && Math.abs(selectedKey.t - t) < fd / 2;
        const onDown = (e: React.PointerEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          const el = e.currentTarget; el.setPointerCapture(e.pointerId);
          const x0 = e.clientX; let moved = false; let cur = t;
          const s = useStudio.getState();
          const targets = snapTargets(s.project, s.time).concat(keyTimes(ownerOf(s.project, owner)).filter(x => Math.abs(x - t) > 1e-4));
          const move = (ev: PointerEvent) => {
            if (!moved && Math.abs(ev.clientX - x0) < 6) return;
            moved = true;
            let nt = Math.min(max, Math.max(min, t + (ev.clientX - x0) / pps));
            if (useStudio.getState().snapOn) nt = snap(nt, targets, 8 / pps).t;
            nt = Math.round(nt / fd) * fd;
            if (Math.abs(nt - cur) < 1e-6) return;
            const from = cur; cur = nt;
            useStudio.getState().edit(p => moveKeys(ownerOf(p, owner), from, nt, fd / 2), `retime:${owner}:${t}`);
            useStudio.getState().selectKey({ owner, t: nt });
          };
          const up = () => {
            el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
            if (!moved) { useStudio.getState().selectKey(on ? null : { owner, t }); seek(t); }
          };
          el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
        };
        return (
          <button key={t} className={`tl-key${on ? ' on' : ''}`} style={{ left: PADL + t * pps }} onPointerDown={onDown}
            aria-label={`Keyframe at ${t.toFixed(2)} seconds`} aria-pressed={on}
            onKeyDown={e => {
              if (e.key === 'Delete' || e.key === 'Backspace') { useStudio.getState().edit(p => deleteKeysAt(ownerOf(p, owner), t, fd / 2)); useStudio.getState().selectKey(null); }
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); useStudio.getState().selectKey(on ? null : { owner, t }); }
            }} />
        );
      })}
    </>
  );
}

function KeyRow({ owner, label, project, pps }: { owner: 'camera' | 'lights'; label: string; project: Project; pps: number }) {
  const obj = owner === 'camera' ? project.camera : project.lights;
  return (
    <div className="tl-row" aria-label={`${label} keyframes`}>
      <Diamonds owner={owner} obj={obj} pps={pps} max={project.duration} />
    </div>
  );
}

function ClipRow({ layer, project, pps, selected }: { layer: Layer; project: Project; pps: number; selected: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  const beginDrag = (mode: 'move' | 'start' | 'end') => (e: React.PointerEvent) => {
    e.stopPropagation();
    const s = useStudio.getState();
    if (!selected && mode === 'move') return; // first tap selects; dragging an unselected clip scrolls instead
    if (layer.locked) { if (mode !== 'move') toast('This layer is locked'); return; }
    const el = e.currentTarget as HTMLElement; el.setPointerCapture(e.pointerId);
    const x0 = e.clientX; const orig = { start: layer.start, duration: layer.duration, trim: 'trimStart' in layer ? layer.trimStart : 0 };
    const targets = snapTargets(s.project, s.time, layer.id);
    const fd = frameDur(); let lastStart = layer.start; let moved = false;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - x0;
      if (!moved && Math.abs(dx) < 4) return;
      moved = true;
      const dt = dx / pps;
      const snapOn = useStudio.getState().snapOn, th = 8 / pps;
      useStudio.getState().edit(p => {
        const l = p.layers.find(x => x.id === layer.id)!;
        if (mode === 'move') {
          let ns = Math.max(0, orig.start + dt);
          if (snapOn) {
            const a = snap(ns, targets, th), b = snap(ns + orig.duration, targets, th);
            ns = a.snapped ? a.t : b.snapped ? b.t - orig.duration : ns;
          }
          ns = Math.max(0, Math.round(ns / fd) * fd);
          shiftKeys(l, ns - lastStart); lastStart = ns; l.start = ns;
        } else if (mode === 'start') {
          const end = orig.start + orig.duration;
          let ns = Math.min(end - fd, Math.max(0, orig.start + dt));
          if (snapOn) ns = snap(ns, targets, th).t;
          ns = Math.round(ns / fd) * fd;
          l.start = ns; l.duration = end - ns;
          if ('trimStart' in l) l.trimStart = Math.max(0, orig.trim + (ns - orig.start));
        } else {
          let ne = Math.max(orig.start + fd, orig.start + orig.duration + dt);
          if (snapOn) ne = snap(ne, targets, th).t;
          l.duration = Math.round((ne - orig.start) / fd) * fd;
        }
      }, `clip:${mode}:${layer.id}`);
    };
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  };

  const onClick = () => {
    const s = useStudio.getState();
    s.select(selected ? s.selectedId : layer.id);
  };

  return (
    <div className="tl-row">
      <div ref={ref} className={`tl-clip t-${layer.type}${selected ? ' sel' : ''}${layer.visible ? '' : ' hidden'}`}
        style={{ left: PADL + layer.start * pps, width: Math.max(8, layer.duration * pps), touchAction: selected ? 'none' : 'pan-x' }}
        onPointerDown={beginDrag('move')} onClick={onClick} role="button" tabIndex={0} aria-pressed={selected}
        aria-label={`${layer.name}, ${layer.start.toFixed(2)} to ${(layer.start + layer.duration).toFixed(2)} seconds`}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}>
        <span className="tl-clip-name">{layer.locked ? '🔒 ' : ''}{layer.name}</span>
        {selected ? <>
          <span className="tl-trim l" onPointerDown={beginDrag('start')} aria-hidden="true" />
          <span className="tl-trim r" onPointerDown={beginDrag('end')} aria-hidden="true" />
        </> : null}
      </div>
      <Diamonds owner={layer.id} obj={layer} pps={pps} max={project.duration} interactive={selected} />
    </div>
  );
}

function Presets({ layer }: { layer: Layer }) {
  return (
    <div>
      <h3 className="section-title">Motion presets for {layer.name}</h3>
      <div className="chips">
        {PRESETS.filter(p => p.target === 'layer').map(p => (
          <button key={p.id} className="chip-btn" title={p.hint}
            onClick={() => { useStudio.getState().edit(d => applyPreset(d, p.id, d.layers.find(l => l.id === layer.id))); toast(`${p.label} applied`); }}>
            {p.label}
          </button>
        ))}
      </div>
      <CameraShake />
    </div>
  );
}

function CameraShake() {
  return (
    <div style={{ marginTop: 12 }}>
      <button className="chip-btn" onClick={() => { useStudio.getState().edit(d => applyPreset(d, 'cameraShake')); toast('Camera shake added'); }}>Add camera shake</button>
    </div>
  );
}
