# 🤖🩺 HdyBot — Nursing Class A Assistant (Semester 5A)

Versi revisi 9 November 2026. Relay grup meminta persetujuan Hedy lewat DM. Menu .keperawatan memakai Perawat.org, dan .music mencari SoundCloud. Untuk fitur aktif, batas pengujian, konfigurasi Drive, dan pemulihan, lihat [laporan implementasi](IMPLEMENTATION_STATUS.md) dan [audit proyek](PROJECT_AUDIT.md). Installer memakai systemd dan membuat password unik pada instalasi baru. QR hanya ditampilkan lewat akses lokal privat.

> **Asisten AI WhatsApp Akademik, Sekretaris Kelas Digital, & Pengelola Informasi Grup Cerdas (24/7 Daemon)**  
> Dirancang khusus untuk **Nursing Class A (S1 Ilmu Keperawatan — Semester 5A)** dengan pusat kendali penuh melalui WhatsApp pribadi **Hedy (`082233038659`)** dan ditenagai oleh **NVIDIA Nemotron Auto-Router AI**.

---

[Buka katalog perintah dan contoh balasan](#katalog-perintah-dan-contoh-balasan) · [Pengujian dan batas verifikasi](IMPLEMENTATION_STATUS.md)

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
| **🧠 Mesin AI Utama** | **NVIDIA Nemotron Auto-Router** | `lightning` (30B), `super-vl` (120B Vision), `ultra` (550B) |
| **🌏 Zona Waktu & Bahasa** | `Asia/Jakarta` (WIB) — Bahasa Indonesia (`id-ID`) | Akurat lintas tengah malam UTC |
| **🛡️ Keamanan VPS** | **Tanpa `ufw` & Tanpa `fail2ban` & Tanpa Port HTTP** | Installer tidak mengubah akses SSH. Monitoring melalui WhatsApp privat |

---

## 🔄 2. Arsitektur & Pipeline Alur Kerja (AI Workflow Pipelines)

### A. Percakapan grup dan persetujuan relay

Anggota dapat mengetik perintah titik atau menandai HdyBot dan mengajukan pertanyaan. Jawaban mengutip pesan pengirim. Untuk relay, daftarkan JID sumber dan tujuan melalui DM admin. Hedy menerima pratinjau, lalu memilih kirim atau tolak. Lihat alur lengkap di [laporan implementasi](IMPLEMENTATION_STATUS.md).

### Autentikasi dan router AI

Admin yang terdaftar membuka sesi lewat DM untuk perintah terbatas dan menguncinya dengan .logout. Router NVIDIA memilih model berdasarkan tugas dan modalitas. OCR lokal menggunakan Tesseract. Perubahan model memerlukan perintah admin tersendiri.

## 🌟 3. Penjelasan Rinci Fitur Operasional Unggulan

### Percakapan dan informasi kelas

Contoh: `.menu`, `@HdyBot jadwal besok?`, `.keperawatan`, `.sdki nyeri akut`, dan `.music fals`. Balasan nongkrong berbentuk percakapan biasa. Pengaturan grup disimpan per JID.

### Persetujuan Hedy

Gunakan `.setpjmk <jid>` dan `.setkelasa <jid>` dari DM admin. Saat ada pratinjau, kutip pesan itu dan jawab **ya** atau **tidak**. Alternatifnya, gunakan `.relay kirim <id>` atau `.relay tolak <id>`. Hanya pemilik terautentikasi yang dapat mengirim relay ke tujuan yang ditampilkan.

## 🛠️ 4. Cara Instalasi Lengkap (Ubuntu Server / VPS & Lokal)

### 📦 Prasyarat Sistem
- **OS**: Ubuntu Server 22.04 / 24.04 LTS (direkomendasikan untuk produksi 24/7) atau Windows/macOS untuk pengembangan.
- **Runtime**: Node.js `>= 20.11.0` LTS.
- **Browser Headless WA**: Google Chrome Stable (`/usr/bin/google-chrome-stable`) — dipasang otomatis oleh `install.sh`.
- **Database**: PostgreSQL untuk produksi (jadwal, audit, indeks dan worker pengingat). Mode mock tanpa DATABASE_URL membaca seed kelas. State lokal di `data/runtime/bot-state.json` menyimpan tugas, catatan, permainan, dan persetujuan relay.

---

### 🚀 Cara Install Otomatis di Ubuntu Server (Sekali Jalan dengan `install.sh`)

Skrip [`install.sh`](install.sh) sudah dirancang **idempoten**, memasang Node.js dan mengonfigurasi systemd, PostgreSQL, Google Chrome `.deb` asli (bukan Snap), membuat file `.env` dengan password admin acak, menjalankan migrasi + seed jadwal Semester 5A, serta mengaktifkan daemon 24/7 **tanpa `ufw` dan tanpa `fail2ban`** tanpa mengubah akses SSH:

```bash
# 1. Masuk ke folder project
cd /root/hdybot   # atau lokasi folder botwa Anda

# 2. Berikan izin eksekusi & jalankan installer
chmod +x install.sh
sudo ./install.sh
```

Saat WhatsApp memerlukan pairing, lihat QR di konsol privat dengan `sudo ./install.sh --qr`.

---

### ⚙️ Cara Install Manual (Langkah demi Langkah)

```bash
# 1. Install dependensi Node.js
npm install

# 2. Salin konfigurasi environment
cp .env.example .env

# 3. Edit .env (pastikan OWNER_WHATSAPP=082233038659, ADMIN_PASSWORD=<password admin dari konfigurasi>, dan isi NVIDIA_API_KEY)
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
ADMIN_PASSWORD=<password admin dari konfigurasi>
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

# Lihat QR Code WhatsApp & log secara live
pm2 logs hdybot --lines 100
```

**Tabel Perintah Operasional PM2:**

| 💻 Perintah PM2 | 📖 Fungsi |
| :--- | :--- |
| `pm2 start start.js --name hdybot` | Menjalankan HdyBot 24/7 di background |
| `pm2 logs hdybot --lines 100` | Menampilkan QR Code WhatsApp & log aktivitas bot |
| `pm2 status` | Melihat status hidup/mati, uptime, dan pemakaian RAM |
| `pm2 restart hdybot` | Me-restart bot setelah update kode atau `.env` |
| `pm2 stop hdybot` | Menghentikan bot sementara |

---

### 🔵 Opsi 2: Menjalankan 24/7 dengan `install.sh` (Systemd Ubuntu Server)

| 💻 Perintah `install.sh` | 📖 Fungsi Operasional |
| :--- | :--- |
| `sudo ./install.sh` | Instalasi penuh + build + aktifkan daemon 24/7 + tampilkan QR Code |
| `sudo ./install.sh --qr` | Menampilkan QR Code WhatsApp aktif yang masih segar (< 18 detik, bebas expired) |
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

Klik kategori untuk membuka transkrip. Setiap baris menampilkan contoh ketikan, alias, akses, dan balasan dari dispatcher melalui WhatsApp mock. Baris lampiran menunjukkan jenis file yang dihasilkan. Alias sebaris memakai contoh dari ejaan pertama.

Contoh memakai Senin, 9 November 2026 pukul 07.30 WIB. Identitas, nonce, dan beberapa nilai yang berubah disamarkan. Respons NVIDIA, HTTP, serta dokumen Drive berasal dari fixture. Pratinjau jadwal memakai kelas uji tanpa menulis database. Program OS seperti OCR/TTS memerlukan instalasi di host. Balasan konfigurasi menunjukkan prasyarat. Pengujian PostgreSQL terisolasi tersedia melalui scripts/check-schedule-db.mjs.

Percakapan grup juga mengenali mention, nama bot, dan kutipan. Misalnya, “HdyBot, jadwal besok?” menjalankan rute jadwal. Pertanyaan bebas mendapat jawaban percakapan yang mengutip pengirim. Grup sumber mengirim pratinjau ke DM owner. Kutip pratinjau dan balas **ya** untuk mengirim teks yang disetujui atau **tidak** untuk menolak.

<details>
<summary><strong>Kelas, profil, dan jadwal</strong></summary>

Cari anggota dan dosen, lihat jadwal mingguan atau per tanggal, serta ekspor jadwal. Admin dapat mengubah slot lewat DM. Pratinjau terikat pada versi jadwal; konfirmasi membuat backup dan audit dalam transaksi PostgreSQL yang sama.

**.kelas**

Pengguna · Alias: `.semester`, `.tahunajaran`

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

Pengguna · Alias: `.mahasiswa`, `.nim`

~~~~text
⚠️ Tidak ditemukan anggota kelas dengan kata kunci: *Contoh*. Ketik `.anggota` untuk melihat seluruh 36 mahasiswa.
~~~~

**.pengurus**

Pengguna · Alias: `.ketuakelas`, `.komting`, `.wakilkomting`, `.sekretaris`, `.bendahara`, `.wali`, `.pjmk`

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

Pengguna · Alias: `.aturan`

~~~~text
📜 *Tata Tertib Grup & Penggunaan HdyBot*
1. Gunakan bahasa yang sopan, jelas, dan saling menghormati sesama mahasiswa & dosen.
2. Pengumuman jadwal, perubahan ruang, dan tugas resmi wajib mencantumkan sumber yang jelas.
3. Dilarang mengirim spam, hoaks, konten NSFW, atau data pribadi sensitif pasien/teman.
4. Seluruh pengiriman pengumuman penting ke grup utama berada di bawah kendali persetujuan Hedy.
~~~~

**.faq**

Pengguna

~~~~text
❓ *FAQ — HdyBot — Nursing Class A Assistant*
• *Bagaimana cara cek jadwal kuliah?* Ketik `.jadwal`, `.besok`, atau `.jadwal senin`.
• *Bagaimana cara membuat stiker?* Kirim/balas gambar dengan caption `.sticker` atau ketik `.ttp <teks>`.
• *Bagaimana cara bertanya materi keperawatan?* Ketik `.ask <pertanyaan>`.
• *Bagaimana cara login admin?* Chat pribadi ke bot dari nomor admin (<nomor privat>) lalu balas password ketika diminta.
~~~~

**.profile**

Pengguna · Alias: `.me`

~~~~text
🪪 *Profil Pengguna*
• JID: `<JID pengguna>`
• Nama Tampilan: *Mahasiswa 5A*
• Konteks Chat: *private*
• Status Admin: *Admin Terotorisasi*
~~~~

**.matkul**

Pengguna

~~~~text
📚 *Mata Kuliah Semester 5A (Nursing Class A)*
1. *Metodologi Penelitian* [METPEN] — 4 SKS
2. *Keperawatan Anak Sakit dan Kronis dan Terminal* [KAST] — 2 SKS
3. *Keperawatan Menjelang Ajal* [KMA] — 3 SKS
4. *Konsep Keperawatan Agregat Komunitas* [KAK] — 2 SKS
5. *Entrepreneurship 2* [ENT2] — 4 SKS
6. *Keperawatan Gerontik* [GERO] — 4 SKS
7. *Keperawatan Dewasa Sistem Muskuloskeletal, Integumen, Persepsi Sensori dan Persyarafan* [KDW] — 3 SKS
Total SKS Mata Kuliah: *22 SKS* (status: perlu verifikasi dokumen resmi)
~~~~

**.dosen Contoh**

Pengguna · Alias: `.nomordosen`, `.kontakdosen`

~~~~text
📭 Tidak ditemukan nomor dosen dengan kata kunci: *Contoh*. Ketik `.dosen` atau `.nomordosen` untuk daftar lengkap 23 dosen.
~~~~

**.groupid**

Pengguna · Alias: `.id`

~~~~text
🆔 *Informasi Chat/Grup*
• Chat JID: `<JID pengguna>`
• Tipe: *private*
• Pengirim Terdeteksi: `<JID pengguna>`
~~~~

**.jadwal**

Pengguna · Alias: `.schedule`

~~~~text
📅 *Jadwal Nursing Class A (5A) — Senin (2026-11-09)*
1. *08:00–09:40 WIB* — Metodologi Penelitian (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
2. *09:40–11:20 WIB* — Keperawatan Anak Sakit dan Kronis dan Terminal (2 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
3. *12:30–14:10 WIB* — Keperawatan Menjelang Ajal (3 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
⏸️ Istirahat · 11:20–12:30 WIB
~~~~

**.jadwal hariini**

Pengguna · Alias: `.schedule hariini`

~~~~text
📅 *Jadwal Nursing Class A (5A) — Senin (2026-11-09)*
1. *08:00–09:40 WIB* — Metodologi Penelitian (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
2. *09:40–11:20 WIB* — Keperawatan Anak Sakit dan Kronis dan Terminal (2 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
3. *12:30–14:10 WIB* — Keperawatan Menjelang Ajal (3 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
⏸️ Istirahat · 11:20–12:30 WIB
~~~~

**.jadwal senin**

Pengguna · Alias: `.schedule senin` · Nama hari senin sampai minggu diterima.

~~~~text
📅 *Jadwal Nursing Class A (5A) — Senin*
1. *08:00–09:40 WIB* — Metodologi Penelitian (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
2. *09:40–11:20 WIB* — Keperawatan Anak Sakit dan Kronis dan Terminal (2 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
3. *12:30–14:10 WIB* — Keperawatan Menjelang Ajal (3 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
⏸️ Istirahat · 11:20–12:30 WIB
~~~~

**.besok**

Pengguna

~~~~text
📅 *Jadwal Nursing Class A (5A) — Selasa (2026-11-10)*
1. *08:00–09:40 WIB* — Konsep Keperawatan Agregat Komunitas (2 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
2. *09:40–11:20 WIB* — Entrepreneurship 2 (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
3. *12:30–14:10 WIB* — Metodologi Penelitian (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
⏸️ Istirahat · 11:20–12:30 WIB
~~~~

**.jadwal besok**

Pengguna · Alias: `.schedule besok`

~~~~text
📅 *Jadwal Nursing Class A (5A) — Selasa (2026-11-10)*
1. *08:00–09:40 WIB* — Konsep Keperawatan Agregat Komunitas (2 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
2. *09:40–11:20 WIB* — Entrepreneurship 2 (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
3. *12:30–14:10 WIB* — Metodologi Penelitian (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
⏸️ Istirahat · 11:20–12:30 WIB
~~~~

**.mingguini**

Pengguna

~~~~text
📅 *Jadwal Nursing Class A (5A) — Senin*
1. *08:00–09:40 WIB* — Metodologi Penelitian (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
2. *09:40–11:20 WIB* — Keperawatan Anak Sakit dan Kronis dan Terminal (2 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
3. *12:30–14:10 WIB* — Keperawatan Menjelang Ajal (3 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
⏸️ Istirahat · 11:20–12:30 WIB

📅 *Jadwal Nursing Class A (5A) — Selasa*
1. *08:00–09:40 WIB* — Konsep Keperawatan Agregat Komunitas (2 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
2. *09:40–11:20 WIB* — Entrepreneurship 2 (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
3. *12:30–14:10 WIB* — Metodologi Penelitian (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
⏸️ Istirahat · 11:20–12:30 WIB

📅 *Jadwal Nursing Class A (5A) — Rabu*
1. *08:00–09:40 WIB* — Keperawatan Gerontik (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
2. *09:40–11:20 WIB* — Keperawatan Dewasa Sistem Muskuloskeletal, Integumen, Persepsi Sensori dan Persyarafan (3 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
3. *12:30–14:10 WIB* — Keperawatan Menjelang Ajal (3 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
⏸️ Istirahat · 11:20–12:30 WIB

📅 *Jadwal Nursing Class A (5A) — Kamis*
1. *08:00–09:40 WIB* — Entrepreneurship 2 (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
2. *09:40–11:20 WIB* — Metodologi Penelitian (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
3. *12:30–14:10 WIB* — Keperawatan Gerontik (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
⏸️ Istirahat · 11:20–12:30 WIB

📅 *Jadwal Nursing Class A (5A) — Jumat*
1. *08:00–09:40 WIB* — Keperawatan Gerontik (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
2. *09:40–11:20 WIB* — Keperawatan Dewasa Sistem Muskuloskeletal, Integumen, Persepsi Sensori dan Persyarafan (3 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
3. *12:30–14:10 WIB* — Entrepreneurship 2 (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
⏸️ Istirahat · 11:20–12:30 WIB

📅 *Jadwal Nursing Class A (5A) — SATURDAY*
Tidak ada jadwal kuliah terjadwal.

📅 *Jadwal Nursing Class A (5A) — SUNDAY*
Tidak ada jadwal kuliah terjadwal.
~~~~

**.jadwal minggu**

Pengguna · Alias: `.jadwal mingguini`, `.schedule minggu`, `.schedule mingguini`

~~~~text
📅 *Jadwal Nursing Class A (5A) — Senin*
1. *08:00–09:40 WIB* — Metodologi Penelitian (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
2. *09:40–11:20 WIB* — Keperawatan Anak Sakit dan Kronis dan Terminal (2 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
3. *12:30–14:10 WIB* — Keperawatan Menjelang Ajal (3 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
⏸️ Istirahat · 11:20–12:30 WIB

📅 *Jadwal Nursing Class A (5A) — Selasa*
1. *08:00–09:40 WIB* — Konsep Keperawatan Agregat Komunitas (2 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
2. *09:40–11:20 WIB* — Entrepreneurship 2 (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
3. *12:30–14:10 WIB* — Metodologi Penelitian (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
⏸️ Istirahat · 11:20–12:30 WIB

📅 *Jadwal Nursing Class A (5A) — Rabu*
1. *08:00–09:40 WIB* — Keperawatan Gerontik (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
2. *09:40–11:20 WIB* — Keperawatan Dewasa Sistem Muskuloskeletal, Integumen, Persepsi Sensori dan Persyarafan (3 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
3. *12:30–14:10 WIB* — Keperawatan Menjelang Ajal (3 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
⏸️ Istirahat · 11:20–12:30 WIB

📅 *Jadwal Nursing Class A (5A) — Kamis*
1. *08:00–09:40 WIB* — Entrepreneurship 2 (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
2. *09:40–11:20 WIB* — Metodologi Penelitian (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
3. *12:30–14:10 WIB* — Keperawatan Gerontik (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
⏸️ Istirahat · 11:20–12:30 WIB

📅 *Jadwal Nursing Class A (5A) — Jumat*
1. *08:00–09:40 WIB* — Keperawatan Gerontik (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
2. *09:40–11:20 WIB* — Keperawatan Dewasa Sistem Muskuloskeletal, Integumen, Persepsi Sensori dan Persyarafan (3 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
3. *12:30–14:10 WIB* — Entrepreneurship 2 (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
⏸️ Istirahat · 11:20–12:30 WIB

📅 *Jadwal Nursing Class A (5A) — SATURDAY*
Tidak ada jadwal kuliah terjadwal.

📅 *Jadwal Nursing Class A (5A) — SUNDAY*
Tidak ada jadwal kuliah terjadwal.
~~~~

**.kuliahberikutnya**

Pengguna

~~~~text
⏭️ *Kuliah Berikutnya (2026-11-09 — Senin)*
• Jam: *08:00–09:40 WIB*
• Mata Kuliah: *Metodologi Penelitian* (4 SKS)
• Ruang: belum ditentukan
• Kandidat Dosen (perlu konfirmasi sesi): Facrur Rozi, S.Kep., Ns., M.Kep; Eliza Zihni, S.Kep., Ns., M.Kep; Prawito, S.Kep., Ns., M.Kep; Karisma Dwi Ana, S.Kep., Ns., M.Kep
~~~~

**.cekjadwal 2026-11-10**

Pengguna

~~~~text
📅 *Jadwal Nursing Class A (5A) — Selasa (2026-11-10)*
1. *08:00–09:40 WIB* — Konsep Keperawatan Agregat Komunitas (2 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
2. *09:40–11:20 WIB* — Entrepreneurship 2 (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
3. *12:30–14:10 WIB* — Metodologi Penelitian (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
⏸️ Istirahat · 11:20–12:30 WIB
~~~~

**.matkulhariini**

Pengguna

~~~~text
🗓️ Senin · 2026-11-09
08:00 · Metodologi Penelitian
09:40 · Keperawatan Anak Sakit dan Kronis dan Terminal
12:30 · Keperawatan Menjelang Ajal
~~~~

**.dosenhariini**

Pengguna

~~~~text
🗓️ Senin · 2026-11-09
08:00 · Metodologi Penelitian · Facrur Rozi, S.Kep., Ns., M.Kep, Eliza Zihni, S.Kep., Ns., M.Kep, Prawito, S.Kep., Ns., M.Kep, Karisma Dwi Ana, S.Kep., Ns., M.Kep
09:40 · Keperawatan Anak Sakit dan Kronis dan Terminal · Asri Kusyani, S.Kep., Ns., M.Kep, dr. Alia Astutik, M.Kes, Yusina Vidhiastutik, Ns., M.Kep, Eli Rahmawati, M.Kes
12:30 · Keperawatan Menjelang Ajal · Aditya Nurdin A, S.Kep., Ns., M.Kep, Dr. Darsini, S.Kep., Ns., M.Kes, Dwi Uswatun, S.Kep., Ns., M.Kep, Eliza Zihni Z, S.Kep., Ns., M.Kep
~~~~

**.ruanganhariini**

Pengguna

~~~~text
🗓️ Senin · 2026-11-09
08:00 · Metodologi Penelitian · Ruang belum ditetapkan
09:40 · Keperawatan Anak Sakit dan Kronis dan Terminal · Ruang belum ditetapkan
12:30 · Keperawatan Menjelang Ajal · Ruang belum ditetapkan
~~~~

**.jadwal export csv**

Pengguna · Alias: `.schedule export`

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

Pengguna · Alias: `.schedule export`

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
    "status": "USER_PROVIDED_PENDING_CONFIRMATION"
  }
]
```
~~~~

**.tambahjadwal minggu|07:00|08:00|METPEN|Lab**

DM admin terverifikasi · Alias: `.jadwal add`, `.jadwal tambah`, `.schedule add`, `.schedule tambah`

~~~~text
*Pratinjau perubahan jadwal*
Tambahkan minggu 07:00–08:00 WIB · Metodologi Penelitian · Lab

Setujui dengan .confirm <nonce> atau batalkan dengan .cancel <nonce>.
~~~~

**.editjadwal minggu|07:00|minggu|08:00|09:00|METPEN|Lab**

DM admin terverifikasi · Alias: `.jadwal edit`, `.jadwal ubah`, `.schedule edit`, `.schedule ubah`

~~~~text
*Pratinjau perubahan jadwal*
Ubah minggu 07:00 menjadi minggu 08:00–09:00 WIB · Metodologi Penelitian · Lab

Setujui dengan .confirm <nonce> atau batalkan dengan .cancel <nonce>.
~~~~

**.hapusjadwal minggu|07:00**

DM admin terverifikasi · Alias: `.jadwal delete`, `.jadwal hapus`, `.schedule delete`, `.schedule hapus`

~~~~text
*Pratinjau perubahan jadwal*
Hapus sesi minggu 07:00 beserta 0 pengecualian tanggal.

Setujui dengan .confirm <nonce> atau batalkan dengan .cancel <nonce>.
~~~~

**.resetjadwal**

DM admin terverifikasi · Alias: `.jadwal reset`, `.schedule reset`

~~~~text
*Pratinjau perubahan jadwal*
Pulihkan 15 sesi mingguan dari seed. 1 sesi saat ini dan seluruh pengecualian tanggalnya akan diganti.

Setujui dengan .confirm <nonce> atau batalkan dengan .cancel <nonce>.
~~~~

**.kelompok 2 Ani,Budi,Citra,Deni**

Pengguna · Alias: `.buatkelompok`

~~~~text
👥 *Hasil Pembagian Kelompok Adil (2 Kelompok — Total 4 Mahasiswa)*
*Kelompok 1* (Ketua: Ani):
Anggota: Ani, Citra

*Kelompok 2* (Ketua: Budi):
Anggota: Budi, Deni
~~~~

**.kalender**

Pengguna · Alias: `.agenda`

~~~~text
🗓️ Belum ada tanggal kalender akademik resmi yang dikonfirmasi di database.
~~~~

**.countdown 2026-11-16**

Pengguna

~~~~text
⏳ Hitung mundur menuju *2026-11-16*: *7 hari*.
~~~~

</details>

<details>
<summary><strong>Tugas, catatan, dan pengingat</strong></summary>

Tambah dan selesaikan tugas berdasarkan ID. Filter hari dan minggu mengikuti WIB. Pengingat disimpan per chat oleh worker PostgreSQL pada produksi. Contoh lokal memakai pengingat JSON untuk kompatibilitas.

**.tasks**

Pengguna · Alias: `.tugas`, `.deadline`, `.mytask`, `.progress`

~~~~text
📌 *Daftar Tugas & Deadline Nursing Class A (3)*
• *TUG-3* [OPEN] — *Metodologi*
  Judul: Diskusi
  Deadline: *2026-11-09* | Ket: -

• *TUG-1* [OPEN] — *Metodologi Penelitian*
  Judul: Proposal Bab 1–3 Latar Belakang & Rumusan Masalah
  Deadline: *2026-11-14* | Ket: Kumpulkan draft PDF melalui PJ Mata Kuliah (Inneke, Fitri) sebelum pukul 14:00 WIB.

• *TUG-2* [OPEN] — *Keperawatan Gerontik*
  Judul: Asuhan Keperawatan Lansia (Studi Kasus Kelompok)
  Deadline: *2026-11-18* | Ket: Presentasi kelompok sesuai pembagian kelompok Semester 5A (PJ: Rika, Imel).

_Tambah tugas: `.tugas add <Matkul>|<Judul>|<YYYY-MM-DD>|<Ket>` | Selesai: `.tugas done <ID>`_
~~~~

**.tugas list**

Pengguna · Alias: `.tasks list`, `.deadline list`, `.mytask list`, `.progress list`

~~~~text
📌 *Daftar Tugas & Deadline Nursing Class A (3)*
• *TUG-3* [OPEN] — *Metodologi*
  Judul: Diskusi
  Deadline: *2026-11-09* | Ket: -

• *TUG-1* [OPEN] — *Metodologi Penelitian*
  Judul: Proposal Bab 1–3 Latar Belakang & Rumusan Masalah
  Deadline: *2026-11-14* | Ket: Kumpulkan draft PDF melalui PJ Mata Kuliah (Inneke, Fitri) sebelum pukul 14:00 WIB.

• *TUG-2* [OPEN] — *Keperawatan Gerontik*
  Judul: Asuhan Keperawatan Lansia (Studi Kasus Kelompok)
  Deadline: *2026-11-18* | Ket: Presentasi kelompok sesuai pembagian kelompok Semester 5A (PJ: Rika, Imel).

_Tambah tugas: `.tugas add <Matkul>|<Judul>|<YYYY-MM-DD>|<Ket>` | Selesai: `.tugas done <ID>`_
~~~~

**.tugas all**

Pengguna · Alias: `.tugas semua`, `.tasks all`, `.deadline all`, `.mytask all`, `.progress all`, `.tasks semua`, `.deadline semua`, `.mytask semua`, `.progress semua`

~~~~text
📌 *Daftar Tugas & Deadline Nursing Class A (3)*
• *TUG-3* [OPEN] — *Metodologi*
  Judul: Diskusi
  Deadline: *2026-11-09* | Ket: -

• *TUG-1* [OPEN] — *Metodologi Penelitian*
  Judul: Proposal Bab 1–3 Latar Belakang & Rumusan Masalah
  Deadline: *2026-11-14* | Ket: Kumpulkan draft PDF melalui PJ Mata Kuliah (Inneke, Fitri) sebelum pukul 14:00 WIB.

• *TUG-2* [OPEN] — *Keperawatan Gerontik*
  Judul: Asuhan Keperawatan Lansia (Studi Kasus Kelompok)
  Deadline: *2026-11-18* | Ket: Presentasi kelompok sesuai pembagian kelompok Semester 5A (PJ: Rika, Imel).

_Tambah tugas: `.tugas add <Matkul>|<Judul>|<YYYY-MM-DD>|<Ket>` | Selesai: `.tugas done <ID>`_
~~~~

**.tugas aktif**

Pengguna · Alias: `.tasks aktif`, `.deadline aktif`, `.mytask aktif`, `.progress aktif`

~~~~text
📌 *Daftar Tugas & Deadline Nursing Class A (3)*
• *TUG-3* [OPEN] — *Metodologi*
  Judul: Diskusi
  Deadline: *2026-11-09* | Ket: -

• *TUG-1* [OPEN] — *Metodologi Penelitian*
  Judul: Proposal Bab 1–3 Latar Belakang & Rumusan Masalah
  Deadline: *2026-11-14* | Ket: Kumpulkan draft PDF melalui PJ Mata Kuliah (Inneke, Fitri) sebelum pukul 14:00 WIB.

• *TUG-2* [OPEN] — *Keperawatan Gerontik*
  Judul: Asuhan Keperawatan Lansia (Studi Kasus Kelompok)
  Deadline: *2026-11-18* | Ket: Presentasi kelompok sesuai pembagian kelompok Semester 5A (PJ: Rika, Imel).

_Tambah tugas: `.tugas add <Matkul>|<Judul>|<YYYY-MM-DD>|<Ket>` | Selesai: `.tugas done <ID>`_
~~~~

**.tugas hariini**

Pengguna · Alias: `.tasks hariini`, `.deadline hariini`, `.mytask hariini`, `.progress hariini`

~~~~text
📌 *Daftar Tugas & Deadline Nursing Class A (1)*
• *TUG-3* [OPEN] — *Metodologi*
  Judul: Diskusi
  Deadline: *2026-11-09* | Ket: -

_Tambah tugas: `.tugas add <Matkul>|<Judul>|<YYYY-MM-DD>|<Ket>` | Selesai: `.tugas done <ID>`_
~~~~

**.tugas mingguini**

Pengguna · Alias: `.tasks mingguini`, `.deadline mingguini`, `.mytask mingguini`, `.progress mingguini`

~~~~text
📌 *Daftar Tugas & Deadline Nursing Class A (2)*
• *TUG-3* [OPEN] — *Metodologi*
  Judul: Diskusi
  Deadline: *2026-11-09* | Ket: -

• *TUG-1* [OPEN] — *Metodologi Penelitian*
  Judul: Proposal Bab 1–3 Latar Belakang & Rumusan Masalah
  Deadline: *2026-11-14* | Ket: Kumpulkan draft PDF melalui PJ Mata Kuliah (Inneke, Fitri) sebelum pukul 14:00 WIB.

_Tambah tugas: `.tugas add <Matkul>|<Judul>|<YYYY-MM-DD>|<Ket>` | Selesai: `.tugas done <ID>`_
~~~~

**.tugas detail TUG-1**

Pengguna · Alias: `.tasks detail`, `.deadline detail`, `.mytask detail`, `.progress detail`

~~~~text
📌 *Daftar Tugas & Deadline Nursing Class A (1)*
• *TUG-1* [OPEN] — *Metodologi Penelitian*
  Judul: Proposal Bab 1–3 Latar Belakang & Rumusan Masalah
  Deadline: *2026-11-14* | Ket: Kumpulkan draft PDF melalui PJ Mata Kuliah (Inneke, Fitri) sebelum pukul 14:00 WIB.

_Tambah tugas: `.tugas add <Matkul>|<Judul>|<YYYY-MM-DD>|<Ket>` | Selesai: `.tugas done <ID>`_
~~~~

**.tugas add Metodologi|Makalah|2026-11-16|Kelompok 1**

Pengguna · Alias: `.tugas tambah`, `.tasks add`, `.deadline add`, `.mytask add`, `.progress add`, `.tasks tambah`, `.deadline tambah`, `.mytask tambah`, `.progress tambah`

~~~~text
✅ *Tugas Baru Ditambahkan (TUG-4)*
• Mata Kuliah: *Metodologi*
• Judul: *Makalah*
• Deadline: *2026-11-16*
• Keterangan: Kelompok 1
~~~~

**.tugas done TUG-1**

Pengguna · Alias: `.tugas selesai`, `.tasks done`, `.deadline done`, `.mytask done`, `.progress done`, `.tasks selesai`, `.deadline selesai`, `.mytask selesai`, `.progress selesai`

~~~~text
✅ Tugas *TUG-1* (Proposal Bab 1–3 Latar Belakang & Rumusan Masalah) ditandai *SELESAI*.
~~~~

**.tugas del TUG-1**

Pengguna · Alias: `.tugas delete`, `.tugas hapus`, `.tasks del`, `.deadline del`, `.mytask del`, `.progress del`, `.tasks delete`, `.deadline delete`, `.mytask delete`, `.progress delete`, `.tasks hapus`, `.deadline hapus`, `.mytask hapus`, `.progress hapus`

~~~~text
🗑️ Tugas *TUG-1* dihapus.
~~~~

**.reminder**

Pengguna · Alias: `.reminders`

~~~~text
⏰ *Daftar Pengingat Kustom (1)*
• *REM-1* — 2026-11-10 08:00 WIB: Diskusi
~~~~

**.reminder settings**

Pengguna · Alias: `.reminders settings`

~~~~text
Zona waktu Asia/Jakarta. Worker database belum terhubung.
~~~~

**.reminder add 2026-11-10 08:00|Diskusi**

Pengguna · Alias: `.reminder tambah`, `.reminders add`, `.reminders tambah`

~~~~text
⏰ Pengingat *REM-2* dijadwalkan pada *2026-11-10 08:00 WIB*: _Diskusi_
~~~~

**.reminder snooze REM-1 15**

Pengguna · Alias: `.reminders snooze`

~~~~text
💤 Pengingat *REM-1* ditunda 15 menit.
~~~~

**.reminder delete REM-1**

Pengguna · Alias: `.reminder del`, `.reminder hapus`, `.reminders delete`, `.reminders del`, `.reminders hapus`

~~~~text
🗑️ Pengingat *REM-1* dibatalkan.
~~~~

**.reminder pause**

DM admin terverifikasi · Alias: `.reminders pause`

~~~~text
Worker pengingat belum terhubung ke database.
~~~~

**.reminder resume**

DM admin terverifikasi · Alias: `.reminders resume`

~~~~text
Worker pengingat belum terhubung ke database.
~~~~

**.announce**

Pengguna · Alias: `.pengumuman`

~~~~text
📢 Belum ada riwayat draft pengumuman. Buat dengan `.announce draft penting|Judul|Isi`.
~~~~

**.announce draft penting|Diskusi|Bawa catatan**

Pengguna · Alias: `.announce create`, `.pengumuman draft`, `.pengumuman create`

~~~~text
📢 *Draft Pengumuman Dibuat (ANN-1)*
• Prioritas: *PENTING*
• Judul: *Diskusi*
• Isi: Bawa catatan
~~~~

**.note**

Pengguna · Alias: `.catatan`

~~~~text
📝 *Daftar Catatan Kelas (1)*
• *NOTE-1* — *Diskusi*: Bawa buku
~~~~

**.note add Rapat|Bawa catatan**

Pengguna · Alias: `.note tambah`, `.catatan add`, `.catatan tambah`

~~~~text
📝 Catatan *NOTE-2* (Rapat) berhasil disimpan.
~~~~

**.note del NOTE-1**

Pengguna · Alias: `.note delete`, `.note hapus`, `.catatan del`, `.catatan delete`, `.catatan hapus`

~~~~text
🗑️ Catatan *NOTE-1* dihapus.
~~~~

</details>

<details>
<summary><strong>Materi, Drive, jurnal, dan AI</strong></summary>

Telusuri folder kelas, ambil file, atau tanyakan isi dokumen dengan rujukan. Pengiriman dokumen dibatasi ke chat yang disetujui owner. Perintah AI umum, ringkasan, kuis, kartu belajar, dan terjemahan juga tersedia.

**.dokumen**

Pengguna · Alias: `.materi`

~~~~text
📂 *Materi kelas*

Metode belajar.txt
Folder utama · M1

Halaman 1/1
~~~~

**.carimateri belajar**

Pengguna

~~~~text
📂 *Materi kelas*

Metode belajar.txt
Folder utama · M1

Halaman 1/1
~~~~

**.materi cari belajar**

Pengguna

~~~~text
📂 *Materi kelas*

Metode belajar.txt
Folder utama · M1

Halaman 1/1
~~~~

**.materi detail M1**

Pengguna

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

Pengguna

~~~~text
📂 *Materi kelas*

Metode belajar.txt
Folder utama · M1

Halaman 1/1
~~~~

**.materi minggu1**

Pengguna

~~~~text
📂 *Materi kelas*

Tidak ada dokumen yang cocok.
~~~~

**.materi halaman 1**

Pengguna

~~~~text
📂 *Materi kelas*

Metode belajar.txt
Folder utama · M1

Halaman 1/1
~~~~

**.drive status**

DM admin terverifikasi · Alias: `.drive errors`

~~~~text
Sinkronisasi berhasil.
Jumlah dokumen: 1
Indeks terakhir: 9/11/2026, 07.30.00
~~~~

**.drive sync**

DM admin terverifikasi

~~~~text
Sinkronisasi berhasil.
Jumlah dokumen: 1
Indeks terakhir: 9/11/2026, 07.30.00
~~~~

**.drive files**

Pengguna

~~~~text
📂 *Materi kelas*

Metode belajar.txt
Folder utama · M1

Halaman 1/1
~~~~

**.drive search belajar**

Pengguna

~~~~text
📂 *Materi kelas*

Metode belajar.txt
Folder utama · M1

Halaman 1/1
~~~~

**.ambilmateri M1**

Pengguna · Alias: `.download`

~~~~text
Metode belajar.txt · Belum dikategorikan
[Lampiran text/plain · Metode belajar.txt]
~~~~

**.ringkasdokumen M1**

Pengguna

~~~~text
Contoh respons NVIDIA untuk pengujian format.

📂 Metode belajar.txt · Belum dikategorikan
Bagian teks: bagian 1
~~~~

**.tanyadokumen M1 Apa metode belajar?**

Pengguna

~~~~text
Contoh respons NVIDIA untuk pengujian format.

📂 Metode belajar.txt · Belum dikategorikan
Bagian teks: bagian 1
~~~~

**.jurnal belajar**

Pengguna · Alias: `.carijurnal`, `.journal`, `.scholar`, `.googlescholar`, `.pubmed`, `.garuda`

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

Pengguna · Alias: `.tanya`, `.brainly`

~~~~text
🤖 *Jawaban AI umum*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.ask materi M1 Apa metode belajar?**

Pengguna

~~~~text
Contoh respons NVIDIA untuk pengujian format.

📂 Metode belajar.txt · Belum dikategorikan
Bagian teks: bagian 1
~~~~

**.rapikan besok bawa buku**

Pengguna · Alias: `.perbaiki`, `.rewrite`, `.parafrase`, `.koreksi`

~~~~text
✍️ *Hasil perbaikan teks*

Contoh respons NVIDIA untuk pengujian format.
~~~~

**.summarize Belajar bersama. Catat hasil diskusi.**

Pengguna · Alias: `.ringkas`

~~~~text
📝 *Ringkasan Materi (HdyBot Study Assistant)*
• *Poin Inti:* Belajar bersama. Catat hasil diskusi.
• *Panjang Asli:* 37 karakter (2 kalimat)
_Label: Hasil ringkasan bantu belajar._
~~~~

**.flashcard belajar**

Pengguna

~~~~text
📚 *Latihan belajar*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.quiz belajar**

Pengguna · Alias: `.kuis`

~~~~text
📚 *Latihan belajar*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.translate en Terima kasih**

Pengguna · Alias: `.tr`

~~~~text
🌐 *Terjemahan*
Contoh respons NVIDIA untuk pengujian format.
~~~~

</details>

<details>
<summary><strong>Keperawatan dan Perawat.org</strong></summary>

Pencarian kategori mengembalikan artikel dan tautan sumber. Kalkulator menghitung langsung dari nilai dan satuan yang diberikan. Contoh artikel, cuaca, dan jawaban AI dalam katalog menggunakan data uji.

**.keperawatan**

Pengguna

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

Pengguna

~~~~text
*Artikel contoh*

Contoh respons NVIDIA untuk pengujian format.

https://perawat.org/nyeri-akut/
~~~~

**.sop pasang infus**

Pengguna

~~~~text
*Artikel contoh*

Contoh respons NVIDIA untuk pengujian format.

https://perawat.org/sop-pemasangan-infus/
~~~~

**.askep stroke**

Pengguna

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

Pengguna

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

Pengguna

~~~~text
*PENUNJANG · Perawat.org*

Artikel contoh
https://perawat.org/artikel-contoh/

Berkas contoh
https://perawat.org/wp-content/uploads/contoh.pdf

https://perawat.org/category/pemeriksaan-penunjang/
~~~~

**.ukom**

Pengguna

~~~~text
*UKOM · Perawat.org*

Artikel contoh
https://perawat.org/artikel-contoh/

Berkas contoh
https://perawat.org/wp-content/uploads/contoh.pdf

https://perawat.org/category/ukom/
~~~~

**.kampus**

Pengguna

~~~~text
*KAMPUS · Perawat.org*

Artikel contoh
https://perawat.org/artikel-contoh/

Berkas contoh
https://perawat.org/wp-content/uploads/contoh.pdf

https://perawat.org/category/kampus/
~~~~

**.kuisukom**

Pengguna · Alias: `.kuis ukom`

~~~~text
*Latihan Ukom · Hitung cairan*

Dalam satu periode, total cairan masuk 1.650 mL dan keluar 1.400 mL. Berapa balance cairannya?

Coba jawab dulu, lalu periksa dengan .balance 1650 1400.

Soal latihan buatan HdyBot. Materi: https://perawat.org/risiko-ketidakseimbangan-cairan/
~~~~

**.highalert**

Pengguna · Alias: `.high alert`

~~~~text
*Artikel contoh*

Contoh respons NVIDIA untuk pengujian format.

https://perawat.org/3-jenis-obat-high-alert-yang-perlu-diwaspadai-perawat/
~~~~

**.safety**

Pengguna · Alias: `.patient safety`

~~~~text
*SAFETY · Perawat.org*

Artikel contoh
https://perawat.org/artikel-contoh/

Berkas contoh
https://perawat.org/wp-content/uploads/contoh.pdf

https://perawat.org/tag/patient-safety/
~~~~

**.berita**

Pengguna

~~~~text
*BERITA · Perawat.org*

Artikel contoh
https://perawat.org/artikel-contoh/

Berkas contoh
https://perawat.org/wp-content/uploads/contoh.pdf

https://perawat.org/category/berita/
~~~~

**.ppni**

Pengguna

~~~~text
*PPNI · Perawat.org*

Artikel contoh
https://perawat.org/artikel-contoh/

Berkas contoh
https://perawat.org/wp-content/uploads/contoh.pdf

https://perawat.org/category/pojok-ppni/
~~~~

**.mtb**

Pengguna · Alias: `.bias`

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

Pengguna · Alias: `.download`

~~~~text
*EBOOK · Perawat.org*

Berkas contoh
https://perawat.org/wp-content/uploads/contoh.pdf

https://perawat.org/download/

Seri e-book Merawat Tanpa Bias · https://tanpabias.perawat.org/perpustakaan-mtb/
~~~~

**.imt 65 170**

Pengguna

~~~~text
IMT = 22,49 kg/m²
https://perawat.org/kalkulator-indeks-massa-tubuh-imt/
~~~~

**.gcs E4 V5 M6**

Pengguna

~~~~text
E4 V5 M6 = GCS 15/15
https://perawat.org/pengkajian-tingkat-kesadaran-gcs-glasgow-coma-scale/
~~~~

**.balance 1800 1500**

Pengguna

~~~~text
Balance cairan tercatat: 300 mL
Masuk 1.800 mL − keluar 1.500 mL.
https://perawat.org/risiko-ketidakseimbangan-cairan/
~~~~

**.tetesan 500 ml 6 jam 20**

Pengguna

~~~~text
28 tetes/menit
500 mL × 20 tetes/mL ÷ 360 menit.
Contoh hitung untuk belajar.
https://perawat.org/kalkulator-tetesan-infus/
~~~~

**.kalkulatorperawat**

Pengguna · Alias: `.kalkulator`

~~~~text
*KALKULATOR · Perawat.org*

Artikel contoh
https://perawat.org/artikel-contoh/

Berkas contoh
https://perawat.org/wp-content/uploads/contoh.pdf

https://perawat.org/category/kalkulator/
~~~~

</details>

<details>
<summary><strong>Media, musik, dan dokumen</strong></summary>

Balas gambar/stiker untuk konversi. Dokumen izin dan notulensi berupa draf teks; perintah PDF, QR, kartu ucapan dan kartu jadwal mengirim lampiran. TTS memerlukan espeak-ng. SoundCloud menyediakan tautan; koleksi MP3 lokal berizin dapat dikirim sebagai dokumen.

**.suratizin Ani|Metodologi|2026-11-10|Kegiatan kampus**

Pengguna

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

Pengguna · Alias: `.doc permission`, `.pdf create`, `.pdf permission`

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

Pengguna

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

Pengguna · Alias: `.pdf minutes`

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

Pengguna · Alias: `.pdf`, `.pdf pdf`

~~~~text
📄 *Dokumen PDF Draft Siap:* Agenda _(DRAFT — perlu review sebelum dikirim resmi)_
[Lampiran application/pdf · agenda-draft.pdf]
~~~~

**.sticker**

Pengguna · Alias: `.stiker`, `.s`, `.stickerwm` · Dengan gambar.

~~~~text
🎨 Stiker berhasil dibuat!
[Lampiran image/webp]
~~~~

**.ttp Kelas A**

Pengguna · Alias: `.attp`

~~~~text
🎨 Stiker teks: *Kelas A*
[Lampiran image/webp]
~~~~

**.toimg**

Pengguna · Dengan stiker WebP.

~~~~text
🖼️ Stiker berhasil dikonversi menjadi gambar PNG.
[Lampiran image/png · sticker.png]
~~~~

**.blur**

Pengguna · Dengan gambar.

~~~~text
🖼️ Efek gambar *BLUR* selesai diproses.
[Lampiran image/png · hdybot-blur.png]
~~~~

**.invert**

Pengguna · Dengan gambar.

~~~~text
🖼️ Efek gambar *INVERT* selesai diproses.
[Lampiran image/png · hdybot-invert.png]
~~~~

**.grayscale**

Pengguna · Alias: `.hitamputih` · Dengan gambar.

~~~~text
🖼️ Efek gambar *GRAYSCALE* selesai diproses.
[Lampiran image/png · hdybot-grayscale.png]
~~~~

**.flip**

Pengguna · Dengan gambar.

~~~~text
🖼️ Efek gambar *FLIP* selesai diproses.
[Lampiran image/png · hdybot-flip.png]
~~~~

**.flop**

Pengguna · Dengan gambar.

~~~~text
🖼️ Efek gambar *FLOP* selesai diproses.
[Lampiran image/png · hdybot-flop.png]
~~~~

**.resize 128 128**

Pengguna · Dengan gambar.

~~~~text
🖼️ Efek gambar *RESIZE* selesai diproses.
[Lampiran image/png · hdybot-resize.png]
~~~~

**.compress**

Pengguna · Dengan gambar.

~~~~text
🖼️ Efek gambar *COMPRESS* selesai diproses.
[Lampiran image/jpeg · hdybot-compress.jpg]
~~~~

**.quotemaker Tetap belajar|Kelas A**

Pengguna · Alias: `.makequote`, `.quotesmaker`

~~~~text
🖼️ Kartu Kutipan: “Tetap belajar” — Kelas A
[Lampiran image/png · quote-card.png]
~~~~

**.kartujadwal senin**

Pengguna

~~~~text
🖼️ Kartu visual *JADWAL KULIAH 5A — SENIN*
[Lampiran image/png · jadwal-5a.png]
~~~~

**.kartuucapan Semangat**

Pengguna

~~~~text
Kartu ucapan kelas
[Lampiran image/png · ucapan.png]
~~~~

**.gambar kelas**

Pengguna · Alias: `.carigambar`, `.img`, `.image`, `.foto`, `.carifoto`, `.pinterest`

~~~~text
🖼️ *Ilustrasi & Pencarian Gambar — kelas*
• Galeri Google Images: https://www.google.com/search?tbm=isch&q=kelas
• Sumber Referensi: https://www.google.com/search?tbm=isch&q=kelas
[Lampiran image/png · visual-kelas.png]
~~~~

**.qr Halo kelas**

Pengguna · Alias: `.qrcode`

~~~~text
🔳 QR Code untuk: `Halo kelas`
[Lampiran image/png · qrcode.png]
~~~~

**.ocr**

Pengguna · Perlu gambar dan Tesseract pada server.

~~~~text
⚠️ Kirim gambar/foto catatan dengan caption `.ocr` (atau balas gambar dengan `.ocr`) untuk mengekstrak teks.
~~~~

**.tts Halo kelas**

Pengguna · Alias: `.say` · Memerlukan espeak-ng dengan suara Indonesia.

~~~~text
Sintesis suara belum tersedia. Periksa instalasi espeak-ng di server.
~~~~

**.music fals**

Pengguna · Alias: `.musik` · Hasil API memerlukan kredensial SoundCloud. MP3 hanya berasal dari koleksi lokal berizin.

~~~~text
Cari “fals” di SoundCloud
https://soundcloud.com/search/sounds?q=fals
~~~~

</details>

<details>
<summary><strong>Utilitas dan hiburan</strong></summary>

Hitung IPK, BMI, ekspresi matematika, dan konversi satuan; cari cuaca, artikel, atau waktu salat. Kurs bawaan menggunakan angka referensi statis. URL check memeriksa format dan tujuan alamat. Alias shortlink tidak membuat tautan pendek.

**.ipk 4:4.0, 2:3.5**

Pengguna · Alias: `.gpa`

~~~~text
🎓 *Kalkulator IP/IPK*: Total *6 SKS* → IP = *3.83*
~~~~

**.bmi 65 170**

Pengguna

~~~~text
⚖️ *Kalkulator BMI Edukatif*: BMI = *22.5* (Kategori: *Normal*).
~~~~

**.calc (2+3)\*4**

Pengguna · Alias: `.hitung`, `.kalkulator`

~~~~text
🧮 *Hasil Kalkulator:*
`(2+3)*4` = *20*
~~~~

**.convert 5 km m**

Pengguna · Alias: `.konversi`, `.kurs`

~~~~text
📏 *Konversi Panjang:* 5 km = *5000 m*
~~~~

**.jam**

Pengguna · Alias: `.waktu`, `.clock`

~~~~text
🕒 *Informasi Waktu Nasional & Dunia*
• *WIB (Asia/Jakarta):* Senin, 09 Nov 2026, 07.30.00
• *WITA (Asia/Makassar):* Senin, 09 Nov 2026, 08.30.00
• *WIT (Asia/Jayapura):* Senin, 09 Nov 2026, 09.30.00
• *UTC:* 2026-11-09T00:30:00.000Z
~~~~

**.cuaca Jakarta**

Pengguna · Alias: `.weather`

~~~~text
🌤️ *Cuaca Saat Ini — Jakarta*
• Suhu: *28 °C*
• Kelembapan: *70%*
• Kecepatan Angin: *- km/jam*
_Sumber: Open-Meteo (Asia/Jakarta)_
~~~~

**.wiki belajar**

Pengguna · Alias: `.wikipedia`, `.kbbi`

~~~~text
📖 *Wikipedia Bahasa Indonesia — Belajar*
Contoh ringkasan untuk pengujian.

🔗 Sumber: https://id.wikipedia.org/wiki/belajar
~~~~

**.urlcheck https://perawat.org**

Pengguna · Alias: `.shortlink`

~~~~text
🔍 *Pemeriksaan Keamanan URL/Domain*
• URL Normal: https://perawat.org/
• Hostname: `perawat.org`
• Protokol: *HTTPS*
• Status SSRF Guard: *AMAN (bukan IP privat/loopback/metadata)*
~~~~

**.pantun nasehat**

Pengguna

~~~~text
🎭 *Hiburan kelas*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.quotes lucu**

Pengguna · Alias: `.quoterandom`, `.katabijak`

~~~~text
🎭 *Hiburan kelas*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.quotesislami**

Pengguna

~~~~text
🎭 *Hiburan kelas*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.quotesmotivasi**

Pengguna · Alias: `.quotesnasehat`

~~~~text
🎭 *Hiburan kelas*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.motivasi tema belajar**

Pengguna

~~~~text
🎭 *Hiburan kelas*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.katahariini tema belajar**

Pengguna

~~~~text
🎭 *Hiburan kelas*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.tebak-tebakan tema belajar**

Pengguna

~~~~text
🎭 *Hiburan kelas*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.roasting tema belajar**

Pengguna

~~~~text
🎭 *Hiburan kelas*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.gombal tema belajar**

Pengguna

~~~~text
🎭 *Hiburan kelas*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.rayuan tema belajar**

Pengguna

~~~~text
🎭 *Hiburan kelas*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.cerpen tema belajar**

Pengguna

~~~~text
🎭 *Hiburan kelas*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.cerita tema belajar**

Pengguna

~~~~text
🎭 *Hiburan kelas*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.faktaunik**

Pengguna

~~~~text
🧬 *Fakta Unik Kesehatan & Sains*
Jantung manusia rata-rata berdetak sekitar 100.000 kali per hari dan memompa sekitar 7.500 liter darah.
~~~~

**.doaharian**

Pengguna · Alias: `.ayatkursi`

~~~~text
🤲 *Doa Sebelum Belajar:*
“Rabbi zidnii ‘ilman warzuqnii fahman, waj’alnii minash-shaalihiin.”
(Ya Allah, tambahkanlah ilmu kepadaku, berikanlah aku pemahaman, dan jadikanlah aku termasuk golongan orang-orang yang saleh).
~~~~

**.listsurah**

Pengguna · Alias: `.quran`

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

Pengguna

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

Pengguna

~~~~text
🎯 *TRUTH (Jujur):*
Apa kebiasaan belajar terbaik yang ingin kamu mulai minggu ini?
~~~~

**.dare**

Pengguna

~~~~text
🔥 *DARE (Tantangan Aman):*
Buat 1 pantun semangat belajar untuk teman-teman Nursing Class A!
~~~~

**.dadu**

Pengguna

~~~~text
🎲 *Lempar Dadu:* Kamu mendapatkan angka *6*!
~~~~

**.koin**

Pengguna · Alias: `.flipcoin`

~~~~text
🪙 *Lempar Koin:* Hasilnya adalah *GAMBAR (Tails)*!
~~~~

**.suit batu**

Pengguna

~~~~text
✊✌️✋ *Suit Jepang*
• Kamu: *BATU*
• HdyBot: *GUNTING*
• Hasil: *KAMU MENANG! 🎉*
~~~~

**.apakah belajar bersama**

Pengguna

~~~~text
🐚 *Kerang Ajaib HdyBot*
• Pertanyaan: _belajar bersama_
• Jawaban: *Ya, tentu saja!*
~~~~

**.kapankah belajar bersama**

Pengguna

~~~~text
🔮 *Pertanyaan:* Kapankah belajar bersama?
*Jawaban:* Besok pagi
~~~~

**.bisakah belajar bersama**

Pengguna

~~~~text
🐚 *Kerang Ajaib HdyBot*
• Pertanyaan: _belajar bersama_
• Jawaban: *Ya, tentu saja!*
~~~~

**.kerangajaib belajar bersama**

Pengguna

~~~~text
🐚 *Kerang Ajaib HdyBot*
• Pertanyaan: _belajar bersama_
• Jawaban: *Ya, tentu saja!*
~~~~

**.rate belajar bersama**

Pengguna

~~~~text
📊 *Penilaian HdyBot untuk "belajar bersama":* *6/100* ⭐
~~~~

**.hilih Ani**

Pengguna

~~~~text
✨ *Hasil (hilih):*
Ini
~~~~

**.alay Ani**

Pengguna

~~~~text
✨ *Hasil (alay):*
4n1
~~~~

**.besarkecil Ani**

Pengguna

~~~~text
✨ *Hasil (besarkecil):*
AnI
~~~~

**.balikhuruf Ani**

Pengguna

~~~~text
✨ *Hasil (balikhuruf):*
inA
~~~~

**.namaninja Ani**

Pengguna

~~~~text
✨ *Hasil (namaninja):*
katoki
~~~~

**.afk belajar**

Pengguna

~~~~text
💤 Status *AFK* diaktifkan untuk `<JID pengguna>`
• Alasan: _belajar_
~~~~

**.unafk**

Pengguna

~~~~text
👋 Selamat datang kembali! Status AFK Anda telah dinonaktifkan.
~~~~

</details>

<details>
<summary><strong>Permainan, XP, dan statistik</strong></summary>

Setiap chat memiliki sesi sendiri. Buat ruang untuk memilih peserta, level dan batas waktu. Jawaban benar menghasilkan XP bagi peserta yang mengaktifkan gamifikasi. Riwayat, skor, status AFK dan mode grup disimpan dalam state lokal.

**.game**

Pengguna

~~~~text
🎮 *Permainan kelas*
• .tebakkata
• .caklontong
• .family100
• .mathquiz

.game <kategori> [easy|medium|hard]
sinonim (easy), antonim (easy), anagram (easy), tebakemoji (easy), deretangka (medium), asahotak (medium), tebakpola (hard), komputer (medium), matematika (hard)

Jawab melalui .jawab <teks>.
~~~~

**.game list**

Pengguna

~~~~text
🎮 *Permainan kelas*
• .tebakkata
• .caklontong
• .family100
• .mathquiz

.game <kategori> [easy|medium|hard]
sinonim (easy), antonim (easy), anagram (easy), tebakemoji (easy), deretangka (medium), asahotak (medium), tebakpola (hard), komputer (medium), matematika (hard)

Jawab melalui .jawab <teks>.
~~~~

**.game buat 2**

Pengguna

~~~~text
🎮 Sesi dibuat. Peserta dapat mengetik .game gabung. Pembuat memulai dengan .game mulai.
~~~~

**.game gabung**

Pengguna

~~~~text
Anda sudah tergabung.
~~~~

**.game keluar**

Pengguna

~~~~text
Sesi ditutup.
~~~~

**.game mulai antonim**

Pengguna

~~~~text
🎮 *antonim · easy*
Apa lawan kata konkret?
Petunjuk: Diawali huruf A.
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

**.game stop**

Pengguna

~~~~text
Sesi ditutup.
~~~~

**.game level easy**

Pengguna

~~~~text
🎮 Peserta 1/2 · acak · easy · 60 detik
~~~~

**.game kategori antonim**

Pengguna

~~~~text
🎮 Peserta 1/2 · antonim · semua level · 60 detik
~~~~

**.game waktu 45**

Pengguna

~~~~text
🎮 Peserta 1/2 · acak · semua level · 45 detik
~~~~

**.game riwayat**

Pengguna

~~~~text
Belum ada riwayat permainan Anda di chat ini.
~~~~

**.game acak easy**

Pengguna

~~~~text
🎮 *sinonim · easy*
Apa sinonim cermat yang diawali huruf T?
Petunjuk: Enam huruf.
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

**.sinonim**

Pengguna

~~~~text
🎮 *sinonim · easy*
Apa sinonim cermat yang diawali huruf T?
Petunjuk: Enam huruf.
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

**.antonim**

Pengguna

~~~~text
🎮 *antonim · easy*
Apa lawan kata konkret?
Petunjuk: Diawali huruf A.
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

**.anagram**

Pengguna

~~~~text
🎮 *anagram · easy*
Susun I — S — R — U — K menjadi nama benda.
Petunjuk: Digunakan untuk duduk.
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

**.tebakemoji**

Pengguna

~~~~text
🎮 *tebakemoji · easy*
📚 + 🐛 mengingatkan pada ungkapan apa untuk orang yang gemar membaca?
Petunjuk: Dua kata.
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

**.deretangka**

Pengguna

~~~~text
🎮 *deretangka · medium*
Lanjutkan pola 3, 6, 11, 18, …
Petunjuk: Perhatikan selisih antarangka.
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

**.asahotak**

Pengguna

~~~~text
🎮 *asahotak · medium*
Ada 5 tim. Setiap pasang tim bertemu satu kali. Berapa pertandingan?
Petunjuk: Setiap tim menghadapi empat lawan.
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

**.tebakpola**

Pengguna

~~~~text
🎮 *tebakpola · hard*
A, C, F, J, O, … Huruf berikutnya?
Petunjuk: Jarak lompatan bertambah satu.
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

**.tebakkata**

Pengguna

~~~~text
🧩 *Tebak Kata Keperawatan*
Huruf Acak: *E - K - O - O - P - S - S - T - T*
Petunjuk: _Alat medis untuk mendengarkan suara jantung dan paru-paru (auskultasi)._
Balas dengan `.jawab <kata>`
~~~~

**.caklontong**

Pengguna

~~~~text
😂 *Teka-Teki Cak Lontong*
Soal: *Orang yang sakit biasanya dibawa ke...*
Petunjuk: Kalau di rumah sakit pun tetap masuk ke ruangan/kamar dulu.
Balas dengan `.jawab <jawaban>`
~~~~

**.family100**

Pengguna

~~~~text
👨‍👩‍👧‍👦 *Survei Family 100 Kelas 5A*
Pertanyaan: *Sebutkan alat yang selalu dibawa mahasiswa keperawatan saat praktikum!*
Petunjuk: Alat pengukur tekanan darah.
Balas dengan `.jawab <jawaban>`
~~~~

**.mathquiz**

Pengguna

~~~~text
🧮 *Kuis Matematika Cepat*
Soal: *Berapakah hasil dari 14 × 9 + 10 ?*
Balas dengan `.jawab <angka>`
~~~~

**.game komputer medium**

Pengguna

~~~~text
🎮 *komputer · medium*
Bilangan biner 1011 bernilai berapa dalam desimal?
Petunjuk: Bobot digit dari kanan: 1, 2, 4, 8.
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

**.game matematika hard**

Pengguna

~~~~text
🎮 *matematika · hard*
Dua dadu adil dilempar. Berapa pasangan berurutan yang jumlahnya delapan?
Petunjuk: Mulai dari (2,6).
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

**.hint**

Pengguna

~~~~text
Diawali huruf A.
~~~~

**.dailychallenge**

Pengguna

~~~~text
🎮 *tebakemoji · easy*
📚 + 🐛 mengingatkan pada ungkapan apa untuk orang yang gemar membaca?
Petunjuk: Dua kata.
Waktu 60 detik. Balas dengan .jawab <jawaban>.
~~~~

**.score**

Pengguna

~~~~text
🏅 Skor XP Anda: 0
~~~~

**.jawab abstrak**

Pengguna

~~~~text
🎉 *BENAR!* Jawabannya adalah *ABSTRAK* — Konkret dapat diamati secara langsung. Abstrak merujuk pada gagasan.
~~~~

**.nyerah**

Pengguna · Alias: `.skip`

~~~~text
🏳️ Kuis dihentikan. Jawaban yang benar adalah: *ABSTRAK*. Konkret dapat diamati secara langsung. Abstrak merujuk pada gagasan.
~~~~

**.leaderboard**

Pengguna · Alias: `.lb`, `.level`, `.lvl`

~~~~text
🏆 *Leaderboard Akademik (Opt-In)*
1. <JID pengguna> — 25 XP (Level 1)
~~~~

**.privacy on**

Pengguna · Alias: `.privacy gamification`

~~~~text
✅ Anda telah *opt-in* ke fitur XP & Gamification akademik.
~~~~

**.privacy gamification off**

Pengguna

~~~~text
🔒 Fitur Gamification Anda telah *dinonaktifkan (opt-out)* dan data XP Anda dihapus.
~~~~

**.stats week**

Pengguna · Alias: `.activity`, `.report`

~~~~text
📈 *Laporan Analitik Kelas (WEEK) — Nursing Class A*
• Total Eksekusi Command: *1*
• Command Terpopuler: analytics.stats (1x)
• Tugas Aktif: *3* | Tugas Selesai: *0*
• Pengingat Terjadwal: *1*
• Catatan Kelas Tersimpan: *1*
_Data agregat kelas (privasi terjaga)._
~~~~

</details>

<details>
<summary><strong>Grup, persetujuan, dan operasional</strong></summary>

Pantau koneksi, AI, database, worker dan log melalui DM admin. Mode grup memerlukan owner atau admin grup. Persetujuan dan pengiriman relay lintas grup hanya dapat dijalankan oleh owner lewat DM.

**.login**

Pengguna · Alias: `.password`, `.pass`, `.auth` · Password disembunyikan.

~~~~text
🔐 *Verifikasi Admin HdyBot*
Silakan balas pesan ini dengan password admin Anda:
~~~~

**.logout**

Pengguna · Alias: `.lock`

~~~~text
🔒 Sesi admin telah dikunci. Ketika Anda chat kembali, bot akan meminta password admin.
~~~~

**.owner**

Pengguna

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

Pengguna

~~~~text
🤖 *Tentang HdyBot — Nursing Class A Assistant*
• Asisten AI Akademik & Sekretaris Kelas Digital untuk *Nursing Class A (Semester 5A)*
• Owner & Admin Utama: *Hedy* (`<nomor owner>`)
• Nomor Bot: *Dinamis / Bisa Ganti-Ganti via QR Code*
• Mesin AI: *NVIDIA Nemotron Auto-Router* (Lightning 30B, Super-VL 120B, Ultra 550B)
• Zona Waktu: *Asia/Jakarta*
~~~~

**.info**

Pengguna · Alias: `.ingfo`

~~~~text
🤖 *Tentang HdyBot — Nursing Class A Assistant*
• Asisten AI Akademik & Sekretaris Kelas Digital untuk *Nursing Class A (Semester 5A)*
• Owner & Admin Utama: *Hedy* (`<nomor owner>`)
• Nomor Bot: *Dinamis / Bisa Ganti-Ganti via QR Code*
• Mesin AI: *NVIDIA Nemotron Auto-Router* (Lightning 30B, Super-VL 120B, Ultra 550B)
• Zona Waktu: *Asia/Jakarta*
~~~~

**.menu**

Pengguna · Alias: `.allmenu`

~~~~text
🤖 *HDYBOT — NURSING CLASS A*
📚 Informasi kelas
━━━━━━━━━━━━━━━━━━━━
• .kelas
• .anggota [nama]
• .pengurus
• .rules
• .faq
• .matkul
• .dosen [nama]
• .kalender

Halaman 1/7
Lanjut dengan .menu 2
Gunakan .help <perintah> untuk melihat cara pakai.
~~~~

**.help calc**

Pengguna

~~~~text
💡 *Cara menggunakan*
.calc <rumus>
~~~~

**.status**

DM admin terverifikasi

~~~~text
🩺 *Health & Ready Check HdyBot (via WA Admin)*
• Kesehatan: *OK* (uptime 0s)
• WhatsApp (mock): *connected*
• Database: ok
• NVIDIA AI: mode=auto | calls=0
• Drive: Sinkronisasi berhasil.
Jumlah dokumen: 1
Indeks terakhir: 9/11/2026, 07.30.00
• Scheduler: belum tersedia
• RAM proses: <RAM> MiB
• Outbound: DISABLED | Dry-Run: ON | EmergencyStop: OFF
~~~~

**.system**

DM admin terverifikasi

~~~~text
🩺 *Health & Ready Check HdyBot (via WA Admin)*
• Kesehatan: *OK* (uptime 0s)
• WhatsApp (mock): *connected*
• Database: ok
• NVIDIA AI: mode=auto | calls=0
• Drive: Sinkronisasi berhasil.
Jumlah dokumen: 1
Indeks terakhir: 9/11/2026, 07.30.00
• Scheduler: belum tersedia
• RAM proses: <RAM> MiB
• Outbound: DISABLED | Dry-Run: ON | EmergencyStop: OFF
~~~~

**.dashboard**

DM admin terverifikasi

~~~~text
📊 *DASHBOARD HDYBOT — Halo Hedy*
• WhatsApp (mock): *connected*
• NVIDIA AI: *Belum diisi* | Mode: *auto*
• Model aktif: Lightning=nvidia/nemotron-3.5-lightning-30b-a3b, Super-VL=nvidia/nemotron-3.5-super-vl-120b-a12b, Ultra=nvidia/nemotron-3-ultra-550b-a55b
• Grup sumber aktif: *1*
• Pesan diproses hari ini: *1* (Penting: *1*)
• Menunggu review Hedy: *1*
• Kuliah berikutnya: *Metodologi Penelitian (Senin 08:00–09:40 WIB)*
• Outbound Emergency Stop: *Normal*
• Error terakhir: tidak ada | Health: OK
~~~~

**.health**

DM admin terverifikasi

~~~~text
🩺 *Health & Ready Check HdyBot (via WA Admin)*
• Kesehatan: *OK* (uptime 0s)
• WhatsApp (mock): *connected*
• Database: ok
• NVIDIA AI: mode=auto | calls=0
• Drive: Sinkronisasi berhasil.
Jumlah dokumen: 1
Indeks terakhir: 9/11/2026, 07.30.00
• Scheduler: belum tersedia
• RAM proses: <RAM> MiB
• Outbound: DISABLED | Dry-Run: ON | EmergencyStop: OFF
~~~~

**.ping**

DM admin terverifikasi

~~~~text
🏓 Pong! HdyBot — Nursing Class A Assistant aktif.
~~~~

**.runtime**

DM admin terverifikasi

~~~~text
⏱️ Runtime HdyBot: 0 detik | Timezone: Asia/Jakarta | Mode WA: mock
~~~~

**.logs 10**

DM admin terverifikasi

~~~~text
📋 *Log operasional*
Belum ada kejadian yang sesuai sejak proses dimulai.
~~~~

**.errors today**

DM admin terverifikasi

~~~~text
⚠️ *Laporan kendala*
Belum ada kejadian yang sesuai sejak proses dimulai.
~~~~

**.audit**

DM admin terverifikasi

~~~~text
📋 Belum ada entri audit log.
~~~~

**.backup status**

DM admin terverifikasi

~~~~text
Direktori backup tidak tersedia.
~~~~

**.storage**

DM admin terverifikasi

~~~~text
💾 Ruang tersedia: <ruang disk> GiB
RAM proses: <RAM> MiB
~~~~

**.pair**

DM admin terverifikasi · Adapter mendukung bootstrap sekali pakai. Startup produksi saat ini tidak menerbitkan bootstrap, sehingga perintah mengembalikan penolakan.

~~~~text
❌ Pairing ditolak (bootstrap_unavailable).
~~~~

**.db status**

DM admin terverifikasi

~~~~text
✅ Database merespons.
~~~~

**.whatsapp status**

DM admin terverifikasi

~~~~text
WhatsApp · connected
~~~~

**.scheduler status**

DM admin terverifikasi · Alias: `.workers`, `.queue`

~~~~text
Worker pengingat belum terhubung ke database.
~~~~

**.ai**

DM admin terverifikasi · Alias: `.ai status`

~~~~text
🧠 *NVIDIA Nemotron Router Status*
• Kredensial: belum dikonfigurasi
• Mode: *auto*
• Fallback: ON | Total Panggilan: 0
• *lightning* (fast): `nvidia/nemotron-3.5-lightning-30b-a3b` [diizinkan router]
• *super-vl* (vision): `nvidia/nemotron-3.5-super-vl-120b-a12b` [diizinkan router]
• *ultra* (reasoning): `nvidia/nemotron-3-ultra-550b-a55b` [diizinkan router]
~~~~

**.ai models**

DM admin terverifikasi

~~~~text
🧠 *NVIDIA Nemotron Router Status*
• Kredensial: belum dikonfigurasi
• Mode: *auto*
• Fallback: ON | Total Panggilan: 0
• *lightning* (fast): `nvidia/nemotron-3.5-lightning-30b-a3b` [diizinkan router]
• *super-vl* (vision): `nvidia/nemotron-3.5-super-vl-120b-a12b` [diizinkan router]
• *ultra* (reasoning): `nvidia/nemotron-3-ultra-550b-a55b` [diizinkan router]
~~~~

**.ai model lightning**

DM admin terverifikasi · Alias: `.ai pin`

~~~~text
✅ Model di-pin sementara ke *lightning* (nvidia/nemotron-3.5-lightning-30b-a3b). Akan kembali ke auto setelah TTL berakhir.
~~~~

**.ai auto on**

DM admin terverifikasi

~~~~text
✅ Mode router AI diatur ke *auto*.
~~~~

**.ai unpin**

DM admin terverifikasi

~~~~text
✅ Mode router AI diatur ke *auto*.
~~~~

**.ai test Halo**

DM admin terverifikasi

~~~~text
🧪 *Hasil Uji NVIDIA (lightning — nvidia/nemotron-3.5-lightning-30b-a3b):*
Contoh respons NVIDIA untuk pengujian format.
~~~~

**.groups**

DM admin terverifikasi · Alias: `.group`, `.source`, `.target`

~~~~text
👥 *Daftar Grup Terdaftar & Allow Access (1)*
• Mode Allow Access Semua Grup: *AKTIF ✅*
1. *Grup uji* (`sumber-uji@g.us`) — ALLOW / AKTIF ✅ [official]
~~~~

**.groups sources**

DM admin terverifikasi · Alias: `.groups list`, `.group sources`, `.source sources`, `.target sources`, `.group list`, `.source list`, `.target list`

~~~~text
👥 *Daftar Grup Terdaftar & Allow Access (1)*
• Mode Allow Access Semua Grup: *AKTIF ✅*
1. *Grup uji* (`sumber-uji@g.us`) — ALLOW / AKTIF ✅ [official]
~~~~

**.groups add sumber-uji@g.us Kelas**

DM admin terverifikasi · Alias: `.groups set`, `.group add`, `.source add`, `.target add`, `.group set`, `.source set`, `.target set`

~~~~text
✅ Grup sumber *Kelas* (`sumber-uji@g.us`) terdaftar dan aktif.
~~~~

**.groups pause sumber-uji@g.us**

DM admin terverifikasi · Alias: `.groups remove`, `.group pause`, `.source pause`, `.target pause`, `.group remove`, `.source remove`, `.target remove`

~~~~text
⏸️ Pemantauan & pengiriman grup `sumber-uji@g.us` dijeda.
~~~~

**.groups resume sumber-uji@g.us**

DM admin terverifikasi · Alias: `.group resume`, `.source resume`, `.target resume`

~~~~text
▶️ Pemantauan & pengiriman grup `sumber-uji@g.us` dilanjutkan.
~~~~

**.nimbrung on**

Owner atau admin grup · Alias: `.nongkrong`

~~~~text
Aku ikut nongkrong. Mau bahas apa?
~~~~

**.nimbrung status**

Owner atau admin grup · Alias: `.nongkrong status`

~~~~text
💬 *Status Mode Grup (kelas-uji@g.us)*
• Notifikasi AI: *🔴 BOT AI NONAKTIF (Mode Hening)*
• Mode Saat Ini: *MODE HENING (DIAM) 🤫*
• Ketik *"bot ikut nimbrung"* / `.nimbrung on` untuk mengajak bot nongkrong, atau *"bot berhenti"* / `.nimbrung off` untuk membuat bot kembali diam.
~~~~

**.diam**

Owner atau admin grup · Alias: `.hening`, `.berhentinimbrung`, `.nimbrung off`, `.nongkrong off`

~~~~text
Baik, aku berhenti nongkrong. Panggil aku kalau perlu bantuan.
~~~~

**.setpjmk sumber-uji@g.us**

DM admin terverifikasi

~~~~text
✅ *Grup Sumber PJMK Semester 5 Terdaftar!*
• Nama Grup: *PJMK Semester 5*
• JID: `sumber-uji@g.us`
• Pesan penting masuk ke chat pribadi Hedy untuk persetujuan.
~~~~

**.setkelasa kelas-uji@g.us**

DM admin terverifikasi · Alias: `.setnursing`

~~~~text
✅ *Grup Utama Nursing Class A Terdaftar!*
• JID Tujuan Relay: `kelas-uji@g.us`
• Pesan dari PJMK akan diteruskan ke sini setelah Hedy menyetujui pratinjau di chat pribadi.
~~~~

**.cekpesan Perubahan jadwal besok**

Pengguna · Alias: `.klasifikasi`

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

**.filter status**

DM admin terverifikasi · Alias: `.monitor status`

~~~~text
📡 *Status Monitoring & Digest Group Intelligence*
• Grup Sumber Aktif: *1*
• Pesan Diproses Hari Ini: *1*
• Pesan Penting Terdeteksi: *1*
• Menunggu Persetujuan Hedy: *1*
~~~~

**.filter review**

DM admin terverifikasi · Alias: `.monitor review`

~~~~text
📝 *Antrean Review Hedy (1)*
• *REV-1* [URGENT/schedule_change] (conf=0.9)
  Ringkasan: Perubahan jadwal diskusi besok.
  Ketik `.approve REV-1` atau `.reject REV-1 <alasan>`
~~~~

**.filter pause sumber-uji@g.us**

DM admin terverifikasi · Alias: `.filter off`, `.monitor pause`, `.monitor off`

~~~~text
⏸️ Pemantauan & pengiriman grup `sumber-uji@g.us` dijeda.
~~~~

**.filter resume sumber-uji@g.us**

DM admin terverifikasi · Alias: `.filter on`, `.monitor resume`, `.monitor on`

~~~~text
▶️ Pemantauan & pengiriman grup `sumber-uji@g.us` dilanjutkan.
~~~~

**.digest today**

DM admin terverifikasi

~~~~text
📡 *Status Monitoring & Digest Group Intelligence*
• Grup Sumber Aktif: *1*
• Pesan Diproses Hari Ini: *1*
• Pesan Penting Terdeteksi: *1*
• Menunggu Persetujuan Hedy: *1*
~~~~

**.priority**

DM admin terverifikasi

~~~~text
*Prioritas kelas*
REV-1 · URGENT
Perubahan jadwal diskusi besok.
~~~~

**.pending**

DM admin terverifikasi

~~~~text
📝 *Antrean Review Hedy (1)*
• *REV-1* [URGENT/schedule_change] (conf=0.9)
  Ringkasan: Perubahan jadwal diskusi besok.
  Ketik `.approve REV-1` atau `.reject REV-1 <alasan>`
~~~~

**.approve REV-1**

DM admin terverifikasi

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

DM admin terverifikasi

~~~~text
🚫 *REV-1* ditolak. Alasan: Ditolak oleh Hedy
~~~~

**.send REV-1**

DM admin terverifikasi

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

DM admin terverifikasi

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

DM admin terverifikasi

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

DM admin terverifikasi

~~~~text
✅ Pengumuman *REV-1* terkirim (mock-out-1).
~~~~

**.cancel NONCE**

DM admin terverifikasi

~~~~text
✅ Konfirmasi `<nonce>` dibatalkan.
~~~~

**.relay list**

DM admin terverifikasi

~~~~text
abc123 · pending → kelas-uji@g.us
Diskusi kelas besok.
~~~~

**.relay lihat abc123**

DM admin terverifikasi

~~~~text
sumber-uji@g.us → kelas-uji@g.us

Diskusi kelas besok.

.relay kirim abc123

.relay tolak abc123
~~~~

**.relay kirim abc123**

DM admin terverifikasi

~~~~text
Pesan sudah dikirim ke kelas-uji@g.us.
~~~~

**.relay tolak abc123**

DM admin terverifikasi

~~~~text
Pesan tidak diteruskan.
~~~~

**.admin pause**

DM admin terverifikasi · Alias: `.admin on`, `.maintenance pause`, `.maintenance on`

~~~~text
🛑 *EMERGENCY STOP AKTIF*. Seluruh pengiriman pesan keluar ke grup dihentikan seketika.
~~~~

**.admin resume**

DM admin terverifikasi · Alias: `.admin off`, `.maintenance resume`, `.maintenance off`

~~~~text
▶️ *Emergency Stop dinonaktifkan*. Pengiriman kembali mengikuti kebijakan normal.
~~~~

**.admin menu**

Pengguna · Alias: `.maintenance menu`

~~~~text
🤖 *HDYBOT — NURSING CLASS A*
📚 Informasi kelas
━━━━━━━━━━━━━━━━━━━━
• .kelas
• .anggota [nama]
• .pengurus
• .rules
• .faq
• .matkul
• .dosen [nama]
• .kalender

Halaman 1/7
Lanjut dengan .menu 2
Gunakan .help <perintah> untuk melihat cara pakai.
~~~~

**.admin status**

DM admin terverifikasi · Alias: `.maintenance status`

~~~~text
🩺 *Health & Ready Check HdyBot (via WA Admin)*
• Kesehatan: *OK* (uptime 0s)
• WhatsApp (mock): *connected*
• Database: ok
• NVIDIA AI: mode=auto | calls=0
• Drive: Sinkronisasi berhasil.
Jumlah dokumen: 1
Indeks terakhir: 9/11/2026, 07.30.00
• Scheduler: belum tersedia
• RAM proses: <RAM> MiB
• Outbound: DISABLED | Dry-Run: ON | EmergencyStop: OFF
~~~~

**.admin overview**

DM admin terverifikasi · Alias: `.maintenance overview`

~~~~text
📊 *DASHBOARD HDYBOT — Halo Hedy*
• WhatsApp (mock): *connected*
• NVIDIA AI: *Belum diisi* | Mode: *auto*
• Model aktif: Lightning=nvidia/nemotron-3.5-lightning-30b-a3b, Super-VL=nvidia/nemotron-3.5-super-vl-120b-a12b, Ultra=nvidia/nemotron-3-ultra-550b-a55b
• Grup sumber aktif: *1*
• Pesan diproses hari ini: *1* (Penting: *1*)
• Menunggu review Hedy: *1*
• Kuliah berikutnya: *Metodologi Penelitian (Senin 08:00–09:40 WIB)*
• Outbound Emergency Stop: *Normal*
• Error terakhir: tidak ada | Health: OK
~~~~

**.admin review**

DM admin terverifikasi · Alias: `.maintenance review`

~~~~text
📝 *Antrean Review Hedy (1)*
• *REV-1* [URGENT/schedule_change] (conf=0.9)
  Ringkasan: Perubahan jadwal diskusi besok.
  Ketik `.approve REV-1` atau `.reject REV-1 <alasan>`
~~~~

**.admin approve REV-1**

DM admin terverifikasi · Alias: `.maintenance approve`

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

DM admin terverifikasi · Alias: `.maintenance reject`

~~~~text
🚫 *REV-1* ditolak. Alasan: Ditolak oleh Hedy
~~~~

**.admin audit**

DM admin terverifikasi · Alias: `.maintenance audit`

~~~~text
📋 Belum ada entri audit log.
~~~~

**.admin backup**

DM admin terverifikasi · Alias: `.maintenance backup`

~~~~text
Direktori backup tidak tersedia.
~~~~

**.admin**

DM admin terverifikasi · Alias: `.maintenance`

~~~~text
📊 *DASHBOARD HDYBOT — Halo Hedy*
• WhatsApp (mock): *connected*
• NVIDIA AI: *Belum diisi* | Mode: *auto*
• Model aktif: Lightning=nvidia/nemotron-3.5-lightning-30b-a3b, Super-VL=nvidia/nemotron-3.5-super-vl-120b-a12b, Ultra=nvidia/nemotron-3-ultra-550b-a55b
• Grup sumber aktif: *1*
• Pesan diproses hari ini: *1* (Penting: *1*)
• Menunggu review Hedy: *1*
• Kuliah berikutnya: *Metodologi Penelitian (Senin 08:00–09:40 WIB)*
• Outbound Emergency Stop: *Normal*
• Error terakhir: tidak ada | Health: OK
~~~~

</details>

<details>
<summary><strong>Percakapan grup dan pratinjau relay</strong></summary>

**Pesan:** HdyBot, jadwal besok?

Jawaban yang mengutip pengirim:

~~~~text
@<pengirim>
📅 *Jadwal Nursing Class A (5A) — Selasa (2026-11-10)*
1. *08:00–09:40 WIB* — Konsep Keperawatan Agregat Komunitas (2 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
2. *09:40–11:20 WIB* — Entrepreneurship 2 (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
3. *12:30–14:10 WIB* — Metodologi Penelitian (4 SKS)
   Ruang: belum ditentukan | Status: USER_PROVIDED_PENDING_CONFIRMATION
⏸️ Istirahat · 11:20–12:30 WIB
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

.relay kirim c488d4f8f6049666
.relay tolak c488d4f8f6049666
Atau kutip pesan ini dan balas ya atau tidak.
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
