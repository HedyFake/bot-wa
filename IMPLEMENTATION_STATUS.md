# HDYBOT — Implementation Report

Diperbarui 9 November 2026. Proyek menggunakan source lama TypeScript, whatsapp-web.js, Prisma, PostgreSQL, dan systemd. Status keseluruhan **PARTIAL**. Pengujian mock menggunakan data uji. Pengiriman ke WhatsApp produksi dan instalasi Linux berada di luar hasil verifikasi lokal.

| Tahap | Status | Hasil dan batas pembuktian |
|---|---|---|
| 0 · Audit | PARTIAL | Modul aktif, jalur perintah, data, installer, dan risiko dipetakan di PROJECT_AUDIT.md, FEATURE_INVENTORY.md, ARCHITECTURE_MAP.md. Arsip Akira bukan runtime produksi. |
| 1 · Preserve & repair | PARTIAL | Identitas admin, password, sesi WhatsApp, pemeriksaan database, relay, dan beberapa rute jadwal diperbaiki. Semua handler kanonis di parser memiliki contoh eksekusi dalam katalog README. |
| 2 · Output | PARTIAL | Menu menggunakan registri dan pemeriksaan izin. Halaman dan bantuan tersedia. Ringkasan kelas menjadi teks berbaris. Obrolan nongkrong langsung menjawab pengirim tanpa banner. |
| 3 · Interaksi | PARTIAL | wwebjs mendeteksi mention dan kutipan. Jawaban mengutip pesan masuk dan menandai pengirim. Pertanyaan ambigu melalui intent NVIDIA. Perintah eksplisit dan izin tetap divalidasi aplikasi. Cooldown dan penyimpanan mode grup aktif. Perilaku perangkat nyata belum diuji. |
| 4 · Hiburan | PARTIAL | Permainan per chat, sesi dua peserta, gabung/keluar, kategori, waktu, tingkat kesulitan, petunjuk, riwayat, tantangan harian, dan XP opt-in tersimpan. Bank soal berisi subset kategori yang diminta. Turnamen, eliminasi, tebak suara, serta seluruh variasi soal belum lengkap. |
| 5 · Drive | PARTIAL | Autentikasi service account, folder/subfolder, pagination, metadata, pencarian, ekspor Workspace, attachment, dan audit pengiriman terhubung ke dispatcher. Sinkronisasi melakukan pemindaian metadata penuh. Reklasifikasi mata kuliah oleh admin, ekstraksi semua format Office, dan indeks teks lintas seluruh dokumen belum selesai. |
| 6 · VPS | PARTIAL | Installer systemd memiliki batas restart, boot target, pembatasan memori, backup terenkripsi, dan QR privat. Worker pengingat kustom menggunakan PostgreSQL. Pemulihan reboot nyata dan restart job layanan kelas otomatis belum terverifikasi. |
| 7 · Monitoring | PARTIAL | Health, sumber daya, WhatsApp, Drive, antrean, backup, log dan kesalahan dibaca melalui DM admin. Log operasional WhatsApp merupakan buffer terbatas sejak startup. Pengaturan rotasi journal dan restore backup belum diuji di VPS. |
| 8 · QA | PARTIAL | Typecheck, build, pemeriksaan sintaks Bash, suite Vitest, dan pembacaan publik Perawat.org dijalankan. Pengujian lintas provider dan uji restart host sungguhan masih terbuka. |

## Relay dan percakapan

1. Pilih grup PJMK melalui `.setpjmk <jid grup sumber>` dan grup tujuan melalui `.setkelasa <jid grup tujuan>` dalam DM admin. JID dan pengaturannya disimpan.
2. Pesan akademik penting dari sumber terdaftar menghasilkan pratinjau di nomor OWNER_WHATSAPP. Pratinjau menampilkan asal, tujuan, dan teks persis yang akan diteruskan.
3. Hedy mengutip pratinjau dan membalas **ya** atau **tidak**, atau memakai `.relay kirim <id>` dan `.relay tolak <id>`. Sesi privat harus lolos autentikasi. Gunakan `.relay list` dan `.relay lihat <id>` jika pratinjau belum diterima.
4. Klaim pengiriman ditulis sebelum memanggil WhatsApp. Jika proses berhenti pada batas pengiriman, status sending atau uncertain memerlukan pemeriksaan riwayat grup sebelum tindak lanjut. Bot tidak dapat memberi jaminan pengiriman tepat sekali dari provider yang tidak menyediakan transaksi dengan database.
5. Anggota dapat menulis `.menu`, menandai bot, membalas pesan bot, atau memanggil HdyBot. Rute baca yang aman dapat dipilih NVIDIA. Perintah admin dan mutasi tetap mengikuti izin, autentikasi, dan konfirmasi yang berlaku.

## Keperawatan dan musik

- `.keperawatan` menampilkan sembilan kategori. Contoh pencarian meliputi `.sdki nyeri akut`, `.sop pasang infus`, `.askep stroke`, `.pengkajian anak`, `.high alert`, `.ukom`, `.berita`, `.ppni`, dan `.mtb`. Hasil bergantung pada artikel yang tersedia di Perawat.org. Artikel diringkas berdasarkan isi yang dibaca. Jika NVIDIA gagal, bot menampilkan cuplikan singkat, bagian artikel, dan tautan.
- `.imt 65 kg 170 cm`, `.gcs E4 V5 M6`, `.balance 1800 ml 1500 ml`, dan `.tetesan 500 ml 6 jam 20 tetes/ml` menghitung berdasarkan input. Tanpa faktor tetes, bot hanya memberi mL/jam dan meminta faktor set infus. `.kuis ukom` memberikan soal latihan buatan bot.
- `.download` membuka koleksi Perawat.org dan perpustakaan MTB. `.download <id>` tetap mengirim dokumen Google Drive ke chat yang disetujui.
- `.music fals` mencari trek dan mengirim judul, pengunggah, dan tautan melalui SoundCloud API jika SOUNDCLOUD_CLIENT_ID dan SOUNDCLOUD_CLIENT_SECRET tersedia. Jika tidak, bot memberi tautan pencarian. MP3 hanya diambil dari MUSIC_LIBRARY_DIR yang diisi owner dengan file yang boleh dibagikan. Bot tidak mengunduh stream SoundCloud. [Ketentuan API SoundCloud](https://developers.soundcloud.com/docs/api/terms-of-use)

## Aktivasi Drive dan worker

Bagikan folder kepada identitas service account dengan akses baca. Simpan JSON kredensial di direktori privat di luar Git. Tentukan GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_DRIVE_FOLDER_ID, dan GOOGLE_DRIVE_ALLOWED_CHATS di .env. Setiap chat yang ditentukan memperoleh akses ke **seluruh** materi dalam folder beserta subfoldernya. Gunakan folder yang disetujui untuk audiens tersebut. Perintah `.drive sync` dan `.drive status` khusus DM admin. Bot memeriksa ulang keanggotaan folder dan canDownload saat mengambil file.

Worker menelusuri pengingat tertunda saat WhatsApp terhubung dan pengiriman diaktifkan. `.reminder pause` dan `.reminder resume` tersimpan di database. Pengiriman yang tidak pasti memerlukan pemeriksaan manual. Snapshot indeks metadata menggunakan BotSetting. PDF menggunakan pdftotext dan gambar menggunakan Tesseract dengan bahasa Indonesia/Inggris. Instalasi Linux menyertakan poppler-utils dan paket OCR. Batas ekstraksi adalah 80 halaman PDF dan OCR pada maksimal delapan halaman awal yang kosong. Ringkasan dokumen mengambil maksimal delapan bagian teks. Worker berhenti pada batas waktu, memori keluaran, dan konkurensi.

## Pemulihan di VPS

Installer memakai systemd sebagai pengelola proses bot. Gunakan `systemctl status hdybot` dan `journalctl -u hdybot -n 80` dari konsol VPS ketika WhatsApp tidak merespons. Setelah memperbaiki penyebab crash, jalankan `systemctl reset-failed hdybot` dan `systemctl restart hdybot`. QR ditampilkan di konsol privat melalui `sudo ./install.sh --qr`. Perintah reset atau penggantian nomor mengarsipkan sesi terenkripsi terlebih dahulu. Installer tidak menambahkan UFW, Fail2ban, konfigurasi SSH, atau dashboard HTTP.

## Pengujian dan file

Perubahan inti berada di src/admin/commands, src/whatsapp, src/modules/academic, src/modules/fun, src/modules/materials, src/modules/media, src/modules/reminders, src/observability, src/index.ts, prisma/seed.ts, .env.example, package.json, dan install.sh. Tidak ada penghapusan file source lama. Lihat CHANGELOG.md untuk ringkasan.

- Verifikasi lanjutan 9 November 2026: 86 dari 86 tes lulus dalam 15 file Vitest, typecheck dan build lulus, Bash -n lulus, serta git diff --check bersih. Entry point dist/index.js mencapai health awal dalam dua startup terpisah dengan provider mock.
- Uji baca publik Perawat.org berhasil memuat SDKI Nyeri Akut, SOP Pemasangan Infus, high alert, kategori Ukom, Kampus, Berita, Pojok PPNI, Patient Safety, MTB, Pemeriksaan Penunjang, dan daftar file Download. Pencarian askep stroke tidak menemukan judul yang cocok.
- Pengujian mock meliputi akses monitoring, owner relay, quoted reply dan mention, percakapan yang tidak ditujukan ke bot, dua grup, skor, menu, klasifikasi intent, query medis, file musik lokal, pengiriman Drive berhasil/gagal, pencabutan akses dan pemulihan worker.
- Pemeriksaan installer menggunakan Bash -n dan uji statis. Ini belum menyimulasikan boot Linux, penutupan SSH, pairing perangkat nyata, maupun kegagalan jaringan VPS.
- Kredensial WhatsApp, NVIDIA, SoundCloud, Drive produksi, dan PostgreSQL pengguna tidak dipakai untuk pengujian integrasi. Tidak ada pesan uji yang dikirim ke anggota kelas.

## Audit katalog dan transaksi jadwal

README memuat transkrip dari registri dan dispatcher, termasuk alias, prasyarat, dan lampiran. Perintah .priority dan .broadcast preview telah dihubungkan ke antrean review. Perhitungan, ID tugas/catatan setelah penghapusan, filter tenggat WIB, MIME lampiran kompresi, kartu ucapan, dan pemotongan isi PDF diperbaiki. TTS memerlukan espeak-ng. Jadwal salat kini dibaca dari API untuk kota dan tanggal yang diminta.

PostgreSQL 18 lokal terisolasi menjalankan dua migrasi dan seed. scripts/check-schedule-db.mjs memeriksa tambah/edit/hapus/reset, penolakan overlap dan pratinjau usang, backup, otorisasi owner, penolakan grup, replay nonce, seed ulang yang mempertahankan penghapusan, serta dua worker yang mencoba mengirim pengingat yang sama. Semua pengiriman pada pengujian menggunakan mock.

## Pengingat tenggat akademik

Untuk tugas aktif, antrean persisten memproses H−3, H−2, H−1, dan hari H dalam WIB. Setiap kartu masuk ke DM Hedy. Pengiriman ke grup memerlukan pilihan tujuan dan konfirmasi untuk kartu hari itu. Uji regresi mencakup migrasi antrean lama, restart, hari yang terlewat, pengiriman ganda, dan pembatalan pratinjau saat tugas berubah atau selesai.

Pada 9 November 2026, seluruh 91 tes di 16 file lulus. Typecheck, build, dan pemeriksaan katalog README juga lulus. Katalog menjalankan 146 handler dan 291 nama perintah dalam 570 eksekusi melalui WhatsApp mock.

## Pekerjaan tersisa

### Audit menu, balasan, dan dependensi · 10 November 2026

Katalog memeriksa bahwa setiap handler kanonis muncul pada menu dengan izin dan integrasi lengkap. Sebanyak 146 handler dan 291 nama perintah melewati 570 eksekusi dispatcher dengan WhatsApp mock. Build, typecheck, dan 101 tes di 19 file lulus. Chrome headless menghasilkan QR asli menggunakan profil sementara kosong. Penautan HP dan pengiriman pesan di VPS pengguna belum diuji dalam audit ini.

Uji lokal memproses 100 pesan sapaan, menu, jadwal, dan tugas dengan median 0,3 ms dan persentil ke-95 1,2 ms tanpa panggilan AI. Angka ini mencakup dispatcher dan pengiriman mock. Waktu jaringan WhatsApp, NVIDIA, dan penyimpanan VPS tidak tercakup.

Sharp, Zod, dan Vitest diperbarui. Lockfile mematok whatsapp-web.js 1.34.7 yang diuji dengan Chrome. Pemeriksaan npm atas dependensi produksi masih melaporkan 14 temuan tinggi dan 5 sedang pada paket langsung atau turunannya, antara lain melalui Puppeteer, archiver, dan Prisma. Perbaikan otomatis npm juga mencoba menurunkan versi whatsapp-web.js dan Puppeteer. Versi tersebut tidak dipakai. File kredensial Drive, chat Drive yang diizinkan, kredensial SoundCloud, dan folder musik lokal belum tersedia pada konfigurasi lokal yang diuji.

Uji staging untuk akun WhatsApp dan folder Drive yang telah dibagikan, verifikasi pemulihan PostgreSQL dan systemd di VPS, lengkapi RBAC untuk jabatan kelas, lengkapi bank permainan dan indeks dokumen secara inkremental. Uji mock yang lulus tidak menutup butir tersebut.
