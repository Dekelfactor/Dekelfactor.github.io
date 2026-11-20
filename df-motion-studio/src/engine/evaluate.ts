import type { Animated, AnyAnim, Ease, Keyframe, Vec3, Wiggle } from '../schema/project';

// ---------- easing ----------
const BEZIER: Record<string, [number, number, number, number]> = {
  ease: [0.25, 0.1, 0.25, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0.23, 1, 0.32, 1],
  easeInOut: [0.77, 0, 0.175, 1],
  smooth: [0.45, 0, 0.2, 1],
  snappy: [0.16, 1, 0.3, 1],
};
const SPRINGS: Record<string, { stiffness: number; damping: number; mass: number }> = {
  overshoot: { stiffness: 180, damping: 14, mass: 1 },
  bounce: { stiffness: 260, damping: 9, mass: 1 },
};

/** CSS-style cubic-bezier timing function. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sx(t) - x;
      if (Math.abs(err) < 1e-6) return sy(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0, hi = 1; t = x;
    for (let i = 0; i < 40; i++) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
}

/**
 * Damped spring step response from 0 to 1 at `seconds` after release.
 * Physical (not normalised), so it can overshoot past 1.
 */
export function springAt(seconds: number, { stiffness, damping, mass }: { stiffness: number; damping: number; mass: number }) {
  if (seconds <= 0) return 0;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const t = seconds;
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + (zeta * w0 / wd) * Math.sin(wd * t));
  }
  if (zeta === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const r1 = -w0 * (zeta - Math.sqrt(zeta * zeta - 1));
  const r2 = -w0 * (zeta + Math.sqrt(zeta * zeta - 1));
  const c2 = r1 / (r1 - r2), c1 = 1 - c2;
  return 1 - (c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t));
}

const bezierCache = new Map<string, (x: number) => number>();

/**
 * Progress through a segment. `p` is 0..1, `segSeconds` its length.
 * Springs run on real time and are blended to land exactly on the next key.
 */
export function applyEase(ease: Ease | undefined, p: number, segSeconds: number): number {
  const e = ease ?? 'easeInOut';
  if (e === 'linear') return p;
  if (e === 'hold') return p >= 1 ? 1 : 0;
  let spring: { stiffness: number; damping: number; mass: number } | undefined;
  if (typeof e === 'string') {
    if (BEZIER[e]) return getBezier(BEZIER[e])(p);
    spring = SPRINGS[e];
  } else if ('bezier' in e) {
    return getBezier(e.bezier)(p);
  } else {
    spring = e.spring;
  }
  if (!spring) return p;
  const raw = springAt(p * segSeconds, spring);
  // blend the unsettled tail so the segment ends exactly at 1 (no jump at the next key)
  const end = springAt(segSeconds, spring);
  const blend = p * p * p;
  return raw + (1 - end) * blend;
}
function getBezier(b: [number, number, number, number]) {
  const k = b.join(',');
  let f = bezierCache.get(k);
  if (!f) { f = cubicBezier(...b); bezierCache.set(k, f); }
  return f;
}

// ---------- value types ----------
type Val = number | Vec3 | string;

function hexToLinear(hex: string): Vec3 {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return [c((n >> 16) & 255), c((n >> 8) & 255), c(n & 255)];
}
function linearToHex([r, g, b]: Vec3): string {
  const c = (v: number) => {
    v = Math.min(1, Math.max(0, v));
    const s = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
    return Math.round(s * 255).toString(16).padStart(2, '0');
  };
  return `#${c(r)}${c(g)}${c(b)}`;
}

function lerp(a: Val, b: Val, k: number): Val {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * k;
  if (typeof a === 'string' && typeof b === 'string') {
    const A = hexToLinear(a), B = hexToLinear(b);
    return linearToHex([A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k]);
  }
  if (Array.isArray(a) && Array.isArray(b)) return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  return k < 0.5 ? a : b;
}

// ---------- deterministic noise for wiggle / shake ----------
function hash(n: number) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
/** Smooth 1D value noise in [-1, 1]. Same input → same output on every machine and frame. */
export function noise1(x: number, seed: number) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  const a = hash(i + seed * 57.3) * 2 - 1, b = hash(i + 1 + seed * 57.3) * 2 - 1;
  return a + (b - a) * u;
}
function wiggleAt(w: Wiggle, t: number, channel: number) {
  const x = t * w.frequency;
  return w.amount * (noise1(x, w.seed + channel * 13) * 0.7 + noise1(x * 2.13, w.seed + channel * 29 + 7) * 0.3);
}

// ---------- public API ----------
export function isAnimated<V>(a: unknown): a is Animated<V> {
  return typeof a === 'object' && a !== null && !Array.isArray(a) && 'keys' in a;
}

/** Evaluate any animatable property at time `t` (seconds). */
export function valueAt<V extends Val>(a: V | Animated<V>, t: number): V {
  if (!isAnimated<V>(a)) return a as V;
  let v: Val;
  const keys = a.keys;
  if (!keys.length) {
    v = a.value as Val;
  } else if (t <= keys[0].t) {
    v = keys[0].v;
  } else if (t >= keys[keys.length - 1].t) {
    v = keys[keys.length - 1].v;
  } else {
    let i = 0;
    while (i < keys.length - 2 && t >= keys[i + 1].t) i++;
    const k0 = keys[i], k1 = keys[i + 1];
    const seg = k1.t - k0.t;
    const p = seg > 0 ? (t - k0.t) / seg : 1;
    v = lerp(k0.v, k1.v, applyEase(k0.ease, p, seg));
  }
  if (a.wiggle && a.wiggle.amount > 0) {
    if (typeof v === 'number') v = v + wiggleAt(a.wiggle, t, 0);
    else if (Array.isArray(v)) v = [v[0] + wiggleAt(a.wiggle, t, 0), v[1] + wiggleAt(a.wiggle, t, 1), v[2] + wiggleAt(a.wiggle, t, 2)];
  }
  return v as V;
}

/** The value shown when a property is not animated: its plain value, or its `value` field. */
export function baseValue<V extends Val>(a: V | Animated<V>): V | undefined {
  if (!isAnimated<V>(a)) return a as V;
  return a.value ?? a.keys[0]?.v;
}

export function keyCount(a: AnyAnim | undefined): number {
  return a && isAnimated(a) ? a.keys.length : 0;
}

/** Set a value at time t: updates the key at t (within one frame) or inserts a new one. */
export function setKeyAt<V extends Val>(a: V | Animated<V>, t: number, v: V, frame: number, ease?: Ease): Animated<V> {
  const anim: Animated<V> = isAnimated<V>(a) ? { ...a, keys: [...a.keys] } : { keys: [] };
  const idx = anim.keys.findIndex(k => Math.abs(k.t - t) < frame / 2);
  if (idx >= 0) anim.keys[idx] = { ...anim.keys[idx], v };
  else {
    const k: Keyframe<V> = { t, v };
    if (ease) k.ease = ease;
    anim.keys.push(k);
    anim.keys.sort((x, y) => x.t - y.t);
  }
  return anim;
}

/** Set the property's value: keyed at t if it already has keys, otherwise as a plain value. */
export function setValue<V extends Val>(a: V | Animated<V>, t: number, v: V, frame: number): V | Animated<V> {
  if (isAnimated<V>(a) && a.keys.length) return setKeyAt(a, t, v, frame);
  if (isAnimated<V>(a)) return { ...a, value: v };
  return v;
}

export function removeKeyAt<V extends Val>(a: V | Animated<V>, t: number, frame: number): V | Animated<V> {
  if (!isAnimated<V>(a)) return a;
  const keys = a.keys.filter(k => Math.abs(k.t - t) >= frame / 2);
  if (!keys.length && !a.wiggle) return valueAt(a, t);
  return { ...a, keys };
}
