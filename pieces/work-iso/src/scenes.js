// =====================================================================
//  SCENES (isometric). Hairline objects on white; the real screens are set into the faces of panels and phones.
//  Paper-me (the user's own sticker) stands in the iso world as a billboard. Every move settles on a spring.
// =====================================================================
const CU = TIMELINE.cues;
const ISO0 = { ox: 540, oy: 1060, u: 1 };
const drop = (t, h = 260, k = 150) => (1 - spring(TT, t, { k, damp: 0.62 })) * h;   // a drop-in offset
const on = (t) => TT >= t - 1e-6;
const live = (t0, t1) => TT >= t0 - 1e-6 && TT < t1;
const gone = (t1) => clamp((TT - t1 + 0.35) / 0.35);                            // 0 -> 1 in the last 0.35s of a beat

// ---- Paper-me
const ME_FACE = { focus: 'me-asleep.png', wow: 'me-wow.png', happy: 'me-happy.png', laugh: 'me-laugh.png', smile: 'me-smile.png' };
function me(x, y, r, o = {}) {
  const sc = o.s ?? 1; if (sc <= 0.01) return;
  const key = o.key ?? 'me', ph = key.length * 1.7;
  let mood = o.mood ?? 'smile';
  if (mood !== 'focus' && mood !== 'laugh' && Math.floor(TT * 12 + ph * 5) % 37 < 2) mood = 'focus';
  const img = asset(ME_FACE[mood] || ME_FACE.smile); if (!img) return;
  const h = r * 4.0 * sc, w = h * img.width / img.height;
  y += Math.sin(TT * TAU * 0.6 + ph) * r * 0.04;
  SPARK_AT = toScreen(x, y);
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(TT * 1.7 + ph) * 0.04);
  ctx.drawImage(img, -w / 2, -h * 0.46, w, h); ctx.restore();
}
const meAt = (p, r, o) => { const [x, y] = isoP(p); me(x, y - r * 1.8, r, o); };
function meBody(name, cx, by, sc) {
  const img = asset(name); if (!img) return; const w = img.width * sc, h = img.height * sc;
  ctx.save(); ctx.translate(cx, by); ctx.rotate(Math.sin(TT * TAU * 0.5 + 3) * 0.025); ctx.drawImage(img, -w / 2, -h, w, h); ctx.restore();
}
// ---- an image set into a face (fp: u right, v down), w x h face units, rounded corners r
function faceImg(fp, name, w, h, r = 10, crop) {
  const img = asset(name); if (!img) return;
  const p0 = isoP(fp(0, 0)), pu = isoP(fp(w, 0)), pv = isoP(fp(0, h)), c = crop ?? [0, 0, img.width, img.height];
  ctx.save(); facePath(fp, rrectPts(0, 0, w, h, r, 4), true); ctx.clip();
  ctx.transform((pu[0] - p0[0]) / c[2], (pu[1] - p0[1]) / c[2], (pv[0] - p0[0]) / c[3], (pv[1] - p0[1]) / c[3], p0[0], p0[1]);
  ctx.drawImage(img, c[0], c[1], c[2], c[3], 0, 0, c[2], c[3]);
  ctx.restore();
  facePath(fp, rrectPts(0, 0, w, h, r, 4), true); hair(PAL.edge); ctx.stroke();
}
// a standing screen panel (front faces lower-left) with an image on it; z raised by its drop-in
function screenPanel(name, x, y, z, w, ht, o = {}) {
  const S = isoPanelY(x, y, z, w, ht, o.t ?? 12, { r: o.r ?? 14 });
  const fp = slabFace(S), m = o.m ?? 10;
  faceImg((u, v) => fp(u + m, v + m), name, w - 2 * m, ht - 2 * m, (o.r ?? 14) - 4, o.crop);
  return S;
}
// a phone: a thin rounded slab standing, its screen an image, on a small stand
function isoPhone(name, x, y, z, s = 1) {
  const w = 150 * s, ht = 318 * s;
  isoBox(x - 10, y - 4, z, w + 20, 40, 10, { r: 12 });
  const S = isoPanelY(x, y + 10, z + 10, w, ht, 14, { r: 24 * s });
  const fp = slabFace(S);
  faceImg((u, v) => fp(u + 8 * s, v + 8 * s), name, w - 16 * s, ht - 16 * s, 18 * s);
  return S;
}
// big sans titles (one dark accent word)
function iTitle(lines, x, y, size, o = {}) {
  const f = () => {
    ctx.save(); ctx.font = `600 ${size}px ${SANS}`; ctx.letterSpacing = `${-size * 0.03}px`;
    lines.forEach((ln, i) => {
      const a = clamp(spring(TT, (o.t ?? E0) + i * 0.1, { k: 120, damp: 0.8 })); if (a <= 0.001) return;
      const yy = y + i * size * 1.08 + (1 - a) * 24; let xx = x;
      ctx.save(); ctx.globalAlpha = a;
      for (const w of ln.split(/(\s+)/)) { ctx.fillStyle = o.accent && o.accent.includes(w.replace(/[.,!?]/g, '')) ? PAL.accent : PAL.text; ctx.fillText(w, xx, yy); xx += ctx.measureText(w).width; }
      ctx.restore();
    });
    ctx.restore();
  };
  if (DEFER) DEFER.push(f); else f();
}
function iNum(num, lab, x, y, t) {
  const f = () => {
    const a = clamp(spring(TT, t, { k: 120, damp: 0.8 })); if (a <= 0.001) return;
    ctx.save(); ctx.globalAlpha = a; ctx.font = `600 200px ${SANS}`; ctx.letterSpacing = '-8px'; ctx.fillStyle = PAL.accent; ctx.fillText(num, x, y + (1 - a) * 30);
    const w = ctx.measureText(num).width; ctx.font = `400 46px ${SANS}`; ctx.letterSpacing = '0px'; ctx.fillStyle = PAL.text; ctx.fillText(lab, x + w + 24, y - 40); ctx.restore();
  };
  if (DEFER) DEFER.push(f); else f();
}
// a floating note card: a small panel with a mono label set into its face
function noteCard(str, x, y, z, w = 170) {
  const S = isoPanelX(x, y, z, w, 64, 8, { r: 12 }); const fp = slabFace(S);
  isoText(fp, str, 16, 40, 24, { color: PAL.text });
}
// the ring, lying on the floor: a thick rounded band (an outer cylinder with the hole cut as a face)
function isoRing(x, y, z, R, rIn, h = 28) {
  isoCyl(x, y, z, R, h);
  const top = faceOf([x, y, z + h], [1, 0, 0], [0, 1, 0]);
  faceEll(top, 0, 0, rIn, rIn, { fill: PAL.face, stroke: PAL.edge, n: 48 });
  const inner = faceOf([x, y, z + h * 0.15], [1, 0, 0], [0, 1, 0]);
  facePath(inner, ellipsePts(0, 0, rIn, rIn, 0, 48, Math.PI * 1.08, Math.PI * 1.92), false); hair(PAL.inner); ctx.stroke();
}

// ---------------------------------------------------------------------
function sceneIntro() {
  setIso({ ox: 540, oy: 880, u: 1 });
  isoRing(0, 0, drop(0.2, 300), 300, 220);
  meAt([0, 0, 30], 64, { mood: TT < 1.6 ? 'focus' : 'wow', key: 'hI', s: spring(TT, 0.6, { k: 200, damp: 0.55 }) });
  iTitle(['I make complex', 'products feel', 'simple.'], 90, 1300, 92, { t: CU.thesis, accent: ['simple'] });
}
function sceneOSJ() {
  setIso(ISO0); isoTag('01', 'Open Stage Jam');
  if (live(CU.o_prob, CU.o_res)) {   // a stage, a mic, the night's scattered notes
    const z0 = drop(CU.o_prob, 240) + gone(CU.o_res) * 900;
    const top = isoPlates(-240, -200, z0, 480, 400, [{ h: 18, r: 40 }, { h: 16, gap: 6, inset: 14, r: 34 }]);
    isoCyl(80, -60, top, 8, 180); isoCyl(80, -60, top + 180, 18, 34);
    [['venue post?', -330, -120, 260], ['group chat', 260, -260, 330], ['am I on?', -300, 200, 380], ["who's next?", 280, 120, 250]].forEach(([s, x, y, z], i) => { if (on(CU.o_prob + 0.4 + i * 0.15)) noteCard(s, x, y, z0 + z + drop(CU.o_prob + 0.4 + i * 0.15, 160)); });
    meAt([-40, 80, top], 62, { mood: 'wow', key: 'hO' });
    iTitle(["Getting on stage", "shouldn't be", 'this hard.'], 90, 470, 88, { t: CU.o_prob, accent: ['hard'] });
  }
  if (live(CU.o_res, CU.o_per)) {   // 6 plates = 6 years; 30 blocks = ~30 conversations
    const gz = gone(CU.o_per) * 900;
    for (let i = 0; i < 6; i++) { const t = CU.o_res + 0.2 + i * 0.12; if (on(t)) isoBox(-320, -60, gz + i * 22 + drop(t, 200), 200, 200, 16, { r: 24 }); }
    isoGrid(6, 5, (i, j) => { const t = CU.o_res + 1.1 + (i + j) * 0.04; if (on(t)) isoBox(60 + i * 46, -40 + j * 46, gz + drop(t, 200, 220), 34, 34, 34, { r: 8 }); });
    iNum('6', 'years of jam nights', 90, 560, CU.o_res + 0.2);
    iNum('~30', 'conversations', 90, 1440, CU.o_res + 1.1);
  }
  if (live(CU.o_per, CU.o_flow)) {   // Alex and the before / after, on standing panels
    const gz = gone(CU.o_flow) * 900;
    screenPanel('osj-alex.jpg', -180, -320, gz + drop(CU.o_per, 300), 220, 324);
    screenPanel('osj-persona.jpg', -330, -120, gz + drop(CU.o_per + 0.15, 300), 320, 432);
    if (on(CU.o_story)) screenPanel('osj-story.jpg', -160, 260, gz + drop(CU.o_story, 360), 520, 216);
    meAt([200, 120, gz], 58, { mood: TT < CU.o_story + 0.6 ? 'smile' : 'happy', key: 'hO' });
  }
  if (live(CU.o_flow, CU.o_prod)) {   // the flow, standing tall, revealed top to bottom
    const gz = gone(CU.o_prod) * 900, rev = EZ.io(clamp((TT - CU.o_flow - 0.3) / 2.0));
    const S = isoPanelY(-160, 60, gz + drop(CU.o_flow, 300), 330, 540, 12, { r: 16 }), fp = slabFace(S);
    const hh = 520 * rev; if (hh > 2) { const img = asset('osj-flow.jpg'); faceImg((u, v) => fp(u + 10, v + 10), 'osj-flow.jpg', 310, hh, 10, img ? [0, 0, img.width, img.height * rev] : undefined); }
    meAt([230, 40, gz], 56, { mood: 'wow', key: 'hO' });
    iTitle(['Two roles,', 'one live line.'], 90, 1400, 76, { t: CU.o_flow, accent: ['live'] });
  }
  if (on(CU.o_prod)) {   // the product: two phones on a plinth
    const top = isoPlates(-280, -160, 0, 520, 330, [{ h: 16, r: 40 }]);
    if (on(CU.o_prod)) isoPhone('stage-mobile.png', -220, -110, top + drop(CU.o_prod, 300), 1.15);
    if (on(CU.o_prod + 0.2)) isoPhone('stage-mobile-2.png', 30, -60, top + drop(CU.o_prod + 0.2, 300), 1.15);
    meAt([180, 200, top], 56, { mood: 'laugh', key: 'hO', s: spring(TT, CU.o_prod + 0.5, { k: 200, damp: 0.55 }) });
    isoCaption("You're next.", { at: CU.o_prod - E0 + 0.8 });
  }
}
function sceneSeason() {
  const hold = TT >= CU.hold - 1e-6; if (hold) TT = CU.hold;
  setIso(ISO0); isoTag('02', 'Season');
  if (live(CU.s_prob, CU.s_res)) {   // three sizes, boxed, and the orb
    const gz = gone(CU.s_res) * 900;
    [['S', -180], ['M', 0], ['L', 180]].forEach(([s, x], i) => { const t = CU.s_prob + 0.5 + i * 0.15; if (!on(t)) return; const z = gz + drop(t, 220); isoBox(x, 160, z, 140, 140, 110, { r: 12 }); isoText(faceOf([x, 300, z + 110], [1, 0, 0], [0, 0, -1]), s, 52, 74, 56, { color: PAL.accent }); });
    const orb = asset('season-orb.jpg'), [ox, oy] = isoP([60, -60, gz + 120]), R = 150 * spring(TT, CU.s_prob + 0.2, { k: 150, damp: 0.6 });
    if (orb && R > 1) { ctx.save(); ctx.beginPath(); ctx.arc(ox, oy, R, 0, TAU); ctx.clip(); ctx.drawImage(orb, ox - R * 1.06, oy - R * 1.06, R * 2.12, R * 2.12); ctx.restore(); ctx.beginPath(); ctx.arc(ox, oy, R, 0, TAU); hair(PAL.edge); ctx.stroke(); }
    meAt([240, 260, gz], 58, { mood: 'wow', key: 'hS' });
    iTitle(['Does it', 'work on me?'], 90, 470, 96, { t: CU.s_prob, accent: ['me'] });
  }
  if (live(CU.s_res, CU.s_per)) {   // 25 blocks, three needs
    const gz = gone(CU.s_per) * 900;
    isoGrid(5, 5, (i, j) => { const t = CU.s_res + 0.2 + (i + j) * 0.04; if (on(t)) isoBox(-200 + i * 50, -120 + j * 50, gz + drop(t, 200, 220), 38, 38, 38, { r: 9 }); });
    ['Colour', 'Fit', 'Trust'].forEach((s, i) => { const t = CU.s_res + 1.0 + i * 0.25; if (on(t)) noteCard(s, 230, -200 + i * 130, gz + 80 + drop(t, 160), 150); });
    iNum('25', 'shopper interviews', 90, 560, CU.s_res + 0.2);
  }
  if (live(CU.s_per, CU.s_flow)) {
    const gz = gone(CU.s_flow) * 900;
    screenPanel('season-noa.jpg', -180, -320, gz + drop(CU.s_per, 300), 220, 334);
    screenPanel('season-persona.jpg', -330, -120, gz + drop(CU.s_per + 0.15, 300), 320, 442);
    if (on(CU.s_story)) screenPanel('season-story.jpg', -160, 260, gz + drop(CU.s_story, 360), 520, 208);
    meAt([200, 120, gz], 58, { mood: TT < CU.s_story + 0.6 ? 'smile' : 'happy', key: 'hS' });
  }
  if (live(CU.s_flow, CU.s_prod)) {
    const gz = gone(CU.s_prod) * 900, rev = EZ.io(clamp((TT - CU.s_flow - 0.3) / 2.0));
    const S = isoPanelY(-250, 60, gz + drop(CU.s_flow, 300), 440, 520, 12, { r: 16 }), fp = slabFace(S);
    const hh = 500 * rev; if (hh > 2) { const img = asset('season-flow.jpg'); faceImg((u, v) => fp(u + 10, v + 10), 'season-flow.jpg', 420, hh, 10, img ? [0, 0, img.width, img.height * rev] : undefined); }
    iTitle(['From a first photo', 'to a look she buys.'], 90, 1400, 70, { t: CU.s_flow, accent: ['buys'] });
  }
  if (on(CU.s_prod)) {   // the fitting room: a monitor on a stand and a phone
    const top = isoPlates(-300, -180, 0, 560, 360, [{ h: 16, r: 40 }]), z = top + drop(CU.s_prod, 300);
    isoBox(-110, -110, z, 120, 60, 14, { r: 10 }); isoCyl(-50, -80, z + 14, 10, 90);
    screenPanel('season-product.jpg', -260, -100, z + 104, 430, 268, { r: 12, m: 8 });
    if (on(CU.s_prod + 0.2)) isoPhone('season-phone.jpg', 120, 0, top + drop(CU.s_prod + 0.2, 300), 1.0);
    if (hold) isoRing(0, 0, 0, 380, 330, 12);
    meAt([-220, 220, top], 56, { mood: hold ? 'wow' : 'laugh', key: 'hS' });
    isoCaption('The fitting room', { at: CU.s_prod - E0 + 0.8 });
  }
}
function scenePayoff() {
  setIso({ ox: 540, oy: 1180, u: 1 });
  isoRing(0, 0, 0, 340, 260);
  const items = ['stage-mobile.png', 'season-phone.jpg', 'stage-mobile-2.png'];
  items.forEach((nm, i) => { const a = -Math.PI * 0.75 + i * 0.7; isoPhone(nm, Math.cos(a) * 200 - 60, Math.sin(a) * 200 - 40, 28, 0.8); });
  meBody('me-body-wave.png', 905, 1935, 0.46);
  iTitle(['Dekel Factor', 'Designs'], 90, 420, 104, { t: CU.name, accent: ['Designs'] });
  const f = () => { const a = clamp(spring(TT, CU.name + 0.5, { k: 120, damp: 0.8 })); if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.font = `400 40px ${ISOMONO}`; ctx.fillStyle = PAL.textD; ctx.fillText('dekelfactordesigns.com', 92, 600); ctx.restore(); };
  if (DEFER) DEFER.push(f); else f();
}
