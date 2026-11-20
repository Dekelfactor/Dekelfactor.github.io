import type { Project, Vec3 } from '../schema/project';
import { baseValue, valueAt } from './evaluate';

const DEG = Math.PI / 180;
export type Orbit = { az: number; el: number; dist: number };

/** Camera position relative to its target as azimuth/elevation (degrees) and distance. */
export function toOrbit(pos: Vec3, target: Vec3): Orbit {
  const dx = pos[0] - target[0], dy = pos[1] - target[1], dz = pos[2] - target[2];
  const dist = Math.max(0.01, Math.hypot(dx, dy, dz));
  return { az: Math.atan2(dx, dz) / DEG, el: Math.asin(Math.max(-1, Math.min(1, dy / dist))) / DEG, dist };
}
export function fromOrbit({ az, el, dist }: Orbit, target: Vec3): Vec3 {
  const a = az * DEG, e = Math.max(-85, Math.min(85, el)) * DEG;
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return [r(target[0] + dist * Math.cos(e) * Math.sin(a)), r(target[1] + dist * Math.sin(e)), r(target[2] + dist * Math.cos(e) * Math.cos(a))];
}

export type CameraMove = 'pushIn' | 'pullOut' | 'orbitLeft' | 'orbitRight' | 'craneUp' | 'static';
export const CAMERA_MOVES: { id: CameraMove; label: string }[] = [
  { id: 'pushIn', label: 'Push in' }, { id: 'pullOut', label: 'Pull out' }, { id: 'orbitLeft', label: 'Orbit left' },
  { id: 'orbitRight', label: 'Orbit right' }, { id: 'craneUp', label: 'Crane up' }, { id: 'static', label: 'Locked off' },
];

/** Writes a whole-length camera move, starting from the camera as it is at t = 0. */
export function applyCameraMove(p: Project, move: CameraMove) {
  const target = valueAt(p.camera.target, 0);
  const o = toOrbit(valueAt(p.camera.position, 0), target);
  const end = p.duration;
  const keys = (a: Orbit, b: Orbit) => ({ keys: [{ t: 0, v: fromOrbit(a, target), ease: 'smooth' as const }, { t: end, v: fromOrbit(b, target) }] });
  switch (move) {
    case 'pushIn': p.camera.position = keys(o, { ...o, dist: o.dist * 0.78 }); break;
    case 'pullOut': p.camera.position = keys({ ...o, dist: o.dist * 0.8 }, o); break;
    case 'orbitLeft': p.camera.position = keys({ ...o, az: o.az + 18 }, { ...o, az: o.az - 18 }); break;
    case 'orbitRight': p.camera.position = keys({ ...o, az: o.az - 18 }, { ...o, az: o.az + 18 }); break;
    case 'craneUp': {
      p.camera.position = keys({ ...o, el: o.el - 4 }, { ...o, el: o.el + 14 });
      break;
    }
    case 'static': p.camera.position = baseValue(p.camera.position) ?? valueAt(p.camera.position, 0); break;
  }
}
