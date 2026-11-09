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

for (const entry of commandRegistry) {
  const name = entry.names[0]!;
  if (catalog.some(([, usages]) => usages.some(u => parseCommand('.' + u).command === entry.command))) continue;
  const c = parseCommand('.' + name);
  const page = c.adminOnly || entry.command.startsWith('auth.') ? 6 : entry.command.startsWith('fun.') || entry.command.startsWith('game.') || entry.command.startsWith('gamification.') ? 3 : entry.command.startsWith('media.') || entry.command.startsWith('doc.') ? 4 : entry.command.startsWith('schedule.') ? 1 : entry.command.startsWith('ai.') ? 2 : entry.command.startsWith('class.') ? 0 : 5;
  catalog[page]![1].push(name);
}

export function menuPage(page: string | undefined, admin: boolean, help = false, driveAllowed = false, scheduleWritable = false): string {
  const sections = catalog.map(([title, entries]) => ({
    title,
    entries: (title.startsWith('🔐') && !admin ? [] : entries).filter(entry => {
      const cmd = parseCommand('.' + entry);
      if (['schedule.add','schedule.edit','schedule.delete','schedule.reset'].includes(cmd.command) && !scheduleWritable) return false;
      if (['download', 'document.ask', 'document.summary'].includes(cmd.command) && !driveAllowed) return false;
      return cmd.command !== 'unknown' && (!cmd.adminOnly || admin);
    }),
  })).filter(section => section.entries.length);
  if (help && page) {
    const query = parseCommand('.' + page.replace(/^\./, ''));
    const entry = sections.flatMap(section => section.entries)
      .find(usage => { const p = parseCommand('.' + usage); return p.command === query.command && (p.command !== 'nursing' || p.args[0] === query.args[0]); });
    return entry ? '💡 *Cara menggunakan*\n.' + entry : 'Petunjuk perintah ini belum tersedia.';
  }
  const index = Number(page ?? 1) - 1;
  if (!Number.isInteger(index) || !sections[index]) return 'Pilih halaman 1–' + sections.length + ' melalui .menu <halaman>.';
  const section = sections[index]!;
  return ['🤖 *HDYBOT — NURSING CLASS A*', section.title, '━━━━━━━━━━━━━━━━━━━━',
    ...section.entries.map(entry => '• .' + entry), '', 'Halaman ' + (index + 1) + '/' + sections.length,
    index + 1 < sections.length ? 'Lanjut dengan .menu ' + (index + 2) : 'Kembali melalui .menu 1',
    'Gunakan .help <perintah> untuk melihat cara pakai.'].join('\n');
}
