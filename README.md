# 🤖🩺 HdyBot — Nursing Class A Assistant (Semester 5A)

Versi revisi 10 November 2026. Relay grup meminta persetujuan Hedy lewat DM. Menu .keperawatan memakai Perawat.org, dan .music mencari SoundCloud. Untuk fitur aktif, batas pengujian, konfigurasi Drive, dan pemulihan, lihat [laporan implementasi](IMPLEMENTATION_STATUS.md) dan [audit proyek](PROJECT_AUDIT.md). Installer memakai systemd dan memakai password admin default `hedyfake`. QR hanya ditampilkan lewat akses lokal privat.

> **Asisten AI WhatsApp Akademik, Sekretaris Kelas Digital, & Pengelola Informasi Grup Cerdas (24/7 Daemon)**  
> Dirancang khusus untuk **Nursing Class A (S1 Ilmu Keperawatan — Semester 5A)** dengan pusat kendali penuh melalui WhatsApp pribadi **Hedy (`082233038659`)** dengan **OpenAI sebagai penyedia AI utama** dan **NVIDIA sebagai cadangan** untuk teks dan gambar dalam mode otomatis.

---

[Buka katalog perintah dan contoh balasan](#katalog-perintah-dan-contoh-balasan) · [Pengujian dan batas verifikasi](IMPLEMENTATION_STATUS.md)

Di grup, sebut atau tag HdyBot untuk meminta fitur dengan bahasa sehari-hari, misalnya “HdyBot, buatkan kuis tentang anatomi jantung”. Di DM, langsung tulis permintaanmu. Perintah bertitik seperti `.jadwal senin` langsung memakai handler jadwal. Tindakan admin, perubahan data sensitif dan penerusan ke grup mengikuti pemeriksaan izin dan konfirmasi masing-masing. Data fitur disimpan melalui layanan aplikasi. Perubahan struktur database mengikuti migrasi Prisma.

## 📋 1. Identitas & Konfigurasi Inti Proyek

| 🏷️ Parameter | 📌 Nilai / Konfigurasi | 📝 Keterangan Operasional |
| :--- | :--- | :--- |
| **🤖 Nama Aplikasi** | `HdyBot` (`HdyBot — Nursing Class A Assistant`) | Asisten AI Akademik & Utilitas Kelas 5A |
| **👑 Owner & Admin Utama** | **Hedy** | Pemegang otoritas penuh kendali bot |
| **📱 Nomor WA Admin** | `082233038659` (`+6282233038659`) | Pusat kontrol operasional melalui DM |
| **🔐 Password Admin WA** | `<password admin dari konfigurasi>` | Ditanyakan otomatis saat Admin chat ke bot |
| **📧 Email Owner** | `wibyjoe12@gmail.com` | Kontak resmi administrator |
| **📲 Nomor WA Bot** | **Bebas / Random / Dinamis** | Bisa ganti nomor kapan saja cukup scan QR baru |
| **🏥 Grup Utama (Target)** | **Nursing Class A** (Semester 5A) | Grup tujuan pengumuman & asisten kelas |
| **📡 Grup Sumber Otomatis** | **PJMK Semester 5** | JID terdaftar. Pesan penting menunggu persetujuan Hedy melalui DM |
| **🧠 Mesin AI Utama** | **OpenAI dan NVIDIA** | Mode otomatis mengutamakan GPT-6 Luna untuk teks dan gambar. |
| **🌏 Zona Waktu & Bahasa** | `Asia/Jakarta` (WIB) — Bahasa Indonesia (`id-ID`) | Akurat lintas tengah malam UTC |
| **🛡️ Keamanan VPS** | **Tanpa `ufw` & Tanpa `fail2ban` & Tanpa Port HTTP** | Installer tidak mengubah akses SSH. Monitoring melalui WhatsApp privat |

---

## 🔄 2. Arsitektur & Pipeline Alur Kerja (AI Workflow Pipelines)

### A. Percakapan grup dan persetujuan relay

Anggota dapat mengetik perintah titik atau menandai HdyBot dan mengajukan pertanyaan. Jawaban mengutip pesan pengirim. Untuk relay, daftarkan JID sumber dan tujuan melalui DM admin. Hedy menerima pratinjau, lalu memilih kirim atau tolak. Lihat alur lengkap di [laporan implementasi](IMPLEMENTATION_STATUS.md).

### Autentikasi dan router AI

Admin yang terdaftar membuka sesi lewat DM untuk perintah terbatas dan menguncinya dengan .logout. Router memilih model sesuai tugas, jenis masukan dan ketersediaan penyedia. OCR lokal menggunakan Tesseract. Perubahan model memerlukan perintah admin tersendiri.

## 🌟 3. Penjelasan Rinci Fitur Operasional Unggulan

### Percakapan dan informasi kelas

Contoh: `.menu`, `@HdyBot jadwal besok?`, `.keperawatan`, `.sdki nyeri akut`, dan `.music fals`. Balasan nongkrong berbentuk percakapan biasa. Pengaturan grup disimpan per JID.

### LMS mahasiswa

Ketik `.lms hedy` di DM atau grup untuk membuka LMS sendiri. Saat pertama kali, hubungkan akun lewat DM. Nomor berasal dari WhatsApp dan nama yang unik di daftar kelas menentukan NIM. Untuk penggunaan berikutnya, cukup ketik nama. Hasil dan file dikirim lewat DM. Installer menyiapkan kunci enkripsi untuk sesi dan menjalankan migrasi PostgreSQL. Lihat [panduan command LMS](docs/LMS_COMMANDS.md) dan [status pengujian](LMS_IMPLEMENTATION_STATUS.md).

### Model AI otomatis

Menu menampilkan perintah yang tersedia di chat tersebut. Gunakan `.help game riwayat` untuk petunjuk subperintah. Bantuan juga mendukung alias seperti `.help hitung`. Katalog di bawah memuat contoh masukan dan balasan setiap handler.

Sapaan seperti `HdyBot halo`, `HdyBot menu`, dan `HdyBot tugas hari ini` mendapat jawaban lokal. Permintaan AI atau pencarian seperti `.ask` dan `.music` yang masih diproses setelah 1,5 detik menampilkan satu pemberitahuan sebelum hasil. Untuk memeriksa keterlambatan di VPS, jalankan `sudo journalctl -u hdybot -g 'Balasan WhatsApp lambat' -n 10 --no-pager`. Kolom `inboundAgeMs` mengukur usia pesan sejak waktu yang tercatat di WhatsApp hingga dispatcher menerimanya. Kolom `handledMs` mengukur waktu pemrosesan sampai pengiriman balasan selesai di sisi bot. Log ini hanya memuat jenis chat dan waktu, maksimal satu per menit untuk balasan lambat.

Untuk memakai dua penyedia, isi `NVIDIA_API_KEY` dan `OPENAI_API_KEY` dalam file `.env` pada mesin bot. Model OpenAI adalah `gpt-6-luna` (teks dan gambar). Dalam mode auto dengan fallback aktif, bot memulai permintaan teks dan gambar dengan GPT-6 Luna. Jika permintaan lambat atau gagal, bot mencoba model NVIDIA yang sesuai dalam sisa waktu permintaan yang sama. Setelah Luna timeout, bot mengutamakan NVIDIA selama 60 detik. Jika NVIDIA juga lambat, Luna dapat mengambil alih lagi. Ambang percobaan awal adalah `AI_PROVIDER_SWITCH_MS=3500` milidetik dan dapat lebih singkat jika anggaran waktu fitur terbatas. Satu kunci saja juga didukung. Pesan dan lampiran yang memerlukan AI dapat diproses oleh kedua penyedia, dan percobaan API dapat dikenai biaya masing-masing.

Isi kunci yang tersedia pada mesin bot dan gunakan `AI_ROUTER_MODE=auto`. Dalam DM admin, `.ai models` menampilkan daftar, `.ai model kimi` memilih model sementara, dan `.ai auto on` mengembalikan pemilihan otomatis. Model dipanggil satu per permintaan dan fallback mengikuti jenis masukan.

| Model utama | Pemakaian di WhatsApp |
| --- | --- |
| GPT-6 Luna (OpenAI) | Pilihan utama untuk teks dan gambar. NVIDIA menjadi cadangan. Bisa dipilih sementara lewat `.ai model luna`. |
| DeepSeek V4.1 Flash | Klasifikasi intent dan ringkasan singkat |
| Nemotron Super-VL | Pertanyaan singkat dan tangkapan layar. Kirim gambar dengan caption `.ask jelaskan tabel ini`, atau kutip gambar dengan perintah itu. |
| Mistral Large 4 | Penyuntingan dengan `.rapikan` dan draf tulisan |
| Nemotron Ultra | Penalaran kompleks, misalnya `.ask jelaskan perbedaan dua konsep` |
| Kimi K3.1 Pro | Teks dokumen Drive yang dapat diekstrak, riset, dan konteks panjang |
| MiniMax M3.1 Flash | Permintaan coding, misalnya `.ask debug skrip Python ini ...` |

Pada 10 November 2026, NVIDIA menampilkan Kimi K3.1 Pro sebagai preview tanpa akses API publik. Jika endpoint menolak Kimi pada jalur NVIDIA, bot dapat meneruskan tugas teks panjang ke Ultra dan dapat mencoba Kimi lagi setelah satu jam. Lightning tetap tersedia untuk konfigurasi lama dan pemilihan manual. Command lokal seperti `.jadwal` dan `.tugas` tetap memakai data bot.

### Tugas, tenggat, dan pengingat H−3 sampai hari H

HdyBot memeriksa pesan penugasan atau tenggat di grup kelas, grup PJMK, dan grup sumber yang admin daftarkan melalui `.groups add <JID> <nama>`, serta DM Hedy yang sudah terautentikasi. Router AI membantu membedakan pengumuman dari obrolan. Tugas hasil deteksi masuk ke antrean privat. Jika tanggal, dosen, atau PJ tidak disebutkan, bot menandainya belum tercatat. Pesan biasa tidak memicu pengumuman ke grup.

Contoh penambahan manual: `.tugas add Keperawatan Gerontik|Makalah lansia|2026-11-16 14:00|Presentasi kelompok|Ibu Sari|Ani`. Gunakan `.tugas detail TUG-3` untuk membaca satu tugas. Hedy menerima pengingat pribadi pada H−3, H−2, H−1, dan hari H. Misalnya, untuk tenggat Senin 16 November pukul 14.00 WIB, pengingat datang tanggal 13, 14, 15, dan 16 November pukul 14.00 WIB. Jika hanya ada tanggal, jadwal hariannya pukul 09.00 WIB. Tugas yang baru tercatat di dalam periode itu langsung diberitahukan. Setelah restart, bot melewati hari yang sudah lewat. Setiap pengiriman ke grup memerlukan konfirmasi baru.

1. Hedy menerima kartu tugas di DM, beserta ID pemberitahuan. Gunakan `.tugas antrean` untuk memeriksanya kembali. Untuk memperbaiki tenggat, gunakan `.tugas deadline TUG-3 2026-11-16 14:00`.
2. Pilih nama atau JID dari `.tugas grup`, lalu ketik, misalnya, `.tugas tujuan TUG-3.1.h3 Praktikum`. Bot menampilkan isi dan tujuan di DM.
3. Balas `.confirm <kode>` untuk mengirim ke grup tersebut. Gunakan `.cancel <kode>` untuk membatalkan pratinjau atau `.tugas tolak <ID>` untuk melewati pemberitahuan. Tugas yang telah selesai, dihapus, atau berubah tenggat tidak dapat dikirim memakai pratinjau lama.

Antrean tenggat disimpan atomik bersama state tugas di `data/runtime/bot-state.json`. Proses tunggal memeriksanya tiap 15 detik dan mengejar notifikasi yang masih relevan setelah restart. Pengiriman membutuhkan WhatsApp terhubung, OUTBOUND_ENABLED aktif, dan DRY_RUN nonaktif. Jika proses terputus di tengah pengiriman, periksa riwayat WhatsApp sebelum tindak lanjut. Gunakan `.tugas ulang <ID>` untuk meminta ulang DM yang gagal atau belum terkonfirmasi. Perintah ini hanya mengirim ke owner. Pengingat lama yang berisi penugasan atau tenggat dialihkan ke antrean owner. Jika tenggat asli belum diketahui, Hedy dapat mengisinya di DM. Grup pilihan mencakup grup tujuan terkonfigurasi dan grup yang sudah dikenali dari pesan masuk.

### Persetujuan Hedy

Gunakan `.setpjmk <jid>` dan `.setkelasa <jid>` dari DM admin. Saat ada pratinjau, kutip pesan itu dan jawab **ya** atau **tidak**. Alternatifnya, gunakan `.relay kirim <id>` atau `.relay tolak <id>`. Hanya pemilik terautentikasi yang dapat mengirim relay ke tujuan yang ditampilkan.

## 🛠️ 4. Cara Instalasi Lengkap (Ubuntu Server / VPS & Lokal)

### 📦 Prasyarat Sistem
- **OS**: Ubuntu Server 22.04 / 24.04 LTS (direkomendasikan untuk produksi 24/7) atau Windows/macOS untuk pengembangan.
- **Runtime**: Node.js 20 mulai 20.19, atau Node.js mulai 22.12. Installer Ubuntu memakai Node.js 22.
- **Browser Headless WA**: Google Chrome Stable (`/usr/bin/google-chrome-stable`) — dipasang otomatis oleh `install.sh`.
- **Database**: PostgreSQL untuk produksi (jadwal, audit, indeks dan worker pengingat). Mode mock tanpa DATABASE_URL membaca seed kelas. State lokal di `data/runtime/bot-state.json` menyimpan tugas, catatan, permainan, dan persetujuan relay.

---

### 🚀 Cara Install Otomatis di Ubuntu Server (Sekali Jalan dengan `install.sh`)

Skrip [`install.sh`](install.sh) sudah dirancang **idempoten**, memasang Node.js dan mengonfigurasi systemd, PostgreSQL, Google Chrome `.deb` asli (bukan Snap), membuat file `.env` dengan password admin default `hedyfake`, menjalankan migrasi + seed jadwal Semester 5A, serta mengaktifkan daemon 24/7 **tanpa `ufw` dan tanpa `fail2ban`** tanpa mengubah akses SSH:

```bash
# 1. Masuk ke folder project
cd /root/hdybot   # atau lokasi folder botwa Anda

# 2. Berikan izin eksekusi & jalankan installer
chmod +x install.sh
sudo ./install.sh
```

Untuk memperbarui instalasi systemd, jalankan `sudo bash install.sh` dari direktori source terbaru. Untuk memilih QR, jalankan `sudo bash install.sh --qr` di konsol privat VPS. Jika sesi belum terhubung dan masih memakai nomor pairing, perintah ini beralih ke QR dengan sesi yang tersimpan. Scan lewat WhatsApp → Perangkat tertaut → Tautkan perangkat. Jika sudah terhubung, konsol langsung memberi tahu.

Untuk kode telepon, gunakan `sudo bash install.sh --pair 08xxxxxxxxxx`. Mode ini menampilkan kode telepon saja. Jika kode gagal atau tidak muncul dalam 25 detik sebelum HP mulai menautkan, bot beralih ke sesi QR baru. Sesudah HP mulai menautkan, terminal menarik kode yang lama dan menampilkan status sinkronisasi. Membuka kembali perintah QR atau kode saat sinkronisasi sudah berlangsung akan memantau proses yang sama. Memilih kode telepon mempertahankan profil yang ada. Bila status `logged_out` muncul kembali sesudah memilih QR, `sudo bash install.sh --reset-wa` mengarsipkan sesi lama dalam backup terenkripsi sebelum membuat sesi baru. Lihat log melalui `sudo bash install.sh --logs`.

---

### ⚙️ Cara Install Manual (Langkah demi Langkah)

```bash
# 1. Install dependensi Node.js
npm install

# 2. Salin konfigurasi environment
cp .env.example .env

# 3. Edit .env (pastikan OWNER_WHATSAPP=082233038659, ADMIN_PASSWORD=hedyfake, dan isi OPENAI_API_KEY serta NVIDIA_API_KEY untuk kedua penyedia)
nano .env

# 4. Generate Prisma Client & build TypeScript ke folder dist/
npx prisma generate
npm run build
```

Contoh isi `.env` penting:
```dotenv
BOT_NAME=HdyBot
BOT_DISPLAY_NAME="HdyBot — Nursing Class A Assistant"
CLASS_NAME="Nursing Class A"
TIMEZONE=Asia/Jakarta

OWNER_NAME=Hedy
OWNER_WHATSAPP=+6282233038659
OWNER_EMAIL=wibyjoe12@gmail.com
ADMIN_WHATSAPP_ALLOWLIST=+6282233038659
ADMIN_PASSWORD=hedyfake
ADMIN_REQUIRE_PASSWORD=true

WHATSAPP_PROVIDER=wwebjs
WHATSAPP_AUTH_DIR=./data/wa-auth
OUTBOUND_ENABLED=true
DRY_RUN=false

NVIDIA_API_KEY=nvapi-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
AI_ROUTER_MODE=auto
AI_FALLBACK_ENABLED=true
```

---

## 🔄 5. Cara Menjalankan Bot 24/7 (Tetap Hidup Saat Keluar Server / Tutup SSH)

Anda dapat memilih **PM2** (`start.js` / `ecosystem.config.cjs`) atau **Systemd (`install.sh`)**.

### 🟢 Opsi 1: Menjalankan 24/7 dengan PM2 (`pm2 start start.js`)

Kami menyediakan entry point satu perintah [`start.js`](start.js) dan [`ecosystem.config.cjs`](ecosystem.config.cjs) yang otomatis memeriksa build TypeScript dan menjaga proses tetap hidup 24/7:

```bash
# Start bot menggunakan start.js
pm2 start start.js --name hdybot

# ATAU menggunakan ecosystem config:
pm2 start ecosystem.config.cjs

# Kunci agar otomatis menyala saat VPS restart / reboot
pm2 save
pm2 startup

# Lihat log aktivitas
pm2 logs hdybot --lines 100
```

**Tabel Perintah Operasional PM2:**

| 💻 Perintah PM2 | 📖 Fungsi |
| :--- | :--- |
| `pm2 start start.js --name hdybot` | Menjalankan HdyBot 24/7 di background |
| `pm2 logs hdybot --lines 100` | Menampilkan log aktivitas bot |
| `pm2 status` | Melihat status hidup/mati, uptime, dan pemakaian RAM |
| `pm2 restart hdybot` | Me-restart bot setelah update kode atau `.env` |
| `pm2 stop hdybot` | Menghentikan bot sementara |

---

### 🔵 Opsi 2: Menjalankan 24/7 dengan `install.sh` (Systemd Ubuntu Server)

| 💻 Perintah `install.sh` | 📖 Fungsi Operasional |
| :--- | :--- |
| `sudo ./install.sh` | Instalasi penuh + build + aktifkan daemon 24/7 + tampilkan QR Code |
| `sudo ./install.sh --qr` | Menampilkan QR atau kode pairing terbaru, status tersambung, atau diagnostik startup |
| `sudo ./install.sh --reset-wa` | Menghapus sesi WA lama, lockfile Chrome, & cache lama lalu menampilkan QR baru yang bersih |
| `sudo ./install.sh --pair 08xxxxxxxxxx` | Menautkan nomor WA Bot menggunakan **Kode Pairing 8-Digit** (tanpa scan kamera QR) |
| `sudo ./install.sh --status` | Memeriksa status service `hdybot.service` di systemd |
| `sudo ./install.sh --logs` | Melihat log live systemd (`journalctl -u hdybot -f`) |
| `sudo ./install.sh --restart` | Me-restart service `hdybot` di background |
| `sudo ./install.sh --cli` | Membuka simulasi chat admin interaktif langsung dari terminal |
| `sudo ./install.sh --uninstall-service` | Menghapus service systemd (database & data tetap aman) |

---

<!-- COMMAND-CATALOG -->
## Katalog perintah dan contoh balasan

Salin contoh dari kolom **Pesan WhatsApp**. Ganti nama, tanggal, kota, atau ID dengan datamu. Tanda pipa memisahkan kolom dalam satu pesan. Alias dalam satu baris menerima argumen yang sama. Di bawah tiap tabel, buka contoh balasan untuk melihat teks dan jenis lampirannya.

Contoh memakai Senin, 9 November 2026 pukul 07.30 WIB. Identitas, nonce, dan beberapa nilai yang berubah disamarkan. Respons NVIDIA, HTTP, serta dokumen Drive berasal dari fixture. Pratinjau jadwal memakai kelas uji tanpa menulis database. Program OS seperti OCR/TTS memerlukan instalasi di host. Balasan konfigurasi menunjukkan prasyarat. Pengujian PostgreSQL terisolasi tersedia melalui scripts/check-schedule-db.mjs.

Percakapan grup juga mengenali mention, nama bot, dan kutipan. Misalnya, “HdyBot, jadwal besok?” menjalankan rute jadwal. Pertanyaan bebas mendapat jawaban percakapan yang mengutip pengirim. Grup sumber mengirim pratinjau ke DM owner. Kutip pratinjau dan balas **ya** untuk mengirim teks yang disetujui atau **tidak** untuk menolak.

| Halaman menu admin | Panduan |
| --- | --- |
| `.menu 1` | [📚 Informasi kelas](#panduan-menu-1) |
| `.menu 2` | [🕒 Jadwal dan tugas](#panduan-menu-2) |
| `.menu 3` | [🧠 Belajar dan materi](#panduan-menu-3) |
| `.menu 4` | [🎮 Permainan](#panduan-menu-4) |
| `.menu 5` | [🎨 Media](#panduan-menu-5) |
| `.menu 6` | [🛠️ Utilitas](#panduan-menu-6) |
| `.menu 7` | [🔐 Administrasi](#panduan-menu-7) |
| `.menu 8` | [🎓 LMS STIKES Husada Jombang](#panduan-menu-8) |

Nomor halaman di chat mengikuti izin kamu. Halaman administrasi tersedia di DM admin.

<a id="panduan-menu-1"></a>

### 📚 Informasi kelas

Data kelas berasal dari daftar dan jadwal yang dikonfigurasi di bot.

| Perintah dan alias | Kegunaan | Pesan WhatsApp | Cara pakai dan akses |
| --- | --- | --- | --- |
| `.kelas`, `.semester`, `.tahunajaran` | Melihat identitas dan ringkasan kelas. | `.kelas` | Kirim tanpa argumen. **Pengguna** |
| `.anggota`, `.mahasiswa`, `.nim` | Mencari nama dan NIM anggota kelas. | `.anggota Contoh` | Kosongkan nama untuk daftar lengkap atau tulis potongan nama. **Pengguna** |
| `.pengurus`, `.ketuakelas`, `.komting`, `.wakilkomting`, `.sekretaris`, `.bendahara`, `.wali`, `.pjmk` | Melihat susunan pengurus dan PJ mata kuliah. | `.pengurus` | Kirim perintah atau pilih alias jabatan. **Pengguna** |
| `.rules`, `.aturan` | Membaca aturan kelas. | `.rules` | Kirim tanpa argumen. **Pengguna** |
| `.faq` | Membaca pertanyaan yang sering diajukan. | `.faq` | Kirim tanpa argumen. **Pengguna** |
| `.matkul` | Melihat daftar mata kuliah beserta jadwal dan pengampu. | `.matkul` | Kirim tanpa argumen. **Pengguna** |
| `.dosen`, `.nomordosen`, `.kontakdosen` | Melihat kontak dan data pengampu. | `.dosen Contoh` | Tulis nama dosen atau kosongkan untuk daftar. **Pengguna** |
| `.kalender`, `.agenda` | Melihat agenda akademik. | `.kalender` | Kirim tanpa argumen. **Pengguna** |

<details>
<summary>Contoh balasan · 📚 Informasi kelas</summary>

**.kelas**

~~~~text
🏥 *Profil Kelas — Nursing Class A*
• Program: *S1 Ilmu Keperawatan (Semester 5A)*
• Tahun Ajaran: *2026/2027 Ganjil*
• KOMTING / Ketua Kelas: *Hedi webiyanto*
• Wakil Komting: -
• Bendahara: *Claudia, Velsy*
• Total Anggota Kelas: *36 Mahasiswa* (ketik `.anggota`)
• Total Kontak Dosen: *23 Dosen* (ketik `.dosen`)
• Total Mata Kuliah Aktif: *7 Matkul (22 SKS)*
~~~~

**.anggota Contoh**

~~~~text
⚠️ Tidak ditemukan anggota kelas dengan kata kunci: *Contoh*. Ketik `.anggota` untuk melihat seluruh 36 mahasiswa.
~~~~

**.pengurus**

~~~~text
👥 *PENGURUS KELAS — NURSING CLASS A (Semester 5A)*
• *KOMTING:* Hedi webiyanto
• *WAKIL KOMTING:*
• *BENDAHARA:* Claudia, Velsy

📚 *PJ MATA KULIAH (PJMK SEMESTER 5A):*
• *DEWASA:* sesilia, Suci
• *ANAK:* Gracia, Dina
• *MENJELANG AJAL:* Ester, Meri
• *KEPERAWATAN AGREGAT:* Meita, Regina
• *ENTREPRENEURSHIP:* Revalina, Alfina
• *METOPEN:* Inneke, Fitri
• *GERONTIK:* rika, Imel
~~~~

**.rules**

~~~~text
📜 *Tata Tertib Grup & Penggunaan HdyBot*
1. Gunakan bahasa yang sopan, jelas, dan saling menghormati sesama mahasiswa & dosen.
2. Pengumuman jadwal, perubahan ruang, dan tugas resmi wajib mencantumkan sumber yang jelas.
3. Dilarang mengirim spam, hoaks, konten NSFW, atau data pribadi sensitif pasien/teman.
4. Seluruh pengiriman pengumuman penting ke grup utama berada di bawah kendali persetujuan Hedy.
~~~~

**.faq**

~~~~text
❓ *FAQ — HdyBot — Nursing Class A Assistant*
• *Bagaimana cara cek jadwal kuliah?* Ketik `.jadwal`, `.besok`, atau `.jadwal senin`.
• *Bagaimana cara membuat stiker?* Kirim/balas gambar dengan caption `.sticker` atau ketik `.ttp <teks>`.
• *Bagaimana cara bertanya materi keperawatan?* Ketik `.ask <pertanyaan>`.
• *Bagaimana cara login admin?* Chat pribadi ke bot dari nomor admin (<nomor privat>) lalu balas password ketika diminta.
~~~~

**.matkul**

~~~~text
*MATA KULIAH · Semester 5A*

*1.*
📗 Mata kuliah: Metodologi Penelitian
🕦 Jadwal: Senin 08:00–09:40, Selasa 12:30–14:10, Kamis 09:40–11:20
👤 Tim pengampu: Facrur Rozi, S.Kep., Ns., M.Kep, Eliza Zihni, S.Kep., Ns., M.Kep, Prawito, S.Kep., Ns., M.Kep, Karisma Dwi Ana, S.Kep., Ns., M.Kep
📖 Kode / SKS: METPEN · 4 SKS

*2.*
📗 Mata kuliah: Keperawatan Anak Sakit dan Kronis dan Terminal
🕦 Jadwal: Senin 09:40–11:20
👤 Tim pengampu: Asri Kusyani, S.Kep., Ns., M.Kep, dr. Alia Astutik, M.Kes, Yusina Vidhiastutik, Ns., M.Kep, Eli Rahmawati, M.Kes
📖 Kode / SKS: KAST · 2 SKS

*3.*
📗 Mata kuliah: Keperawatan Menjelang Ajal
🕦 Jadwal: Senin 12:30–14:10, Rabu 12:30–14:10
👤 Tim pengampu: Aditya Nurdin A, S.Kep., Ns., M.Kep, Dr. Darsini, S.Kep., Ns., M.Kes, Dwi Uswatun, S.Kep., Ns., M.Kep, Eliza Zihni Z, S.Kep., Ns., M.Kep
📖 Kode / SKS: KMA · 3 SKS

*4.*
📗 Mata kuliah: Konsep Keperawatan Agregat Komunitas
🕦 Jadwal: Selasa 08:00–09:40
👤 Tim pengampu: Vendi Kurniawan, S.Kep., Ns., M.Kes, Kusuma Wijaya Ridi P, S.Kep., Ns., MNS, Yusiana Vidhiastutik, S.Kep., Ns., M.Kep, Roni Setyawan, S.Kep., Ns., M.Kep
📖 Kode / SKS: KAK · 2 SKS

*5.*
📗 Mata kuliah: Entrepreneurship 2
🕦 Jadwal: Selasa 09:40–11:20, Kamis 08:00–09:40, Jumat 12:30–14:10
👤 Tim pengampu: Karisma Dwi Ana, Ns., M.Kep, Ardiyanti Hidayah, M.Kes, Masrulloh, S.Kep., Ns., M.Kes, Elis Fatmawati, S.ST., M.Keb, Aris Setyawan
📖 Kode / SKS: ENT2 · 4 SKS

*6.*
📗 Mata kuliah: Keperawatan Gerontik
🕦 Jadwal: Rabu 08:00–09:40, Kamis 12:30–14:10, Jumat 08:00–09:40
👤 Tim pengampu: Kusuma Wijaya Ridi P, S.Kep., Ns., MNS, Yusina Vidhiastutik, S.Kep., Ns., M.Kep, Vendi Eko Kurniawan, S.Kep., Ns., M.Kes, Fachrun Nisa, S.Kep., Ns., M.Kep
📖 Kode / SKS: GERO · 4 SKS

*7.*
📗 Mata kuliah: Keperawatan Dewasa Sistem Muskuloskeletal, Integumen, Persepsi Sensori dan Persyarafan
🕦 Jadwal: Rabu 09:40–11:20, Jumat 09:40–11:20
👤 Tim pengampu: Dr. Darsini, S.Kep., Ns., M.Kes, Nanang Bagus Sasmito, S.Kep., Ns., M.Kep, Gevi Mellya Sari, S.Kep., Ns., M.Kep, Prawito, S.Kep., Ns., M.Kep, Facrur Rozi, S.Kep., Ns., M.Kep, Dwi Uswatun, S.Kep., Ns., M.Kep, Siti Hidayati, M.Kep
📖 Kode / SKS: KDW · 3 SKS

Total: 22 SKS
~~~~

**.dosen Contoh**

~~~~text
📭 Tidak ditemukan nomor dosen dengan kata kunci: *Contoh*. Ketik `.dosen` atau `.nomordosen` untuk daftar lengkap 23 dosen.
~~~~

**.kalender**

~~~~text
🗓️ Belum ada tanggal kalender akademik resmi yang dikonfirmasi di database.
~~~~

</details>

<a id="panduan-menu-2"></a>

### 🕒 Jadwal dan tugas

Gunakan waktu WIB. Pemberitahuan deadline H−3 hingga hari H masuk ke DM owner untuk ditinjau.

| Perintah dan alias | Kegunaan | Pesan WhatsApp | Cara pakai dan akses |
| --- | --- | --- | --- |
| `.jadwal`, `.schedule` | Melihat sesi kuliah hari ini, termasuk jam, dosen dan ruang yang tercatat. | `.jadwal` | Kirim di chat bot atau grup kelas. **Pengguna** |
| `.jadwal hariini`, `.schedule hariini` | Melihat sesi kuliah hari ini, termasuk jam, dosen dan ruang yang tercatat. | `.jadwal hariini` | Kirim di chat bot atau grup kelas. **Pengguna** |
| `.jadwal senin`, `.schedule senin` | Melihat jadwal untuk hari tertentu. | `.jadwal senin` | Ganti senin dengan nama hari. Gunakan nama hari untuk tanggal terdekat. Bentuk .jadwal minggu menunjukkan pekan berjalan. **Pengguna** |
| `.besok` | Melihat jadwal besok menurut WIB. | `.besok` | Kirim tanpa tanggal. **Pengguna** |
| `.jadwal besok`, `.schedule besok` | Melihat jadwal besok menurut WIB. | `.jadwal besok` | Kirim tanpa tanggal. **Pengguna** |
| `.mingguini` | Melihat sesi selama pekan berjalan. | `.mingguini` | Kirim sekali untuk ringkasan sepekan. **Pengguna** |
| `.jadwal minggu`, `.jadwal mingguini`, `.schedule minggu`, `.schedule mingguini` | Melihat sesi selama pekan berjalan. | `.jadwal minggu` | Kirim sekali untuk ringkasan sepekan. **Pengguna** |
| `.kuliahberikutnya` | Mencari sesi terjadwal berikutnya. | `.kuliahberikutnya` | Kirim saat ingin mengetahui jam kuliah terdekat. **Pengguna** |
| `.cekjadwal` | Melihat jadwal pada tanggal tertentu. | `.cekjadwal 2026-11-10` | Masukkan tanggal YYYY-MM-DD. **Pengguna** |
| `.matkulhariini` | Melihat sesi kuliah hari ini, termasuk jam, dosen dan ruang yang tercatat. | `.matkulhariini` | Kirim di chat bot atau grup kelas. **Pengguna** |
| `.dosenhariini` | Melihat sesi kuliah hari ini, termasuk jam, dosen dan ruang yang tercatat. | `.dosenhariini` | Kirim di chat bot atau grup kelas. **Pengguna** |
| `.ruanganhariini` | Melihat sesi kuliah hari ini, termasuk jam, dosen dan ruang yang tercatat. | `.ruanganhariini` | Kirim di chat bot atau grup kelas. **Pengguna** |
| `.jadwal export`, `.schedule export` | Mengekspor data jadwal. | `.jadwal export csv` | Pilih csv atau json setelah kata export. **Pengguna** |
| `.jadwal export`, `.schedule export` | Mengekspor data jadwal. | `.jadwal export json` | Pilih csv atau json setelah kata export. **Pengguna** |
| `.tasks`, `.tugas`, `.deadline`, `.mytask`, `.progress` | Menampilkan daftar tugas di chat. | `.tasks` | Gunakan ID pada kartu untuk membuka detail. **Pengguna** |
| `.tugas list`, `.tasks list`, `.deadline list`, `.mytask list`, `.progress list` | Menampilkan daftar tugas di chat. | `.tugas list` | Gunakan ID pada kartu untuk membuka detail. **Pengguna** |
| `.tugas all`, `.tugas semua`, `.tasks all`, `.deadline all`, `.mytask all`, `.progress all`, `.tasks semua`, `.deadline semua`, `.mytask semua`, `.progress semua` | Melihat tugas aktif dan selesai. | `.tugas all` | Gunakan ketika mencari tugas lama. **Pengguna** |
| `.tugas aktif`, `.tasks aktif`, `.deadline aktif`, `.mytask aktif`, `.progress aktif` | Menampilkan tugas yang belum selesai. | `.tugas aktif` | Kirim tanpa judul tugas. **Pengguna** |
| `.tugas hariini`, `.tasks hariini`, `.deadline hariini`, `.mytask hariini`, `.progress hariini` | Memfilter tugas menurut tenggat hari atau pekan ini. | `.tugas hariini` | Pilih periode sesuai kebutuhan. **Pengguna** |
| `.tugas mingguini`, `.tasks mingguini`, `.deadline mingguini`, `.mytask mingguini`, `.progress mingguini` | Memfilter tugas menurut tenggat hari atau pekan ini. | `.tugas mingguini` | Pilih periode sesuai kebutuhan. **Pengguna** |
| `.tugas detail`, `.tasks detail`, `.deadline detail`, `.mytask detail`, `.progress detail` | Membuka kartu lengkap satu tugas. | `.tugas detail TUG-1` | Ganti TUG-1 dengan ID dari daftar tugas. **Pengguna** |
| `.tugas add`, `.tugas tambah`, `.tasks add`, `.deadline add`, `.mytask add`, `.progress add`, `.tasks tambah`, `.deadline tambah`, `.mytask tambah`, `.progress tambah` | Mencatat tugas beserta tenggat, dosen, dan PJ. | `.tugas add Metodologi\|Makalah\|2026-11-16 14:00\|Kelompok 1\|Ibu Sari\|Ani` | Pisahkan matkul, judul, tenggat WIB, catatan, dosen dan PJ dengan tanda pipa. **Pengguna** |
| `.tambahtugas` | Mencatat tugas beserta tenggat, dosen, dan PJ. | `.tambahtugas Metodologi\|Makalah\|2026-11-16 14:00\|Kelompok 1\|Ibu Sari\|Ani` | Pisahkan matkul, judul, tenggat WIB, catatan, dosen dan PJ dengan tanda pipa. **Pengguna** |
| `.tugas done`, `.tugas selesai`, `.tasks done`, `.deadline done`, `.mytask done`, `.progress done`, `.tasks selesai`, `.deadline selesai`, `.mytask selesai`, `.progress selesai` | Menandai tugas sebagai selesai. | `.tugas done TUG-1` | Gunakan ID tugas yang sudah dikumpulkan. **Pengguna** |
| `.selesaitugas` | Menandai tugas sebagai selesai. | `.selesaitugas TUG-1` | Gunakan ID tugas yang sudah dikumpulkan. **Pengguna** |
| `.tugasaktif` | Menampilkan tugas yang belum selesai. | `.tugasaktif` | Kirim tanpa judul tugas. **Pengguna** |
| `.tugas ulang`, `.tasks ulang`, `.deadline ulang`, `.mytask ulang`, `.progress ulang` | Mengulang pemberitahuan pribadi yang gagal atau belum pasti. | `.tugas ulang TUG-1.1.h3` | Cek riwayat pengiriman sebelum menggunakan ID pemberitahuan. **DM owner** |
| `.tugas del`, `.tugas delete`, `.tugas hapus`, `.tasks del`, `.deadline del`, `.mytask del`, `.progress del`, `.tasks delete`, `.deadline delete`, `.mytask delete`, `.progress delete`, `.tasks hapus`, `.deadline hapus`, `.mytask hapus`, `.progress hapus` | Menghapus tugas dari daftar. | `.tugas del TUG-1` | Gunakan ID tugas yang benar. **Pengguna** |
| `.reminder`, `.reminders` | Melihat pengingat chat saat ini. | `.reminder` | Kirim di chat tempat pengingat dibuat. **Pengguna** |
| `.reminder settings`, `.reminders settings` | Memeriksa pengaturan pengingat. | `.reminder settings` | Kirim di chat yang ingin diperiksa. **Pengguna** |
| `.reminder add`, `.reminder tambah`, `.reminders add`, `.reminders tambah` | Membuat pengingat. | `.reminder add 2026-11-10 08:00\|Diskusi` | Pisahkan tanggal dan jam WIB dari isi pesan dengan tanda pipa. Tenggat akademik masuk alur review owner. **Pengguna** |
| `.reminder add`, `.reminders add` | Membuat pengingat. | `.reminder add 2026-11-16 14:00\|Deadline pendaftaran seminar` | Pisahkan tanggal dan jam WIB dari isi pesan dengan tanda pipa. Tenggat akademik masuk alur review owner. **Pengguna** |
| `.reminder snooze`, `.reminders snooze` | Menunda pengingat. | `.reminder snooze REM-1 15` | Masukkan ID dan jumlah menit. **Pengguna** |
| `.reminder delete`, `.reminder del`, `.reminder hapus`, `.reminders delete`, `.reminders del`, `.reminders hapus` | Membatalkan pengingat terjadwal. | `.reminder delete REM-1` | Gunakan ID dari daftar pengingat. **Pengguna** |
| `.note`, `.catatan` | Melihat catatan chat. | `.note` | Gunakan .note list untuk daftar. **Pengguna** |
| `.note add`, `.note tambah`, `.catatan add`, `.catatan tambah` | Menambahkan catatan. | `.note add Rapat\|Bawa catatan` | Pisahkan judul dan isi dengan tanda pipa. **Pengguna** |
| `.note del`, `.note delete`, `.note hapus`, `.catatan del`, `.catatan delete`, `.catatan hapus` | Menghapus catatan. | `.note del NOTE-1` | Ganti NOTE-1 dengan ID dari daftar. **Pengguna** |

<details>
<summary>Contoh balasan · 🕒 Jadwal dan tugas</summary>

**.jadwal**

~~~~text
*MK Senin 9 November 2026*

🕦 Pukul: 08:00–09:40 WIB
📗 Mata kuliah: Metodologi Penelitian
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Facrur Rozi, S.Kep., Ns., M.Kep, Eliza Zihni, S.Kep., Ns., M.Kep, Prawito, S.Kep., Ns., M.Kep, Karisma Dwi Ana, S.Kep., Ns., M.Kep

🕦 Pukul: 09:40–11:20 WIB
📗 Mata kuliah: Keperawatan Anak Sakit dan Kronis dan Terminal
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Asri Kusyani, S.Kep., Ns., M.Kep, dr. Alia Astutik, M.Kes, Yusina Vidhiastutik, Ns., M.Kep, Eli Rahmawati, M.Kes

🕦 Pukul: 12:30–14:10 WIB
📗 Mata kuliah: Keperawatan Menjelang Ajal
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Aditya Nurdin A, S.Kep., Ns., M.Kep, Dr. Darsini, S.Kep., Ns., M.Kes, Dwi Uswatun, S.Kep., Ns., M.Kep, Eliza Zihni Z, S.Kep., Ns., M.Kep

☕ Istirahat: 11:20–12:30 WIB
~~~~

**.jadwal hariini**

~~~~text
*MK Senin 9 November 2026*

🕦 Pukul: 08:00–09:40 WIB
📗 Mata kuliah: Metodologi Penelitian
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Facrur Rozi, S.Kep., Ns., M.Kep, Eliza Zihni, S.Kep., Ns., M.Kep, Prawito, S.Kep., Ns., M.Kep, Karisma Dwi Ana, S.Kep., Ns., M.Kep

🕦 Pukul: 09:40–11:20 WIB
📗 Mata kuliah: Keperawatan Anak Sakit dan Kronis dan Terminal
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Asri Kusyani, S.Kep., Ns., M.Kep, dr. Alia Astutik, M.Kes, Yusina Vidhiastutik, Ns., M.Kep, Eli Rahmawati, M.Kes

🕦 Pukul: 12:30–14:10 WIB
📗 Mata kuliah: Keperawatan Menjelang Ajal
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Aditya Nurdin A, S.Kep., Ns., M.Kep, Dr. Darsini, S.Kep., Ns., M.Kes, Dwi Uswatun, S.Kep., Ns., M.Kep, Eliza Zihni Z, S.Kep., Ns., M.Kep

☕ Istirahat: 11:20–12:30 WIB
~~~~

**.jadwal senin**

~~~~text
*MK Senin 9 November 2026*

🕦 Pukul: 08:00–09:40 WIB
📗 Mata kuliah: Metodologi Penelitian
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Facrur Rozi, S.Kep., Ns., M.Kep, Eliza Zihni, S.Kep., Ns., M.Kep, Prawito, S.Kep., Ns., M.Kep, Karisma Dwi Ana, S.Kep., Ns., M.Kep

🕦 Pukul: 09:40–11:20 WIB
📗 Mata kuliah: Keperawatan Anak Sakit dan Kronis dan Terminal
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Asri Kusyani, S.Kep., Ns., M.Kep, dr. Alia Astutik, M.Kes, Yusina Vidhiastutik, Ns., M.Kep, Eli Rahmawati, M.Kes

🕦 Pukul: 12:30–14:10 WIB
📗 Mata kuliah: Keperawatan Menjelang Ajal
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Aditya Nurdin A, S.Kep., Ns., M.Kep, Dr. Darsini, S.Kep., Ns., M.Kes, Dwi Uswatun, S.Kep., Ns., M.Kep, Eliza Zihni Z, S.Kep., Ns., M.Kep

☕ Istirahat: 11:20–12:30 WIB
~~~~

**.besok**

~~~~text
*MK Selasa 10 November 2026*

🕦 Pukul: 08:00–09:40 WIB
📗 Mata kuliah: Konsep Keperawatan Agregat Komunitas
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Vendi Kurniawan, S.Kep., Ns., M.Kes, Kusuma Wijaya Ridi P, S.Kep., Ns., MNS, Yusiana Vidhiastutik, S.Kep., Ns., M.Kep, Roni Setyawan, S.Kep., Ns., M.Kep

🕦 Pukul: 09:40–11:20 WIB
📗 Mata kuliah: Entrepreneurship 2
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Karisma Dwi Ana, Ns., M.Kep, Ardiyanti Hidayah, M.Kes, Masrulloh, S.Kep., Ns., M.Kes, Elis Fatmawati, S.ST., M.Keb, Aris Setyawan

🕦 Pukul: 12:30–14:10 WIB
📗 Mata kuliah: Metodologi Penelitian
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Facrur Rozi, S.Kep., Ns., M.Kep, Eliza Zihni, S.Kep., Ns., M.Kep, Prawito, S.Kep., Ns., M.Kep, Karisma Dwi Ana, S.Kep., Ns., M.Kep

☕ Istirahat: 11:20–12:30 WIB
~~~~

**.jadwal besok**

~~~~text
*MK Selasa 10 November 2026*

🕦 Pukul: 08:00–09:40 WIB
📗 Mata kuliah: Konsep Keperawatan Agregat Komunitas
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Vendi Kurniawan, S.Kep., Ns., M.Kes, Kusuma Wijaya Ridi P, S.Kep., Ns., MNS, Yusiana Vidhiastutik, S.Kep., Ns., M.Kep, Roni Setyawan, S.Kep., Ns., M.Kep

🕦 Pukul: 09:40–11:20 WIB
📗 Mata kuliah: Entrepreneurship 2
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Karisma Dwi Ana, Ns., M.Kep, Ardiyanti Hidayah, M.Kes, Masrulloh, S.Kep., Ns., M.Kes, Elis Fatmawati, S.ST., M.Keb, Aris Setyawan

🕦 Pukul: 12:30–14:10 WIB
📗 Mata kuliah: Metodologi Penelitian
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Facrur Rozi, S.Kep., Ns., M.Kep, Eliza Zihni, S.Kep., Ns., M.Kep, Prawito, S.Kep., Ns., M.Kep, Karisma Dwi Ana, S.Kep., Ns., M.Kep

☕ Istirahat: 11:20–12:30 WIB
~~~~

**.mingguini**

~~~~text
*MK Senin 9 November 2026*

🕦 Pukul: 08:00–09:40 WIB
📗 Mata kuliah: Metodologi Penelitian
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Facrur Rozi, S.Kep., Ns., M.Kep, Eliza Zihni, S.Kep., Ns., M.Kep, Prawito, S.Kep., Ns., M.Kep, Karisma Dwi Ana, S.Kep., Ns., M.Kep

🕦 Pukul: 09:40–11:20 WIB
📗 Mata kuliah: Keperawatan Anak Sakit dan Kronis dan Terminal
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Asri Kusyani, S.Kep., Ns., M.Kep, dr. Alia Astutik, M.Kes, Yusina Vidhiastutik, Ns., M.Kep, Eli Rahmawati, M.Kes

🕦 Pukul: 12:30–14:10 WIB
📗 Mata kuliah: Keperawatan Menjelang Ajal
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Aditya Nurdin A, S.Kep., Ns., M.Kep, Dr. Darsini, S.Kep., Ns., M.Kes, Dwi Uswatun, S.Kep., Ns., M.Kep, Eliza Zihni Z, S.Kep., Ns., M.Kep

☕ Istirahat: 11:20–12:30 WIB

━━━━━━━━━━━━

*MK Selasa 10 November 2026*

🕦 Pukul: 08:00–09:40 WIB
📗 Mata kuliah: Konsep Keperawatan Agregat Komunitas
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Vendi Kurniawan, S.Kep., Ns., M.Kes, Kusuma Wijaya Ridi P, S.Kep., Ns., MNS, Yusiana Vidhiastutik, S.Kep., Ns., M.Kep, Roni Setyawan, S.Kep., Ns., M.Kep

🕦 Pukul: 09:40–11:20 WIB
📗 Mata kuliah: Entrepreneurship 2
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Karisma Dwi Ana, Ns., M.Kep, Ardiyanti Hidayah, M.Kes, Masrulloh, S.Kep., Ns., M.Kes, Elis Fatmawati, S.ST., M.Keb, Aris Setyawan

🕦 Pukul: 12:30–14:10 WIB
📗 Mata kuliah: Metodologi Penelitian
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Facrur Rozi, S.Kep., Ns., M.Kep, Eliza Zihni, S.Kep., Ns., M.Kep, Prawito, S.Kep., Ns., M.Kep, Karisma Dwi Ana, S.Kep., Ns., M.Kep

☕ Istirahat: 11:20–12:30 WIB

━━━━━━━━━━━━

*MK Rabu 11 November 2026*

🕦 Pukul: 08:00–09:40 WIB
📗 Mata kuliah: Keperawatan Gerontik
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Kusuma Wijaya Ridi P, S.Kep., Ns., MNS, Yusina Vidhiastutik, S.Kep., Ns., M.Kep, Vendi Eko Kurniawan, S.Kep., Ns., M.Kes, Fachrun Nisa, S.Kep., Ns., M.Kep

🕦 Pukul: 09:40–11:20 WIB
📗 Mata kuliah: Keperawatan Dewasa Sistem Muskuloskeletal, Integumen, Persepsi Sensori dan Persyarafan
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Dr. Darsini, S.Kep., Ns., M.Kes, Nanang Bagus Sasmito, S.Kep., Ns., M.Kep, Gevi Mellya Sari, S.Kep., Ns., M.Kep, Prawito, S.Kep., Ns., M.Kep, Facrur Rozi, S.Kep., Ns., M.Kep, Dwi Uswatun, S.Kep., Ns., M.Kep, Siti Hidayati, M.Kep

🕦 Pukul: 12:30–14:10 WIB
📗 Mata kuliah: Keperawatan Menjelang Ajal
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Aditya Nurdin A, S.Kep., Ns., M.Kep, Dr. Darsini, S.Kep., Ns., M.Kes, Dwi Uswatun, S.Kep., Ns., M.Kep, Eliza Zihni Z, S.Kep., Ns., M.Kep

☕ Istirahat: 11:20–12:30 WIB

━━━━━━━━━━━━

*MK Kamis 12 November 2026*

🕦 Pukul: 08:00–09:40 WIB
📗 Mata kuliah: Entrepreneurship 2
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Karisma Dwi Ana, Ns., M.Kep, Ardiyanti Hidayah, M.Kes, Masrulloh, S.Kep., Ns., M.Kes, Elis Fatmawati, S.ST., M.Keb, Aris Setyawan

🕦 Pukul: 09:40–11:20 WIB
📗 Mata kuliah: Metodologi Penelitian
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Facrur Rozi, S.Kep., Ns., M.Kep, Eliza Zihni, S.Kep., Ns., M.Kep, Prawito, S.Kep., Ns., M.Kep, Karisma Dwi Ana, S.Kep., Ns., M.Kep

🕦 Pukul: 12:30–14:10 WIB
📗 Mata kuliah: Keperawatan Gerontik
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Kusuma Wijaya Ridi P, S.Kep., Ns., MNS, Yusina Vidhiastutik, S.Kep., Ns., M.Kep, Vendi Eko Kurniawan, S.Kep., Ns., M.Kes, Fachrun Nisa, S.Kep., Ns., M.Kep

☕ Istirahat: 11:20–12:30 WIB

━━━━━━━━━━━━

*MK Jumat 13 November 2026*

🕦 Pukul: 08:00–09:40 WIB
📗 Mata kuliah: Keperawatan Gerontik
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Kusuma Wijaya Ridi P, S.Kep., Ns., MNS, Yusina Vidhiastutik, S.Kep., Ns., M.Kep, Vendi Eko Kurniawan, S.Kep., Ns., M.Kes, Fachrun Nisa, S.Kep., Ns., M.Kep

🕦 Pukul: 09:40–11:20 WIB
📗 Mata kuliah: Keperawatan Dewasa Sistem Muskuloskeletal, Integumen, Persepsi Sensori dan Persyarafan
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Dr. Darsini, S.Kep., Ns., M.Kes, Nanang Bagus Sasmito, S.Kep., Ns., M.Kep, Gevi Mellya Sari, S.Kep., Ns., M.Kep, Prawito, S.Kep., Ns., M.Kep, Facrur Rozi, S.Kep., Ns., M.Kep, Dwi Uswatun, S.Kep., Ns., M.Kep, Siti Hidayati, M.Kep

🕦 Pukul: 12:30–14:10 WIB
📗 Mata kuliah: Entrepreneurship 2
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Karisma Dwi Ana, Ns., M.Kep, Ardiyanti Hidayah, M.Kes, Masrulloh, S.Kep., Ns., M.Kes, Elis Fatmawati, S.ST., M.Keb, Aris Setyawan

☕ Istirahat: 11:20–12:30 WIB

━━━━━━━━━━━━

*MK Sabtu 14 November 2026*

Tidak ada kuliah terjadwal.

━━━━━━━━━━━━

*MK Minggu 15 November 2026*

Tidak ada kuliah terjadwal.
~~~~

**.jadwal minggu**

~~~~text
*MK Senin 9 November 2026*

🕦 Pukul: 08:00–09:40 WIB
📗 Mata kuliah: Metodologi Penelitian
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Facrur Rozi, S.Kep., Ns., M.Kep, Eliza Zihni, S.Kep., Ns., M.Kep, Prawito, S.Kep., Ns., M.Kep, Karisma Dwi Ana, S.Kep., Ns., M.Kep

🕦 Pukul: 09:40–11:20 WIB
📗 Mata kuliah: Keperawatan Anak Sakit dan Kronis dan Terminal
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Asri Kusyani, S.Kep., Ns., M.Kep, dr. Alia Astutik, M.Kes, Yusina Vidhiastutik, Ns., M.Kep, Eli Rahmawati, M.Kes

🕦 Pukul: 12:30–14:10 WIB
📗 Mata kuliah: Keperawatan Menjelang Ajal
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Aditya Nurdin A, S.Kep., Ns., M.Kep, Dr. Darsini, S.Kep., Ns., M.Kes, Dwi Uswatun, S.Kep., Ns., M.Kep, Eliza Zihni Z, S.Kep., Ns., M.Kep

☕ Istirahat: 11:20–12:30 WIB

━━━━━━━━━━━━

*MK Selasa 10 November 2026*

🕦 Pukul: 08:00–09:40 WIB
📗 Mata kuliah: Konsep Keperawatan Agregat Komunitas
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Vendi Kurniawan, S.Kep., Ns., M.Kes, Kusuma Wijaya Ridi P, S.Kep., Ns., MNS, Yusiana Vidhiastutik, S.Kep., Ns., M.Kep, Roni Setyawan, S.Kep., Ns., M.Kep

🕦 Pukul: 09:40–11:20 WIB
📗 Mata kuliah: Entrepreneurship 2
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Karisma Dwi Ana, Ns., M.Kep, Ardiyanti Hidayah, M.Kes, Masrulloh, S.Kep., Ns., M.Kes, Elis Fatmawati, S.ST., M.Keb, Aris Setyawan

🕦 Pukul: 12:30–14:10 WIB
📗 Mata kuliah: Metodologi Penelitian
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Facrur Rozi, S.Kep., Ns., M.Kep, Eliza Zihni, S.Kep., Ns., M.Kep, Prawito, S.Kep., Ns., M.Kep, Karisma Dwi Ana, S.Kep., Ns., M.Kep

☕ Istirahat: 11:20–12:30 WIB

━━━━━━━━━━━━

*MK Rabu 11 November 2026*

🕦 Pukul: 08:00–09:40 WIB
📗 Mata kuliah: Keperawatan Gerontik
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Kusuma Wijaya Ridi P, S.Kep., Ns., MNS, Yusina Vidhiastutik, S.Kep., Ns., M.Kep, Vendi Eko Kurniawan, S.Kep., Ns., M.Kes, Fachrun Nisa, S.Kep., Ns., M.Kep

🕦 Pukul: 09:40–11:20 WIB
📗 Mata kuliah: Keperawatan Dewasa Sistem Muskuloskeletal, Integumen, Persepsi Sensori dan Persyarafan
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Dr. Darsini, S.Kep., Ns., M.Kes, Nanang Bagus Sasmito, S.Kep., Ns., M.Kep, Gevi Mellya Sari, S.Kep., Ns., M.Kep, Prawito, S.Kep., Ns., M.Kep, Facrur Rozi, S.Kep., Ns., M.Kep, Dwi Uswatun, S.Kep., Ns., M.Kep, Siti Hidayati, M.Kep

🕦 Pukul: 12:30–14:10 WIB
📗 Mata kuliah: Keperawatan Menjelang Ajal
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Aditya Nurdin A, S.Kep., Ns., M.Kep, Dr. Darsini, S.Kep., Ns., M.Kes, Dwi Uswatun, S.Kep., Ns., M.Kep, Eliza Zihni Z, S.Kep., Ns., M.Kep

☕ Istirahat: 11:20–12:30 WIB

━━━━━━━━━━━━

*MK Kamis 12 November 2026*

🕦 Pukul: 08:00–09:40 WIB
📗 Mata kuliah: Entrepreneurship 2
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Karisma Dwi Ana, Ns., M.Kep, Ardiyanti Hidayah, M.Kes, Masrulloh, S.Kep., Ns., M.Kes, Elis Fatmawati, S.ST., M.Keb, Aris Setyawan

🕦 Pukul: 09:40–11:20 WIB
📗 Mata kuliah: Metodologi Penelitian
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Facrur Rozi, S.Kep., Ns., M.Kep, Eliza Zihni, S.Kep., Ns., M.Kep, Prawito, S.Kep., Ns., M.Kep, Karisma Dwi Ana, S.Kep., Ns., M.Kep

🕦 Pukul: 12:30–14:10 WIB
📗 Mata kuliah: Keperawatan Gerontik
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Kusuma Wijaya Ridi P, S.Kep., Ns., MNS, Yusina Vidhiastutik, S.Kep., Ns., M.Kep, Vendi Eko Kurniawan, S.Kep., Ns., M.Kes, Fachrun Nisa, S.Kep., Ns., M.Kep

☕ Istirahat: 11:20–12:30 WIB

━━━━━━━━━━━━

*MK Jumat 13 November 2026*

🕦 Pukul: 08:00–09:40 WIB
📗 Mata kuliah: Keperawatan Gerontik
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Kusuma Wijaya Ridi P, S.Kep., Ns., MNS, Yusina Vidhiastutik, S.Kep., Ns., M.Kep, Vendi Eko Kurniawan, S.Kep., Ns., M.Kes, Fachrun Nisa, S.Kep., Ns., M.Kep

🕦 Pukul: 09:40–11:20 WIB
📗 Mata kuliah: Keperawatan Dewasa Sistem Muskuloskeletal, Integumen, Persepsi Sensori dan Persyarafan
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Dr. Darsini, S.Kep., Ns., M.Kes, Nanang Bagus Sasmito, S.Kep., Ns., M.Kep, Gevi Mellya Sari, S.Kep., Ns., M.Kep, Prawito, S.Kep., Ns., M.Kep, Facrur Rozi, S.Kep., Ns., M.Kep, Dwi Uswatun, S.Kep., Ns., M.Kep, Siti Hidayati, M.Kep

🕦 Pukul: 12:30–14:10 WIB
📗 Mata kuliah: Entrepreneurship 2
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Karisma Dwi Ana, Ns., M.Kep, Ardiyanti Hidayah, M.Kes, Masrulloh, S.Kep., Ns., M.Kes, Elis Fatmawati, S.ST., M.Keb, Aris Setyawan

☕ Istirahat: 11:20–12:30 WIB

━━━━━━━━━━━━

*MK Sabtu 14 November 2026*

Tidak ada kuliah terjadwal.

━━━━━━━━━━━━

*MK Minggu 15 November 2026*

Tidak ada kuliah terjadwal.
~~~~

**.kuliahberikutnya**

~~~~text
*MK Senin 9 November 2026*

🕦 Pukul: 08:00–09:40 WIB
📗 Mata kuliah: Metodologi Penelitian
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Facrur Rozi, S.Kep., Ns., M.Kep, Eliza Zihni, S.Kep., Ns., M.Kep, Prawito, S.Kep., Ns., M.Kep, Karisma Dwi Ana, S.Kep., Ns., M.Kep

☕ Istirahat: 11:20–12:30 WIB
~~~~

**.cekjadwal 2026-11-10**

~~~~text
*MK Selasa 10 November 2026*

🕦 Pukul: 08:00–09:40 WIB
📗 Mata kuliah: Konsep Keperawatan Agregat Komunitas
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Vendi Kurniawan, S.Kep., Ns., M.Kes, Kusuma Wijaya Ridi P, S.Kep., Ns., MNS, Yusiana Vidhiastutik, S.Kep., Ns., M.Kep, Roni Setyawan, S.Kep., Ns., M.Kep

🕦 Pukul: 09:40–11:20 WIB
📗 Mata kuliah: Entrepreneurship 2
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Karisma Dwi Ana, Ns., M.Kep, Ardiyanti Hidayah, M.Kes, Masrulloh, S.Kep., Ns., M.Kes, Elis Fatmawati, S.ST., M.Keb, Aris Setyawan

🕦 Pukul: 12:30–14:10 WIB
📗 Mata kuliah: Metodologi Penelitian
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Facrur Rozi, S.Kep., Ns., M.Kep, Eliza Zihni, S.Kep., Ns., M.Kep, Prawito, S.Kep., Ns., M.Kep, Karisma Dwi Ana, S.Kep., Ns., M.Kep

☕ Istirahat: 11:20–12:30 WIB
~~~~

**.matkulhariini**

~~~~text
*MK Senin 9 November 2026*

🕦 Pukul: 08:00–09:40 WIB
📗 Mata kuliah: Metodologi Penelitian
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Facrur Rozi, S.Kep., Ns., M.Kep, Eliza Zihni, S.Kep., Ns., M.Kep, Prawito, S.Kep., Ns., M.Kep, Karisma Dwi Ana, S.Kep., Ns., M.Kep

🕦 Pukul: 09:40–11:20 WIB
📗 Mata kuliah: Keperawatan Anak Sakit dan Kronis dan Terminal
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Asri Kusyani, S.Kep., Ns., M.Kep, dr. Alia Astutik, M.Kes, Yusina Vidhiastutik, Ns., M.Kep, Eli Rahmawati, M.Kes

🕦 Pukul: 12:30–14:10 WIB
📗 Mata kuliah: Keperawatan Menjelang Ajal
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Aditya Nurdin A, S.Kep., Ns., M.Kep, Dr. Darsini, S.Kep., Ns., M.Kes, Dwi Uswatun, S.Kep., Ns., M.Kep, Eliza Zihni Z, S.Kep., Ns., M.Kep

☕ Istirahat: 11:20–12:30 WIB
~~~~

**.dosenhariini**

~~~~text
*MK Senin 9 November 2026*

🕦 Pukul: 08:00–09:40 WIB
📗 Mata kuliah: Metodologi Penelitian
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Facrur Rozi, S.Kep., Ns., M.Kep, Eliza Zihni, S.Kep., Ns., M.Kep, Prawito, S.Kep., Ns., M.Kep, Karisma Dwi Ana, S.Kep., Ns., M.Kep

🕦 Pukul: 09:40–11:20 WIB
📗 Mata kuliah: Keperawatan Anak Sakit dan Kronis dan Terminal
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Asri Kusyani, S.Kep., Ns., M.Kep, dr. Alia Astutik, M.Kes, Yusina Vidhiastutik, Ns., M.Kep, Eli Rahmawati, M.Kes

🕦 Pukul: 12:30–14:10 WIB
📗 Mata kuliah: Keperawatan Menjelang Ajal
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Aditya Nurdin A, S.Kep., Ns., M.Kep, Dr. Darsini, S.Kep., Ns., M.Kes, Dwi Uswatun, S.Kep., Ns., M.Kep, Eliza Zihni Z, S.Kep., Ns., M.Kep

☕ Istirahat: 11:20–12:30 WIB
~~~~

**.ruanganhariini**

~~~~text
*MK Senin 9 November 2026*

🕦 Pukul: 08:00–09:40 WIB
📗 Mata kuliah: Metodologi Penelitian
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Facrur Rozi, S.Kep., Ns., M.Kep, Eliza Zihni, S.Kep., Ns., M.Kep, Prawito, S.Kep., Ns., M.Kep, Karisma Dwi Ana, S.Kep., Ns., M.Kep

🕦 Pukul: 09:40–11:20 WIB
📗 Mata kuliah: Keperawatan Anak Sakit dan Kronis dan Terminal
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Asri Kusyani, S.Kep., Ns., M.Kep, dr. Alia Astutik, M.Kes, Yusina Vidhiastutik, Ns., M.Kep, Eli Rahmawati, M.Kes

🕦 Pukul: 12:30–14:10 WIB
📗 Mata kuliah: Keperawatan Menjelang Ajal
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Aditya Nurdin A, S.Kep., Ns., M.Kep, Dr. Darsini, S.Kep., Ns., M.Kes, Dwi Uswatun, S.Kep., Ns., M.Kep, Eliza Zihni Z, S.Kep., Ns., M.Kep

☕ Istirahat: 11:20–12:30 WIB
~~~~

**.jadwal export csv**

~~~~text
📤 *Export Jadwal 5A (CSV):*
```csv
Hari,Mulai,Selesai,Kode,Mata Kuliah,SKS
Senin,08:00,09:40,METPEN,"Metodologi Penelitian",4
Senin,09:40,11:20,KAST,"Keperawatan Anak Sakit dan Kronis dan Terminal",2
Senin,12:30,14:10,KMA,"Keperawatan Menjelang Ajal",3
Selasa,08:00,09:40,KAK,"Konsep Keperawatan Agregat Komunitas",2
Selasa,09:40,11:20,ENT2,"Entrepreneurship 2",4
Selasa,12:30,14:10,METPEN,"Metodologi Penelitian",4
Rabu,08:00,09:40,GERO,"Keperawatan Gerontik",4
Rabu,09:40,11:20,KDW,"Keperawatan Dewasa Sistem Muskuloskeletal, Integumen, Persepsi Sensori dan Persyarafan",3
Rabu,12:30,14:10,KMA,"Keperawatan Menjelang Ajal",3
Kamis,08:00,09:40,ENT2,"Entrepreneurship 2",4
Kamis,09:40,11:20,METPEN,"Metodologi Penelitian",4
Kamis,12:30,14:10,GERO,"Keperawatan Gerontik",4
Jumat,08:00,09:40,GERO,"Keperawatan Gerontik",4
Jumat,09:40,11:20,KDW,"Keperawatan Dewasa Sistem Muskuloskeletal, Integumen, Persepsi Sensori dan Persyarafan",3
Jumat,12:30,14:10,ENT2,"Entrepreneurship 2",4
```
~~~~

**.jadwal export json**

~~~~text
📤 *Export Jadwal 5A (JSON):*
```json
[
  {
    "weekday": "MONDAY",
    "weekdayLabel": "Senin",
    "startTime": "08:00",
    "endTime": "09:40",
    "courseCode": "METPEN",
    "courseName": "Metodologi Penelitian",
    "creditsSks": 4,
    "room": null,
    "lecturerCandidates": [
      "Facrur Rozi, S.Kep., Ns., M.Kep",
      "Eliza Zihni, S.Kep., Ns., M.Kep",
      "Prawito, S.Kep., Ns., M.Kep",
      "Karisma Dwi Ana, S.Kep., Ns., M.Kep"
    ],
    "assignedLecturers": [],
    "status": "USER_PROVIDED_PENDING_CONFIRMATION"
  },
  {
    "weekday": "MONDAY",
    "weekdayLabel": "Senin",
    "startTime": "09:40",
    "endTime": "11:20",
    "courseCode": "KAST",
    "courseName": "Keperawatan Anak Sakit dan Kronis dan Terminal",
    "creditsSks": 2,
    "room": null,
    "lecturerCandidates": [
      "Asri Kusyani, S.Kep., Ns., M.Kep",
      "dr. Alia Astutik, M.Kes",
      "Yusina Vidhiastutik, Ns., M.Kep",
      "Eli Rahmawati, M.Kes"
    ],
    "assignedLecturers": [],
    "status": "USER_PROVIDED_PENDING_CONFIRMATION"
  },
  {
    "weekday": "MONDAY",
    "weekdayLabel": "Senin",
    "startTime": "12:30",
    "endTime": "14:10",
    "courseCode": "KMA",
    "courseName": "Keperawatan Menjelang Ajal",
    "creditsSks": 3,
    "room": null,
    "lecturerCandidates": [
      "Aditya Nurdin A, S.Kep., Ns., M.Kep",
      "Dr. Darsini, S.Kep., Ns., M.Kes",
      "Dwi Uswatun, S.Kep., Ns., M.Kep",
      "Eliza Zihni Z, S.Kep., Ns., M.Kep"
    ],
    "assignedLecturers": [],
    "status": "USER_PROVIDED_PENDING_CONFIRMATION"
  },
  {
    "weekday": "TUESDAY",
    "weekdayLabel": "Selasa",
    "startTime": "08:00",
    "endTime": "09:40",
    "courseCode": "KAK",
    "courseName": "Konsep Keperawatan Agregat Komunitas",
    "creditsSks": 2,
    "room": null,
    "lecturerCandidates": [
      "Vendi Kurniawan, S.Kep., Ns., M.Kes",
      "Kusuma Wijaya Ridi P, S.Kep., Ns., MNS",
      "Yusiana Vidhiastutik, S.Kep., Ns., M.Kep",
      "Roni Setyawan, S.Kep., Ns., M.Kep"
    ],
    "assignedLecturers": [],
    "status": "USER_PROVIDED_PENDING_CONFIRMATION"
  },
  {
    "weekday": "TUESDAY",
    "weekdayLabel": "Selasa",
    "startTime": "09:40",
    "endTime": "11:20",
    "courseCode": "ENT2",
    "courseName": "Entrepreneurship 2",
    "creditsSks": 4,
    "room": null,
    "lecturerCandidates": [
      "Karisma Dwi Ana, Ns., M.Kep",
      "Ardiyanti Hidayah, M.Kes",
      "Masrulloh, S.Kep., Ns., M.Kes",
      "Elis Fatmawati, S.ST., M.Keb",
      "Aris Setyawan"
    ],
    "assignedLecturers": [],
    "status": "USER_PROVIDED_PENDING_CONFIRMATION"
  },
  {
    "weekday": "TUESDAY",
    "weekdayLabel": "Selasa",
    "startTime": "12:30",
    "endTime": "14:10",
    "courseCode": "METPEN",
    "courseName": "Metodologi Penelitian",
    "creditsSks": 4,
    "room": null,
    "lecturerCandidates": [
      "Facrur Rozi, S.Kep., Ns., M.Kep",
      "Eliza Zihni, S.Kep., Ns., M.Kep",
      "Prawito, S.Kep., Ns., M.Kep",
      "Karisma Dwi Ana, S.Kep., Ns., M.Kep"
    ],
    "assignedLecturers": [],
    "status": "USER_PROVIDED_PENDING_CONFIRMATION"
  },
  {
    "weekday": "WEDNESDAY",
    "weekdayLabel": "Rabu",
    "startTime": "08:00",
    "endTime": "09:40",
    "courseCode": "GERO",
    "courseName": "Keperawatan Gerontik",
    "creditsSks": 4,
    "room": null,
    "lecturerCandidates": [
      "Kusuma Wijaya Ridi P, S.Kep., Ns., MNS",
      "Yusina Vidhiastutik, S.Kep., Ns., M.Kep",
      "Vendi Eko Kurniawan, S.Kep., Ns., M.Kes",
      "Fachrun Nisa, S.Kep., Ns., M.Kep"
    ],
    "assignedLecturers": [],
    "status": "USER_PROVIDED_PENDING_CONFIRMATION"
  },
  {
    "weekday": "WEDNESDAY",
    "weekdayLabel": "Rabu",
    "startTime": "09:40",
    "endTime": "11:20",
    "courseCode": "KDW",
    "courseName": "Keperawatan Dewasa Sistem Muskuloskeletal, Integumen, Persepsi Sensori dan Persyarafan",
    "creditsSks": 3,
    "room": null,
    "lecturerCandidates": [
      "Dr. Darsini, S.Kep., Ns., M.Kes",
      "Nanang Bagus Sasmito, S.Kep., Ns., M.Kep",
      "Gevi Mellya Sari, S.Kep., Ns., M.Kep",
      "Prawito, S.Kep., Ns., M.Kep",
      "Facrur Rozi, S.Kep., Ns., M.Kep",
      "Dwi Uswatun, S.Kep., Ns., M.Kep",
      "Siti Hidayati, M.Kep"
    ],
    "assignedLecturers": [],
    "status": "USER_PROVIDED_PENDING_CONFIRMATION"
  },
  {
    "weekday": "WEDNESDAY",
    "weekdayLabel": "Rabu",
    "startTime": "12:30",
    "endTime": "14:10",
    "courseCode": "KMA",
    "courseName": "Keperawatan Menjelang Ajal",
    "creditsSks": 3,
    "room": null,
    "lecturerCandidates": [
      "Aditya Nurdin A, S.Kep., Ns., M.Kep",
      "Dr. Darsini, S.Kep., Ns., M.Kes",
      "Dwi Uswatun, S.Kep., Ns., M.Kep",
      "Eliza Zihni Z, S.Kep., Ns., M.Kep"
    ],
    "assignedLecturers": [],
    "status": "USER_PROVIDED_PENDING_CONFIRMATION"
  },
  {
    "weekday": "THURSDAY",
    "weekdayLabel": "Kamis",
    "startTime": "08:00",
    "endTime": "09:40",
    "courseCode": "ENT2",
    "courseName": "Entrepreneurship 2",
    "creditsSks": 4,
    "room": null,
    "lecturerCandidates": [
      "Karisma Dwi Ana, Ns., M.Kep",
      "Ardiyanti Hidayah, M.Kes",
      "Masrulloh, S.Kep., Ns., M.Kes",
      "Elis Fatmawati, S.ST., M.Keb",
      "Aris Setyawan"
    ],
    "assignedLecturers": [],
    "status": "USER_PROVIDED_PENDING_CONFIRMATION"
  },
  {
    "weekday": "THURSDAY",
    "weekdayLabel": "Kamis",
    "startTime": "09:40",
    "endTime": "11:20",
    "courseCode": "METPEN",
    "courseName": "Metodologi Penelitian",
    "creditsSks": 4,
    "room": null,
    "lecturerCandidates": [
      "Facrur Rozi, S.Kep., Ns., M.Kep",
      "Eliza Zihni, S.Kep., Ns., M.Kep",
      "Prawito, S.Kep., Ns., M.Kep",
      "Karisma Dwi Ana, S.Kep., Ns., M.Kep"
    ],
    "assignedLecturers": [],
    "status": "USER_PROVIDED_PENDING_CONFIRMATION"
  },
  {
    "weekday": "THURSDAY",
    "weekdayLabel": "Kamis",
    "startTime": "12:30",
    "endTime": "14:10",
    "courseCode": "GERO",
    "courseName": "Keperawatan Gerontik",
    "creditsSks": 4,
    "room": null,
    "lecturerCandidates": [
      "Kusuma Wijaya Ridi P, S.Kep., Ns., MNS",
      "Yusina Vidhiastutik, S.Kep., Ns., M.Kep",
      "Vendi Eko Kurniawan, S.Kep., Ns., M.Kes",
      "Fachrun Nisa, S.Kep., Ns., M.Kep"
    ],
    "assignedLecturers": [],
    "status": "USER_PROVIDED_PENDING_CONFIRMATION"
  },
  {
    "weekday": "FRIDAY",
    "weekdayLabel": "Jumat",
    "startTime": "08:00",
    "endTime": "09:40",
    "courseCode": "GERO",
    "courseName": "Keperawatan Gerontik",
    "creditsSks": 4,
    "room": null,
    "lecturerCandidates": [
      "Kusuma Wijaya Ridi P, S.Kep., Ns., MNS",
      "Yusina Vidhiastutik, S.Kep., Ns., M.Kep",
      "Vendi Eko Kurniawan, S.Kep., Ns., M.Kes",
      "Fachrun Nisa, S.Kep., Ns., M.Kep"
    ],
    "assignedLecturers": [],
    "status": "USER_PROVIDED_PENDING_CONFIRMATION"
  },
  {
    "weekday": "FRIDAY",
    "weekdayLabel": "Jumat",
    "startTime": "09:40",
    "endTime": "11:20",
    "courseCode": "KDW",
    "courseName": "Keperawatan Dewasa Sistem Muskuloskeletal, Integumen, Persepsi Sensori dan Persyarafan",
    "creditsSks": 3,
    "room": null,
    "lecturerCandidates": [
      "Dr. Darsini, S.Kep., Ns., M.Kes",
      "Nanang Bagus Sasmito, S.Kep., Ns., M.Kep",
      "Gevi Mellya Sari, S.Kep., Ns., M.Kep",
      "Prawito, S.Kep., Ns., M.Kep",
      "Facrur Rozi, S.Kep., Ns., M.Kep",
      "Dwi Uswatun, S.Kep., Ns., M.Kep",
      "Siti Hidayati, M.Kep"
    ],
    "assignedLecturers": [],
    "status": "USER_PROVIDED_PENDING_CONFIRMATION"
  },
  {
    "weekday": "FRIDAY",
    "weekdayLabel": "Jumat",
    "startTime": "12:30",
    "endTime": "14:10",
    "courseCode": "ENT2",
    "courseName": "Entrepreneurship 2",
    "creditsSks": 4,
    "room": null,
    "lecturerCandidates": [
      "Karisma Dwi Ana, Ns., M.Kep",
      "Ardiyanti Hidayah, M.Kes",
      "Masrulloh, S.Kep., Ns., M.Kes",
      "Elis Fatmawati, S.ST., M.Keb",
      "Aris Setyawan"
    ],
    "assignedLecturers": [],
    "status": "USER_PROVIDED_PENDING_CONFIRMATION"
  }
]
```
~~~~

**.tasks**

~~~~text
*LIST TUGAS*

*1.*
📑 Tugas: Diskusi
🗓️ Deadline: 9 November 2026, pukul 14:00 WIB
🧑‍🏫 Dari dosen: Ibu Sari
📖 Matkul: Metodologi
👨‍🎓 Penanggung jawab: Ani
ID: TUG-1 · Aktif
~~~~

**.tugas list**

~~~~text
*LIST TUGAS*

*1.*
📑 Tugas: Diskusi
🗓️ Deadline: 9 November 2026, pukul 14:00 WIB
🧑‍🏫 Dari dosen: Ibu Sari
📖 Matkul: Metodologi
👨‍🎓 Penanggung jawab: Ani
ID: TUG-1 · Aktif
~~~~

**.tugas all**

~~~~text
*LIST TUGAS*

*1.*
📑 Tugas: Diskusi
🗓️ Deadline: 9 November 2026, pukul 14:00 WIB
🧑‍🏫 Dari dosen: Ibu Sari
📖 Matkul: Metodologi
👨‍🎓 Penanggung jawab: Ani
ID: TUG-1 · Aktif
~~~~

**.tugas aktif**

~~~~text
*LIST TUGAS*

*1.*
📑 Tugas: Diskusi
🗓️ Deadline: 9 November 2026, pukul 14:00 WIB
🧑‍🏫 Dari dosen: Ibu Sari
📖 Matkul: Metodologi
👨‍🎓 Penanggung jawab: Ani
ID: TUG-1 · Aktif
~~~~

**.tugas hariini**

~~~~text
*LIST TUGAS*

*1.*
📑 Tugas: Diskusi
🗓️ Deadline: 9 November 2026, pukul 14:00 WIB
🧑‍🏫 Dari dosen: Ibu Sari
📖 Matkul: Metodologi
👨‍🎓 Penanggung jawab: Ani
ID: TUG-1 · Aktif
~~~~

**.tugas mingguini**

~~~~text
*LIST TUGAS*

*1.*
📑 Tugas: Diskusi
🗓️ Deadline: 9 November 2026, pukul 14:00 WIB
🧑‍🏫 Dari dosen: Ibu Sari
📖 Matkul: Metodologi
👨‍🎓 Penanggung jawab: Ani
ID: TUG-1 · Aktif
~~~~

**.tugas detail TUG-1**

~~~~text
*LIST TUGAS*

*1.*
📑 Tugas: Diskusi
🗓️ Deadline: 9 November 2026, pukul 14:00 WIB
🧑‍🏫 Dari dosen: Ibu Sari
📖 Matkul: Metodologi
👨‍🎓 Penanggung jawab: Ani
ID: TUG-1 · Aktif
~~~~

**.tugas add Metodologi|Makalah|2026-11-16 14:00|Kelompok 1|Ibu Sari|Ani**

~~~~text
✅ Tugas tersimpan.

*1.*
📑 Tugas: Makalah
🗓️ Deadline: 16 November 2026, pukul 14:00 WIB
🧑‍🏫 Dari dosen: Ibu Sari
📖 Matkul: Metodologi
👨‍🎓 Penanggung jawab: Ani
📝 Catatan: Kelompok 1
ID: TUG-2 · Aktif
~~~~

**.tambahtugas Metodologi|Makalah|2026-11-16 14:00|Kelompok 1|Ibu Sari|Ani**

~~~~text
✅ Tugas tersimpan.

*1.*
📑 Tugas: Makalah
🗓️ Deadline: 16 November 2026, pukul 14:00 WIB
🧑‍🏫 Dari dosen: Ibu Sari
📖 Matkul: Metodologi
👨‍🎓 Penanggung jawab: Ani
📝 Catatan: Kelompok 1
ID: TUG-2 · Aktif
~~~~

**.tugas done TUG-1**

~~~~text
✅ Tugas *TUG-1* (Diskusi) ditandai *SELESAI*.
~~~~

**.selesaitugas TUG-1**

~~~~text
✅ Tugas *TUG-1* (Diskusi) ditandai *SELESAI*.
~~~~

**.tugasaktif**

~~~~text
*LIST TUGAS*

*1.*
📑 Tugas: Diskusi
🗓️ Deadline: 9 November 2026, pukul 14:00 WIB
🧑‍🏫 Dari dosen: Ibu Sari
📖 Matkul: Metodologi
👨‍🎓 Penanggung jawab: Ani
ID: TUG-1 · Aktif
~~~~

**.tugas ulang TUG-1.1.h3**

~~~~text
Pemberitahuan belum tersedia atau sudah diproses. Lihat .tugas antrean.
~~~~

**.tugas del TUG-1**

~~~~text
🗑️ Tugas *TUG-1* dihapus.
~~~~

**.reminder**

~~~~text
⏰ *Daftar Pengingat Kustom (1)*
• *REM-1* — 2026-11-10 08:00 WIB: Diskusi
~~~~

**.reminder settings**

~~~~text
Zona waktu Asia/Jakarta. Worker database belum terhubung.
~~~~

**.reminder add 2026-11-10 08:00|Diskusi**

~~~~text
⏰ Pengingat *REM-2* dijadwalkan pada *2026-11-10 08:00 WIB*: _Diskusi_
~~~~

**.reminder add 2026-11-16 14:00|Deadline pendaftaran seminar**

~~~~text
Tenggat tersimpan untuk ditinjau Hedy. ID: TUG-2
~~~~

**.reminder snooze REM-1 15**

~~~~text
💤 Pengingat *REM-1* ditunda 15 menit.
~~~~

**.reminder delete REM-1**

~~~~text
🗑️ Pengingat *REM-1* dibatalkan.
~~~~

**.note**

~~~~text
📝 *Daftar Catatan Kelas (1)*
• *NOTE-1* — *Diskusi*: Bawa buku
~~~~

**.note add Rapat|Bawa catatan**

~~~~text
📝 Catatan *NOTE-2* (Rapat) berhasil disimpan.
~~~~

**.note del NOTE-1**

~~~~text
🗑️ Catatan *NOTE-1* dihapus.
~~~~

</details>

<a id="panduan-menu-3"></a>

### 🧠 Belajar dan materi

Akses Drive mengikuti izin chat. Jawaban LMS pribadi memerlukan izin mahasiswa. Gunakan satuan yang tercantum untuk kalkulator.

| Perintah dan alias | Kegunaan | Pesan WhatsApp | Cara pakai dan akses |
| --- | --- | --- | --- |
| `.dokumen`, `.materi` | Menampilkan katalog materi. | `.dokumen` | Buka di chat yang mendapat izin jika memakai Drive. **Pengguna** |
| `.carimateri` | Mencari materi berdasarkan kata kunci. | `.carimateri belajar` | Ketik kata yang muncul pada judul atau metadata. **Pengguna** |
| `.materi cari` | Mencari materi berdasarkan kata kunci. | `.materi cari belajar` | Ketik kata yang muncul pada judul atau metadata. **Pengguna** |
| `.materi detail` | Membaca metadata satu materi. | `.materi detail M1` | Salin ID dari hasil pencarian. **Pengguna** |
| `.materi terbaru` | Melihat materi terbaru. | `.materi terbaru` | Kirim di chat yang memiliki akses materi. **Pengguna** |
| `.materi minggu1` | Memfilter materi menurut minggu. | `.materi minggu1` | Gunakan nomor minggu yang dicari. **Pengguna** |
| `.materi halaman` | Membuka halaman katalog. | `.materi halaman 1` | Isi nomor halaman yang diinginkan. **Pengguna** |
| `.drive files` | Menampilkan file dari folder yang diizinkan. | `.drive files` | Salin ID file untuk perintah unduh. **Pengguna** |
| `.drive search` | Mencari materi berdasarkan kata kunci. | `.drive search belajar` | Ketik kata yang muncul pada judul atau metadata. **Pengguna** |
| `.ambilmateri`, `.download` | Mengirim file Drive ke WhatsApp. | `.ambilmateri M1` | Tulis ID dari katalog dalam chat yang diizinkan. File asli PDF/PPT/PPTX dikirim sebagai dokumen bila tersedia. **Pengguna** |
| `.ringkasdokumen` | Merangkum dokumen Drive yang dapat diekstrak. | `.ringkasdokumen M1` | Masukkan ID materi dari katalog. **Pengguna** |
| `.tanyadokumen` | Bertanya berdasarkan isi dokumen Drive. | `.tanyadokumen M1 Apa metode belajar?` | Ketik ID, spasi, lalu pertanyaan. **Pengguna** |
| `.jurnal`, `.carijurnal`, `.journal`, `.scholar`, `.googlescholar`, `.pubmed`, `.garuda` | Mencari artikel ilmiah dan mengirim ringkasan pencarian dalam PDF. | `.jurnal belajar` | Ketik topik atau kutip teks yang ingin dicari. **Pengguna** |
| `.ask`, `.tanya`, `.brainly` | Menjawab pertanyaan belajar. | `.ask Bagaimana cara belajar?` | Tulis pertanyaan atau sertakan gambar dengan caption .ask. **Pengguna** |
| `.ask materi` | Bertanya berdasarkan isi dokumen Drive. | `.ask materi M1 Apa metode belajar?` | Ketik ID, spasi, lalu pertanyaan. **Pengguna** |
| `.rapikan`, `.perbaiki`, `.rewrite`, `.parafrase`, `.koreksi` | Menyunting tulisan. | `.rapikan besok bawa buku` | Kirim teks setelah perintah atau kutip pesan yang akan disunting. **Pengguna** |
| `.summarize`, `.ringkas` | Membuat ringkasan teks. | `.summarize Belajar bersama. Catat hasil diskusi.` | Tempel teks atau balas pesan yang ingin diringkas. **Pengguna** |
| `.flashcard` | Membuat bahan latihan belajar dari topik. | `.flashcard belajar` | Tulis topik. Untuk ronde interaktif yang dapat dijawab, gunakan .game ai. **Pengguna** |
| `.quiz`, `.kuis` | Membuat bahan latihan belajar dari topik. | `.quiz belajar` | Tulis topik. Untuk ronde interaktif yang dapat dijawab, gunakan .game ai. **Pengguna** |
| `.translate`, `.tr` | Menerjemahkan teks. | `.translate en Terima kasih` | Masukkan bahasa tujuan lalu teks. **Pengguna** |
| `.download` | Mengirim file Drive atau mengekspor Google Slides. | `.download M2 pptx` | Ganti M2 dengan ID presentasi dalam chat berizin. Untuk Google Slides, tambahkan pptx agar bot mengirim PowerPoint. Tanpa pilihan format, ekspornya PDF. **Pengguna** |
| `.keperawatan` | Membuka daftar fitur keperawatan. | `.keperawatan` | Pilih kategori atau kalkulator dari balasan. **Pengguna** |
| `.sdki` | Mencari diagnosis keperawatan SDKI. | `.sdki nyeri akut` | Tulis nama diagnosis. **Pengguna** |
| `.sop` | Mencari prosedur keperawatan. | `.sop pasang infus` | Tulis tindakan yang ingin dipelajari. **Pengguna** |
| `.askep` | Mencari sumber asuhan atau pengkajian keperawatan. | `.askep stroke` | Tulis penyakit, kelompok pasien, atau topik. **Pengguna** |
| `.pengkajian` | Mencari sumber asuhan atau pengkajian keperawatan. | `.pengkajian anak` | Tulis penyakit, kelompok pasien, atau topik. **Pengguna** |
| `.penunjang` | Membuka informasi pada kategori keperawatan terkait. | `.penunjang` | Pilih pemeriksaan penunjang, Ukom, kampus, berita, PPNI, edukasi tanpa bias atau keselamatan pasien. **Pengguna** |
| `.ukom` | Membuka informasi pada kategori keperawatan terkait. | `.ukom` | Pilih pemeriksaan penunjang, Ukom, kampus, berita, PPNI, edukasi tanpa bias atau keselamatan pasien. **Pengguna** |
| `.kampus` | Membuka informasi pada kategori keperawatan terkait. | `.kampus` | Pilih pemeriksaan penunjang, Ukom, kampus, berita, PPNI, edukasi tanpa bias atau keselamatan pasien. **Pengguna** |
| `.kuisukom`, `.kuis ukom` | Menampilkan latihan Ukom. | `.kuisukom` | Kirim tanpa argumen untuk contoh latihan. **Pengguna** |
| `.highalert`, `.high alert` | Mencari materi obat high alert. | `.highalert` | Kirim perintah untuk membaca ringkasan dan sumber. **Pengguna** |
| `.safety`, `.patient safety` | Membuka informasi pada kategori keperawatan terkait. | `.safety` | Pilih pemeriksaan penunjang, Ukom, kampus, berita, PPNI, edukasi tanpa bias atau keselamatan pasien. **Pengguna** |
| `.berita` | Membuka informasi pada kategori keperawatan terkait. | `.berita` | Pilih pemeriksaan penunjang, Ukom, kampus, berita, PPNI, edukasi tanpa bias atau keselamatan pasien. **Pengguna** |
| `.ppni` | Membuka informasi pada kategori keperawatan terkait. | `.ppni` | Pilih pemeriksaan penunjang, Ukom, kampus, berita, PPNI, edukasi tanpa bias atau keselamatan pasien. **Pengguna** |
| `.mtb`, `.bias` | Membuka informasi pada kategori keperawatan terkait. | `.mtb` | Pilih pemeriksaan penunjang, Ukom, kampus, berita, PPNI, edukasi tanpa bias atau keselamatan pasien. **Pengguna** |
| `.ebook`, `.download` | Mencari publikasi untuk diunduh. | `.ebook` | Gunakan tanpa ID. Untuk file Drive, .download harus diikuti ID. **Pengguna** |
| `.imt` | Menghitung indeks massa tubuh. | `.imt 65 170` | Isi berat dalam kg dan tinggi dalam cm. **Pengguna** |
| `.gcs` | Menjumlahkan skor Glasgow Coma Scale. | `.gcs E4 V5 M6` | Isi komponen E, V dan M. **Pengguna** |
| `.balance` | Menghitung selisih cairan masuk dan keluar. | `.balance 1800 1500` | Masukkan volume masuk lalu keluar dengan satuan yang sama. **Pengguna** |
| `.tetesan` | Menghitung tetesan infus untuk latihan. | `.tetesan 500 ml 6 jam 20` | Isi volume mL, durasi jam, dan faktor tetes per mL. **Pengguna** |
| `.kalkulatorperawat`, `.kalkulator` | Melihat pilihan kalkulator keperawatan. | `.kalkulatorperawat` | Pilih perhitungan dan isi satuan seperti contoh. **Pengguna** |

<details>
<summary>Contoh balasan · 🧠 Belajar dan materi</summary>

**.dokumen**

~~~~text
📂 *Materi kelas*

Metode belajar.txt
Folder utama · M1

Presentasi kelas
Folder utama · M2

Halaman 1/1
~~~~

**.carimateri belajar**

~~~~text
📂 *Materi kelas*

Metode belajar.txt
Folder utama · M1

Halaman 1/1
~~~~

**.materi cari belajar**

~~~~text
📂 *Materi kelas*

Metode belajar.txt
Folder utama · M1

Halaman 1/1
~~~~

**.materi detail M1**

~~~~text
📂 *Materi kelas*

Metode belajar.txt
ID: M1
Folder utama
text/plain
Diubah: 2026-11-08T00:00:00Z
Unduhan diizinkan
~~~~

**.materi terbaru**

~~~~text
📂 *Materi kelas*

Metode belajar.txt
Folder utama · M1

Presentasi kelas
Folder utama · M2

Halaman 1/1
~~~~

**.materi minggu1**

~~~~text
📂 *Materi kelas*

Tidak ada dokumen yang cocok.
~~~~

**.materi halaman 1**

~~~~text
📂 *Materi kelas*

Metode belajar.txt
Folder utama · M1

Presentasi kelas
Folder utama · M2

Halaman 1/1
~~~~

**.drive files**

~~~~text
📂 *Materi kelas*

Metode belajar.txt
Folder utama · M1

Presentasi kelas
Folder utama · M2

Halaman 1/1
~~~~

**.drive search belajar**

~~~~text
📂 *Materi kelas*

Metode belajar.txt
Folder utama · M1

Halaman 1/1
~~~~

**.ambilmateri M1**

~~~~text
Metode belajar.txt · Belum dikategorikan
[Lampiran text/plain · Metode belajar.txt]
~~~~

**.ringkasdokumen M1**

~~~~text
Contoh respons NVIDIA untuk pengujian format.

📂 Metode belajar.txt · Belum dikategorikan
Bagian teks: bagian 1
~~~~

**.tanyadokumen M1 Apa metode belajar?**

~~~~text
Contoh respons NVIDIA untuk pengujian format.

📂 Metode belajar.txt · Belum dikategorikan
Bagian teks: bagian 1
~~~~

**.jurnal belajar**

~~~~text
🎓 *PENCARIAN JURNAL ILMIAH AI & GOOGLE SCHOLAR*
🔎 Topik: *belajar*

🧠 *Telaah AI (HdyBot):*
Belum ditemukan artikel terverifikasi untuk kueri ini. Tautan di bawah membuka pencarian repositori.

📚 *Daftar Jurnal & Artikel Ilmiah Terindeks:*


🌐 *Link Pencarian Langsung (Google Scholar & Repositori):*
• 🔎 Google Scholar: https://scholar.google.com/scholar?hl=id&q=belajar
• 📄 Google Scholar (Khusus File PDF): https://scholar.google.com/scholar?hl=id&q=belajar%20filetype%3Apdf
• 🇮🇩 Garuda Kemdikbud: https://garuda.kemdikbud.go.id/documents?q=belajar
• 🏥 PubMed / NCBI: https://pubmed.ncbi.nlm.nih.gov/?term=belajar

📎 _Dokumen PDF ringkasan & daftar link jurnal juga dilampirkan langsung pada pesan ini!_
[Lampiran application/pdf · jurnal-belajar.pdf]
~~~~

**.ask Bagaimana cara belajar?**

~~~~text
🤖 *Jawaban AI umum*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.ask materi M1 Apa metode belajar?**

~~~~text
Contoh respons NVIDIA untuk pengujian format.

📂 Metode belajar.txt · Belum dikategorikan
Bagian teks: bagian 1
~~~~

**.rapikan besok bawa buku**

~~~~text
✍️ *Hasil perbaikan teks*

Contoh respons NVIDIA untuk pengujian format.
~~~~

**.summarize Belajar bersama. Catat hasil diskusi.**

~~~~text
📝 *Ringkasan Materi (HdyBot Study Assistant)*
• *Poin Inti:* Contoh respons NVIDIA untuk pengujian format.
• *Panjang Asli:* 37 karakter (2 kalimat)
_Label: Hasil ringkasan bantu belajar._
~~~~

**.flashcard belajar**

~~~~text
📚 *Latihan belajar*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.quiz belajar**

~~~~text
📚 *Latihan belajar*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.translate en Terima kasih**

~~~~text
🌐 *Terjemahan*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.download M2 pptx**

~~~~text
Presentasi kelas · Belum dikategorikan
[Lampiran application/vnd.openxmlformats-officedocument.presentationml.presentation · Presentasi kelas.pptx]
~~~~

**.keperawatan**

~~~~text
*Perpustakaan keperawatan*
SDKI · .sdki nyeri akut
SOP · .sop pasang infus
Kalkulator · .imt, .gcs, .balance, .tetesan
Asuhan · .askep, .pengkajian, .penunjang
Persiapan studi · .ukom, .kuis ukom, .kampus
Keselamatan pasien · .highalert
Berita profesi · .berita, .ppni
Merawat Tanpa Bias · .mtb
Dokumen dan e-book · .download
~~~~

**.sdki nyeri akut**

~~~~text
*Artikel contoh*

Contoh respons NVIDIA untuk pengujian format.

https://perawat.org/nyeri-akut/
~~~~

**.sop pasang infus**

~~~~text
*Artikel contoh*

Contoh respons NVIDIA untuk pengujian format.

https://perawat.org/sop-pemasangan-infus/
~~~~

**.askep stroke**

~~~~text
*ASKEP · Perawat.org*

Belum ditemukan judul yang cocok.

Hasil terkait dari pencarian situs:
Artikel contoh
https://perawat.org/artikel-contoh/

Berkas contoh
https://perawat.org/wp-content/uploads/contoh.pdf

Kerangka latihan umum
1. Data subjektif dan objektif: …
2. Masalah yang didukung data: …
3. Luaran yang akan dinilai: …
4. Rencana tindakan dan evaluasi: …
Contoh format: https://perawat.org/download/

https://perawat.org/?s=askep%20stroke
~~~~

**.pengkajian anak**

~~~~text
*Artikel contoh*

Contoh respons NVIDIA untuk pengujian format.

Lembar latihan
Keluhan dan riwayat: …
Keadaan umum: …
Tanda vital: …
Temuan pemeriksaan: …

https://perawat.org/pengkajian-pasien-baru/
~~~~

**.penunjang**

~~~~text
*PENUNJANG · Perawat.org*

Artikel contoh
https://perawat.org/artikel-contoh/

Berkas contoh
https://perawat.org/wp-content/uploads/contoh.pdf

https://perawat.org/category/pemeriksaan-penunjang/
~~~~

**.ukom**

~~~~text
*UKOM · Perawat.org*

Artikel contoh
https://perawat.org/artikel-contoh/

Berkas contoh
https://perawat.org/wp-content/uploads/contoh.pdf

https://perawat.org/category/ukom/
~~~~

**.kampus**

~~~~text
*KAMPUS · Perawat.org*

Artikel contoh
https://perawat.org/artikel-contoh/

Berkas contoh
https://perawat.org/wp-content/uploads/contoh.pdf

https://perawat.org/category/kampus/
~~~~

**.kuisukom**

~~~~text
*Latihan Ukom · Hitung cairan*

Dalam satu periode, total cairan masuk 1.650 mL dan keluar 1.400 mL. Berapa balance cairannya?

Coba jawab dulu, lalu periksa dengan .balance 1650 1400.

Soal latihan buatan HdyBot. Materi: https://perawat.org/risiko-ketidakseimbangan-cairan/
~~~~

**.highalert**

~~~~text
*Artikel contoh*

Contoh respons NVIDIA untuk pengujian format.

https://perawat.org/3-jenis-obat-high-alert-yang-perlu-diwaspadai-perawat/
~~~~

**.safety**

~~~~text
*SAFETY · Perawat.org*

Artikel contoh
https://perawat.org/artikel-contoh/

Berkas contoh
https://perawat.org/wp-content/uploads/contoh.pdf

https://perawat.org/tag/patient-safety/
~~~~

**.berita**

~~~~text
*BERITA · Perawat.org*

Artikel contoh
https://perawat.org/artikel-contoh/

Berkas contoh
https://perawat.org/wp-content/uploads/contoh.pdf

https://perawat.org/category/berita/
~~~~

**.ppni**

~~~~text
*PPNI · Perawat.org*

Artikel contoh
https://perawat.org/artikel-contoh/

Berkas contoh
https://perawat.org/wp-content/uploads/contoh.pdf

https://perawat.org/category/pojok-ppni/
~~~~

**.mtb**

~~~~text
*MTB · Perawat.org*

Artikel contoh
https://perawat.org/artikel-contoh/

Berkas contoh
https://perawat.org/wp-content/uploads/contoh.pdf

https://perawat.org/category/mtb/

Seri e-book Merawat Tanpa Bias · https://tanpabias.perawat.org/perpustakaan-mtb/
~~~~

**.ebook**

~~~~text
*EBOOK · Perawat.org*

Berkas contoh
https://perawat.org/wp-content/uploads/contoh.pdf

https://perawat.org/download/

Seri e-book Merawat Tanpa Bias · https://tanpabias.perawat.org/perpustakaan-mtb/
~~~~

**.imt 65 170**

~~~~text
IMT = 22,49 kg/m²
https://perawat.org/kalkulator-indeks-massa-tubuh-imt/
~~~~

**.gcs E4 V5 M6**

~~~~text
E4 V5 M6 = GCS 15/15
https://perawat.org/pengkajian-tingkat-kesadaran-gcs-glasgow-coma-scale/
~~~~

**.balance 1800 1500**

~~~~text
Balance cairan tercatat: 300 mL
Masuk 1.800 mL − keluar 1.500 mL.
https://perawat.org/risiko-ketidakseimbangan-cairan/
~~~~

**.tetesan 500 ml 6 jam 20**

~~~~text
28 tetes/menit
500 mL × 20 tetes/mL ÷ 360 menit.
Contoh hitung untuk belajar.
https://perawat.org/kalkulator-tetesan-infus/
~~~~

**.kalkulatorperawat**

~~~~text
*KALKULATOR · Perawat.org*

Artikel contoh
https://perawat.org/artikel-contoh/

Berkas contoh
https://perawat.org/wp-content/uploads/contoh.pdf

https://perawat.org/category/kalkulator/
~~~~

</details>

<a id="panduan-menu-4"></a>

### 🎮 Permainan

Mainkan ronde dan kirim jawaban di chat yang sama. XP dan peringkat mengikuti pengaturan privasi.

| Perintah dan alias | Kegunaan | Pesan WhatsApp | Cara pakai dan akses |
| --- | --- | --- | --- |
| `.faktaunik` | Membaca fakta singkat. | `.faktaunik` | Kirim tanpa argumen. **Pengguna** |
| `.doaharian`, `.ayatkursi` | Membuka doa atau daftar surah. | `.doaharian` | Pilih perintah sesuai bacaan yang dicari. **Pengguna** |
| `.listsurah`, `.quran` | Membuka doa atau daftar surah. | `.listsurah` | Pilih perintah sesuai bacaan yang dicari. **Pengguna** |
| `.jadwalsholat` | Mencari jadwal salat. | `.jadwalsholat Jakarta` | Tulis nama kota. **Pengguna** |
| `.truth` | Meminta pertanyaan atau tantangan permainan. | `.truth` | Kirim saat mendapat giliran. **Pengguna** |
| `.dare` | Meminta pertanyaan atau tantangan permainan. | `.dare` | Kirim saat mendapat giliran. **Pengguna** |
| `.koin`, `.flipcoin` | Mengundi angka dadu atau sisi koin. | `.koin` | Kirim setiap kali ingin mengundi. **Pengguna** |
| `.suit` | Bermain batu, gunting, kertas. | `.suit batu` | Tulis pilihanmu setelah perintah. **Pengguna** |
| `.afk` | Mengatur atau mengakhiri status AFK. | `.afk belajar` | Sertakan alasan saat AFK, lalu kirim .unafk saat kembali. **Pengguna** |
| `.unafk` | Mengatur atau mengakhiri status AFK. | `.unafk` | Sertakan alasan saat AFK, lalu kirim .unafk saat kembali. **Pengguna** |
| `.game` | Membuka daftar permainan dan kategori. | `.game` | Pilih kategori untuk memulai ronde. **Pengguna** |
| `.game list` | Membuka daftar permainan dan kategori. | `.game list` | Pilih kategori untuk memulai ronde. **Pengguna** |
| `.game` | Membuka ruang bermain di chat. | `.game buat 2` | Isi jumlah peserta 2–50 atau gunakan duel untuk dua orang. **Pengguna** |
| `.game` | Masuk atau keluar dari ruang permainan. | `.game gabung` | Kirim di chat tempat sesi dibuat. **Pengguna** |
| `.game` | Masuk atau keluar dari ruang permainan. | `.game keluar` | Kirim di chat tempat sesi dibuat. **Pengguna** |
| `.game` | Memulai ronde ruang. | `.game mulai antonim` | Pembuat sesi memilih kategori. Peserta membalas lewat .jawab. **Pengguna** |
| `.game` | Menghentikan ruang bermain. | `.game stop` | Jalankan sebagai pembuat sesi atau admin. **Pengguna** |
| `.game` | Mengatur kesulitan, kategori, atau durasi ronde. | `.game level easy` | Gunakan pada ruang aktif sebelum memulai ronde. **Pengguna** |
| `.game` | Mengatur kesulitan, kategori, atau durasi ronde. | `.game kategori antonim` | Gunakan pada ruang aktif sebelum memulai ronde. **Pengguna** |
| `.game` | Mengatur kesulitan, kategori, atau durasi ronde. | `.game waktu 45` | Gunakan pada ruang aktif sebelum memulai ronde. **Pengguna** |
| `.game` | Membaca riwayat permainanmu. | `.game riwayat` | Kirim di chat tempat bermain. **Pengguna** |
| `.game` | Memulai soal dari bank permainan. | `.game acak easy` | Tentukan kategori dan tingkat kesulitan yang tersedia. **Pengguna** |
| `.sinonim` | Memulai ronde sesuai jenis teka-teki. | `.sinonim` | Kirim nama permainan lalu balas .jawab di chat yang sama. **Pengguna** |
| `.antonim` | Memulai ronde sesuai jenis teka-teki. | `.antonim` | Kirim nama permainan lalu balas .jawab di chat yang sama. **Pengguna** |
| `.anagram` | Memulai ronde sesuai jenis teka-teki. | `.anagram` | Kirim nama permainan lalu balas .jawab di chat yang sama. **Pengguna** |
| `.tebakemoji` | Memulai ronde sesuai jenis teka-teki. | `.tebakemoji` | Kirim nama permainan lalu balas .jawab di chat yang sama. **Pengguna** |
| `.deretangka` | Memulai ronde sesuai jenis teka-teki. | `.deretangka` | Kirim nama permainan lalu balas .jawab di chat yang sama. **Pengguna** |
| `.asahotak` | Memulai ronde sesuai jenis teka-teki. | `.asahotak` | Kirim nama permainan lalu balas .jawab di chat yang sama. **Pengguna** |
| `.tebakpola` | Memulai ronde sesuai jenis teka-teki. | `.tebakpola` | Kirim nama permainan lalu balas .jawab di chat yang sama. **Pengguna** |
| `.tebakkata` | Memulai ronde sesuai jenis teka-teki. | `.tebakkata` | Kirim nama permainan lalu balas .jawab di chat yang sama. **Pengguna** |
| `.caklontong` | Memulai ronde sesuai jenis teka-teki. | `.caklontong` | Kirim nama permainan lalu balas .jawab di chat yang sama. **Pengguna** |
| `.family100` | Memulai ronde sesuai jenis teka-teki. | `.family100` | Kirim nama permainan lalu balas .jawab di chat yang sama. **Pengguna** |
| `.mathquiz` | Memulai ronde sesuai jenis teka-teki. | `.mathquiz` | Kirim nama permainan lalu balas .jawab di chat yang sama. **Pengguna** |
| `.game komputer` | Memulai soal dari bank permainan. | `.game komputer medium` | Tentukan kategori dan tingkat kesulitan yang tersedia. **Pengguna** |
| `.game matematika` | Memulai soal dari bank permainan. | `.game matematika hard` | Tentukan kategori dan tingkat kesulitan yang tersedia. **Pengguna** |
| `.hint` | Melihat petunjuk ronde aktif. | `.hint` | Kirim setelah permainan dimulai. **Pengguna** |
| `.dailychallenge` | Memulai tantangan harian. | `.dailychallenge` | Jawab sebelum waktu habis. **Pengguna** |
| `.score` | Melihat XP pribadi atau peringkat. | `.score` | Aktifkan penyimpanan skor melalui pengaturan privasi jika diperlukan. **Pengguna** |
| `.jawab` | Mengirim tebakan untuk ronde aktif. | `.jawab abstrak` | Ganti contoh dengan jawabanmu. **Pengguna** |
| `.nyerah`, `.skip` | Menyerah dan membuka jawaban. | `.nyerah` | Kirim di chat tempat ronde berlangsung. **Pengguna** |
| `.leaderboard`, `.lb`, `.level`, `.lvl` | Melihat XP pribadi atau peringkat. | `.leaderboard` | Aktifkan penyimpanan skor melalui pengaturan privasi jika diperlukan. **Pengguna** |
| `.privacy`, `.privacy gamification` | Mengatur penyimpanan skor permainan. | `.privacy on` | Gunakan on untuk ikut atau off untuk menonaktifkan. **Pengguna** |
| `.privacy gamification` | Mengatur penyimpanan skor permainan. | `.privacy gamification off` | Gunakan on untuk ikut atau off untuk menonaktifkan. **Pengguna** |
| `.game ai` | Membuat soal baru bertema dengan GPT atau NVIDIA. | `.game ai anatomi jantung` | Tulis topik. Ketik .hint untuk petunjuk dan .jawab di chat yang sama. **Pengguna** |

<details>
<summary>Contoh balasan · 🎮 Permainan</summary>

**.faktaunik**

~~~~text
🧬 *Fakta Unik Kesehatan & Sains*
Jantung manusia rata-rata berdetak sekitar 100.000 kali per hari dan memompa sekitar 7.500 liter darah.
~~~~

**.doaharian**

~~~~text
🤲 *Doa Sebelum Belajar:*
“Rabbi zidnii ‘ilman warzuqnii fahman, waj’alnii minash-shaalihiin.”
(Ya Allah, tambahkanlah ilmu kepadaku, berikanlah aku pemahaman, dan jadikanlah aku termasuk golongan orang-orang yang saleh).
~~~~

**.listsurah**

~~~~text
📖 *Daftar Surah Pilihan Al-Qur'an*
1. Al-Fatihah (Pembukaan — 7 ayat)
2. Al-Baqarah (Sapi Betina — 286 ayat)
18. Al-Kahfi (Penghuni Gua — 110 ayat)
36. Yasin (Yasin — 83 ayat)
55. Ar-Rahman (Yang Maha Pemurah — 78 ayat)
56. Al-Waqi’ah (Hari Kiamat — 96 ayat)
67. Al-Mulk (Kerajaan — 30 ayat)
93. Ad-Dhuha (Waktu Dhuha — 11 ayat)
94. Al-Insyirah (Kelapangan — 8 ayat)
112. Al-Ikhlas (Ikhlas — 4 ayat)
113. Al-Falaq (Waktu Subuh — 5 ayat)
114. An-Nas (Manusia — 6 ayat)

_Ketik `.doaharian` untuk doa belajar & klinik._
~~~~

**.jadwalsholat Jakarta**

~~~~text
🕌 *Jadwal salat · Jakarta*
09-11-2026 · Asia/Jakarta

Subuh · 04:11
Zuhur · 11:42
Asar · 15:00
Magrib · 17:53
Isya · 19:03

Sumber: AlAdhan · metode Kemenag RI
~~~~

**.truth**

~~~~text
🎯 *TRUTH (Jujur):*
Apa kebiasaan belajar terbaik yang ingin kamu mulai minggu ini?
~~~~

**.dare**

~~~~text
🔥 *DARE (Tantangan Aman):*
Buat 1 pantun semangat belajar untuk teman-teman Nursing Class A!
~~~~

**.koin**

~~~~text
🪙 *Lempar Koin:* Hasilnya adalah *GAMBAR (Tails)*!
~~~~

**.suit batu**

~~~~text
✊✌️✋ *Suit Jepang*
• Kamu: *BATU*
• HdyBot: *GUNTING*
• Hasil: *KAMU MENANG! 🎉*
~~~~

**.afk belajar**

~~~~text
💤 Status *AFK* diaktifkan untuk `<JID pengguna>`
• Alasan: _belajar_
~~~~

**.unafk**

~~~~text
👋 Selamat datang kembali! Status AFK Anda telah dinonaktifkan.
~~~~

**.game**

~~~~text
🎮 *Permainan kelas*
• .tebakkata
• .caklontong
• .family100
• .mathquiz
• .game ai <topik>

.game <kategori> [easy|medium|hard]
sinonim (easy), antonim (easy), anagram (easy), tebakemoji (easy), deretangka (medium), asahotak (medium), tebakpola (hard), komputer (medium), matematika (hard)

Jawab melalui .jawab <teks>.
~~~~

**.game list**

~~~~text
🎮 *Permainan kelas*
• .tebakkata
• .caklontong
• .family100
• .mathquiz
• .game ai <topik>

.game <kategori> [easy|medium|hard]
sinonim (easy), antonim (easy), anagram (easy), tebakemoji (easy), deretangka (medium), asahotak (medium), tebakpola (hard), komputer (medium), matematika (hard)

Jawab melalui .jawab <teks>.
~~~~

**.game buat 2**

~~~~text
🎮 Sesi dibuat. Peserta dapat mengetik .game gabung. Pembuat memulai dengan .game mulai.
~~~~

**.game gabung**

~~~~text
Anda sudah tergabung.
~~~~

**.game keluar**

~~~~text
Sesi ditutup.
~~~~

**.game mulai antonim**

~~~~text
🎮 *antonim · easy*
Apa lawan kata konkret?
Petunjuk: Diawali huruf A.
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

**.game stop**

~~~~text
Sesi ditutup.
~~~~

**.game level easy**

~~~~text
🎮 Peserta 1/2 · acak · easy · 60 detik
~~~~

**.game kategori antonim**

~~~~text
🎮 Peserta 1/2 · antonim · semua level · 60 detik
~~~~

**.game waktu 45**

~~~~text
🎮 Peserta 1/2 · acak · semua level · 45 detik
~~~~

**.game riwayat**

~~~~text
Belum ada riwayat permainan Anda di chat ini.
~~~~

**.game acak easy**

~~~~text
🎮 *tebakemoji · easy*
📚 + 🐛 mengingatkan pada ungkapan apa untuk orang yang gemar membaca?
Petunjuk: Dua kata.
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

**.sinonim**

~~~~text
🎮 *sinonim · easy*
Apa sinonim cermat yang diawali huruf T?
Petunjuk: Enam huruf.
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

**.antonim**

~~~~text
🎮 *antonim · easy*
Apa lawan kata konkret?
Petunjuk: Diawali huruf A.
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

**.anagram**

~~~~text
🎮 *anagram · easy*
Susun I — S — R — U — K menjadi nama benda.
Petunjuk: Digunakan untuk duduk.
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

**.tebakemoji**

~~~~text
🎮 *tebakemoji · easy*
📚 + 🐛 mengingatkan pada ungkapan apa untuk orang yang gemar membaca?
Petunjuk: Dua kata.
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

**.deretangka**

~~~~text
🎮 *deretangka · medium*
Lanjutkan pola 3, 6, 11, 18, …
Petunjuk: Perhatikan selisih antarangka.
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

**.asahotak**

~~~~text
🎮 *asahotak · medium*
Ada 5 tim. Setiap pasang tim bertemu satu kali. Berapa pertandingan?
Petunjuk: Setiap tim menghadapi empat lawan.
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

**.tebakpola**

~~~~text
🎮 *tebakpola · hard*
A, C, F, J, O, … Huruf berikutnya?
Petunjuk: Jarak lompatan bertambah satu.
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

**.tebakkata**

~~~~text
🧩 *Tebak Kata Keperawatan*
Huruf Acak: *D - E - G - I - L - M - O - O - O - T*
Petunjuk: _Ilmu tentang metode atau cara sistematis dalam melaksanakan penelitian ilmiah._
Balas dengan `.jawab <kata>`
~~~~

**.caklontong**

~~~~text
😂 *Teka-Teki Cak Lontong*
Soal: *Orang yang sakit biasanya dibawa ke...*
Petunjuk: Kalau di rumah sakit pun tetap masuk ke ruangan/kamar dulu.
Balas dengan `.jawab <jawaban>`
~~~~

**.family100**

~~~~text
👨‍👩‍👧‍👦 *Survei Family 100 Kelas 5A*
Pertanyaan: *Sebutkan alat yang selalu dibawa mahasiswa keperawatan saat praktikum!*
Petunjuk: Alat pengukur tekanan darah.
Balas dengan `.jawab <jawaban>`
~~~~

**.mathquiz**

~~~~text
🧮 *Kuis Matematika Cepat*
Soal: *Berapakah hasil dari 12 × 10 + 10 ?*
Balas dengan `.jawab <angka>`
~~~~

**.game komputer medium**

~~~~text
🎮 *komputer · medium*
Bilangan biner 1011 bernilai berapa dalam desimal?
Petunjuk: Bobot digit dari kanan: 1, 2, 4, 8.
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

**.game matematika hard**

~~~~text
🎮 *matematika · hard*
Dua dadu adil dilempar. Berapa pasangan berurutan yang jumlahnya delapan?
Petunjuk: Mulai dari (2,6).
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

**.hint**

~~~~text
Diawali huruf A.
~~~~

**.dailychallenge**

~~~~text
🎮 *tebakemoji · easy*
📚 + 🐛 mengingatkan pada ungkapan apa untuk orang yang gemar membaca?
Petunjuk: Dua kata.
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

**.score**

~~~~text
🏅 Skor XP Anda: 0
~~~~

**.jawab abstrak**

~~~~text
🎉 *BENAR!* Jawabannya adalah *ABSTRAK* — Konkret dapat diamati secara langsung. Abstrak merujuk pada gagasan.
~~~~

**.nyerah**

~~~~text
🏳️ Kuis dihentikan. Jawaban yang benar adalah: *ABSTRAK*. Konkret dapat diamati secara langsung. Abstrak merujuk pada gagasan.
~~~~

**.leaderboard**

~~~~text
🏆 *Leaderboard Akademik (Opt-In)*
1. <JID pengguna> — 25 XP (Level 1)
~~~~

**.privacy on**

~~~~text
✅ Anda telah *opt-in* ke fitur XP & Gamification akademik.
~~~~

**.privacy gamification off**

~~~~text
🔒 Fitur Gamification Anda telah *dinonaktifkan (opt-out)* dan data XP Anda dihapus.
~~~~

**.game ai anatomi jantung**

~~~~text
🎮 *Kuis AI · easy*
Organ apa yang memompa darah?
Petunjuk: Terletak di rongga dada.
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

</details>

<a id="panduan-menu-5"></a>

### 🎨 Media

Kirim gambar atau stiker dengan caption perintah, atau balas pesan lampiran dengan perintah yang sesuai.

| Perintah dan alias | Kegunaan | Pesan WhatsApp | Cara pakai dan akses |
| --- | --- | --- | --- |
| `.suratizin` | Membuat draf surat izin. | `.suratizin Ani\|Metodologi\|2026-11-10\|Kegiatan kampus` | Masukkan nama, matkul, tanggal dan alasan, dipisahkan tanda pipa. **Pengguna** |
| `.doc create`, `.doc permission`, `.pdf create`, `.pdf permission` | Membuat draf surat izin. | `.doc create Ani\|Metodologi\|2026-11-10\|Kegiatan kampus` | Masukkan nama, matkul, tanggal dan alasan, dipisahkan tanda pipa. **Pengguna** |
| `.notulensi` | Membuat draf notulensi. | `.notulensi Diskusi\|2026-11-09\|Cek jadwal` | Isi judul rapat, tanggal dan catatan. **Pengguna** |
| `.doc minutes`, `.pdf minutes` | Membuat draf notulensi. | `.doc minutes Diskusi\|2026-11-09\|Cek jadwal` | Isi judul rapat, tanggal dan catatan. **Pengguna** |
| `.doc pdf`, `.pdf`, `.pdf pdf` | Membuat lampiran PDF dari teks. | `.doc pdf Agenda\|Belajar bersama` | Pisahkan judul dan isi dengan tanda pipa. **Pengguna** |
| `.sticker`, `.stiker`, `.s`, `.stickerwm` | Membuat stiker gambar. | `.sticker` | Kirim perintah bersama gambar atau kutip gambar. Dengan gambar. **Pengguna** |
| `.ttp`, `.attp` | Membuat stiker teks. | `.ttp Kelas A` | Tulis kalimat pendek setelah perintah. **Pengguna** |
| `.toimg` | Mengubah stiker menjadi gambar PNG. | `.toimg` | Balas stiker dengan perintah ini. Dengan stiker WebP. **Pengguna** |
| `.blur` | Mengolah gambar. | `.blur` | Kutip gambar lalu pilih efek: kaburkan, balik warna, abu-abu, balik vertikal, balik horizontal, atau kompres. Dengan gambar. **Pengguna** |
| `.invert` | Mengolah gambar. | `.invert` | Kutip gambar lalu pilih efek: kaburkan, balik warna, abu-abu, balik vertikal, balik horizontal, atau kompres. Dengan gambar. **Pengguna** |
| `.grayscale`, `.hitamputih` | Mengolah gambar. | `.grayscale` | Kutip gambar lalu pilih efek: kaburkan, balik warna, abu-abu, balik vertikal, balik horizontal, atau kompres. Dengan gambar. **Pengguna** |
| `.flip` | Mengolah gambar. | `.flip` | Kutip gambar lalu pilih efek: kaburkan, balik warna, abu-abu, balik vertikal, balik horizontal, atau kompres. Dengan gambar. **Pengguna** |
| `.flop` | Mengolah gambar. | `.flop` | Kutip gambar lalu pilih efek: kaburkan, balik warna, abu-abu, balik vertikal, balik horizontal, atau kompres. Dengan gambar. **Pengguna** |
| `.resize` | Mengubah ukuran gambar. | `.resize 128 128` | Kutip gambar lalu tulis lebar dan tinggi dalam piksel. Dengan gambar. **Pengguna** |
| `.compress` | Mengolah gambar. | `.compress` | Kutip gambar lalu pilih efek: kaburkan, balik warna, abu-abu, balik vertikal, balik horizontal, atau kompres. Dengan gambar. **Pengguna** |
| `.quotemaker`, `.makequote`, `.quotesmaker` | Membuat kartu kutipan. | `.quotemaker Tetap belajar\|Kelas A` | Pisahkan kutipan dan nama penulis dengan tanda pipa. **Pengguna** |
| `.kartujadwal` | Membuat kartu jadwal bergambar. | `.kartujadwal senin` | Tambahkan hari, atau gunakan jadwal hari ini. **Pengguna** |
| `.kartuucapan` | Membuat kartu ucapan bergambar. | `.kartuucapan Semangat` | Tulis isi ucapan setelah perintah. **Pengguna** |
| `.gambar`, `.carigambar`, `.img`, `.image`, `.foto`, `.carifoto`, `.pinterest` | Mencari gambar untuk suatu topik. | `.gambar kelas` | Tulis objek yang dicari; periksa sumber pada caption. **Pengguna** |
| `.qr`, `.qrcode` | Membuat gambar QR dari teks atau tautan. | `.qr Halo kelas` | Tempel konten setelah .qr. QR masuk akun WhatsApp tersedia melalui installer VPS. **Pengguna** |
| `.ocr` | Membaca teks pada gambar. | `.ocr` | Kirim atau kutip gambar yang tulisannya terbaca. Perlu gambar dan Tesseract pada server. **Pengguna** |
| `.tts`, `.say` | Mengubah teks menjadi audio. | `.tts Halo kelas` | Tulis kalimat yang ingin dibacakan. Memerlukan espeak-ng dengan suara Indonesia. **Pengguna** |

<details>
<summary>Contoh balasan · 🎨 Media</summary>

**.suratizin Ani|Metodologi|2026-11-10|Kegiatan kampus**

~~~~text
[DRAFT OTOMATIS HDYBOT — BELUM DISAHKAN / BUKAN DOKUMEN RESMI KAMPUS / TANPA TANDA TANGAN DOSEN]

Perihal : Permohonan Izin Tidak Mengikuti Perkuliahan
Kelas   : Nursing Class A (Semester 5A)
Tanggal : 2026-11-10

Yth. Dosen Pengampu Mata Kuliah Metodologi,
Dengan hormat, saya yang bertanda tangan di bawah ini:
• Nama : Ani
• NIM  : (belum diisi)
• Kelas: Nursing Class A (Semester 5A)

Memohon izin untuk tidak dapat mengikuti perkuliahan pada 2026-11-10 dikarenakan: Kegiatan kampus.
Demikian surat permohonan ini dibuat untuk ditinjau dan ditandatangani secara sah oleh mahasiswa terkait.

[DRAFT OTOMATIS HDYBOT — BELUM DISAHKAN / BUKAN DOKUMEN RESMI KAMPUS / TANPA TANDA TANGAN DOSEN]
~~~~

**.doc create Ani|Metodologi|2026-11-10|Kegiatan kampus**

~~~~text
[DRAFT OTOMATIS HDYBOT — BELUM DISAHKAN / BUKAN DOKUMEN RESMI KAMPUS / TANPA TANDA TANGAN DOSEN]

Perihal : Permohonan Izin Tidak Mengikuti Perkuliahan
Kelas   : Nursing Class A (Semester 5A)
Tanggal : 2026-11-10

Yth. Dosen Pengampu Mata Kuliah Metodologi,
Dengan hormat, saya yang bertanda tangan di bawah ini:
• Nama : Ani
• NIM  : (belum diisi)
• Kelas: Nursing Class A (Semester 5A)

Memohon izin untuk tidak dapat mengikuti perkuliahan pada 2026-11-10 dikarenakan: Kegiatan kampus.
Demikian surat permohonan ini dibuat untuk ditinjau dan ditandatangani secara sah oleh mahasiswa terkait.

[DRAFT OTOMATIS HDYBOT — BELUM DISAHKAN / BUKAN DOKUMEN RESMI KAMPUS / TANPA TANDA TANGAN DOSEN]
~~~~

**.notulensi Diskusi|2026-11-09|Cek jadwal**

~~~~text
[DRAFT OTOMATIS HDYBOT — BELUM DISAHKAN / BUKAN DOKUMEN RESMI KAMPUS / TANPA TANDA TANGAN DOSEN]

NOTULENSI KEGIATAN KELAS — NURSING CLASS A (5A)
Kegiatan : Diskusi
Tanggal  : 2026-11-09
Hadir    : 30 orang

Keputusan / Ringkasan:
1. Cek jadwal

[DRAFT OTOMATIS HDYBOT — BELUM DISAHKAN / BUKAN DOKUMEN RESMI KAMPUS / TANPA TANDA TANGAN DOSEN]
~~~~

**.doc minutes Diskusi|2026-11-09|Cek jadwal**

~~~~text
[DRAFT OTOMATIS HDYBOT — BELUM DISAHKAN / BUKAN DOKUMEN RESMI KAMPUS / TANPA TANDA TANGAN DOSEN]

NOTULENSI KEGIATAN KELAS — NURSING CLASS A (5A)
Kegiatan : Diskusi
Tanggal  : 2026-11-09
Hadir    : 30 orang

Keputusan / Ringkasan:
1. Cek jadwal

[DRAFT OTOMATIS HDYBOT — BELUM DISAHKAN / BUKAN DOKUMEN RESMI KAMPUS / TANPA TANDA TANGAN DOSEN]
~~~~

**.doc pdf Agenda|Belajar bersama**

~~~~text
📄 *Dokumen PDF Draft Siap:* Agenda _(DRAFT — perlu review sebelum dikirim resmi)_
[Lampiran application/pdf · agenda-draft.pdf]
~~~~

**.sticker**

~~~~text
🎨 Stiker berhasil dibuat!
[Lampiran image/webp]
~~~~

**.ttp Kelas A**

~~~~text
🎨 Stiker teks: *Kelas A*
[Lampiran image/webp]
~~~~

**.toimg**

~~~~text
🖼️ Stiker berhasil dikonversi menjadi gambar PNG.
[Lampiran image/png · sticker.png]
~~~~

**.blur**

~~~~text
🖼️ Efek gambar *BLUR* selesai diproses.
[Lampiran image/png · hdybot-blur.png]
~~~~

**.invert**

~~~~text
🖼️ Efek gambar *INVERT* selesai diproses.
[Lampiran image/png · hdybot-invert.png]
~~~~

**.grayscale**

~~~~text
🖼️ Efek gambar *GRAYSCALE* selesai diproses.
[Lampiran image/png · hdybot-grayscale.png]
~~~~

**.flip**

~~~~text
🖼️ Efek gambar *FLIP* selesai diproses.
[Lampiran image/png · hdybot-flip.png]
~~~~

**.flop**

~~~~text
🖼️ Efek gambar *FLOP* selesai diproses.
[Lampiran image/png · hdybot-flop.png]
~~~~

**.resize 128 128**

~~~~text
🖼️ Efek gambar *RESIZE* selesai diproses.
[Lampiran image/png · hdybot-resize.png]
~~~~

**.compress**

~~~~text
🖼️ Efek gambar *COMPRESS* selesai diproses.
[Lampiran image/jpeg · hdybot-compress.jpg]
~~~~

**.quotemaker Tetap belajar|Kelas A**

~~~~text
🖼️ Kartu Kutipan: “Tetap belajar” — Kelas A
[Lampiran image/png · quote-card.png]
~~~~

**.kartujadwal senin**

~~~~text
🖼️ Kartu visual *JADWAL KULIAH 5A — SENIN*
[Lampiran image/png · jadwal-5a.png]
~~~~

**.kartuucapan Semangat**

~~~~text
Kartu ucapan kelas
[Lampiran image/png · ucapan.png]
~~~~

**.gambar kelas**

~~~~text
🖼️ *Ilustrasi & Pencarian Gambar — kelas*
• Galeri Google Images: https://www.google.com/search?tbm=isch&q=kelas
• Sumber Referensi: https://www.google.com/search?tbm=isch&q=kelas
[Lampiran image/png · visual-kelas.png]
~~~~

**.qr Halo kelas**

~~~~text
🔳 QR Code untuk: `Halo kelas`
[Lampiran image/png · qrcode.png]
~~~~

**.ocr**

~~~~text
⚠️ Kirim gambar/foto catatan dengan caption `.ocr` (atau balas gambar dengan `.ocr`) untuk mengekstrak teks.
~~~~

**.tts Halo kelas**

~~~~text
Sintesis suara belum tersedia. Periksa instalasi espeak-ng di server.
~~~~

</details>

<a id="panduan-menu-6"></a>

### 🛠️ Utilitas

Contoh berikut menggunakan input uji. Untuk cuaca, musik dan ensiklopedia, hasil langsung bergantung pada layanan terkait.

| Perintah dan alias | Kegunaan | Pesan WhatsApp | Cara pakai dan akses |
| --- | --- | --- | --- |
| `.profile`, `.me` | Melihat profil pengirim. | `.profile` | Jalankan dari akun WhatsApp sendiri. **Pengguna** |
| `.groupid`, `.id` | Menampilkan ID chat saat ini. | `.groupid` | Kirim di grup yang JID-nya ingin diketahui. **Pengguna** |
| `.kelompok`, `.buatkelompok` | Membagi peserta ke dalam kelompok. | `.kelompok 2 Ani,Budi,Citra,Deni` | Masukkan jumlah kelompok lalu nama peserta, dipisahkan koma. **Pengguna** |
| `.countdown` | Menghitung selisih hari menuju tanggal tujuan. | `.countdown 2026-11-16` | Gunakan format YYYY-MM-DD. **Pengguna** |
| `.announce`, `.pengumuman` | Membuka bantuan pengumuman. | `.announce` | Gunakan draft untuk menyiapkan isi. **Pengguna** |
| `.announce draft`, `.announce create`, `.pengumuman draft`, `.pengumuman create` | Menyiapkan draf pengumuman kelas. | `.announce draft penting\|Diskusi\|Bawa catatan` | Pisahkan tingkat kepentingan, judul, dan isi dengan tanda pipa. **Pengguna** |
| `.music`, `.musik` | Mencari musik dan mengirim MP3 lokal yang cocok. | `.music fals` | Tulis judul atau musisi. Tanpa koleksi MP3, balasan berupa hasil atau tautan pencarian. Hasil API memerlukan kredensial SoundCloud. MP3 hanya berasal dari koleksi lokal berizin. **Pengguna** |
| `.ipk`, `.gpa` | Menghitung rata-rata nilai berbobot SKS. | `.ipk 4:4.0, 2:3.5` | Tulis pasangan SKS:nilai, pisahkan tiap matkul dengan koma. **Pengguna** |
| `.bmi` | Menghitung indeks massa tubuh. | `.bmi 65 170` | Isi berat dalam kg dan tinggi dalam cm. **Pengguna** |
| `.calc`, `.hitung`, `.kalkulator` | Menghitung ekspresi aritmetika. | `.calc (2+3)*4` | Tulis rumus dengan angka dan operator. **Pengguna** |
| `.convert`, `.konversi`, `.kurs` | Mengonversi satuan. | `.convert 5 km m` | Urutkan nilai, satuan asal, lalu satuan tujuan. **Pengguna** |
| `.jam`, `.waktu`, `.clock` | Melihat waktu saat ini. | `.jam` | Kirim tanpa argumen. **Pengguna** |
| `.cuaca`, `.weather` | Memeriksa cuaca lokasi. | `.cuaca Jakarta` | Tulis nama kota. **Pengguna** |
| `.wiki`, `.wikipedia`, `.kbbi` | Mencari ringkasan ensiklopedia. | `.wiki belajar` | Tulis istilah yang ingin dicari. **Pengguna** |
| `.urlcheck`, `.shortlink` | Memeriksa kelayakan URL menurut aturan bot. | `.urlcheck https://perawat.org` | Tempel URL lengkap; hasilnya bukan pemindaian malware. **Pengguna** |
| `.pantun` | Membuat pantun. | `.pantun nasehat` | Tambahkan tema jika diinginkan. **Pengguna** |
| `.quotes`, `.quoterandom`, `.katabijak` | Meminta kutipan, motivasi, atau kata hari ini. | `.quotes lucu` | Pilih jenisnya; tambahkan tema jika tersedia. **Pengguna** |
| `.quotesislami` | Meminta kutipan, motivasi, atau kata hari ini. | `.quotesislami` | Pilih jenisnya; tambahkan tema jika tersedia. **Pengguna** |
| `.quotesmotivasi`, `.quotesnasehat` | Meminta kutipan, motivasi, atau kata hari ini. | `.quotesmotivasi` | Pilih jenisnya; tambahkan tema jika tersedia. **Pengguna** |
| `.motivasi` | Meminta kutipan, motivasi, atau kata hari ini. | `.motivasi tema belajar` | Pilih jenisnya; tambahkan tema jika tersedia. **Pengguna** |
| `.katahariini` | Meminta kutipan, motivasi, atau kata hari ini. | `.katahariini tema belajar` | Pilih jenisnya; tambahkan tema jika tersedia. **Pengguna** |
| `.tebak-tebakan` | Meminta konten hiburan sesuai jenis perintah. | `.tebak-tebakan tema belajar` | Ketik tema untuk tebak-tebakan, candaan, rayuan atau cerita. **Pengguna** |
| `.roasting` | Meminta konten hiburan sesuai jenis perintah. | `.roasting tema belajar` | Ketik tema untuk tebak-tebakan, candaan, rayuan atau cerita. **Pengguna** |
| `.gombal` | Meminta konten hiburan sesuai jenis perintah. | `.gombal tema belajar` | Ketik tema untuk tebak-tebakan, candaan, rayuan atau cerita. **Pengguna** |
| `.rayuan` | Meminta konten hiburan sesuai jenis perintah. | `.rayuan tema belajar` | Ketik tema untuk tebak-tebakan, candaan, rayuan atau cerita. **Pengguna** |
| `.cerpen` | Meminta konten hiburan sesuai jenis perintah. | `.cerpen tema belajar` | Ketik tema untuk tebak-tebakan, candaan, rayuan atau cerita. **Pengguna** |
| `.cerita` | Meminta konten hiburan sesuai jenis perintah. | `.cerita tema belajar` | Ketik tema untuk tebak-tebakan, candaan, rayuan atau cerita. **Pengguna** |
| `.dadu` | Mengundi angka dadu atau sisi koin. | `.dadu` | Kirim setiap kali ingin mengundi. **Pengguna** |
| `.apakah` | Memberi jawaban atau penilaian untuk hiburan. | `.apakah belajar bersama` | Ketik pertanyaan atau hal yang ingin dinilai. **Pengguna** |
| `.kapankah` | Memberi jawaban atau penilaian untuk hiburan. | `.kapankah belajar bersama` | Ketik pertanyaan atau hal yang ingin dinilai. **Pengguna** |
| `.bisakah` | Memberi jawaban atau penilaian untuk hiburan. | `.bisakah belajar bersama` | Ketik pertanyaan atau hal yang ingin dinilai. **Pengguna** |
| `.kerangajaib` | Memberi jawaban atau penilaian untuk hiburan. | `.kerangajaib belajar bersama` | Ketik pertanyaan atau hal yang ingin dinilai. **Pengguna** |
| `.rate` | Memberi jawaban atau penilaian untuk hiburan. | `.rate belajar bersama` | Ketik pertanyaan atau hal yang ingin dinilai. **Pengguna** |
| `.hilih` | Mengubah gaya atau susunan teks. | `.hilih Ani` | Tulis teks setelah nama efek. **Pengguna** |
| `.alay` | Mengubah gaya atau susunan teks. | `.alay Ani` | Tulis teks setelah nama efek. **Pengguna** |
| `.besarkecil` | Mengubah gaya atau susunan teks. | `.besarkecil Ani` | Tulis teks setelah nama efek. **Pengguna** |
| `.balikhuruf` | Mengubah gaya atau susunan teks. | `.balikhuruf Ani` | Tulis teks setelah nama efek. **Pengguna** |
| `.namaninja` | Mengubah gaya atau susunan teks. | `.namaninja Ani` | Tulis teks setelah nama efek. **Pengguna** |
| `.stats`, `.activity`, `.report` | Melihat statistik aktivitas. | `.stats week` | Tambahkan periode yang didukung, misalnya week. **Pengguna** |
| `.owner` | Melihat identitas owner yang dikonfigurasi. | `.owner` | Kirim tanpa argumen. **Pengguna** |
| `.about` | Membaca informasi tentang bot. | `.about` | Kirim tanpa argumen. **Pengguna** |
| `.info`, `.ingfo` | Membaca informasi tentang bot. | `.info` | Kirim tanpa argumen. **Pengguna** |
| `.menu`, `.allmenu` | Membuka menu yang sesuai akses pengirim. | `.menu` | Ketik .menu lalu nomor untuk berpindah halaman. **Pengguna** |
| `.help` | Membaca cara pakai suatu perintah. | `.help calc` | Tulis nama perintah atau subperintah setelah .help. **Pengguna** |
| `.cekpesan`, `.klasifikasi` | Menilai isi pesan kelas. | `.cekpesan Perubahan jadwal besok` | Masukkan teks yang ingin diperiksa. **Pengguna** |
| `.admin menu`, `.maintenance menu` | Membuka menu yang sesuai akses pengirim. | `.admin menu` | Ketik .menu lalu nomor untuk berpindah halaman. **Pengguna** |

<details>
<summary>Contoh balasan · 🛠️ Utilitas</summary>

**.profile**

~~~~text
🪪 *Profil Pengguna*
• JID: `<JID pengguna>`
• Nama Tampilan: *Mahasiswa 5A*
• Konteks Chat: *private*
• Status Admin: *Admin Terotorisasi*
~~~~

**.groupid**

~~~~text
🆔 *Informasi Chat/Grup*
• Chat JID: `<JID pengguna>`
• Tipe: *private*
• Pengirim Terdeteksi: `<JID pengguna>`
~~~~

**.kelompok 2 Ani,Budi,Citra,Deni**

~~~~text
👥 *Hasil Pembagian Kelompok Adil (2 Kelompok — Total 4 Mahasiswa)*
*Kelompok 1* (Ketua: Ani):
Anggota: Ani, Citra

*Kelompok 2* (Ketua: Budi):
Anggota: Budi, Deni
~~~~

**.countdown 2026-11-16**

~~~~text
⏳ Hitung mundur menuju *2026-11-16*: *7 hari*.
~~~~

**.announce**

~~~~text
📢 Belum ada riwayat draft pengumuman. Buat dengan `.announce draft penting|Judul|Isi`.
~~~~

**.announce draft penting|Diskusi|Bawa catatan**

~~~~text
📢 *Draft Pengumuman Dibuat (ANN-1)*
• Prioritas: *PENTING*
• Judul: *Diskusi*
• Isi: Bawa catatan
~~~~

**.music fals**

~~~~text
Cari “fals” di SoundCloud
https://soundcloud.com/search/sounds?q=fals
~~~~

**.ipk 4:4.0, 2:3.5**

~~~~text
🎓 *Kalkulator IP/IPK*: Total *6 SKS* → IP = *3.83*
~~~~

**.bmi 65 170**

~~~~text
⚖️ *Kalkulator BMI Edukatif*: BMI = *22.5* (Kategori: *Normal*).
~~~~

**.calc (2+3)\*4**

~~~~text
🧮 *Hasil Kalkulator:*
`(2+3)*4` = *20*
~~~~

**.convert 5 km m**

~~~~text
📏 *Konversi Panjang:* 5 km = *5000 m*
~~~~

**.jam**

~~~~text
🕒 *Informasi Waktu Nasional & Dunia*
• *WIB (Asia/Jakarta):* Senin, 09 Nov 2026, 07.30.00
• *WITA (Asia/Makassar):* Senin, 09 Nov 2026, 08.30.00
• *WIT (Asia/Jayapura):* Senin, 09 Nov 2026, 09.30.00
• *UTC:* 2026-11-09T00:30:00.000Z
~~~~

**.cuaca Jakarta**

~~~~text
🌤️ *Cuaca Saat Ini — Jakarta*
• Suhu: *28 °C*
• Kelembapan: *70%*
• Kecepatan Angin: *- km/jam*
_Sumber: Open-Meteo (Asia/Jakarta)_
~~~~

**.wiki belajar**

~~~~text
📖 *Wikipedia Bahasa Indonesia — Belajar*
Contoh ringkasan untuk pengujian.

🔗 Sumber: https://id.wikipedia.org/wiki/belajar
~~~~

**.urlcheck https://perawat.org**

~~~~text
🔍 *Pemeriksaan Keamanan URL/Domain*
• URL Normal: https://perawat.org/
• Hostname: `perawat.org`
• Protokol: *HTTPS*
• Status SSRF Guard: *AMAN (bukan IP privat/loopback/metadata)*
~~~~

**.pantun nasehat**

~~~~text
🎭 *Hiburan kelas*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.quotes lucu**

~~~~text
🎭 *Hiburan kelas*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.quotesislami**

~~~~text
🎭 *Hiburan kelas*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.quotesmotivasi**

~~~~text
🎭 *Hiburan kelas*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.motivasi tema belajar**

~~~~text
🎭 *Hiburan kelas*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.katahariini tema belajar**

~~~~text
🎭 *Hiburan kelas*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.tebak-tebakan tema belajar**

~~~~text
🎭 *Hiburan kelas*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.roasting tema belajar**

~~~~text
🎭 *Hiburan kelas*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.gombal tema belajar**

~~~~text
🎭 *Hiburan kelas*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.rayuan tema belajar**

~~~~text
🎭 *Hiburan kelas*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.cerpen tema belajar**

~~~~text
🎭 *Hiburan kelas*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.cerita tema belajar**

~~~~text
🎭 *Hiburan kelas*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.dadu**

~~~~text
🎲 *Lempar Dadu:* Kamu mendapatkan angka *2*!
~~~~

**.apakah belajar bersama**

~~~~text
🐚 *Kerang Ajaib HdyBot*
• Pertanyaan: _belajar bersama_
• Jawaban: *Ya, tentu saja!*
~~~~

**.kapankah belajar bersama**

~~~~text
🔮 *Pertanyaan:* Kapankah belajar bersama?
*Jawaban:* Besok pagi
~~~~

**.bisakah belajar bersama**

~~~~text
🐚 *Kerang Ajaib HdyBot*
• Pertanyaan: _belajar bersama_
• Jawaban: *Ya, tentu saja!*
~~~~

**.kerangajaib belajar bersama**

~~~~text
🐚 *Kerang Ajaib HdyBot*
• Pertanyaan: _belajar bersama_
• Jawaban: *Ya, tentu saja!*
~~~~

**.rate belajar bersama**

~~~~text
📊 *Penilaian HdyBot untuk "belajar bersama":* *6/100* ⭐
~~~~

**.hilih Ani**

~~~~text
✨ *Hasil (hilih):*
Ini
~~~~

**.alay Ani**

~~~~text
✨ *Hasil (alay):*
4n1
~~~~

**.besarkecil Ani**

~~~~text
✨ *Hasil (besarkecil):*
AnI
~~~~

**.balikhuruf Ani**

~~~~text
✨ *Hasil (balikhuruf):*
inA
~~~~

**.namaninja Ani**

~~~~text
✨ *Hasil (namaninja):*
katoki
~~~~

**.stats week**

~~~~text
📈 *Laporan Analitik Kelas (WEEK) — Nursing Class A*
• Total Eksekusi Command: *1*
• Command Terpopuler: analytics.stats (1x)
• Tugas Aktif: *1* | Tugas Selesai: *0*
• Pengingat Terjadwal: *1*
• Catatan Kelas Tersimpan: *1*
_Data agregat kelas (privasi terjaga)._
~~~~

**.owner**

~~~~text
👤 *Identitas Owner & Konfigurasi*
• Bot: HdyBot — Nursing Class A Assistant
• Owner/Admin: Hedy (<nomor owner>)
• Email: wibyjoe12@gmail.com
• Nomor Bot: Bebas/Random (Tersambung via QR Code)
• Kelas: Nursing Class A (Semester 5A)
• Timezone: Asia/Jakarta
~~~~

**.about**

~~~~text
🤖 *Tentang HdyBot — Nursing Class A Assistant*
• Asisten AI Akademik & Sekretaris Kelas Digital untuk *Nursing Class A (Semester 5A)*
• Owner & Admin Utama: *Hedy* (`<nomor owner>`)
• Nomor Bot: *Dinamis / Bisa Ganti-Ganti via QR Code*
• Mesin AI: *NVIDIA Build dan OpenAI*
• Zona Waktu: *Asia/Jakarta*
~~~~

**.info**

~~~~text
🤖 *Tentang HdyBot — Nursing Class A Assistant*
• Asisten AI Akademik & Sekretaris Kelas Digital untuk *Nursing Class A (Semester 5A)*
• Owner & Admin Utama: *Hedy* (`<nomor owner>`)
• Nomor Bot: *Dinamis / Bisa Ganti-Ganti via QR Code*
• Mesin AI: *NVIDIA Build dan OpenAI*
• Zona Waktu: *Asia/Jakarta*
~~~~

**.menu**

~~~~text
*📚 Informasi kelas*

• .kelas
• .anggota [nama]
• .pengurus
• .rules
• .faq
• .matkul
• .dosen [nama]
• .kalender

Halaman 1/8 · .menu 2
Cara pakai: .help <perintah>
~~~~

**.help calc**

~~~~text
💡 *Cara menggunakan*

.calc <rumus>
~~~~

**.cekpesan Perubahan jadwal besok**

~~~~text
🔍 *Hasil Analisis Kualitas & Kepentingan Pesan AI*
• Kualitas Pesan: *BAIK*
• Sifat Kepentingan: *INTI_PENTING*
• Kategori Prioritas: *URGENT*
• Alasan AI: Pesan memuat informasi inti/penting akademik (jadwal, tugas, dosen, praktikum, atau ujian).

📊 *Preview Ringkasan Tabel AI untuk Nursing Class A:*
*Informasi kelas*
Perubahan jadwal besok

Mata kuliah · Akademik Semester 5A
Waktu · besok
Tempat · Menyesuaikan / Grup Kelas
Tindak lanjut · Harap dicatat dan dipersiapkan oleh seluruh mahasiswa Nursing Class A

Sumber · PJMK Semester 5 (Simulasi)
~~~~

**.admin menu**

~~~~text
*📚 Informasi kelas*

• .kelas
• .anggota [nama]
• .pengurus
• .rules
• .faq
• .matkul
• .dosen [nama]
• .kalender

Halaman 1/8 · .menu 2
Cara pakai: .help <perintah>
~~~~

</details>

<a id="panduan-menu-7"></a>

### 🔐 Administrasi

Gunakan DM dari nomor admin terverifikasi. Baca tujuan dan isi pada pratinjau sebelum memberikan kode konfirmasi.

| Perintah dan alias | Kegunaan | Pesan WhatsApp | Cara pakai dan akses |
| --- | --- | --- | --- |
| `.tambahjadwal`, `.jadwal add`, `.jadwal tambah`, `.schedule add`, `.schedule tambah` | Menambah sesi ke PostgreSQL. | `.tambahjadwal minggu\|07:00\|08:00\|METPEN\|Lab` | Pisahkan hari, jam mulai, jam selesai, kode matkul dan ruang dengan tanda pipa. Tinjau lalu konfirmasi. **DM admin terverifikasi** |
| `.editjadwal`, `.jadwal edit`, `.jadwal ubah`, `.schedule edit`, `.schedule ubah` | Mengubah sesi yang sudah ada. | `.editjadwal minggu\|07:00\|minggu\|08:00\|09:00\|METPEN\|Lab` | Awali dengan hari dan jam lama, lanjutkan data sesi baru. Konfirmasikan pratinjau di DM. **DM admin terverifikasi** |
| `.hapusjadwal`, `.jadwal delete`, `.jadwal hapus`, `.schedule delete`, `.schedule hapus` | Menghapus satu sesi kuliah. | `.hapusjadwal minggu\|07:00` | Masukkan hari dan jam mulai sesi, kemudian periksa pratinjau. **DM admin terverifikasi** |
| `.resetjadwal`, `.jadwal reset`, `.schedule reset` | Mengembalikan jadwal ke data awal. | `.resetjadwal` | Baca pratinjau sebelum mengonfirmasi reset. **DM admin terverifikasi** |
| `.tugas antrean`, `.tasks antrean`, `.deadline antrean`, `.mytask antrean`, `.progress antrean` | Memeriksa pemberitahuan yang menunggu keputusan. | `.tugas antrean` | Buka di DM owner. **DM owner** |
| `.tugas grup`, `.tasks grup`, `.deadline grup`, `.mytask grup`, `.progress grup` | Melihat grup tujuan yang dikenali. | `.tugas grup` | Salin nama atau JID untuk perintah tujuan. **DM owner** |
| `.tugas tujuan`, `.tasks tujuan`, `.deadline tujuan`, `.mytask tujuan`, `.progress tujuan` | Memilih grup penerima pengingat. | `.tugas tujuan TUG-1.1.h3 kelas-uji@g.us` | Gunakan ID pemberitahuan dan JID grup. Baca pratinjau lalu balas .confirm dengan kode yang diberikan. **DM owner** |
| `.tugas tolak`, `.tasks tolak`, `.deadline tolak`, `.mytask tolak`, `.progress tolak` | Melewati satu pemberitahuan. | `.tugas tolak TUG-1.1.h3` | Gunakan ID pemberitahuan dari DM. **DM owner** |
| `.tugas deadline`, `.tasks deadline`, `.deadline deadline`, `.mytask deadline`, `.progress deadline` | Memperbaiki tenggat suatu tugas. | `.tugas deadline TUG-1 2026-11-16 14:00` | Masukkan ID tugas, tanggal, dan jam WIB jika diketahui. **DM owner** |
| `.reminder pause`, `.reminders pause` | Menjeda atau melanjutkan worker pengingat. | `.reminder pause` | Pilih pause atau resume di DM admin. **DM admin terverifikasi** |
| `.reminder resume`, `.reminders resume` | Menjeda atau melanjutkan worker pengingat. | `.reminder resume` | Pilih pause atau resume di DM admin. **DM admin terverifikasi** |
| `.drive status`, `.drive errors` | Memeriksa sinkronisasi atau kesalahan Drive. | `.drive status` | Buka di DM admin. **DM admin terverifikasi** |
| `.drive sync` | Meminta sinkronisasi metadata Drive. | `.drive sync` | Pastikan folder dan akun layanan sudah dikonfigurasi. **DM admin terverifikasi** |
| `.login`, `.password`, `.pass`, `.auth` | Memverifikasi sesi admin. | `.login` | Dari DM nomor terdaftar, ketik .login lalu balas password, atau kirim .login <password>. Password disembunyikan. **Pengguna** |
| `.logout`, `.lock` | Mengunci sesi admin. | `.logout` | Kirim di DM admin, termasuk saat membatalkan permintaan password. **Pengguna** |
| `.status` | Memeriksa kesiapan layanan bot. | `.status` | Buka di DM admin. **DM admin terverifikasi** |
| `.system` | Melihat penggunaan sumber daya server. | `.system` | Buka di DM admin. **DM admin terverifikasi** |
| `.dashboard` | Melihat ringkasan operasional kelas dan bot. | `.dashboard` | Buka di DM admin. **DM admin terverifikasi** |
| `.health` | Memeriksa kesiapan layanan bot. | `.health` | Buka di DM admin. **DM admin terverifikasi** |
| `.ping` | Memeriksa respons atau lama proses berjalan. | `.ping` | Kirim di DM admin. **DM admin terverifikasi** |
| `.runtime` | Memeriksa respons atau lama proses berjalan. | `.runtime` | Kirim di DM admin. **DM admin terverifikasi** |
| `.logs` | Membaca log atau ringkasan kesalahan. | `.logs 10` | Gunakan jumlah entri untuk logs dan periode untuk errors. **DM admin terverifikasi** |
| `.errors` | Membaca log atau ringkasan kesalahan. | `.errors today` | Gunakan jumlah entri untuk logs dan periode untuk errors. **DM admin terverifikasi** |
| `.audit` | Melihat jejak tindakan admin. | `.audit` | Buka di DM admin. **DM admin terverifikasi** |
| `.backup` | Memeriksa status backup. | `.backup status` | Gunakan status untuk melihat hasil yang tersedia. **DM admin terverifikasi** |
| `.storage` | Melihat informasi penyimpanan server. | `.storage` | Buka di DM admin. **DM admin terverifikasi** |
| `.pair` | Memverifikasi kode bootstrap admin jika diterbitkan. | `.pair` | Gunakan kode satu kali di DM; pairing perangkat WhatsApp dilakukan di VPS. Adapter mendukung bootstrap sekali pakai. Startup produksi saat ini tidak menerbitkan bootstrap, sehingga perintah mengembalikan penolakan. **DM admin terverifikasi** |
| `.db status` | Memeriksa database, koneksi WhatsApp, atau worker. | `.db status` | Pilih layanan yang sedang diperiksa. **DM admin terverifikasi** |
| `.whatsapp status` | Memeriksa database, koneksi WhatsApp, atau worker. | `.whatsapp status` | Pilih layanan yang sedang diperiksa. **DM admin terverifikasi** |
| `.scheduler status`, `.workers`, `.queue` | Memeriksa database, koneksi WhatsApp, atau worker. | `.scheduler status` | Pilih layanan yang sedang diperiksa. **DM admin terverifikasi** |
| `.ai`, `.ai status` | Melihat mode, penyedia, dan daftar model AI. | `.ai` | Buka di DM admin. **DM admin terverifikasi** |
| `.ai models` | Melihat mode, penyedia, dan daftar model AI. | `.ai models` | Buka di DM admin. **DM admin terverifikasi** |
| `.ai model`, `.ai pin` | Memilih model sementara. | `.ai model lightning` | Gunakan alias yang ditampilkan .ai models, misalnya luna. **DM admin terverifikasi** |
| `.ai auto` | Mengatur mode otomatis atau melepas pilihan sementara. | `.ai auto on` | Gunakan .ai auto on untuk kembali ke router otomatis. **DM admin terverifikasi** |
| `.ai unpin` | Mengatur mode otomatis atau melepas pilihan sementara. | `.ai unpin` | Gunakan .ai auto on untuk kembali ke router otomatis. **DM admin terverifikasi** |
| `.ai test` | Menguji penyedia dan model yang menjawab. | `.ai test Halo` | Sertakan pertanyaan singkat di DM admin. **DM admin terverifikasi** |
| `.groups`, `.group`, `.source`, `.target` | Menampilkan grup dan sumber yang dikenali. | `.groups` | Periksa nama dan JID sebelum mengubah konfigurasi. **DM admin terverifikasi** |
| `.groups sources`, `.groups list`, `.group sources`, `.source sources`, `.target sources`, `.group list`, `.source list`, `.target list` | Menampilkan grup dan sumber yang dikenali. | `.groups sources` | Periksa nama dan JID sebelum mengubah konfigurasi. **DM admin terverifikasi** |
| `.groups add`, `.groups set`, `.group add`, `.source add`, `.target add`, `.group set`, `.source set`, `.target set` | Mendaftarkan grup sumber. | `.groups add sumber-uji@g.us Kelas` | Isi JID grup dan nama tampilan. **DM admin terverifikasi** |
| `.groups pause`, `.groups remove`, `.group pause`, `.source pause`, `.target pause`, `.group remove`, `.source remove`, `.target remove` | Menjeda atau mengaktifkan pemrosesan grup. | `.groups pause sumber-uji@g.us` | Masukkan JID grup yang dimaksud. **DM admin terverifikasi** |
| `.groups resume`, `.group resume`, `.source resume`, `.target resume` | Menjeda atau mengaktifkan pemrosesan grup. | `.groups resume sumber-uji@g.us` | Masukkan JID grup yang dimaksud. **DM admin terverifikasi** |
| `.nimbrung`, `.nongkrong` | Mengatur balasan percakapan grup. | `.nimbrung on` | Gunakan on, off, atau status; di grup, panggil bot sebagai owner atau admin grup saat mengubah mode. **Owner atau admin grup** |
| `.nimbrung status`, `.nongkrong status` | Mengatur balasan percakapan grup. | `.nimbrung status` | Gunakan on, off, atau status; di grup, panggil bot sebagai owner atau admin grup saat mengubah mode. **Owner atau admin grup** |
| `.diam`, `.hening`, `.berhentinimbrung`, `.nimbrung off`, `.nongkrong off` | Mengatur balasan percakapan grup. | `.diam` | Gunakan on, off, atau status; di grup, panggil bot sebagai owner atau admin grup saat mengubah mode. **Owner atau admin grup** |
| `.setpjmk` | Menetapkan grup PJMK atau grup utama kelas. | `.setpjmk sumber-uji@g.us` | Masukkan JID yang sudah diverifikasi. **DM admin terverifikasi** |
| `.setkelasa`, `.setnursing` | Menetapkan grup PJMK atau grup utama kelas. | `.setkelasa kelas-uji@g.us` | Masukkan JID yang sudah diverifikasi. **DM admin terverifikasi** |
| `.filter status`, `.monitor status` | Memeriksa status filter atau item review. | `.filter status` | Pilih status untuk konfigurasi atau review untuk daftar. **DM admin terverifikasi** |
| `.filter review`, `.monitor review` | Memeriksa status filter atau item review. | `.filter review` | Pilih status untuk konfigurasi atau review untuk daftar. **DM admin terverifikasi** |
| `.filter pause`, `.filter off`, `.monitor pause`, `.monitor off` | Menjeda atau mengaktifkan pemrosesan grup. | `.filter pause sumber-uji@g.us` | Masukkan JID grup yang dimaksud. **DM admin terverifikasi** |
| `.filter resume`, `.filter on`, `.monitor resume`, `.monitor on` | Menjeda atau mengaktifkan pemrosesan grup. | `.filter resume sumber-uji@g.us` | Masukkan JID grup yang dimaksud. **DM admin terverifikasi** |
| `.digest` | Membaca ringkasan informasi kelas. | `.digest today` | Tentukan periode, misalnya today. **DM admin terverifikasi** |
| `.priority` | Melihat item prioritas atau antrean persetujuan. | `.priority` | Baca ID sebelum mengambil tindakan. **DM admin terverifikasi** |
| `.pending` | Melihat item prioritas atau antrean persetujuan. | `.pending` | Baca ID sebelum mengambil tindakan. **DM admin terverifikasi** |
| `.approve` | Menyetujui atau menolak item review. | `.approve REV-1` | Gunakan ID yang diberikan bot. **DM admin terverifikasi** |
| `.reject` | Menyetujui atau menolak item review. | `.reject REV-1` | Gunakan ID yang diberikan bot. **DM admin terverifikasi** |
| `.send` | Menyiapkan pratinjau atau pengiriman berita kelas. | `.send REV-1` | Gunakan ID review, baca isi, dan ikuti konfirmasi dari bot. **DM admin terverifikasi** |
| `.broadcast preview` | Menyiapkan pratinjau atau pengiriman berita kelas. | `.broadcast preview REV-1` | Gunakan ID review, baca isi, dan ikuti konfirmasi dari bot. **DM admin terverifikasi** |
| `.broadcast send` | Menyiapkan pratinjau atau pengiriman berita kelas. | `.broadcast send REV-1` | Gunakan ID review, baca isi, dan ikuti konfirmasi dari bot. **DM admin terverifikasi** |
| `.confirm` | Menjalankan atau membatalkan tindakan yang menunggu konfirmasi. | `.confirm NONCE` | Ganti NONCE dengan kode terbaru dari DM bot. **DM admin terverifikasi** |
| `.cancel` | Menjalankan atau membatalkan tindakan yang menunggu konfirmasi. | `.cancel NONCE` | Ganti NONCE dengan kode terbaru dari DM bot. **DM admin terverifikasi** |
| `.relay` | Melihat antrean relay antarkelompok. | `.relay list` | Jalankan di DM owner. **DM owner** |
| `.relay` | Melihat, meneruskan, atau menolak satu relay. | `.relay lihat abc123` | Gunakan ID pratinjau dalam DM owner. **DM owner** |
| `.relay` | Melihat, meneruskan, atau menolak satu relay. | `.relay kirim abc123` | Gunakan ID pratinjau dalam DM owner. **DM owner** |
| `.relay` | Melihat, meneruskan, atau menolak satu relay. | `.relay tolak abc123` | Gunakan ID pratinjau dalam DM owner. **DM owner** |
| `.admin pause`, `.admin on`, `.maintenance pause`, `.maintenance on` | Menghentikan atau melanjutkan pengiriman keluar. | `.admin pause` | Jalankan dari DM admin. **DM admin terverifikasi** |
| `.admin resume`, `.admin off`, `.maintenance resume`, `.maintenance off` | Menghentikan atau melanjutkan pengiriman keluar. | `.admin resume` | Jalankan dari DM admin. **DM admin terverifikasi** |
| `.admin status`, `.maintenance status` | Memeriksa kesiapan layanan bot. | `.admin status` | Buka di DM admin. **DM admin terverifikasi** |
| `.admin overview`, `.maintenance overview` | Melihat ringkasan operasional kelas dan bot. | `.admin overview` | Buka di DM admin. **DM admin terverifikasi** |
| `.admin review`, `.maintenance review` | Melihat item prioritas atau antrean persetujuan. | `.admin review` | Baca ID sebelum mengambil tindakan. **DM admin terverifikasi** |
| `.admin approve`, `.maintenance approve` | Menyetujui atau menolak item review. | `.admin approve REV-1` | Gunakan ID yang diberikan bot. **DM admin terverifikasi** |
| `.admin reject`, `.maintenance reject` | Menyetujui atau menolak item review. | `.admin reject REV-1` | Gunakan ID yang diberikan bot. **DM admin terverifikasi** |
| `.admin audit`, `.maintenance audit` | Melihat jejak tindakan admin. | `.admin audit` | Buka di DM admin. **DM admin terverifikasi** |
| `.admin backup`, `.maintenance backup` | Memeriksa status backup. | `.admin backup` | Gunakan status untuk melihat hasil yang tersedia. **DM admin terverifikasi** |
| `.admin`, `.maintenance` | Membuka menu yang sesuai akses pengirim. | `.admin` | Ketik .menu lalu nomor untuk berpindah halaman. **DM admin terverifikasi** |

<details>
<summary>Contoh balasan · 🔐 Administrasi</summary>

**.tambahjadwal minggu|07:00|08:00|METPEN|Lab**

~~~~text
*Pratinjau perubahan jadwal*
Tambahkan minggu 07:00–08:00 WIB · Metodologi Penelitian · Lab

Setujui dengan .confirm <nonce> atau batalkan dengan .cancel <nonce>.
~~~~

**.editjadwal minggu|07:00|minggu|08:00|09:00|METPEN|Lab**

~~~~text
*Pratinjau perubahan jadwal*
Ubah minggu 07:00 menjadi minggu 08:00–09:00 WIB · Metodologi Penelitian · Lab

Setujui dengan .confirm <nonce> atau batalkan dengan .cancel <nonce>.
~~~~

**.hapusjadwal minggu|07:00**

~~~~text
*Pratinjau perubahan jadwal*
Hapus sesi minggu 07:00 beserta 0 pengecualian tanggal.

Setujui dengan .confirm <nonce> atau batalkan dengan .cancel <nonce>.
~~~~

**.resetjadwal**

~~~~text
*Pratinjau perubahan jadwal*
Pulihkan 15 sesi mingguan dari seed. 1 sesi saat ini dan seluruh pengecualian tanggalnya akan diganti.

Setujui dengan .confirm <nonce> atau batalkan dengan .cancel <nonce>.
~~~~

**.tugas antrean**

~~~~text
*Antrean tenggat*

TUG-1.1.baru · Diskusi

Pilih grup dengan .tugas tujuan <ID> <nama atau JID grup>.
~~~~

**.tugas grup**

~~~~text
*Grup yang dikenali HdyBot*

kelas-uji@g.us
kelas-uji@g.us
~~~~

**.tugas tujuan TUG-1.1.h3 kelas-uji@g.us**

~~~~text
Pemberitahuan belum tersedia atau sudah diproses. Lihat .tugas antrean.
~~~~

**.tugas tolak TUG-1.1.h3**

~~~~text
Pemberitahuan belum tersedia atau sudah diproses. Lihat .tugas antrean.
~~~~

**.tugas deadline TUG-1 2026-11-16 14:00**

~~~~text
Deadline tersimpan.

*1.*
📑 Tugas: Diskusi
🗓️ Deadline: 16 November 2026, pukul 14:00 WIB
🧑‍🏫 Dari dosen: Ibu Sari
📖 Matkul: Metodologi
👨‍🎓 Penanggung jawab: Ani
ID: TUG-1 · Aktif
~~~~

**.reminder pause**

~~~~text
Worker pengingat belum terhubung ke database.
~~~~

**.reminder resume**

~~~~text
Worker pengingat belum terhubung ke database.
~~~~

**.drive status**

~~~~text
Sinkronisasi berhasil.
Jumlah dokumen: 2
Indeks terakhir: 9/11/2026, 07.30.00
~~~~

**.drive sync**

~~~~text
Sinkronisasi berhasil.
Jumlah dokumen: 2
Indeks terakhir: 9/11/2026, 07.30.00
~~~~

**.login**

~~~~text
🔐 *Verifikasi Admin HdyBot*
Silakan balas pesan ini dengan password admin Anda:
~~~~

**.logout**

~~~~text
🔒 Sesi admin telah dikunci. Ketika Anda chat kembali, bot akan meminta password admin.
~~~~

**.status**

~~~~text
🩺 *Health & Ready Check HdyBot (via WA Admin)*
• Kesehatan: *OK* (uptime 0s)
• WhatsApp (mock): *connected*
• Database: ok
• NVIDIA AI: mode=auto | calls=0
• Drive: Sinkronisasi berhasil.
Jumlah dokumen: 2
Indeks terakhir: 9/11/2026, 07.30.00
• Scheduler: belum tersedia
• RAM proses: <RAM> MiB
• Outbound: DISABLED | Dry-Run: ON | EmergencyStop: OFF
~~~~

**.system**

~~~~text
🩺 *Health & Ready Check HdyBot (via WA Admin)*
• Kesehatan: *OK* (uptime 0s)
• WhatsApp (mock): *connected*
• Database: ok
• NVIDIA AI: mode=auto | calls=0
• Drive: Sinkronisasi berhasil.
Jumlah dokumen: 2
Indeks terakhir: 9/11/2026, 07.30.00
• Scheduler: belum tersedia
• RAM proses: <RAM> MiB
• Outbound: DISABLED | Dry-Run: ON | EmergencyStop: OFF
~~~~

**.dashboard**

~~~~text
📊 *DASHBOARD HDYBOT — Halo Hedy*
• WhatsApp (mock): *connected*
• OpenAI: belum diisi · NVIDIA: *Belum diisi* | Mode: *auto*
• Model router: deepseek, super-vl, mistral, ultra, kimi, minimax, lightning, luna
• Grup sumber aktif: *1*
• Pesan diproses hari ini: *1* (Penting: *1*)
• Menunggu review Hedy: *1*
• Kuliah berikutnya: *Metodologi Penelitian (Senin 08:00–09:40 WIB)*
• Outbound Emergency Stop: *Normal*
• Error terakhir: tidak ada | Health: OK
~~~~

**.health**

~~~~text
🩺 *Health & Ready Check HdyBot (via WA Admin)*
• Kesehatan: *OK* (uptime 0s)
• WhatsApp (mock): *connected*
• Database: ok
• NVIDIA AI: mode=auto | calls=0
• Drive: Sinkronisasi berhasil.
Jumlah dokumen: 2
Indeks terakhir: 9/11/2026, 07.30.00
• Scheduler: belum tersedia
• RAM proses: <RAM> MiB
• Outbound: DISABLED | Dry-Run: ON | EmergencyStop: OFF
~~~~

**.ping**

~~~~text
🏓 Pong! HdyBot — Nursing Class A Assistant aktif.
~~~~

**.runtime**

~~~~text
⏱️ Runtime HdyBot: 0 detik | Timezone: Asia/Jakarta | Mode WA: mock
~~~~

**.logs 10**

~~~~text
📋 *Log operasional*
Belum ada kejadian yang sesuai sejak proses dimulai.
~~~~

**.errors today**

~~~~text
⚠️ *Laporan kendala*
Belum ada kejadian yang sesuai sejak proses dimulai.
~~~~

**.audit**

~~~~text
📋 Belum ada entri audit log.
~~~~

**.backup status**

~~~~text
Direktori backup tidak tersedia.
~~~~

**.storage**

~~~~text
💾 Ruang tersedia: <ruang disk> GiB
RAM proses: <RAM> MiB
~~~~

**.pair**

~~~~text
❌ Pairing ditolak (bootstrap_unavailable).
~~~~

**.db status**

~~~~text
✅ Database merespons.
~~~~

**.whatsapp status**

~~~~text
WhatsApp · connected
~~~~

**.scheduler status**

~~~~text
Worker pengingat belum terhubung ke database.
~~~~

**.ai**

~~~~text
🧠 *NVIDIA & OpenAI · Model AI*
• NVIDIA: belum dikonfigurasi · OpenAI: belum dikonfigurasi
• Mode: *auto*
• Fallback: ON | Total Panggilan: 0
• *deepseek* · deepseek-ai/deepseek-v4.1-flash
• *super-vl* · nvidia/nemotron-3.5-super-vl-120b-a12b
• *mistral* · mistralai/mistral-large-4-1t-a52b
• *ultra* · nvidia/nemotron-3-ultra-550b-a55b
• *kimi* · moonshotai/kimi-k3.1-pro
• *minimax* · minimaxai/minimax-m3.1-flash
• *lightning* · nvidia/nemotron-3.5-lightning-30b-a3b
• *luna* · gpt-6-luna (tidak tersedia)
~~~~

**.ai models**

~~~~text
🧠 *NVIDIA & OpenAI · Model AI*
• NVIDIA: belum dikonfigurasi · OpenAI: belum dikonfigurasi
• Mode: *auto*
• Fallback: ON | Total Panggilan: 0
• *deepseek* · deepseek-ai/deepseek-v4.1-flash
• *super-vl* · nvidia/nemotron-3.5-super-vl-120b-a12b
• *mistral* · mistralai/mistral-large-4-1t-a52b
• *ultra* · nvidia/nemotron-3-ultra-550b-a55b
• *kimi* · moonshotai/kimi-k3.1-pro
• *minimax* · minimaxai/minimax-m3.1-flash
• *lightning* · nvidia/nemotron-3.5-lightning-30b-a3b
• *luna* · gpt-6-luna (tidak tersedia)
~~~~

**.ai model lightning**

~~~~text
✅ Model di-pin sementara ke *lightning* (nvidia/nemotron-3.5-lightning-30b-a3b). Akan kembali ke auto setelah TTL berakhir.
~~~~

**.ai auto on**

~~~~text
✅ Mode router AI diatur ke *auto*.
~~~~

**.ai unpin**

~~~~text
✅ Mode router AI diatur ke *auto*.
~~~~

**.ai test Halo**

~~~~text
🧪 *Hasil uji NVIDIA*
Model: nvidia/nemotron-3.5-super-vl-120b-a12b

Contoh respons NVIDIA untuk pengujian format.
~~~~

**.groups**

~~~~text
👥 *Daftar Grup Terdaftar & Allow Access (1)*
• Mode Allow Access Semua Grup: *AKTIF ✅*
1. *Grup uji* (`sumber-uji@g.us`) — ALLOW / AKTIF ✅ [official]
~~~~

**.groups sources**

~~~~text
👥 *Daftar Grup Terdaftar & Allow Access (1)*
• Mode Allow Access Semua Grup: *AKTIF ✅*
1. *Grup uji* (`sumber-uji@g.us`) — ALLOW / AKTIF ✅ [official]
~~~~

**.groups add sumber-uji@g.us Kelas**

~~~~text
✅ Grup sumber *Kelas* (`sumber-uji@g.us`) terdaftar dan aktif.
~~~~

**.groups pause sumber-uji@g.us**

~~~~text
⏸️ Pemantauan & pengiriman grup `sumber-uji@g.us` dijeda.
~~~~

**.groups resume sumber-uji@g.us**

~~~~text
▶️ Pemantauan & pengiriman grup `sumber-uji@g.us` dilanjutkan.
~~~~

**.nimbrung on**

~~~~text
Aku ikut nongkrong. Mau bahas apa?
~~~~

**.nimbrung status**

~~~~text
💬 *Status Mode Grup (kelas-uji@g.us)*
• Notifikasi AI: *🔴 BOT AI NONAKTIF (Mode Hening)*
• Mode Saat Ini: *MODE HENING (DIAM) 🤫*
• Ketik *"bot ikut nimbrung"* / `.nimbrung on` untuk mengajak bot nongkrong, atau *"bot berhenti"* / `.nimbrung off` untuk membuat bot kembali diam.
~~~~

**.diam**

~~~~text
Baik, aku berhenti nongkrong. Panggil aku kalau perlu bantuan.
~~~~

**.setpjmk sumber-uji@g.us**

~~~~text
✅ *Grup Sumber PJMK Semester 5 Terdaftar!*
• Nama Grup: *PJMK Semester 5*
• JID: `sumber-uji@g.us`
• Pesan penting masuk ke chat pribadi Hedy untuk persetujuan.
~~~~

**.setkelasa kelas-uji@g.us**

~~~~text
✅ *Grup Utama Nursing Class A Terdaftar!*
• JID Tujuan Relay: `kelas-uji@g.us`
• Pesan dari PJMK akan diteruskan ke sini setelah Hedy menyetujui pratinjau di chat pribadi.
~~~~

**.filter status**

~~~~text
📡 *Status Monitoring & Digest Group Intelligence*
• Grup Sumber Aktif: *1*
• Pesan Diproses Hari Ini: *1*
• Pesan Penting Terdeteksi: *1*
• Menunggu Persetujuan Hedy: *1*
~~~~

**.filter review**

~~~~text
📝 *Antrean Review Hedy (1)*
• *REV-1* [URGENT/schedule_change] (conf=0.9)
  Ringkasan: Perubahan jadwal diskusi besok.
  Ketik `.approve REV-1` atau `.reject REV-1 <alasan>`
~~~~

**.filter pause sumber-uji@g.us**

~~~~text
⏸️ Pemantauan & pengiriman grup `sumber-uji@g.us` dijeda.
~~~~

**.filter resume sumber-uji@g.us**

~~~~text
▶️ Pemantauan & pengiriman grup `sumber-uji@g.us` dilanjutkan.
~~~~

**.digest today**

~~~~text
📡 *Status Monitoring & Digest Group Intelligence*
• Grup Sumber Aktif: *1*
• Pesan Diproses Hari Ini: *1*
• Pesan Penting Terdeteksi: *1*
• Menunggu Persetujuan Hedy: *1*
~~~~

**.priority**

~~~~text
*Prioritas kelas*
REV-1 · URGENT
Perubahan jadwal diskusi besok.
~~~~

**.pending**

~~~~text
📝 *Antrean Review Hedy (1)*
• *REV-1* [URGENT/schedule_change] (conf=0.9)
  Ringkasan: Perubahan jadwal diskusi besok.
  Ketik `.approve REV-1` atau `.reject REV-1 <alasan>`
~~~~

**.approve REV-1**

~~~~text
✅ *REV-1* disetujui.

Preview pengumuman:
📢 *[Draft Pengumuman — Nursing Class A]*
Kategori: URGENT (schedule_change)
Kualitas/Sifat: BAIK / INTI_PENTING
Ringkasan: Perubahan jadwal diskusi besok.
Sumber: Grup uji (2026-11-09 00:30 UTC)
Status: Menunggu verifikasi Hedy

*Informasi kelas*
Perubahan jadwal diskusi besok.

Mata kuliah · Akademik Semester 5A
Waktu · besok
Tempat · Menyesuaikan / Grup Kelas
Tindak lanjut · Harap dicatat dan dipersiapkan oleh seluruh mahasiswa Nursing Class A

Sumber · Grup uji

Untuk mengirim ke grup utama, jalankan `.send REV-1` (memerlukan konfirmasi nonce).
~~~~

**.reject REV-1**

~~~~text
🚫 *REV-1* ditolak. Alasan: Ditolak oleh Hedy
~~~~

**.send REV-1**

~~~~text
🔒 *Konfirmasi Pengiriman Pengumuman*
Target: `kelas-uji@g.us`
Isi:
📢 *[Draft Pengumuman — Nursing Class A]*
Kategori: URGENT (schedule_change)
Kualitas/Sifat: BAIK / INTI_PENTING
Ringkasan: Perubahan jadwal diskusi besok.
Sumber: Grup uji (2026-11-09 00:30 UTC)
Status: Menunggu verifikasi Hedy

*Informasi kelas*
Perubahan jadwal diskusi besok.

Mata kuliah · Akademik Semester 5A
Waktu · besok
Tempat · Menyesuaikan / Grup Kelas
Tindak lanjut · Harap dicatat dan dipersiapkan oleh seluruh mahasiswa Nursing Class A

Sumber · Grup uji

Balas dengan `.confirm <nonce>` untuk mengirim atau `.cancel <nonce>` untuk membatalkan.
~~~~

**.broadcast preview REV-1**

~~~~text
*Pratinjau pengumuman*
Tujuan: kelas-uji@g.us

📢 *[Draft Pengumuman — Nursing Class A]*
Kategori: URGENT (schedule_change)
Kualitas/Sifat: BAIK / INTI_PENTING
Ringkasan: Perubahan jadwal diskusi besok.
Sumber: Grup uji (2026-11-09 00:30 UTC)
Status: Menunggu verifikasi Hedy

*Informasi kelas*
Perubahan jadwal diskusi besok.

Mata kuliah · Akademik Semester 5A
Waktu · besok
Tempat · Menyesuaikan / Grup Kelas
Tindak lanjut · Harap dicatat dan dipersiapkan oleh seluruh mahasiswa Nursing Class A

Sumber · Grup uji
~~~~

**.broadcast send REV-1**

~~~~text
🔒 *Konfirmasi Pengiriman Pengumuman*
Target: `kelas-uji@g.us`
Isi:
📢 *[Draft Pengumuman — Nursing Class A]*
Kategori: URGENT (schedule_change)
Kualitas/Sifat: BAIK / INTI_PENTING
Ringkasan: Perubahan jadwal diskusi besok.
Sumber: Grup uji (2026-11-09 00:30 UTC)
Status: Menunggu verifikasi Hedy

*Informasi kelas*
Perubahan jadwal diskusi besok.

Mata kuliah · Akademik Semester 5A
Waktu · besok
Tempat · Menyesuaikan / Grup Kelas
Tindak lanjut · Harap dicatat dan dipersiapkan oleh seluruh mahasiswa Nursing Class A

Sumber · Grup uji

Balas dengan `.confirm <nonce>` untuk mengirim atau `.cancel <nonce>` untuk membatalkan.
~~~~

**.confirm NONCE**

~~~~text
✅ Pengumuman *REV-1* terkirim (mock-out-1).
~~~~

**.cancel NONCE**

~~~~text
✅ Konfirmasi `<nonce>` dibatalkan.
~~~~

**.relay list**

~~~~text
abc123 · pending → kelas-uji@g.us
Diskusi kelas besok.
~~~~

**.relay lihat abc123**

~~~~text
sumber-uji@g.us → kelas-uji@g.us

Diskusi kelas besok.

.relay kirim abc123

.relay tolak abc123
~~~~

**.relay kirim abc123**

~~~~text
Pesan sudah dikirim ke kelas-uji@g.us.
~~~~

**.relay tolak abc123**

~~~~text
Pesan tidak diteruskan.
~~~~

**.admin pause**

~~~~text
🛑 *EMERGENCY STOP AKTIF*. Seluruh pengiriman pesan keluar ke grup dihentikan seketika.
~~~~

**.admin resume**

~~~~text
▶️ *Emergency Stop dinonaktifkan*. Pengiriman kembali mengikuti kebijakan normal.
~~~~

**.admin status**

~~~~text
🩺 *Health & Ready Check HdyBot (via WA Admin)*
• Kesehatan: *OK* (uptime 0s)
• WhatsApp (mock): *connected*
• Database: ok
• NVIDIA AI: mode=auto | calls=0
• Drive: Sinkronisasi berhasil.
Jumlah dokumen: 2
Indeks terakhir: 9/11/2026, 07.30.00
• Scheduler: belum tersedia
• RAM proses: <RAM> MiB
• Outbound: DISABLED | Dry-Run: ON | EmergencyStop: OFF
~~~~

**.admin overview**

~~~~text
📊 *DASHBOARD HDYBOT — Halo Hedy*
• WhatsApp (mock): *connected*
• OpenAI: belum diisi · NVIDIA: *Belum diisi* | Mode: *auto*
• Model router: deepseek, super-vl, mistral, ultra, kimi, minimax, lightning, luna
• Grup sumber aktif: *1*
• Pesan diproses hari ini: *1* (Penting: *1*)
• Menunggu review Hedy: *1*
• Kuliah berikutnya: *Metodologi Penelitian (Senin 08:00–09:40 WIB)*
• Outbound Emergency Stop: *Normal*
• Error terakhir: tidak ada | Health: OK
~~~~

**.admin review**

~~~~text
📝 *Antrean Review Hedy (1)*
• *REV-1* [URGENT/schedule_change] (conf=0.9)
  Ringkasan: Perubahan jadwal diskusi besok.
  Ketik `.approve REV-1` atau `.reject REV-1 <alasan>`
~~~~

**.admin approve REV-1**

~~~~text
✅ *REV-1* disetujui.

Preview pengumuman:
📢 *[Draft Pengumuman — Nursing Class A]*
Kategori: URGENT (schedule_change)
Kualitas/Sifat: BAIK / INTI_PENTING
Ringkasan: Perubahan jadwal diskusi besok.
Sumber: Grup uji (2026-11-09 00:30 UTC)
Status: Menunggu verifikasi Hedy

*Informasi kelas*
Perubahan jadwal diskusi besok.

Mata kuliah · Akademik Semester 5A
Waktu · besok
Tempat · Menyesuaikan / Grup Kelas
Tindak lanjut · Harap dicatat dan dipersiapkan oleh seluruh mahasiswa Nursing Class A

Sumber · Grup uji

Untuk mengirim ke grup utama, jalankan `.send REV-1` (memerlukan konfirmasi nonce).
~~~~

**.admin reject REV-1**

~~~~text
🚫 *REV-1* ditolak. Alasan: Ditolak oleh Hedy
~~~~

**.admin audit**

~~~~text
📋 Belum ada entri audit log.
~~~~

**.admin backup**

~~~~text
Direktori backup tidak tersedia.
~~~~

**.admin**

~~~~text
📊 *DASHBOARD HDYBOT — Halo Hedy*
• WhatsApp (mock): *connected*
• OpenAI: belum diisi · NVIDIA: *Belum diisi* | Mode: *auto*
• Model router: deepseek, super-vl, mistral, ultra, kimi, minimax, lightning, luna
• Grup sumber aktif: *1*
• Pesan diproses hari ini: *1* (Penting: *1*)
• Menunggu review Hedy: *1*
• Kuliah berikutnya: *Metodologi Penelitian (Senin 08:00–09:40 WIB)*
• Outbound Emergency Stop: *Normal*
• Error terakhir: tidak ada | Health: OK
~~~~

</details>

<a id="panduan-menu-8"></a>

### 🎓 LMS STIKES Husada Jombang

Gunakan DM dari nomor mahasiswa yang didaftarkan oleh owner.

| Perintah dan alias | Kegunaan | Pesan WhatsApp | Cara pakai dan akses |
| --- | --- | --- | --- |
| `.lms` | Membuka bantuan LMS mahasiswa. | `.lms help` | Mulai di DM atau grup dengan nama sendiri. Baca hasil lewat DM. **DM atau grup, hasil ke DM** |

Ganti `hedy` dengan alias yang didaftarkan. Mulai dari DM atau grup. Kirim kredensial dan pengaturan hanya di DM.

| Pesan WhatsApp | Kegunaan | Cara menggunakan |
| --- | --- | --- |
| `.lms daftar <nomor> <NIM> <alias>` | Mendaftarkan identitas mahasiswa | Owner terverifikasi menggunakan nomor dan NIM yang sudah diperiksa. |
| `.lms hedy hubungkan <password LMS>` | Mengaktifkan login otomatis | Gunakan sekali di DM jika nama cocok dengan daftar kelas. Nomor berasal dari pengirim. |
| `.lms hedy hubungkan-nim <NIM> <password LMS>` | Menghubungkan akun jika nama belum cocok | Ketik di DM. Gunakan NIM dan password akun sendiri. |
| `.lms hedy setuju` | Memberi izin baca LMS | Kirim dari nomor mahasiswa yang terdaftar. |
| `.lms hedy login <password LMS>` | Menghubungkan sesi mahasiswa | Ketik di DM bot. Gunakan password LMS milik sendiri. |
| `.lms hedy` | Membuka dashboard | Bentuk lengkapnya .lms hedy dashboard. |
| `.lms hedy status` | Memeriksa sesi, izin AI dan notifikasi | Kirim sebelum melakukan sinkronisasi. |
| `.lms hedy matkul gerontik` | Mencari mata kuliah | Kosongkan gerontik untuk semua matkul, atau ganti dengan kode, kelas atau pengampu. |
| `.lms hedy detail gerontik` | Membaca kartu mata kuliah | Gunakan nama atau ID yang muncul dalam daftar. |
| `.lms hedy dosen gerontik` | Melihat data pengampu | Ganti nama matkul dengan yang ingin diperiksa. |
| `.lms hedy materi` | Mendaftar materi | Tambahkan nama matkul atau page 2 untuk halaman berikut. |
| `.lms hedy materi list ENTR2.3` | Memfilter isi kelas | Gunakan kode dari dashboard sendiri. |
| `.lms hedy materi terbaru` | Mengurutkan materi terbaru | Tanggal LMS atau waktu pertama terdeteksi menentukan urutan. |
| `.lms hedy materi baru` | Melihat materi yang belum ditampilkan atau dikirim bot | Jalankan di DM setelah sinkronisasi. |
| `.lms hedy materi cari penelitian` | Mencari metadata dan teks materi | Alias .lms hedy cari materi penelitian. Tambahkan page 2 untuk kelompok dokumen berikutnya. |
| `.lms hedy materi detail <ID>` | Memeriksa sumber dan metadata | Salin ID dari daftar materi. |
| `.lms hedy materi kirim <ID>` | Mengunduh dan mengirim lampiran ke DM sendiri | Alias .lms hedy materi download <ID>. Tambahkan nomor file jika ada beberapa lampiran. |
| `.lms hedy tugas` | Mendaftar tugas akademik | Tambahkan matkul, pending, selesai, atau terbaru sebagai filter. |
| `.lms hedy tugas cari makalah` | Mencari tugas | Ganti makalah dengan kata kunci. |
| `.lms hedy tugas detail <ID>` | Membuka rincian tugas | Gunakan ID dari daftar tugas. |
| `.lms hedy deadline` | Melihat tenggat dari LMS | Hanya tugas dengan tenggat yang terbaca yang ditampilkan. |
| `.lms hedy kuis aktif` | Mencari evaluasi di LMS | Gunakan kuis, kuis terbaru, kuis <matkul>, atau kuis detail <ID>. |
| `.lms hedy sync` | Menyinkronkan akun | Bisa juga memakai .lms sync hedy atau .lms sync now. |
| `.lms sync status` | Memeriksa penjadwal akun | Gunakan sync pause untuk menjeda, sync resume untuk melanjutkan, atau sync history untuk riwayat. |
| `.lms hedy notif on` | Menerima notifikasi perubahan pribadi | Ganti on dengan off untuk menonaktifkan. |
| `.lms hedy ai on` | Mengizinkan penggunaan kutipan materi oleh AI | Ganti on dengan off untuk mencabut izin. |
| `.lms hedy ask Apa itu mobilisasi?` | Bertanya berdasarkan dokumen | Gunakan kata kunci materi yang sudah terindeks. |
| `.lms hedy summarize <ID>` | Merangkum materi tertentu | Salin ID dokumen yang bisa diekstrak. |
| `.lms hedy flashcard gerontik` | Membuat kartu belajar | Ganti gerontik dengan topik dari materi. |
| `.lms hedy quiz belajar gerontik` | Membuat latihan pribadi | Jawaban dikirim ke chat; bot tidak mengerjakan kuis kampus. |
| `.lms hedy logout` | Mencabut akses dan menghapus cache sesi | Alias .lms hedy cabut dan .lms hedy hapus. |

<details>
<summary>Contoh balasan · 🎓 LMS STIKES Husada Jombang</summary>

**.lms help**

~~~~text
🎓 *LMS mahasiswa*

Ketik .lms <nama> di DM atau grup, misalnya .lms hedy. Bot membalas ke nomor pengirim. Saat pertama kali, ikuti petunjuk di DM.

.lms <nama> dashboard | matkul | materi | tugas | deadline | kuis
.lms <nama> materi kirim <ID> [nomor file]
.lms <nama> sync | status | logout

Tambahkan page 2 untuk halaman berikutnya.
~~~~

</details>

<details>
<summary><strong>Percakapan grup dan pratinjau relay</strong></summary>

**Pesan:** HdyBot, jadwal besok?

Jawaban yang mengutip pengirim:

~~~~text
@<pengirim>
*MK Selasa 10 November 2026*

🕦 Pukul: 08:00–09:40 WIB
📗 Mata kuliah: Konsep Keperawatan Agregat Komunitas
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Vendi Kurniawan, S.Kep., Ns., M.Kes, Kusuma Wijaya Ridi P, S.Kep., Ns., MNS, Yusiana Vidhiastutik, S.Kep., Ns., M.Kep, Roni Setyawan, S.Kep., Ns., M.Kep

🕦 Pukul: 09:40–11:20 WIB
📗 Mata kuliah: Entrepreneurship 2
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Karisma Dwi Ana, Ns., M.Kep, Ardiyanti Hidayah, M.Kes, Masrulloh, S.Kep., Ns., M.Kes, Elis Fatmawati, S.ST., M.Keb, Aris Setyawan

🕦 Pukul: 12:30–14:10 WIB
📗 Mata kuliah: Metodologi Penelitian
👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini
🎓 Tim mata kuliah: Facrur Rozi, S.Kep., Ns., M.Kep, Eliza Zihni, S.Kep., Ns., M.Kep, Prawito, S.Kep., Ns., M.Kep, Karisma Dwi Ana, S.Kep., Ns., M.Kep

☕ Istirahat: 11:20–12:30 WIB
~~~~

**Pesan:** HdyBot, bantu aku belajar

Jawaban yang mengutip pengirim:

~~~~text
@<pengirim>
Contoh respons NVIDIA untuk pengujian format.
~~~~

**Pesan:** Perubahan jadwal praktikum besok pukul 10.00 WIB.

Jawaban di DM owner:

~~~~text
Hedy, boleh saya kirim pesan ini sekarang?
Dari PJMK contoh (sumber-uji@g.us)
Ke kelas-uji@g.us

Perubahan jadwal praktikum besok pukul 10.00 WIB.

.relay kirim e99e20ca9ba07dde
.relay tolak e99e20ca9ba07dde
Atau kutip pesan ini dan balas ya atau tidak.
~~~~

</details>

<details>
<summary><strong>Notifikasi H−3 sampai hari H, pemilihan grup, dan hasil konfirmasi</strong></summary>

**DM Hedy pada H−3**

~~~~text
*Pengingat H−3*

*1.*
📑 Tugas: Makalah lansia
🗓️ Deadline: 12 November 2026, pukul 07:30 WIB
🧑‍🏫 Dari dosen: Ibu Sari
📖 Matkul: Keperawatan Gerontik
👨‍🎓 Penanggung jawab: Ani
ID: TUG-1 · Aktif

Khusus Hedy. Pilih grup dengan .tugas grup, lalu .tugas tujuan TUG-1.1.h3 <grup>.

Untuk melewati pemberitahuan ini: .tugas tolak TUG-1.1.h3
~~~~

**.tugas tujuan TUG-1.1.h3 Praktikum**

~~~~text
*Pratinjau untuk Hedy*

Tujuan: Praktikum (kelas-uji@g.us)

*Pengingat H−3*

*1.*
📑 Tugas: Makalah lansia
🗓️ Deadline: 12 November 2026, pukul 07:30 WIB
🧑‍🏫 Dari dosen: Ibu Sari
📖 Matkul: Keperawatan Gerontik
👨‍🎓 Penanggung jawab: Ani
ID: TUG-1 · Aktif

Kirim dengan .confirm <kode> atau batalkan dengan .cancel <kode>.
~~~~

**Teks yang diterima grup setelah Hedy mengonfirmasi**

~~~~text
*Pengingat H−3*

*1.*
📑 Tugas: Makalah lansia
🗓️ Deadline: 12 November 2026, pukul 07:30 WIB
🧑‍🏫 Dari dosen: Ibu Sari
📖 Matkul: Keperawatan Gerontik
👨‍🎓 Penanggung jawab: Ani
ID: TUG-1 · Aktif
~~~~

**DM Hedy pada H−2**

~~~~text
*Pengingat H−2*

*1.*
📑 Tugas: Makalah lansia
🗓️ Deadline: 12 November 2026, pukul 07:30 WIB
🧑‍🏫 Dari dosen: Ibu Sari
📖 Matkul: Keperawatan Gerontik
👨‍🎓 Penanggung jawab: Ani
ID: TUG-1 · Aktif

Khusus Hedy. Pilih grup dengan .tugas grup, lalu .tugas tujuan TUG-1.1.h2 <grup>.

Untuk melewati pemberitahuan ini: .tugas tolak TUG-1.1.h2
~~~~

**DM Hedy pada H−1**

~~~~text
*Pengingat H−1*

*1.*
📑 Tugas: Makalah lansia
🗓️ Deadline: 12 November 2026, pukul 07:30 WIB
🧑‍🏫 Dari dosen: Ibu Sari
📖 Matkul: Keperawatan Gerontik
👨‍🎓 Penanggung jawab: Ani
ID: TUG-1 · Aktif

Khusus Hedy. Pilih grup dengan .tugas grup, lalu .tugas tujuan TUG-1.1.h1 <grup>.

Untuk melewati pemberitahuan ini: .tugas tolak TUG-1.1.h1
~~~~

**DM Hedy pada hari H**

~~~~text
*Deadline hari ini*

*1.*
📑 Tugas: Makalah lansia
🗓️ Deadline: 12 November 2026, pukul 07:30 WIB
🧑‍🏫 Dari dosen: Ibu Sari
📖 Matkul: Keperawatan Gerontik
👨‍🎓 Penanggung jawab: Ani
ID: TUG-1 · Aktif

Khusus Hedy. Pilih grup dengan .tugas grup, lalu .tugas tujuan TUG-1.1.h0 <grup>.

Untuk melewati pemberitahuan ini: .tugas tolak TUG-1.1.h0
~~~~

</details>

<!-- END-COMMAND-CATALOG -->

## 🧪 7. Pengujian & Verifikasi Kualitas (QA)

Jalankan suite Vitest dan uji katalog dari root proyek.

```bash
# Jalankan pengecekan tipe TypeScript
npx tsc --noEmit

# Jalankan seluruh unit & integration test
npm test

# Build ke JavaScript produksi (dist/)
npm run build
npm run test:commands
# Perbarui transkrip setelah perubahan handler
npm run docs:commands
```

---

## 📂 8. Peta Dokumentasi Teknis (`docs/`)

- 📖 [Katalog Perintah Lengkap (`docs/COMMANDS.md`)](docs/COMMANDS.md)
- 📊 [Status Implementasi Fitur (`docs/FEATURE_STATUS.md`)](docs/FEATURE_STATUS.md)
- 🗂️ [Inventaris Fitur Akira (`docs/AKIRA_FEATURE_INVENTORY.md`)](docs/AKIRA_FEATURE_INVENTORY.md)
- 🔍 [Audit Keamanan Fitur Legacy (`docs/LEGACY_FEATURE_AUDIT.md`)](docs/LEGACY_FEATURE_AUDIT.md)
- 📱 [Matriks Provider WhatsApp (`docs/WHATSAPP_PROVIDER_MATRIX.md`)](docs/WHATSAPP_PROVIDER_MATRIX.md)
- 🏛️ [Keputusan Arsitektur (`docs/DECISIONS.md`)](docs/DECISIONS.md)
- 🧩 [Arsitektur Sistem (`docs/ARCHITECTURE.md`)](docs/ARCHITECTURE.md)
- 🗄️ [Skema Database (`docs/DATABASE.md`)](docs/DATABASE.md)
- ⚙️ [Panduan Instalasi (`docs/INSTALLATION.md`)](docs/INSTALLATION.md)
- 🚀 [Panduan Deployment 24/7 (`docs/DEPLOYMENT.md`)](docs/DEPLOYMENT.md)
- 🛡️ [Keamanan & Privasi (`docs/SECURITY.md`)](docs/SECURITY.md)
- 🧪 [Panduan Pengujian (`docs/TESTING.md`)](docs/TESTING.md)
- 🛠️ [Troubleshooting & Runbook (`docs/TROUBLESHOOTING.md`)](docs/TROUBLESHOOTING.md)
