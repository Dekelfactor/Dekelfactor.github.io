// Phase 3 checks: light dome, camera orbit (pad + two-finger stage gesture), presets, effects.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pw = require(process.env.NODE_PATH + '/playwright');
const url = process.argv[2] ?? 'http://127.0.0.1:5190/';
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(1500);
const S = expr => page.evaluate(`(() => { const s = window.__studio.getState(); const v = window.__valueAt; return ${expr}; })()`);
let fails = 0;
const check = (n, c, x = '') => { console.log(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`); if (!c) fails++; };

// two-finger orbit on the stage
await page.evaluate(() => window.__seek(3));
const camBefore = JSON.stringify(await S('s.project.camera.position'));
await page.locator('.stage').evaluate(el => {
  const r = el.getBoundingClientRect(); const y = r.top + 300, x = r.left + 150;
  const ev = (type, id, dx, dy) => el.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x + dx, clientY: y + dy, bubbles: true }));
  ev('pointerdown', 1, 0, 0); ev('pointerdown', 2, 80, 0);
  for (let i = 1; i <= 8; i++) { ev('pointermove', 1, i * 6, 0); ev('pointermove', 2, 80 + i * 6, 0); }
  ev('pointerup', 1, 48, 0); ev('pointerup', 2, 128, 0);
});
const camAfter = JSON.stringify(await S('s.project.camera.position'));
check('two-finger drag orbits the camera', camAfter !== camBefore);
check('orbit on an animated camera writes a key at the playhead', await S('s.project.camera.position.keys.length') === 3);
check('one gesture is one undo step', await S('s.past.length') === 1, `past=${await S('s.past.length')}`);
await page.click('button[aria-label=Undo]');

// light dome: drag the key light
await page.click('button[aria-label=Lights]'); await page.waitForTimeout(300);
const dot = page.locator('.dome-dot').filter({ hasText: 'Key' });
const b = await dot.boundingBox();
const az0 = await S('s.project.lights.key.azimuth');
await page.mouse.move(b.x + 22, b.y + 22); await page.mouse.down();
await page.mouse.move(b.x - 30, b.y + 10, { steps: 6 }); await page.mouse.up();
const az1 = await S('s.project.lights.key.azimuth');
check('dragging the key light changes its angle', az1 !== az0, `${az0} -> ${az1}`);
await page.click('[aria-label=Light] button:has-text("Rim")');
check('light switcher shows rim values', (await page.locator('.sheet').innerText()).includes('Rim light on'));

// camera sheet: orbit pad + a move preset
await page.click('.tool-tabs button:has-text("Camera")');
await page.click('.chip-btn:has-text("Orbit left")');
const k = await S('s.project.camera.position.keys');
check('camera move writes start and end keys', k.length === 2 && k[1].t === 6);
const pad = await page.locator('.orbit-pad').boundingBox();
const before = JSON.stringify(await S('s.project.camera.position'));
await page.mouse.move(pad.x + 74, pad.y + 74); await page.mouse.down(); await page.mouse.move(pad.x + 110, pad.y + 60, { steps: 5 }); await page.mouse.up();
check('orbit pad moves the camera', JSON.stringify(await S('s.project.camera.position')) !== before);
await page.click('button[role=switch]:has-text("Depth of field")');
check('depth of field toggles on', await S('s.project.camera.dof.enabled') === true);

// scene + effects
await page.click('.tool-tabs button:has-text("Scene")');
await page.click('.env-card:has-text("Dusk")');
check('environment preset applies look', await S("s.project.environment.preset") === 'dusk' && await S("s.project.environment.background") === '#241a1f');
await page.click('.tool-tabs button:has-text("Effects")');
await page.click('button[role=switch]:has-text("Motion blur")');
check('motion blur toggles', await S('s.project.effects.motionBlur.enabled') === true);
check('safe area still OK after edits', await S('s.safeAreaIssue') === null, JSON.stringify(await S('s.safeAreaIssue')));

console.log(errors.length ? `page errors: ${errors.join(' | ')}` : 'no page errors');
console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
await browser.close(); process.exitCode = fails ? 1 : 0;
