"""Sprite Game Master: JESTER chibi setengah badan (mata anime terbuka, topi & rambut dua warna), pixel art 64x64 per frame.
Digambar sebagai vektor (assets-src/gm.svg = frame 0) -> diturunkan ke 64x64 -> palet bersama untuk semua frame.
Sheet: 6 frame -> idle0, idle1, blink, talk0, talk1, cheer. Juga membuat ikon pesan.
Jalankan: python3 scripts/make-gm.py   (butuh playwright + pillow)"""
import io, math, os
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = f'{ROOT}/public/ui'
os.makedirs(OUT, exist_ok=True)
F = 64          # ukuran frame (px)
COLORS = 48     # jumlah warna palet

RED, RED_D, RED_L = '#d8344a', '#9c1f38', '#f06a78'
BLU, BLU_D, BLU_L = '#3b4a8f', '#232c5e', '#7f93d6'
HAIR_B, HAIR_R = '#7f9ad0', '#e0405a'
SKIN, SKIN_S = '#fff1de', '#f3d9bd'
GOLD, GOLD_D, GOLD_L = '#e0a43a', '#a8691e', '#ffe08a'
BLK = '#14101f'
IRIS, IRIS_L = '#2fa58a', '#9bf0d0'


def bell(x, y, r=14, ph=0):
    return (f'<circle cx="{x}" cy="{y+ph}" r="{r}" fill="{GOLD}" stroke="{BLK}" stroke-width="3.5"/>'
            f'<path d="M{x-r*0.55:.1f} {y+ph-r*0.3:.1f} Q{x:.1f} {y+ph-r*0.9:.1f} {x+r*0.5:.1f} {y+ph-r*0.4:.1f}" stroke="{GOLD_L}" stroke-width="3" fill="none" stroke-linecap="round"/>'
            f'<path d="M{x-r*0.9:.1f} {y+ph+r*0.15:.1f} L{x+r*0.9:.1f} {y+ph+r*0.15:.1f}" stroke="{GOLD_D}" stroke-width="2.6"/>'
            f'<circle cx="{x}" cy="{y+ph+r*0.5:.1f}" r="2.6" fill="{BLK}"/>')


def sparkle(x, y, s, col=GOLD):
    return f'<path d="M{x} {y-s} Q{x+s*0.18} {y-s*0.18} {x+s} {y} Q{x+s*0.18} {y+s*0.18} {x} {y+s} Q{x-s*0.18} {y+s*0.18} {x-s} {y} Q{x-s*0.18} {y-s*0.18} {x} {y-s}Z" fill="{col}" stroke="{BLK}" stroke-width="2.6" stroke-linejoin="round"/>'


def eye(cx, cy, mode, flip=1):
    """Mata anime besar & terbuka. mode: open | blink | happy"""
    if mode == 'blink':
        return f'<path d="M{cx-20} {cy+2} Q{cx} {cy+10} {cx+20} {cy+2}" stroke="{BLK}" stroke-width="5" fill="none" stroke-linecap="round"/>'
    if mode == 'happy':
        return f'<path d="M{cx-20} {cy+8} Q{cx} {cy-14} {cx+20} {cy+8}" stroke="{BLK}" stroke-width="6" fill="none" stroke-linecap="round"/>'
    return (f'<ellipse cx="{cx}" cy="{cy}" rx="17" ry="21" fill="#fff" stroke="{BLK}" stroke-width="2.4"/>'
            f'<ellipse cx="{cx+1*flip}" cy="{cy+3}" rx="13" ry="17" fill="{IRIS}"/>'
            f'<ellipse cx="{cx+1*flip}" cy="{cy+9}" rx="12" ry="10" fill="{IRIS_L}" opacity=".7"/>'
            f'<ellipse cx="{cx+1*flip}" cy="{cy+2}" rx="7" ry="10" fill="{BLK}"/>'
            f'<circle cx="{cx-6*flip}" cy="{cy-8}" r="5.4" fill="#fff"/><circle cx="{cx+7*flip}" cy="{cy+9}" r="2.8" fill="#fff"/>'
            f'<path d="M{cx-20} {cy-6} Q{cx} {cy-28} {cx+20} {cy-6}" stroke="{BLK}" stroke-width="5" fill="none" stroke-linecap="round"/>')


def svg(bob=0, sway=0, eyes='open', mouth='smile', cheer=False, spark=0):
    s = sway
    if mouth == 'smile':
        m = f'<path d="M116 170 Q122 177 128 170 Q134 177 140 170" stroke="{BLK}" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
    elif mouth == 'talk0':
        m = f'<ellipse cx="128" cy="172" rx="8" ry="6" fill="{BLK}"/><ellipse cx="128" cy="175" rx="4.5" ry="2.6" fill="#e8607a"/>'
    else:
        m = f'<path d="M114 166 Q128 190 142 166 Z" fill="{BLK}" stroke="{BLK}" stroke-width="3.5" stroke-linejoin="round"/><path d="M121 177 Q128 172 135 177 Q128 184 121 177Z" fill="#e8607a"/>'
    sp = ''
    if cheer or spark:
        sp = sparkle(30, 46 - s, 15) + sparkle(46, 22, 8) + sparkle(228, 52 + s, 13) + sparkle(214, 24, 8)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="512" height="512">
<defs>
<linearGradient id="skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{SKIN}"/><stop offset="1" stop-color="{SKIN_S}"/></linearGradient>
</defs>
<g transform="translate(0 {bob})">
<!-- bahu + jaket -->
<path d="M52 262 C 54 214, 84 196, 128 194 C 172 196, 202 214, 204 262Z" fill="{BLU_D}" stroke="{BLK}" stroke-width="4.5"/>
<path d="M84 202 L128 262 L110 200Z" fill="{BLU}" stroke="{BLK}" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M172 202 L128 262 L146 200Z" fill="{RED_D}" stroke="{BLK}" stroke-width="3.5" stroke-linejoin="round"/>
<!-- turtleneck krem + choker -->
<path d="M100 186 L100 208 Q128 222 156 208 L156 186Z" fill="#f3ead6" stroke="{BLK}" stroke-width="4"/>
<path d="M108 192 L108 206 M118 194 L118 210 M128 195 L128 212 M138 194 L138 210 M148 192 L148 206" stroke="#d9cdb0" stroke-width="2.6"/>
<path d="M102 190 Q128 202 154 190" stroke="{BLK}" stroke-width="6" fill="none" stroke-linecap="round"/>
{bell(128, 222, 15, bob and 2 or 0)}
<!-- tanduk topi (belakang kepala) -->
<path d="M66 100 C 40 120, 28 150, {38+s} {172+s}" stroke="{BLK}" stroke-width="40" stroke-linecap="round" fill="none"/>
<path d="M66 100 C 40 120, 28 150, {38+s} {172+s}" stroke="{RED}" stroke-width="32" stroke-linecap="round" fill="none"/>
<path d="M190 94 C 214 96, 226 120, {222-s} {150+s}" stroke="{BLK}" stroke-width="40" stroke-linecap="round" fill="none"/>
<path d="M190 94 C 214 96, 226 120, {222-s} {150+s}" stroke="{BLU}" stroke-width="32" stroke-linecap="round" fill="none"/>
{bell(38+s, 180+s, 15)}{bell(222-s, 158+s, 15)}
<!-- rambut belakang (samping) -->
<path d="M70 110 C 52 150, 58 190, 76 206 C 88 190, 92 160, 90 118Z" fill="{HAIR_B}" stroke="{BLK}" stroke-width="4" stroke-linejoin="round"/>
<path d="M186 110 C 204 150, 198 190, 180 206 C 168 190, 164 160, 166 118Z" fill="{HAIR_R}" stroke="{BLK}" stroke-width="4" stroke-linejoin="round"/>
<!-- wajah -->
<ellipse cx="128" cy="134" rx="54" ry="50" fill="url(#skin)" stroke="{BLK}" stroke-width="4.5"/>
<path d="M76 134 L66 122 L80 126Z M180 134 L190 122 L176 126Z" fill="{SKIN}" stroke="{BLK}" stroke-width="3" stroke-linejoin="round"/>
<!-- poni dua warna -->
<path d="M72 112 C 70 86, 96 74, 128 74 L128 128 C 118 112, 108 108, 100 128 C 94 120, 84 122, 76 138 C 72 128, 72 120, 72 112Z" fill="{HAIR_B}" stroke="{BLK}" stroke-width="4" stroke-linejoin="round"/>
<path d="M184 112 C 186 86, 160 74, 128 74 L128 128 C 140 110, 152 110, 160 128 C 168 118, 176 124, 182 140 C 186 130, 186 120, 184 112Z" fill="{HAIR_R}" stroke="{BLK}" stroke-width="4" stroke-linejoin="round"/>
<path d="M104 84 Q112 100 106 116 M152 84 Q146 100 152 116" stroke="{BLK}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".6"/>
<!-- mata anime -->
{eye(104, 146, eyes)}{eye(152, 146, eyes, -1)}
<!-- pipi, hidung, mulut -->
<ellipse cx="82" cy="164" rx="9" ry="5.5" fill="#f58a98" opacity=".75"/><ellipse cx="174" cy="164" rx="9" ry="5.5" fill="#f58a98" opacity=".75"/>
<circle cx="128" cy="160" r="3.4" fill="{RED}" stroke="{BLK}" stroke-width="1.6"/>
{m}
<!-- topi: kubah dua warna + pita -->
<path d="M64 98 C 60 40, 128 22, 128 22 L128 92 Q96 82 64 98Z" fill="{RED}" stroke="{BLK}" stroke-width="4.5" stroke-linejoin="round"/>
<path d="M192 98 C 196 40, 128 22, 128 22 L128 92 Q160 82 192 98Z" fill="{BLU}" stroke="{BLK}" stroke-width="4.5" stroke-linejoin="round"/>
<path d="M76 70 C 80 52, 96 40, 112 34" stroke="{RED_L}" stroke-width="4" fill="none" stroke-linecap="round"/>
<path d="M180 70 C 176 52, 160 40, 144 34" stroke="{BLU_L}" stroke-width="4" fill="none" stroke-linecap="round"/>
<path d="M58 98 Q128 76 198 98" stroke="{BLK}" stroke-width="14" fill="none" stroke-linecap="round"/>
<path d="M64 97 Q128 77 192 97" stroke="{GOLD}" stroke-width="2.6" fill="none" stroke-dasharray="6 7" stroke-linecap="round"/>
<path d="M104 78 L96 66 L112 72 L116 58 L124 72 L134 56 L138 74 L152 62 L150 78Z" fill="{BLK}"/>
{sp}
</g></svg>'''


FRAMES = [
    dict(),                                                   # idle0
    dict(bob=3, sway=4),                                      # idle1 (naik-turun, lonceng bergoyang)
    dict(eyes='blink'),                                       # blink
    dict(mouth='talk0', bob=1),                               # talk0
    dict(mouth='talk1', bob=2, sway=2),                       # talk1
    dict(mouth='talk1', eyes='happy', cheer=True, bob=-3, sway=6),  # cheer (mata senang + kilau)
]

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 512, 'height': 512})
    imgs = []
    for kw in FRAMES:
        pg.set_content(f'<body style="margin:0;background:transparent">{svg(**kw)}</body>')
        pg.wait_for_timeout(80)
        imgs.append(Image.open(io.BytesIO(pg.screenshot(omit_background=True))).convert('RGBA'))
    b.close()

os.makedirs(f'{ROOT}/assets-src', exist_ok=True)
open(f'{ROOT}/assets-src/gm.svg', 'w').write(svg())

# turunkan ke FxF; palet bersama (supaya warna tidak "berkedip" antar frame)
small = [im.resize((F, F), Image.BOX) for im in imgs]
sheet = Image.new('RGBA', (F * len(small), F), (0, 0, 0, 0))
for i, im in enumerate(small):
    sheet.paste(im, (i * F, 0))
alpha = sheet.getchannel('A').point(lambda a: 255 if a >= 110 else 0)
rgb = Image.new('RGB', sheet.size, (0, 0, 0))
rgb.paste(sheet.convert('RGB'), mask=alpha)
q = rgb.quantize(colors=COLORS, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
final = q.convert('RGBA')
final.putalpha(alpha)
final.save(f'{OUT}/gm.png', optimize=True)

# ---- ikon pesan 14x11 ----
rows = ['..oooooooooo..', '.owwwwwwwwwwo.', 'owwwwwwwwwwwwo', 'owwkwwkwwkwwwo', 'owwwwwwwwwwwwo',
        'owwwwwwwwwwwwo', '.owwwwwwwwwwo.', '..oowwwwwwoo..', '....owwooo....', '.....owo......', '......o.......']
pal = {'o': (26, 15, 46, 255), 'w': (244, 236, 220, 255), 'k': (75, 34, 135, 255)}
ic = Image.new('RGBA', (14, 11), (0, 0, 0, 0))
for y, row in enumerate(rows):
    for x, ch in enumerate(row):
        if ch in pal:
            ic.putpixel((x, y), pal[ch])
ic.save(f'{OUT}/msg.png')

prev = Image.new('RGBA', (F * len(small) * 4 + 8, F * 4 + 8), (60, 40, 40, 255))
big = final.resize((F * len(small) * 4, F * 4), Image.NEAREST)
prev.paste(big, (4, 4), big)
prev.convert('RGB').save(os.environ.get('GM_PREVIEW', '/tmp/gm_preview.png'))
print('ok')
