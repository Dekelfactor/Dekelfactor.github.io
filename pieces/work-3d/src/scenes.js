// =====================================================================
//  SCENES (glass). World coords 1080x1920. Each project is one world; its five steps arrive and leave as
//  floating glass panels, big type and chips. Real screens only (assets/); drawn chips never pose as product UI.
// =====================================================================
const CU = TIMELINE.cues;
const inn = (t, d = 0.6) => EZ.o3(clamp((TT - t) / d));          // 0 -> 1 arriving
const out = (t, d = 0.4) => EZ.i2(clamp((TT - t) / d));          // 0 -> 1 leaving
const live = (t0, t1) => TT >= t0 - 1e-6 && TT < t1 + 0.4;       // on screen (with its exit)
const flo = (k, a = 10) => Math.sin(TT * 0.9 + k) * a;           // a slow float

// ---- Paper-me: the user's own head sticker (moods) and full body
const ME_FACE = { focus: 'me-asleep.png', wow: 'me-wow.png', happy: 'me-happy.png', laugh: 'me-laugh.png', smile: 'me-smile.png' };
function me(x, y, r, o = {}) {
  const sc = o.s ?? 1; if (sc <= 0.01) return;
  const key = o.key ?? 'me', ph = key.length * 1.7;
  let mood = o.mood ?? 'smile';
  if (mood !== 'focus' && mood !== 'laugh' && Math.floor(TT * 12 + ph * 5) % 37 < 2) mood = 'focus';
  const img = asset(ME_FACE[mood] || ME_FACE.smile); if (!img) return;
  const h = r * 4.0 * sc, w = h * img.width / img.height;
  y += Math.sin(TT * TAU * 0.6 + ph) * r * 0.05;
  SPARK_AT = toScreen(x, y);
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(TT * 1.7 + ph) * 0.05 + (o.rot ?? 0));
  ctx.shadowColor = o.glow ? gxRGBA(o.glow, 0.6) : 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
  ctx.drawImage(img, -w / 2, -h * 0.46, w, h); ctx.restore();
}
function meBody(name, cx, by, sc, o = {}) {
  const img = asset(name); if (!img || sc <= 0.01) return;
  const w = img.width * sc, h = img.height * sc;
  ctx.save(); ctx.translate(cx, by); ctx.rotate(Math.sin(TT * TAU * 0.5 + 3) * (o.sway ?? 0.025));
  ctx.shadowColor = o.glow ? gxRGBA(o.glow, 0.55) : 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 12;
  ctx.drawImage(img, -w / 2, -h, w, h); ctx.restore();
}
// a project label at the top, like the site's eyebrows
function label(num, name, tint) { const f = () => gxEyebrow(`${num} / ${name}`, 90, SAFE.top + 100, tint); if (DEFER) DEFER.push(f); else f(); }
// a big number with a label (the research beats)
function stat(num, lab, x, y, tint, t) {
  const u = inn(t, 0.5); if (u <= 0) return;
  ctx.save(); ctx.translate(0, (1 - u) * 60);
  ctx.font = `700 260px ${GX_SANS}`; ctx.letterSpacing = '-12px'; ctx.fillStyle = tint; ctx.fillText(num, x, y);
  const w = ctx.measureText(num).width; ctx.restore();
  gxText(lab, x + w + 30, y - 60, 52, GX.ink, { weight: 600, t: t + 0.15 });
}

// ---------------------------------------------------------------------
//  1. INTRO — the ring in the dark, Paper-me inside it, the thesis
// ---------------------------------------------------------------------
function sceneIntro() {
  gxPhoto('bg-intro.jpg', { zoom: 1.04 + TT * 0.012, focus: [0.52, 0.46] });
  me(648, 830, 66, { mood: TT < 1.6 ? 'focus' : 'wow', key: 'heroI', glow: '#9fb4ff' });
  gxTitle(['I make complex', 'products feel', 'simple.'], 90, 1250, 104, { t: CU.thesis, accent: { simple: GX.violet } });
}

// ---------------------------------------------------------------------
//  DEPTH: each beat is a layer that flies in from far away (small, out of focus), settles, then flies past the camera.
//  beat(t0, t1, cx, cy, fn): fn draws the beat in place; the layer scales about (cx, cy) and blurs with depth.
// ---------------------------------------------------------------------
function beat(t0, t1, cx, cy, fn, o = {}) {
  if (TT < t0 - 1e-6 || TT >= t1 + 0.01) return;
  const u = EZ.o3(clamp((TT - t0) / (o.din ?? 0.75))), v = o.last ? 0 : EZ.i2(clamp((TT - (t1 - 0.4)) / 0.4));
  const s = (0.45 + 0.55 * u) * (1 + 1.6 * v), bl = (1 - u) * 12 + v * 16;
  if (v >= 0.999) return;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy);
  if (bl > 0.3) ctx.filter = `blur(${bl.toFixed(1)}px)`;
  fn(u, v);
  ctx.restore();
}
// the camera travelling through a world: the backdrop pans and pushes a little on every beat (parallax)
const travel = (cues) => ({ dy: springTrack(cues.map((t, i) => [t, -i * 70]), SPRING.heavy), zoom: springTrack(cues.map((t, i) => [t, 1.18 + i * 0.03]), SPRING.heavy), dx: Math.sin(TT * 0.25) * 30 });

// ---------------------------------------------------------------------
//  2. OPEN STAGE JAM — the red stage: blurred behind the story, sharp for the product
// ---------------------------------------------------------------------
function sceneOSJ() {
  const sharp = TT >= CU.o_prod - 1e-6;
  if (sharp) gxPhoto('bg-osj.jpg', { zoom: 1.05 + (TT - CU.o_prod) * 0.035, focus: [0.62, 0.55], dx: -(TT - CU.o_prod) * 18 });
  else { const c = travel([E0, CU.o_res, CU.o_per, CU.o_flow]); gxPhoto('bg-osj.jpg', { zoom: c.zoom, blur: 22, dark: 0.42, focus: [0.5, 0.35], dy: c.dy, dx: c.dx }); }
  label('01', 'Open Stage Jam', GX.red);
  // problem
  beat(CU.o_prob, CU.o_res, 540, 1000, () => {
    gxTitle(["Getting on stage", "shouldn't be", 'this hard.'], 90, 560, 104, { t: CU.o_prob, accent: { hard: GX.red } });
    ['am I on?', 'start time?', "who's next?"].forEach((t, i) => { const a = i / 3 * TAU + TT * 0.45, R = 310; gxChip(t, 540 + Math.cos(a) * R, 1130 + Math.sin(a) * R * 0.5, 36, { s: popS(CU.o_prob + 0.4 + i * 0.15) }); });
    me(540, 1120, 74, { mood: 'wow', key: 'heroO', glow: GX.red });
  });
  // research
  beat(CU.o_res, CU.o_per, 540, 1000, () => {
    stat('6', 'years of jam nights', 90, 860, GX.red, CU.o_res + 0.1);
    stat('~30', 'conversations', 90, 1180, GX.ink, CU.o_res + 0.9);
    me(860, 1380, 56, { mood: 'smile', key: 'heroO', s: popS(CU.o_res + 0.3) });
  });
  // Alex: the photo swings in on a 3D turn, the quote beside it; then the before / after line
  if (TT >= CU.o_per - 1e-6 && TT < CU.o_flow + 0.01) {
    const u = EZ.o3(clamp((TT - CU.o_per) / 0.9)), v = EZ.i2(clamp((TT - (CU.o_flow - 0.4)) / 0.4)), st = EZ.o3(clamp((TT - CU.o_story) / 0.8));
    const F1 = gxFly(u, 1.0), P = gxPast(v);
    gxPanelP('osj-alex.jpg', 700, 760 - st * 120, 500, 735, { z: F1.z + P.z + st * 500, ry: -0.35 + F1.ry + TT * 0.01, blur: F1.blur + P.blur + st * 4, glow: GX.red });
    gxPanelP('osj-persona.jpg', 360, 860 - st * 150, 640, 270, { crop: [30, 20, 740, 320], z: F1.z * 1.2 + P.z + st * 300, ry: 0.28 + F1.ry * 0.8, blur: F1.blur + P.blur, glow: GX.red });
    if (st > 0) { const F2 = gxFly(st, -0.8); gxPanelP('osj-story.jpg', 540, 1250, 960, 131, { crop: [0, 0, 1100, 150], z: F2.z + P.z, ry: F2.ry, blur: F2.blur + P.blur, glow: GX.red }); }
    me(930, 1430, 54, { mood: TT < CU.o_story + 0.6 ? 'smile' : 'happy', key: 'heroO', s: u * (1 - v) });
  }
  // the flow: the camera glides down the real flow, tilted in depth
  if (TT >= CU.o_flow - 1e-6 && TT < CU.o_prod + 0.01) {
    const u = EZ.o3(clamp((TT - CU.o_flow) / 0.8)), v = EZ.i2(clamp((TT - (CU.o_prod - 0.4)) / 0.4)), F = gxFly(u, 0.7), P = gxPast(v);
    const pan = EZ.io(clamp((TT - CU.o_flow - 0.4) / 2.4)), img = asset('osj-flow.jpg');
    if (img) { const ch = img.width * 1.25; gxPanelP('osj-flow.jpg', 560, 1060, 720, 880, { crop: [0, pan * (img.height - ch), img.width, ch], z: F.z + P.z, ry: 0.22 + F.ry, blur: F.blur + P.blur, glow: GX.red }); }
    beat(CU.o_flow, CU.o_prod, 540, 500, () => gxTitle(['Two roles,', 'one live line.'], 90, 430, 92, { t: CU.o_flow, accent: { live: GX.red } }));
    me(170, 1300, 58, { mood: 'wow', key: 'heroO', s: popS(CU.o_flow + 0.4) * (1 - v) });
  }
  // the product: the site's own render, sharp
  if (sharp) {
    gxChip("You're next.", CX, 1440, 46, { s: popS(CU.o_prod + 0.9), fill: gxRGBA(GX.red, 0.85), line: 'rgba(255,255,255,0.4)' });
    me(190, 1200, 62, { mood: 'laugh', key: 'heroO', s: popS(CU.o_prod + 0.5), glow: GX.red });
  }
}

// ---------------------------------------------------------------------
//  3. SEASON — amber: blurred behind the story, the fitting room sharp. Everything stops at the hold.
// ---------------------------------------------------------------------
function sceneSeason() {
  const hold = TT >= CU.hold - 1e-6; if (hold) TT = CU.hold;
  const sharp = TT >= CU.s_prod - 1e-6;
  if (sharp) gxPhoto('bg-season2.jpg', { zoom: 1.2 + (TT - CU.s_prod) * 0.035, focus: [0.62, 0.6], dx: (TT - CU.s_prod) * 16 });
  else { const c = travel([E0, CU.s_res, CU.s_per, CU.s_flow]); gxPhoto('bg-season.jpg', { zoom: c.zoom, blur: 22, dark: 0.42, dy: c.dy, dx: c.dx }); }
  label('02', 'Season', GX.amber);
  beat(CU.s_prob, CU.s_res, 540, 1000, () => {
    gxTitle(['Does it', 'work on me?'], 90, 560, 112, { t: CU.s_prob, accent: { me: GX.amber } });
    const orb = asset('season-orb.jpg'), u = inn(CU.s_prob + 0.2, 0.8), R = 250 * u, oy = 1080 + flo(6, 12);
    if (orb && R > 1) { ctx.save(); ctx.shadowColor = gxRGBA(GX.amber, 0.6); ctx.shadowBlur = 100; ctx.beginPath(); ctx.arc(540, oy, R, 0, TAU); ctx.fillStyle = '#000'; ctx.fill(); ctx.clip(); ctx.translate(540, oy); ctx.rotate(TT * 0.15); ctx.drawImage(orb, -R * 1.06, -R * 1.06, R * 2.12, R * 2.12); ctx.restore(); }
    ['S', 'M', 'L'].forEach((t, i) => gxChip(t, 250 + i * 290, 1420, 44, { s: popS(CU.s_prob + 0.8 + i * 0.15) }));
    me(860, 860, 58, { mood: 'wow', key: 'heroS', s: popS(CU.s_prob + 0.5) });
  });
  beat(CU.s_res, CU.s_per, 540, 1000, () => {
    stat('25', 'shoppers', 90, 900, GX.amber, CU.s_res + 0.1);
    ['Colour', 'Fit', 'Trust'].forEach((t, i) => gxChip(t, 220 + i * 280, 1150, 46, { s: popS(CU.s_res + 0.9 + i * 0.25), fill: i === 0 ? gxRGBA(GX.amber, 0.8) : undefined }));
    me(860, 1380, 56, { mood: 'smile', key: 'heroS', s: popS(CU.s_res + 0.3) });
  });
  if (TT >= CU.s_per - 1e-6 && TT < CU.s_flow + 0.01) {
    const u = EZ.o3(clamp((TT - CU.s_per) / 0.9)), v = EZ.i2(clamp((TT - (CU.s_flow - 0.4)) / 0.4)), st = EZ.o3(clamp((TT - CU.s_story) / 0.8));
    const F1 = gxFly(u, -1.0), P = gxPast(v);
    gxPanelP('season-noa.jpg', 380, 760 - st * 120, 500, 760, { z: F1.z + P.z + st * 500, ry: 0.35 + F1.ry, blur: F1.blur + P.blur + st * 4, glow: GX.amber });
    gxPanelP('season-persona.jpg', 700, 860 - st * 150, 640, 260, { crop: [20, 40, 740, 300], z: F1.z * 1.2 + P.z + st * 300, ry: -0.28 + F1.ry * 0.8, blur: F1.blur + P.blur, glow: GX.amber });
    if (st > 0) { const F2 = gxFly(st, 0.8); gxPanelP('season-story.jpg', 540, 1250, 960, 122, { crop: [0, 0, 1100, 140], z: F2.z + P.z, ry: F2.ry, blur: F2.blur + P.blur, glow: GX.amber }); }
    me(150, 1430, 54, { mood: TT < CU.s_story + 0.6 ? 'smile' : 'happy', key: 'heroS', s: u * (1 - v) });
  }
  if (TT >= CU.s_flow - 1e-6 && TT < CU.s_prod + 0.01) {
    const u = EZ.o3(clamp((TT - CU.s_flow) / 0.8)), v = EZ.i2(clamp((TT - (CU.s_prod - 0.4)) / 0.4)), F = gxFly(u, -0.7), P = gxPast(v);
    const pan = EZ.io(clamp((TT - CU.s_flow - 0.4) / 2.4)), img = asset('season-flow.jpg');
    if (img) { const ch = img.width * 0.95; gxPanelP('season-flow.jpg', 520, 1060, 860, 745, { crop: [0, pan * (img.height - ch), img.width, ch], z: F.z + P.z, ry: -0.22 + F.ry, blur: F.blur + P.blur, glow: GX.amber }); }
    beat(CU.s_flow, CU.s_prod, 540, 500, () => gxTitle(['First photo,', 'to a look she buys.'], 90, 430, 84, { t: CU.s_flow, accent: { buys: GX.amber } }));
  }
  if (sharp) {
    gxChip('The fitting room', CX, 1440, 46, { s: popS(CU.s_prod + 0.8) });
    me(880, 1250, 60, { mood: hold ? 'wow' : 'laugh', key: 'heroS', s: popS(CU.s_prod + 0.5), glow: GX.amber });
  }
}

// ---------------------------------------------------------------------
//  4. PAYOFF — the ring, the work orbiting it, Paper-me waving, the name
// ---------------------------------------------------------------------
function scenePayoff() {
  gxPhoto('bg-payoff.jpg', { zoom: 1.03 + (TT - CU.slam) * 0.015, focus: [0.47, 0.45] });
  const items = [['stage-mobile.png', 'p'], ['season-phone.jpg', 'p'], ['osj-flow.jpg', 'c'], ['season-product.jpg', 'c']];
  const pts = items.map((it, i) => { const a = i / items.length * TAU + TT * 0.5; return [it, a, 520 + Math.cos(a) * 410, 860 + Math.sin(a) * 160, Math.sin(a)]; });
  const draw = (q) => { const [[nm, kind], a, x, y, z] = q, s = 0.75 + 0.25 * z; if (kind === 'p') gxPhone(nm, x, y, 330 * s, { s: 1, glow: GX.violet }); else gxPanel(nm, x - 150 * s, y - 100 * s, 300 * s, 200 * s, { r: 16, glow: GX.violet }); };
  pts.filter((q) => q[4] < 0).forEach(draw);
  pts.filter((q) => q[4] >= 0).forEach(draw);
  meBody('me-body-wave.png', 850, 1935, 0.5, { glow: GX.violet });
  gxTitle(['Dekel Factor', 'Designs'], 90, 1230, 112, { t: CU.name, accent: { Designs: GX.violet } });
  gxText('dekelfactordesigns.com', 92, 1440, 40, GX.dim, { t: CU.name + 0.5, weight: 500 });
}
