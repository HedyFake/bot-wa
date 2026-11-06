# 16 — Full WhatsApp Command Catalog

Semua command harus dapat dipanggil oleh dot command dan bahasa natural yang setara. Gunakan command registry, permission declaration, validation schema, usage examples, and tests. Jangan menaruh semua handler dalam satu switch besar.

## A. Sistem informasi kelas

`.menu`, `.help`, `.about`, `.status`, `.ping`, `.runtime`, `.info`, `.kelas`, `.anggota`, `.admin`, `.ketuakelas`, `.sekretaris`, `.bendahara`, `.wali`, `.dosen`, `.matkul`, `.semester`, `.tahunajaran`, `.profile`, `.me`, `.id`, `.groupid`, `.rules`, `.faq`, `.dashboard`.

## B. Jadwal kuliah

`.jadwal`, `.jadwal senin`, `.jadwal selasa`, `.jadwal rabu`, `.jadwal kamis`, `.jadwal jumat`, `.jadwal sabtu`, `.jadwal minggu`, `.mingguini`, `.besok`, `.kuliahberikutnya`, `.matkulhariini`, `.dosenhariini`, `.ruanganhariini`, `.cekjadwal <tanggal>`, `.tambahjadwal`, `.editjadwal`, `.hapusjadwal`, `.resetjadwal`, `.importjadwal`, `.exportjadwal`, `.jadwalpdf`, `.jadwalgambar`, `.jadwaljson`, `.jadwalcsv`.

## C. Pengingat kuliah

H-1, H-3 jam, H-1 jam, H-30 menit, kelas dimulai, kelas selesai, perubahan jadwal, dosen masuk (jika data resmi), presentasi, praktikum, Zoom, Google Meet, deadline tugas, ujian, kuis, seminar, pengumpulan makalah/PPT, piket, custom reminder. Reminder tersimpan sebagai data dan dikirim scheduler; bukan hardcoded timer.

## D. Tugas dan assignment

`.tugas`, `.tugas hariini`, `.tugas mingguini`, `.tugas besok`, `.tugas terdekat`, `.deadline`, `.deadline <matkul>`, `.tambahtugas`, `.edittugas`, `.hapustugas`, `.selesaitugas`, `.tugasaktif`, `.tugasterlambat`, `.tugasdosen`, `.tugasprioritas`, `.tugaspribadi`, `.tugaskelompok`, `.tugasacak`, `.assign <nama>`.

Fitur: pembagian tugas kelompok otomatis, pembagian presenter/materi/anggota, countdown, progress, status belum mulai/dikerjakan/selesai/terlambat, riwayat.

## E. Materi kuliah

`.materi`, `.materi <matkul>`, `.materi terbaru`, `.uploadmateri`, `.hapusmateri`, `.carimateri`, `.materi minggu1`, `.materi minggu2`, `.materi minggu3`, katalog PDF/PPT/DOCX/gambar/link/video, kategori mata kuliah/dosen/semester, search, download, preview, statistik penggunaan, arsip, backup.

## F. Kelompok

`.kelompok`, `.buatkelompok`, `.hapuskelompok`, `.listkelompok`, random group generator, group by size/choice/attendance number/fairness, leader/secretary/presenter/questioner/moderator/operator, member list, history, automatic rotation. Atribut sensitif tidak digunakan sebagai default.

## G. Pengumuman kelas

`.pengumuman`, `.buatpengumuman`, `.hapuspengumuman`, `.editpengumuman`, broadcast, priority, scheduled, recurring, pin important information (simulate pinned text if provider has no pin support), role-based, admin-only, group-only, by course, read confirmation, reminder, archive, history, templates, auto-format.

## H. Dosen dan wali kelas

Database dosen, profil, mata kuliah, jadwal (hanya bila diketahui), ruangan, official meeting links, LMS/Classroom links, class notes, reminder contact, message templates, permission letter, lecturer announcements, archive, official contacts, schedule-change history.

## I. AI Class Assistant

`.ask <pertanyaan>`, summarize material, PDF notes, lecture notes, flashcards, practice questions, MCQ, essay questions, exam outline, answer explanation, explain complex material, simplify academic language, proofread, grammar, translate, paper outline, PPT outline, bibliography, PDF Q&A.

## N. Gamification

XP, level, ranking class/weekly/monthly/semester, badges (active, punctual, quiz, attendance, helper, contributor), daily/weekly reward, achievement, learning streak, quiz/attendance/contribution EXP, profile, level-up announcement, top 10, hall of fame. Must be opt-in and transparent; no punitive tracking.

## S. Kalender akademik

Academic calendar, UTS/UAS, practical, seminar, KKN, PKL, skripsi, guidance, public/campus holidays, effective class days, countdown UTS/UAS/semester/graduation/deadline, weekly/monthly calendar, export calendar.

## U. Generator dokumen

Permission letter, assignment letter, event minutes, attendance sheet, recap, activity report, financial report, task list, schedule, roster, certificate, participant card, invitation, official announcement, notes/minutes, proposal, paper cover, bibliography, PDF generation, send document to group after approval.

## Y. Information and utilities

Weather, current time, calendar, date, stopwatch, countdown, reminder, calculator, currency/unit conversion, GPA/grade/percentage/BMI calculator, QR generate/read, barcode, short URL, URL/domain/IP/DNS/HTTP/SSL checks, timezone. External lookups require safe URL validation and rate limits. URL/IP tools must not be used to scan unauthorized targets.

## Z. Class monitoring

Group activity, message counts, active hours/days, command counts, attendance/task/quiz/voting/policy/media/link/file/announcement statistics, weekly/monthly/semester reports, admin dashboard data. Use aggregated non-sensitive analytics. Don't rank members by private message content.

## AF. Media

Sticker maker, resize/compress/convert image, image-to-PDF, PDF-to-image, merge/split/compress PDF, OCR, website screenshot (safe allowlisted targets), QR image, ID card, announcement/schedule/birthday/quote/certificate/attendance/leaderboard cards.

## Admin-only commands

`.admin menu`, `.admin status`, `.admin overview`, `.admin groups`, `.admin review`, `.admin approve`, `.admin reject`, `.admin publish`, `.admin pause`, `.admin resume`, `.admin backup`, `.admin audit`, `.ai models`, `.ai auto`, `.ai pin`, `.ai unpin`, `.ai status`, `.ai usage`, `.filter pause`, `.filter resume`.

## Command execution contract

Every command definition must specify:

- name, aliases, description, syntax;
- permission level;
- allowed context (`private`, `group`, `both`);
- input Zod schema;
- handler/service;
- read-only vs write vs external send;
- confirmation requirement;
- rate limit;
- idempotency behavior;
- tests and help text.

No unsupported command should silently succeed. Return clear “belum tersedia” with roadmap state.
