import { expect, it } from 'vitest';
import { whatsappText } from '../src/whatsapp/format.js';
import { MockWhatsAppProvider } from '../src/whatsapp/adapters/mock.js';
import { OutboundGate } from '../src/whatsapp/outbound/gate.js';
import { menuPage } from '../src/admin/commands/menu.js';

it('mempertahankan contoh kode dan memberi jarak antarparagraf', () => {
  const code = '```md\n# Judul\n\n\n**tebal**\n```';
  expect(whatsappText('## Contoh\n\n\n' + code)).toBe('*Contoh*\n\n' + code);
  expect(menuPage('game riwayat', false, true)).toContain('.game riwayat');
});

it('menggabungkan pengiriman serentak dalam satu chat dan memisahkan chat berbeda', async () => {
  const wa = new MockWhatsAppProvider();
  await wa.connect();
  const gate = new OutboundGate({provider:wa,outboundEnabled:true,dryRun:false});
  const msg = {chatJid:'kelas@g.us',text:'Pengingat',idempotencyKey:'event1'};
  await Promise.all([gate.send(msg),gate.send(msg),gate.send({...msg,chatJid:'praktikum@g.us'})]);
  expect(wa.sent).toHaveLength(2);
  const dry = new OutboundGate({provider:wa,outboundEnabled:true,dryRun:true});
  expect(await dry.send({...msg,chatJid:'owner@c.us'},{isAdminPrivateReply:true})).toMatchObject({ok:true,dryRun:true});
  expect(wa.sent).toHaveLength(2);
});
