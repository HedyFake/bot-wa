# 22 — Referensi Publik SHJ dan Status Verifikasi

Audit referensi publik dilakukan pada **6 November 2026**. Halaman publik bukan pengganti kalender akademik atau jadwal resmi kelas 5A.

## Official references to check

| Sumber | URL | Tujuan |
|---|---|---|
| Website utama | https://shj.ac.id/ | Profil institusi dan berita |
| Prodi Profesi Ners | https://shj.ac.id/prodi-profesi-ners/ | Konteks program keperawatan |
| Materi Pembelajaran | https://shj.ac.id/materi-pembelajaran/ | Materi publik |
| Download | https://shj.ac.id/halaman-download-file/ | Pedoman akademik / panduan |
| SIAKAD | https://siakad.shj.ac.id/ | Referensi portal; akses hanya dengan akun sah |
| LMS | https://lms.shj.ac.id/ | Materi/e-learning; akses hanya dengan akun sah |
| E-Journal | https://e-journal.shj.ac.id/ | Publikasi institusi |

## Verification policy

- Setiap sumber harus mencatat URL, tanggal pemeriksaan, publisher, title, fetched status, and license/access notes.
- Jangan menyalin materi berhak cipta penuh atau mengabaikan terms of use.
- Jangan mencoba mengakses portal pribadi, bypass login, atau meminta password mahasiswa/dosen.
- Nama dosen yang ditemukan di halaman kampus tidak otomatis membuktikan penugasan mengajar pada kelas 5A.
- Data seed dari user tetap diberi `USER_PROVIDED_PENDING_CONFIRMATION` sampai disahkan.

## Prompt untuk coding agent

> Buat source registry untuk halaman resmi dan file yang diberikan admin. Crawl hanya halaman publik yang diizinkan dan gunakan rate limit. Simpan provenance dan tanggal pemeriksaan. Jangan mengambil data di balik login atau mengklaim jadwal 5A resmi jika tidak ada sumber langsung.
