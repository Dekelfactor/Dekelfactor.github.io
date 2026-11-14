"""Render the two replacement end cards (4.0s @ 30fps) in the Katana cut's look: near-black ground, a warm red glow,
Paper-me's head, heavy Inter Display type in #FF4919. usage: endcards.py <out_dir> <reels|linkedin>"""
import math, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT, KIND = sys.argv[1], sys.argv[2]
W, H, FPS, DUR = 1080, 1920, 30, 4.0
RED = (255, 73, 25)
F = '/usr/share/fonts/opentype/inter/'
font = lambda name, size: ImageFont.truetype(F + name, size)
JAM3D = Image.open('/tmp/claude-0/-home-user/b7e0d5e7-dbb1-5a81-94b7-e8f98576ad30/scratchpad/jam3d-b.png').convert('RGBA'); JAM3D = JAM3D.crop(JAM3D.getbbox())
OSJ3D = Image.open('/tmp/claude-0/-home-user/b7e0d5e7-dbb1-5a81-94b7-e8f98576ad30/scratchpad/osj3d-b.png').convert('RGBA'); OSJ3D = OSJ3D.crop(OSJ3D.getbbox())
LOGO = Image.open('/tmp/claude-0/-home-user/b7e0d5e7-dbb1-5a81-94b7-e8f98576ad30/scratchpad/osj-logo.png').convert('RGBA'); LOGO = LOGO.crop(LOGO.getbbox())
DESIGNED = Image.open('/tmp/claude-0/-home-user/b7e0d5e7-dbb1-5a81-94b7-e8f98576ad30/scratchpad/designed3d.png').convert('RGBA')
HEAD = Image.open('/home/user/Dekelfactor.github.io/pieces/_work/me-happy.png').convert('RGBA')
os.makedirs(OUT, exist_ok=True)

def ground():
    g = Image.new('RGB', (W, H), (5, 3, 4))
    glow = Image.new('L', (W, H), 0); d = ImageDraw.Draw(glow)
    d.ellipse((W / 2 - 620, 1050 - 560, W / 2 + 620, 1050 + 560), fill=255)
    glow = glow.filter(ImageFilter.GaussianBlur(220))
    tint = Image.new('RGB', (W, H), (120, 30, 12))
    return Image.composite(tint, g, glow.point(lambda v: int(v * 0.75)))
BG = ground()

def ease(t):  # out-back, a small overshoot
    t = max(0.0, min(1.0, t)); c = 1.70158; t -= 1
    return 1 + (c + 1) * t ** 3 + c * t ** 2
def eo(t): t = max(0.0, min(1.0, t)); return 1 - (1 - t) ** 3

def text(img, s, fnt, cx, y, fill, t, t0, ls=0):
    u = eo((t - t0) / 0.45)
    if u <= 0: return
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
    w = d.textlength(s, font=fnt) + ls * (len(s) - 1)
    x = cx - w / 2; yy = y + (1 - u) * 60
    if ls:
        for ch in s: d.text((x, yy), ch, font=fnt, fill=fill + (int(255 * u),), anchor='ls'); x += d.textlength(ch, font=fnt) + ls
    else: d.text((x, yy), s, font=fnt, fill=fill + (int(255 * u),), anchor='ls')
    img.alpha_composite(layer)

def frame(t):
    img = BG.convert('RGBA')
    # Paper-me pops in
    s = ease(t / 0.5) * (1 + 0.02 * math.sin(t * 3))
    if s > 0.01:
        h = int((260 if KIND == 'linkedin-logo' else 330) * s); w = int(h * HEAD.width / HEAD.height)
        hd = HEAD.resize((max(1, w), max(1, h)), Image.LANCZOS)
        img.alpha_composite(hd, (W // 2 - w // 2, ({'reels': 510, 'reels3d': 410, 'linkedin3d': 410, 'linkedin-logo': 370}.get(KIND, 560)) - h // 2 + int(math.sin(t * 2.4) * 6)))
    if KIND == 'reels3d':
        # the 3D lettering: pops in with an overshoot, settles with a slow float, a light sweeps across it
        u = ease((t - 0.2) / 0.55)
        if u > 0.01:
            tw = int(880 * u); th = int(tw * JAM3D.height / JAM3D.width)
            L = JAM3D.resize((tw, th), Image.LANCZOS)
            sx = (t - 0.9) / 0.8   # the sweep: a bright diagonal band crossing left to right
            if 0 < sx < 1:
                band = Image.new('L', L.size, 0); bd = ImageDraw.Draw(band); bx = -300 + sx * (tw + 600)
                bd.polygon([(bx, 0), (bx + 120, 0), (bx - 120, th), (bx - 240, th)], fill=150)
                band = band.filter(ImageFilter.GaussianBlur(30))
                mask = Image.fromarray(__import__('numpy').minimum(__import__('numpy').array(band), __import__('numpy').array(L.split()[3])).astype('uint8'))
                L.alpha_composite(Image.composite(Image.new('RGBA', L.size, (255, 255, 255, 255)), Image.new('RGBA', L.size, (0, 0, 0, 0)), mask))
            y = 870 + int(math.sin(t * 2.0) * 6)
            img.alpha_composite(L, (W // 2 - tw // 2, y - th // 2))
        text(img, "and I'll send you the", font('InterDisplay-ExtraBold.otf', 50), W / 2, 1258, (255, 255, 255), t, 0.6)
        text(img, 'live prototype', font('InterDisplay-ExtraBold.otf', 50), W / 2, 1318, (255, 255, 255), t, 0.7)
        text(img, 'case study · portfolio · Dekel Factor Designs', font('InterDisplay-ExtraBold.otf', 30), W / 2, 1386, (190, 170, 160), t, 0.95)
        u = eo((t - 1.15) / 0.4)
        if u > 0:
            d = ImageDraw.Draw(img); fnt = font('InterDisplay-ExtraBold.otf', 38); s2 = 'Link in bio'
            tw = d.textlength(s2, font=fnt); pw = (tw + 76) * u
            d.rounded_rectangle((W / 2 - pw / 2, 1412, W / 2 + pw / 2, 1488), radius=38, fill=RED)
            if u > 0.9: d.text((W / 2, 1463), s2, font=fnt, fill=(255, 255, 255), anchor='ms')
    elif KIND == 'linkedin3d':
        u = ease((t - 0.2) / 0.55)
        if u > 0.01:
            tw = int(900 * u); th = int(tw * OSJ3D.height / OSJ3D.width)
            L = OSJ3D.resize((tw, th), Image.LANCZOS)
            sx = (t - 0.9) / 0.8
            if 0 < sx < 1:
                import numpy as np
                band = Image.new('L', L.size, 0); bd = ImageDraw.Draw(band); bx = -300 + sx * (tw + 600)
                bd.polygon([(bx, 0), (bx + 120, 0), (bx - 120, th), (bx - 240, th)], fill=150)
                band = band.filter(ImageFilter.GaussianBlur(30))
                mask = Image.fromarray(np.minimum(np.array(band), np.array(L.split()[3])).astype('uint8'))
                L.alpha_composite(Image.composite(Image.new('RGBA', L.size, (255, 255, 255, 255)), Image.new('RGBA', L.size, (0, 0, 0, 0)), mask))
            y = 870 + int(math.sin(t * 2.0) * 6)
            img.alpha_composite(L, (W // 2 - tw // 2, y - th // 2))
        text(img, 'from research to a live product.', font('InterDisplay-ExtraBold.otf', 46), W / 2, 1238, (255, 255, 255), t, 0.6)
        u = eo((t - 0.8) / 0.4)
        if u > 0:
            d = ImageDraw.Draw(img); fnt = font('InterDisplay-ExtraBold.otf', 40); s2 = 'Case study in the first comment'
            tw2 = d.textlength(s2, font=fnt); pw = (tw2 + 76) * u
            d.rounded_rectangle((W / 2 - pw / 2, 1272, W / 2 + pw / 2, 1352), radius=40, fill=RED)
            if u > 0.9: d.text((W / 2, 1326), s2, font=fnt, fill=(255, 255, 255), anchor='ms')
        text(img, 'Open to product design roles', font('InterDisplay-ExtraBold.otf', 42), W / 2, 1420, (255, 255, 255), t, 1.0)
        text(img, 'Dekel Factor Designs', font('InterDisplay-ExtraBold.otf', 30), W / 2, 1472, (190, 170, 160), t, 1.15)
    elif KIND == 'linkedin-logo':
        u = ease((t - 0.2) / 0.5)
        if u > 0.01:   # "Designed & built" in 3D
            tw = int(700 * u); th = int(tw * DESIGNED.height / DESIGNED.width)
            img.alpha_composite(DESIGNED.resize((tw, th), Image.LANCZOS), (W // 2 - tw // 2, 640 - th // 2 + int(math.sin(t * 2.0) * 4)))
        u = ease((t - 0.45) / 0.55)
        if u > 0.01:   # the original Open Stage Jam logo, with its own glow
            lh = int(470 * u); lw = int(lh * LOGO.width / LOGO.height)
            img.alpha_composite(LOGO.resize((lw, lh), Image.LANCZOS), (W // 2 - lw // 2, 985 - lh // 2))
        text(img, 'from research to a live product.', font('InterDisplay-ExtraBold.otf', 44), W / 2, 1262, (255, 255, 255), t, 0.75)
        u = eo((t - 0.95) / 0.4)
        if u > 0:
            d = ImageDraw.Draw(img); fnt = font('InterDisplay-ExtraBold.otf', 38); s2 = 'Case study in the first comment'
            tw2 = d.textlength(s2, font=fnt); pw = (tw2 + 72) * u
            d.rounded_rectangle((W / 2 - pw / 2, 1292, W / 2 + pw / 2, 1368), radius=38, fill=RED)
            if u > 0.9: d.text((W / 2, 1343), s2, font=fnt, fill=(255, 255, 255), anchor='ms')
        text(img, 'Open to product design roles', font('InterDisplay-ExtraBold.otf', 40), W / 2, 1430, (255, 255, 255), t, 1.15)
        text(img, 'Dekel Factor Designs', font('InterDisplay-ExtraBold.otf', 28), W / 2, 1476, (190, 170, 160), t, 1.3)
    elif KIND == 'reels':
        text(img, 'Comment', font('InterDisplay-ExtraBold.otf', 84), W / 2, 820, (255, 255, 255), t, 0.15)
        text(img, 'JAM', font('InterDisplay-Black.otf', 330), W / 2, 1120, RED, t, 0.3, ls=-8)
        u = eo((t - 0.55) / 0.4)
        if u > 0: ImageDraw.Draw(img).rectangle((W / 2 - 300 * u, 1162, W / 2 + 300 * u, 1168), fill=RED)
        text(img, "and I'll send you the", font('InterDisplay-ExtraBold.otf', 50), W / 2, 1248, (255, 255, 255), t, 0.6)
        text(img, 'live prototype', font('InterDisplay-ExtraBold.otf', 50), W / 2, 1310, (255, 255, 255), t, 0.7)
        text(img, 'case study · portfolio · Dekel Factor Designs', font('InterDisplay-ExtraBold.otf', 30), W / 2, 1382, (190, 170, 160), t, 0.95)
        u = eo((t - 1.15) / 0.4)
        if u > 0:
            d = ImageDraw.Draw(img); fnt = font('InterDisplay-ExtraBold.otf', 38); s2 = 'Link in bio'
            tw = d.textlength(s2, font=fnt); pw = (tw + 76) * u
            d.rounded_rectangle((W / 2 - pw / 2, 1412, W / 2 + pw / 2, 1488), radius=38, fill=RED)
            if u > 0.9: d.text((W / 2, 1463), s2, font=fnt, fill=(255, 255, 255), anchor='ms')
    else:
        text(img, 'Designed & built', font('InterDisplay-ExtraBold.otf', 70), W / 2, 870, (255, 255, 255), t, 0.15)
        text(img, 'Open Stage Jam', font('InterDisplay-Black.otf', 132), W / 2, 1020, RED, t, 0.3, ls=-4)
        text(img, 'from research to a live product.', font('InterDisplay-ExtraBold.otf', 46), W / 2, 1100, (255, 255, 255), t, 0.5)
        u = eo((t - 0.75) / 0.4)
        if u > 0:
            d = ImageDraw.Draw(img); fnt = font('InterDisplay-ExtraBold.otf', 42); s2 = 'Case study in the first comment'
            tw = d.textlength(s2, font=fnt); pw = (tw + 80) * u
            d.rounded_rectangle((W / 2 - pw / 2, 1190, W / 2 + pw / 2, 1276), radius=43, fill=RED)
            if u > 0.9: d.text((W / 2, 1247), s2, font=fnt, fill=(255, 255, 255), anchor='ms')
        text(img, 'Open to product design roles', font('InterDisplay-ExtraBold.otf', 44), W / 2, 1380, (255, 255, 255), t, 0.95)
        text(img, 'Dekel Factor Designs', font('InterDisplay-ExtraBold.otf', 32), W / 2, 1450, (190, 170, 160), t, 1.1)
    return img.convert('RGB')

for i in range(int(DUR * FPS)):
    frame(i / FPS).save(f'{OUT}/f{i:04d}.png')
print('ok', KIND, int(DUR * FPS), 'frames')
