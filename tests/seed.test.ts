import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizedCourseName, parseSeed, SeedSchema, validateSeed } from '../src/database/seed-schema.js';

const raw = JSON.parse(readFileSync('data/class-5a.seed.json', 'utf8'));

describe('seed Semester 5A', () => {
  const seed = parseSeed(raw);

  it('identitas kelas', () => {
    expect(seed.class.name).toBe('Nursing Class A');
    expect(seed.class.semester).toBe('5A');
    expect(seed.class.timezone).toBe('Asia/Jakarta');
    expect(seed.class.academic_year).toBeNull();
  });

  it('tepat 15 slot, 3 per hari Senin–Jumat', () => {
    expect(seed.schedule_entries).toHaveLength(15);
    for (const d of ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']) {
      expect(seed.schedule_entries.filter((s) => s.weekday === d)).toHaveLength(3);
    }
  });

  it('jadwal sesuai data owner', () => {
    const slot = (d: string, t: string) => seed.schedule_entries.find((s) => s.weekday === d && s.start_time === t)?.course_code;
    expect(slot('MONDAY', '08:00')).toBe('METPEN');
    expect(slot('MONDAY', '09:40')).toBe('KAST');
    expect(slot('MONDAY', '12:30')).toBe('KMA');
    expect(slot('TUESDAY', '08:00')).toBe('KAK');
    expect(slot('TUESDAY', '09:40')).toBe('ENT2');
    expect(slot('TUESDAY', '12:30')).toBe('METPEN');
    expect(slot('WEDNESDAY', '08:00')).toBe('GERO');
    expect(slot('WEDNESDAY', '09:40')).toBe('KDW');
    expect(slot('WEDNESDAY', '12:30')).toBe('KMA');
    expect(slot('THURSDAY', '08:00')).toBe('ENT2');
    expect(slot('THURSDAY', '09:40')).toBe('METPEN');
    expect(slot('THURSDAY', '12:30')).toBe('GERO');
    expect(slot('FRIDAY', '08:00')).toBe('GERO');
    expect(slot('FRIDAY', '09:40')).toBe('KDW');
    expect(slot('FRIDAY', '12:30')).toBe('ENT2');
  });

  it('SKS sesuai data owner', () => {
    const sks = Object.fromEntries(seed.courses.map((c) => [c.code, c.credits_sks]));
    expect(sks).toEqual({ METPEN: 4, KAST: 2, KMA: 3, KAK: 2, ENT2: 4, GERO: 4, KDW: 3 });
  });

  it('istirahat 11:20–12:30 kosong', () => {
    expect(seed.breaks[0]).toMatchObject({ start_time: '11:20', end_time: '12:30' });
  });

  it('dosen tidak ditetapkan per sesi dan semua pending konfirmasi', () => {
    expect(seed.lecturer_associations.length).toBe(32);
    expect(seed.lecturer_associations.every((l) => !l.assigns_to_every_session)).toBe(true);
    expect(seed.schedule_entries.every((s) => s.lecturer_assignment === null)).toBe(true);
  });

  it('normalisasi nama KDW menyimpan original', () => {
    const kdw = seed.courses.find((c) => c.code === 'KDW')!;
    expect(kdw.name).toContain('Persepsisensori');
    expect(normalizedCourseName('KDW', kdw.name)).toContain('Persepsi Sensori');
    expect(normalizedCourseName('METPEN', 'Metodologi Penelitian')).toBe('Metodologi Penelitian');
  });

  it('validasi mendeteksi slot yang menabrak istirahat dan course tak dikenal', () => {
    const bad = SeedSchema.parse(structuredClone(raw));
    bad.schedule_entries.push({
      weekday: 'MONDAY', start_time: '11:00', end_time: '12:00', course_code: 'XXX',
      room: null, lecturer_assignment: null, source_status: 'USER_PROVIDED_PENDING_CONFIRMATION',
    });
    const errs = validateSeed(bad);
    expect(errs.some((e) => e.includes('Istirahat'))).toBe(true);
    expect(errs.some((e) => e.includes('XXX'))).toBe(true);
  });
});
