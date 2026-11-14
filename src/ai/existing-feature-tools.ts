import { z } from 'zod';
import { availableSections } from '../admin/commands/menu.js';
import { parseCommand } from '../admin/commands/parser.js';
import type { AcademicCalendarService } from '../modules/academic/extended-modules.js';
import { indonesianDate } from '../modules/academic/assignment-format.js';
import type { FunAndUtilityService } from '../modules/fun/fun-utility-service.js';
import type { ReminderWorker } from '../modules/reminders/worker.js';
import { tool } from './tool-registry.js';

interface FeatureContext {
  fun: FunAndUtilityService;
  calendar: AcademicCalendarService;
  worker?: Pick<ReminderWorker, 'listForChat'>;
  chat: string;
  sender: string;
  now: () => Date;
  owner: () => boolean;
  access: () => { admin: boolean; drive: boolean; schedule: boolean };
}

const pageNumber = z.number().int().min(1).max(10000);
function pageOf<T>(records: T[], page: number) {
  return { total: records.length, page, pages: Math.ceil(records.length / 10), items: records.slice((page - 1) * 10, page * 10) };
}

export function existingFeatureTools(ctx: FeatureContext) {
  const units = z.enum(['c','f','k','km','m','cm','mm','kg','g','mg','lb','idr','usd','eur','sgd','myr']);
  return [
    tool('assignment_list', 'Baca tugas dan tenggat yang terlihat di chat. hariini dan mingguini mengikuti WIB. Filter kursus atau judul dengan kata kunci.',
      z.strictObject({ status: z.enum(['aktif','selesai','hariini','mingguini','semua']), search: z.string().max(100), page: pageNumber }), args => {
        const query = args.search.trim().toLowerCase();
        const tasks = ctx.fun.visibleAssignments(ctx.chat, ctx.owner(), args.status, ctx.now())
          .filter(t => [t.id,t.title,t.course].some(v => v.toLowerCase().includes(query)))
          .map(t => ({ id: t.id, title: t.title, course: t.course, date: t.dueDateIso, timeWib: t.dueTime ?? null, status: t.status }));
        return pageOf(tasks, args.page);
      }),
    tool('chat_notes', 'Cari judul catatan yang terlihat di chat ini. Gunakan .note list untuk membaca isi lengkap.',
      z.strictObject({ search: z.string().max(100), page: pageNumber }), args => pageOf(ctx.fun.listNotes(ctx.chat)
        .filter(n => n.title.toLowerCase().includes(args.search.trim().toLowerCase())).map(n => ({ id: n.id, title: n.title })), args.page)),
    tool('chat_reminders', 'Baca pengingat aktif untuk chat ini, maksimal 30 hasil terdekat.',
      z.strictObject({}), async () => {
        if (ctx.worker) return (await ctx.worker.listForChat(ctx.chat)).map(r => ({ id: r.id, title: r.text, whenWib: r.fireAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) }));
        return ctx.fun.reminderSchedule(ctx.chat).slice(0,30);
      }),
    tool('academic_calendar', 'Baca kalender akademik yang tercatat dan status verifikasinya.',
      z.strictObject({ page: pageNumber }), args => pageOf(ctx.calendar.listEvents().map(e => ({
        date: e.dateIso, title: e.title, category: e.category, verification: e.verification,
      })), args.page)),
    tool('days_until', 'Hitung jumlah hari sampai tanggal kalender di WIB.', z.strictObject({ date: z.string() }), ({ date }) => {
      if (!indonesianDate(date)) throw Error('invalid_date');
      return { date, days: ctx.calendar.countdownDays(date, ctx.now()) };
    }),
    tool('math_calculator', 'Hitung ekspresi aritmetika dengan kalkulator lokal.',
      z.strictObject({ expression: z.string().max(160) }), args => ctx.fun.evaluateMath(args.expression)),
    tool('unit_conversion', 'Konversi panjang, berat, suhu, atau estimasi kurs referensi lokal.',
      z.strictObject({ value: z.number(), from: units, to: units }), args => ({ result: ctx.fun.convertUnit(args.value, args.from, args.to) })),
    tool('game_progress', 'Baca petunjuk ronde di chat ini atau skor milik pengirim.',
      z.strictObject({ item: z.enum(['petunjuk','skor']) }), ({ item }) => item === 'petunjuk'
        ? { hint: ctx.fun.gameHint(ctx.chat) } : { xp: ctx.fun.getScores()[ctx.sender] ?? 0 }),
    tool('command_guide', 'Cari cara memakai fitur berdasarkan nama perintah, alias, atau kategori menu yang tersedia di chat. Menghasilkan sintaks yang dapat diketik pengguna.',
      z.strictObject({ search: z.string().max(80), page: pageNumber }), args => {
        const access = ctx.access();
        const sections = availableSections(access.admin, access.drive, access.schedule);
        const q = args.search.trim().toLowerCase().replace(/^\./,'');
        const canonical = parseCommand('.' + q).command;
        const entries = sections.flatMap(s => s.entries.filter(e => e.usage.toLowerCase().includes(q) || s.title.toLowerCase().includes(q) || e.parsed.command === canonical)
          .map(e => ({ category: s.title, usage: '.' + e.usage })));
        return pageOf(entries, args.page);
      }),
  ];
}
