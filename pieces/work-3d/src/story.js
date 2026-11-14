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
//  1. HOOK — your app makes sense to you. Your users? Lost.
// ---------------------------------------------------------------------
function sceneHook() {
  gxWorld(GX.violet, { a: 0.14, key: 'hook', dust: 80 });
  // a confusing app: a phone whose blocks keep reshuffling
  const lost = TT >= CU.lost;
  phoneFrame(540, 920, 800, (x0, y0, w, h) => {
    ctx.fillStyle = '#1b1b22'; ctx.fillRect(x0, y0, w, h);
    const R = RNG('mess', lost ? Math.floor(TT * 6) : 0);
    for (let i = 0; i < 14; i++) { const bx = x0 + 24 + R.r(0, w - 180), by = y0 + 60 + i * 52 + (lost ? R.n(14) : 0), bw = R.r(80, w - 60 - (bx - x0)); ctx.fillStyle = ['#2a2a34', '#33333f', '#3b2a44', '#24303a'][i % 4]; ctx.beginPath(); ctx.roundRect(bx, by, bw, 36, 10); ctx.fill(); }
    if (lost) for (let i = 0; i < 4; i++) { const R2 = RNG('q', i); gxText('?', x0 + R2.r(40, w - 60), y0 + R2.r(120, h - 60), 90, GX.violet, { weight: 800, font: GX_SANS }); }
  }, { s: EZ.o3(clamp(TT / 0.5)), rot: lost ? Math.sin(TT * 20) * 0.01 : 0 });
  if (lost) me(820, 1240, 66, { mood: 'wow', key: 'heroH', s: popS(CU.lost + 0.1) });
  if (TT < CU.pains) {
    gxTitle(['Your app makes', 'sense to you.'], 90, 420, 96, { t: 0.2 });
    if (lost) gxTitle(['Your users?', 'Lost.'], 90, 1480, 96, { t: CU.lost, accent: { 'Lost': GX.violet } });
  }
  // their pains fly at the camera
  if (TT >= CU.pains) {
    const items = [['drop-off at sign-up', -260, -320], ['too many steps', 220, -60], ['how do I…?', -200, 220], ['1-star review', 200, 420]];
    items.forEach(([str, dx, dy], i) => {
      const t0 = CU.pains + i * 0.75, u = clamp((TT - t0) / 1.6); if (u <= 0 || u >= 1) return;
      const k = 0.4 + u * u * 3.2;
      ctx.save(); ctx.translate(540 + dx * k * 0.6, 960 + dy * k * 0.6); ctx.scale(k, k); if (u > 0.7) ctx.filter = `blur(${((u - 0.7) * 40).toFixed(1)}px)`;
      gxChip(str, 0, 0, 34, { fill: 'rgba(255,60,90,0.18)', line: 'rgba(255,120,140,0.6)' }); ctx.restore();
    });
    gxTitle(['Sound familiar?'], 90, 420, 96, { t: CU.pains + 0.2, accent: { 'familiar?': GX.violet } });
  }
}
// ---------------------------------------------------------------------
//  2. PROMISE — Paper-me inside the glass ring
// ---------------------------------------------------------------------
function scenePromise() {
  gxPhoto('bg-intro.jpg', { zoom: 1.04 + (TT - E0) * 0.02, focus: [0.52, 0.46] });
  me(648, 830, 66, { mood: 'smile', key: 'heroI', glow: '#9fb4ff' });
  gxTitle(['I make complex', 'products feel', 'simple.'], 90, 1250, 104, { t: CU.thesis, accent: { simple: GX.violet } });
}
// ---------------------------------------------------------------------
//  3. THE STORY — a jam night, without and with
// ---------------------------------------------------------------------
function sceneStory() {
  const warm = TT >= CU.rewind;
  const flick = TT >= CU.rewind && TT < CU.a_scan && Math.floor(TT * 24) % 2 === 0;   // the rewind: a time-cut flicker on 2s
  venue(warm && !flick, { dx: warm ? Math.sin(TT * 0.3) * 30 : -TT * 6 });
  if (!warm) {
    tagLine('Without the app', E0, 'rgba(120,130,150,0.35)');
    // a. chasing the night across posts
    beat(CU.b_scroll, CU.b_msg, 540, 900, () => {
      const scroll = (TT - CU.b_scroll) * 260;
      ctx.save(); ctx.beginPath(); ctx.rect(60, 420, 960, 780); ctx.clip();
      [['Jam Night TLV', 'sign-up at 8?? maybe 9', '#7a5cff'], ['Ronit', 'is the list full already?', '#ff7a59'], ['The Back Room', 'open mic moved to thursday', '#2fd6c8'], ['Omer', 'anyone know who\'s hosting?', '#ffb020'], ['Jam Night TLV', 'bring your own cable', '#7a5cff']]
        .forEach(([w, t, c], i) => post(100, 1140 + i * 180 - scroll, 880, w, t, c));
      ctx.restore();
      me(540, 1400, 64, { mood: 'focus', key: 'heroS' });
      caption(['Tuesday. Jam night.', 'Where? When? Am I on?'], CU.b_scroll + 0.2, { 'on?': '#9aa6c0' }, 500, 76);
    });
    // b. a message, no reply
    beat(CU.b_msg, CU.b_wait, 540, 900, () => {
      bubble(980, 700, 'is there space tonight?', { meta: TT > CU.b_msg + 1.0 ? 'Seen 20:41' : 'Delivered' });
      if (TT > CU.b_msg + 0.6 && TT < CU.b_msg + 1.2) typingDots(150, 940);
      me(780, 1120, 70, { mood: TT > CU.b_msg + 1.2 ? 'focus' : 'smile', key: 'heroS', rot: -0.1 });
      caption(['No reply.'], CU.b_msg + 1.1, {}, 1560 - 120, 88);
    });
    // c. the wait: the clock runs, the energy drains
    beat(CU.b_wait, CU.b_out, 540, 900, () => {
      const m = 0 + clamp((TT - CU.b_wait) / 1.8) * 150;
      wallClock(540, 760, 230, m);
      energy(240, 1180, 600, 1 - m / 170, m > 100 ? '#ff5a5a' : '#ffb020');
      me(860, 1380, 60, { mood: 'focus', key: 'heroS' });
      caption(['Still waiting.'], CU.b_wait + 0.3, {}, 1400, 80);
    });
    // d. not tonight
    beat(CU.b_out, CU.rewind, 540, 900, () => {
      me(540, 900, 96, { mood: 'focus', key: 'heroS' });
      caption(['Not tonight.'], CU.b_out + 0.2, { 'tonight.': '#9aa6c0' }, 1350, 110);
    }, { last: true });
  } else {
    tagLine('With Open Stage Jam', CU.a_scan, gxRGBA(GX.red, 0.75));
    if (flick) { gxTitle(['Same night.'], 90, 960, 120, { t: CU.rewind }); return; }
    // a. scan in at the table
    beat(CU.a_scan, CU.a_queue, 540, 900, () => {
      const qr = asset('prop-qr.jpg'); if (qr) { ctx.save(); ctx.shadowColor = gxRGBA(GX.red, 0.5); ctx.shadowBlur = 60; ctx.drawImage(qr, 90, 600, 420, 420); ctx.restore(); }
      gxPhone('osj26-wizard.jpg', 760, 900, 760, { rot: 0.05, glow: GX.red, s: EZ.o3(clamp((TT - CU.a_scan - 0.3) / 0.6)) });
      me(300, 1240, 62, { mood: 'happy', key: 'heroS' });
      caption(['Scan in at the table.'], CU.a_scan + 0.2, {}, 500, 76);
    });
    // b. your place in line, in words
    beat(CU.a_queue, CU.a_next, 540, 900, () => {
      gxPhone('osj26-queue.jpg', 540, 930, 980, { glow: GX.red, s: 1 });
      me(880, 1380, 60, { mood: 'smile', key: 'heroS' });
      caption(['2 before you.'], CU.a_queue + 0.2, { '2': GX.red }, 500, 84);
    });
    // c. the buzz
    beat(CU.a_next, CU.a_stage, 540, 900, () => {
      const buzz = Math.sin(TT * 60) * 6 * Math.exp(-(TT - CU.a_next) * 4);
      gxPhone('osj26-lock.jpg', 540 + buzz, 930, 980, { glow: GX.red, s: 1 });
      me(200, 1380, 66, { mood: 'wow', key: 'heroS' });
      caption(["You're next."], CU.a_next + 0.1, { "next.": GX.red }, 500, 96);
    });
    // d. on stage
    if (TT >= CU.a_stage - 1e-6) {
      venue(true, { blur: 0.01, dx: -(TT - CU.a_stage) * 20 });
      const sp = ctx.createRadialGradient(540, 700, 0, 540, 900, 900); sp.addColorStop(0, 'rgba(255,230,220,0.28)'); sp.addColorStop(1, 'rgba(255,230,220,0)'); ctx.fillStyle = sp; ctx.fillRect(0, 0, W, H);
      meBody('me-body-cheer.png', 400, 1935, 0.62, { glow: GX.red });
      gxPhone('osj26-niceset.jpg', 820, 900, 620, { rot: 0.06, glow: GX.red, s: EZ.o3(clamp((TT - CU.a_stage - 0.4) / 0.6)) });
      caption(['On stage.'], CU.a_stage + 0.2, { 'stage.': GX.red }, 500, 104);
    }
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
