// =====================================================================
//  VIDEO A — "for apps and products". A story first: a jam night without the app, then the same night with it.
//  The without half is drawn (generic posts, a message, a clock) in a cold grey venue; the with half is warm,
//  with short moments of the real 2026 Open Stage Jam screens. Paper-me plays the performer.
// =====================================================================
// ---- drawn story props (generic; never posing as the product)
function glassCard(x, y, w, h, o = {}) {
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
  ctx.fillStyle = o.fill ?? 'rgba(22,22,28,0.92)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, o.r ?? 26); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
}
function post(x, y, w, who, text, tint) {   // a social post: avatar dot, a name, a line of text
  glassCard(x, y, w, 150);
  ctx.save(); ctx.fillStyle = tint; ctx.beginPath(); ctx.arc(x + 54, y + 52, 26, 0, TAU); ctx.fill(); ctx.restore();
  gxText(who, x + 96, y + 62, 30, GX.ink, { weight: 600 });
  gxText(text, x + 34, y + 118, 32, GX.dim);
}
function bubble(x, y, text, o = {}) {   // a sent message, right-aligned
  ctx.save(); ctx.font = `500 40px ${GX_TEXT}`; const w = ctx.measureText(text).width + 64; ctx.restore();
  ctx.save(); ctx.fillStyle = o.fill ?? '#2f6bff'; ctx.beginPath(); ctx.roundRect(x - w, y, w, 92, 46); ctx.fill(); ctx.restore();
  gxText(text, x - w + 32, y + 60, 40, '#ffffff');
  if (o.meta) gxText(o.meta, x - 10, y + 136, 28, GX.dim, { align: 'right' });
}
function typingDots(x, y) { for (let i = 0; i < 3; i++) { const a = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(TT * 8 - i)); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.beginPath(); ctx.arc(x + i * 34, y, 10, 0, TAU); ctx.fill(); } }
function wallClock(cx, cy, r, minutes) {   // a glass clock; minutes after 21:00
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50; ctx.fillStyle = 'rgba(20,20,26,0.9)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); ctx.restore();
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82); ctx.lineTo(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92); ctx.stroke(); }
  const h = 9 + minutes / 60, ah = h / 12 * TAU - Math.PI / 2, am = (minutes % 60) / 60 * TAU - Math.PI / 2;
  ctx.lineCap = 'round'; ctx.strokeStyle = GX.ink; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ah) * r * 0.45, cy + Math.sin(ah) * r * 0.45); ctx.stroke();
  ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(am) * r * 0.7, cy + Math.sin(am) * r * 0.7); ctx.stroke(); ctx.restore();
  const hh = 21 + Math.floor(minutes / 60), mm = Math.floor(minutes % 60);
  gxText(`${hh}:${String(mm).padStart(2, '0')}`, cx, cy + r + 80, 64, GX.ink, { align: 'center', weight: 700, font: GX_SANS });
}
function energy(x, y, w, k, col) {   // a battery-like bar draining
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x, y, w, 40, 20); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x + 6, y + 6, Math.max(8, (w - 12) * k), 28, 14); ctx.fill(); ctx.restore();
}
function phoneFrame(cx, cy, h, draw, o = {}) {   // a glass phone with drawn content (draw(x0, y0, w, h))
  const w = h * 0.47, s = o.s ?? 1; if (s <= 0.01) return;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.rotate(o.rot ?? 0);
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 70; ctx.fillStyle = '#121218'; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, w * 0.16); ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.roundRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24, w * 0.12); ctx.clip(); draw(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24); ctx.restore();
  ctx.restore();
}
// the venue as a world: cold and grey without the app, warm red with it
function venue(warm, o = {}) {
  const img = asset('bg-osj.jpg'); ctx.save(); ctx.fillStyle = GX.ground; ctx.fillRect(-60, -60, W + 120, H + 120);
  if (img) { const k = Math.max(W / img.width, H / img.height) * (o.zoom ?? 1.2); ctx.filter = warm ? `blur(${o.blur ?? 18}px)` : `grayscale(0.85) brightness(0.55) blur(${o.blur ?? 18}px)`; const sw = img.width * 0.42, sh = sw * H / W; ctx.drawImage(img, 0, img.height * 0.02, sw, sh, -40 + (o.dx ?? 0), -40 + (o.dy ?? 0), W + 80, H + 80); ctx.filter = 'none'; }
  ctx.fillStyle = warm ? 'rgba(5,5,7,0.35)' : 'rgba(8,12,20,0.45)'; ctx.fillRect(-60, -60, W + 120, H + 120);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(5,5,7,0.6)'); g.addColorStop(0.25, 'rgba(5,5,7,0)'); g.addColorStop(0.7, 'rgba(5,5,7,0)'); g.addColorStop(1, 'rgba(5,5,7,0.8)'); ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120);
  ctx.restore();
}
function tagLine(str, t, col) { const f = () => { if (TT < t) return; ctx.save(); ctx.font = `600 34px ${GX_TEXT}`; const w = ctx.measureText(str).width + 48; ctx.restore(); gxChip(str, 90 + w / 2, SAFE.top + 90, 34, { s: 1, fill: col, line: 'rgba(255,255,255,0.35)' }); }; if (DEFER) DEFER.push(f); else f(); }
function caption(lines, t, accent, y = 1300, size = 88) { gxTitle(lines, 90, y, size, { t, accent }); }

// ---------------------------------------------------------------------
//  2. PROMISE — Paper-me inside the glass ring
// ---------------------------------------------------------------------
function scenePromise() {
  gxPhoto('bg-intro.jpg', { zoom: 1.04 + (TT - E0) * 0.02, focus: [0.52, 0.46] });
  if (TT < CU.thesis) {
    gxTitle(['That first night?'], 90, 560, 100, { t: CU.turn1 });
    gxTitle(["That's how a", 'confusing product', 'feels to your users.'], 90, 1180, 88, { t: CU.turn2, accent: { 'users.': GX.violet } });
    me(648, 830, 60, { mood: 'focus', key: 'heroI', glow: '#9fb4ff' });
  } else {
    me(648, 830, 66, { mood: 'smile', key: 'heroI', glow: '#9fb4ff' });
    gxTitle(['I make complex', 'products feel', 'simple.'], 90, 1250, 104, { t: CU.thesis, accent: { simple: GX.violet } });
  }
}
// ---------------------------------------------------------------------
//  3. THE STORY — a jam night, without and with
// ---------------------------------------------------------------------
// a rendered story scene: cover-fit, a slow push, a blur-zoom in on its first 0.3s; dark ends kept for captions
function shot(name, t0, o = {}) {
  const img = asset(name); ctx.save(); ctx.fillStyle = GX.ground; ctx.fillRect(0, 0, W, H);
  if (img) {
    const inU = EZ.o3(clamp((TT - t0) / 0.3)), z = (o.zoom ?? 1.04) + (TT - t0) * (o.push ?? 0.025) + (1 - inU) * 0.12;
    const k = Math.max(W / img.width, H / img.height) * z, w = img.width * k, h = img.height * k;
    const [fx, fy] = o.focus ?? [0.5, 0.5];
    if (inU < 1) ctx.filter = `blur(${((1 - inU) * 14).toFixed(1)}px)`;
    ctx.drawImage(img, W * 0.5 - w * fx + (o.dx ?? 0) * (TT - t0), H * 0.5 - h * fy, w, h); ctx.filter = 'none';
  }
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(5,5,7,0.55)'); g.addColorStop(0.24, 'rgba(5,5,7,0)'); g.addColorStop(0.74, 'rgba(5,5,7,0)'); g.addColorStop(1, 'rgba(5,5,7,0.6)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// a small real screen floating in a scene (the with-the-app moments)
const insert = (name, t, x, y, h, rot = 0.05) => gxPhone(name, x, y + (1 - EZ.o3(clamp((TT - t) / 0.5))) * 260, h, { rot, glow: GX.red, s: EZ.o3(clamp((TT - t) / 0.5)) });

function sceneStory() {
  const C = CU;
  if (TT < C.b_scroll) {                                   // cold open: alone at the bar, someone else on stage
    shot('s-alone.jpg', 0, { focus: [0.45, 0.52], dx: 6 });
    gxTitle(['Waited all night', 'to sing…'], 90, 400, 100, { t: C.hook });
    gxTitle(['…and never', 'got on?'], 90, 1330, 100, { t: C.hook2, accent: { 'on?': '#9aa6c0' } });
  } else if (TT < C.b_msg) {                               // chasing posts
    shot('s-chaos.jpg', C.b_scroll, { focus: [0.5, 0.45] });
    tagLine('Without the app', C.b_scroll, 'rgba(120,130,150,0.35)');
    gxTitle(['Where? When?', 'Is there a list?'], 90, 1330, 84, { t: C.b_scroll + 0.2, accent: { 'list?': '#9aa6c0' } });
  } else if (TT < C.b_wait) {                              // a message, no reply
    shot('s-alone.jpg', C.b_msg, { zoom: 1.5, focus: [0.3, 0.55], push: 0.04 });
    tagLine('Without the app', C.b_msg, 'rgba(120,130,150,0.35)');
    bubble(920, 560, 'is there space tonight?', { meta: TT > C.b_msg + 1.0 ? 'Seen 20:41' : 'Delivered' });
    if (TT > C.b_msg + 0.6 && TT < C.b_msg + 1.2) typingDots(150, 800);
    gxTitle(['No reply.'], 90, 1430, 96, { t: C.b_msg + 1.1 });
  } else if (TT < C.b_out) {                               // the wait under the clock
    shot('s-clock.jpg', C.b_wait, { focus: [0.5, 0.45] });
    tagLine('Without the app', C.b_wait, 'rgba(120,130,150,0.35)');
    gxTitle(['Still waiting.'], 90, 1430, 96, { t: C.b_wait + 0.3 });
  } else if (TT < C.rewind) {                              // not tonight: out into the rain
    shot('s-rain.jpg', C.b_out, { focus: [0.5, 0.5], push: 0.03 });
    gxTitle(['Not tonight.'], 90, 1430, 110, { t: C.b_out + 0.2, accent: { 'tonight.': '#9aa6c0' } });
  } else if (TT < C.a_scan) {                              // rewind: a flicker on 2s between the rain and the warm bar
    shot(Math.floor(TT * 12) % 2 ? 's-rain.jpg' : 's-scan.jpg', C.rewind, { zoom: 1.1, push: 0 });
    gxTitle(['Same night.'], 90, 960, 120, { t: C.rewind });
  } else if (TT < C.a_queue) {                             // with: scan in at the table
    shot('s-scan.jpg', C.a_scan, { focus: [0.45, 0.55] });
    tagLine('With Open Stage Jam', C.a_scan, gxRGBA(GX.red, 0.75));
    insert('osj26-wizard.jpg', C.a_scan + 0.6, 800, 820, 560);
    gxTitle(['Scan in at the table.'], 90, 1430, 76, { t: C.a_scan + 0.2 });
  } else if (TT < C.a_next) {                              // relaxed: your place, in words
    shot('s-relaxed.jpg', C.a_queue, { focus: [0.5, 0.55] });
    tagLine('With Open Stage Jam', C.a_queue, gxRGBA(GX.red, 0.75));
    insert('osj26-queue.jpg', C.a_queue + 0.5, 800, 760, 560, -0.05);
    gxTitle(['2 before you.', 'Relax.'], 90, 1340, 84, { t: C.a_queue + 0.2, accent: { '2': GX.red } });
  } else if (TT < C.a_stage) {                             // the buzz
    const bz = Math.sin(TT * 60) * 5 * Math.exp(-(TT - C.a_next) * 4);
    ctx.save(); ctx.translate(bz, 0); shot('s-buzz.jpg', C.a_next, { focus: [0.5, 0.55] }); ctx.restore();
    tagLine('With Open Stage Jam', C.a_next, gxRGBA(GX.red, 0.75));
    insert('osj26-lock.jpg', C.a_next + 0.3, 800, 720, 560, 0.04);
    gxTitle(["You're next."], 90, 1430, 104, { t: C.a_next + 0.1, accent: { 'next.': GX.red } });
  } else {                                                 // on stage
    shot('s-stage.jpg', C.a_stage, { focus: [0.5, 0.5], push: 0.035 });
    tagLine('With Open Stage Jam', C.a_stage, gxRGBA(GX.red, 0.75));
    gxTitle(['On stage.'], 90, 1430, 120, { t: C.a_stage + 0.2, accent: { 'stage.': GX.red } });
  }
}
// ---------------------------------------------------------------------
//  4. HOW — research, persona, flow, design; then the offer; everything stops at the hold
// ---------------------------------------------------------------------
function sceneHow() {
  const hold = TT >= CU.hold - 1e-6; if (hold) TT = CU.hold;
  gxWorld(GX.violet, { a: 0.18, key: 'how' });
  const steps = [
    [CU.h_res, '01', 'Research', () => { stat('6', 'years of jam nights', 110, 980, GX.red, CU.h_res + 0.1); stat('~30', 'conversations', 110, 1260, GX.ink, CU.h_res + 0.4); }],
    [CU.h_per, '02', 'Persona', () => gxPanelP('osj-persona.jpg', 540, 1050, 860, 362, { crop: [30, 20, 740, 320], ry: Math.sin(TT * 0.6) * 0.12, glow: GX.violet })],
    [CU.h_flow, '03', 'Flow', () => { const img = asset('osj-flow.jpg'); if (img) gxPanelP('osj-flow.jpg', 540, 1060, 640, 760, { crop: [0, (TT - CU.h_flow) * 200, img.width, img.width * 1.19], ry: 0.18, glow: GX.violet }); }],
    [CU.h_des, '04', 'Design', () => { gxPhone('osj26-onstage.jpg', 400, 1060, 720, { rot: -0.05, glow: GX.red }); gxPhone('osj26-niceset.jpg', 720, 1080, 720, { rot: 0.05, glow: GX.red }); }],
  ];
  steps.forEach(([t0, n, name, draw], i) => {
    const t1 = i < 3 ? steps[i + 1][0] : CU.offer;
    beat(t0, t1, 540, 1000, () => {
      gxText(n, 90, 560, 40, GX.violet, { weight: 700, t: t0, font: GX_SANS });
      gxTitle([name + '.'], 90, 680, 120, { t: t0 });
      draw();
    });
  });
  if (TT >= CU.offer - 1e-6) {
    gxTitle(['Apps.', 'Websites.', 'Product videos.'], 90, 640, 116, { t: CU.offer, accent: { 'Apps.': GX.violet } });
    gxText('Designed from research,', 92, 1140, 48, GX.ink, { t: CU.offer + 0.9, weight: 600 });
    gxText('not guesses.', 92, 1205, 48, GX.dim, { t: CU.offer + 1.1, weight: 600 });
    me(820, 1380, 66, { mood: hold ? 'wow' : 'smile', key: 'heroW', s: popS(CU.offer + 0.6) });
  }
}
// ---------------------------------------------------------------------
//  5. CTA — DM me APP
// ---------------------------------------------------------------------
function sceneCTA() {
  gxPhoto('bg-payoff.jpg', { zoom: 1.03 + (TT - CU.slam) * 0.015, focus: [0.47, 0.42] });
  meBody('me-body-wave.png', 840, 1935, 0.52, { glow: GX.violet });
  gxText('DM me', 92, 900, 64, GX.ink, { weight: 600, font: GX_SANS });
  ctx.save(); const k = 1 + 0.08 * Math.exp(-(TT - CU.slam) * 6) * Math.cos((TT - CU.slam) * 20); ctx.translate(90, 1130); ctx.scale(k, k);
  ctx.font = `800 260px ${GX_SANS}`; ctx.letterSpacing = '-10px'; ctx.shadowColor = gxRGBA(GX.violet, 0.8); ctx.shadowBlur = 60; ctx.fillStyle = '#ffffff'; ctx.fillText('APP', 0, 0); ctx.restore();
  gxText('Dekel Factor Designs', 92, 1250, 46, GX.ink, { weight: 600, t: CU.dm + 0.4 });
  gxText('apps · websites · product videos', 92, 1310, 34, GX.dim, { t: CU.dm + 0.6 });
}
