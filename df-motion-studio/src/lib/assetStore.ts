import type { Asset, Project } from '../schema/project';
import { registerLocalAsset } from '../remotion/assets';

/**
 * Imported media lives in IndexedDB on this device (localStorage is far too small),
 * and project.json refers to it as "local:<id>".
 */
const DB = 'dfms-assets', STORE = 'blobs';
let dbp: Promise<IDBDatabase> | null = null;
function db() {
  dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((res, rej) => { const r = fn(d.transaction(STORE, mode).objectStore(STORE)); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}

export const LIMITS: Record<Asset['kind'], { mb: number; accept: string; mimes: RegExp; ext: RegExp }> = {
  image: { mb: 25, accept: 'image/png,image/jpeg,image/webp,image/avif', mimes: /^image\/(png|jpeg|webp|avif)$/, ext: /\.(png|jpe?g|webp|avif)$/i },
  video: { mb: 300, accept: 'video/mp4,video/webm,video/quicktime', mimes: /^video\/(mp4|webm|quicktime)$/, ext: /\.(mp4|webm|mov|m4v)$/i },
  audio: { mb: 60, accept: 'audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/ogg,audio/aac', mimes: /^audio\//, ext: /\.(mp3|m4a|wav|ogg|aac)$/i },
  model: { mb: 80, accept: '.glb,model/gltf-binary', mimes: /^(model\/gltf-binary|application\/octet-stream|)$/, ext: /\.glb$/i },
};

/** Validates and stores a file; returns the asset record (src "local:<id>"). Throws a readable Error. */
export async function importFile(kind: Asset['kind'], file: File): Promise<{ id: string; asset: Asset }> {
  const lim = LIMITS[kind];
  if (!lim.ext.test(file.name) && !lim.mimes.test(file.type)) throw new Error(`${file.name} is not a supported ${kind} file.`);
  if (file.size > lim.mb * 1024 * 1024) throw new Error(`${file.name} is larger than ${lim.mb} MB.`);
  if (kind === 'model') {
    const magic = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    if (String.fromCharCode(...magic) !== 'glTF') throw new Error(`${file.name} is not a binary glTF (.glb) file.`);
  }
  const id = `${kind}-${crypto.randomUUID().slice(0, 8)}`;
  await tx('readwrite', s => s.put(file, id));
  const url = URL.createObjectURL(file);
  registerLocalAsset(id, url);
  const meta = await probe(kind, url);
  return { id, asset: { kind, name: file.name.slice(0, 200), src: `local:${id}`, ...meta } };
}

async function probe(kind: Asset['kind'], url: string): Promise<{ aspect?: number; duration?: number }> {
  try {
    if (kind === 'image') {
      const img = new Image(); img.src = url; await img.decode();
      return { aspect: img.naturalWidth / img.naturalHeight };
    }
    if (kind === 'video' || kind === 'audio') {
      const el = document.createElement(kind); el.preload = 'metadata'; el.src = url;
      await new Promise<void>((res, rej) => { el.onloadedmetadata = () => res(); el.onerror = () => rej(new Error('Could not read that media file.')); });
      const v = el as HTMLVideoElement;
      return { duration: Number.isFinite(el.duration) ? el.duration : undefined, aspect: kind === 'video' && v.videoWidth ? v.videoWidth / v.videoHeight : undefined };
    }
  } catch { /* metadata is optional */ }
  return {};
}

/** Make every local asset referenced by the project playable (object URLs). Returns ids that are missing on this device. */
export async function hydrateAssets(project: Project): Promise<string[]> {
  const missing: string[] = [];
  for (const [id, a] of Object.entries(project.assets)) {
    if (!a.src.startsWith('local:')) continue;
    const key = a.src.slice(6);
    try {
      const blob = await tx<Blob | undefined>('readonly', s => s.get(key) as IDBRequest<Blob | undefined>);
      if (blob) registerLocalAsset(key, URL.createObjectURL(blob)); else missing.push(id);
    } catch { missing.push(id); }
  }
  return missing;
}

/** Inline local media as data: URLs so a project file can be rendered on another computer. */
export async function embedAssets(project: Project): Promise<Project> {
  const p = structuredClone(project);
  for (const a of Object.values(p.assets)) {
    if (!a.src.startsWith('local:')) continue;
    const blob = await tx<Blob | undefined>('readonly', s => s.get(a.src.slice(6)) as IDBRequest<Blob | undefined>);
    if (!blob) continue;
    a.src = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.onerror = () => rej(fr.error); fr.readAsDataURL(blob); });
  }
  return p;
}
