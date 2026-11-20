import type { Layer, Project, Vec3 } from '../schema/project';
import { baseValue, valueAt } from './evaluate';

export type PresetId = 'easeIn' | 'easeOut' | 'overshoot' | 'drift' | 'parallax' | 'cameraShake' | 'clear';

export const PRESETS: { id: PresetId; label: string; hint: string; target: 'layer' | 'camera' }[] = [
  { id: 'easeIn', label: 'Ease in', hint: 'Fades and rises in at the clip start', target: 'layer' },
  { id: 'easeOut', label: 'Ease out', hint: 'Fades and sinks out at the clip end', target: 'layer' },
  { id: 'overshoot', label: 'Overshoot', hint: 'Pops in with a springy scale', target: 'layer' },
  { id: 'drift', label: 'Drift', hint: 'Slow organic float for the whole clip', target: 'layer' },
  { id: 'parallax', label: 'Parallax', hint: 'Slides against the camera move for depth', target: 'layer' },
  { id: 'cameraShake', label: 'Camera shake', hint: 'Handheld wobble on the camera', target: 'camera' },
  { id: 'clear', label: 'Clear motion', hint: 'Removes keys and wiggle from this clip', target: 'layer' },
];

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const add = (a: Vec3, b: Vec3): Vec3 => [r3(a[0] + b[0]), r3(a[1] + b[1]), r3(a[2] + b[2])];
const scl = (a: Vec3, k: number): Vec3 => [r3(a[0] * k), r3(a[1] * k), r3(a[2] * k)];

/** Mutates the draft project. Preset keys are written at absolute times inside the clip. */
export function applyPreset(p: Project, id: PresetId, layer?: Layer) {
  if (id === 'cameraShake') {
    const pos = p.camera.position;
    const base = baseValue(pos) ?? [0, 2, 12];
    p.camera.position = { keys: isAnim(pos) ? (pos.keys as K<Vec3>[]) : [], value: base as Vec3, wiggle: { amount: 0.05, frequency: 5, seed: 7 } };
    return;
  }
  if (!layer) return;
  const tr = layer.transform;
  const s = layer.start, e = layer.start + layer.duration;
  const len = Math.min(0.8, layer.duration / 2);
  const at = (a: unknown, t: number) => valueAt(a as never, t) as unknown;
  switch (id) {
    case 'easeIn': {
      const pos = at(tr.position, s + len) as Vec3;
      tr.position = mergeKeys(tr.position, [{ t: s, v: add(pos, [0, -0.3, 0]), ease: 'snappy' }, { t: s + len, v: pos }]);
      tr.opacity = mergeKeys(tr.opacity, [{ t: s, v: 0, ease: 'easeOut' }, { t: s + len * 0.8, v: 1 }]);
      break;
    }
    case 'easeOut': {
      const pos = at(tr.position, e - len) as Vec3;
      tr.position = mergeKeys(tr.position, [{ t: e - len, v: pos, ease: 'easeIn' }, { t: e, v: add(pos, [0, -0.25, 0]) }]);
      tr.opacity = mergeKeys(tr.opacity, [{ t: e - len, v: 1, ease: 'easeIn' }, { t: e, v: 0 }]);
      break;
    }
    case 'overshoot': {
      const sc = at(tr.scale, s + len) as Vec3;
      tr.scale = mergeKeys(tr.scale, [{ t: s, v: scl(sc, 0.82), ease: 'overshoot' }, { t: s + Math.max(len, 0.9), v: sc }]);
      break;
    }
    case 'drift': {
      const pos = (baseValue(tr.position) ?? [0, 0, 0]) as Vec3;
      tr.position = { ...(isAnim(tr.position) ? tr.position : { keys: [], value: pos }), wiggle: { amount: 0.06, frequency: 0.35, seed: hashId(layer.id) } };
      const rot = at(tr.rotation, s) as Vec3;
      tr.rotation = mergeKeys(tr.rotation, [{ t: s, v: rot, ease: 'linear' }, { t: e, v: add(rot, [0, 6, 0]) }]);
      break;
    }
    case 'parallax': {
      // move against the camera's sideways travel, scaled by how far the layer sits from the target
      const c0 = valueAt(p.camera.position, s), c1 = valueAt(p.camera.position, e);
      const travel: Vec3 = [c1[0] - c0[0], c1[1] - c0[1], 0];
      const depth = Math.max(-1, Math.min(1, ((at(tr.position, s) as Vec3)[2] ?? 0) / 4));
      const k = travel[0] === 0 && travel[1] === 0 ? 0.6 : -0.35 * (1 + depth);
      const off: Vec3 = travel[0] === 0 && travel[1] === 0 ? [k, 0, 0] : scl(travel, k);
      const pos = at(tr.position, s) as Vec3;
      tr.position = mergeKeys(tr.position, [{ t: s, v: add(pos, scl(off, -0.5)), ease: 'linear' }, { t: e, v: add(pos, scl(off, 0.5)) }]);
      break;
    }
    case 'clear': {
      for (const k of ['position', 'rotation', 'scale', 'opacity'] as const) {
        const v = tr[k];
        (tr as Record<string, unknown>)[k] = isAnim(v) ? valueAt(v as never, s) : v;
      }
      break;
    }
  }
}

type K<V> = { t: number; v: V; ease?: import('../schema/project').Ease };
function isAnim(a: unknown): a is { keys: K<unknown>[]; value?: unknown; wiggle?: unknown } {
  return typeof a === 'object' && a !== null && !Array.isArray(a) && 'keys' in a;
}
/** Insert keys, replacing any existing key within 1/60 s of each new one. */
function mergeKeys<V>(a: V | { keys: K<V>[]; value?: V; wiggle?: unknown }, add: K<V>[]) {
  const base = isAnim(a) ? { ...a, keys: [...a.keys] as K<V>[] } : { keys: [] as K<V>[] };
  for (const k of add) {
    base.keys = base.keys.filter(x => Math.abs(x.t - k.t) > 1 / 60);
    base.keys.push(k);
  }
  base.keys.sort((x, y) => x.t - y.t);
  return base as never;
}
function hashId(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) % 997; }
