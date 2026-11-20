import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { StudioComposition, type CompositionProps } from '../remotion/Scene';
import { ASPECT_SIZE } from '../schema/project';
import { useStudio } from '../store/useStudio';
import { setPlayer } from './player';
import { orbitBy } from './sheets/SceneSheets';

/** Space the floating UI takes on each edge, so the frame sits in the visible area. */
export type Insets = { top: number; bottom: number; left: number; right: number };

export function Viewport({ insets, children }: { insets: Insets; children?: React.ReactNode }) {
  const project = useStudio(s => s.project);
  const quality = useStudio(s => s.quality);
  const setTime = useStudio(s => s.setTime);
  const setPlaying = useStudio(s => s.setPlaying);
  const assetsVersion = useStudio(s => s.assetsVersion);
  const playerRef = useRef<PlayerRef>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 390, h: 844 });

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const { width: cw, height: ch } = ASPECT_SIZE[project.aspect];
  const availW = Math.max(80, box.w - insets.left - insets.right);
  const availH = Math.max(80, box.h - insets.top - insets.bottom);
  const scale = Math.min(availW / cw, availH / ch);
  const w = Math.round(cw * scale), h = Math.round(ch * scale);
  const left = insets.left + (availW - w) / 2, top = insets.top + (availH - h) / 2;

  // Cap the WebGL pixel ratio: the canvas renders at composition size × dpr, then the Player scales it down.
  const deviceDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const cap = quality === 'draft' ? 1.25 : 2;
  const dpr = Math.max(0.25, Math.min(2, scale * Math.min(deviceDpr, cap)));
  const durationInFrames = Math.max(1, Math.round(project.duration * project.fps));

  // assetsVersion forces a fresh props object once local media URLs are registered
  const inputProps = useMemo<CompositionProps>(() => ({ project, quality, dpr: Number(dpr.toFixed(3)) }), [project, quality, dpr, assetsVersion]);

  useEffect(() => {
    const p = playerRef.current;
    setPlayer(p);
    if (!p) return;
    const onFrame = (e: { detail: { frame: number } }) => setTime(e.detail.frame / project.fps);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    p.addEventListener('frameupdate', onFrame);
    p.addEventListener('play', onPlay);
    p.addEventListener('pause', onPause);
    p.addEventListener('ended', onPause);
    return () => {
      p.removeEventListener('frameupdate', onFrame);
      p.removeEventListener('play', onPlay);
      p.removeEventListener('pause', onPause);
      p.removeEventListener('ended', onPause);
    };
  }, [project.fps, setTime, setPlaying]);

  useStageGestures(hostRef);
  const safe = project.safeArea;
  return (
    <div className="stage" ref={hostRef}>
      <div className="player-frame" style={{ position: 'absolute', left, top, width: w, height: h }} aria-label="Video preview" role="img">
        <Player
          ref={playerRef}
          component={StudioComposition}
          inputProps={inputProps}
          durationInFrames={durationInFrames}
          compositionWidth={cw}
          compositionHeight={ch}
          fps={project.fps}
          style={{ width: w, height: h }}
          controls={false}
          loop
          clickToPlay={false}
          doubleClickToFullscreen={false}
          spaceKeyToPlayOrPause={false}
          moveToBeginningWhenEnded={false}
          acknowledgeRemotionLicense
        />
        <SafeGuide inset={safe} />
        {children}
      </div>
    </div>
  );
}

/**
 * Two fingers anywhere on the stage orbit the camera (drag) and dolly it (pinch).
 * Desktop: Alt-drag or right-drag orbits, the wheel dollies. One finger is left
 * alone so the stage never edits by accident.
 */
function useStageGestures(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pts = new Map<number, { x: number; y: number }>();
    let prev: { cx: number; cy: number; d: number } | null = null;
    let mouse: { x: number; y: number } | null = null;
    const centroid = () => {
      const a = [...pts.values()];
      return { cx: (a[0].x + a[1].x) / 2, cy: (a[0].y + a[1].y) / 2, d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1 };
    };
    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('button, input, [role=slider], .sheet, .topbar, .rail, .dock')) return;
      if (e.pointerType === 'touch') {
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.size === 2) { prev = centroid(); markHintSeen(); }
      } else if (e.altKey || e.button === 2) {
        mouse = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId); e.preventDefault();
      }
    };
    const move = (e: PointerEvent) => {
      if (pts.has(e.pointerId)) {
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.size === 2 && prev) {
          const c = centroid();
          orbitBy(-(c.cx - prev.cx) * 0.35, (c.cy - prev.cy) * 0.25, prev.d / c.d, 'stage-orbit');
          prev = c;
        }
      } else if (mouse) {
        orbitBy(-(e.clientX - mouse.x) * 0.35, (e.clientY - mouse.y) * 0.25, 1, 'stage-orbit');
        mouse = { x: e.clientX, y: e.clientY };
      }
    };
    const up = (e: PointerEvent) => { pts.delete(e.pointerId); if (pts.size < 2) prev = null; mouse = null; };
    const wheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('.sheet, .dock, .topbar, .rail')) return;
      e.preventDefault();
      orbitBy(0, 0, Math.exp(e.deltaY * 0.0015), 'stage-dolly');
    };
    const ctx = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.sheet, .dock, .topbar, .rail')) e.preventDefault(); };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false }); el.addEventListener('contextmenu', ctx);
    return () => {
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel); el.removeEventListener('contextmenu', ctx);
    };
  }, [ref]);
}

const HINT_KEY = 'dfms:orbit-hint-seen';
function markHintSeen() { try { localStorage.setItem(HINT_KEY, '1'); } catch { /* ignore */ } }
export function OrbitHint() {
  const [show, setShow] = useState(() => { try { return !localStorage.getItem(HINT_KEY); } catch { return false; } });
  useEffect(() => { if (!show) return; const t = setTimeout(() => setShow(false), 5000); return () => clearTimeout(t); }, [show]);
  if (!show) return null;
  const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  return <div className="orbit-hint glass" role="note">{coarse ? 'Two fingers to orbit, pinch to dolly' : 'Alt-drag to orbit, scroll to dolly'}</div>;
}

function SafeGuide({ inset }: { inset: number }) {
  const bad = useStudio(s => s.safeAreaIssue !== null);
  const pct = `${(inset * 100).toFixed(2)}%`;
  return <div className={`safe-guide${bad ? ' bad' : ''}`} style={{ left: pct, right: pct, top: pct, bottom: pct }} aria-hidden="true" />;
}
