# PANDUAN INSTALASI (`docs/INSTALLATION.md`)

## 1. Instalasi & Menjalankan 24/7 Sekali Klik di Ubuntu Server (22.04 / 24.04 LTS)
Salin proyek ke VPS Ubuntu Anda lalu jalankan:
```bash
chmod +x install.sh
sudo ./install.sh
```
Skrip `install.sh` akan otomatis:
- Memasang Node.js 22 LTS, PM2, PostgreSQL, Redis, dan **Google Chrome Stable (`.deb` native)** (tanpa `ufw` & tanpa `fail2ban` agar IP VPS Anda tidak pernah terblokir).
- Mengonfigurasi `/opt/hdybot/.env` dengan `WHATSAPP_PROVIDER=wwebjs`, `OWNER_WHATSAPP=+6282233038659`, dan `ADMIN_PASSWORD=hedyfake`.
- Menjalankan migrasi Prisma, seed jadwal Semester 5A, pengujian, build, dan menyalakan service 24/7 serta menampilkan **QR Code WhatsApp** di terminal.

## 2. Menjalankan 24/7 Menggunakan PM2 (`start.js`) Agar Tetap Jalan Saat Keluar dari Server
Jika Anda ingin menjalankan langsung dengan **PM2** agar bot tetap hidup terus-menerus meskipun terminal SSH ditutup:
```bash
npm install
npm run build
pm2 start start.js --name hdybot
pm2 save
pm2 startup
```
Untuk melihat QR Code dan log di PM2:
```bash
pm2 logs hdybot --lines 100
```

## 3. Cara Menautkan Nomor Bot (Bebas / Bisa Ganti-Ganti) & Login Admin
1. **Nomor Bot Bebas/Random**: Buka WhatsApp pada HP nomor bot Anda -> **Perangkat Tertaut** -> **Tautkan Perangkat** -> Scan QR Code yang muncul di terminal. Jika suatu saat ingin mengganti nomor bot dengan nomor WA lain, jalankan `sudo ./install.sh --reset-wa` lalu scan QR dengan nomor baru.
2. **Login Admin (`082233038659`)**:
   - Dari HP utama Anda (`082233038659`), kirim pesan apa saja (mis. `.dashboard` atau `Halo`) ke nomor WhatsApp bot.
   - Bot akan membalas: `🔐 Verifikasi Password Admin HdyBot — Silakan balas pesan ini dengan password admin Anda:`
   - Balas dengan: `hedyfake`
   - Bot akan mengaktifkan sesi kontrol penuh Anda dan langsung menjalankan perintah Anda.
