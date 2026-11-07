# PANDUAN PEMECAHAN MASALAH & RUNBOOK (`docs/TROUBLESHOOTING.md`)

## 1. Bagaimana Cara Mengganti Nomor WhatsApp Bot?
Nomor bot bersifat bebas/random dan dapat diganti kapan saja:
- **Jika menggunakan `install.sh` (systemd):**
  ```bash
  sudo ./install.sh --reset-wa
  ```
- **Jika menggunakan PM2:**
  ```bash
  pm2 stop hdybot
  rm -rf ./whatsapp-auth/* /var/lib/hdybot/whatsapp-auth/*
  pm2 restart hdybot
  pm2 logs hdybot --lines 100
  ```
Lalu scan QR Code yang tampil di terminal dengan nomor WhatsApp bot yang baru.

## 2. QR Code Tidak Muncul atau Ingin Melihat Ulang QR Code
- Jalankan `sudo ./install.sh --qr` atau `pm2 logs hdybot --lines 100`.
- File cache QR aktif juga disimpan sementara di `/tmp/hdybot-qr.txt` sampai WhatsApp berhasil ditautkan.

## 3. Lupa atau Ingin Mengubah Password Admin (`hedyfake`)
- Secara default, `ADMIN_PASSWORD=hedyfake`.
- Untuk mengubahnya, edit `/opt/hdybot/.env` (atau `.env` lokal) pada baris `ADMIN_PASSWORD=hedyfake`, lalu restart dengan `sudo ./install.sh --restart` atau `pm2 restart hdybot`.

## 4. Menghentikan Pengiriman ke Grup Secara Darurat (Emergency Stop)
- Kirim `.admin pause` dari chat pribadi WhatsApp Hedy (`082233038659`).
- Untuk mengaktifkan kembali, kirim `.admin resume`.

## 5. Backup & Restore Database
- **Backup manual:** `npm run db:backup` (menggunakan `scripts/backup.sh`).
- **Restore:** `BACKUP_FILE=/path/to/file.sql.gz.enc npm run db:restore`.
