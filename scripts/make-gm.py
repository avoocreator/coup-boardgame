"""Sprite Game Master (badut istana) + ikon pesan, digambar prosedural dalam grid pixel.
Sheet: 6 frame @32x40 -> idle0, idle1, blink, talk0, talk1, cheer. Jalankan: python3 scripts/make-gm.py"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = f'{ROOT}/public/ui'
os.makedirs(OUT, exist_ok=True)
W, H, N = 32, 42, 6
C = dict(
    ol=(26, 15, 46, 255), pu=(123, 63, 196, 255), pd=(75, 34, 135, 255), re=(224, 48, 80, 255), rd=(142, 20, 48, 255),
    bl=(58, 123, 213, 255), bd=(32, 72, 140, 255), go=(255, 213, 74, 255), gd=(201, 154, 30, 255), wh=(244, 236, 220, 255),
    sh=(217, 205, 180, 255), dk=(40, 20, 40, 255), br=(120, 76, 40, 255), bk=(70, 44, 24, 255),
)

def frame(kind, t):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    def r(x, y, w, h, c): d.rectangle([x, y, x + w - 1, y + h - 1], fill=C[c])
    bob = 1 if kind == 'idle1' else 0
    sway = 1 if kind == 'idle1' else 0
    up = -2 if kind == 'cheer' else 0
    oy = bob  # offset vertikal badan
    # tongkat (tak ikut bob) + bintang
    r(27, 20 + up, 2, 20, 'br'); r(27, 20 + up, 1, 20, 'bk')
    for (x, y, w, h) in [(26, 15 + up, 4, 4), (25, 16 + up, 6, 2), (27, 14 + up, 2, 6)]: r(x, y, w, h, 'go')
    r(27, 16 + up, 2, 2, 'gd')
    # sepatu
    r(7, 39, 6, 2, 'pu'); r(19, 39, 6, 2, 're'); r(5, 38, 3, 2, 'go'); r(24, 38, 3, 2, 'go')
    # badan
    b = oy
    r(9, 28 + b, 7, 11 - b, 're'); r(16, 28 + b, 7, 11 - b, 'bl')
    r(9, 37, 7, 2, 'rd'); r(16, 37, 7, 2, 'bd')
    for (x, y, c) in [(12, 31, 'go'), (19, 31, 'go'), (12, 35, 'go'), (19, 35, 'go'), (15, 33, 'wh'), (16, 33, 'wh')]: r(x, y + b, 1, 1, c)
    r(10, 33 + b, 1, 1, 'rd'); r(21, 33 + b, 1, 1, 'bd')
    # lengan
    ay = 0 if kind != 'cheer' else -7
    r(6, 29 + b, 3, 7, 're'); r(23, 29 + b, 3, 7, 'bl')
    r(6, 35 + b, 3, 2, 'wh')
    if kind == 'cheer':
        r(23, 22, 3, 7, 'bl'); r(24, 20, 3, 3, 'wh')
    else:
        r(24, 35 + b, 3, 2, 'wh')
    # kerah ruff
    for i in range(8):
        r(8 + i * 2, 26 + b, 2, 3, 'wh' if i % 2 == 0 else 'sh')
    # kepala
    h = b
    r(9, 13 + h, 14, 13, 'wh'); r(9, 24 + h, 14, 2, 'sh')
    # topi (band + dua tanduk)
    r(8, 10 + h, 16, 4, 'pu'); r(8, 12 + h, 16, 1, 'go'); r(8, 13 + h, 16, 1, 'gd')
    # tanduk kiri ungu, kanan merah (bergoyang saat idle1)
    for (x, y, w, hh) in [(7, 6 + h, 4, 5), (5, 4 + h, 4, 4), (3, 4 + h + sway, 3, 3)]: r(x, y, w, hh, 'pu')
    for (x, y, w, hh) in [(21, 6 + h, 4, 5), (23, 4 + h, 4, 4), (26, 4 + h + sway, 3, 3)]: r(x, y, w, hh, 're')
    r(9, 8 + h, 2, 2, 'pd'); r(21, 8 + h, 2, 2, 'rd')
    r(2, 6 + h + sway, 3, 3, 'go'); r(27, 6 + h + sway, 3, 3, 'go'); r(3, 7 + h + sway, 1, 1, 'gd'); r(28, 7 + h + sway, 1, 1, 'gd')
    # wajah
    if kind == 'blink':
        r(12, 19 + h, 3, 1, 'dk'); r(18, 19 + h, 3, 1, 'dk')
    elif kind == 'cheer':
        r(12, 18 + h, 3, 1, 'dk'); r(13, 17 + h, 1, 1, 'dk'); r(18, 18 + h, 3, 1, 'dk'); r(19, 17 + h, 1, 1, 'dk')
    else:
        r(12, 18 + h, 2, 3, 'dk'); r(19, 18 + h, 2, 3, 'dk'); r(12, 18 + h, 1, 1, 'wh'); r(19, 18 + h, 1, 1, 'wh')
    r(15, 20 + h, 3, 2, 're'); r(15, 20 + h, 1, 1, 'go')
    r(10, 22 + h, 2, 2, 're'); r(21, 22 + h, 2, 2, 're')
    r(11, 16 + h, 3, 1, 'dk'); r(19, 16 + h, 3, 1, 'dk')  # alis
    if kind == 'talk0':
        r(14, 23 + h, 5, 2, 'dk'); r(15, 24 + h, 3, 1, 'rd')
    elif kind == 'talk1':
        r(13, 23 + h, 7, 3, 'dk'); r(15, 25 + h, 3, 1, 're'); r(14, 23 + h, 5, 1, 'wh')
    elif kind == 'cheer':
        r(12, 23 + h, 9, 2, 'dk'); r(13, 25 + h, 7, 1, 'dk'); r(14, 24 + h, 5, 1, 'wh')
    else:
        r(13, 24 + h, 7, 1, 'dk'); r(12, 23 + h, 1, 1, 'dk'); r(20, 23 + h, 1, 1, 'dk')
    # kontur otomatis
    px = im.load()
    out = im.copy(); po = out.load()
    for y in range(H):
        for x in range(W):
            if px[x, y][3] == 0:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and px[nx, ny][3]:
                        po[x, y] = C['ol']; break
    return out

kinds = ['idle0', 'idle1', 'blink', 'talk0', 'talk1', 'cheer']
sheet = Image.new('RGBA', (W * N, H), (0, 0, 0, 0))
for i, k in enumerate(kinds): sheet.paste(frame(k, i), (i * W, 0))
sheet.save(f'{OUT}/gm.png')

# ikon pesan 14x12
rows = [
    '..oooooooooo..', '.owwwwwwwwwwo.', 'owwwwwwwwwwwwo', 'owwkwwkwwkwwwo', 'owwwwwwwwwwwwo',
    'owwwwwwwwwwwwo', '.owwwwwwwwwwo.', '..oowwwwwwoo..', '....owwooo....', '.....owo......', '......o.......']
pal = {'o': C['ol'], 'w': C['wh'], 'k': C['pd']}
ic = Image.new('RGBA', (14, 11), (0, 0, 0, 0))
for y, row in enumerate(rows):
    for x, ch in enumerate(row):
        if ch in pal: ic.putpixel((x, y), pal[ch])
ic.save(f'{OUT}/msg.png')
# pratinjau
prev = Image.new('RGBA', (W * N * 6 + 80, H * 6 + 8), (40, 36, 80, 255))
prev.paste(sheet.resize((W * N * 6, H * 6), Image.NEAREST), (4, 4), sheet.resize((W * N * 6, H * 6), Image.NEAREST))
prev.paste(ic.resize((14 * 4, 11 * 4), Image.NEAREST), (W * N * 6 + 12, 20), ic.resize((14 * 4, 11 * 4), Image.NEAREST))
prev.convert('RGB').save(os.environ.get('GM_PREVIEW', '/tmp/gm_preview.png'))
print('ok')
