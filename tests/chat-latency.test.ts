import { expect, it, vi } from 'vitest';
import { CommandDispatcher } from '../src/admin/commands/dispatcher.js';
import { AdminAuthenticator } from '../src/admin/authentication/authenticator.js';
import { ConfirmationManager } from '../src/admin/authorization/confirmation.js';
import { ModelRouter } from '../src/ai/model-router/router.js';
import { GroupIntelligenceService } from '../src/ai/classification/group-intelligence.js';
import { loadConfig } from '../src/config/env.js';
import { ScheduleService } from '../src/modules/schedule/service.js';
import { MockWhatsAppProvider } from '../src/whatsapp/adapters/mock.js';
import { OutboundGate } from '../src/whatsapp/outbound/gate.js';

it('menjawab mention berikutnya saat AI sibuk dan memberi satu status untuk jawaban yang lambat', async () => {
  vi.useFakeTimers();
  try {
    const wa = new MockWhatsAppProvider();
    await wa.connect();
    const group = 'kelas@g.us';
    const config = loadConfig({OWNER_WHATSAPP:'6280000000000', WHATSAPP_PRIMARY_GROUP_JID:group});
    let finish!: (value: {content: string}) => void;
    const completion = vi.fn(() => new Promise<{content: string}>(resolve => { finish = resolve; }));
    const router = new ModelRouter({transport:{complete:completion}});
    const bot = new CommandDispatcher({config, whatsapp:wa, outbound:new OutboundGate({provider:wa,outboundEnabled:true,dryRun:false}),
      auth:new AdminAuthenticator({ownerE164:config.OWNER_WHATSAPP,adminAllowlistE164:[]}), confirmations:new ConfirmationManager(),
      schedule:new ScheduleService(), router, intelligence:new GroupIntelligenceService({primaryGroupJid:group}), startedAt:new Date()});
    let count = 0;
    const send = (text:string) => bot.handleInbound({providerMessageId:String(++count),chatJid:group,senderJid:'6281111111111@s.whatsapp.net',
      chatType:'group',isBotMentioned:true,text,receivedAt:new Date()});
    const slow = send('.rapikan pengumuman ini');
    await vi.advanceTimersByTimeAsync(1500);
    expect(wa.sent.map(m=>m.text)).toEqual(['Aku sedang menyiapkan jawabannya.']);
    expect(await send('HdyBot halo')).toContain('Halo!');
    expect(await send('HdyBot menu')).toBeTruthy();
    expect(await send('HdyBot tugas hari ini')).toBeTruthy();
    expect(completion).toHaveBeenCalledTimes(1);
    finish({content:'Pengumuman kelas.'});
    expect(await slow).toContain('Pengumuman kelas.');
    expect(wa.sent.filter(m=>m.text==='Aku sedang menyiapkan jawabannya.')).toHaveLength(1);
    expect(wa.sent.at(-1)?.quotedMessageId).toBe('1');
  } finally { vi.useRealTimers(); }
});
