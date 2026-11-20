import type { Project } from '../schema/project';

/**
 * Maps "local:<id>" asset sources to object URLs. The editor registers files
 * kept in IndexedDB here; the CLI renderer receives data: URLs instead.
 */
const localUrls = new Map<string, string>();
export function registerLocalAsset(id: string, url: string) { localUrls.set(id, url); }
export function unregisterLocalAsset(id: string) {
  const u = localUrls.get(id);
  if (u?.startsWith('blob:')) URL.revokeObjectURL(u);
  localUrls.delete(id);
}

export function resolveAsset(project: Project, assetId: string): string | null {
  const a = project.assets[assetId];
  if (!a) return null;
  if (a.src.startsWith('local:')) return localUrls.get(a.src.slice(6)) ?? null;
  return a.src;
}
