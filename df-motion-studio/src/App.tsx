import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useStudio } from './store/useStudio';
import { Viewport } from './ui/Viewport';
import { NoticeLine, PromptBar, Rail, ScrubBar, Toast, TopBar } from './ui/Chrome';
import { ClaudeSheet, ExportSheet, ProjectSheet } from './ui/sheets/ProjectSheets';
import { TimelineSheet } from './ui/sheets/TimelineSheet';
import { LayerSheet, LayersSheet } from './ui/sheets/LayerSheets';
import { Sheet } from './ui/Sheet';
import { togglePlay } from './ui/player';

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

export function App() {
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

  // Keyboard shortcuts for desktop and hardware keyboards
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
      <Viewport insets={insets} />
      <TopBar />
      {sheetOpen ? null : <Rail />}
      <div className="dock" ref={dockRef} style={sheetOpen ? { bottom: bottomOffset } : undefined}>
        <NoticeLine />
        <ScrubBar />
        {sheetOpen ? null : <PromptBar />}
      </div>
      {sheet === 'claude' ? <ClaudeSheet /> : null}
      {sheet === 'project' ? <ProjectSheet /> : null}
      {sheet === 'export' ? <ExportSheet /> : null}
      {sheet === 'timeline' ? <TimelineSheet /> : null}
      {sheet === 'layers' ? <LayersSheet /> : null}
      {sheet === 'layer' ? <LayerSheet /> : null}
      {[ 'camera', 'light', 'scene', 'effects'].includes(sheet) ? (
        <Sheet title={sheet[0].toUpperCase() + sheet.slice(1)} tool={sheet}><p className="hint">This inspector arrives in the next phase.</p></Sheet>
      ) : null}
      <Toast />
    </div>
  );
}
