import { commandRegistry, parseCommand } from './parser.js';

const catalog: [string, string[]][] = [
  ['📚 Informasi kelas', ['kelas', 'anggota [nama]', 'pengurus', 'rules', 'faq', 'matkul', 'dosen [nama]', 'kalender']],
  ['🕒 Jadwal dan tugas', ['jadwal [hari]', 'besok', 'mingguini', 'kuliahberikutnya', 'cekjadwal <tanggal>', 'tugas', 'tugas hariini', 'tambahtugas matkul|judul|deadline|catatan|dosen|PJ', 'selesaitugas <id>', 'reminder', 'note list']],
  ['🧠 Belajar dan materi', ['ask <pertanyaan>', 'rapikan <teks>', 'summarize <teks>', 'jurnal <topik>', 'materi', 'keperawatan', 'sdki <diagnosis>', 'sop <prosedur>', 'carimateri <kata>', 'download <id>', 'tanyadokumen <id> <pertanyaan>', 'ringkasdokumen <id>']],
  ['🎮 Permainan', ['game', 'tebakkata', 'caklontong', 'family100', 'mathquiz', 'jawab <teks>', 'nyerah', 'hint', 'score', 'dailychallenge', 'game buat [jumlah|duel]', 'game gabung', 'game mulai [kategori]', 'game riwayat', 'suit <pilihan>', 'leaderboard']],
  ['🎨 Media', ['sticker', 'ttp <teks>', 'toimg', 'qr <teks>', 'doc pdf <judul>|<isi>', 'kartujadwal [hari]']],
  ['🛠️ Utilitas', ['jam', 'calc <rumus>', 'convert <nilai> <dari> <ke>', 'bmi <kg> <cm>', 'ipk', 'pantun [tema]', 'music <judul>', 'cerita <tema>', 'motivasi', 'dadu']],
  ['🔐 Administrasi', ['health', 'status', 'dashboard', 'runtime', 'ping', 'ai status', 'groups', 'backup', 'audit', 'logs [jumlah]', 'errors [today]', 'relay list', 'tugas antrean', 'tugas grup', 'tugas tujuan <id> <grup>', 'tugas tolak <id>', 'tugas deadline <id> <tanggal>', 'db status', 'drive status', 'drive sync', 'whatsapp status', 'scheduler status', 'storage', 'queue']],
];

catalog[1]![1].push('jadwal senin','jadwal export csv');
catalog[2]![1].push('drive files','askep <topik>','pengkajian <topik>','penunjang','ukom','kampus','kuisukom','highalert','safety','berita','ppni','mtb','ebook','imt <kg> <cm>','gcs E4 V5 M6','balance <masuk> <keluar>','tetesan 500 ml 6 jam 20 tetes/ml');
catalog[3]![1].push('privacy gamification on');
catalog[4]![1].push('blur','resize <lebar> <tinggi>');
catalog[5]![1].push('quotes [tema]','apakah <pertanyaan>','hilih <teks>');
catalog[6]![1].push('ai models','ai model <alias>','ai auto on','ai test <pesan>','groups sources','groups add <JID> <nama>','groups pause <JID>','groups resume <JID>','nimbrung status','filter status','filter review','digest today','broadcast preview <ID>','broadcast send <ID>','reminder pause','reminder resume','admin pause','admin resume');

for (const entry of commandRegistry) {
  const name = entry.names[0]!;
  if (catalog.some(([, usages]) => usages.some(u => parseCommand('.' + u).command === entry.command))) continue;
  const c = parseCommand('.' + name);
  const page = c.adminOnly || entry.command.startsWith('auth.') ? 6 : entry.command.startsWith('fun.') || entry.command.startsWith('game.') || entry.command.startsWith('gamification.') ? 3 : entry.command.startsWith('media.') || entry.command.startsWith('doc.') ? 4 : entry.command.startsWith('schedule.') ? 1 : entry.command.startsWith('ai.') ? 2 : entry.command.startsWith('class.') ? 0 : 5;
  catalog[page]![1].push(name);
}

const pages = catalog.map(([title, usages]) => ({
  title, entries: usages.map(usage => ({usage, parsed:parseCommand('.' + usage)})),
}));

export function menuPage(page: string | undefined, admin: boolean, help = false, driveAllowed = false, scheduleWritable = false): string {
  const sections = pages.filter(section => admin || !section.title.startsWith('🔐')).map(({title,entries}) => ({
    title, entries: entries.filter(({parsed}) => {
      if (['schedule.add','schedule.edit','schedule.delete','schedule.reset'].includes(parsed.command) && !scheduleWritable) return false;
      if (['download','document.ask','document.summary','drive.files'].includes(parsed.command) && !driveAllowed) return false;
      return parsed.command !== 'unknown' && (!parsed.adminOnly || admin);
    }),
  })).filter(section => section.entries.length);
  if (help && page) {
    const query = parseCommand('.' + page.replace(/^\./,''));
    const matches = sections.flatMap(section => section.entries).filter(({parsed}) => parsed.command === query.command);
    const specific = matches.find(({parsed}) => query.args[0] && query.args[0] === parsed.args[0]);
    const entry = specific ?? (query.command === 'nursing' ? undefined : matches[0]);
    return entry ? '💡 *Cara menggunakan*\n\n.' + entry.usage : 'Petunjuk perintah ini belum tersedia. Ketik .menu untuk melihat daftar.';
  }
  const index = Number(page ?? 1) - 1;
  if (!Number.isInteger(index) || !sections[index]) return 'Pilih halaman 1–' + sections.length + ' melalui .menu <halaman>.';
  const section = sections[index]!;
  return ['*' + section.title + '*','', ...section.entries.map(({usage}) => '• .' + usage), '',
    'Halaman ' + (index + 1) + '/' + sections.length + ' · ' + (index + 1 < sections.length ? '.menu ' + (index + 2) : '.menu 1'),
    'Cara pakai: .help <perintah>'].join('\n');
}
