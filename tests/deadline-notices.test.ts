import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CommandDispatcher } from '../src/admin/commands/dispatcher.js';
import { ConfirmationManager } from '../src/admin/authorization/confirmation.js';
import { AdminAuthenticator } from '../src/admin/authentication/authenticator.js';
import { GroupIntelligenceService } from '../src/ai/classification/group-intelligence.js';
import { ModelRouter } from '../src/ai/model-router/router.js';
import { loadConfig } from '../src/config/env.js';
import { ScheduleService } from '../src/modules/schedule/service.js';
import { FunAndUtilityService } from '../src/modules/fun/fun-utility-service.js';
import { MockWhatsAppProvider } from '../src/whatsapp/adapters/mock.js';
import { OutboundGate } from '../src/whatsapp/outbound/gate.js';
import { deadlineFromQuote } from '../src/modules/academic/task-intake.js';
import { buildNotices } from '../src/modules/academic/deadline-notices.js';

const owner = '6280000000000@s.whatsapp.net', source = 'kelas@g.us', target = 'praktikum@g.us';
const student = '6281111111111@s.whatsapp.net';
const message = 'Kumpulkan Makalah gerontik untuk Keperawatan Gerontik paling lambat 16 November 2026 pukul 14.00. Dosen: Ibu Sari. PJ: Ani.';
function setup(path:string, clock:()=>Date,wa:MockWhatsAppProvider) {
  const config=loadConfig({OWNER_WHATSAPP:'6280000000000', WHATSAPP_PRIMARY_GROUP_JID:source, OUTBOUND_ENABLED:'true',DRY_RUN:'false'});
  const funService=new FunAndUtilityService({persistPath:path,now:clock});
  const router=new ModelRouter({transport:{complete:async req => {
    const text=String(req.messages.at(-1)?.content);
    return {content:JSON.stringify(text===message?{kind:'tugas',title:'Makalah gerontik',course:'Keperawatan Gerontik',lecturer:'Ibu Sari',pic:'Ani',deadlineQuote:'16 November 2026 pukul 14.00'}:{kind:'obrolan',title:null,course:null,lecturer:null,pic:null,deadlineQuote:null})};
  }}});
  return new CommandDispatcher({config,whatsapp:wa,outbound:new OutboundGate({provider:wa,outboundEnabled:true,dryRun:false}),
    confirmations:new ConfirmationManager({now:clock}),auth:new AdminAuthenticator({ownerE164:config.OWNER_WHATSAPP,adminAllowlistE164:[]}),
    schedule:new ScheduleService(),router,funService,intelligence:new GroupIntelligenceService({primaryGroupJid:source}),startedAt:clock(),now:clock});
}

describe('antrean tugas dan konfirmasi pengiriman',()=>{
  it('membedakan obrolan, memulihkan H−3 pada jam WIB, lalu hanya mengirim ke grup pilihan owner',async()=>{
    const dir=mkdtempSync(join(tmpdir(),'hdybot-deadline-'));
    try {
      const path=join(dir,'state.json');
      let now=new Date('2026-11-09T06:00:00Z');
      const clock=()=>now;
      const wa=new MockWhatsAppProvider(); await wa.connect();
      let bot=setup(path,clock,wa);
      let seq=0;
      const incoming=(chatJid:string,text:string,senderJid=student,id=String(++seq))=>bot.handleInbound({providerMessageId:id,chatJid,senderJid,chatType:chatJid.endsWith('@g.us')?'group':'private',chatName:chatJid===target?'Praktikum':'Kelas',receivedAt:clock(),text});
      await incoming(target,'halo teman-teman');
      await incoming(source,'Apakah kalian sudah mengumpulkan tugas?');
      expect(wa.sent).toHaveLength(0);
      await incoming(source,message,student,'original');
      expect(wa.sent).toHaveLength(1);
      expect(wa.sent[0]!.chatJid).toBe(owner);
      const task=bot.fun.listAssignments('Makalah gerontik')[0]!;
      expect(task).toMatchObject({dueDateIso:'2026-11-16',dueTime:'14:00',lecturer:'Ibu Sari',pic:'Ani'});
      const listing=await incoming(owner,'.tugas detail '+task.id,owner);
      expect(listing).toContain('*LIST TUGAS*\n\n*1.*\n📑 Tugas: Makalah gerontik');
      bot=setup(path,clock,wa);
      await incoming(source,message,student,'original');
      await incoming(source,message,student,'salinan');
      expect(bot.fun.listAssignments('Makalah gerontik')).toHaveLength(1);
      now=new Date('2026-11-13T06:59:59Z'); await bot.tickDeadlines();
      expect(wa.sent.filter(m=>m.text.includes('*Pengingat H−3*'))).toHaveLength(0);
      now=new Date('2026-11-13T07:00:00Z'); await Promise.all([bot.tickDeadlines(),bot.tickDeadlines()]);
      const alerts=wa.sent.filter(m=>m.text.startsWith('*Pengingat H−3*'));
      expect(alerts.map(m=>m.chatJid)).toEqual([owner]);
      expect(await incoming(target,'.tugas detail '+task.id)).not.toContain('Makalah gerontik');
      expect(await incoming(source,'.tugas detail '+task.id)).not.toContain('Makalah gerontik');
      const id=task.id+'.1.h3';
      expect(await incoming(source,'.tugas tujuan '+id+' Praktikum',owner)).toBeNull();
      expect(await incoming(student,'.tugas tujuan '+id+' Praktikum')).toContain('Akses ditolak');
      const preview=await incoming(owner,'.tugas tujuan '+id+' Praktikum',owner);
      const nonce=preview!.match(/\.confirm ([A-F0-9]+)/)![1];
      expect(wa.sent.filter(m=>m.chatJid===target && m.text.includes('Makalah gerontik'))).toHaveLength(0);
      expect(await incoming(owner,'.confirm '+nonce,owner)).toContain('terkirim');
      await incoming(owner,'.confirm '+nonce,owner);
      bot=setup(path,clock,wa); await bot.tickDeadlines();
      expect(wa.sent.filter(m=>m.chatJid===target && m.text.startsWith('*Pengingat H−3*')).map(m=>m.text)).toEqual([alerts[0]!.text.split('\n\nKhusus Hedy.')[0]]);
      expect(await incoming(owner,'.tugas tujuan '+id+' Praktikum',owner)).toContain('sudah diproses');
      expect(await incoming(target,'.tugas detail '+task.id)).toContain('Makalah gerontik');
      expect(await incoming(source,'.tugas detail '+task.id)).not.toContain('Makalah gerontik');
      for (const [date,heading] of [['14','Pengingat H−2'],['15','Pengingat H−1'],['16','Deadline hari ini']]) {
        now=new Date('2026-11-'+date+'T07:00:05Z');
        const before=wa.sent.length;
        await bot.tickDeadlines();
        bot=setup(path,clock,wa);
        await bot.tickDeadlines();
        expect(wa.sent.slice(before).map(m=>[m.chatJid,m.text.split('\n')[0]])).toEqual([[owner,'*'+heading+'*']]);
      }
      const finalCount=wa.sent.length;
      now=new Date('2026-11-17T07:00:00Z'); await bot.tickDeadlines();
      expect(wa.sent).toHaveLength(finalCount);
    } finally { rmSync(dir,{recursive:true,force:true}); }
  });
  it('membatalkan pratinjau usang, menghormati penolakan dan tugas selesai',async()=>{
    const dir=mkdtempSync(join(tmpdir(),'hdybot-review-'));
    try {
      const wa=new MockWhatsAppProvider(); await wa.connect();
      let now=new Date('2026-11-09T01:00:00Z'); const bot=setup(join(dir,'state.json'),()=>now,wa);
      let seq=0; const dm=(text:string)=>bot.handleInbound({senderJid:owner,chatJid:owner,chatType:'private',providerMessageId:String(++seq),text,receivedAt:now});
      const task=bot.fun.addAssignment({course:'Kelas',title:'Registrasi',dueDateIso:'2026-11-12',dueTime:'08:00',createdBy:owner,now});
      await bot.tickDeadlines();
      const old=await dm('.tugas tujuan '+task.id+'.1.h3 '+source);
      const code=old!.match(/\.confirm ([A-F0-9]+)/)![1];
      await dm('.tugas deadline '+task.id+' 2026-11-17 12:00');
      expect(await dm('.confirm '+code)).toContain('berubah');
      const latest=task.id+'.2.baru';
      expect(await dm('.tugas tolak '+latest)).toContain('tidak diteruskan');
      expect(await dm('.tugas tujuan '+latest+' '+source)).toContain('sudah diproses');
      now=new Date('2026-11-14T05:00:00Z'); await bot.tickDeadlines();
      const last=await dm('.tugas tujuan '+task.id+'.2.h3 '+source);
      const finalCode=last!.match(/\.confirm ([A-F0-9]+)/)![1];
      await dm('.selesaitugas '+task.id);
      expect(await dm('.confirm '+finalCode)).toContain('berubah');
      expect(wa.sent.filter(m=>m.chatJid===source)).toHaveLength(0);
    } finally { rmSync(dir,{recursive:true,force:true}); }
  });
  it('menggabungkan tenggat dekat, menolak tanggal tidak valid, dan tidak menebak jam',()=>{
    const clock=new Date('2026-11-09T01:00:00Z');
    expect(deadlineFromQuote('besok',clock)).toEqual({date:'2026-11-10',time:undefined});
    expect(deadlineFromQuote('31 Februari 2026',clock)).toBeUndefined();
    expect(deadlineFromQuote('besok pukul 14:00 WITA',clock)).toBeUndefined();
    const item={id:'TUG-9',title:'Daftar seminar',course:'',status:'open' as const,description:'',dueDateIso:'2026-11-10',createdBy:owner,createdAt:clock.toISOString()};
    expect(buildNotices(item,+clock,true).map(j=>j.kind)).toEqual(['h1','h0']);
    const jobs=buildNotices({...item,dueDateIso:'2026-11-16'},+clock,true);
    expect(jobs.map(j=>j.kind)).toEqual(['baru','h3','h2','h1','h0']);
    expect(new Date(jobs[1]!.sendAt).toISOString()).toBe('2026-11-13T02:00:00.000Z');
    const sameDay=buildNotices({...item,dueDateIso:'2026-11-09',dueTime:'14:00'},+clock,true);
    expect(sameDay.map(j=>[j.kind,new Date(j.sendAt).toISOString()])).toEqual([
      ['baru',clock.toISOString()],['h0','2026-11-09T07:00:00.000Z'],
    ]);
  });
  it('memulihkan antrean lama tanpa mengirim ulang H−3 atau menumpuk pengingat yang terlewat',async()=>{
    const dir=mkdtempSync(join(tmpdir(),'hdybot-upgrade-'));
    try {
      const path=join(dir,'state.json');
      const task={id:'TUG-1',title:'Makalah',course:'Gerontik',status:'open' as const,description:'',dueDateIso:'2026-11-16',dueTime:'14:00',createdBy:owner,createdAt:'2026-11-01T07:00:00Z'};
      const h3=buildNotices(task,Date.parse(task.createdAt),false)[0]!;
      writeFileSync(path,JSON.stringify({assignments:[task],deadlineNotices:{[h3.id]:{...h3,day:undefined,delivery:'delivered',retryAt:h3.sendAt+60000}}}));
      let now=new Date(h3.sendAt);
      const wa=new MockWhatsAppProvider(); await wa.connect();
      let bot=setup(path,()=>now,wa);
      await bot.tickDeadlines();
      expect(wa.sent).toHaveLength(0);
      now=new Date('2026-11-15T07:15:00Z');
      bot=setup(path,()=>now,wa);
      await bot.tickDeadlines();
      expect(wa.sent.map(m=>[m.chatJid,m.text.split('\n')[0]])).toEqual([[owner,'*Pengingat H−1*']]);
      expect(bot.fun.activeNotices().find(j=>j.kind==='h2')?.share).toBe('rejected');
    } finally { rmSync(dir,{recursive:true,force:true}); }
  });
  it('menggunakan jadwal nyata dan tidak mengangkat semua dosen matkul menjadi dosen sesi',()=>{
    const schedule=new ScheduleService();
    const day=schedule.getToday(new Date('2026-11-09T02:00:00Z'));
    const text=schedule.formatDayText(day.weekdayLabel,day.sessions,day.dateIso);
    expect(text).toMatch(/^\*MK Senin 9 November 2026\*\n\n🕦 Pukul: 08:00–09:40 WIB/);
    expect(text).toContain('📗 Mata kuliah: Metodologi Penelitian');
    expect(text).toContain('👤 Dosen pengampu: Belum dikonfirmasi untuk sesi ini');
  });
});
