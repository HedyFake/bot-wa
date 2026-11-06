import { describe, expect, it } from 'vitest';
import {
  AdminAuthenticator,
  generateBootstrapSecret,
} from '../src/admin/authentication/authenticator.js';
import { ConfirmationManager } from '../src/admin/authorization/confirmation.js';
import { parseCommand } from '../src/admin/commands/parser.js';

describe('parseCommand (dot & natural language)', () => {
  it('memetakan dot commands utama', () => {
    expect(parseCommand('.dashboard').command).toBe('dashboard');
    expect(parseCommand('.status').command).toBe('status');
    expect(parseCommand('.ping').command).toBe('ping');
    expect(parseCommand('.runtime').command).toBe('runtime');
    expect(parseCommand('.ai status').command).toBe('ai.status');
    expect(parseCommand('.ai model lightning').args).toEqual(['lightning']);
    expect(parseCommand('.jadwal kamis')).toMatchObject({ command: 'schedule.day', args: ['kamis'] });
    expect(parseCommand('.approve REV-1')).toMatchObject({ command: 'approve', args: ['REV-1'] });
    expect(parseCommand('.confirm ABCD1234')).toMatchObject({ command: 'confirm', args: ['ABCD1234'] });
  });

  it('memahami bahasa alami Indonesia dari owner', () => {
    expect(parseCommand('HdyBot, tampilkan dashboard hari ini.').command).toBe('dashboard');
    expect(parseCommand('Periksa status koneksi WhatsApp dan NVIDIA.').command).toBe('status');
    expect(parseCommand('Ganti model untuk klasifikasi pesan ke Lightning.').command).toBe('ai.model');
    expect(parseCommand('Tampilkan pesan yang menunggu persetujuanku.').command).toBe('pending');
    expect(parseCommand('Matikan sementara pengiriman pengumuman otomatis.').command).toBe('emergency.stop');
    expect(parseCommand('Jadwal hari rabu apa saja?')).toMatchObject({ command: 'schedule.day', args: ['rabu'] });
  });
});

describe('AdminAuthenticator (security & RBAC)', () => {
  it('mengizinkan Hedy dari private DM dan menolak dari grup meskipun pengirim adalah Hedy', () => {
    const auth = new AdminAuthenticator({
      ownerE164: '082233038659',
      adminAllowlistE164: ['+6282233038659'],
    });

    const dm = auth.evaluate({
      chatType: 'private',
      chatJid: '6282233038659@s.whatsapp.net',
      senderJid: '6282233038659@s.whatsapp.net',
    });
    expect(dm.allowed).toBe(true);
    expect(dm.isOwner).toBe(true);

    const fromGroup = auth.evaluate({
      chatType: 'group',
      chatJid: '120363000000@g.us',
      senderJid: '6282233038659@s.whatsapp.net',
    });
    expect(fromGroup.allowed).toBe(false);
    expect(fromGroup.reason).toBe('group_context_not_admin');
  });

  it('menolak nomor tidak terdaftar dan klaim palsu', () => {
    const auth = new AdminAuthenticator({
      ownerE164: '+6282233038659',
      adminAllowlistE164: [],
    });
    const stranger = auth.evaluate({
      chatType: 'private',
      chatJid: '628111111111@s.whatsapp.net',
      senderJid: '628111111111@s.whatsapp.net',
    });
    expect(stranger.allowed).toBe(false);
    expect(stranger.reason).toBe('not_in_allowlist');
  });

  it('bootstrap pairing 1x, menolak replay, expired, dan brute force rate-limit', () => {
    let clock = new Date('2026-11-06T10:00:00Z');
    const { secret, hash } = generateBootstrapSecret();
    const auth = new AdminAuthenticator({
      ownerE164: '+6282233038659',
      adminAllowlistE164: [],
      bootstrapSecretHash: hash,
      bootstrapExpiresAt: new Date('2026-11-06T10:15:00Z'),
      maxAuthFailuresPerWindow: 3,
      now: () => clock,
    });

    const newAdminMsg = {
      chatType: 'private' as const,
      chatJid: '628999999999@s.whatsapp.net',
      senderJid: '628999999999@s.whatsapp.net',
    };

    // Salah 1x
    expect(auth.pairWithBootstrap(newAdminMsg, 'wrong-secret').ok).toBe(false);
    // Benar 1x
    expect(auth.pairWithBootstrap(newAdminMsg, secret).ok).toBe(true);
    expect(auth.evaluate(newAdminMsg).allowed).toBe(true);
    // Replay token yang sama harus ditolak karena sudah dipakai
    expect(auth.pairWithBootstrap(newAdminMsg, secret).reason).toBe('bootstrap_unavailable');

    // Pencabutan sesi
    auth.revokeSession('+628999999999');
    expect(auth.evaluate(newAdminMsg).reason).toBe('session_revoked');

    // Brute force rate limit
    const attacker = {
      chatType: 'private' as const,
      chatJid: '628777777777@s.whatsapp.net',
      senderJid: '628777777777@s.whatsapp.net',
    };
    auth.recordFailure('628777777777@s.whatsapp.net');
    auth.recordFailure('628777777777@s.whatsapp.net');
    auth.recordFailure('628777777777@s.whatsapp.net');
    expect(auth.evaluate(attacker).reason).toBe('rate_limited');
    clock = new Date('2026-11-06T10:20:00Z');
  });
});

describe('ConfirmationManager (one-time nonce)', () => {
  it('mengikat nonce ke actor, menolak actor lain, replay, dan kadaluarsa', () => {
    let now = new Date('2026-11-06T12:00:00Z');
    const mgr = new ConfirmationManager({ ttlMs: 60_000, now: () => now });
    const c = mgr.issue('6282233038659@s.whatsapp.net', 'broadcast', 'Kirim pengumuman', { id: 1 });

    expect(mgr.confirm('628111111111@s.whatsapp.net', c.nonce)).toEqual({ ok: false, reason: 'wrong_actor' });
    const ok = mgr.confirm('6282233038659@s.whatsapp.net', c.nonce);
    expect(ok.ok).toBe(true);
    // Replay ditolak
    expect(mgr.confirm('6282233038659@s.whatsapp.net', c.nonce)).toEqual({ ok: false, reason: 'replayed' });

    // Expired test
    const c2 = mgr.issue('6282233038659@s.whatsapp.net', 'reset', 'Reset', {});
    now = new Date('2026-11-06T12:05:00Z');
    expect(mgr.confirm('6282233038659@s.whatsapp.net', c2.nonce)).toEqual({ ok: false, reason: 'expired' });
  });
});
