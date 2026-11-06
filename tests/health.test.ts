import { describe, expect, it } from 'vitest';
import { runHealth } from '../src/app/health.js';
import { loadConfig } from '../src/config/env.js';
import { MockWhatsAppProvider } from '../src/whatsapp/adapters/mock.js';

const config = loadConfig({ OWNER_WHATSAPP: '+6282233038659' });

describe('MockWhatsAppProvider', () => {
  it('connect, kirim, dan tolak saat terputus', async () => {
    const wa = new MockWhatsAppProvider();
    expect((await wa.send({ chatJid: 'x@s.whatsapp.net', text: 'hi', idempotencyKey: 'k1' })).ok).toBe(false);
    await wa.connect();
    const r = await wa.send({ chatJid: 'x@s.whatsapp.net', text: 'hi', idempotencyKey: 'k1' });
    expect(r.ok).toBe(true);
    expect(wa.sent).toHaveLength(1);
    wa.simulateState('session_expired');
    expect((await wa.send({ chatJid: 'x@s.whatsapp.net', text: 'hi', idempotencyKey: 'k2' })).error).toMatch(/session_expired/);
  });

  it('meneruskan pesan masuk ke handler', async () => {
    const wa = new MockWhatsAppProvider();
    const got: string[] = [];
    wa.onMessage((m) => { got.push(m.text); });
    await wa.inject({
      providerMessageId: 'm1', chatJid: '6282233038659@s.whatsapp.net', chatType: 'private',
      senderJid: '6282233038659@s.whatsapp.net', text: '.ping', receivedAt: new Date(),
    });
    expect(got).toEqual(['.ping']);
  });
});

describe('runHealth', () => {
  it('ok saat WhatsApp terhubung dan DB sehat', async () => {
    const wa = new MockWhatsAppProvider();
    await wa.connect();
    const startedAt = new Date('2026-11-06T00:00:00Z');
    const r = await runHealth({
      config, whatsapp: wa, startedAt, dbProbe: async () => {}, now: () => new Date('2026-11-06T00:01:00Z'),
    });
    expect(r.status).toBe('ok');
    expect(r.uptimeSec).toBe(60);
    expect(r.checks.find((c) => c.name === 'nvidia')?.status).toBe('not_configured');
  });

  it('down saat DB gagal, tanpa membocorkan detail koneksi', async () => {
    const r = await runHealth({
      config, startedAt: new Date(),
      dbProbe: async () => { throw new Error('postgresql://user:secretpw@host/db refused'); },
    });
    expect(r.status).toBe('down');
    expect(JSON.stringify(r)).not.toContain('secretpw');
  });
});
