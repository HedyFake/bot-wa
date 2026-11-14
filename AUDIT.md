# Audit HdyBot — Tahap 0 · Inventaris

11 November 2026 · Asia/Jakarta · revisi Git `a641f86`. Sumber yang dipetakan adalah isi workspace saat inventaris.

## Ringkasan

| Cakupan | ✅ Teruji | ⚠️ Sebagian | ❌ Rusak | ⏳ Belum diuji | ⛔ Terhalang |
| --- | ---: | ---: | ---: | ---: | ---: |
| Daftar pengguna (8 halaman) | 0 | 0 | 0 | 187 | 0 |
| Tambahan dari menu source | 0 | 0 | 0 | 5 | 0 |
| Total baris inventaris | 0 | 0 | 0 | 192 | 0 |

Satu baris mewakili satu bentuk perintah pada menu. Beberapa baris memanggil fungsi yang sama. Inventaris memakai parser dan pembentuk menu dari source TypeScript di memori serta struktur switch dispatcher. Pencocokan ini hanya membuktikan adanya jalur kode. Kolom bukti disediakan untuk pengujian baru dan transkrip WhatsApp.

Cakupan pembacaan mencakup 220 berkas proyek, konfigurasi lokal dan referensi, 49 berkas hasil build di `dist/` serta 16.771 berkas dependensi terpasang di `node_modules/`. Berkas dibaca dari disk tanpa mengaktifkan layanan. Metadata internal `.git/` dikecualikan. Daftar nama lengkap sumber tersedia di lampiran. Berkas vendor dan hasil kompilasi dirangkum per folder. Pembacaan inventaris berbeda dari pemeriksaan logika per baris yang dijadwalkan pada Tahap 1.

## Cara menjalankan dan arsitektur

| Komponen | Lokasi | Peran dan prasyarat |
| --- | --- | --- |
| Runtime | `package.json`, `tsconfig.build.json` | Node.js ^20.19.0 || >=22.12.0 dengan modul ESM dan TypeScript. |
| Pengembangan | `src/index.ts` | `npm ci`, `npm run db:generate`, lalu `npm run dev`. Konfigurasi lokal di .env. |
| Produksi | `start.js`, `install.sh`, `ecosystem.config.cjs` | `npm run build` lalu `npm start`. Launcher mengompilasi jika dist/index.js belum ada. Di VPS, installer membentuk unit systemd menuju dist/index.js. PM2 tersedia sebagai pilihan proses. |
| Koneksi WA | `src/whatsapp/adapters/`, `src/whatsapp/outbound/gate.ts` | whatsapp-web.js 1.34.7 dengan Chrome, QR atau pairing. Adapter mock untuk tes. Baileys memakai dynamic import dan flag eksperimental. Paket Baileys tidak terdaftar pada dependensi langsung. |
| Pesan dan akses | `src/admin/commands/dispatcher.ts`, `src/admin/commands/parser.ts`, `src/admin/commands/menu.ts` | handleInbound, deduplikasi, jalur LMS, DM atau grup, autentikasi, pemetaan maksud, handler, izin outbound. Konfirmasi memakai ConfirmationManager. |
| AI | `src/ai/model-router/router.ts`, `src/ai/openai/luna.ts`, `src/ai/nvidia/registry.ts` | Konfigurasi provider HTTP OpenAI dan NVIDIA. Router memilih model berdasarkan tugas, modalitas, konfigurasi, kesehatan dan anggaran waktu. |
| Data | `prisma/schema.prisma`, `prisma/migrations/`, `data/class-5a.seed.json` | PostgreSQL melalui Prisma. Perintah operator `npm run db:deploy` dan `npm run db:seed`. Data kelas/jadwal memiliki seed. Sebagian state kelas, antrean tugas dan game memakai penyimpanan FunAndUtilityService. |
| Worker | `src/index.ts`, `src/modules/reminders/worker.ts`, `src/modules/academic/deadline-notices.ts` | Tick 15 detik untuk refresh jadwal. Saat WA terhubung, outbound aktif dan dry-run mati, memanggil worker pengingat, antrean tenggat dan tick LMS. |
| Drive dan LMS | `src/modules/materials/drive.ts`, `src/modules/lms/` | Drive memakai service account, folder dan daftar chat berizin. Poll katalog 15 menit. LMS memakai portal SHJ, sesi per akun dan kunci enkripsi. Interval sinkronisasi mahasiswa diatur LMS_SYNC_MINUTES. |
| Media dan sumber luar | `src/modules/media/`, `src/modules/academic/perawat.ts`, `src/modules/fun/fun-utility-service.ts` | SoundCloud dan MP3 lokal, Perawat.org, Open-Meteo, Wikipedia/Wikimedia, Europe PMC/Crossref, Aladhan. Sharp, pdf-lib, QR, Tesseract dan espeak-ng sesuai perintah. |
| Operasi dan tes | `install.sh`, `scripts/`, `tests/` | Backup PostgreSQL terenkripsi dengan timer systemd 02.30 WIB, pemulihan dari skrip terpisah, log via Pino/journald. Compose mendefinisikan PostgreSQL 17 dan Redis 7. Vitest, tes integrasi dan skrip database uji tersedia. |

Model Prisma yang didefinisikan (25): `LmsAccount`, `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `Class`, `Group`, `GroupSource`, `Course`, `Lecturer`, `CourseLecturer`, `Schedule`, `ScheduleException`, `Assignment`, `Reminder`, `Announcement`, `Material`, `InboxMessage`, `AiClassification`, `ReviewQueue`, `Document`, `ModelUsage`, `AuditLog`, `BotSetting`.

Dependensi langsung menurut lockfile (439 entri paket selain root).

| Lingkup | Paket dan versi yang dikunci |
| --- | --- |
| dependencies | `@prisma/client@6.19.3`, `cfb@1.2.2`, `cheerio@1.0.0`, `dotenv@16.6.1`, `google-auth-library@11.3.3`, `pdf-lib@1.17.1`, `pino@9.14.0`, `qrcode@1.5.4`, `qrcode-terminal@0.12.0`, `sharp@0.35.5`, `whatsapp-web.js@1.34.7`, `zod@4.6.7` |
| devDependencies | `@types/node@22.20.5`, `@types/qrcode@1.5.6`, `prisma@6.19.3`, `tsx@4.23.15`, `typescript@5.9.3`, `vitest@4.1.12` |

## Pencocokan menu dan handler

Menu dibandingkan dengan hak admin, akses materi Drive dan penulisan jadwal aktif. Akun yang memiliki izin lebih sedikit dapat melihat lebih sedikit halaman. Penomoran di bawah mengikuti daftar lengkap pengguna.

- 187 dari 187 bentuk perintah pengguna ditemukan pada halaman yang sesuai.
- 147 ID perintah kanonis selain `unknown` memiliki cabang dispatcher atau jalur masuk khusus dan diwakili di menu penuh. Perintah pengguna tanpa handler: 0. ID handler kanonis tanpa entri menu penuh: 0.
- Tambahan pada menu penuh: `.download <id>`, `.tanyadokumen <id> <pertanyaan>`, `.ringkasdokumen <id>`, `.drive files`, `.game ai <topik>`.
- Satu handler sering menerima bentuk lain yang tidak ditampilkan sebagai baris tersendiri, misalnya `.game keluar`, `.tugas hapus`, `.lms <nama> hubungkan` dan `.relay kirim`. Daftar alias di bawah mengelompokkan ejaan berdasarkan tujuan parser.
- Semua tabel memakai tanggal inventaris. Tanda pisah pada bukti berarti belum ada eksekusi yang dinilai pada audit ini.

[1. 📚 Informasi kelas](#menu-1) · [2. 🕒 Jadwal dan tugas](#menu-2) · [3. 🧠 Belajar dan materi](#menu-3) · [4. 🎮 Permainan](#menu-4) · [5. 🎨 Media](#menu-5) · [6. 🛠️ Utilitas](#menu-6) · [7. 🔐 Administrasi](#menu-7) · [8. 🎓 LMS STIKES Husada Jombang](#menu-8)

<a id="menu-1"></a>

### 1. 📚 Informasi kelas

| Perintah | Status | Bukti uji | Handler | Dependensi | Hak akses | Bug & perbaikan | Tanggal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `.kelas` | ⏳ | — | `class.info` → [executeCommand L811](src/admin/commands/dispatcher.ts#L811) | fun.getClassOfficers, fun.getClassMembers, fun.getLecturerContacts, schedule.listCourses, schedule.totalCourseCreditsSks | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.anggota [nama]` | ⏳ | — | `class.members` → [executeCommand L830](src/admin/commands/dispatcher.ts#L830) | fun.formatClassMembers | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.pengurus` | ⏳ | — | `class.officers` → [executeCommand L826](src/admin/commands/dispatcher.ts#L826) | fun.formatClassOfficers | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.rules` | ⏳ | — | `class.rules` → [executeCommand L834](src/admin/commands/dispatcher.ts#L834) | Teks aturan kelas dalam dispatcher | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.faq` | ⏳ | — | `class.faq` → [executeCommand L843](src/admin/commands/dispatcher.ts#L843) | Teks FAQ kelas dalam dispatcher | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.matkul` | ⏳ | — | `courses` → [executeCommand L1107](src/admin/commands/dispatcher.ts#L1107) | schedule.listCourses, schedule.getForWeekday, schedule.listLecturers, schedule.getClassInfo, schedule.totalCourseCreditsSks | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.dosen [nama]` | ⏳ | — | `lecturers` → [executeCommand L1119](src/admin/commands/dispatcher.ts#L1119) | fun.formatLecturerContacts, schedule.listLecturers | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.kalender` | ⏳ | — | `calendar` → [executeCommand L1519](src/admin/commands/dispatcher.ts#L1519) | AcademicCalendarService | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |

<a id="menu-2"></a>

### 2. 🕒 Jadwal dan tugas

| Perintah | Status | Bukti uji | Handler | Dependensi | Hak akses | Bug & perbaikan | Tanggal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `.jadwal [hari]` | ⏳ | — | `schedule` → [executeCommand L1051](src/admin/commands/dispatcher.ts#L1051) | schedule.getToday, schedule.formatDayText | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.besok` | ⏳ | — | `schedule.tomorrow` → [executeCommand L1069](src/admin/commands/dispatcher.ts#L1069) | schedule.getTomorrow, schedule.formatDayText | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.mingguini` | ⏳ | — | `schedule.week` → [executeCommand L1082](src/admin/commands/dispatcher.ts#L1082) | schedule.getWeek, schedule.formatDayText | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.kuliahberikutnya` | ⏳ | — | `schedule.next` → [executeCommand L1086](src/admin/commands/dispatcher.ts#L1086) | schedule.getNextSession, schedule.formatDayText | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.cekjadwal <tanggal>` | ⏳ | — | `schedule.check_date` → [executeCommand L1056](src/admin/commands/dispatcher.ts#L1056) | schedule.getToday, schedule.formatDayText | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.tugas` | ⏳ | — | `tasks` → [executeCommand L1134](src/admin/commands/dispatcher.ts#L1134) | FunAndUtilityService · tugas dan filter visibilitas | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.tugas hariini` | ⏳ | — | `tasks` → [executeCommand L1134](src/admin/commands/dispatcher.ts#L1134) | FunAndUtilityService · tugas dan filter visibilitas | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.tambahtugas matkul\|judul\|deadline\|catatan\|dosen\|PJ` | ⏳ | — | `tasks` → [executeCommand L1134](src/admin/commands/dispatcher.ts#L1134) | FunAndUtilityService · tugas dan filter visibilitas | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.selesaitugas <id>` | ⏳ | — | `tasks` → [executeCommand L1134](src/admin/commands/dispatcher.ts#L1134) | FunAndUtilityService · tugas dan filter visibilitas | Tugas bersumber chat: pembuat di chat asal atau DM owner | Menunggu Tahap 1 | 11-11-2026 |
| `.reminder` | ⏳ | — | `reminders` → [executeCommand L1197](src/admin/commands/dispatcher.ts#L1197) | parseDeadline, fun.hasTaskSource, fun.addAssignment, worker.command, fun.addReminder | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.note list` | ⏳ | — | `notes` → [executeCommand L1276](src/admin/commands/dispatcher.ts#L1276) | fun.addNote, fun.deleteNote, fun.listNotes | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.jadwal senin` | ⏳ | — | `schedule.day` → [executeCommand L1074](src/admin/commands/dispatcher.ts#L1074) | schedule.getUpcomingDay, schedule.formatDayText | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.jadwal export csv` | ⏳ | — | `schedule.export` → [executeCommand L1093](src/admin/commands/dispatcher.ts#L1093) | schedule.getForWeekday | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.matkulhariini` | ⏳ | — | `schedule.today_courses` → [executeCommand L1064](src/admin/commands/dispatcher.ts#L1064) | schedule.getToday, schedule.formatDayText | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.dosenhariini` | ⏳ | — | `schedule.today_lecturers` → [executeCommand L1065](src/admin/commands/dispatcher.ts#L1065) | schedule.getToday, schedule.formatDayText | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.ruanganhariini` | ⏳ | — | `schedule.today_rooms` → [executeCommand L1063](src/admin/commands/dispatcher.ts#L1063) | schedule.getToday, schedule.formatDayText | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |

<a id="menu-3"></a>

### 3. 🧠 Belajar dan materi

| Perintah | Status | Bukti uji | Handler | Dependensi | Hak akses | Bug & perbaikan | Tanggal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `.ask <pertanyaan>` | ⏳ | — | `ask` → [executeCommand L1453](src/admin/commands/dispatcher.ts#L1453) | lms.privateAsk, lms.handle, drive.matchMaterial, parseCommand, router.invoke | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.rapikan <teks>` | ⏳ | — | `rewrite` → [executeCommand L977](src/admin/commands/dispatcher.ts#L977) | router.invoke | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.summarize <teks>` | ⏳ | — | `ai.summarize` → [executeCommand L988](src/admin/commands/dispatcher.ts#L988) | router.invoke | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.jurnal <topik>` | ⏳ | — | `journal.search` → [executeCommand L1353](src/admin/commands/dispatcher.ts#L1353) | Europe PMC, Crossref, router AI dan PDF sesuai opsi | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.materi` | ⏳ | — | `materials` → [executeCommand L1309](src/admin/commands/dispatcher.ts#L1309) | Katalog materi, Drive bila tersedia | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.keperawatan` | ⏳ | — | `nursing` → [executeCommand L951](src/admin/commands/dispatcher.ts#L951) | perawatAnswer · menu lokal, Perawat.org atau router sesuai kategori | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.sdki <diagnosis>` | ⏳ | — | `nursing` → [executeCommand L951](src/admin/commands/dispatcher.ts#L951) | perawatAnswer · menu lokal, Perawat.org atau router sesuai kategori | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.sop <prosedur>` | ⏳ | — | `nursing` → [executeCommand L951](src/admin/commands/dispatcher.ts#L951) | perawatAnswer · menu lokal, Perawat.org atau router sesuai kategori | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.carimateri <kata>` | ⏳ | — | `materials.search` → [executeCommand L1310](src/admin/commands/dispatcher.ts#L1310) | Katalog atau pencarian materi | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.askep <topik>` | ⏳ | — | `nursing` → [executeCommand L951](src/admin/commands/dispatcher.ts#L951) | perawatAnswer · menu lokal, Perawat.org atau router sesuai kategori | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.pengkajian <topik>` | ⏳ | — | `nursing` → [executeCommand L951](src/admin/commands/dispatcher.ts#L951) | perawatAnswer · menu lokal, Perawat.org atau router sesuai kategori | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.penunjang` | ⏳ | — | `nursing` → [executeCommand L951](src/admin/commands/dispatcher.ts#L951) | perawatAnswer · menu lokal, Perawat.org atau router sesuai kategori | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.ukom` | ⏳ | — | `nursing` → [executeCommand L951](src/admin/commands/dispatcher.ts#L951) | perawatAnswer · menu lokal, Perawat.org atau router sesuai kategori | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.kampus` | ⏳ | — | `nursing` → [executeCommand L951](src/admin/commands/dispatcher.ts#L951) | perawatAnswer · menu lokal, Perawat.org atau router sesuai kategori | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.kuisukom` | ⏳ | — | `nursing` → [executeCommand L951](src/admin/commands/dispatcher.ts#L951) | perawatAnswer · kuis latihan | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.highalert` | ⏳ | — | `nursing` → [executeCommand L951](src/admin/commands/dispatcher.ts#L951) | perawatAnswer · menu lokal, Perawat.org atau router sesuai kategori | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.safety` | ⏳ | — | `nursing` → [executeCommand L951](src/admin/commands/dispatcher.ts#L951) | perawatAnswer · menu lokal, Perawat.org atau router sesuai kategori | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.berita` | ⏳ | — | `nursing` → [executeCommand L951](src/admin/commands/dispatcher.ts#L951) | perawatAnswer · menu lokal, Perawat.org atau router sesuai kategori | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.ppni` | ⏳ | — | `nursing` → [executeCommand L951](src/admin/commands/dispatcher.ts#L951) | perawatAnswer · menu lokal, Perawat.org atau router sesuai kategori | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.mtb` | ⏳ | — | `nursing` → [executeCommand L951](src/admin/commands/dispatcher.ts#L951) | perawatAnswer · menu lokal, Perawat.org atau router sesuai kategori | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.ebook` | ⏳ | — | `nursing` → [executeCommand L951](src/admin/commands/dispatcher.ts#L951) | perawatAnswer · menu lokal, Perawat.org atau router sesuai kategori | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.imt <kg> <cm>` | ⏳ | — | `nursing` → [executeCommand L951](src/admin/commands/dispatcher.ts#L951) | perawatAnswer → nursingCalculation (lokal) | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.gcs E4 V5 M6` | ⏳ | — | `nursing` → [executeCommand L951](src/admin/commands/dispatcher.ts#L951) | perawatAnswer → nursingCalculation (lokal) | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.balance <masuk> <keluar>` | ⏳ | — | `nursing` → [executeCommand L951](src/admin/commands/dispatcher.ts#L951) | perawatAnswer → nursingCalculation (lokal) | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.tetesan 500 ml 6 jam 20 tetes/ml` | ⏳ | — | `nursing` → [executeCommand L951](src/admin/commands/dispatcher.ts#L951) | perawatAnswer → nursingCalculation (lokal) | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.flashcard` | ⏳ | — | `ai.flashcard` → [executeCommand L1011](src/admin/commands/dispatcher.ts#L1011) | router.invoke | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.quiz` | ⏳ | — | `ai.quiz` → [executeCommand L1012](src/admin/commands/dispatcher.ts#L1012) | router.invoke | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.translate` | ⏳ | — | `ai.translate` → [executeCommand L1026](src/admin/commands/dispatcher.ts#L1026) | router.invoke | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.download <id>` (tambahan) | ⏳ | — | `download` → [executeCommand L1307](src/admin/commands/dispatcher.ts#L1307) | drive.download, extractSections, router.invoke, drive.search | Chat di allowlist Drive | Menunggu Tahap 1 | 11-11-2026 |
| `.tanyadokumen <id> <pertanyaan>` (tambahan) | ⏳ | — | `document.ask` → [executeCommand L1305](src/admin/commands/dispatcher.ts#L1305) | drive.download, extractSections, router.invoke, drive.search | Chat di allowlist Drive | Menunggu Tahap 1 | 11-11-2026 |
| `.ringkasdokumen <id>` (tambahan) | ⏳ | — | `document.summary` → [executeCommand L1306](src/admin/commands/dispatcher.ts#L1306) | drive.download, extractSections, router.invoke, drive.search | Chat di allowlist Drive | Menunggu Tahap 1 | 11-11-2026 |
| `.drive files` (tambahan) | ⏳ | — | `drive.files` → [executeCommand L1308](src/admin/commands/dispatcher.ts#L1308) | drive.download, extractSections, router.invoke, drive.search | Chat di allowlist Drive | Menunggu Tahap 1 | 11-11-2026 |

<a id="menu-4"></a>

### 4. 🎮 Permainan

| Perintah | Status | Bukti uji | Handler | Dependensi | Hak akses | Bug & perbaikan | Tanggal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `.game` | ⏳ | — | `game` → [executeCommand L955](src/admin/commands/dispatcher.ts#L955) | FunAndUtilityService · ruang, bank soal atau riwayat | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.tebakkata` | ⏳ | — | `fun.quiz_start` → [executeCommand L1924](src/admin/commands/dispatcher.ts#L1924) | fun.startQuiz | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.caklontong` | ⏳ | — | `fun.quiz_start` → [executeCommand L1924](src/admin/commands/dispatcher.ts#L1924) | fun.startQuiz | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.family100` | ⏳ | — | `fun.quiz_start` → [executeCommand L1924](src/admin/commands/dispatcher.ts#L1924) | fun.startQuiz | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.mathquiz` | ⏳ | — | `fun.quiz_start` → [executeCommand L1924](src/admin/commands/dispatcher.ts#L1924) | fun.startQuiz | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.jawab <teks>` | ⏳ | — | `fun.quiz_answer` → [executeCommand L1929](src/admin/commands/dispatcher.ts#L1929) | fun.answerQuiz | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.nyerah` | ⏳ | — | `fun.quiz_giveup` → [executeCommand L1936](src/admin/commands/dispatcher.ts#L1936) | fun.giveUpQuiz | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.hint` | ⏳ | — | `game.hint` → [executeCommand L952](src/admin/commands/dispatcher.ts#L952) | fun.gameHint | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.score` | ⏳ | — | `game.score` → [executeCommand L954](src/admin/commands/dispatcher.ts#L954) | fun.getScores | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.dailychallenge` | ⏳ | — | `game.daily` → [executeCommand L953](src/admin/commands/dispatcher.ts#L953) | fun.startBankQuiz | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.game buat [jumlah\|duel]` | ⏳ | — | `game` → [executeCommand L955](src/admin/commands/dispatcher.ts#L955) | FunAndUtilityService · ruang, bank soal atau riwayat | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.game gabung` | ⏳ | — | `game` → [executeCommand L955](src/admin/commands/dispatcher.ts#L955) | FunAndUtilityService · ruang, bank soal atau riwayat | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.game mulai [kategori]` | ⏳ | — | `game` → [executeCommand L955](src/admin/commands/dispatcher.ts#L955) | FunAndUtilityService · ruang, bank soal atau riwayat | Peserta, sesuai peran host/admin jika ada ruang | Menunggu Tahap 1 | 11-11-2026 |
| `.game riwayat` | ⏳ | — | `game` → [executeCommand L955](src/admin/commands/dispatcher.ts#L955) | FunAndUtilityService · ruang, bank soal atau riwayat | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.suit <pilihan>` | ⏳ | — | `fun.suit` → [executeCommand L1915](src/admin/commands/dispatcher.ts#L1915) | fun.playSuit | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.leaderboard` | ⏳ | — | `gamification.leaderboard` → [executeCommand L1978](src/admin/commands/dispatcher.ts#L1978) | Gamifikasi · data skor dan opt-in | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.privacy gamification on` | ⏳ | — | `gamification.privacy` → [executeCommand L1967](src/admin/commands/dispatcher.ts#L1967) | Gamifikasi · preferensi pengirim | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.faktaunik` | ⏳ | — | `fun.fact` → [executeCommand L1893](src/admin/commands/dispatcher.ts#L1893) | fun.randomFact | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.doaharian` | ⏳ | — | `fun.doa` → [executeCommand L1894](src/admin/commands/dispatcher.ts#L1894) | fun.randomDoa | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.listsurah` | ⏳ | — | `fun.surah` → [executeCommand L1897](src/admin/commands/dispatcher.ts#L1897) | fun.listSurah | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.jadwalsholat` | ⏳ | — | `fun.sholat` → [executeCommand L1900](src/admin/commands/dispatcher.ts#L1900) | Aladhan · kota dan tanggal | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.truth` | ⏳ | — | `fun.truth` → [executeCommand L1903](src/admin/commands/dispatcher.ts#L1903) | fun.truthOrDare | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.dare` | ⏳ | — | `fun.dare` → [executeCommand L1906](src/admin/commands/dispatcher.ts#L1906) | fun.truthOrDare | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.koin` | ⏳ | — | `fun.coin` → [executeCommand L1912](src/admin/commands/dispatcher.ts#L1912) | fun.flipCoin | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.afk` | ⏳ | — | `fun.afk` → [executeCommand L1946](src/admin/commands/dispatcher.ts#L1946) | fun.setAfk | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.unafk` | ⏳ | — | `fun.unafk` → [executeCommand L1951](src/admin/commands/dispatcher.ts#L1951) | fun.clearAfk | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.game ai <topik>` (tambahan) | ⏳ | — | `game` → [executeCommand L955](src/admin/commands/dispatcher.ts#L955) | FunAndUtilityService.startAiQuiz + ModelRouter | Peserta, sesuai peran host/admin jika ada ruang | Menunggu Tahap 1 | 11-11-2026 |

<a id="menu-5"></a>

### 5. 🎨 Media

| Perintah | Status | Bukti uji | Handler | Dependensi | Hak akses | Bug & perbaikan | Tanggal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `.sticker` | ⏳ | — | `media.sticker` → [executeCommand L1593](src/admin/commands/dispatcher.ts#L1593) | media.textToSticker, media.imageToSticker | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.ttp <teks>` | ⏳ | — | `media.ttp` → [executeCommand L1612](src/admin/commands/dispatcher.ts#L1612) | media.textToSticker | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.toimg` | ⏳ | — | `media.toimg` → [executeCommand L1621](src/admin/commands/dispatcher.ts#L1621) | media.stickerToPng | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.qr <teks>` | ⏳ | — | `media.qr` → [executeCommand L1779](src/admin/commands/dispatcher.ts#L1779) | media.generateQrCodePng | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.doc pdf <judul>\|<isi>` | ⏳ | — | `doc.pdf` → [executeCommand L1569](src/admin/commands/dispatcher.ts#L1569) | media.generatePdfDocument | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.kartujadwal [hari]` | ⏳ | — | `media.schedulecard` → [executeCommand L1670](src/admin/commands/dispatcher.ts#L1670) | media.generateQuoteCard, schedule.getForWeekday, schedule.getToday, media.generateScheduleCard | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.blur` | ⏳ | — | `media.effect` → [executeCommand L1633](src/admin/commands/dispatcher.ts#L1633) | media.applyImageEffect | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.resize <lebar> <tinggi>` | ⏳ | — | `media.effect` → [executeCommand L1633](src/admin/commands/dispatcher.ts#L1633) | media.applyImageEffect | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.suratizin` | ⏳ | — | `doc.permission` → [executeCommand L1539](src/admin/commands/dispatcher.ts#L1539) | Logika lokal pada cabang tertaut | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.notulensi` | ⏳ | — | `doc.minutes` → [executeCommand L1554](src/admin/commands/dispatcher.ts#L1554) | Logika lokal pada cabang tertaut | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.quotemaker` | ⏳ | — | `media.quotemaker` → [executeCommand L1654](src/admin/commands/dispatcher.ts#L1654) | media.generateQuoteCard | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.gambar` | ⏳ | — | `media.imagesearch` → [executeCommand L1695](src/admin/commands/dispatcher.ts#L1695) | fun.searchWebImage, media.normalizeSearchImage, router.invoke, media.generateVisualSearchCard | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.ocr` | ⏳ | — | `media.ocr` → [executeCommand L1794](src/admin/commands/dispatcher.ts#L1794) | extractSections · Tesseract | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.tts` | ⏳ | — | `media.tts` → [executeCommand L1808](src/admin/commands/dispatcher.ts#L1808) | MediaService · espeak-ng | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |

<a id="menu-6"></a>

### 6. 🛠️ Utilitas

| Perintah | Status | Bukti uji | Handler | Dependensi | Hak akses | Bug & perbaikan | Tanggal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `.jam` | ⏳ | — | `util.clock` → [executeCommand L1862](src/admin/commands/dispatcher.ts#L1862) | fun.formatWorldClock | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.calc <rumus>` | ⏳ | — | `util.calc` → [executeCommand L1845](src/admin/commands/dispatcher.ts#L1845) | fun.evaluateMath | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.convert <nilai> <dari> <ke>` | ⏳ | — | `util.convert` → [executeCommand L1852](src/admin/commands/dispatcher.ts#L1852) | fun.convertUnit | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.bmi <kg> <cm>` | ⏳ | — | `util.bmi` → [executeCommand L1819](src/admin/commands/dispatcher.ts#L1819) | UtilityService.calculateBmi | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.ipk` | ⏳ | — | `util.gpa` → [executeCommand L1827](src/admin/commands/dispatcher.ts#L1827) | UtilityService · validasi SKS dan bobot | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.pantun [tema]` | ⏳ | — | `fun.pantun` → [executeCommand L1878](src/admin/commands/dispatcher.ts#L1878) | router.invoke, fun.randomPantun, fun.randomQuote | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.music <judul>` | ⏳ | — | `music` → [executeCommand L950](src/admin/commands/dispatcher.ts#L950) | MusicService.search · SoundCloud, direktori MP3 berizin | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.cerita <tema>` | ⏳ | — | `fun.create` → [executeCommand L1879](src/admin/commands/dispatcher.ts#L1879) | router.invoke, fun.randomPantun, fun.randomQuote | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.motivasi` | ⏳ | — | `fun.create` → [executeCommand L1879](src/admin/commands/dispatcher.ts#L1879) | router.invoke, fun.randomPantun, fun.randomQuote | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.dadu` | ⏳ | — | `fun.dice` → [executeCommand L1909](src/admin/commands/dispatcher.ts#L1909) | fun.rollDice | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.quotes [tema]` | ⏳ | — | `fun.quote` → [executeCommand L1877](src/admin/commands/dispatcher.ts#L1877) | router.invoke, fun.randomPantun, fun.randomQuote | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.apakah <pertanyaan>` | ⏳ | — | `fun.shell` → [executeCommand L1918](src/admin/commands/dispatcher.ts#L1918) | fun.magicShell | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.hilih <teks>` | ⏳ | — | `fun.text` → [executeCommand L1939](src/admin/commands/dispatcher.ts#L1939) | fun.transformText | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.owner` | ⏳ | — | `owner` → [executeCommand L795](src/admin/commands/dispatcher.ts#L795) | Identitas owner dari konfigurasi | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.groupid` | ⏳ | — | `groupid` → [executeCommand L772](src/admin/commands/dispatcher.ts#L772) | JID chat masuk | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.about` | ⏳ | — | `about` → [executeCommand L784](src/admin/commands/dispatcher.ts#L784) | Identitas aplikasi | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.info` | ⏳ | — | `info` → [executeCommand L785](src/admin/commands/dispatcher.ts#L785) | Informasi aplikasi dan konfigurasi | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.help` | ⏳ | — | `help` → [executeCommand L806](src/admin/commands/dispatcher.ts#L806) | menuPage, auth.evaluate | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.menu` | ⏳ | — | `menu` → [executeCommand L807](src/admin/commands/dispatcher.ts#L807) | menuPage, auth.evaluate | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.profile` | ⏳ | — | `user.profile` → [executeCommand L852](src/admin/commands/dispatcher.ts#L852) | auth.evaluate | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.announce` | ⏳ | — | `announce` → [executeCommand L1249](src/admin/commands/dispatcher.ts#L1249) | fun.createAnnouncementDraft, fun.listAnnouncements | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.kelompok` | ⏳ | — | `groupgen` → [executeCommand L1493](src/admin/commands/dispatcher.ts#L1493) | fun.getClassMembers | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.countdown` | ⏳ | — | `countdown` → [executeCommand L1530](src/admin/commands/dispatcher.ts#L1530) | AcademicCalendarService.countdownDays | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.cuaca` | ⏳ | — | `util.weather` → [executeCommand L1865](src/admin/commands/dispatcher.ts#L1865) | Open-Meteo (geocoding dan prakiraan) | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.wiki` | ⏳ | — | `util.wiki` → [executeCommand L1868](src/admin/commands/dispatcher.ts#L1868) | Wikipedia bahasa Indonesia | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.urlcheck` | ⏳ | — | `util.urlcheck` → [executeCommand L1871](src/admin/commands/dispatcher.ts#L1871) | fun.checkUrlSafety | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.stats` | ⏳ | — | `analytics.stats` → [executeCommand L1957](src/admin/commands/dispatcher.ts#L1957) | fun.formatStats | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |
| `.cekpesan` | ⏳ | — | `group.classify` → [executeCommand L2150](src/admin/commands/dispatcher.ts#L2150) | intelligence.evaluateMessage, formatStructuredTableAnnouncement | Pengguna · DM/grup | Menunggu Tahap 1 | 11-11-2026 |

<a id="menu-7"></a>

### 7. 🔐 Administrasi

| Perintah | Status | Bukti uji | Handler | Dependensi | Hak akses | Bug & perbaikan | Tanggal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `.health` | ⏳ | — | `health` → [executeCommand L863](src/admin/commands/dispatcher.ts#L863) | runHealth, router.status, whatsapp.state, drive?.status, worker.status | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.status` | ⏳ | — | `status` → [executeCommand L862](src/admin/commands/dispatcher.ts#L862) | runHealth, router.status, whatsapp.state, drive?.status, worker.status | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.dashboard` | ⏳ | — | `dashboard` → [executeCommand L879](src/admin/commands/dispatcher.ts#L879) | runHealth, router.status, intelligence.stats, schedule.getNextSession, whatsapp.state | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.runtime` | ⏳ | — | `runtime` → [executeCommand L777](src/admin/commands/dispatcher.ts#L777) | startedAt.getTime | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.ping` | ⏳ | — | `ping` → [executeCommand L769](src/admin/commands/dispatcher.ts#L769) | Waktu proses lokal | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.ai status` | ⏳ | — | `ai.status` → [executeCommand L902](src/admin/commands/dispatcher.ts#L902) | router.status | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.groups` | ⏳ | — | `groups` → [executeCommand L1988](src/admin/commands/dispatcher.ts#L1988) | intelligence.listSources, outbound.listAllowedGroups | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.backup` | ⏳ | — | `backup` → [executeCommand L2329](src/admin/commands/dispatcher.ts#L2329) | backupStatus · direktori backup | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.audit` | ⏳ | — | `audit` → [executeCommand L2332](src/admin/commands/dispatcher.ts#L2332) | Buffer audit dispatcher | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.logs [jumlah]` | ⏳ | — | `logs` → [executeCommand L2330](src/admin/commands/dispatcher.ts#L2330) | Monitor.report | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.errors [today]` | ⏳ | — | `errors` → [executeCommand L2331](src/admin/commands/dispatcher.ts#L2331) | Monitor.report | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.relay list` | ⏳ | — | `relay` → [executeCommand L2228](src/admin/commands/dispatcher.ts#L2228) | decideRelay · antrean privat dan OutboundGate | DM owner | Menunggu Tahap 1 | 11-11-2026 |
| `.tugas antrean` | ⏳ | — | `tasks` → [executeCommand L1134](src/admin/commands/dispatcher.ts#L1134) | manageTaskNotice · antrean dan persetujuan | DM owner | Menunggu Tahap 1 | 11-11-2026 |
| `.tugas grup` | ⏳ | — | `tasks` → [executeCommand L1134](src/admin/commands/dispatcher.ts#L1134) | manageTaskNotice · antrean dan persetujuan | DM owner | Menunggu Tahap 1 | 11-11-2026 |
| `.tugas tujuan <id> <grup>` | ⏳ | — | `tasks` → [executeCommand L1134](src/admin/commands/dispatcher.ts#L1134) | manageTaskNotice · antrean dan persetujuan | DM owner | Menunggu Tahap 1 | 11-11-2026 |
| `.tugas tolak <id>` | ⏳ | — | `tasks` → [executeCommand L1134](src/admin/commands/dispatcher.ts#L1134) | manageTaskNotice · antrean dan persetujuan | DM owner | Menunggu Tahap 1 | 11-11-2026 |
| `.tugas deadline <id> <tanggal>` | ⏳ | — | `tasks` → [executeCommand L1134](src/admin/commands/dispatcher.ts#L1134) | manageTaskNotice · antrean dan persetujuan | DM owner | Menunggu Tahap 1 | 11-11-2026 |
| `.db status` | ⏳ | — | `db.status` → [executeCommand L1188](src/admin/commands/dispatcher.ts#L1188) | dbProbe | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.drive status` | ⏳ | — | `drive.status` → [executeCommand L1299](src/admin/commands/dispatcher.ts#L1299) | drive?.status | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.drive sync` | ⏳ | — | `drive.sync` → [executeCommand L1301](src/admin/commands/dispatcher.ts#L1301) | drive.sync, drive.status | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.whatsapp status` | ⏳ | — | `whatsapp.status` → [executeCommand L1187](src/admin/commands/dispatcher.ts#L1187) | whatsapp.state | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.scheduler status` | ⏳ | — | `scheduler.status` → [executeCommand L1186](src/admin/commands/dispatcher.ts#L1186) | ReminderWorker, status scheduler dan antrean | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.storage` | ⏳ | — | `storage` → [executeCommand L1193](src/admin/commands/dispatcher.ts#L1193) | resources | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.queue` | ⏳ | — | `scheduler.status` → [executeCommand L1186](src/admin/commands/dispatcher.ts#L1186) | ReminderWorker, status scheduler dan antrean | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.ai models` | ⏳ | — | `ai.models` → [executeCommand L903](src/admin/commands/dispatcher.ts#L903) | router.status | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.ai model <alias>` | ⏳ | — | `ai.model` → [executeCommand L914](src/admin/commands/dispatcher.ts#L914) | router.setMode, router.status | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.ai auto on` | ⏳ | — | `ai.auto` → [executeCommand L926](src/admin/commands/dispatcher.ts#L926) | router.setMode, router.status | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.ai test <pesan>` | ⏳ | — | `ai.test` → [executeCommand L933](src/admin/commands/dispatcher.ts#L933) | router.invoke | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.groups sources` | ⏳ | — | `groups.sources` → [executeCommand L1989](src/admin/commands/dispatcher.ts#L1989) | intelligence.listSources, outbound.listAllowedGroups | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.groups add <JID> <nama>` | ⏳ | — | `groups.add` → [executeCommand L2013](src/admin/commands/dispatcher.ts#L2013) | fun.rememberGroup, fun.setTaskSource, intelligence.isPjmkGroup, intelligence.registerSourceGroup, outbound.registerAllowedGroup | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.groups pause <JID>` | ⏳ | — | `groups.pause` → [executeCommand L2025](src/admin/commands/dispatcher.ts#L2025) | intelligence.pauseSourceGroup, outbound.pauseGroup, fun.setGroupPaused | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.groups resume <JID>` | ⏳ | — | `groups.resume` → [executeCommand L2034](src/admin/commands/dispatcher.ts#L2034) | intelligence.resumeSourceGroup, outbound.resumeGroup, fun.setGroupPaused | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.nimbrung status` | ⏳ | — | `group.nimbrung` → [executeCommand L2043](src/admin/commands/dispatcher.ts#L2043) | GroupIntelligenceService, pengaturan grup, OutboundGate | Owner atau admin grup | Menunggu Tahap 1 | 11-11-2026 |
| `.filter status` | ⏳ | — | `filter.status` → [executeCommand L2190](src/admin/commands/dispatcher.ts#L2190) | intelligence.stats | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.filter review` | ⏳ | — | `filter.review` → [executeCommand L2212](src/admin/commands/dispatcher.ts#L2212) | intelligence.listPendingReviews | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.digest today` | ⏳ | — | `digest` → [executeCommand L2191](src/admin/commands/dispatcher.ts#L2191) | intelligence.stats | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.broadcast preview <ID>` | ⏳ | — | `broadcast.preview` → [executeCommand L2206](src/admin/commands/dispatcher.ts#L2206) | intelligence.getReviewItem | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.broadcast send <ID>` | ⏳ | — | `broadcast.send` → [executeCommand L2252](src/admin/commands/dispatcher.ts#L2252) | auth.evaluate, intelligence.getReviewItem, intelligence.isPjmkGroup, confirmations.issue | DM owner + nonce | Menunggu Tahap 1 | 11-11-2026 |
| `.reminder pause` | ⏳ | — | `reminders.pause` → [executeCommand L1182](src/admin/commands/dispatcher.ts#L1182) | worker.pause, worker.status | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.reminder resume` | ⏳ | — | `reminders.pause` → [executeCommand L1182](src/admin/commands/dispatcher.ts#L1182) | worker.pause, worker.status | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.admin pause` | ⏳ | — | `emergency.stop` → [executeCommand L2319](src/admin/commands/dispatcher.ts#L2319) | outbound.triggerEmergencyStop | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.admin resume` | ⏳ | — | `emergency.resume` → [executeCommand L2324](src/admin/commands/dispatcher.ts#L2324) | outbound.clearEmergencyStop | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.login` | ⏳ | — | `auth.login` → [handleInbound L640](src/admin/commands/dispatcher.ts#L640) | AdminAuthenticator.verifyAdminPassword | DM admin · identitas dan sesi | Menunggu Tahap 1 | 11-11-2026 |
| `.logout` | ⏳ | — | `auth.logout` → [handleInbound L657](src/admin/commands/dispatcher.ts#L657) | AdminAuthenticator.lockAdminSession | DM admin · identitas dan sesi | Menunggu Tahap 1 | 11-11-2026 |
| `.system` | ⏳ | — | `system` → [executeCommand L864](src/admin/commands/dispatcher.ts#L864) | runHealth, router.status, whatsapp.state, drive?.status, worker.status | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.priority` | ⏳ | — | `priority` → [executeCommand L2202](src/admin/commands/dispatcher.ts#L2202) | intelligence.listPendingReviews | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.pending` | ⏳ | — | `pending` → [executeCommand L2211](src/admin/commands/dispatcher.ts#L2211) | intelligence.listPendingReviews | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.approve` | ⏳ | — | `approve` → [executeCommand L2229](src/admin/commands/dispatcher.ts#L2229) | auth.evaluate, intelligence.approve | DM owner | Menunggu Tahap 1 | 11-11-2026 |
| `.reject` | ⏳ | — | `reject` → [executeCommand L2242](src/admin/commands/dispatcher.ts#L2242) | intelligence.reject | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.send` | ⏳ | — | `send` → [executeCommand L2251](src/admin/commands/dispatcher.ts#L2251) | auth.evaluate, intelligence.getReviewItem, intelligence.isPjmkGroup, confirmations.issue | DM owner + nonce | Menunggu Tahap 1 | 11-11-2026 |
| `.confirm` | ⏳ | — | `confirm` → [executeCommand L2275](src/admin/commands/dispatcher.ts#L2275) | confirmations.confirm, auth.evaluate, scheduleDatabase.apply, schedule.refresh, intelligence.getReviewItem | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.cancel` | ⏳ | — | `cancel` → [executeCommand L2312](src/admin/commands/dispatcher.ts#L2312) | confirmations.cancel | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.pair` | ⏳ | — | `pair` → [handleInbound L665](src/admin/commands/dispatcher.ts#L665) | AdminAuthenticator.pairWithBootstrap | DM + bootstrap sekali pakai | Menunggu Tahap 1 | 11-11-2026 |
| `.tambahjadwal` | ⏳ | — | `schedule.add` → [executeCommand L1040](src/admin/commands/dispatcher.ts#L1040) | scheduleDatabase.preview, confirmations.issue | DM admin terverifikasi + konfirmasi | Menunggu Tahap 1 | 11-11-2026 |
| `.editjadwal` | ⏳ | — | `schedule.edit` → [executeCommand L1041](src/admin/commands/dispatcher.ts#L1041) | scheduleDatabase.preview, confirmations.issue | DM admin terverifikasi + konfirmasi | Menunggu Tahap 1 | 11-11-2026 |
| `.hapusjadwal` | ⏳ | — | `schedule.delete` → [executeCommand L1042](src/admin/commands/dispatcher.ts#L1042) | scheduleDatabase.preview, confirmations.issue | DM admin terverifikasi + konfirmasi | Menunggu Tahap 1 | 11-11-2026 |
| `.resetjadwal` | ⏳ | — | `schedule.reset` → [executeCommand L1043](src/admin/commands/dispatcher.ts#L1043) | scheduleDatabase.preview, confirmations.issue | DM admin terverifikasi + konfirmasi | Menunggu Tahap 1 | 11-11-2026 |
| `.setpjmk` | ⏳ | — | `group.setpjmk` → [executeCommand L2097](src/admin/commands/dispatcher.ts#L2097) | fun.setRelaySource, intelligence.registerPjmkGroup, outbound.registerAllowedGroup | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |
| `.setkelasa` | ⏳ | — | `group.setkelasa` → [executeCommand L2126](src/admin/commands/dispatcher.ts#L2126) | fun.setRelayTarget, intelligence.setPrimaryGroupJid, outbound.registerAllowedGroup | DM admin terverifikasi | Menunggu Tahap 1 | 11-11-2026 |

<a id="menu-8"></a>

### 8. 🎓 LMS STIKES Husada Jombang

| Perintah | Status | Bukti uji | Handler | Dependensi | Hak akses | Bug & perbaikan | Tanggal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `.lms help` | ⏳ | — | `lms` → [handleInbound L531](src/admin/commands/dispatcher.ts#L531) | lmsHelp · bantuan lokal | DM atau grup, panduan pribadi | Menunggu Tahap 1 | 11-11-2026 |
| `.lms <nama> dashboard` | ⏳ | — | `lms` → [handleInbound L531](src/admin/commands/dispatcher.ts#L531) | LmsService.handle · Prisma, sesi terenkripsi, LMS, OutboundGate | DM atau grup, data ke DM pemilik | Menunggu Tahap 1 | 11-11-2026 |
| `.lms <nama> matkul` | ⏳ | — | `lms` → [handleInbound L531](src/admin/commands/dispatcher.ts#L531) | LmsService.handle · Prisma, sesi terenkripsi, LMS, OutboundGate | DM atau grup, data ke DM pemilik | Menunggu Tahap 1 | 11-11-2026 |
| `.lms <nama> materi` | ⏳ | — | `lms` → [handleInbound L531](src/admin/commands/dispatcher.ts#L531) | LmsService.handle · Prisma, sesi terenkripsi, LMS, OutboundGate | DM atau grup, data ke DM pemilik | Menunggu Tahap 1 | 11-11-2026 |
| `.lms <nama> tugas` | ⏳ | — | `lms` → [handleInbound L531](src/admin/commands/dispatcher.ts#L531) | LmsService.handle · Prisma, sesi terenkripsi, LMS, OutboundGate | DM atau grup, data ke DM pemilik | Menunggu Tahap 1 | 11-11-2026 |
| `.lms <nama> kuis` | ⏳ | — | `lms` → [handleInbound L531](src/admin/commands/dispatcher.ts#L531) | LmsService.handle · Prisma, sesi terenkripsi, LMS, OutboundGate | DM atau grup, data ke DM pemilik | Menunggu Tahap 1 | 11-11-2026 |
| `.lms <nama> sync` | ⏳ | — | `lms` → [handleInbound L531](src/admin/commands/dispatcher.ts#L531) | LmsService.handle · Prisma, sesi terenkripsi, LMS, OutboundGate | DM mahasiswa pemilik akun | Menunggu Tahap 1 | 11-11-2026 |
| `.lms <nama> logout` | ⏳ | — | `lms` → [handleInbound L531](src/admin/commands/dispatcher.ts#L531) | LmsService.handle · Prisma, penghapusan sesi, logout portal | DM mahasiswa pemilik akun | Menunggu Tahap 1 | 11-11-2026 |

## Indeks alias dan subperintah

ID di kolom kiri merujuk ke handler, dependensi dan hak akses pada tabel halaman. Daftar ini menggabungkan registri sederhana dengan bentuk panggilan pada katalog README yang dicocokkan kembali ke parser. Beberapa ejaan memiliki arti berbeda menurut argumen, misalnya `.download` untuk e-book keperawatan dan `.download <id>` untuk Drive. Subperintah tugas dan LMS menerapkan izin tambahan.

| ID handler | Nama, alias atau bentuk panggilan dari katalog |
| --- | --- |
| `about` | `.about` |
| `ai.auto` | `.ai auto`, `.ai unpin` |
| `ai.flashcard` | `.flashcard` |
| `ai.model` | `.ai model`, `.ai pin` |
| `ai.models` | `.ai models` |
| `ai.quiz` | `.kuis`, `.quiz` |
| `ai.status` | `.ai`, `.ai status` |
| `ai.summarize` | `.ringkas`, `.summarize` |
| `ai.test` | `.ai test` |
| `ai.translate` | `.tr`, `.translate` |
| `analytics.stats` | `.activity`, `.report`, `.stats` |
| `announce` | `.announce`, `.announce create`, `.announce draft`, `.pengumuman`, `.pengumuman create`, `.pengumuman draft` |
| `approve` | `.admin approve`, `.approve`, `.maintenance approve` |
| `ask` | `.ask`, `.ask materi`, `.brainly`, `.tanya` |
| `audit` | `.admin audit`, `.audit`, `.maintenance audit` |
| `auth.login` | `.auth`, `.login`, `.pass`, `.password` |
| `auth.logout` | `.lock`, `.logout` |
| `backup` | `.admin backup`, `.backup`, `.maintenance backup` |
| `broadcast.preview` | `.broadcast preview` |
| `broadcast.send` | `.broadcast send` |
| `calendar` | `.agenda`, `.kalender` |
| `cancel` | `.cancel` |
| `class.faq` | `.faq` |
| `class.info` | `.kelas`, `.semester`, `.tahunajaran` |
| `class.members` | `.anggota`, `.mahasiswa`, `.nim` |
| `class.officers` | `.bendahara`, `.ketuakelas`, `.komting`, `.pengurus`, `.pjmk`, `.sekretaris`, `.wakilkomting`, `.wali` |
| `class.rules` | `.aturan`, `.rules` |
| `confirm` | `.confirm` |
| `countdown` | `.countdown` |
| `courses` | `.matkul` |
| `dashboard` | `.admin`, `.admin overview`, `.dashboard`, `.maintenance`, `.maintenance overview` |
| `db.status` | `.db status` |
| `digest` | `.digest` |
| `doc.minutes` | `.doc minutes`, `.notulensi`, `.pdf minutes` |
| `doc.pdf` | `.doc pdf`, `.pdf`, `.pdf pdf` |
| `doc.permission` | `.doc create`, `.doc permission`, `.pdf create`, `.pdf permission`, `.suratizin` |
| `document.ask` | `.tanyadokumen` |
| `document.summary` | `.ringkasdokumen` |
| `download` | `.ambilmateri`, `.download` |
| `drive.files` | `.drive files`, `.drive search` |
| `drive.status` | `.drive errors`, `.drive status` |
| `drive.sync` | `.drive sync` |
| `emergency.resume` | `.admin off`, `.admin resume`, `.maintenance off`, `.maintenance resume` |
| `emergency.stop` | `.admin on`, `.admin pause`, `.maintenance on`, `.maintenance pause` |
| `errors` | `.errors` |
| `filter.review` | `.filter review`, `.monitor review` |
| `filter.status` | `.filter status`, `.monitor status` |
| `fun.afk` | `.afk` |
| `fun.coin` | `.flipcoin`, `.koin` |
| `fun.create` | `.cerita`, `.cerpen`, `.gombal`, `.katahariini`, `.motivasi`, `.rayuan`, `.roasting`, `.tebak-tebakan` |
| `fun.dare` | `.dare` |
| `fun.dice` | `.dadu` |
| `fun.doa` | `.ayatkursi`, `.doaharian` |
| `fun.fact` | `.faktaunik` |
| `fun.pantun` | `.pantun` |
| `fun.quiz_answer` | `.jawab` |
| `fun.quiz_giveup` | `.nyerah`, `.skip` |
| `fun.quiz_start` | `.caklontong`, `.family100`, `.mathquiz`, `.tebakkata` |
| `fun.quote` | `.katabijak`, `.quoterandom`, `.quotes`, `.quotesislami`, `.quotesmotivasi`, `.quotesnasehat` |
| `fun.shell` | `.apakah`, `.bisakah`, `.kapankah`, `.kerangajaib`, `.rate` |
| `fun.sholat` | `.jadwalsholat` |
| `fun.suit` | `.suit` |
| `fun.surah` | `.listsurah`, `.quran` |
| `fun.text` | `.alay`, `.balikhuruf`, `.besarkecil`, `.hilih`, `.namaninja` |
| `fun.truth` | `.truth` |
| `fun.unafk` | `.unafk` |
| `game` | `.anagram`, `.antonim`, `.asahotak`, `.deretangka`, `.game`, `.game ai`, `.game komputer`, `.game list`, `.game matematika`, `.sinonim`, `.tebakemoji`, `.tebakpola` |
| `game.daily` | `.dailychallenge` |
| `game.hint` | `.hint` |
| `game.score` | `.score` |
| `gamification.leaderboard` | `.lb`, `.leaderboard`, `.level`, `.lvl` |
| `gamification.privacy` | `.privacy`, `.privacy gamification` |
| `group.classify` | `.cekpesan`, `.klasifikasi` |
| `group.nimbrung` | `.berhentinimbrung`, `.diam`, `.hening`, `.nimbrung`, `.nimbrung off`, `.nimbrung status`, `.nongkrong`, `.nongkrong off`, `.nongkrong status` |
| `group.setkelasa` | `.setkelasa`, `.setnursing` |
| `group.setpjmk` | `.setpjmk` |
| `groupgen` | `.buatkelompok`, `.kelompok` |
| `groupid` | `.groupid`, `.id` |
| `groups` | `.group`, `.groups`, `.source`, `.target` |
| `groups.add` | `.group add`, `.group set`, `.groups add`, `.groups set`, `.source add`, `.source set`, `.target add`, `.target set` |
| `groups.pause` | `.filter off`, `.filter pause`, `.group pause`, `.group remove`, `.groups pause`, `.groups remove`, `.monitor off`, `.monitor pause`, `.source pause`, `.source remove`, `.target pause`, `.target remove` |
| `groups.resume` | `.filter on`, `.filter resume`, `.group resume`, `.groups resume`, `.monitor on`, `.monitor resume`, `.source resume`, `.target resume` |
| `groups.sources` | `.group list`, `.group sources`, `.groups list`, `.groups sources`, `.source list`, `.source sources`, `.target list`, `.target sources` |
| `health` | `.health` |
| `help` | `.help` |
| `info` | `.info`, `.ingfo` |
| `journal.search` | `.carijurnal`, `.garuda`, `.googlescholar`, `.journal`, `.jurnal`, `.pubmed`, `.scholar` |
| `lecturers` | `.dosen`, `.kontakdosen`, `.nomordosen` |
| `lms` | `.lms` |
| `logs` | `.logs` |
| `materials` | `.dokumen`, `.materi`, `.materi cari`, `.materi detail`, `.materi halaman`, `.materi minggu1`, `.materi terbaru` |
| `materials.search` | `.carimateri` |
| `media.effect` | `.blur`, `.compress`, `.flip`, `.flop`, `.grayscale`, `.hitamputih`, `.invert`, `.resize` |
| `media.imagesearch` | `.carifoto`, `.carigambar`, `.foto`, `.gambar`, `.image`, `.img`, `.pinterest` |
| `media.ocr` | `.ocr` |
| `media.qr` | `.qr`, `.qrcode` |
| `media.quotemaker` | `.makequote`, `.quotemaker`, `.quotesmaker` |
| `media.schedulecard` | `.kartujadwal`, `.kartuucapan` |
| `media.sticker` | `.s`, `.sticker`, `.stickerwm`, `.stiker` |
| `media.toimg` | `.toimg` |
| `media.ttp` | `.attp`, `.ttp` |
| `media.tts` | `.say`, `.tts` |
| `menu` | `.admin menu`, `.allmenu`, `.maintenance menu`, `.menu` |
| `music` | `.music`, `.musik` |
| `notes` | `.catatan`, `.catatan add`, `.catatan del`, `.catatan delete`, `.catatan hapus`, `.catatan tambah`, `.note`, `.note add`, `.note del`, `.note delete`, `.note hapus`, `.note tambah` |
| `nursing` | `.askep`, `.balance`, `.berita`, `.bias`, `.download`, `.ebook`, `.gcs`, `.high alert`, `.highalert`, `.imt`, `.kalkulator`, `.kalkulatorperawat`, `.kampus`, `.keperawatan`, `.kuis ukom`, `.kuisukom`, `.mtb`, `.patient safety`, `.pengkajian`, `.penunjang`, `.ppni`, `.safety`, `.sdki`, `.sop`, `.tetesan`, `.ukom` |
| `owner` | `.owner` |
| `pair` | `.pair` |
| `pending` | `.admin review`, `.maintenance review`, `.pending` |
| `ping` | `.ping` |
| `priority` | `.priority` |
| `reject` | `.admin reject`, `.maintenance reject`, `.reject` |
| `relay` | `.relay` |
| `reminders` | `.reminder`, `.reminder add`, `.reminder del`, `.reminder delete`, `.reminder hapus`, `.reminder settings`, `.reminder snooze`, `.reminder tambah`, `.reminders`, `.reminders add`, `.reminders del`, `.reminders delete`, `.reminders hapus`, `.reminders settings`, `.reminders snooze`, `.reminders tambah` |
| `reminders.pause` | `.reminder pause`, `.reminder resume`, `.reminders pause`, `.reminders resume` |
| `rewrite` | `.koreksi`, `.parafrase`, `.perbaiki`, `.rapikan`, `.rewrite` |
| `runtime` | `.runtime` |
| `schedule` | `.jadwal`, `.jadwal hariini`, `.schedule`, `.schedule hariini` |
| `schedule.add` | `.jadwal add`, `.jadwal tambah`, `.schedule add`, `.schedule tambah`, `.tambahjadwal` |
| `schedule.check_date` | `.cekjadwal` |
| `schedule.day` | `.jadwal senin`, `.schedule senin` |
| `schedule.delete` | `.hapusjadwal`, `.jadwal delete`, `.jadwal hapus`, `.schedule delete`, `.schedule hapus` |
| `schedule.edit` | `.editjadwal`, `.jadwal edit`, `.jadwal ubah`, `.schedule edit`, `.schedule ubah` |
| `schedule.export` | `.jadwal export`, `.schedule export` |
| `schedule.next` | `.kuliahberikutnya` |
| `schedule.reset` | `.jadwal reset`, `.resetjadwal`, `.schedule reset` |
| `schedule.today_courses` | `.matkulhariini` |
| `schedule.today_lecturers` | `.dosenhariini` |
| `schedule.today_rooms` | `.ruanganhariini` |
| `schedule.tomorrow` | `.besok`, `.jadwal besok`, `.schedule besok` |
| `schedule.week` | `.jadwal minggu`, `.jadwal mingguini`, `.mingguini`, `.schedule minggu`, `.schedule mingguini` |
| `scheduler.status` | `.queue`, `.scheduler status`, `.workers` |
| `send` | `.send` |
| `status` | `.admin status`, `.maintenance status`, `.status` |
| `storage` | `.storage` |
| `system` | `.system` |
| `tasks` | `.deadline`, `.deadline add`, `.deadline aktif`, `.deadline all`, `.deadline antrean`, `.deadline deadline`, `.deadline del`, `.deadline delete`, `.deadline detail`, `.deadline done`, `.deadline grup`, `.deadline hapus`, `.deadline hariini`, `.deadline list`, `.deadline mingguini`, `.deadline selesai`, `.deadline semua`, `.deadline tambah`, `.deadline tolak`, `.deadline tujuan`, `.deadline ulang`, `.mytask`, `.mytask add`, `.mytask aktif`, `.mytask all`, `.mytask antrean`, `.mytask deadline`, `.mytask del`, `.mytask delete`, `.mytask detail`, `.mytask done`, `.mytask grup`, `.mytask hapus`, `.mytask hariini`, `.mytask list`, `.mytask mingguini`, `.mytask selesai`, `.mytask semua`, `.mytask tambah`, `.mytask tolak`, `.mytask tujuan`, `.mytask ulang`, `.progress`, `.progress add`, `.progress aktif`, `.progress all`, `.progress antrean`, `.progress deadline`, `.progress del`, `.progress delete`, `.progress detail`, `.progress done`, `.progress grup`, `.progress hapus`, `.progress hariini`, `.progress list`, `.progress mingguini`, `.progress selesai`, `.progress semua`, `.progress tambah`, `.progress tolak`, `.progress tujuan`, `.progress ulang`, `.selesaitugas`, `.tambahtugas`, `.tasks`, `.tasks add`, `.tasks aktif`, `.tasks all`, `.tasks antrean`, `.tasks deadline`, `.tasks del`, `.tasks delete`, `.tasks detail`, `.tasks done`, `.tasks grup`, `.tasks hapus`, `.tasks hariini`, `.tasks list`, `.tasks mingguini`, `.tasks selesai`, `.tasks semua`, `.tasks tambah`, `.tasks tolak`, `.tasks tujuan`, `.tasks ulang`, `.tugas`, `.tugas add`, `.tugas aktif`, `.tugas all`, `.tugas antrean`, `.tugas deadline`, `.tugas del`, `.tugas delete`, `.tugas detail`, `.tugas done`, `.tugas grup`, `.tugas hapus`, `.tugas hariini`, `.tugas list`, `.tugas mingguini`, `.tugas selesai`, `.tugas semua`, `.tugas tambah`, `.tugas tolak`, `.tugas tujuan`, `.tugas ulang`, `.tugasaktif` |
| `user.profile` | `.me`, `.profile` |
| `util.bmi` | `.bmi` |
| `util.calc` | `.calc`, `.hitung`, `.kalkulator` |
| `util.clock` | `.clock`, `.jam`, `.waktu` |
| `util.convert` | `.convert`, `.konversi`, `.kurs` |
| `util.gpa` | `.gpa`, `.ipk` |
| `util.urlcheck` | `.shortlink`, `.urlcheck` |
| `util.weather` | `.cuaca`, `.weather` |
| `util.wiki` | `.kbbi`, `.wiki`, `.wikipedia` |
| `whatsapp.status` | `.whatsapp status` |

## Kredensial yang ditemukan

| Lokasi | Yang teramati | Tindak lanjut |
| --- | --- | --- |
| `.env:23` | Berkas dilacak Git. Nilai NVIDIA_API_KEY terisi dan bentuknya sesuai token NVIDIA. Validitas dan penggunaan di VPS belum diperiksa. | Cabut kunci jika aktif, buat pengganti di konfigurasi privat, periksa pemakaian dan riwayat Git. |
| `.env:45`, `src/config/env.ts:44`, `install.sh:298`, `install.sh:310`, `.env.example:13` dan README | Password admin bawaan dapat dibaca oleh pemegang repo. DATABASE_URL di .env:19 juga memuat komponen password contoh. | Ganti password aktif di VPS. Bahas penghapusan default dan pelacakan .env pada tahap perbaikan. |
| `.pg-app.local`, `.pg-superuser.local` | Kedua file lokal berisi data dan tidak tercatat di indeks Git. | Perlakukan sebagai file privat. Keluarkan dari paket distribusi. |
| `reference/akira/akirabotv1-main/akirabot.js:1096` dan 10 lokasi lain | Arsip referensi memiliki 11 baris dengan parameter query berbentuk kredensial literal. Status aktif tidak diketahui. | Hindari penyertaan arsip ini dalam paket produksi dan periksa asal kredensial. |

## Pilihan bahasa

Pertahankan Node.js dan TypeScript. Dispatcher, adapter WhatsApp, Prisma, router AI dan tes sudah berbagi tipe dan menggunakan rancangan proses yang sama. OCR dan TTS sudah memiliki batas proses eksternal tersendiri. Belum ada bukti pengujian dalam audit ini yang mendukung biaya memindahkan inti ke Python, Go atau PHP.

## Temuan Tahap 1 · pemeriksaan statis

Ditemukan 11 temuan pada source a641f86. S01 berkategori kritis. S02–S05 berkategori tinggi. S06 dan S08–S11 berkategori sedang, S07 rendah. Tabel temuan mencantumkan file, baris, dampak, bukti dan uji penerimaan. [Buka temuan lengkap](SECURITY_REVIEW.md)

Dalam fase audit master project, typecheck dan build berhasil. Vitest meluluskan 122 tes pada 22 file. Katalog memeriksa 573 eksekusi dengan adapter WA mock. Angka 192 di tabel halaman merekam baseline inventaris dan menunggu penilaian per perintah dalam batch penerimaan, termasuk input kosong, salah format dan akses ditolak. [Hasil dan batas QA](IMPLEMENTATION_STATUS.md)

## Changelog dan risiko tersisa

| Tahap | File | Perubahan dan alasan |
| --- | --- | --- |
| 0 | AUDIT.md | Membuat inventaris, peta rute dan titik awal status untuk menampung bukti tiap perintah. |

Uji penerimaan per perintah di HP, pemasangan di VPS, penerimaan lampiran di HP, autentikasi layanan produksi, backup/restore dan observasi idle 24 jam masih ⏳. Sampel HTML atau deskripsi tes lama belum dihitung sebagai penerimaan audit ini.

## Lampiran · inventaris berkas

Nama dicatat relatif terhadap root. Git mencatat 158 berkas saat inventaris. Kelompok arsip Akira dipisahkan dari aplikasi aktif. Berkas terpasang di node_modules dan berkas build di dist sudah dihitung di atas.

<details>
<summary>.github · 1 berkas</summary>

- `.github/workflows/datadog-synthetics.yml`

</details>

<details>
<summary>blueprint · 35 berkas</summary>

- `blueprint/.env.example`
- `blueprint/.gitignore`
- `blueprint/MASTER_PROMPT.md`
- `blueprint/README.md`
- `blueprint/data/class-5a.seed.json`
- `blueprint/docs/00_PROJECT_BRIEF.md`
- `blueprint/docs/01_AUDIT_AKIRA_REFERENCE.md`
- `blueprint/docs/02_SYSTEM_ARCHITECTURE.md`
- `blueprint/docs/03_WHATSAPP_CONNECTOR.md`
- `blueprint/docs/04_PRIVATE_ADMIN_CONTROL.md`
- `blueprint/docs/05_SECURITY_PRIVACY.md`
- `blueprint/docs/06_NVIDIA_MODELS_AND_ROUTER.md`
- `blueprint/docs/07_AI_SYSTEM_PROMPTS.md`
- `blueprint/docs/08_GROUP_INTELLIGENCE.md`
- `blueprint/docs/09_DATABASE_DATA_MODEL.md`
- `blueprint/docs/10_CLASS_5A_SCHEDULE.md`
- `blueprint/docs/11_COURSES_AND_LECTURERS.md`
- `blueprint/docs/12_REMINDERS_AND_ACADEMIC_CALENDAR.md`
- `blueprint/docs/13_ASSIGNMENTS_GROUPS_ANNOUNCEMENTS.md`
- `blueprint/docs/14_MATERIALS_KNOWLEDGE_BASE.md`
- `blueprint/docs/15_AI_CLASS_ASSISTANT.md`
- `blueprint/docs/16_COMMAND_CATALOG.md`
- `blueprint/docs/17_ANALYTICS_DOCUMENTS_GAMIFICATION_MEDIA.md`
- `blueprint/docs/18_TESTING_ACCEPTANCE.md`
- `blueprint/docs/19_DEPLOYMENT_RUNBOOK.md`
- `blueprint/docs/20_IMPLEMENTATION_ROADMAP.md`
- `blueprint/docs/21_PROMPT_LIBRARY.md`
- `blueprint/docs/22_SHJ_PUBLIC_SOURCES.md`
- `blueprint/docs/23_API_INTEGRATION_SNIPPETS.md`
- `blueprint/prompts/01_BUILD_SYSTEM.md`
- `blueprint/prompts/02_BUILD_WHATSAPP_ADMIN.md`
- `blueprint/prompts/03_BUILD_NVIDIA_ROUTER.md`
- `blueprint/prompts/04_BUILD_GROUP_AI.md`
- `blueprint/prompts/05_BUILD_ACADEMIC_MODULES.md`
- `blueprint/prompts/06_SECURITY_AND_RELEASE.md`

</details>

<details>
<summary>data · 1 berkas</summary>

- `data/class-5a.seed.json`

</details>

<details>
<summary>docs · 18 berkas</summary>

- `docs/AKIRA_FEATURE_INVENTORY.md`
- `docs/ARCHITECTURE.md`
- `docs/COMMANDS.md`
- `docs/COMMAND_CATALOG.md`
- `docs/DATABASE.md`
- `docs/DECISIONS.md`
- `docs/DEPLOYMENT.md`
- `docs/FEATURE_STATUS.md`
- `docs/INSTALLATION.md`
- `docs/LEGACY_FEATURE_AUDIT.md`
- `docs/LMS_ARCHITECTURE.md`
- `docs/LMS_COMMANDS.md`
- `docs/RUNBOOK.md`
- `docs/SECURITY.md`
- `docs/SECURITY_AND_PRIVACY.md`
- `docs/TESTING.md`
- `docs/TROUBLESHOOTING.md`
- `docs/WHATSAPP_PROVIDER_MATRIX.md`

</details>

<details>
<summary>prisma · 7 berkas</summary>

- `prisma/migrations/20261106000000_init/migration.sql`
- `prisma/migrations/20261106000100_audit_append_only/migration.sql`
- `prisma/migrations/20261110000100_lms_accounts/migration.sql`
- `prisma/migrations/20261111000100_lms_auto_login/migration.sql`
- `prisma/migrations/migration_lock.toml`
- `prisma/schema.prisma`
- `prisma/seed.ts`

</details>

<details>
<summary>reference · 60 berkas</summary>

- `reference/akira/akirabotv1-main/Akira😄` (lokal)
- `reference/akira/akirabotv1-main/README.md` (lokal)
- `reference/akira/akirabotv1-main/akira/Akira` (lokal)
- `reference/akira/akirabotv1-main/akira/ind.js` (lokal)
- `reference/akira/akirabotv1-main/akira/index.js` (lokal)
- `reference/akira/akirabotv1-main/akirabot.js` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/Akira` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/amv.js` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/anime.json` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/animesaran.js` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/animesaran2.js` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/asupan.js` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/asupan.json` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/bacot.json` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/color.js` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/darkjokes.js` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/donasi.js` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/drak.js` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/emror.jpg` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/fetcher.js` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/functions.js` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/gtts.js` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/help.js` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/husbu.js` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/listsurah.js` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/logo.jpg` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/music.js` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/ocr.js` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/odc.jpeg` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/rules.js` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/sewabot.js` (lokal)
- `reference/akira/akirabotv1-main/akiraganz/undef.jpg` (lokal)
- `reference/akira/akirabotv1-main/database/Akira` (lokal)
- `reference/akira/akirabotv1-main/database/bot/akira` (lokal)
- `reference/akira/akirabotv1-main/database/bot/antilink.json` (lokal)
- `reference/akira/akirabotv1-main/database/bot/event.json` (lokal)
- `reference/akira/akirabotv1-main/database/bot/limit.json` (lokal)
- `reference/akira/akirabotv1-main/database/bot/nsfw.json` (lokal)
- `reference/akira/akirabotv1-main/database/bot/registered.json` (lokal)
- `reference/akira/akirabotv1-main/database/bot/simi.json` (lokal)
- `reference/akira/akirabotv1-main/database/bot/welkom.json` (lokal)
- `reference/akira/akirabotv1-main/database/group/akira` (lokal)
- `reference/akira/akirabotv1-main/database/group/antifirtex.json` (lokal)
- `reference/akira/akirabotv1-main/database/group/antilink.json` (lokal)
- `reference/akira/akirabotv1-main/database/group/antiyoutube.json` (lokal)
- `reference/akira/akirabotv1-main/database/group/bad.json` (lokal)
- `reference/akira/akirabotv1-main/database/group/badword.json` (lokal)
- `reference/akira/akirabotv1-main/database/group/event.json` (lokal)
- `reference/akira/akirabotv1-main/database/group/leveling.json` (lokal)
- `reference/akira/akirabotv1-main/database/user/admin.json` (lokal)
- `reference/akira/akirabotv1-main/database/user/akira` (lokal)
- `reference/akira/akirabotv1-main/database/user/banned.json` (lokal)
- `reference/akira/akirabotv1-main/database/user/level.json` (lokal)
- `reference/akira/akirabotv1-main/database/user/limit.json` (lokal)
- `reference/akira/akirabotv1-main/database/user/premium.json` (lokal)
- `reference/akira/akirabotv1-main/database/user/uang.json` (lokal)
- `reference/akira/akirabotv1-main/index.js` (lokal)
- `reference/akira/akirabotv1-main/install.sh` (lokal)
- `reference/akira/akirabotv1-main/package-lock.json` (lokal)
- `reference/akira/akirabotv1-main/package.json` (lokal)

</details>

<details>
<summary>Root · 22 berkas</summary>

- `.env`
- `.env.example`
- `.gitignore`
- `.pg-app.local` (lokal)
- `.pg-superuser.local` (lokal)
- `ARCHITECTURE_MAP.md`
- `CHANGELOG.md`
- `FEATURE_INVENTORY.md`
- `IMPLEMENTATION_STATUS.md`
- `LMS_AUDIT.md`
- `LMS_IMPLEMENTATION_STATUS.md`
- `PROJECT_AUDIT.md`
- `README.md`
- `docker-compose.yml`
- `ecosystem.config.cjs`
- `install.sh`
- `package-lock.json`
- `package.json`
- `start.js`
- `tsconfig.build.json`
- `tsconfig.json`
- `vitest.config.ts`

</details>

<details>
<summary>scripts · 6 berkas</summary>

- `scripts/backup.sh`
- `scripts/check-lms-db.mjs`
- `scripts/check-schedule-db.mjs`
- `scripts/command-catalog.mjs`
- `scripts/command-guide.mjs`
- `scripts/restore.sh`

</details>

<details>
<summary>src · 48 berkas</summary>

- `src/admin/authentication/authenticator.ts`
- `src/admin/authorization/confirmation.ts`
- `src/admin/commands/dispatcher.ts`
- `src/admin/commands/intent.ts`
- `src/admin/commands/menu.ts`
- `src/admin/commands/parser.ts`
- `src/ai/classification/group-intelligence.ts`
- `src/ai/model-router/router.ts`
- `src/ai/nvidia/registry.ts`
- `src/ai/openai/luna.ts`
- `src/app/health.ts`
- `src/config/env.ts`
- `src/database/seed-schema.ts`
- `src/index.ts`
- `src/modules/academic/assignment-format.ts`
- `src/modules/academic/deadline-notices.ts`
- `src/modules/academic/extended-modules.ts`
- `src/modules/academic/perawat.ts`
- `src/modules/academic/task-intake.ts`
- `src/modules/fun/fun-utility-service.ts`
- `src/modules/fun/questions.ts`
- `src/modules/lms/catalog.ts`
- `src/modules/lms/client.ts`
- `src/modules/lms/dates.ts`
- `src/modules/lms/document.ts`
- `src/modules/lms/service.ts`
- `src/modules/materials/drive.ts`
- `src/modules/materials/extract.ts`
- `src/modules/materials/knowledge-base.ts`
- `src/modules/media/media-service.ts`
- `src/modules/media/music.ts`
- `src/modules/reminders/scheduler.ts`
- `src/modules/reminders/worker.ts`
- `src/modules/schedule/database.ts`
- `src/modules/schedule/service.ts`
- `src/observability/logger.ts`
- `src/observability/monitor.ts`
- `src/scripts/admin-cli.ts`
- `src/scripts/benchmark-id.ts`
- `src/scripts/health.ts`
- `src/security/guards.ts`
- `src/security/phone.ts`
- `src/whatsapp/adapters/baileys.ts`
- `src/whatsapp/adapters/mock.ts`
- `src/whatsapp/adapters/types.ts`
- `src/whatsapp/adapters/wwebjs.ts`
- `src/whatsapp/format.ts`
- `src/whatsapp/outbound/gate.ts`

</details>

<details>
<summary>tests · 22 berkas</summary>

- `tests/admin-auth.test.ts`
- `tests/ai-failover.test.ts`
- `tests/chat-and-sources.test.ts`
- `tests/chat-latency.test.ts`
- `tests/command-regressions.test.ts`
- `tests/config.test.ts`
- `tests/deadline-notices.test.ts`
- `tests/drive-delivery.test.ts`
- `tests/extended-modules.test.ts`
- `tests/health.test.ts`
- `tests/integration-e2e.test.ts`
- `tests/lms.test.ts`
- `tests/logger.test.ts`
- `tests/media-and-fun.test.ts`
- `tests/menu-ai-game.test.ts`
- `tests/model-router.test.ts`
- `tests/phone.test.ts`
- `tests/revision.test.ts`
- `tests/seed.test.ts`
- `tests/whatsapp-output.test.ts`
- `tests/whatsapp-startup.test.ts`
- `tests/worker-recovery.test.ts`

</details>

