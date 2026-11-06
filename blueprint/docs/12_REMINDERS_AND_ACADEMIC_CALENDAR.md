# 12 — Reminder Engine dan Kalender Akademik

## Timezone and date semantics

All scheduled jobs use `Asia/Jakarta` as user-facing timezone. Persist timestamps in UTC plus original local date/time/timezone context. Resolve “besok”, “minggu depan”, “Jumat” from message timestamp, not server timezone. If date range is ambiguous, ask admin one focused clarification.

## Class schedule reminders

Default configurable offsets:

- H-1 day.
- H-3 hours.
- H-1 hour.
- H-30 minutes.
- class start.
- class end.

Do not deliver an H-1 reminder if the class has been cancelled or rescheduled. When schedule changes, cancel pending reminders for the old occurrence and create reminders for the new occurrence atomically.

## Other reminder types

- assignment deadline;
- paper / PPT submission;
- presentation;
- quiz, UTS, UAS;
- practical session;
- seminar, KKN, PKL, skripsi, guidance;
- Zoom / Google Meet;
- lecturer visit / class activity;
- duty roster / picket;
- custom reminder.

## Reminder lifecycle

`DRAFT → SCHEDULED → SENT` or `CANCELLED / FAILED`.

Each reminder has target group or admin, scheduled time, channel, idempotency key, payload version, source entity, and delivery receipt. Admin can snooze/cancel/retry. A message can be a reminder only once per trigger key.

## Academic calendar

Support semester dates, effective weeks, holidays, national days, campus holidays, UTS/UAS, practicum, seminar, KKN, PKL, thesis, graduation, and guidance. Do not fill dates based on guess. Store source URL/file and verification state.

## Quiet hours / batching

Admin can configure quiet hours. URGENT exceptions must still obey safety / recipient preference. Prevent repetitive reminders; default digest batching for normal reminders.

## Commands

`.jadwal`, `.besok`, `.mingguini`, `.kuliahberikutnya`, `.deadline`, `.countdown`, `.kalender`, `.kalenderbulan`, `.kalenderminggu`, `.uts`, `.uas`, `.libur`, `.reminder`, `.reminder list`, `.reminder snooze`, `.reminder cancel`.

## Prompt untuk coding agent

> Build timezone-correct scheduler with BullMQ, transactional schedule updates, cancellation/rescheduling, retry, idempotency, quiet hours, and delivery status. Seed timetable but do not invent academic calendar dates. Test DST-independent Asia/Jakarta conversion, timezone boundaries, missed jobs after restart, duplicate job, reschedule, and cancellation.
