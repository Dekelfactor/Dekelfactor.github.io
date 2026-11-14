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
// ---- per-world colour: the hairlines take the project's colour; ground and faces stay dark
const WORLD = {
  violet: { edge: '#8e7ad8', inner: '#3a3350', accent: '#c9bcff' },
  red:    { edge: '#d0455a', inner: '#4a1d24', accent: '#ff4d63' },
  amber:  { edge: '#d08a5c', inner: '#4a2e1e', accent: '#ffb27a' },
};
function world(k) { Object.assign(PAL, WORLD[k]); }
// ---- small iso props
function tinyPerson(x, y, z, s = 1) { isoCyl(x, y, z, 12 * s, 34 * s); isoCyl(x, y, z + 38 * s, 10 * s, 16 * s); }
function speaker(x, y, z, w = 70, d = 56, h = 120) {
  isoBox(x, y, z, w, d, h, { r: 8 });
  const fp = faceOf([x, y + d, z + h], [1, 0, 0], [0, 0, -1]);
  faceEll(fp, w / 2, h * 0.32, w * 0.3, w * 0.3, { stroke: PAL.edge }); faceEll(fp, w / 2, h * 0.32, w * 0.1, w * 0.1, { stroke: PAL.inner });
  faceEll(fp, w / 2, h * 0.74, w * 0.2, w * 0.2, { stroke: PAL.edge });
}
function stool(x, y, z) { isoCyl(x, y, z, 6, 70); isoCyl(x, y, z + 70, 26, 8); }
function micStand(x, y, z, h = 170) { isoCyl(x, y, z, 26, 6); isoCyl(x, y, z + 6, 5, h); isoCyl(x, y, z + 6 + h, 12, 26); faceEll(faceOf([x, y, z + 32 + h], [1, 0, 0], [0, 1, 0]), 0, 0, 7, 7, { fill: PAL.accent }); }
function rack(x, y, z, w = 220, h = 200, n = 5) {   // a clothing rail with garments
  isoCyl(x, y, z, 6, h); isoCyl(x + w, y, z, 6, h); line3([[x, y, z + h], [x + w, y, z + h]], PAL.edge);
  for (let i = 0; i < n; i++) { const gx = x + 24 + i * (w - 48) / (n - 1), sw = Math.sin(TT * 1.4 + i) * 3; line3([[gx, y, z + h], [gx, y, z + h - 16]], PAL.inner); isoPanelX(gx - 4 + sw * 0, y - 40, z + h - 120, 80, 104, 4, { r: 10 }); }
}
function shopBag(x, y, z, w = 70, d = 36, h = 82) { isoBox(x, y, z, w, d, h, { r: 4 }); const P = []; for (let k = 0; k <= 12; k++) { const a = Math.PI * k / 12; P.push([x + w / 2 - Math.cos(a) * w * 0.28, y + d / 2, z + h + Math.sin(a) * 26]); } line3(P, PAL.accent); }
function mannequin(x, y, z) { isoCyl(x, y, z, 30, 6); isoCyl(x, y, z + 6, 5, 110); isoCyl(x, y, z + 116, 34, 96, { r: 30 }); isoCyl(x, y, z + 212, 8, 16); isoCyl(x, y, z + 228, 17, 28); }

// ---------------------------------------------------------------------
function sceneIntro() {
  world('violet');
  setIso({ ox: 540, oy: 880, u: 1 });
  isoRing(0, 0, drop(0.2, 300), 300, 220);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + TT * 0.2; const p = [Math.cos(a) * 360, Math.sin(a) * 360, 60 + Math.sin(TT * 1.3 + i) * 14]; if (on(0.4 + i * 0.1)) { const [sx, sy] = isoP(p); ctx.beginPath(); ctx.arc(sx, sy, 5, 0, TAU); ctx.fillStyle = i % 2 ? PAL.accent : PAL.edge; ctx.fill(); } }
  meAt([0, 0, 30], 64, { mood: TT < 1.6 ? 'focus' : 'wow', key: 'hI', s: spring(TT, 0.6, { k: 200, damp: 0.55 }) });
  iTitle(['I make complex', 'products feel', 'simple.'], 90, 1300, 92, { t: CU.thesis, accent: ['simple'] });
}
function sceneOSJ() {
  world('red');
  setIso(ISO0); isoTag('01', 'Open Stage Jam');
  if (live(CU.o_prob, CU.o_res)) {   // a small venue: curtain wall, stage, speakers, mic, stools, the night's scattered notes
    setIso({ ox: 540, oy: 1180, u: 1 });
    const z0 = drop(CU.o_prob, 240) + gone(CU.o_res) * 900;
    const wall = isoPanelY(-250, -230, z0, 500, 170, 10, { r: 6 }), wf = slabFace(wall);
    for (let k = 1; k < 12; k++) faceLine(wf, [[k * 500 / 12, 6], [k * 500 / 12, 164]], PAL.inner);
    const top = isoPlates(-240, -200, z0, 480, 380, [{ h: 18, r: 40 }, { h: 16, gap: 6, inset: 14, r: 34 }]);
    speaker(-220, -190, top); speaker(150, -190, top);
    micStand(40, 0, top);
    if (on(CU.o_prob + 0.3)) { stool(300, 40, z0 + drop(CU.o_prob + 0.3, 160)); stool(320, 140, z0 + drop(CU.o_prob + 0.4, 160)); }
    [['venue post?', 260, 40, 210], ['am I on?', 180, -120, 300], ["who's next?", -60, 150, 170]].forEach(([s, x, y, z], i) => { if (on(CU.o_prob + 0.5 + i * 0.15)) noteCard(s, x, y, z0 + z + drop(CU.o_prob + 0.5 + i * 0.15, 160)); });
    meAt([-80, 60, top], 62, { mood: 'wow', key: 'hO' });
    iTitle(["Getting on stage", "shouldn't be", 'this hard.'], 90, 470, 88, { t: CU.o_prob, accent: ['hard'] });
    setIso(ISO0);
  }
  if (live(CU.o_res, CU.o_per)) {   // 6 plates = 6 years; ~30 tiny people = the conversations
    const gz = gone(CU.o_per) * 900;
    for (let i = 0; i < 6; i++) { const t = CU.o_res + 0.2 + i * 0.12; if (on(t)) isoBox(-320, -60, gz + i * 22 + drop(t, 200), 200, 200, 16, { r: 24 }); }
    isoGrid(6, 5, (i, j) => { const t = CU.o_res + 1.1 + (i + j) * 0.04; if (on(t)) tinyPerson(80 + i * 46, -40 + j * 46, gz + drop(t, 200, 220), 0.95); });
    iNum('6', 'years of jam nights', 90, 560, CU.o_res + 0.2);
    iNum('~30', 'conversations', 90, 1440, CU.o_res + 1.1);
  }
  if (live(CU.o_per, CU.o_flow)) {   // Alex and the before / after, on standing panels; an amp, a guitar, a cable
    const gz = gone(CU.o_flow) * 900;
    screenPanel('osj-alex.jpg', -180, -320, gz + drop(CU.o_per, 300), 220, 324);
    if (on(CU.o_per + 0.3)) {
      const az = gz + drop(CU.o_per + 0.3, 220);
      isoBox(70, -210, az, 120, 70, 96, { r: 8 }); const af = faceOf([70, -140, az + 96], [1, 0, 0], [0, 0, -1]);
      faceRR(af, 12, 14, 96, 54, 6, { stroke: PAL.edge }); for (let k = 0; k < 4; k++) faceLine(af, [[18, 22 + k * 12], [102, 22 + k * 12]], PAL.inner);
      faceEll(af, 22, 82, 5, 5, { fill: PAL.accent }); faceEll(af, 40, 82, 5, 5, { stroke: PAL.edge });
      const gp = faceOf([170, -110, az + 200], [0.94, 0, -0.34], [0.12, 0, -0.99]);   // a guitar leaning on the amp
      facePath(gp, ellipsePts(30, 150, 34, 40, 0, 28)); ctx.fillStyle = PAL.face; ctx.fill(); hair(PAL.edge); ctx.stroke();
      facePath(gp, ellipsePts(30, 104, 26, 26, 0, 24)); ctx.fill(); ctx.stroke();
      faceRR(gp, 24, -40, 12, 120, 4, { fill: PAL.face, stroke: PAL.edge }); faceEll(gp, 30, 140, 10, 10, { stroke: PAL.inner });
      isoCable([[120, -140, az + 10], [140, -60, az], [190, -40, az + 2], [200, -100, az + 40]], { w: 5 });
    }
    screenPanel('osj-persona.jpg', -330, -120, gz + drop(CU.o_per + 0.15, 300), 320, 432);
    if (on(CU.o_story)) screenPanel('osj-story.jpg', -160, 260, gz + drop(CU.o_story, 360), 520, 216);
    meAt([200, 120, gz], 58, { mood: TT < CU.o_story + 0.6 ? 'smile' : 'happy', key: 'hO' });
  }
  if (live(CU.o_flow, CU.o_prod)) {   // the flow, standing tall; a live line of performers steps toward a small stage
    const gz = gone(CU.o_prod) * 900, rev = EZ.io(clamp((TT - CU.o_flow - 0.3) / 2.0));
    const S = isoPanelY(-160, 60, gz + drop(CU.o_flow, 300), 330, 540, 12, { r: 16 }), fp = slabFace(S);
    const hh = 520 * rev; if (hh > 2) { const img = asset('osj-flow.jpg'); faceImg((u, v) => fp(u + 10, v + 10), 'osj-flow.jpg', 310, hh, 10, img ? [0, 0, img.width, img.height * rev] : undefined); }
    isoBox(70, 210, gz, 100, 100, 18, { r: 12 }); micStand(120, 260, gz + 18, 90);
    let step = 0; for (let k = 0; k < 5; k++) step += spring(TT, CU.o_flow + 0.6 + k * 0.45, { k: 160, damp: 0.7 });
    for (let k = 5; k >= 0; k--) { const xx = -200 + (k + step) * 44; if (xx > 60) continue; tinyPerson(xx, 250, gz + (k === 0 ? 0 : 0)); }
    meAt([230, 40, gz], 56, { mood: 'wow', key: 'hO' });
    iTitle(['Two roles,', 'one live line.'], 90, 1400, 76, { t: CU.o_flow, accent: ['live'] });
  }
  if (on(CU.o_prod)) {   // the product: two phones on a plinth, a QR on a small table, a speaker
    const top = isoPlates(-280, -160, 0, 520, 330, [{ h: 16, r: 40 }]);
    if (on(CU.o_prod + 0.3)) speaker(-250, 60, top + drop(CU.o_prod + 0.3, 200), 60, 50, 110);
    if (on(CU.o_prod)) isoPhone('stage-mobile.png', -220, -110, top + drop(CU.o_prod, 300), 1.15);
    if (on(CU.o_prod + 0.2)) isoPhone('stage-mobile-2.png', 30, -60, top + drop(CU.o_prod + 0.2, 300), 1.15);
    if (on(CU.o_prod + 0.4)) {
      const tz = top + drop(CU.o_prod + 0.4, 200); isoCyl(170, 110, tz, 8, 60); isoCyl(170, 110, tz + 60, 50, 8);
      const q = faceOf([140, 80, tz + 70], [1, 0, 0], [0, 1, 0]); isoBox(140, 80, tz + 68, 60, 60, 3, { r: 4 });
      const R = RNG('qr'); for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) if ((a % 4 === 0 && b % 4 === 0) || R.f() > 0.55) faceRR(q, 6 + a * 10, 6 + b * 10, 8, 8, 1, { fill: PAL.accent, stroke: false });
    }
    meAt([180, 200, top], 56, { mood: 'laugh', key: 'hO', s: spring(TT, CU.o_prod + 0.5, { k: 200, damp: 0.55 }) });
    isoCaption("You're next.", { at: CU.o_prod - E0 + 0.8 });
  }
}
function sceneSeason() {
  world('amber');
  const hold = TT >= CU.hold - 1e-6; if (hold) TT = CU.hold;
  setIso(ISO0); isoTag('02', 'Season');
  if (live(CU.s_prob, CU.s_res)) {   // a clothing rack, a mirror, three sizes boxed, and the orb
    setIso({ ox: 540, oy: 1160, u: 1 });
    const gz = gone(CU.s_res) * 900;
    if (on(CU.s_prob + 0.2)) rack(-260, -200, gz + drop(CU.s_prob + 0.2, 240), 220, 200, 5);
    if (on(CU.s_prob + 0.35)) { const mz = gz + drop(CU.s_prob + 0.35, 240); const M = isoPanelX(-300, 0, mz, 140, 210, 10, { r: 30 }); const mf = slabFace(M); faceRR(mf, 14, 14, 112, 182, 22, { stroke: PAL.inner }); faceLine(mf, [[40, 40], [90, 90]], PAL.edge); faceLine(mf, [[50, 70], [80, 100]], PAL.inner); }
    [['S', -180], ['M', 0], ['L', 180]].forEach(([s, x], i) => { const t = CU.s_prob + 0.5 + i * 0.15; if (!on(t)) return; const z = gz + drop(t, 220); isoBox(x, 160, z, 140, 140, 110, { r: 12 }); isoText(faceOf([x, 300, z + 110], [1, 0, 0], [0, 0, -1]), s, 52, 74, 56, { color: PAL.accent }); });
    const orb = asset('season-orb.jpg'), [ox, oy] = isoP([100, -80, gz + 150]), R = 140 * spring(TT, CU.s_prob + 0.2, { k: 150, damp: 0.6 });
    if (orb && R > 1) { ctx.save(); ctx.beginPath(); ctx.arc(ox, oy, R, 0, TAU); ctx.clip(); ctx.drawImage(orb, ox - R * 1.06, oy - R * 1.06, R * 2.12, R * 2.12); ctx.restore(); ctx.beginPath(); ctx.arc(ox, oy, R, 0, TAU); hair(PAL.edge); ctx.stroke(); }
    meAt([270, 40, gz], 58, { mood: 'wow', key: 'hS' });
    iTitle(['Does it', 'work on me?'], 90, 470, 96, { t: CU.s_prob, accent: ['me'] });
    setIso(ISO0);
  }
  if (live(CU.s_res, CU.s_per)) {   // 25 tiny shoppers, three needs
    const gz = gone(CU.s_per) * 900;
    isoGrid(5, 5, (i, j) => { const t = CU.s_res + 0.2 + (i + j) * 0.04; if (on(t)) tinyPerson(-200 + i * 50, -120 + j * 50, gz + drop(t, 200, 220), 1.05); });
    ['Colour', 'Fit', 'Trust'].forEach((s, i) => { const t = CU.s_res + 1.0 + i * 0.25; if (on(t)) noteCard(s, 160, -60 + i * 120, gz + 80 + drop(t, 160), 150); });
    iNum('25', 'shopper interviews', 90, 560, CU.s_res + 0.2);
  }
  if (live(CU.s_per, CU.s_flow)) {
    const gz = gone(CU.s_flow) * 900;
    screenPanel('season-noa.jpg', -180, -320, gz + drop(CU.s_per, 300), 220, 334);
    if (on(CU.s_per + 0.3)) { shopBag(60, -150, gz + drop(CU.s_per + 0.3, 220)); shopBag(150, -110, gz + drop(CU.s_per + 0.4, 220), 60, 32, 70); }
    screenPanel('season-persona.jpg', -330, -120, gz + drop(CU.s_per + 0.15, 300), 320, 442);
    if (on(CU.s_story)) screenPanel('season-story.jpg', -160, 260, gz + drop(CU.s_story, 360), 520, 208);
    meAt([200, 120, gz], 58, { mood: TT < CU.s_story + 0.6 ? 'smile' : 'happy', key: 'hS' });
  }
  if (live(CU.s_flow, CU.s_prod)) {   // the flow, and a fitting-room booth beside it
    const gz = gone(CU.s_prod) * 900, rev = EZ.io(clamp((TT - CU.s_flow - 0.3) / 2.0));
    if (on(CU.s_flow + 0.3)) {
      const bz = gz + drop(CU.s_flow + 0.3, 240);
      isoPanelX(110, -180, bz, 120, 240, 8, { r: 6 }); isoBox(110, -180, bz, 90, 120, 4, { r: 4 });
      line3([[110, -180, bz + 250], [200, -180, bz + 250]], PAL.edge);
      for (let k = 0; k < 5; k++) { const cx = 116 + k * 18 + Math.sin(TT * 1.2 + k) * 2; line3([[cx, -180, bz + 250], [cx + 4, -176, bz + 40]], k % 2 ? PAL.inner : PAL.edge); }
      isoPanelX(200, -180, bz, 120, 240, 8, { r: 6 });
    }
    const S = isoPanelY(-250, 60, gz + drop(CU.s_flow, 300), 440, 520, 12, { r: 16 }), fp = slabFace(S);
    const hh = 500 * rev; if (hh > 2) { const img = asset('season-flow.jpg'); faceImg((u, v) => fp(u + 10, v + 10), 'season-flow.jpg', 420, hh, 10, img ? [0, 0, img.width, img.height * rev] : undefined); }
    iTitle(['From a first photo', 'to a look she buys.'], 90, 1400, 70, { t: CU.s_flow, accent: ['buys'] });
  }
  if (on(CU.s_prod)) {   // the fitting room: a monitor, a phone, a mannequin, draped fabric
    const top = isoPlates(-300, -180, 0, 560, 360, [{ h: 16, r: 40 }]), z = top + drop(CU.s_prod, 300);
    if (on(CU.s_prod + 0.3)) mannequin(190, -130, top + drop(CU.s_prod + 0.3, 240));
    isoBox(-110, -110, z, 120, 60, 14, { r: 10 }); isoCyl(-50, -80, z + 14, 10, 90);
    screenPanel('season-product.jpg', -260, -100, z + 104, 430, 268, { r: 12, m: 8 });
    if (on(CU.s_prod + 0.2)) isoPhone('season-phone.jpg', 120, 0, top + drop(CU.s_prod + 0.2, 300), 1.0);
    if (on(CU.s_prod + 0.45)) { const fz = top + drop(CU.s_prod + 0.45, 160); isoBox(-280, 100, fz, 240, 60, 6, { r: 26 }); isoBox(-250, 120, fz + 6, 200, 50, 6, { r: 22 }); isoBox(-220, 135, fz + 12, 150, 40, 5, { r: 18 }); }
    if (hold) isoRing(0, 0, 0, 380, 330, 12);
    meAt([40, 200, top], 56, { mood: hold ? 'wow' : 'laugh', key: 'hS' });
    isoCaption('The fitting room', { at: CU.s_prod - E0 + 0.8 });
  }
}
function scenePayoff() {
  world('violet');
  setIso({ ox: 540, oy: 1180, u: 1 });
  isoRing(0, 0, 0, 340, 260);
  rack(-250, -60, 28, 140, 150, 3);
  const items = ['stage-mobile.png', 'season-phone.jpg', 'stage-mobile-2.png'];
  items.forEach((nm, i) => { const a = -Math.PI * 0.75 + i * 0.7; isoPhone(nm, Math.cos(a) * 200 - 60, Math.sin(a) * 200 - 40, 28, 0.8); });
  micStand(150, 140, 28, 130);
  meBody('me-body-wave.png', 905, 1935, 0.46);
  iTitle(['Dekel Factor', 'Designs'], 90, 420, 104, { t: CU.name, accent: ['Designs'] });
  const f = () => { const a = clamp(spring(TT, CU.name + 0.5, { k: 120, damp: 0.8 })); if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.font = `400 40px ${ISOMONO}`; ctx.fillStyle = PAL.textD; ctx.fillText('dekelfactordesigns.com', 92, 600); ctx.restore(); };
  if (DEFER) DEFER.push(f); else f();
}
