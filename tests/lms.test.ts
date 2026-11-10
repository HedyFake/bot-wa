import { describe,it,expect,vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import CFB from 'cfb';
import { lmsDate } from '../src/modules/lms/dates.js';
import { LmsClient, SessionExpired, official, seal, unseal, origin } from '../src/modules/lms/client.js';
import { crawl,parsePage } from '../src/modules/lms/catalog.js';
import { documentPayload } from '../src/modules/lms/document.js';
import { LmsService } from '../src/modules/lms/service.js';
import type { PrismaClient, LmsAccount } from '@prisma/client';
import { MockWhatsAppProvider } from '../src/whatsapp/adapters/mock.js';
import { OutboundGate } from '../src/whatsapp/outbound/gate.js';
import { ModelRouter } from '../src/ai/model-router/router.js';
import { CommandDispatcher } from '../src/admin/commands/dispatcher.js';
import { AdminAuthenticator } from '../src/admin/authentication/authenticator.js';
import { ConfirmationManager } from '../src/admin/authorization/confirmation.js';
import { ScheduleService } from '../src/modules/schedule/service.js';
import { GroupIntelligenceService } from '../src/ai/classification/group-intelligence.js';
import { loadConfig } from '../src/config/env.js';
const nim='2024030025',phone='+6281234567890',demo=origin+'/mahasiswa_panel';
const form='<form action="/auth/proses_login" method="post"><input name="username"><input name="password" type="password"><input type="hidden" name="csrf" value="test-only"></form>';
const material=(name:string)=>'<tr><td>'+name+'</td><td>Gerontik</td><td>Dosen uji</td><td><a href="/sample.pdf">Unduh</a></td></tr>';
const home='<table><tr><th>NIM</th><td>'+nim+'</td></tr></table><a href="/demo-material">Materi</a>';
const html=(body:string)=>new Response(body,{headers:{'content-type':'text/html'}});
const table=(rows:string)=>'<table><tr><th>Judul materi</th><th>Mata kuliah</th><th>Dosen</th><th>Aksi</th></tr>'+rows+'</table>';
// Struktur dari contoh portal, dengan identitas dan referensi akun uji.
const card=(name:string,kode:string,id:number)=>'<div class="matkul-item"><div class="mk-card"><span class="mk-code-badge">'+kode+'</span><span class="mk-sks-badge">4 SKS</span><div class="mk-name">'+name+'</div><div class="mk-class">Kelas A</div><span class="dosen-name-tag">Dosen Uji</span><div class="pertemuan-info">3 Pertemuan</div><span class="notif-chip">3 Materi Baru</span><a class="masuk-btn" href="/mahasiswa_panel/kelas/'+id+'">Masuk</a></div></div>';
const stats=(label:string,num:number)=>'<div class="stat-mini-card"><div class="stat-mini-num">'+num+'</div><div class="stat-mini-label">'+label+'</div></div>';
const portal='<div class="user-panel"><div class="user-name">Mahasiswa Uji</div><div class="user-nim">NIM: '+nim+'</div></div><div class="greeting-card"><div class="ta-badge-card">2026/2027 Ganjil — Semester Ganjil</div></div>'+
  stats('Mata Kuliah',7)+stats('Kuis Aktif',0)+stats('Tugas Pending',2)+stats('Materi Baru',16)+'<div id="daftarMatkul">'+card('Gerontik','KGER.4',101)+'</div>';
const lesson=(title:string,id:number)=>'<tr><td><div class="pert-badge">1</div></td><td><div class="materi-title">'+title+'</div><div class="materi-meta">Dosen Uji</div></td><td><span class="status-chip-unread">Belum</span></td><td><a class="buka-btn" href="/mahasiswa_panel/akses_materi/'+id+'">Buka</a></td></tr>';
const classroom=(rows:string)=>'<div class="kelas-hero"><h2>Gerontik</h2><div class="meta">KGER.4 • Kelas A • 4 SKS</div></div><div id="tab-materi"><table><thead><tr><th>Pert.</th><th>Topik Materi</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+rows+'</tbody></table></div><div id="tab-kuis">Belum ada kuis.</div><div id="tab-tugas">Tidak ada tugas saat ini.</div>';
describe('LMS privat',()=>{
  it('menangani alias mention di DM dan membuang login grup sebelum klasifikasi AI',async()=>{
    const config=loadConfig({OWNER_WHATSAPP:'6280000000000'});
    const wa=new MockWhatsAppProvider();await wa.connect();
    const gate=new OutboundGate({provider:wa,outboundEnabled:true,dryRun:false});
    const ai=vi.fn(),handle=vi.fn(async()=>'LMS privat');
    const bot=new CommandDispatcher({config,whatsapp:wa,outbound:gate,router:new ModelRouter({openai:{complete:ai}}),
      confirmations:new ConfirmationManager(),auth:new AdminAuthenticator({ownerE164:config.OWNER_WHATSAPP,adminAllowlistE164:[]}),
      schedule:new ScheduleService(),intelligence:new GroupIntelligenceService(),startedAt:new Date(),lms:{handle} as unknown as LmsService});
    const base={senderJid:'6281234567890@c.us',receivedAt:new Date(),isBotMentioned:true};
    expect(await bot.handleInbound({...base,chatType:'group',chatJid:'kelas@g.us',providerMessageId:'g',text:'.lms hedy login rahasia-uji'})).toBeNull();
    expect(wa.sent).toHaveLength(0);
    expect(await bot.handleInbound({...base,chatType:'private',chatJid:base.senderJid,providerMessageId:'p',text:'@bot buka lms hedy materi gerontik'})).toBe('LMS privat');
    expect(handle).toHaveBeenCalledTimes(1);
    expect(ai).not.toHaveBeenCalled();
  });
  it('memvalidasi struktur PPTX dan DOCX serta tanggal Indonesia dalam WIB',async()=>{
    for(const [ext,name,root,mime] of [
      ['docx','word/document.xml','w:document','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      ['pptx','ppt/presentation.xml','p:presentation','application/vnd.openxmlformats-officedocument.presentationml.presentation']
    ] as const) {
      const archive=CFB.utils.cfb_new();
      CFB.utils.cfb_add(archive,'[Content_Types].xml',Buffer.from('<Types/>'));
      CFB.utils.cfb_add(archive,name,Buffer.from('<'+root+'/>'));
      const data=CFB.write(archive,{type:'buffer',fileType:'zip',compression:true});
      expect((await documentPayload(data,mime,'../Materi')).filename).toBe('Materi.'+ext);
      await expect(documentPayload(data,'application/pdf','x')).rejects.toThrow();
    }
    expect(lmsDate('Senin, 16 November 2026 14:00')).toBe(Date.parse('2026-11-16T07:00:00Z'));
    expect(lmsDate('31 Februari 2026')).toBeUndefined();
  });
  it('membaca form dan token aktual, mengikuti redirect dengan cookie per sesi, menolak login salah',async()=>{
    const fetcher:typeof fetch=async(u,init)=>{
      const url=new URL(String(u));
      if(url.pathname==='/')return new Response(form,{headers:{'set-cookie':'ci_session=before; Secure; Path=/'}});
      if(url.pathname==='/auth/proses_login'){
        expect(init!.method).toBe('POST');expect(new Headers(init!.headers).get('cookie')).toBe('ci_session=before');
        const fields=init!.body as URLSearchParams;expect(fields.get('csrf')).toBe('test-only');
        return fields.get('password')==='uji'?new Response(null,{status:302,headers:{location:demo,'set-cookie':'ci_session=after; Path=/; Secure'}}):html(form);
      }
      expect(new Headers(init!.headers).get('cookie')).toBe('ci_session=after');return html(home);
    };
    const c=new LmsClient('',fetcher);
    expect((await c.login(nim,'uji')).url).toBe(demo);expect(c.cookie).toBe('after');
    await expect(new LmsClient('',fetcher).login(nim,'salah')).rejects.toThrow();
    await expect(new LmsClient('',fetcher).login('123456789','uji')).rejects.toThrow();
  });
  it('membatasi origin, ukuran, HTML login dan tipe lampiran',async()=>{
    expect(()=>official('https://evil.example/a')).toThrow();
    const redirected=new LmsClient('secret',async()=>new Response(null,{status:302,headers:{location:'http://127.0.0.1/'}}));
    await expect(redirected.page(demo)).rejects.toThrow();
    await expect(new LmsClient('',async()=>html(form)).file(demo,2000)).rejects.toBeInstanceOf(SessionExpired);
    await expect(new LmsClient('',async()=>new Response('12345')).file(demo,2)).rejects.toThrow();
    await expect(documentPayload(Buffer.from('<html>Login</html>'),'application/pdf','x')).rejects.toThrow();
    await expect(new LmsClient('',async()=>new Response(null,{status:503})).page(demo)).rejects.toThrow();
  });
  it('membaca metadata yang ditautkan, mempertahankan status eksplisit, tidak mengunjungi kuis',async()=>{
    const c=new LmsClient('a',async()=>html(table(material('Latihan teori'))));
    const result=await crawl(c,{html:home,url:demo});
    expect(result.items[0]).toMatchObject({kind:'materi',course:'Gerontik',files:[origin+'/sample.pdf']});
    const rows=parsePage('<table><tr><th>Judul tugas</th><th>Status</th></tr><tr><td>Laporan</td><td>Belum dikumpulkan</td></tr></table>',demo,'tugas');
    expect(rows.items[0]?.fields.status).toBe('Belum dikumpulkan');
    expect(parsePage('<a href="/attempt/1">Mulai kuis</a>',demo).links).toEqual([]);
    expect(parsePage('<table><tr><th>Judul kuis</th><th>Status</th></tr><tr><td>Evaluasi</td><td>Aktif</td></tr></table>',demo,'kuis').items[0]?.kind).toBe('kuis');
  });
  it('mengikat ciphertext ke pemilik akun',()=>{
    const key=Buffer.alloc(32,1),cipher=seal(key,'A',{cookie:'private-cookie'});
    expect(cipher).not.toContain('private-cookie');expect(unseal(key,'A',cipher)).toEqual({cookie:'private-cookie'});
    expect(()=>unseal(key,'B',cipher)).toThrow();
  });
  it('menegakkan izin, mengirim PDF hanya ke DM, memulihkan antrean dan menghapus sesi saat logout',async()=>{
    const a:LmsAccount={phone,nim,alias:'hedy',consentAt:null,aiConsent:false,encrypted:null,revision:0,paused:false,notify:false,nextSyncAt:new Date(0),failures:0,loginAttempts:0,loginAfter:null};
    const update=(data:Record<string,unknown>)=>{for(const [k,v] of Object.entries(data)){
      const row=a as unknown as Record<string,unknown>;
      row[k]=v && typeof v==='object' && 'increment' in v?Number(row[k])+Number(v.increment):v;
    }};
    const db={auditLog:{create:vi.fn()},lmsAccount:{
      findUnique:async({where}:{where:{phone:string}})=>where.phone===phone?{...a}:null,
      findMany:async()=>a.encrypted && !a.paused?[{...a}]:[],
      update:async({data}:{data:Record<string,unknown>})=>update(data),
      updateMany:async({where,data}:{where:{revision:number};data:Record<string,unknown>})=>{if(a.revision!==where.revision)return {count:0};update(data);return {count:1};}
    }} as unknown as PrismaClient;
    let rows=lesson('Latihan A',41),expired=false,pdfRequests=0;
    const pdf=await PDFDocument.create();pdf.addPage();const bytes=await pdf.save();
    const fetcher:typeof fetch=async(u,opts)=>{
      const path=new URL(String(u)).pathname;
      if(path==='/')return html(form);
      if(opts?.method==='POST')return new Response(null,{status:302,headers:{location:demo,'set-cookie':'ci_session=secret-cookie; Secure'}});
      if(expired)return html(form);
      if(path.startsWith('/mahasiswa_panel/akses_materi/')){
        pdfRequests++;
        return new Response(new Uint8Array(bytes),{headers:{'content-type':'application/pdf'}});
      }
      return html(path==='/mahasiswa_panel/kelas/101'?classroom(rows):portal);
    };
    const wa=new MockWhatsAppProvider();await wa.connect();const gate=new OutboundGate({provider:wa,outboundEnabled:true,dryRun:false});
    const synthesis=vi.fn(async()=>({content:'Jawaban berdasarkan sumber uji.'}));
    const service=()=>new LmsService(db,Buffer.alloc(32,1),new ModelRouter({openai:{complete:synthesis}}),gate,1800_000,1_000_000,c=>new LmsClient(c,fetcher),
      async()=>[{label:'hal. 2, bagian 1',text:'Kutipan tentang mobilisasi.'}]);
    let svc=service(),id=0;
    const send=(input:string,sender=phone,type:'private'|'group'='private')=>svc.handle({chatType:type,senderJid:sender.slice(1)+'@c.us',chatJid:type==='group'?'group@g.us':sender.slice(1)+'@c.us',text:'.lms '+input,providerMessageId:String(++id),receivedAt:new Date()},input,false);
    await send('hedy login secret',phone,'group');expect(wa.sent).toHaveLength(0);
    expect(await send('hedy login secret')).toContain('setuju');
    await send('hedy setuju');const dashboard=await send('hedy login secret');
    expect(dashboard).toContain('Tugas Pending: 2');expect(dashboard).toContain('Materi Baru: 16');
    expect(dashboard).toContain('Kuis Aktif: 0');expect(dashboard).toContain('Gerontik · KGER.4');
    expect(await send('hedy dosen gerontik')).toContain('Dosen Uji');
    expect(a.encrypted).not.toContain('secret');
    expect(await send('hedy materi','+62888888888')).toContain('belum terdaftar');
    expect(await send('hedy materi gerontik')).toContain('Latihan A');
    expect(await send('hedy materi list KGER.4')).toContain('Latihan A');
    expect(pdfRequests).toBe(0);
    const itemId=parsePage(classroom(rows),origin+'/mahasiswa_panel/kelas/101','matkul','Gerontik').items[0]!.id;
    await send('hedy materi kirim '+itemId);expect(wa.sent.at(-1)?.media?.mimeType).toBe('application/pdf');
    expect(await send('hedy ask teori')).toContain('ai on');
    await send('hedy ai on');
    expect(await send('hedy ask mobilisasi')).toContain('hal. 2, bagian 1');
    expect(synthesis).toHaveBeenCalledTimes(1);
    expect(await send('hedy materi cari mobilisasi')).toContain('Latihan A');
    await send('hedy notif on');svc=service();rows+=lesson('Latihan B',42);
    const morning=new Date('2026-11-10T02:00:00Z');await svc.tick(morning);await svc.tick(morning);
    expect(wa.sent.filter(m=>m.text.includes('Perubahan LMS'))).toHaveLength(1);
    expired=true;await svc.tick(morning);expect(a.encrypted).toBeNull();
    await send('hedy logout');expect(a.consentAt).toBeNull();expect(a.paused).toBe(true);
  });
});
