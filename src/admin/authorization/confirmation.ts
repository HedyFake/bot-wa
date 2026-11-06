import { createHash, randomBytes } from 'node:crypto';

export interface PendingConfirmation<T = unknown> {
  nonce: string;
  actorJid: string;
  action: string;
  summary: string;
  payload: T;
  payloadHash: string;
  createdAt: Date;
  expiresAt: Date;
  consumed: boolean;
}

/**
 * Mengelola confirmation nonce satu-kali untuk operasi berdampak tinggi
 * (broadcast, ubah/reset jadwal, hapus data, ubah konfigurasi keamanan).
 */
export class ConfirmationManager {
  private readonly store = new Map<string, PendingConfirmation>();
  private readonly ttlMs: number;
  private readonly now: () => Date;

  constructor(opts?: { ttlMs?: number; now?: () => Date }) {
    this.ttlMs = opts?.ttlMs ?? 5 * 60 * 1000;
    this.now = opts?.now ?? (() => new Date());
  }

  issue<T>(actorJid: string, action: string, summary: string, payload: T): PendingConfirmation<T> {
    const nonce = randomBytes(4).toString('hex').toUpperCase();
    const payloadHash = createHash('sha256').update(JSON.stringify({ action, payload })).digest('hex').slice(0, 16);
    const createdAt = this.now();
    const expiresAt = new Date(createdAt.getTime() + this.ttlMs);
    const item: PendingConfirmation<T> = {
      nonce,
      actorJid,
      action,
      summary,
      payload,
      payloadHash,
      createdAt,
      expiresAt,
      consumed: false,
    };
    this.store.set(nonce, item);
    return item;
  }

  confirm(
    actorJid: string,
    nonceRaw: string,
  ): { ok: true; item: PendingConfirmation } | { ok: false; reason: 'not_found' | 'wrong_actor' | 'expired' | 'replayed' } {
    const nonce = nonceRaw.trim().toUpperCase();
    const item = this.store.get(nonce);
    if (!item) return { ok: false, reason: 'not_found' };
    if (item.consumed) return { ok: false, reason: 'replayed' };
    if (item.actorJid !== actorJid) return { ok: false, reason: 'wrong_actor' };
    if (this.now().getTime() > item.expiresAt.getTime()) {
      this.store.delete(nonce);
      return { ok: false, reason: 'expired' };
    }
    item.consumed = true;
    return { ok: true, item };
  }

  cancel(actorJid: string, nonceRaw: string): boolean {
    const nonce = nonceRaw.trim().toUpperCase();
    const item = this.store.get(nonce);
    if (!item || item.actorJid !== actorJid || item.consumed) return false;
    item.consumed = true;
    this.store.delete(nonce);
    return true;
  }

  listPending(actorJid?: string): PendingConfirmation[] {
    const nowMs = this.now().getTime();
    return [...this.store.values()].filter(
      (i) => !i.consumed && i.expiresAt.getTime() > nowMs && (!actorJid || i.actorJid === actorJid),
    );
  }
}
