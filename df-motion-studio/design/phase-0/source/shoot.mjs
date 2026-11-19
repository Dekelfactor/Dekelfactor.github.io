import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'node:fs'; import http from 'node:http'; import path from 'node:path';
const root = path.dirname(new URL(import.meta.url).pathname);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); }).listen(5179);
const files = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
fs.mkdirSync(path.join(root, 'out'), { recursive: true });
for (const f of files) {
  const page = await ctx.newPage(); page.on('pageerror', e => console.log('[err]', f, e.message));
  await page.goto(`http://localhost:5179/${f}.html`, { waitUntil: 'networkidle' }); await page.evaluate(() => document.fonts.ready);
  // touch-target audit: every button must be >= 44x44
  const small = await page.$$eval('button', bs => bs.map(b => { const r = b.getBoundingClientRect(); return [b.getAttribute('aria-label') || b.textContent.trim(), Math.round(r.width), Math.round(r.height)]; }).filter(([, w, h]) => w < 44 || h < 44));
  if (small.length) console.log(f, 'small targets:', JSON.stringify(small));
  await page.screenshot({ path: path.join(root, 'out', f + '.png') }); console.log('shot', f);
}
await browser.close(); server.close();
