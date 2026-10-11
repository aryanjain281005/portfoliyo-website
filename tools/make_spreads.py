"""Field-note spreads for the portfolio sketchbook.

The blank book is rebuilt from one of Meng To's Sketchbook spreads: its alpha
(the book's silhouette, rounded corners, gutter) is kept exactly, so the page
turn geometry in the engine (paper at 5.1-94.9% x, 21.8-78.2% y) still fits.
The paper itself is resynthesised from the blank band above the drawing: a
per-column colour profile (gutter shade, page edges), a per-row profile (top
and bottom edges) and the real cold-press grain, high-passed and tiled.
Then each project is set on it in ink: text on the left page, taped prints of
the work on the right, a vermilion seal and a date in the corner.
"""
import math, random, sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, 'refs/sketchbook/sketchbook/marina-bay-skyline.png')
SH = os.path.join(HERE, 'shots')
FD = os.path.join(HERE, 'fonts-dl')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'spreads')
os.makedirs(OUT, exist_ok=True)

S = 1.5                       # output scale over the 1760x1240 reference
W, H = int(1760 * S), int(1240 * S)
INK = (43, 39, 33)
INK_SOFT = (43, 39, 33, 150)
INK_FAINT = (43, 39, 33, 96)
EARTH = (154, 106, 62)
VERM = (190, 40, 30)

def s(v): return int(round(v * S))

# ------------------------------------------------------------------ fonts
def news(w):
    p = os.path.join(FD, f'news-{w}.ttf')
    if not os.path.exists(p):
        t = instancer.instantiateVariableFont(TTFont(os.path.join(FD, 'Newsreader.ttf')), {'wght': w, 'opsz': 16})
        t.save(p)
    return p
F_DISPLAY = os.path.join(FD, 'InstrumentSerif-Regular.ttf')
F_ITALIC = os.path.join(FD, 'InstrumentSerif-Italic.ttf')
F_BODY = news(380)
F_BODY_M = news(520)
F_SEAL = os.path.join(FD, 'NotoSerifJP-seal.ttf')
def font(p, px): return ImageFont.truetype(p, s(px))

# ------------------------------------------------------------- blank book
def blank_book():
    src = Image.open(REF).convert('RGBA')
    a0 = np.array(src)[..., 3]
    rgb = np.array(src.convert('RGB')).astype(np.float32)
    band = rgb[290:352]                                   # blank paper across both pages
    prof = np.median(band, axis=0)                        # (1760, 3): gutter + edges
    lum = rgb.mean(axis=2)
    col = np.median(lum[:, 104:132], axis=1)              # left margin: top / bottom edges
    ref = np.median(col[420:820])
    V = np.clip(col / max(ref, 1), .55, 1.06)
    V[300:940] = 1                                        # only the edges are measured
    V[:262] = 1; V[980:] = 1
    # real grain, from a patch of the left page that never saw a brush:
    # high-passed and mirror-tiled in both directions over the sheet
    patch = lum[292:440, 120:860]
    bl = np.array(Image.fromarray(patch.astype(np.uint8)).filter(ImageFilter.GaussianBlur(9))).astype(np.float32)
    g = patch / np.maximum(bl, 1)
    row = np.concatenate([g, g[:, ::-1]] * 2, axis=1)
    tile = np.concatenate([row, row[::-1]], axis=0)
    reps = (1240 // tile.shape[0] + 1, 1760 // tile.shape[1] + 1)
    grain = np.tile(tile, reps)[:1240, :1760]
    grain = 1 + (grain - 1) * .55                         # the relief, not the crumple
    base = prof[None, :, :] * V[:, None, None] * grain[:, :, None]
    base = np.clip(base, 0, 255).astype(np.uint8)
    img = Image.fromarray(base, 'RGB').resize((W, H), Image.LANCZOS)
    alpha = Image.fromarray(a0).resize((W, H), Image.LANCZOS)
    img = img.convert('RGBA'); img.putalpha(alpha)
    return img

# ---------------------------------------------------------------- drawing
def wrap(draw, text, f, width):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if draw.textlength(t, font=f) <= width: cur = t
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def tracked(draw, xy, text, f, fill, track=.22):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=f, fill=fill)
        x += draw.textlength(ch, font=f) + f.size * track
    return x

def wash(layer, box, color, seed, alpha=.16):
    """a watercolour bloom: noisy blob, pooled darker at its rim"""
    rnd = np.random.default_rng(seed)
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    n = rnd.random((h // 6 + 2, w // 6 + 2)).astype(np.float32)
    n = np.array(Image.fromarray((n * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(s(14)))).astype(np.float32) / 255
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    m = np.clip((1.05 - d) * 2.2 + (n - .5) * 1.6, 0, 1)
    rim = np.clip(1 - np.abs(m - .5) * 2.4, 0, 1) * .55
    a = np.clip(m * .75 + rim, 0, 1) * alpha * 255
    blob = Image.new('RGBA', (w, h), color + (0,))
    blob.putalpha(Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.GaussianBlur(s(2))))
    layer.alpha_composite(blob, (x0, y0))

def tape(layer, cx, cy, ang, seed):
    rnd = random.Random(seed)
    w, h = s(118), s(32)
    t = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(t)
    pts = []
    for i in range(9): pts.append((rnd.uniform(0, s(5)), i * h / 8))
    for i in range(9): pts.append((w - rnd.uniform(0, s(5)), h - i * h / 8))
    d.polygon(pts, fill=(236, 226, 198, 178))
    d.line([(s(6), s(4)), (w - s(8), s(5))], fill=(255, 252, 240, 70), width=s(2))
    t = t.rotate(ang, resample=Image.BICUBIC, expand=True)
    layer.alpha_composite(t, (int(cx - t.width / 2), int(cy - t.height / 2)))

def print_photo(layer, path, box, ang, seed, crop=None, tapes=True, border=12):
    """a photograph pasted onto the page: white border, soft shadow, two strips of tape"""
    im = Image.open(path).convert('RGB')
    if crop: im = im.crop(crop)
    bw, bh = box[2] - box[0], box[3] - box[1]
    im.thumbnail((bw - s(border) * 2, bh - s(border) * 2), Image.LANCZOS)
    pw, ph = im.width + s(border) * 2, im.height + s(border) * 2
    card = Image.new('RGBA', (pw, ph), (250, 247, 239, 255))
    card.paste(im, (s(border), s(border)))
    ImageDraw.Draw(card).rectangle([s(border) - 1, s(border) - 1, s(border) + im.width, s(border) + im.height], outline=(0, 0, 0, 28))
    rot = card.rotate(ang, resample=Image.BICUBIC, expand=True)
    shadow = Image.new('RGBA', rot.size, (40, 28, 12, 0))
    shadow.putalpha(rot.getchannel('A').point(lambda v: int(v * .30)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(s(9)))
    cx = box[0] + bw / 2; cy = box[1] + bh / 2
    x, y = int(cx - rot.width / 2), int(cy - rot.height / 2)
    layer.alpha_composite(shadow, (x + s(5), y + s(9)))
    layer.alpha_composite(rot, (x, y))
    if tapes:
        r = math.radians(-ang)
        def corner(ux, uy):
            px, py = ux * pw / 2, uy * ph / 2
            return cx + px * math.cos(r) - py * math.sin(r), cy + px * math.sin(r) + py * math.cos(r)
        tl = corner(-1, -1); tr = corner(1, -1)
        tape(layer, tl[0] + s(6), tl[1] + s(4), 38 + ang, seed)
        tape(layer, tr[0] - s(6), tr[1] + s(4), -38 + ang, seed + 1)
    return (x, y, x + rot.width, y + rot.height)

def jline(d, a, b, seed, w=2, col=INK + (210,)):
    """an ink line drawn by hand: a slight wobble, a second faint pass"""
    rnd = random.Random(seed)
    for p in range(2):
        pts = []
        n = max(2, int(math.hypot(b[0] - a[0], b[1] - a[1]) / s(28)))
        for i in range(n + 1):
            t = i / n
            pts.append((a[0] + (b[0] - a[0]) * t + rnd.uniform(-1, 1) * s(1.3),
                        a[1] + (b[1] - a[1]) * t + rnd.uniform(-1, 1) * s(1.3)))
        d.line(pts, fill=col if p == 0 else col[:3] + (70,), width=s(w) if p == 0 else s(1))

def jbox(d, box, seed, w=2):
    x0, y0, x1, y1 = box
    jline(d, (x0 - s(3), y0), (x1 + s(2), y0), seed, w)
    jline(d, (x1, y0 - s(2)), (x1, y1 + s(3)), seed + 1, w)
    jline(d, (x1 + s(3), y1), (x0 - s(2), y1), seed + 2, w)
    jline(d, (x0, y1 + s(2)), (x0, y0 - s(3)), seed + 3, w)

def arrow(d, a, b, seed):
    jline(d, a, b, seed)
    ang = math.atan2(b[1] - a[1], b[0] - a[0])
    for k in (-1, 1):
        e = (b[0] - math.cos(ang + k * .45) * s(14), b[1] - math.sin(ang + k * .45) * s(14))
        jline(d, b, e, seed + 7 + k)

def seal(layer, x, y, ch, size=46):
    sz = s(size)
    t = Image.new('RGBA', (sz, sz), (0, 0, 0, 0))
    d = ImageDraw.Draw(t)
    d.rounded_rectangle([0, 0, sz - 1, sz - 1], radius=s(5), fill=VERM + (225,))
    # whichever face actually has the character: the seal subset, or the brush
    path = F_SEAL if ord(ch) in TTFont(F_SEAL).getBestCmap() else os.path.join(FD, 'brush.ttf')
    f = ImageFont.truetype(path, int(sz * .66))
    tw = d.textlength(ch, font=f)
    d.text(((sz - tw) / 2, sz * .1), ch, font=f, fill=(250, 238, 226, 255))
    # pressed unevenly, the way a chop is
    n = (np.random.default_rng(len(ch) * 7 + size).random((sz, sz)) * 255).astype(np.uint8)
    n = Image.fromarray(n).filter(ImageFilter.GaussianBlur(1.2)).point(lambda v: 255 if v > 96 else 150)
    t.putalpha(ImageChops.multiply(t.getchannel('A'), n))
    layer.alpha_composite(t.rotate(-2, resample=Image.BICUBIC, expand=True), (x, y))

# ------------------------------------------------------------ the spreads
L0, R0, TOP, BOT = s(162), s(948), s(338), s(944)   # left page x, right page x, text top, page foot
LW = s(640)                                          # text column width

def spread(p, idx):
    book = blank_book()
    layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    # ---- left page: the story
    f_k = font(F_BODY_M, 11.5)
    tracked(d, (L0, TOP), f'PLATE {p.get("plate", idx + 1):02d}  ·  {p["year"]}', f_k, INK_SOFT, .26)
    f_t = font(F_DISPLAY, 66 if len(p['title']) < 11 else 56)
    d.text((L0 - s(3), TOP + s(26)), p['title'], font=f_t, fill=INK + (240,))
    f_i = font(F_ITALIC, 25)
    y = TOP + s(26) + f_t.size * 1.06
    d.text((L0, y), p['sub'], font=f_i, fill=EARTH + (235,))
    y += f_i.size * 1.55
    jline(d, (L0, y), (L0 + s(110), y), idx * 31, 1, INK + (120,))
    y += s(22)
    f_b = font(F_BODY, 15.6)
    lh = f_b.size * 1.58
    for para in p['body']:
        for line in wrap(d, para, f_b, LW):
            d.text((L0, y), line, font=f_b, fill=INK + (226,))
            y += lh
        y += lh * .5
    # the record: role, stack, link — set as a small ruled table at the foot
    rows = p.get('rows') or [('Role', p['role']), ('Stack', p['stack'])] + ([('Where', p['where'])] if p.get('where') else [])
    f_rk = font(F_BODY_M, 10.5); f_rv = font(F_BODY, 13.2)
    ry = max(y + s(8), BOT - s(32) * len(rows) - s(10))
    for k, v in rows:
        jline(d, (L0, ry - s(8)), (L0 + LW, ry - s(8)), int(ry), 1, INK + (60,))
        tracked(d, (L0, ry), k.upper(), f_rk, INK_FAINT, .22)
        d.text((L0 + s(104), ry - s(3)), v, font=f_rv, fill=INK + (215,))
        ry += s(32)

    # ---- right page: the work
    fig = p['fig']
    if fig['kind'] == 'photos':
        wash(layer, (s(960), s(360), s(1620), s(900)), fig.get('wash', EARTH), idx + 3, .13)
        for k, ph in enumerate(fig['photos']):
            print_photo(layer, os.path.join(SH, ph['file']), [s(v) for v in ph['box']], ph['ang'], idx * 10 + k,
                        crop=ph.get('crop'), tapes=ph.get('tape', True))
    else:
        wash(layer, (s(980), s(380), s(1600), s(880)), fig.get('wash', (110, 132, 168)), idx + 5, .12)
        fig['draw'](d, layer, idx)
    if fig.get('note'):
        fig['note'](d, layer, idx)
    f_c = font(F_ITALIC, 19)
    d.text((s(960), s(905)), fig['cap'], font=f_c, fill=INK + (200,))
    seal(layer, s(1580), s(840), p['seal'])
    f_date = font(F_BODY_M, 12)
    tw = d.textlength(p['date'], font=f_date) + len(p['date']) * f_date.size * .22
    tracked(d, (s(1626) - tw, s(902)), p['date'], f_date, INK + (200,), .22)

    # ink sits *in* the paper: multiply the layer's colour into the sheet
    out = book.copy()
    out.alpha_composite(layer)
    a = book.getchannel('A')
    out.putalpha(a)
    return out

# ------------------------------------------------------- drawn diagrams
def diag_flow(labels, seed):
    def draw(d, layer, idx):
        f = font(F_BODY_M, 14); f2 = font(F_ITALIC, 18)
        x0, y = s(1010), s(420)
        boxes = []
        for i, (a, b) in enumerate(labels):
            w = s(250); h = s(78)
            x = x0 + (s(300) if i % 2 else 0)
            jbox(d, (x, y, x + w, y + h), seed + i * 5)
            tracked(d, (x + s(18), y + s(16)), a.upper(), f, INK + (220,), .18)
            d.text((x + s(18), y + s(40)), b, font=f2, fill=EARTH + (230,))
            boxes.append((x, y, w, h))
            y += s(118)
        for i in range(len(boxes) - 1):
            ax, ay, aw, ah = boxes[i]; bx, by, bw, bh = boxes[i + 1]
            a = (ax + aw / 2, ay + ah + s(4)); b = (bx + bw / 2, by - s(8))
            arrow(d, a, b, seed + 40 + i)
    return draw

def diag_notes(seed):
    def draw(d, layer, idx):
        f = font(F_ITALIC, 21)
        notes = [((1030, 420), 'learn something'), ((1330, 470), 'build something small'),
                 ((1090, 640), 'understand it deeply'), ((1370, 700), 'post it')]
        cs = []
        for i, ((x, y), t) in enumerate(notes):
            x, y = s(x), s(y)
            card = Image.new('RGBA', (s(200), s(120)), (244, 226, 160, 235))
            cd = ImageDraw.Draw(card)
            for j, line in enumerate(wrap(cd, t, f, s(170))):
                cd.text((s(14), s(16) + j * s(28)), line, font=f, fill=INK + (225,))
            rot = card.rotate([-3, 2.5, -1.5, 3][i], resample=Image.BICUBIC, expand=True)
            sh = Image.new('RGBA', rot.size, (40, 28, 12, 0)); sh.putalpha(rot.getchannel('A').point(lambda v: int(v * .25)))
            layer.alpha_composite(sh.filter(ImageFilter.GaussianBlur(s(6))), (x + s(4), y + s(7)))
            layer.alpha_composite(rot, (x, y))
            cs.append((x + s(100), y + s(60)))
        for a, b in [(0, 1), (0, 2), (1, 3), (2, 3)]:
            jline(d, cs[a], cs[b], seed + a * 3 + b, 2, INK + (150,))
    return draw

def diag_phone(seed):
    def draw(d, layer, idx):
        f = font(F_BODY_M, 13); f2 = font(F_ITALIC, 18)
        x, y, w, h = s(1180), s(380), s(250), s(470)
        jbox(d, (x, y, x + w, y + h), seed, 2)
        jline(d, (x + s(95), y + s(18)), (x + s(155), y + s(18)), seed + 9, 2)
        rows = [('Electrician', '4.8 · 2 km'), ('Tutor', '4.9 · 1 km'), ('Plumber', '4.6 · 3 km'), ('Painter', '4.7 · 5 km')]
        for i, (a, b) in enumerate(rows):
            ry = y + s(52) + i * s(92)
            jbox(d, (x + s(18), ry, x + w - s(18), ry + s(72)), seed + 10 + i, 1)
            d.ellipse((x + s(30), ry + s(18), x + s(66), ry + s(54)), outline=INK + (180,), width=s(2))
            tracked(d, (x + s(80), ry + s(16)), a.upper(), f, INK + (210,), .14)
            d.text((x + s(80), ry + s(36)), b, font=f2, fill=EARTH + (230,))
        for i, t in enumerate(['client', 'provider']):
            tx = s(1000) if i == 0 else s(1460)
            d.text((tx, s(560 + i * 90)), t, font=font(F_ITALIC, 24), fill=INK + (200,))
            arrow(d, (tx + s(60 if i == 0 else 30), s(600 + i * 90)), (x - s(10) if i == 0 else x + w + s(10), s(600 + i * 60)), seed + 60 + i)
    return draw

def note_me(d, layer, idx):
    f = font(F_ITALIC, 30)
    d.text((s(1395), s(372)), "that's me —", font=f, fill=INK + (225,))
    d.text((s(1395), s(404)), 'above the clouds', font=font(F_ITALIC, 22), fill=EARTH + (230,))
    # a looping hand-drawn arrow down to the print
    pts = []
    for i in range(24):
        t = i / 23
        pts.append((s(1420) - t * s(120) + math.sin(t * 5.2) * s(16), s(440) + t * s(70) + math.cos(t * 4.0) * s(10)))
    for i in range(len(pts) - 1):
        jline(d, pts[i], pts[i + 1], 900 + i, 2, INK + (200,))
    tip = pts[-1]
    jline(d, tip, (tip[0] + s(16), tip[1] - s(6)), 950, 2, INK + (200,))
    jline(d, tip, (tip[0] + s(8), tip[1] - s(16)), 951, 2, INK + (200,))

AUTHOR = dict(key='author', plate=0, title='Aryan Jain', sub='the one who builds all of this', year='2026', date='OCT 2026', seal='創',
       place='The author', rows=[('Studying', 'B.Tech CSE · IIIT Naya Raipur · 2025–29'), ('From', 'Baraut, Uttar Pradesh'),
                                 ('Open to', 'internships where tech meets business')],
       body=["I learned to code the way most people learn to swim: by jumping in. Codeforces taught me to love a hard problem; building things taught me to love a finished one.",
             "I like the place where software meets a real business: a form that turns into an order desk, a site that books a client's week, an app that helps a child read.",
             "These field notes are what I have built so far. Turn the page."],
       fig=dict(kind='photos', cap='fig. 0 — a lookout, somewhere above the clouds', wash=(120, 140, 120), note=note_me,
                photos=[dict(file='aryan-photo.png', box=(980, 420, 1400, 890), ang=-2.6)]))

PROJECTS = [
  dict(key='imposter', title='IMPOSTER', sub='a poster business that runs itself', year='2026', date='MAY 2026', seal='印',
       role='Founder & builder', stack='n8n · Google Forms · Sheets · Drive · Next.js',
       where='github.com/aryanjain281005', place='n8n · Business',
       body=["I launched a custom poster-printing business on a single Google Form, to learn whether anyone would order before I built anything. They did.",
             "Then every order meant the same chores by hand: pricing, checking designs, making Drive folders, sorting A3 from A4, zipping files, typing the WhatsApp message. So I wired the business together with n8n.",
             "Now an order prices itself, validates its design and lands on a dashboard. Marking it READY zips the files, makes the customer link and drafts the message. The web interface came last, on the same workflows."],
       fig=dict(kind='photos', cap='fig. 1 — the order desk; every status is a workflow',
                photos=[dict(file='imposter-orders.png', box=(968, 352, 1620, 760), ang=-1.4, crop=(0, 0, 2400, 1420)),
                        dict(file='imposter-dashboard.png', box=(1080, 690, 1560, 880), ang=2.2, crop=(0, 0, 1700, 724), tape=False)])),
  dict(key='vyanasoul', title='VyanaSoul', sub='a live platform for a spiritual consultancy', year='2026', date='MAY 2026', seal='霊',
       role='Freelance · full stack', stack='React · Vite · Supabase · Telegram Bot · Vercel',
       where='vyanasoul.vercel.app', place='Client · Live',
       body=["A client needed more than a brochure: services, courses, a blog, a gallery, testimonials and an FAQ, in English and in Hindi.",
             "I built it end to end and shipped it to production: Supabase authentication, dashboards for every user, consultation booking, and an admin panel to run the whole practice.",
             "Every booking pings the consultant through a Telegram bot, so nothing waits in an inbox."],
       fig=dict(kind='photos', cap='fig. 2 — live in production, desktop and phone', wash=(120, 92, 150),
                photos=[dict(file='vyana-live.png', box=(960, 352, 1520, 760), ang=-1.2),
                        dict(file='vyana-mobile.jpg', box=(1380, 470, 1590, 830), ang=3.0, tape=False, border=8)])),
  dict(key='wordoo', title='Wordoo', sub='a reading adventure for children aged 5–10', year='2026', date='OCT 2026', seal='言',
       role='Designer & developer', stack='Flutter · Dart · Node.js',
       where='github.com/aryanjain281005/wordoo', place='Flutter · EdTech',
       body=["A story-driven literacy companion in English and Hindi. It begins with a gentle screening, then turns the result into adaptive mini-games across six reading skills.",
             "Parents get a weekly progress report. Read-aloud tasks are scored on the device itself, so a child's voice never leaves it.",
             "It is deliberately not a diagnosis: it says which skills are strong, developing or need support, and never labels a child."],
       fig=dict(kind='photos', cap='fig. 3 — a world to read through, a report for parents', wash=(150, 118, 70),
                photos=[dict(file='wordoo-castle.png', box=(970, 340, 1290, 880), ang=-2.0),
                        dict(file='wordoo-report.png', box=(1280, 380, 1630, 870), ang=1.8)])),
  dict(key='prithvinet', title='PrithviNet', sub='air, water and noise, watched live', year='2026', date='MAR 2026', seal='地',
       role='Full stack', stack='Next.js · TypeScript · Leaflet · WAQI API',
       where='github.com/aryanjain281005/prithvunet', place='Climate · Data',
       body=["An environmental monitoring and compliance platform for India: live air quality for sixteen cities from the World Air Quality Index, with water quality and noise alongside.",
             "A dark Leaflet map colours every station by India's NAQI bands. Compliance alerts are raised from CPCB limits, with forecasting and anomaly detection on top, refreshing every minute."],
       fig=dict(kind='draw', cap='fig. 4 — from a sensor reading to an alert', draw=diag_flow(
           [('WAQI · CPCB', 'live readings'), ('Ingest', 'every 60 seconds'), ('Map & dashboard', 'NAQI colour bands'), ('Alerts', 'limits crossed')], 400))),
  dict(key='travel', title='Travel AI', sub='trip plans sized to a budget', year='2025', date='OCT 2025', seal='旅',
       role='Front end', stack='React · TypeScript · Vite · Tailwind',
       where='travel-ai-drab.vercel.app', place='AI · Live',
       body=["Tell it a city, a budget and how many days. It answers with a day-by-day plan: where to eat, what to see, and how crowded each place is likely to be.",
             "Eighty-five destinations across India and beyond, every activity sorted by kind, and the whole itinerary exported as a PDF to take on the road."],
       fig=dict(kind='photos', cap='fig. 5 — the planner, live', wash=(110, 120, 170),
                photos=[dict(file='travel.png', box=(968, 380, 1620, 860), ang=-1.0)])),
  dict(key='spendly', title='Spendly', sub='where the money goes', year='2026', date='OCT 2026', seal='銭',
       role='Full stack', stack='Python · Flask · SQLite · Railway',
       where='spendly · railway.app', place='Flask · Live',
       body=["A personal expense tracker built from the server up: accounts with hashed passwords, expenses in rupees validated on the server, and seven fixed categories.",
             "The profile is the product: totals, recent transactions, a category breakdown with percentage bars, and date filters from this month to all time."],
       fig=dict(kind='photos', cap='fig. 6 — know where your money goes', wash=(150, 140, 100),
                photos=[dict(file='spendly.png', box=(968, 380, 1620, 860), ang=1.1)])),
  dict(key='truthstamp', title='TruthStamp', sub='fact-checking that cannot be quietly edited', year='2025', date='NOV 2025', seal='証',
       role='Smart contracts · front end', stack='Rust · Stellar Soroban · React · TypeScript',
       where='github.com/aryanjain281005/truthstamp-dapp', place='Web3 · Rust',
       body=["A decentralized fact-checking platform on Stellar's Soroban smart contracts. A claim is submitted, verifiers weigh in, and the verdict is stamped on-chain where no one can rewrite it later.",
             "My first time writing contracts in Rust, and the first time I had to think about what it means for data to be permanent."],
       fig=dict(kind='draw', cap='fig. 7 — a claim, from submission to stamp', draw=diag_flow(
           [('Claim', 'submitted by anyone'), ('Soroban contract', 'rules in Rust'), ('Verifiers', 'evidence, votes'), ('Stamp', 'on-chain, for good')], 700))),
  dict(key='skillscout', title='SkillScout', sub='a marketplace for local skills', year='2025', date='DEC 2025', seal='匠',
       role='Mobile developer', stack='Flutter · Dart · Supabase · Material 3',
       where='github.com/aryanjain281005/SKILLSCOUT', place='Flutter · Mobile',
       body=["A mobile marketplace that connects people who need a job done with the people who can do it: electricians, tutors, plumbers, painters.",
             "Two kinds of account in one app, bookings and profiles stored in Supabase, and a Material 3 interface built in Flutter."],
       fig=dict(kind='draw', cap='fig. 8 — two sides of one booking', draw=diag_phone(800))),
  dict(key='secondbrain', title='Second Brain', sub='the first project I can explain line by line', year='2026', date='MAY 2026', seal='脳',
       role='Everything', stack='HTML · CSS · vanilla JavaScript',
       where='github.com/aryanjain281005/second-Brain', place='JavaScript · First',
       body=["A visual canvas for thoughts: write one, it becomes a note; drag it anywhere; draw links between related ideas; close the tab and it is all still there.",
             "No framework and no tutorial copied line by line. It is small, and I can explain every line of it, which is exactly why it is here."],
       fig=dict(kind='draw', cap='fig. 9 — my rule for learning, as a canvas', wash=(170, 150, 80), draw=diag_notes(900))),
]

if __name__ == '__main__':
    import json
    meta = []
    for i, p in enumerate([AUTHOR] + PROJECTS):
        im = spread(p, i)
        fn = f'{i:02d}-{p["key"]}.webp'
        im.save(os.path.join(OUT, fn), 'WEBP', quality=86, method=6)
        meta.append(dict(file=fn, title=p['title'], place=p['place']))
        print(fn, os.path.getsize(os.path.join(OUT, fn)) // 1024, 'KB')
    json.dump(meta, open(os.path.join(OUT, 'plates.json'), 'w'), indent=1)
