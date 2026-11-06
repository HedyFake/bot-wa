# Nursing Class A — AI WhatsApp Class Assistant

Blueprint dokumentasi dan prompt rekayasa untuk membangun bot WhatsApp yang dikendalikan melalui chat pribadi admin. Bot menggunakan NVIDIA Nemotron sebagai otak AI dengan pemilihan model otomatis berdasarkan jenis pekerjaan.

> **Status:** blueprint / spesifikasi untuk coding agent. Ini bukan aplikasi siap jalan dan belum menghubungkan WhatsApp atau NVIDIA.

## Tujuan utama

- Admin mengontrol sistem lewat chat pribadi WhatsApp, bukan dashboard web sebagai kontrol utama.
- AI mengumpulkan, memilah, memvalidasi, menyimpan, dan merangkum informasi akademik.
- Informasi penting dari grup sumber dapat disiapkan dan diteruskan ke grup utama **Nursing Class A** setelah melewati aturan verifikasi.
- Jadwal Semester 5A, mata kuliah, dosen, tugas, materi, pengumuman, kalender, reminder, dan statistik dikelola dalam satu database.
- NVIDIA Nemotron Ultra, Super-VL, dan Lightning dipilih otomatis per pesan / tugas.
- Semua tindakan berisiko memiliki izin, konfirmasi, idempotensi, dan audit log.

## Mulai membaca

1. `MASTER_PROMPT.md` — instruksi utama untuk coding agent.
2. `docs/00_PROJECT_BRIEF.md` — tujuan, batasan, pengguna, dan hasil akhir.
3. `docs/01_AUDIT_AKIRA_REFERENCE.md` — hasil audit ZIP Akira Bot dan keputusan rebuild.
4. `docs/02_SYSTEM_ARCHITECTURE.md` — arsitektur keseluruhan.
5. `docs/03_WHATSAPP_CONNECTOR.md` dan `docs/04_PRIVATE_ADMIN_CONTROL.md` — integrasi WhatsApp + kontrol admin pribadi.
6. `docs/06_NVIDIA_MODELS_AND_ROUTER.md` — NVIDIA API dan router otomatis tiga model.
7. `docs/08_GROUP_INTELLIGENCE.md` — penyaring chat dan distribusi informasi.
8. `docs/10_CLASS_5A_SCHEDULE.md`, `docs/11_COURSES_AND_LECTURERS.md` — data awal kelas.
9. `docs/16_COMMAND_CATALOG.md` — katalog command.
10. `docs/18_TESTING_ACCEPTANCE.md` dan `docs/20_IMPLEMENTATION_ROADMAP.md` — pengujian dan urutan pengerjaan.

## Keputusan desain yang tidak boleh diubah tanpa alasan

- **Primary control plane:** private WhatsApp chat admin.
- **Primary announcement destination:** grup Nursing Class A, dikonfigurasi dengan Group JID setelah admin memasangnya.
- **Timezone:** `Asia/Jakarta`.
- **Locale:** Bahasa Indonesia (`id-ID`).
- **Data store:** PostgreSQL; Redis + BullMQ untuk pekerjaan terjadwal dan antrean.
- **Runtime:** Node.js LTS yang masih didukung, TypeScript, OpenAI SDK dengan NVIDIA base URL.
- **Model router:** `auto` secara default. Semua model dapat dipilih per tugas dan dapat fallback dengan pemeriksaan kompatibilitas.
- **Sumber data:** data yang diberikan admin, sumber resmi kampus, dan pesan grup yang memang telah diizinkan untuk diproses harus dibedakan berdasarkan provenance.
- **No hallucinated announcements:** AI tidak boleh menciptakan perubahan jadwal, tugas, instruksi dosen, atau pengumuman.
- **Human approval:** perubahan akademik dan broadcast penting perlu persetujuan admin, kecuali admin secara eksplisit mengaktifkan kebijakan otomatis yang sempit dan dapat diaudit.
- **No exposed secrets:** API key, session WhatsApp, bootstrap secret, dan password tidak pernah masuk Git, log, prompt, atau dokumen.

## Keamanan kredensial yang sudah muncul di percakapan

Kredensial NVIDIA yang ditempel ke percakapan harus diperlakukan sebagai **sudah terekspos**. Cabut/revoke key tersebut di NVIDIA dan buat key baru. Jangan menyalin nilai key lama ke `.env`, source code, atau dokumen.

Kata sandi admin yang disebutkan juga jangan dipakai kembali: nilainya sudah terekspos dan terlalu mudah ditebak. Gunakan bootstrap secret acak yang hanya berlaku sekali, atau password baru yang kuat. Blueprint ini sengaja **tidak menyimpan nilai password atau API key**.

Isi `.env.example` hanya placeholder. Simpan nilai riil pada `.env` di server dengan permission ketat atau secret manager.

## Catatan WhatsApp

Library Baileys adalah integrasi WhatsApp Web pihak ketiga yang tidak resmi dan tidak berafiliasi dengan WhatsApp. Mengotomatisasi akun personal atau mengirim pesan otomatis dapat menimbulkan risiko pembatasan akun dan harus diperiksa terhadap Terms of Service dan kebijakan yang berlaku. Jangan gunakan bot untuk spam, pesan massal, scraping yang tidak diizinkan, atau membaca grup tanpa persetujuan. Rancang connector abstraction agar provider resmi dapat menggantikan adapter tanpa mengubah business logic.

Referensi: [WhatsApp Terms of Service](https://www.whatsapp.com/legal/terms-of-service), [WhatsApp Messaging Guidelines](https://www.whatsapp.com/legal/messaging-guidelines), [Baileys GitHub](https://github.com/WhiskeySockets/Baileys), [Baileys Wiki](https://baileys.wiki/).

## Paket isi

- `MASTER_PROMPT.md` dan `prompts/` berisi instruksi yang dapat diberikan ke coding agent.
- `docs/` berisi spesifikasi tiap domain.
- `data/` berisi data seed kelas 5A yang harus tetap berstatus awal / perlu verifikasi untuk detail yang belum resmi.
- `.env.example` berisi nama variabel konfigurasi tanpa kredensial.

## Cara menggunakan dengan coding agent

Unggah seluruh folder / ZIP ini. Tempel `MASTER_PROMPT.md` terlebih dahulu. Minta agent membaca semua dokumen, membuat audit checklist, lalu mengimplementasikan **Phase 0 dan Phase 1** terlebih dahulu. Jangan meminta agent membuat semua fitur sekaligus dalam satu perubahan besar. Setiap fase harus disertai file nyata, migrasi, test, dan instruksi menjalankan.
