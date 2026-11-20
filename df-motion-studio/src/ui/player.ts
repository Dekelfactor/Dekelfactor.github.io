import type { PlayerRef } from '@remotion/player';
import { useStudio } from '../store/useStudio';

/** One Player instance; UI pieces seek and play through this bridge. */
let ref: PlayerRef | null = null;
export function setPlayer(r: PlayerRef | null) { ref = r; }
export function getPlayer() { return ref; }

export function seek(seconds: number) {
  const { project, setTime } = useStudio.getState();
  const t = Math.max(0, Math.min(seconds, project.duration));
  setTime(t);
  ref?.seekTo(Math.min(Math.round(t * project.fps), Math.round(project.duration * project.fps) - 1));
}
export function togglePlay() {
  if (!ref) return;
  if (ref.isPlaying()) ref.pause(); else ref.play();
}
export function pause() { ref?.pause(); }
