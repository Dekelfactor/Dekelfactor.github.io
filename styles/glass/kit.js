// =====================================================================
//  styles/glass/kit.js — a cinematic 3D look studied from dekelfactordesigns.com: deep black space, one colour world
//  per project (a radial glow, drifting dust, a reflective floor haze), a real glass torus rendered in WebGL
//  (two nested tubes, fresnel rims, bright softbox streaks, a tinted refraction), real product screens floating as
//  glass panels, and big tight sans type (Inter Display) with one accent colour. Motion on 1s, eased and floating.
//  Needs from the piece head: CX (caption centre x). Built on kit/core.js. Helpers are prefixed gx / GX.
// =====================================================================
const GX = {
  ground: '#050507', ink: '#f2efe8', dim: '#9a978f', faint: 'rgba(242,239,232,0.55)',
  red: '#ff2d4a', redD: '#5a0812', amber: '#e8925a', amberD: '#4a2412', violet: '#8b6cff', teal: '#2fd6c8',
};
const GX_SANS = '"Inter Display", "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const GX_TEXT = '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const gxHex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

// ---------------------------------------------------------------------
//  THE GLASS RING (WebGL2, raymarched). One offscreen GL canvas, reused; drawn onto ctx per call.
//  gxRing(cx, cy, R, { rx, ry, rz, tint, thick, size, glow }) — R = the ring's outer radius on screen.
// ---------------------------------------------------------------------
let GXGL = null;
function gxGL() {
  if (GXGL) return GXGL;
  const cv = document.createElement('canvas'); cv.width = cv.height = 720;
  const gl = cv.getContext('webgl2', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false });
  if (!gl) return (GXGL = { fail: true });
  const vs = `#version 300 es
  in vec2 p; out vec2 uv; void main(){ uv = p; gl_Position = vec4(p, 0., 1.); }`;
  const fs = `#version 300 es
  precision highp float; in vec2 uv; out vec4 o;
  uniform vec3 rot; uniform vec3 tint; uniform float thick; uniform float t;
  mat3 rx(float a){ float c=cos(a),s=sin(a); return mat3(1.,0.,0., 0.,c,-s, 0.,s,c); }
  mat3 ry(float a){ float c=cos(a),s=sin(a); return mat3(c,0.,s, 0.,1.,0., -s,0.,c); }
  mat3 rz(float a){ float c=cos(a),s=sin(a); return mat3(c,-s,0., s,c,0., 0.,0.,1.); }
  float tor(vec3 q, float R, float r){ vec2 k = vec2(length(q.xz) - R, q.y); return length(k) - r; }
  float sdf(vec3 q){ return min(tor(q, 0.74, thick), tor(q, 0.48, thick * 0.55)); }
  vec3 nrm(vec3 q){ vec2 e = vec2(0.0015, 0.); return normalize(vec3(sdf(q+e.xyy)-sdf(q-e.xyy), sdf(q+e.yxy)-sdf(q-e.yxy), sdf(q+e.yyx)-sdf(q-e.yyx))); }
  vec3 env(vec3 d){
    float up = d.y * 0.5 + 0.5;
    vec3 c = mix(vec3(0.02), tint * 0.35 + 0.05, pow(up, 2.));
    c += vec3(1.) * smoothstep(0.93, 1., dot(d, normalize(vec3(-0.55, 0.62, 0.55)))) * 5.;       // key softbox
    c += vec3(1.) * smoothstep(0.90, 1., dot(d, normalize(vec3(0.75, 0.2, 0.6)))) * 2.5;          // rim light
    c += vec3(0.8) * smoothstep(0.85, 1., dot(d, normalize(vec3(0.1, 0.9, -0.3)))) * 1.5;          // top strip
    c += tint * smoothstep(0.3, 1., dot(d, normalize(vec3(0., -0.7, 0.7)))) * 1.4;                 // world glow from below
    c += vec3(0.7) * smoothstep(0.985, 1., abs(sin(d.x * 7. + d.y * 3.))) * 0.6;                  // streaks
    return c;
  }
  void main(){
    mat3 M = rz(rot.z) * ry(rot.y) * rx(rot.x);
    vec3 ro = vec3(uv * 1.0, -3.0), rd = normalize(vec3(uv * 0.05, 1.));   // near-orthographic
    float d = 0., h; bool hit = false; vec3 q;
    for (int i = 0; i < 72; i++) { q = M * (ro + rd * d); h = sdf(q); if (h < 0.0008) { hit = true; break; } d += h; if (d > 6.) break; }
    if (!hit) { o = vec4(0.); return; }
    vec3 n = nrm(q), v = M * rd;
    float fr = pow(1. - abs(dot(n, v)), 2.2);
    vec3 refl = env(reflect(v, n));
    vec3 refr = vec3(env(refract(v, n, 0.70)).r, env(refract(v, n, 0.72)).g, env(refract(v, n, 0.74)).b) * 0.7 + tint * 0.12;   // dispersion
    float spec = pow(max(dot(reflect(v, n), normalize(vec3(-0.55, 0.62, 0.55))), 0.), 40.) * 3.;
    vec3 col = mix(refr, refl, clamp(fr * 1.3, 0., 1.)) + spec;
    float a = clamp(0.32 + fr * 0.9 + spec, 0., 1.);
    o = vec4(col * a, a);
  }`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  GXGL = { cv, gl, U: { rot: gl.getUniformLocation(pr, 'rot'), tint: gl.getUniformLocation(pr, 'tint'), thick: gl.getUniformLocation(pr, 'thick'), t: gl.getUniformLocation(pr, 't') } };
  return GXGL;
}
function gxRing(cx, cy, R, o = {}) {
  const G = gxGL(); if (G.fail) { ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = R * 0.12; ctx.beginPath(); ctx.arc(cx, cy, R * 0.85, 0, TAU); ctx.stroke(); ctx.restore(); return; }
  const { gl, U, cv } = G;
  gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform3f(U.rot, o.rx ?? 1.15, o.ry ?? TT * 0.6, o.rz ?? 0.25);
  gl.uniform3fv(U.tint, gxHex(o.tint ?? '#8b6cff'));
  gl.uniform1f(U.thick, o.thick ?? 0.19); gl.uniform1f(U.t, TT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  const S = R * 2 / 0.86;   // the ring's outer edge sits at ~0.86 of the half-size
  if (o.glow !== false) { ctx.save(); const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.6); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.55, gxRGBA(o.tint ?? '#8b6cff', 0.10)); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(cx - R * 1.6, cy - R * 1.6, R * 3.2, R * 3.2); ctx.restore(); }
  ctx.drawImage(cv, cx - S / 2, cy - S / 2, S, S);
}
const gxRGBA = (h, a) => { const [r, g, b] = gxHex(h).map((v) => Math.round(v * 255)); return `rgba(${r},${g},${b},${a})`; };

// ---------------------------------------------------------------------
//  THE WORLD: deep ground, one colour glow, drifting dust, a floor haze. tint = the world's colour.
// ---------------------------------------------------------------------
function gxWorld(tint, o = {}) {
  ctx.save(); ctx.fillStyle = GX.ground; ctx.fillRect(-60, -60, W + 120, H + 120);
  const [gx, gy, gr] = o.glow ?? [W * 0.5, H * 0.42, H * 0.62];
  let g = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr); g.addColorStop(0, gxRGBA(tint, o.a ?? 0.34)); g.addColorStop(0.45, gxRGBA(tint, (o.a ?? 0.34) * 0.32)); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120);
  if (o.floor !== false) {   // a reflective floor haze with a horizon line
    const fy = o.floorY ?? H * 0.78;
    g = ctx.createLinearGradient(0, fy - 40, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.08, gxRGBA(tint, 0.20)); g.addColorStop(0.5, gxRGBA(tint, 0.06)); g.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = g; ctx.fillRect(-60, fy - 40, W + 120, H - fy + 100);
    ctx.fillStyle = gxRGBA(tint, 0.35); ctx.fillRect(-60, fy, W + 120, 1.5);
  }
  // dust: deterministic points drifting up slowly, twinkling
  const R = RNG('dust', o.key ?? tint), n = o.dust ?? 140;
  for (let i = 0; i < n; i++) {
    const x = R.r(0, W), y0 = R.r(0, H), sp = R.r(6, 22), s = R.r(0.8, 2.6), ph = R.r(0, TAU);
    const y = mod(y0 - TT * sp, H), a = 0.18 + 0.5 * (0.5 + 0.5 * Math.sin(TT * 1.3 + ph));
    ctx.fillStyle = i % 5 ? `rgba(255,255,255,${a * 0.45})` : gxRGBA(tint, a); ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
  }
  ctx.restore();
}


// ---------------------------------------------------------------------
//  A PHOTOGRAPHIC WORLD: one of the studio site's own 3D backdrops (an asset), cover-fit, with a slow push.
//  o: zoom (1 = cover), focus [fx, fy] (0..1 in the image), blur (px), dark (0..1 overlay), dx/dy drift
// ---------------------------------------------------------------------
function gxPhoto(name, o = {}) {
  const img = asset(name); ctx.save(); ctx.fillStyle = GX.ground; ctx.fillRect(-60, -60, W + 120, H + 120);
  if (img) {
    const k = Math.max(W / img.width, H / img.height) * (o.zoom ?? 1), w = img.width * k, h = img.height * k;
    const [fx, fy] = o.focus ?? [0.5, 0.5];
    const x = W * 0.5 - w * fx + (o.dx ?? 0), y = H * 0.5 - h * fy + (o.dy ?? 0);
    if (o.blur) ctx.filter = `blur(${o.blur}px)`;
    ctx.drawImage(img, Math.min(0, Math.max(W - w, x)), Math.min(0, Math.max(H - h, y)), w, h);
    ctx.filter = 'none';
  }
  if (o.dark) { ctx.fillStyle = `rgba(5,5,7,${o.dark})`; ctx.fillRect(-60, -60, W + 120, H + 120); }
  if (o.shade !== false) {   // keep the top and bottom quiet for type
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(5,5,7,0.55)'); g.addColorStop(0.22, 'rgba(5,5,7,0)'); g.addColorStop(0.62, 'rgba(5,5,7,0)'); g.addColorStop(1, 'rgba(5,5,7,0.75)');
    ctx.fillStyle = g; ctx.fillRect(-60, -60, W + 120, H + 120);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  A PANEL IN PERSPECTIVE: an image on a card rotated about its vertical axis (ry, radians) and set back in depth
//  (z: 0 = the screen plane, >0 farther). Drawn in thin vertical strips scaled by depth: a true perspective
//  trapezoid. o: crop [sx, sy, sw, sh], glow (hex), blur (px, depth of field), focal (px)
// ---------------------------------------------------------------------
function gxPanelP(name, cx, cy, w, h, o = {}) {
  const img = asset(name); if (!img) return;
  const ry = o.ry ?? 0, z = o.z ?? 0, f = o.focal ?? 1400, N = 36, c = o.crop ?? [0, 0, img.width, img.height];
  const pt = (u) => { const x = u * Math.cos(ry), zz = u * Math.sin(ry) + z, k = f / (f + zz); return [cx + x * k, k]; };
  const L = pt(-w / 2), R = pt(w / 2);
  const quad = [[L[0], cy - h / 2 * L[1]], [R[0], cy - h / 2 * R[1]], [R[0], cy + h / 2 * R[1]], [L[0], cy + h / 2 * L[1]]];
  if (Math.abs(R[0] - L[0]) < 2) return;
  ctx.save();
  if (o.blur) ctx.filter = `blur(${o.blur.toFixed(1)}px)`;
  ctx.shadowColor = o.glow ? gxRGBA(o.glow, 0.5) : 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 70 * L[1]; ctx.shadowOffsetY = o.glow ? 0 : 24;
  ctx.fillStyle = '#0c0c10'; ctx.beginPath(); quad.forEach((q, i) => (i ? ctx.lineTo(...q) : ctx.moveTo(...q))); ctx.closePath(); ctx.fill();
  ctx.shadowColor = 'transparent';
  for (let i = 0; i < N; i++) {
    const a = pt(-w / 2 + w * i / N), b = pt(-w / 2 + w * (i + 1) / N), k = (a[1] + b[1]) / 2, x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]);
    ctx.drawImage(img, c[0] + c[2] * i / N, c[1], c[2] / N + 0.5, c[3], x0 - 0.3, cy - h / 2 * k, x1 - x0 + 0.6, h * k);
  }
  // sheen and rim
  const g = ctx.createLinearGradient(L[0], cy - h / 2, R[0], cy + h / 2); g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(0.4, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.04)');
  ctx.fillStyle = g; ctx.beginPath(); quad.forEach((q, i) => (i ? ctx.lineTo(...q) : ctx.moveTo(...q))); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}
// a fly-in from depth: progress u (0 far, 1 placed) -> { z, ry, blur } ; and a fly-past toward the camera
const gxFly = (u, ry0 = 0.9) => ({ z: (1 - u) * 2600, ry: (1 - u) * ry0, blur: (1 - u) * 14 });
const gxPast = (v) => ({ z: -v * 900, blur: v * 18 });
// ---------------------------------------------------------------------
//  GLASS PANELS: a real screen (an asset) floating in space. o: r (corner), tilt (-1..1, a slight skew for depth),
//  glow (tint), s (scale), a (0..1 reveal: rises and un-blurs), crop [sx, sy, sw, sh] of the image.
// ---------------------------------------------------------------------
function gxPanel(name, x, y, w, h, o = {}) {
  const img = asset(name); const s = o.s ?? 1; if (s <= 0.01) return;
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s);
  const tl = o.tilt ?? 0; ctx.transform(1, tl * 0.06, 0, 1, 0, 0);
  const r = o.r ?? 26, X = -w / 2, Y = -h / 2;
  if (o.glow) { ctx.shadowColor = gxRGBA(o.glow, 0.55); ctx.shadowBlur = 90; }
  else { ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 30; }
  ctx.fillStyle = '#0c0c10'; ctx.beginPath(); ctx.roundRect(X, Y, w, h, r); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.save(); ctx.beginPath(); ctx.roundRect(X, Y, w, h, r); ctx.clip();
  if (img) { const c = o.crop ?? [0, 0, img.width, img.height]; ctx.drawImage(img, c[0], c[1], c[2], c[3], X, Y, w, h); }
  // a glass sheen sweeping across, and the top-edge highlight
  const g = ctx.createLinearGradient(X, Y, X + w, Y + h); g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(0.35, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.03)');
  ctx.fillStyle = g; ctx.fillRect(X, Y, w, h);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(X + 1, Y + 1, w - 2, h - 2, r); ctx.stroke();
  ctx.restore();
}
// a phone: a dark rounded body with a thin bright rim, the screen an asset
function gxPhone(name, cx, cy, h, o = {}) {
  const w = h * 0.47, s = o.s ?? 1; if (s <= 0.01) return;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.rotate(o.rot ?? 0);
  ctx.shadowColor = o.glow ? gxRGBA(o.glow, 0.5) : 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 80; ctx.shadowOffsetY = 20;
  ctx.fillStyle = '#16161c'; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, w * 0.16); ctx.fill(); ctx.shadowColor = 'transparent';
  const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(0.5, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(255,255,255,0.35)');
  ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.stroke();
  const m = w * 0.045, img = asset(name);
  ctx.save(); ctx.beginPath(); ctx.roundRect(-w / 2 + m, -h / 2 + m, w - 2 * m, h - 2 * m, w * 0.12); ctx.clip();
  if (img) { const sw = w - 2 * m, sh = h - 2 * m, k = Math.max(sw / img.width, sh / img.height); ctx.drawImage(img, -img.width * k / 2, -h / 2 + m, img.width * k, img.height * k); }
  ctx.restore();
  ctx.fillStyle = '#050507'; ctx.beginPath(); ctx.roundRect(-w * 0.15, -h / 2 + m * 1.8, w * 0.3, w * 0.075, w * 0.04); ctx.fill();   // the island
  ctx.restore();
}

// ---------------------------------------------------------------------
//  TYPE: big tight display lines, a sliding mask reveal per line (never a plain fade). Accent words in colour.
//  gxTitle(lines, x, y, size, { t, accent: { word: '#hex' }, align, lh })
// ---------------------------------------------------------------------
function gxTitle(lines, x, y, size, o = {}) {
  const t0 = o.t ?? E0, lh = o.lh ?? 1.02, al = o.align ?? 'left';
  ctx.save(); ctx.font = `700 ${size}px ${GX_SANS}`; ctx.letterSpacing = `${-size * 0.045}px`; ctx.textBaseline = 'alphabetic';
  lines.forEach((ln, i) => {
    const u = EZ.o3 ? EZ.o3(clamp((TT - t0 - i * 0.12) / 0.55)) : clamp((TT - t0 - i * 0.12) / 0.55);
    if (u <= 0) return;
    const yy = y + i * size * lh, w = ctx.measureText(ln).width, x0 = al === 'center' ? x - w / 2 : x;
    ctx.save(); ctx.beginPath(); ctx.rect(x0 - 20, yy - size * 1.0, w + 40, size * 1.25); ctx.clip();
    ctx.translate(0, (1 - u) * size * 0.9);
    let xx = x0;
    for (const word of ln.split(/(\s+)/)) { ctx.fillStyle = (o.accent && o.accent[word.replace(/[.,!?]/g, '')]) || o.color || GX.ink; ctx.fillText(word, xx, yy); xx += ctx.measureText(word).width; }
    ctx.restore();
  });
  ctx.restore();
}
function gxText(str, x, y, size, color, o = {}) {
  ctx.save(); ctx.font = `${o.weight ?? 500} ${size}px ${o.font ?? GX_TEXT}`; ctx.letterSpacing = `${o.ls ?? 0}px`; ctx.fillStyle = color; ctx.textAlign = o.align ?? 'left';
  const u = o.t != null ? clamp((TT - o.t) / 0.4) : 1; if (u <= 0) { ctx.restore(); return; }
  ctx.globalAlpha = u; ctx.fillText(str, x, y + (1 - u) * 12); ctx.restore();
}
// an eyebrow label like the site's "— 05 / Who it's for"
function gxEyebrow(str, x, y, tint, t) { if (t != null && TT < t) return; ctx.save(); ctx.fillStyle = tint; ctx.fillRect(x, y - 9, 34, 3); ctx.restore(); gxText(str, x + 50, y, 30, GX.dim, { ls: 2, t, weight: 500 }); }
// a glass chip (pill) with a label
function gxChip(str, x, y, size, o = {}) {
  const s = o.s ?? 1; if (s <= 0.01) return;
  ctx.save(); ctx.font = `600 ${size}px ${GX_TEXT}`; const w = ctx.measureText(str).width + size * 1.4, h = size * 2.1;
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = o.fill ?? 'rgba(255,255,255,0.07)'; ctx.strokeStyle = o.line ?? 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = o.color ?? GX.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(str, 0, 2);
  ctx.restore();
}

// =====================================================================
//  STYLE hooks
// =====================================================================
const STYLE = {
  name: 'glass',
  paper: '#050507',
  backdrop(c) { ctx.save(); ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); ctx.restore(); },
  window(P, key, src, o) {   // the next world seen through the ring's hole; the glass ring rides the window's edge
    const c = P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
    const r = Math.max(...P.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1])));
    ctx.save(); trace(P, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    if (r < H * 1.2) gxRing(c[0], c[1], r * 1.16, { tint: o && o.c && o.c[0] === '#' ? o.c : '#ffffff', glow: false, ry: TT * 0.9 });
  },
  blob(P, c, key) {
    const cc = P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
    const r = Math.max(...P.map((p) => Math.hypot(p[0] - cc[0], p[1] - cc[1])));
    ctx.save(); const g = ctx.createRadialGradient(cc[0], cc[1], 0, cc[0], cc[1], r); g.addColorStop(0, 'rgba(255,255,255,0.05)'); g.addColorStop(1, typeof c === 'string' && c[0] === '#' ? gxRGBA(c, 0.35) : 'rgba(255,255,255,0.15)');
    trace(P, true); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    gxRing(cc[0], cc[1], r * 1.08, { tint: '#ffffff', glow: false, ry: TT * 0.9 });
  },
  hero(x, y, r, o) {},
  heroColor: '#ffffff',
  post() {   // a vignette and fine film grain
    ctx.save(); const g = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H * 0.5, H * 0.85); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    grain({ n: 2500 });
  },
  ones: true,
};
