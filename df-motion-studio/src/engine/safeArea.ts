import * as THREE from 'three';
import { ASPECT_SIZE, type Layer, type Project } from '../schema/project';
import { valueAt } from './evaluate';
import { SHAPE_BOUNDS } from '../remotion/geometry';

import { measuredBounds, type Bounds } from './bounds';

function localBounds(layer: Layer): Bounds | null {
  const m = measuredBounds.get(layer.id);
  if (m) return m;
  switch (layer.type) {
    case 'shape': return SHAPE_BOUNDS[layer.shape] ?? SHAPE_BOUNDS.box;
    case 'text': {
      const lines = layer.text.split('\n');
      const w = Math.max(...lines.map(l => l.length)) * layer.size * 0.56, h = lines.length * layer.size * 1.2;
      const x0 = layer.align === 'left' ? 0 : layer.align === 'right' ? -w : -w / 2;
      return [x0, -h / 2, 0, x0 + w, h / 2, 0];
    }
    case 'image': case 'video': return [-layer.width / 2, -layer.width / 2, 0, layer.width / 2, layer.width / 2, 0];
    default: return null;
  }
}

/** On failure: the first frame where a protected layer breaks the safe area, and its worst margin overall. */
export type SafeAreaResult = { ok: true } | { ok: false; layerId: string; layerName: string; time: number; margin: number };

const cam = new THREE.PerspectiveCamera();
const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3();
const DEG = Math.PI / 180;

/**
 * Checks every frame: each protected layer's projected bounds must stay inside
 * the frame inset by `project.safeArea` (fraction of width/height).
 */
export function scanSafeArea(project: Project, aspectOverride?: Project['aspect']): SafeAreaResult {
  const protectedLayers = project.layers.filter(l => l.protect && l.visible && l.type !== 'audio');
  if (!protectedLayers.length) return { ok: true };
  const { width, height } = ASPECT_SIZE[aspectOverride ?? project.aspect];
  cam.aspect = width / height;
  const frames = Math.max(1, Math.round(project.duration * project.fps));
  const inset = project.safeArea;
  let worst = { ok: true } as SafeAreaResult;
  for (let f = 0; f < frames; f++) {
    const t = f / project.fps;
    const p = valueAt(project.camera.position, t), tg = valueAt(project.camera.target, t);
    cam.position.set(p[0], p[1], p[2]); cam.up.set(0, 1, 0); cam.lookAt(tg[0], tg[1], tg[2]);
    const roll = valueAt(project.camera.roll, t); if (roll) cam.rotateZ(roll * DEG);
    cam.fov = valueAt(project.camera.fov, t); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    for (const layer of protectedLayers) {
      if (t < layer.start || t >= layer.start + layer.duration) continue;
      if (valueAt(layer.transform.opacity, t) < 0.02) continue;
      const b = localBounds(layer);
      if (!b) continue;
      const pos = valueAt(layer.transform.position, t), rot = valueAt(layer.transform.rotation, t), sc = valueAt(layer.transform.scale, t);
      q.setFromEuler(e.set(rot[0] * DEG, rot[1] * DEG, rot[2] * DEG));
      m.compose(v.set(pos[0], pos[1], pos[2]), q, new THREE.Vector3(sc[0], sc[1], sc[2]));
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, behind = false;
      for (let i = 0; i < 8; i++) {
        const c = new THREE.Vector3(i & 1 ? b[3] : b[0], i & 2 ? b[4] : b[1], i & 4 ? b[5] : b[2]).applyMatrix4(m);
        const view = c.clone().applyMatrix4(cam.matrixWorldInverse);
        if (view.z > -cam.near) behind = true;
        c.project(cam);
        minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x); minY = Math.min(minY, c.y); maxY = Math.max(maxY, c.y);
      }
      // margin as a fraction of frame size (NDC spans 2)
      const margin = behind ? -1 : Math.min((minX + 1) / 2, (1 - maxX) / 2, (minY + 1) / 2, (1 - maxY) / 2);
      if (margin < inset) {
        if (worst.ok) worst = { ok: false, layerId: layer.id, layerName: layer.name, time: t, margin };
        else if (margin < worst.margin) worst = { ...worst, margin };
      }
    }
  }
  return worst;
}
