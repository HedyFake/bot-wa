# DOKUMENTASI PENGUJIAN (`docs/TESTING.md`)

## Menjalankan Seluruh Test
```bash
npm run typecheck
npm test
npm run build
```

## Cakupan Pengujian Otomatis (10 File Test Vitest)
1. `tests/admin-auth.test.ts`: Normalisasi nomor, RBAC owner/admin, penolakan konteks grup, bootstrap pairing, rate-limit brute force, dan one-time nonce `ConfirmationManager`.
2. `tests/media-and-fun.test.ts`:
   - Alur interaktif tanya-jawab password admin (`<password admin dari konfigurasi>`) untuk nomor admin `082233038659`, penolakan password salah, penolakan nomor asing, eksekusi otomatis command tertunda, dan `.logout`.
   - Pembuatan stiker WebP (`.ttp`, `.sticker`), konversi `.toimg`, efek gambar `sharp`, kartu kutipan/jadwal, QR Code PNG, dan dokumen PDF berlabel DRAFT.
   - CRUD tugas, kalkulator matematika aman, konversi satuan, SSRF guard `.urlcheck`, kuis interaktif, dan transformasi teks.
3. `tests/integration-e2e.test.ts`: Alur ujung-ke-ujung Group Intelligence -> deteksi prompt injection -> deduplikasi -> `.pending` -> `.approve` -> `.send` -> `.confirm` -> Emergency Stop (`.admin pause`).
4. `tests/model-router.test.ts`: Routing model NVIDIA (`lightning`, `super-vl`, `ultra`), fallback otomatis, dan circuit breaker.
5. `tests/seed.test.ts`: Validasi 7 mata kuliah (22 SKS unik), 15 sesi kuliah Senin–Jumat, jeda istirahat `11:20–12:30`, dan 32 asosiasi dosen Semester 5A.
6. `tests/config.test.ts`, `tests/phone.test.ts`, `tests/logger.test.ts`, `tests/health.test.ts`, `tests/extended-modules.test.ts`.
