# Peta arsitektur HdyBot

## Alur runtime

Node menjalankan src/index.ts melalui dist/index.js. Adapter wwebjs menerjemahkan event WhatsApp menjadi InboundMessage. Dispatcher memeriksa duplikasi, konteks chat, dan identitas pengirim. Parser memetakan alias dan perintah bahasa alami. Layanan domain menghasilkan teks atau lampiran. OutboundGate memeriksa status pengiriman, grup, dan kunci idempotensi sebelum meneruskan pesan ke provider.

Prisma menghubungkan PostgreSQL ke probe, worker pengingat, snapshot katalog Drive, dan audit pengiriman dokumen. ScheduleDatabase memuat snapshot jadwal kelas dari PostgreSQL. Perubahan memerlukan konfirmasi, memeriksa versi pratinjau, dan menyimpan backup serta audit dalam transaksi serializable. Mode tanpa database memakai seed Semester 5A. Tugas, catatan, mode grup, dan skor opt-in memakai JSON lokal. Registry NVIDIA merutekan permintaan ke transport HTTP. Drive membaca folder melalui akun layanan dan memeriksa ulang izin unduh. systemd mengelola proses dan timer backup pada instalasi VPS.

## Modul TypeScript produksi

| File | Ekspor / titik masuk | Impor internal |
|---|---|---|
| src/admin/authentication/authenticator.ts | RoleKey, AuthDecision, RateLimitWindow, hashBootstrapSecret, verifyBootstrapSecret, generateBootstrapSecret, normalizePasswordInput, AuthenticatorOptions, AdminAuthenticator | src/security/phone.ts, src/whatsapp/adapters/types.ts |
| src/admin/authorization/confirmation.ts | PendingConfirmation, ConfirmationManager |  |
| src/admin/commands/dispatcher.ts | AuditEntry, DispatcherDeps, CommandDispatcher | src/modules/fun/questions.ts, src/observability/monitor.ts, src/modules/reminders/worker.ts, src/modules/materials/drive.ts, src/app/health.ts, src/ai/classification/group-intelligence.ts, src/ai/model-router/router.ts, src/config/env.ts, src/modules/academic/extended-modules.ts, src/modules/fun/fun-utility-service.ts, src/modules/materials/knowledge-base.ts, src/modules/media/media-service.ts, src/modules/schedule/service.ts, src/security/phone.ts, src/whatsapp/adapters/types.ts, src/whatsapp/outbound/gate.ts, src/admin/authentication/authenticator.ts, src/admin/authorization/confirmation.ts, src/admin/commands/menu.ts, src/admin/commands/parser.ts |
| src/admin/commands/menu.ts | menuPage | src/admin/commands/parser.ts |
| src/admin/commands/parser.ts | CanonicalCommand, ParsedCommand, parseCommand |  |
| src/ai/classification/group-intelligence.ts | ClassificationCategory, MessageQuality, MessageSignificance, AnalyzedGroupMessage, ReviewQueueItem, ExtractedAcademicTableFields, MessageEvaluationResult, detectPromptInjection, extractAcademicFields, evaluateMessageContent, formatStructuredTableAnnouncement, GroupIntelligenceService | src/ai/model-router/router.ts, src/whatsapp/adapters/types.ts |
| src/ai/model-router/router.ts | RouterMode, TaskKind, RouteRequest, RouteDecision, UsageLogEntry, RouterStatus, ModelRouter | src/ai/nvidia/registry.ts |
| src/ai/nvidia/registry.ts | ModelAlias, InputModality, ModelSpec, createModelRegistry, ChatContentPartText, ChatContentPartImage, ChatMessageContent, ChatMessage, NvidiaCompletionRequest, NvidiaCompletionResult, NvidiaProviderError, NvidiaTransport, sanitizeModelContent, HttpNvidiaTransport |  |
| src/app/health.ts | CheckStatus, HealthCheck, HealthReport, HealthDeps, runHealth | src/config/env.ts, src/whatsapp/adapters/types.ts |
| src/config/env.ts | AppConfig, loadConfig | src/security/phone.ts |
| src/database/seed-schema.ts | ClassSeed, normalizedCourseName, validateSeed, parseSeed |  |
| src/index.ts | Titik masuk / skrip | src/admin/authentication/authenticator.ts, src/admin/authorization/confirmation.ts, src/admin/commands/dispatcher.ts, src/ai/classification/group-intelligence.ts, src/ai/model-router/router.ts, src/ai/nvidia/registry.ts, src/app/health.ts, src/config/env.ts, src/modules/fun/fun-utility-service.ts, src/modules/reminders/worker.ts, src/modules/materials/drive.ts, src/modules/media/media-service.ts, src/modules/schedule/service.ts, src/observability/monitor.ts, src/security/phone.ts, src/observability/logger.ts, src/security/phone.ts, src/whatsapp/adapters/baileys.ts, src/whatsapp/adapters/mock.ts, src/whatsapp/adapters/types.ts, src/whatsapp/adapters/wwebjs.ts, src/whatsapp/outbound/gate.ts |
| src/modules/academic/extended-modules.ts | GeneratedGroup, GroupGeneratorService, CalendarEvent, AcademicCalendarService, DocumentGeneratorService, GamificationService, UtilityService |  |
| src/modules/fun/fun-utility-service.ts | AssignmentItem, CustomReminderItem, AnnouncementDraft, ClassNoteItem, AfkEntry, ActiveQuizSession, ClassMemberEntry, LecturerContactEntry, AcademicJournalItem, PersistedBotState, FunAndUtilityService | src/modules/fun/questions.ts, src/security/guards.ts |
| src/modules/fun/questions.ts | GameQuestion |  |
| src/modules/materials/drive.ts | DriveCatalog | src/whatsapp/adapters/types.ts |
| src/modules/materials/knowledge-base.ts | MaterialChunk, MaterialRecord, CitationHit, KnowledgeBaseService | src/security/guards.ts |
| src/modules/media/media-service.ts | ImageEffectKind, MediaService |  |
| src/modules/reminders/scheduler.ts | ReminderOffsetLabel, ReminderJob, AssignmentItem, jakartaLocalToUtc, ReminderScheduler | src/whatsapp/outbound/gate.ts |
| src/modules/reminders/worker.ts | reminderTime, ReminderWorker | src/whatsapp/outbound/gate.ts, src/modules/fun/fun-utility-service.ts |
| src/modules/schedule/service.ts | WeekdayName, ScheduleSessionView, ScheduleExceptionRecord, toJakartaParts, ScheduleService | src/database/seed-schema.ts |
| src/observability/logger.ts | redactString, createLogger |  |
| src/observability/monitor.ts | Monitor, backupStatus, resources |  |
| src/scripts/admin-cli.ts | Titik masuk / skrip | src/admin/authentication/authenticator.ts, src/admin/authorization/confirmation.ts, src/admin/commands/dispatcher.ts, src/ai/classification/group-intelligence.ts, src/ai/model-router/router.ts, src/ai/nvidia/registry.ts, src/config/env.ts, src/modules/schedule/service.ts, src/security/phone.ts, src/whatsapp/adapters/mock.ts, src/whatsapp/outbound/gate.ts |
| src/scripts/benchmark-id.ts | Titik masuk / skrip | src/admin/commands/parser.ts, src/ai/classification/group-intelligence.ts |
| src/scripts/health.ts | Titik masuk / skrip | src/config/env.ts, src/app/health.ts |
| src/security/guards.ts | validateSafeExternalUrl, resolveSafeStoragePath, validateUploadedMedia |  |
| src/security/phone.ts | normalizeE164, e164ToJid, maskPhone |  |
| src/whatsapp/adapters/baileys.ts | BaileysAdapterOptions, BaileysWhatsAppProvider | src/whatsapp/adapters/types.ts |
| src/whatsapp/adapters/mock.ts | MockWhatsAppProvider | src/whatsapp/adapters/types.ts |
| src/whatsapp/adapters/types.ts | ChatType, MediaKind, InboundMediaPayload, OutboundMediaPayload, InboundMessage, OutboundMessage, SendResult, ConnectionState, WhatsAppProvider |  |
| src/whatsapp/adapters/wwebjs.ts | WWebJsAdapterOptions, toWWebChatId, WWebJsWhatsAppProvider | src/whatsapp/adapters/types.ts |
| src/whatsapp/outbound/gate.ts | InboundDeduper, OutboundGateOptions, OutboundGate | src/whatsapp/adapters/types.ts |
| src/modules/materials/extract.ts | ExtractedSection, extractSections | Poppler dan Tesseract melalui execFile |

## Rute tambahan 9 November

PerawatAnswer membaca artikel terbatas pada domain Perawat.org dan memberikan konten sumber ke ModelRouter. MusicService mengambil metadata SoundCloud dan memisahkan katalog MP3 lokal. InferIntent memetakan mention dan pertanyaan melalui NVIDIA ke parser yang sama. Persetujuan relay disimpan di state atomik FunAndUtilityService, lalu dikirim melalui OutboundGate setelah pemeriksaan identitas owner.
