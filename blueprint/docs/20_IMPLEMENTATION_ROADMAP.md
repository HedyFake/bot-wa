# 20 — Implementation Roadmap

## Phase 0 — Clarify deployment facts

Must configure later: admin phone JID, bot phone/account choice, primary group JID, source group JIDs, consent, provider mode, VPS, academic year, official timetable confirmation, class officers, campus calendar, allowed retention.

No blocking clarification is required to implement the mock foundations.

## Phase 1 — Foundation

- TypeScript project, strict lint/typecheck.
- env validation and secure logging.
- DB + schema + migration.
- Redis/BullMQ.
- health/status service.
- provider interface + mock adapter.
- baseline unit/integration tests.

## Phase 2 — WhatsApp private admin console

- bootstrap pairing and JID allowlist.
- DM-only auth.
- command registry and natural language intent.
- admin menus, confirmation nonce, audit log.
- pause/resume switch.

## Phase 3 — NVIDIA orchestration

- OpenAI SDK client.
- model registry and per-task auto router.
- tool schemas and policy.
- stream parsing, JSON validation, retry/fallback.
- Indonesian benchmark script.

## Phase 4 — Class data and schedule

- seed Semester 5A.
- courses/lecturers and aliases.
- schedule commands and versioning.
- reminders with timezone.

## Phase 5 — Group intelligence

- group registry and consent.
- message normalizer/deduper.
- classifier/extractor.
- review queue and admin digest.
- approval-gated announcement flow.

## Phase 6 — Academic modules

- tasks, deadlines, group generator.
- material upload, OCR, RAG.
- announcement templates.
- calendar, docs and export.

## Phase 7 — Extended modules

- AI study assistant, quiz, flashcards.
- opt-in gamification.
- analytics and reports.
- media/utility pipeline.

## Phase 8 — Production hardening

- security review.
- privacy/consent notice.
- load/soak test.
- backup restore drill.
- controlled production launch.

## Suggested first vertical slice

Admin DM → `.status` / “ringkasan hari ini” → DB read → NVIDIA response when needed → WhatsApp private reply. Then `.jadwal` deterministic DB query. This proves auth, connector, data, and response path before building complex automation.

## Prompt untuk coding agent

> Implement only the next uncompleted phase and keep a changelog. Every phase must end with actual working files, tests, migration, acceptance report, and instructions. Do not create a huge monolithic commit or mark future features complete.
