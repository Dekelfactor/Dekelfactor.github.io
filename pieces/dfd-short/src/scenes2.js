// ---- 3. the website: it assembles block by block; a cursor clicks; then everything holds
const WIN = [90, 540, 900, 820];
function sceneSite() {
  cut(rect(-30, -30, W + 60, H + 60, 0), PAL.pinkL, { key: 'wallS', shadow: false, tear: 0, shade: false, pat: pat.dots('rgba(255,255,255,0.35)', 6, 56) });
  // bunting across the top
  ink([[-20, 430], [300, 470], [700, 465], [1100, 425]], { w: 3, color: PAL.ink, amt: 0.6, key: 'bstr' });
  for (let i = 0; i < 9; i++) { const x = 40 + i * 120, y = 430 + Math.sin((x + 20) / 1100 * Math.PI) * 40, sw = Math.sin(TT * 3 + i) * 4; cut([[x - 34, y], [x + 34, y], [x + sw, y + 70]], [PAL.teal, PAL.yellow, PAL.purple, PAL.blue][i % 4], { key: 'flag' + i, sb: 4, sy: 3 }); }
  // a shelf strip below: plant and mug
  cut(rect(-30, 1380, W + 60, 600, 0), PAL.wood, { key: 'deskS', tear: 0, sy: -6, pat: pat.grainWood('rgba(120,60,20,0.18)') });
  plant(110, 1400, 0.62, PAL.teal, 'plS');
  mug(1010, 1300, 0.85, PAL.blue, 'mugS');
  // the browser window
  const [wx, wy, ww, wh] = WIN;
  cut(rect(wx, wy, ww, wh, 10), PAL.paper, { key: 'brw', sb: 18, sy: 12 });
  cut(rect(wx, wy, ww, 76, 10), PAL.navy, { key: 'bar', shadow: false, tear: 0.6 });
  [PAL.pink, PAL.yellow, PAL.mint].forEach((c, i) => dot(wx + 40 + i * 34, wy + 38, 11, c));
  cut(rect(wx + 200, wy + 18, 520, 40, 18), '#3a4680', { key: 'addr', shadow: false, grain: 0.3 });
  ink([[wx + 230, wy + 38], [wx + 420, wy + 38]], { w: 4, color: 'rgba(255,255,255,0.6)', amt: 0.6, key: 'addrl' });
  const pop = (t, f) => { const s = popS(t); if (s <= 0.01) return; f(s); };
  const at = (cx, cy, s, f) => { ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); f(); ctx.restore(); };
  // the real Open Stage Jam app at phone size: two paper phones (its landing screen, its home screen)
  const phone = (cx, cy, name, t, key) => pop(t, (s) => at(cx, cy, s, () => {
    cut(rect(cx - 165, cy - 345, 330, 690, 34), PAL.charcoal, { key: key + 'b', sb: 14, sy: 8 });
    const im = asset(name); if (!im) return;
    ctx.save(); ctx.beginPath(); ctx.roundRect(cx - 150, cy - 325, 300, 650, 20); ctx.clip();
    ctx.drawImage(im, cx - 150, cy - 325, 300, 650); ctx.restore();
  }));
  phone(310, 985, 'stage-mobile.png', CU.nav, 'ph1');
  phone(730, 985, 'stage-mobile-2.png', CU.cards, 'ph2');
  // the click lands on the real "View Event" button of the home screen
  const TGT = [580 + 160 * 300 / 780, 660 + 1156 * 650 / 1688];
  if (past(TT, CU.click) && TT < CU.click + 0.6) { ctx.strokeStyle = PAL.yellow; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(580 + 60 * 300 / 780, 660 + 1126 * 650 / 1688, 205 * 300 / 780, 62 * 650 / 1688, 14); ctx.stroke(); }
  // the spark: a sticker between the phones
  const SPK = [520, 1320];
  if (past(TT, CU.hero)) { markDisc(SPK[0], SPK[1], 90 * popS(CU.hero), 'stk'); spark(SPK[0], SPK[1], 48 * popS(CU.hero), { rays: 7, mood: past(TT, CU.hold) ? 'wow' : past(TT, CU.click) ? 'happy' : 'smile', key: 'hero' }); }
  // the cursor glides to the card and clicks
  if (past(TT, CU.lines)) {
    const cx = springTrack([[CU.lines, 960], [CU.button + 0.25, TGT[0]]], SPRING.smooth), cy = springTrack([[CU.lines, 1320], [CU.button + 0.25, TGT[1]]], SPRING.smooth);
    if (past(TT, CU.click) && TT < CU.click + 0.5) for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, d = 40 + 60 * ev(CU.click, 0.3); sparkle(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 14); }
    cut([[cx, cy], [cx, cy + 74], [cx + 18, cy + 58], [cx + 32, cy + 90], [cx + 46, cy + 84], [cx + 32, cy + 52], [cx + 56, cy + 52]], '#ffffff', { key: 'cur', sb: 6, sy: 4, line: PAL.ink, lw: 4, tear: 0.4 });
  }
  stepTag('3 · build', E0 + 0.25);
  cap('like Open Stage Jam, a live jam app', E0 + 0.5);
}
// ---- 4. launch: the mark on a shopfront, people turn, confetti
const SIGN = [540, 690];
function sceneLaunch() {
  cut(rect(-30, -30, W + 60, H + 60, 0), PAL.sky, { key: 'wallL', shadow: false, tear: 0, shade: false, pat: pat.stripes('rgba(255,255,255,0.15)', 40, 120) });
  [[160, 470], [880, 520]].forEach(([x, y], i) => cut(ellipsePts(x + Math.sin(TT + i) * 12, y, 90, 34, 0, 20), '#ffffff', { key: 'cloud' + i, sb: 6 }));
  // a wire with birds
  ink([[520, 300], [800, 340], [1100, 320]], { w: 3, color: PAL.ink, amt: 0.5, key: 'wire' });
  [[640, 312], [720, 324], [800, 330]].forEach(([x, y], i) => { cut(ellipsePts(x, y - 18, 24, 20, 0, 16), PAL.navy, { key: 'bird' + i, sb: 4 }); dot(x + 8, y - 24, 3, '#ffffff'); cut([[x + 20, y - 20], [x + 34, y - 16], [x + 20, y - 12]], PAL.mustard, { key: 'bk' + i, shadow: false }); });
  // the shopfront
  cut(rect(150, 560, 780, 840, 6), PAL.brick, { key: 'shop', pat: pat.lines('rgba(90,40,30,0.18)', 34, 10) });
  cut(rect(220, 1060, 640, 300, 6), PAL.navy, { key: 'shopw', pat: (bb) => { sparkle(bb.x0 + 120, bb.y0 + 80, 22, 'rgba(255,255,255,0.7)'); sparkle(bb.x1 - 140, bb.y0 + 190, 16, 'rgba(255,255,255,0.6)'); } });
  ink([[250, 1290], [830, 1290]], { w: 8, color: PAL.woodL, amt: 0.4, key: 'wshelf' });
  // a poster of the real Open Stage page taped in the window
  const ph = asset('stage-mobile.png');
  ctx.save(); ctx.translate(430, 1205); ctx.rotate(-0.04);
  cut(rect(-150, -125, 300, 250, 3), PAL.paper, { key: 'poster', sb: 10, sy: 6 });
  if (ph) ctx.drawImage(ph, 0, 260, 780, 640, -136, -112, 272, 223);
  cut(rect(-40, -140, 80, 30, 2), 'rgba(240,230,190,0.8)', { key: 'ptape', shadow: false, grain: 0.3, shade: false });
  ctx.restore();
  tag('jam tonight', 700, 1180, 40, { rot: 0.08, tape: false, fill: PAL.yellow });
  cut(rect(120, 900, 840, 110, 6), PAL.teal, { key: 'awn', pat: pat.stripes('rgba(255,255,255,0.85)', 50, 100) });
  for (let i = 0; i < 8; i++) cut(ellipsePts(172 + i * 105, 1010, 53, 30, 0, 18, 0, Math.PI), i % 2 ? '#ffffff' : PAL.teal, { key: 'sc' + i, sb: 4 });
  // the sign: hung from a bracket, lands with a bounce on the cut
  ink([[SIGN[0] - 90, 520], [SIGN[0] - 90, 560]], { w: 6, color: PAL.ink, amt: 0.3, key: 'ch1' });
  ink([[SIGN[0] + 90, 520], [SIGN[0] + 90, 560]], { w: 6, color: PAL.ink, amt: 0.3, key: 'ch2' });
  const b = 1 + 0.1 * Math.exp(-(TT - CU.slam) * 7) * Math.cos((TT - CU.slam) * 22);
  ctx.save(); ctx.translate(SIGN[0], SIGN[1]); ctx.scale(b, b); ctx.translate(-SIGN[0], -SIGN[1]);
  markDisc(SIGN[0], SIGN[1], 150, 'sign');
  spark(SIGN[0], SIGN[1], 66, { rays: 8, mood: 'happy', key: 'hero' });
  ctx.restore();
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, d = 200 + 50 * ev(CU.slam, 0.4); if (TT < CU.slam + 1.2) sparkle(SIGN[0] + Math.cos(a) * d, SIGN[1] + Math.sin(a) * d, 22, '#fff6c8'); }
  // the street and two passers-by turning to look
  cut(rect(-30, 1390, W + 60, 600, 0), PAL.grey, { key: 'pave', tear: 0, sy: -6, pat: pat.lines('rgba(255,255,255,0.18)', 80, 20) });
  person(130, 1420, 0.72, { key: 'p1', mood: 'wow', shirt: PAL.purple, skin: PAL.skin1, hair: '#6b3e26' });
  person(960, 1420, 0.72, { key: 'p2', mood: 'happy', shirt: PAL.green, skin: PAL.skin3, glasses: true });
  // confetti (no orange: that is the spark's)
  const RC = RNG('conf');
  for (let i = 0; i < 70; i++) {
    const x0 = RC.r(0, W), y0 = RC.r(-900, 200), v = RC.r(380, 620), c = [PAL.pink, PAL.teal, PAL.yellow, PAL.purple, PAL.blue, PAL.mint][i % 6], sp = RC.r(2, 6);
    const y = y0 + (TT - CU.slam) * v, x = x0 + Math.sin(TT * sp + i) * 30;
    if (y < -40 || y > H + 40) continue;
    cut(rot(rect(x - 12, y - 7, 24, 14, 2), x, y, TT * sp + i), c, { key: 'cf' + i, sb: 3, sy: 2, grain: false, tear: 0.3 });
  }
  stepTag('4 · launch', CU.slam);
  cap('out into the world', CU.slam + 0.25);
}
// ---- 5. morning desk: the same sheet, now with the finished mark and the studio's name
function sceneHome() {
  desk(true);
  note(540, 470, 1, PAL.pinkL, -0.12, 'n1');
  note(555, 640, 1, PAL.mint, 0.1, 'n2');
  markDisc(MARK[0], MARK[1] - 20, 190, 'home');
  spark(MARK[0], MARK[1] - 20, 78, { rays: 8, mood: 'happy', key: 'hero' });
  const f = () => tag('Dekel Factor Designs', 520, 1300, 66, { rot: -0.02, frac: ev(CU.title, 0.7) });
  if (DEFER) DEFER.push(f); else f();
  cap('ideas, made by hand', CU.title + 0.6);
}
