# Audit HdyBot · 8 November 2026

## Audit terhadap master project · 11 November 2026

Source dasar `a641f86`. Inventaris fisik, 192 bentuk menu, peran, dependensi dan rute fungsi tersedia di [AUDIT.md](AUDIT.md). Pemeriksaan kali ini membandingkan implementasi dengan master project dan menelusuri jalur WA → otorisasi → AI/layanan → penyimpanan → pengiriman. Source aktif ada di `src/`. Akira dan blueprint menjadi bahan referensi. Mock WA mengimplementasikan antarmuka adapter untuk pengujian.

| Area | Bukti source | Kesimpulan fase audit |
| --- | --- | --- |
| WhatsApp, admin, menu | `src/whatsapp/adapters/wwebjs.ts`, `src/admin/authentication/authenticator.ts`, `src/admin/commands/{parser,menu,dispatcher}.ts` | Adapter utama dan kontrol akses tersedia. Mode Baileys memiliki batas media. Katalog, parser dan inferensi maksud memakai beberapa daftar yang perlu diselaraskan. |
| OpenAI dan NVIDIA | `src/ai/openai/luna.ts:7`, `src/ai/model-router/router.ts:219` | Tersedia transport teks, routing, batas waktu dan fallback. Model OpenAI serta URL ditetapkan dalam transport. Belum ada siklus function calling Responses, schema hasil, batas tool call atau anggaran harian/bulanan yang diminta. |
| Keperawatan dan riset | `src/modules/academic/perawat.ts`, `src/modules/fun/fun-utility-service.ts` | Sumber keperawatan, kalkulator dan pencarian publikasi tersedia. Daftar istilah berprovenance, atlas anatomi, rubrik OSCE dan appraisal lintas artikel adalah pekerjaan baru. |
| Dokumen | `src/modules/media/media-service.ts`, `src/modules/materials/extract.ts`, `src/modules/lms/document.ts` | Bedakan tiga kemampuan: membuat PDF, mengirim file Office yang sudah ada, dan menyusun dokumen Office baru. Dua yang pertama memiliki jalur kode. Generator makalah DOCX dan slide editable dengan notes belum ditemukan. |
| LMS dan Drive | `src/modules/lms/service.ts`, `src/modules/materials/drive.ts` | Tersedia sesi dan cache mahasiswa, pengiriman ke DM, indeks folder dan izin file Drive. Penelusuran Drive melakukan pemindaian penuh. Penerimaan dari akun kampus dan folder produksi masih terbuka. |
| Knowledge dan pemulihan | `src/modules/materials/knowledge-base.ts:54`, `scripts/restore.sh:12` | Koleksi materi dalam memori dan pencarian kutipan menjadi dasar retrieval. Pipeline kandidat, approval, versi dan indeks persisten belum ditemukan. Restore mempunyai urutan destruktif yang perlu diperbaiki dan diuji. |

Keputusan arsitektur awal adalah mempertahankan TypeScript, Prisma dan adapter WhatsApp. Sebelum memperluas izin AI, prioritaskan kredensial, isolasi catatan dan proteksi payload penyedia. Rincian bukti, keparahan dan saran perbaikan tercatat di [audit keamanan](SECURITY_REVIEW.md).


## Cakupan

Proyek aktif memakai TypeScript, Node.js, whatsapp-web.js dengan LocalAuth, Prisma/PostgreSQL, Sharp, pdf-lib, Pino, dan transport HTTP NVIDIA. Jalur produksi dimulai dari src/index.ts. Build disimpan di dist. Adapter mock dipakai dalam pengujian. Baileys merupakan opsi eksperimental yang membutuhkan paket tambahan. Format session kedua provider berbeda.

Peta modul produksi dan dependensinya tercantum di [ARCHITECTURE_MAP.md](ARCHITECTURE_MAP.md). Rute perintah titik, alias, pemeriksaan akses, panggilan layanan, dan ketersediaan handler tercantum di [FEATURE_INVENTORY.md](FEATURE_INVENTORY.md). Keberadaan handler memiliki arti berbeda dari kelulusan uji perilaku. Hasil pengujian tercantum di [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

| Lokasi | Peran dan temuan |
|---|---|
| src/admin, src/whatsapp | Parser membedakan perintah titik dan bahasa alami. Dispatcher memiliki jalur grup dan privat tersendiri. Adapter wwebjs memproses event message_create, metadata peserta, pesan kutipan, dan media. |
| src/ai | Router mengelola alias model, timeout, retry, fallback, dan penolakan modality yang tidak didukung. Group intelligence memiliki antrean review dan ringkasan lintas grup. |
| src/modules | Saat PostgreSQL dikonfigurasi, jadwal, mata kuliah, dosen dan pengecualian tanggal diambil dari database. Mode mock tanpa database memakai seed Semester 5A. Tugas, pengingat lama, catatan, dan pengaturan hiburan memakai state lokal. Sebagian respons lama menggunakan data tetap. |
| prisma, data | Dua migrasi awal mencakup tabel domain dan proteksi audit append-only. Seed melakukan upsert. Perbaikan memakai tabel Reminder, AuditLog, dan BotSetting yang sudah ada. |
| scripts, install.sh, start.js | Tersedia backup dan restore PostgreSQL, installer systemd, serta peluncur Node. Konfigurasi PM2 lama merupakan jalur deployment alternatif. |
| tests | Vitest menguji parser, autentikasi, router, seed, media, pengingat, dan alur mock. Pengujian baru mencakup Drive, pengiriman dokumen dan registri. |
| blueprint, docs, reference/akira | Blueprint dan dokumentasi memuat rancangan serta klaim implementasi historis. Akira merupakan arsip referensi yang dikecualikan dari Git dan tidak diimpor oleh runtime. Audit ini tidak menyertifikasi setiap plugin Akira. |
| .github | Workflow Datadog memakai secret GitHub untuk tes sintetis. Workflow tersebut terpisah dari runtime WhatsApp dan tidak membuktikan kesiapan VPS. |

## Temuan yang memengaruhi produksi

1. Password yang benar sebelumnya memasukkan nomor baru ke allowlist dan memberi status owner. Jalur grup juga mempercayai push name dan JID LID yang belum dipetakan. Autentikasi kini membutuhkan identitas allowlist terlebih dahulu. Admin grup hanya berwenang atas pengaturan grup yang ditentukan.
2. Handler auth_failure sebelumnya membersihkan semua isi folder autentikasi. LocalAuth bawaan juga menghapus profil ketika logout. Perbaikan mempertahankan profil, membedakan gangguan sementara dari logout, serta membatasi retry koneksi.
3. QR, kode pairing, dan contoh password sebelumnya keluar melalui log atau direktori sementara. Installer juga mengganti password pengguna saat dijalankan ulang. Pairing kini memakai berkas privat, instalasi baru menghasilkan password unik, dan konfigurasi lama dipertahankan.
4. Perintah monitoring sebelumnya dapat dijalankan melalui grup. Pemeriksaan kesehatan dalam dispatcher juga melewatkan probe database. Perbaikan menutup jalur grup dan menghubungkan probe yang sama dengan aplikasi.
5. Pengingat kustom tersimpan di JSON tanpa worker pengiriman di entry point. Worker produksi kini memakai tabel Reminder dan mengimpor pengingat aktif lama. Perilaku crash pada batas kirim WhatsApp dijelaskan di laporan implementasi.
6. Penelusuran materi lama bekerja pada knowledge base lokal tanpa koneksi Drive. Katalog Drive, otorisasi tujuan, pengiriman, dan ekstraksi dokumen kini memiliki jalur sendiri. Kredensial dan izin folder produksi belum diuji.
7. Fallback jurnal lama membentuk judul dan penulis ketika repositori eksternal tidak memberikan hasil. Jalur offline kini memberikan tautan pencarian dan menjelaskan ketiadaan artikel terverifikasi.

## Risiko yang masih terbuka

- Relay lintas grup lama mempercayai nama tampilan. Jalur baru mensyaratkan sumber dan tujuan JID yang ditetapkan admin. Gunakan .setpjmk dan .setkelasa melalui DM admin.
- Audit lanjutan menemukan empat mutasi jadwal, .priority, dan .broadcast preview sudah dikenali parser tetapi belum dieksekusi. Handler sekarang terhubung. Pengujian database terisolasi memeriksa perubahan jadwal, penolakan konflik, backup, seed ulang, dan pengiriman pengingat.
- Role lama memiliki beberapa padanan dengan nama baru di seed. Penegakan permission per role akademik belum menyeluruh.
- Sebagian riwayat AI dan log monitoring chat disimpan di memori. Sesi permainan, skor opt-in, riwayat jawaban benar, dan mode interaksi menggunakan state lokal persisten. Backup PostgreSQL tidak menyertakan state JSON.
- Lingkungan lokal belum membuktikan pairing WhatsApp, izin Drive asli, restart systemd, boot VPS, atau pemulihan database dari backup. Tidak ada sesi WhatsApp maupun database produksi yang diubah selama pengujian.
