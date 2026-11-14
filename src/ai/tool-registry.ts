import { z } from 'zod';
import { ScheduleService } from '../modules/schedule/service.js';
import { nursingCalculation } from '../modules/academic/perawat.js';

export interface BrainTool {
  definition: { type: 'function'; name: string; description: string; strict: true; parameters: Record<string, unknown> };
  run(raw: string): unknown;
}

export function tool<T extends z.ZodObject>(name: string, description: string, schema: T, execute: (args: z.output<T>) => unknown): BrainTool {
  const { $schema: _, ...parameters } = z.toJSONSchema(schema);
  return {
    definition: { type: 'function', name, description, strict: true, parameters },
    run(raw) {
      if (raw.length > 2000) throw Error('invalid_arguments');
      return execute(schema.parse(JSON.parse(raw)));
    },
  };
}

export function conversationTools(context: {
  schedule: ScheduleService;
  now: () => Date;
  canMonitor: () => boolean;
  runtime: () => { whatsapp: string; uptimeSeconds: number };
  audit?: (name: string, result: 'ok' | 'rejected') => void;
  additional?: BrainTool[];
}): BrainTool[] {
  const tools = [
    tool('class_schedule', 'Baca jadwal kelas untuk hari yang diminta, waktu Asia/Jakarta.',
      z.strictObject({ day: z.enum(['hari ini', 'besok', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu']) }), ({ day }) => {
        const now = context.now();
        const schedule = context.schedule;
        const result = day === 'hari ini' ? schedule.getToday(now) : day === 'besok' ? schedule.getTomorrow(now)
          : schedule.getUpcomingDay(ScheduleService.resolveWeekday(day)!, now);
        const sessions = result.sessions.map(s => ({ ...s, exception: s.exception && { kind: s.exception.kind } }));
        return { source: 'Jadwal kelas HdyBot', date: result.dateIso, schedule: schedule.formatDayText(result.weekdayLabel, sessions, result.dateIso) };
      }),
    tool('class_courses', 'Daftar mata kuliah kelas dan jumlah SKS.', z.strictObject({}), () => ({
      source: 'Katalog kelas HdyBot',
      courses: context.schedule.listCourses().map(c => ({ code: c.code, name: c.normalizedName, credits: c.creditsSks })),
    })),
    tool('nursing_calculator', 'Hitung contoh latihan IMT (kg cm), GCS (E V M), balance cairan (masuk keluar mL) atau tetesan (mL, jam, faktor tetes/mL). Pertahankan angka pengguna dan minta satuan yang belum jelas.',
      z.strictObject({ kind: z.enum(['imt', 'gcs', 'balance', 'tetesan']), values: z.string() }), ({ kind, values }) => ({
        result: nursingCalculation(kind, values.trim()),
      })),
  ];
  if (context.canMonitor()) {
    tools.push(tool('bot_runtime', 'Baca koneksi WhatsApp dan uptime bot untuk admin di chat pribadi.', z.strictObject({}), () => {
      if (!context.canMonitor()) throw Error('forbidden');
      return context.runtime();
    }));
  }
  return [...tools, ...context.additional ?? []].map(entry => ({
    definition: entry.definition,
    run(raw) {
      try {
        const result = entry.run(raw);
        if (result instanceof Promise) return result.then(value => {
          context.audit?.(entry.definition.name, 'ok');
          return value;
        }, err => {
          context.audit?.(entry.definition.name, 'rejected');
          throw err;
        });
        context.audit?.(entry.definition.name, 'ok');
        return result;
      } catch (err) {
        context.audit?.(entry.definition.name, 'rejected');
        throw err;
      }
    },
  }));
}
