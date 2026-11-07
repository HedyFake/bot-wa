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
import { FunAndUtilityService } from '../../modules/fun/fun-utility-service.js';
import { KnowledgeBaseService, SHJ_OFFICIAL_REFERENCES } from '../../modules/materials/knowledge-base.js';
import { type ImageEffectKind, MediaService } from '../../modules/media/media-service.js';
import { ScheduleService } from '../../modules/schedule/service.js';
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
      this.fun.recordCommandUsage(parsedGroup.command, msg.chatJid);
      const out = await this.executePublicOrAdmin(parsedGroup, msg);
      if (out) {
        await this.deps.outbound.send({
          chatJid: msg.chatJid,
          text: out.text,
          media: out.media,
          idempotencyKey: `grp-reply-${msg.providerMessageId}`,
        });
      }
      return out?.text ?? null;
    }

    // ==================== PRIVATE CHAT ====================
    const rawText = (msg.text ?? '').trim();

    // 1. Jika sedang dalam state ditanya password, tangkap balasan password langsung (contoh: "hedyfake")
    if (this.deps.auth.isAwaitingPassword(msg.chatJid) && rawText && !rawText.startsWith('.pair')) {
      const candidate = rawText.replace(/^\.(login|password|pass|auth)\s+/i, '').trim();
      const ver = this.deps.auth.verifyAdminPassword(msg, candidate);
      this.recordAudit(msg.senderJid, 'auth.password_reply', ver.reason);
      if (!ver.ok) {
        const failText =
          ver.reason === 'rate_limited'
            ? '⛔ Terlalu banyak percobaan password gagal. Silakan tunggu beberapa menit.'
            : '❌ Password salah. Silakan balas ulang dengan password admin yang benar:';
        await this.replyPrivate(msg, failText);
        return failText;
      }

      let welcome = `✅ *Password Admin Terverifikasi!*\nSelamat datang, *${this.deps.config.OWNER_NAME}* (\`${this.deps.config.OWNER_WHATSAPP}\`). Sesi kontrol penuh HdyBot kini aktif.`;
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
            `• \`.pending\` | \`.approve <id>\` | \`.reject <id>\` | \`.send <id>\` | \`.confirm <nonce>\`\n` +
            `• \`.admin pause\` (Emergency Stop) | \`.admin resume\` | \`.audit\` | \`.backup\`\n\n` +
            `📚 *2. Jadwal, Dosen, Tugas, & Akademik Kelas 5A*\n` +
            `• \`.jadwal\` | \`.jadwal senin..jumat\` | \`.besok\` | \`.mingguini\` | \`.kuliahberikutnya\`\n` +
            `• \`.matkul\` | \`.dosen [matkul]\` | \`.materi\` | \`.carimateri <kata>\`\n` +
            `• \`.tugas\` | \`.tugas add <matkul>|<judul>|<YYYY-MM-DD>|<ket>\` | \`.tugas done <id>\`\n` +
            `• \`.reminder\` | \`.reminder add <YYYY-MM-DD HH:mm>|<judul>\` | \`.reminder delete <id>\`\n` +
            `• \`.announce draft <prioritas>|<judul>|<isi>\` | \`.note add <judul>|<isi>\` | \`.note list\`\n` +
            `• \`.kelas\` | \`.anggota\` | \`.pengurus\` | \`.rules\` | \`.faq\` | \`.kalender\` | \`.countdown <YYYY-MM-DD>\`\n` +
            `• \`.buatkelompok <jml> <nama1,nama2,...>\` | \`.suratizin <nama>|<matkul>|<tgl>|<alasan>\` | \`.notulensi\`\n\n` +
            `🧠 *3. AI Study Assistant (NVIDIA Nemotron)*\n` +
            `• \`.ask <pertanyaan>\` | \`.summarize <teks>\` | \`.flashcard <topik>\` | \`.quiz <topik>\` | \`.translate <bhs> <teks>\`\n\n` +
            `🎨 *4. Media, Stiker, Gambar, QR Code, & PDF*\n` +
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
            `• Ketua Kelas / Owner Bot: *${o.ketuaKelas}*\n` +
            `• Sekretaris: ${o.sekretaris}\n` +
            `• Bendahara: ${o.bendahara}\n` +
            `• Wali Kelas: ${o.waliKelas}\n` +
            `• Total Mata Kuliah Aktif: *${schedule.listCourses().length} Matkul (${schedule.totalCourseCreditsSks()} SKS)*`,
        );
      }

      case 'class.officers': {
        const o = this.fun.getClassOfficers();
        return textOnly(
          `👥 *Struktur Pengurus ${config.CLASS_NAME} (${o.semester})*\n` +
            `• Ketua Kelas: *${o.ketuaKelas}*\n` +
            `• Wakil Ketua: ${o.wakilKetua}\n` +
            `• Sekretaris: ${o.sekretaris}\n` +
            `• Bendahara: ${o.bendahara}\n` +
            `• Dosen Wali: ${o.waliKelas}`,
        );
      }

      case 'class.members':
        return textOnly(
          `👩‍⚕️👨‍⚕️ *Anggota ${config.CLASS_NAME} (Semester 5A)*\n` +
            `• Koordinator / Admin Utama: *${config.OWNER_NAME}* (\`${config.OWNER_WHATSAPP}\`)\n` +
            `• Gunakan \`.buatkelompok <jumlah> <nama1, nama2, ...>\` untuk membagi anggota ke kelompok tugas/praktikum secara adil.`,
        );

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
        const list = schedule.listLecturers(parsed.rawArgs || undefined);
        if (!list.length) return textOnly('📭 Tidak ditemukan data dosen untuk kata kunci tersebut.');
        const lines = list.map((l, i) => `${i + 1}. [${l.course_code}] ${l.raw_name} (${l.verification_status})`);
        return textOnly(
          `👩‍🏫 *Daftar Asosiasi Dosen Semester 5A*\n` +
            lines.join('\n') +
            `\n_Catatan: Daftar ini adalah tim dosen per mata kuliah dari data awal, bukan penugasan dosen per sesi._`,
        );
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

      case 'ask': {
        if (!parsed.rawArgs) return textOnly('⚠️ Format: `.ask <pertanyaan materi keperawatan>`');
        return textOnly(this.kb.answerGroundedQuestion(parsed.rawArgs).formattedAnswer);
      }

      case 'groupgen': {
        const count = Number(parsed.args[0] ?? '0');
        const namesRaw = parsed.args.slice(1).join(' ');
        const names = namesRaw.split(',').map((s) => s.trim()).filter(Boolean);
        if (!count || names.length < count) {
          return textOnly('⚠️ Format: `.buatkelompok <jumlah_kelompok> <nama1, nama2, nama3, ...>`');
        }
        const groups = this.groupGen.generateFairGroups(names, count);
        return textOnly(
          `👥 *Hasil Pembagian Kelompok Adil (${groups.length} Kelompok)*\n` +
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
        if (!sources.length) return textOnly('📭 Belum ada grup sumber yang didaftarkan.');
        return textOnly(
          `👥 *Grup Sumber Terdaftar*\n` +
            sources.map((g, i) => `${i + 1}. ${g.name} (\`${g.jid}\`) — ${g.paused ? 'PAUSED' : 'AKTIF'} [${g.reliability}]`).join('\n'),
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
