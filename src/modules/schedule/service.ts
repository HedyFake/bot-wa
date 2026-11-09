import { indonesianDate } from '../academic/assignment-format.js';
import { readFileSync } from 'node:fs';
import type { ScheduleDatabase } from './database.js';
import { resolve } from 'node:path';
import { type ClassSeed, normalizedCourseName, parseSeed, WEEKDAYS } from '../../database/seed-schema.js';

export type WeekdayName = (typeof WEEKDAYS)[number];

export interface ScheduleSessionView {
  weekday: WeekdayName;
  weekdayLabel: string;
  startTime: string;
  endTime: string;
  courseCode: string;
  courseName: string;
  creditsSks: number;
  room: string | null;
  lecturerCandidates: string[];
  assignedLecturers?: string[];
  status: string;
  exception?: { kind: 'cancelled' | 'moved' | 'room_changed'; newStart?: string; newEnd?: string; newRoom?: string; note?: string };
}

export interface ScheduleExceptionRecord {
  weekday: WeekdayName;
  startTime: string;
  date: string; // YYYY-MM-DD (Asia/Jakarta)
  kind: 'cancelled' | 'moved' | 'room_changed';
  newStart?: string;
  newEnd?: string;
  newRoom?: string;
  note?: string;
  approvedBy: string;
}

const ID_TO_WEEKDAY: Record<string, WeekdayName> = {
  senin: 'MONDAY',
  selasa: 'TUESDAY',
  rabu: 'WEDNESDAY',
  kamis: 'THURSDAY',
  jumat: 'FRIDAY',
  sabtu: 'SATURDAY',
  minggu: 'SUNDAY',
  monday: 'MONDAY',
  tuesday: 'TUESDAY',
  wednesday: 'WEDNESDAY',
  thursday: 'THURSDAY',
  friday: 'FRIDAY',
  saturday: 'SATURDAY',
  sunday: 'SUNDAY',
};

const WEEKDAY_TO_ID_LABEL: Record<WeekdayName, string> = {
  MONDAY: 'Senin',
  TUESDAY: 'Selasa',
  WEDNESDAY: 'Rabu',
  THURSDAY: 'Kamis',
  FRIDAY: 'Jumat',
  SATURDAY: 'Sabtu',
  SUNDAY: 'Minggu',
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = formatterCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    formatterCache.set(timeZone, fmt);
  }
  return fmt;
}

/** Konversi `Date` ke komponen waktu lokal `Asia/Jakarta` secara deterministik. */
export function toJakartaParts(date: Date, timeZone = 'Asia/Jakarta'): {
  dateIso: string;
  weekday: WeekdayName;
  weekdayLabel: string;
  hhmm: string;
  minutesOfDay: number;
} {
  const fmt = getFormatter(timeZone);
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const year = parts.year ?? '1970';
  const month = parts.month ?? '01';
  const day = parts.day ?? '01';
  const rawHour = Number(parts.hour ?? '0');
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = Number(parts.minute ?? '0');
  const weekday = ID_TO_WEEKDAY[(parts.weekday ?? 'monday').toLowerCase()] ?? 'MONDAY';
  const hhmm = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return {
    dateIso: `${year}-${month}-${day}`,
    weekday,
    weekdayLabel: WEEKDAY_TO_ID_LABEL[weekday],
    hhmm,
    minutesOfDay: hour * 60 + minute,
  };
}

const hhmmToMin = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export class ScheduleService {
  private snapshot: ClassSeed;
  private database?: ScheduleDatabase;
  private loadedAt = 0;
  private loading?: Promise<void>;
  private get seed() {
    if (this.database && !this.loadedAt) throw new Error('Jadwal database belum tersedia');
    return this.snapshot;
  }
  private exceptions = new Map<string, ScheduleExceptionRecord>();

  constructor(seedData?: ClassSeed) {
    this.snapshot =
      seedData ??
      parseSeed(JSON.parse(readFileSync(resolve('data/class-5a.seed.json'), 'utf8')));
  }

  useDatabase(database: ScheduleDatabase) { this.database = database; }

  async refresh(force = false): Promise<void> {
    if (!this.database) return;
    if (this.loading) {
      await this.loading;
      if (!force) return;
    }
    if (!force && Date.now() - this.loadedAt < 15_000) return;
    this.loading = this.database.read().then(({ data, exceptions }) => {
      const checked = parseSeed(data);
      const next = new Map<string, ScheduleExceptionRecord>();
      for (const ex of exceptions) {
        if (ex.kind !== 'cancelled' && ex.kind !== 'room_changed' && ex.kind !== 'moved') throw new Error('Jenis pengecualian jadwal tidak dikenal');
        next.set(ex.date + '|' + ex.weekday + '|' + ex.startTime, { ...ex, kind:ex.kind });
      }
      this.snapshot = checked;
      this.exceptions = next;
      this.loadedAt = Date.now();
    }).catch(e => { this.loadedAt = 0; throw e; }).finally(() => { this.loading = undefined; });
    await this.loading;
  }

  static resolveWeekday(input: string): WeekdayName | null {
    return ID_TO_WEEKDAY[input.trim().toLowerCase()] ?? null;
  }

  getClassInfo() {
    return this.seed.class;
  }

  listCourses() {
    return this.seed.courses.map((c) => ({
      code: c.code,
      originalName: c.name,
      normalizedName: normalizedCourseName(c.code, c.name),
      creditsSks: c.credits_sks,
      aliases: c.aliases,
      sourceStatus: c.source_status,
    }));
  }

  /** Total SKS dihitung dari atribut mata kuliah unik, BUKAN menjumlahkan sesi berulang. */
  totalCourseCreditsSks(): number {
    return this.seed.courses.reduce((sum, c) => sum + c.credits_sks, 0);
  }

  listLecturers(courseQuery?: string) {
    if (!courseQuery) return this.seed.lecturer_associations;
    const q = courseQuery.trim().toLowerCase();
    const matchedCodes = new Set(
      this.seed.courses
        .filter(
          (c) =>
            c.code.toLowerCase() === q ||
            c.name.toLowerCase().includes(q) ||
            c.aliases.some((a) => a.toLowerCase().includes(q)),
        )
        .map((c) => c.code),
    );
    return this.seed.lecturer_associations.filter(
      (l) => matchedCodes.has(l.course_code) || l.raw_name.toLowerCase().includes(q),
    );
  }

  getForWeekday(weekday: WeekdayName, dateIso?: string): ScheduleSessionView[] {
    const coursesByCode = new Map(this.seed.courses.map((c) => [c.code, c]));
    return this.seed.schedule_entries
      .filter((e) => e.weekday === weekday)
      .sort((a, b) => hhmmToMin(a.start_time) - hhmmToMin(b.start_time))
      .map((e) => {
        const course = coursesByCode.get(e.course_code)!;
        const candidates = this.seed.lecturer_associations
          .filter((l) => l.course_code === e.course_code && l.verification_status !== 'REJECTED')
          .map((l) => l.raw_name);
        const exKey = dateIso ? `${dateIso}|${e.weekday}|${e.start_time}` : '';
        const ex = exKey ? this.exceptions.get(exKey) : undefined;
        return {
          weekday: e.weekday,
          weekdayLabel: WEEKDAY_TO_ID_LABEL[e.weekday],
          startTime: ex?.newStart ?? e.start_time,
          endTime: ex?.newEnd ?? e.end_time,
          courseCode: e.course_code,
          courseName: normalizedCourseName(e.course_code, course.name),
          creditsSks: course.credits_sks,
          room: ex?.newRoom ?? e.room,
          lecturerCandidates: candidates,
          assignedLecturers:e.lecturer_assignment ? [e.lecturer_assignment] : this.seed.lecturer_associations.filter(l=>l.course_code===e.course_code && l.assigns_to_every_session && l.verification_status==='VERIFIED').map(l=>l.raw_name),
          status: e.source_status,
          exception: ex
            ? { kind: ex.kind, newStart: ex.newStart, newEnd: ex.newEnd, newRoom: ex.newRoom, note: ex.note }
            : undefined,
        };
      }).sort((a,b) => a.startTime.localeCompare(b.startTime));
  }

  getToday(now = new Date()): { dateIso: string; weekdayLabel: string; sessions: ScheduleSessionView[] } {
    const p = toJakartaParts(now, this.seed.class.timezone);
    return {
      dateIso: p.dateIso,
      weekdayLabel: p.weekdayLabel,
      sessions: this.getForWeekday(p.weekday, p.dateIso),
    };
  }

  getUpcomingDay(day:WeekdayName,now:Date) {
    const current=toJakartaParts(now).weekday;
    const offset=(WEEKDAYS.indexOf(day)-WEEKDAYS.indexOf(current)+7)%7;
    return this.getToday(new Date(+now+offset*86400_000));
  }
  getWeek(now:Date) {
    const monday=+now-WEEKDAYS.indexOf(toJakartaParts(now).weekday)*86400_000;
    return WEEKDAYS.map((_,i)=>this.getToday(new Date(monday+i*86400_000)));
  }

  getTomorrow(now = new Date()): { dateIso: string; weekdayLabel: string; sessions: ScheduleSessionView[] } {
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return this.getToday(tomorrow);
  }

  /** Cari sesi kuliah berikutnya yang belum mulai (dan tidak dibatalkan) dari waktu `now`. */
  getNextSession(now = new Date()): { dateIso: string; daysAhead: number; session: ScheduleSessionView } | null {
    for (let offset = 0; offset <= 7; offset++) {
      const d = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
      const parts = toJakartaParts(d, this.seed.class.timezone);
      const sessions = this.getForWeekday(parts.weekday, parts.dateIso);
      for (const s of sessions) {
        if (s.exception?.kind === 'cancelled') continue;
        if (offset === 0 && hhmmToMin(s.startTime) <= parts.minutesOfDay) continue;
        return { dateIso: parts.dateIso, daysAhead: offset, session: s };
      }
    }
    return null;
  }

  /** Catat pengecualian satu tanggal (batal/pindah jam/pindah ruang) tanpa merusak jadwal mingguan dasar. */
  addException(ex: ScheduleExceptionRecord): void {
    if (ex.newStart && ex.newEnd) {
      const sMin = hhmmToMin(ex.newStart);
      const eMin = hhmmToMin(ex.newEnd);
      if (eMin <= sMin) throw new Error('Jam selesai harus setelah jam mulai');
      for (const b of this.seed.breaks) {
        if (sMin < hhmmToMin(b.end_time) && hhmmToMin(b.start_time) < eMin) {
          throw new Error(`Jadwal pengganti menabrak waktu ${b.label} (${b.start_time}-${b.end_time})`);
        }
      }
    }
    const key = `${ex.date}|${ex.weekday}|${ex.startTime}`;
    this.exceptions.set(key, ex);
  }

  formatDayText(weekdayLabel: string, sessions: ScheduleSessionView[], dateIso?: string): string {
    const header = '*MK ' + weekdayLabel + (dateIso ? ' ' + indonesianDate(dateIso) : '') + '*';
    if (!sessions.length) return header + '\n\nTidak ada kuliah terjadwal.';
    const blocks = sessions.map(s => {
      const fields = ['🕦 Pukul: ' + s.startTime + '–' + s.endTime + ' WIB', '📗 Mata kuliah: ' + s.courseName,
        '👤 Dosen pengampu: ' + (s.assignedLecturers?.join(', ') || 'Belum dikonfirmasi untuk sesi ini')];
      if (!s.assignedLecturers?.length && s.lecturerCandidates.length) fields.push('🎓 Tim mata kuliah: ' + s.lecturerCandidates.join(', '));
      if (s.room) fields.push('📍 Ruang/media: ' + s.room);
      if (s.exception) fields.push(s.exception.kind === 'cancelled' ? '❌ Kuliah dibatalkan' : '🔁 Perubahan jadwal');
      if (s.exception?.note) fields.push('📝 Catatan: ' + s.exception.note);
      return fields.join('\n');
    });
    const breaks = this.seed.breaks.map(b => '☕ ' + b.label + ': ' + b.start_time + '–' + b.end_time + ' WIB');
    return [header, ...blocks, ...breaks].join('\n\n');
  }
}
