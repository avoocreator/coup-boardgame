# COUP · Pixel Court

Game bluffing **Coup** multiplayer bergaya pixel. React + Vite + Framer Motion. Multiplayer **peer-to-peer (WebRTC via PeerJS)**, jadi
tidak butuh server game — cukup static hosting seperti Vercel.

## Jalankan lokal
```bash
npm install
npm run dev        # http://localhost:5173
npm test           # simulasi 3000 game + tes aturan (Node murni)
node scripts/net-test.mjs   # tes protokol multiplayer (PeerJS palsu in-memory)
```

## Deploy ke Vercel
1. Push folder ini ke GitHub (atau `npx vercel` dari folder ini).
2. Import di Vercel → framework terdeteksi **Vite** (build `npm run build`, output `dist`). Tanpa environment variable.

## Cara main online
- Satu orang klik **BUAT RUANGAN** → dapat kode 4 huruf + tombol **SALIN LINK UNDANGAN**.
- Teman membuka link (atau memasukkan kode) → **GABUNG**. Host menekan **MULAI** (2–6 pemain, bot boleh ditambah).
- **Latihan vs Bot** berjalan offline sepenuhnya.

### Arsitektur multiplayer
- Host memegang state asli & memvalidasi semua gerakan (`src/game/engine.js`). Klien hanya menerima *view* miliknya:
  kartu tertutup lawan **tidak pernah dikirim** ke browser lain (anti-curang dari sisi klien).
- Pemain terputus: 12 detik kemudian bot mengambil alih; bila dia kembali (refresh / buka link lagi di perangkat yang sama) kursinya direbut kembali otomatis.
- **Jika host menutup tab, permainan berakhir** (state ada di browser host).
- Signaling memakai broker publik gratis PeerJS. Koneksi langsung memakai STUN Google; cadangan TURN publik OpenRelay
  (gratis, bisa dibatasi). Untuk keandalan ekstra pasang TURN sendiri:
  `VITE_TURN_URL`, `VITE_TURN_USER`, `VITE_TURN_PASS` (Vercel → Settings → Environment Variables).
  Broker PeerJS sendiri: `VITE_PEER_HOST`, `VITE_PEER_PORT`, `VITE_PEER_PATH`, `VITE_PEER_SECURE`.

## Aset
- `public/cards/*.png` — pixel art kartu (60×64), punggung kartu, koin, tengkorak, mahkota. Diperbesar dengan `image-rendering: pixelated`.
- `assets-src/*.svg` — sumber vektor. Regenerasi pixel art: `python3 scripts/make-pixel-art.py` (butuh playwright + pillow).
- Suara: sintesis chiptune WebAudio di `src/sound.js` (tanpa file audio). Tombol 🔊/🔇 di pojok.
- Font: Press Start 2P & VT323 (Google Fonts).

## Struktur
```
src/game/    rules.js · engine.js (aturan, fungsi murni) · bot.js
src/net/     session.js (host/klien P2P) · index.js (konfigurasi PeerJS)
src/components/  Menu · Lobby · Game · Flashes (animasi tantangan) · Card · Rules · ui
src/sound.js     efek suara
```
