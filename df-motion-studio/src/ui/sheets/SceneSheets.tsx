import { useRef, useState } from 'react';
import type { Environment, Light, Project } from '../../schema/project';
import { setValue, valueAt } from '../../engine/evaluate';
import { applyCameraMove, CAMERA_MOVES, fromOrbit, toOrbit } from '../../engine/camera';
import { useStudio, frameDur } from '../../store/useStudio';
import { kelvinToCss } from '../../remotion/color';
import { Sheet } from '../Sheet';
import { ColorProp, NumberProp, PlainNumber, Seg, Toggle, Vec3Prop } from '../fields';
import { toast } from '../Chrome';

type LightId = 'key' | 'fill' | 'rim';
const LIGHT_LABEL: Record<LightId, string> = { key: 'Key', fill: 'Fill', rim: 'Rim' };
const TEMP_GRADIENT = `linear-gradient(90deg, ${[1800, 3000, 4500, 6500, 9000, 12000].map(k => kelvinToCss(k)).join(', ')})`;

// ---------------------------------------------------------------- lights
export function LightSheet() {
  const [which, setWhich] = useState<LightId>('key');
  const light = useStudio(s => s.project.lights[which]);
  const L = (p: Project) => p.lights[which];
  return (
    <Sheet title="Lights" tool="light">
      <Seg label="Light" value={which} onChange={setWhich} options={(['key', 'fill', 'rim'] as const).map(id => ({ id, label: LIGHT_LABEL[id] }))} />
      <div className="light-grid">
        <LightDome selected={which} onSelect={setWhich} />
        <div>
          <NumberProp label="Intensity" min={0} max={3} get={p => L(p).intensity} set={(p, v) => { L(p).intensity = v; }} />
          <NumberProp label="Temperature" min={1800} max={12000} step={50} gradient={TEMP_GRADIENT} format={v => `${Math.round(v)} K`}
            get={p => L(p).temperature} set={(p, v) => { L(p).temperature = v; }} />
          <NumberProp label="Softness" min={0} max={1} get={p => L(p).softness} set={(p, v) => { L(p).softness = v; }} />
        </div>
      </div>
      <Toggle label={`${LIGHT_LABEL[which]} light on`} checked={light.enabled} onChange={v => useStudio.getState().edit(p => { L(p).enabled = v; })} />
      <NumberProp label="Height" min={-10} max={89} step={1} format={v => `${Math.round(v)}°`} get={p => L(p).elevation} set={(p, v) => { L(p).elevation = v; }} />
      <NumberProp label="Angle around subject" min={-180} max={180} step={1} format={v => `${Math.round(v)}°`} get={p => L(p).azimuth} set={(p, v) => { L(p).azimuth = v; }} />
      <PlainNumber label="Distance" value={light.distance} min={2} max={30} step={0.1} onChange={v => useStudio.getState().edit(p => { L(p).distance = v; }, 'ldist')} />
    </Sheet>
  );
}

/**
 * Top-down dome: centre is straight overhead, the rim is the horizon,
 * the bottom edge faces the camera. Drag a light to place it.
 */
function LightDome({ selected, onSelect }: { selected: LightId; onSelect: (l: LightId) => void }) {
  const lights = useStudio(s => s.project.lights);
  const time = useStudio(s => s.time);
  const ref = useRef<HTMLDivElement>(null);
  const R = 70, C = 80;
  const pos = (l: Light) => {
    const az = valueAt(l.azimuth, time) * Math.PI / 180, el = Math.max(0, valueAt(l.elevation, time));
    const r = R * (1 - el / 90);
    return { x: C + r * Math.sin(az), y: C + r * Math.cos(az) };
  };
  const place = (id: LightId, clientX: number, clientY: number) => {
    const b = ref.current!.getBoundingClientRect();
    const dx = (clientX - b.left) / b.width * 160 - C, dy = (clientY - b.top) / b.height * 160 - C;
    const az = Math.round(Math.atan2(dx, dy) * 180 / Math.PI);
    const el = Math.round(90 * (1 - Math.min(1, Math.hypot(dx, dy) / R)));
    const t = useStudio.getState().time, fd = frameDur();
    useStudio.getState().edit(p => {
      p.lights[id].azimuth = setValue(p.lights[id].azimuth, t, az, fd);
      p.lights[id].elevation = setValue(p.lights[id].elevation, t, Math.min(89, el), fd);
    }, `dome:${id}`);
  };
  return (
    <div className="dome" ref={ref} role="group" aria-label="Light dome. Drag a light to position it; the bottom edge faces the camera.">
      <svg viewBox="0 0 160 160" aria-hidden="true">
        <defs><radialGradient id="dome-g"><stop offset="0" stopColor="#332d26" /><stop offset="1" stopColor="#1d1915" /></radialGradient></defs>
        <circle cx={C} cy={C} r={R + 8} fill="url(#dome-g)" stroke="rgba(237,228,214,.16)" />
        <circle cx={C} cy={C} r={R * 2 / 3} fill="none" stroke="rgba(237,228,214,.08)" />
        <circle cx={C} cy={C} r={R / 3} fill="none" stroke="rgba(237,228,214,.08)" />
        <line x1={C - R} y1={C} x2={C + R} y2={C} stroke="rgba(237,228,214,.06)" /><line x1={C} y1={C - R} x2={C} y2={C + R} stroke="rgba(237,228,214,.06)" />
        <rect x={C - 9} y={C - 4} width="18" height="8" rx="2" fill="rgba(237,228,214,.35)" />
        <text x={C} y={156} fill="rgba(237,228,214,.4)" fontSize="8" textAnchor="middle" fontFamily="Geist Sans">Camera</text>
      </svg>
      {(['fill', 'rim', 'key'] as const).map(id => {
        const l = lights[id]; const p = pos(l);
        const color = kelvinToCss(valueAt(l.temperature, time));
        return (
          <button key={id} className={`dome-dot${id === selected ? ' on' : ''}${l.enabled ? '' : ' off'}`}
            style={{ left: `${p.x / 1.6}%`, top: `${p.y / 1.6}%`, ['--c' as string]: color }}
            aria-label={`${LIGHT_LABEL[id]} light: ${Math.round(valueAt(l.azimuth, time))}° around, ${Math.round(valueAt(l.elevation, time))}° high. Arrow keys move it.`}
            onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); onSelect(id); }}
            onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) place(id, e.clientX, e.clientY); }}
            onKeyDown={e => {
              const d = e.shiftKey ? 10 : 2; const t = useStudio.getState().time, fd = frameDur();
              const k = e.key;
              if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k)) return;
              e.preventDefault();
              useStudio.getState().edit(p => {
                const L2 = p.lights[id];
                if (k === 'ArrowLeft' || k === 'ArrowRight') L2.azimuth = setValue(L2.azimuth, t, valueAt(L2.azimuth, t) + (k === 'ArrowRight' ? d : -d), fd);
                else L2.elevation = setValue(L2.elevation, t, Math.max(-10, Math.min(89, valueAt(L2.elevation, t) + (k === 'ArrowUp' ? d : -d))), fd);
              }, `domekey:${id}`);
            }}>
            <i /><b>{LIGHT_LABEL[id]}</b>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- camera
export function CameraSheet() {
  const dof = useStudio(s => s.project.camera.dof.enabled);
  return (
    <Sheet title="Camera" tool="camera">
      <div className="light-grid">
        <OrbitPad />
        <div>
          <NumberProp label="Lens (field of view)" min={10} max={90} step={0.5} format={v => `${v.toFixed(0)}°`} get={p => p.camera.fov} set={(p, v) => { p.camera.fov = v; }} />
          <NumberProp label="Roll" min={-30} max={30} step={0.5} format={v => `${v.toFixed(1)}°`} get={p => p.camera.roll} set={(p, v) => { p.camera.roll = v; }} />
          <DollyRow />
        </div>
      </div>
      <h3 className="section-title">Moves</h3>
      <div className="chips">
        {CAMERA_MOVES.map(m => <button key={m.id} className="chip-btn" onClick={() => { useStudio.getState().edit(p => applyCameraMove(p, m.id)); toast(`${m.label} applied over the whole video`); }}>{m.label}</button>)}
      </div>
      <h3 className="section-title">Depth of field</h3>
      <Toggle label="Depth of field" hint="Blurs what is nearer or further than the focus distance" checked={dof} onChange={v => useStudio.getState().edit(p => { p.camera.dof.enabled = v; })} />
      {dof ? <>
        <NumberProp label="Focus distance" min={1} max={40} step={0.1} get={p => p.camera.dof.focusDistance} set={(p, v) => { p.camera.dof.focusDistance = v; }} />
        <NumberProp label="Aperture" min={0} max={1} get={p => p.camera.dof.aperture} set={(p, v) => { p.camera.dof.aperture = v; }} />
      </> : null}
      <h3 className="section-title">Exact position</h3>
      <Vec3Prop label="Camera position" get={p => p.camera.position} set={(p, v) => { p.camera.position = v; }} />
      <Vec3Prop label="Looks at" get={p => p.camera.target} set={(p, v) => { p.camera.target = v; }} />
    </Sheet>
  );
}

/** Writes an orbit change at the playhead (keyed if the camera is animated). */
export function orbitBy(dAz: number, dEl: number, distScale = 1, key = 'orbit') {
  const t = useStudio.getState().time, fd = frameDur();
  useStudio.getState().edit(p => {
    const target = valueAt(p.camera.target, t);
    const o = toOrbit(valueAt(p.camera.position, t), target);
    const next = fromOrbit({ az: o.az + dAz, el: Math.max(-20, Math.min(80, o.el + dEl)), dist: Math.max(1.5, Math.min(60, o.dist * distScale)) }, target);
    p.camera.position = setValue(p.camera.position, t, next, fd);
  }, key);
}

function OrbitPad() {
  const last = useRef<{ x: number; y: number } | null>(null);
  const time = useStudio(s => s.time);
  const cam = useStudio(s => s.project.camera);
  const o = toOrbit(valueAt(cam.position, time), valueAt(cam.target, time));
  const px = 50 + Math.max(-1, Math.min(1, o.az / 90)) * 40, py = 50 - Math.max(-1, Math.min(1, o.el / 60)) * 40;
  return (
    <div className="orbit-pad" role="slider" tabIndex={0} aria-label={`Orbit: ${Math.round(o.az)}° around, ${Math.round(o.el)}° high. Drag or use arrow keys.`}
      aria-valuenow={Math.round(o.az)}
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); last.current = { x: e.clientX, y: e.clientY }; }}
      onPointerMove={e => {
        if (!last.current) return;
        const dx = e.clientX - last.current.x, dy = e.clientY - last.current.y; last.current = { x: e.clientX, y: e.clientY };
        orbitBy(dx * 0.6, -dy * 0.4, 1, 'orbitpad');
      }}
      onPointerUp={() => { last.current = null; }}
      onKeyDown={e => {
        const d = e.shiftKey ? 10 : 2;
        if (e.key === 'ArrowLeft') orbitBy(-d, 0); else if (e.key === 'ArrowRight') orbitBy(d, 0);
        else if (e.key === 'ArrowUp') orbitBy(0, d); else if (e.key === 'ArrowDown') orbitBy(0, -d); else return;
        e.preventDefault();
      }}>
      <span className="orbit-cross" aria-hidden="true" />
      <span className="orbit-puck" style={{ left: `${px}%`, top: `${py}%` }} aria-hidden="true" />
      <span className="orbit-label" aria-hidden="true">Drag to orbit</span>
    </div>
  );
}

function DollyRow() {
  const time = useStudio(s => s.time);
  const cam = useStudio(s => s.project.camera);
  const dist = toOrbit(valueAt(cam.position, time), valueAt(cam.target, time)).dist;
  return (
    <PlainNumber label="Dolly (distance)" value={dist} min={1.5} max={40} step={0.1} format={v => `${v.toFixed(1)} m`}
      onChange={v => orbitBy(0, 0, v / dist, 'dolly')} />
  );
}

// ---------------------------------------------------------------- scene
const ENV_LOOKS: Record<Environment['preset'], { label: string; bg: string; ground: string; backdrop: string; fog: string; swatch: string }> = {
  studio: { label: 'Studio', bg: '#1d1915', ground: '#1e1a16', backdrop: '#231e19', fog: '#1d1915', swatch: 'radial-gradient(circle at 50% 30%, #6b5a46, #1d1915 70%)' },
  dusk: { label: 'Dusk', bg: '#241a1f', ground: '#2a1f22', backdrop: '#2b1d22', fog: '#2b1d22', swatch: 'linear-gradient(180deg, #46507a, #c07a5a 70%, #2b1d22)' },
  noir: { label: 'Noir', bg: '#121110', ground: '#161412', backdrop: '#141210', fog: '#121110', swatch: 'radial-gradient(circle at 50% 10%, #d9cdbb, #121110 45%)' },
  daylight: { label: 'Daylight', bg: '#3a3631', ground: '#4a453e', backdrop: '#433e37', fog: '#3a3631', swatch: 'linear-gradient(180deg, #c9d4e3, #8f8a80)' },
  none: { label: 'None', bg: '#1d1915', ground: '#1e1a16', backdrop: '#231e19', fog: '#1d1915', swatch: 'linear-gradient(135deg, #27221d, #15120f)' },
};

export function SceneSheet() {
  const env = useStudio(s => s.project.environment);
  const safe = useStudio(s => s.project.safeArea);
  const E = (p: Project) => p.environment;
  return (
    <Sheet title="Scene" tool="scene">
      <div className="env-grid" role="group" aria-label="Environment">
        {(Object.keys(ENV_LOOKS) as Environment['preset'][]).map(id => (
          <button key={id} className="env-card" aria-pressed={env.preset === id} onClick={() => useStudio.getState().edit(p => {
            const look = ENV_LOOKS[id];
            Object.assign(p.environment, { preset: id, background: look.bg });
            p.environment.ground.color = look.ground; p.environment.backdrop.color = look.backdrop; p.environment.fog.color = look.fog;
          })}>
            <span className="env-swatch" style={{ background: ENV_LOOKS[id].swatch }} />{ENV_LOOKS[id].label}
          </button>
        ))}
      </div>
      <NumberProp label="Environment light" min={0} max={3} get={p => E(p).intensity} set={(p, v) => { E(p).intensity = v; }} />
      <ColorProp label="Background" get={p => E(p).background} set={(p, v) => { E(p).background = v; }} />
      <h3 className="section-title">Ground and backdrop</h3>
      <Toggle label="Ground" checked={env.ground.enabled} onChange={v => useStudio.getState().edit(p => { E(p).ground.enabled = v; })} />
      {env.ground.enabled ? <PlainNumber label="Ground shine" value={env.ground.reflectivity} min={0} max={1} onChange={v => useStudio.getState().edit(p => { E(p).ground.reflectivity = v; }, 'gshine')} /> : null}
      <Toggle label="Curved backdrop" checked={env.backdrop.enabled} onChange={v => useStudio.getState().edit(p => { E(p).backdrop.enabled = v; })} />
      <h3 className="section-title">Fog and depth</h3>
      <Toggle label="Fog" hint="Fades distant things into the background colour" checked={env.fog.enabled} onChange={v => useStudio.getState().edit(p => { E(p).fog.enabled = v; })} />
      {env.fog.enabled ? <>
        <NumberProp label="Fog starts" min={0} max={60} step={0.5} format={v => `${v.toFixed(1)} m`} get={p => E(p).fog.near} set={(p, v) => { E(p).fog.near = v; }} />
        <NumberProp label="Fog ends" min={1} max={120} step={0.5} format={v => `${v.toFixed(1)} m`} get={p => E(p).fog.far} set={(p, v) => { E(p).fog.far = v; }} />
      </> : null}
      <h3 className="section-title">Logo safe area</h3>
      <PlainNumber label="Margin kept clear" value={safe} min={0} max={0.2} step={0.005} format={v => `${(v * 100).toFixed(1)}%`}
        onChange={v => useStudio.getState().edit(p => { p.safeArea = v; }, 'safe')} />
    </Sheet>
  );
}

// ---------------------------------------------------------------- effects
export function EffectsSheet() {
  const fx = useStudio(s => s.project.effects);
  const F = (p: Project) => p.effects;
  return (
    <Sheet title="Effects" tool="effects">
      <Toggle label="Bloom" hint="Glow around bright highlights" checked={fx.bloom.enabled} onChange={v => useStudio.getState().edit(p => { F(p).bloom.enabled = v; })} />
      {fx.bloom.enabled ? <>
        <NumberProp label="Bloom strength" min={0} max={3} get={p => F(p).bloom.intensity} set={(p, v) => { F(p).bloom.intensity = v; }} />
        <PlainNumber label="Bloom threshold" value={fx.bloom.threshold} min={0} max={1} onChange={v => useStudio.getState().edit(p => { F(p).bloom.threshold = v; }, 'bth')} />
      </> : null}
      <Toggle label="Film grain" checked={fx.grain.enabled} onChange={v => useStudio.getState().edit(p => { F(p).grain.enabled = v; })} />
      {fx.grain.enabled ? <NumberProp label="Grain amount" min={0} max={0.3} step={0.005} get={p => F(p).grain.amount} set={(p, v) => { F(p).grain.amount = v; }} /> : null}
      <Toggle label="Vignette" checked={fx.vignette.enabled} onChange={v => useStudio.getState().edit(p => { F(p).vignette.enabled = v; })} />
      {fx.vignette.enabled ? <NumberProp label="Vignette darkness" min={0} max={1} get={p => F(p).vignette.amount} set={(p, v) => { F(p).vignette.amount = v; }} /> : null}
      <h3 className="section-title">Colour grade</h3>
      <NumberProp label="Exposure" min={-2} max={2} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)} EV`} get={p => F(p).grade.exposure} set={(p, v) => { F(p).grade.exposure = v; }} />
      <NumberProp label="Contrast" min={-0.5} max={0.5} get={p => F(p).grade.contrast} set={(p, v) => { F(p).grade.contrast = v; }} />
      <NumberProp label="Saturation" min={-1} max={1} get={p => F(p).grade.saturation} set={(p, v) => { F(p).grade.saturation = v; }} />
      <NumberProp label="Warmth" min={-1} max={1} gradient="linear-gradient(90deg, #8fb0ff, #3a342d 50%, #ffb066)" get={p => F(p).grade.temperature} set={(p, v) => { F(p).grade.temperature = v; }} />
      <NumberProp label="Tint" min={-1} max={1} gradient="linear-gradient(90deg, #8fd49a, #3a342d 50%, #e08fd0)" get={p => F(p).grade.tint} set={(p, v) => { F(p).grade.tint = v; }} />
      <h3 className="section-title">Motion blur</h3>
      <Toggle label="Motion blur" hint="Applied when you export. Previewing it would be too slow on a phone." checked={fx.motionBlur.enabled} onChange={v => useStudio.getState().edit(p => { F(p).motionBlur.enabled = v; })} />
      {fx.motionBlur.enabled ? <>
        <PlainNumber label="Shutter" value={fx.motionBlur.shutter} min={0.05} max={1} format={v => `${Math.round(v * 360)}°`} onChange={v => useStudio.getState().edit(p => { F(p).motionBlur.shutter = v; }, 'shut')} />
        <PlainNumber label="Samples" value={fx.motionBlur.samples} min={2} max={16} step={1} onChange={v => useStudio.getState().edit(p => { F(p).motionBlur.samples = Math.round(v); }, 'samp')} />
      </> : null}
    </Sheet>
  );
}
