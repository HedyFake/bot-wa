import type { OutboundMessage, SendResult, WhatsAppProvider } from '../adapters/types.js';

/** Deduplicator untuk event pesan WhatsApp masuk agar tidak diproses dua kali. */
export class InboundDeduper {
  private readonly seen = new Map<string, number>();
  private readonly ttlMs: number;
  private readonly now: () => number;

  constructor(opts?: { ttlMs?: number; now?: () => number }) {
    this.ttlMs = opts?.ttlMs ?? 60 * 60 * 1000;
    this.now = opts?.now ?? (() => Date.now());
  }

  /** Mengembalikan `true` jika pesan BARU, `false` jika duplikat. */
  checkAndMark(chatJid: string, providerMessageId: string): boolean {
    const now = this.now();
    for (const [k, exp] of this.seen) {
      if (now >= exp) this.seen.delete(k);
    }
    const key = `${chatJid}|${providerMessageId}`;
    if (this.seen.has(key)) return false;
    this.seen.set(key, now + this.ttlMs);
    return true;
  }
}

export interface OutboundGateOptions {
  provider: WhatsAppProvider;
  outboundEnabled: boolean;
  dryRun: boolean;
  allowedGroupJids?: Iterable<string>;
}

/**
 * Gerbang pengiriman keluar:
 * - Emergency stop instan untuk semua pesan ke grup/publik.
 * - Allowlist grup tujuan & pause per grup.
 * - Idempotency key agar retry tidak menggandakan pengiriman.
 * - Mode dry-run.
 */
export class OutboundGate {
  private readonly provider: WhatsAppProvider;
  private outboundEnabled: boolean;
  private dryRun: boolean;
  private emergencyStopped = false;
  private readonly allowedGroups = new Set<string>();
  private readonly pausedGroups = new Set<string>();
  private readonly sentKeys = new Map<string, SendResult>();

  constructor(opts: OutboundGateOptions) {
    this.provider = opts.provider;
    this.outboundEnabled = opts.outboundEnabled;
    this.dryRun = opts.dryRun;
    if (opts.allowedGroupJids) {
      for (const g of opts.allowedGroupJids) if (g) this.allowedGroups.add(g);
    }
  }

  registerAllowedGroup(jid: string): void {
    this.allowedGroups.add(jid);
  }
  pauseGroup(jid: string): void {
    this.pausedGroups.add(jid);
  }
  resumeGroup(jid: string): void {
    this.pausedGroups.delete(jid);
  }
  isGroupPaused(jid: string): boolean {
    return this.pausedGroups.has(jid);
  }
  triggerEmergencyStop(): void {
    this.emergencyStopped = true;
  }
  clearEmergencyStop(): void {
    this.emergencyStopped = false;
  }
  isEmergencyStopped(): boolean {
    return this.emergencyStopped;
  }

  async send(msg: OutboundMessage, opts?: { isAdminPrivateReply?: boolean }): Promise<SendResult> {
    const prev = this.sentKeys.get(msg.idempotencyKey);
    if (prev) return prev;

    const isGroup = msg.chatJid.endsWith('@g.us');

    if (this.emergencyStopped && !opts?.isAdminPrivateReply) {
      return { ok: false, error: 'emergency_stop_active' };
    }
    if (isGroup) {
      if (!this.allowedGroups.has(msg.chatJid)) {
        return { ok: false, error: 'group_not_in_allowlist' };
      }
      if (this.pausedGroups.has(msg.chatJid)) {
        return { ok: false, error: 'group_paused' };
      }
      if (!this.outboundEnabled) {
        return { ok: false, error: 'outbound_disabled' };
      }
      if (this.dryRun) {
        const res: SendResult = { ok: true, dryRun: true, providerMessageId: `dryrun-${msg.idempotencyKey}` };
        this.sentKeys.set(msg.idempotencyKey, res);
        return res;
      }
    }

    const res = await this.provider.send(msg);
    if (res.ok) this.sentKeys.set(msg.idempotencyKey, res);
    return res;
  }
}
