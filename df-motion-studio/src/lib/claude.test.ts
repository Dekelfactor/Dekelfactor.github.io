import { describe, expect, it } from 'vitest';
import { buildClaudePayload, extractProject, summarizeChanges } from './claude';
import { createSampleProject } from '../schema/defaults';

describe('claude bridge', () => {
  it('round-trips through a chat reply', () => {
    const p = createSampleProject();
    const payload = buildClaudePayload(p, 'hold the logo longer');
    expect(payload).toContain('hold the logo longer');
    const r = extractProject(`Sure! Here you go:\n${payload.slice(payload.indexOf('```json'))}\nEnjoy.`, p);
    expect(r.ok).toBe(true);
  });
  it('restores omitted data: assets from the current project', () => {
    const p = createSampleProject();
    p.assets.pic = { kind: 'image', name: 'pic.png', src: 'data:image/png;base64,AAAA' };
    const payload = buildClaudePayload(p);
    expect(payload).not.toContain('base64,AAAA');
    const r = extractProject(payload, p);
    expect(r.ok && r.project.assets.pic.src).toBe('data:image/png;base64,AAAA');
  });
  it('reports readable errors for invalid replies', () => {
    const r = extractProject('```json\n{"name": "x"}\n```', createSampleProject());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThan(0);
  });
  it('summarises keyframe and layer changes', () => {
    const a = createSampleProject();
    const b = structuredClone(a);
    b.camera.position = { keys: [{ t: 0, v: [1, 3, 16] }, { t: 6.6, v: [0, 2.4, 13.5] }] };
    b.lights.rim.temperature = 3000;
    b.layers.push({ ...structuredClone(a.layers[2]), id: 'orb-2', name: 'Second orb' });
    const s = summarizeChanges(a, b);
    expect(s).toMatch(/Claude changed 2 keyframes and 1 setting\./);
    expect(s).toMatch(/Added Second orb/);
  });
});
