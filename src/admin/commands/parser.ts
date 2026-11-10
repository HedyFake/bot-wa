/**
 * Command & Natural-Language Parser untuk HdyBot.
 * PENTING: Hanya membaca `text` dari pesan pengirim saat ini.
 * Konten `quoted` TIDAK PERNAH dievaluasi sebagai command.
 */

export type CanonicalCommand =
  | 'auth.login'
  | 'auth.logout'
  | 'owner'
  | 'groupid'
  | 'dashboard'
  | 'system'
  | 'status'
  | 'health'
  | 'lms'
  | 'ping'
  | 'runtime'
  | 'about'
  | 'info'
  | 'logs'
  | 'errors'
  | 'help'
  | 'menu'
  | 'class.info'
  | 'class.members'
  | 'class.officers'
  | 'class.rules'
  | 'class.faq'
  | 'user.profile'
  | 'ai.status'
  | 'ai.models'
  | 'ai.model'
  | 'ai.auto'
  | 'ai.test'
  | 'ai.summarize'
  | 'ai.flashcard'
  | 'ai.quiz'
  | 'ai.translate'
  | 'groups'
  | 'groups.sources'
  | 'groups.add'
  | 'groups.pause'
  | 'groups.resume'
  | 'group.nimbrung'
  | 'group.setpjmk'
  | 'group.setkelasa'
  | 'group.classify'
  | 'filter.status'
  | 'filter.review'
  | 'priority'
  | 'digest'
  | 'pending'
  | 'approve'
  | 'reject'
  | 'send'
  | 'broadcast.preview'
  | 'broadcast.send'
  | 'schedule'
  | 'schedule.day'
  | 'schedule.tomorrow'
  | 'schedule.week'
  | 'schedule.next'
  | 'schedule.today_courses'
  | 'schedule.today_lecturers'
  | 'schedule.today_rooms'
  | 'schedule.check_date'
  | 'schedule.add'
  | 'schedule.edit'
  | 'schedule.delete'
  | 'schedule.reset'
  | 'schedule.export'
  | 'courses'
  | 'lecturers'
  | 'tasks'
  | 'reminders'
  | 'reminders.pause'
  | 'announce'
  | 'notes'
  | 'materials'
  | 'materials.search'
  | 'journal.search'
  | 'db.status'
  | 'whatsapp.status'
  | 'scheduler.status'
  | 'storage'
  | 'nursing'
  | 'music'
  | 'relay'
  | 'drive.status'
  | 'drive.sync'
  | 'drive.files'
  | 'document.ask'
  | 'document.summary'
  | 'download'
  | 'game.hint'
  | 'game.daily'
  | 'game.score'
  | 'game'
  | 'rewrite'
  | 'ask'
  | 'groupgen'
  | 'calendar'
  | 'countdown'
  | 'doc.permission'
  | 'doc.minutes'
  | 'doc.pdf'
  | 'media.sticker'
  | 'media.ttp'
  | 'media.toimg'
  | 'media.effect'
  | 'media.quotemaker'
  | 'media.schedulecard'
  | 'media.imagesearch'
  | 'media.qr'
  | 'media.ocr'
  | 'media.tts'
  | 'util.gpa'
  | 'util.bmi'
  | 'util.calc'
  | 'util.convert'
  | 'util.clock'
  | 'util.weather'
  | 'util.wiki'
  | 'util.urlcheck'
  | 'fun.create'
  | 'fun.quote'
  | 'fun.fact'
  | 'fun.pantun'
  | 'fun.doa'
  | 'fun.surah'
  | 'fun.sholat'
  | 'fun.truth'
  | 'fun.dare'
  | 'fun.dice'
  | 'fun.coin'
  | 'fun.suit'
  | 'fun.shell'
  | 'fun.quiz_start'
  | 'fun.quiz_answer'
  | 'fun.quiz_giveup'
  | 'fun.text'
  | 'fun.afk'
  | 'fun.unafk'
  | 'analytics.stats'
  | 'gamification.privacy'
  | 'gamification.leaderboard'
  | 'backup'
  | 'audit'
  | 'emergency.stop'
  | 'emergency.resume'
  | 'confirm'
  | 'cancel'
  | 'pair'
  | 'unknown';

export interface ParsedCommand {
  kind: 'dot' | 'natural' | 'none';
  command: CanonicalCommand;
  args: string[];
  rawArgs: string;
  adminOnly: boolean;
  requiresConfirmation: boolean;
}

// Hanya perintah mutasi/destruktif sensitif yang dibatasi admin;
// seluruh fitur informasi, dashboard, jadwal, tugas, AI, media, & hiburan diizinkan untuk dilihat di semua grup yang allow!
export const monitoringCommands = new Set<CanonicalCommand>(['health', 'status', 'system', 'dashboard', 'runtime', 'ping', 'logs', 'errors', 'backup', 'ai.status', 'ai.models', 'db.status', 'whatsapp.status', 'scheduler.status', 'storage', 'drive.status']);
const ADMIN_ONLY = new Set<CanonicalCommand>([
  'scheduler.status', 'whatsapp.status', 'db.status', 'storage', 'relay', 'drive.status', 'drive.sync', 'group.setpjmk', 'group.setkelasa', 'filter.status', 'digest', 'priority', 'ai.test', 'logs', 'errors', 'system', 'dashboard', 'health', 'status', 'ping', 'runtime', 'ai.status', 'ai.models', 'groups', 'groups.sources',
  'ai.model', 'ai.auto',
  'groups.add', 'groups.pause', 'groups.resume',
  'filter.review',
  'pending', 'approve', 'reject', 'send', 'broadcast.preview', 'broadcast.send',
  'schedule.add', 'schedule.edit', 'schedule.delete', 'schedule.reset',
  'reminders.pause', 'backup', 'audit', 'emergency.stop', 'emergency.resume',
  'confirm', 'cancel', 'pair',
]);

const REQUIRES_CONFIRMATION = new Set<CanonicalCommand>([
  'broadcast.send', 'schedule.add', 'schedule.edit', 'schedule.delete', 'schedule.reset',
]);

const DAY_NAMES = new Set(['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu']);

function build(
  kind: ParsedCommand['kind'],
  command: CanonicalCommand,
  args: string[] = [],
  rawArgs = '',
): ParsedCommand {
  return {
    kind,
    command,
    args,
    rawArgs: rawArgs.trim(),
    adminOnly: ADMIN_ONLY.has(command) || (command === 'tasks' && ['antrean','grup','tujuan','tolak','deadline','ulang'].includes((args[0] ?? '').toLowerCase())),
    requiresConfirmation: REQUIRES_CONFIRMATION.has(command),
  };
}

/** Alias sederhana dipakai bersama oleh parser dan katalog bantuan. */
export const commandRegistry: ReadonlyArray<{ names: string[]; command: CanonicalCommand; args: boolean }> = [
  { names: ['login','password','pass','auth'], command: 'auth.login', args: true },
  { names: ['logout','lock'], command: 'auth.logout', args: false },
  { names: ['owner'], command: 'owner', args: false },
  { names: ['groupid','id'], command: 'groupid', args: false },
  { names: ['dashboard'], command: 'dashboard', args: false },
  { names: ['system'], command: 'system', args: false },
  { names: ['status'], command: 'status', args: false },
  { names: ['health'], command: 'health', args: false },
  { names: ['lms'], command: 'lms', args: true },
  { names: ['ping'], command: 'ping', args: false },
  { names: ['runtime'], command: 'runtime', args: false },
  { names: ['about'], command: 'about', args: false },
  { names: ['info','ingfo'], command: 'info', args: false },
  { names: ['logs'], command: 'logs', args: true },
  { names: ['errors'], command: 'errors', args: true },
  { names: ['help'], command: 'help', args: true },
  { names: ['menu','allmenu'], command: 'menu', args: true },
  { names: ['anggota','mahasiswa','nim'], command: 'class.members', args: true },
  { names: ['rules','aturan'], command: 'class.rules', args: false },
  { names: ['faq'], command: 'class.faq', args: false },
  { names: ['profile','me'], command: 'user.profile', args: false },
  { names: ['priority'], command: 'priority', args: false },
  { names: ['pending'], command: 'pending', args: false },
  { names: ['approve'], command: 'approve', args: true },
  { names: ['reject'], command: 'reject', args: true },
  { names: ['send'], command: 'send', args: true },
  { names: ['tasks','tugas','deadline','mytask','progress'], command: 'tasks', args: true },
  { names: ['announce','pengumuman'], command: 'announce', args: true },
  { names: ['note','catatan'], command: 'notes', args: true },
  { names: ['workers'], command: 'scheduler.status', args: false },
  { names: ['queue'], command: 'scheduler.status', args: false },
  { names: ['storage'], command: 'storage', args: false },
  { names: ['ringkasdokumen'], command: 'document.summary', args: true },
  { names: ['tanyadokumen'], command: 'document.ask', args: true },
  { names: ['ambilmateri','download'], command: 'download', args: true },
  { names: ['dokumen','materi'], command: 'materials', args: true },
  { names: ['carimateri'], command: 'materials.search', args: true },
  { names: ['jurnal','carijurnal','journal','scholar','googlescholar','pubmed','garuda'], command: 'journal.search', args: true },
  { names: ['hint'], command: 'game.hint', args: false },
  { names: ['dailychallenge'], command: 'game.daily', args: false },
  { names: ['score'], command: 'game.score', args: false },
  { names: ['music','musik'], command: 'music', args: true },
  { names: ['relay'], command: 'relay', args: true },
  { names: ['game'], command: 'game', args: true },
  { names: ['rapikan','perbaiki','rewrite','parafrase','koreksi'], command: 'rewrite', args: true },
  { names: ['ask','tanya','brainly'], command: 'ask', args: true },
  { names: ['summarize','ringkas'], command: 'ai.summarize', args: true },
  { names: ['flashcard'], command: 'ai.flashcard', args: true },
  { names: ['quiz','kuis'], command: 'ai.quiz', args: true },
  { names: ['translate','tr'], command: 'ai.translate', args: true },
  { names: ['kelompok','buatkelompok'], command: 'groupgen', args: true },
  { names: ['kalender','agenda'], command: 'calendar', args: true },
  { names: ['countdown'], command: 'countdown', args: true },
  { names: ['suratizin'], command: 'doc.permission', args: true },
  { names: ['notulensi'], command: 'doc.minutes', args: true },
  { names: ['sticker','stiker','s','stickerwm'], command: 'media.sticker', args: true },
  { names: ['ttp','attp'], command: 'media.ttp', args: true },
  { names: ['toimg'], command: 'media.toimg', args: false },
  { names: ['quotemaker','makequote','quotesmaker'], command: 'media.quotemaker', args: true },
  { names: ['gambar','carigambar','img','image','foto','carifoto','pinterest'], command: 'media.imagesearch', args: true },
  { names: ['qr','qrcode'], command: 'media.qr', args: true },
  { names: ['ocr'], command: 'media.ocr', args: true },
  { names: ['tts','say'], command: 'media.tts', args: true },
  { names: ['ipk','gpa'], command: 'util.gpa', args: true },
  { names: ['bmi'], command: 'util.bmi', args: true },
  { names: ['calc','hitung','kalkulator'], command: 'util.calc', args: true },
  { names: ['convert','konversi','kurs'], command: 'util.convert', args: true },
  { names: ['jam','waktu','clock'], command: 'util.clock', args: false },
  { names: ['cuaca','weather'], command: 'util.weather', args: true },
  { names: ['wiki','wikipedia','kbbi'], command: 'util.wiki', args: true },
  { names: ['urlcheck','shortlink'], command: 'util.urlcheck', args: true },
  { names: ['faktaunik'], command: 'fun.fact', args: false },
  { names: ['pantun'], command: 'fun.pantun', args: true },
  { names: ['doaharian','ayatkursi'], command: 'fun.doa', args: false },
  { names: ['listsurah','quran'], command: 'fun.surah', args: true },
  { names: ['jadwalsholat'], command: 'fun.sholat', args: true },
  { names: ['truth'], command: 'fun.truth', args: false },
  { names: ['dare'], command: 'fun.dare', args: false },
  { names: ['dadu'], command: 'fun.dice', args: false },
  { names: ['koin','flipcoin'], command: 'fun.coin', args: false },
  { names: ['suit'], command: 'fun.suit', args: true },
  { names: ['jawab'], command: 'fun.quiz_answer', args: true },
  { names: ['nyerah', 'skip'], command: 'fun.quiz_giveup', args: false },
  { names: ['afk'], command: 'fun.afk', args: true },
  { names: ['unafk'], command: 'fun.unafk', args: false },
  { names: ['stats','activity','report'], command: 'analytics.stats', args: true },
  { names: ['leaderboard','lb','level','lvl'], command: 'gamification.leaderboard', args: true },
  { names: ['backup'], command: 'backup', args: false },
  { names: ['audit'], command: 'audit', args: false },
  { names: ['confirm'], command: 'confirm', args: true },
  { names: ['cancel'], command: 'cancel', args: true },
  { names: ['pair'], command: 'pair', args: true },
  { names: ['matkul'], command: 'courses', args: true },
  { names: ['dosen','nomordosen','kontakdosen'], command: 'lecturers', args: true },
  { names: ['besok'], command: 'schedule.tomorrow', args: false },
  { names: ['mingguini'], command: 'schedule.week', args: false },
  { names: ['kuliahberikutnya'], command: 'schedule.next', args: false },
  { names: ['matkulhariini'], command: 'schedule.today_courses', args: false },
  { names: ['dosenhariini'], command: 'schedule.today_lecturers', args: false },
  { names: ['ruanganhariini'], command: 'schedule.today_rooms', args: false },
  { names: ['cekjadwal'], command: 'schedule.check_date', args: true },
  { names: ['tambahjadwal'], command: 'schedule.add', args: true },
  { names: ['editjadwal'], command: 'schedule.edit', args: true },
  { names: ['hapusjadwal'], command: 'schedule.delete', args: true },
  { names: ['resetjadwal'], command: 'schedule.reset', args: true },
  { names: ['setpjmk'], command: 'group.setpjmk', args: true },
  { names: ['setkelasa','setnursing'], command: 'group.setkelasa', args: true },
  { names: ['cekpesan','klasifikasi'], command: 'group.classify', args: true },
];
const commandByName = new Map(commandRegistry.flatMap(entry => entry.names.map(name => [name, entry] as const)));

export function parseCommand(textInput: string): ParsedCommand {
  const text = (textInput ?? '').trim();
  if (!text) return build('none', 'unknown');

  if (text.startsWith('.')) {
    const withoutDot = text.slice(1).trim();
    const parts = withoutDot.split(/\s+/);
    const head = (parts[0] ?? '').toLowerCase();
    const sub = (parts[1] ?? '').toLowerCase();
    const rest = parts.slice(1);
    const rest2 = parts.slice(2);
    const rawRest = withoutDot.slice(head.length).trim();
    const rawRest2 = rawRest.slice(sub.length).trim();

    if (head === 'tambahtugas' || head === 'selesaitugas' || head === 'tugasaktif') {
      const subtask = head === 'tambahtugas' ? 'add' : head === 'selesaitugas' ? 'done' : 'aktif';
      return build('dot','tasks',[subtask,...rest],[subtask,rawRest].join(' ').trim());
    }
    if (head === 'kalkulator' && !rest.length) return build('dot', 'nursing', ['kalkulator']);
    if (head === 'kuis' && sub === 'ukom') return build('dot', 'nursing', ['kuisukom'], rawRest2);
    if (head === 'high' && sub === 'alert') return build('dot', 'nursing', ['highalert'], rawRest2);
    if (head === 'patient' && sub === 'safety') return build('dot', 'nursing', ['safety'], rawRest2);
    if (head === 'download' && !rest.length) return build('dot', 'nursing', ['ebook']);
    if (['keperawatan','sdki','sop','kalkulatorperawat','imt','tetesan','gcs','balance','askep','pengkajian','penunjang','ukom','kampus','kuisukom','highalert','safety','berita','ppni','mtb','bias','ebook'].includes(head)) {
      const kind = head === 'bias' ? 'mtb' : head === 'kalkulatorperawat' ? 'kalkulator' : head;
      return build('dot', 'nursing', [kind], rawRest);
    }
    const registered = commandByName.get(head);
    if (registered) return registered.args ? build('dot', registered.command, rest, rawRest) : build('dot', registered.command);

    switch (head) {

      // Profil Kelas & Anggota
      case 'kelas':
      case 'semester':
      case 'tahunajaran':
        return build('dot', 'class.info', [head, ...rest], rawRest);

      case 'ketuakelas':
      case 'komting':
      case 'wakilkomting':
      case 'sekretaris':
      case 'bendahara':
      case 'wali':
      case 'pengurus':
      case 'pjmk':
        return build('dot', 'class.officers', [head, ...rest], rawRest || head);

      case 'db': return build('dot', sub === 'status' ? 'db.status' : 'unknown');
      case 'whatsapp': return build('dot', sub === 'status' ? 'whatsapp.status' : 'unknown');

      case 'scheduler': return build('dot', sub === 'status' ? 'scheduler.status' : 'unknown');

      case 'drive':
        if (sub === 'sync' && !rest2.length) return build('dot', 'drive.sync');
        if (sub === 'status' || sub === 'errors') return build('dot', 'drive.status');
        if (sub === 'files' || sub === 'search') return build('dot', 'drive.files', rest2, rawRest2);
        return build('dot', 'unknown');

      case 'sinonim':
      case 'antonim':
      case 'anagram':
      case 'tebakemoji':
      case 'deretangka':
      case 'asahotak':
      case 'tebakpola': return build('dot', 'game', [head, ...rest], rawRest);

      case 'doc':
      case 'pdf':
        if (sub === 'create' || sub === 'permission') return build('dot', 'doc.permission', rest2, rawRest2);
        if (sub === 'minutes') return build('dot', 'doc.minutes', rest2, rawRest2);
        return build('dot', 'doc.pdf', sub === 'pdf' ? rest2 : rest, sub === 'pdf' ? rawRest2 : rawRest);

      // Media, Stiker, Efek Gambar, QR, OCR, TTS

      case 'blur':
      case 'invert':
      case 'grayscale':
      case 'hitamputih':
      case 'flip':
      case 'flop':
      case 'resize':
      case 'compress':
        return build('dot', 'media.effect', [head === 'hitamputih' ? 'grayscale' : head, ...rest], rawRest);

      case 'kartujadwal':
      case 'kartuucapan':
        return build('dot', 'media.schedulecard', [head, ...rest], rawRest);

// Utilitas

// Fun, Quotes, & Mini-Games Aman (Porting Akira)
      case 'motivasi':
      case 'katahariini':
      case 'tebak-tebakan':
      case 'roasting':
      case 'gombal':
      case 'rayuan':
      case 'cerpen':
      case 'cerita': return build('dot', 'fun.create', [head, ...rest], [head, rawRest].join(' ').trim());
      case 'quotes':
      case 'quoterandom':
      case 'katabijak':
        return build('dot', 'fun.quote', rest.length ? rest : ['umum'], rawRest || 'umum');
      case 'quotesislami':
        return build('dot', 'fun.quote', ['islami'], 'islami');
      case 'quotesmotivasi':
      case 'quotesnasehat':
        return build('dot', 'fun.quote', ['motivasi'], 'motivasi');

      case 'apakah':
      case 'kapankah':
      case 'bisakah':
      case 'kerangajaib':
      case 'rate':
        return build('dot', 'fun.shell', [head, ...rest], rawRest);
      case 'tebakkata':
      case 'caklontong':
      case 'family100':
      case 'mathquiz':
        return build('dot', 'fun.quiz_start', [head], head);

      case 'hilih':
      case 'alay':
      case 'besarkecil':
      case 'balikhuruf':
      case 'namaninja':
        return build('dot', 'fun.text', [head, ...rest], rawRest);

// Analitik & Gamifikasi

      case 'privacy':
        if (sub === 'gamification') return build('dot', 'gamification.privacy', rest2, rawRest2);
        return build('dot', 'gamification.privacy', rest, rawRest);

      case 'ai':
        if (sub === 'status') return build('dot', 'ai.status');
        if (sub === 'models') return build('dot', 'ai.models');
        if (sub === 'model' || sub === 'pin') return build('dot', 'ai.model', rest2, rawRest2);
        if (sub === 'unpin') return build('dot', 'ai.auto', ['on'], 'on');
        if (sub === 'auto') return build('dot', 'ai.auto', rest2.length ? rest2 : ['on'], rawRest2 || 'on');
        if (sub === 'test') return build('dot', 'ai.test', rest2, rawRest2);
        return build('dot', 'ai.status');
      case 'groups':
      case 'group':
      case 'source':
      case 'target':
        if (sub === 'sources' || sub === 'list') return build('dot', 'groups.sources');
        if (sub === 'add' || sub === 'set') return build('dot', 'groups.add', rest2, rawRest2);
        if (sub === 'pause' || sub === 'remove') return build('dot', 'groups.pause', rest2, rawRest2);
        if (sub === 'resume') return build('dot', 'groups.resume', rest2, rawRest2);
        return build('dot', 'groups');
      case 'nimbrung':
      case 'nongkrong':
        return build('dot', 'group.nimbrung', rest.length ? rest : ['on'], rawRest || 'on');
      case 'diam':
      case 'hening':
      case 'berhentinimbrung':
        return build('dot', 'group.nimbrung', ['off'], 'off');

      case 'filter':
      case 'monitor':
        if (sub === 'status') return build('dot', 'filter.status');
        if (sub === 'review') return build('dot', 'filter.review');
        if (sub === 'pause' || sub === 'off') return build('dot', 'groups.pause', rest2, rawRest2);
        if (sub === 'resume' || sub === 'on') return build('dot', 'groups.resume', rest2, rawRest2);
        return build('dot', 'filter.status');
      case 'digest':
        return build('dot', 'digest', [sub || 'today'], rawRest || 'today');
      case 'broadcast':
        if (sub === 'send') return build('dot', 'broadcast.send', rest2, rawRest2);
        return build('dot', 'broadcast.preview', rest2, rawRest2);
      case 'schedule':
      case 'jadwal':
        if (sub === 'add' || sub === 'tambah') return build('dot', 'schedule.add', rest2, rawRest2);
        if (sub === 'edit' || sub === 'ubah') return build('dot', 'schedule.edit', rest2, rawRest2);
        if (sub === 'delete' || sub === 'hapus') return build('dot', 'schedule.delete', rest2, rawRest2);
        if (sub === 'reset') return build('dot', 'schedule.reset', rest2, rawRest2);
        if (sub === 'export') return build('dot', 'schedule.export', rest2, rawRest2);
        if (sub === 'besok') return build('dot', 'schedule.tomorrow');
        if (sub === 'minggu' || sub === 'mingguini') return build('dot', 'schedule.week');
        if (DAY_NAMES.has(sub)) return build('dot', 'schedule.day', [sub], sub);
        return build('dot', 'schedule');
      case 'reminders':
      case 'reminder':
        if (sub === 'pause' || sub === 'resume') return build('dot', 'reminders.pause', [sub], sub);
        return build('dot', 'reminders', rest, rawRest);
      case 'admin':
      case 'maintenance':
        if (sub === 'menu') return build('dot', 'menu');
        if (sub === 'status') return build('dot', 'status');
        if (sub === 'overview') return build('dot', 'dashboard');
        if (sub === 'pause' || sub === 'on') return build('dot', 'emergency.stop');
        if (sub === 'resume' || sub === 'off') return build('dot', 'emergency.resume');
        if (sub === 'review') return build('dot', 'pending');
        if (sub === 'approve') return build('dot', 'approve', rest2, rawRest2);
        if (sub === 'reject') return build('dot', 'reject', rest2, rawRest2);
        if (sub === 'audit') return build('dot', 'audit');
        if (sub === 'backup') return build('dot', 'backup');
        return build('dot', 'dashboard');
      default:
        return build('dot', 'unknown', parts, withoutDot);
    }
  }

  // Padanan bahasa alami (natural language intent deterministik)
  const low = text.toLowerCase();
  if (/tampilkan\s+dashboard|dashboard\s+hari\s+ini/i.test(low)) return build('natural', 'dashboard');
  if (/status\s+koneksi(\s+whatsapp|\s+nvidia)?|periksa\s+status/i.test(low)) return build('natural', 'status');
  if (/model\s+apa\s+yang\s+(sedang\s+)?dipakai|status\s+(model|ai)/i.test(low)) return build('natural', 'ai.status');
  const model = low.match(/ganti\s+model.*?\b(lightning|super[- ]?vl|ultra|deepseek|mistral|kimi|minimax|luna)\b/i)?.[1]?.replace(/^super[- ]?vl$/, 'super-vl');
  if (model) return build('natural', 'ai.model', [model], model);
  if (/ringkas\s+informasi\s+penting|ringkasan\s+hari\s+ini/i.test(low)) return build('natural', 'digest', ['today'], 'today');
  if (/pesan\s+yang\s+menunggu\s+persetujuan|antrean\s+review/i.test(low)) return build('natural', 'pending');
  if (/matikan\s+sementara\s+pengiriman|hentikan\s+outbound|emergency\s+stop/i.test(low)) return build('natural', 'emergency.stop');
  if (/kuliah\s+berikutnya|kelas\s+selanjutnya/i.test(low)) return build('natural', 'schedule.next');
  if (/jadwal\s+besok/i.test(low)) return build('natural', 'schedule.tomorrow');
  if (/jadwal\s+minggu\s+ini/i.test(low)) return build('natural', 'schedule.week');
  for (const d of DAY_NAMES) {
    if (new RegExp(`\\bjadwal\\s+(hari\\s+)?${d}\\b`, 'i').test(low)) {
      return build('natural', 'schedule.day', [d], d);
    }
  }
  if (/\bjadwal(\s+hari\s+ini|\s+5a)?\b/i.test(low)) return build('natural', 'schedule');
  if (/tugas.*deadline.*dekat|deadline\s+terdekat/i.test(low)) return build('natural', 'tasks', ['terdekat'], 'terdekat');
  if (/(daftar|nomor|kontak)\s+dosen/i.test(low)) {
    const q = text.replace(/^(tampilkan\s+|lihat\s+|cek\s+)?(daftar|nomor|kontak)\s+dosen\s*/i, '').trim();
    return build('natural', 'lecturers', q ? q.split(/\s+/) : [], q);
  }
  if (/daftar\s+(mata\s+kuliah|matkul)/i.test(low)) return build('natural', 'courses');
  if (/(daftar|struktur)\s+pengurus|siapa\s+(komting|pengurus)|daftar\s+pjmk/i.test(low)) {
    return build('natural', 'class.officers');
  }
  if (/(daftar|nama)\s+(anggota|mahasiswa)|daftar\s+nim/i.test(low)) {
    return build('natural', 'class.members');
  }
  const journalMatch = text.match(/^(?:bot\s+|hdybot\s+|tolong\s+)?(?:cari(?:kan)?\s+jurnal|jurnal\s+tentang|link\s+jurnal|pdf\s+jurnal)\s+(.+)$/i);
  if (journalMatch?.[1]) {
    const q = journalMatch[1].trim();
    return build('natural', 'journal.search', q.split(/\s+/), q);
  }
  const imageMatch = text.match(/^(?:bot\s+|hdybot\s+|tolong\s+)?(?:cari(?:kan)?\s+(?:gambar|foto)|kirim(?:kan)?\s+(?:gambar|foto))\s+(.+)$/i);
  if (imageMatch?.[1]) {
    const q = imageMatch[1].trim();
    return build('natural', 'media.imagesearch', q.split(/\s+/), q);
  }

  return build('none', 'unknown', [], text);
}
