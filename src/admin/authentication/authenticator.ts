import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { e164ToJid, normalizeE164 } from '../../security/phone.js';
import type { InboundMessage } from '../../whatsapp/adapters/types.js';

export type RoleKey = 'owner' | 'admin' | 'officer' | 'member' | 'anonymous';

export interface AuthDecision {
  allowed: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  role: RoleKey;
  actorE164: string | null;
  actorJid: string;
  reason: string;
  requiresPassword?: boolean;
}

export interface RateLimitWindow {
  count: number;
  resetAt: number;
}

/** Hash secret dengan scrypt + salt acak: format `scrypt$<saltHex>$<hashHex>`. */
export function hashBootstrapSecret(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(plain, salt, 32).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyBootstrapSecret(plain: string, storedHash: string): boolean {
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hex] = parts;
  if (!salt || !hex) return false;
  const expected = Buffer.from(hex, 'hex');
  const actual = scryptSync(plain, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function generateBootstrapSecret(): { secret: string; hash: string } {
  const secret = randomBytes(24).toString('base64url');
  return { secret, hash: hashBootstrapSecret(secret) };
}

export interface AuthenticatorOptions {
  ownerE164: string;
  adminAllowlistE164: string[];
  adminPassword?: string;
  requirePassword?: boolean;
  bootstrapSecretHash?: string;
  bootstrapExpiresAt?: Date;
  maxAuthFailuresPerWindow?: number;
  windowMs?: number;
  now?: () => Date;
}

/**
 * Autentikator & otorisasi berbasis metadata pengirim WhatsApp yang terverifikasi +
 * verifikasi password interaktif di chat pribadi ("hedyfake").
 * - Nomor admin utama: 082233038659 (+6282233038659).
 * - Nomor bot bersifat dinamis/random (bisa berganti kapan saja melalui scan QR Code).
 * - Pesan dari grup TIDAK PERNAH mendapat hak admin/owner untuk eksekusi kontrol.
 */
export class AdminAuthenticator {
  private readonly ownerE164: string;
  private readonly allowlistE164 = new Set<string>();
  private readonly allowlistJids = new Set<string>();
  private readonly revokedJids = new Set<string>();
  private readonly adminPasswordHash?: string;
  private readonly requirePassword: boolean;
  private readonly passwordVerifiedKeys = new Set<string>();
  private readonly awaitingPasswordByChat = new Map<string, { pendingText?: string; requestedAt: number }>();
  private bootstrapHash?: string;
  private bootstrapExpiresAt?: Date;
  private bootstrapConsumed = false;
  private readonly failures = new Map<string, RateLimitWindow>();
  private readonly maxFailures: number;
  private readonly windowMs: number;
  private readonly now: () => Date;

  constructor(opts: AuthenticatorOptions) {
    const ownerNorm = normalizeE164(opts.ownerE164);
    if (!ownerNorm) throw new Error('ownerE164 tidak valid');
    this.ownerE164 = ownerNorm;
    this.addAllowedPhone(ownerNorm);
    for (const p of opts.adminAllowlistE164) {
      const n = normalizeE164(p);
      if (n) this.addAllowedPhone(n);
    }
    if (opts.adminPassword) {
      this.adminPasswordHash = hashBootstrapSecret(opts.adminPassword.trim());
    }
    this.requirePassword = Boolean(opts.requirePassword && this.adminPasswordHash);
    this.bootstrapHash = opts.bootstrapSecretHash;
    this.bootstrapExpiresAt = opts.bootstrapExpiresAt;
    this.maxFailures = opts.maxAuthFailuresPerWindow ?? 5;
    this.windowMs = opts.windowMs ?? 10 * 60 * 1000;
    this.now = opts.now ?? (() => new Date());
  }

  private addAllowedPhone(e164: string): void {
    this.allowlistE164.add(e164);
    this.allowlistJids.add(e164ToJid(e164));
  }

  isPasswordRequired(): boolean {
    return this.requirePassword;
  }

  isAwaitingPassword(chatJid: string): boolean {
    return this.awaitingPasswordByChat.has(chatJid);
  }

  promptForPassword(chatJid: string, pendingText?: string): void {
    this.awaitingPasswordByChat.set(chatJid, {
      pendingText,
      requestedAt: this.now().getTime(),
    });
  }

  isSessionPasswordVerified(msg: Pick<InboundMessage, 'chatJid' | 'senderJid'>): boolean {
    if (!this.requirePassword) return true;
    const senderE164 = normalizeE164(msg.senderJid);
    const canonicalJid = senderE164 ? e164ToJid(senderE164) : msg.senderJid;
    return (
      this.passwordVerifiedKeys.has(canonicalJid) ||
      this.passwordVerifiedKeys.has(msg.senderJid) ||
      this.passwordVerifiedKeys.has(msg.chatJid)
    );
  }

  /**
   * Verifikasi password admin ("hedyfake") yang dikirim melalui balasan chat pribadi.
   * Mengizinkan nomor admin 082233038659 (maupun JID @lid/@c.us di chat pribadi admin)
   * untuk mengaktifkan sesi kontrol admin.
   */
  verifyAdminPassword(
    msg: Pick<InboundMessage, 'chatType' | 'chatJid' | 'senderJid'>,
    candidatePassword: string,
  ): { ok: boolean; reason: string; pendingText?: string } {
    if (msg.chatType !== 'private' || msg.chatJid.endsWith('@g.us')) {
      return { ok: false, reason: 'group_not_allowed' };
    }
    const senderE164 = normalizeE164(msg.senderJid);
    const canonicalJid = senderE164 ? e164ToJid(senderE164) : msg.senderJid;

    if (this.isRateLimited(canonicalJid) || this.isRateLimited(msg.chatJid)) {
      return { ok: false, reason: 'rate_limited' };
    }

    // Jika senderE164 terdeteksi sebagai nomor telepon biasa (bukan @lid), pastikan nomornya adalah nomor admin (082233038659).
    if (
      senderE164 &&
      !msg.senderJid.endsWith('@lid') &&
      senderE164 !== this.ownerE164 &&
      !this.allowlistE164.has(senderE164)
    ) {
      this.recordFailure(canonicalJid);
      return { ok: false, reason: 'not_admin_number' };
    }

    if (!this.adminPasswordHash) {
      return { ok: false, reason: 'password_not_configured' };
    }

    const ok = verifyBootstrapSecret(candidatePassword.trim(), this.adminPasswordHash);
    if (!ok) {
      this.recordFailure(canonicalJid);
      this.recordFailure(msg.chatJid);
      return { ok: false, reason: 'invalid_password' };
    }

    this.revokedJids.delete(canonicalJid);
    this.revokedJids.delete(msg.chatJid);
    this.passwordVerifiedKeys.add(canonicalJid);
    this.passwordVerifiedKeys.add(msg.senderJid);
    this.passwordVerifiedKeys.add(msg.chatJid);
    if (senderE164) {
      this.addAllowedPhone(senderE164);
    }

    const pending = this.awaitingPasswordByChat.get(msg.chatJid)?.pendingText;
    this.awaitingPasswordByChat.delete(msg.chatJid);
    return { ok: true, reason: 'password_verified', pendingText: pending };
  }

  lockAdminSession(msg: Pick<InboundMessage, 'chatJid' | 'senderJid'>): void {
    const senderE164 = normalizeE164(msg.senderJid);
    const canonicalJid = senderE164 ? e164ToJid(senderE164) : msg.senderJid;
    this.passwordVerifiedKeys.delete(canonicalJid);
    this.passwordVerifiedKeys.delete(msg.senderJid);
    this.passwordVerifiedKeys.delete(msg.chatJid);
    this.awaitingPasswordByChat.delete(msg.chatJid);
  }

  /** Evaluasi pengirim untuk konteks pesan masuk. */
  evaluate(msg: Pick<InboundMessage, 'chatType' | 'chatJid' | 'senderJid'>): AuthDecision {
    const senderE164 = normalizeE164(msg.senderJid);
    // Aturan keras: command admin hanya dari private DM.
    if (msg.chatType !== 'private' || msg.chatJid.endsWith('@g.us')) {
      return {
        allowed: false,
        isOwner: false,
        isAdmin: false,
        role: 'member',
        actorE164: senderE164,
        actorJid: msg.senderJid,
        reason: 'group_context_not_admin',
      };
    }

    // Jika sesi chat pribadi sudah terverifikasi lewat password (mis. saat WA mengirim JID @lid)
    const verifiedByPassword =
      this.passwordVerifiedKeys.has(msg.chatJid) ||
      this.passwordVerifiedKeys.has(msg.senderJid) ||
      (senderE164 ? this.passwordVerifiedKeys.has(e164ToJid(senderE164)) : false);

    if (!senderE164 && !verifiedByPassword) {
      return {
        allowed: false,
        isOwner: false,
        isAdmin: false,
        role: 'anonymous',
        actorE164: null,
        actorJid: msg.senderJid,
        reason: 'invalid_sender_jid',
      };
    }

    const canonicalJid = senderE164 ? e164ToJid(senderE164) : msg.senderJid;
    if (this.revokedJids.has(canonicalJid) || this.revokedJids.has(msg.chatJid)) {
      return {
        allowed: false,
        isOwner: false,
        isAdmin: false,
        role: 'anonymous',
        actorE164: senderE164,
        actorJid: canonicalJid,
        reason: 'session_revoked',
      };
    }

    if (this.isRateLimited(canonicalJid) || this.isRateLimited(msg.chatJid)) {
      return {
        allowed: false,
        isOwner: false,
        isAdmin: false,
        role: 'anonymous',
        actorE164: senderE164,
        actorJid: canonicalJid,
        reason: 'rate_limited',
      };
    }

    const isOwner = senderE164 === this.ownerE164 || verifiedByPassword;
    const isAdmin =
      isOwner ||
      (senderE164 ? this.allowlistE164.has(senderE164) : false) ||
      this.allowlistJids.has(canonicalJid);

    if (isAdmin && this.requirePassword && !verifiedByPassword) {
      return {
        allowed: false,
        isOwner,
        isAdmin,
        role: isOwner ? 'owner' : 'admin',
        actorE164: senderE164,
        actorJid: canonicalJid,
        reason: 'password_required',
        requiresPassword: true,
      };
    }

    return {
      allowed: isAdmin,
      isOwner,
      isAdmin,
      role: isOwner ? 'owner' : isAdmin ? 'admin' : 'member',
      actorE164: senderE164,
      actorJid: canonicalJid,
      reason: isAdmin ? 'allowlisted_private_dm' : 'not_in_allowlist',
    };
  }

  /** Pairing satu kali menggunakan bootstrap secret. */
  pairWithBootstrap(
    msg: Pick<InboundMessage, 'chatType' | 'chatJid' | 'senderJid'>,
    candidateSecret: string,
  ): { ok: boolean; reason: string } {
    if (msg.chatType !== 'private' || msg.chatJid.endsWith('@g.us')) {
      return { ok: false, reason: 'group_not_allowed' };
    }
    const senderE164 = normalizeE164(msg.senderJid);
    if (!senderE164) return { ok: false, reason: 'invalid_sender_jid' };
    const jid = e164ToJid(senderE164);

    if (this.isRateLimited(jid)) return { ok: false, reason: 'rate_limited' };
    if (this.bootstrapConsumed || !this.bootstrapHash) return { ok: false, reason: 'bootstrap_unavailable' };
    if (this.bootstrapExpiresAt && this.now().getTime() > this.bootstrapExpiresAt.getTime()) {
      return { ok: false, reason: 'bootstrap_expired' };
    }

    const ok = verifyBootstrapSecret(candidateSecret, this.bootstrapHash);
    if (!ok) {
      this.recordFailure(jid);
      return { ok: false, reason: 'invalid_secret' };
    }

    this.bootstrapConsumed = true;
    this.bootstrapHash = undefined;
    this.revokedJids.delete(jid);
    this.addAllowedPhone(senderE164);
    return { ok: true, reason: 'paired' };
  }

  revokeSession(phoneOrJid: string): boolean {
    const e164 = normalizeE164(phoneOrJid);
    if (!e164) return false;
    this.revokedJids.add(e164ToJid(e164));
    return true;
  }

  restoreSession(phoneOrJid: string): boolean {
    const e164 = normalizeE164(phoneOrJid);
    if (!e164) return false;
    return this.revokedJids.delete(e164ToJid(e164));
  }

  recordFailure(actorKey: string): void {
    const nowMs = this.now().getTime();
    const cur = this.failures.get(actorKey);
    if (!cur || nowMs >= cur.resetAt) {
      this.failures.set(actorKey, { count: 1, resetAt: nowMs + this.windowMs });
    } else {
      cur.count += 1;
    }
  }

  isRateLimited(actorKey: string): boolean {
    const nowMs = this.now().getTime();
    const cur = this.failures.get(actorKey);
    if (!cur) return false;
    if (nowMs >= cur.resetAt) {
      this.failures.delete(actorKey);
      return false;
    }
    return cur.count >= this.maxFailures;
  }

  /** Fingerprint aman untuk audit log (tanpa menyimpan secret). */
  static payloadHash(payload: unknown): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
  }
}
