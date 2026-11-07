# AUDIT FITUR LEGACY AKIRA (`docs/LEGACY_FEATURE_AUDIT.md`)

Dokumen ini mengelompokkan seluruh temuan audit terhadap `akirabotv1-main.zip` (583 label `case` unik di `akirabot.js`) menjadi 4 kategori sesuai `HdyBot_MASTER_PROMPT.md` dan `HdyBot_IMPLEMENTATION_PLAN.md`.

## 1. Port Aman (Diimplementasikan Ulang dengan TypeScript Modern)
- **Menu & Diagnostik**: `.menu`, `.help`, `.ping`, `.runtime`, `.info`, `.about`, `.status`, `.health`, `.owner`, `.id`, `.groupid`.
- **Media & Stiker (`sharp`)**: `.sticker`, `.stiker`, `.s`, `.ttp`, `.toimg`, `.blur`, `.invert`, `.grayscale` (`.hitamputih`), `.flip`, `.flop`, `.resize`, `.compress`, `.quotemaker`, `.kartujadwal`.
- **QR Code & Dokumen (`qrcode`, `pdf-lib`)**: `.qr`, `.qrcode`, `.doc pdf`, `.suratizin`, `.notulensi`.
- **OCR & TTS**: `.ocr` (via NVIDIA `super-vl`), `.tts`, `.say`.
- **Utilitas & Edukasi**: `.calc`, `.convert`, `.jam`, `.cuaca`, `.wiki`, `.kbbi`, `.translate`, `.bmi`, `.ipk`, `.urlcheck`.
- **Kutipan, Ibadah, & Permainan Aman**: `.quotes`, `.quotesislami`, `.quotesmotivasi`, `.faktaunik`, `.pantun`, `.doaharian`, `.listsurah`, `.jadwalsholat`, `.truth`, `.dare`, `.dadu`, `.koin`, `.suit`, `.apakah`, `.kapankah`, `.bisakah`, `.kerangajaib`, `.rate`, `.tebakkata`, `.caklontong`, `.family100`, `.mathquiz`, `.jawab`, `.nyerah`, `.hilih`, `.alay`, `.besarkecil`, `.balikhuruf`, `.namaninja`, `.afk`, `.unafk`.

## 2. Bangun Ulang dari Nol dengan Arsitektur Modern
- **Koneksi WhatsApp**: `WWebJsWhatsAppProvider` (`whatsapp-web.js` + `qrcode-terminal` + Google Chrome Stable `.deb`) dengan nomor bot dinamis/random dan verifikasi nomor admin `082233038659` + password `hedyfake`.
- **Database**: PostgreSQL + Prisma ORM (21 model) + state runtime persisten.
- **AI Router**: NVIDIA Nemotron (`lightning`, `super-vl`, `ultra`) dengan circuit breaker dan fallback deterministik.
- **Group Intelligence & Approval**: Klasifikasi pesan grup sumber, antrean `.pending`, `.approve`, `.reject`, `.send` + nonce satu kali `.confirm`.

## 3. Perlu Validasi Manual / Opsional Eksternal
- Endpoint cuaca (`open-meteo.com`) dan Wikipedia (`id.wikipedia.org`) memiliki fallback otomatis bila server berjalan tanpa koneksi internet luar.

## 4. Jangan Port (Diblokir Permanen — Keamanan, Etika, & Kepatuhan)
- **Konten NSFW/Dewasa**: `nsfw*`, `hentai`, `xnxx*`, `xhamster*`, `pornhub`, `ero*`, `loli*`, `nekopoi`, `randomhentai*`.
- **Spam & Perusakan Grup**: `spamsms`, `spamtext`, `kickall`, `bc` (broadcast tanpa izin).
- **Pelanggaran Privasi & Pemalsuan Dokumen**: `ktpmaker`, `infonomor`, `stalkig`, `clone`.
- **Pembajakan Konten**: `lk21`, `moddroid`, `happymod`.
