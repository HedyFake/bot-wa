# CHANGELOG — HDYBOT

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
