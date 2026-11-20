// Drives the timeline with real pointer events and asserts on project state.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pw = require(process.env.NODE_PATH + '/playwright');
const url = process.argv[2] ?? 'http://127.0.0.1:5190/';

const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(1500);
const S = expr => page.evaluate(`(() => { const s = window.__studio.getState(); return ${expr}; })()`);
let fails = 0;
const check = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); if (!cond) fails++; };

await page.click('button[aria-label=Timeline]');
await page.waitForTimeout(400);

// select caption clip, then drag its body right by ~1 s
const cap = page.locator('.tl-clip', { hasText: 'Caption' });
await cap.click();
check('tap selects clip', await S('s.selectedId') === 'caption');
const pps = await page.evaluate(() => { const c = document.querySelector('.tl-clip'); return null; });
const box = await cap.boundingBox();
const startBefore = await S("s.project.layers.find(l => l.id === 'caption').start");
const keyBefore = await S("s.project.layers.find(l => l.id === 'caption').transform.opacity.keys[0].t");
await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2);
await page.mouse.down();
for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + box.width * 0.6 + i * 3, box.y + box.height / 2);
await page.mouse.up();
const startAfter = await S("s.project.layers.find(l => l.id === 'caption').start");
const keyAfter = await S("s.project.layers.find(l => l.id === 'caption').transform.opacity.keys[0].t");
check('drag moves clip', startAfter > startBefore, `${startBefore} -> ${startAfter}`);
check('moving a clip moves its keys', Math.abs((keyAfter - keyBefore) - (startAfter - startBefore)) < 1e-6);
check('one drag is one undo step', await S('s.past.length') === 1, `past=${await S('s.past.length')}`);

// trim the end handle left
await page.locator('.tl-trim.r').scrollIntoViewIfNeeded();
const r = await page.locator('.tl-trim.r').boundingBox();
const durBefore = await S("s.project.layers.find(l => l.id === 'caption').duration");
await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await page.mouse.down();
for (let i = 1; i <= 8; i++) await page.mouse.move(r.x + r.width / 2 - i * 4, r.y + r.height / 2);
await page.mouse.up();
const durAfter = await S("s.project.layers.find(l => l.id === 'caption').duration");
check('trim shortens clip', durAfter < durBefore, `${durBefore} -> ${durAfter}`);

// split at playhead
await page.evaluate(() => window.__seek(4));
await page.click('button[aria-label="Split clip at playhead"]');
const n = await S('s.project.layers.length');
check('split adds a clip', n === 5, `layers=${n}`);

// undo everything back
for (let i = 0; i < 3; i++) await page.click('button[aria-label=Undo]');
check('undo restores', await S("s.project.layers.length") === 4 && await S("s.project.layers.find(l => l.id === 'caption').start") === startBefore);

// select a key on the logo and change its ease from the curve editor
await page.locator('.tl-clip', { hasText: 'DF monogram' }).click();
await page.click('button[aria-label="Keyframe at 0.00 seconds"] >> nth=2');
check('tap diamond selects key', JSON.stringify(await S('s.selectedKey')) === JSON.stringify({ owner: 'logo', t: 0 }));
await page.click('.chip-btn:has-text("Bounce")');
check('ease preset applies', await S("JSON.stringify(s.project.layers.find(l => l.id === 'logo').transform.rotation.keys[0].ease)") === '"bounce"');
await page.click('[role=group][aria-label="Curve type"] button:has-text("Bezier")');
await page.locator('.curve-handle').first().scrollIntoViewIfNeeded();
const h = await page.locator('.curve-handle').first().boundingBox();
await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await page.mouse.down();
await page.mouse.move(h.x + h.width / 2 + 20, h.y + h.height / 2 - 30, { steps: 5 }); await page.mouse.up();
const ease = await S("s.project.layers.find(l => l.id === 'logo').transform.rotation.keys[0].ease");
check('bezier handle drag writes a custom curve', !!ease && Array.isArray(ease.bezier), JSON.stringify(ease));

// retime a key by dragging its diamond
await page.click('.chip-btn:has-text("Smooth")');
const d = page.locator('button[aria-label="Keyframe at 1.80 seconds"]');
await d.scrollIntoViewIfNeeded();
const db = await d.boundingBox();
await page.mouse.move(db.x + db.width / 2, db.y + db.height / 2); await page.mouse.down();
for (let i = 1; i <= 6; i++) await page.mouse.move(db.x + db.width / 2 + i * 5, db.y + db.height / 2);
await page.mouse.up();
const times = await S("s.project.layers.find(l => l.id === 'logo').transform.rotation.keys.map(k => k.t)");
check('dragging a diamond retimes the key', times[1] > 1.8, JSON.stringify(times));

// pinch zoom (two touch pointers) changes the ruler scale
await page.locator('.tl-scroll').scrollIntoViewIfNeeded();
const before = await page.locator('.tl-inner').evaluate(e => e.getBoundingClientRect().width);
await page.locator('.tl-scroll').evaluate(el => {
  const r = el.getBoundingClientRect(), y = r.top + 120, cx = r.left + r.width / 2;
  const ev = (type, id, x) => el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true }));
  ev('pointerdown', 1, cx - 40); ev('pointerdown', 2, cx + 40);
  for (let i = 1; i <= 10; i++) { ev('pointermove', 1, cx - 40 - i * 8); ev('pointermove', 2, cx + 40 + i * 8); }
  ev('pointerup', 1, cx - 120); ev('pointerup', 2, cx + 120);
});
await page.waitForTimeout(200);
const after = await page.locator('.tl-inner').evaluate(e => e.getBoundingClientRect().width);
check('pinch zooms the timeline', after > before * 1.5, `${before.toFixed(0)} -> ${after.toFixed(0)}`);

// layer inspector: keyframe toggle on position
await page.click('button:has-text("Layers")');
await page.click('.add-btn:has-text("Text")');
check('add text layer opens inspector', await S("s.sheet") === 'layer' && await S("s.project.layers.at(-1).type") === 'text');
await page.click('[aria-label=Section] button:has-text("Motion")');
await page.evaluate(() => window.__seek(3));
await page.click('button[aria-label="Add Position keyframe at playhead"]');
check('key toggle adds a position key', await S("s.project.layers.at(-1).transform.position.keys.length") === 1);

console.log(errors.length ? `page errors: ${errors.join(' | ')}` : 'no page errors');
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await browser.close();
process.exitCode = fails ? 1 : 0;
