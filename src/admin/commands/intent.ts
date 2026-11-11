import { parseCommand } from './parser.js';
import { availableSections } from './menu.js';
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
  'doc.permission', 'doc.minutes', 'doc.pdf', 'media.schedulecard', 'media.imagesearch', 'media.quotemaker',
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

export function directIntent(input: string) {
  const clean = addressedText(input);
  if (clean.startsWith('.')) return parseCommand(clean);
  const classQuestion = clean.match(/^(?:(hari ini|besok)\s+(?:ada\s+)?(?:kuliah|matkul)|(?:kuliah|matkul)\s+(hari ini|besok))(?:\s+apa(?:\s+(?:aja|saja))?)?(?:\s+(?:ya|nih))?[?.!]*$/i);
  if (classQuestion) return parseCommand((classQuestion[1] ?? classQuestion[2])?.toLowerCase() === 'besok' ? '.besok' : '.jadwal');
  if (/^jadwal$/i.test(clean)) return parseCommand('.jadwal');
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

export async function inferIntent(input: string, router: ModelRouter, access={admin:false,drive:false,schedule:false}) {
  const local = directIntent(input);
  if (local) return local;
  const clean = addressedText(input);
  const natural = parseCommand(clean);
  if (greeting(input)) return natural;
  const entries=availableSections(access.admin,access.drive,access.schedule).flatMap(s=>s.entries);
  const heads=new Set(entries.map(e=>e.usage.split(' ')[0]));
  try {
    const out = await router.invoke({ task: 'intent_detection', modality: 'text', responseBudgetMs: 1500, messages: [
      { role: 'system', content: 'Tentukan apakah pengguna meminta aksi dari menu ini: '+entries.map(e=>e.usage).join('; ')+'. Balas JSON {"command":"besok","args":""}. command hanya kata pertama, args berisi subperintah dan argumen. Untuk membuat game kuis bertema gunakan game dengan args "ai <topik>". Untuk obrolan, balas {"command":null}. Jangan mengarang ID, hak akses, atau parameter.' },
      { role: 'user', content: clean.slice(0,1500) },
    ] });
    const choice = JSON.parse(out.text.replace(/^```(?:json)?\s*|\s*```$/g,''));
    if (typeof choice.command === 'string' && heads.has(choice.command) && typeof choice.args === 'string') {
      const cmd = parseCommand('.' + choice.command + ' ' + choice.args.slice(0,500));
      if (cmd.command==='unknown' || (cmd.adminOnly && !access.admin) || !entries.some(e=>e.parsed.command===cmd.command)) return natural;
      const sub=cmd.args[0]?.toLowerCase();
      if (cmd.command==='tasks' && sub && !['list','all','aktif','hariini','mingguini','detail'].includes(sub)) return natural;
      if (['download','document.ask','document.summary'].includes(cmd.command) && (!cmd.args[0] || !clean.split(/\s+/).includes(cmd.args[0]))) return parseCommand('.help '+choice.command);
      if (!cmd.requiresConfirmation && (readable.has(cmd.command) || (cmd.command==='game' && (!sub || sub==='list' || sub==='ai')))) return cmd;
      // Terangkan format tindakan yang harus diminta eksplisit (login, ekspor privat, mutasi dan konfirmasi).
      const usage = entries.find(entry => entry.usage.split(' ')[0] === choice.command && entry.usage.split(' ')[1] === sub);
      return parseCommand('.help ' + (usage && sub ? choice.command + ' ' + sub : choice.command));
    }
  } catch { /* Router offline atau hasil bukan perintah. */ }
  return natural;
}
