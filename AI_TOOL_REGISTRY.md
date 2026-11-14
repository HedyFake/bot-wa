# Registri tool AI HdyBot

## Fase 2 · Integrasi fitur lama

| Fungsi | Operasi | Ruang akses |
| --- | --- | --- |
| `assignment_list` | Filter daftar menurut status, judul, mata kuliah, ID, hari ini atau minggu ini | Memakai `visibleAssignments` seperti `.tugas`. Pemeriksaan owner dilakukan saat dibaca. |
| `chat_notes` | Cari ID dan judul catatan | Chat sekarang. Untuk catatan lama, DM pembuat. |
| `chat_reminders` | Baca hingga 30 jadwal pengingat aktif | Chat tujuan dari dispatcher. Memakai worker PostgreSQL bila terpasang atau penyimpanan lokal. |
| `academic_calendar`, `days_until` | Baca kalender beserta status verifikasi, hitung hari menuju tanggal yang valid | Kalender kelas dan waktu WIB. |
| `math_calculator`, `unit_conversion` | Hitung aritmetika atau konversi satuan | Evaluator lokal dengan daftar operator dan satuan yang ditentukan. |
| `game_progress` | Baca petunjuk ronde atau XP pengirim | ID grup dan pengirim diambil dari pesan WhatsApp. |
| `command_guide` | Cari sintaks dan alias pada menu yang tersedia | Admin, Drive dan akses tulis jadwal mengikuti `availableSections`. Fungsi ini hanya mengembalikan petunjuk. |

Daftar berpaginasi memuat sepuluh item per halaman. Hasil fungsi disaring sebelum dikirim ke OpenAI atau disertakan untuk jawaban cadangan NVIDIA. Permintaan lampiran PDF sederhana, QR dan kartu jadwal yang eksplisit memanggil generator dan jalur pengiriman yang sudah ada. [Layanan dan validator](src/ai/existing-feature-tools.ts) · [Pengenalan permintaan lampiran](src/admin/commands/intent.ts)

## Fase 1 · Tool Responses yang terpasang

| Fungsi | Sumber dan hasil | Izin |
| --- | --- | --- |
| `class_schedule` | ScheduleService, hari dan jadwal WIB sesuai kelas aplikasi | Baca, anggota |
| `class_courses` | ScheduleService, kode, nama, SKS | Baca, anggota |
| `nursing_calculator` | nursingCalculation, hasil IMT, GCS, tetesan atau balance beserta satuan | Hitung, anggota |
| `bot_runtime` | Status adapter WhatsApp dan uptime proses | Baca, DM admin yang lolos otorisasi |

Aplikasi membentuk daftar fungsi untuk setiap pesan. Role dan tujuan chat berasal dari dispatcher. Validator menolak argumen tambahan. Tool monitoring mengecek kembali izin saat dipanggil. Log audit menyimpan nama tool, aktor dan hasil tanpa menyalin argumen atau isi balasan. Tindakan pengiriman, penulisan, login dan persetujuan tetap memakai alur perintah masing-masing. [Definisi fungsi](src/ai/tool-registry.ts) · [Loop Responses](src/ai/openai/luna.ts)

## Baseline sebelum perubahan Fase 1

Transport OpenAI saat ini mengirim pesan ke Chat Completions dan membaca satu teks. Pemilihan model dan fallback ada di ModelRouter. Pengenal maksud mengirim daftar menu yang terlihat, mencoba membaca JSON balasan lalu memvalidasi keputusan dengan parser dan kebijakan aplikasi. Tool function Responses yang terdaftar pada runtime: **0**. Jumlah 147 pada katalog adalah handler aplikasi. Keduanya dihitung terpisah. [Transport](src/ai/openai/luna.ts) · [Penentuan maksud](src/admin/commands/intent.ts) · [Peta handler per perintah](AUDIT.md#pencocokan-menu-dan-handler)

| Kelompok dalam spesifikasi | Layanan yang sudah terlihat | Syarat sebelum ditawarkan lewat function calling |
| --- | --- | --- |
| ACADEMIC | ScheduleService, tugas dan deadline | Ambil kelas dan chat dari konteks server. Bedakan operasi baca dan tulis. |
| NURSING | perawatAnswer dan sumber Perawat.org | Tautkan kutipan ke dokumen dan status verifikasi. |
| RESEARCH | Pencarian jurnal di FunAndUtilityService | Belum ada workflow PICO, appraisal dan sintesis yang tervalidasi. |
| JOURNAL | searchAcademicJournals dan PDF katalog hasil | Perlukan ID stabil, deduplikasi, provenance dan pemeriksaan hak full-text. |
| LMS | LmsService | Identitas pemilik dari WA. Login, cookie dan password tetap di jalur privat. Kutipan ke AI membutuhkan consent. |
| GOOGLE_DRIVE | DriveCatalog | Periksa allowlist chat, keanggotaan folder, izin file, ukuran dan MIME pada penggunaan. |
| DOCUMENT | MediaService, extractSections | PDF sederhana dan ekstraksi sebagian format tersedia. DOCX makalah editable memerlukan generator dan validator. |
| PRESENTATION | Unduhan PPT/PPTX dan ekspor Slides | Generator presentasi dengan notes, rendering dan revisi belum ditemukan. |
| STUDY | Flashcard, kuis dan ringkasan | Perlu identitas dan penyimpanan progres terpisah untuk spaced repetition. |
| OSCE | Belum ditemukan layanan simulasi terstruktur | Perlu kasus fiktif, rubrik dan sumber yang ditinjau. |
| CLINICAL_CALCULATOR | nursingCalculation dan UtilityService | Tool hanya menerima input terstruktur, unit dan rentang. Angka akhir dihitung layanan deterministik. |
| GAME | FunAndUtilityService dan bank soal | Ikat sesi ke chat. Uji host, skor dan restart. |
| MEDIA | MediaService, OCR dan TTS | Validasi lampiran, batas proses, timeout dan pembersihan. |
| UTILITY | Kalkulator, kalender, waktu, sumber publik | Batasi argumen. Cegah model memilih URL, proses atau path bebas. |
| ADMIN | AdminAuthenticator dan ConfirmationManager | Otorisasi ulang saat eksekusi. Nonce dan tujuan persetujuan dipegang server. |
| MONITORING | Health, Monitor, worker status | DM admin, ringkas data dan redaksi secret. |
| RECOVERY | Reconnect dan retry internal | Restart proses utama, restore dan deployment perlu persetujuan owner. |
| KNOWLEDGE | KnowledgeBaseService dan retrieval materi | Perlu ruang akses, verifikasi sumber, persetujuan, versi dan retensi persisten. |

## Kontrak untuk implementasi berikutnya

Setiap entri mendeklarasikan nama, deskripsi, JSON Schema, validator runtime, ruang data, role, efek, timeout, kebijakan retry dan bentuk hasil. Executor memperoleh aktor dan chat dari adapter. Model hanya menerima tool yang sesuai konteks. Executor mengulang pemeriksaan objek tepat sebelum baca atau tulis. Operasi mutasi menjurnal ID permintaan dan hasil yang dapat diperiksa setelah restart.

Untuk rute baca pertama, usulan `get_schedule` menerima tanggal lokal ISO atau hari yang tervalidasi. Konteks kelas berasal dari server. Hasil memuat status, sesi, sumber dan waktu pembacaan. Untuk pengiriman dokumen, hasil pencarian mengembalikan ID terbatas pada pemilik. Pengiriman ulang memeriksa izin dan mengembalikan status adapter. Model hanya mengumumkan hasil sesuai status itu.

Di Responses, aplikasi memproses item `function_call`, memvalidasi argumen, mengeksekusi layanan lalu memasangkan `function_call_output` dengan `call_id`. Gunakan schema strict yang didukung, batas jumlah panggilan, batas waktu dan anggaran. Keluarkan operasi yang memerlukan approval dari eksekusi paralel bebas. Pengujian minimum mencakup nama tool palsu, ID lintas akun, hasil berisi instruksi, loop, timeout, kegagalan setelah kirim dan hilangnya koneksi. [Panduan function calling OpenAI](https://developers.openai.com/api/docs/guides/function-calling) · [Migrasi ke Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses)
