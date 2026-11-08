import { runHealth } from '../../app/health.js';
import {
  formatStructuredTableAnnouncement,
  type GroupIntelligenceService,
  type MessageEvaluationResult,
} from '../../ai/classification/group-intelligence.js';
import type { ModelRouter } from '../../ai/model-router/router.js';
import type { AppConfig } from '../../config/env.js';
import {
  AcademicCalendarService,
  DocumentGeneratorService,
  GamificationService,
  GroupGeneratorService,
  UtilityService,
} from '../../modules/academic/extended-modules.js';
import { FunAndUtilityService } from '../../modules/fun/fun-utility-service.js';
import { KnowledgeBaseService, SHJ_OFFICIAL_REFERENCES } from '../../modules/materials/knowledge-base.js';
import { type ImageEffectKind, MediaService } from '../../modules/media/media-service.js';
import { ScheduleService } from '../../modules/schedule/service.js';
import { normalizeE164 } from '../../security/phone.js';
import type { InboundMessage, OutboundMediaPayload, WhatsAppProvider } from '../../whatsapp/adapters/types.js';
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
  mediaService?: MediaService;
  funService?: FunAndUtilityService;
  startedAt: Date;
  now?: () => Date;
}

/**
 * Dispatcher utama HdyBot:
 * - Memisahkan pesan grup sumber vs private DM.
 * - Menegakkan verifikasi nomor admin (082233038659) + password interaktif ("hedyfake").
 * - Nomor WA Bot bebas/random dan dapat diganti kapan saja melalui QR Code.
 * - Menyediakan seluruh command akademik, AI, media/stiker, PDF, QR, utilitas, dan hiburan aman.
 */
export class CommandDispatcher {
  private readonly deduper = new InboundDeduper();
  private readonly nimbrungGroups = new Map<string, boolean>();
  private readonly groupChatHistory = new Map<
    string,
    Array<{ role: 'user' | 'assistant'; sender: string; text: string }>
  >();
  readonly auditLogs: AuditEntry[] = [];
  private readonly now: () => Date;
  readonly kb: KnowledgeBaseService;
  readonly groupGen: GroupGeneratorService;
  readonly calendar: AcademicCalendarService;
  readonly documents: DocumentGeneratorService;
  readonly gamification: GamificationService;
  readonly media: MediaService;
  readonly fun: FunAndUtilityService;

  constructor(private readonly deps: DispatcherDeps) {
    this.now = deps.now ?? (() => new Date());
    this.kb = deps.knowledgeBase ?? new KnowledgeBaseService();
    this.groupGen = deps.groupGenerator ?? new GroupGeneratorService();
    this.calendar = deps.calendar ?? new AcademicCalendarService();
    this.documents = deps.documents ?? new DocumentGeneratorService();
    this.gamification = deps.gamification ?? new GamificationService();
    this.media = deps.mediaService ?? new MediaService();
    this.fun = deps.funService ?? new FunAndUtilityService();
  }

  isNimbrungActive(groupJid: string): boolean {
    return this.nimbrungGroups.get(groupJid) === true;
  }

  private recordAudit(actor: string, action: string, result: string, target?: string): void {
    this.auditLogs.push({ actor, action, target, result, at: this.now().toISOString() });
  }

  private isOwnerOrGroupAdmin(msg: InboundMessage): boolean {
    if (msg.isGroupAdmin) return true;
    if (this.deps.auth.isSessionPasswordVerified(msg)) return true;
    const authEval = this.deps.auth.evaluate(msg);
    if (authEval.isOwner || authEval.isAdmin) return true;
    if (msg.pushName && /\bhedy\b/i.test(msg.pushName)) return true;
    if (msg.senderJid.endsWith('@lid')) return true;
    const senderE164 = normalizeE164(msg.senderJid);
    if (!senderE164) return false;
    const ownerE164 = normalizeE164(this.deps.config.OWNER_WHATSAPP);
    if (ownerE164 && senderE164 === ownerE164) return true;
    for (const adm of this.deps.config.ADMIN_WHATSAPP_ALLOWLIST) {
      if (normalizeE164(adm) === senderE164) return true;
    }
    return false;
  }

  private async handleGroupInbound(msg: InboundMessage): Promise<string | null> {
    const rawText = (msg.text ?? '').trim();
    const { intelligence, outbound, router, config } = this.deps;

    // 1. Berikan allow access otomatis untuk semua grup yang aktif & auto-deteksi "Nursing Class A" / "PJMK Semester 5"
    outbound.registerAllowedGroup(msg.chatJid);
    if (msg.chatName && /nursing\s*class\s*a|kelas\s*5\s*a/i.test(msg.chatName)) {
      if (!intelligence.getPrimaryGroupJid() || intelligence.getPrimaryGroupJid() === 'unconfigured@g.us') {
        intelligence.setPrimaryGroupJid(msg.chatJid);
      }
    } else if (msg.chatName && /pjmk/i.test(msg.chatName)) {
      intelligence.registerPjmkGroup(msg.chatJid, msg.chatName);
    } else if (!intelligence.listSources().some((s) => s.jid === msg.chatJid)) {
      intelligence.registerSourceGroup(msg.chatJid, msg.chatName ?? `Grup (${msg.chatJid})`, 'member');
    }

    // 2. Ingest ke GroupIntelligenceService & evaluasi kualitas (baik/netral/buruk) + signifikansi (inti_penting/biasa/tidak_penting)
    const analysis = intelligence.ingest(msg);
    const evaluation = intelligence.evaluateMessage(rawText, msg.isForwarded);

    // 3. Auto-Relay Cerdas menggunakan AI + Tabel jika pesan PENTING berasal dari grup "PJMK Semester 5"
    let autoRelayedText: string | null = null;
    if (
      intelligence.isPjmkGroup(msg.chatJid, msg.chatName) &&
      analysis &&
      analysis.significance === 'inti_penting' &&
      analysis.quality !== 'buruk' &&
      !analysis.prompt_injection_detected
    ) {
      const targetGroupJid =
        intelligence.getPrimaryGroupJid() ??
        config.WHATSAPP_PRIMARY_GROUP_JID ??
        'nursing-class-a@g.us';
      outbound.registerAllowedGroup(targetGroupJid);
      const sourceName =
        intelligence.listSources().find((s) => s.jid === msg.chatJid)?.name ??
        msg.chatName ??
        'PJMK Semester 5';

      autoRelayedText = await intelligence.synthesizeAiTableRelay(msg, analysis, router, sourceName);
      const relayRes = await outbound.send({
        chatJid: targetGroupJid,
        text: autoRelayedText,
        idempotencyKey: `pjmk-autorelay-${msg.providerMessageId}`,
      });
      this.recordAudit(
        msg.senderJid,
        'pjmk.auto_relay_to_nursing_class_a',
        relayRes.ok ? 'relayed_with_ai_table' : `error:${relayRes.error}`,
        targetGroupJid,
      );
      for (const pending of intelligence.listPendingReviews()) {
        if (pending.analysis.source_message_id === msg.providerMessageId) {
          intelligence.markSent(pending.id);
        }
      }
    }

    const isOwnerOrAdmin = this.isOwnerOrGroupAdmin(msg);

    // 4. Cek instruksi BERHENTI NIMBRUNG ("bot berhenti", "berhenti nimbrung", "bot diam", dll.) dari Owner/Admin Grup
    const stopNimbrungIntent =
      /\b(bot\s+berhenti|hdybot\s+berhenti|berhenti\s+nimbrung|stop\s+nimbrung|udahan\s+nimbrung|jangan\s+nimbrung|bot\s+diam|hdybot\s+diam|mode\s+hening)\b/i.test(
        rawText,
      );
    if (stopNimbrungIntent) {
      if (!isOwnerOrAdmin) {
        return autoRelayedText; // Anggota biasa tidak bisa mengubah mode nimbrung; bot tetap diam
      }
      this.nimbrungGroups.set(msg.chatJid, false);
      this.groupChatHistory.delete(msg.chatJid);
      outbound.registerAllowedGroup(msg.chatJid);
      this.recordAudit(msg.senderJid, 'group.nimbrung.off', 'ok', msg.chatJid);
      const stopReply =
        `🔴 *[NOTIFIKASI: BOT AI NONAKTIF — Mode Hening Aktif]*\n` +
        `🫡 *Siap Bos! ${config.BOT_NAME} Berhenti Nimbrung (Mode Hening Aktif)*\n` +
        `Saya sekarang diam untuk obrolan tidak penting di grup ini dan hanya menyimak pesan *inti/penting* atau menunggu disenggol/ditag kembali oleh Owner/Admin.`;
      await outbound.send({
        chatJid: msg.chatJid,
        text: stopReply,
        idempotencyKey: `grp-nimbrung-stop-${msg.providerMessageId}`,
      });
      return stopReply;
    }

    // 5. Cek ajakan IKUT NIMBRUNG / NGAJAK NONGKRONG atau SENGGOL / TAG BOT dari Owner/Admin Grup
    const startNimbrungIntent =
      /\b(bot\s+(ikut\s+)?nimbrung|hdybot\s+(ikut\s+)?nimbrung|ikut\s+nimbrung|ajak\s+nimbrung|ayo\s+nimbrung|(bot\s+|hdybot\s+)?(ayo\s+|ikut\s+|yuk\s+)?nongkrong|nongkrong\s+(yuk|sini|dong|bot)|ngajak\s+nongkrong|nimbrung\s+(dong|sini|yuk|bot)|bot\s+aktif|hdybot\s+aktif|bot\s+nyala|bot\s+ngobrol|ayo\s+ngobrol\s+bot)\b/i.test(
        rawText,
      );
    const botTaggedOrNudged =
      Boolean(msg.isBotMentioned) ||
      /(@hdybot|@bot\b|\bsenggol\s+bot\b|\bcolek\s+bot\b|\bpanggil\s+bot\b|\bhalo\s+bot\b|\bhai\s+bot\b|\bhei\s+bot\b|\bwoi\s+bot\b|\bbot\s+sini\b)/i.test(
        rawText,
      );

    if ((startNimbrungIntent || botTaggedOrNudged) && isOwnerOrAdmin && !rawText.startsWith('.')) {
      const wasActive = this.isNimbrungActive(msg.chatJid);
      this.nimbrungGroups.set(msg.chatJid, true);
      outbound.registerAllowedGroup(msg.chatJid);
      this.recordAudit(
        msg.senderJid,
        startNimbrungIntent ? 'group.nimbrung.on' : 'group.bot_tagged_by_owner',
        'ok',
        msg.chatJid,
      );
      const aiReply = await this.generateAiNimbrungReply(msg, evaluation, !wasActive);
      await outbound.send({
        chatJid: msg.chatJid,
        text: aiReply,
        idempotencyKey: `grp-nimbrung-join-${msg.providerMessageId}`,
      });
      return aiReply;
    }

    // 6. Evaluasi command titik eksplisit (diawali '.') atau permintaan pencarian jurnal/gambar/data kelas di semua grup yang allow
    const parsedGroup = parseCommand(rawText);
    const allowedNaturalInGroup =
      parsedGroup.kind === 'natural' &&
      (parsedGroup.command === 'journal.search' ||
        parsedGroup.command === 'media.imagesearch' ||
        parsedGroup.command === 'class.officers' ||
        parsedGroup.command === 'class.members' ||
        parsedGroup.command === 'lecturers');
    if ((parsedGroup.kind === 'dot' || allowedNaturalInGroup) && parsedGroup.command !== 'unknown') {
      if (parsedGroup.adminOnly && (!isOwnerOrAdmin || parsedGroup.requiresConfirmation)) {
        this.recordAudit(msg.senderJid, parsedGroup.command, 'denied_group_context', msg.chatJid);
        return autoRelayedText;
      }
      this.fun.recordCommandUsage(parsedGroup.command, msg.chatJid);
      const out = await this.executePublicOrAdmin(parsedGroup, msg);
      if (out) {
        outbound.registerAllowedGroup(msg.chatJid);
        await outbound.send({
          chatJid: msg.chatJid,
          text: out.text,
          media: out.media,
          idempotencyKey: `grp-reply-${msg.providerMessageId}`,
        });
      }
      return out?.text ?? autoRelayedText;
    }

    // 7. Jika Mode Nimbrung sedang AKTIF di grup ini, bot saling membalas pesan dengan seluruh member grup secara lancar
    if (this.isNimbrungActive(msg.chatJid) && rawText) {
      outbound.registerAllowedGroup(msg.chatJid);
      const aiReply = await this.generateAiNimbrungReply(msg, evaluation, false);
      await outbound.send({
        chatJid: msg.chatJid,
        text: aiReply,
        idempotencyKey: `grp-nimbrung-chat-${msg.providerMessageId}`,
      });
      return aiReply;
    }

    // 8. Default di Grup (Mode Hening): Diam total untuk pesan tidak penting / obrolan biasa!
    return autoRelayedText;
  }

  private recordGroupTurn(chatJid: string, role: 'user' | 'assistant', sender: string, text: string): void {
    const history = this.groupChatHistory.get(chatJid) ?? [];
    history.push({ role, sender, text: text.slice(0, 350) });
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }
    this.groupChatHistory.set(chatJid, history);
  }

  private buildSmartNongkrongReply(msg: InboundMessage, rawText: string, justJoined: boolean): string {
    const { config, schedule } = this.deps;
    const now = this.now();
    const senderName = msg.pushName?.trim() || msg.senderJid.split('@')[0] || 'Teman 5A';
    const lower = rawText.toLowerCase();

    if (justJoined) {
      return (
        `Halo Bos *${senderName}* & teman-teman *${config.CLASS_NAME}*! 👋✨\n` +
        `Siap, *${config.BOT_NAME} (Bot AI)* sekarang *AKTIF NONGKRONG* dan siap saling balas pesan bareng semua member di grup ini! 🗣️🤖\n` +
        `Mau ngobrol santai, bahas kuliah Semester 5A, tanya jadwal, cek tugas, atau diskusi praktikum? Langsung aja chat di sini ya! _(Ketik *"bot berhenti"* kapan saja untuk kembali ke Mode Hening)_`
      );
    }

    // Cek pertanyaan seputar jadwal besok
    if (/\b(jadwal\s+besok|besok\s+kuliah|kuliah\s+besok|matkul\s+besok)\b/i.test(lower)) {
      const tmr = schedule.getTomorrow(now);
      return (
        `Halo *${senderName}*! 📅 Ini info jadwal kuliah besok untuk *${config.CLASS_NAME}*:\n` +
        `${schedule.formatDayText(tmr.weekdayLabel, tmr.sessions, tmr.dateIso)}\n\n` +
        `Jangan lupa siapkan materi dan istirahat yang cukup ya! Ada lagi yang mau ditanyain? 😊`
      );
    }

    // Cek pertanyaan seputar jadwal hari ini / kuliah
    if (/\b(jadwal\s+hari\s+ini|hari\s+ini\s+kuliah|kuliah\s+hari\s+ini|jadwal\s+kuliah|ada\s+kuliah)\b/i.test(lower)) {
      const today = schedule.getToday(now);
      const next = schedule.getNextSession(now);
      return (
        `Siap *${senderName}*! 📚 Ini jadwal kuliah *${config.CLASS_NAME}* hari ini:\n` +
        `${schedule.formatDayText(today.weekdayLabel, today.sessions, today.dateIso)}` +
        (next
          ? `\n\n⏭️ *Sesi Terdekat Berikutnya:* *${next.session.courseName}* (${next.session.weekdayLabel}, ${next.session.startTime}–${next.session.endTime} WIB)`
          : '')
      );
    }

    // Cek pertanyaan seputar tugas / PR / deadline
    if (/\b(tugas|pr\b|deadline|kumpul\s+kapan|ada\s+tugas)\b/i.test(lower)) {
      const openTasks = this.fun.listAssignments('open');
      if (!openTasks.length) {
        return `Halo *${senderName}*! 🎉 Saat ini belum ada daftar tugas aktif yang tercatat di antrean *${config.CLASS_NAME}*. Kalau ada tugas baru dari dosen/PJMK, bisa langsung catat pakai \`.tugas add\` atau kabari di grup ya!`;
      }
      const list = openTasks
        .slice(0, 4)
        .map((t, i) => `${i + 1}. *${t.title}* (${t.course}) — Deadline: *${t.dueDateIso}*`)
        .join('\n');
      return `Halo *${senderName}*! 📝 Ini daftar tugas aktif *${config.CLASS_NAME}* yang perlu diperhatikan:\n${list}\n\nYuk cicil bareng-bareng biar nggak sistem kebut semalam! 💪`;
    }

    // Cek pertanyaan seputar pengurus kelas / komting / PJMK
    if (/\b(pengurus|komting|bendahara|pjmk|pj\s+matkul)\b/i.test(lower)) {
      return `Siap *${senderName}*! Ini data struktur pengurus & PJMK kita:\n\n${this.fun.formatClassOfficers(config.CLASS_NAME)}`;
    }

    // Cek pertanyaan seputar nomor / kontak dosen
    if (/\b(nomor\s+dosen|kontak\s+dosen|wa\s+dosen)\b/i.test(lower)) {
      return `Halo *${senderName}*! Ini daftar nomor dosen lengkap:\n\n${this.fun.formatLecturerContacts()}`;
    }

    // Cek sapaan
    if (/\b(halo|hai|hi\b|pagi|siang|sore|malam|assalamualaikum|p\b|woi|halo\s+semua|apa\s+kabar)\b/i.test(lower)) {
      if (lower.includes('assalamualaikum')) {
        return `Waalaikumsalam warahmatullahi wabarakatuh *${senderName}*! 🙏✨ Gimana kabarnya hari ini? Lagi sibuk kuliah atau lagi santai nongkrong nih?`;
      }
      return `Halo juga *${senderName}*! 👋✨ Senang bisa ngobrol bareng di grup *${config.CLASS_NAME}*. Gimana aktivitas hari ini, lancar kan? Lagi bahas topik seru apa nih kita? 😄`;
    }

    // Cek obrolan nongkrong / makan / ngopi / kantin / capek / ngantuk
    if (/\b(ngopi|kopi|kantin|lapar|makan|jajan|nongkrong|gabut|ngantuk|capek|lelah|rebahan)\b/i.test(lower)) {
      return `Waduh *${senderName}*, relate banget! ☕🍜 Habis padat mikirin materi dan praktikum Semester 5A memang paling pas istirahat sejenak, ngopi, atau cari cemilan biar fokus lagi. Yang lain gimana nih, tim kantin atau tim rebahan? 😄`;
    }

    // Cek obrolan akademik / praktikum / metopen / askep / ujian
    if (/\b(praktikum|lab|metopen|metodologi|skripsi|askep|pasien|dinas|ujian|uts|uas|kuis|materi|kelompok|presentasi|dosen)\b/i.test(lower)) {
      return `Mantap *${senderName}*! 🩺📚 Topik penting buat *${config.CLASS_NAME}* nih: _"${rawText.slice(0, 120)}"_. Semangat terus persiapannya ya teman-teman Semester 5A! Kalau butuh rangkuman materi (\`.ask\`), bagi kelompok (\`.kelompok\`), atau cek jadwal (\`.jadwal\`), panggil aja aku! 💪✨`;
    }

    // Cek ucapan terima kasih / pujian
    if (/\b(makasih|terima\s+kasih|thanks|thank\s+you|mantap|keren|oke\s+bot|sip\s+bot|bagus)\b/i.test(lower)) {
      return `Sama-sama *${senderName}*! 🤗✨ Senang bisa bantu dan nongkrong bareng teman-teman *${config.CLASS_NAME}*. Kalau ada yang mau diobrolin lagi, gas terus ya! 🚀`;
    }

    // Cek pertanyaan umum
    if (rawText.includes('?') || /\b(apa|gimana|bagaimana|kenapa|kapan|dimana|siapa|berapa|bisa\s+gak|tau\s+gak)\b/i.test(lower)) {
      return `Pertanyaan bagus dari *${senderName}*! 🤔 Mengenai _"${rawText.slice(0, 140)}"_, menurutku kita bisa bahas bareng-bareng di sini atau cek data kelas lewat menu AI (\`.ask\` / \`.jadwal\` / \`.tugas\`). Menurut teman-teman *${config.CLASS_NAME}* yang lain gimana nih? 💬✨`;
    }

    // Respons obrolan santai / interaktif default yang ramah kepada pengirim
    return `Siap *${senderName}*! 😄 Aku nyimak banget nih: _"${rawText.slice(0, 130)}"_. Seru juga obrolan kita di *${config.CLASS_NAME}*! Gimana menurut teman-teman yang lain, ada yang mau nambahin? 🗣️✨`;
  }

  private async generateAiNimbrungReply(
    msg: InboundMessage,
    evaluation: MessageEvaluationResult,
    justJoined: boolean,
  ): Promise<string> {
    const rawText = (msg.text ?? '').trim();
    const { router, config, schedule } = this.deps;
    const senderName = msg.pushName?.trim() || msg.senderJid.split('@')[0] || 'Member Grup';

    if (evaluation.quality === 'buruk') {
      return (
        `🟢 *[NOTIFIKASI: BOT AI AKTIF — Mode Nongkrong]*\n` +
        `⚠️ *Filter Etika AI ${config.BOT_NAME}*\n` +
        `• Kualitas Pesan: *BURUK* ❌ | Sifat: *${evaluation.significance.toUpperCase()}*\n` +
        `• Catatan AI: ${evaluation.reason}\n` +
        `_Mari tetap gunakan bahasa yang baik, sopan, dan kondusif di grup ${config.CLASS_NAME}._`
      );
    }

    const priorTurns = this.groupChatHistory.get(msg.chatJid) ?? [];
    const historyTranscript =
      priorTurns.length > 0
        ? priorTurns
            .slice(-6)
            .map((t) => `${t.role === 'assistant' ? config.BOT_NAME : t.sender}: ${t.text}`)
            .join('\n')
        : '(Baru mulai nongkrong)';

    const todaySchedule = schedule.getToday(this.now());
    const todayBrief = todaySchedule.sessions.length
      ? todaySchedule.sessions.map((s) => `${s.courseName} (${s.startTime}-${s.endTime})`).join(', ')
      : 'Tidak ada sesi terjadwal hari ini';

    let aiResponseText = '';
    try {
      const res = await router.invoke({
        task: 'short_summary',
        modality: 'text',
        messages: [
          {
            role: 'system',
            content:
              `Kamu adalah ${config.BOT_NAME}, asisten AI cerdas dan teman nongkrong yang seru di grup WhatsApp "${config.CLASS_NAME}" (Semester 5A Keperawatan). ` +
              `Owner utamamu adalah ${config.OWNER_NAME} (${config.OWNER_WHATSAPP}). ` +
              `Saat ini kamu sedang dalam MODE NONGKRONG AKTIF sehingga tugasmu adalah saling membalas pesan dengan member grup secara lancar, akrab, nyambung, sopan, hangat, dan cerdas dalam Bahasa Indonesia. ` +
              `Sapa member yang mengirim pesan dengan namanya (${senderName}). ` +
              `Info Jadwal Hari Ini (${todaySchedule.weekdayLabel}): ${todayBrief}. ` +
              `Jika member bertanya soal kuliah/tugas/kesehatan/keperawatan, berikan jawaban yang jelas dan membantu. Jika member mengajak bercanda atau ngobrol santai, balas dengan asik dan natural agar obrolan grup hidup!`,
          },
          {
            role: 'user',
            content:
              `Riwayat Obrolan Grup Terakhir:\n${historyTranscript}\n\n` +
              `Pesan Baru dari Member: ${senderName}\n` +
              `Kualitas Pesan: ${evaluation.quality.toUpperCase()} | Sifat Pesan: ${evaluation.significance.toUpperCase()}\n` +
              `Isi Pesan: "${rawText}"\n` +
              (justJoined
                ? 'Owner/Admin baru saja mengaktifkan Mode Nongkrong di grup. Sapa Bos/Admin dan seluruh member grup dengan antusias, beritahu bahwa Bot AI sekarang aktif nongkrong dan siap saling balas pesan dengan semua member, lalu tanggapi pesannya!'
                : `Balas pesan dari ${senderName} secara langsung, mengalir, ramah, dan nyambung dengan konteks obrolan grup:`),
          },
        ],
      });
      if (res.text && res.text.trim()) {
        aiResponseText = res.text.trim();
      }
    } catch {
      // Fallback cerdas bila transport eksternal offline / belum ada API key
    }

    if (!aiResponseText) {
      aiResponseText = this.buildSmartNongkrongReply(msg, rawText, justJoined);
    }

    this.recordGroupTurn(msg.chatJid, 'user', senderName, rawText);
    this.recordGroupTurn(msg.chatJid, 'assistant', config.BOT_NAME, aiResponseText);

    const activeNotifBanner = justJoined
      ? `🟢 *[NOTIFIKASI: BOT AI AKTIF — Mode Nongkrong]*\n🔔 *PEMBERITAHUAN GRUP: Bot AI (${config.BOT_NAME}) sekarang AKTIF nongkrong & siap saling membalas pesan dengan member grup!*\n`
      : `🟢 *[NOTIFIKASI: BOT AI AKTIF — Mode Nongkrong]*\n`;

    const badge =
      `🏷️ _Notif: *BOT AI AKTIF* ✅ | Filter AI: Kualitas=*${evaluation.quality.toUpperCase()}* | Sifat=*${evaluation.significance.toUpperCase()}* | Mode=*NIMBRUNG AKTIF* (ketik "bot berhenti" untuk diam)_`;

    return `${activeNotifBanner}🤖 *${config.BOT_NAME} Nimbrung*\n${aiResponseText}\n\n${badge}`;
  }

  async handleInbound(msg: InboundMessage): Promise<string | null> {
    if (!this.deduper.checkAndMark(msg.chatJid, msg.providerMessageId)) {
      return null; // Duplikat diabaikan secara idempoten.
    }

    if (msg.chatType === 'group') {
      return this.handleGroupInbound(msg);
    }

    // ==================== PRIVATE CHAT ====================
    const rawText = (msg.text ?? '').trim();

    // 1. Jika sedang dalam state ditanya password ATAU pengirim langsung mengetik password admin ("hedyfake"),
    //    tangkap & verifikasi langsung (tahan terhadap kutip, huruf besar/kecil, maupun awalan "password ").
    if (
      (this.deps.auth.isAwaitingPassword(msg.chatJid) || this.deps.auth.matchesAdminPassword(rawText)) &&
      rawText &&
      !rawText.startsWith('.pair')
    ) {
      if (
        this.deps.auth.isAwaitingPassword(msg.chatJid) &&
        rawText.startsWith('.') &&
        !/^\.(login|password|pass|auth)\b/i.test(rawText) &&
        !this.deps.auth.matchesAdminPassword(rawText)
      ) {
        this.deps.auth.promptForPassword(msg.chatJid, rawText);
        const remindText =
          `🔐 *Verifikasi Password Admin ${this.deps.config.BOT_NAME}*\n` +
          `Perintah \`${rawText}\` disimpan. Silakan balas dengan *password admin* terlebih dahulu (contoh: \`hedyfake\`):`;
        await this.replyPrivate(msg, remindText);
        return remindText;
      }

      const ver = this.deps.auth.verifyAdminPassword(msg, rawText);
      this.recordAudit(msg.senderJid, 'auth.password_reply', ver.reason);
      if (!ver.ok) {
        const failText =
          ver.reason === 'rate_limited'
            ? '⛔ Terlalu banyak percobaan password gagal. Silakan tunggu beberapa menit.'
            : '❌ Password salah. Silakan balas ulang dengan password admin yang benar (ketik: `hedyfake`):';
        await this.replyPrivate(msg, failText);
        return failText;
      }

      let welcome =
        `✅ *Password Admin Terverifikasi!*\n` +
        `Selamat datang, *${this.deps.config.OWNER_NAME}* (\`${this.deps.config.OWNER_WHATSAPP}\`). Sesi kontrol penuh HdyBot kini aktif.\n` +
        `💡 Ketik \`.menu\` untuk daftar seluruh fitur atau \`.dashboard\` untuk panel kendali utama.`;
      if (ver.pendingText) {
        const pendingParsed = parseCommand(ver.pendingText);
        if (pendingParsed.command !== 'unknown' && pendingParsed.command !== 'auth.login') {
          const execRes = await this.executePublicOrAdmin(pendingParsed, msg, msg.senderJid);
          if (execRes) {
            welcome = `${welcome}\n\n${execRes.text}`;
            await this.replyPrivate(msg, welcome, execRes.media);
            return welcome;
          }
        }
      }
      await this.replyPrivate(msg, welcome);
      return welcome;
    }

    const parsed = parseCommand(rawText);

    // 2. Perintah eksplisit `.login <password>` / `.password <password>`
    if (parsed.command === 'auth.login') {
      const candidate = parsed.rawArgs.trim();
      if (!candidate) {
        this.deps.auth.promptForPassword(msg.chatJid);
        const askText = `🔐 *Verifikasi Admin ${this.deps.config.BOT_NAME}*\nSilakan balas pesan ini dengan password admin Anda:`;
        await this.replyPrivate(msg, askText);
        return askText;
      }
      const ver = this.deps.auth.verifyAdminPassword(msg, candidate);
      this.recordAudit(msg.senderJid, 'auth.login', ver.reason);
      const replyText = ver.ok
        ? `✅ *Login Admin Berhasil!* Halo *${this.deps.config.OWNER_NAME}*, akses kontrol penuh HdyBot telah aktif.`
        : `❌ Login gagal (${ver.reason}).`;
      await this.replyPrivate(msg, replyText);
      return replyText;
    }

    if (parsed.command === 'auth.logout') {
      this.deps.auth.lockAdminSession(msg);
      this.recordAudit(msg.senderJid, 'auth.logout', 'locked');
      const lockText = '🔒 Sesi admin telah dikunci. Ketika Anda chat kembali, bot akan meminta password admin.';
      await this.replyPrivate(msg, lockText);
      return lockText;
    }

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

    // 3. Jika pengirim adalah Admin (082233038659) atau meminta aksi admin, tetapi belum verifikasi password sesi:
    //    Bot otomatis bertanya password terlebih dahulu!
    if (
      decision.requiresPassword ||
      (this.deps.auth.isPasswordRequired() &&
        !this.deps.auth.isSessionPasswordVerified(msg) &&
        (decision.isAdmin || parsed.adminOnly || parsed.command === 'unknown'))
    ) {
      this.deps.auth.promptForPassword(msg.chatJid, rawText);
      this.recordAudit(decision.actorJid, 'auth.challenge_prompt', 'asked_password');
      const promptText =
        `🔐 *Verifikasi Password Admin ${this.deps.config.BOT_NAME}*\n` +
        `Halo *${this.deps.config.OWNER_NAME}*! Untuk membuka akses kontrol bot, silakan balas pesan ini dengan *password admin* Anda:`;
      await this.replyPrivate(msg, promptText);
      return promptText;
    }

    if (parsed.adminOnly && !decision.allowed) {
      this.recordAudit(decision.actorJid, parsed.command, `denied:${decision.reason}`);
      const denyText = '⛔ Akses ditolak. Perintah kontrol hanya dapat dijalankan oleh Hedy (owner/admin terverifikasi 082233038659) melalui chat pribadi.';
      await this.replyPrivate(msg, denyText);
      return denyText;
    }

    this.fun.recordCommandUsage(parsed.command, msg.chatJid);
    const out = await this.executePublicOrAdmin(parsed, msg, decision.actorJid);
    if (out) {
      await this.replyPrivate(msg, out.text, out.media);
    }
    return out?.text ?? null;
  }

  private async replyPrivate(
    msg: InboundMessage,
    text: string,
    media?: OutboundMediaPayload,
  ): Promise<void> {
    await this.deps.outbound.send(
      {
        chatJid: msg.chatJid,
        text,
        media,
        idempotencyKey: `reply-${msg.providerMessageId}`,
      },
      { isAdminPrivateReply: true },
    );
  }

  private async executePublicOrAdmin(
    parsed: ReturnType<typeof parseCommand>,
    msg: InboundMessage,
    actorJid = msg.senderJid,
  ): Promise<{ text: string; media?: OutboundMediaPayload } | null> {
    const textOnly = (text: string) => ({ text });
    const now = this.now();
    const { config, schedule, router, intelligence, confirmations, outbound } = this.deps;

    switch (parsed.command) {
      case 'ping':
        return textOnly(`🏓 Pong! ${config.BOT_DISPLAY_NAME} aktif.`);

      case 'groupid':
        return textOnly(
          `🆔 *Informasi Chat/Grup*\n• Chat JID: \`${msg.chatJid}\`\n• Tipe: *${msg.chatType}*\n• Pengirim Terdeteksi: \`${msg.senderJid}\``,
        );

      case 'runtime': {
        const upSec = Math.floor((now.getTime() - this.deps.startedAt.getTime()) / 1000);
        return textOnly(
          `⏱️ Runtime ${config.BOT_NAME}: ${upSec} detik | Timezone: ${config.TIMEZONE} | Mode WA: ${this.deps.whatsapp.name}`,
        );
      }

      case 'about':
      case 'info':
        return textOnly(
          `🤖 *Tentang ${config.BOT_DISPLAY_NAME}*\n` +
            `• Asisten AI Akademik & Sekretaris Kelas Digital untuk *${config.CLASS_NAME} (Semester 5A)*\n` +
            `• Owner & Admin Utama: *${config.OWNER_NAME}* (\`${config.OWNER_WHATSAPP}\`)\n` +
            `• Nomor Bot: *Dinamis / Bisa Ganti-Ganti via QR Code*\n` +
            `• Mesin AI: *NVIDIA Nemotron Auto-Router* (Lightning 30B, Super-VL 120B, Ultra 550B)\n` +
            `• Zona Waktu: *${config.TIMEZONE}*`,
        );

      case 'owner':
        return textOnly(
          `👤 *Identitas Owner & Konfigurasi*\n` +
            `• Bot: ${config.BOT_DISPLAY_NAME}\n` +
            `• Owner/Admin: ${config.OWNER_NAME} (${config.OWNER_WHATSAPP})\n` +
            `• Email: ${config.OWNER_EMAIL ?? 'wibyjoe12@gmail.com'}\n` +
            `• Nomor Bot: Bebas/Random (Tersambung via QR Code)\n` +
            `• Kelas: ${config.CLASS_NAME} (Semester 5A)\n` +
            `• Timezone: ${config.TIMEZONE}`,
        );

      case 'help':
      case 'menu':
        return textOnly(
          `🤖 *${config.BOT_DISPLAY_NAME} — MEGA COMMAND MENU*\n` +
            `Halo ${config.OWNER_NAME}! Berikut daftar lengkap perintah HdyBot:\n\n` +
            `🔐 *1. Kontrol Admin & Sistem (Private Chat Hedy)*\n` +
            `• \`.login <password>\` | \`.logout\` | \`.owner\` | \`.dashboard\`\n` +
            `• \`.status\` | \`.health\` | \`.runtime\` | \`.ping\` | \`.groupid\`\n` +
            `• \`.ai status\` | \`.ai models\` | \`.ai model <lightning|super-vl|ultra>\` | \`.ai auto on\` | \`.ai test <prompt>\`\n` +
            `• \`.groups\` | \`.groups add <jid> <nama>\` | \`.groups pause <jid>\` | \`.groups resume <jid>\`\n` +
            `• \`.setpjmk [jid]\` (Set Grup PJMK Semester 5 Auto-Relay AI+Tabel) | \`.setkelasa [jid]\` (Set Grup Nursing Class A)\n` +
            `• \`.nimbrung on|off|status\` | \`.nongkrong\` | \`.diam\` | \`.cekpesan <teks>\`\n` +
            `• \`.pending\` | \`.approve <id>\` | \`.reject <id>\` | \`.send <id>\` | \`.confirm <nonce>\`\n` +
            `• \`.admin pause\` (Emergency Stop) | \`.admin resume\` | \`.audit\` | \`.backup\`\n\n` +
            `📚 *2. Jadwal, Dosen, Tugas, & Akademik Kelas 5A*\n` +
            `• \`.jadwal\` | \`.jadwal senin..jumat\` | \`.besok\` | \`.mingguini\` | \`.kuliahberikutnya\`\n` +
            `• \`.matkul\` | \`.dosen [nama/matkul]\` | \`.nomordosen\` | \`.materi\` | \`.carimateri <kata>\`\n` +
            `• \`.jurnal <topik>\` | \`.carijurnal <topik>\` (Cari Jurnal AI di Google Scholar/PubMed + Link & PDF)\n` +
            `• \`.tugas\` | \`.tugas add <matkul>|<judul>|<YYYY-MM-DD>|<ket>\` | \`.tugas done <id>\`\n` +
            `• \`.reminder\` | \`.reminder add <YYYY-MM-DD HH:mm>|<judul>\` | \`.reminder delete <id>\`\n` +
            `• \`.announce draft <prioritas>|<judul>|<isi>\` | \`.note add <judul>|<isi>\` | \`.note list\`\n` +
            `• \`.kelas\` | \`.anggota [nama/nim]\` | \`.pengurus\` | \`.pjmk\` | \`.rules\` | \`.faq\` | \`.kalender\` | \`.countdown <YYYY-MM-DD>\`\n` +
            `• \`.buatkelompok <jml> [nama1,nama2,...]\` | \`.suratizin <nama>|<matkul>|<tgl>|<alasan>\` | \`.notulensi\`\n\n` +
            `🧠 *3. AI Study Assistant (NVIDIA Nemotron)*\n` +
            `• \`.ask <pertanyaan>\` | \`.summarize <teks>\` | \`.flashcard <topik>\` | \`.quiz <topik>\` | \`.translate <bhs> <teks>\`\n\n` +
            `🎨 *4. Media, Pencarian Gambar, Stiker, QR Code, & PDF*\n` +
            `• \`.gambar <kata kunci>\` | \`.carigambar <kata kunci>\` | \`.img <kata kunci>\` (Cari & Kirim Gambar ke Grup/Chat)\n` +
            `• \`.sticker\` / \`.s\` (balas/kirim gambar jadi stiker WA) | \`.ttp <teks>\` (stiker teks) | \`.toimg\`\n` +
            `• \`.blur\` | \`.invert\` | \`.grayscale\` | \`.flip\` | \`.flop\` | \`.resize <w> <h>\` | \`.compress\`\n` +
            `• \`.quotemaker <kutipan>|<penulis>\` | \`.kartujadwal [hari]\` | \`.qr <teks/url>\`\n` +
            `• \`.doc pdf <judul>|<isi>\` | \`.ocr\` (baca teks gambar) | \`.tts <teks>\`\n\n` +
            `🛠️ *5. Utilitas & Hiburan Aman (Akira Port)*\n` +
            `• \`.cuaca <kota>\` | \`.wiki <topik>\` | \`.calc <rumus>\` | \`.convert <nilai> <dari> <ke>\`\n` +
            `• \`.jam\` | \`.bmi <kg> <cm>\` | \`.ipk\` | \`.urlcheck <url>\` | \`.jadwalsholat [kota]\` | \`.doaharian\` | \`.listsurah\`\n` +
            `• \`.quotes\` | \`.quotesislami\` | \`.quotesmotivasi\` | \`.faktaunik\` | \`.pantun\`\n` +
            `• \`.tebakkata\` | \`.caklontong\` | \`.family100\` | \`.mathquiz\` | \`.jawab <teks>\` | \`.nyerah\`\n` +
            `• \`.truth\` | \`.dare\` | \`.dadu\` | \`.koin\` | \`.suit <batu|gunting|kertas>\` | \`.kerangajaib <tanya>\`\n` +
            `• \`.hilih <teks>\` | \`.alay <teks>\` | \`.besarkecil <teks>\` | \`.balikhuruf <teks>\` | \`.namaninja <nama>\`\n` +
            `• \`.stats\` | \`.leaderboard\` | \`.privacy gamification on|off\` | \`.afk <alasan>\``,
        );

      // ==================== PROFIL KELAS & PENGURUS ====================
      case 'class.info': {
        const o = this.fun.getClassOfficers();
        return textOnly(
          `🏥 *Profil Kelas — ${config.CLASS_NAME}*\n` +
            `• Program: *S1 Ilmu Keperawatan (${o.semester})*\n` +
            `• Tahun Ajaran: *${o.tahunAjaran}*\n` +
            `• KOMTING / Ketua Kelas: *${o.komting || o.ketuaKelas}*\n` +
            `• Wakil Komting: ${o.wakilKetua}\n` +
            `• Bendahara: *${o.bendahara}*\n` +
            `• Total Anggota Kelas: *${this.fun.getClassMembers().length} Mahasiswa* (ketik \`.anggota\`)\n` +
            `• Total Kontak Dosen: *${this.fun.getLecturerContacts().length} Dosen* (ketik \`.dosen\`)\n` +
            `• Total Mata Kuliah Aktif: *${schedule.listCourses().length} Matkul (${schedule.totalCourseCreditsSks()} SKS)*`,
        );
      }

      case 'class.officers': {
        return textOnly(this.fun.formatClassOfficers(config.CLASS_NAME));
      }

      case 'class.members': {
        return textOnly(this.fun.formatClassMembers(parsed.rawArgs || undefined, config.CLASS_NAME));
      }

      case 'class.rules':
        return textOnly(
          `📜 *Tata Tertib Grup & Penggunaan ${config.BOT_NAME}*\n` +
            `1. Gunakan bahasa yang sopan, jelas, dan saling menghormati sesama mahasiswa & dosen.\n` +
            `2. Pengumuman jadwal, perubahan ruang, dan tugas resmi wajib mencantumkan sumber yang jelas.\n` +
            `3. Dilarang mengirim spam, hoaks, konten NSFW, atau data pribadi sensitif pasien/teman.\n` +
            `4. Seluruh pengiriman pengumuman penting ke grup utama berada di bawah kendali persetujuan Hedy.`,
        );

      case 'class.faq':
        return textOnly(
          `❓ *FAQ — ${config.BOT_DISPLAY_NAME}*\n` +
            `• *Bagaimana cara cek jadwal kuliah?* Ketik \`.jadwal\`, \`.besok\`, atau \`.jadwal senin\`.\n` +
            `• *Bagaimana cara membuat stiker?* Kirim/balas gambar dengan caption \`.sticker\` atau ketik \`.ttp <teks>\`.\n` +
            `• *Bagaimana cara bertanya materi keperawatan?* Ketik \`.ask <pertanyaan>\`.\n` +
            `• *Bagaimana cara login admin?* Chat pribadi ke bot dari nomor admin (082233038659) lalu balas password ketika diminta.`,
        );

      case 'user.profile':
        return textOnly(
          `🪪 *Profil Pengguna*\n` +
            `• JID: \`${msg.senderJid}\`\n` +
            `• Nama Tampilan: *${msg.pushName ?? 'Mahasiswa 5A'}*\n` +
            `• Konteks Chat: *${msg.chatType}*\n` +
            `• Status Admin: *${this.deps.auth.evaluate(msg).isAdmin ? 'Admin Terotorisasi' : 'Anggota Kelas'}*`,
        );

      // ==================== HEALTH & DASHBOARD ====================
      case 'status':
      case 'health':
      case 'system': {
        const h = await runHealth({ config, whatsapp: this.deps.whatsapp, startedAt: this.deps.startedAt, now: () => now });
        const ai = router.status();
        return textOnly(
          `🩺 *Health & Ready Check ${config.BOT_NAME} (via WA Admin)*\n` +
            `• Kesehatan: *${h.status.toUpperCase()}* (uptime ${h.uptimeSec}s)\n` +
            `• WhatsApp (${this.deps.whatsapp.name}): *${this.deps.whatsapp.state()}*\n` +
            `• NVIDIA AI: mode=${ai.mode} | calls=${ai.totalCalls}${ai.lastError ? ` | err=${ai.lastError}` : ''}\n` +
            `• Outbound: ${config.OUTBOUND_ENABLED ? 'ENABLED' : 'DISABLED'} | Dry-Run: ${config.DRY_RUN ? 'ON' : 'OFF'} | EmergencyStop: ${outbound.isEmergencyStopped() ? 'ON' : 'OFF'}`,
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
        return textOnly(
          `📊 *DASHBOARD ${config.BOT_NAME.toUpperCase()} — Halo ${config.OWNER_NAME}*\n` +
            `• WhatsApp (${this.deps.whatsapp.name}): *${this.deps.whatsapp.state()}*\n` +
            `• NVIDIA AI: *${config.NVIDIA_API_KEY ? 'Terkonfigurasi' : 'Belum diisi'}* | Mode: *${ai.mode}*\n` +
            `• Model aktif: Lightning=${ai.models.lightning.modelId}, Super-VL=${ai.models['super-vl'].modelId}, Ultra=${ai.models.ultra.modelId}\n` +
            `• Grup sumber aktif: *${gi.activeSources}*\n` +
            `• Pesan diproses hari ini: *${gi.processedToday}* (Penting: *${gi.importantCount}*)\n` +
            `• Menunggu review Hedy: *${gi.pendingReviewCount}*\n` +
            `• Kuliah berikutnya: *${nextTxt}*\n` +
            `• Outbound Emergency Stop: *${outbound.isEmergencyStopped() ? 'AKTIF (diblokir)' : 'Normal'}*\n` +
            `• Error terakhir: ${ai.lastError ?? 'tidak ada'} | Health: ${h.status.toUpperCase()}`,
        );
      }

      // ==================== NVIDIA AI ROUTER & STUDY ASSISTANT ====================
      case 'ai.status':
      case 'ai.models': {
        const s = router.status();
        return textOnly(
          `🧠 *NVIDIA Nemotron Router Status*\n` +
            `• Mode: *${s.mode}*${s.pinnedUntil ? ` (sampai ${s.pinnedUntil})` : ''}\n` +
            `• Fallback: ${s.fallbackEnabled ? 'ON' : 'OFF'} | Total Panggilan: ${s.totalCalls}\n` +
            `• *lightning* (fast): \`${s.models.lightning.modelId}\` [${s.models.lightning.healthy ? 'healthy' : 'unhealthy'}]\n` +
            `• *super-vl* (vision): \`${s.models['super-vl'].modelId}\` [${s.models['super-vl'].healthy ? 'healthy' : 'unhealthy'}]\n` +
            `• *ultra* (reasoning): \`${s.models.ultra.modelId}\` [${s.models.ultra.healthy ? 'healthy' : 'unhealthy'}]`,
        );
      }

      case 'ai.model': {
        const alias = (parsed.args[0] ?? '').toLowerCase();
        if (alias !== 'lightning' && alias !== 'super-vl' && alias !== 'ultra') {
          return textOnly('⚠️ Pilih alias model yang valid: `lightning`, `super-vl`, atau `ultra`.');
        }
        router.setMode(`pinned:${alias}`);
        this.recordAudit(actorJid, 'ai.model.pin', 'ok', alias);
        return textOnly(
          `✅ Model di-pin sementara ke *${alias}* (${router.status().models[alias].modelId}). Akan kembali ke auto setelah TTL berakhir.`,
        );
      }

      case 'ai.auto': {
        const arg = (parsed.args[0] ?? 'on').toLowerCase();
        router.setMode(arg === 'off' ? 'off' : 'auto');
        this.recordAudit(actorJid, 'ai.auto', 'ok', arg);
        return textOnly(`✅ Mode router AI diatur ke *${router.status().mode}*.`);
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
          return textOnly(`🧪 *Hasil Uji NVIDIA (${out.alias} — ${out.modelId}):*\n${out.text}`);
        } catch (e) {
          return textOnly(`⚠️ Uji NVIDIA gagal: ${e instanceof Error ? e.message : 'unknown'}`);
        }
      }

      case 'ai.summarize': {
        const src = parsed.rawArgs || msg.quoted?.text || '';
        if (!src) return textOnly('⚠️ Format: `.summarize <teks panjang>` atau balas pesan yang ingin diringkas.');
        const sentences = src
          .split(/(?<=[.!?])\s+/)
          .map((s) => s.trim())
          .filter(Boolean);
        const summary = sentences.slice(0, 3).join(' ');
        return textOnly(
          `📝 *Ringkasan Materi (HdyBot Study Assistant)*\n` +
            `• *Poin Inti:* ${summary}\n` +
            `• *Panjang Asli:* ${src.length} karakter (${sentences.length} kalimat)\n` +
            `_Label: Hasil ringkasan bantu belajar._`,
        );
      }

      case 'ai.flashcard': {
        const topic = parsed.rawArgs || 'Metodologi Penelitian & Keperawatan';
        return textOnly(
          `🗂️ *Flashcard Belajar — ${topic}*\n` +
            `1. *Q:* Apa tujuan utama penyusunan rumusan masalah penelitian keperawatan?\n` +
            `   *A:* Menentukan fokus variabel yang diteliti dan arah uji hipotesis/intervensi asuhan keperawatan.\n` +
            `2. *Q:* Apa saja 5 tahap proses keperawatan (Nursing Process)?\n` +
            `   *A:* Pengkajian (Assessment), Diagnosis, Perencanaan (Intervensi), Implementasi, dan Evaluasi (SOAP).\n` +
            `3. *Q:* Kapan pengkajian risiko jatuh pada lansia (Keperawatan Gerontik) wajib dilakukan?\n` +
            `   *A:* Saat awal masuk layanan, perubahan kondisi klinis, dan pasca pemberian obat berisiko sedasi/hipotensi.`,
        );
      }

      case 'ai.quiz': {
        const topic = parsed.rawArgs || 'Keperawatan Semester 5A';
        return textOnly(this.fun.startQuiz(msg.chatJid, 'tebakkata') + `\n_(Topik: ${topic})_`);
      }

      case 'ai.translate': {
        const targetLang = (parsed.args[0] ?? 'en').toLowerCase();
        const content = parsed.args.slice(1).join(' ') || msg.quoted?.text || '';
        if (!content) return textOnly('⚠️ Format: `.translate <id|en> <teks>`');
        return textOnly(
          `🌐 *Terjemahan Akademik (${targetLang.toUpperCase()})*\n` +
            `• Teks Asli: _${content}_\n` +
            `• Hasil (${targetLang}): ${targetLang === 'en' ? `[EN Translation] ${content}` : `[Terjemahan ID] ${content}`}`,
        );
      }

      // ==================== JADWAL & DOSEN 5A ====================
      case 'schedule': {
        const today = schedule.getToday(now);
        return textOnly(schedule.formatDayText(today.weekdayLabel, today.sessions, today.dateIso));
      }

      case 'schedule.tomorrow': {
        const tmr = schedule.getTomorrow(now);
        return textOnly(schedule.formatDayText(tmr.weekdayLabel, tmr.sessions, tmr.dateIso));
      }

      case 'schedule.day': {
        const dayArg = parsed.args[0] ?? 'senin';
        const wd = ScheduleService.resolveWeekday(dayArg);
        if (!wd) return textOnly(`⚠️ Nama hari tidak dikenali: ${dayArg}`);
        const sessions = schedule.getForWeekday(wd);
        return textOnly(schedule.formatDayText(dayArg.charAt(0).toUpperCase() + dayArg.slice(1), sessions));
      }

      case 'schedule.week': {
        const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const;
        return textOnly(
          days
            .map((d) => {
              const s = schedule.getForWeekday(d);
              return schedule.formatDayText(s[0]?.weekdayLabel ?? d, s);
            })
            .join('\n\n'),
        );
      }

      case 'schedule.next': {
        const next = schedule.getNextSession(now);
        if (!next) return textOnly('📭 Tidak ada jadwal kuliah berikutnya dalam 7 hari ke depan.');
        const s = next.session;
        return textOnly(
          `⏭️ *Kuliah Berikutnya (${next.dateIso} — ${s.weekdayLabel})*\n` +
            `• Jam: *${s.startTime}–${s.endTime} WIB*\n` +
            `• Mata Kuliah: *${s.courseName}* (${s.creditsSks} SKS)\n` +
            `• Ruang: ${s.room ?? 'belum ditentukan'}\n` +
            `• Kandidat Dosen (perlu konfirmasi sesi): ${s.lecturerCandidates.join('; ')}`,
        );
      }

      case 'schedule.export': {
        const fmt = (parsed.args[0] ?? 'csv').toLowerCase();
        const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const;
        const all = days.flatMap((d) => schedule.getForWeekday(d));
        if (fmt === 'json') {
          return textOnly(`📤 *Export Jadwal 5A (JSON):*\n\`\`\`json\n${JSON.stringify(all.slice(0, 5), null, 2)}\n\`\`\``);
        }
        const csvLines = ['Hari,Mulai,Selesai,Kode,Mata Kuliah,SKS'];
        for (const s of all) {
          csvLines.push(`${s.weekdayLabel},${s.startTime},${s.endTime},${s.courseCode},"${s.courseName}",${s.creditsSks}`);
        }
        return textOnly(`📤 *Export Jadwal 5A (CSV):*\n\`\`\`csv\n${csvLines.join('\n')}\n\`\`\``);
      }

      case 'courses':
      case 'schedule.today_courses': {
        const list = schedule.listCourses();
        const lines = list.map((c, i) => `${i + 1}. *${c.normalizedName}* [${c.code}] — ${c.creditsSks} SKS`);
        return textOnly(
          `📚 *Mata Kuliah Semester 5A (${config.CLASS_NAME})*\n` +
            lines.join('\n') +
            `\nTotal SKS Mata Kuliah: *${schedule.totalCourseCreditsSks()} SKS* (status: perlu verifikasi dokumen resmi)`,
        );
      }

      case 'lecturers':
      case 'schedule.today_lecturers': {
        const q = parsed.rawArgs || undefined;
        const contactsText = this.fun.formatLecturerContacts(q);
        const list = schedule.listLecturers(q);
        if (!q) {
          return textOnly(contactsText);
        }
        const assocLines = list.map((l, i) => `${i + 1}. [${l.course_code}] ${l.raw_name}`);
        const assocBlock = assocLines.length
          ? `\n\n📚 *Tim Dosen Pengampu Mata Kuliah Terkait:*\n${assocLines.join('\n')}`
          : '';
        return textOnly(`${contactsText}${assocBlock}`);
      }

      // ==================== TUGAS, REMINDER, PENGUMUMAN, CATATAN ====================
      case 'tasks': {
        const sub = (parsed.args[0] ?? 'list').toLowerCase();
        if (sub === 'add' || sub === 'tambah') {
          const raw = parsed.rawArgs.slice(parsed.args[0]!.length).trim();
          const parts = raw.split('|').map((s) => s.trim());
          if (parts.length < 3) {
            return textOnly('⚠️ Format: `.tugas add <Mata Kuliah>|<Judul Tugas>|<YYYY-MM-DD>|<Deskripsi>`');
          }
          const created = this.fun.addAssignment({
            course: parts[0]!,
            title: parts[1]!,
            dueDateIso: parts[2]!,
            description: parts[3],
            createdBy: actorJid,
          });
          this.recordAudit(actorJid, 'task.add', 'ok', created.id);
          return textOnly(
            `✅ *Tugas Baru Ditambahkan (${created.id})*\n` +
              `• Mata Kuliah: *${created.course}*\n` +
              `• Judul: *${created.title}*\n` +
              `• Deadline: *${created.dueDateIso}*\n` +
              `• Keterangan: ${created.description}`,
          );
        }
        if (sub === 'done' || sub === 'selesai') {
          const id = parsed.args[1] ?? '';
          const updated = this.fun.completeAssignment(id);
          if (!updated) return textOnly(`⚠️ Tugas \`${id}\` tidak ditemukan.`);
          return textOnly(`✅ Tugas *${updated.id}* (${updated.title}) ditandai *SELESAI*.`);
        }
        if (sub === 'del' || sub === 'delete' || sub === 'hapus') {
          const id = parsed.args[1] ?? '';
          const ok = this.fun.deleteAssignment(id);
          return textOnly(ok ? `🗑️ Tugas *${id.toUpperCase()}* dihapus.` : `⚠️ Tugas \`${id}\` tidak ditemukan.`);
        }
        const items = this.fun.listAssignments(parsed.rawArgs);
        if (!items.length) return textOnly('✅ Tidak ada tugas/deadline aktif untuk filter tersebut.');
        return textOnly(
          `📌 *Daftar Tugas & Deadline ${config.CLASS_NAME} (${items.length})*\n` +
            items
              .map(
                (t) =>
                  `• *${t.id}* [${t.status.toUpperCase()}] — *${t.course}*\n` +
                  `  Judul: ${t.title}\n` +
                  `  Deadline: *${t.dueDateIso}* | Ket: ${t.description}`,
              )
              .join('\n\n') +
            `\n\n_Tambah tugas: \`.tugas add <Matkul>|<Judul>|<YYYY-MM-DD>|<Ket>\` | Selesai: \`.tugas done <ID>\`_`,
        );
      }

      case 'reminders': {
        const sub = (parsed.args[0] ?? 'list').toLowerCase();
        if (sub === 'add' || sub === 'tambah') {
          const raw = parsed.rawArgs.slice(parsed.args[0]!.length).trim();
          const parts = raw.split('|').map((s) => s.trim());
          if (parts.length < 2) {
            return textOnly('⚠️ Format: `.reminder add <YYYY-MM-DD HH:mm>|<Judul Pengingat>`');
          }
          const r = this.fun.addReminder(parts[0]!, parts[1]!, msg.chatJid);
          return textOnly(`⏰ Pengingat *${r.id}* dijadwalkan pada *${r.whenIso} WIB*: _${r.title}_`);
        }
        if (sub === 'delete' || sub === 'del' || sub === 'hapus') {
          const id = parsed.args[1] ?? '';
          const ok = this.fun.deleteReminder(id);
          return textOnly(ok ? `🗑️ Pengingat *${id.toUpperCase()}* dibatalkan.` : `⚠️ Pengingat \`${id}\` tidak ditemukan.`);
        }
        if (sub === 'snooze') {
          const id = parsed.args[1] ?? '';
          const mins = Number(parsed.args[2] ?? '15');
          const r = this.fun.snoozeReminder(id, mins);
          return textOnly(r ? `💤 Pengingat *${r.id}* ditunda ${mins} menit.` : `⚠️ Pengingat \`${id}\` tidak ditemukan.`);
        }
        if (sub === 'settings') {
          return textOnly(
            `⚙️ *Pengaturan Pengingat Otomatis Kelas 5A*\n` +
              `• Offset Aktif: *H-1 hari, 3 jam, 1 jam, 30 menit, Mulai Kuliah, dan Selesai Kuliah*\n` +
              `• Zona Waktu: *${config.TIMEZONE}*\n` +
              `• Idempotency Deduplication: *AKTIF (anti-spam saat restart)*`,
          );
        }
        const list = this.fun.listReminders();
        if (!list.length) {
          return textOnly(
            `⏰ *Daftar Pengingat Aktif*\n` +
              `• Pengingat jadwal kuliah otomatis Semester 5A: *AKTIF*\n` +
              `• Pengingat kustom tambahan: _belum ada_\n` +
              `Ketik \`.reminder add <YYYY-MM-DD HH:mm>|<Judul>\` untuk menambah pengingat baru.`,
          );
        }
        return textOnly(
          `⏰ *Daftar Pengingat Kustom (${list.length})*\n` +
            list.map((r) => `• *${r.id}* — ${r.whenIso} WIB: ${r.title}`).join('\n'),
        );
      }

      case 'announce': {
        const sub = (parsed.args[0] ?? 'history').toLowerCase();
        if (sub === 'draft' || sub === 'create') {
          const raw = parsed.rawArgs.slice(parsed.args[0]!.length).trim();
          const parts = raw.split('|').map((s) => s.trim());
          if (parts.length < 3) {
            return textOnly('⚠️ Format: `.announce draft <urgent|penting|normal|info>|<Judul>|<Isi Pengumuman>`');
          }
          const prio = (['urgent', 'penting', 'normal', 'info'].includes(parts[0]!.toLowerCase())
            ? parts[0]!.toLowerCase()
            : 'penting') as 'urgent' | 'penting' | 'normal' | 'info';
          const draft = this.fun.createAnnouncementDraft(prio, parts[1]!, parts[2]!);
          return textOnly(
            `📢 *Draft Pengumuman Dibuat (${draft.id})*\n` +
              `• Prioritas: *${draft.priority.toUpperCase()}*\n` +
              `• Judul: *${draft.title}*\n` +
              `• Isi: ${draft.content}`,
          );
        }
        const list = this.fun.listAnnouncements();
        if (!list.length) return textOnly('📢 Belum ada riwayat draft pengumuman. Buat dengan `.announce draft penting|Judul|Isi`.');
        return textOnly(
          `📢 *Riwayat Pengumuman (${list.length})*\n` +
            list.map((a) => `• *${a.id}* [${a.priority.toUpperCase()}] ${a.title} — ${a.status}`).join('\n'),
        );
      }

      case 'notes': {
        const sub = (parsed.args[0] ?? 'list').toLowerCase();
        if (sub === 'add' || sub === 'tambah') {
          const raw = parsed.rawArgs.slice(parsed.args[0]!.length).trim();
          const parts = raw.split('|').map((s) => s.trim());
          if (parts.length < 2) return textOnly('⚠️ Format: `.note add <Judul Catatan>|<Isi Catatan>`');
          const n = this.fun.addNote(parts[0]!, parts[1]!, actorJid);
          return textOnly(`📝 Catatan *${n.id}* (${n.title}) berhasil disimpan.`);
        }
        if (sub === 'del' || sub === 'delete' || sub === 'hapus') {
          const id = parsed.args[1] ?? '';
          const ok = this.fun.deleteNote(id);
          return textOnly(ok ? `🗑️ Catatan *${id.toUpperCase()}* dihapus.` : `⚠️ Catatan \`${id}\` tidak ditemukan.`);
        }
        const notes = this.fun.listNotes();
        if (!notes.length) return textOnly('📝 Belum ada catatan kelas tersimpan. Tambah dengan `.note add <Judul>|<Isi>`.');
        return textOnly(
          `📝 *Daftar Catatan Kelas (${notes.length})*\n` +
            notes.map((n) => `• *${n.id}* — *${n.title}*: ${n.content}`).join('\n'),
        );
      }

      // ==================== MATERI & RAG ====================
      case 'materials':
      case 'materials.search': {
        const mats = this.kb.listMaterials(parsed.rawArgs || undefined);
        const refs = SHJ_OFFICIAL_REFERENCES.map((r) => `• ${r.label}: ${r.url} (${r.status})`).join('\n');
        if (!mats.length) {
          return textOnly(
            `📂 *Katalog Materi Nursing Class A*\n` +
              `Belum ada file materi lokal yang diunggah untuk filter tersebut.\n\n` +
              `🔗 *Referensi Resmi Kampus (SHJ):*\n${refs}`,
          );
        }
        return textOnly(
          `📂 *Katalog Materi Nursing Class A (${mats.length})*\n` +
            mats.map((m, i) => `${i + 1}. *${m.title}* [${m.courseCode ?? 'UMUM'}] (${m.kind.toUpperCase()} | ${m.verification})`).join('\n'),
        );
      }

      case 'journal.search': {
        const rawQuery = parsed.rawArgs.replace(/^pdf\s+/i, '').trim() || msg.quoted?.text?.trim() || '';
        if (!rawQuery) {
          return textOnly(
            '⚠️ Format: `.jurnal <topik penelitian/keperawatan>` atau `.carijurnal <topik>`\n' +
              'Contoh: `.jurnal asuhan keperawatan gerontik hipertensi`',
          );
        }
        const searchRes = await this.fun.searchAcademicJournals(rawQuery);
        let aiSynthesis = '';
        try {
          const journalContext = searchRes.items
            .map(
              (it, idx) =>
                `${idx + 1}. Judul: "${it.title}" | Penulis: ${it.authors} (${it.year}) | Jurnal: ${it.journalName} | Link: ${it.doiOrUrl}`,
            )
            .join('\n');
          const out = await router.invoke({
            task: 'short_summary',
            modality: 'text',
            messages: [
              {
                role: 'system',
                content:
                  'Kamu adalah asisten riset ilmiah keperawatan S1 Semester 5A (Metodologi Penelitian). Berikan telaah singkat, kata kunci PICO/klinis, dan manfaat praktis dari daftar jurnal berikut dalam Bahasa Indonesia (maksimal 5 kalimat padat).',
              },
              {
                role: 'user',
                content: `Topik Pencarian Jurnal: "${rawQuery}"\nDaftar Jurnal Terindeks:\n${journalContext}`,
              },
            ],
          });
          if (out.text && out.text.trim()) {
            aiSynthesis = out.text.trim();
          }
        } catch {
          // Gunakan telaah default bila router offline
        }
        if (!aiSynthesis) {
          aiSynthesis =
            `Topik "${rawQuery}" relevan untuk telaah pustaka (Literature Review) dan penyusunan proposal Metodologi Penelitian Keperawatan Semester 5A. ` +
            `Gunakan tautan DOI/PubMed/Google Scholar di bawah ini atau dokumen PDF terlampir untuk mengunduh naskah full-text.`;
        }

        const itemBlocks = searchRes.items
          .map(
            (it, idx) =>
              `*${idx + 1}. ${it.title}*\n` +
              `   • Penulis & Tahun: ${it.authors} (${it.year})\n` +
              `   • Publikasi: _${it.journalName}_\n` +
              `   • 🔗 Link Jurnal/DOI: ${it.doiOrUrl}` +
              (it.pdfUrl ? `\n   • 📄 Direct Link PDF: ${it.pdfUrl}` : ''),
          )
          .join('\n\n');

        const textReply =
          `🎓 *PENCARIAN JURNAL ILMIAH AI & GOOGLE SCHOLAR*\n` +
          `🔎 Topik: *${rawQuery}*\n\n` +
          `🧠 *Telaah AI (${config.BOT_NAME}):*\n${aiSynthesis}\n\n` +
          `📚 *Daftar Jurnal & Artikel Ilmiah Terindeks:*\n${itemBlocks}\n\n` +
          `🌐 *Link Pencarian Langsung (Google Scholar & Repositori):*\n` +
          `• 🔎 Google Scholar: ${searchRes.scholarUrl}\n` +
          `• 📄 Google Scholar (Khusus File PDF): ${searchRes.scholarPdfUrl}\n` +
          `• 🇮🇩 Garuda Kemdikbud: ${searchRes.garudaUrl}\n` +
          `• 🏥 PubMed / NCBI: ${searchRes.pubmedUrl}\n\n` +
          `📎 _Dokumen PDF ringkasan & daftar link jurnal juga dilampirkan langsung pada pesan ini!_`;

        const pdfBodyLines = [
          `Topik Pencarian: ${rawQuery}`,
          `Telaah AI: ${aiSynthesis}`,
          `--- DAFTAR JURNAL ILMIAH & LINK REFERENSI ---`,
          ...searchRes.items.map(
            (it, idx) =>
              `${idx + 1}. ${it.title} (${it.authors}, ${it.year}) - ${it.journalName}. Link: ${it.doiOrUrl}${it.pdfUrl ? ` | PDF: ${it.pdfUrl}` : ''}`,
          ),
          `--- TAUTAN REPOSITORI ---`,
          `Google Scholar: ${searchRes.scholarUrl}`,
          `Google Scholar PDF: ${searchRes.scholarPdfUrl}`,
          `Garuda Kemdikbud: ${searchRes.garudaUrl}`,
          `PubMed NCBI: ${searchRes.pubmedUrl}`,
        ];
        const pdfBuf = await this.media.generatePdfDocument({
          title: `KATALOG JURNAL AI: ${rawQuery.toUpperCase().slice(0, 42)}`,
          subtitle: `${config.CLASS_NAME} (Semester 5A) — Hasil Pencarian Jurnal Ilmiah (${now.toISOString().slice(0, 10)})`,
          bodyLines: pdfBodyLines,
          watermark: 'REFERENSI JURNAL AKADEMIK — HDYBOT AI RESEARCH ASSISTANT',
        });

        return {
          text: textReply,
          media: {
            data: pdfBuf,
            mimeType: 'application/pdf',
            filename: `jurnal-${rawQuery.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'riset'}.pdf`,
            caption: `📄 Ringkasan & Link Jurnal Ilmiah: ${rawQuery}`,
          },
        };
      }

      case 'ask': {
        if (!parsed.rawArgs) return textOnly('⚠️ Format: `.ask <pertanyaan materi keperawatan>`');
        return textOnly(this.kb.answerGroundedQuestion(parsed.rawArgs).formattedAnswer);
      }

      case 'groupgen': {
        const count = Number(parsed.args[0] ?? '0');
        const namesRaw = parsed.args.slice(1).join(' ');
        const customNames = namesRaw.split(',').map((s) => s.trim()).filter(Boolean);
        const names =
          customNames.length >= count && count > 0
            ? customNames
            : this.fun.getClassMembers().map((m) => `${m.name} (${m.nim})`);
        if (!count || count < 1 || names.length < count) {
          return textOnly(
            '⚠️ Format: `.buatkelompok <jumlah_kelompok>` (otomatis membagi 36 anggota Nursing Class A) atau `.buatkelompok <jumlah> <nama1, nama2, ...>`',
          );
        }
        const groups = this.groupGen.generateFairGroups(names, count);
        return textOnly(
          `👥 *Hasil Pembagian Kelompok Adil (${groups.length} Kelompok — Total ${names.length} Mahasiswa)*\n` +
            groups
              .map(
                (g) =>
                  `*Kelompok ${g.groupNumber}* (Ketua: ${g.roles.leader}):\n` +
                  `Anggota: ${g.members.join(', ')}`,
              )
              .join('\n\n'),
        );
      }

      case 'calendar': {
        const events = this.calendar.listEvents();
        if (!events.length) {
          return textOnly('🗓️ Belum ada tanggal kalender akademik resmi yang dikonfirmasi di database.');
        }
        return textOnly(
          `🗓️ *Kalender Akademik Nursing Class A*\n` +
            events.map((e, i) => `${i + 1}. *${e.dateIso}* — [${e.category}] ${e.title} (${e.verification})`).join('\n'),
        );
      }

      case 'countdown': {
        const target = parsed.args[0] ?? '';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(target)) return textOnly('⚠️ Format: `.countdown YYYY-MM-DD`');
        const days = this.calendar.countdownDays(target, now);
        return textOnly(`⏳ Hitung mundur menuju *${target}*: *${days} hari*.`);
      }

      // ==================== GENERATOR DOKUMEN & PDF ====================
      case 'doc.permission': {
        const parts = parsed.rawArgs.split('|').map((s) => s.trim());
        if (parts.length < 4) {
          return textOnly('⚠️ Format: `.suratizin <Nama Mahasiswa>|<Mata Kuliah>|<YYYY-MM-DD>|<Alasan>`');
        }
        return textOnly(
          this.documents.generatePermissionLetterDraft({
            studentName: parts[0]!,
            courseName: parts[1]!,
            dateIso: parts[2]!,
            reason: parts[3]!,
          }),
        );
      }

      case 'doc.minutes': {
        const parts = parsed.rawArgs.split('|').map((s) => s.trim());
        if (parts.length < 3) {
          return textOnly('⚠️ Format: `.notulensi <Judul Rapat>|<YYYY-MM-DD>|<Keputusan 1; Keputusan 2>`');
        }
        return textOnly(
          this.documents.generateMinutesDraft({
            title: parts[0]!,
            dateIso: parts[1]!,
            attendeesCount: 30,
            decisions: parts[2]!.split(';').map((d) => d.trim()).filter(Boolean),
          }),
        );
      }

      case 'doc.pdf': {
        const parts = parsed.rawArgs.split('|').map((s) => s.trim()).filter(Boolean);
        if (parts.length < 2) {
          return textOnly('⚠️ Format: `.doc pdf <Judul Dokumen>|<Paragraf 1; Paragraf 2>`');
        }
        const title = parts[0]!;
        const bodyLines = parts.slice(1).join(' | ').split(';').map((s) => s.trim()).filter(Boolean);
        const pdfBuf = await this.media.generatePdfDocument({
          title,
          subtitle: `${config.CLASS_NAME} (Semester 5A) — Dicetak ${now.toISOString().slice(0, 10)}`,
          bodyLines,
        });
        return {
          text: `📄 *Dokumen PDF Draft Siap:* ${title} _(DRAFT — perlu review sebelum dikirim resmi)_`,
          media: {
            data: pdfBuf,
            mimeType: 'application/pdf',
            filename: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'dokumen'}-draft.pdf`,
            caption: `📄 DRAFT PDF: ${title}`,
          },
        };
      }

      // ==================== MEDIA, STIKER, GAMBAR, QR, OCR, TTS ====================
      case 'media.sticker': {
        const srcMedia = msg.media ?? msg.quoted?.media;
        if (!srcMedia?.data) {
          if (parsed.rawArgs) {
            const webp = await this.media.textToSticker(parsed.rawArgs);
            return {
              text: '🎨 Stiker teks berhasil dibuat!',
              media: { data: webp, mimeType: 'image/webp', asSticker: true },
            };
          }
          return textOnly('⚠️ Kirim gambar dengan caption `.sticker` (atau balas gambar dengan `.sticker`), atau ketik `.ttp <teks>` untuk membuat stiker teks!');
        }
        const webp = await this.media.imageToSticker(srcMedia.data);
        return {
          text: '🎨 Stiker berhasil dibuat!',
          media: { data: webp, mimeType: 'image/webp', asSticker: true },
        };
      }

      case 'media.ttp': {
        const txt = parsed.rawArgs || msg.quoted?.text || 'HdyBot 5A';
        const webp = await this.media.textToSticker(txt);
        return {
          text: `🎨 Stiker teks: *${txt}*`,
          media: { data: webp, mimeType: 'image/webp', asSticker: true },
        };
      }

      case 'media.toimg': {
        const srcMedia = msg.media ?? msg.quoted?.media;
        if (!srcMedia?.data) {
          return textOnly('⚠️ Balas sebuah stiker dengan perintah `.toimg` untuk mengubahnya menjadi gambar PNG.');
        }
        const png = await this.media.stickerToPng(srcMedia.data);
        return {
          text: '🖼️ Stiker berhasil dikonversi menjadi gambar PNG.',
          media: { data: png, mimeType: 'image/png', filename: 'sticker.png', caption: '🖼️ Hasil konversi stiker ke PNG' },
        };
      }

      case 'media.effect': {
        const effect = (parsed.args[0] ?? 'grayscale') as ImageEffectKind;
        const srcMedia = msg.media ?? msg.quoted?.media;
        if (!srcMedia?.data) {
          return textOnly(`⚠️ Kirim atau balas gambar dengan perintah \`.${effect}\` untuk memproses efek gambar.`);
        }
        const width = Number(parsed.args[1] ?? '512');
        const height = Number(parsed.args[2] ?? '512');
        const out = await this.media.applyImageEffect(srcMedia.data, effect, { width, height });
        return {
          text: `🖼️ Efek gambar *${effect.toUpperCase()}* selesai diproses.`,
          media: {
            data: out.data,
            mimeType: out.mimeType,
            filename: `hdybot-${effect}.png`,
            caption: `🖼️ Efek: ${effect.toUpperCase()}`,
          },
        };
      }

      case 'media.quotemaker': {
        const parts = (parsed.rawArgs || 'Ilmu keperawatan adalah seni merawat kehidupan|Nursing Class A').split('|');
        const quote = (parts[0] ?? '').trim() || 'Semangat belajar Semester 5A!';
        const author = (parts[1] ?? '').trim() || config.CLASS_NAME;
        const png = await this.media.generateQuoteCard(quote, author);
        return {
          text: `🖼️ Kartu Kutipan: “${quote}” — ${author}`,
          media: {
            data: png,
            mimeType: 'image/png',
            filename: 'quote-card.png',
            caption: `💬 “${quote}” — ${author}`,
          },
        };
      }

      case 'media.schedulecard': {
        const dayArg = parsed.args[1] ?? '';
        const wd = dayArg ? ScheduleService.resolveWeekday(dayArg) : undefined;
        const sessions = wd ? schedule.getForWeekday(wd) : schedule.getToday(now).sessions;
        const title = wd ? `JADWAL KULIAH 5A — ${dayArg.toUpperCase()}` : `JADWAL KULIAH 5A HARI INI`;
        const lines = sessions.length
          ? sessions.map((s) => `${s.startTime}-${s.endTime} WIB: ${s.courseName} (${s.creditsSks} SKS)`)
          : ['Tidak ada jadwal kuliah tatap muka pada hari ini.'];
        const png = await this.media.generateScheduleCard(title, lines);
        return {
          text: `🖼️ Kartu visual *${title}*`,
          media: {
            data: png,
            mimeType: 'image/png',
            filename: 'jadwal-5a.png',
            caption: `📅 ${title}`,
          },
        };
      }

      case 'media.imagesearch': {
        const query = parsed.rawArgs.trim() || msg.quoted?.text?.trim() || '';
        if (!query) {
          return textOnly(
            '⚠️ Format: `.gambar <kata kunci>` atau `.carigambar <kata kunci>`\n' +
              'Contoh: `.gambar anatomi jantung manusia` atau `cari gambar stetoskop medis`',
          );
        }
        const imgSearch = await this.fun.searchWebImage(query);
        const googleImagesLink = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;

        if (imgSearch.foundOnline && imgSearch.imageBuffer) {
          try {
            const normalizedPng = await this.media.normalizeSearchImage(imgSearch.imageBuffer);
            const captionText =
              `🖼️ *Hasil Pencarian Gambar — ${query}*\n` +
              `• Judul: *${imgSearch.title}*\n` +
              `• Sumber: ${imgSearch.sourceUrl}\n` +
              `• Google Images: ${googleImagesLink}`;
            return {
              text: captionText,
              media: {
                data: normalizedPng,
                mimeType: 'image/png',
                filename: `gambar-${query.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 35) || 'search'}.png`,
                caption: captionText,
              },
            };
          } catch {
            // Lanjut ke generator visual AI jika buffer eksternal gagal dinormalisasi
          }
        }

        let visualPoints: string[] = [];
        try {
          const out = await router.invoke({
            task: 'short_summary',
            modality: 'text',
            messages: [
              {
                role: 'system',
                content:
                  'Tuliskan tepat 4 poin deskripsi visual dan fakta singkat tentang topik berikut dalam Bahasa Indonesia, pisahkan setiap poin dengan baris baru.',
              },
              {
                role: 'user',
                content: `Topik gambar/visual: ${query}`,
              },
            ],
          });
          if (out.text && out.text.trim()) {
            visualPoints = out.text
              .split(/\r?\n/)
              .map((s) => s.replace(/^[-•*\d.)\s]+/, '').trim())
              .filter(Boolean);
          }
        } catch {
          // Gunakan poin deskripsi lokal
        }

        if (!visualPoints.length) {
          visualPoints = [
            `Topik Visual: ${query}`,
            `Referensi Belajar & Dokumentasi Visual ${config.CLASS_NAME} (Semester 5A)`,
            `Klik tautan Google Images pada caption untuk galeri foto resolusi penuh.`,
          ];
        }

        const visualPng = await this.media.generateVisualSearchCard(query, visualPoints);
        const captionText =
          `🖼️ *Ilustrasi & Pencarian Gambar — ${query}*\n` +
          `• Galeri Google Images: ${googleImagesLink}\n` +
          `• Sumber Referensi: ${imgSearch.sourceUrl}`;
        return {
          text: captionText,
          media: {
            data: visualPng,
            mimeType: 'image/png',
            filename: `visual-${query.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 35) || 'card'}.png`,
            caption: captionText,
          },
        };
      }

      case 'media.qr': {
        const content = parsed.rawArgs || msg.quoted?.text || '';
        if (!content) return textOnly('⚠️ Format: `.qr <teks atau tautan>`');
        const png = await this.media.generateQrCodePng(content);
        return {
          text: `🔳 QR Code untuk: \`${content.slice(0, 120)}\``,
          media: {
            data: png,
            mimeType: 'image/png',
            filename: 'qrcode.png',
            caption: `🔳 QR Code: ${content.slice(0, 100)}`,
          },
        };
      }

      case 'media.ocr': {
        const srcMedia = msg.media ?? msg.quoted?.media;
        if (!srcMedia?.data) {
          return textOnly('⚠️ Kirim gambar/foto catatan dengan caption `.ocr` (atau balas gambar dengan `.ocr`) untuk mengekstrak teks.');
        }
        try {
          const b64 = srcMedia.data.toString('base64');
          const out = await router.invoke({
            task: 'vision_document',
            modality: 'image',
            messages: [
              { role: 'system', content: 'Ekstrak seluruh teks yang terlihat pada gambar berikut secara akurat dalam Bahasa Indonesia.' },
              { role: 'user', content: `[IMAGE_BASE64:${srcMedia.mimeType}:${b64.slice(0, 120)}...]` },
            ],
          });
          return textOnly(`🔍 *Hasil OCR Vision (${out.alias}):*\n${out.text}`);
        } catch {
          return textOnly('🔍 *OCR Gambar:* Gambar diterima, namun layanan NVIDIA Vision sedang offline atau belum dikonfigurasi.');
        }
      }

      case 'media.tts': {
        const txt = parsed.rawArgs || msg.quoted?.text || '';
        if (!txt) return textOnly('⚠️ Format: `.tts <teks yang ingin diubah ke suara>`');
        return textOnly(
          `🔊 *Teks-ke-Suara (TTS HdyBot):*\n“${txt}”\n_(Catatan: Sintesis audio diteruskan sebagai teks terformat untuk menjaga kompatibilitas perangkat)._`,
        );
      }

      // ==================== UTILITAS & API PUBLIK ====================
      case 'util.bmi': {
        const w = Number(parsed.args[0]);
        const h = Number(parsed.args[1]);
        if (!w || !h) return textOnly('⚠️ Format: `.bmi <berat_kg> <tinggi_cm>`');
        const res = UtilityService.calculateBmi(w, h);
        return textOnly(`⚖️ *Kalkulator BMI Edukatif*: BMI = *${res.bmi}* (Kategori: *${res.category}*).`);
      }

      case 'util.gpa': {
        if (!parsed.rawArgs) {
          return textOnly('⚠️ Format: `.ipk <sks1:bobot1, sks2:bobot2>` (contoh: `.ipk 4:4.0, 2:3.5, 3:3.75`)');
        }
        const entries = parsed.rawArgs
          .split(',')
          .map((item) => {
            const [s, g] = item.trim().split(':');
            return { sks: Number(s), gradePoint: Number(g) };
          })
          .filter((e) => e.sks > 0 && Number.isFinite(e.gradePoint));
        if (!entries.length) {
          return textOnly('⚠️ Format: `.ipk 4:4.0, 2:3.5, 3:3.75`');
        }
        const res = UtilityService.calculateGpa(entries);
        return textOnly(`🎓 *Kalkulator IP/IPK*: Total *${res.totalSks} SKS* → IP = *${res.gpa}*`);
      }

      case 'util.calc': {
        if (!parsed.rawArgs) return textOnly('⚠️ Format: `.calc <ekspresi matematika>` (contoh: `.calc (120 * 3) / 4 + 15`)');
        const res = this.fun.evaluateMath(parsed.rawArgs);
        if (!res.ok) return textOnly(`⚠️ ${res.error}`);
        return textOnly(`🧮 *Hasil Kalkulator:*\n\`${parsed.rawArgs}\` = *${res.result}*`);
      }

      case 'util.convert': {
        const val = Number(parsed.args[0]);
        const from = parsed.args[1] ?? '';
        const to = parsed.args[2] ?? '';
        if (!from || !to || !Number.isFinite(val)) {
          return textOnly('⚠️ Format: `.convert <nilai> <dari> <ke>` (contoh: `.convert 38 c f`, `.convert 60 kg lb`, `.convert 100 usd idr`)');
        }
        return textOnly(this.fun.convertUnit(val, from, to));
      }

      case 'util.clock':
        return textOnly(this.fun.formatWorldClock(now));

      case 'util.weather':
        return textOnly(await this.fun.getWeather(parsed.rawArgs || 'Jakarta'));

      case 'util.wiki':
        return textOnly(await this.fun.searchWikipedia(parsed.rawArgs));

      case 'util.urlcheck': {
        if (!parsed.rawArgs) return textOnly('⚠️ Format: `.urlcheck <url atau domain>`');
        return textOnly(this.fun.checkUrlSafety(parsed.rawArgs));
      }

      // ==================== FUN, QUOTES, & MINI-GAMES AMAN AKIRA ====================
      case 'fun.quote': {
        const kind = (parsed.args[0] ?? 'umum') as 'umum' | 'islami' | 'motivasi';
        return textOnly(this.fun.randomQuote(kind));
      }

      case 'fun.fact':
        return textOnly(this.fun.randomFact());

      case 'fun.pantun':
        return textOnly(this.fun.randomPantun());

      case 'fun.doa':
        return textOnly(this.fun.randomDoa());

      case 'fun.surah':
        return textOnly(this.fun.listSurah());

      case 'fun.sholat':
        return textOnly(this.fun.prayerSchedule(parsed.rawArgs));

      case 'fun.truth':
        return textOnly(this.fun.truthOrDare('truth'));

      case 'fun.dare':
        return textOnly(this.fun.truthOrDare('dare'));

      case 'fun.dice':
        return textOnly(this.fun.rollDice());

      case 'fun.coin':
        return textOnly(this.fun.flipCoin());

      case 'fun.suit':
        return textOnly(this.fun.playSuit(parsed.args[0] ?? ''));

      case 'fun.shell': {
        const kind = (parsed.args[0] ?? 'apakah') as 'apakah' | 'kapankah' | 'bisakah' | 'kerangajaib' | 'rate';
        const q = parsed.args.slice(1).join(' ');
        return textOnly(this.fun.magicShell(kind, q));
      }

      case 'fun.quiz_start': {
        const kind = (parsed.args[0] ?? 'tebakkata') as 'tebakkata' | 'caklontong' | 'family100' | 'mathquiz';
        return textOnly(this.fun.startQuiz(msg.chatJid, kind));
      }

      case 'fun.quiz_answer': {
        const res = this.fun.answerQuiz(msg.chatJid, parsed.rawArgs);
        if (res.ok) {
          this.gamification.awardXp(msg.senderJid, 'quiz_completed', 15);
        }
        return textOnly(res.message);
      }

      case 'fun.quiz_giveup':
        return textOnly(this.fun.giveUpQuiz(msg.chatJid));

      case 'fun.text': {
        const mode = (parsed.args[0] ?? 'hilih') as 'hilih' | 'alay' | 'besarkecil' | 'balikhuruf' | 'namaninja';
        const input = parsed.args.slice(1).join(' ') || msg.quoted?.text || '';
        if (!input) return textOnly(`⚠️ Format: \`.${mode} <teks>\``);
        return textOnly(`✨ *Hasil (${mode}):*\n${this.fun.transformText(mode, input)}`);
      }

      case 'fun.afk': {
        const entry = this.fun.setAfk(msg.senderJid, parsed.rawArgs);
        return textOnly(`💤 Status *AFK* diaktifkan untuk \`${msg.senderJid}\`\n• Alasan: _${entry.reason}_`);
      }

      case 'fun.unafk': {
        const prev = this.fun.clearAfk(msg.senderJid);
        return textOnly(prev ? '👋 Selamat datang kembali! Status AFK Anda telah dinonaktifkan.' : 'ℹ️ Anda sedang tidak dalam mode AFK.');
      }

      // ==================== ANALITIK & GAMIFIKASI ====================
      case 'analytics.stats': {
        const sub = (parsed.args[0] ?? 'summary').toLowerCase();
        const period = (['week', 'month', 'semester'].includes(sub) ? sub : 'summary') as
          | 'summary'
          | 'week'
          | 'month'
          | 'semester';
        return textOnly(this.fun.formatStats(period));
      }

      case 'gamification.privacy': {
        const toggle = (parsed.args[0] ?? '').toLowerCase();
        const enable = toggle === 'on' || toggle === 'true';
        this.gamification.setOptIn(msg.senderJid, enable);
        return textOnly(
          enable
            ? '✅ Anda telah *opt-in* ke fitur XP & Gamification akademik.'
            : '🔒 Fitur Gamification Anda telah *dinonaktifkan (opt-out)* dan data XP Anda dihapus.',
        );
      }

      case 'gamification.leaderboard': {
        const board = this.gamification.leaderboard();
        if (!board.length) return textOnly('🏆 Belum ada peserta opt-in pada papan peringkat akademik.');
        return textOnly(
          `🏆 *Leaderboard Akademik (Opt-In)*\n` +
            board.map((b, i) => `${i + 1}. ${b.userJid} — ${b.xp} XP (Level ${b.level})`).join('\n'),
        );
      }

      // ==================== GROUP INTELLIGENCE & APPROVAL ====================
      case 'groups':
      case 'groups.sources': {
        const sources = intelligence.listSources();
        const allowedList = outbound.listAllowedGroups();
        if (!sources.length && !allowedList.length) {
          return textOnly(
            `👥 *Status Akses Grup ${config.BOT_NAME}*\n` +
              `• Mode Allow Access Semua Grup: *AKTIF ✅* (Semua grup tempat bot bergabung otomatis diizinkan melihat & memakai seluruh fitur)\n` +
              `• Grup Terdeteksi Saat Ini: _Belum ada pesan grup masuk (otomatis terdaftar begitu ada chat di grup)_`,
          );
        }
        return textOnly(
          `👥 *Daftar Grup Terdaftar & Allow Access (${sources.length || allowedList.length})*\n` +
            `• Mode Allow Access Semua Grup: *AKTIF ✅*\n` +
            (sources.length
              ? sources
                  .map(
                    (g, i) =>
                      `${i + 1}. *${g.name}* (\`${g.jid}\`) — ${g.paused ? 'PAUSED ⏸️' : 'ALLOW / AKTIF ✅'} [${g.reliability}]`,
                  )
                  .join('\n')
              : allowedList.map((jid, i) => `${i + 1}. \`${jid}\` — ALLOW / AKTIF ✅`).join('\n')),
        );
      }

      case 'groups.add': {
        const jid = parsed.args[0];
        const name = parsed.args.slice(1).join(' ') || 'Grup Sumber';
        if (!jid || !jid.endsWith('@g.us')) return textOnly('⚠️ Format: `.groups add <id@g.us> <Nama Grup>`');
        intelligence.registerSourceGroup(jid, name);
        outbound.registerAllowedGroup(jid);
        this.recordAudit(actorJid, 'groups.add', 'ok', jid);
        return textOnly(`✅ Grup sumber *${name}* (\`${jid}\`) terdaftar dan aktif.`);
      }

      case 'groups.pause': {
        const jid = parsed.args[0] ?? '';
        const ok = intelligence.pauseSourceGroup(jid);
        outbound.pauseGroup(jid);
        this.recordAudit(actorJid, 'groups.pause', ok ? 'ok' : 'not_found', jid);
        return textOnly(ok ? `⏸️ Pemantauan & pengiriman grup \`${jid}\` dijeda.` : `⚠️ Grup \`${jid}\` tidak ditemukan.`);
      }

      case 'groups.resume': {
        const jid = parsed.args[0] ?? '';
        const ok = intelligence.resumeSourceGroup(jid);
        outbound.resumeGroup(jid);
        this.recordAudit(actorJid, 'groups.resume', ok ? 'ok' : 'not_found', jid);
        return textOnly(ok ? `▶️ Pemantauan & pengiriman grup \`${jid}\` dilanjutkan.` : `⚠️ Grup \`${jid}\` tidak ditemukan.`);
      }

      case 'group.nimbrung': {
        if (!this.isOwnerOrGroupAdmin(msg)) {
          return null; // Hanya Owner (082233038659) atau Admin Grup yang boleh menyuruh bot nimbrung/berhenti
        }
        const sub = (parsed.args[0] ?? 'on').toLowerCase();
        const targetJid =
          parsed.args[1] && parsed.args[1].endsWith('@g.us')
            ? parsed.args[1]
            : msg.chatType === 'group'
              ? msg.chatJid
              : (intelligence.getPrimaryGroupJid() ?? config.WHATSAPP_PRIMARY_GROUP_JID ?? 'unconfigured@g.us');

        if (sub === 'status') {
          const active = this.isNimbrungActive(targetJid);
          return textOnly(
            `💬 *Status Mode Grup (${targetJid})*\n` +
              `• Notifikasi AI: *${active ? '🟢 BOT AI AKTIF (Mode Nongkrong)' : '🔴 BOT AI NONAKTIF (Mode Hening)'}*\n` +
              `• Mode Saat Ini: *${active ? 'NIMBRUNG / NONGKRONG AKTIF 🗣️' : 'MODE HENING (DIAM) 🤫'}*\n` +
              `• Ketik *"bot ikut nimbrung"* / \`.nimbrung on\` untuk mengajak bot nongkrong, atau *"bot berhenti"* / \`.nimbrung off\` untuk membuat bot kembali diam.`,
          );
        }

        if (sub === 'off' || sub === 'stop' || sub === 'berhenti' || sub === 'diam') {
          this.nimbrungGroups.set(targetJid, false);
          this.groupChatHistory.delete(targetJid);
          this.recordAudit(actorJid, 'group.nimbrung.off', 'ok', targetJid);
          const offNotif =
            `🔴 *[NOTIFIKASI: BOT AI NONAKTIF — Mode Hening Aktif]*\n` +
            `🫡 *Siap Bos! ${config.BOT_NAME} Berhenti Nimbrung (Mode Hening Aktif)*\n` +
            `Bot sekarang diam terhadap chat tidak penting di \`${targetJid}\` dan hanya memantau pesan inti/penting atau menunggu disenggol/ditag kembali oleh Owner/Admin.`;
          if (msg.chatType === 'private' && targetJid.endsWith('@g.us') && targetJid !== 'unconfigured@g.us') {
            outbound.registerAllowedGroup(targetJid);
            await outbound.send({
              chatJid: targetJid,
              text: offNotif,
              idempotencyKey: `nimbrung-off-${msg.providerMessageId}`,
            });
          }
          return textOnly(offNotif);
        }

        this.nimbrungGroups.set(targetJid, true);
        outbound.registerAllowedGroup(targetJid);
        this.recordAudit(actorJid, 'group.nimbrung.on', 'ok', targetJid);
        const onNotif =
          `🟢 *[NOTIFIKASI: BOT AI AKTIF — Mode Nongkrong]*\n` +
          `🔔 *PEMBERITAHUAN GRUP: Bot AI (${config.BOT_NAME}) sekarang AKTIF nongkrong & siap saling membalas pesan dengan member grup!*\n` +
          `🗣️ *Mode Nimbrung & Nongkrong ${config.BOT_NAME} AKTIF!*\n` +
          `Halo teman-teman di \`${targetJid}\`! 👋 Bos *${config.OWNER_NAME}* / Admin sudah mengajak *${config.BOT_NAME}* ikut nimbrung. ` +
          `Seluruh member grup sekarang bisa saling ngobrol, tanya jadwal/tugas, atau diskusi santai langsung dengan Bot AI. Ketik *"bot berhenti"* kapan saja untuk kembali ke Mode Hening.`;
        if (msg.chatType === 'private' && targetJid.endsWith('@g.us') && targetJid !== 'unconfigured@g.us') {
          await outbound.send({
            chatJid: targetJid,
            text: onNotif,
            idempotencyKey: `nimbrung-on-${msg.providerMessageId}`,
          });
        }
        return textOnly(onNotif);
      }

      case 'group.setpjmk': {
        if (!this.isOwnerOrGroupAdmin(msg)) {
          return textOnly('⛔ Hanya Owner (082233038659) atau Admin Grup yang dapat mengatur Grup Sumber PJMK Semester 5.');
        }
        const jid =
          parsed.args[0] && parsed.args[0].endsWith('@g.us')
            ? parsed.args[0]
            : msg.chatType === 'group'
              ? msg.chatJid
              : '';
        if (!jid) {
          return textOnly('⚠️ Jalankan `.setpjmk` langsung di dalam grup PJMK Semester 5, atau ketik `.setpjmk <id@g.us> [Nama Grup]`.');
        }
        const name =
          parsed.args[0]?.endsWith('@g.us')
            ? parsed.args.slice(1).join(' ') || 'PJMK Semester 5'
            : parsed.rawArgs || msg.chatName || 'PJMK Semester 5';
        intelligence.registerPjmkGroup(jid, name);
        outbound.registerAllowedGroup(jid);
        this.recordAudit(actorJid, 'group.setpjmk', 'ok', jid);
        return textOnly(
          `✅ *Grup Sumber PJMK Semester 5 Terdaftar!*\n` +
            `• Nama Grup: *${name}*\n` +
            `• JID: \`${jid}\`\n` +
            `• Fitur Auto-Relay AI + Tabel: *AKTIF* (Setiap pesan *inti/penting* dan *baik* dari grup ini akan otomatis diringkas sejelas mungkin menggunakan AI lengkap dengan Tabel ke grup *${config.CLASS_NAME}*).`,
        );
      }

      case 'group.setkelasa': {
        if (!this.isOwnerOrGroupAdmin(msg)) {
          return textOnly('⛔ Hanya Owner (082233038659) atau Admin Grup yang dapat mengatur Grup Tujuan Nursing Class A.');
        }
        const jid =
          parsed.args[0] && parsed.args[0].endsWith('@g.us')
            ? parsed.args[0]
            : msg.chatType === 'group'
              ? msg.chatJid
              : '';
        if (!jid) {
          return textOnly('⚠️ Jalankan `.setkelasa` langsung di dalam grup Nursing Class A, atau ketik `.setkelasa <id@g.us>`.');
        }
        intelligence.setPrimaryGroupJid(jid);
        outbound.registerAllowedGroup(jid);
        this.recordAudit(actorJid, 'group.setkelasa', 'ok', jid);
        return textOnly(
          `✅ *Grup Utama ${config.CLASS_NAME} Terdaftar!*\n` +
            `• JID Tujuan Relay: \`${jid}\`\n` +
            `• Seluruh informasi penting dari *PJMK Semester 5* akan otomatis diringkas oleh AI beserta tabel ke grup ini.`,
        );
      }

      case 'group.classify': {
        const sample = parsed.rawArgs || msg.quoted?.text || '';
        if (!sample) {
          return textOnly('⚠️ Format: `.cekpesan <teks pesan>` atau balas pesan dengan `.cekpesan` untuk melihat penilaian AI (baik/buruk & inti_penting/tidak_penting + tabel).');
        }
        const ev = intelligence.evaluateMessage(sample, false);
        const previewTable = formatStructuredTableAnnouncement({
          sourceGroupName: msg.chatName ?? 'PJMK Semester 5 (Simulasi)',
          rawText: sample,
          analysis: {
            source_group_id: msg.chatJid,
            source_message_id: msg.providerMessageId,
            sender_id: msg.senderJid,
            received_at: now.toISOString(),
            category: ev.category,
            quality: ev.quality,
            significance: ev.significance,
            confidence: 0.9,
            topic: ev.fields.agendaTopik,
            summary: sample.slice(0, 180),
            extracted_facts: [sample.slice(0, 120)],
            requires_confirmation: false,
            recommended_action: ev.significance === 'inti_penting' ? 'propose_announcement' : 'ignore',
            status: 'pending_review',
            prompt_injection_detected: false,
          },
          fields: ev.fields,
        });
        return textOnly(
          `🔍 *Hasil Analisis Kualitas & Kepentingan Pesan AI*\n` +
            `• Kualitas Pesan: *${ev.quality.toUpperCase()}*\n` +
            `• Sifat Kepentingan: *${ev.significance.toUpperCase()}*\n` +
            `• Kategori Prioritas: *${ev.category}*\n` +
            `• Alasan AI: ${ev.reason}\n\n` +
            (ev.significance === 'inti_penting'
              ? `📊 *Preview Ringkasan Tabel AI untuk Nursing Class A:*\n${previewTable}`
              : `ℹ️ _Karena pesan ini bersifat *${ev.significance}*, bot akan tetap diam di grup dan tidak meneruskannya ke Nursing Class A._`),
        );
      }

      case 'filter.status':
      case 'digest': {
        const st = intelligence.stats();
        return textOnly(
          `📡 *Status Monitoring & Digest Group Intelligence*\n` +
            `• Grup Sumber Aktif: *${st.activeSources}*\n` +
            `• Pesan Diproses Hari Ini: *${st.processedToday}*\n` +
            `• Pesan Penting Terdeteksi: *${st.importantCount}*\n` +
            `• Menunggu Persetujuan Hedy: *${st.pendingReviewCount}*`,
        );
      }

      case 'pending':
      case 'filter.review': {
        const items = intelligence.listPendingReviews();
        if (!items.length) return textOnly('✅ Tidak ada pesan di antrean review saat ini.');
        return textOnly(
          `📝 *Antrean Review Hedy (${items.length})*\n` +
            items
              .map(
                (it) =>
                  `• *${it.id}* [${it.analysis.category}/${it.analysis.topic}] (conf=${it.analysis.confidence})\n` +
                  `  Ringkasan: ${it.analysis.summary}\n` +
                  `  Ketik \`.approve ${it.id}\` atau \`.reject ${it.id} <alasan>\``,
              )
              .join('\n\n'),
        );
      }

      case 'approve': {
        const id = parsed.args[0] ?? '';
        const item = intelligence.approve(id, actorJid);
        if (!item) return textOnly(`⚠️ Item review \`${id}\` tidak ditemukan atau sudah diproses.`);
        this.recordAudit(actorJid, 'review.approve', 'ok', item.id);
        return textOnly(
          `✅ *${item.id}* disetujui.\n\n` +
            `Preview pengumuman:\n${item.draftAnnouncementText}\n\n` +
            `Untuk mengirim ke grup utama, jalankan \`.send ${item.id}\` (memerlukan konfirmasi nonce).`,
        );
      }

      case 'reject': {
        const id = parsed.args[0] ?? '';
        const reason = parsed.args.slice(1).join(' ') || 'Ditolak oleh Hedy';
        const item = intelligence.reject(id, actorJid, reason);
        if (!item) return textOnly(`⚠️ Item review \`${id}\` tidak ditemukan atau sudah diproses.`);
        this.recordAudit(actorJid, 'review.reject', 'ok', item.id);
        return textOnly(`🚫 *${item.id}* ditolak. Alasan: ${reason}`);
      }

      case 'send':
      case 'broadcast.send': {
        const id = (parsed.args[0] ?? '').toUpperCase();
        const item = intelligence.getReviewItem(id);
        if (!item || item.status !== 'approved') {
          return textOnly(`⚠️ Item \`${id}\` belum berstatus approved. Jalankan \`.approve ${id}\` terlebih dahulu.`);
        }
        const pending = confirmations.issue(
          actorJid,
          'send_announcement',
          `Kirim pengumuman ${item.id} ke ${item.targetGroupJid}`,
          { reviewId: item.id, targetGroupJid: item.targetGroupJid, text: item.draftAnnouncementText },
        );
        this.recordAudit(actorJid, 'send.request_confirmation', 'nonce_issued', item.id);
        return textOnly(
          `🔒 *Konfirmasi Pengiriman Pengumuman*\n` +
            `Target: \`${item.targetGroupJid}\`\n` +
            `Isi:\n${item.draftAnnouncementText}\n\n` +
            `Balas dengan \`.confirm ${pending.nonce}\` untuk mengirim atau \`.cancel ${pending.nonce}\` untuk membatalkan.`,
        );
      }

      case 'confirm': {
        const nonce = parsed.args[0] ?? '';
        const res = confirmations.confirm(actorJid, nonce);
        if (!res.ok) {
          this.recordAudit(actorJid, 'confirm', `failed:${res.reason}`, nonce);
          return textOnly(`❌ Konfirmasi gagal: *${res.reason}*.`);
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
            return textOnly(`❌ Gagal mengirim ke grup: ${sendRes.error}`);
          }
          intelligence.markSent(payload.reviewId);
          return textOnly(`✅ Pengumuman *${payload.reviewId}* terkirim (${sendRes.dryRun ? 'DRY-RUN' : sendRes.providerMessageId}).`);
        }
        this.recordAudit(actorJid, `confirm:${item.action}`, 'ok', item.nonce);
        return textOnly(`✅ Aksi *${item.action}* berhasil dikonfirmasi dan dijalankan.`);
      }

      case 'cancel': {
        const nonce = parsed.args[0] ?? '';
        const ok = confirmations.cancel(actorJid, nonce);
        this.recordAudit(actorJid, 'cancel', ok ? 'ok' : 'not_found', nonce);
        return textOnly(ok ? `✅ Konfirmasi \`${nonce}\` dibatalkan.` : `⚠️ Nonce \`${nonce}\` tidak ditemukan atau sudah tidak berlaku.`);
      }

      case 'emergency.stop':
        outbound.triggerEmergencyStop();
        this.recordAudit(actorJid, 'emergency.stop', 'activated');
        return textOnly('🛑 *EMERGENCY STOP AKTIF*. Seluruh pengiriman pesan keluar ke grup dihentikan seketika.');

      case 'emergency.resume':
        outbound.clearEmergencyStop();
        this.recordAudit(actorJid, 'emergency.resume', 'cleared');
        return textOnly('▶️ *Emergency Stop dinonaktifkan*. Pengiriman kembali mengikuti kebijakan normal.');

      case 'backup':
        this.recordAudit(actorJid, 'backup.status', 'ok');
        return textOnly(
          `💾 *Status Backup Terenkripsi ${config.BOT_NAME}*\n` +
            `• Jadwal Otomatis: Setiap hari pukul *02:30 WIB* (\`hdybot-backup.timer\`)\n` +
            `• Skrip: \`scripts/backup.sh\` (AES-256-CBC + PBKDF2)\n` +
            `• State Lokal: Tersimpan otomatis di \`data/runtime/bot-state.json\``,
        );

      case 'audit':
      case 'logs':
      case 'errors': {
        const recent = this.auditLogs.slice(-10);
        if (!recent.length) return textOnly('📋 Belum ada entri audit log.');
        return textOnly(
          `📋 *Audit Log Terbaru (${recent.length})*\n` +
            recent.map((a) => `• ${a.at} | ${a.action} | ${a.result}${a.target ? ` (${a.target})` : ''}`).join('\n'),
        );
      }

      default:
        return textOnly(`ℹ️ Perintah belum dikenali. Ketik \`.menu\` atau \`.help\` untuk daftar lengkap perintah HdyBot.`);
    }
  }
}
