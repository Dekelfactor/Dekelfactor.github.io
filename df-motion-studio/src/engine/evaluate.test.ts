import { describe, expect, it } from 'vitest';
import { applyEase, cubicBezier, noise1, removeKeyAt, setKeyAt, setValue, valueAt } from './evaluate';
import { parseProject } from '../schema/project';
import { createBlankProject, createSampleProject, sampleProject } from '../schema/defaults';

describe('easing', () => {
  it('bezier hits endpoints and is monotonic for ease-in-out', () => {
    const f = cubicBezier(0.77, 0, 0.175, 1);
    expect(f(0)).toBe(0); expect(f(1)).toBe(1);
    let prev = 0;
    for (let x = 0.05; x <= 1; x += 0.05) { const y = f(x); expect(y).toBeGreaterThanOrEqual(prev - 1e-9); prev = y; }
    expect(cubicBezier(0.42, 0, 0.58, 1)(0.5)).toBeCloseTo(0.5, 4);
    expect(cubicBezier(0.25, 0.1, 0.25, 1)(0.25)).toBeCloseTo(0.4085, 3); // CSS "ease"
  });
  it('springs overshoot but land exactly on the next key', () => {
    let max = 0;
    for (let p = 0; p <= 1; p += 0.01) max = Math.max(max, applyEase('overshoot', p, 1.8));
    expect(max).toBeGreaterThan(1.02);
    expect(applyEase('overshoot', 1, 1.8)).toBeCloseTo(1, 6);
    expect(applyEase('overshoot', 0, 1.8)).toBe(0);
    // a very short, unsettled spring still ends on 1
    expect(applyEase({ spring: { stiffness: 50, damping: 2, mass: 1 } }, 1, 0.2)).toBeCloseTo(1, 6);
  });
  it('hold steps at the end', () => {
    expect(applyEase('hold', 0.99, 1)).toBe(0);
    expect(applyEase('hold', 1, 1)).toBe(1);
  });
});

describe('valueAt', () => {
  const a = { keys: [{ t: 0, v: 0, ease: 'linear' as const }, { t: 2, v: 10 }] };
  it('interpolates, clamps before and after', () => {
    expect(valueAt(a, -1)).toBe(0);
    expect(valueAt(a, 1)).toBeCloseTo(5);
    expect(valueAt(a, 5)).toBe(10);
  });
  it('plain values pass through', () => { expect(valueAt(3, 1)).toBe(3); expect(valueAt<[number, number, number]>([1, 2, 3], 9)).toEqual([1, 2, 3]); });
  it('vec3 and colours interpolate', () => {
    expect(valueAt({ keys: [{ t: 0, v: [0, 0, 0] as [number, number, number], ease: 'linear' }, { t: 1, v: [2, 4, 6] as [number, number, number] }] }, 0.5)).toEqual([1, 2, 3]);
    const c = valueAt({ keys: [{ t: 0, v: '#000000' as string, ease: 'linear' }, { t: 1, v: '#ffffff' }] }, 0.5);
    expect(c).toMatch(/^#[0-9a-f]{6}$/);
    expect(c).not.toBe('#808080'); // mixed in linear light, not sRGB
  });
  it('wiggle is deterministic', () => {
    const w = { keys: [], value: 1, wiggle: { amount: 0.5, frequency: 2, seed: 4 } };
    expect(valueAt(w, 1.234)).toBe(valueAt(w, 1.234));
    expect(Math.abs(noise1(3.3, 1))).toBeLessThanOrEqual(1);
  });
});

describe('key editing', () => {
  const frame = 1 / 30;
  it('inserts sorted keys and replaces within half a frame', () => {
    let a = setKeyAt<number>(5, 1, 7, frame);
    a = setKeyAt<number>(a, 0, 1, frame);
    a = setKeyAt<number>(a, 1.01, 9, frame);
    expect(a.keys.map(k => [k.t, k.v])).toEqual([[0, 1], [1, 9]]);
  });
  it('setValue keeps plain values plain', () => { expect(setValue(2, 1, 4, frame)).toBe(4); });
  it('removing the last key returns a plain value', () => { expect(removeKeyAt({ keys: [{ t: 1, v: 3 }] }, 1, frame)).toBe(3); });
});

describe('schema', () => {
  it('sample and blank projects validate', () => {
    expect(parseProject(sampleProject).ok).toBe(true);
    expect(createSampleProject().layers.length).toBeGreaterThan(0);
    expect(createBlankProject().layers.length).toBe(0);
  });
  it('rejects bad input with readable errors', () => {
    const r = parseProject({ ...sampleProject, fps: 1000, camera: { ...sampleProject.camera, fov: 'wide' } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join('\n')).toMatch(/fps|camera/);
  });
  it('rejects javascript: asset urls and dangling asset refs', () => {
    const bad = parseProject({ ...sampleProject, assets: { a: { kind: 'image', name: 'x', src: 'javascript:alert(1)' } } });
    expect(bad.ok).toBe(false);
    const dangling = parseProject({ ...sampleProject, layers: [{ id: 'i', name: 'i', type: 'image', asset: 'nope', duration: 1 }] });
    expect(dangling.ok).toBe(false);
  });
  it('rejects unknown keys so typos from chat are caught', () => {
    expect(parseProject({ ...sampleProject, camra: {} }).ok).toBe(false);
  });
});
