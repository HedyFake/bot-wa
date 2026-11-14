# HDYBOT — Implementation Report

## Pembaruan lampiran dan pemulihan menu

Pengujian, jalur cadangan per fitur, dan batas verifikasi produksi dicatat dalam [laporan multimodal](MULTIMODAL_IMPLEMENTATION_STATUS.md). Daftar perintah dan contoh balasannya di [README](README.md) dihasilkan melalui dispatcher dengan adapter WhatsApp simulasi.

## Fase 3 · Permintaan bahasa biasa dan pengiriman berkas · 14 November 2026

**Status PARTIAL untuk keseluruhan master prompt.** Dispatcher menggunakan router OpenAI utama dan NVIDIA cadangan untuk permintaan yang memerlukan interpretasi. Perintah lokal yang jelas tetap diproses langsung. Skema keputusan mencakup 12 jenis maksud dan lima tingkat kepentingan. Pengirim, lokasi chat, izin dan daftar perintah yang tersedia diperiksa oleh kode. Obrolan santai tidak diberi tools. Di grup yang dipantau, teks untuk klasifikasi diperlakukan sebagai data. Penyebaran pengumuman tetap memerlukan persetujuan pribadi owner.

| Bagian | Implementasi dan bukti |
| --- | --- |
| Rute dan konteks | `src/admin/commands/intent.ts`, `dispatcher.ts` dan `src/ai/workflow-context.ts`. Tes dispatcher mencakup klarifikasi kota, pemilihan jurnal, draf antaranggota dan penolakan mutasi dalam permintaan gabungan. |
| Cuaca | `src/modules/weather/forecast.ts`. Selain tes respons simulasi dan kegagalan provider, pemanggilan langsung fungsi produksi mengembalikan Jombang, Jawa Timur, data pukul 15.15 WIB dan tujuh tanggal prakiraan, 14–20 November 2026. |
| Berkas | `src/modules/academic/study-draft.ts` menghasilkan DOCX dan PPTX. `src/modules/materials/journal-delivery.ts` memeriksa batas unduhan, lisensi dan PDF. Gerbang outbound memeriksa ukuran, MIME dan penanda format. Tes memakai adapter WhatsApp simulasi dan memeriksa isi lampiran. |
| LMS | Akun yang telah memberi izin dicari melalui nomor peminta. PDF diperiksa ulang di halaman materi akun, dikirim ke DM, dan dihitung menurut hasil pengiriman provider. Tes LMS memakai portal dan database simulasi. |
| Operasional | Inspeksi metadata GitHub dibatasi ke DM owner. Refresh katalog Drive melalui bahasa biasa memerlukan instruksi eksplisit owner. Rekoneksi WhatsApp menggunakan pengelola koneksi yang sudah ada. Log pekerjaan menyimpan pengirim, aksi, ID, waktu dan status persiapan dalam memori. |

Typecheck dan build lulus. Vitest lulus 144 tes di 24 berkas. Pemeriksaan katalog lulus untuk 149 handler, 293 nama perintah, dan 578 eksekusi melalui WhatsApp simulasi. Bukti untuk cuaca memakai Open-Meteo langsung. Pengujian lainnya belum membuktikan login WhatsApp atau LMS produksi, pengiriman ke ponsel, kuota akun AI, maupun operasi 24 jam pada VPS.

Instalasi dan eksekusi repositori GitHub secara otomatis belum tersedia. Fallback tautan baru dengan masa berlaku untuk lampiran yang gagal, histori pekerjaan persisten lintas restart, dan peringatan cuaca resmi juga belum tersedia. Untuk berkas yang memiliki halaman sumber, pengguna dapat memakai tautan resmi yang disediakan modul.

## Fase 2 · Integrasi fitur lama · 14 November 2026

Hasil akhir di workspace: typecheck dan build lulus. Vitest lulus 139/139 tes dalam 24 berkas dengan satu worker dan timeout semula. Setelah contoh README diperbarui dari keluaran dispatcher, pemeriksaan katalog lulus untuk 147 handler, 292 nama perintah dan 573 eksekusi WhatsApp simulasi.

Sembilan fungsi baru memberi AI akses ke tugas yang terlihat di chat, judul catatan, pengingat, kalender, hitung mundur, aritmetika, konversi satuan, petunjuk atau skor game, serta pencarian menu berdasarkan izin. Bersama Fase 1 terdapat 13 fungsi ketika sesi admin memenuhi izin. PDF sederhana, QR dan kartu jadwal memakai generator lokal serta adapter pengiriman WhatsApp. Format pesan dan contoh perintah tersedia di [README](README.md).

Catatan lama tersedia di DM pembuat. Untuk catatan baru, chat asal menentukan akses baca. Pembuat atau moderator chat itu dapat menghapusnya. Daftar pengingat lokal dan fungsi AI kini memakai waktu efektif setelah penundaan, termasuk bila waktunya berpindah tanggal WIB. Penjadwalan lokal memakai validasi tanggal yang sama dengan worker database.

Pengujian menggunakan adapter WhatsApp mock, pemeriksaan struktur PDF dan PNG, dua akun, dua grup, provider AI simulasi dan worker PostgreSQL simulasi. Tes operasi lintas chat meliputi baca, hapus dan tunda. Tes batas waktu memeriksa bahwa hasil fungsi yang terlambat dapat diabaikan sebelum putaran OpenAI berikutnya. [Tes integrasi](tests/existing-feature-tools.test.ts)

OpenAI belum memiliki kunci pada workspace. Pemeriksaan koneksi baca PostgreSQL lokal belum berhasil. Penerimaan pada ponsel, pengiriman pengingat oleh worker produksi dan operasi VPS 24 jam masih menunggu pengujian langsung. Fase berikutnya mencakup pendidikan keperawatan dan terminologi medis. [Daftar fungsi beserta izin](AI_TOOL_REGISTRY.md) · [Perubahan per berkas](CHANGELOG.md)

## Fase 1 master project · 11 November 2026

**Upgrade terpasang di source dan teruji lokal. Verifikasi produksi masih terbuka.** Pesan teks dan gambar pada jalur OpenAI memakai Responses. Percakapan dan `.ask` dapat memakai jadwal, katalog mata kuliah dan kalkulator. DM admin yang lolos otorisasi juga mendapat fungsi status WhatsApp dan uptime. Pemilihan intent meminta JSON sesuai schema. Untuk permintaan lanjutan, konteks dalam RAM menyimpan hingga enam giliran dengan masa pakai 30 menit. Pengaturan harian dan bulanan memakai satuan jumlah percobaan request per periode WIB.

| Pemeriksaan | Bukti lokal |
| --- | --- |
| TypeScript dan build | `npm run typecheck` dan `npm run build` selesai dengan exit 0. |
| Regresi | `npm test -- --maxWorkers=1` lulus 131/131 tes dalam 23 file. Uji media melewati 15 detik pada percobaan awal bersamaan dengan pemeriksaan lain. Pengulangan memakai batas waktu semula. Fontconfig melaporkan cache font lokal tak dapat ditulis. |
| Jalur perintah WhatsApp | `node scripts/command-catalog.mjs --check` lulus untuk 147 handler, 292 nama dan 573 eksekusi mock. Tes baru mengirim `.ask` ke dispatcher dan memeriksa balasan yang diterima adapter mock setelah dua putaran Responses simulasi. |
| Keamanan dan fungsi | Tes mencakup fungsi tak dikenal, argumen tambahan, pencabutan akses monitoring, batas fungsi, hitungan IMT dan kelanjutan melalui NVIDIA, pemisahan konteks dan penyamaran teks. Pengujian ini memakai fixture. |
| Database | Koneksi baca PostgreSQL lokal belum tersedia. Pengujian kuota memeriksa pemakaian satu transaksi dan periode WIB dengan mock. Belum ada bukti persaingan transaksi pada PostgreSQL nyata. Kuota positif memerlukan tabel BotSetting dari migrasi proyek. |
| Lingkungan nyata | OPENAI_API_KEY kosong di workspace. Respons dari akun OpenAI, penerimaan pada ponsel, log systemd VPS dan durasi hidup 24 jam belum diverifikasi. |

Perubahan tiap berkas tercatat di [changelog](CHANGELOG.md). Daftar fungsi dan izin ada di [registri AI](AI_TOOL_REGISTRY.md). Fase 2 mencakup integrasi fitur lama lainnya. Generator makalah dan PPT, pencarian jurnal lanjutan, OSCE dan kurasi pengetahuan berada pada fase berikutnya.

## Fase 0 master project · 11 November 2026

**Audit lokal selesai. Status produk PARTIAL.** Pada fase ini perubahan terbatas pada laporan audit. Belum ada tool Responses aktif, generator makalah atau PPT baru, perubahan database maupun deployment.

| Pemeriksaan pada revisi a641f86 | Hasil | Cakupan |
| --- | --- | --- |
| npm run typecheck dan npm run build | Keduanya exit 0 | Kompilasi source TypeScript aktif. |
| npm test | 122 dari 122 tes lulus pada 22 file | Vitest lokal. Termasuk perizinan LMS, fallback, game, pemulihan worker dan validasi lampiran dengan fixture. |
| node scripts/command-catalog.mjs --check | 147 handler, 292 nama perintah, 573 eksekusi lewat WA mock, exit 0 | Memeriksa transkrip termasuk respons penolakan. Fontconfig memberi peringatan cache lokal. |
| Probe kalkulator sintetis | 28 tetes/menit, GCS 15/15, IMT 22,04 kg/m² dan balance 300 mL | nursingCalculation menghasilkan nilai yang diminta untuk empat input contoh pengguna. |
| Probe catatan dan alias hari | Masalah S03 dan S06 direproduksi | Objek layanan sementara dan parser. Detail di SECURITY_REVIEW.md. |
| Database | Prisma gagal menjangkau PostgreSQL lokal, kode P1001 | Struktur dan empat migrasi dibaca dari repo. Probe hanya mengizinkan alamat lokal. Data, migrasi dan backup produksi belum diuji. |
| Log dan WhatsApp | Output proses tes dan build diperiksa, transkrip WA melalui mock | Journal systemd VPS, API berbayar, akun LMS, file Drive asli, pairing HP dan uptime 24 jam belum diverifikasi dalam fase ini. |

### Urutan implementasi setelah audit

1. Perbaiki isolasi data dan siapkan registry dengan satu tool baca, uji izin lintas pengguna, input berbahaya dan fallback. Integrasikan Responses melalui transport baru agar jalur lokal tetap cepat.
2. Sambungkan layanan lama secara bertahap, catat penggunaan, persistensikan pekerjaan multi-langkah dan verifikasi efek yang dilaporkan.
3. Lanjutkan fase domain sesuai master project. Untuk prioritas makalah/PPT, gunakan korpus uji dengan DOI yang dapat diverifikasi, lalu uji file editable, render PDF, sitasi, notes dan pengiriman.
4. Jadwalkan uji akses live, pemulihan backup terisolasi, reconnect, reboot dan observasi VPS pada fase penerimaan.

Perubahan fase ini tercatat di [changelog](CHANGELOG.md). [Kesenjangan fitur](FEATURE_INVENTORY.md) · [Temuan per baris](SECURITY_REVIEW.md) · [Tool dan otorisasi](AI_TOOL_REGISTRY.md).


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

## Audit delapan halaman menu · 10 November 2026

Katalog README menjalankan parser dan dispatcher dengan WhatsApp simulasi. Setiap nama perintah dalam registri memiliki contoh. Sebagian contoh sengaja memeriksa respons ketika akses ditolak, data kosong, atau layanan belum dikonfigurasi.

| Halaman | Jalur yang diperiksa | Syarat penggunaan |
| --- | --- | --- |
| Informasi kelas | Data kelas, anggota, pengurus, dosen, mata kuliah dan kalender | Isi mengikuti data kelas yang dimuat. |
| Jadwal dan tugas | Filter hari, ekspor, tambah dan selesaikan tugas, antrean tenggat H−3 sampai hari H | Perubahan jadwal memerlukan penyimpanan yang dapat ditulis. Owner memilih grup dan mengonfirmasi pengingat di DM. |
| Belajar dan materi | Tanya AI, ringkasan, keperawatan, perhitungan, pencarian dan pengiriman materi Drive | Penyedia AI dan sumber artikel memerlukan jaringan. Drive memeriksa izin chat dan berkas saat unduhan. |
| Permainan | Bank soal, ruang permainan, kuis AI bertema, petunjuk, jawaban dan skor | Ronde AI memerlukan penyedia yang merespons. Ronde yang tersimpan dapat dilanjutkan setelah restart bot. |
| Media | Stiker, gambar, QR, PDF, kartu jadwal, OCR dan TTS | Perintah olah media memerlukan lampiran yang sesuai. OCR dan TTS bergantung pada program di host. |
| Utilitas | Perhitungan, waktu, musik, cuaca, wiki, profil dan bantuan | Cuaca, pencarian musik dan wiki bergantung pada layanan luar. MP3 berasal dari koleksi lokal yang diizinkan. |
| Administrasi | Status, log, AI, backup, moderasi dan persetujuan pengiriman | Akses mengikuti identitas, sesi admin dan konfirmasi tiap tindakan. Backup dan pemulihan produksi memerlukan uji VPS. |
| LMS | Dashboard, materi, tugas, kuis, sinkronisasi, AI belajar dan pengiriman dokumen pribadi | Perlu mahasiswa terdaftar, izin, sesi akun dan database. Batas verifikasi HTML serta dokumen kampus tercatat di [laporan LMS](LMS_IMPLEMENTATION_STATUS.md). |

Dalam mode otomatis untuk teks dan gambar, router mengutamakan OpenAI jika tersedia dan dapat mencoba NVIDIA sesuai anggaran waktu. Pengenal perintah bahasa alami membaca menu sesuai izin chat. Pemeriksaan akses dan pengiriman dijalankan oleh aplikasi. Kuis bertema memakai router yang sama. Jadwal, kalkulator, jawaban permainan dan persetujuan tetap memakai data serta aturan fitur masing-masing.

Uji pengiriman Drive mencakup PDF, PPT, PPTX dan ekspor Google Slides ke PPTX. Uji ini memeriksa tujuan, jenis, nama, isi lampiran serta penolakan ketika izin dicabut. Untuk uji penerimaan setelah deployment, gunakan DM yang diizinkan, cari satu dokumen dengan `.carimateri`, salin ID ke `.download <ID>`, lalu buka lampiran di HP. Untuk Slides, gunakan `.download <ID> pptx`. Untuk LMS, gunakan `.lms <alias> materi kirim <ID>` dari akun mahasiswa sendiri.

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
