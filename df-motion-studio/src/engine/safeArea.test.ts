import { describe, expect, it } from 'vitest';
import { scanSafeArea } from './safeArea';
import { createSampleProject } from '../schema/defaults';

describe('safe area', () => {
  it('sample keeps the logo inside the safe area in every aspect', () => {
    const p = createSampleProject();
    for (const a of ['9:16', '1:1', '16:9'] as const) expect(scanSafeArea(p, a)).toEqual({ ok: true });
  });
  it('flags the frame where a protected logo leaves the frame', () => {
    const p = createSampleProject();
    const logo = p.layers.find(l => l.id === 'logo')!;
    logo.transform.position = { keys: [{ t: 0, v: [0, 1.5, 0] }, { t: 4, v: [9, 1.5, 0] }] };
    const r = scanSafeArea(p);
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.layerId).toBe('logo'); expect(r.time).toBeGreaterThan(0); expect(r.time).toBeLessThan(4); }
  });
});
