# HDYBOT — LMS Implementation Report

**Tanggal** 10 November 2026 WIB  
**Status keseluruhan** PARTIAL. Integrasi berjalan pada proyek HDYBOT. Login ke akun kampus asli dan pengiriman PDF dari sesi asli ke HP pemilik masih perlu uji penerimaan.

| Fase | Status | Bukti |
| --- | --- | --- |
| Audit kode dan login publik | DONE | Form HTTPS, nama field, metode, action, dan nama cookie diperiksa langsung tanpa mengirim kredensial. |
| Koneksi ke dispatcher, menu, AI, PostgreSQL | DONE untuk integrasi lokal | Perintah LMS masuk melalui DM sebelum klasifikasi. Luna menjadi model utama saat tersedia. Menu dan katalog menjalankan dispatcher. |
| Identitas, persetujuan, enkripsi | DONE pada pengujian | Registrasi owner, ikatan nomor–NIM, cookie per sesi, AES-GCM dengan AAD per pengguna, rate limit login, pencabutan cache dan persetujuan AI terpisah. |
| Dashboard dan matkul | PARTIAL | Selector dari HTML pemberian pengguna. Profil sidebar, periode, empat statistik, kode, kelas, SKS, pengampu, jumlah pertemuan dan tautan kelas. Angka berasal dari HTML tiap akun. |
| Materi dan dokumen | PARTIAL | Struktur tab materi diketahui. Tombol Buka dapat memberikan PDF langsung dari URL tanpa ekstensi. Permintaan unduh memvalidasi ulang daftar kelas dan isi dokumen. Pengiriman ke DM diuji dengan PDF sintetis. Tidak ada pengiriman grup. |
| Tugas dan kuis | PARTIAL | Tab kosong diketahui dari contoh. Tabel dan status eksplisit ditangani dengan fixture. Kartu nyata yang berisi tugas, deadline atau kuis aktif belum tersedia untuk uji penerimaan. |
| AI dan sumber | PARTIAL | Metadata, ekstraksi PDF, OCR serta kutipan halaman/bagian terhubung. Penelusuran beberapa file dibatasi. Ekstraksi isi PPT/DOC untuk AI dan evaluasi kualitas jawaban dari materi asli belum tersedia. |
| Scheduler | DONE pada database uji | Tiga migrasi berhasil diterapkan ke PostgreSQL 18 kosong; skrip check-lms-db memeriksa sesi, pembuatan ulang service, dua worker bersamaan, notifikasi tunggal, dan logout. |
| WhatsApp dan VPS | PARTIAL | Chrome lokal menghasilkan QR asli dalam 19,2 detik memakai profil kosong. Login kode dan transisi pairing disimulasikan. HP pengguna, restart VPS dan uptime 24 jam belum terverifikasi. |

## File dan pengujian

- Arsitektur dan command ada dalam docs/LMS_ARCHITECTURE.md dan docs/LMS_COMMANDS.md. Audit awal ada dalam LMS_AUDIT.md.
- Adapter HTTP dan enkripsi berada di src/modules/lms/client.ts. Parser dan sinkronisasi metadata di catalog.ts, pemrosesan format di document.ts, tanggal di dates.ts, dan layanan akun, scheduler, dokumen serta AI di service.ts.
- Skema dan migrasi Prisma, konfigurasi, installer, dispatcher, parser, menu, monitor, adapter WhatsApp, router AI dan README diperbarui. Tidak ada endpoint monitoring web baru.
- tests/lms.test.ts menggunakan data uji untuk login berhasil/gagal, NIM salah, CSRF, redirect keluar domain, HTML login yang menyamar file, ukuran, MIME, status, pencarian, HTML dashboard/kelas, dokumen, AI, deteksi perubahan, expiry dan pencabutan. Fixture tidak menyimpan nama atau kredensial pengguna. scripts/check-lms-db.mjs memerlukan database uji lokal bernama hdybot_test_*.
- Untuk memisahkan keterlambatan WhatsApp, log lambat kini memuat ageAtProviderEventMs, adapterMs, dan handledMs. Router membatasi total waktu percobaan AI sesuai fitur. Batas tersebut tidak mencakup pengiriman WhatsApp, OCR, atau pengunduhan.
- Format legacy DOC/PPT diperiksa dengan parser kontainer Office, PDF dengan parser PDF, dan DOCX/PPTX dengan pemeriksaan entri XML. Video dapat terdeteksi sebagai tautan, tetapi pengiriman biner video belum didukung.
- Installer systemd menyiapkan LMS_ENCRYPTION_KEY jika belum tersedia. Simpan kunci terpisah dari backup database. Akses dokumen melalui tombol Buka dapat dicatat oleh LMS sebagai telah dibaca. Bot tidak menjalankan endpoint pengumpulan atau pengerjaan evaluasi.

## Uji penerimaan berikutnya

Pasang source terbaru di VPS, jalankan instalasi/migrasi, daftarkan pasangan nomor dan NIM yang telah diverifikasi, lalu berikan persetujuan dari DM mahasiswa. Login dengan password LMS sendiri di DM bot. Bandingkan statistik dan daftar kelas dengan browser. Kirim satu PDF ke DM pemilik dan periksa isi, nama serta ukurannya. Uji juga satu kelas yang memiliki tugas pending dan kuis berisi data. Tinjau log pairing dan waktu penerimaan pada perangkat tersebut. Akses nyata, kebijakan kampus, dan hasil pengujian produksi belum dapat disimpulkan dari HTML contoh.
