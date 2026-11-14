# Status implementasi HdyBot

## Hasil verifikasi lokal · 15 November 2026

| Pemeriksaan | Hasil |
| --- | --- |
| npm run typecheck dan npm run build | Lulus |
| npm test -- --pool=threads --maxWorkers=1 | 171 tes lulus dalam 25 berkas, tanpa tes dilewati |
| node scripts/command-catalog.mjs --check | 149 handler dan 293 nama perintah, 578 eksekusi melalui WhatsApp simulasi. Contoh README cocok. |

Pengujian menggunakan codec FFmpeg/ffprobe lokal dan pdftotext untuk memeriksa halaman PDF. Gangguan pada provider AI, konversi media dan pengiriman dibuat secara terkontrol. Jalur suara memakai audio sintetis. Untuk memasang paket di VPS, lihat bagian awal README.

## Pemulihan fitur di WhatsApp

| Gangguan | Tindakan bot | Bukti lokal |
| --- | --- | --- |
| Handler permainan teks melempar error | Router meminta respons singkat dari AI sesuai jenis permainan. | Simulasi kegagalan .truth dan .faktaunik, termasuk kedua provider tidak tersedia. |
| Bagian daftar mata kuliah gagal dibaca | Bot menampilkan nama, kode dan SKS dari katalog kelas. | Tes merusak pembacaan dosen saat .matkul dipanggil. |
| Satu pembacaan di permintaan gabungan gagal | Bagian yang berhasil tetap tampil. Bagian yang gagal memuat ID pekerjaan. | Tes jadwal besok dan tugas hari ini dalam satu pesan. |
| Perubahan data gagal atau hasilnya belum pasti | Pengguna mendapat petunjuk untuk memeriksa status. AI boleh menyarankan perintah dari menu yang dapat diakses. | Tes .note add membuktikan handler mutasi hanya dipanggil sekali dan isi catatan tidak diteruskan ke model pemberi saran. |
| Mesin suara lokal gagal | .tts mencoba API suara OpenAI dan memeriksa buffer WAV sebelum pengiriman. | Tes WAV valid dan respons HTML rusak melalui provider simulasi. |
| Penyusunan file draf gagal sesudah isi draf tersedia | Bot memberikan pratinjau teks di chat. | Jalur pemulihan terimplementasi. Verifikasi pengiriman DOCX dan PPTX menggunakan adapter simulasi. |
| Cuaca tidak dapat diambil | Bot menyebut penyedia yang gagal dan memberikan halaman prakiraan BMKG. | Simulasi layanan cuaca gagal. |

## Pemrosesan file

Jika ekspor analisis ke PDF, DOCX, atau PPTX gagal sesudah model menghasilkan jawaban, bot mengirim pratinjau teks dan sumbernya di chat yang sama. Pencatatan histori yang gagal sesudah provider menerima pesan tidak memicu pengiriman ulang. Pembaca PDF memakai file sementara privat agar ekstraksi teks dapat memakai Poppler di Linux maupun Xpdf di Windows.

Tes sintetis mencakup gambar, teks, kode, JSON, CSV, XLSX, DOCX, PPTX, ZIP, dokumen rusak, batas ukuran, lampiran sementara, penggabungan PDF, pertanyaan lanjutan, pemisahan pengguna, serta keluaran melalui adapter WhatsApp simulasi. FFmpeg dan ffprobe memproses rekaman sintetis WAV, MP3, M4A, OGG, MP4 dan WebM dengan respons transkripsi tiruan. Lihat tests/file-intelligence.test.ts dan tests/existing-feature-tools.test.ts.

Untuk menjalankan ulang, gunakan npm ci, npm run db:generate, npm run typecheck, npm test -- --maxWorkers=1 dan npm run test:commands. Tes codec memerlukan ffmpeg dan ffprobe dalam PATH. Tes ekstraksi halaman PDF memerlukan pdftotext. Periksa jumlah tes yang dilewati jika komponen tersebut belum terpasang.

## Verifikasi yang masih terbuka

Konfigurasi lokal masih memiliki berkas .env yang terlacak Git, termasuk nilai terisi untuk NVIDIA_API_KEY, DATABASE_URL, dan ADMIN_PASSWORD. Nilai dan riwayat Git tidak disertakan dalam ZIP distribusi. Bila nilai tersebut pernah dipublikasikan dan masih berlaku, ganti kredensial pada layanan asal.

- Login WhatsApp melalui QR atau kode penautan, waktu respons pada VPS, pengiriman ke ponsel dan operasi 24 jam memerlukan pengamatan pada instalasi aktif.
- Pemulihan memakai API produksi bergantung pada kunci, akses model dan kuota. Panggilan model pada tes menggunakan provider simulasi.
- Migrasi PostgreSQL dan pemulihan konteks terenkripsi setelah restart belum diuji pada VPS pengguna. Retensi dasar tersedia. Pekerjaan aktif di memori perlu diminta kembali setelah restart.
- OCR untuk PDF hasil scan membutuhkan paket bahasa Indonesia dan Inggris. Akurasi OCR tulisan tangan, kualitas transkripsi bahasa Indonesia, identifikasi anatomi dan uraian video belum dinilai dengan materi pengguna.
- Pemisahan pembicara, subtitle per kata, ekstraksi grafik Office, arsip TAR/GZ, antivirus eksternal dan tautan unduhan privat berbatas waktu belum tersedia pada alur lampiran.
- LMS, Drive dan jurnal tetap memakai alur akses masing-masing. Lampiran percakapan perlu dikirim atau dikutip pengguna. Sinkronisasi otomatis lampiran ke basis pengetahuan dan pengambilan dokumen lintas layanan dalam satu permintaan belum tersedia.
