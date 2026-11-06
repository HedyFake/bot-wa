import { runHealth } from '../../app/health.js';
import type { GroupIntelligenceService } from '../../ai/classification/group-intelligence.js';
import type { ModelRouter } from '../../ai/model-router/router.js';
import type { AppConfig } from '../../config/env.js';
import {
  AcademicCalendarService,
  DocumentGeneratorService,
  GamificationService,
  GroupGeneratorService,
  UtilityService,
} from '../../modules/academic/extended-modules.js';
import { KnowledgeBaseService, SHJ_OFFICIAL_REFERENCES } from '../../modules/materials/knowledge-base.js';
import { ScheduleService } from '../../modules/schedule/service.js';
import type { InboundMessage, WhatsAppProvider } from '../../whatsapp/adapters/types.js';
import { InboundDeduper, type OutboundGate } from '../../whatsapp/outbound/gate.js';
import type { AdminAuthenticator } from '../authentication/authenticator.js';
import type { ConfirmationManager } from '../authorization/confirmation.js';
import { parseCommand } from './parser.js';

export interface AuditEntry {
  actor: string;
  action: string;
  target?: string;
  result: string;
  at: string;
}

export interface DispatcherDeps {
  config: AppConfig;
  whatsapp: WhatsAppProvider;
  outbound: OutboundGate;
  auth: AdminAuthenticator;
  confirmations: ConfirmationManager;
  router: ModelRouter;
  schedule: ScheduleService;
  intelligence: GroupIntelligenceService;
  knowledgeBase?: KnowledgeBaseService;
  groupGenerator?: GroupGeneratorService;
  calendar?: AcademicCalendarService;
  documents?: DocumentGeneratorService;
  gamification?: GamificationService;
  startedAt: Date;
  now?: () => Date;
}

/**
 * Dispatcher utama HdyBot:
 * - Memisahkan pesan grup sumber vs private DM.
 * - Menegakkan allowlist owner Hedy untuk semua command sensitif/admin.
 * - Menyediakan seluruh command kontrol & pemantauan health via WhatsApp pribadi Hedy.
 */
export class CommandDispatcher {
  private readonly deduper = new InboundDeduper();
  readonly auditLogs: AuditEntry[] = [];
  private readonly now: () => Date;
  readonly kb: KnowledgeBaseService;
  readonly groupGen: GroupGeneratorService;
  readonly calendar: AcademicCalendarService;
  readonly documents: DocumentGeneratorService;
  readonly gamification: GamificationService;

  constructor(private readonly deps: DispatcherDeps) {
    this.now = deps.now ?? (() => new Date());
    this.kb = deps.knowledgeBase ?? new KnowledgeBaseService();
    this.groupGen = deps.groupGenerator ?? new GroupGeneratorService();
    this.calendar = deps.calendar ?? new AcademicCalendarService();
    this.documents = deps.documents ?? new DocumentGeneratorService();
    this.gamification = deps.gamification ?? new GamificationService();
  }

  private recordAudit(actor: string, action: string, result: string, target?: string): void {
    this.auditLogs.push({ actor, action, target, result, at: this.now().toISOString() });
  }

  async handleInbound(msg: InboundMessage): Promise<string | null> {
    if (!this.deduper.checkAndMark(msg.chatJid, msg.providerMessageId)) {
      return null; // Duplikat diabaikan secara idempoten.
    }

    if (msg.chatType === 'group') {
      this.deps.intelligence.ingest(msg);
      const parsedGroup = parseCommand(msg.text);
      if (parsedGroup.command === 'unknown' || parsedGroup.kind === 'none') return null;
      if (parsedGroup.adminOnly) {
        this.recordAudit(msg.senderJid, parsedGroup.command, 'denied_group_context', msg.chatJid);
        return null;
      }
      return this.executePublicOrAdmin(parsedGroup, msg);
    }

    // Private chat
    const parsed = parseCommand(msg.text);
    if (parsed.command === 'pair') {
      const secret = parsed.args[0] ?? '';
      const res = this.deps.auth.pairWithBootstrap(msg, secret);
      this.recordAudit(msg.senderJid, 'pair', res.reason);
      const text = res.ok
        ? `✅ Pairing berhasil. Halo ${this.deps.config.OWNER_NAME}, nomor Anda telah diotorisasi sebagai admin HdyBot.`
        : `❌ Pairing ditolak (${res.reason}).`;
      await this.replyPrivate(msg, text);
      return text;
    }

    const decision = this.deps.auth.evaluate(msg);
    if (parsed.adminOnly && !decision.allowed) {
      this.recordAudit(decision.actorJid, parsed.command, `denied:${decision.reason}`);
      const denyText = '⛔ Akses ditolak. Perintah kontrol hanya dapat dijalankan oleh Hedy (owner/admin terverifikasi) melalui chat pribadi.';
      await this.replyPrivate(msg, denyText);
      return denyText;
    }

    const reply = await this.executePublicOrAdmin(parsed, msg, decision.actorJid);
    if (reply) {
      await this.replyPrivate(msg, reply);
    }
    return reply;
  }

  private async replyPrivate(msg: InboundMessage, text: string): Promise<void> {
    await this.deps.outbound.send(
      {
        chatJid: msg.chatJid,
        text,
        idempotencyKey: `reply-${msg.providerMessageId}`,
      },
      { isAdminPrivateReply: true },
    );
  }

  private async executePublicOrAdmin(
    parsed: ReturnType<typeof parseCommand>,
    msg: InboundMessage,
    actorJid = msg.senderJid,
  ): Promise<string | null> {
    const now = this.now();
    const { config, schedule, router, intelligence, confirmations, outbound } = this.deps;

    switch (parsed.command) {
      case 'ping':
        return `🏓 Pong! ${config.BOT_DISPLAY_NAME} aktif.`;

      case 'groupid':
        return `🆔 *Informasi Chat/Grup*\n• Chat JID: \`${msg.chatJid}\`\n• Tipe: *${msg.chatType}*\n• Pengirim Terdeteksi: \`${msg.senderJid}\``;

      case 'runtime': {
        const upSec = Math.floor((now.getTime() - this.deps.startedAt.getTime()) / 1000);
        return `⏱️ Runtime ${config.BOT_NAME}: ${upSec} detik | Timezone: ${config.TIMEZONE} | Mode WA: ${this.deps.whatsapp.name}`;
      }

      case 'owner':
        return (
          `👤 *Identitas Owner & Konfigurasi*\n` +
          `• Bot: ${config.BOT_DISPLAY_NAME}\n` +
          `• Owner: ${config.OWNER_NAME} (${config.OWNER_WHATSAPP})\n` +
          `• Kelas: ${config.CLASS_NAME} (Semester 5A)\n` +
          `• Timezone: ${config.TIMEZONE}`
        );

      case 'help':
      case 'menu':
        return (
          `🤖 *${config.BOT_DISPLAY_NAME} — Control Center*\n` +
          `Halo ${config.OWNER_NAME}! Perintah utama:\n` +
          `• \`.dashboard\` | \`.status\` | \`.health\` | \`.runtime\` | \`.ping\`\n` +
          `• \`.ai status\` | \`.ai models\` | \`.ai model <lightning|super-vl|ultra>\` | \`.ai auto on\` | \`.ai test <prompt>\`\n` +
          `• \`.jadwal\` | \`.jadwal senin..jumat\` | \`.besok\` | \`.mingguini\` | \`.kuliahberikutnya\`\n` +
          `• \`.matkul\` | \`.dosen [matkul]\` | \`.materi\` | \`.ask <pertanyaan>\`\n` +
          `• \`.buatkelompok <jumlah> <nama1,nama2,...>\` | \`.kalender\` | \`.countdown <YYYY-MM-DD>\`\n` +
          `• \`.suratizin <nama>|<matkul>|<YYYY-MM-DD>|<alasan>\` | \`.bmi <kg> <cm>\`\n` +
          `• \`.groups\` | \`.groups add <jid> <nama>\` | \`.groups pause <jid>\` | \`.groups resume <jid>\`\n` +
          `• \`.pending\` | \`.approve <id>\` | \`.reject <id>\` | \`.send <id>\`\n` +
          `• \`.admin pause\` (emergency stop) | \`.admin resume\` | \`.audit\``
        );

      case 'status':
      case 'health':
      case 'system': {
        const h = await runHealth({ config, whatsapp: this.deps.whatsapp, startedAt: this.deps.startedAt, now: () => now });
        const ai = router.status();
        return (
          `🩺 *Health & Ready Check ${config.BOT_NAME} (via WA Admin)*\n` +
          `• Kesehatan: *${h.status.toUpperCase()}* (uptime ${h.uptimeSec}s)\n` +
          `• WhatsApp (${this.deps.whatsapp.name}): *${this.deps.whatsapp.state()}*\n` +
          `• NVIDIA AI: mode=${ai.mode} | calls=${ai.totalCalls}${ai.lastError ? ` | err=${ai.lastError}` : ''}\n` +
          `• Outbound: ${config.OUTBOUND_ENABLED ? 'ENABLED' : 'DISABLED'} | Dry-Run: ${config.DRY_RUN ? 'ON' : 'OFF'} | EmergencyStop: ${outbound.isEmergencyStopped() ? 'ON' : 'OFF'}`
        );
      }

      case 'dashboard': {
        const h = await runHealth({ config, whatsapp: this.deps.whatsapp, startedAt: this.deps.startedAt, now: () => now });
        const ai = router.status();
        const gi = intelligence.stats();
        const next = schedule.getNextSession(now);
        const nextTxt = next
          ? `${next.session.courseName} (${next.session.weekdayLabel} ${next.session.startTime}–${next.session.endTime} WIB)`
          : 'Tidak ada sesi terjadwal';
        return (
          `📊 *DASHBOARD ${config.BOT_NAME.toUpperCase()} — Halo ${config.OWNER_NAME}*\n` +
          `• WhatsApp (${this.deps.whatsapp.name}): *${this.deps.whatsapp.state()}*\n` +
          `• NVIDIA AI: *${config.NVIDIA_API_KEY ? 'Terkonfigurasi' : 'Belum diisi'}* | Mode: *${ai.mode}*\n` +
          `• Model aktif: Lightning=${ai.models.lightning.modelId}, Super-VL=${ai.models['super-vl'].modelId}, Ultra=${ai.models.ultra.modelId}\n` +
          `• Grup sumber aktif: *${gi.activeSources}*\n` +
          `• Pesan diproses hari ini: *${gi.processedToday}* (Penting: *${gi.importantCount}*)\n` +
          `• Menunggu review Hedy: *${gi.pendingReviewCount}*\n` +
          `• Kuliah berikutnya: *${nextTxt}*\n` +
          `• Outbound Emergency Stop: *${outbound.isEmergencyStopped() ? 'AKTIF (diblokir)' : 'Normal'}*\n` +
          `• Error terakhir: ${ai.lastError ?? 'tidak ada'} | Health: ${h.status.toUpperCase()}`
        );
      }

      case 'ai.status':
      case 'ai.models': {
        const s = router.status();
        return (
          `🧠 *NVIDIA Nemotron Router Status*\n` +
          `• Mode: *${s.mode}*${s.pinnedUntil ? ` (sampai ${s.pinnedUntil})` : ''}\n` +
          `• Fallback: ${s.fallbackEnabled ? 'ON' : 'OFF'} | Total Panggilan: ${s.totalCalls}\n` +
          `• *lightning* (fast): \`${s.models.lightning.modelId}\` [${s.models.lightning.healthy ? 'healthy' : 'unhealthy'}]\n` +
          `• *super-vl* (vision): \`${s.models['super-vl'].modelId}\` [${s.models['super-vl'].healthy ? 'healthy' : 'unhealthy'}]\n` +
          `• *ultra* (reasoning): \`${s.models.ultra.modelId}\` [${s.models.ultra.healthy ? 'healthy' : 'unhealthy'}]`
        );
      }

      case 'ai.model': {
        const alias = (parsed.args[0] ?? '').toLowerCase();
        if (alias !== 'lightning' && alias !== 'super-vl' && alias !== 'ultra') {
          return '⚠️ Pilih alias model yang valid: `lightning`, `super-vl`, atau `ultra`.';
        }
        router.setMode(`pinned:${alias}`);
        this.recordAudit(actorJid, 'ai.model.pin', 'ok', alias);
        return `✅ Model di-pin sementara ke *${alias}* (${router.status().models[alias].modelId}). Akan kembali ke auto setelah TTL berakhir.`;
      }

      case 'ai.auto': {
        const arg = (parsed.args[0] ?? 'on').toLowerCase();
        router.setMode(arg === 'off' ? 'off' : 'auto');
        this.recordAudit(actorJid, 'ai.auto', 'ok', arg);
        return `✅ Mode router AI diatur ke *${router.status().mode}*.`;
      }

      case 'ai.test': {
        const prompt = parsed.rawArgs || 'Halo, sebutkan peranmu secara singkat dalam Bahasa Indonesia.';
        try {
          const out = await router.invoke({
            task: 'faq',
            modality: 'text',
            messages: [
              { role: 'system', content: 'Kamu adalah HdyBot, asisten Nursing Class A Semester 5A. Jawab singkat dalam Bahasa Indonesia.' },
              { role: 'user', content: prompt },
            ],
          });
          return `🧪 *Hasil Uji NVIDIA (${out.alias} — ${out.modelId}):*\n${out.text}`;
        } catch (e) {
          return `⚠️ Uji NVIDIA gagal: ${e instanceof Error ? e.message : 'unknown'}`;
        }
      }

      case 'schedule': {
        const today = schedule.getToday(now);
        return schedule.formatDayText(today.weekdayLabel, today.sessions, today.dateIso);
      }

      case 'schedule.tomorrow': {
        const tmr = schedule.getTomorrow(now);
        return schedule.formatDayText(tmr.weekdayLabel, tmr.sessions, tmr.dateIso);
      }

      case 'schedule.day': {
        const dayArg = parsed.args[0] ?? 'senin';
        const wd = ScheduleService.resolveWeekday(dayArg);
        if (!wd) return `⚠️ Nama hari tidak dikenali: ${dayArg}`;
        const sessions = schedule.getForWeekday(wd);
        return schedule.formatDayText(dayArg.charAt(0).toUpperCase() + dayArg.slice(1), sessions);
      }

      case 'schedule.week': {
        const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const;
        return days
          .map((d) => {
            const s = schedule.getForWeekday(d);
            return schedule.formatDayText(s[0]?.weekdayLabel ?? d, s);
          })
          .join('\n\n');
      }

      case 'schedule.next': {
        const next = schedule.getNextSession(now);
        if (!next) return '📭 Tidak ada jadwal kuliah berikutnya dalam 7 hari ke depan.';
        const s = next.session;
        return (
          `⏭️ *Kuliah Berikutnya (${next.dateIso} — ${s.weekdayLabel})*\n` +
          `• Jam: *${s.startTime}–${s.endTime} WIB*\n` +
          `• Mata Kuliah: *${s.courseName}* (${s.creditsSks} SKS)\n` +
          `• Ruang: ${s.room ?? 'belum ditentukan'}\n` +
          `• Kandidat Dosen (perlu konfirmasi sesi): ${s.lecturerCandidates.join('; ')}`
        );
      }

      case 'courses':
      case 'schedule.today_courses': {
        const list = schedule.listCourses();
        const lines = list.map((c, i) => `${i + 1}. *${c.normalizedName}* [${c.code}] — ${c.creditsSks} SKS`);
        return (
          `📚 *Mata Kuliah Semester 5A (${config.CLASS_NAME})*\n` +
          lines.join('\n') +
          `\nTotal SKS Mata Kuliah: *${schedule.totalCourseCreditsSks()} SKS* (status: perlu verifikasi dokumen resmi)`
        );
      }

      case 'lecturers':
      case 'schedule.today_lecturers': {
        const list = schedule.listLecturers(parsed.rawArgs || undefined);
        if (!list.length) return '📭 Tidak ditemukan data dosen untuk kata kunci tersebut.';
        const lines = list.map((l, i) => `${i + 1}. [${l.course_code}] ${l.raw_name} (${l.verification_status})`);
        return (
          `👩‍🏫 *Daftar Asosiasi Dosen Semester 5A*\n` +
          lines.join('\n') +
          `\n_Catatan: Daftar ini adalah tim dosen per mata kuliah dari data awal, bukan penugasan dosen per sesi._`
        );
      }

      case 'materials':
      case 'materials.search': {
        const mats = this.kb.listMaterials(parsed.rawArgs || undefined);
        const refs = SHJ_OFFICIAL_REFERENCES.map((r) => `• ${r.label}: ${r.url} (${r.status})`).join('\n');
        if (!mats.length) {
          return (
            `📂 *Katalog Materi Nursing Class A*\n` +
            `Belum ada file materi lokal yang diunggah untuk filter tersebut.\n\n` +
            `🔗 *Referensi Resmi Kampus (SHJ):*\n${refs}`
          );
        }
        return (
          `📂 *Katalog Materi Nursing Class A (${mats.length})*\n` +
          mats.map((m, i) => `${i + 1}. *${m.title}* [${m.courseCode ?? 'UMUM'}] (${m.kind.toUpperCase()} | ${m.verification})`).join('\n')
        );
      }

      case 'ask': {
        if (!parsed.rawArgs) return '⚠️ Format: `.ask <pertanyaan materi keperawatan>`';
        return this.kb.answerGroundedQuestion(parsed.rawArgs).formattedAnswer;
      }

      case 'groupgen': {
        const count = Number(parsed.args[0] ?? '0');
        const namesRaw = parsed.args.slice(1).join(' ');
        const names = namesRaw.split(',').map((s) => s.trim()).filter(Boolean);
        if (!count || names.length < count) {
          return '⚠️ Format: `.buatkelompok <jumlah_kelompok> <nama1, nama2, nama3, ...>`';
        }
        const groups = this.groupGen.generateFairGroups(names, count);
        return (
          `👥 *Hasil Pembagian Kelompok Adil (${groups.length} Kelompok)*\n` +
          groups
            .map(
              (g) =>
                `*Kelompok ${g.groupNumber}* (Ketua: ${g.roles.leader}):\n` +
                `Anggota: ${g.members.join(', ')}`,
            )
            .join('\n\n')
        );
      }

      case 'calendar': {
        const events = this.calendar.listEvents();
        if (!events.length) {
          return '🗓️ Belum ada tanggal kalender akademik resmi yang dikonfirmasi di database.';
        }
        return (
          `🗓️ *Kalender Akademik Nursing Class A*\n` +
          events.map((e, i) => `${i + 1}. *${e.dateIso}* — [${e.category}] ${e.title} (${e.verification})`).join('\n')
        );
      }

      case 'countdown': {
        const target = parsed.args[0] ?? '';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(target)) return '⚠️ Format: `.countdown YYYY-MM-DD`';
        const days = this.calendar.countdownDays(target, now);
        return `⏳ Hitung mundur menuju *${target}*: *${days} hari*.`;
      }

      case 'doc.permission': {
        const parts = parsed.rawArgs.split('|').map((s) => s.trim());
        if (parts.length < 4) {
          return '⚠️ Format: `.suratizin <Nama Mahasiswa>|<Mata Kuliah>|<YYYY-MM-DD>|<Alasan>`';
        }
        return this.documents.generatePermissionLetterDraft({
          studentName: parts[0]!,
          courseName: parts[1]!,
          dateIso: parts[2]!,
          reason: parts[3]!,
        });
      }

      case 'doc.minutes': {
        const parts = parsed.rawArgs.split('|').map((s) => s.trim());
        if (parts.length < 3) {
          return '⚠️ Format: `.notulensi <Judul Rapat>|<YYYY-MM-DD>|<Keputusan 1; Keputusan 2>`';
        }
        return this.documents.generateMinutesDraft({
          title: parts[0]!,
          dateIso: parts[1]!,
          attendeesCount: 30,
          decisions: parts[2]!.split(';').map((d) => d.trim()).filter(Boolean),
        });
      }

      case 'gamification.privacy': {
        const toggle = (parsed.args[0] ?? '').toLowerCase();
        const enable = toggle === 'on' || toggle === 'true';
        this.gamification.setOptIn(msg.senderJid, enable);
        return enable
          ? '✅ Anda telah *opt-in* ke fitur XP & Gamification akademik.'
          : '🔒 Fitur Gamification Anda telah *dinonaktifkan (opt-out)* dan data XP Anda dihapus.';
      }

      case 'gamification.leaderboard': {
        const board = this.gamification.leaderboard();
        if (!board.length) return '🏆 Belum ada peserta opt-in pada papan peringkat akademik.';
        return (
          `🏆 *Leaderboard Akademik (Opt-In)*\n` +
          board.map((b, i) => `${i + 1}. ${b.userJid} — ${b.xp} XP (Level ${b.level})`).join('\n')
        );
      }

      case 'util.bmi': {
        const w = Number(parsed.args[0]);
        const h = Number(parsed.args[1]);
        if (!w || !h) return '⚠️ Format: `.bmi <berat_kg> <tinggi_cm>`';
        const res = UtilityService.calculateBmi(w, h);
        return `⚖️ *Kalkulator BMI Edukatif*: BMI = *${res.bmi}* (Kategori: *${res.category}*).`;
      }

      case 'groups':
      case 'groups.sources': {
        const sources = intelligence.listSources();
        if (!sources.length) return '📭 Belum ada grup sumber yang didaftarkan.';
        return (
          `👥 *Grup Sumber Terdaftar*\n` +
          sources.map((g, i) => `${i + 1}. ${g.name} (\`${g.jid}\`) — ${g.paused ? 'PAUSED' : 'AKTIF'} [${g.reliability}]`).join('\n')
        );
      }

      case 'groups.add': {
        const jid = parsed.args[0];
        const name = parsed.args.slice(1).join(' ') || 'Grup Sumber';
        if (!jid || !jid.endsWith('@g.us')) return '⚠️ Format: `.groups add <id@g.us> <Nama Grup>`';
        intelligence.registerSourceGroup(jid, name);
        this.recordAudit(actorJid, 'groups.add', 'ok', jid);
        return `✅ Grup sumber *${name}* (\`${jid}\`) terdaftar dan aktif.`;
      }

      case 'groups.pause': {
        const jid = parsed.args[0] ?? '';
        const ok = intelligence.pauseSourceGroup(jid);
        outbound.pauseGroup(jid);
        this.recordAudit(actorJid, 'groups.pause', ok ? 'ok' : 'not_found', jid);
        return ok ? `⏸️ Pemantauan & pengiriman grup \`${jid}\` dijeda.` : `⚠️ Grup \`${jid}\` tidak ditemukan.`;
      }

      case 'groups.resume': {
        const jid = parsed.args[0] ?? '';
        const ok = intelligence.resumeSourceGroup(jid);
        outbound.resumeGroup(jid);
        this.recordAudit(actorJid, 'groups.resume', ok ? 'ok' : 'not_found', jid);
        return ok ? `▶️ Pemantauan & pengiriman grup \`${jid}\` dilanjutkan.` : `⚠️ Grup \`${jid}\` tidak ditemukan.`;
      }

      case 'pending':
      case 'filter.review': {
        const items = intelligence.listPendingReviews();
        if (!items.length) return '✅ Tidak ada pesan di antrean review saat ini.';
        return (
          `📝 *Antrean Review Hedy (${items.length})*\n` +
          items
            .map(
              (it) =>
                `• *${it.id}* [${it.analysis.category}/${it.analysis.topic}] (conf=${it.analysis.confidence})\n` +
                `  Ringkasan: ${it.analysis.summary}\n` +
                `  Ketik \`.approve ${it.id}\` atau \`.reject ${it.id} <alasan>\``,
            )
            .join('\n\n')
        );
      }

      case 'approve': {
        const id = parsed.args[0] ?? '';
        const item = intelligence.approve(id, actorJid);
        if (!item) return `⚠️ Item review \`${id}\` tidak ditemukan atau sudah diproses.`;
        this.recordAudit(actorJid, 'review.approve', 'ok', item.id);
        return (
          `✅ *${item.id}* disetujui.\n\n` +
          `Preview pengumuman:\n${item.draftAnnouncementText}\n\n` +
          `Untuk mengirim ke grup utama, jalankan \`.send ${item.id}\` (memerlukan konfirmasi nonce).`
        );
      }

      case 'reject': {
        const id = parsed.args[0] ?? '';
        const reason = parsed.args.slice(1).join(' ') || 'Ditolak oleh Hedy';
        const item = intelligence.reject(id, actorJid, reason);
        if (!item) return `⚠️ Item review \`${id}\` tidak ditemukan atau sudah diproses.`;
        this.recordAudit(actorJid, 'review.reject', 'ok', item.id);
        return `🚫 *${item.id}* ditolak. Alasan: ${reason}`;
      }

      case 'send':
      case 'broadcast.send': {
        const id = (parsed.args[0] ?? '').toUpperCase();
        const item = intelligence.getReviewItem(id);
        if (!item || item.status !== 'approved') {
          return `⚠️ Item \`${id}\` belum berstatus approved. Jalankan \`.approve ${id}\` terlebih dahulu.`;
        }
        const pending = confirmations.issue(
          actorJid,
          'send_announcement',
          `Kirim pengumuman ${item.id} ke ${item.targetGroupJid}`,
          { reviewId: item.id, targetGroupJid: item.targetGroupJid, text: item.draftAnnouncementText },
        );
        this.recordAudit(actorJid, 'send.request_confirmation', 'nonce_issued', item.id);
        return (
          `🔒 *Konfirmasi Pengiriman Pengumuman*\n` +
          `Target: \`${item.targetGroupJid}\`\n` +
          `Isi:\n${item.draftAnnouncementText}\n\n` +
          `Balas dengan \`.confirm ${pending.nonce}\` untuk mengirim atau \`.cancel ${pending.nonce}\` untuk membatalkan.`
        );
      }

      case 'confirm': {
        const nonce = parsed.args[0] ?? '';
        const res = confirmations.confirm(actorJid, nonce);
        if (!res.ok) {
          this.recordAudit(actorJid, 'confirm', `failed:${res.reason}`, nonce);
          return `❌ Konfirmasi gagal: *${res.reason}*.`;
        }
        const { item } = res;
        if (item.action === 'send_announcement') {
          const payload = item.payload as { reviewId: string; targetGroupJid: string; text: string };
          const sendRes = await outbound.send({
            chatJid: payload.targetGroupJid,
            text: payload.text,
            idempotencyKey: `ann-${payload.reviewId}-${item.nonce}`,
          });
          this.recordAudit(actorJid, 'announcement.send', sendRes.ok ? 'sent' : `error:${sendRes.error}`, payload.reviewId);
          if (!sendRes.ok) {
            return `❌ Gagal mengirim ke grup: ${sendRes.error}`;
          }
          intelligence.markSent(payload.reviewId);
          return `✅ Pengumuman *${payload.reviewId}* terkirim (${sendRes.dryRun ? 'DRY-RUN' : sendRes.providerMessageId}).`;
        }
        this.recordAudit(actorJid, `confirm:${item.action}`, 'ok', item.nonce);
        return `✅ Aksi *${item.action}* berhasil dikonfirmasi dan dijalankan.`;
      }

      case 'cancel': {
        const nonce = parsed.args[0] ?? '';
        const ok = confirmations.cancel(actorJid, nonce);
        this.recordAudit(actorJid, 'cancel', ok ? 'ok' : 'not_found', nonce);
        return ok ? `✅ Konfirmasi \`${nonce}\` dibatalkan.` : `⚠️ Nonce \`${nonce}\` tidak ditemukan atau sudah tidak berlaku.`;
      }

      case 'emergency.stop':
        outbound.triggerEmergencyStop();
        this.recordAudit(actorJid, 'emergency.stop', 'activated');
        return '🛑 *EMERGENCY STOP AKTIF*. Seluruh pengiriman pesan keluar ke grup dihentikan seketika.';

      case 'emergency.resume':
        outbound.clearEmergencyStop();
        this.recordAudit(actorJid, 'emergency.resume', 'cleared');
        return '▶️ *Emergency Stop dinonaktifkan*. Pengiriman kembali mengikuti kebijakan normal.';

      case 'audit': {
        const recent = this.auditLogs.slice(-10);
        if (!recent.length) return '📋 Belum ada entri audit log.';
        return (
          `📋 *Audit Log Terbaru (${recent.length})*\n` +
          recent.map((a) => `• ${a.at} | ${a.action} | ${a.result}${a.target ? ` (${a.target})` : ''}`).join('\n')
        );
      }

      default:
        return `ℹ️ Perintah belum dikenali. Ketik \`.help\` untuk daftar lengkap perintah HdyBot.`;
    }
  }
}
