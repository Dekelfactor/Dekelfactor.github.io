import type { Animated, Ease, Layer, Project } from '../schema/project';
import { isAnimated } from './evaluate';

/** Walk any object and visit every animated property (in place). */
export function forEachAnim(obj: unknown, cb: (a: Animated<unknown>, path: string) => void, path = '') {
  if (!obj || typeof obj !== 'object') return;
  if (isAnimated(obj)) { cb(obj as Animated<unknown>, path); return; }
  if (Array.isArray(obj)) return; // vec3 tuples
  for (const [k, v] of Object.entries(obj)) forEachAnim(v, cb, path ? `${path}.${k}` : k);
}

export const near = (a: number, b: number, eps: number) => Math.abs(a - b) < eps;

export function keyTimes(obj: unknown): number[] {
  const s: number[] = [];
  forEachAnim(obj, a => a.keys.forEach(k => { if (!s.some(x => near(x, k.t, 1e-4))) s.push(k.t); }));
  return s.sort((a, b) => a - b);
}

/** Ease of the first key found at time t (the segment that starts there). */
export function easeAt(obj: unknown, t: number, eps: number): Ease | undefined {
  let found: Ease | undefined; let seen = false;
  forEachAnim(obj, a => { for (const k of a.keys) if (!seen && near(k.t, t, eps)) { found = k.ease; seen = true; } });
  return found;
}

export function setEaseAt(obj: unknown, t: number, ease: Ease, eps: number) {
  forEachAnim(obj, a => a.keys.forEach(k => { if (near(k.t, t, eps)) k.ease = ease; }));
}

/** Retime every key at t0 to t1 (keeps keys sorted; merges onto an existing key at t1). */
export function moveKeys(obj: unknown, t0: number, t1: number, eps: number) {
  forEachAnim(obj, a => {
    const moving = a.keys.filter(k => near(k.t, t0, eps));
    if (!moving.length) return;
    a.keys = a.keys.filter(k => !near(k.t, t0, eps) && !near(k.t, t1, eps));
    for (const k of moving) a.keys.push({ ...k, t: Math.max(0, t1) });
    a.keys.sort((x, y) => x.t - y.t);
  });
}

export function deleteKeysAt(obj: unknown, t: number, eps: number) {
  forEachAnim(obj, a => { a.keys = a.keys.filter(k => !near(k.t, t, eps)); });
}

/** Shift every key by dt (used when a clip is moved, since key times are absolute). */
export function shiftKeys(obj: unknown, dt: number) {
  forEachAnim(obj, a => a.keys.forEach(k => { k.t = Math.max(0, k.t + dt); }));
}

/** Split a clip at t: returns the second half, and shortens the original. Keys stay absolute, so motion is continuous. */
export function splitLayer(layer: Layer, t: number, newId: string): Layer | null {
  if (t <= layer.start + 1e-3 || t >= layer.start + layer.duration - 1e-3) return null;
  const b = structuredClone(layer);
  b.id = newId;
  b.name = `${layer.name} (2)`;
  b.start = t;
  b.duration = layer.start + layer.duration - t;
  if ('trimStart' in b && 'trimStart' in layer) b.trimStart = layer.trimStart + (t - layer.start);
  layer.duration = t - layer.start;
  return b;
}

/** Things a dragged time can snap to. */
export function snapTargets(project: Project, playhead: number, excludeId?: string): number[] {
  const s = new Set<number>([0, project.duration, playhead]);
  for (const l of project.layers) {
    if (l.id === excludeId) continue;
    s.add(l.start); s.add(l.start + l.duration);
  }
  for (let i = 1; i < project.duration; i++) s.add(i);
  return [...s];
}

export function snap(t: number, targets: number[], thresholdSec: number): { t: number; snapped: boolean } {
  let best = t, bestD = thresholdSec;
  for (const x of targets) { const d = Math.abs(x - t); if (d < bestD) { best = x; bestD = d; } }
  return { t: best, snapped: best !== t };
}
