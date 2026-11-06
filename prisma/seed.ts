/**
 * Seed idempotent Semester 5A dari data/class-5a.seed.json.
 * Menggunakan upsert sehingga aman dijalankan berulang.
 * Tidak menggabungkan variasi nama dosen dan tidak menetapkan dosen per sesi.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { normalizedCourseName, parseSeed } from '../src/database/seed-schema.js';

const ROLES: Array<[string, string]> = [
  ['owner', 'Owner'], ['admin', 'Admin'], ['ketua', 'Ketua Kelas'], ['sekretaris', 'Sekretaris'],
  ['bendahara', 'Bendahara'], ['wali_kelas', 'Wali Kelas'], ['member', 'Anggota'],
];

async function main() {
  const prisma = new PrismaClient();
  const seed = parseSeed(JSON.parse(readFileSync(resolve('data/class-5a.seed.json'), 'utf8')));
  try {
    for (const [key, label] of ROLES) {
      await prisma.role.upsert({ where: { key }, update: { label }, create: { key, label } });
    }

    const cls = await prisma.class.upsert({
      where: { name: seed.class.name },
      update: { semester: seed.class.semester, timezone: seed.class.timezone },
      create: {
        name: seed.class.name, semester: seed.class.semester, academicYear: seed.class.academic_year,
        timezone: seed.class.timezone, sourceStatus: seed.class.source_status,
      },
    });

    const courseIds = new Map<string, string>();
    for (const c of seed.courses) {
      const data = {
        originalName: c.name, normalizedName: normalizedCourseName(c.code, c.name),
        creditsSks: c.credits_sks, aliases: c.aliases, sourceStatus: c.source_status,
      };
      const row = await prisma.course.upsert({
        where: { classId_code: { classId: cls.id, code: c.code } },
        update: data,
        create: { classId: cls.id, code: c.code, ...data },
      });
      courseIds.set(c.code, row.id);
    }

    for (const s of seed.schedule_entries) {
      const courseId = courseIds.get(s.course_code)!;
      await prisma.schedule.upsert({
        where: { classId_weekday_startTime: { classId: cls.id, weekday: s.weekday, startTime: s.start_time } },
        update: { courseId, endTime: s.end_time, room: s.room, sourceStatus: s.source_status },
        create: {
          classId: cls.id, courseId, weekday: s.weekday, startTime: s.start_time,
          endTime: s.end_time, room: s.room, sourceStatus: s.source_status,
        },
      });
    }

    for (const l of seed.lecturer_associations) {
      const lec = await prisma.lecturer.upsert({
        where: { originalName: l.raw_name },
        update: {},
        create: { originalName: l.raw_name, normalizedName: null, verificationStatus: l.verification_status },
      });
      const courseId = courseIds.get(l.course_code)!;
      await prisma.courseLecturer.upsert({
        where: { courseId_lecturerId: { courseId, lecturerId: lec.id } },
        update: { verificationStatus: l.verification_status, assignsToEverySession: l.assigns_to_every_session },
        create: {
          courseId, lecturerId: lec.id, verificationStatus: l.verification_status,
          assignsToEverySession: l.assigns_to_every_session,
        },
      });
    }

    await prisma.botSetting.upsert({
      where: { key: 'outbound.emergency_stop' }, update: {}, create: { key: 'outbound.emergency_stop', value: false },
    });
    await prisma.botSetting.upsert({
      where: { key: 'announcements.delivery_mode' }, update: {}, create: { key: 'announcements.delivery_mode', value: 'approval_required' },
    });

    const counts = {
      courses: await prisma.course.count({ where: { classId: cls.id } }),
      schedules: await prisma.schedule.count({ where: { classId: cls.id } }),
      lecturers: await prisma.lecturer.count(),
      courseLecturers: await prisma.courseLecturer.count(),
    };
    console.log('Seed selesai:', counts);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('Seed gagal:', e instanceof Error ? e.message : e);
  process.exit(1);
});
