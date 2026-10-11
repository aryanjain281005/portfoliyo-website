"""The shrine objects: the wanted poster, the wood the ema are cut from, and
the washi the card and the fortunes are printed on.

Inputs (next to this script, or pass a folder): up2.png + mask2.png (the
upscaled portrait and its Vision mask, from mask.swift), and the fonts:
brush.ttf (Yuji Syuku subset), InstrumentSerif-Regular/Italic.ttf,
news-380.ttf / news-520.ttf (Newsreader instances), NotoSerifJP-seal.ttf.
"""
import math, os, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops
from scipy import ndimage as nd

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[2] if len(sys.argv) > 2 else 'assets/objects'
os.makedirs(OUT, exist_ok=True)
F = lambda n: os.path.join(SRC, n)
rng = np.random.default_rng(7)

def noise(h, w, scale, seed):
    r = np.random.default_rng(seed).random((h // scale + 3, w // scale + 3)).astype(np.float32)
    im = Image.fromarray((r * 255).astype(np.uint8)).resize((w + scale * 3, h + scale * 3), Image.BICUBIC)
    return np.asarray(im, np.float32)[:h, :w] / 255

def fbm(h, w, seed, octaves=((64, .5), (24, .28), (8, .14), (3, .08))):
    out = np.zeros((h, w), np.float32)
    for i, (sc, amp) in enumerate(octaves):
        out += noise(h, w, sc, seed + i * 17) * amp
    return out / sum(a for _, a in octaves)

# ------------------------------------------------------------- parchment
def parchment(w, h, seed=3):
    base = np.array([224, 203, 160], np.float32)
    n = fbm(h, w, seed)
    img = np.ones((h, w, 3), np.float32) * base
    img *= (0.86 + n[..., None] * 0.22)
    # stains: a few large, soft, darker blooms with a tide-mark rim
    for k in range(7):
        cx, cy = rng.uniform(.05, .95) * w, rng.uniform(.05, .95) * h
        r = rng.uniform(.08, .22) * w
        yy, xx = np.mgrid[0:h, 0:w]
        d = np.hypot(xx - cx, (yy - cy) * rng.uniform(.7, 1.3)) / r
        d += (fbm(h, w, seed + 50 + k, ((48, .6), (12, .4))) - .5) * .5
        blob = np.clip(1 - d, 0, 1) ** 1.5 * .10 + np.exp(-((d - 1) ** 2) / .004) * .07
        img *= (1 - blob[..., None] * np.array([.6, .8, 1.1]))
    # fibres
    fib = noise(h, w, 2, seed + 9)
    img *= (0.97 + fib[..., None] * .05)
    # singed, darkened edges
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    e = np.minimum(np.minimum(xx, w - 1 - xx), np.minimum(yy, h - 1 - yy)) / (0.09 * min(w, h))
    e = np.clip(e + (fbm(h, w, seed + 77, ((40, .7), (10, .3))) - .5) * .9, 0, 1)
    burn = nd.gaussian_filter((1 - e) ** 2, 3)
    img *= (1 - burn[..., None] * np.array([.55, .62, .72]))
    # two folds, the way a poster is carried before it is pasted up
    for fx in (w * .5,):
        d = np.abs(xx - fx)
        img *= (1 - np.exp(-d ** 2 / 6) * .10)[..., None]
        img *= (1 + np.exp(-((xx - fx - 3) ** 2) / 10) * .05)[..., None]
    fy = h * .53
    img *= (1 - np.exp(-((yy - fy) ** 2) / 6) * .08)[..., None]
    return np.clip(img, 0, 255)

def ink_layer(w, h):
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))

def tracked(d, xy, text, font, fill, track, anchor_center_w=None):
    widths = [d.textlength(c, font=font) for c in text]
    total = sum(widths) + font.size * track * (len(text) - 1)
    x, y = xy
    if anchor_center_w is not None: x = (anchor_center_w - total) / 2
    for c, cw in zip(text, widths):
        d.text((x, y), c, font=font, fill=fill); x += cw + font.size * track
    return total

def seal(ch, size, color=(186, 36, 28)):
    t = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(t)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=size // 9, fill=color + (230,))
    f = ImageFont.truetype(F('brush.ttf'), int(size * .72))
    tw = d.textlength(ch, font=f)
    d.text(((size - tw) / 2, size * .06), ch, font=f, fill=(246, 230, 210, 255))
    n = Image.fromarray((np.random.default_rng(size).random((size, size)) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.3))
    t.putalpha(ImageChops.multiply(t.getchannel('A'), n.point(lambda v: 255 if v > 92 else 140)))
    return t.rotate(-3, resample=Image.BICUBIC, expand=True)

def wanted():
    W, H = 1200, 1640
    paper = Image.fromarray(parchment(W, H).astype(np.uint8)).convert('RGBA')
    ink = ink_layer(W, H); d = ImageDraw.Draw(ink)
    INK = (38, 26, 16)
    # frame: a double rule, inset
    for m, wd in ((54, 5), (70, 2)):
        d.rectangle([m, m, W - m, H - m], outline=INK + (215,), width=wd)
    # header: the kanji brushed big, the English set small beneath
    fb = ImageFont.truetype(F('brush.ttf'), 210)
    tw = d.textlength('手配書', font=fb)
    d.text(((W - tw) / 2, 92), '手配書', font=fb, fill=INK + (240,))
    fs = ImageFont.truetype(F('InstrumentSerif-Regular.ttf'), 132)
    tracked(d, (0, 318), 'WANTED', fs, INK + (240,), .14, W)
    fk = ImageFont.truetype(F('news-520.ttf'), 26)
    tracked(d, (0, 466), 'FOR AN INTERNSHIP  ·  ALIVE AND CAFFEINATED', fk, INK + (200,), .22, W)
    # the portrait: the cut-out, printed in sepia ink into the paper
    px0, py0, pw, ph = 270, 528, 660, 560
    up = Image.open(F('up2.png')).convert('L')
    m = Image.open(F('mask2.png')).convert('L')
    bb = m.point(lambda v: 255 if v > 30 else 0).getbbox()
    crop = (bb[0] + 180, bb[1] - 30, bb[2] - 180, bb[1] - 30 + int((bb[2] - bb[0] - 360) * ph / pw))
    g = up.crop(crop).resize((pw, ph), Image.LANCZOS)
    a = m.crop(crop).resize((pw, ph), Image.LANCZOS)
    ga = np.asarray(g, np.float32) / 255
    ga = np.clip((ga - .12) / .78, 0, 1) ** 1.15                # levels: a print, not a photo
    # an engraver's hatch in the shadows, so it reads as printed
    yy, xx = np.mgrid[0:ph, 0:pw]
    hatch = (np.sin((xx + yy) * .9) * .5 + .5)
    dark = 1 - ga
    dark = np.clip(dark * (0.82 + hatch * .36), 0, 1)
    aa = np.asarray(a, np.float32) / 255
    fade = np.clip((ph - 1 - yy) / (ph * .22), 0, 1)             # the print fades where the photo ends
    alpha = dark * aa * fade * .92
    port = Image.new('RGBA', (pw, ph), (52, 32, 18, 0))
    port.putalpha(Image.fromarray((alpha * 255).astype(np.uint8)))
    # the portrait plate: a thin frame the print sits in
    d.rectangle([px0 - 14, py0 - 14, px0 + pw + 14, py0 + ph + 2], outline=INK + (170,), width=3)
    ink.alpha_composite(port, (px0, py0))
    # the name, and the charge
    fn = ImageFont.truetype(F('InstrumentSerif-Regular.ttf'), 120)
    tracked(d, (0, 1112), 'ARYAN JAIN', fn, INK + (245,), .06, W)
    fi = ImageFont.truetype(F('InstrumentSerif-Italic.ttf'), 40)
    lines = ['for running a whole poster business off one Google Form',
             'and a handful of n8n workflows, shipping a live client',
             'platform, and teaching children to read.']
    y = 1256
    for ln in lines:
        tw = d.textlength(ln, font=fi); d.text(((W - tw) / 2, y), ln, font=fi, fill=INK + (225,)); y += 50
    d.line([(W * .3, y + 16), (W * .7, y + 16)], fill=INK + (150,), width=2)
    fr = ImageFont.truetype(F('news-520.ttf'), 30)
    tracked(d, (0, y + 36), 'REWARD  ·  ONE GOOD INTERNSHIP', fr, INK + (230,), .2, W)
    fl = ImageFont.truetype(F('news-380.ttf'), 21)
    tracked(d, (0, H - 132), 'LAST SEEN  ·  IIIT NAYA RAIPUR', fl, INK + (190,), .16, W)
    tracked(d, (0, H - 100), 'SIGHTINGS TO  ARYANJAIN281005@GMAIL.COM', fl, INK + (170,), .12, W)
    # the stamp that makes a notice official, struck over the header
    ink.alpha_composite(seal('印', 124), (W - 250, 112))
    # ink sinks into the fibres: a touch of blur, then multiply
    inkb = ink.filter(ImageFilter.GaussianBlur(.6))
    rgb = np.asarray(paper.convert('RGB'), np.float32)
    ia = np.asarray(inkb, np.float32)
    al = ia[..., 3:4] / 255
    out = rgb * (1 - al) + (rgb * ia[..., :3] / 255) * al * .55 + ia[..., :3] * al * .45
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(os.path.join(OUT, 'wanted.webp'), 'WEBP', quality=86, method=6)
    print('wanted.webp')

# ------------------------------------------------------------------ wood
def wood(w, h, seed, tone=(198, 160, 110)):
    """hinoki: long, even grain running the width of the board, pale, with a
    few darker late-wood lines and the odd soft streak — not burl"""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    warp = fbm(h, w, seed, ((220, .7), (60, .3))) * 7
    lines = np.sin(yy * .55 + warp + np.sin(xx * .004 + seed) * 1.4)
    late = np.clip(np.sin(yy * .055 + warp * .5) * 1.4 - .9, 0, 1)
    fine = noise(h, w, 1, seed + 3)
    streak = fbm(h, w, seed + 11, ((260, .6), (70, .4)))
    t = .84 + lines * .028 - late * .10 + (fine - .5) * .05 + (streak - .5) * .16
    img = np.array(tone, np.float32) * t[..., None]
    return np.clip(img, 0, 255).astype(np.uint8)

# ----------------------------------------------------------------- washi
def washi(w, h, seed):
    base = np.array([241, 234, 219], np.float32)
    n = fbm(h, w, seed, ((32, .5), (8, .3), (2, .2)))
    img = base * (0.95 + n[..., None] * .08)
    # long fibres
    fib = Image.new('L', (w, h), 0); d = ImageDraw.Draw(fib); r = random.Random(seed)
    for _ in range(int(w * h / 900)):
        x, y = r.uniform(0, w), r.uniform(0, h); a = r.uniform(0, math.pi); L = r.uniform(6, 26)
        d.line([(x, y), (x + math.cos(a) * L, y + math.sin(a) * L)], fill=r.randint(30, 90), width=1)
    f = np.asarray(fib.filter(ImageFilter.GaussianBlur(.5)), np.float32) / 255
    img *= (1 - f[..., None] * .07)
    return np.clip(img, 0, 255).astype(np.uint8)

if __name__ == '__main__':
    wanted()
    for i, tone in enumerate([(222, 186, 138), (212, 174, 126), (226, 192, 146)]):
        Image.fromarray(wood(520, 640, 40 + i, tone)).save(os.path.join(OUT, f'wood-{i}.webp'), 'WEBP', quality=84)
    Image.fromarray(washi(512, 512, 5)).save(os.path.join(OUT, 'washi.webp'), 'WEBP', quality=86)
    print('wood, washi')
