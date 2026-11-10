// Jalankan dari root proyek setelah npm run build. Seluruh pengiriman menuju provider mock.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { mock } from 'node:test';
import { parseCommand, commandRegistry } from '../dist/admin/commands/parser.js';
import { menuPage } from '../dist/admin/commands/menu.js';
import { CommandDispatcher } from '../dist/admin/commands/dispatcher.js';
import { AdminAuthenticator } from '../dist/admin/authentication/authenticator.js';
import { ConfirmationManager } from '../dist/admin/authorization/confirmation.js';
import { GroupIntelligenceService } from '../dist/ai/classification/group-intelligence.js';
import { ModelRouter } from '../dist/ai/model-router/router.js';
import { loadConfig } from '../dist/config/env.js';
import { ScheduleDatabase } from '../dist/modules/schedule/database.js';
import { ScheduleService } from '../dist/modules/schedule/service.js';
import { MediaService } from '../dist/modules/media/media-service.js';
import { DriveCatalog } from '../dist/modules/materials/drive.js';
import { MockWhatsAppProvider } from '../dist/whatsapp/adapters/mock.js';
import { OutboundGate } from '../dist/whatsapp/outbound/gate.js';
import { FunAndUtilityService } from '../dist/modules/fun/fun-utility-service.js';

const now = new Date('2026-11-09T00:30:00Z');
mock.timers.enable({apis:['Date'],now:+now});
let random = 123;
Math.random = () => (random = (random * 16807) % 2147483647) / 2147483647;
const owner = '6280000000000@s.whatsapp.net';
const group = 'kelas-uji@g.us';
const source = 'sumber-uji@g.us';
const schedule = new ScheduleService();
const seed = JSON.parse(await readFile('data/class-5a.seed.json','utf8'));
const exampleClass = { id:'class-demo',courses:seed.courses.map(c=>({id:c.code,code:c.code,normalizedName:c.name})),schedules:[{id:'slot-demo',weekday:'SUNDAY',startTime:'07:00',endTime:'08:00',courseId:seed.courses[0].code,room:'Lab',exceptions:[]}] };
const media = new MediaService();
const png = await media.generateQrCodePng('Contoh');
const sticker = await media.imageToSticker(png);
const docText = 'Catatan metode belajar kelas.';
const exampleArticle = '<main><h1>Artikel contoh</h1><article class="entry-content"><h2>Materi belajar</h2><p>Isi artikel simulasi untuk memeriksa format balasan.</p><h3><a href="https://perawat.org/artikel-contoh/">Artikel contoh</a></h3><li><a href="https://perawat.org/wp-content/uploads/contoh.pdf">Berkas contoh</a></li></article></main>';
globalThis.fetch = async (url) => {
  const u = String(url);
  if (u.startsWith('https://perawat.org/')) return new Response(exampleArticle);
  if (u.includes('geocoding-api.open-meteo.com')) return Response.json({results:[{name:'Jakarta',latitude:-6.2,longitude:106.8}]});
  if (u.includes('api.open-meteo.com')) return Response.json({ current_weather:{temperature:28,windspeed:8,weathercode:1},current:{temperature_2m:28,relative_humidity_2m:70} });
  if (u.startsWith('https://api.aladhan.com/')) return Response.json({data:{timings:{Fajr:'04:11',Dhuhr:'11:42',Asr:'15:00',Maghrib:'17:53',Isha:'19:03'},meta:{timezone:'Asia/Jakarta'}}});
  if (u.includes('wikipedia.org')) return Response.json({title:'Belajar',extract:'Contoh ringkasan untuk pengujian.'});
  return new Response(null,{status:503});
};
const config = loadConfig({ OWNER_WHATSAPP:'6280000000000', GOOGLE_DRIVE_ALLOWED_CHATS:owner, WHATSAPP_PRIMARY_GROUP_JID:group });
const drive = new DriveCatalog('ROOT',async()=>'test',async input=>{
  const url = new URL(String(input));
  if (url.pathname.endsWith('/ROOT')) return Response.json({mimeType:'application/vnd.google-apps.folder'});
  if (url.searchParams.has('alt')) return new Response(docText);
  return Response.json({files:[{id:'M1',name:'Metode belajar.txt',mimeType:'text/plain',modifiedTime:'2026-11-08T00:00:00Z',capabilities:{canDownload:true}}]});
});
await drive.sync();
const router = () => new ModelRouter({transport:{complete:async()=>({content:'Contoh respons NVIDIA untuk pengujian format.'})}});
let seq = 0;
const example = (names, args='', note='') => ({ names:names.split('/'), args, note });
const groups = [];
function section(title, rows) { groups.push({title,rows}); }
function reg(id, args='', note='') {
  const names = commandRegistry.filter(x=>x.command===id).flatMap(x=>x.names);
  assert.ok(names.length,id);
  return { names,args,note };
}
section('Kelas, profil, dan jadwal',[
  example('kelas/semester/tahunajaran'),reg('class.members','Contoh'),example('pengurus/ketuakelas/komting/wakilkomting/sekretaris/bendahara/wali/pjmk'),reg('class.rules'),reg('class.faq'),reg('user.profile'),reg('courses'),reg('lecturers','Contoh'),reg('groupid'),
  example('jadwal/schedule'),example('jadwal hariini'),example('jadwal senin','', 'Gunakan nama hari untuk tanggal terdekat. Bentuk .jadwal minggu menunjukkan pekan berjalan.'),reg('schedule.tomorrow'),example('jadwal besok'),reg('schedule.week'),example('jadwal minggu/jadwal mingguini'),reg('schedule.next'),reg('schedule.check_date','2026-11-10'),reg('schedule.today_courses'),reg('schedule.today_lecturers'),reg('schedule.today_rooms'),
  example('jadwal export','csv'),example('jadwal export','json'),
  example('tambahjadwal/jadwal add/jadwal tambah','minggu|07:00|08:00|METPEN|Lab'),example('editjadwal/jadwal edit/jadwal ubah','minggu|07:00|minggu|08:00|09:00|METPEN|Lab'),example('hapusjadwal/jadwal delete/jadwal hapus','minggu|07:00'),example('resetjadwal/jadwal reset'),
  reg('groupgen','2 Ani,Budi,Citra,Deni'),reg('calendar'),reg('countdown','2026-11-16'),
]);
section('Tugas, catatan, dan pengingat',[
  reg('tasks'),example('tugas list'),example('tugas all/tugas semua'),example('tugas aktif'),example('tugas hariini'),example('tugas mingguini'),example('tugas detail','TUG-1'),example('tugas add/tugas tambah','Metodologi|Makalah|2026-11-16 14:00|Kelompok 1|Ibu Sari|Ani'),example('tambahtugas','Metodologi|Makalah|2026-11-16 14:00|Kelompok 1|Ibu Sari|Ani'),example('tugas done/tugas selesai','TUG-1'),example('selesaitugas','TUG-1'),example('tugasaktif'),example('tugas antrean'),example('tugas grup'),example('tugas tujuan','TUG-1.1.h3 kelas-uji@g.us'),example('tugas tolak','TUG-1.1.h3'),example('tugas ulang','TUG-1.1.h3'),example('tugas deadline','TUG-1 2026-11-16 14:00'),example('tugas del/tugas delete/tugas hapus','TUG-1'),
  example('reminder/reminders'),example('reminder settings'),example('reminder add/reminder tambah','2026-11-10 08:00|Diskusi'),example('reminder add','2026-11-16 14:00|Deadline pendaftaran seminar'),example('reminder snooze','REM-1 15'),example('reminder delete/reminder del/reminder hapus','REM-1'),example('reminder pause'),example('reminder resume'),
  reg('announce'),example('announce draft/announce create','penting|Diskusi|Bawa catatan'),reg('notes'),example('note add/note tambah','Rapat|Bawa catatan'),example('note del/note delete/note hapus','NOTE-1'),
]);
section('Materi, Drive, jurnal, dan AI',[
  reg('materials'),reg('materials.search','belajar'),example('materi cari','belajar'),example('materi detail','M1'),example('materi terbaru'),example('materi minggu1'),example('materi halaman','1'),
  example('drive status/drive errors'),example('drive sync'),example('drive files'),example('drive search','belajar'),reg('download','M1'),reg('document.summary','M1'),reg('document.ask','M1 Apa metode belajar?'),
  reg('journal.search','belajar'),reg('ask','Bagaimana cara belajar?'),example('ask materi','M1 Apa metode belajar?'),reg('rewrite','besok bawa buku'),reg('ai.summarize','Belajar bersama. Catat hasil diskusi.'),reg('ai.flashcard','belajar'),reg('ai.quiz','belajar'),reg('ai.translate','en Terima kasih'),
]);
section('LMS STIKES Husada Jombang',[reg('lms','help')]);
section('Keperawatan dan Perawat.org',[
  ...['keperawatan','sdki nyeri akut','sop pasang infus','askep stroke','pengkajian anak','penunjang','ukom','kampus','kuisukom','highalert','safety','berita','ppni','mtb','ebook','imt 65 170','gcs E4 V5 M6','balance 1800 1500','tetesan 500 ml 6 jam 20','kalkulatorperawat'].map(s=>{
    const [head,...args]=s.split(' ');
    const aliases = {kuisukom:'kuisukom/kuis ukom',highalert:'highalert/high alert',safety:'safety/patient safety',mtb:'mtb/bias',ebook:'ebook/download',kalkulatorperawat:'kalkulatorperawat/kalkulator'};
    return example(aliases[head]??head,args.join(' '));
  }),
]);
section('Media, musik, dan dokumen',[
  reg('doc.permission','Ani|Metodologi|2026-11-10|Kegiatan kampus'),example('doc create/doc permission','Ani|Metodologi|2026-11-10|Kegiatan kampus'),reg('doc.minutes','Diskusi|2026-11-09|Cek jadwal'),example('doc minutes','Diskusi|2026-11-09|Cek jadwal'),example('doc pdf/pdf','Agenda|Belajar bersama'),
  reg('media.sticker','','Dengan gambar.'),reg('media.ttp','Kelas A'),reg('media.toimg','','Dengan stiker WebP.'),...['blur','invert','grayscale/hitamputih','flip','flop','resize','compress'].map(n=>example(n,n==='resize'?'128 128':'','Dengan gambar.')),
  reg('media.quotemaker','Tetap belajar|Kelas A'),example('kartujadwal','senin'),example('kartuucapan','Semangat'),reg('media.imagesearch','kelas'),reg('media.qr','Halo kelas'),reg('media.ocr','','Perlu gambar dan Tesseract pada server.'),reg('media.tts','Halo kelas','Memerlukan espeak-ng dengan suara Indonesia.'),reg('music','fals','Hasil API memerlukan kredensial SoundCloud. MP3 hanya berasal dari koleksi lokal berizin.'),
]);
section('Utilitas dan hiburan',[
  reg('util.gpa','4:4.0, 2:3.5'),reg('util.bmi','65 170'),reg('util.calc','(2+3)*4'),reg('util.convert','5 km m'),reg('util.clock'),reg('util.weather','Jakarta'),reg('util.wiki','belajar'),reg('util.urlcheck','https://perawat.org'),
  reg('fun.pantun','nasehat'),example('quotes/quoterandom/katabijak','lucu'),example('quotesislami'),example('quotesmotivasi/quotesnasehat'),
  ...['motivasi','katahariini','tebak-tebakan','roasting','gombal','rayuan','cerpen','cerita'].map(n=>example(n,'tema belajar')),
  reg('fun.fact'),reg('fun.doa'),reg('fun.surah'),reg('fun.sholat','Jakarta'),reg('fun.truth'),reg('fun.dare'),reg('fun.dice'),reg('fun.coin'),reg('fun.suit','batu'),
  ...['apakah','kapankah','bisakah','kerangajaib','rate'].map(n=>example(n,'belajar bersama')),
  ...['hilih','alay','besarkecil','balikhuruf','namaninja'].map(n=>example(n,'Ani')),reg('fun.afk','belajar'),reg('fun.unafk'),
]);
section('Permainan, XP, dan statistik',[
  reg('game'),example('game list'),...['buat 2','gabung','keluar','mulai antonim','stop','level easy','kategori antonim','waktu 45','riwayat','acak easy'].map(args=>example('game',args)),
  ...['sinonim','antonim','anagram','tebakemoji','deretangka','asahotak','tebakpola','tebakkata','caklontong','family100','mathquiz'].map(n=>example(n)),example('game komputer','medium'),example('game matematika','hard'),
  reg('game.hint'),reg('game.daily'),reg('game.score'),reg('fun.quiz_answer','abstrak'),reg('fun.quiz_giveup'),reg('gamification.leaderboard'),example('privacy/ privacy gamification'.replace('/ ','/'),'on'),example('privacy gamification','off'),reg('analytics.stats','week'),
]);
section('Grup, persetujuan, dan operasional',[
  reg('auth.login','','Password disembunyikan.'),reg('auth.logout'),reg('owner'),reg('about'),reg('info'),reg('menu'),reg('help','calc'),
  reg('status'),reg('system'),reg('dashboard'),reg('health'),reg('ping'),reg('runtime'),reg('logs','10'),reg('errors','today'),reg('audit'),reg('backup','status'),reg('storage'),reg('pair','','Adapter mendukung bootstrap sekali pakai. Startup produksi saat ini tidak menerbitkan bootstrap, sehingga perintah mengembalikan penolakan.'),
  example('db status'),example('whatsapp status'),example('scheduler status/workers/queue'),example('ai/ai status'),example('ai models'),example('ai model/ai pin','lightning'),example('ai auto','on'),example('ai unpin'),example('ai test','Halo'),
  example('groups/group/source/target'),example('groups sources/groups list'),example('groups add/groups set','sumber-uji@g.us Kelas'),example('groups pause/groups remove','sumber-uji@g.us'),example('groups resume','sumber-uji@g.us'),
  example('nimbrung/nongkrong','on'),example('nimbrung status'),example('diam/hening/berhentinimbrung/nimbrung off'),reg('group.setpjmk',source),reg('group.setkelasa',group),reg('group.classify','Perubahan jadwal besok'),
  example('filter status/monitor status'),example('filter review'),example('filter pause/filter off',source),example('filter resume/filter on',source),
  example('digest','today'),reg('priority'),reg('pending'),reg('approve','REV-1'),reg('reject','REV-1'),reg('send','REV-1'),example('broadcast preview','REV-1'),example('broadcast send','REV-1'),
  reg('confirm','NONCE'),reg('cancel','NONCE'),reg('relay','list'),...['lihat','kirim','tolak'].map(s=>example('relay',s+' abc123')),
  example('admin pause/admin on'),example('admin resume/admin off'),example('admin menu'),example('admin status'),example('admin overview'),example('admin review'),example('admin approve','REV-1'),example('admin reject','REV-1'),example('admin audit'),example('admin backup'),example('admin/maintenance'),
]);

// Alias induk menerima subperintah yang sama.
function expand(row) {
  const equivalents = { jadwal:['schedule'], doc:['pdf'], groups:['group','source','target'], admin:['maintenance'], filter:['monitor'], reminder:['reminders'],
    tugas:['tasks','deadline','mytask','progress'], note:['catatan'], announce:['pengumuman'], nimbrung:['nongkrong'] };
  const names = new Set(row.names);
  for (const name of row.names) {
    const [head,...rest] = name.split(' ');
    if (rest.length || row.args) for (const prefix of equivalents[head] ?? []) names.add([prefix,...rest].join(' '));
  }
  return [...names];
}

const pngMedia = {kind:'image',mimeType:'image/png',sizeBytes:png.length,data:png};
async function run(name,row) {
  const wa = new MockWhatsAppProvider(); await wa.connect();
  const fun = new FunAndUtilityService();
  const intel = new GroupIntelligenceService({primaryGroupJid:group});
  intel.registerSourceGroup(source,'Grup uji','official',false);
  intel.ingest({providerMessageId:'fixture',chatType:'group',chatJid:source,senderJid:owner,text:'Perubahan jadwal diskusi besok.',receivedAt:now});
  fun.addAssignment({course:'Metodologi',title:'Diskusi',dueDateIso:'2026-11-09',dueTime:'14:00',lecturer:'Ibu Sari',pic:'Ani',createdBy:owner});
  fun.addNote('Diskusi','Bawa buku',owner);
  fun.addReminder('2026-11-10 08:00','Diskusi',owner);
  const confirmations = new ConfirmationManager({now:()=>now});
  const command = '.' + name + (row.args ? ' '+row.args.replaceAll('METPEN', seed.courses[0].code) : '');
  const parsed = parseCommand(command);
  assert.notEqual(parsed.command,'unknown',command);
  let actual = command;
  if (['confirm','cancel'].includes(parsed.command)) {
    const item = confirmations.issue(owner,'send_announcement','Diskusi',{reviewId:'REV-1',targetGroupJid:group,text:'Diskusi'});
    actual = '.' + name + ' ' + item.nonce;
  }
  if (['send','broadcast.send','confirm'].includes(parsed.command)) intel.approve('REV-1',owner);
  if (parsed.command==='relay') {
    intel.registerPjmkGroup(source);
    fun.saveRelay({id:'abc123',source,target:group,text:'Diskusi kelas besok.',status:'pending'});
  }
  if (['game.hint','fun.quiz_answer','fun.quiz_giveup'].includes(parsed.command)) fun.startBankQuiz(owner,'antonim','easy');
  if (parsed.command==='game' && /^(gabung|keluar|stop|level|kategori|waktu)/.test(row.args)) fun.gameRoom(owner,owner,['buat','2'],true);
  if (parsed.command==='fun.unafk') fun.setAfk(owner,'belajar');
  const cls = { ...exampleClass, schedules:parsed.command==='schedule.add'?[]:exampleClass.schedules };
  const scheduleDatabase = new ScheduleDatabase({class:{findUniqueOrThrow:async()=>cls}},config.CLASS_NAME,seed);
  if (parsed.command==='gamification.leaderboard') fun.saveScores({[owner]:25});
  const dispatcher = new CommandDispatcher({config,scheduleDatabase,whatsapp:wa,outbound:new OutboundGate({provider:wa,outboundEnabled:true,dryRun:false}),
    auth:new AdminAuthenticator({ownerE164:config.OWNER_WHATSAPP,adminAllowlistE164:[]}), confirmations,router:router(),schedule,intelligence:intel,funService:fun,drive,mediaService:media,
    dbProbe:async()=>{},startedAt:now,now:()=>now});
  const msg = {providerMessageId:String(++seq),chatType:'private',chatJid:owner,senderJid:owner,receivedAt:now,text:actual};
  if (['media.effect','media.sticker'].includes(parsed.command)) msg.media=pngMedia;
  if (parsed.command==='media.toimg') msg.media={...pngMedia,kind:'sticker',mimeType:'image/webp',sizeBytes:sticker.length,data:sticker};
  await dispatcher.handleInbound(msg);
  const sent = wa.sent.filter(m=>m.chatJid===owner).at(-1);
  assert.ok(sent?.text, 'Tidak ada balasan: '+command);
  assert.doesNotMatch(sent.text,/Perintah belum dikenali|TypeError:|ReferenceError:/,command);
  const attachment = sent.media ? '\n[Lampiran ' + sent.media.mimeType + (sent.media.filename ? ' · '+sent.media.filename : '') + ']' : '';
  if (sent.media) assert.ok(sent.media.data.length>0,command);
  return { key:parsed.command, output:sent.text+attachment, admin:parsed.adminOnly };
}

const descriptions = {
  'Kelas, profil, dan jadwal':'Cari anggota dan dosen, lihat jadwal mingguan atau per tanggal, serta ekspor jadwal. Admin dapat mengubah slot lewat DM. Pratinjau terikat pada versi jadwal; konfirmasi membuat backup dan audit dalam transaksi PostgreSQL yang sama.',
  'Tugas, catatan, dan pengingat':'Tambah dan selesaikan tugas berdasarkan ID. Filter hari dan minggu mengikuti WIB. Notifikasi tenggat baru dan pengingat harian H−3 sampai hari H masuk ke DM Hedy. Hedy memilih grup lalu mengonfirmasi teks sebelum pengiriman. Pengingat disimpan per chat oleh worker PostgreSQL pada produksi. Contoh lokal memakai pengingat JSON untuk kompatibilitas.',
  'Materi, Drive, jurnal, dan AI':'Telusuri folder kelas, ambil file, atau tanyakan isi dokumen dengan rujukan. Pengiriman dokumen dibatasi ke chat yang disetujui owner. Perintah AI umum, ringkasan, kuis, kartu belajar, dan terjemahan juga tersedia.',
  'Keperawatan dan Perawat.org':'Pencarian kategori mengembalikan artikel dan tautan sumber. Kalkulator menghitung langsung dari nilai dan satuan yang diberikan. Contoh artikel, cuaca, dan jawaban AI dalam katalog menggunakan data uji.',
  'Media, musik, dan dokumen':'Balas gambar/stiker untuk konversi. Dokumen izin dan notulensi berupa draf teks; perintah PDF, QR, kartu ucapan dan kartu jadwal mengirim lampiran. TTS memerlukan espeak-ng. SoundCloud menyediakan tautan; koleksi MP3 lokal berizin dapat dikirim sebagai dokumen.',
  'Utilitas dan hiburan':'Hitung IPK, BMI, ekspresi matematika, dan konversi satuan; cari cuaca, artikel, atau waktu salat. Kurs bawaan menggunakan angka referensi statis. URL check memeriksa format dan tujuan alamat. Alias shortlink tidak membuat tautan pendek.',
  'Permainan, XP, dan statistik':'Setiap chat memiliki sesi sendiri. Buat ruang untuk memilih peserta, level dan batas waktu. Jawaban benar menghasilkan XP bagi peserta yang mengaktifkan gamifikasi. Riwayat, skor, status AFK dan mode grup disimpan dalam state lokal.',
  'Grup, persetujuan, dan operasional':'Pantau koneksi, AI, database, worker dan log melalui DM admin. Mode grup memerlukan owner atau admin grup. Persetujuan dan pengiriman relay lintas grup hanya dapat dijalankan oleh owner lewat DM.',
};
const covered = new Set(), heads = new Set();
const buffer = ['## Katalog perintah dan contoh balasan','',
  'Klik kategori untuk membuka transkrip. Setiap baris menampilkan contoh ketikan, alias, akses, dan balasan dari dispatcher melalui WhatsApp mock. Baris lampiran menunjukkan jenis file yang dihasilkan. Alias sebaris memakai contoh dari ejaan pertama.',
  '', 'Contoh memakai Senin, 9 November 2026 pukul 07.30 WIB. Identitas, nonce, dan beberapa nilai yang berubah disamarkan. Respons NVIDIA, HTTP, serta dokumen Drive berasal dari fixture. Pratinjau jadwal memakai kelas uji tanpa menulis database. Program OS seperti OCR/TTS memerlukan instalasi di host. Balasan konfigurasi menunjukkan prasyarat. Pengujian PostgreSQL terisolasi tersedia melalui scripts/check-schedule-db.mjs.',
  '', 'Percakapan grup juga mengenali mention, nama bot, dan kutipan. Misalnya, “HdyBot, jadwal besok?” menjalankan rute jadwal. Pertanyaan bebas mendapat jawaban percakapan yang mengutip pengirim. Grup sumber mengirim pratinjau ke DM owner. Kutip pratinjau dan balas **ya** untuk mengirim teks yang disetujui atau **tidak** untuk menolak.', ''];
for (const {title,rows} of groups) {
  buffer.push('<details>', '<summary><strong>'+title+'</strong></summary>','',descriptions[title],'');
  for (const row of rows) {
    const names = expand(row);
    let first;
    for (const name of names) {
      heads.add(name.split(' ')[0]);
      const result = await run(name,row);
      covered.add(result.key);
      first ??= result;
      assert.equal(result.key,first.key,'Alias berbeda handler: '+name);
    }
    const sample = '.' + names[0] + (row.args ? ' '+row.args.replaceAll('METPEN',seed.courses[0].code) : '');
    const access = first.admin ? 'DM admin terverifikasi' : first.key === 'group.nimbrung' ? 'Owner atau admin grup' : 'Pengguna';
    buffer.push('**'+sample.replaceAll('*','\\*')+'**', '', access + (names.length>1 ? ' · Alias: '+names.slice(1).map(n=>'`.'+n+'`').join(', ') : '') + (row.note ? ' · '+row.note : ''), '');
    let answer = first.output.replace(/(Ruang tersedia: )[\d,.]+ GiB/g,'$1<ruang disk> GiB').replace(/(RAM (?:proses|proses saat ini): )[\d,.]+ MiB/g,'$1<RAM> MiB').replaceAll(owner,'<JID pengguna>').replaceAll(config.OWNER_WHATSAPP,'<nomor owner>').replace(/\b[0-9A-F]{8}\b/g,'<nonce>').replace(/\b(?:08|628)\d{7,13}\b/g,'<nomor privat>');
    buffer.push('~~~~text',answer.split('\n').map(line=>line.trimEnd()).join('\n').trimEnd(),'~~~~','');
  }
  buffer.push('</details>','');
}
buffer.push('<details>', '<summary><strong>Percakapan grup dan pratinjau relay</strong></summary>', '');
const groupWa = new MockWhatsAppProvider(); await groupWa.connect();
const intel = new GroupIntelligenceService({primaryGroupJid:group}); intel.registerPjmkGroup(source,'PJMK contoh');
const groupBot = new CommandDispatcher({config,whatsapp:groupWa,outbound:new OutboundGate({provider:groupWa,outboundEnabled:true,dryRun:false}),auth:new AdminAuthenticator({ownerE164:config.OWNER_WHATSAPP,adminAllowlistE164:[]}),confirmations:new ConfirmationManager(),router:router(),schedule,intelligence:intel,startedAt:now,now:()=>new Date()});
for (const [input,chat,mentioned] of [['HdyBot, jadwal besok?',group,true],['HdyBot, bantu aku belajar',group,true],['Perubahan jadwal praktikum besok pukul 10.00 WIB.',source,false]]) {
  const before = groupWa.sent.length;
  const msg={chatJid:chat,senderJid:'628111111111@s.whatsapp.net',chatType:'group',isBotMentioned:mentioned,receivedAt:now,text:input,providerMessageId:'demo-'+(++seq)};
  // Contoh independen: jeda waktu virtual agar cooldown grup tidak memblokir pertanyaan berikut.
  mock.timers.tick(10_000);
  await groupBot.handleInbound(msg);
  const sent = groupWa.sent.slice(before).at(-1);
  assert.ok(sent,input);
  if (chat===source) assert.equal(sent.chatJid,owner); else assert.equal(sent.quotedMessageId,msg.providerMessageId);
  buffer.push('**Pesan:** '+input,'',chat===source?'Jawaban di DM owner:':'Jawaban yang mengutip pengirim:', '', '~~~~text',sent.text.replaceAll('628111111111','<pengirim>'),'~~~~','');
}
buffer.push('</details>','');
buffer.push('<details>', '<summary><strong>Notifikasi H−3 sampai hari H, pemilihan grup, dan hasil konfirmasi</strong></summary>', '');
const alertWa = new MockWhatsAppProvider(); await alertWa.connect();
const alertConfig = loadConfig({OWNER_WHATSAPP:'6280000000000',WHATSAPP_PRIMARY_GROUP_JID:group,OUTBOUND_ENABLED:'true',DRY_RUN:'false'});
const alertBot = new CommandDispatcher({config:alertConfig,whatsapp:alertWa,outbound:new OutboundGate({provider:alertWa,outboundEnabled:true,dryRun:false}),auth:new AdminAuthenticator({ownerE164:alertConfig.OWNER_WHATSAPP,adminAllowlistE164:[]}),confirmations:new ConfirmationManager({now:()=>now}),router:router(),schedule,intelligence:new GroupIntelligenceService({primaryGroupJid:group}),startedAt:now,now:()=>now});
alertBot.fun.rememberGroup(group,'Praktikum');
const task=alertBot.fun.addAssignment({course:'Keperawatan Gerontik',title:'Makalah lansia',dueDateIso:'2026-11-12',dueTime:'07:30',lecturer:'Ibu Sari',pic:'Ani',createdBy:owner,now});
await alertBot.tickDeadlines();
assert.equal(alertWa.sent.at(-1).chatJid,owner);
buffer.push('**DM Hedy pada H−3**','','~~~~text',alertWa.sent.at(-1).text,'~~~~','');
const choose='.tugas tujuan '+task.id+'.1.h3 Praktikum';
const dm=text=>alertBot.handleInbound({chatJid:owner,senderJid:owner,chatType:'private',providerMessageId:'sample-'+(++seq),receivedAt:now,text});
const review = await dm(choose);
const nonce = review.match(/\.confirm ([A-F0-9]+)/)[1];
assert.equal(alertWa.sent.filter(m=>m.chatJid===group).length,0);
buffer.push('**'+choose+'**','','~~~~text',review.replaceAll(nonce,'<kode>'),'~~~~','');
await dm('.confirm '+nonce);
const shared = alertWa.sent.filter(m=>m.chatJid===group);
assert.equal(shared.length,1);
buffer.push('**Teks yang diterima grup setelah Hedy mengonfirmasi**','','~~~~text',shared[0].text,'~~~~','');
for (const [date,label] of [['10','H−2'],['11','H−1'],['12','hari H']]) {
  const before=alertWa.sent.length;
  await alertBot.tickDeadlines(new Date('2026-11-'+date+'T00:30:00Z'));
  assert.deepEqual(alertWa.sent.slice(before).map(m=>m.chatJid),[owner]);
  buffer.push('**DM Hedy pada '+label+'**','','~~~~text',alertWa.sent.at(-1).text,'~~~~','');
}
buffer.push('</details>','');
const sourceParser = await readFile('src/admin/commands/parser.ts','utf8');
const canonical = [...sourceParser.split('export interface ParsedCommand')[0].matchAll(/\| '([^']+)'/g)].map(m=>m[1]).filter(n=>n!=='unknown');
assert.deepEqual(canonical.filter(c=>!covered.has(c)),[],'Handler tanpa contoh');
const visible = new Set();
for (let page = 1; page <= 8; page++) {
  for (const row of menuPage(String(page),true,false,true,true).split('\n').filter(s => s.startsWith('• .'))) {
    const parsed = parseCommand(row.slice(2));
    assert.notEqual(parsed.command,'unknown',row);
    visible.add(parsed.command);
  }
}
assert.deepEqual(canonical.filter(c=>!visible.has(c)),[],'Handler tanpa entri menu');
const parserHeads = [...sourceParser.split('switch (head)')[1].split('// Padanan bahasa alami')[0].matchAll(/case '([^']+)':/g)].map(m=>m[1]);
assert.deepEqual([...commandRegistry.flatMap(r=>r.names),...parserHeads].filter(n=>!heads.has(n)),[],'Nama tanpa uji dispatcher');
const readme=(await readFile('README.md','utf8')).replace(/\r\n/g,'\n');
const intro=readme.indexOf('<!-- COMMAND-CATALOG -->');
const end=readme.indexOf('<!-- END-COMMAND-CATALOG -->');
assert.ok(intro>=0 && end>intro,'Marker katalog README belum tersedia');
const updated = readme.slice(0,intro)+'<!-- COMMAND-CATALOG -->\n'+buffer.join('\n')+'\n'+readme.slice(end);
if (process.argv.includes('--write')) await writeFile('README.md',updated);
if (process.argv.includes('--check')) assert.ok(readme === updated, 'Contoh README berubah. Jalankan npm run docs:commands.');
console.log('Lulus: '+covered.size+' handler, '+heads.size+' nama perintah, '+seq+' eksekusi melalui WhatsApp mock.');
