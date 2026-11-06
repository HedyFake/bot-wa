# 10 — Jadwal Kuliah Semester 5A

> Sumber awal: jadwal yang diberikan oleh admin/user untuk blueprint ini. Status awal `USER_PROVIDED_PENDING_CONFIRMATION`; belum dianggap jadwal resmi final sampai admin mengonfirmasi dokumen akademik.

## Aturan waktu

- Timezone: `Asia/Jakarta`.
- Setiap blok: 100 menit (1 jam 40 menit).
- Istirahat: 11:20–12:30.
- Waktu kuliah: 08:00–09:40, 09:40–11:20, 12:30–14:10.
- Jangan membuat sesi baru pada waktu istirahat.
- Tahun ajaran, tanggal efektif, ruang, dan kalender libur belum diberikan.

## Senin

| Waktu | Mata kuliah | SKS mata kuliah |
|---|---|---:|
| 08:00–09:40 | Metodologi Penelitian | 4 |
| 09:40–11:20 | Keperawatan Anak Sakit dan Kronis dan Terminal | 2 |
| 12:30–14:10 | Keperawatan Menjelang Ajal | 3 |

## Selasa

| Waktu | Mata kuliah | SKS mata kuliah |
|---|---|---:|
| 08:00–09:40 | Konsep Keperawatan Agregat Komunitas | 2 |
| 09:40–11:20 | Entrepreneurship 2 | 4 |
| 12:30–14:10 | Metodologi Penelitian | 4 |

## Rabu

| Waktu | Mata kuliah | SKS mata kuliah |
|---|---|---:|
| 08:00–09:40 | Keperawatan Gerontik | 4 |
| 09:40–11:20 | Keperawatan Dewasa Sistem Muskuloskeletal, Integumen, Persepsisensori dan Persyarafan | 3 |
| 12:30–14:10 | Keperawatan Menjelang Ajal | 3 |

## Kamis

| Waktu | Mata kuliah | SKS mata kuliah |
|---|---|---:|
| 08:00–09:40 | Entrepreneurship 2 | 4 |
| 09:40–11:20 | Metodologi Penelitian | 4 |
| 12:30–14:10 | Keperawatan Gerontik | 4 |

## Jumat

| Waktu | Mata kuliah | SKS mata kuliah |
|---|---|---:|
| 08:00–09:40 | Keperawatan Gerontik | 4 |
| 09:40–11:20 | Keperawatan Dewasa Sistem Muskuloskeletal, Integumen, Persepsisensori dan Persyarafan | 3 |
| 12:30–14:10 | Entrepreneurship 2 | 4 |

## Jadwal operasional yang dibutuhkan

- `.jadwal` — jadwal hari ini.
- `.jadwal senin|selasa|rabu|kamis|jumat|sabtu|minggu`.
- `.mingguini`, `.besok`, `.kuliahberikutnya`, `.matkulhariini`, `.dosenhariini`, `.ruanganhariini`, `.cekjadwal <tanggal>`.
- Admin: `.tambahjadwal`, `.editjadwal`, `.hapusjadwal`, `.resetjadwal` dengan preview + confirmation.
- Export: `.exportjadwal`, `.jadwalpdf`, `.jadwalgambar`, `.jadwaljson`, `.jadwalcsv`.

## Schedule update rules

- Weekly recurring schedule lives in `schedule_entries`.
- One-off move/cancel lives in `schedule_exceptions`; do not overwrite base schedule silently.
- Every update has source, actor, approval, old value, new value, effective date, and audit event.
- A photo/PDF from AI OCR produces a proposal and diff; never replace schedule automatically.
- Check overlaps and break constraints.

## Important semantic note

SKS is an attribute of the course as given by the user; it is not multiplied by every repeated weekly session. Do not compute total SKS by summing repeated timetable slots.

## Prompt untuk coding agent

> Import the timetable as recurring weekdays exactly as shown. Use Asia/Jakarta. Preserve exact course titles in raw data and provide a normalized search alias where necessary. Create queries for today, tomorrow, next class, weekday, and week. Add tests for all 15 sessions, the 11:20–12:30 break, DST-safe timezone handling, and exceptions. Do not invent academic year, room, or exact lecturer per session.
