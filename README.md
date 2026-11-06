# HdyBot — Nursing Class A Assistant

Asisten AI WhatsApp untuk **Nursing Class A (Semester 5A)** yang dikendalikan penuh melalui chat pribadi WhatsApp **Hedy** (`+6282233038659`), menggunakan **NVIDIA Nemotron Auto Router** (`lightning`, `super-vl`, `ultra`), timezone `Asia/Jakarta`, dan Bahasa Indonesia.

---

## 1. Instalasi & Menjalankan 24/7 Sekali Klik di Ubuntu Server

Di Ubuntu Server (22.04 / 24.04 LTS), cukup salin folder proyek ini ke server lalu jalankan satu perintah:

```bash
chmod +x install.sh
sudo ./install.sh
```

Apa yang otomatis dikerjakan [`install.sh`](file:///c:/Users/HEDY/Documents/botwa/install.sh):
1. Memasang paket dasar, **Node.js 22 LTS**, **PostgreSQL**, **Redis** (bind `127.0.0.1`), **UFW firewall**, dan **Fail2Ban**.
2. Membuat user sistem non-root `hdybot`, folder aplikasi `/opt/hdybot`, data `/var/lib/hdybot`, dan backup `/var/backups/hdybot`.
3. Membuat database PostgreSQL `hdybot` + file `/opt/hdybot/.env` (`chmod 0600`) dengan password database & kunci enkripsi backup acak.
4. Menjalankan `npm install`, `prisma generate`, `prisma migrate deploy`, `npm run db:seed` (seed jadwal & dosen Semester 5A), `npm run typecheck`, `npm test`, dan `npm run build`.
5. Mengaktifkan daemon **`hdybot.service`** dengan:
   - `Restart=always`, `RestartSec=5`, `StartLimitIntervalSec=0` (otomatis hidup kembali tanpa batas jika mati atau setelah server reboot).
   - **`hdybot-watchdog.timer`**: setiap 2 menit mengecek `http://127.0.0.1:3000/health/ready` dan otomatis me-restart service bila hang.
   - **`hdybot-backup.timer`**: backup PostgreSQL terenkripsi AES-256 setiap pukul `02:30 WIB`.

### Perintah Operasional Ubuntu Server

```bash
sudo ./install.sh --status              # Cek status service, timer, dan health endpoint
sudo ./install.sh --logs                # Lihat log live (journalctl -u hdybot -f)
sudo ./install.sh --restart             # Restart service HdyBot
sudo ./install.sh --uninstall-service   # Hapus unit systemd (database & data tetap aman)
```

---

## 2. Konfigurasi `.env` & Keamanan Secret

Salin [`.env.example`](file:///c:/Users/HEDY/Documents/botwa/.env.example) ke `.env` (di Ubuntu Server otomatis dibuat di `/opt/hdybot/.env`):

```bash
sudo nano /opt/hdybot/.env
sudo systemctl restart hdybot
```

> **Penting:** Jangan pernah menyimpan `NVIDIA_API_KEY`, session WhatsApp, atau password di Git. Semua kredensial lama yang pernah ditempel di percakapan harus di-revoke dan diganti key baru.

---

## 3. Skrip NPM yang Tersedia

```bash
npm install          # Pasang dependensi
npm run db:generate  # Generate Prisma Client
npm run db:migrate   # Buat/jalankan migrasi (dev)
npm run db:deploy    # Terapkan migrasi (production)
npm run db:seed      # Seed data Semester 5A (idempoten)
npm run dev          # Jalankan mode development
npm run test         # Jalankan seluruh unit & integration test (Vitest)
npm run typecheck    # Pemeriksaan tipe TypeScript strict
npm run build        # Kompilasi ke dist/
npm start            # Jalankan hasil build (node dist/index.js)
npm run health       # Cek kesehatan sistem via CLI
```

---

## 4. Perintah Kontrol WhatsApp Pribadi Hedy

Kirim ke chat pribadi HdyBot (atau tulis dengan bahasa alami):
- `.dashboard`, `.status`, `.health`, `.ping`, `.runtime`, `.owner`, `.help`
- `.ai status`, `.ai models`, `.ai model <lightning|super-vl|ultra>`, `.ai auto on|off`
- `.jadwal`, `.jadwal senin..jumat`, `.besok`, `.mingguini`, `.kuliahberikutnya`, `.matkul`, `.dosen [matkul]`
- `.groups`, `.groups add <id@g.us> <nama>`, `.groups pause <id@g.us>`, `.groups resume <id@g.us>`
- `.pending`, `.approve <id>`, `.reject <id> <alasan>`, `.send <id>`, `.confirm <nonce>`, `.cancel <nonce>`
- `.admin pause` (Emergency Stop seluruh outbound grup), `.admin resume`, `.audit`
