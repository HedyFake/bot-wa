import { z } from 'zod';

const Status = z.enum([
  'USER_PROVIDED_PENDING_CONFIRMATION', 'VERIFIED', 'REJECTED', 'REFERENCE_TO_CHECK',
]);
const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;

export const SeedSchema = z.object({
  class: z.object({
    name: z.string(),
    semester: z.string(),
    academic_year: z.string().nullable(),
    timezone: z.string(),
    source_status: Status,
  }),
  breaks: z.array(z.object({ start_time: HHMM, end_time: HHMM, label: z.string() })),
  courses: z.array(z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    credits_sks: z.number().int().positive(),
    aliases: z.array(z.string()),
    source_status: Status,
  })),
  schedule_entries: z.array(z.object({
    weekday: z.enum(WEEKDAYS),
    start_time: HHMM,
    end_time: HHMM,
    course_code: z.string(),
    room: z.string().nullable(),
    lecturer_assignment: z.string().nullable(),
    source_status: Status,
  })),
  lecturer_associations: z.array(z.object({
    course_code: z.string(),
    raw_name: z.string().min(1),
    verification_status: Status,
    assigns_to_every_session: z.boolean(),
  })),
  official_references: z.array(z.object({ label: z.string(), url: z.string().url(), status: Status })),
}).passthrough();

export type ClassSeed = z.infer<typeof SeedSchema>;

/**
 * Normalisasi ejaan yang DIDUKUNG BUKTI: nama mata kuliah dari owner (master prompt)
 * menulis "Persepsi Sensori". Nama asli tetap disimpan sebagai originalName.
 */
const COURSE_NAME_NORMALIZATION: Record<string, string> = {
  KDW: 'Keperawatan Dewasa Sistem Muskuloskeletal, Integumen, Persepsi Sensori dan Persyarafan',
};

export function normalizedCourseName(code: string, original: string): string {
  return COURSE_NAME_NORMALIZATION[code] ?? original;
}

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Validasi semantik di luar skema. Mengembalikan daftar error (kosong = valid). */
export function validateSeed(seed: ClassSeed): string[] {
  const errors: string[] = [];
  const codes = new Set(seed.courses.map((c) => c.code));
  if (codes.size !== seed.courses.length) errors.push('Kode mata kuliah duplikat');

  const slotKeys = new Set<string>();
  for (const e of seed.schedule_entries) {
    if (!codes.has(e.course_code)) errors.push(`Slot ${e.weekday} ${e.start_time}: course ${e.course_code} tidak dikenal`);
    if (toMin(e.end_time) <= toMin(e.start_time)) errors.push(`Slot ${e.weekday} ${e.start_time}: jam selesai <= mulai`);
    const k = `${e.weekday}|${e.start_time}`;
    if (slotKeys.has(k)) errors.push(`Slot duplikat ${k}`);
    slotKeys.add(k);
    for (const b of seed.breaks) {
      if (toMin(e.start_time) < toMin(b.end_time) && toMin(b.start_time) < toMin(e.end_time)) {
        errors.push(`Slot ${k} bertabrakan dengan ${b.label}`);
      }
    }
  }
  for (const l of seed.lecturer_associations) {
    if (!codes.has(l.course_code)) errors.push(`Dosen ${l.raw_name}: course ${l.course_code} tidak dikenal`);
  }
  return errors;
}

export function parseSeed(json: unknown): ClassSeed {
  const seed = SeedSchema.parse(json);
  const errs = validateSeed(seed);
  if (errs.length) throw new Error(`Seed tidak valid: ${errs.join('; ')}`);
  return seed;
}
