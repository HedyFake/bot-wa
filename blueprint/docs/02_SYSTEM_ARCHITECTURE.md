# 02 — System Architecture

## Gambaran arsitektur

```text
WhatsApp Admin DM ─┐
Authorized Groups ──┼─> WhatsApp Provider Adapter
                   │             │
                   └─────────────┘
                                 v
                    Message Normalizer + Deduper
                                 v
                     Policy / Permission Gateway
                          /                 \
                         v                   v
              Admin Command Router       Group Ingestion Pipeline
                         |                   |
                         v                   v
                 Application Services   AI Classification + Extraction
                         |                   |
                         v                   v
                    PostgreSQL <------ Review Queue / Source Registry
                         |
               Redis + BullMQ Scheduler
                         |
               Reminder / Digest / Retry
                         |
                         v
                 Outbound Approval Gate
                         |
                         v
                Authorized WhatsApp Send

                AI Orchestrator / Model Router
          Lightning <-> Super-VL <-> Ultra (NVIDIA NIM)
```

## Layer

1. **Transport:** WhatsApp provider adapter. Normalize incoming text, media, sender, remote JID, message ID, timestamp, reply context, and quoted content.
2. **Identity:** sender resolver, private DM detection, JID allowlist, RBAC.
3. **Application:** class, schedule, lecturer, task, reminders, materials, announcement, analytics.
4. **Intelligence:** classifier, extractor, summarizer, RAG, AI chat, model router.
5. **Data:** PostgreSQL, object storage, Redis.
6. **Jobs:** BullMQ for scheduled reminders, retry, digest, media jobs, export.
7. **Governance:** approval, source provenance, audit log, privacy retention, rate limits.

## Core domain events

- `whatsapp.message.received`
- `whatsapp.message.normalized`
- `group.message.classified`
- `academic.fact.extracted`
- `review.item.created`
- `schedule.change.proposed`
- `schedule.change.approved`
- `assignment.created`
- `reminder.scheduled`
- `announcement.drafted`
- `announcement.approved`
- `announcement.sent`
- `ai.model.selected`
- `ai.model.failed`

All events require correlation ID, tenant/class ID, source message ID when relevant, creation timestamp, and actor.

## Bounded contexts

`identity`, `whatsapp`, `classroom`, `academic-calendar`, `assignments`, `materials`, `announcements`, `ai-orchestration`, `group-intelligence`, `documents`, `analytics`, `audit`.

Business services must not import Baileys directly. Only the WhatsApp adapter may know library-specific event names or JID details.

## Suggested repository layout

```text
src/
  app.ts
  config/
  transport/whatsapp/
    provider.interface.ts
    baileys.adapter.ts
    normalizers/
  identity/
  admin-control/
  commands/
  ai/
    providers/nvidia/
    router/
    prompts/
    tools/
    schemas/
  modules/
    classroom/ schedule/ lecturers/ assignments/
    reminders/ materials/ announcements/ groups/
    calendar/ documents/ analytics/ gamification/ media/
  jobs/
  persistence/
  security/
  observability/
  shared/
prisma/ or drizzle/
tests/
```

## Deployment shape

Minimum deployment: one application process + PostgreSQL + Redis + persistent encrypted WhatsApp auth volume + file/object storage. For reliability, separate worker process from WhatsApp ingestion so media/OCR or AI requests cannot block connection event handling. Use a single outbound queue per destination to preserve order.

## Prompt for coding agent

> Implement this architecture with strict module boundaries. Provide a Mermaid diagram, typed interfaces, dependency direction, and integration tests. Keep provider-specific WhatsApp logic out of domain modules. Do not add a web dashboard as a mandatory component; all core administration must work through the admin DM.
