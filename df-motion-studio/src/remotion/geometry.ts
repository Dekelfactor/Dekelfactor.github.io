import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * Stand-in DF monogram (extruded). Replace with the real logo by adding a
 * GLB model layer with `"protect": true`. Centred on the origin, ~3.4 × 2 units.
 */
function dShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(0.62, 0);
  s.absarc(0.62, 1.0, 1.0, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(0, 2.0); s.lineTo(0, 0);
  const h = new THREE.Path();
  h.moveTo(0.42, 0.42); h.lineTo(0.62, 0.42);
  h.absarc(0.62, 1.0, 0.58, -Math.PI / 2, Math.PI / 2, false);
  h.lineTo(0.42, 1.58); h.lineTo(0.42, 0.42);
  s.holes.push(h);
  return s;
}
function fShape() {
  const s = new THREE.Shape();
  const pts: [number, number][] = [[0, 0], [0.42, 0], [0.42, 0.82], [1.18, 0.82], [1.18, 1.22], [0.42, 1.22], [0.42, 1.58], [1.38, 1.58], [1.38, 2], [0, 2]];
  pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
}

let monogram: { d: THREE.BufferGeometry; f: THREE.BufferGeometry } | null = null;
export function getMonogram() {
  if (monogram) return monogram;
  const extr = { depth: 0.38, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.045, bevelSegments: 5, curveSegments: 40 };
  const d = new THREE.ExtrudeGeometry(dShape(), extr);
  const f = new THREE.ExtrudeGeometry(fShape(), extr);
  // centre the pair on the origin
  d.translate(-1.62, -1, -0.19);
  f.translate(-1.62 + 1.86, -1, -0.19);
  monogram = { d, f };
  return monogram;
}

const cache = new Map<string, THREE.BufferGeometry>();
export function getShapeGeometry(shape: string): THREE.BufferGeometry {
  let g = cache.get(shape);
  if (g) return g;
  switch (shape) {
    case 'box': g = new THREE.BoxGeometry(1, 1, 1); break;
    case 'roundedBox': g = new RoundedBoxGeometry(1, 1, 1, 5, 0.06); break;
    case 'sphere': g = new THREE.SphereGeometry(1, 64, 48); break;
    case 'torus': g = new THREE.TorusGeometry(0.75, 0.25, 48, 128); break;
    case 'cylinder': g = new THREE.CylinderGeometry(0.5, 0.5, 1, 64); break;
    case 'plane': g = new THREE.PlaneGeometry(1, 1); break;
    default: g = new THREE.BoxGeometry(1, 1, 1);
  }
  cache.set(shape, g);
  return g;
}

/** Local (unscaled) bounds used by the safe-area check before a mesh exists. */
export const SHAPE_BOUNDS: Record<string, [number, number, number, number, number, number]> = {
  box: [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5],
  roundedBox: [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5],
  sphere: [-1, -1, -1, 1, 1, 1],
  torus: [-1, -1, -0.25, 1, 1, 0.25],
  cylinder: [-0.5, -0.5, -0.5, 0.5, 0.5, 0.5],
  plane: [-0.5, -0.5, 0, 0.5, 0.5, 0],
  'df-monogram': [-1.67, -1.05, -0.25, 1.81, 1.05, 0.25],
};
