import { describe, expect, it } from 'vitest';
import { keyTimes, moveKeys, setEaseAt, shiftKeys, snap, splitLayer } from './keys';
import { applyPreset } from './presets';
import { createSampleProject } from '../schema/defaults';
import { Project } from '../schema/project';
import { valueAt } from './evaluate';

const eps = 1 / 60;

describe('key helpers', () => {
  it('lists, retimes and eases keys on a layer', () => {
    const p = createSampleProject();
    const logo = p.layers.find(l => l.id === 'logo')!;
    expect(keyTimes(logo)).toEqual([0, 0.7, 1.8, 6]);
    moveKeys(logo, 1.8, 2.2, eps);
    expect(keyTimes(logo)).toEqual([0, 0.7, 2.2, 6]);
    setEaseAt(logo, 0, 'bounce', eps);
    expect(JSON.stringify(logo)).toContain('bounce');
    shiftKeys(logo, 1);
    expect(keyTimes(logo)[0]).toBe(1);
  });
  it('splits a clip into two continuous halves', () => {
    const p = createSampleProject();
    const cap = p.layers.find(l => l.id === 'caption')!;
    const b = splitLayer(cap, 4, 'caption-2')!;
    expect(cap.duration).toBe(2);
    expect(b.start).toBe(4); expect(b.duration).toBe(2);
    expect(splitLayer(cap, 1, 'x')).toBeNull();
  });
  it('snaps within the threshold only', () => {
    expect(snap(1.03, [1, 2], 0.05)).toEqual({ t: 1, snapped: true });
    expect(snap(1.2, [1, 2], 0.05)).toEqual({ t: 1.2, snapped: false });
  });
});

describe('presets', () => {
  it('every preset leaves a valid project', () => {
    for (const id of ['easeIn', 'easeOut', 'overshoot', 'drift', 'parallax', 'cameraShake', 'clear'] as const) {
      const p = createSampleProject();
      applyPreset(p, id, p.layers.find(l => l.id === 'caption'));
      expect(Project.safeParse(p).success, id).toBe(true);
    }
  });
  it('ease in starts transparent and ends at the resting value', () => {
    const p = createSampleProject();
    const orb = p.layers.find(l => l.id === 'orb')!;
    applyPreset(p, 'easeIn', orb);
    expect(valueAt(orb.transform.opacity, 0)).toBe(0);
    expect(valueAt(orb.transform.opacity, 1)).toBe(1);
  });
});
