"""Floating app-screen cards over the Katana cut (15.0-26.4s), v2: one card per moment, ~20% smaller, a subtle rim
instead of a white glow, true perspective (rotateY) with a visible metal edge and a soft shadow. RGBA PNGs at 30fps."""
import math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
W, H, FPS, T0, T1 = 1080, 1920, 30, 15.0, 26.4
FL = '/tmp/claude-0/-home-user/b7e0d5e7-dbb1-5a81-94b7-e8f98576ad30/scratchpad/flow/'
FONT = ImageFont.truetype('/usr/share/fonts/opentype/inter/InterDisplay-ExtraBold.otf', 30)

def face(name, h):
    """the phone's front: dark body, thin bezel, rounded screen, a fine light rim"""
    scr = Image.open(FL + name).convert('RGB'); w = int(h * scr.width / scr.height); bz = 12; r = int(w * 0.14)
    f = Image.new('RGBA', (w + 2 * bz, h + 2 * bz), (0, 0, 0, 0)); d = ImageDraw.Draw(f)
    d.rounded_rectangle((0, 0, w + 2 * bz - 1, h + 2 * bz - 1), r + bz, fill=(16, 16, 20, 255), outline=(205, 205, 215, 255), width=2)
    m = Image.new('L', (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w, h), r, fill=255)
    f.paste(scr.resize((w, h), Image.LANCZOS), (bz, bz), m)
    # a soft diagonal sheen on the glass
    sh = Image.new('L', f.size, 0); ImageDraw.Draw(sh).polygon([(0, 0), (f.width * 0.55, 0), (0, f.height * 0.42)], fill=34)
    sh = sh.filter(ImageFilter.GaussianBlur(40)); sm = Image.fromarray(np.minimum(np.array(sh), np.array(f.split()[3])))
    f.alpha_composite(Image.merge('RGBA', (Image.new('L', f.size, 255),) * 3 + (sm,)))
    return f

def coeffs(dst, src):   # perspective coefficients mapping output quad -> source rect (for Image.transform)
    A = []; B = []
    for (x, y), (u, v) in zip(dst, src):
        A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]; B += [u, v]
    return np.linalg.solve(np.array(A, float), np.array(B, float)).tolist()

def project(fw, fh, ry, rx, f=1700):
    """corners of a fw x fh card rotated about its centre (ry around Y, rx around X), perspective at focal f"""
    pts = []
    for x, y in [(-fw / 2, -fh / 2), (fw / 2, -fh / 2), (fw / 2, fh / 2), (-fw / 2, fh / 2)]:
        X = x * math.cos(ry); Z = x * math.sin(ry); Y = y * math.cos(rx) - Z * math.sin(rx); Z = y * math.sin(rx) + Z * math.cos(rx)
        k = f / (f + Z); pts.append((X * k, Y * k))
    return pts

def card3d(F, ry, rx, scale):
    fw, fh = F.width * scale, F.height * scale
    q = project(fw, fh, ry, rx); dx = 14 * scale * (1 if ry < 0 else -1)
    xs = [p[0] for p in q]; ys = [p[1] for p in q]; pad = 120
    ox, oy = -min(xs) + pad, -min(ys) + pad; cw, ch = int(max(xs) - min(xs) + 2 * pad), int(max(ys) - min(ys) + 2 * pad)
    out = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    src = [(0, 0), (F.width, 0), (F.width, F.height), (0, F.height)]
    alpha = F.split()[3]
    # soft shadow below: the phone's own rounded silhouette, offset and blurred
    shq = [(x + ox + 30, y + oy + 50) for x, y in q]
    sil = Image.new('RGBA', F.size, (0, 0, 0, 0)); sil.putalpha(alpha.point(lambda a: int(a * 0.6)))
    sh = sil.transform((cw, ch), Image.PERSPECTIVE, coeffs(shq, src), Image.BICUBIC).filter(ImageFilter.GaussianBlur(34))
    out.alpha_composite(sh)
    # the metal edge: the same rounded silhouette, pushed back a few px, in dark grey-blue (follows the corners)
    edq = [(x + ox + dx, y + oy + 6 * scale) for x, y in q]
    ed = Image.new('RGBA', F.size, (62, 64, 74, 0)); ed.putalpha(alpha)
    out.alpha_composite(ed.transform((cw, ch), Image.PERSPECTIVE, coeffs(edq, src), Image.BICUBIC))
    dst = [(x + ox, y + oy) for x, y in q]
    warped = F.transform((cw, ch), Image.PERSPECTIVE, coeffs(dst, src), Image.BICUBIC)
    out.alpha_composite(warped)
    return out

def pill(text):
    tw = int(FONT.getlength(text)); p = Image.new('RGBA', (tw + 56, 58), (0, 0, 0, 0)); d = ImageDraw.Draw(p)
    d.rounded_rectangle((0, 0, tw + 55, 57), 29, fill=(255, 255, 255, 235)); d.text((28, 40), text, font=FONT, fill=(20, 18, 20, 255), anchor='ls')
    return p

def spring(t): return 0.0 if t <= 0 else 1 - math.exp(-6.5 * t) * math.cos(8 * t)

def put(img, F, cx, cy, t_in, t_out, t, ry_end, label=None, phase=0.0):
    if t < t_in or t >= t_out: return
    u = spring(t - t_in); v = max(0.0, min(1.0, (t - (t_out - 0.22)) / 0.22))
    ry = math.radians(ry_end + (1 - u) * (ry_end * 1.8) + math.sin((t + phase) * 1.3) * 2.5)
    rx = math.radians(6 + math.sin((t + phase) * 1.1) * 1.5)
    s = (0.72 + 0.28 * u) * (1 - 0.3 * v)
    c = card3d(F, ry, rx, s); a = min(1.0, (t - t_in) / 0.12) * (1 - v)
    if a < 1: c.putalpha(c.split()[3].point(lambda p: int(p * a)))
    y = cy + (1 - u) * 240 + math.sin((t + phase) * 2.0) * 7
    img.alpha_composite(c, (int(cx - c.width / 2), int(y - c.height / 2)))
    if label and t >= t_in + 0.25:
        p = pill(label); la = min(1.0, (t - t_in - 0.25) / 0.2) * (1 - v)
        if la < 1: p.putalpha(p.split()[3].point(lambda q: int(q * la)))
        img.alpha_composite(p, (int(cx - p.width / 2), int(y + F.height * 0.5 * s + 10)))

CK = face('o-checkedin.webp', 600); QU = face('s-queueline.webp', 720); LK = face('f-lock.webp', 720); NS = face('o-onstage2.webp', 780)
for i in range(int(round((T1 - T0) * FPS))):
    t = T0 + i / FPS; img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    put(img, CK, 270, 640, 15.15, 17.57, t, ry_end=18, label="You're checked in")
    put(img, QU, 790, 640, 17.70, 20.40, t, ry_end=-18, label='Your place in line', phase=0.6)
    put(img, LK, 790, 660, 20.50, 23.17, t, ry_end=-18, label='Live alert', phase=1.2)
    put(img, NS, 790, 760, 23.45, 26.37, t, ry_end=-16, label='Chords on stage', phase=1.8)
    img.save(f'{OUT}/o{i:04d}.png')
print('ok', i + 1, 'frames')
