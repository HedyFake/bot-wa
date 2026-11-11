import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { AdminAuthenticator } from '../src/admin/authentication/authenticator.js';
import { ConfirmationManager } from '../src/admin/authorization/confirmation.js';
import { CommandDispatcher } from '../src/admin/commands/dispatcher.js';
import { GroupIntelligenceService } from '../src/ai/classification/group-intelligence.js';
import { ModelRouter } from '../src/ai/model-router/router.js';
import { loadConfig } from '../src/config/env.js';
import { FunAndUtilityService } from '../src/modules/fun/fun-utility-service.js';
import { ScheduleService } from '../src/modules/schedule/service.js';
import { MockWhatsAppProvider } from '../src/whatsapp/adapters/mock.js';
import { OutboundGate } from '../src/whatsapp/outbound/gate.js';

it('membuat soal lewat Luna, menyimpan ronde, dan menilai jawaban setelah restart',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'hdy-game-ai-'));
  try {
    const config=loadConfig({OWNER_WHATSAPP:'6280000000000'}), wa=new MockWhatsAppProvider();
    await wa.connect();
    const complete=vi.fn(async()=>({content:JSON.stringify({prompt:'Organ apa yang memompa darah?',answer:'jantung',hint:'Terletak di rongga dada.',explanation:'Jantung memompa darah.',level:'easy'})}));
    const create=()=>new CommandDispatcher({config,whatsapp:wa,outbound:new OutboundGate({provider:wa,outboundEnabled:true,dryRun:false}),
      auth:new AdminAuthenticator({ownerE164:config.OWNER_WHATSAPP,adminAllowlistE164:[]}),confirmations:new ConfirmationManager(),
      router:new ModelRouter({openai:{complete}}),schedule:new ScheduleService(),intelligence:new GroupIntelligenceService(),funService:new FunAndUtilityService({persistPath:join(dir,'state.json')}),startedAt:new Date()});
    let bot=create(), id=0;
    const send=(text:string)=>bot.handleInbound({providerMessageId:String(++id),chatType:'group',chatJid:'uji@g.us',senderJid:'6280000000000@c.us',receivedAt:new Date(),text});
    const prompt=await send('.game ai anatomi');
    expect(prompt).toContain('Organ apa');expect(prompt).not.toContain('jantung');
    expect(await send('.game ai bahasa')).toContain('berlangsung');
    expect(complete).toHaveBeenCalledTimes(1);
    bot=create();
    expect(await send('.hint')).toContain('rongga dada');
    expect(await send('.jawab jantung')).toContain('BENAR');
  }finally{rmSync(dir,{recursive:true,force:true});}
});
