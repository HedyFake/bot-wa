import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/config/env.js';
import { AdminAuthenticator } from '../src/admin/authentication/authenticator.js';
import { ConfirmationManager } from '../src/admin/authorization/confirmation.js';
import { CommandDispatcher } from '../src/admin/commands/dispatcher.js';
import { ModelRouter } from '../src/ai/model-router/router.js';
import { GroupIntelligenceService } from '../src/ai/classification/group-intelligence.js';
import { ScheduleService } from '../src/modules/schedule/service.js';
import { DriveCatalog } from '../src/modules/materials/drive.js';
import { MockWhatsAppProvider } from '../src/whatsapp/adapters/mock.js';
import { OutboundGate } from '../src/whatsapp/outbound/gate.js';

describe('pengiriman dokumen melalui dispatcher', () => {
  it('memeriksa tujuan, memproses attachment, mencatat hasil, dan membaca pencabutan izin', async () => {
    const group = 'kelas@g.us';
    const config = loadConfig({ OWNER_WHATSAPP: '6281234567890', GOOGLE_DRIVE_ALLOWED_CHATS: group });
    const wa = new MockWhatsAppProvider();
    await wa.connect();
    let accessible = true;
    let calls = 0;
    const drive = new DriveCatalog('ROOT', async () => 'fixture', async input => {
      calls++;
      const url = new URL(String(input));
      if (url.pathname.endsWith('/ROOT')) return Response.json({ mimeType: 'application/vnd.google-apps.folder' });
      if (url.searchParams.has('alt')) return new Response('%PDF-test');
      return Response.json({ files: accessible ? [{ id: 'abc', name: 'Modul.pdf', mimeType: 'application/pdf', capabilities: { canDownload: true } }] : [] });
    });
    const delivery: string[] = [];
    const dispatcher = new CommandDispatcher({ config, whatsapp: wa, drive,
      auth: new AdminAuthenticator({ ownerE164: config.OWNER_WHATSAPP, adminAllowlistE164: [] }),
      outbound: new OutboundGate({ provider: wa, outboundEnabled: true, dryRun: false }),
      router: new ModelRouter(), schedule: new ScheduleService(), confirmations: new ConfirmationManager(),
      intelligence: new GroupIntelligenceService(), startedAt: new Date(),
      deliveryAudit: async (_actor, _id, result) => { delivery.push(result); },
    });
    const message = (id: string, chatJid: string) => ({ chatJid, providerMessageId: id, senderJid: '628111111111@s.whatsapp.net',
      chatType: 'group' as const, text: '.download abc', receivedAt: new Date() });
    expect(await dispatcher.handleInbound(message('a', 'lain@g.us'))).toContain('izin');
    expect(calls).toBe(0);
    await dispatcher.handleInbound(message('b', group));
    expect(wa.sent.at(-1)?.media).toMatchObject({ asDocument: true, filename: 'Modul.pdf' });
    expect(delivery).toEqual(['sent']);
    wa.failNextSend = 'send_failed';
    await dispatcher.handleInbound(message('c', group));
    expect(delivery).toEqual(['sent', 'failed']);
    expect(wa.sent.at(-1)?.text).toContain('belum terkirim');
    accessible = false;
    expect(await dispatcher.handleInbound(message('d', group))).toContain('tidak ditemukan');
    expect(wa.sent.at(-1)?.media).toBeUndefined();
  });
});
