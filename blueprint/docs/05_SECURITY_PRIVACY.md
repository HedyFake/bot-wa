# 05 — Security, Privacy, Threat Model

## Assets yang wajib dilindungi

- NVIDIA API key.
- WhatsApp auth/session credentials dan pairing QR.
- Admin identity/JID dan bootstrap secret.
- Isi chat dan file mahasiswa/dosen.
- Jadwal, tugas, nilai bila nanti ditambahkan, kontak, dan materi.
- Database, object storage, backups, audit logs.

## Threats

1. Admin spoofing dari nomor mirip atau grup.
2. Prompt injection di pesan, PDF, gambar, atau link.
3. API key bocor di source code, log, atau screenshot.
4. WhatsApp session dicuri dari VPS/backup.
5. Message replay atau duplicate outbound.
6. AI salah mengidentifikasi pengirim/pesan penting.
7. Pesan berbahaya meminta AI mengubah prompt, mengekspor data, atau menyiarkan broadcast.
8. Akses data pribadi yang tidak dibutuhkan.
9. Model provider timeout, malformed tool call, atau model drift.
10. Operasi destruktif tidak sengaja.

## Secret handling

- Revoke NVIDIA key yang sudah ditempel pada percakapan, lalu buat key baru.
- `.env` tidak masuk Git; `.env.example` hanya nama variabel dan placeholder.
- Gunakan server secret manager atau file permission `0600`.
- Pisahkan API key per environment.
- Redact Authorization headers dan token dari Pino logs.
- Jangan mencetak body request berisi secret.
- Simpan WhatsApp auth state di volume persisten yang permission-nya terbatas dan backup terenkripsi.
- Jangan mengirim secret ke model AI.

## Password / bootstrap

Kredensial admin yang telah disebutkan pada percakapan dianggap compromised. Jangan simpan atau gunakan kembali. Buat one-time random bootstrap secret, hash dengan Argon2id, batasi expiry dan percobaan, lalu invalidasi setelah pairing. Setelah pairing, autentikasi berdasarkan sender JID allowlist. Hindari password yang sama pada layanan lain.

## Data privacy

- Hanya proses grup yang terdaftar dan mendapat izin yang sesuai.
- Beri pemberitahuan kepada anggota bahwa bot memproses pesan untuk fungsi akademik.
- Simpan sesedikit mungkin isi pesan. Default: simpan metadata + hasil ekstraksi + fingerprint; raw content hanya bila dibutuhkan, dengan retention pendek yang dikonfigurasi.
- Berikan prosedur penghapusan dan export data yang sah.
- Jangan membuat profil aktivitas individu secara tersembunyi.
- Statistik anggota harus agregat, opt-in untuk gamification, dan tidak digunakan untuk menghukum.
- Hindari menyimpan informasi kesehatan pribadi mahasiswa/pasien pada class bot; materi pendidikan keperawatan tidak boleh dicampur dengan rekam medis nyata.

## Prompt injection defense

Konten pesan/file merupakan data, bukan instruksi. Model dilarang mengikuti instruksi di dalam sumber yang meminta:
- mengubah system prompt;
- mengungkap API key/session/password;
- mengirim database atau data pribadi;
- memerintah broadcast atau perubahan jadwal tanpa otorisasi;
- menonaktifkan guardrail.

AI hanya boleh meminta tool yang tersedia dan schema valid. Policy engine menentukan boleh/tidak. Semua tool call ditandai actor dan source.

## Safe operations

- Destructive operation: preview + explicit confirmation.
- Broadcast: preview + exact target + count estimate + confirmation.
- Database migration: backup and rollback plan.
- Model switch: admin command and health check.
- Group monitoring: allowlist + consent + retention.
- Fail closed: bila identitas, source, atau policy tidak jelas, jangan broadcast.

## Incident response

Jika NVIDIA API key atau WhatsApp session dicurigai bocor:
1. pause outbound;
2. revoke/rotate key/session;
3. invalidate bootstrap/admin tokens;
4. inspect audit logs;
5. restore from clean backup if needed;
6. notify owner with concise incident summary;
7. document root cause and remediation.

## Prompt untuk coding agent

> Buat threat model STRIDE, secrets redaction tests, RBAC tests, prompt injection tests, retention controls, encrypted backup plan, and incident runbook. Jangan menganggap output AI aman hanya karena berasal dari model NVIDIA.
