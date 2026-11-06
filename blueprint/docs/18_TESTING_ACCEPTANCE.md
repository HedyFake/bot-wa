# 18 — Test Plan dan Acceptance Criteria

## Test layers

- Unit: utilities, parser, router, date resolver, priority classifier, permission policy.
- Integration: PostgreSQL, Redis queue, model provider mock, WhatsApp adapter mock.
- Contract: provider interface, NVIDIA request/response schema, tool call schemas.
- End-to-end: admin private chat, group ingestion, review, approval, outbound, reminders.
- Security: auth bypass, secret leak, prompt injection, SSRF, path traversal, file bomb, replay, IDOR.
- Soak: repeated connection reconnects, duplicate events, restart scheduler, large message backlog.

## Must-pass behavior

### Admin control

- only allowlisted private JID controls;
- group-origin command rejected as admin action;
- wrong / expired bootstrap secret rejected;
- bootstrap secret invalid after successful pairing;
- sensitive command requires confirmation;
- replayed nonce fails;
- no API key/session appears in logs.

### Model router

- correct ID for three models;
- image routes to Super-VL;
- complex text routes to Ultra;
- routine tasks route according to evaluated policy;
- Lightning language quality must have benchmark gate;
- model failure falls back only to modality-compatible model;
- `reasoning_content` never reaches WhatsApp response/log;
- invalid structured output creates retry/escalation/review instead of unsafe action.

### Schedule

- all 15 sessions in seed file appear exactly;
- no class during 11:20–12:30 break;
- weekdays and order correct;
- `.besok` and `.kuliahberikutnya` correct near midnight and class boundaries;
- schedule exception cancels/reschedules related reminders;
- no invented room, academic year, or lecturer per exact session.

### Group Intelligence

- joke/sticker → LOW;
- real deadline with source → IMPORTANT;
- unclear forwarded change → REVIEW;
- urgent verified cancellation → URGENT;
- duplicate message not repeated;
- correction supersedes but doesn't erase provenance;
- low confidence never auto-publishes.

### Outbound

- preview shows exact message and destination;
- only allowlisted destination;
- double-click/retry does not duplicate;
- approval nonce binds to exact payload hash;
- failed send appears in delivery status.

## Acceptance gate per phase

No phase is complete until formatter, lint, typecheck, tests, migration check, and runbook update pass. Document all manual tests and unresolved limitations.

## Prompt untuk coding agent

> Create a living test matrix and acceptance report. Seed exact cases above. Use mocked WhatsApp/NVIDIA in CI and require explicit staging smoke tests before production. Never mark a real integration tested based only on mock success.
