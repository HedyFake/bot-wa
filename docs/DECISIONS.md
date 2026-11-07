# KEPUTUSAN ARSITEKTUR & TEKNIS (`docs/DECISIONS.md`)

## ADR-001: Modular Monolith dengan TypeScript Strict (ESM, Node.js >= 20)
- **Keputusan:** Membangun HdyBot sebagai modular monolith di `src/` dengan pemisahan tegas antara adapter WhatsApp (`src/whatsapp`), otorisasi admin (`src/admin`), router AI NVIDIA (`src/ai`), dan modul akademik/media/utilitas (`src/modules`).
- **Alasan:** Mudah di-deploy di satu VPS Ubuntu dengan PM2 (`pm2 start start.js`) maupun systemd (`install.sh`), mudah diuji (70+ unit & integration test), dan bebas overhead jaringan antar-microservice.

## ADR-002: `whatsapp-web.js` + `qrcode-terminal` + Google Chrome Stable (`.deb` Native)
- **Keputusan:** Menggunakan `WWebJsWhatsAppProvider` sebagai provider utama dengan browser `/usr/bin/google-chrome-stable` (`.deb` resmi Google, bukan paket Snap `chromium-browser` Ubuntu).
- **Alasan:** Di Ubuntu Server 22.04/24.04, `chromium-browser` berbasis Snap sering ditolak ketika dijalankan di bawah daemon background. Google Chrome Stable `.deb` berjalan stabil 24/7 dan langsung merender QR Code ASCII di terminal melalui `qrcode-terminal`.

## ADR-003: Nomor Bot Dinamis/Random + Nomor Admin Tetap (`082233038659`) + Password Interaktif (`hedyfake`)
- **Keputusan:**
  1. Nomor WhatsApp bot tidak di-hardcode sehingga Hedy bebas mengganti nomor bot kapan saja cukup dengan scan QR baru.
  2. Nomor admin kontrol ditetapkan ke `082233038659` (`+6282233038659`).
  3. Saat admin pertama kali memulai sesi chat pribadi dengan bot, bot meminta password admin. Ketika admin membalas `hedyfake`, sesi admin dibuka menggunakan verifikasi `scrypt` + `timingSafeEqual` dan perintah yang tertunda langsung dijalankan otomatis.

## ADR-004: Tanpa Port HTTP Terbuka (`3000`), Tanpa `ufw`, dan Tanpa `fail2ban`
- **Keputusan:** Menghapus server HTTP lokal dan tidak memasang `ufw`/`fail2ban` pada `install.sh`.
- **Alasan:** Mencegah bentrok `EADDRINUSE 127.0.0.1:3000` dan memastikan IP VPS owner tidak pernah terblokir. Pemantauan kesehatan (`health`/`ready`) dilakukan sepenuhnya melalui chat WhatsApp pribadi admin (`.health`, `.status`, `.dashboard`).

## ADR-005: Pengolahan Media Lokal dengan `sharp`, `qrcode`, dan `pdf-lib`
- **Keputusan:** Menggantikan ketergantungan API eksternal Akira yang sudah mati dengan pemrosesan lokal menggunakan `sharp` (stiker WebP, `.ttp`, `.toimg`, efek gambar, kartu jadwal/kutipan), `qrcode` (PNG QR Code), dan `pdf-lib` (dokumen PDF berlabel DRAFT).
