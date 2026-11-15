import { parseCommand, intentKinds, importanceLevels, type ParsedCommand } from './parser.js';
import { availableSections } from './menu.js';
import { weatherQuery } from '../../modules/weather/forecast.js';
import type { ModelRouter } from '../../ai/model-router/router.js';

const actions = ['menu', 'help', 'jadwal', 'besok', 'mingguini', 'kuliahberikutnya', 'tugas', 'materi', 'ask', 'rapikan', 'music', 'sdki', 'sop', 'askep', 'pengkajian', 'penunjang', 'ukom', 'kampus', 'kuisukom', 'highalert', 'berita', 'ppni', 'mtb', 'ebook', 'imt', 'gcs', 'tetesan', 'balance', 'jam', 'game'];
const exactOnly = new Set(['menu','help','besok','mingguini','kuliahberikutnya','jam','game']);
const readable = new Set([
  'class.info', 'class.members', 'class.officers', 'class.rules', 'class.faq', 'courses',
  'lecturers', 'calendar', 'groupid', 'schedule', 'schedule.day', 'schedule.week',
  'schedule.tomorrow', 'schedule.next', 'schedule.check_date', 'tasks', 'menu', 'help',
  'ask', 'rewrite', 'nursing', 'music', 'ai.quiz', 'ai.flashcard',
  'ai.translate', 'ai.summarize', 'journal.search', 'media.qr', 'media.ttp', 'media.sticker',
  'media.toimg', 'media.effect', 'media.ocr', 'media.tts', 'util.calc', 'util.clock',
  'util.convert', 'util.gpa', 'util.bmi', 'util.weather', 'util.wiki', 'util.urlcheck',
  'game.hint', 'game.score', 'materials.search', 'document.summary', 'document.ask', 'download',
  'health', 'status', 'dashboard', 'system', 'db.status', 'ai.status',
  'ai.models', 'whatsapp.status', 'runtime', 'ping', 'about', 'info',
  'owner', 'user.profile', 'schedule.export', 'schedule.today_rooms', 'schedule.today_courses', 'schedule.today_lecturers',
  'repo.inspect','doc.study','doc.permission', 'doc.minutes', 'doc.pdf', 'media.schedulecard', 'media.imagesearch', 'media.quotemaker',
  'groupgen', 'countdown', 'materials', 'drive.files', 'fun.pantun', 'fun.fact',
  'fun.doa', 'fun.surah', 'fun.sholat', 'fun.truth', 'fun.dare', 'fun.dice',
  'fun.coin', 'fun.suit', 'fun.quote', 'fun.shell', 'fun.text', 'gamification.leaderboard',
  'analytics.stats', 'groups', 'groups.sources', 'storage', 'logs', 'errors',
  'audit', 'scheduler.status', 'filter.status', 'filter.review', 'priority', 'digest',
  'pending', 'group.classify', 'drive.status',
]);

function addressedText(input: string) {
  return input.replace(/@\d+(?::\d+)?\b/g, '').replace(/^\s*(?:(?:halo|hai|hei)\s+)?@?(?:hdybot|hdy|bot)\b[,:!\s-]*/i,'').trim();
}

export function greeting(input: string) {
  const text = addressedText(input).replace(/[!.?]+$/, '').trim();
  if (/^(halo|hai|hi|hei|pagi|siang|sore|malam|selamat (pagi|siang|sore|malam))$/i.test(text) || /^(halo|hai|hei)\s+@?(bot|hdybot)[!.?]*$/i.test(input.trim())) return 'Halo! 👋 Ada yang bisa kubantu?';
  if (/^assalamualaikum$/i.test(text)) return 'Waalaikumsalam! Ada yang bisa kubantu?';
  if (/^(makasih|terima kasih|thanks)$/i.test(text)) return 'Sama-sama 😊';
}

/** Permintaan lampiran dengan isi eksplisit, diarahkan ke generator lokal. */
export function artifactIntent(input: string) {
  const text = input.trim().replace(/^(?:(?:coba|tolong)\s+)*(?:buat(?:kan)?|bikin(?:kan)?)\s+/i, '');
  if (text === input.trim()) return undefined;
  const draft = /^(makalah|ppt|powerpoint|presentasi)(?:\s+(?:tentang\s+)?(.+))?$/i.exec(text);
  if (draft) return parseCommand('.doc ' + (draft[1]!.toLowerCase()==='makalah' ? 'makalah ' : 'ppt ') + (draft[2]??''));
  const qr = /^qr(?:\s+code)?(?:\s+(?:untuk|berisi|bertuliskan|dari))?\s*[:\s]\s*([\s\S]+)$/i.exec(text);
  if (qr) return parseCommand('.qr ' + qr[1]);
  const pdf = /^(?:dokumen\s+)?pdf\s+(?:berjudul\s+)?([^|\n]+?)(?:\s*\|\s*|\s+dengan isi\s*[:\s]\s*)([\s\S]+)$/i.exec(text);
  if (pdf) return parseCommand('.doc pdf ' + pdf[1]!.trim() + '|' + pdf[2]!.trim());
  const card = /^kartu jadwal(?:\s+(?:hari\s+)?(senin|selasa|rabu|kamis|jumat|sabtu|minggu))?[.!]?$/i.exec(text);
  if (card) return parseCommand('.kartujadwal ' + (card[1] ?? ''));
}

export function directIntent(input: string) {
  const clean = addressedText(input);
  if (clean.startsWith('.')) return parseCommand(clean);
  const coursePdfs=/^(?:tolong\s+)?(?:ambil|kirim(?:kan)?)\s+semua\s+pdf\s+materi\s+(.+?)[.!?]*$/i.exec(clean);
  if (coursePdfs) return parseCommand('.lms materi pdf '+coursePdfs[1]);
  const artifact = artifactIntent(clean);
  if (artifact) return artifact;
  const repo = /^(?:tolong\s+)?(?:periksa|cek|inspeksi|install|pasang)\s+(?:repo(?:sitor[y i])?\s+)?(https:\/\/github\.com\/\S+)$/i.exec(clean);
  if (repo) return parseCommand('.repo ' + repo[1]);
  const weather = /^(?:(?:apa|bagaimana|gimana|tolong|cek|periksa|lihat|prakiraan|ramalan|coba|kondisi)\s+)*(?:cuaca|weather)(?:nya)?\b(.*)$/i.exec(clean);
  if (weather) return parseCommand('.cuaca ' + weather[1]!.trim());
  const pick = /^(?:tolong\s+)?(?:kirim(?:kan)?|buka|ambil)\s+(?:jurnal\s+|artikel\s+)?(?:nomor|no\.?|yang ke[- ]?)\s*(\d+|satu|dua|tiga|empat)[?!.]*$/i.exec(clean);
  if (pick) {
    const numbers: Record<string,string> = {satu:'1',dua:'2',tiga:'3',empat:'4'};
    return parseCommand('.jurnal nomor ' + (numbers[pick[1]!.toLowerCase()] ?? pick[1]));
  }
  const classQuestion = clean.match(/^(?:(hari ini|besok)\s+(?:ada\s+)?(?:kuliah|matkul)|(?:kuliah|matkul)\s+(hari ini|besok))(?:\s+apa(?:\s+(?:aja|saja))?)?(?:\s+(?:ya|nih))?[?.!]*$/i);
  if (classQuestion) return parseCommand((classQuestion[1] ?? classQuestion[2])?.toLowerCase() === 'besok' ? '.besok' : '.jadwal');
  if (/^jadwal$/i.test(clean)) return parseCommand('.jadwal');
  const list = /^(?:tolong\s+)?(?:cek|lihat|tampilkan|daftar)\s+(catatan|pengingat)(?:\s+(?:saya|ku|kelas|grup ini|chat ini))?[?!.]*$/i.exec(clean);
  if (list) return parseCommand(list[1]!.toLowerCase() === 'catatan' ? '.note list' : '.reminder list');
  if (/^(?:(?:apa(?: saja)?|ada|list|lihat|tampilkan|cek)\s+)?tugas(?:\s+apa(?: saja)?)?\s+hari ini[?!.]*$/i.test(clean)) return parseCommand('.tugas hariini');
  if (/^(?:(?:apa(?: saja)?|ada|list|lihat|tampilkan|cek)\s+)?tugas(?:\s+apa(?: saja)?)?\s+(?:pekan|minggu) ini[?!.]*$/i.test(clean)) return parseCommand('.tugas mingguini');
  const explicit = parseCommand('.' + clean);
  const head = clean.split(/\s+/)[0]?.toLowerCase() ?? '';
  if (actions.includes(head) && (!exactOnly.has(head) || clean.split(/\s+/).length === 1) &&
      !(head === 'tugas' && explicit.args.length) && head !== 'jadwal') return explicit;
  if (explicit.command === 'nursing' || explicit.command === 'music') return explicit;
  const natural = parseCommand(clean);
  if (natural.kind === 'natural' && !natural.adminOnly) return natural;
  if (!clean) return natural;
  if (!clean.includes(' ') && explicit.command !== 'unknown' && !explicit.adminOnly) return explicit;
}

const batchReads = new Set(['schedule','schedule.day','schedule.tomorrow','schedule.week','schedule.next','schedule.today_rooms','tasks','courses','class.info','calendar','lecturers','util.clock','util.weather']);
function batchAllowed(cmd:ParsedCommand) {
  return batchReads.has(cmd.command) && !cmd.adminOnly && !cmd.requiresConfirmation &&
    (cmd.command!=='tasks' || /^(?:|list|all|aktif|hariini|mingguini)$/i.test(cmd.rawArgs)) &&
    (cmd.command!=='util.weather' || !!weatherQuery(cmd.rawArgs).city);
}
export async function inferIntent(input: string, router: ModelRouter, access={admin:false,drive:false,schedule:false}, history: readonly {role:'user'|'assistant';text:string}[] = []): Promise<ParsedCommand> {
  const local = directIntent(input);
  const compound=/\b(?:lalu|kemudian|sekalian|sekaligus|serta|dan(?:\s+juga)?)\b/i.test(input);
  if (local && (!compound || !batchAllowed(local) || local.command==='util.weather' && !/\b(?:jadwal|tugas|matkul)\b/i.test(input))) return local;
  const clean = addressedText(input);
  const natural = parseCommand(clean);
  if (greeting(input)) return natural;
  const entries=availableSections(access.admin,access.drive,access.schedule).flatMap(s=>s.entries);
  const heads=new Set(entries.map(e=>e.usage.split(' ')[0]));
  try {
    const out = await router.invoke({ format: { name: 'command_intent', schema: {
      type: 'object', additionalProperties: false, properties: {
        command: { type: ['string', 'null'], enum: [...heads, null] }, args: { type: 'string' }, intent:{type:'string',enum:intentKinds}, importance:{type:'string',enum:importanceLevels},
        followups:{type:'array',items:{type:'object',additionalProperties:false,required:['command','args'],properties:{command:{type:'string',enum:[...heads]},args:{type:'string'}}}},
      }, required: ['command', 'args', 'intent', 'importance','followups'],
    } }, task: 'intent_detection', modality: 'text', responseBudgetMs: 1500, messages: [
      { role: 'system', content: 'Klasifikasikan pesan terakhir. Riwayat hanya konteks. Pilih intent, importance, command dan args. Untuk gabungan pembacaan jadwal, tugas, mata kuliah atau cuaca, jadikan permintaan pertama sebagai command dan sisanya sebagai followups (maksimal dua); untuk satu permintaan isi followups dengan array kosong. CHAT_ONLY, IMPORTANT_MESSAGE, SECURITY_REVIEW, AMBIGUOUS_REQUEST: command null. URGENT untuk pembatalan mendadak, ujian, tenggat dekat; IMPORTANT untuk tugas/materi baru; REVIEW untuk sumber meragukan; LOW untuk obrolan. WEATHER_REQUEST: cuaca dengan kota dan rentang dari pengguna. SYSTEM_OPERATION hanya pemeriksaan sistem yang didukung. Untuk instalasi, shell, rahasia atau tindakan destruktif pilih SECURITY_REVIEW. Untuk jurnal gunakan jurnal, untuk hasil sebelumnya gunakan args nomor N. Untuk kuis bertema gunakan game dengan args ai <topik>. Untuk informasi LMS gunakan command lms dan args operasi saja, misalnya materi gerontik atau materi pdf gerontik, tanpa nama. Untuk diagnostik Drive gunakan drive status. Untuk refresh eksplisit gunakan drive sync. Jangan mengarang parameter, ID, kota atau tindakan. Menu: '+entries.map(e=>e.usage).join('; ') },
      ...history.slice(-4).map(h=>({role:h.role,content:h.text.slice(0,350)})),
      { role: 'user', content: clean.slice(0,1500) },
    ] });
    const choice = JSON.parse(out.text.replace(/^```(?:json)?\s*|\s*```$/g,''));
    if (compound && Array.isArray(choice.followups) && choice.followups.length &&
        ['DATA_QUERY','INFORMATION_LOOKUP','WEATHER_REQUEST'].includes(choice.intent) && importanceLevels.includes(choice.importance)) {
      const steps=[choice,...choice.followups];
      if (steps.length>3) return {...natural,clarification:'Pilih maksimal tiga permintaan informasi untuk satu pesan.'};
      const plan:ParsedCommand[]=[];
      for (const step of steps) {
        if (!step || !heads.has(step.command) || typeof step.args!=='string' || step.args.length>150)
          return {...natural,clarification:'Permintaan mana yang ingin kamu periksa dahulu?'};
        const cmd=parseCommand('.'+step.command+' '+step.args);
        if (!batchAllowed(cmd) || cmd.command==='util.weather' && !clean.toLowerCase().includes(weatherQuery(cmd.rawArgs).city.toLowerCase()))
          return {...natural,clarification:'Untuk tindakan tersebut, kirim satu permintaan terpisah.'};
        plan.push(cmd);
      }
      return {...plan[0]!,intent:choice.intent,importance:choice.importance,followups:plan.slice(1)};
    }
    if (choice.intent !== undefined) {
      if (!intentKinds.includes(choice.intent) || !importanceLevels.includes(choice.importance)) return natural;
      natural.intent = choice.intent; natural.importance = choice.importance;
      if (choice.intent === 'CHAT_ONLY' || choice.intent === 'IMPORTANT_MESSAGE') return natural;
      if (choice.intent === 'SECURITY_REVIEW') return {...natural, clarification:'Permintaan ini perlu pemeriksaan owner di chat pribadi. Belum ada tindakan yang dijalankan.'};
      if (choice.intent === 'AMBIGUOUS_REQUEST') return {...natural, clarification:'Apa yang ingin kamu periksa atau buat, dan untuk objek yang mana?'};
      if (choice.intent === 'WEATHER_REQUEST') {
        const args=typeof choice.args==='string' ? choice.args.slice(0,120) : '';
        const query=weatherQuery(args);
        const named=!!query.city && [clean,...history.filter(t=>t.role==='user').map(t=>t.text)].some(text=>text.toLowerCase().includes(query.city.toLowerCase()));
        const period=query.days===7 ? '7 hari' : query.tomorrow ? 'besok' : '';
        return {...parseCommand('.cuaca ' + (named ? args : period)), intent:choice.intent, importance:choice.importance};
      }
      if (choice.intent === 'SYSTEM_OPERATION' && !access.admin) return {...natural, clarification:'Pemeriksaan sistem hanya tersedia di chat pribadi admin yang sudah login.'};
      if (choice.intent === 'KNOWLEDGE_QUESTION' && choice.command == null) return {...parseCommand('.ask ' + clean), intent:choice.intent, importance:choice.importance};
    }
    if (typeof choice.command === 'string' && heads.has(choice.command) && typeof choice.args === 'string') {
      const cmd = parseCommand('.' + choice.command + ' ' + choice.args.slice(0,500));
      cmd.intent = natural.intent;
      cmd.importance = natural.importance;
      if (cmd.command==='repo.inspect' && !clean.includes(cmd.rawArgs)) return {...natural,clarification:'URL repositori GitHub mana yang ingin kamu periksa?'};
      if (cmd.command==='unknown' || (cmd.adminOnly && !access.admin) || !entries.some(e=>e.parsed.command===cmd.command)) return natural;
      const sub=cmd.args[0]?.toLowerCase();
      if (cmd.command==='lms' && /^(dashboard|status|matkul|materi|tugas|deadline|kuis)(?:\s|$)/i.test(cmd.rawArgs)) return cmd;
      if (cmd.command==='drive.sync' && access.admin && choice.intent==='SYSTEM_OPERATION' && /\b(ulang|sinkron(?:kan|isasi)?|refresh|retry)\b/i.test(clean)) return cmd;
      if (['notes', 'reminders'].includes(cmd.command) && (!sub || (sub === 'list' && cmd.args.length === 1))) return cmd;
      if (cmd.command==='tasks' && sub && !['list','all','aktif','hariini','mingguini','detail'].includes(sub)) return natural;
      if (['download','document.ask','document.summary'].includes(cmd.command) && (!cmd.args[0] || !clean.split(/\s+/).includes(cmd.args[0]))) return parseCommand('.help '+choice.command);
      if (!cmd.requiresConfirmation && (readable.has(cmd.command) || (cmd.command==='game' && (!sub || sub==='list' || sub==='ai')))) return cmd;
      // Terangkan format tindakan yang harus diminta eksplisit (login, ekspor privat, mutasi dan konfirmasi).
      const usage = entries.find(entry => entry.usage.split(' ')[0] === choice.command && entry.usage.split(' ')[1] === sub);
      return parseCommand('.help ' + (usage && sub ? choice.command + ' ' + sub : choice.command));
    }
    if (natural.intent && !['KNOWLEDGE_QUESTION','CHAT_ONLY','IMPORTANT_MESSAGE'].includes(natural.intent)) return {...natural, clarification:'Aku belum menemukan tindakan yang sesuai. Fitur atau data mana yang kamu maksud?'};
  } catch { /* Router offline atau hasil bukan perintah. */ }
  return local ?? natural;
}
