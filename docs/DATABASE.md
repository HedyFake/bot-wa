# SKEMA DATABASE & PERSISTENSI (`docs/DATABASE.md`)

## 1. PostgreSQL + Prisma ORM (`prisma/schema.prisma`)
Skema database mencakup **21 model** utama:
1. **Identitas & Otorisasi**: `User`, `Role`, `Permission`, `Group`, `GroupSource`.
2. **Akademik Kelas 5A**: `Class`, `Course`, `Lecturer`, `CourseLecturer`, `Schedule`, `ScheduleException`.
3. **Tugas, Pengingat, Materi, & Dokumen**: `Assignment`, `Reminder`, `Announcement`, `Material`, `Document`.
4. **Kecerdasan Grup & Audit**: `InboxMessage`, `AiClassification`, `ReviewQueue`, `ModelUsage`, `AuditLog` (dilindungi trigger PostgreSQL append-only), `BotSetting`.

## 2. Data Seed Kelas 5A (`data/class-5a.seed.json` & `prisma/seed.ts`)
- **7 Mata Kuliah** dengan total **22 SKS unik**:
  - Metodologi Penelitian (4 SKS)
  - Keperawatan Anak Sakit dan Kronis dan Terminal (2 SKS)
  - Keperawatan Menjelang Ajal (3 SKS)
  - Konsep Keperawatan Agregat Komunitas (2 SKS)
  - Entrepreneurship 2 (4 SKS)
  - Keperawatan Gerontik (4 SKS)
  - Keperawatan Dewasa Sistem Muskuloskeletal, Integumen, Persepsisensori dan Persyarafan (3 SKS)
- **15 Sesi Kuliah Mingguan** (Senin–Jumat, Sesi 1 `08:00–09:40`, Sesi 2 `09:40–11:20`, Istirahat `11:20–12:30`, Sesi 3 `12:30–14:10`).
- **32 Asosiasi Dosen** disimpan dengan status `PERLU_VERIFIKASI` tanpa menggabungkan variasi ejaan secara sepihak.

## 3. Penyimpanan State Operasional (`data/runtime/bot-state.json`)
Agar bot juga dapat langsung berjalan lancar pada setup dasar tanpa konfigurasi manual yang rumit, `FunAndUtilityService` menyimpan tugas, reminder kustom, pengumuman draft, catatan kelas, AFK, dan statistik penggunaan command secara otomatis ke `data/runtime/bot-state.json`.
