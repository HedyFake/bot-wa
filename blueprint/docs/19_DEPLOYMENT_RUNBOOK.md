# 19 — Deployment, Operations, Backup, Recovery

## Minimum services

- App API / WhatsApp process.
- Worker process for scheduled jobs and media.
- PostgreSQL.
- Redis.
- Persistent encrypted auth/session storage.
- Object storage or protected local volume for media.

## VPS baseline

Choose VPS based on load, not model parameter size: NVIDIA hosted API performs inference remotely, so the VPS does not need to host 30B/120B/550B weights. A practical initial deployment can start with 2–4 vCPU, 4–8 GB RAM, SSD, reliable network, and sufficient storage; benchmark with actual media and concurrent jobs before scaling. Use separate storage for backups. Do not run huge OCR/PDF/ffmpeg jobs in the WhatsApp connection process.

## Environment setup

1. Create service user with no root login.
2. Install supported Node LTS, Docker, firewall, fail2ban or equivalent controls.
3. Provision PostgreSQL and Redis with private bind/network.
4. Add environment variables from `.env.example` to secure secret storage.
5. Rotate all previously exposed secrets before go-live.
6. Run migration and seed with explicit confirmation.
7. Start mock adapter and test admin flow.
8. Connect test WhatsApp number only after reviewing platform terms and integration risks.
9. Register source/destination groups after consent and exact JID validation.
10. Enable outbound only after dry-run tests.

## Operations

- `/health/live` and `/health/ready` should be local/protected; user-facing status via `.status`.
- Monitor connection state, queue backlog, Redis, DB, NVIDIA response/error/latency, reminder lag, outbound failures.
- Alert admin privately; don't leak stack trace or secrets.
- Graceful shutdown: stop ingest, drain queues, persist state, close provider, DB, Redis.

## Backup

- PostgreSQL daily encrypted backup + WAL/PITR if affordable.
- Object storage lifecycle + encrypted backup.
- WhatsApp auth state backup is highly sensitive; encrypt and restrict.
- Retain multiple restore points.
- Test restore regularly.

## Recovery

- Restore DB and object files from matching snapshot.
- Reconnect provider; if session invalid, require secure re-pairing.
- Verify job idempotency before resuming outbound.
- Keep outbound paused until duplicate prevention and group destinations are verified.

## Upgrade plan

Pin library version and lockfile. Before Baileys upgrades, read migration guide, test auth state compatibility, group events, media download, and reconnect. Never upgrade live session without backup and staging test.

## Prompt untuk coding agent

> Generate Dockerfile, compose file for dev, health checks, migration commands, backup/restore scripts, systemd or container runbook, firewall notes, upgrade/rollback steps, and production checklist. Keep `.env` and auth state outside image and Git.
