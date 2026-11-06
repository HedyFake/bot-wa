# 11 — Mata Kuliah dan Dosen Semester 5A

> Daftar dosen di bawah berasal dari input user. Ini adalah asosiasi kandidat per mata kuliah, bukan bukti bahwa seluruh dosen mengajar tiap sesi kelas 5A. Data nama dan gelar harus diverifikasi dengan jadwal resmi/administrasi.

## Mata kuliah

| Mata kuliah | SKS | Alias pencarian |
|---|---:|---|
| Metodologi Penelitian | 4 | metodologi, metpen |
| Keperawatan Anak Sakit dan Kronis dan Terminal | 2 | keperawatan anak, anak sakit, kronis terminal |
| Keperawatan Menjelang Ajal | 3 | menjelang ajal, end-of-life nursing |
| Konsep Keperawatan Agregat Komunitas | 2 | agregat komunitas, keperawatan komunitas |
| Entrepreneurship 2 | 4 | entrepreneurship, kewirausahaan 2 |
| Keperawatan Gerontik | 4 | gerontik, keperawatan lansia |
| Keperawatan Dewasa Sistem Muskuloskeletal, Integumen, Persepsisensori dan Persyarafan | 3 | keperawatan dewasa, muskuloskeletal, integumen, persepsi sensori, persarafan |

## Dosen berdasarkan input user

### Metodologi Penelitian

- Facrur Rozi, S.Kep., Ns., M.Kep
- Eliza Zihni, S.Kep., Ns., M.Kep
- Prawito, S.Kep., Ns., M.Kep
- Karisma Dwi Ana, S.Kep., Ns., M.Kep

### Keperawatan Anak Sakit dan Kronis dan Terminal

- Asri Kusyani, S.Kep., Ns., M.Kep
- dr. Alia Astutik, M.Kes
- Yusina Vidhiastutik, Ns., M.Kep
- Eli Rahmawati, M.Kes

### Keperawatan Menjelang Ajal

- Aditya Nurdin A, S.Kep., Ns., M.Kep
- Dr. Darsini, S.Kep., Ns., M.Kes
- Dwi Uswatun, S.Kep., Ns., M.Kep
- Eliza Zihni Z, S.Kep., Ns., M.Kep

### Konsep Keperawatan Agregat Komunitas

- Vendi Kurniawan, S.Kep., Ns., M.Kes
- Kusuma Wijaya Ridi P, S.Kep., Ns., MNS
- Yusiana Vidhiastutik, S.Kep., Ns., M.Kep
- Roni Setyawan, S.Kep., Ns., M.Kep

### Entrepreneurship 2

- Karisma Dwi Ana, Ns., M.Kep
- Ardiyanti Hidayah, M.Kes
- Masrulloh, S.Kep., Ns., M.Kes
- Elis Fatmawati, S.ST., M.Keb
- Aris Setyawan

### Keperawatan Gerontik

- Kusuma Wijaya Ridi P, S.Kep., Ns., MNS
- Yusina Vidhiastutik, S.Kep., Ns., M.Kep
- Vendi Eko Kurniawan, S.Kep., Ns., M.Kes
- Fachrun Nisa, S.Kep., Ns., M.Kep

### Keperawatan Dewasa (Muskuloskeletal, Integumen, Persepsi Sensori dan Persyarafan)

- Dr. Darsini, S.Kep., Ns., M.Kes
- Nanang Bagus Sasmito, S.Kep., Ns., M.Kep
- Gevi Mellya Sari, S.Kep., Ns., M.Kep
- Prawito, S.Kep., Ns., M.Kep
- Facrur Rozi, S.Kep., Ns., M.Kep
- Dwi Uswatun, S.Kep., Ns., M.Kep
- Siti Hidayati, M.Kep

## Nama yang perlu klarifikasi

Saat pencarian web pada 6 November 2026, beberapa halaman institusi menampilkan penulisan nama yang mirip tetapi tidak identik. Jangan otomatis menggabungkan:

- `Yusina Vidhiastutik` vs `Yusiana Vidhiastutik`.
- `Vendi Kurniawan` vs `Vendi Eko Kurniawan`.
- `Kusuma Wijaya Ridi P` vs `Kusuma Wijaya Ridi Putra`.
- `Eliza Zihni Z` vs `Eliza Zihni Zatihulwani`.
- `Fachrun Nisa` vs `Fakhrun Nisa' Fiddaroini`.

Simpan varian input sebagai `raw_name`, canonical record terpisah, `alias_candidate`, `verification_status=NEEDS_CONFIRMATION`, dan sumber URL. Hanya admin/otoritas resmi yang dapat mengonfirmasi bahwa dua penulisan adalah orang yang sama.

## Kontak / profil dosen

Boleh menyimpan: gelar, mata kuliah, link LMS/Google Classroom/Zoom/Meet resmi, jam konsultasi yang dipublikasikan, dan kontak institusi resmi bila tersedia. Jangan mengumpulkan nomor pribadi dosen tanpa izin atau sumber resmi.

## Prompt untuk coding agent

> Build courses, lecturers, course_lecturers, search aliases, lecturer profiles, and source verification workflow. Import list exactly. Preserve titles and raw spelling. Flag ambiguous name variants without deduplicating. Do not infer session-level teacher assignment or official contact details.
