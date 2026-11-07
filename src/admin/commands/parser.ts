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

const ADMIN_ONLY = new Set<CanonicalCommand>([
  'owner', 'dashboard', 'system', 'logs', 'errors',
  'ai.status', 'ai.models', 'ai.model', 'ai.auto', 'ai.test',
  'groups', 'groups.sources', 'groups.add', 'groups.pause', 'groups.resume',
  'filter.status', 'filter.review', 'priority', 'digest',
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
    adminOnly: ADMIN_ONLY.has(command),
    requiresConfirmation: REQUIRES_CONFIRMATION.has(command),
  };
}

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

    switch (head) {
      case 'login':
      case 'password':
      case 'pass':
      case 'auth':
        return build('dot', 'auth.login', rest, rawRest);
      case 'logout':
      case 'lock':
        return build('dot', 'auth.logout');
      case 'owner': return build('dot', 'owner');
      case 'groupid':
      case 'id': return build('dot', 'groupid');
      case 'dashboard': return build('dot', 'dashboard');
      case 'system': return build('dot', 'system');
      case 'status': return build('dot', 'status');
      case 'health': return build('dot', 'health');
      case 'ping': return build('dot', 'ping');
      case 'runtime': return build('dot', 'runtime');
      case 'about': return build('dot', 'about');
      case 'info':
      case 'ingfo': return build('dot', 'info');
      case 'logs': return build('dot', 'logs');
      case 'errors': return build('dot', 'errors');
      case 'help': return build('dot', 'help', rest, rawRest);
      case 'menu':
      case 'allmenu': return build('dot', 'menu', rest, rawRest);

      // Profil Kelas & Anggota
      case 'kelas':
      case 'semester':
      case 'tahunajaran':
        return build('dot', 'class.info', [head, ...rest], rawRest);
      case 'anggota':
        return build('dot', 'class.members', rest, rawRest);
      case 'ketuakelas':
      case 'sekretaris':
      case 'bendahara':
      case 'wali':
      case 'pengurus':
        return build('dot', 'class.officers', [head], head);
      case 'rules':
      case 'aturan':
        return build('dot', 'class.rules');
      case 'faq':
        return build('dot', 'class.faq');
      case 'profile':
      case 'me':
        return build('dot', 'user.profile');

      case 'priority': return build('dot', 'priority');
      case 'pending': return build('dot', 'pending');
      case 'approve': return build('dot', 'approve', rest, rawRest);
      case 'reject': return build('dot', 'reject', rest, rawRest);
      case 'send': return build('dot', 'send', rest, rawRest);

      // Tugas, Reminder, Pengumuman, Catatan
      case 'tasks':
      case 'tugas':
      case 'deadline':
      case 'mytask':
      case 'progress':
        return build('dot', 'tasks', rest, rawRest);
      case 'announce':
      case 'pengumuman':
        return build('dot', 'announce', rest, rawRest);
      case 'note':
      case 'catatan':
        return build('dot', 'notes', rest, rawRest);

      case 'materi': return build('dot', 'materials', rest, rawRest);
      case 'carimateri': return build('dot', 'materials.search', rest, rawRest);
      case 'ask':
      case 'tanya':
      case 'brainly':
        return build('dot', 'ask', rest, rawRest);
      case 'summarize':
      case 'ringkas':
        return build('dot', 'ai.summarize', rest, rawRest);
      case 'flashcard':
        return build('dot', 'ai.flashcard', rest, rawRest);
      case 'quiz':
      case 'kuis':
        return build('dot', 'ai.quiz', rest, rawRest);
      case 'translate':
      case 'tr':
        return build('dot', 'ai.translate', rest, rawRest);

      case 'kelompok':
      case 'buatkelompok': return build('dot', 'groupgen', rest, rawRest);
      case 'kalender':
      case 'agenda': return build('dot', 'calendar', rest, rawRest);
      case 'countdown': return build('dot', 'countdown', rest, rawRest);
      case 'suratizin': return build('dot', 'doc.permission', rest, rawRest);
      case 'notulensi': return build('dot', 'doc.minutes', rest, rawRest);
      case 'doc':
      case 'pdf':
        if (sub === 'create' || sub === 'permission') return build('dot', 'doc.permission', rest2, rawRest2);
        if (sub === 'minutes') return build('dot', 'doc.minutes', rest2, rawRest2);
        return build('dot', 'doc.pdf', sub === 'pdf' ? rest2 : rest, sub === 'pdf' ? rawRest2 : rawRest);

      // Media, Stiker, Efek Gambar, QR, OCR, TTS
      case 'sticker':
      case 'stiker':
      case 's':
      case 'stickerwm':
        return build('dot', 'media.sticker', rest, rawRest);
      case 'ttp':
      case 'attp':
        return build('dot', 'media.ttp', rest, rawRest);
      case 'toimg':
        return build('dot', 'media.toimg');
      case 'blur':
      case 'invert':
      case 'grayscale':
      case 'hitamputih':
      case 'flip':
      case 'flop':
      case 'resize':
      case 'compress':
        return build('dot', 'media.effect', [head === 'hitamputih' ? 'grayscale' : head, ...rest], rawRest);
      case 'quotemaker':
      case 'makequote':
      case 'quotesmaker':
        return build('dot', 'media.quotemaker', rest, rawRest);
      case 'kartujadwal':
      case 'kartuucapan':
        return build('dot', 'media.schedulecard', [head, ...rest], rawRest);
      case 'qr':
      case 'qrcode':
        return build('dot', 'media.qr', rest, rawRest);
      case 'ocr':
        return build('dot', 'media.ocr', rest, rawRest);
      case 'tts':
      case 'say':
        return build('dot', 'media.tts', rest, rawRest);

      // Utilitas
      case 'ipk':
      case 'gpa': return build('dot', 'util.gpa', rest, rawRest);
      case 'bmi': return build('dot', 'util.bmi', rest, rawRest);
      case 'calc':
      case 'hitung':
      case 'kalkulator':
        return build('dot', 'util.calc', rest, rawRest);
      case 'convert':
      case 'konversi':
      case 'kurs':
        return build('dot', 'util.convert', rest, rawRest);
      case 'jam':
      case 'waktu':
      case 'clock':
        return build('dot', 'util.clock');
      case 'cuaca':
      case 'weather':
        return build('dot', 'util.weather', rest, rawRest);
      case 'wiki':
      case 'wikipedia':
      case 'kbbi':
        return build('dot', 'util.wiki', rest, rawRest);
      case 'urlcheck':
      case 'shortlink':
        return build('dot', 'util.urlcheck', rest, rawRest);

      // Fun, Quotes, & Mini-Games Aman (Porting Akira)
      case 'quotes':
      case 'quoterandom':
      case 'katabijak':
        return build('dot', 'fun.quote', ['umum'], 'umum');
      case 'quotesislami':
        return build('dot', 'fun.quote', ['islami'], 'islami');
      case 'quotesmotivasi':
      case 'quotesnasehat':
        return build('dot', 'fun.quote', ['motivasi'], 'motivasi');
      case 'faktaunik':
        return build('dot', 'fun.fact');
      case 'pantun':
        return build('dot', 'fun.pantun');
      case 'doaharian':
      case 'ayatkursi':
        return build('dot', 'fun.doa');
      case 'listsurah':
      case 'quran':
        return build('dot', 'fun.surah', rest, rawRest);
      case 'jadwalsholat':
        return build('dot', 'fun.sholat', rest, rawRest);
      case 'truth':
        return build('dot', 'fun.truth');
      case 'dare':
        return build('dot', 'fun.dare');
      case 'dadu':
        return build('dot', 'fun.dice');
      case 'koin':
      case 'flipcoin':
        return build('dot', 'fun.coin');
      case 'suit':
        return build('dot', 'fun.suit', rest, rawRest);
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
      case 'jawab':
        return build('dot', 'fun.quiz_answer', rest, rawRest);
      case 'nyerah':
        return build('dot', 'fun.quiz_giveup');
      case 'hilih':
      case 'alay':
      case 'besarkecil':
      case 'balikhuruf':
      case 'namaninja':
        return build('dot', 'fun.text', [head, ...rest], rawRest);
      case 'afk':
        return build('dot', 'fun.afk', rest, rawRest);
      case 'unafk':
        return build('dot', 'fun.unafk');

      // Analitik & Gamifikasi
      case 'stats':
      case 'activity':
      case 'report':
        return build('dot', 'analytics.stats', rest, rawRest);
      case 'leaderboard':
      case 'lb':
      case 'level':
      case 'lvl':
        return build('dot', 'gamification.leaderboard', rest, rawRest);
      case 'privacy':
        if (sub === 'gamification') return build('dot', 'gamification.privacy', rest2, rawRest2);
        return build('dot', 'gamification.privacy', rest, rawRest);

      case 'backup': return build('dot', 'backup');
      case 'audit': return build('dot', 'audit');
      case 'confirm': return build('dot', 'confirm', rest, rawRest);
      case 'cancel': return build('dot', 'cancel', rest, rawRest);
      case 'pair': return build('dot', 'pair', rest, rawRest);
      case 'matkul': return build('dot', 'courses', rest, rawRest);
      case 'dosen': return build('dot', 'lecturers', rest, rawRest);
      case 'besok': return build('dot', 'schedule.tomorrow');
      case 'mingguini': return build('dot', 'schedule.week');
      case 'kuliahberikutnya': return build('dot', 'schedule.next');
      case 'matkulhariini': return build('dot', 'schedule.today_courses');
      case 'dosenhariini': return build('dot', 'schedule.today_lecturers');
      case 'ruanganhariini': return build('dot', 'schedule.today_rooms');
      case 'cekjadwal': return build('dot', 'schedule.check_date', rest, rawRest);
      case 'tambahjadwal': return build('dot', 'schedule.add', rest, rawRest);
      case 'editjadwal': return build('dot', 'schedule.edit', rest, rawRest);
      case 'hapusjadwal': return build('dot', 'schedule.delete', rest, rawRest);
      case 'resetjadwal': return build('dot', 'schedule.reset', rest, rawRest);
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
      case 'setpjmk':
        return build('dot', 'group.setpjmk', rest, rawRest);
      case 'setkelasa':
      case 'setnursing':
        return build('dot', 'group.setkelasa', rest, rawRest);
      case 'cekpesan':
      case 'klasifikasi':
        return build('dot', 'group.classify', rest, rawRest);
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
        if (sub === 'pause') return build('dot', 'reminders.pause', rest2, rawRest2);
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
  if (/ganti\s+model.*lightning/i.test(low)) return build('natural', 'ai.model', ['lightning'], 'lightning');
  if (/ganti\s+model.*super[- ]?vl/i.test(low)) return build('natural', 'ai.model', ['super-vl'], 'super-vl');
  if (/ganti\s+model.*ultra/i.test(low)) return build('natural', 'ai.model', ['ultra'], 'ultra');
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
  if (/daftar\s+dosen/i.test(low)) return build('natural', 'lecturers');
  if (/daftar\s+(mata\s+kuliah|matkul)/i.test(low)) return build('natural', 'courses');

  return build('none', 'unknown', [], text);
}
