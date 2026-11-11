import { describe, it, expect } from 'vitest';
import CFB from 'cfb';
import { PDFDocument } from 'pdf-lib';
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
    const pdf=await PDFDocument.create();pdf.addPage();
    const presentation=CFB.utils.cfb_new();
    CFB.utils.cfb_add(presentation,'PowerPoint Document',Buffer.from([0,0,232,3,0,0,0,0]));
    CFB.utils.cfb_add(presentation,'Current User',Buffer.from('fixture'));
    const ppt=CFB.write(presentation,{type:'buffer',fileType:'cfb'});
    const office=CFB.utils.cfb_new();
    CFB.utils.cfb_add(office,'[Content_Types].xml',Buffer.from('<Types/>'));
    CFB.utils.cfb_add(office,'ppt/presentation.xml',Buffer.from('<p:presentation/>'));
    const pptx=CFB.write(office,{type:'buffer',fileType:'zip'});
    const pptxMime='application/vnd.openxmlformats-officedocument.presentationml.presentation';
    const files=[
      {id:'abc',name:'Modul.pdf',mimeType:'application/pdf',bytes:Buffer.from(await pdf.save())},
      {id:'ppt',name:'Slide.ppt',mimeType:'application/vnd.ms-powerpoint',bytes:ppt},
      {id:'pptx',name:'Slide.pptx',mimeType:pptxMime,bytes:pptx},
      {id:'slides',name:'Slide Google',mimeType:'application/vnd.google-apps.presentation',bytes:pptx},
    ];
    const drive = new DriveCatalog('ROOT', async () => 'fixture', async input => {
      calls++;
      const url = new URL(String(input));
      if (url.pathname.endsWith('/ROOT')) return Response.json({ mimeType: 'application/vnd.google-apps.folder' });
      if (url.pathname.endsWith('/slides/export')) {
        expect(url.searchParams.get('mimeType')).toBe(pptxMime);
        return new Response(new Uint8Array(pptx));
      }
      if (url.searchParams.has('alt')) return new Response(new Uint8Array(files.find(f=>url.pathname.endsWith('/'+f.id))!.bytes));
      return Response.json({files:accessible?files.map(({id,name,mimeType})=>({id,name,mimeType,capabilities:{canDownload:true}})):[]});
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
    for(const f of files){
      const slide=f.id==='slides';
      await dispatcher.handleInbound({...message('attachment-'+f.id,group),text:'.download '+f.id+(slide?' pptx':'')});
      const attachment=wa.sent.at(-1)?.media;
      expect(attachment).toMatchObject({asDocument:true,mimeType:slide?pptxMime:f.mimeType,
        filename:slide?'Slide Google.pptx':f.name});
      expect(Buffer.compare(attachment!.data,Buffer.from(f.bytes))).toBe(0);
    }
    accessible = false;
    expect(await dispatcher.handleInbound(message('d', group))).toContain('tidak ditemukan');
    expect(wa.sent.at(-1)?.media).toBeUndefined();
  });
});
