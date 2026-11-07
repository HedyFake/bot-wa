# HdyBot — Nursing Class A Assistant

Asisten AI WhatsApp untuk **Nursing Class A (Semester 5A)** yang dikendalikan penuh melalui chat pribadi WhatsApp **Hedy** (`082233038659` / `+6282233038659`) dengan verifikasi password interaktif (**`hedyfake`**), menggunakan **NVIDIA Nemotron Auto Router** (`lightning`, `super-vl`, `ultra`), timezone `Asia/Jakarta`, dan Bahasa Indonesia.

- **Nomor Admin Utama:** `082233038659` (`+6282233038659`)
- **Password Admin di Chat WA:** `hedyfake` _(ketika admin pertama kali chat ke bot, bot akan menanyakan password; cukup balas `hedyfake`)_
- **Nomor WhatsApp Bot:** **Bebas / Random** _(bisa diganti-ganti kapan saja dengan scan QR Code baru)_

---

## 1. Cara Menjalankan 24/7 (Tetap Jalan Saat Keluar dari Server / Tutup SSH)

### Opsi A: Menggunakan PM2 (`pm2 start start.js`)
```bash
# 1. Pasang dependensi & build
npm install
npm run build

# 2. Jalankan terus-menerus di background dengan PM2
pm2 start start.js --name hdybot
# atau menggunakan file konfigurasi PM2:
pm2 start ecosystem.config.cjs

# 3. Simpan agar otomatis menyala kembali saat server reboot
pm2 save
pm2 startup

# 4. Tampilkan QR Code WhatsApp & log live
pm2 logs hdybot --lines 100
```

### Opsi B: Installer & Daemon 24/7 Sekali Klik untuk Ubuntu Server (`install.sh`)
```bash
chmod +x install.sh
sudo ./install.sh
```
Perintah operasional `install.sh`:
```bash
sudo ./install.sh --qr                  # Tampilkan QR Code WhatsApp & log live
sudo ./install.sh --reset-wa            # Reset sesi WA & munculkan QR baru (untuk ganti nomor bot)
sudo ./install.sh --status              # Cek status service systemd
sudo ./install.sh --logs                # Lihat log live (journalctl -u hdybot -f)
sudo ./install.sh --cli                 # Simulasi chat admin dari terminal
sudo ./install.sh --restart             # Restart service HdyBot
sudo ./install.sh --uninstall-service   # Hapus unit systemd (database & data tetap aman)
```

---

## 2. Alur Login Admin (`082233038659`) & Pergantian Nomor Bot

1. **Tautkan Nomor Bot (Bebas/Random):** Scan QR Code yang tampil di terminal menggunakan aplikasi WhatsApp pada HP nomor bot Anda (**Perangkat Tertaut -> Tautkan Perangkat**).
2. **Chat dari Nomor Admin (`082233038659`):**
   - Kirim pesan apa saja (mis. `.dashboard` atau `Halo`) dari nomor admin `082233038659` ke nomor bot.
   - Bot akan membalas:
     > 🔐 *Verifikasi Password Admin HdyBot*
     > Halo Hedy! Untuk membuka akses kontrol bot, silakan balas pesan ini dengan *password admin* Anda:
   - Balas langsung dengan: **`hedyfake`**
   - Bot akan mengonfirmasi `✅ Password Admin Terverifikasi!` dan langsung menjalankan perintah Anda.
   - Ketik `.logout` kapan saja jika ingin mengunci kembali sesi admin.

---

## 3. Ringkasan Fitur & Mega Command Menu (`.menu`)

- **Kontrol Admin & Health (WA Admin DM)**: `.login hedyfake`, `.logout`, `.dashboard`, `.status`, `.health`, `.ping`, `.runtime`, `.owner`, `.groups`, `.pending`, `.approve <id>`, `.reject <id>`, `.send <id>`, `.confirm <nonce>`, `.admin pause`, `.admin resume`, `.audit`, `.backup`
- **NVIDIA AI Router & Study Assistant**: `.ai status`, `.ai models`, `.ai model <lightning|super-vl|ultra>`, `.ai auto on|off`, `.ai test <prompt>`, `.ask <pertanyaan>`, `.summarize <teks>`, `.flashcard <topik>`, `.quiz <topik>`, `.translate <bhs> <teks>`
- **Jadwal, Dosen, Tugas, & Akademik Kelas 5A**: `.jadwal`, `.jadwal senin..jumat`, `.besok`, `.mingguini`, `.kuliahberikutnya`, `.jadwal export csv|json`, `.matkul`, `.dosen [matkul]`, `.tugas add|list|done|del`, `.reminder add|list|snooze|delete`, `.announce draft`, `.note add|list|del`, `.materi`, `.carimateri`, `.buatkelompok`, `.kalender`, `.countdown`, `.kelas`, `.pengurus`, `.rules`, `.faq`
- **Media, Stiker, Gambar, QR Code, & PDF (`sharp`, `qrcode`, `pdf-lib`)**: `.sticker` / `.s`, `.ttp <teks>`, `.toimg`, `.blur`, `.invert`, `.grayscale`, `.flip`, `.flop`, `.resize <w> <h>`, `.compress`, `.quotemaker <kutipan>|<penulis>`, `.kartujadwal [hari]`, `.qr <teks/url>`, `.doc pdf <judul>|<isi>`, `.suratizin`, `.notulensi`, `.ocr`, `.tts <teks>`
- **Utilitas & Hiburan Aman (Porting Akira)**: `.cuaca <kota>`, `.wiki <topik>`, `.calc <rumus>`, `.convert <nilai> <dari> <ke>`, `.jam`, `.bmi <kg> <cm>`, `.ipk`, `.urlcheck <url>`, `.quotes`, `.quotesislami`, `.quotesmotivasi`, `.faktaunik`, `.pantun`, `.doaharian`, `.listsurah`, `.jadwalsholat`, `.tebakkata`, `.caklontong`, `.family100`, `.mathquiz`, `.jawab <teks>`, `.nyerah`, `.truth`, `.dare`, `.dadu`, `.koin`, `.suit`, `.kerangajaib`, `.hilih`, `.alay`, `.besarkecil`, `.balikhuruf`, `.namaninja`, `.stats`, `.leaderboard`, `.afk`

---

## 4. Dokumentasi Lengkap (`docs/`)

- [Katalog Perintah (`docs/COMMANDS.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/COMMANDS.md)
- [Status Fitur (`docs/FEATURE_STATUS.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/FEATURE_STATUS.md)
- [Inventaris Fitur Akira (`docs/AKIRA_FEATURE_INVENTORY.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/AKIRA_FEATURE_INVENTORY.md)
- [Audit Legacy Akira (`docs/LEGACY_FEATURE_AUDIT.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/LEGACY_FEATURE_AUDIT.md)
- [Matriks Provider WhatsApp (`docs/WHATSAPP_PROVIDER_MATRIX.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/WHATSAPP_PROVIDER_MATRIX.md)
- [Keputusan Arsitektur (`docs/DECISIONS.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/DECISIONS.md)
- [Arsitektur Sistem (`docs/ARCHITECTURE.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/ARCHITECTURE.md)
- [Skema Database (`docs/DATABASE.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/DATABASE.md)
- [Panduan Instalasi (`docs/INSTALLATION.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/INSTALLATION.md)
- [Panduan Deployment PM2 & Systemd (`docs/DEPLOYMENT.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/DEPLOYMENT.md)
- [Keamanan & Privasi (`docs/SECURITY.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/SECURITY.md)
- [Pengujian (`docs/TESTING.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/TESTING.md)
- [Troubleshooting & Runbook (`docs/TROUBLESHOOTING.md`)](file:///c:/Users/HEDY/Documents/botwa/docs/TROUBLESHOOTING.md)
