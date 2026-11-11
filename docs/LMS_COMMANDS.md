# Command LMS di WhatsApp

## Mulai dari chat pribadi atau grup

1. Ketik `.lms hedy` dari WhatsApp milikmu. Ganti `hedy` dengan nama panggilanmu. Dari grup, bot mengirim petunjuk atau hasil ke DM pengirim.
2. Pada penggunaan pertama, baca persetujuan di DM. Jika namamu cocok dengan satu anggota daftar kelas, ketik `.lms hedy hubungkan <password LMS>` **di DM bot**. Jika namamu belum tercatat atau cocok dengan beberapa orang, gunakan `.lms <nama> hubungkan-nim <NIM sendiri> <password LMS>` sekali. Bot mengambil nomor dari WhatsApp dan memverifikasi NIM melalui dashboard kampus sebelum menyimpan ikatan akun.
3. Setelah terhubung, ketik `.lms hedy` untuk membuka dashboard. Bot memakai sesi tersimpan dan bisa masuk ulang saat sesi berakhir. Perintah `hubungkan` mengizinkan penyimpanan password terenkripsi. Hapus pesan password di WhatsApp setelah login. Alur lama `setuju` dan `login` masih tersedia untuk akun terdaftar yang memilih penyimpanan sesi saja.
4. Ketik `.lms hedy logout` di DM untuk menghapus kredensial, sesi, cache dan izin. Pengelolaan akun serta izin AI dilakukan di DM. Dari grup, kamu bisa meminta dashboard, daftar materi, tugas, kuis dan dokumen. Bot mengirim hasil ke nomor pengirim.

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
