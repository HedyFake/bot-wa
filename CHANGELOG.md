# CHANGELOG — HDYBOT

## 15 November 2026 · Pemulihan perintah dan analisis lampiran

- Dispatcher menangani kegagalan per langkah agar hasil lain tetap tersedia pada permintaan gabungan. Perintah belajar dan hiburan memiliki pemulihan sesuai jenis output. Sintesis suara dapat memakai OpenAI ketika espeak-ng gagal.
- Ekspor PDF atau Office dari lampiran yang gagal kini menampilkan hasil analisis dan sumber di chat. Pembaca dokumen menerima presentasi dengan direktori embeddings kosong serta masukan PDF untuk Xpdf dan Poppler.
- Penyimpanan tugas dan pengaturan menggunakan file sementara unik. Bila Windows sedang mengunci berkas tujuan, bot mencoba penggantian atomik hingga tiga kali lagi sebelum melaporkan kegagalan.
- Daftar format, alur privasi, keterbatasan operasional dan hasil pengujian tersedia di [laporan implementasi](MULTIMODAL_IMPLEMENTATION_STATUS.md).

## 11 November 2026 · Fase 2, integrasi fitur lama

| Berkas | Perubahan dan tujuan |
| --- | --- |
| `src/ai/existing-feature-tools.ts`, `tool-registry.ts` | Sembilan fungsi tambahan memanggil layanan bot. Model mendapat daftar berpaginasi, identitas chat dari server dan petunjuk menu sesuai izin. |
| `src/ai/openai/luna.ts`, `src/ai/privacy.ts` | Menunggu hasil fungsi asinkron dalam batas waktu permintaan, menyaring hasil sebelum kedua provider menerima data dan membatasi ukuran hasil. |
| `src/admin/commands/dispatcher.ts`, `intent.ts` | Menghubungkan layanan aktif ke AI dan memproses permintaan PDF, QR serta kartu jadwal melalui generator WhatsApp. Permintaan daftar catatan dan pengingat dapat diproses lokal. |
| `src/modules/fun/fun-utility-service.ts`, `src/modules/reminders/worker.ts` | Membatasi catatan dan pengingat menurut percakapan, memeriksa akses hapus dan memakai pembacaan terpisah untuk daftar pengingat PostgreSQL. Konversi hanya menerima satuan yang terdaftar. |
| `tests/existing-feature-tools.test.ts`, `tests/command-regressions.test.ts`, `vitest.config.ts` | Menambahkan tes akses, fungsi, timeout dan lampiran. Mengatur cache font sementara untuk pengujian media di Windows. |
| README, registri AI, inventaris, tinjauan keamanan dan status implementasi | Mencatat sintaks, peran, bukti offline dan batas pengujian. |

## 11 November 2026 · OpenAI Central Brain

| Berkas | Perubahan dan alasan |
| --- | --- |
| `src/ai/openai/luna.ts`, `usage.ts` | Mengganti transport Chat Completions dengan Responses, menambahkan pertukaran hasil fungsi, batas iterasi dan kuota request persisten opsional. |
| `src/ai/tool-registry.ts`, `privacy.ts`, `context-manager.ts` | Membatasi konteks percakapan menurut chat, pengirim dan waktu. Mendefinisikan fungsi nyata berdasarkan ruang akses dan menyaring teks sebelum pemanggilan penyedia. |
| `src/ai/model-router/router.ts`, `src/ai/nvidia/registry.ts` | Mengaktifkan kemampuan fungsi OpenAI, memilih model sesuai konfigurasi dan membawa hasil layanan lokal ke penyedia cadangan. |
| `src/admin/commands/dispatcher.ts`, `intent.ts` | Menautkan percakapan dengan tool, menangani konteks kutipan, memeriksa sesi admin dan meminta schema JSON untuk deteksi perintah. |
| `src/config/env.ts`, `.env.example`, `src/index.ts`, `src/scripts/admin-cli.ts`, `src/app/health.ts` | Membaca pengaturan penyedia di service dan CLI, serta menampilkan model hasil konfigurasi. |
| `tests/openai-brain.test.ts`, `tests/ai-failover.test.ts` | Memeriksa alur balasan WhatsApp mock, parameter, batas akses, failover, schema dan input gambar. |
| README, peta arsitektur, inventaris, registri tool dan status implementasi | Memisahkan fitur Fase 1 yang sudah dipasang dari baseline audit dan fase selanjutnya. |

## 11 November 2026 · audit master project

| Berkas | Yang berubah dan alasannya |
| --- | --- |
| AUDIT.md | Menambahkan hasil audit statis, bukti uji lokal dan tautan ke temuan, sambil mempertahankan inventaris awal sebagai baseline. |
| PROJECT_AUDIT.md | Membandingkan implementasi lama dengan spesifikasi nursing companion. |
| FEATURE_INVENTORY.md | Memetakan fitur dan bentuk command baru terhadap kemampuan aktual serta celah yang terbuka. |
| ARCHITECTURE_MAP.md | Memisahkan jalur runtime yang ada dan titik integrasi orkestrator yang diusulkan. |
| IMPLEMENTATION_STATUS.md | Mencatat hasil perintah QA, kegagalan probe database dan batas penerimaan. |
| AI_TOOL_REGISTRY.md | Mencatat kemampuan kandidat, peran, kontrak Responses dan status registry runtime. |
| DATABASE_SCHEMA.md | Menginventaris model, kunci, indeks, migrasi dan state yang berada di luar PostgreSQL. |
| SECURITY_REVIEW.md | Mencatat 11 temuan statis, reproduksi lokal, prioritas dan uji perbaikan. |
| CHANGELOG.md | Mencatat perubahan dokumentasi fase audit. |


## 9 November 2026

- Jadwal, daftar mata kuliah, dan daftar tugas memakai blok WhatsApp berjarak dengan waktu, pengampu, deadline, serta PJ dari data aktual. NVIDIA mengenali penugasan dan tenggat; pemberitahuan baru dan pengingat harian H−3 sampai hari H diproses melalui antrean persisten dan hanya diteruskan sesudah owner memilih grup dan mengonfirmasi isi.

- README kini memuat katalog perintah dengan alias, prasyarat, dan contoh hasil dispatcher. Uji katalog dapat diulang dengan npm run test:commands.
- Jadwal produksi membaca PostgreSQL. Admin mengubah jadwal melalui DM dengan pratinjau, konfirmasi, backup dan audit. Seed ulang mempertahankan perubahan pengguna.
- Perbaikan mencakup prioritas/review, TTS lokal, salat berdasarkan kota/tanggal, kalkulator, pemilihan tugas menurut WIB, ID catatan/tugas, dan pagination PDF.

- Relay PJMK sekarang menunggu keputusan Hedy di DM untuk isi dan tujuan yang ditampilkan. Persetujuan lewat kutipan, penolakan, klaim pengiriman, dan pencegahan replay disimpan.
- Balasan nongkrong mengutip pengirim dengan teks percakapan biasa. NVIDIA merutekan permintaan bahasa alami ke perintah baca yang diizinkan.
- Perawat.org menjadi sumber untuk sembilan menu keperawatan. SoundCloud menyediakan pencarian dan atribusi. Audio yang diizinkan dapat dilampirkan dari katalog lokal.
- Perbaikan sebelumnya mencakup autentikasi, privasi pairing, reconnect, pengingat PostgreSQL, Drive baca-saja, sesi game, XP, dan monitoring.


## [0.2.0] - 2026-11-07
### Ditambahkan
- **Entrypoint 24/7 PM2 (`start.js` & `ecosystem.config.cjs`)**: Mendukung `pm2 start start.js --name hdybot` dan `pm2 save` agar bot tetap berjalan terus-menerus setelah keluar dari SSH server.
- **Verifikasi Password Admin Interaktif (`hedyfake`)**: Ketika nomor admin `082233038659` menghubungi bot di chat pribadi, bot menanyakan password dan membuka akses penuh setelah admin membalas `hedyfake`. Nomor bot sendiri bersifat bebas/random dan dapat diganti-ganti kapan saja via QR Code.
- **Layanan Media & Dokumen Nyata (`MediaService`)**:
  - Konversi gambar ke stiker WebP 512x512 (`.sticker`, `.stiker`, `.s`) & stiker teks warna-warni (`.ttp`).
  - Konversi stiker ke PNG (`.toimg`), efek gambar `sharp` (`.blur`, `.invert`, `.grayscale`, `.flip`, `.flop`, `.resize`, `.compress`).
  - Kartu kutipan PNG (`.quotemaker`) & kartu jadwal kuliah PNG (`.kartujadwal`).
  - Generator QR Code PNG (`.qr`) & dokumen PDF berlabel DRAFT (`.doc pdf`).
- **Layanan Utilitas, Tugas, & Hiburan Aman (`FunAndUtilityService`)**:
  - CRUD Tugas (`.tugas add/list/done/del`), Reminder kustom (`.reminder add/list/snooze/delete`), Draft Pengumuman (`.announce`), Catatan Kelas (`.note`).
  - Kalkulator matematika aman (`.calc`), konversi satuan & kurs (`.convert`), jam dunia (`.jam`), cuaca (`.cuaca`), Wikipedia (`.wiki`), dan pemeriksa keamanan tautan SSRF (`.urlcheck`).
  - Porting fitur hiburan aman dari arsip Akira: `.quotes`, `.quotesislami`, `.quotesmotivasi`, `.faktaunik`, `.pantun`, `.doaharian`, `.listsurah`, `.jadwalsholat`, `.tebakkata`, `.caklontong`, `.family100`, `.mathquiz`, `.truth`, `.dare`, `.dadu`, `.koin`, `.suit`, `.kerangajaib`, `.hilih`, `.alay`, `.besarkecil`, `.balikhuruf`, `.namaninja`, `.afk`.
- **Dokumentasi Lengkap**: `docs/AKIRA_FEATURE_INVENTORY.md`, `docs/LEGACY_FEATURE_AUDIT.md`, `docs/WHATSAPP_PROVIDER_MATRIX.md`, `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/COMMANDS.md`, `docs/FEATURE_STATUS.md`, `docs/INSTALLATION.md`, `docs/DEPLOYMENT.md`, `docs/SECURITY.md`, `docs/TESTING.md`, `docs/TROUBLESHOOTING.md`.
