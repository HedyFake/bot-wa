# HdyBot — Implementation Status

Owner: **Hedy** (`+6282233038659`) · Kelas: **Nursing Class A (Semester 5A)** · Timezone: `Asia/Jakarta` · Bahasa: `id-ID`

Terakhir diperbarui: 2026-11-06

---

## Ringkasan Progres Fase

- [x] **Phase 0 — Audit**: Selesai. Blueprint (`blueprint/`) dan referensi Akira diperiksa; tidak ada secret di repo.
- [x] **Phase 1 — Fondasi**: Selesai. TypeScript strict, Zod config validation, Pino logger dengan redaksi secret, Prisma schema + migration SQL + trigger append-only `AuditLog`, HTTP health server (`/health/live`, `/health/ready`).
- [x] **Phase 2 — WhatsApp Private Admin Console**: Selesai. `AdminAuthenticator` (DM-only allowlist E.164/JID, grup ditolak sebagai admin, bootstrap pairing 1x dengan scrypt timing-safe, expiry, brute-force rate limit, pencabutan sesi), `ConfirmationManager` (one-time nonce terikat pada actor + action + payload hash + TTL), `parseCommand` (dot command + bahasa alami Indonesia), `InboundDeduper`, `OutboundGate` (emergency stop, allowlist grup, pause/resume per grup, dry-run, idempotency key).
- [x] **Phase 3 — NVIDIA AI & Auto Model Router**: Selesai. `ModelRegistry` & `HttpNvidiaTransport` untuk `nvidia/nemotron-3-ultra-550b-a55b`, `nvidia/nemotron-3.5-super-vl-120b-a12b`, dan `nvidia/nemotron-3.5-lightning-30b-a3b`. `ModelRouter` memilih otomatis berdasarkan task/modalitas/kompleksitas, pin TTL, sanitasi `reasoning_content`/`<think>`, retry terbatas, fallback kompatibel modalitas (tidak pernah fallback vision ke model text-only), dan structured output Zod dengan eskalasi ke Ultra.
- [x] **Phase 4 — Data Akademik Semester 5A**: Selesai. Seed idempoten (`prisma/seed.ts`) dan `ScheduleService` untuk 7 mata kuliah (total 22 SKS unik), 15 slot jadwal Senin–Jumat, jeda istirahat `11:20–12:30`, 32 asosiasi dosen kandidat berstatus `USER_PROVIDED_PENDING_CONFIRMATION`, serta dukungan `ScheduleException`.
- [x] **Phase 5 — AI Group Intelligence**: Selesai. `GroupIntelligenceService` (filter grup sumber terdaftar, deduplikasi, deteksi prompt injection, klasifikasi `URGENT`/`IMPORTANT`/`NORMAL`/`LOW`/`REVIEW`, antrean review `.pending`, `.approve`, `.reject`, preview pengumuman, dan pengiriman `.send` dengan konfirmasi nonce).
- [x] **Phase 6 — Reminder & Scheduler**: Selesai. `ReminderScheduler` berbasis `Asia/Jakarta` (H-1d, H-3h, H-1h, H-30m, START, END, idempoten tahan restart, pembatalan otomatis saat jadwal berubah, dan daftar tugas/assignment).
- [x] **Ubuntu Server 24/7 One-Click Installer (`install.sh`)**: Selesai. Mengatur Node.js 22 LTS, PostgreSQL, Redis, UFW, Fail2Ban, migrasi, seed, test, build, `hdybot.service` (`Restart=always`, `StartLimitIntervalSec=0`), `hdybot-watchdog.timer` (cek health tiap 2 menit), dan `hdybot-backup.timer` (backup terenkripsi harian).

## Status Koneksi Nyata vs Mock
- **WhatsApp Provider**: Saat ini default `WHATSAPP_PROVIDER=mock`, `OUTBOUND_ENABLED=false`, `DRY_RUN=true` sesuai prinsip keamanan awal blueprint. Koneksi WhatsApp nyata belum diaktifkan sebelum Hedy menyetujui risiko provider & mendaftarkan Group JID.
- **NVIDIA API**: Client & router siap dan teruji dengan mock transport; pemanggilan ke endpoint live NVIDIA siap digunakan segera setelah Hedy mengisi `NVIDIA_API_KEY` baru di `.env`.
