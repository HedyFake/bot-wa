# Inventaris fitur HdyBot

Inventaris statis perintah titik dari parser dan dispatcher aktif. Kolom status menyatakan keberadaan jalur kode. Uji perilaku yang telah dijalankan tercantum di IMPLEMENTATION_STATUS.md. Alias bahasa alami ada di akhir parser. Semua baris merujuk ke src/admin/commands/parser.ts dan src/admin/commands/dispatcher.ts. Pengiriman melewati OutboundGate. Beberapa subperintah melakukan validasi tambahan terhadap izin, sesi, atau konfigurasi provider.

| Perintah internal | Perintah dan alias | Akses | Panggilan langsung | Data utama | Status statis |
|---|---|---|---|---|---|
| auth.login | .login, .password, .pass, .auth | Pengguna | Dispatcher | Memori / eksternal | Alur autentikasi privat |
| auth.logout | .logout, .lock | Pengguna | Dispatcher | Memori / eksternal | Alur autentikasi privat |
| owner | .owner | Pengguna | Dispatcher | Memori / eksternal | Handler ditemukan |
| groupid | .groupid, .id | Pengguna | Dispatcher | Memori / eksternal | Handler ditemukan |
| dashboard | .dashboard, .admin, .maintenance | Admin privat | router.status, intelligence.stats, schedule.getNextSession, outbound.isEmergencyStopped | Seed kelas | Handler ditemukan |
| system | .system | Admin privat | router.status, this.deps.worker.status, outbound.isEmergencyStopped | Reminder / BotSetting | Handler ditemukan |
| status | .status, .admin status | Admin privat | router.status, this.deps.worker.status, outbound.isEmergencyStopped | Reminder / BotSetting | Handler ditemukan |
| health | .health | Admin privat | router.status, this.deps.worker.status, outbound.isEmergencyStopped | Reminder / BotSetting | Handler ditemukan |
| ping | .ping | Admin privat | Dispatcher | Memori / eksternal | Handler ditemukan |
| runtime | .runtime | Admin privat | Dispatcher | Memori / eksternal | Handler ditemukan |
| about | .about | Pengguna | Dispatcher | Memori / eksternal | Handler ditemukan |
| info | .info, .ingfo | Pengguna | Dispatcher | Memori / eksternal | Handler ditemukan |
| logs | .logs | Admin privat | Dispatcher | Memori / eksternal | Handler ditemukan |
| errors | .errors | Admin privat | Dispatcher | Memori / eksternal | Handler ditemukan |
| help | .help | Pengguna | this.deps.auth.evaluate | Drive / BotSetting | Handler ditemukan |
| menu | .menu, .allmenu, .admin menu | Pengguna | this.deps.auth.evaluate | Drive / BotSetting | Handler ditemukan |
| class.info | .kelas, .semester, .tahunajaran | Pengguna | this.fun.getClassOfficers, this.fun.getClassMembers, this.fun.getLecturerContacts, schedule.listCourses, schedule.totalCourseCreditsSks | State layanan lokal | Handler ditemukan |
| class.members | .anggota, .mahasiswa, .nim | Pengguna | this.fun.formatClassMembers | State layanan lokal | Handler ditemukan |
| class.officers | .ketuakelas, .komting, .wakilkomting, .sekretaris, .bendahara, .wali, .pengurus, .pjmk | Pengguna | this.fun.formatClassOfficers | State layanan lokal | Handler ditemukan |
| class.rules | .rules, .aturan | Pengguna | Dispatcher | Memori / eksternal | Handler ditemukan |
| class.faq | .faq | Pengguna | Dispatcher | Memori / eksternal | Handler ditemukan |
| user.profile | .profile, .me | Pengguna | this.deps.auth.evaluate | Memori / eksternal | Handler ditemukan |
| priority | .priority | Admin privat | Dispatcher | Memori / eksternal | Handler khusus belum ditemukan |
| pending | .pending, .admin review | Admin privat | intelligence.listPendingReviews | Memori / eksternal | Handler ditemukan |
| approve | .approve, .admin approve | Admin privat | intelligence.approve | Memori / eksternal | Handler ditemukan |
| reject | .reject, .admin reject | Admin privat | intelligence.reject | Memori / eksternal | Handler ditemukan |
| send | .send | Admin privat | intelligence.getReviewItem, confirmations.issue | Memori / eksternal | Handler ditemukan |
| tasks | .tasks, .tugas, .deadline, .mytask, .progress | Pengguna | this.fun.addAssignment, this.fun.completeAssignment, this.fun.deleteAssignment, this.fun.listAssignments | State layanan lokal | Handler ditemukan |
| announce | .announce, .pengumuman | Pengguna | this.fun.createAnnouncementDraft, this.fun.listAnnouncements | State layanan lokal | Handler ditemukan |
| notes | .note, .catatan | Pengguna | this.fun.addNote, this.fun.deleteNote, this.fun.listNotes | State layanan lokal | Handler ditemukan |
| scheduler.status | .queue, .scheduler status | Admin privat | this.deps.worker.status | Reminder / BotSetting | Handler ditemukan |
| storage | .storage | Admin privat | Dispatcher | Memori / eksternal | Handler ditemukan |
| document.summary | .ringkasdokumen | Pengguna | this.deps.drive.download, router.invoke, this.deps.drive.search, this.kb.listMaterials | Drive / BotSetting | Handler ditemukan |
| document.ask | .tanyadokumen | Pengguna | this.deps.drive.download, router.invoke, this.deps.drive.search, this.kb.listMaterials | Drive / BotSetting | Handler ditemukan |
| download | .ambilmateri, .download | Pengguna | this.deps.drive.download, router.invoke, this.deps.drive.search, this.kb.listMaterials | Drive / BotSetting | Handler ditemukan |
| materials | .dokumen, .materi | Pengguna | this.deps.drive.download, router.invoke, this.deps.drive.search, this.kb.listMaterials | Drive / BotSetting | Handler ditemukan |
| materials.search | .carimateri | Pengguna | this.deps.drive.download, router.invoke, this.deps.drive.search, this.kb.listMaterials | Drive / BotSetting | Handler ditemukan |
| journal.search | .jurnal, .carijurnal, .journal, .scholar, .googlescholar, .pubmed, .garuda | Pengguna | this.fun.searchAcademicJournals, router.invoke, this.media.generatePdfDocument | State layanan lokal | Handler ditemukan |
| game | .game, .sinonim, .antonim, .anagram, .tebakemoji, .deretangka, .asahotak, .tebakpola | Pengguna | this.fun.startBankQuiz | State layanan lokal | Handler ditemukan |
| rewrite | .rapikan, .perbaiki, .rewrite, .parafrase, .koreksi | Pengguna | router.invoke | Memori / eksternal | Handler ditemukan |
| ask | .ask, .tanya, .brainly | Pengguna | this.kb.answerGroundedQuestion | Memori / eksternal | Handler ditemukan |
| ai.summarize | .summarize, .ringkas | Pengguna | Dispatcher | Memori / eksternal | Handler ditemukan |
| ai.flashcard | .flashcard | Pengguna | Dispatcher | Memori / eksternal | Handler ditemukan |
| ai.quiz | .quiz, .kuis | Pengguna | this.fun.startQuiz | State layanan lokal | Handler ditemukan |
| ai.translate | .translate, .tr | Pengguna | Dispatcher | Memori / eksternal | Handler ditemukan |
| groupgen | .kelompok, .buatkelompok | Pengguna | this.fun.getClassMembers, this.groupGen.generateFairGroups | State layanan lokal | Handler ditemukan |
| calendar | .kalender, .agenda | Pengguna | this.calendar.listEvents | Memori / eksternal | Handler ditemukan |
| countdown | .countdown | Pengguna | this.calendar.countdownDays | Memori / eksternal | Handler ditemukan |
| doc.permission | .suratizin, .doc create, .doc permission | Pengguna | this.documents.generatePermissionLetterDraft | Memori / eksternal | Handler ditemukan |
| doc.minutes | .notulensi, .doc minutes | Pengguna | this.documents.generateMinutesDraft | Memori / eksternal | Handler ditemukan |
| doc.pdf | .doc, .pdf | Pengguna | this.media.generatePdfDocument | Memori / eksternal | Handler ditemukan |
| media.sticker | .sticker, .stiker, .s, .stickerwm | Pengguna | this.media.textToSticker, this.media.imageToSticker | Memori / eksternal | Handler ditemukan |
| media.ttp | .ttp, .attp | Pengguna | this.media.textToSticker | Memori / eksternal | Handler ditemukan |
| media.toimg | .toimg | Pengguna | this.media.stickerToPng | Memori / eksternal | Handler ditemukan |
| media.effect | .blur, .invert, .grayscale, .hitamputih, .flip, .flop, .resize, .compress | Pengguna | this.media.applyImageEffect | Memori / eksternal | Handler ditemukan |
| media.quotemaker | .quotemaker, .makequote, .quotesmaker | Pengguna | this.media.generateQuoteCard | Memori / eksternal | Handler ditemukan |
| media.schedulecard | .kartujadwal, .kartuucapan | Pengguna | schedule.getForWeekday, schedule.getToday, this.media.generateScheduleCard | Seed kelas | Handler ditemukan |
| media.imagesearch | .gambar, .carigambar, .img, .image, .foto, .carifoto, .pinterest | Pengguna | this.fun.searchWebImage, this.media.normalizeSearchImage, router.invoke, this.media.generateVisualSearchCard | State layanan lokal | Handler ditemukan |
| media.qr | .qr, .qrcode | Pengguna | this.media.generateQrCodePng | Memori / eksternal | Handler ditemukan |
| media.ocr | .ocr | Pengguna | router.invoke | Memori / eksternal | Handler ditemukan |
| media.tts | .tts, .say | Pengguna | Dispatcher | Memori / eksternal | Handler ditemukan |
| util.gpa | .ipk, .gpa | Pengguna | Dispatcher | Memori / eksternal | Handler ditemukan |
| util.bmi | .bmi | Pengguna | Dispatcher | Memori / eksternal | Handler ditemukan |
| util.calc | .calc, .hitung, .kalkulator | Pengguna | this.fun.evaluateMath | State layanan lokal | Handler ditemukan |
| util.convert | .convert, .konversi, .kurs | Pengguna | this.fun.convertUnit | State layanan lokal | Handler ditemukan |
| util.clock | .jam, .waktu, .clock | Pengguna | this.fun.formatWorldClock | State layanan lokal | Handler ditemukan |
| util.weather | .cuaca, .weather | Pengguna | this.fun.getWeather | State layanan lokal | Handler ditemukan |
| util.wiki | .wiki, .wikipedia, .kbbi | Pengguna | this.fun.searchWikipedia | State layanan lokal | Handler ditemukan |
| util.urlcheck | .urlcheck, .shortlink | Pengguna | this.fun.checkUrlSafety | State layanan lokal | Handler ditemukan |
| fun.quote | .quotes, .quoterandom, .katabijak, .quotesislami, .quotesmotivasi, .quotesnasehat | Pengguna | this.fun.randomQuote | State layanan lokal | Handler ditemukan |
| fun.fact | .faktaunik | Pengguna | this.fun.randomFact | State layanan lokal | Handler ditemukan |
| fun.pantun | .pantun | Pengguna | this.fun.randomPantun | State layanan lokal | Handler ditemukan |
| fun.doa | .doaharian, .ayatkursi | Pengguna | this.fun.randomDoa | State layanan lokal | Handler ditemukan |
| fun.surah | .listsurah, .quran | Pengguna | this.fun.listSurah | State layanan lokal | Handler ditemukan |
| fun.sholat | .jadwalsholat | Pengguna | this.fun.prayerSchedule | State layanan lokal | Handler ditemukan |
| fun.truth | .truth | Pengguna | this.fun.truthOrDare | State layanan lokal | Handler ditemukan |
| fun.dare | .dare | Pengguna | this.fun.truthOrDare | State layanan lokal | Handler ditemukan |
| fun.dice | .dadu | Pengguna | this.fun.rollDice | State layanan lokal | Handler ditemukan |
| fun.coin | .koin, .flipcoin | Pengguna | this.fun.flipCoin | State layanan lokal | Handler ditemukan |
| fun.suit | .suit | Pengguna | this.fun.playSuit | State layanan lokal | Handler ditemukan |
| fun.shell | .apakah, .kapankah, .bisakah, .kerangajaib, .rate | Pengguna | this.fun.magicShell | State layanan lokal | Handler ditemukan |
| fun.quiz_start | .tebakkata, .caklontong, .family100, .mathquiz | Pengguna | this.fun.startQuiz | State layanan lokal | Handler ditemukan |
| fun.quiz_answer | .jawab | Pengguna | this.fun.answerQuiz, this.gamification.awardXp | State layanan lokal | Handler ditemukan |
| fun.quiz_giveup | .nyerah | Pengguna | this.fun.giveUpQuiz | State layanan lokal | Handler ditemukan |
| fun.text | .hilih, .alay, .besarkecil, .balikhuruf, .namaninja | Pengguna | this.fun.transformText | State layanan lokal | Handler ditemukan |
| fun.afk | .afk | Pengguna | this.fun.setAfk | State layanan lokal | Handler ditemukan |
| fun.unafk | .unafk | Pengguna | this.fun.clearAfk | State layanan lokal | Handler ditemukan |
| analytics.stats | .stats, .activity, .report | Pengguna | this.fun.formatStats | State layanan lokal | Handler ditemukan |
| gamification.leaderboard | .leaderboard, .lb, .level, .lvl | Pengguna | this.gamification.leaderboard | Memori / eksternal | Handler ditemukan |
| gamification.privacy | .privacy | Pengguna | this.gamification.setOptIn | Memori / eksternal | Handler ditemukan |
| backup | .backup, .admin backup | Admin privat | Dispatcher | Memori / eksternal | Handler ditemukan |
| audit | .audit, .admin audit | Admin privat | Dispatcher | Memori / eksternal | Handler ditemukan |
| confirm | .confirm | Admin privat | confirmations.confirm, outbound.send, intelligence.markSent | Memori / eksternal | Handler ditemukan |
| cancel | .cancel | Admin privat | confirmations.cancel | Memori / eksternal | Handler ditemukan |
| pair | .pair | Admin privat | Dispatcher | Memori / eksternal | Alur autentikasi privat |
| courses | .matkul | Pengguna | schedule.listCourses, schedule.totalCourseCreditsSks | Seed kelas | Handler ditemukan |
| lecturers | .dosen, .nomordosen, .kontakdosen | Pengguna | this.fun.formatLecturerContacts, schedule.listLecturers | State layanan lokal | Handler ditemukan |
| schedule.tomorrow | .besok, .jadwal besok | Pengguna | schedule.getTomorrow, schedule.formatDayText | Seed kelas | Handler ditemukan |
| schedule.week | .mingguini, .jadwal minggu, .jadwal mingguini | Pengguna | schedule.getForWeekday, schedule.formatDayText | Seed kelas | Handler ditemukan |
| schedule.next | .kuliahberikutnya | Pengguna | schedule.getNextSession | Seed kelas | Handler ditemukan |
| schedule.today_courses | .matkulhariini | Pengguna | schedule.listCourses, schedule.totalCourseCreditsSks | Seed kelas | Handler ditemukan |
| schedule.today_lecturers | .dosenhariini | Pengguna | this.fun.formatLecturerContacts, schedule.listLecturers | State layanan lokal | Handler ditemukan |
| schedule.today_rooms | .ruanganhariini | Pengguna | schedule.getToday | Seed kelas | Handler ditemukan |
| schedule.check_date | .cekjadwal | Pengguna | schedule.getToday | Seed kelas | Handler ditemukan |
| schedule.add | .tambahjadwal, .jadwal add, .jadwal tambah | Admin privat | Dispatcher | Memori / eksternal | Handler khusus belum ditemukan |
| schedule.edit | .editjadwal, .jadwal edit, .jadwal ubah | Admin privat | Dispatcher | Memori / eksternal | Handler khusus belum ditemukan |
| schedule.delete | .hapusjadwal, .jadwal delete, .jadwal hapus | Admin privat | Dispatcher | Memori / eksternal | Handler khusus belum ditemukan |
| schedule.reset | .resetjadwal, .jadwal reset | Admin privat | Dispatcher | Memori / eksternal | Handler khusus belum ditemukan |
| ai.status | .ai | Admin privat | router.status | Memori / eksternal | Handler ditemukan |
| groups | .groups, .group, .source, .target | Admin privat | intelligence.listSources, outbound.listAllowedGroups | Memori / eksternal | Handler ditemukan |
| group.nimbrung | .nimbrung, .nongkrong, .diam, .hening, .berhentinimbrung | Admin grup / owner | intelligence.getPrimaryGroupJid, this.fun.setNimbrung, outbound.registerAllowedGroup, outbound.send | State layanan lokal | Handler ditemukan |
| group.setpjmk | .setpjmk | Admin privat | intelligence.registerPjmkGroup, outbound.registerAllowedGroup | Memori / eksternal | Handler ditemukan |
| group.setkelasa | .setkelasa, .setnursing | Admin privat | intelligence.setPrimaryGroupJid, outbound.registerAllowedGroup | Memori / eksternal | Handler ditemukan |
| group.classify | .cekpesan, .klasifikasi | Pengguna | intelligence.evaluateMessage | Memori / eksternal | Handler ditemukan |
| filter.status | .filter, .monitor | Admin privat | intelligence.stats | Memori / eksternal | Handler ditemukan |
| digest | .digest | Admin privat | intelligence.stats | Memori / eksternal | Handler ditemukan |
| broadcast.preview | .broadcast | Admin privat | Dispatcher | Memori / eksternal | Handler khusus belum ditemukan |
| schedule | .schedule, .jadwal | Pengguna | schedule.getToday, schedule.formatDayText | Seed kelas | Handler ditemukan |
| reminders | .reminders, .reminder | Pengguna | this.deps.worker.command, this.fun.addReminder, this.fun.deleteReminder, this.fun.snoozeReminder, this.fun.listReminders | Reminder / BotSetting | Handler ditemukan |
| ai.models | .ai models | Admin privat | router.status | Memori / eksternal | Handler ditemukan |
| ai.model | .ai model, .ai pin | Admin privat | router.setMode, router.status | Memori / eksternal | Handler ditemukan |
| ai.auto | .ai unpin, .ai auto | Admin privat | router.setMode, router.status | Memori / eksternal | Handler ditemukan |
| ai.test | .ai test | Admin privat | router.invoke | Memori / eksternal | Handler ditemukan |
| drive.status | .drive status, .drive errors | Admin privat | Dispatcher | Drive / BotSetting | Handler ditemukan |
| drive.sync | .drive sync | Admin privat | this.deps.drive.sync, this.deps.drive.status | Drive / BotSetting | Handler ditemukan |
| drive.files | .drive files, .drive search | Pengguna | this.deps.drive.download, router.invoke, this.deps.drive.search, this.kb.listMaterials | Drive / BotSetting | Handler ditemukan |
| emergency.stop | .admin pause, .admin on | Admin privat | outbound.triggerEmergencyStop | Memori / eksternal | Handler ditemukan |
| emergency.resume | .admin resume, .admin off | Admin privat | outbound.clearEmergencyStop | Memori / eksternal | Handler ditemukan |
| groups.sources | .groups sources, .groups list | Admin privat | intelligence.listSources, outbound.listAllowedGroups | Memori / eksternal | Handler ditemukan |
| groups.add | .groups add, .groups set | Admin privat | intelligence.registerSourceGroup, outbound.registerAllowedGroup | Memori / eksternal | Handler ditemukan |
| groups.pause | .groups pause, .groups remove, .filter pause, .filter off | Admin privat | intelligence.pauseSourceGroup, outbound.pauseGroup | Memori / eksternal | Handler ditemukan |
| groups.resume | .groups resume, .filter resume, .filter on | Admin privat | intelligence.resumeSourceGroup, outbound.resumeGroup | Memori / eksternal | Handler ditemukan |
| filter.review | .filter review | Admin privat | intelligence.listPendingReviews | Memori / eksternal | Handler ditemukan |
| broadcast.send | .broadcast send | Admin privat | intelligence.getReviewItem, confirmations.issue | Memori / eksternal | Handler ditemukan |
| schedule.export | .jadwal export | Pengguna | schedule.getForWeekday | Seed kelas | Handler ditemukan |
| reminders.pause | .reminder pause, .reminder resume | Admin privat | this.deps.worker.pause, this.deps.worker.status | Reminder / BotSetting | Handler ditemukan |
| db.status | .db status | Admin privat | Dispatcher | Probe PostgreSQL | Handler ditemukan |
| whatsapp.status | .whatsapp status | Admin privat | Dispatcher | Memori / eksternal | Handler ditemukan |

## Penambahan 9 November

| Perintah | Perilaku | Izin / layanan |
|---|---|---|
| .relay list, lihat, kirim, tolak | Pratinjau dan keputusan persisten | Owner terautentikasi di DM; FunAndUtilityService dan OutboundGate |
| .keperawatan, .sdki, .sop, .askep, .pengkajian, .penunjang, .ukom, .kampus, .kuis ukom, .high alert, .berita, .ppni, .mtb, .download | Pencarian dan referensi sembilan kategori | HTTP publik Perawat.org; router NVIDIA untuk ringkasan |
| .tetesan, .imt, .gcs, .balance | Perhitungan dengan unit tervalidasi | Lokal; sumber Perawat.org |
| .music / .musik | Pencarian SoundCloud dan koleksi MP3 kelas | OAuth client credentials untuk hasil API, direktori pilihan owner untuk attachment |
| .game buat, gabung, keluar, mulai, stop, kategori, waktu, level, riwayat, .hint, .score, .dailychallenge | Sesi per chat, skor, aktivitas dan tantangan harian | JSON lokal dengan pembatasan pembuat sesi |
