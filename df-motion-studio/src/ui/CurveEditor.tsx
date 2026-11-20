import { useMemo, useRef } from 'react';
import type { Ease, Project } from '../schema/project';
import { applyEase } from '../engine/evaluate';
import { easeAt, keyTimes, setEaseAt } from '../engine/keys';
import { useStudio, frameDur } from '../store/useStudio';
import { Seg, Slider } from './fields';

type Spring = { stiffness: number; damping: number; mass: number };
const PRESET_EASES: { id: Exclude<Ease, object>; label: string }[] = [
  { id: 'linear', label: 'Linear' }, { id: 'ease', label: 'Ease' }, { id: 'smooth', label: 'Smooth' }, { id: 'snappy', label: 'Snappy' },
  { id: 'easeIn', label: 'Ease in' }, { id: 'easeOut', label: 'Ease out' }, { id: 'overshoot', label: 'Overshoot' }, { id: 'bounce', label: 'Bounce' }, { id: 'hold', label: 'Hold' },
];
const BEZ: Record<string, [number, number, number, number]> = {
  linear: [0.25, 0.25, 0.75, 0.75], ease: [0.25, 0.1, 0.25, 1], easeIn: [0.42, 0, 1, 1], easeOut: [0.23, 1, 0.32, 1],
  easeInOut: [0.77, 0, 0.175, 1], smooth: [0.45, 0, 0.2, 1], snappy: [0.16, 1, 0.3, 1],
};
const SPR: Record<string, Spring> = { overshoot: { stiffness: 180, damping: 14, mass: 1 }, bounce: { stiffness: 260, damping: 9, mass: 1 } };

export function ownerOf(p: Project, owner: string): unknown {
  if (owner === 'camera') return p.camera;
  if (owner === 'lights') return p.lights;
  return p.layers.find(l => l.id === owner);
}

const W = 300, H = 170, PAD = 22;
const Y0 = -0.4, Y1 = 1.4; // visible value range, room for overshoot
const sx = (x: number) => PAD + x * (W - PAD * 2);
const sy = (y: number) => H - PAD - ((y - Y0) / (Y1 - Y0)) * (H - PAD * 2);

export function CurveEditor({ owner, t }: { owner: string; t: number }) {
  const project = useStudio(s => s.project);
  const fd = 1 / project.fps;
  const obj = ownerOf(project, owner);
  const times = keyTimes(obj);
  const next = times.find(x => x > t + fd / 2);
  const seg = next !== undefined ? next - t : 1;
  const ease = easeAt(obj, t, fd / 2) ?? 'easeInOut';
  const mode: 'bezier' | 'spring' = typeof ease === 'object' ? ('spring' in ease ? 'spring' : 'bezier') : (SPR[ease] ? 'spring' : 'bezier');
  const bez: [number, number, number, number] = typeof ease === 'object' && 'bezier' in ease ? ease.bezier : BEZ[typeof ease === 'string' ? ease : ''] ?? BEZ.easeInOut;
  const spring: Spring = typeof ease === 'object' && 'spring' in ease ? ease.spring : SPR[typeof ease === 'string' ? ease : ''] ?? SPR.overshoot;

  const setEase = (e: Ease, coalesce?: string) => useStudio.getState().edit(p => setEaseAt(ownerOf(p, owner), t, e, frameDur() / 2), coalesce);

  const path = useMemo(() => {
    let d = '';
    for (let i = 0; i <= 80; i++) { const p = i / 80; d += `${i ? 'L' : 'M'}${sx(p).toFixed(1)} ${sy(applyEase(ease, p, seg)).toFixed(1)}`; }
    return d;
  }, [ease, seg]);

  const svg = useRef<SVGSVGElement>(null);
  const dragHandle = (i: 0 | 1) => (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const r = svg.current!.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, ((ev.clientX - r.left) / r.width * W - PAD) / (W - PAD * 2)));
      const y = Y0 + ((H - PAD - (ev.clientY - r.top) / r.height * H) / (H - PAD * 2)) * (Y1 - Y0);
      const b = [...bez] as [number, number, number, number];
      b[i * 2] = Math.round(x * 100) / 100; b[i * 2 + 1] = Math.round(Math.min(Y1, Math.max(Y0, y)) * 100) / 100;
      setEase({ bezier: b }, `bez:${owner}:${t}`);
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };

  const presetId = typeof ease === 'string' ? ease : null;
  return (
    <div className="curve">
      <div className="curve-head">
        <span>Move from <span className="mono">{t.toFixed(2)} s</span>{next !== undefined ? <> to <span className="mono">{next.toFixed(2)} s</span></> : null}</span>
      </div>
      {next === undefined ? <p className="hint" style={{ marginBottom: 10 }}>This is the last key, so its ease has no move to shape. Pick an earlier key.</p> : null}
      <div className="chips" role="group" aria-label="Ease presets" style={{ marginBottom: 10 }}>
        {PRESET_EASES.map(p => <button key={p.id} className="chip-btn" aria-pressed={presetId === p.id} onClick={() => setEase(p.id)}>{p.label}</button>)}
      </div>
      <Seg label="Curve type" value={mode} options={[{ id: 'bezier', label: 'Bezier' }, { id: 'spring', label: 'Spring' }]}
        onChange={m => setEase(m === 'spring' ? { spring } : { bezier: bez })} />
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="curve-svg" role="img" aria-label={`Ease curve, ${mode}`}>
        <rect x={sx(0)} y={sy(1)} width={sx(1) - sx(0)} height={sy(0) - sy(1)} className="curve-box" />
        <line x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(1)} className="curve-diag" />
        {mode === 'bezier' && presetId !== 'hold' ? (
          <>
            <line x1={sx(0)} y1={sy(0)} x2={sx(bez[0])} y2={sy(bez[1])} className="curve-arm" />
            <line x1={sx(1)} y1={sy(1)} x2={sx(bez[2])} y2={sy(bez[3])} className="curve-arm" />
          </>
        ) : null}
        <path d={path} className="curve-path" />
        {mode === 'bezier' && presetId !== 'hold' ? [0, 1].map(i => (
          <g key={i} className="curve-handle" onPointerDown={dragHandle(i as 0 | 1)} tabIndex={0} role="slider"
            aria-label={`Handle ${i + 1}`} aria-valuenow={bez[i * 2 + 1]}
            onKeyDown={e => {
              const b = [...bez] as [number, number, number, number]; const d = e.shiftKey ? 0.1 : 0.02;
              if (e.key === 'ArrowUp') b[i * 2 + 1] += d; else if (e.key === 'ArrowDown') b[i * 2 + 1] -= d;
              else if (e.key === 'ArrowRight') b[i * 2] = Math.min(1, b[i * 2] + d); else if (e.key === 'ArrowLeft') b[i * 2] = Math.max(0, b[i * 2] - d); else return;
              e.preventDefault(); setEase({ bezier: b.map(v => Math.round(v * 100) / 100) as typeof b }, `bez:${owner}:${t}`);
            }}>
            <circle cx={sx(bez[i * 2])} cy={sy(bez[i * 2 + 1])} r={22} className="curve-hit" />
            <circle cx={sx(bez[i * 2])} cy={sy(bez[i * 2 + 1])} r={7} className="curve-dot" />
          </g>
        )) : null}
      </svg>
      {mode === 'spring' ? (
        <div className="spring-fields">
          {(['stiffness', 'damping', 'mass'] as const).map(k => (
            <div key={k} className="prop">
              <div className="prop-head"><span>{k[0].toUpperCase() + k.slice(1)}</span><span className="mono">{spring[k].toFixed(k === 'mass' ? 1 : 0)}</span><span className="keybtn-spacer" /></div>
              <Slider label={k} value={spring[k]} min={k === 'mass' ? 0.3 : k === 'damping' ? 2 : 20} max={k === 'mass' ? 5 : k === 'damping' ? 80 : 600} step={k === 'mass' ? 0.1 : 1}
                onChange={v => setEase({ spring: { ...spring, [k]: v } }, `spr:${owner}:${t}:${k}`)} />
            </div>
          ))}
          <p className="hint">Springs run on real time and always land exactly on the next key.</p>
        </div>
      ) : null}
    </div>
  );
}
