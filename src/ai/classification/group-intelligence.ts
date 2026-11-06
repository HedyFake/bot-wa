import { z } from 'zod';
import type { InboundMessage } from '../../whatsapp/adapters/types.js';

export const ClassificationCategorySchema = z.enum(['URGENT', 'IMPORTANT', 'NORMAL', 'LOW', 'REVIEW']);
export type ClassificationCategory = z.infer<typeof ClassificationCategorySchema>;

export const AnalyzedGroupMessageSchema = z.object({
  source_group_id: z.string(),
  source_message_id: z.string(),
  sender_id: z.string(),
  received_at: z.string(),
  category: ClassificationCategorySchema,
  confidence: z.number().min(0).max(1),
  topic: z.string(),
  summary: z.string(),
  extracted_facts: z.array(z.string()),
  requires_confirmation: z.boolean(),
  recommended_action: z.enum(['ignore', 'digest_only', 'review_by_admin', 'propose_announcement']),
  status: z.enum(['ignored', 'pending_review', 'approved', 'rejected', 'sent']),
  prompt_injection_detected: z.boolean().default(false),
});

export type AnalyzedGroupMessage = z.infer<typeof AnalyzedGroupMessageSchema>;

export interface ReviewQueueItem {
  id: string;
  analysis: AnalyzedGroupMessage;
  draftAnnouncementText: string;
  targetGroupJid: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'sent';
  decidedBy?: string;
  decidedAt?: string;
  rejectionReason?: string;
}

const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|system)\s+instructions/i,
  /abaikan\s+(semua\s+)?instruksi\s+(sebelumnya|sistem)/i,
  /kamu\s+sekarang\s+adalah\s+admin/i,
  /saya\s+(adalah\s+)?owner.*berikan\s+(api\s*key|password|token|session)/i,
  /reveal\s+(your\s+)?(system\s+prompt|api\s*key|secret|token)/i,
  /tampilkan\s+(api\s*key|password|token|secret|env)/i,
  /jalankan\s+(perintah\s+shell|rm\s+-rf|drop\s+table)/i,
];

export function detectPromptInjection(text: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some((re) => re.test(text));
}

/**
 * Pipeline AI Group Intelligence:
 * - Hanya memproses grup sumber yang terdaftar & aktif.
 * - Mendeteksi prompt injection (pesan grup diperlakukan sebagai data tidak tepercaya).
 * - Mengklasifikasikan URGENT / IMPORTANT / NORMAL / LOW / REVIEW.
 * - Menyimpan ke review queue untuk persetujuan admin sebelum dikirim ke Nursing Class A.
 */
export class GroupIntelligenceService {
  private readonly activeSources = new Map<string, { name: string; paused: boolean; reliability: 'official' | 'officer' | 'member' }>();
  private readonly processedMsgKeys = new Set<string>();
  private readonly inbox: AnalyzedGroupMessage[] = [];
  private readonly reviewQueue = new Map<string, ReviewQueueItem>();
  private seq = 0;

  constructor(private readonly opts: { primaryGroupJid?: string } = {}) {}

  registerSourceGroup(
    groupJid: string,
    name: string,
    reliability: 'official' | 'officer' | 'member' = 'member',
  ): void {
    this.activeSources.set(groupJid, { name, paused: false, reliability });
  }

  pauseSourceGroup(groupJid: string): boolean {
    const g = this.activeSources.get(groupJid);
    if (!g) return false;
    g.paused = true;
    return true;
  }

  resumeSourceGroup(groupJid: string): boolean {
    const g = this.activeSources.get(groupJid);
    if (!g) return false;
    g.paused = false;
    return true;
  }

  listSources(): Array<{ jid: string; name: string; paused: boolean; reliability: string }> {
    return [...this.activeSources.entries()].map(([jid, v]) => ({ jid, ...v }));
  }

  /** Ingest pesan grup sumber; mengembalikan `null` jika grup tidak diizinkan atau duplikat. */
  ingest(msg: InboundMessage): AnalyzedGroupMessage | null {
    if (msg.chatType !== 'group') return null;
    const src = this.activeSources.get(msg.chatJid);
    if (!src || src.paused) return null;

    const dedupeKey = `${msg.chatJid}|${msg.providerMessageId}`;
    if (this.processedMsgKeys.has(dedupeKey)) return null;
    this.processedMsgKeys.add(dedupeKey);

    const text = (msg.text ?? '').trim();
    const injection = detectPromptInjection(text);

    const analysis = this.classifyHeuristic(msg, src.reliability, injection);
    this.inbox.push(analysis);

    if (
      analysis.category === 'URGENT' ||
      analysis.category === 'IMPORTANT' ||
      analysis.category === 'REVIEW'
    ) {
      const id = `REV-${++this.seq}`;
      const draft =
        `📢 *[Draft Pengumuman — Nursing Class A]*\n` +
        `Kategori: ${analysis.category} (${analysis.topic})\n` +
        `Ringkasan: ${analysis.summary}\n` +
        `Sumber: ${src.name} (${analysis.received_at.slice(0, 16).replace('T', ' ')} UTC)\n` +
        `Status: Menunggu verifikasi Hedy`;
      this.reviewQueue.set(id, {
        id,
        analysis,
        draftAnnouncementText: draft,
        targetGroupJid: this.opts.primaryGroupJid ?? 'unconfigured@g.us',
        status: 'pending_review',
      });
    }
    return analysis;
  }

  private classifyHeuristic(
    msg: InboundMessage,
    reliability: 'official' | 'officer' | 'member',
    injection: boolean,
  ): AnalyzedGroupMessage {
    const raw = (msg.text ?? '').trim();
    const low = raw.toLowerCase();

    if (injection) {
      return {
        source_group_id: msg.chatJid,
        source_message_id: msg.providerMessageId,
        sender_id: msg.senderJid,
        received_at: msg.receivedAt.toISOString(),
        category: 'REVIEW',
        confidence: 0.95,
        topic: 'security_prompt_injection',
        summary: 'Terdeteksi pola instruksi mencurigakan/prompt injection pada pesan grup (diblokir sebagai instruksi).',
        extracted_facts: [],
        requires_confirmation: true,
        recommended_action: 'review_by_admin',
        status: 'pending_review',
        prompt_injection_detected: true,
      };
    }

    // Forward tanpa konteks jelas atau candaan
    if (msg.isForwarded && /jadwal|batal|libur|ujian|tugas/i.test(low)) {
      return {
        source_group_id: msg.chatJid,
        source_message_id: msg.providerMessageId,
        sender_id: msg.senderJid,
        received_at: msg.receivedAt.toISOString(),
        category: 'REVIEW',
        confidence: 0.55,
        topic: 'forwarded_unverified',
        summary: raw.slice(0, 140),
        extracted_facts: ['forwarded_message'],
        requires_confirmation: true,
        recommended_action: 'review_by_admin',
        status: 'pending_review',
        prompt_injection_detected: false,
      };
    }

    if (/wkwk|haha|hehe|stiker|sticker|selamat\s+pagi|assalamualaikum$/i.test(low) || raw.length < 6) {
      return {
        source_group_id: msg.chatJid,
        source_message_id: msg.providerMessageId,
        sender_id: msg.senderJid,
        received_at: msg.receivedAt.toISOString(),
        category: 'LOW',
        confidence: 0.9,
        topic: 'social',
        summary: raw.slice(0, 80) || '(pesan pendek/sosial)',
        extracted_facts: [],
        requires_confirmation: false,
        recommended_action: 'ignore',
        status: 'ignored',
        prompt_injection_detected: false,
      };
    }

    if (/(kelas\s+dibatalkan|kuliah\s+batal|perubahan\s+jadwal\s+mendadak|ujian\s+dimajukan|deadline\s+hari\s+ini)/i.test(low)) {
      const cat: ClassificationCategory = reliability === 'member' ? 'REVIEW' : 'URGENT';
      return {
        source_group_id: msg.chatJid,
        source_message_id: msg.providerMessageId,
        sender_id: msg.senderJid,
        received_at: msg.receivedAt.toISOString(),
        category: cat,
        confidence: reliability === 'member' ? 0.65 : 0.9,
        topic: 'schedule_change',
        summary: raw.slice(0, 160),
        extracted_facts: [raw.slice(0, 120)],
        requires_confirmation: true,
        recommended_action: 'review_by_admin',
        status: 'pending_review',
        prompt_injection_detected: false,
      };
    }

    if (/(tugas\s+baru|deadline|dikumpulkan|presentasi|praktikum|materi\s+kuliah|zoom|google\s+meet|uts|uas|kuis)/i.test(low)) {
      return {
        source_group_id: msg.chatJid,
        source_message_id: msg.providerMessageId,
        sender_id: msg.senderJid,
        received_at: msg.receivedAt.toISOString(),
        category: 'IMPORTANT',
        confidence: 0.85,
        topic: 'academic_task_or_info',
        summary: raw.slice(0, 160),
        extracted_facts: [raw.slice(0, 120)],
        requires_confirmation: true,
        recommended_action: 'review_by_admin',
        status: 'pending_review',
        prompt_injection_detected: false,
      };
    }

    return {
      source_group_id: msg.chatJid,
      source_message_id: msg.providerMessageId,
      sender_id: msg.senderJid,
      received_at: msg.receivedAt.toISOString(),
      category: 'NORMAL',
      confidence: 0.75,
      topic: 'general_academic',
      summary: raw.slice(0, 140),
      extracted_facts: [],
      requires_confirmation: false,
      recommended_action: 'digest_only',
      status: 'pending_review',
      prompt_injection_detected: false,
    };
  }

  listPendingReviews(): ReviewQueueItem[] {
    return [...this.reviewQueue.values()].filter((r) => r.status === 'pending_review');
  }

  getReviewItem(id: string): ReviewQueueItem | undefined {
    return this.reviewQueue.get(id.toUpperCase());
  }

  approve(id: string, actorJid: string): ReviewQueueItem | null {
    const item = this.reviewQueue.get(id.toUpperCase());
    if (!item || item.status !== 'pending_review') return null;
    item.status = 'approved';
    item.analysis.status = 'approved';
    item.decidedBy = actorJid;
    item.decidedAt = new Date().toISOString();
    return item;
  }

  reject(id: string, actorJid: string, reason = 'Ditolak oleh admin'): ReviewQueueItem | null {
    const item = this.reviewQueue.get(id.toUpperCase());
    if (!item || item.status !== 'pending_review') return null;
    item.status = 'rejected';
    item.analysis.status = 'rejected';
    item.decidedBy = actorJid;
    item.decidedAt = new Date().toISOString();
    item.rejectionReason = reason;
    return item;
  }

  markSent(id: string): void {
    const item = this.reviewQueue.get(id.toUpperCase());
    if (item) {
      item.status = 'sent';
      item.analysis.status = 'sent';
    }
  }

  stats() {
    const important = this.inbox.filter((m) => m.category === 'URGENT' || m.category === 'IMPORTANT').length;
    return {
      activeSources: [...this.activeSources.values()].filter((s) => !s.paused).length,
      processedToday: this.inbox.length,
      importantCount: important,
      pendingReviewCount: this.listPendingReviews().length,
    };
  }
}
