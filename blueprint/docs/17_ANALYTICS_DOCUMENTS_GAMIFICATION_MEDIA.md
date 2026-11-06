# 17 — Analytics, Documents, Gamification, Utilities, Media

## Analytics

Metrics: incoming message counts by authorized group and time bucket, priority distribution, review queue size/age, schedule changes, assignment status, reminder delivery, announcement delivery, command usage, model call latency/errors/tokens, connection uptime. Keep aggregate by default. Individual activity profile requires explicit need, permission, and notice.

Reports: daily admin digest, weekly/monthly/semester class report. Separate operational health from student participation metrics.

## Generator dokumen

Use templates with class metadata, course, dates, approval signature labels, and version. Never forge institutional letterhead, lecturer signature, official stamp, or campus authorization. Draft generated permission letter / proposal / minutes as editable document with clear “draft” watermark until approved.

## Gamification

Opt-in XP for quiz completion, learning activity, helpful contribution, and task completion where tracked transparently. Do not grant XP for number of noisy messages. No public shaming. Provide `.privacy gamification off` and opt-out support. Ranking can be disabled by admin.

## Utilities

Calculator, grade/GPA calculator, unit conversion, date/time, countdown and QR. Weather/currency/URL tools call approved external API/search through safe wrappers. URL checker should avoid SSRF: block private IP ranges, loopback, metadata endpoints, arbitrary ports, and redirects to internal networks.

## Media pipeline

Media jobs run in workers with strict limits:
- max upload size;
- allowed MIME/extensions;
- virus scan where available;
- timeout and CPU/memory caps;
- temporary file cleanup;
- EXIF metadata stripping on public output if needed;
- PDF page count cap;
- OCR language Indonesian + English where packages available;
- signed expiring storage URLs.

Features include image resize/compress/convert, PDF merge/split/compress, OCR, document card, QR, certificate draft, schedule image. Website screenshot must use allowlist or safe URL policy.

## Prompt untuk coding agent

> Implement analytics, document templates, opt-in gamification, safe utilities, and bounded media processing as separate modules. Include authorization, safe file limits, SSRF checks, retention, and test fixtures. Generated official-looking documents must never imply signatures or authorization that have not been given.
