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

