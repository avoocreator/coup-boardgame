# COUP · Pixel Court

Game bluffing **Coup** multiplayer bergaya pixel. React + Vite + Framer Motion, efek suara chiptune (WebAudio),
bahasa **English (default) / Bahasa Indonesia** (⚙ Settings).

## Arsitektur: Game Master di server (anti-curang)
State asli permainan **tidak pernah ada di browser pemain mana pun**. Yang memegang kartu, dek, dan memvalidasi gerakan adalah
**Game Master** — sebuah Vercel Function (`api/game.js`) yang menjalankan engine yang sama (`src/game/engine.js`), dengan state
di Redis. Browser hanya mengirim gerakan dan menerima *view* miliknya sendiri (kartu lawan yang tertutup & isi dek tidak pernah
dikirim). Karena itu membuka DevTools / membaca state di React tidak membocorkan kartu lawan.

- Game Master juga yang menggerakkan **bot** dan mengambil alih pemain yang tidak aktif 12 detik (kursi direbut kembali otomatis saat
  kembali / refresh, karena identitas = token rahasia per browser).
- Di UI, Game Master adalah avatar pixel (badut istana) dengan animasi idle/kedip/bicara; ia "membacakan" tiap aksi lewat bubble chat.
  Log lengkap ada di ikon pesan 💬 (bisa dibuka/tutup).
- **Latihan vs Bot** berjalan offline sepenuhnya (logika ruangan yang sama, di memori browser).

## Setup & deploy ke Vercel
1. Push folder ini ke GitHub, lalu **Import** di Vercel (framework Vite terdeteksi otomatis).
2. Di dashboard proyek: **Storage → Create / Connect → Upstash Redis** (Marketplace, ada paket gratis) dan hubungkan ke proyek.
   Ini otomatis menambah env var `KV_REST_API_URL` & `KV_REST_API_TOKEN` (atau `UPSTASH_REDIS_REST_URL/TOKEN` — keduanya didukung).
3. **Redeploy**. Tanpa Redis, mode online menampilkan pesan "Server storage is not configured" (mode latihan tetap jalan).

Catatan biaya: klien melakukan polling ±1×/0,8 detik per pemain. Untuk game santai paket gratis Upstash cukup; untuk banyak
pemain sekaligus pertimbangkan paket berbayar.

## Jalankan lokal
```bash
npm install
npm run dev      # Vite juga menyajikan /api/game dengan penyimpanan memori → online bisa dites di 2 tab, tanpa Redis
npm test         # simulasi 3000 game + tes Game Master + tes klien (Node murni)
```

## Pengaturan permainan (dipilih host di lobby)
Aturan kartu yang hilang/dibuang:
- **Klasik** – tetap terbuka di depan pemain (aturan resmi).
- **Kembali ke dek — diumumkan** – diperlihatkan ke semua, lalu masuk **bawah dek**; kartu hasil Tukar juga ke bawah dek.
- **Kembali ke dek — rahasia** – masuk bawah dek tanpa diumumkan.
Kartu selalu diambil dari **atas** dek. Bahasa dipilih per pemain di ⚙ Settings.

## Aset
- `public/cards/*.png` pixel art kartu (sumber vektor di `assets-src/`, regenerasi: `python3 scripts/make-pixel-art.py`).
- `public/ui/gm.png` sprite Game Master (6 frame: idle ×2, kedip, bicara ×2, sorak) & `msg.png` ikon pesan
  (regenerasi: `python3 scripts/make-gm.py`).
- Suara: sintesis di `src/sound.js` (tanpa file audio). Font: Press Start 2P & VT323.

## Struktur
```
api/game.js, api/_store.js   Game Master (Vercel Function) + penyimpanan Redis/memori (compare-and-set)
src/game/                    rules · engine (aturan, murni) · bot · room (lobby+game, dipakai server & mode lokal)
src/net/session.js           klien: polling ke Game Master
src/i18n/                    strings.js (EN/ID) · index.js (useT, fmtLog)
src/components/              Menu · Lobby · Game · GameMaster · Flashes · Settings · Rules · Card · ui
```
