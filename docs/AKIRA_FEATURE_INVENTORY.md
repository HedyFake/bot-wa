# INVENTARIS FITUR AKIRA (`akirabotv1-main.zip`) & STATUS PORTING HDYBOT

> **Sumber Audit:** `akirabotv1-main.zip` (60 file, entrypoint `index.js` + monolit `akirabot.js` 409.310 byte / 7.363 baris, 623 deklarasi `case`, 583 label `case` unik, target Node.js v12, `@adiwajshing/baileys@^3.3.0`).
> **Peringatan Keamanan:** Seluruh API key hardcoded di arsip Akira (`lolhuman`, `vhtear`, `onlydevcity`, `tobz`, `zeks`, `xteam`) diperlakukan sebagai **TEREKSPOS & USANG** dan **TIDAK PERNAH** disalin ke HdyBot.

## 1. Tabel Inventaris Fitur Utama Akira (`ID | Fitur Akira | Fungsi | Status | Rencana HdyBot`)

| ID | Fitur Akira | Fungsi | Status | Rencana HdyBot |
|---|---|---|---|---|
| A001 | `help`, `menu`, `allmenu` | Menampilkan daftar perintah bot | Perlu rewrite | Diimplementasikan di `.menu` & `.help` (Mega Command Menu terstruktur) |
| A002 | `ping`, `runtime`, `info`, `ingfo` | Cek kecepatan respons, waktu aktif, dan info bot | Bisa dipakai (rewrite TS) | Diimplementasikan di `.ping`, `.runtime`, `.info`, `.about`, `.status`, `.health` |
| A003 | `owner`, `creator`, `admin` | Menampilkan identitas pemilik bot | Bisa dipakai (rewrite TS) | Diimplementasikan di `.owner` (Hedy `082233038659`, password `<password admin dari konfigurasi>`) |
| A004 | `sticker`, `stiker`, `s`, `stickerwm` | Konversi gambar ke stiker WhatsApp WebP | Perlu rewrite (`sharp`) | Diimplementasikan di `MediaService.imageToSticker` (`.sticker`, `.stiker`, `.s`) |
| A005 | `ttp`, `attp` | Membuat stiker dari teks berwarna | Perlu rewrite (`sharp` SVG) | Diimplementasikan di `MediaService.textToSticker` (`.ttp <teks>`) |
| A006 | `toimg` | Mengubah stiker WebP menjadi gambar PNG | Perlu rewrite (`sharp`) | Diimplementasikan di `MediaService.stickerToPng` (`.toimg`) |
| A007 | `blur`, `invert`, `grayscale`, `flip`, `flop` | Efek manipulasi gambar | Perlu rewrite (`sharp`) | Diimplementasikan di `MediaService.applyImageEffect` (`.blur`, `.invert`, `.grayscale`, `.flip`, `.flop`, `.resize`, `.compress`) |
| A008 | `quotemaker`, `makequote`, `quotesmaker` | Membuat kartu gambar kutipan | Perlu rewrite (`sharp` SVG) | Diimplementasikan di `MediaService.generateQuoteCard` (`.quotemaker <teks>\|<penulis>`) |
| A009 | `qrcode` | Membuat gambar QR Code dari teks/tautan | Perlu rewrite (`qrcode`) | Diimplementasikan di `MediaService.generateQrCodePng` (`.qr <teks/url>`) |
| A010 | `ocr` | Membaca teks dari gambar (Optical Character Recognition) | Perlu rewrite | Diimplementasikan di `.ocr` menggunakan NVIDIA Nemotron `super-vl` Vision + fallback |
| A011 | `tts`, `say`, `texttovn` | Mengubah teks menjadi pesan suara/teks terformat | Perlu rewrite | Diimplementasikan di `.tts` / `.say` |
| A012 | `wikipedia`, `kbbi`, `brainly` | Pencarian ensiklopedia dan tanya jawab belajar | Perlu rewrite | Diimplementasikan di `.wiki <topik>`, `.kbbi <kata>`, dan `.ask <pertanyaan>` |
| A013 | `translate` | Penerjemah bahasa | Perlu rewrite | Diimplementasikan di `.translate <kode_bhs> <teks>` |
| A014 | `quotes`, `quoterandom`, `katabijak` | Kutipan bijak acak | Bisa dipakai (rewrite TS) | Diimplementasikan di `.quotes` dan `.katabijak` |
| A015 | `quotesislami`, `quotesmotivasi`, `quotesnasehat` | Kutipan Islami dan motivasi belajar | Bisa dipakai (rewrite TS) | Diimplementasikan di `.quotesislami`, `.quotesmotivasi`, `.quotesnasehat` |
| A016 | `faktaunik`, `pantun` | Fakta sains/kesehatan unik & pantun | Bisa dipakai (rewrite TS) | Diimplementasikan di `.faktaunik` dan `.pantun` |
| A017 | `quran`, `listsurah`, `doaharian`, `jadwalsholat`, `ayatkursi` | Referensi ibadah harian & jadwal sholat | Bisa dipakai (rewrite TS) | Diimplementasikan di `.listsurah`, `.quran`, `.doaharian`, `.jadwalsholat` |
| A018 | `truth`, `dare`, `dadu` | Permainan interaktif ringan & aman | Bisa dipakai (rewrite TS) | Diimplementasikan di `.truth`, `.dare`, `.dadu`, `.koin`, `.suit` |
| A019 | `apakah`, `kapankah`, `bisakah`, `rate` | Permainan Kerang Ajaib & rating | Bisa dipakai (rewrite TS) | Diimplementasikan di `.apakah`, `.kapankah`, `.bisakah`, `.kerangajaib`, `.rate` |
| A020 | `tebakgambar`, `caklontong`, `family100` | Kuis interaktif grup/chat | Perlu rewrite | Diimplementasikan di `.tebakkata`, `.caklontong`, `.family100`, `.mathquiz`, `.jawab`, `.nyerah` |
| A021 | `hilih`, `alay`, `besarkecil`, `namaninja` | Generator transformasi teks kreatif | Bisa dipakai (rewrite TS) | Diimplementasikan di `.hilih`, `.alay`, `.besarkecil`, `.balikhuruf`, `.namaninja` |
| A022 | `level`, `lvl`, `leaderboard`, `lb`, `leveling` | Sistem XP dan papan peringkat | Perlu rewrite (opt-in) | Diimplementasikan di `GamificationService` (`.leaderboard`, `.privacy gamification on\|off`) |
| A023 | `afk`, `unafk` | Penanda status sedang tidak aktif (AFK) | Perlu rewrite | Diimplementasikan di `.afk <alasan>` dan `.unafk` |
| A024 | `rules`, `grouplist`, `linkgc`, `listadmin` | Informasi aturan grup dan daftar grup | Perlu rewrite | Diimplementasikan di `.rules`, `.groups`, `.groupid`, `.pengurus` |
| A025 | `shortlink`, `bitly`, `cuttly`, `ssweb` | Pemeriksaan URL & tautan | Perlu rewrite (SSRF guard) | Diimplementasikan di `.urlcheck <url>` dengan proteksi SSRF (`validateSafeExternalUrl`) |
| A026 | `nsfw*`, `hentai`, `xnxx*`, `xhamster*`, `pornhub`, `ero*`, `loli*` | Konten dewasa / pornografi / NSFW (~35 command) | **TIDAK AMAN (EXCLUDED)** | **Diblokir permanen** — melanggar hukum, etika akademik, dan kebijakan WhatsApp |
| A027 | `spamsms`, `spamtext`, `kickall`, `bc`, `bcgc` | Spam SMS/WA massal & penghapusan seluruh anggota | **TIDAK AMAN (EXCLUDED)** | **Diblokir permanen** — berisiko banned akun WhatsApp & penyalahgunaan |
| A028 | `infonomor`, `stalkig`, `tiktokstalk`, `ktpmaker`, `clone` | Doxxing, pelacakan privasi, dan pemalsuan identitas KTP | **TIDAK AMAN (EXCLUDED)** | **Diblokir permanen** — melanggar privasi dan keamanan data pribadi |
| A029 | `ytmp3`, `ytmp4`, `igdl`, `fbdl`, `tiktoknowm`, `jooxplay`, `lk21` | Pengunduh media berhak cipta via API pihak ketiga mati | **BLOCKED / EXCLUDED** | Dinonaktifkan karena endpoint Heroku/pihak ketiga lama sudah mati & melanggar hak cipta |
| A030 | `setapikey*` (`vhtear`, `lolhuman`, `onlydev`) | Pengaturan API key hardcoded di chat | **TIDAK AMAN (EXCLUDED)** | Diganti penuh dengan manajemen secret `.env` + redaksi otomatis Pino logger |
