import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useStudio } from './store/useStudio';
import { OrbitHint, Viewport } from './ui/Viewport';
import { NoticeLine, PromptBar, Rail, ScrubBar, Toast, TopBar } from './ui/Chrome';
import { ClaudeSheet, ExportSheet, ProjectSheet } from './ui/sheets/ProjectSheets';
import { TimelineSheet } from './ui/sheets/TimelineSheet';
import { LayerSheet, LayersSheet } from './ui/sheets/LayerSheets';
import { CameraSheet, EffectsSheet, LightSheet, SceneSheet } from './ui/sheets/SceneSheets';
import { togglePlay } from './ui/player';
import { DockedContext } from './ui/Sheet';
import { PreviewBoundary } from './ui/ErrorBoundary';
import type { SheetId } from './store/useStudio';

function useSafeInsets() {
  const [s, setS] = useState({ top: 0, bottom: 0 });
  useLayoutEffect(() => {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    setS({ top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 });
    probe.remove();
  }, []);
  return s;
}

/** Height of the open sheet, so the preview and scrubber sit above it. */
function useSheetHeight(sheet: string) {
  const [h, setH] = useState(0);
  useLayoutEffect(() => {
    const el = document.querySelector<HTMLElement>('.sheet');
    if (!el) { setH(0); return; }
    const ro = new ResizeObserver(() => setH(el.getBoundingClientRect().height));
    ro.observe(el);
    setH(el.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, [sheet]);
  return h;
}

const DESKTOP_Q = '(min-width: 1024px)';
function useDesktop() {
  return useSyncExternalStore(
    f => { const m = window.matchMedia(DESKTOP_Q); m.addEventListener('change', f); return () => m.removeEventListener('change', f); },
    () => window.matchMedia(DESKTOP_Q).matches,
  );
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) useStudio.getState().redo(); else useStudio.getState().undo(); }
      else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); useStudio.getState().redo(); }
      else if (e.key === ' ' && (e.target as HTMLElement)?.getAttribute('role') !== 'slider' && tag !== 'BUTTON') { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

function SheetFor({ id }: { id: SheetId }) {
  switch (id) {
    case 'claude': return <ClaudeSheet />;
    case 'project': return <ProjectSheet />;
    case 'export': return <ExportSheet />;
    case 'timeline': return <TimelineSheet />;
    case 'layers': return <LayersSheet />;
    case 'layer': return <LayerSheet />;
    case 'light': return <LightSheet />;
    case 'camera': return <CameraSheet />;
    case 'scene': return <SceneSheet />;
    case 'effects': return <EffectsSheet />;
    default: return null;
  }
}

export function App() {
  return useDesktop() ? <DesktopApp /> : <MobileApp />;
}

/** Desktop: the same components in three panels, with the timeline docked under the stage. */
function DesktopApp() {
  useShortcuts();
  const sheet = useStudio(s => s.sheet);
  const selectedId = useStudio(s => s.selectedId);
  const right: SheetId = ['timeline', 'layers', 'none'].includes(sheet) ? (selectedId ? 'layer' : 'light') : sheet;
  return (
    <div className="desk">
      <TopBar />
      <DockedContext.Provider value={true}>
        <aside className="desk-left" aria-label="Layers panel"><LayersSheet /></aside>
        <main className="desk-center">
          <PreviewBoundary><Viewport insets={{ top: 16, bottom: 150, left: 20, right: 20 }} /></PreviewBoundary>
          <div className="dock desk-dock" role="region" aria-label="Playback and Claude"><NoticeLine /><ScrubBar /><PromptBar /></div>
          <OrbitHint />
        </main>
        <aside className="desk-right" aria-label="Inspector panel"><SheetFor id={right} /></aside>
        <section className="desk-bottom" aria-label="Timeline panel"><TimelineSheet /></section>
      </DockedContext.Provider>
      <Toast />
    </div>
  );
}

function MobileApp() {
  const sheet = useStudio(s => s.sheet);
  const safe = useSafeInsets();
  const sheetH = useSheetHeight(sheet);
  const dockRef = useRef<HTMLDivElement>(null);
  const [dockH, setDockH] = useState(130);

  useLayoutEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setDockH(el.getBoundingClientRect().height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useShortcuts();

  const sheetOpen = sheet !== 'none';
  const bottomOffset = sheetOpen ? sheetH + 8 : 0;
  const insets = {
    top: safe.top + 8 + 52 + 12,
    bottom: sheetOpen ? sheetH + 8 + 64 : dockH + safe.bottom + 20,
    left: 12,
    right: sheetOpen ? 12 : 70,
  };

  return (
    <div className="app">
      <main className="mobile-main" aria-label="Preview">
        <PreviewBoundary><Viewport insets={insets} /></PreviewBoundary>
        {sheetOpen ? null : <OrbitHint />}
      </main>
      <TopBar />
      {sheetOpen ? null : <Rail />}
      <div className="dock" role="region" aria-label="Playback and Claude" ref={dockRef} style={sheetOpen ? { bottom: bottomOffset } : undefined}>
        <NoticeLine />
        <ScrubBar />
        {sheetOpen ? null : <PromptBar />}
      </div>
      <SheetFor id={sheet} />
      <Toast />
    </div>
  );
}
