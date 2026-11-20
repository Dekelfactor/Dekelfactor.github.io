#!/usr/bin/env node
// Render a DF Motion Studio project.json to MP4 on your computer with Remotion.
//
//   npm run render -- my-project.json [--aspect 9:16|1:1|16:9] [--out out/name.mp4]
//                     [--crf 18] [--gl angle|swangle|egl|vulkan] [--allow-clipping]
//
// Media imported on a phone is embedded in the exported project.json as data: URLs;
// this script unpacks it into a temporary public folder before rendering.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const has = name => args.includes(`--${name}`);
const file = args.find(a => a.endsWith('.json'));
if (!file || has('help')) {
  console.log('Usage: npm run render -- project.json [--aspect 9:16|1:1|16:9] [--out out/video.mp4] [--crf 18] [--gl angle] [--allow-clipping]');
  process.exit(file ? 0 : 1);
}

let project;
try { project = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8')); }
catch (e) { console.error(`Could not read ${file}: ${e.message}`); process.exit(1); }

const aspect = flag('aspect', project.aspect ?? '9:16');
if (!['9:16', '1:1', '16:9'].includes(aspect)) { console.error('--aspect must be 9:16, 1:1 or 16:9'); process.exit(1); }
project.aspect = aspect;

// Unpack embedded media (data: URLs) into a private temp public dir.
const publicDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dfms-public-'));
fs.cpSync(path.join(root, 'public'), publicDir, { recursive: true });
fs.mkdirSync(path.join(publicDir, 'media'));
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/avif': 'avif', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/ogg': 'ogg', 'audio/aac': 'aac', 'model/gltf-binary': 'glb', 'application/octet-stream': 'glb' };
const missing = [];
for (const [id, a] of Object.entries(project.assets ?? {})) {
  if (typeof a.src !== 'string') continue;
  const m = /^data:([\w/+.-]+);base64,(.*)$/s.exec(a.src);
  if (m) {
    const safeId = id.replace(/[^\w-]/g, '_');
    const name = `${safeId}.${EXT[m[1]] ?? (a.kind === 'model' ? 'glb' : 'bin')}`;
    fs.writeFileSync(path.join(publicDir, 'media', name), Buffer.from(m[2], 'base64'));
    a.src = `static:media/${name}`;
  } else if (a.src.startsWith('local:')) missing.push(a.name ?? id);
}
if (missing.length) {
  console.error(`These files only exist in the browser that imported them: ${missing.join(', ')}.\nIn the app, use Export → Download, which embeds your media, then render that file.`);
  process.exit(1);
}

const out = path.resolve(flag('out', path.join(root, 'out', `${path.basename(file, '.json')}-${aspect.replace(':', 'x')}.mp4`)));
fs.mkdirSync(path.dirname(out), { recursive: true });
const inputProps = { project, quality: 'full', allowClipping: has('allow-clipping') };
const chromiumOptions = { gl: flag('gl', process.platform === 'linux' ? 'swangle' : 'angle') };
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || undefined;

try {
  console.log('Bundling…');
  const serveUrl = await bundle({ entryPoint: path.join(root, 'src/remotion/index.ts'), publicDir, onProgress: () => {} });
  const composition = await selectComposition({ serveUrl, id: 'Studio', inputProps, chromiumOptions, browserExecutable });
  console.log(`Rendering ${composition.width}×${composition.height}, ${composition.fps} fps, ${composition.durationInFrames} frames → ${path.relative(process.cwd(), out)}`);
  let last = -1;
  await renderMedia({
    serveUrl, composition, inputProps, codec: 'h264', crf: Number(flag('crf', 18)), outputLocation: out,
    chromiumOptions, browserExecutable, concurrency: Number(flag('concurrency', 0)) || null,
    onProgress: ({ progress }) => { const p = Math.floor(progress * 20); if (p !== last) { last = p; process.stdout.write(`\r${'█'.repeat(p)}${'░'.repeat(20 - p)} ${Math.round(progress * 100)}%`); } },
  });
  console.log(`\nDone: ${out}`);
} catch (e) {
  console.error(`\nRender failed: ${e.message?.split('\n').slice(0, 6).join('\n')}`);
  process.exitCode = 1;
} finally {
  fs.rmSync(publicDir, { recursive: true, force: true });
}
