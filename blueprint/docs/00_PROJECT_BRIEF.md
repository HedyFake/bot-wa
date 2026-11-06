# 00 — Project Brief dan Product Requirements

## Ringkasan produk

Nursing Class A AI Assistant adalah sekretaris kelas berbasis WhatsApp dengan AI sebagai mesin pemahaman. Sistem mempunyai dua jalur interaksi yang berbeda:

1. **Admin private control:** admin mengirim pesan pribadi ke nomor bot dan mengontrol semua fungsi seperti menggunakan dashboard berbasis chat.
2. **Class communication:** bot membaca sumber yang telah diizinkan, menyimpan informasi akademik, dan menyiapkan pengumuman terverifikasi untuk grup utama Nursing Class A.

AI harus bertindak proaktif dalam merangkum dan mengingatkan, tetapi tidak boleh mengambil keputusan akademik yang hanya berwenang dilakukan dosen, sekretaris, ketua kelas, atau pihak kampus.

## Pengguna dan peran

- `OWNER`: pemilik sistem; boleh mengonfigurasi nomor admin, model, koneksi, backup, dan kebijakan.
- `CLASS_ADMIN`: operator yang disetujui; boleh mengelola data kelas, jadwal, tugas, dan pengumuman sesuai izin.
- `CLASS_OFFICER`: ketua/sekretaris/bendahara bila diinput; izin granular sesuai tugas.
- `MEMBER`: mahasiswa; boleh membaca informasi dan menggunakan fitur publik yang diaktifkan.
- `BOT`: identitas layanan, tidak boleh mengaku sebagai dosen.

Nilai nama/nomor pengurus belum diberikan. Simpan kosong sampai admin mengisi.

## Use cases utama

1. Admin bertanya “Apa informasi penting hari ini?” → AI menampilkan alert, tugas, jadwal, dan status sumber.
2. AI mendeteksi pesan perubahan kuliah dari grup yang diizinkan → buat review item → admin memverifikasi → update jadwal + kirim pengumuman.
3. Admin berkata “Tambah tugas Metodologi Penelitian deadline Jumat pukul 23.59” → AI mengurai detail → meminta klarifikasi tanggal jika “Jumat” ambigu → simpan setelah konfirmasi.
4. Anggota mengetik `.jadwal rabu` → bot menampilkan data jadwal yang tersimpan.
5. Admin mengirim foto jadwal → Super-VL membaca foto → hasil ekstraksi dibandingkan dengan data → tampilkan diff, jangan overwrite otomatis.
6. Admin bertanya dari PDF materi → sistem retrieval mengambil potongan yang relevan dan AI menjawab dengan kutipan halaman jika tersedia.

## Batas MVP

MVP wajib: admin private control, autentikasi, health/status, command + bahasa natural, NVIDIA router, class profile, jadwal 5A, dosen/matkul, reminder, message classification, admin digest, approval flow, grup tujuan konfigurasi, audit log.

MVP belum perlu: gamification kompleks, ranking akademik, pelacakan kehadiran diam-diam, pengenalan wajah, auto-absensi, website dashboard penuh, atau integrasi langsung ke akun SIAKAD tanpa persetujuan resmi.

## Non-functional requirements

- Bahasa Indonesia dan format waktu `Asia/Jakarta`.
- Sistem tahan restart tanpa kehilangan jadwal, tugas, atau antrean.
- Job dan incoming events idempotent.
- 99% command biasa merespons dalam target waktu operasional yang ditetapkan setelah benchmark; jangan menjanjikan SLA sebelum diuji.
- Pesan penting tidak boleh hilang tanpa status failure/review.
- Semua pengiriman keluar punya delivery state.
- Data dapat diekspor dan dipulihkan dari backup.
- Secret dan session WhatsApp terpisah dari source code.

## Definisi “semua dikontrol lewat WhatsApp pribadi”

- Command admin, natural language, preview, confirmation, status, menu, model management, schedule management, group allowlist, review queue, and reports available through private DM.
- No admin action executed from a group message.
- Optional web dashboard is not required for daily operations.
