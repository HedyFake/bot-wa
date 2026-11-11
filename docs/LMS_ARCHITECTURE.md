# Arsitektur LMS HdyBot

## Jalur permintaan

Adapter WhatsApp → deduplikasi → pengenal perintah LMS → pemeriksaan DM dan nomor pengirim → LmsService → akun Prisma → LmsClient HTTPS → parser/katalog atau downloader → OutboundGate. Jalur login diperiksa sebelum mode admin, klasifikasi grup, ringkasan, dan AI. Permintaan baca dari grup memakai identitas pengirim dan tujuan DM. Penautan mandiri memverifikasi password pada portal dan mencocokkan NIM sebelum membuat akun. Nomor dan NIM unik mencegah pengambilalihan akun yang terikat.

## Penyimpanan

Migrasi tambahan membuat LmsAccount di PostgreSQL, dengan nomor dan NIM unik, alias, consent, izin AI, preferensi notifikasi, revisi dan jadwal sinkronisasi. Envelope AES-256-GCM menyimpan cookie, snapshot metadata, riwayat, ID materi yang sudah ditampilkan, serta daftar perubahan. AAD mengikat envelope pada nomor dan NIM. Gunakan LMS_ENCRYPTION_KEY dari 32 byte acak dalam base64. Instalasi systemd membuat kunci jika belum tersedia. Simpan kunci secara terpisah bersama prosedur pemulihan backup. Mengganti kunci memerlukan login ulang atau migrasi data. Perintah hubungkan menyimpan password dalam kolom autoLogin terenkripsi dengan AAD terpisah. Perintah login biasa menyimpan sesi saja. Logout menghapus kedua data terenkripsi. Pesan login tetap berada dalam riwayat WhatsApp pengguna sampai pengguna menghapusnya.

## Batas akses

Adapter membaca form pada setiap login, memeriksa metode dan tujuan, membawa hidden fields dan cookie ci_session, serta memeriksa NIM pada halaman mahasiswa hasil pengalihan. CAPTCHA dan OTP memerlukan interaksi resmi. Semua redirect dan URL file harus HTTPS pada origin lms.shj.ac.id. Dokumen pihak ketiga tidak diambil. Respons diunduh bertahap dengan timeout dan batas ukuran. Nama file dirapikan dan lampiran berada di RAM. Sebelum mengirim, bot membuka kembali daftar materi dan mencocokkan ID serta URL file dengan akses sesi mahasiswa saat ini. Dokumen PDF, Office dan gambar melewati pemeriksaan MIME dan isi. Logout menghapus sesi lokal dan cache. Jika link /auth/logout ditemukan pada dashboard saat login, bot juga mencoba mengakhiri sesi di server.

## Pengambilan data dan AI

Crawler mengikuti tautan yang benar-benar ditemukan, dengan pembatasan 30 halaman per putaran serta jeda antarhalaman. Parser SHJ membaca profil sidebar, periode akademik, statistik, kartu mata kuliah, chip pengampu, jumlah pertemuan, serta baris materi dari HTML yang diberikan. Tautan akses_materi baru dibuka ketika mahasiswa meminta unduhan atau analisis isi. LMS dapat mencatat akses tersebut sebagai sudah dibaca. Parser tabel tambahan menggunakan judul bagian, label kolom, tautan detail, lampiran, dan tautan halaman berikutnya. Tampilan yang tidak dikenali menghasilkan hasil terbatas. Skor, nama dosen, status, deadline, dan jumlah LMS tidak ditebak. Angka pada kartu statistik ditampilkan sebagaimana dilaporkan LMS. Jika kartu tidak tersedia, ringkasan lokal dilabeli sebagai jumlah entri terbaca. Validasi parser terhadap halaman privat kampus masih diperlukan.

Akses AI perlu persetujuan terpisah melalui ai on. Pencarian mempertimbangkan metadata, teks PDF dan OCR gambar. Per pertanyaan, bot mengambil bagian relevan dari maksimal tiga dokumen, memakai ekstraktor proyek, dan memberi nama materi, kelas/matkul, bagian atau halaman serta cuplikan. GPT-6 Luna menjadi penyedia utama untuk teks/gambar jika dikonfigurasi. NVIDIA mengambil alih sesuai pengaturan mode dan fallback. Latihan kuis dikirim sebagai teks belajar. Aplikasi tidak mengunggah tugas, memulai attempt, atau menjawab kuis di LMS.

## Scheduler dan operasi

Worker berada di proses systemd yang sudah ada. Interval default 45 menit dan dapat dikonfigurasi dari 30 menit sampai satu hari. Status jadwal dan revisi bertahan saat restart. Worker mengambil maksimal dua akun per tick dengan klaim bersyarat di PostgreSQL. Request gagal ditunda dengan backoff hingga satu hari. Sesi kedaluwarsa dijeda dan cache dicabut. AuditLog menyimpan kategori tindakan tanpa argumen login. Notifikasi bersifat opt-in dan hanya ke nomor pemilik akun antara pukul 07.00 sampai sebelum 21.00 WIB. Snapshot pertama menjadi baseline. Pengiriman perubahan ditandai sebelum memanggil provider untuk mengurangi duplikasi. Crash pada celah sebelum send dapat menyebabkan satu notifikasi terlewat, dan pengiriman WhatsApp tidak memiliki transaksi atomik dengan PostgreSQL.

Proyek menggunakan satu proses bot untuk satu profil WhatsApp. Pemeriksaan admin, backup, dan systemd tetap memakai jalur proyek sebelumnya. Tidak ada perubahan konfigurasi jaringan atau firewall.
