// Screenshot the running app at phone or desktop size; reports console errors.
// usage: node scripts/shot.mjs <url> <out.png> [phone|desktop] [actions.json]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(process.env.NODE_PATH + '/playwright'); }

const [url, out, kind = 'phone', actionsFile] = process.argv.slice(2);
const size = kind === 'desktop' ? { width: 1440, height: 900 } : { width: 390, height: 844 };
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 2, hasTouch: kind !== 'desktop', isMobile: kind !== 'desktop' });
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text().slice(0, 300)}`); });
page.on('pageerror', e => errors.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'load' });
if (actionsFile) {
  const actions = JSON.parse(fs.readFileSync(actionsFile, 'utf8'));
  for (const a of actions) {
    console.log('step', JSON.stringify(a).slice(0, 90));
    if (a.click) await page.click(a.click, { timeout: 8000 });
    if (a.eval) await page.evaluate(a.eval);
    if (a.fill) await page.fill(a.fill[0], a.fill[1]);
    if (a.fillEval) await page.fill(a.fillEval[0], await page.evaluate(a.fillEval[1]));
    if (a.wait) await page.waitForTimeout(a.wait);
  }
}
await page.waitForTimeout(Number(process.env.SETTLE ?? 7000));
await page.screenshot({ path: out });
console.log(errors.length ? errors.join('\n') : 'no console errors');
await browser.close();
