// =====================================================================
//  SCENES — one function per era, world coords 1080x1920. Orange is the spark (the idea) only.
//  The mark: a mustard paper disc with a stitched ring, the spark sitting on it.
// =====================================================================
const CU = TIMELINE.cues;
const MARK = [540, 1050];                  // where the sketch, the badge and the finished mark sit on the sheet
function cap(str, t) { if (!past(TT, t)) return; const f = () => tag(str, CX, H - SAFE.bottom - 60, 50, { rot: 0.012, tape: false, frac: ev(t, 0.6) }); if (DEFER) DEFER.push(f); else f(); }
function stepTag(str, t) { const f = () => tag(str, 70 + (handW(str, 72) + 66) / 2, SAFE.top + 90, 72, { rot: -0.04, s: popS(t) }); if (DEFER) DEFER.push(f); else f(); }
function markDisc(x, y, r, key) {
  cut(ellipsePts(x, y, r, r, 0, 48), PAL.mustard, { key: key + 'd', crayon: '#b9852c', crAl: 0.35 });
  ctx.setLineDash([14, 12]); ink(ellipsePts(x, y, r * 0.84, r * 0.84, 0, 48), { closed: true, w: 4, color: '#fbf0cf', amt: 0.6, key: key + 'st' }); ctx.setLineDash([]);
}
function note(x, y, s, c, a, key) {   // a sticky note with a scribble
  if (s <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
  cut(rect(-60, -60, 120, 120, 3), c, { key: key, sb: 6, sy: 5 });
  ink([[-38, -20], [30, -24]], { w: 4, color: PAL.ink, key: key + 'a' });
  ink([[-38, 4], [14, 2]], { w: 4, color: PAL.ink, key: key + 'b' });
  ink(ellipsePts(24, 28, 12, 12, 0, 14), { closed: true, w: 3, color: PAL.ink, key: key + 'c' });
  ctx.restore();
}
// ---- the desk: shared by the first and the last scene (the end is the start, changed)
function desk(morning) {
  const k = morning ? 'M' : 'N';
  cut(rect(-30, -30, W + 60, H + 60, 0), morning ? PAL.yellow : PAL.navy, { key: 'wall' + k, shadow: false, tear: 0, shade: false, pat: pat.dots(morning ? 'rgba(255,255,255,0.25)' : 'rgba(255,230,180,0.10)', 4, 70) });
  // window: moon at night, sun in the morning
  cut(rect(620, 300, 300, 340, 6), PAL.woodD, { key: 'win' });
  cut(rect(642, 322, 256, 296, 2), morning ? PAL.sky : PAL.night, { key: 'glass' + k, shadow: false, pat: morning ? null : (bb) => { const R = RNG('stars'); for (let i = 0; i < 22; i++) sparkle(R.r(bb.x0, bb.x1), R.r(bb.y0, bb.y1), R.r(3, 7) * (0.6 + 0.4 * ((B + i) % 2))); } });
  if (morning) { cut(ellipsePts(800, 420, 52, 52, 0, 30), '#fff1a8', { key: 'sun', crayon: '#e6b23a' }); cut(ellipsePts(700 + Math.sin(TT) * 8, 530, 50, 20, 0, 18), '#ffffff', { key: 'wcl', sb: 4 }); }
  else cut(ellipsePts(800, 410, 34, 34, 0, 30), '#f6ecc8', { key: 'moon' });
  ink([[770, 322], [770, 618]], { w: 8, color: PAL.woodD, amt: 0.3, key: 'mull' });
  clock(250, 560, 80, morning ? 8 : 11, morning ? 10 : 52, 'clk');
  // shelf, books, the cat
  cut(rect(70, 700, 400, 26, 4), PAL.wood, { key: 'shelf' });
  books(190, 700, 0.85, 'bk');
  cat(390, 668, 0.62, PAL.charcoal, 'cat');
  // the desk top and the sheet
  cut(rect(-30, 790, W + 60, 1200, 0), PAL.wood, { key: 'desk', tear: 0, sy: -6, pat: pat.grainWood('rgba(120,60,20,0.18)') });
  cut(rot(rect(200, 810, 680, 510, 3), 540, 1065, -0.025), PAL.paper, { key: 'sheet', sb: 14, sy: 9, pat: pat.lines('rgba(76,111,181,0.13)', 46, 30) });
  // the lamp (on the right of the desk)
  cut(ellipsePts(930, 840, 70, 20, 0, 24), PAL.lamp, { key: 'lbase' });
  cut(capsulePts(930, 830, 850, 600, 20), '#c9a24a', { key: 'larm' });
  cut([[700, 650], [745, 560], [880, 560], [920, 650]], PAL.lamp, { key: 'shade' });
  mug(130, 830, 0.85, PAL.pink, 'mug' + k);
}
// ---- 1. night desk: asleep, the lamp, the sketch
function sceneSketch() {
  desk(false);
  const on = past(TT, CU.lamp);
  if (on) { ctx.fillStyle = 'rgba(255,232,160,0.20)'; ctx.beginPath(); ctx.moveTo(712, 650); ctx.lineTo(908, 650); ctx.lineTo(1040, 1330); ctx.lineTo(260, 1330); ctx.closePath(); ctx.fill(); }
  note(540, 470, popS(CU.notes), PAL.pinkL, -0.12, 'n1');
  note(555, 640, popS(CU.notes + 0.5), PAL.mint, 0.1, 'n2');
  note(820, 860, popS(CU.notes + 1.0), '#fff3a0', 0.18, 'n3');
  // the sketch: a pencil circle round the spark, then idea marks
  const RING = ellipsePts(MARK[0], MARK[1], 190, 180, 0, 64);
  const fr = ev(CU.sketch0, CU.sketch1 - CU.sketch0);
  ink(RING, { closed: true, w: 5, color: PAL.charcoal, frac: fr, key: 'ring', double: true });
  [[[300, 830], [340, 870]], [[780, 830], [740, 870]], [[540, 790], [540, 840]]].forEach((L, i) => ink(L, { w: 5, color: PAL.charcoal, frac: ev(CU.sketch1 - 0.5 + i * 0.15, 0.2), key: 'il' + i }));
  if (!on) { ctx.fillStyle = 'rgba(10,12,35,0.42)'; ctx.fillRect(-30, -30, W + 60, H + 60); }
  const woke = past(TT, CU.ray5);
  spark(MARK[0], MARK[1], 84, { rays: woke ? 5 : 4, mood: !on ? 'focus' : woke ? 'happy' : 'wow', key: 'hero', s: woke ? 1 + 0.12 * Math.exp(-(TT - CU.ray5) * 6) : 0.9 });
  // the pencil (and the hand holding it) follows the tip while sketching
  if (TT >= CU.sketch0 && TT < CU.sketch1 + 0.25) {
    const [tx, ty] = pointAt([...RING, RING[0]], clamp(fr, 0.001, 1)), ang = -0.7;
    drawPencil(tx, ty, ang, 230, 1, 'pen');
    hand(tx + Math.cos(ang) * 200, ty + Math.sin(ang) * 200, 0.8, ang + Math.PI, PAL.skin1, PAL.purple, { key: 'hnd' });
  }
  stepTag('1 · sketch', CU.lamp);
  cap('every brand starts as a spark', CU.lamp + 0.25);
}
// ---- 2. the cutting mat: scissors cut the badge out
function sceneCut() {
  cut(rect(-30, -30, W + 60, H + 60, 0), PAL.teal, { key: 'wallC', shadow: false, tear: 0, shade: false, pat: pat.stripes('rgba(255,255,255,0.12)', 26, 70) });
  // pinned swatches and a plant on the wall
  [PAL.pink, PAL.yellow, PAL.blue, PAL.purple].forEach((c, i) => cut(rect(560 + i * 86, 420, 70, 110, 3), c, { key: 'sw' + i, sb: 5, sy: 4 }));
  cut(ellipsePts(720, 410, 10, 10, 0, 12), PAL.ink, { key: 'pin', shadow: false });
  plant(900, 640, 0.7, PAL.purple, 'plC');
  // the mat with its grid
  cut(rect(70, 640, 940, 820, 10), PAL.greenD, { key: 'mat', sy: 10, pat: (bb) => { pat.lines('rgba(255,255,255,0.22)', 60, 20)(bb); ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2; ctx.beginPath(); for (let x = bb.x0 + 20; x < bb.x1; x += 60) { ctx.moveTo(x, bb.y0); ctx.lineTo(x, bb.y1); } ctx.stroke(); } });
  // the ruler and paper scraps
  cut(rot(rect(110, 1370, 520, 50, 3), 370, 1395, -0.04), '#f3e3a4', { key: 'ruler', pat: (bb) => { ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2; ctx.beginPath(); for (let x = bb.x0 + 10; x < bb.x1; x += 22) { ctx.moveTo(x, bb.y0); ctx.lineTo(x, bb.y0 + ((x - bb.x0) % 110 < 22 ? 22 : 12)); } ctx.stroke(); } });
  const RS = RNG('scraps');
  for (let i = 0; i < 7; i++) { const x = RS.r(120, 960), yy =i % 2 ? RS.r(690, 780) : RS.r(1300, 1360); cut(rot([[0, 0], [RS.r(40, 80), RS.r(-10, 10)], [RS.r(30, 70), RS.r(30, 60)]].map(([a, b]) => [x + a, yy + b]), x, yy, RS.r(0, 6)), [PAL.pink, PAL.blue, PAL.yellow, PAL.mint][i % 4], { key: 'scr' + i, sb: 4, sy: 3 }); }
  // the pink sheet and the badge being cut from it
  const lift = past(TT, CU.lift) ? EZ.back(clamp((TT - CU.lift) / 0.3)) : 0;
  cut(rot(rect(250, 790, 580, 520, 3), 540, 1050, 0.04), PAL.pink, { key: 'pinkS', pat: pat.dots('rgba(255,255,255,0.25)', 5, 34) });
  const fr = ev(CU.snip0, CU.snip1 - CU.snip0), CIR = ellipsePts(MARK[0], MARK[1], 222, 222, -Math.PI / 2, 64);
  if (lift > 0) cut(ellipsePts(MARK[0], MARK[1], 214, 214, 0, 48), '#c77d96', { key: 'hole', shadow: false, grain: 0.4 });   // the hole left behind
  const lx = MARK[0], ly = MARK[1] - 26 * lift;
  ctx.save(); ctx.translate(lx, ly); ctx.scale(1 + 0.04 * lift, 1 + 0.04 * lift); ctx.translate(-lx, -MARK[1]);
  markDisc(lx, MARK[1], 210, 'bdg');
  ctx.restore();
  if (lift <= 0) {
    ctx.setLineDash([16, 14]); ink(CIR, { closed: true, w: 3, color: 'rgba(42,29,24,0.55)', amt: 0.5, key: 'guide' }); ctx.setLineDash([]);
    ink(CIR, { closed: true, w: 7, color: '#fff7e6', frac: fr, amt: 0.5, key: 'cutline' });
  }
  spark(lx, ly, 82, { rays: 6, mood: lift > 0 ? 'happy' : 'focus', key: 'hero' });
  // the scissors ride the cut line, snipping on every 8th
  if (TT >= CU.snip0 - 0.25 && TT < CU.snip1 + 0.25) {
    const P = [...CIR, CIR[0]], u = clamp(fr, 0.002, 0.999), [sx, sy] = pointAt(P, u), [qx, qy] = pointAt(P, Math.min(1, u + 0.01));
    const a = Math.atan2(qy - sy, qx - sx), open = (Math.floor(TT / E8) % 2 ? 0.32 : 0.08);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(a + Math.PI);
    [-1, 1].forEach((sg) => {
      ctx.save(); ctx.rotate(sg * open);
      cut(capsulePts(-110, 0, 0, 0, 20), '#cfd3da', { key: 'bl' + sg, sb: 5, sy: 4, crayon: '#9aa0aa', crAl: 0.3 });
      cut(ellipsePts(-150, sg * 28, 38, 26, sg * 0.4, 18), PAL.blue, { key: 'hd' + sg, sb: 6 });
      cut(ellipsePts(-150, sg * 28, 18, 11, sg * 0.4, 14), PAL.greenD, { key: 'hh' + sg, shadow: false, grain: false });
      ctx.restore();
    });
    dot(-108, 0, 7, PAL.ink);
    ctx.restore();
  }
  if (lift > 0) for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.45, d = 270 + 30 * lift; sparkle(MARK[0] + Math.cos(a) * d, MARK[1] + Math.sin(a) * d * 0.9, 18 * lift); }
  stepTag('2 · cut', E0 + 0.25);
  cap('we cut it into a mark', E0 + 0.5);
}
