import { useId, useRef, useState } from 'react';
import type { Animated, Project, Vec3 } from '../schema/project';
import { isAnimated, removeKeyAt, setKeyAt, setValue, valueAt } from '../engine/evaluate';
import { useStudio, frameDur } from '../store/useStudio';
import { Icon } from './Icon';

type V = number | Vec3 | string;
type A<T extends V> = T | Animated<T>;

// ---------- slider ----------
export function Slider({ value, min, max, step = 0.01, onChange, label, gradient, format }: {
  value: number; min: number; max: number; step?: number; onChange: (v: number) => void; label: string; gradient?: string; format?: (v: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const k = (Math.min(max, Math.max(min, value)) - min) / (max - min);
  const fromX = (x: number) => {
    const r = ref.current!.getBoundingClientRect();
    const raw = min + Math.min(1, Math.max(0, (x - r.left) / r.width)) * (max - min);
    return Math.round(raw / step) * step;
  };
  return (
    <div ref={ref} className="slider" role="slider" tabIndex={0} aria-label={label} aria-valuemin={min} aria-valuemax={max}
      aria-valuenow={Number(value.toFixed(3))} aria-valuetext={format ? format(value) : undefined}
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); onChange(fromX(e.clientX)); }}
      onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) onChange(fromX(e.clientX)); }}
      onKeyDown={e => {
        const big = (max - min) / 10;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { onChange(Math.min(max, value + (e.shiftKey ? big : step))); e.preventDefault(); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { onChange(Math.max(min, value - (e.shiftKey ? big : step))); e.preventDefault(); }
      }}>
      <div className="slider-track" style={gradient ? { background: gradient } : undefined}>
        {gradient ? null : <div className="slider-fill" style={{ width: `${k * 100}%` }} />}
      </div>
      <div className="slider-knob" style={{ left: `${k * 100}%` }} />
    </div>
  );
}

// ---------- keyframe toggle ----------
function KeyToggle({ anim, onToggle, label }: { anim: A<V>; onToggle: () => void; label: string }) {
  const time = useStudio(s => s.time);
  const fd = 1 / useStudio(s => s.project.fps);
  const animated = isAnimated(anim) && anim.keys.length > 0;
  const onKey = isAnimated(anim) && anim.keys.some(k => Math.abs(k.t - time) < fd / 2);
  return (
    <button className={`keybtn${onKey ? ' on' : animated ? ' anim' : ''}`} onClick={onToggle}
      aria-label={onKey ? `Remove ${label} keyframe at playhead` : `Add ${label} keyframe at playhead`} aria-pressed={onKey}>
      <Icon name="diamond" />
    </button>
  );
}

/** Shared editing logic for any animatable property. */
function useAnim<T extends V>(get: (p: Project) => A<T>, set: (p: Project, v: A<T>) => void, key: string) {
  const anim = useStudio(s => get(s.project));
  const time = useStudio(s => s.time);
  const current = valueAt(anim, time) as T;
  const change = (v: T) => useStudio.getState().edit(p => set(p, setValue(get(p), useStudio.getState().time, v, frameDur())), key);
  const toggleKey = () => useStudio.getState().edit(p => {
    const a = get(p), t = useStudio.getState().time, fd = frameDur();
    const has = isAnimated(a) && a.keys.some(k => Math.abs(k.t - t) < fd / 2);
    set(p, has ? removeKeyAt(a, t, fd) : setKeyAt(a, t, valueAt(a, t) as T, fd));
  });
  return { anim, current, change, toggleKey };
}

// ---------- property rows ----------
export function NumberProp({ label, get, set, min, max, step = 0.01, format, gradient, keyable = true }: {
  label: string; get: (p: Project) => A<number>; set: (p: Project, v: A<number>) => void;
  min: number; max: number; step?: number; format?: (v: number) => string; gradient?: string; keyable?: boolean;
}) {
  const { anim, current, change, toggleKey } = useAnim<number>(get, set, `num:${label}`);
  const fmt = format ?? ((v: number) => v.toFixed(step >= 1 ? 0 : 2));
  return (
    <div className="prop">
      <div className="prop-head"><span>{label}</span><span className="mono">{fmt(current)}</span>{keyable ? <KeyToggle anim={anim} onToggle={toggleKey} label={label} /> : null}</div>
      <Slider value={current} min={min} max={max} step={step} onChange={change} label={label} gradient={gradient} format={fmt} />
    </div>
  );
}

export function Vec3Prop({ label, get, set, step = 0.05, axes = ['X', 'Y', 'Z'], keyable = true }: {
  label: string; get: (p: Project) => A<Vec3>; set: (p: Project, v: A<Vec3>) => void; step?: number; axes?: string[]; keyable?: boolean;
}) {
  const { anim, current, change, toggleKey } = useAnim<Vec3>(get, set, `vec:${label}`);
  return (
    <div className="prop">
      <div className="prop-head"><span>{label}</span><span />{keyable ? <KeyToggle anim={anim} onToggle={toggleKey} label={label} /> : null}</div>
      <div className="vec">
        {[0, 1, 2].map(i => <AxisInput key={i} axis={axes[i]} value={current[i]} step={step} label={`${label} ${axes[i]}`}
          onChange={v => { const n = [...current] as Vec3; n[i] = v; change(n); }} />)}
      </div>
    </div>
  );
}

/** Number box: type a value, or drag the axis letter sideways to scrub. */
function AxisInput({ axis, value, step, onChange, label }: { axis: string; value: number; step: number; onChange: (v: number) => void; label: string }) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const drag = useRef<{ x: number; v: number } | null>(null);
  const commit = () => { if (draft !== null) { const n = parseFloat(draft); if (Number.isFinite(n)) onChange(n); setDraft(null); } };
  return (
    <div className="axis">
      <label htmlFor={id} className="axis-grip" aria-label={`Drag to change ${label}`}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, v: value }; }}
        onPointerMove={e => { if (drag.current) onChange(Math.round((drag.current.v + (e.clientX - drag.current.x) * step * 0.5) / step) * step); }}
        onPointerUp={() => { drag.current = null; }}>{axis}</label>
      <input id={id} inputMode="decimal" className="mono" aria-label={label} value={draft ?? String(Math.round(value * 1000) / 1000)}
        onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') { commit(); (e.target as HTMLInputElement).blur(); } }} />
    </div>
  );
}

export function ColorProp({ label, get, set, keyable = true }: { label: string; get: (p: Project) => A<string>; set: (p: Project, v: A<string>) => void; keyable?: boolean }) {
  const { anim, current, change, toggleKey } = useAnim<string>(get, set, `col:${label}`);
  const id = useId();
  return (
    <div className="prop prop-inline">
      <label htmlFor={id} className="prop-label">{label}</label>
      <span className="mono prop-value">{current}</span>
      <input id={id} type="color" className="swatch" value={current} onChange={e => change(e.target.value)} />
      {keyable ? <KeyToggle anim={anim} onToggle={toggleKey} label={label} /> : null}
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <button className="toggle-row" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
      <span><span className="toggle-label">{label}</span>{hint ? <small>{hint}</small> : null}</span>
      <span className="switch" aria-hidden="true" />
    </button>
  );
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(o => <button key={o.id} aria-pressed={value === o.id} onClick={() => onChange(o.id)}>{o.label}</button>)}
    </div>
  );
}

export function PlainNumber({ label, value, min, max, step = 0.01, onChange, format }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  const fmt = format ?? ((v: number) => v.toFixed(step >= 1 ? 0 : 2));
  return (
    <div className="prop">
      <div className="prop-head"><span>{label}</span><span className="mono">{fmt(value)}</span><span className="keybtn-spacer" /></div>
      <Slider value={value} min={min} max={max} step={step} onChange={onChange} label={label} format={fmt} />
    </div>
  );
}
