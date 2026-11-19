import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(5178);

fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('console', m => console.log('[page]', m.text()));
page.on('pageerror', e => console.log('[err]', e.message));
await page.goto('http://localhost:5178/scene.html');
await page.waitForFunction(() => window.ready, null, { timeout: 30000 });

const SAFE = 0.08; // logo must keep >= 8% of frame on every side
let failed = 0;
function save(name, d) {
  fs.writeFileSync(path.join(root, 'assets', name + '.png'), Buffer.from(d.url.split(',')[1], 'base64'));
  let ok = d.margin >= SAFE;
  if (name === 'stage') { // UI-occluded viewport: logo must fit between top bar (99px) and scrubber (448px) of 844
    const [x0, x1, y0, y1] = d.ndc, top = 1 - 2 * 99 / 844, bot = 1 - 2 * 448 / 844;
    const vm = Math.min((y0 - bot) / 2, (top - y1) / 2, (x0 + 1) / 2, (1 - x1) / 2);
    console.log(`     stage visible-region margin ${(vm * 100).toFixed(1)}%`); ok = ok && vm >= 0.03;
  }
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name.padEnd(14)} logo margin ${(d.margin*100).toFixed(1)}%`);
}
const shots = {
  // 9:16 hero frame, used in A and C previews (rendered at 2x)
  hero: { w: 720, h: 1280, camPos: [1.2, 3.0, 15.5], look: [0, 1.55, 0], fov: 40, rotY: -0.2, orbT: 0.32 },
  // full-bleed stage viewport for B (390x844 @2x), wider orbit view
  stage: { w: 780, h: 1688, camPos: [-6.5, 5.2, 17.5], look: [0, -1.2, 0], fov: 40, rotY: 0.12, orbT: 0.62 },
  // 16:9 frame for comparisons
  wide: { w: 1280, h: 720, camPos: [0, 2.0, 9.2], look: [0, 1.35, 0], fov: 30, rotY: -0.15, orbT: 0.2 },
};
for (const [name, cfg] of Object.entries(shots)) {
  const data = await page.evaluate(c => window.renderShot(c), cfg);
  save(name, data);
}
// filmstrip: a camera dolly/orbit move across 8 frames
for (let i = 0; i < 8; i++) {
  const t = i / 7, ang = -0.5 + t * 1.0, r = 13 - t * 2.0;
  const data = await page.evaluate(c => window.renderShot(c), {
    w: 240, h: 240, camPos: [Math.sin(ang) * r, 2.2 + t * 0.6, Math.cos(ang) * r], look: [0, 1.4, 0], fov: 30, rotY: -0.2 + t * 0.4, orbT: t,
  });
  save(`strip${i}`, data);
}
// environment preset thumbnails
for (const preset of ['studio', 'dusk', 'noir', 'daylight']) {
  const data = await page.evaluate(c => window.renderShot(c), { w: 120, h: 246, preset, camPos: [0.3, 2.4, 14.5], look: [0, 1.25, 0], fov: 36, rotY: -0.2, orbT: 0.3 });
  save(`env-${preset}`, data);
}
await browser.close();
server.close();
console.log(failed ? `${failed} frame(s) clip the logo` : 'all frames keep the logo inside the safe area'); process.exitCode = failed ? 1 : 0;
