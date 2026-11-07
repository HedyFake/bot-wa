# PANDUAN DEPLOYMENT 24/7 (`docs/DEPLOYMENT.md`)

## Opsi A: PM2 Process Manager (`pm2 start start.js`) — Tetap Jalan Saat SSH Ditutup
```bash
# 1. Pasang PM2 secara global (jika belum terpasang)
sudo npm install -g pm2

# 2. Jalankan HdyBot dengan start.js atau ecosystem.config.cjs
pm2 start start.js --name hdybot
# atau:
pm2 start ecosystem.config.cjs

# 3. Simpan proses & aktifkan auto-start saat server reboot
pm2 save
pm2 startup

# 4. Lihat QR Code WhatsApp & log live
pm2 logs hdybot --lines 100
```
Ketika Anda menutup aplikasi SSH (PuTTY / Terminal) atau keluar dari server, PM2 menjaga HdyBot tetap berjalan 24/7 di background dan otomatis menghidupkannya kembali jika proses berhenti.

## Opsi B: Ubuntu Server Systemd Daemon (`sudo ./install.sh`)
```bash
chmod +x install.sh
sudo ./install.sh
```
Perintah operasional:
- `sudo ./install.sh --qr` : Tampilkan QR Code WhatsApp & log live
- `sudo ./install.sh --reset-wa` : Hapus sesi WA lama & munculkan QR baru (untuk ganti nomor bot)
- `sudo ./install.sh --status` : Cek status service `hdybot.service`
- `sudo ./install.sh --restart` : Restart service HdyBot
