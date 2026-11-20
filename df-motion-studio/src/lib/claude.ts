import { parseProject, SCHEMA_ID, type Project } from '../schema/project';

/**
 * Bridge between the editor and Claude in chat. The project travels as plain
 * text through the clipboard; nothing is sent anywhere by the app itself.
 */
const GUIDE = `DF Motion Studio project (${SCHEMA_ID}). Conventions:
- Times are seconds, angles degrees, colours "#rrggbb". Keyframe times are absolute project time.
- Any animatable value is either plain (e.g. 1.2 or [0,1,0]) or {"keys":[{"t":0,"v":...,"ease":"smooth"}], "wiggle":{"amount":0.1,"frequency":1,"seed":1}}.
- Eases: linear, hold, ease, easeIn, easeOut, easeInOut, smooth, snappy, overshoot, bounce, {"bezier":[x1,y1,x2,y2]} or {"spring":{"stiffness":170,"damping":18,"mass":1}}. A key's ease shapes the move to the next key.
- layers[].type: text | shape | model | image | video | audio. Shapes: box, roundedBox, sphere, torus, cylinder, plane, df-monogram.
- lights.key|fill|rim: azimuth (0 = front, 90 = camera right), elevation, intensity (0–3), temperature (K), softness (0–1).
- camera: position, target, fov, roll, dof {enabled, focusDistance, aperture}.
- environment.preset: studio | dusk | noir | daylight | none. effects: bloom, grain, vignette, grade, motionBlur.
- Layers with "protect": true (the DF logo) must stay fully inside the frame on every frame, with safeArea margin.
- Keep ids stable. Unknown keys are rejected. Reply with the COMPLETE project as one json code block.`;

const OMITTED = 'data:omitted';

/** Large embedded media is replaced by a placeholder so the payload stays chat-sized. */
export function stripForClaude(project: Project): Project {
  const p = structuredClone(project);
  for (const a of Object.values(p.assets)) if (a.src.startsWith('data:')) a.src = OMITTED;
  return p;
}

export function buildClaudePayload(project: Project, instruction?: string) {
  const ask = instruction?.trim()
    ? `Please change my video: ${instruction.trim()}`
    : 'Here is my video project. Tell me what you would improve, then return the updated project.';
  return `${ask}\n\n${GUIDE}\n\n\`\`\`json\n${JSON.stringify(stripForClaude(project), null, 2)}\n\`\`\`\n`;
}

/** Find the project JSON in a reply (fenced block or bare object) and validate it. */
export function extractProject(text: string, current: Project): { ok: true; project: Project } | { ok: false; errors: string[] } {
  const candidates: string[] = [];
  // every stretch between code fences (robust to stray fences in surrounding prose)
  const parts = text.split('```');
  for (const part of parts) {
    const body = part.replace(/^[a-zA-Z]*\s*\n/, '').trim();
    if (body.startsWith('{')) candidates.push(body);
  }
  const first = text.search(/\{\s*"/), last = text.lastIndexOf('}');
  if (first >= 0 && last > first) candidates.push(text.slice(first, last + 1));
  let lastErrors: string[] = ['No project JSON found. Paste the whole reply, or just the json block.'];
  for (const c of candidates.reverse()) {
    let json: unknown;
    try { json = JSON.parse(c); } catch { lastErrors = ['The JSON could not be read. Check it was copied completely.']; continue; }
    if (json && typeof json === 'object' && 'assets' in json) {
      const assets = (json as { assets: Record<string, { src?: string }> }).assets;
      for (const [id, a] of Object.entries(assets ?? {})) {
        if (a?.src === OMITTED && current.assets[id]) a.src = current.assets[id].src;
      }
    }
    const r = parseProject(json);
    if (r.ok) return r;
    lastErrors = r.errors;
  }
  return { ok: false, errors: lastErrors };
}

// ---- change summary ("Claude changed 4 keyframes") ----
type Counts = { keys: number; values: number; added: string[]; removed: string[] };

function walk(a: unknown, b: unknown, c: Counts, path: string) {
  if (a === b) return;
  const isKeys = path.endsWith('.keys');
  if (Array.isArray(a) && Array.isArray(b)) {
    if (isKeys) {
      const n = Math.max(a.length, b.length);
      for (let i = 0; i < n; i++) if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) c.keys++;
      return;
    }
    if (a.length === b.length && a.every(x => typeof x !== 'object')) { if (JSON.stringify(a) !== JSON.stringify(b)) c.values++; return; }
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) walk(a[i], b[i], c, `${path}[${i}]`);
    return;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const aKeys = 'keys' in (a as object), bKeys = 'keys' in (b as object);
    if (aKeys !== bKeys) { // plain value became animated, or the reverse
      const ka = aKeys ? (a as { keys: unknown[] }).keys.length : 0, kb = bKeys ? (b as { keys: unknown[] }).keys.length : 0;
      c.keys += Math.max(ka, kb); return;
    }
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) walk((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], c, `${path}.${k}`);
    return;
  }
  c.values++;
}

export function summarizeChanges(before: Project, after: Project): string {
  const c: Counts = { keys: 0, values: 0, added: [], removed: [] };
  const bIds = new Map(before.layers.map(l => [l.id, l]));
  const aIds = new Map(after.layers.map(l => [l.id, l]));
  for (const l of after.layers) if (!bIds.has(l.id)) c.added.push(l.name);
  for (const l of before.layers) if (!aIds.has(l.id)) c.removed.push(l.name);
  for (const l of after.layers) { const prev = bIds.get(l.id); if (prev) walk(prev, l, c, 'layer'); }
  const { layers: _a, ...restA } = after; const { layers: _b, ...restB } = before;
  walk(restB, restA, c, 'project');
  const parts: string[] = [];
  if (c.keys) parts.push(`${c.keys} keyframe${c.keys === 1 ? '' : 's'}`);
  if (c.values) parts.push(`${c.values} setting${c.values === 1 ? '' : 's'}`);
  let s = parts.length ? `Claude changed ${parts.join(' and ')}.` : 'No changes from Claude.';
  if (c.added.length) s += ` Added ${c.added.join(', ')}.`;
  if (c.removed.length) s += ` Removed ${c.removed.join(', ')}.`;
  return s;
}
