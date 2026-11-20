import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { parseProject, type Layer, type Project } from '../schema/project';
import { createSampleProject } from '../schema/defaults';

export type Quality = 'draft' | 'full';
export type SheetId = 'none' | 'timeline' | 'light' | 'camera' | 'scene' | 'effects' | 'layers' | 'layer' | 'claude' | 'export' | 'project';

type Notice = { text: string; undoTo: Project } | null;

type State = {
  project: Project;
  past: Project[];
  future: Project[];
  /** coalesces rapid edits (slider drags, gestures) into one undo step */
  lastKey: string | null;
  lastAt: number;
  time: number;
  playing: boolean;
  selectedId: string | null;
  quality: Quality;
  sheet: SheetId;
  notice: Notice;
  safeAreaIssue: { text: string; time: number } | null;
  /** a keyframe column picked in the timeline: owner is a layer id, 'camera' or 'lights' */
  selectedKey: { owner: string; t: number } | null;
  snapOn: boolean;
  /** bumps when local media becomes playable, so the preview re-resolves asset URLs */
  assetsVersion: number;
};

type Actions = {
  /** Apply an edit. Mutate the draft freely; it is a deep copy. */
  edit: (fn: (draft: Project) => void, coalesceKey?: string) => void;
  replaceProject: (p: Project, notice?: string) => void;
  undo: () => void;
  redo: () => void;
  setTime: (t: number) => void;
  setPlaying: (p: boolean) => void;
  select: (id: string | null) => void;
  setQuality: (q: Quality) => void;
  openSheet: (s: SheetId) => void;
  dismissNotice: () => void;
  setSafeAreaIssue: (s: { text: string; time: number } | null) => void;
  selectKey: (k: { owner: string; t: number } | null) => void;
  setSnap: (on: boolean) => void;
};

const STORAGE_KEY = 'dfms:project:v1';
const PREFS_KEY = 'dfms:prefs:v1';
const HISTORY_LIMIT = 120;
const COALESCE_MS = 700;

/**
 * Edits made while a pointer is held down (a drag, a slider, a pinch) are one
 * gesture, and collapse into a single undo step however slowly frames render.
 */
let pointerHeld = false;
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => { pointerHeld = true; }, true);
  const release = () => { pointerHeld = false; };
  window.addEventListener('pointerup', release, true);
  window.addEventListener('pointercancel', release, true);
}

function loadInitial(): Project {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const r = parseProject(JSON.parse(raw));
      if (r.ok) return r.project;
    }
  } catch { /* storage unavailable or corrupt: start fresh */ }
  return createSampleProject();
}
function loadPrefs(): { quality: Quality } {
  const fallback: Quality = typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || (navigator.hardwareConcurrency ?? 8) <= 4) ? 'draft' : 'full';
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}');
    if (p.quality === 'draft' || p.quality === 'full') return { quality: p.quality };
  } catch { /* ignore */ }
  return { quality: fallback };
}

export const useStudio = create<State & Actions>()(subscribeWithSelector((set, get) => ({
  project: loadInitial(),
  past: [],
  future: [],
  lastKey: null,
  lastAt: 0,
  time: 0,
  playing: false,
  selectedId: null,
  quality: loadPrefs().quality,
  sheet: 'none',
  notice: null,
  safeAreaIssue: null,
  selectedKey: null,
  snapOn: true,
  assetsVersion: 0,

  edit: (fn, coalesceKey) => {
    const s = get();
    const draft = structuredClone(s.project);
    fn(draft);
    const now = performance.now();
    const coalesce = !!coalesceKey && coalesceKey === s.lastKey && (pointerHeld || now - s.lastAt < COALESCE_MS);
    set({
      project: draft,
      past: coalesce ? s.past : [...s.past, s.project].slice(-HISTORY_LIMIT),
      future: [],
      lastKey: coalesceKey ?? null,
      lastAt: now,
    });
  },
  replaceProject: (p, notice) => {
    const s = get();
    set({
      project: p,
      past: [...s.past, s.project].slice(-HISTORY_LIMIT),
      future: [],
      lastKey: null,
      notice: notice ? { text: notice, undoTo: s.project } : null,
      selectedId: p.layers.some(l => l.id === s.selectedId) ? s.selectedId : null,
      time: Math.min(s.time, p.duration),
    });
  },
  undo: () => {
    const s = get();
    const prev = s.past[s.past.length - 1];
    if (!prev) return;
    set({ project: prev, past: s.past.slice(0, -1), future: [s.project, ...s.future], lastKey: null, notice: null });
  },
  redo: () => {
    const s = get();
    const next = s.future[0];
    if (!next) return;
    set({ project: next, past: [...s.past, s.project], future: s.future.slice(1), lastKey: null });
  },
  setTime: t => set({ time: Math.max(0, Math.min(t, get().project.duration)) }),
  setPlaying: p => set({ playing: p }),
  select: id => set({ selectedId: id, selectedKey: null }),
  setQuality: q => { set({ quality: q }); try { localStorage.setItem(PREFS_KEY, JSON.stringify({ quality: q })); } catch { /* ignore */ } },
  openSheet: sheet => set({ sheet }),
  dismissNotice: () => set({ notice: null }),
  setSafeAreaIssue: safeAreaIssue => set({ safeAreaIssue }),
  selectKey: selectedKey => set({ selectedKey }),
  setSnap: snapOn => set({ snapOn }),
})));

// ---- autosave (debounced; survives reloads, never blocks the UI) ----
let saveTimer: ReturnType<typeof setTimeout> | undefined;
export type SaveState = 'saved' | 'saving' | 'error';
export const saveState = { current: 'saved' as SaveState, listeners: new Set<() => void>() };
function setSave(s: SaveState) { saveState.current = s; saveState.listeners.forEach(l => l()); }
useStudio.subscribe(s => s.project, project => {
  setSave('saving');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(project)); setSave('saved'); }
    catch { setSave('error'); }
  }, 400);
});

// ---- logo safe-area check: re-run after edits (cheap: pure maths, no rendering) ----
let scanTimer: ReturnType<typeof setTimeout> | undefined;
function runScan() {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(async () => {
    const { scanSafeArea } = await import('../engine/safeArea');
    const { project, setSafeAreaIssue } = useStudio.getState();
    const r = scanSafeArea(project);
    setSafeAreaIssue(r.ok ? null : { text: `${r.layerName} leaves the safe area at ${r.time.toFixed(2)} s`, time: r.time });
  }, 250);
}
useStudio.subscribe(s => s.project, runScan);
import('../engine/bounds').then(m => m.onBoundsChange(runScan));

// ---- make local media playable whenever the asset list changes (boot, import, paste) ----
let lastAssetKeys = '';
async function hydrate() {
  const { project } = useStudio.getState();
  const keys = Object.values(project.assets).map(a => a.src).filter(s => s.startsWith('local:')).sort().join('|');
  if (keys === lastAssetKeys) return;
  lastAssetKeys = keys;
  const { hydrateAssets } = await import('../lib/assetStore');
  const missing = await hydrateAssets(project);
  useStudio.setState(s => ({ assetsVersion: s.assetsVersion + 1 }));
  if (missing.length) console.warn(`Media not found on this device: ${missing.join(', ')}`);
}
useStudio.subscribe(s => s.project.assets, () => { void hydrate(); });
if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') void hydrate();
if (typeof window !== 'undefined') runScan();

// ---- helpers ----
export const frameDur = () => 1 / useStudio.getState().project.fps;

export function editLayer(id: string, fn: (l: Layer) => void, coalesceKey?: string) {
  useStudio.getState().edit(p => {
    const l = p.layers.find(x => x.id === id);
    if (l && !l.locked) fn(l);
  }, coalesceKey);
}

export function newId(prefix: string, project: Project) {
  const used = new Set(project.layers.map(l => l.id));
  for (let i = 1; ; i++) { const id = `${prefix}-${i}`; if (!used.has(id)) return id; }
}
