import { expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { existingFeatureTools } from '../src/ai/existing-feature-tools.js';
import { LunaTransport } from '../src/ai/openai/luna.js';
import { ModelRouter } from '../src/ai/model-router/router.js';
import { CommandDispatcher } from '../src/admin/commands/dispatcher.js';
import { directIntent, inferIntent } from '../src/admin/commands/intent.js';
import { ReminderWorker } from '../src/modules/reminders/worker.js';
import type { PrismaClient } from '@prisma/client';
import { AdminAuthenticator } from '../src/admin/authentication/authenticator.js';
import { ConfirmationManager } from '../src/admin/authorization/confirmation.js';
import { GroupIntelligenceService } from '../src/ai/classification/group-intelligence.js';
import { AcademicCalendarService } from '../src/modules/academic/extended-modules.js';
import { FunAndUtilityService } from '../src/modules/fun/fun-utility-service.js';
import { ScheduleService } from '../src/modules/schedule/service.js';
import { MockWhatsAppProvider } from '../src/whatsapp/adapters/mock.js';
import { MediaService } from '../src/modules/media/media-service.js';
import { OutboundGate } from '../src/whatsapp/outbound/gate.js';
import { loadConfig } from '../src/config/env.js';
import { weatherReport } from '../src/modules/weather/forecast.js';
import { journalDelivery } from '../src/modules/materials/journal-delivery.js';

const now = () => new Date('2026-11-08T18:00:00Z'); // Senin, 01.00 WIB
const student = '6281234500000@c.us';
const other = '6281234500001@c.us';

it('meminta kota, mempertahankan periode, dan membaca data aktual dari respons provider', async () => {
  const dates=Array.from({length:7},(_,i)=>'2026-11-'+String(14+i));
  const api=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>{
    const url=new URL(String(input));
    if(url.hostname.startsWith('geocoding-')) {
      expect(url.searchParams.get('name')).toBe('Jombang');
      return Response.json({results:[{name:'Jombang',latitude:-7.5,longitude:112.2}]});
    }
    expect(url.searchParams.get('timezone')).toBe('Asia/Jakarta');
    expect(url.searchParams.get('forecast_days')).toBe('7');
    return Response.json({current:{time:'2026-11-14T09:15',temperature_2m:28,relative_humidity_2m:80,wind_speed_10m:11,weather_code:2},
      hourly:{time:['2026-11-14T09:00'],precipitation_probability:[40]},
      daily:{time:dates,weather_code:dates.map(()=>3),temperature_2m_min:dates.map(()=>22),temperature_2m_max:dates.map(()=>32),precipitation_probability_max:dates.map(()=>65)}});
  });
  try {
    const {send}=await bot();
    expect(await send('tolong cek cuaca sekarang dan tujuh hari ke depan')).toContain('Kota mana');
    expect(api).not.toHaveBeenCalled();
    const reply=await send('Jombang');
    expect(reply).toContain('Prakiraan tujuh hari');
    expect(reply).toContain('09:15 WIB');
    expect(reply).toContain('40%');
    expect(reply?.match(/65%/g)).toHaveLength(7);
    expect(api).toHaveBeenCalledTimes(2);
    expect(await weatherReport('Jombang',async()=>Response.json({error:true}))).toContain('belum tersedia');
    api.mockResolvedValueOnce(Response.json({error:true}));
    const unavailable=await send('.cuaca Jombang');
    expect(unavailable).toContain('bmkg.go.id');
    expect(unavailable).not.toContain('28°');
  } finally { api.mockRestore(); }
});

it('mengirim DOCX dan menggunakan draf yang sama untuk PPTX tanpa menyilang pemilik atau chat',async()=>{
  const draft={title:'Belajar bersama',sections:[{heading:'Pendahuluan',body:'Susun jadwal membaca.'},{heading:'Pembahasan',body:'Catat hasil diskusi.'}]};
  const complete=vi.fn(async()=>({content:JSON.stringify(draft)}));
  const {send,wa}=await bot(new ModelRouter({openai:{complete}}));
  expect(await send('bot buatkan makalah tentang belajar bersama','kelas@g.us',student)).toContain('Draf makalah');
  expect(wa.sent.at(-1)?.media?.data.includes('word/document.xml')).toBe(true);
  expect(await send('bot buatkan PPT dari makalah tersebut','kelas@g.us',other)).toContain('Belum ada draf');
  expect(await send('buatkan PPT dari makalah tersebut')).toContain('Belum ada draf');
  expect(await send('bot buatkan PPT dari makalah tersebut','kelas@g.us',student)).toContain('Draf presentasi');
  expect(wa.sent.at(-1)?.media?.data.includes('ppt/presentation.xml')).toBe(true);
  expect(complete).toHaveBeenCalledTimes(1);
});

it('melanjutkan kasus askep anak dan mengirim ulang draf yang ditolak WhatsApp',async()=>{
  const draft={title:'Askep Anak dengan Pneumonia',sections:[{heading:'Pendahuluan',body:'Contoh draf untuk diskusi kelas.'},{heading:'Pembahasan',body:'Tujuan materi pembelajaran.'}]};
  const complete=vi.fn(async()=>({content:JSON.stringify(draft)}));
  const {send,wa}=await bot(new ModelRouter({openai:{complete}}));
  expect(await send('coba buatkan makalah askep anak')).toContain('Kasus apa');
  expect(complete).not.toHaveBeenCalled();
  const deliver=wa.send.bind(wa);
  const failed=vi.spyOn(wa,'send').mockImplementation(msg=>msg.media?Promise.resolve({ok:false,error:'send_failed'}):deliver(msg));
  const reply=await send('pneumonia');
  expect(reply).toContain('Lampiran belum terkirim');
  expect(reply).toContain('Contoh draf untuk diskusi kelas');
  failed.mockRestore();
  expect(await send('.doc makalah terakhir',other)).toContain('Belum ada draf');
  expect(await send('.doc makalah terakhir')).toContain('Askep Anak dengan Pneumonia');
  expect(wa.sent.at(-1)?.media?.data.includes('word/document.xml')).toBe(true);
  expect(complete).toHaveBeenCalledTimes(1);
});

it('memilih jurnal yang telah ditampilkan, menggunakan kembali nomor tanpa pencarian baru',async()=>{
  const fun=new FunAndUtilityService();
  const items=['Satu','Dua'].map(title=>({title,authors:'Penulis uji',year:'2026',journalName:'Jurnal uji',doiOrUrl:'https://doi.org/10.1234/fixture',snippet:''}));
  const search=vi.spyOn(fun,'searchAcademicJournals').mockResolvedValue({query:'belajar',items,scholarUrl:'',scholarPdfUrl:'',garudaUrl:'',pubmedUrl:''});
  const {send}=await bot(new ModelRouter(),fun);
  await send('.jurnal belajar');
  expect(await send('kirim nomor dua')).toContain('Dua');
  expect(await send('kirim nomor dua',other)).toContain('Belum ada hasil');
  expect(search).toHaveBeenCalledTimes(1);
  const fetchPdf=vi.fn(async()=>new Response('<html>Login</html>',{headers:{'content-type':'application/pdf'}}));
  const result=await journalDelivery({...items[0]!,redistributable:true,pdfUrl:'https://europepmc.org/articles/PMC123?pdf=render'},5000,fetchPdf);
  expect(result.media).toBeUndefined();
});

it('menahan perintah model saat ambigu, obrolan, pemeriksaan keamanan atau operasi grup',async()=>{
  for(const intent of ['CHAT_ONLY','SECURITY_REVIEW','AMBIGUOUS_REQUEST','SYSTEM_OPERATION']) {
    const router=new ModelRouter({openai:{complete:async()=>({content:JSON.stringify({intent,importance:'REVIEW',command:'doc',args:'pdf judul|isi'})})}});
    const result=await inferIntent('mengenai hal yang tadi',router);
    expect(result.command).toBe('unknown');
    if(intent!=='CHAT_ONLY') expect(result.clarification).toBeTruthy();
  }
});

it('menggabungkan pemeriksaan jadwal dan tugas, menolak rangkaian yang menyisipkan mutasi',async()=>{
  const choice={intent:'DATA_QUERY',importance:'NORMAL',command:'besok',args:'',followups:[{command:'tugas',args:'hariini'}]};
  const router=new ModelRouter({openai:{complete:async()=>({content:JSON.stringify(choice)})}});
  const {send}=await bot(router);
  expect(await send('Aku perlu agenda esok serta pekerjaan hari ini')).toContain('────────');
  choice.followups=[{command:'tugas',args:'del TUG-1'}];
  expect(await send('Aku perlu agenda esok serta ubah tugas')).toContain('permintaan terpisah');
});
it('mengalihkan truth yang gagal ke AI satu kali dan mempertahankan jalur lokal saat sehat', async () => {
  const complete = vi.fn(async () => ({content:'Apa pengalaman kuliah yang paling berkesan?'}));
  const fun = new FunAndUtilityService();
  vi.spyOn(fun,'truthOrDare').mockImplementationOnce(() => { throw Error('fixture'); });
  const {send} = await bot(new ModelRouter({openai:{complete}}),fun);
  expect(await send('.truth')).toContain('Apa pengalaman kuliah');
  expect(await send('.truth')).not.toContain('Bantuan AI');
  expect(complete).toHaveBeenCalledTimes(1);
});

it('tetap mengirim bagian jadwal ketika pembacaan tugas berikutnya rusak',async()=>{
  const choice={intent:'DATA_QUERY',importance:'NORMAL',command:'besok',args:'',followups:[{command:'tugas',args:'hariini'}]};
  const complete=vi.fn(async()=>({content:JSON.stringify(choice)}));
  const fun=new FunAndUtilityService();
  vi.spyOn(fun,'visibleAssignments').mockImplementationOnce(()=>{throw Error('fixture');});
  const {send}=await bot(new ModelRouter({openai:{complete}}),fun);
  const result=await send('Aku perlu agenda esok serta pekerjaan hari ini');
  expect(result).toContain('Selasa');
  expect(result).toContain('ID pekerjaan');
  expect(result).toContain('────────');
});

it('mengusulkan alternatif yang benar-benar ada di menu tanpa mengulang mutasi catatan',async()=>{
  const complete=vi.fn(async()=>({content:'{"suggestion":1}'}));
  const fun=new FunAndUtilityService();
  const add=vi.spyOn(fun,'addNote').mockImplementation(()=>{throw Error('fixture');});
  const {send}=await bot(new ModelRouter({openai:{complete}}),fun);
  expect(await send('.note add latihan|bahan lokal')).toContain('Alternatif dari AI: .');
  expect(add).toHaveBeenCalledTimes(1);
  expect(complete).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(complete.mock.calls)).not.toContain('bahan lokal');
});

it('memulihkan matkul dari katalog saat lookup dosen rusak dan tetap menolak input kalkulator salah', async () => {
  const {send} = await bot();
  const broken = vi.spyOn(ScheduleService.prototype,'listLecturers').mockImplementationOnce(() => { throw Error('fixture'); });
  try {
    expect(await send('.matkul')).toContain('Mata kuliah dari katalog kelas');
    expect(await send('.calc abc')).toContain('Ekspresi');
    const calc = vi.spyOn(FunAndUtilityService.prototype,'evaluateMath').mockImplementationOnce(() => {throw Error('fixture');});
    try { expect(await send('.calc 2+7')).toContain('Hasil perhitungan: 9'); } finally { calc.mockRestore(); }
  } finally { broken.mockRestore(); }
});

it('mengembalikan bantuan lokal jika AI dan fitur hiburan gagal', async () => {
  const fun = new FunAndUtilityService();
  vi.spyOn(fun,'randomFact').mockImplementation(() => { throw Error('fixture_private_detail'); });
  const {send} = await bot(new ModelRouter(), fun);
  const answer = await send('.faktaunik');
  expect(answer).toContain('.help faktaunik');
  expect(answer).not.toContain('fixture_private_detail');
});

it('mengirim suara melalui OpenAI bila mesin lokal gagal dan menolak audio provider yang rusak',async()=>{
  const wav=Buffer.alloc(46);
  wav.write('RIFF');wav.writeUInt32LE(38,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);
  wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);
  wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(2,40);
  const speech=vi.spyOn(MediaService.prototype,'speakIndonesian').mockRejectedValue(Error('fixture'));
  const api=vi.spyOn(globalThis,'fetch').mockResolvedValueOnce(new Response(wav)).mockResolvedValueOnce(new Response('<html>error</html>'));
  try {
    const {send,wa}=await bot(undefined,undefined,{OPENAI_API_KEY:'key-sintetis'});
    expect(await send('.tts Halo kelas')).toContain('Suara sintetis dari OpenAI');
    expect(wa.sent.at(-1)?.media?.data.equals(wav)).toBe(true);
    expect(await send('.tts Uji kedua')).toContain('Sintesis suara belum tersedia');
    expect(wa.sent.at(-1)?.media).toBeUndefined();
    expect(api).toHaveBeenCalledTimes(2);
  }finally{speech.mockRestore();api.mockRestore();}
});

async function bot(router = new ModelRouter(), fun = new FunAndUtilityService(), options:Record<string,string> = {}) {
  const wa = new MockWhatsAppProvider();
  await wa.connect();
  const config = loadConfig({ OWNER_WHATSAPP: '6280000000000', ...options });
  const dispatcher = new CommandDispatcher({ config, whatsapp: wa, router, now, startedAt: now(), schedule: new ScheduleService(),
    auth: new AdminAuthenticator({ ownerE164: config.OWNER_WHATSAPP, adminAllowlistE164: [] }), confirmations: new ConfirmationManager(),
    outbound: new OutboundGate({ provider: wa, outboundEnabled: true, dryRun: false }), intelligence: new GroupIntelligenceService(), funService: fun });
  let id = 0;
  return { wa, send: (text: string, chat = student, sender = chat) => dispatcher.handleInbound({ providerMessageId: String(++id),
    chatJid: chat, senderJid: sender, chatType: chat.endsWith('@g.us') ? 'group' : 'private', text, receivedAt: now() }) };
}

it('membatasi .note dan pengingat lokal untuk baca, hapus dan tunda, termasuk catatan lama', async () => {
  const fun = new FunAndUtilityService();
  const legacy = fun.addNote('Catatan lama', 'Khusus pembuat', student);
  delete legacy.sourceChat; // bentuk record tersimpan sebelum upgrade
  const { send } = await bot(undefined, fun);
  expect(await send('.note list', '6281234500000@s.whatsapp.net')).toContain('Catatan lama');
  expect(await send('.note list','kelas@g.us',student)).not.toContain('Catatan lama');
  await send('.note add Catatan kelompok|Ulas bab dua','kelas@g.us',student);
  expect(await send('.note list','kelas@g.us',other)).toContain('Ulas bab dua');
  expect(await send('.note del NOTE-2',other)).toContain('tidak ditemukan');
  expect(await send('.note del NOTE-2','kelas@g.us',other)).toContain('tidak ditemukan');
  expect(await send('.note list','lain@g.us',student)).not.toContain('Ulas bab dua');
  expect(await send('.note list','kelas@g.us',student)).toContain('Ulas bab dua');
  await send('.reminder add 2026-11-12 07:30|Bawa buku');
  expect(await send('.reminder list', other)).not.toContain('Bawa buku');
  expect(await send('.reminder snooze REM-1 30', other)).toContain('tidak ditemukan');
  expect(await send('.reminder del REM-1', other)).toContain('tidak ditemukan');
  expect(await send('.reminder list')).toContain('Bawa buku');
  expect(fun.listReminders()[0]?.snoozedMinutes).toBeUndefined();
});

it('menampilkan perubahan tanggal WIB akibat snooze pada .reminder dan fungsi AI', async () => {
  const fun = new FunAndUtilityService();
  const { send } = await bot(undefined, fun);
  expect(await send('.reminder add 2026-11-31 23:50|Waktu tidak valid')).toContain('Format');
  await send('.reminder add 2026-11-14 23:50|Persiapan praktikum');
  await send('.reminder snooze REM-1 20');
  const expected = new Date('2026-11-15T00:10:00+07:00').toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  expect(await send('.reminder list')).toContain(expected + ' WIB');
  const tools = existingFeatureTools({ fun, calendar: new AcademicCalendarService(), now, chat: student, sender: student,
    owner: () => false, access: () => ({ admin: false, drive: false, schedule: false }) });
  expect(await tools.find(t => t.definition.name === 'chat_reminders')!.run('{}')).toEqual([
    { id: 'REM-1', title: 'Persiapan praktikum', whenWib: expected },
  ]);
});

it('mengirim lampiran PDF lewat .ask', async () => {
  const { send, wa } = await bot();
  await send('.ask Buatkan PDF berjudul Laporan praktik dengan isi Hasil diskusi kelas');
  expect(wa.sent.at(-1)?.media?.mimeType).toBe('application/pdf');
  expect((await PDFDocument.load(wa.sent.at(-1)!.media!.data)).getPageCount()).toBeGreaterThan(0);
});

it('mengirim QR melalui mention di grup', async () => {
  const { send, wa } = await bot();
  await send('HdyBot buatkan QR untuk Kelas A','kelas@g.us',student);
  expect(wa.sent.at(-1)?.media?.data.subarray(1,4).toString()).toBe('PNG');
});

it('mengirim kartu jadwal melalui pesan pribadi', async () => {
  const { send, wa } = await bot();
  await send('Buatkan kartu jadwal Senin');
  expect(wa.sent.at(-1)?.media?.mimeType).toBe('image/png');
  expect(wa.sent.at(-1)?.chatJid).toBe(student);
});

it('menggabungkan angka, kalender, tugas yang disetujui, catatan dan petunjuk menu sesuai akses', async () => {
  const fun = new FunAndUtilityService(), calendar = new AcademicCalendarService();
  const chat = 'kelas@g.us';
  const create = (title: string, sourceChat: string) => fun.addAssignment({ title, sourceChat, course: 'A', dueDateIso: '2026-11-09', createdBy: student, now: now() });
  const visible = create('Presentasi lansia',student);
  create('Belum disetujui',chat);
  const notice = fun.activeNotices().find(n => n.taskId === visible.id)!;
  fun.saveNotice({ ...notice, target: chat, share: 'sent' });
  fun.addNote('Referensi', 'Isi privat', student, chat);
  fun.addNote('Grup lain', 'Catatan lain', other, other);
  calendar.addEvent({ title: 'Ujian', dateIso: '2026-11-10', category: 'UTS', source: 'uji', verification: 'VERIFIED' });
  let admin = false;
  const tools = existingFeatureTools({ fun, calendar, now, chat, sender: student, owner: () => false,
    access: () => ({ admin, drive: false, schedule: false }) });
  const run = (name: string, args: object) => tools.find(t => t.definition.name === name)!.run(JSON.stringify(args));
  const filter = { status: 'hariini', search: '', page: 1 };
  expect(run('assignment_list',filter)).toMatchObject({ total: 1, items: [{title: 'Presentasi lansia'}] });
  expect(() => run('assignment_list',{...filter, chat: other})).toThrow();
  expect(run('chat_notes',{search:'',page:1})).toMatchObject({total:1,items:[{title:'Referensi'}]});
  expect(JSON.stringify(run('chat_notes',{search:'',page:1}))).not.toContain('Isi privat');
  expect(run('days_until',{date:'2026-11-10'})).toMatchObject({days:1});
  expect(() => run('days_until',{date:'2026-02-30'})).toThrow();
  expect(run('academic_calendar',{page:1})).toMatchObject({items:[{title:'Ujian',verification:'VERIFIED'}]});
  expect(run('math_calculator',{expression:'2^3+4'})).toEqual({ok:true,result:12});
  expect(run('unit_conversion',{value:2,from:'km',to:'m'})).toMatchObject({result:expect.stringContaining('2000')});
  expect(run('game_progress',{item:'skor'})).toEqual({xp:0});
  expect(run('game_progress',{item:'petunjuk'})).toMatchObject({hint:expect.stringContaining('Belum ada')});
  expect(run('command_guide',{search:'.logs',page:1})).toMatchObject({total:0});
  admin = true;
  expect(run('command_guide',{search:'.logs',page:1})).toMatchObject({items:[{usage:'.logs [jumlah]'}]});
  expect(run('command_guide',{search:'tanyadokumen',page:1})).toMatchObject({total:0});
  expect(run('command_guide',{search:'hitung',page:1})).toMatchObject({items:expect.arrayContaining([{category:expect.any(String),usage:'.calc <rumus>'}])});
});

it('memakai hasil fungsi lewat .ask, menunggu hasil asinkron dan menyaring rahasia sebelum dikirim ke provider', async () => {
  const fun = new FunAndUtilityService();
  fun.addReminder('2026-11-12 09:00', 'Baca buku, sandi-uji', student);
  fun.addReminder('2026-11-12 11:00', 'Privat akun lain', other);
  const exchange = vi.fn<typeof fetch>(async (_, init) => {
    const {input, tools} = JSON.parse(String(init?.body));
    expect(tools.some((t: { name: string }) => t.name === 'chat_reminders')).toBe(true);
    const last = input.at(-1);
    if (last.type !== 'function_call_output') return Response.json({status:'completed',output:[
      {type:'function_call',name:'chat_reminders',call_id:'read_1',arguments:'{}'}]});
    expect(last.output).not.toMatch(/sandi-uji|Privat akun lain/);
    const result = JSON.parse(last.output);
    expect(result.data).toHaveLength(1);
    return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:result.data[0].title}]}]});
  });
  const { send } = await bot(new ModelRouter({ openai: new LunaTransport('uji', exchange, {secrets:['sandi-uji']}) }), fun);
  expect(await send('.ask Apa yang perlu kubawa?')).toContain('Baca buku, [rahasia disamarkan]');
  expect(exchange).toHaveBeenCalledTimes(2);
});

it('membaca pengingat worker memakai filter chat yang sama tanpa mengimpor atau mengubah job', async () => {
  const findMany = vi.fn().mockResolvedValue([{ id:'REM-1', text:'Praktikum', fireAt:now() }]);
  const db = { reminder:{findMany} } as unknown as PrismaClient;
  const worker = new ReminderWorker(db, new OutboundGate({provider:new MockWhatsAppProvider(),outboundEnabled:false,dryRun:true}),
    () => { throw Error('Pembacaan AI tidak boleh memulai impor'); });
  const tools = existingFeatureTools({ fun:new FunAndUtilityService(), calendar:new AcademicCalendarService(), worker, chat:student,
    now, sender:student, owner:()=>false, access:()=>({admin:false,drive:false,schedule:false}) });
  expect(await tools.find(t=>t.definition.name==='chat_reminders')!.run('{}')).toMatchObject([{ title:'Praktikum' }]);
  expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where:{targetJid:student,status:'scheduled'}, take:30 }));
});

it('memahami daftar catatan dan pengingat tanpa izin untuk menghapus melalui keputusan AI', async () => {
  expect(directIntent('bot lihat catatan saya')?.command).toBe('notes');
  expect(directIntent('tampilkan pengingat grup ini')?.command).toBe('reminders');
  const decide = (args:string) => inferIntent('tolong bantu ingat isi obrolan', new ModelRouter({
    transport:{complete:async()=>({content:JSON.stringify({command:'note',args})})},
  }));
  expect((await decide('list')).command).toBe('notes');
  expect((await decide('del NOTE-1')).command).not.toBe('notes');
});

it('menghentikan giliran tool asinkron saat batas waktu provider habis', async () => {
  const ctrl = new AbortController();
  let started!: () => void;
  const reading = new Promise<void>(resolve => { started = resolve; });
  let finish!: (text: string) => void;
  const read = new Promise<string>(resolve => { finish = resolve; });
  const fetcher = vi.fn<typeof fetch>(async () => Response.json({status:'completed',output:[
    {type:'function_call',name:'read',call_id:'late_call',arguments:'{}'}]}));
  const result = new LunaTransport('uji',fetcher).complete({ model:'gpt-6-luna', messages:[{role:'user',content:'Baca pengingat'}],
    max_tokens:100,temperature:0,top_p:1 }, ctrl.signal, { tools:[{
      definition:{name:'read',description:'Pembacaan uji',type:'function',strict:true,parameters:{}},
      run() { started(); return read; },
    }] });
  await reading;
  ctrl.abort();
  await expect(result).rejects.toMatchObject({name:'AbortError'});
  finish('Hasil terlambat');
  expect(fetcher).toHaveBeenCalledTimes(1);
});
