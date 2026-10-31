"""Sprite Game Master: JESTER setengah badan (chibi), pixel art 64x64 per frame.
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
COLORS = 30     # jumlah warna palet

TEAL, TEAL_D, TEAL_L = '#3f9a92', '#27706c', '#8fe0d0'
CREAM = '#f2dcae'
RED, RED_D = '#e8431a', '#a82a10'
BLK = '#12080a'


def petals(cy=158):
    """Kerah ruffle besar: kelopak teal yang menyebar dari leher."""
    out = []
    cx = 128
    for k, ang in enumerate([-78, -52, -26, 0, 26, 52, 78]):
        a = math.radians(ang)
        tipx, tipy = cx + math.sin(a) * 74, cy + math.cos(a) * 34 + 6
        b1, b2 = math.radians(ang - 21), math.radians(ang + 21)
        p1 = (cx + math.sin(b1) * 30, cy + math.cos(b1) * 12 - 6)
        p2 = (cx + math.sin(b2) * 30, cy + math.cos(b2) * 12 - 6)
        mid = (cx + math.sin(a) * 50, cy + math.cos(a) * 22)
        col = TEAL if k % 2 == 0 else '#4eb0a6'
        out.append(f'<path d="M{p1[0]:.1f} {p1[1]:.1f} Q{mid[0]-math.cos(a)*10:.1f} {mid[1]+math.sin(a)*4:.1f} {tipx:.1f} {tipy:.1f} Q{mid[0]+math.cos(a)*10:.1f} {mid[1]-math.sin(a)*4:.1f} {p2[0]:.1f} {p2[1]:.1f} Z" fill="{col}" stroke="{BLK}" stroke-width="3.5" stroke-linejoin="round"/>')
        out.append(f'<path d="M{(p1[0]+p2[0])/2:.1f} {(p1[1]+p2[1])/2:.1f} L{tipx*0.92+cx*0.08:.1f} {tipy*0.92+cy*0.08:.1f}" stroke="{CREAM}" stroke-width="2.4" stroke-linecap="round" opacity=".85"/>')
    return ''.join(out)


def hand(rot, spread):
    fingers = ''.join(
        f'<path d="M-5 0 Q{-3+a*0.05:.1f} -22 0 -{ln} Q{3+a*0.05:.1f} -22 5 0Z" fill="{BLK}" stroke="{TEAL_L}" stroke-width="1.6" stroke-linejoin="round" transform="rotate({a+rot*0})"/>'
        for a, ln in [(-46 - spread, 30), (-22 - spread / 2, 38), (3 + spread / 3, 40), (28 + spread, 34)])
    return (f'<ellipse cx="0" cy="4" rx="20" ry="15" fill="{BLK}" stroke="{TEAL_L}" stroke-width="1.8"/>'
            f'<path d="M-16 8 Q-30 2 -34 -10 Q-26 -10 -16 -2Z" fill="{BLK}" stroke="{TEAL_L}" stroke-width="1.6" stroke-linejoin="round"/>'
            + fingers)


def svg(bob=0, sway=0, blink=False, mouth='smile', wave=0, hand_lift=0, cheer=False):
    horn_l = f'M92 78 C 58 34, 12 34, 14 {92+sway}'
    horn_r = f'M164 78 C 198 30, 246 36, 244 {88-sway}'
    eye_ry = 2 if blink else 17
    if mouth == 'smile':
        mouth_svg = f'<path d="M80 130 Q128 176 176 130" fill="none" stroke="{BLK}" stroke-width="8" stroke-linecap="round"/>'
        for t in (0.12, 0.3, 0.5, 0.7, 0.88):
            x = 80 + 96 * t
            y = 130 + (1 - (2 * t - 1) ** 2) * 23  # perkiraan titik kurva
            mouth_svg += f'<path d="M{x:.1f} {y-6:.1f} L{x:.1f} {y+7:.1f}" stroke="{BLK}" stroke-width="4" stroke-linecap="round"/>'
    elif mouth == 'talk0':
        mouth_svg = f'<path d="M86 132 Q128 188 170 132 Q128 150 86 132Z" fill="{BLK}" stroke="{BLK}" stroke-width="4" stroke-linejoin="round"/>'
    else:
        mouth_svg = (f'<path d="M84 130 Q128 204 172 130 Q128 146 84 130Z" fill="{BLK}" stroke="{BLK}" stroke-width="4" stroke-linejoin="round"/>'
                     f'<path d="M108 168 Q128 182 148 168 Q128 160 108 168Z" fill="#a82a40"/>')
    hx, hy = (34, 168 - hand_lift) if cheer else (40, 200 - hand_lift)
    hrot = (-12 + wave) if cheer else (-6 + wave)
    sp = 8 if cheer else 0
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="512" height="512">
<defs>
<clipPath id="tor"><path d="M66 260 C 66 206, 92 178, 128 176 C 164 178, 190 206, 190 260Z"/></clipPath>
<radialGradient id="hl" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="{TEAL_L}"/><stop offset=".55" stop-color="{TEAL}"/><stop offset="1" stop-color="{TEAL_D}"/></radialGradient>
</defs>
<g transform="translate(0 {bob})">
<!-- kartu melayang -->
<g transform="translate(238 176) rotate(20)"><rect x="-13" y="-19" width="26" height="38" rx="3" fill="{TEAL}" stroke="{BLK}" stroke-width="3"/><rect x="-9" y="-15" width="18" height="30" rx="2" fill="none" stroke="{CREAM}" stroke-width="1.6"/><path d="M0 -7 L5 0 L0 7 L-5 0Z" fill="{RED}"/></g>
<!-- tongkat -->
<path d="M206 262 L222 144" stroke="{BLK}" stroke-width="13" stroke-linecap="round"/><path d="M206 262 L222 144" stroke="#4a2a20" stroke-width="7" stroke-linecap="round"/>
<circle cx="224" cy="130" r="17" fill="url(#hl)" stroke="{BLK}" stroke-width="4"/><path d="M212 125 Q224 114 236 125" stroke="{CREAM}" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="215" y="143" width="17" height="7" rx="2" fill="{RED}" stroke="{BLK}" stroke-width="2.5"/>
<!-- badan: rompi belang merah-hitam + jahitan X -->
<g clip-path="url(#tor)">
<rect x="50" y="170" width="160" height="100" fill="{RED}"/>
<path d="M76 176v100M92 176v100M164 176v100M180 176v100" stroke="{BLK}" stroke-width="8"/>
<path d="M104 178 L152 178 L162 270 L94 270Z" fill="{BLK}"/>
<path d="M62 190 Q 90 178 118 186" stroke="{RED_D}" stroke-width="6" fill="none"/>
</g>
<path d="M66 262 C 66 206, 92 178, 128 176 C 164 178, 190 206, 190 262" fill="none" stroke="{BLK}" stroke-width="4"/>
<g stroke="{TEAL_L}" stroke-width="3.4" stroke-linecap="round"><path d="M121 192l14 12M135 192l-14 12"/><path d="M122 214l14 12M136 214l-14 12"/><path d="M123 236l14 12M137 236l-14 12"/></g>
<!-- lengan kiri (tangan menyapa) -->
<path d="M80 212 Q 60 214 {hx+8} {hy+14}" stroke="{BLK}" stroke-width="20" stroke-linecap="round" fill="none"/>
<path d="M80 212 Q 60 214 {hx+8} {hy+14}" stroke="{TEAL_D}" stroke-width="13" stroke-linecap="round" fill="none"/>
<g transform="translate({hx} {hy}) rotate({hrot})">{hand(0, sp)}</g>
<circle cx="80" cy="212" r="19" fill="url(#hl)" stroke="{BLK}" stroke-width="4"/><path d="M68 206 Q78 197 90 200" stroke="{CREAM}" stroke-width="3.4" fill="none" stroke-linecap="round"/>
<!-- lengan kanan memegang tongkat -->
<circle cx="178" cy="214" r="19" fill="url(#hl)" stroke="{BLK}" stroke-width="4"/><path d="M166 207 Q176 198 188 201" stroke="{CREAM}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
<circle cx="208" cy="226" r="11" fill="{BLK}" stroke="{TEAL_L}" stroke-width="1.8"/><path d="M184 218 L202 224" stroke="{BLK}" stroke-width="12" stroke-linecap="round"/>
<!-- kerah ruffle -->
<ellipse cx="128" cy="160" rx="38" ry="13" fill="{TEAL_D}" stroke="{BLK}" stroke-width="3.5"/>
{petals()}
<ellipse cx="128" cy="155" rx="24" ry="8" fill="{BLK}" opacity=".55"/>
<g transform="translate(0 -10)">
<!-- tanduk topi -->
<path d="{horn_l}" stroke="{BLK}" stroke-width="27" stroke-linecap="round" fill="none"/><path d="{horn_l}" stroke="{RED}" stroke-width="19" stroke-linecap="round" fill="none"/><path d="{horn_l}" stroke="{BLK}" stroke-width="19" stroke-linecap="butt" fill="none" stroke-dasharray="16 22" stroke-dashoffset="2"/>
<path d="{horn_r}" stroke="{BLK}" stroke-width="27" stroke-linecap="round" fill="none"/><path d="{horn_r}" stroke="{RED}" stroke-width="19" stroke-linecap="round" fill="none"/><path d="{horn_r}" stroke="{BLK}" stroke-width="19" stroke-linecap="butt" fill="none" stroke-dasharray="16 22" stroke-dashoffset="8"/>
<g><circle cx="14" cy="{100+sway}" r="15" fill="url(#hl)" stroke="{BLK}" stroke-width="4"/><circle cx="244" cy="{96-sway}" r="15" fill="url(#hl)" stroke="{BLK}" stroke-width="4"/><path d="M6 {96+sway} Q14 {88+sway} 22 {96+sway}M236 {92-sway} Q244 {84-sway} 252 {92-sway}" stroke="{CREAM}" stroke-width="3" fill="none" stroke-linecap="round"/></g>
<!-- kepala/topeng -->
<ellipse cx="128" cy="116" rx="58" ry="55" fill="url(#hl)" stroke="{BLK}" stroke-width="4.5"/>
<path d="M170 76 Q190 116 168 160" stroke="{TEAL_D}" stroke-width="10" fill="none" opacity=".45" stroke-linecap="round"/>
<path d="M90 70 Q96 92 88 108 M168 74 Q164 90 172 100" stroke="{BLK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
<ellipse cx="104" cy="112" rx="15" ry="{eye_ry}" fill="{BLK}"/><ellipse cx="152" cy="112" rx="15" ry="{eye_ry}" fill="{BLK}"/>
{'' if blink else f'<circle cx="98" cy="104" r="3.4" fill="#2f6b68"/><circle cx="146" cy="104" r="3.4" fill="#2f6b68"/>'}
{mouth_svg}
<!-- topi: kubah + pita -->
<path d="M68 98 C 60 44, 196 44, 188 98 Q128 74 68 98Z" fill="{RED}" stroke="{BLK}" stroke-width="4.5" stroke-linejoin="round"/>
<path d="M104 60 Q100 82 106 90M128 54 L128 82M152 60 Q156 82 150 90" stroke="{BLK}" stroke-width="6.5" fill="none" stroke-linecap="round"/>
<path d="M66 98 Q128 70 190 98" stroke="{BLK}" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M72 97 Q128 72 184 97" stroke="{CREAM}" stroke-width="2.4" fill="none" stroke-dasharray="5 7" stroke-linecap="round"/>
</g></g></svg>'''


FRAMES = [
    dict(),                                  # idle0
    dict(bob=3, sway=5, wave=5),             # idle1 (naik-turun, bel bergoyang, tangan bergoyang)
    dict(blink=True),                        # blink
    dict(mouth='talk0', wave=-3),            # talk0
    dict(mouth='talk1', bob=2, wave=3),      # talk1
    dict(mouth='talk1', cheer=True, bob=-2, sway=7, wave=-8),  # cheer (tangan terangkat)
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
