# 🤖🩺 HdyBot — Nursing Class A Assistant (Semester 5A)

Versi revisi 9 November 2026. Relay grup meminta persetujuan Hedy lewat DM. Menu .keperawatan memakai Perawat.org, dan .music mencari SoundCloud. Untuk fitur aktif, batas pengujian, konfigurasi Drive, dan pemulihan, lihat [laporan implementasi](IMPLEMENTATION_STATUS.md) dan [audit proyek](PROJECT_AUDIT.md). Installer memakai systemd dan membuat password unik pada instalasi baru. QR hanya ditampilkan lewat akses lokal privat.

> **Asisten AI WhatsApp Akademik, Sekretaris Kelas Digital, & Pengelola Informasi Grup Cerdas (24/7 Daemon)**  
> Dirancang khusus untuk **Nursing Class A (S1 Ilmu Keperawatan — Semester 5A)** dengan pusat kendali penuh melalui WhatsApp pribadi **Hedy (`082233038659`)** dan ditenagai oleh **NVIDIA Nemotron Auto-Router AI**.

---

## 📋 1. Identitas & Konfigurasi Inti Proyek

| 🏷️ Parameter | 📌 Nilai / Konfigurasi | 📝 Keterangan Operasional |
| :--- | :--- | :--- |
| **🤖 Nama Aplikasi** | `HdyBot` (`HdyBot — Nursing Class A Assistant`) | Asisten AI Akademik & Utilitas Kelas 5A |
| **👑 Owner & Admin Utama** | **Hedy** | Pemegang otoritas penuh kendali bot |
| **📱 Nomor WA Admin** | `082233038659` (`+6282233038659`) | Pusat kontrol via Chat Pribadi (DM) & Grup |
| **🔐 Password Admin WA** | `<password admin dari konfigurasi>` | Ditanyakan otomatis saat Admin chat ke bot |
| **📧 Email Owner** | `wibyjoe12@gmail.com` | Kontak resmi administrator |
| **📲 Nomor WA Bot** | **Bebas / Random / Dinamis** | Bisa ganti nomor kapan saja cukup scan QR baru |
| **🏥 Grup Utama (Target)** | **Nursing Class A** (Semester 5A) | Grup tujuan pengumuman & asisten kelas |
| **📡 Grup Sumber Otomatis** | **PJMK Semester 5** | Pesan penting diringkas AI + Tabel ke Nursing Class A |
| **🧠 Mesin AI Utama** | **NVIDIA Nemotron Auto-Router** | `lightning` (30B), `super-vl` (120B Vision), `ultra` (550B) |
| **🌏 Zona Waktu & Bahasa** | `Asia/Jakarta` (WIB) — Bahasa Indonesia (`id-ID`) | Akurat lintas tengah malam UTC |
| **🛡️ Keamanan VPS** | **Tanpa `ufw` & Tanpa `fail2ban` & Tanpa Port HTTP** | Tidak akan memblokir IP SSH Anda; pantau murni via WA |

---

## 🔄 2. Arsitektur & Pipeline Alur Kerja (AI Workflow Pipelines)

### A. Percakapan grup dan persetujuan relay

Anggota dapat mengetik perintah titik atau menandai HdyBot dan mengajukan pertanyaan. Jawaban mengutip pesan pengirim. Untuk relay, daftarkan JID sumber dan tujuan melalui DM admin. Hedy menerima pratinjau, lalu memilih kirim atau tolak. Lihat alur lengkap di [laporan implementasi](IMPLEMENTATION_STATUS.md).

### 🔐 B. Pipeline Verifikasi Password Admin Interaktif (`082233038659`)

```
+-------------------------------------------------------------------------+
| 1. Admin (082233038659) kirim chat pribadi ke nomor WA Bot (bebas/acak) |
|    Contoh: ".dashboard" atau "Halo bot"                                 |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
| 2. Bot mendeteksi sesi belum terverifikasi & menyimpan perintah awal    |
|    Bot membalas:                                                        |
|    "🔐 Verifikasi Password Admin HdyBot                                 |
|     Silakan balas pesan ini dengan password admin Anda:"                |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
| 3. Admin cukup membalas langsung di chat:                               |
|    <password admin dari konfigurasi>                                                             |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
| 4. ✅ Password Terverifikasi!                                           |
|    Sesi Admin aktif + perintah ".dashboard" tadi otomatis dijalankan!   |
|    (Ketik ".logout" kapan saja untuk mengunci kembali sesi admin)       |
+-------------------------------------------------------------------------+
```

---

### 🧠 C. Pipeline NVIDIA Nemotron Multi-Model Auto-Router

| 🚀 Lane / Alias | 🤖 Model ID NVIDIA | 🎯 Tugas yang Ditangani Otomatis | 🔄 Urutan Fallback |
| :--- | :--- | :--- | :--- |
| **`lightning`** _(Fast Lane)_ | `nvidia/nemotron-3.5-lightning-30b-a3b` | Klasifikasi pesan grup (`baik`/`buruk`, `inti_penting`/`tidak_penting`), ringkasan cepat, nimbrung grup, FAQ | `lightning` → `super-vl` → `ultra` |
| **`super-vl`** _(Vision Lane)_ | `nvidia/nemotron-3.5-super-vl-120b-a12b` | OCR gambar catatan/jadwal (`.ocr`), analisis foto pengumuman/dokumen | `super-vl` → `ultra` → `lightning` |
| **`ultra`** _(Deep Reasoning)_ | `nvidia/nemotron-3-ultra-550b-a55b` | Penulisan ulang pengumuman **PJMK Semester 5** + penyusunan tabel, tanya-jawab materi keperawatan kompleks (`.ask`), resolusi konflik jadwal | `ultra` → `super-vl` → `lightning` |

---

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
- **Database**: PostgreSQL 16 (opsional; bot juga memiliki *local state persistence* otomatis di `data/runtime/bot-state.json`).

---

### 🚀 Cara Install Otomatis di Ubuntu Server (Sekali Jalan dengan `install.sh`)

Skrip [`install.sh`](file:///c:/Users/HEDY/Documents/botwa/install.sh) sudah dirancang **idempoten**, memasang Node.js dan mengonfigurasi systemd, PostgreSQL, Google Chrome `.deb` asli (bukan Snap), membuat file `.env` dengan password admin acak, menjalankan migrasi + seed jadwal Semester 5A, serta mengaktifkan daemon 24/7 **tanpa `ufw` dan tanpa `fail2ban`** agar IP VPS Anda tidak pernah terblokir:

```bash
# 1. Masuk ke folder project
cd /root/hdybot   # atau lokasi folder botwa Anda

# 2. Berikan izin eksekusi & jalankan installer
chmod +x install.sh
sudo ./install.sh
```

Saat `install.sh` selesai, **QR Code WhatsApp** akan langsung muncul di layar terminal Anda!

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

Kami menyediakan entry point satu perintah [`start.js`](file:///c:/Users/HEDY/Documents/botwa/start.js) dan [`ecosystem.config.cjs`](file:///c:/Users/HEDY/Documents/botwa/ecosystem.config.cjs) yang otomatis memeriksa build TypeScript dan menjaga proses tetap hidup 24/7:

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

## 📚 6. Katalog Lengkap Perintah HdyBot (Mega Command Menu)

### 🔐 A. Kontrol Admin, Grup, & AI Router (Owner `082233038659` & Admin)

| 💬 Perintah / Kalimat | 📍 Konteks | 📝 Penjelasan |
| :--- | :--- | :--- |
| `.login <password admin dari konfigurasi>` / balas `<password admin dari konfigurasi>` | Private DM | Membuka kunci sesi kontrol Admin (`082233038659`) |
| `.logout` / `.lock` | Private DM | Mengunci kembali sesi Admin |
| `.dashboard` | Private DM | Menampilkan ringkasan lengkap kesehatan bot, AI, jadwal berikutnya, & antrean review |
| `.status` / `.health` / `.ping` / `.runtime` | DM / Grup | Memeriksa kesehatan bot, koneksi WA, uptime, dan status NVIDIA AI |
| `.groupid` / `.id` | DM / Grup | Menampilkan JID grup/chat saat ini & JID pengirim |
| `.setpjmk [id@g.us]` | DM admin | Menetapkan sumber PJMK untuk pratinjau relay ke Hedy |
| `.setkelasa [id@g.us]` | Grup / DM | Menetapkan grup saat ini sebagai grup utama **Nursing Class A** |
| `.nimbrung on` / `"bot ikut nimbrung"` / `@bot` | Grup (Owner/Admin) | Menyuruh bot ikut nimbrung & nongkrong menggunakan AI di grup |
| `.nimbrung off` / `.diam` / `"bot berhenti"` | Grup (Owner/Admin) | Menyuruh bot berhenti nimbrung dan kembali ke **Mode Hening** |
| `.nimbrung status` | Grup / DM | Melihat apakah grup sedang dalam Mode Hening atau Mode Nimbrung |
| `.cekpesan <teks>` / `.klasifikasi <teks>` | Grup / DM | Menguji hasil penilaian AI (`baik`/`buruk`, `inti_penting`/`tidak_penting`) beserta preview Tabel |
| `.groups` / `.groups add <jid> <nama>` | Private DM | Mengelola daftar grup sumber yang dipantau |
| `.pending` / `.approve <ID>` / `.reject <ID>` | Private DM | Memeriksa, menyetujui, atau menolak antrean review pengumuman |
| `.send <ID>` → `.confirm <NONCE>` | Private DM | Mengirim pengumuman yang telah disetujui dengan pengaman *nonce* |
| `.admin pause` / `.admin resume` | Private DM | *Emergency Stop* (menghentikan seketika seluruh pengiriman ke grup) & melanjutkannya |
| `.ai status` / `.ai models` | Private DM | Melihat status 3 model NVIDIA Nemotron (`lightning`, `super-vl`, `ultra`) |
| `.ai model <lightning\|super-vl\|ultra>` | Private DM | Mengunci (*pin*) model tertentu sementara waktu |
| `.ai auto on` / `.ai test <prompt>` | Private DM | Mengaktifkan mode pemilihan model otomatis & menguji respons AI |
| `.audit` / `.backup` | Private DM | Melihat log audit tindakan admin & status backup terenkripsi |

---

### 📅 B. Jadwal Kuliah, Dosen, Tugas, & Akademik Nursing Class A (Semester 5A)

| 💬 Perintah | 📝 Penjelasan |
| :--- | :--- |
| `.jadwal` / `jadwal hari ini` | Menampilkan jadwal kuliah Semester 5A hari ini |
| `.besok` / `.jadwal besok` | Menampilkan jadwal kuliah untuk besok |
| `.jadwal senin` .. `.jadwal jumat` | Menampilkan jadwal kuliah pada hari tertentu |
| `.mingguini` / `.jadwal minggu` | Menampilkan jadwal lengkap satu minggu (Senin–Jumat) |
| `.kuliahberikutnya` | Menampilkan sesi mata kuliah terdekat berikutnya beserta jam & kandidat dosen |
| `.jadwal export csv` / `.jadwal export json` | Mengekspor seluruh jadwal Semester 5A ke format CSV atau JSON |
| `.matkul` / `.dosen [nama_matkul]` | Menampilkan daftar 7 mata kuliah Semester 5A (22 SKS) & tim dosen pengampu |
| `.tugas` / `.tugas add <Matkul>\|<Judul>\|<YYYY-MM-DD>\|<Ket>` | Melihat daftar tugas/deadline & menambahkan tugas baru |
| `.tugas done <ID>` / `.tugas del <ID>` | Menandai tugas selesai atau menghapus tugas |
| `.reminder` / `.reminder add <YYYY-MM-DD HH:mm>\|<Judul>` | Melihat & menambah pengingat kustom (selain 6 reminder jadwal otomatis H-1d s/d selesai kuliah) |
| `.announce draft <prioritas>\|<Judul>\|<Isi>` | Membuat draft pengumuman kelas terformat |
| `.note add <Judul>\|<Isi>` / `.note list` | Menyimpan & melihat catatan bersama kelas |
| `.materi` / `.carimateri <kata_kunci>` | Mencari katalog materi kuliah & referensi resmi kampus |
| `.buatkelompok <jml> <nama1, nama2, ...>` | Membagi mahasiswa ke dalam kelompok tugas/praktikum secara adil beserta ketua kelompok |
| `.suratizin <Nama>\|<Matkul>\|<YYYY-MM-DD>\|<Alasan>` | Membuat draft surat izin tidak mengikuti perkuliahan |
| `.notulensi <Judul>\|<YYYY-MM-DD>\|<Poin1; Poin2>` | Membuat draft notulensi rapat kelas |
| `.kelas` / `.pengurus` / `.anggota` / `.rules` / `.faq` | Menampilkan profil kelas Nursing Class A, struktur pengurus, tata tertib, & FAQ |
| `.kalender` / `.countdown <YYYY-MM-DD>` | Menampilkan kalender akademik & hitung mundur hari menuju tanggal ujian/kegiatan |

---

### 🧠 C. AI Study Assistant (Asisten Belajar Keperawatan)

| 💬 Perintah | 📝 Penjelasan |
| :--- | :--- |
| `.ask <pertanyaan>` / `.tanya <pertanyaan>` | Bertanya materi keperawatan/akademik dengan jawaban terstruktur |
| `.summarize <teks>` / `.ringkas` (balas pesan) | Meringkas teks materi atau pengumuman panjang menjadi poin inti |
| `.flashcard <topik>` | Membuat kartu tanya-jawab (*flashcard*) belajar keperawatan |
| `.quiz <topik>` / `.kuis <topik>` | Memulai kuis latihan interaktif di grup/chat |
| `.translate <id\|en> <teks>` | Menerjemahkan istilah/abstrak jurnal kesehatan ke Bahasa Indonesia atau Inggris |

---

### 🎨 D. Media, Stiker, Efek Gambar, QR Code, & Dokumen PDF (`sharp`, `qrcode`, `pdf-lib`)

| 💬 Perintah | 📝 Penjelasan |
| :--- | :--- |
| `.sticker` / `.s` (kirim/balas gambar) | Mengubah gambar/foto menjadi stiker WhatsApp WebP `512x512` |
| `.ttp <teks>` / `.attp <teks>` | Membuat stiker WhatsApp bergambar teks warna-warni secara instan |
| `.toimg` (balas stiker) | Mengonversi stiker WhatsApp menjadi gambar PNG |
| `.blur` / `.invert` / `.grayscale` / `.flip` / `.flop` | Memberikan efek visual pada gambar yang dikirim/dibalas |
| `.resize <lebar> <tinggi>` / `.compress` | Mengubah ukuran resolusi atau mengompres ukuran gambar |
| `.quotemaker <kutipan>\|<penulis>` | Membuat kartu visual kutipan (*Quote Card* PNG) |
| `.kartujadwal [hari]` | Membuat kartu gambar visual jadwal kuliah Semester 5A |
| `.qr <teks atau tautan>` | Membuat gambar QR Code PNG resolusi tinggi |
| `.doc pdf <Judul>\|<Paragraf1; Paragraf2>` | Menghasilkan file dokumen **PDF asli** dan mengirimkannya di chat |
| `.ocr` (kirim/balas gambar) | Membaca & mengekstrak teks dari foto papan tulis/dokumen menggunakan **NVIDIA Super-VL Vision** |
| `.tts <teks>` | Mengubah teks menjadi format pesan suara/transkrip terstruktur |

---

### 🛠️ E. Utilitas & Hiburan Aman (Porting Fitur Akira yang Telah Disanitasi)

| 💬 Perintah | 📝 Penjelasan |
| :--- | :--- |
| `.cuaca <kota>` | Memeriksa informasi cuaca kota terkini |
| `.wiki <topik>` / `.kbbi <kata>` | Mencari ringkasan ensiklopedia Wikipedia Bahasa Indonesia |
| `.calc <rumus>` / `.hitung <rumus>` | Kalkulator matematika aman (tanpa `eval`, contoh: `.calc (120 * 3) / 4 + 15`) |
| `.convert <nilai> <dari> <ke>` | Konversi suhu (`c`, `f`, `k`), berat (`kg`, `lb`), panjang (`cm`, `m`, `km`), & mata uang (`usd`, `idr`) |
| `.jam` / `.waktu` | Menampilkan waktu saat ini di zona waktu WIB, WITA, WIT, dan UTC |
| `.bmi <berat_kg> <tinggi_cm>` | Menghitung Indeks Massa Tubuh (BMI/IMT) beserta kategori klinis edukatif |
| `.ipk <sks:bobot, ...>` | Menghitung IP/IPK semester (contoh: `.ipk 4:4.0, 3:3.5, 2:3.75`) |
| `.urlcheck <url>` | Memeriksa keamanan tautan dengan pelindung anti-SSRF |
| `.jadwalsholat [kota]` / `.doaharian` / `.listsurah` | Menampilkan jadwal sholat, doa harian, & daftar surah Al-Qur'an |
| `.quotes` / `.quotesislami` / `.quotesmotivasi` / `.faktaunik` / `.pantun` | Menampilkan kutipan inspiratif, fakta unik kesehatan/sains, dan pantun |
| `.tebakkata` / `.caklontong` / `.family100` / `.mathquiz` | Permainan kuis kelas interaktif (jawab dengan `.jawab <teks>` atau `.nyerah`) |
| `.truth` / `.dare` / `.dadu` / `.koin` / `.suit <batu\|gunting\|kertas>` / `.kerangajaib <tanya>` | Mini-games seru untuk mencairkan suasana grup saat istirahat kuliah |
| `.hilih` / `.alay` / `.besarkecil` / `.balikhuruf` / `.namaninja` | Transformasi teks kreatif |
| `.afk <alasan>` / `.unafk` | Mengatur status AFK (*Away From Keyboard*) |
| `.stats` / `.leaderboard` / `.privacy gamification on\|off` | Statistik aktivitas perintah & papan peringkat XP akademik (*opt-in*) |

---

## 🧪 7. Pengujian & Verifikasi Kualitas (QA)

Seluruh modul telah dilengkapi dengan **10 suite pengujian otomatis (65 test cases)** menggunakan `vitest`:

```bash
# Jalankan pengecekan tipe TypeScript
npx tsc --noEmit

# Jalankan seluruh unit & integration test
npm test

# Build ke JavaScript produksi (dist/)
npm run build
```

---

## 📂 8. Peta Dokumentasi Teknis (`docs/`)

- 📖 [Katalog Perintah Lengkap (`docs/COMMANDS.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/COMMANDS.md)
- 📊 [Status Implementasi Fitur (`docs/FEATURE_STATUS.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/FEATURE_STATUS.md)
- 🗂️ [Inventaris Fitur Akira (`docs/AKIRA_FEATURE_INVENTORY.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/AKIRA_FEATURE_INVENTORY.md)
- 🔍 [Audit Keamanan Fitur Legacy (`docs/LEGACY_FEATURE_AUDIT.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/LEGACY_FEATURE_AUDIT.md)
- 📱 [Matriks Provider WhatsApp (`docs/WHATSAPP_PROVIDER_MATRIX.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/WHATSAPP_PROVIDER_MATRIX.md)
- 🏛️ [Keputusan Arsitektur (`docs/DECISIONS.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/DECISIONS.md)
- 🧩 [Arsitektur Sistem (`docs/ARCHITECTURE.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/ARCHITECTURE.md)
- 🗄️ [Skema Database (`docs/DATABASE.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/DATABASE.md)
- ⚙️ [Panduan Instalasi (`docs/INSTALLATION.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/INSTALLATION.md)
- 🚀 [Panduan Deployment 24/7 (`docs/DEPLOYMENT.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/DEPLOYMENT.md)
- 🛡️ [Keamanan & Privasi (`docs/SECURITY.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/SECURITY.md)
- 🧪 [Panduan Pengujian (`docs/TESTING.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/TESTING.md)
- 🛠️ [Troubleshooting & Runbook (`docs/TROUBLESHOOTING.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/TROUBLESHOOTING.md)
