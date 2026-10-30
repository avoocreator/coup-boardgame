"""Bangun aset pixel art dari sumber vektor di assets-src/.
Render SVG -> perkecil (area average) -> kuantisasi palet terbatas -> PNG kecil (diperbesar nearest-neighbor di CSS).
Jalankan: python3 scripts/make-pixel-art.py   (butuh playwright + pillow)"""
import io, os
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, OUT = f'{ROOT}/assets-src', f'{ROOT}/public/cards'
os.makedirs(OUT, exist_ok=True)
JOBS = {  # nama: (lebar, tinggi, jumlah warna)
    'duke': (60, 64, 28), 'assassin': (60, 64, 28), 'captain': (60, 64, 30),
    'ambassador': (60, 64, 28), 'contessa': (60, 64, 30), 'back': (50, 70, 14),
}
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, (w, h, k) in JOBS.items():
        vb = (300, 320) if name != 'back' else (250, 350)
        pg = b.new_page(viewport={'width': vb[0] * 2, 'height': vb[1] * 2})
        svg = open(f'{SRC}/{name}.svg').read()
        pg.set_content(f'<body style="margin:0"><div style="width:{vb[0]*2}px;height:{vb[1]*2}px">{svg}</div><style>svg{{width:100%;height:100%}}</style></body>')
        pg.wait_for_timeout(200)
        img = Image.open(io.BytesIO(pg.screenshot())).convert('RGB')
        img = img.resize((w, h), Image.BOX)
        img = img.quantize(colors=k, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
        img.save(f'{OUT}/{name}.png', optimize=True)
        pg.close()
    b.close()

# ---- sprite kecil digambar dengan grid ----
def sprite(rows, pal, scale=1):
    im = Image.new('RGBA', (len(rows[0]), len(rows)), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c in pal: im.putpixel((x, y), pal[c])
    return im
H = lambda s: tuple(int(s[i:i+2], 16) for i in (1, 3, 5)) + (255,)
coin = sprite([
    '..oooooo..',
    '.oyyyyyyo.',
    'oyyYYYYyyo',
    'oyYYllYYyo',
    'oyYlYYYYyo',
    'oyYlYYYYyo',
    'oyYYYYYYyo',
    'oyyYYYYyyo',
    '.oyyyyyyo.',
    '..oooooo..'], {'o': H('#6b3d00'), 'y': H('#e8a317'), 'Y': H('#ffd54a'), 'l': H('#fff4b0')})
heart = sprite([
    '.oo..oo.',
    'oRroorro',
    'oRrrrrro',
    'orrrrrro',
    '.orrrro.',
    '..orro..',
    '...oo...',
    '........'], {'o': H('#3a0010'), 'r': H('#e03050'), 'R': H('#ff8a9a')})
skull = sprite([
    '..wwwwww..',
    '.wwwwwwww.',
    'wwwwwwwwww',
    'wkkwwwwkkw',
    'wkkwwwwkkw',
    'wwwwkkwwww',
    '.wwwwwwww.',
    '..wkwkwk..',
    '..wwwwww..'], {'w': H('#e8e4d8'), 'k': H('#1a1a22')})
crown = sprite([
    'y..y..y..y',
    'yy.yy.yy.y',
    'yyyyyyyyyy',
    'yRyyByyGyy',
    'yyyyyyyyyy',
    'oooooooooo'], {'y': H('#ffd54a'), 'o': H('#a9741a'), 'R': H('#e03050'), 'B': H('#3a7bd5'), 'G': H('#2fbf71')})
for n, im in [('coin', coin), ('heart', heart), ('skull', skull), ('crown', crown)]:
    im.save(f'{OUT}/{n}.png')
print('ok', os.listdir(OUT))
