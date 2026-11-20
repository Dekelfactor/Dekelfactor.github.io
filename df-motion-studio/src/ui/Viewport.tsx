import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { StudioComposition, type CompositionProps } from '../remotion/Scene';
import { ASPECT_SIZE } from '../schema/project';
import { useStudio } from '../store/useStudio';
import { setPlayer } from './player';

/** Space the floating UI takes on each edge, so the frame sits in the visible area. */
export type Insets = { top: number; bottom: number; left: number; right: number };

export function Viewport({ insets, children }: { insets: Insets; children?: React.ReactNode }) {
  const project = useStudio(s => s.project);
  const quality = useStudio(s => s.quality);
  const setTime = useStudio(s => s.setTime);
  const setPlaying = useStudio(s => s.setPlaying);
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

  const inputProps = useMemo<CompositionProps>(() => ({ project, quality, dpr: Number(dpr.toFixed(3)) }), [project, quality, dpr]);

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

function SafeGuide({ inset }: { inset: number }) {
  const bad = useStudio(s => s.safeAreaIssue !== null);
  const pct = `${(inset * 100).toFixed(2)}%`;
  return <div className={`safe-guide${bad ? ' bad' : ''}`} style={{ left: pct, right: pct, top: pct, bottom: pct }} aria-hidden="true" />;
}
