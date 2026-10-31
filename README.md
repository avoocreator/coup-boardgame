<p align="right">
  🌐 <b>Bahasa Indonesia</b> • <a href="README.en.md">English</a>
</p>

# COUP · Pixel Court

> Adaptasi digital game deduksi sosial & *bluffing* **Coup** bergaya retro pixel art, dilengkapi sintesis audio chiptune prosedural dan arsitektur *server-authoritative* anti-curang.

---

## Latar Belakang

Game kartu fisik seperti **Coup** sangat seru dimainkan bersama teman, namun sering kali terhalang oleh **jarak, kesibukan, dan lokasi yang berjauhan**. Mengumpulkan 3 hingga 6 orang dalam satu ruangan fisik tidak selalu memungkinkan setiap saat.

Proyek ini dibangun agar kamu dan teman-teman tetap bisa bermain Coup bersama **di mana saja dan kapan saja**:
* Cukup bagikan link undangan atau 4 digit kode ruangan lewat chat.
* Dapat dimainkan langsung lewat web browser di HP, tablet, maupun laptop tanpa perlu mengunduh aplikasi, mendaftar akun, atau mengingat password.
* Pengalaman bermain tetap intens dengan narasi Game Master, animasi kartu, dan efek suara retro.

---

## Karakter & Aset Permainan

Semua aset visual dibuat dalam resolusi pixel art retro dengan palet warna khusus dan diperbesar secara tajam (`image-rendering: pixelated`).

### 1. Game Master (Badut Istana)

<p align="center">
  <img src="public/ui/gm.png" alt="Sprite Game Master" width="384" style="image-rendering: pixelated;" />
</p>

Bertindak sebagai pemandu netral permainan. Game Master memiliki animasi sprite (idle, kedip, berbicara, dan bersorak) yang secara dinamis membacakan giliran, klaim peran, deklarasi tantangan, dan hasil eliminasi pemain lewat bubble chat dialog.

### 2. Kartu Pengaruh (Influence Cards)

Setiap pemain memegang 2 kartu rahasia di awal permainan. Setiap kartu mewakili karakter bangsawan dengan kemampuan khusus:

| Kartu | Karakter | Peran & Aksi | Karakter Blokir |
| :---: | :---: | :--- | :--- |
| <img src="public/cards/duke.png" width="90" alt="Duke" /> | **Duke** | Mengambil **Tax** (3 koin) dari perbendaharaan. Memblokir aksi Foreign Aid. | — |
| <img src="public/cards/assassin.png" width="90" alt="Assassin" /> | **Assassin** | Membayar 3 koin untuk melancarkan **Assassinate** ke pemain lain. | Contessa |
| <img src="public/cards/captain.png" width="90" alt="Captain" /> | **Captain** | Melancarkan **Steal** (mencuri 2 koin dari pemain lawan). Memblokir pencurian. | Captain, Ambassador |
| <img src="public/cards/ambassador.png" width="90" alt="Ambassador" /> | **Ambassador** | Melakukan **Exchange** (menukar kartu tangan dengan dek). Memblokir pencurian. | — |
| <img src="public/cards/contessa.png" width="90" alt="Contessa" /> | **Contessa** | Tidak memiliki aksi menyerang, namun kebal dan memblokir upaya **Assassinate**. | — |
| <img src="public/cards/back.png" width="90" alt="Card Back" /> | **Punggung Kartu** | Tampilan kartu tertutup. Identitas kartu di tangan pemain lawan sepenuhnya dirahasiakan oleh server. | — |

### 3. Aset Antarmuka & Token

| Aset | Nama | Keterangan Teknis |
| :---: | :--- | :--- |
| <img src="public/cards/coin.png" width="40" alt="Koin" /> | **Koin Emas** | Mata uang permainan. Dikumpulkan untuk melancarkan aksi berbiaya dan kudeta paksa (*Coup* 7 koin, wajib saat 10 koin). |
| <img src="public/cards/skull.png" width="40" alt="Tengkorak" /> | **Eliminasi (Skull)** | Muncul ketika pengaruh pemain terbongkar karena kalah tantangan atau terkena kudeta. |
| <img src="public/cards/crown.png" width="40" alt="Mahkota" /> | **Pemenang (Crown)** | Disematkan kepada satu-satunya pemain bangsawan yang berhasil bertahan hidup di akhir permainan. |
| <img src="public/cards/heart.png" width="40" alt="Hati" /> | **Status Hidup** | Indikator integritas pengaruh pemain selama ronde berlangsung. |
| <img src="public/ui/msg.png" width="40" alt="Pesan Log" /> | **Riwayat Pesan** | Ikon panel log interaktif untuk meninjau rekaman aksi giliran dari awal hingga akhir ronde. |

---

## Fitur Utama

* **Arsitektur Anti-Curang (View Isolation):** State asli dek kartu dan kartu lawan yang tertutup tidak pernah dikirim ke browser klien. Klien hanya menerima snapshot view miliknya sendiri, sehingga kebal dari kecurangan inspect DevTools.
* **Sistem Auto-Takeover & Session Resume:** Jika koneksi pemain terputus atau tidak aktif selama 12 detik, bot cerdas otomatis mengambil alih giliran sementara. Pemain dapat langsung merebut kembali kursinya cukup dengan me-refresh tab browser.
* **3 Variasi Aturan Kartu Tereliminasi:**
  1. *Klasik*: Kartu terbuka di meja pemain (aturan resmi Coup).
  2. *Kembali ke Dek (Diumumkan)*: Kartu ditunjukkan ke semua pemain, lalu diselipkan ke tumpukan paling bawah dek.
  3. *Kembali ke Dek (Rahasia)*: Kartu langsung masuk ke bawah dek tanpa diumumkan ke siapa pun.
* **Mode Latihan Solo (Offline):** Bermain melawan bot pintar di memori lokal peramban tanpa memerlukan koneksi jaringan internet.
* **Dukungan Dwibahasa (i18n):** Antarmuka dan teks log narasi tersedia dalam **English** dan **Bahasa Indonesia** yang dapat diganti secara langsung via panel pengaturan.

---

## Tech Stack & Arsitektur Teknologi

[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite_5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion/)
[![Web Audio API](https://img.shields.io/badge/Web_Audio_API-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![PeerJS](https://img.shields.io/badge/PeerJS_WebRTC-FF4088?style=for-the-badge&logo=webrtc&logoColor=white)](https://peerjs.com/)
[![Vercel](https://img.shields.io/badge/Vercel_Hosting-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![Python](https://img.shields.io/badge/Python_3-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)

### 1. Frontend & Manajemen State
* **React 18 & External Store:** Menggunakan `useSyncExternalStore` untuk menyinkronkan snapshot state dari sesi game ke antarmuka React secara reaktif tanpa re-render yang redundan.
* **Framer Motion:** Mengelola animasi transisi kartu, pergerakan layout 3D saat kartu dibagikan (*card deal & flip*), dan pop-up notifikasi tantangan.
* **Custom Pixel Easing:** Pergerakan animasi kartu menggunakan *step-based easing function* khusus agar transisi gerakan terasa seperti animasi frame sprite retro 8-bit/16-bit.

### 2. Audio Chiptune Prosedural (WebAudio API)
Aplikasi ini memiliki ukuran unduhan audio **0 KB**. Seluruh efek suara (klik tombol, pembagian kartu, koin berdenting, efek menang, dan kegagalan bluffing) disintesis secara matematika di browser menggunakan WebAudio API:
* Gelombang `square` dan `triangle` untuk nada melodi serta arpeggio.
* Gelombang `sawtooth` untuk peringatan tantangan dan kegagalan.
* Sample-and-hold pseudo-random buffer untuk menyimulasikan suara gesekan kartu (*white noise* khas game konsol klasik).

### 3. Arsitektur Multiplayer P2P (WebRTC & PeerJS)
* **Host-Authoritative WebRTC:** Pembuat ruangan (Host) bertindak sebagai Game Master berotoritas penuh yang memvalidasi giliran, mengelola dek kartu rahasia, dan mengendalikan bot otomatis.
* **Privasi View (Anti-Curang):** Host hanya mendistribusikan *filtered view* ke setiap pemain (kartu lawan disembunyikan), sehingga kebal dari intipan inspect DevTools.
* **Tanpa Server Backend & Database (0 KB Storage):** Komunikasi antar pemain berjalan langsung (*browser-to-browser*) lewat data channel WebRTC dengan sinyalisasi PeerJS gratis dan STUN/TURN fallback (OpenRelay). Tidak membutuhkan server backend berbayar atau database Redis di Vercel.
* **Auto-Takeover & Seat Reconnection:** Jika koneksi pemain terputus selama lebih dari 12 detik, bot otomatis mengambil alih agar jalannya permainan tidak terhenti. Pemain yang terputus dapat merebut kembali kursinya kapan saja dengan token sesi browser yang sama.

### 4. Pipeline Aset Grafis (Python & Pillow)
Aset kartu dan UI bersumber dari file vektor SVG di `assets-src/`. Skrip generator otomatis berbasis Python (`scripts/make-pixel-art.py` dan `scripts/make-gm.py`) merender vektor tersebut ke resolusi pixel murni, memetakan palet warna, dan menghasilkan sprite sheet PNG yang siap disajikan ke publik.
