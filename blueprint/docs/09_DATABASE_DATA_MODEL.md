# 09 — Database Data Model

## Entitas minimum

- `users`: WhatsApp JID, display name, role, active state, privacy/consent status.
- `classes`: class name, semester, academic year, timezone, state.
- `class_members`: class-user relation and role.
- `whatsapp_groups`: JID, name, purpose, source/destination, consent, policy.
- `courses`: course code, name, SKS, semester, active state.
- `lecturers`: canonical name, title, profile fields, verification status.
- `course_lecturers`: many-to-many relation; source and confirmation status.
- `schedule_entries`: course, weekday/date, start/end, room, lecturer assignment if known, source, verification.
- `schedule_exceptions`: one-off change/cancel/room move; original reference and approval.
- `assignments`: title, course, description, created by, due date/time, status, group/personal.
- `assignment_groups` / `group_members`: group work allocation.
- `reminders`: target, type, trigger time, state, job id, idempotency key.
- `materials`: title, course, lecturer, MIME, object key, pages, source, access level.
- `messages_inbox`: normalized metadata, message hash, source group, retention expiry.
- `ai_classifications`: priority/category/confidence/model/version.
- `extracted_facts`: event payload, provenance, field confidences.
- `review_items`: pending/approved/rejected, reason, reviewer, timestamp.
- `announcements`: draft, approved text, destination, state, sent message ID.
- `model_calls`: model alias/id, route reason, latency, token counts, status, no raw secret.
- `audit_logs`: actor, action, entity, before/after digest, IP/process metadata, timestamp.

## Data design rules

- UUID primary keys.
- `created_at`, `updated_at`, and soft-delete only where justified.
- Store timestamps in UTC; render in Asia/Jakarta.
- Store local academic date + timezone when timetable semantics are local.
- Unique constraint for `(provider, remote_jid, provider_message_id)`.
- Index schedule `(class_id, weekday, start_time)` and assignments `(class_id, due_at)`.
- Use transactions for schedule updates and job rescheduling.
- Keep source provenance: who said what, where, when, and verification state.
- Avoid storing duplicate raw chat text in multiple tables.

## Suggested enums

`Priority = URGENT | IMPORTANT | NORMAL | LOW | REVIEW`

`VerificationStatus = UNVERIFIED | PENDING_REVIEW | VERIFIED | REJECTED | SUPERSEDED`

`ReminderStatus = PENDING | SCHEDULED | SENT | CANCELLED | FAILED`

`AnnouncementStatus = DRAFT | PENDING_APPROVAL | APPROVED | SENDING | SENT | FAILED | CANCELLED`

## Access

Member reads public class information. Class officer writes only allowed domains. Admin manages class data. Owner manages integration/security. AI service account receives narrow service methods and cannot bypass application authorization.

## Prompt untuk coding agent

> Buat relational schema, migrations, indexes, constraints, seed scripts, repository/service layers, and tests. Tambahkan provenance dan verification fields pada semua fakta akademik. Jangan menggunakan JSON files sebagai database utama. Jangan simpan nilai password atau API key dalam tabel biasa.
