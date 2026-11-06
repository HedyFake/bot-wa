# 21 — Prompt Library Siap Pakai untuk Coding Agent

Gunakan prompt berikut secara bertahap. Jangan jalankan semua sekaligus.

## Prompt A — Audit dan rencana

```text
Baca MASTER_PROMPT.md, README.md, semua docs, prompts, dan data JSON. Buat audit requirement, dependency plan, trust boundary, architecture diagram, dan implementation checklist. Jangan menulis kode fitur dulu. Tandai seluruh asumsi dan risiko.
```

## Prompt B — Buat fondasi project

```text
Implementasikan Phase 1 pada docs/20_IMPLEMENTATION_ROADMAP.md. Gunakan Node LTS, TypeScript strict, PostgreSQL, Redis/BullMQ, Zod config, Pino redaction, provider interface, mock adapter, health checks, migration, dan tests. Sertakan file lengkap serta cara menjalankan. Jangan menghubungkan nomor WhatsApp real dulu.
```

## Prompt C — Buat kontrol admin melalui WhatsApp pribadi

```text
Implementasikan docs/04_PRIVATE_ADMIN_CONTROL.md secara penuh. Private DM allowlist adalah satu-satunya admin gateway. Bangun bootstrap satu kali, Argon2id hash, expiration, rate limit, command registry, natural language parser, nonce confirmation, audit log, pause/resume, dan mock tests. Jangan simpan password di code. Semua command admin harus bisa digunakan lewat chat.
```

## Prompt D — NVIDIA Auto Router

```text
Implementasikan docs/06_NVIDIA_MODELS_AND_ROUTER.md. Gunakan OpenAI npm SDK dan NVIDIA base URL. Registry harus memuat Nemotron Ultra 550B A55B, Nemotron 3.5 Super-VL 120B A12B, dan Nemotron 3.5 Lightning 30B A3B dengan exact IDs. Pilih model otomatis per task/modality, sediakan admin override TTL, safe fallback, metrics, dan Indonesian benchmark. Jangan tampilkan reasoning_content.
```

## Prompt E — AI penyaring pesan grup

```text
Bangun pipeline docs/08_GROUP_INTELLIGENCE.md. Terima hanya grup allowlist yang diaktifkan. Implementasikan normalize, dedupe, classifier, structured extraction, provenance, source reliability, review queue, admin digest, dan controlled publishing. Jangan auto broadcast pesan yang belum diverifikasi.
```

## Prompt F — Jadwal dan dosen

```text
Import data/class-5a.seed.json dan implementasikan docs/10_CLASS_5A_SCHEDULE.md serta docs/11_COURSES_AND_LECTURERS.md. Pastikan seluruh 15 slot tepat, istirahat 11:20-12:30 kosong, timezone Asia/Jakarta, alias pencarian, dan status verifikasi. Jangan mengarang jadwal dosen per sesi atau tahun ajaran.
```

## Prompt G — Reminder dan assignment

```text
Implementasikan reminder scheduler H-1, H-3 jam, H-1 jam, H-30 menit, start/end, perubahan jadwal, deadline tugas, ujian, kuis, presentasi, praktikum, dan custom. Integrasikan task lifecycle serta idempotency. Tampilkan reminder melalui WhatsApp sesuai policy.
```

## Prompt H — Knowledge base materi

```text
Implementasikan upload PDF/PPT/DOCX/image/video/link, parser/OCR, object storage, RAG, page-level citations, access control, search, catalog, export dan retention. Gunakan Super-VL untuk gambar/scan/video bila perlu; jangan kirim secret atau file tanpa validasi.
```

## Prompt I — Security review

```text
Audit seluruh proyek terhadap docs/05_SECURITY_PRIVACY.md. Uji spoofing JID, grup sebagai admin, leaked secret, prompt injection, SSRF, replay nonce, duplicate send, unauthorized group, data retention, session backup, dan tool execution. Perbaiki temuan, jangan hanya menulis laporan.
```

## Prompt J — Final production audit

```text
Jalankan lint, typecheck, test, migration checks, backup/restore drill, reconnect/soak tests, NVIDIA mocked tests, WhatsApp mock E2E, dan staging checklist. Buat laporan apa yang sudah benar-benar dites, apa yang belum, serta risiko yang masih ada. Jangan mengklaim layanan online jika belum terkoneksi nyata.
```
