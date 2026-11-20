/**
 * Local bounds measured by the renderer (models after loading, text after layout),
 * used by the safe-area check. Lives apart from the store so the CLI bundle stays UI-free.
 */
export type Bounds = [number, number, number, number, number, number];
export const measuredBounds = new Map<string, Bounds>();
const listeners = new Set<() => void>();
export function onBoundsChange(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }
export function reportBounds(id: string, b: Bounds) {
  const prev = measuredBounds.get(id);
  if (prev && prev.every((v, i) => Math.abs(v - b[i]) < 1e-3)) return;
  measuredBounds.set(id, b);
  listeners.forEach(f => f());
}
