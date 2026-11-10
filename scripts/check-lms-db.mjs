// Gunakan hanya pada database PostgreSQL uji lokal setelah migrate deploy.
import assert from 'node:assert/strict';
import {PrismaClient} from '@prisma/client';
import {randomBytes} from 'node:crypto';
import {LmsClient} from '../dist/modules/lms/client.js';
import {LmsService} from '../dist/modules/lms/service.js';
import {ModelRouter} from '../dist/ai/model-router/router.js';
import {MockWhatsAppProvider} from '../dist/whatsapp/adapters/mock.js';
import {OutboundGate} from '../dist/whatsapp/outbound/gate.js';
const url=new URL(process.env.HDYBOT_TEST_DATABASE_URL||'file:///missing');
assert.ok(['localhost','127.0.0.1'].includes(url.hostname) && /^\/hdybot_test_/.test(url.pathname),'Database uji lokal diperlukan');
const db=new PrismaClient({datasourceUrl:url.href});
const key=randomBytes(32),wa=new MockWhatsAppProvider();await wa.connect();
const gate=new OutboundGate({provider:wa,outboundEnabled:true,dryRun:false}),router=new ModelRouter();
const form='<form method="post" action="/auth/proses_login"><input name="username"><input type="password" name="password"></form>';
let title='Fixtur satu';
const http=async (u,opts)=>{
  if(opts.method==='POST')return new Response(null,{status:302,headers:{location:'/mahasiswa_panel','set-cookie':'ci_session=test-only; Path=/; Secure'}});
  const home='<p>NIM 2024030025</p><table><tr><th>Judul tugas</th><th>Status</th></tr><tr><td>'+title+'</td><td>Belum dikumpulkan</td></tr></table>';
  return new Response(new URL(u).pathname==='/'?form:home,{headers:{'content-type':'text/html'}});
};
const factory=()=>new LmsService(db,key,router,gate,1800_000,100_000,c=>new LmsClient(c,http));
let svc=factory(),seq=0;
const phone='+6280000001234',jid=phone.slice(1)+'@c.us';
const cmd=(input,owner=false)=>svc.handle({chatType:'private',chatJid:jid,senderJid:jid,receivedAt:new Date(),providerMessageId:'fixture-'+(++seq),text:'.lms '+input},input,owner);
try {
  assert.match(await cmd('daftar '+phone+' 2024030025 uji',true),/terdaftar/);
  await cmd('uji setuju');assert.match(await cmd('uji login kata-uji'),/Dashboard/);
  const stored=await db.lmsAccount.findUniqueOrThrow({where:{phone}});
  assert.ok(stored.encrypted && !stored.encrypted.includes('test-only') && !stored.encrypted.includes('kata-uji'));
  await cmd('uji notif on');title='Fixtur dua';svc=factory();
  const future=new Date('2030-01-01T02:00:00Z');
  await Promise.all([svc.tick(future),factory().tick(future)]);
  assert.equal(wa.sent.filter(m=>m.text.includes('Perubahan LMS')).length,1);
  assert.match(await cmd('uji tugas pending'),/Fixtur dua/);
  assert.match(await cmd('uji logout'),/dicabut/);
  assert.equal((await db.lmsAccount.findUniqueOrThrow({where:{phone}})).encrypted,null);
  console.log('Lulus: registrasi, consent, sesi terenkripsi, restart, klaim sinkronisasi konkuren, dan logout pada PostgreSQL uji dengan LMS/WA mock.');
} finally {await db.$disconnect();}
