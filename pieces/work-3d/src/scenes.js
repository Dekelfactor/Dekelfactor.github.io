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
  gxWorld(GX.violet, { a: 0.16, key: 'intro', dust: 90 });
  me(540, 860, 66, { mood: TT < 1.6 ? 'focus' : 'wow', key: 'heroI', glow: GX.violet });
  gxRing(540, 860, 330, { tint: '#c9bcff', ry: 0.4 + TT * 0.45, rx: 0.95 });
  gxTitle(['I make complex', 'products feel', 'simple.'], 90, 1250, 104, { t: CU.thesis, accent: { simple: GX.violet } });
}

// ---------------------------------------------------------------------
//  2. OPEN STAGE JAM — red world
// ---------------------------------------------------------------------
function sceneOSJ() {
  gxWorld(GX.red, { a: 0.30, key: 'osj' });
  label('01', 'Open Stage Jam', GX.red);
  // problem: the night's information scattered around Paper-me
  if (live(CU.o_prob, CU.o_res)) {
    const u = inn(CU.o_prob), v = out(CU.o_res - 0.35);
    ctx.save(); ctx.translate(0, -v * 300);
    gxTitle(["Getting on stage", "shouldn't be", 'this hard.'], 90, 560, 104, { t: CU.o_prob, accent: { hard: GX.red } });
    const bits = ['venue post?', 'group chat', 'am I on?', 'start time?', "who's next?", 'sign-up sheet'];
    bits.forEach((s, i) => { const a = i / bits.length * TAU + TT * 0.35, R = 300 + (i % 2) * 70; gxChip(s, 540 + Math.cos(a) * R, 1120 + Math.sin(a) * R * 0.55, 34, { s: popS(CU.o_prob + 0.4 + i * 0.12) * (1 - v) }); });
    me(540, 1110, 70, { mood: 'wow', key: 'heroO', s: 1 - v, glow: GX.red });
    ctx.restore();
  }
  // research: six years, about thirty conversations
  if (live(CU.o_res, CU.o_per)) {
    const v = out(CU.o_per - 0.3); ctx.save(); ctx.translate(-v * 900, 0);
    gxEyebrow('Research', 90, 560, GX.red, CU.o_res);
    stat('6', 'years of jam nights', 90, 900, GX.red, CU.o_res + 0.1);
    stat('~30', 'conversations', 90, 1230, GX.ink, CU.o_res + 1.1);
    me(860, 1380, 56, { mood: 'smile', key: 'heroO', s: popS(CU.o_res + 0.3) });
    ctx.restore();
  }
  // persona and before/after: the real case-study panels
  if (live(CU.o_per, CU.o_flow)) {
    const u = inn(CU.o_per), v = out(CU.o_flow - 0.35), st = inn(CU.o_story, 0.7);
    ctx.save(); ctx.translate(0, -v * 1200);
    gxPanel('osj-alex.jpg', 560 + flo(1, 6), 420 + (1 - u) * 200, 440, 646, { s: u, glow: GX.red, r: 30 });
    gxPanel('osj-persona.jpg', 70 + flo(2, 6), 470 + (1 - u) * 260 - st * 120, 600, 808, { s: u, tilt: -0.4, r: 30 });
    gxPanel('osj-story.jpg', 60, 1000 + (1 - st) * 700 + flo(3, 5), 960, 400, { s: st, r: 24, glow: GX.red });
    me(930, 1430, 52, { mood: TT < CU.o_story + 0.6 ? 'smile' : 'happy', key: 'heroO', s: u });
    ctx.restore();
  }
  // the flow: two roles, one live line — revealed down the line
  if (live(CU.o_flow, CU.o_prod)) {
    const v = out(CU.o_prod - 0.3), rev = EZ.io(clamp((TT - CU.o_flow - 0.3) / 2.0));
    ctx.save(); ctx.translate(0, -v * 1300);
    gxTitle(['Two roles,', 'one live line.'], 90, 470, 92, { t: CU.o_flow, accent: { live: GX.red } });
    const fx = 300, fy = 600, fw = 600, fh = 980 * 0.92;
    ctx.save(); ctx.beginPath(); ctx.rect(fx - 40, fy - 40, fw + 80, 40 + fh * rev + 40); ctx.clip();
    gxPanel('osj-flow.jpg', fx, fy, fw, fh, { r: 28, glow: GX.red });
    ctx.restore();
    me(190, 1150, 56, { mood: 'wow', key: 'heroO', s: popS(CU.o_flow + 0.4) });
    ctx.restore();
  }
  // the product: the real app on two phones, the ring circling behind
  if (TT >= CU.o_prod - 1e-6) {
    const u = inn(CU.o_prod, 0.7);
    gxRing(540, 1000, 440, { tint: GX.red, rx: 1.35, ry: TT * 0.5, glow: true });
    gxPhone('stage-mobile.png', 360 + flo(4, 8), 990 + (1 - u) * 500, 860, { rot: -0.07, glow: GX.red, s: u });
    gxPhone('stage-mobile-2.png', 730 + flo(5, 8), 1030 + (1 - u) * 640, 860, { rot: 0.06, glow: GX.red, s: u });
    gxChip("You're next.", CX, 1440, 46, { s: popS(CU.o_prod + 0.9), fill: gxRGBA(GX.red, 0.85), line: 'rgba(255,255,255,0.4)' });
    me(900, 600, 56, { mood: 'laugh', key: 'heroO', s: popS(CU.o_prod + 0.5) });
  }
}

// ---------------------------------------------------------------------
//  3. SEASON — amber world. Motion freezes at the hold.
// ---------------------------------------------------------------------
function sceneSeason() {
  const hold = TT >= CU.hold - 1e-6; if (hold) TT = CU.hold;   // the hold: everything stops
  gxWorld(GX.amber, { a: 0.28, key: 'season' });
  label('02', 'Season', GX.amber);
  if (live(CU.s_prob, CU.s_res)) {
    const v = out(CU.s_res - 0.35); ctx.save(); ctx.translate(0, -v * 300);
    gxTitle(['Does it', 'work on me?'], 90, 560, 112, { t: CU.s_prob, accent: { me: GX.amber } });
    const orb = asset('season-orb.jpg'), u = inn(CU.s_prob + 0.2, 0.8), R = 230 * u;
    if (orb && R > 1) { ctx.save(); ctx.shadowColor = gxRGBA(GX.amber, 0.6); ctx.shadowBlur = 90; ctx.beginPath(); ctx.arc(540, 1080 + flo(6, 10), R, 0, TAU); ctx.fillStyle = '#000'; ctx.fill(); ctx.clip(); ctx.drawImage(orb, 540 - R * 1.06, 1080 + flo(6, 10) - R * 1.06, R * 2.12, R * 2.12); ctx.restore(); }
    ['S', 'M', 'L'].forEach((s, i) => gxChip(s, 250 + i * 290, 1400, 44, { s: popS(CU.s_prob + 0.8 + i * 0.15) * (1 - v) }));
    me(860, 860, 56, { mood: 'wow', key: 'heroS', s: popS(CU.s_prob + 0.5) * (1 - v) });
    ctx.restore();
  }
  if (live(CU.s_res, CU.s_per)) {
    const v = out(CU.s_per - 0.3); ctx.save(); ctx.translate(-v * 900, 0);
    gxEyebrow('Research', 90, 560, GX.amber, CU.s_res);
    stat('25', 'shopper interviews', 90, 900, GX.amber, CU.s_res + 0.1);
    ['Colour', 'Fit', 'Trust'].forEach((s, i) => gxChip(s, 220 + i * 280, 1150, 46, { s: popS(CU.s_res + 1.0 + i * 0.25), fill: i === 0 ? gxRGBA(GX.amber, 0.8) : undefined }));
    me(860, 1380, 56, { mood: 'smile', key: 'heroS', s: popS(CU.s_res + 0.3) });
    ctx.restore();
  }
  if (live(CU.s_per, CU.s_flow)) {
    const u = inn(CU.s_per), v = out(CU.s_flow - 0.35), st = inn(CU.s_story, 0.7);
    ctx.save(); ctx.translate(0, -v * 1200);
    gxPanel('season-noa.jpg', 560 + flo(1, 6), 420 + (1 - u) * 200, 440, 668, { s: u, glow: GX.amber, r: 30 });
    gxPanel('season-persona.jpg', 70 + flo(2, 6), 470 + (1 - u) * 260 - st * 120, 600, 830, { s: u, tilt: -0.4, r: 30 });
    gxPanel('season-story.jpg', 60, 1010 + (1 - st) * 700 + flo(3, 5), 960, 384, { s: st, r: 24, glow: GX.amber });
    me(930, 1430, 52, { mood: TT < CU.s_story + 0.6 ? 'smile' : 'happy', key: 'heroS', s: u });
    ctx.restore();
  }
  if (live(CU.s_flow, CU.s_prod)) {
    const v = out(CU.s_prod - 0.3), rev = EZ.io(clamp((TT - CU.s_flow - 0.3) / 2.0));
    ctx.save(); ctx.translate(0, -v * 1300);
    gxTitle(['From a first photo', 'to a look she buys.'], 90, 470, 84, { t: CU.s_flow, accent: { buys: GX.amber } });
    const fx = 150, fy = 590, fw = 780, fh = 928;
    ctx.save(); ctx.beginPath(); ctx.rect(fx - 40, fy - 40, fw + 80, 40 + fh * rev + 40); ctx.clip();
    gxPanel('season-flow.jpg', fx, fy, fw, fh, { r: 28, glow: GX.amber });
    ctx.restore();
    ctx.restore();
  }
  if (TT >= CU.s_prod - 1e-6) {
    const u = inn(CU.s_prod, 0.7);
    gxPanel('season-product.jpg', 60 + flo(7, 6), 600 + (1 - u) * 400, 960, 598, { s: u, glow: GX.amber, r: 28 });
    gxPhone('season-phone.jpg', 800 + flo(8, 8), 1180 + (1 - u) * 600, 600, { rot: 0.06, glow: GX.amber, s: u });
    gxChip('The fitting room', 300, 1300, 44, { s: popS(CU.s_prod + 0.8) });
    if (hold) gxRing(540, 1000, 520, { tint: GX.amber, rx: 1.2, ry: 1.0, glow: true });
    me(220, 1450, 54, { mood: hold ? 'wow' : 'laugh', key: 'heroS', s: popS(CU.s_prod + 0.5) });
  }
}

// ---------------------------------------------------------------------
//  4. PAYOFF — the ring, the work orbiting it, Paper-me waving, the name
// ---------------------------------------------------------------------
function scenePayoff() {
  gxWorld(GX.violet, { a: 0.20, key: 'pay', glow: [540, 820, 900] });
  const items = [['stage-mobile.png', 'p'], ['season-phone.jpg', 'p'], ['osj-flow.jpg', 'c'], ['season-product.jpg', 'c']];
  const pts = items.map((it, i) => { const a = i / items.length * TAU + TT * 0.5; return [it, a, 540 + Math.cos(a) * 400, 820 + Math.sin(a) * 150, Math.sin(a)]; });
  const draw = (q) => { const [[nm, kind], a, x, y, z] = q, s = 0.75 + 0.25 * z; if (kind === 'p') gxPhone(nm, x, y, 330 * s, { s: 1, glow: GX.violet }); else gxPanel(nm, x - 150 * s, y - 100 * s, 300 * s, 200 * s, { r: 16, glow: GX.violet }); };
  pts.filter((q) => q[4] < 0).forEach(draw);
  gxRing(540, 820, 300, { tint: '#c9bcff', ry: TT * 0.6, rx: 1.3 });
  pts.filter((q) => q[4] >= 0).forEach(draw);
  meBody('me-body-wave.png', 850, 1935, 0.5, { glow: GX.violet });
  gxTitle(['Dekel Factor', 'Designs'], 90, 1230, 112, { t: CU.name, accent: { Designs: GX.violet } });
  gxText('dekelfactordesigns.com', 92, 1440, 40, GX.dim, { t: CU.name + 0.5, weight: 500 });
}
