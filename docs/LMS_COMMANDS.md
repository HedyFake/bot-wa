# Command LMS di WhatsApp

## Mulai dari DM

1. Owner yang sudah login mengonfirmasi pemilik nomor dan NIM. Di DM bot jalankan `.lms daftar <nomor> <NIM> <alias>`. Misalnya alias hedy. Data mahasiswa lain tidak dapat dibaca dengan mengubah alias.
2. Mahasiswa memakai nomor tersebut untuk mengirim `.lms hedy setuju`, kemudian `.lms hedy login <password LMS>`. Password LMS dan password admin bot adalah dua kredensial terpisah. Hapus pesan kredensial dari riwayat WhatsApp setelah login.
3. Gunakan `.lms hedy` atau `.lms hedy dashboard`. Tanggal pemeriksaan dalam WIB. `.lms hedy status` menampilkan status lokal.
4. Untuk mencabut sesi, cache dan izin AI gunakan `.lms hedy logout`, `.lms hedy cabut` atau `.lms hedy hapus`.

## Penelusuran

| Kebutuhan | Contoh |
| --- | --- |
| Mata kuliah menurut kode, nama, dosen, kelas, atau semester yang tercantum | `.lms hedy matkul gerontik` |
| Detail dan pengampu | `.lms hedy detail gerontik`, `.lms hedy dosen gerontik` |
| Materi per matkul | `.lms hedy materi`, `.lms hedy materi list MPEN.4`, `.lms hedy materi terbaru`, `.lms hedy materi baru` |
| Cari dan periksa sumber | `.lms hedy materi cari penelitian`, `.lms hedy cari materi penelitian`, `.lms hedy materi detail <ID>` |
| Lampiran ke DM sendiri | `.lms hedy materi kirim <ID> [nomor file]`, `.lms hedy materi download <ID>` |
| Tugas dan tenggat | `.lms hedy tugas pending`, `.lms hedy tugas terbaru`, `.lms hedy tugas selesai`, `.lms hedy tugas gerontik`, `.lms hedy tugas cari makalah`, `.lms hedy tugas detail <ID>`, `.lms hedy deadline` |
| Kuis | `.lms hedy kuis aktif`, `.lms hedy kuis terbaru`, `.lms hedy kuis gerontik`, `.lms hedy kuis detail <ID>` |
| Halaman berikutnya | `.lms hedy materi page 2`. Daftar menampilkan hingga empat entri. Pencarian isi memeriksa maksimal tiga file per kelompok halaman. |

Status pending/selesai/aktif menggunakan label yang terbaca. Materi baru berarti belum pernah ditampilkan dalam daftar materi atau dikirim oleh bot ke pemilik akun. Tombol Buka materi dapat mengirim PDF langsung melalui sesi mahasiswa. Pencarian isi, unduhan, dan AI yang membuka materi dapat mengubah status baca pada LMS. Sinkronisasi daftar kelas tidak membuka tombol tersebut. Informasi yang tidak dapat dibaca dapat diperiksa kembali di portal LMS. Dalam DM, `@bot buka lms hedy` dan `@bot lms hedy materi gerontik` menuju jalur privat yang sama.

## Sinkronisasi dan belajar

Gunakan `.lms sync hedy`, `.lms hedy sync`, atau `.lms sync now` untuk memeriksa ulang. Cache baru diberi waktu satu menit sebelum refresh manual. `.lms sync status`, `.lms sync pause`, `.lms sync resume`, dan `.lms sync history` berlaku hanya untuk akun pengirim. Aktifkan notifikasi dengan `.lms hedy notif on` dan matikan dengan `.lms hedy notif off`.

Gunakan `.lms hedy ai on` untuk mengizinkan potongan materi dikirim ke penyedia AI. `.lms hedy ai off` mencabut izin. `.lms hedy ask <pertanyaan>`, `.lms hedy summarize <ID materi>`, `.lms hedy flashcard <topik>` dan `.lms hedy quiz belajar <topik>` memberikan bantuan belajar dengan sumber. Di DM, `.ask <pertanyaan>` memakai LMS bila ada izin dan kata kunci cocok dengan metadata materi akun. `.ask materi ...` tetap menjalankan alur Drive. Materi LMS tidak disisipkan dalam jawaban grup.
