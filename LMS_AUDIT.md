# Audit integrasi LMS HDYBOT

Pemeriksaan 10 November 2026. Entry point TypeScript di src/index.ts menghubungkan adapter whatsapp-web.js, CommandDispatcher, ModelRouter, OutboundGate dan worker Prisma/PostgreSQL. package.json dan lockfile menggunakan Cheerio untuk HTML. Proyek memiliki blueprint keamanan, katalog perintah, dokumentasi deployment dan pengujian di tests serta scripts/command-catalog.mjs.

User menyimpan e164/JID tetapi tidak memiliki NIM. Daftar anggota kelas di FunAndUtilityService memiliki nama dan NIM tetapi tidak membuktikan kepemilikan nomor WhatsApp. Pengikatan mandiri kini memakai verifikasi login portal sebelum menyimpan pasangan nomor pengirim dan NIM. Password admin bot bukan kredensial LMS.

Drive memiliki otorisasi berbasis chat dan service account. Izin tersebut tidak berlaku untuk dokumen LMS pribadi. Ekstraktor src/modules/materials/extract.ts mendukung teks, PDF, dan OCR via Poppler/Tesseract. Lampiran dikirim memakai kontrak media WhatsApp yang sudah ada. systemd sudah mengelola proses dan backup PostgreSQL.

GET publik ke https://lms.shj.ac.id/ menghasilkan HTTP 200. Form method POST menuju /auth/proses_login dengan input username dan password, dan respons memberikan cookie bernama ci_session. Saat pemeriksaan itu tidak ada input tersembunyi. Form harus dibaca ulang pada login. Pemilik memberikan contoh HTML dashboard dan kelas Entrepreneurship 2. Profil memakai .user-panel, statistik memakai .stat-mini-card, dan setiap .mk-card memiliki tautan Masuk. Materi ditampilkan dalam #tab-materi. Pemilik mengonfirmasi bahwa tombol Buka menampilkan PDF langsung. Contoh tugas dan kuis pada kelas itu kosong. Belum ada uji login langsung dengan akun yang diizinkan atau konfirmasi kebijakan otomasi institusi.

Pada sampel log, delapan pesan sudah berusia 19–71 detik sebelum dispatcher menerima pesan. Dua lainnya berusia kurang dari 0,3 detik dan penanganannya sekitar 60 detik. Angka tersebut belum memisahkan jaringan, metadata adapter, AI dan pengiriman. Log ini tidak memuat peristiwa pairing atau alasan penolakan WhatsApp.
