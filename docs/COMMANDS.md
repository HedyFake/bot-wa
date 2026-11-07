# KATALOG LENGKAP PERINTAH HDYBOT (`docs/COMMANDS.md`)

> **Prefix Default:** `.`
> **Nomor Admin Utama:** `082233038659` (`+6282233038659`)
> **Password Admin:** `hedyfake` (ketika admin pertama kali chat ke bot, bot akan menanyakan password; cukup balas `hedyfake`)
> **Nomor Bot:** Bebas/Random (bisa diganti kapan saja melalui scan QR Code)

## 1. Kontrol Privat Admin & Sistem (Hanya Chat Pribadi Hedy)
| Perintah | Alias / Contoh | Fungsi |
|---|---|---|
| `.login <password>` | `.password hedyfake` | Membuka sesi kontrol admin (atau langsung balas `hedyfake` saat ditanya bot) |
| `.logout` | `.lock` | Mengunci kembali sesi admin |
| `.dashboard` | `.admin overview` | Menampilkan ringkasan lengkap status WA, AI, grup sumber, review, & kuliah berikutnya |
| `.status` | `.health`, `.system` | Pemeriksaan kesehatan (Health & Ready Check) database, WA, & NVIDIA AI |
| `.owner` | - | Menampilkan identitas owner & konfigurasi bot |
| `.ai status` | `.ai models` | Menampilkan status router NVIDIA Nemotron & 3 model (`lightning`, `super-vl`, `ultra`) |
| `.ai model <alias>` | `.ai model lightning` | Mengunci model sementara ke `lightning`, `super-vl`, atau `ultra` |
| `.ai auto on\|off` | `.ai unpin` | Mengembalikan router AI ke mode otomatis atau mematikannya |
| `.ai test <prompt>` | - | Menguji panggilan langsung ke endpoint NVIDIA API |
| `.groups` | `.groups sources`, `.source list` | Melihat daftar grup sumber yang dipantau |
| `.groups add <jid> <nama>` | `.source add` | Mendaftarkan grup sumber baru ke allowlist |
| `.groups pause <jid>` | `.monitor off` | Menjeda pemantauan & pengiriman grup |
| `.groups resume <jid>` | `.monitor on` | Melanjutkan pemantauan & pengiriman grup |
| `.pending` | `.filter review` | Menampilkan antrean pesan penting yang menunggu persetujuan Hedy |
| `.approve <id>` | `.approve REV-1` | Menyetujui item antrean review |
| `.reject <id> <alasan>` | `.reject REV-1 duplikat` | Menolak item antrean review |
| `.send <id>` | `.broadcast send <id>` | Meminta nonce konfirmasi pengiriman pengumuman ke grup utama |
| `.confirm <nonce>` | `.cancel <nonce>` | Mengonfirmasi atau membatalkan aksi sensitif dengan one-time nonce |
| `.admin pause` | - | **Emergency Stop**: menghentikan seketika seluruh pengiriman keluar ke grup |
| `.admin resume` | - | Menonaktifkan Emergency Stop |
| `.audit` | `.logs`, `.errors` | Menampilkan 10 entri jejak audit terbaru |
| `.backup` | - | Menampilkan status sistem backup terenkripsi |

## 2. Jadwal Kuliah, Dosen, & Akademik Kelas 5A
| Perintah | Contoh | Fungsi |
|---|---|---|
| `.jadwal` | `.schedule` | Menampilkan jadwal kuliah hari ini (Asia/Jakarta) |
| `.jadwal <hari>` | `.jadwal senin` | Menampilkan jadwal hari Senin–Jumat |
| `.besok` | `.jadwal besok` | Menampilkan jadwal kuliah besok |
| `.mingguini` | `.jadwal minggu` | Menampilkan jadwal lengkap Senin–Jumat |
| `.kuliahberikutnya` | - | Menampilkan sesi kuliah terdekat berikutnya |
| `.jadwal export` | `.jadwal export csv` | Mengekspor jadwal Kelas 5A ke format CSV atau JSON |
| `.matkul` | `.matkulhariini` | Menampilkan daftar 7 mata kuliah Semester 5A (22 SKS unik) |
| `.dosen [filter]` | `.dosen metpen` | Menampilkan daftar tim dosen pengampu per mata kuliah |
| `.kelas` | `.semester`, `.tahunajaran` | Menampilkan profil kelas Nursing Class A Semester 5A |
| `.pengurus` | `.ketuakelas`, `.sekretaris`, `.bendahara`, `.wali` | Menampilkan struktur pengurus kelas & dosen wali |
| `.anggota` | - | Menampilkan info keanggotaan kelas |
| `.rules` | `.faq`, `.profile`, `.me` | Menampilkan aturan grup, FAQ, dan profil pengirim |
| `.kalender` | `.countdown 2026-12-20` | Menampilkan kalender akademik & hitung mundur tanggal |
| `.buatkelompok <jml> <nama1,nama2,...>` | `.kelompok 3 Ani,Budi,Cici` | Membagi anggota ke kelompok secara adil beserta ketua kelompok |

## 3. Tugas, Pengingat, Pengumuman, Catatan, & Materi
| Perintah | Contoh | Fungsi |
|---|---|---|
| `.tugas` | `.deadline`, `.mytask`, `.progress` | Menampilkan daftar tugas & deadline aktif |
| `.tugas add <matkul>\|<judul>\|<tgl>\|<ket>` | `.tugas add Metpen\|Bab 1\|2026-11-20\|PDF` | Menambahkan tugas baru |
| `.tugas done <id>` | `.tugas done TUG-1` | Menandai tugas selesai |
| `.tugas del <id>` | `.tugas del TUG-1` | Menghapus tugas |
| `.reminder` | `.reminder settings` | Menampilkan daftar pengingat aktif & pengaturan offset |
| `.reminder add <waktu>\|<judul>` | `.reminder add 2026-11-15 07:30\|Kumpul Askep` | Menambahkan pengingat kustom |
| `.reminder snooze <id> <menit>` | `.reminder snooze REM-1 15` | Menunda pengingat |
| `.reminder delete <id>` | `.reminder delete REM-1` | Membatalkan pengingat |
| `.announce draft <prio>\|<judul>\|<isi>` | `.announce draft penting\|Info Kuliah\|Pindah ruang` | Membuat draft pengumuman kelas |
| `.note add <judul>\|<isi>` | `.note list`, `.note del NOTE-1` | Menyimpan dan menampilkan catatan kelas |
| `.materi` | `.carimateri gerontik` | Menampilkan katalog materi kuliah & referensi resmi SHJ |

## 4. AI Study Assistant & Generator Dokumen
| Perintah | Contoh | Fungsi |
|---|---|---|
| `.ask <pertanyaan>` | `.ask tahapan proses keperawatan` | Tanya jawab materi keperawatan berbasis sumber resmi |
| `.summarize <teks>` | `.ringkas <teks>` | Meringkas teks materi atau pesan yang dibalas |
| `.flashcard <topik>` | `.flashcard gerontik` | Membuat kartu belajar tanya-jawab |
| `.quiz <topik>` | `.kuis keperawatan` | Memulai kuis latihan belajar |
| `.translate <bhs> <teks>` | `.translate en Asuhan Keperawatan` | Menerjemahkan teks akademik |
| `.suratizin <nama>\|<matkul>\|<tgl>\|<alasan>` | - | Membuat draft surat izin tidak mengikuti kuliah |
| `.notulensi <judul>\|<tgl>\|<keputusan1;keputusan2>` | - | Membuat draft notulensi rapat kelas |
| `.doc pdf <judul>\|<isi1;isi2>` | `.pdf Laporan\|Poin 1; Poin 2` | Menghasilkan file dokumen PDF berlabel DRAFT |

## 5. Media, Stiker, Efek Gambar, QR Code, OCR, & TTS
| Perintah | Contoh | Fungsi |
|---|---|---|
| `.sticker` | `.stiker`, `.s` | Mengubah gambar yang dikirim/dibalas menjadi stiker WhatsApp WebP 512x512 |
| `.ttp <teks>` | `.ttp Semangat 5A` | Membuat stiker WhatsApp WebP 512x512 dari teks |
| `.toimg` | - | Mengubah stiker yang dibalas menjadi gambar PNG |
| `.blur`, `.invert`, `.grayscale` | `.hitamputih`, `.flip`, `.flop`, `.resize`, `.compress` | Memproses efek gambar dengan `sharp` |
| `.quotemaker <kutipan>\|<penulis>` | `.quotemaker Merawat dengan hati\|Hedy` | Membuat gambar kartu kutipan PNG |
| `.kartujadwal [hari]` | `.kartujadwal senin` | Membuat gambar kartu jadwal kuliah PNG |
| `.qr <teks/url>` | `.qrcode https://shj.ac.id` | Membuat gambar QR Code PNG |
| `.ocr` | - | Mengekstrak teks dari gambar menggunakan NVIDIA Vision |
| `.tts <teks>` | `.say Halo Kelas 5A` | Mengubah teks menjadi format pesan suara/teks |

## 6. Utilitas & Hiburan Aman (Porting Akira)
| Perintah | Contoh | Fungsi |
|---|---|---|
| `.cuaca <kota>` | `.cuaca Jakarta` | Informasi suhu, kelembapan, & kecepatan angin saat ini |
| `.wiki <topik>` | `.kbbi anamnesis` | Pencarian ringkasan Wikipedia Bahasa Indonesia |
| `.calc <ekspresi>` | `.calc (120*3)/4+10` | Kalkulator matematika aman |
| `.convert <nilai> <dari> <ke>` | `.convert 38 c f`, `.convert 100 usd idr` | Konversi suhu, panjang, berat, & kurs referensi |
| `.jam` | `.waktu` | Waktu WIB, WITA, WIT, dan UTC saat ini |
| `.bmi <kg> <cm>` | `.bmi 55 162` | Kalkulator BMI edukatif |
| `.ipk <sks:bobot,...>` | `.ipk 4:4.0, 3:3.5` | Kalkulator IP/IPK |
| `.urlcheck <url>` | `.shortlink https://shj.ac.id` | Pemeriksaan keamanan URL/domain dengan SSRF Guard |
| `.quotes`, `.quotesislami`, `.quotesmotivasi` | `.katabijak`, `.faktaunik`, `.pantun` | Kutipan inspiratif, fakta sains/kesehatan, & pantun |
| `.doaharian`, `.listsurah`, `.jadwalsholat` | `.jadwalsholat Surabaya` | Doa belajar/klinik, daftar surah pilihan, & jadwal sholat |
| `.tebakkata`, `.caklontong`, `.family100`, `.mathquiz` | `.jawab <jawaban>`, `.nyerah` | Kuis interaktif di ruang chat (+15 XP bila benar) |
| `.truth`, `.dare`, `.dadu`, `.koin`, `.suit` | `.suit batu`, `.kerangajaib <tanya>`, `.rate <hal>` | Permainan interaktif ringan & aman |
| `.hilih`, `.alay`, `.besarkecil`, `.balikhuruf`, `.namaninja` | `.hilih selamat pagi` | Transformasi teks kreatif |
| `.stats`, `.report [week\|month\|semester]` | `.leaderboard`, `.privacy gamification on\|off`, `.afk` | Statistik kelas, papan peringkat XP opt-in, & status AFK |
