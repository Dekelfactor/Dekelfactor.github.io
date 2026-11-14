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
S_FONTS = '/tmp/claude-0/-home-user/b7e0d5e7-dbb1-5a81-94b7-e8f98576ad30/scratchpad/fonts/'
HEAD = Image.open('/home/user/Dekelfactor.github.io/pieces/_work/me-happy.png').convert('RGBA')
os.makedirs(OUT, exist_ok=True)

def ground(tint_rgb=(120, 30, 12)):
    g = Image.new('RGB', (W, H), (5, 3, 4))
    glow = Image.new('L', (W, H), 0); d = ImageDraw.Draw(glow)
    d.ellipse((W / 2 - 620, 1050 - 560, W / 2 + 620, 1050 + 560), fill=255)
    glow = glow.filter(ImageFilter.GaussianBlur(220))
    tint = Image.new('RGB', (W, H), tint_rgb)
    return Image.composite(tint, g, glow.point(lambda v: int(v * 0.75)))
BG = ground(); BG_OSJ = ground((112, 6, 14))

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
    img = (BG_OSJ if KIND in ('linkedin-osj', 'linkedin-v2', 'linkedin-v3') else BG).convert('RGBA')
    # Paper-me pops in
    s = ease(t / 0.5) * (1 + 0.02 * math.sin(t * 3))
    if s > 0.01 and KIND not in ('linkedin-v2', 'linkedin-v3'):
        h = int((260 if KIND in ('linkedin-logo', 'linkedin-osj') else 330) * s); w = int(h * HEAD.width / HEAD.height)
        hd = HEAD.resize((max(1, w), max(1, h)), Image.LANCZOS)
        img.alpha_composite(hd, (W // 2 - w // 2, ({'reels': 510, 'reels3d': 410, 'linkedin3d': 410, 'linkedin-logo': 370, 'linkedin-osj': 410}.get(KIND, 560)) - h // 2 + int(math.sin(t * 2.4) * 6)))
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
    elif KIND == 'linkedin-osj':
        FD = S_FONTS
        OSJ_RED = (251, 13, 31)
        def glowtext(s_, fnt, cx, y, fill, t0, glow=False, ls=0):
            u = eo((t - t0) / 0.45)
            if u <= 0: return
            layer = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
            w = d.textlength(s_, font=fnt) + ls * (len(s_) - 1); x = cx - w / 2; yy = y + (1 - u) * 40
            for ch in s_:
                d.text((x, yy), ch, font=fnt, fill=fill + (int(255 * u),), anchor='ls'); x += d.textlength(ch, font=fnt) + ls
            if glow:
                g = layer.split()[3].filter(ImageFilter.GaussianBlur(18)).point(lambda v: int(v * 0.6))
                img.alpha_composite(Image.merge('RGBA', (Image.new('L', img.size, OSJ_RED[0]), Image.new('L', img.size, OSJ_RED[1]), Image.new('L', img.size, OSJ_RED[2]), g)))
            img.alpha_composite(layer)
        # headline, in the app's display face
        glowtext('DESIGNED & BUILT', ImageFont.truetype(FD + 'BebasNeue.ttf', 118), W / 2, 700, (255, 255, 255), 0.2, ls=3)
        # the original logo
        u = ease((t - 0.45) / 0.55)
        if u > 0.01:
            lh = int(440 * u); lw = int(lh * LOGO.width / LOGO.height)
            img.alpha_composite(LOGO.resize((lw, lh), Image.LANCZOS), (W // 2 - lw // 2, 975 - lh // 2))
        glowtext('From research to a live product.', ImageFont.truetype(FD + 'SpaceGrotesk-Medium.ttf', 44), W / 2, 1258, (240, 236, 234), 0.75)
        u = eo((t - 0.95) / 0.4)
        if u > 0:
            d = ImageDraw.Draw(img); fnt = ImageFont.truetype(FD + 'SpaceGrotesk-Bold.ttf', 38); s2 = 'Case study in the first comment'
            tw2 = d.textlength(s2, font=fnt); pw = (tw2 + 72) * u
            d.rounded_rectangle((W / 2 - pw / 2, 1290, W / 2 + pw / 2, 1366), radius=38, fill=OSJ_RED)
            if u > 0.9: d.text((W / 2, 1340), s2, font=fnt, fill=(255, 255, 255), anchor='ms')
        glowtext('OPEN TO PRODUCT DESIGN ROLES', ImageFont.truetype(FD + 'BebasNeue.ttf', 60), W / 2, 1446, (255, 255, 255), 1.15, ls=2)
        glowtext('DEKEL FACTOR DESIGNS', ImageFont.truetype(FD + 'SpaceMono-Bold.ttf', 26), W / 2, 1494, (251, 90, 100), 1.3, ls=4)
    elif KIND == 'linkedin-v2':
        FD = S_FONTS; RED_ = (251, 13, 31)
        def tx(s_, fnt, x, y, fill, t0, anchor='ms', ls=0):
            u = eo((t - t0) / 0.5)
            if u <= 0: return
            layer = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
            w = sum(d.textlength(c, font=fnt) for c in s_) + ls * (len(s_) - 1)
            xx = x - w / 2 if anchor == 'ms' else x; yy = y + (1 - u) * 30
            for c in s_:
                d.text((xx, yy), c, font=fnt, fill=fill + (int(255 * u),), anchor='ls'); xx += d.textlength(c, font=fnt) + ls
            img.alpha_composite(layer)
        # 1. hero: the logo
        u = ease((t - 0.1) / 0.6)
        if u > 0.01:
            lh = int(560 * (0.85 + 0.15 * u)); lw = int(lh * LOGO.width / LOGO.height)
            L = LOGO.resize((lw, lh), Image.LANCZOS)
            if u < 1: L.putalpha(L.split()[3].point(lambda v: int(v * min(1, u))))
            img.alpha_composite(L, (W // 2 - lw // 2, 690 - lh // 2))
        # 2. message: one headline, one call to action
        hf = ImageFont.truetype(FD + 'BebasNeue.ttf', 112)
        tx('DESIGNED & BUILT', hf, W / 2, 1105, (255, 255, 255), 0.45, ls=2)
        tx('FROM RESEARCH TO LIVE', hf, W / 2, 1205, RED_, 0.6, ls=2)
        u = eo((t - 0.85) / 0.4)
        if u > 0:
            d = ImageDraw.Draw(img); fnt = ImageFont.truetype(FD + 'SpaceGrotesk-Bold.ttf', 36); s2 = 'Case study in the first comment'
            tw2 = d.textlength(s2, font=fnt); pw = tw2 + 80; a_ = int(255 * u)
            pl = Image.new('RGBA', img.size, (0, 0, 0, 0)); pd = ImageDraw.Draw(pl)
            pd.rounded_rectangle((W / 2 - pw / 2, 1250, W / 2 + pw / 2, 1326), radius=38, outline=(255, 255, 255, a_), width=3)
            pd.text((W / 2, 1300), s2, font=fnt, fill=(255, 255, 255, a_), anchor='ms'); img.alpha_composite(pl)
        # 3. signature: a byline row under a thin divider
        u = eo((t - 1.1) / 0.5)
        if u > 0:
            d = ImageDraw.Draw(img); half = 300 * u
            d.line((W / 2 - half, 1372, W / 2 + half, 1372), fill=(255, 255, 255, 70), width=2)
            hh = 108; hd = HEAD.resize((int(hh * HEAD.width / HEAD.height), hh), Image.LANCZOS)
            nf = ImageFont.truetype(FD + 'SpaceGrotesk-Bold.ttf', 36); mf = ImageFont.truetype(FD + 'SpaceMono-Bold.ttf', 22)
            nw = d.textlength('Dekel Factor Designs', font=nf); rw = d.textlength('OPEN TO PRODUCT DESIGN ROLES', font=mf) + 3 * 27
            total = hd.width + 26 + max(nw, rw); x0 = W / 2 - total / 2
            if u < 1: hd.putalpha(hd.split()[3].point(lambda v: int(v * u)))
            img.alpha_composite(hd, (int(x0), 1392))
            tx('Dekel Factor Designs', nf, x0 + hd.width + 26, 1440, (255, 255, 255), 1.15, anchor='ls')
            tx('OPEN TO PRODUCT DESIGN ROLES', mf, x0 + hd.width + 26, 1480, RED_, 1.25, anchor='ls', ls=3)
    elif KIND == 'linkedin-v3':
        FD = S_FONTS; RED_ = (251, 13, 31)
        def tx(parts, fnt, x, y, t0, anchor='ms', ls=0):
            """parts: [(text, rgb)], drawn as one line; fades and rises in"""
            u = eo((t - t0) / 0.5)
            if u <= 0: return
            layer = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(layer)
            chars = [(c, col) for txt, col in parts for c in txt]
            w = sum(d.textlength(c, font=fnt) for c, _ in chars) + ls * (len(chars) - 1)
            xx = x - w / 2 if anchor == 'ms' else x; yy = y + (1 - u) * 26
            for c, col in chars:
                d.text((xx, yy), c, font=fnt, fill=col + (int(255 * u),), anchor='ls'); xx += d.textlength(c, font=fnt) + ls
            img.alpha_composite(layer)
        # a soft stage beam from above onto the logo
        u = eo(t / 0.8)
        beam = Image.new('L', (W, H), 0); bd = ImageDraw.Draw(beam)
        bd.polygon([(W / 2 - 80, -40), (W / 2 + 40, -40), (W / 2 + 310, 900), (W / 2 - 350, 900)], fill=int(70 * u))
        beam = beam.filter(ImageFilter.GaussianBlur(60))
        img.alpha_composite(Image.merge('RGBA', (Image.new('L', (W, H), 255), Image.new('L', (W, H), 70), Image.new('L', (W, H), 80), beam)))
        # 1. the logo (hero), centred in the upper half
        u = ease((t - 0.1) / 0.6)
        if u > 0.01:
            lh = int(500 * (0.88 + 0.12 * u)); lw = int(lh * LOGO.width / LOGO.height)
            L = LOGO.resize((lw, lh), Image.LANCZOS)
            if u < 1: L.putalpha(L.split()[3].point(lambda v: int(v * min(1, u))))
            img.alpha_composite(L, (W // 2 - 20 - lw // 2, 680 - lh // 2))
        # 2. one message: white, red only on LIVE; spacing rhythm = 56px
        hf = ImageFont.truetype(FD + 'BebasNeue.ttf', 100)
        WH = (255, 255, 255)
        tx([('DESIGNED & BUILT', WH)], hf, W / 2 - 20, 1040, 0.45, ls=3)
        tx([('FROM RESEARCH TO ', WH), ('LIVE.', RED_)], hf, W / 2 - 20, 1130, 0.6, ls=3)
        u = eo((t - 0.85) / 0.4)
        if u > 0:
            d = ImageDraw.Draw(img); fnt = ImageFont.truetype(FD + 'SpaceGrotesk-Bold.ttf', 36); s2 = 'Case study in the first comment'
            tw2 = d.textlength(s2, font=fnt); pw = tw2 + 88; a_ = int(255 * u); y0 = 1186 + (1 - u) * 20
            pl = Image.new('RGBA', img.size, (0, 0, 0, 0)); pd = ImageDraw.Draw(pl)
            pd.rounded_rectangle((W / 2 - 20 - pw / 2, y0, W / 2 - 20 + pw / 2, y0 + 78), radius=39, fill=(255, 255, 255, int(a_ * 0.10)), outline=(255, 255, 255, int(a_ * 0.85)), width=2)
            pd.text((W / 2 - 20, y0 + 51), s2, font=fnt, fill=(255, 255, 255, a_), anchor='ms'); img.alpha_composite(pl)
        # 3. signature: divider, then a byline row
        u = eo((t - 1.1) / 0.5)
        if u > 0:
            d = ImageDraw.Draw(img); half = 230 * u
            dl = Image.new('RGBA', img.size, (0, 0, 0, 0)); ImageDraw.Draw(dl).line((W / 2 - 20 - half, 1324, W / 2 - 20 + half, 1324), fill=(255, 255, 255, 60), width=2); img.alpha_composite(dl)
            hh = 124; hd = HEAD.resize((int(hh * HEAD.width / HEAD.height), hh), Image.LANCZOS)
            nf = ImageFont.truetype(FD + 'SpaceGrotesk-Bold.ttf', 40); mf = ImageFont.truetype(FD + 'SpaceMono-Bold.ttf', 23)
            nw = d.textlength('Dekel Factor Designs', font=nf); rw = d.textlength('OPEN TO PRODUCT DESIGN ROLES', font=mf) + 3 * 27
            gap = 28; total = hd.width + gap + max(nw, rw); x0 = W / 2 - 20 - total / 2
            if u < 1: hd.putalpha(hd.split()[3].point(lambda v: int(v * u)))
            img.alpha_composite(hd, (int(x0), 1352))
            tx([('Dekel Factor Designs', WH)], nf, x0 + hd.width + gap, 1408, 1.15, anchor='ls')
            tx([('OPEN TO PRODUCT DESIGN ROLES', (255, 92, 104))], mf, x0 + hd.width + gap, 1450, 1.25, anchor='ls', ls=3)
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
