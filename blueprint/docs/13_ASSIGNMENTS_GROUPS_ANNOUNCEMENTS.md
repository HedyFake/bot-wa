# 13 — Tugas, Kelompok, dan Pengumuman

## Task management

Fields: title, course, description, lecturer/source, assigned date, due date/time, submission instructions, attachment, task type, group/personal, status, priority, progress, verification, and audit.

Statuses: `BELUM_MULAI`, `DIKERJAKAN`, `SELESAI`, `TERLAMBAT`, `DIBATALKAN`.

Commands: `.tugas`, `.tugas hariini`, `.tugas mingguini`, `.tugas besok`, `.tugas terdekat`, `.deadline`, `.deadline <matkul>`, `.tambahtugas`, `.edittugas`, `.hapustugas`, `.selesaitugas`, `.tugasaktif`, `.tugasterlambat`, `.tugasprioritas`, `.tugaspribadi`, `.tugaskelompok`, `.assign <nama>`.

AI may draft task from group conversation, but must show source and extracted due date. Do not set arbitrary due date when message says “secepatnya” without explicit timestamp.

## Group generator

Support group size, number of groups, random selection, distribution fairness, rotate past groups, choose leader/secretary/presenter/moderator/questioner/operator, and history.

Do not use gender, grades, disability, religion, or other sensitive attributes as grouping dimensions unless lawful, necessary, explicitly authorized, and handled with privacy safeguards. Default fairness: minimize group size difference, avoid repeating same combinations, and allow manual override.

## Announcement lifecycle

`DRAFT → PENDING_APPROVAL → APPROVED → SENDING → SENT` or `REJECTED / CANCELLED / FAILED`.

Announcement includes title, body, audience, priority, schedule, source, prepared_by, approved_by, destination, and message ID. Templates: schedule change, assignment, deadline, exam, material uploaded, meeting link, cancellation, reminder.

Support scheduled / recurring announcement and read confirmation where provider supports it. Read confirmation must not be claimed if the connector cannot reliably retrieve it.

## Broadcast safeguards

- Preview exact body and target.
- Verify destination allowlist.
- Rate limit and dedupe.
- Require approval.
- Never impersonate lecturer.
- For class-wide messages, identify bot as source and include source attribution when derived from another group.

## Prompt untuk coding agent

> Implement task CRUD, group generator fairness algorithm, assignment progress, announcement templates, read-confirmation model with provider capability checks, and approval-gated outbound. Include tests for duplicate tasks, time parsing, group distribution, and broadcast replay prevention.
