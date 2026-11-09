import { createHash, randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import { ScheduleService } from './service.js';
import type { ClassSeed } from '../../database/seed-schema.js';

type Writer = Pick<Prisma.TransactionClient, 'class' | 'schedule'>;
async function loadClass(db: Writer, name: string) {
  return db.class.findUniqueOrThrow({ where: { name }, include: {
    courses: { orderBy: { code: 'asc' }, include: { lecturers: { include: { lecturer: true } } } },
    schedules: { orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }], include: { exceptions: { orderBy: { date: 'asc' } } } },
  } });
}
type ClassRecord = Awaited<ReturnType<typeof loadClass>>;
type Day = ClassSeed['schedule_entries'][number]['weekday'];
export type ScheduleAction = 'schedule.add' | 'schedule.edit' | 'schedule.delete' | 'schedule.reset';
export interface ScheduleChange {
  action: ScheduleAction;
  input: string;
  version: string;
}
class InvalidChange extends Error {}

const dayNames = 'senin|selasa|rabu|kamis|jumat|sabtu|minggu';
const day = (s: string) => {
  const result = ScheduleService.resolveWeekday(s);
  if (!result) throw new InvalidChange('Hari harus salah satu dari ' + dayNames.replaceAll('|', ', ') + '.');
  return result;
};
function time(s: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) throw new InvalidChange('Gunakan waktu WIB dalam format HH:mm.');
  return s;
}
const syntax: Record<ScheduleAction,string> = {
  'schedule.add': '.tambahjadwal hari|mulai|selesai|kode matkul|ruang',
  'schedule.edit': '.editjadwal hari lama|mulai lama|hari baru|mulai baru|selesai baru|kode matkul|ruang',
  'schedule.delete': '.hapusjadwal hari|mulai',
  'schedule.reset': '.resetjadwal',
};
type Slot = { courseId: string; weekday: Day; startTime: string; endTime: string; room: string | null };
function version(cls: ClassRecord) {
  return createHash('sha256').update(JSON.stringify([cls.schedules, cls.courses.map(c => [c.id,c.code])])).digest('hex');
}
function plan(cls: ClassRecord, base: ClassSeed, action: ScheduleAction, input: string) {
  const parts = input ? input.split('|').map(s=>s.trim()) : [];
  const offset = action === 'schedule.edit' ? 2 : 0;
  if (action === 'schedule.reset') {
    if (parts.length) throw new InvalidChange('Gunakan ' + syntax[action]);
    const slots = base.schedule_entries.map(e => {
      const course = cls.courses.find(c => c.code === e.course_code);
      if (!course) throw new InvalidChange('Kode mata kuliah seed belum tersedia: ' + e.course_code);
      return { courseId:course.id, weekday:e.weekday, startTime:e.start_time, endTime:e.end_time, room:e.room, sourceStatus:e.source_status };
    });
    return { summary:'Pulihkan ' + slots.length + ' sesi mingguan dari seed. ' + cls.schedules.length + ' sesi saat ini dan seluruh pengecualian tanggalnya akan diganti.', reset:slots };
  }
  const deleting = action === 'schedule.delete';
  if (deleting ? parts.length !== 2 : parts.length < offset+4 || parts.length > offset+5) throw new InvalidChange('Gunakan ' + syntax[action]);
  const old = action !== 'schedule.add' ? cls.schedules.find(s => s.weekday === day(parts[0]!) && s.startTime === time(parts[1]!)) : undefined;
  if (!old && action !== 'schedule.add') throw new InvalidChange('Slot jadwal asal tidak ditemukan.');
  if (deleting) return { old, summary:'Hapus sesi ' + parts.join(' ') + ' beserta ' + old!.exceptions.length + ' pengecualian tanggal.' };
  const course = cls.courses.find(c => c.code.toLowerCase() === parts[offset+3]!.toLowerCase());
  if (!course) throw new InvalidChange('Kode mata kuliah tidak ditemukan. Periksa .matkul.');
  const slot: Slot = { weekday: day(parts[offset]!), startTime: time(parts[offset+1]!), endTime: time(parts[offset+2]!), courseId: course.id,
    room: parts.length === offset+5 ? parts[offset+4] || null : old?.room ?? null };
  if (slot.endTime <= slot.startTime) throw new InvalidChange('Jam selesai harus sesudah jam mulai.');
  if (base.breaks.some(b => b.start_time < slot.endTime && b.end_time > slot.startTime)) throw new InvalidChange('Slot bertabrakan dengan waktu istirahat kelas.');
  if (cls.schedules.some(s => s.id !== old?.id && s.weekday === slot.weekday && s.startTime < slot.endTime && slot.startTime < s.endTime)) throw new InvalidChange('Slot bertabrakan dengan kuliah lain.');
  if (old?.exceptions.length && (slot.weekday !== old.weekday || slot.startTime !== old.startTime || slot.endTime !== old.endTime || slot.courseId !== old.courseId)) throw new InvalidChange('Slot memiliki pengecualian tanggal. Periksa pengecualian sebelum mengubah waktu atau mata kuliah.');
  return { slot, old, summary:(old ? 'Ubah ' + parts.slice(0,2).join(' ') + ' menjadi' : 'Tambahkan') + ' ' + parts[offset] + ' ' + slot.startTime + '–' + slot.endTime + ' WIB · ' + course.normalizedName + ' · ' + (slot.room ?? 'ruang belum ditentukan') };
}

export class ScheduleDatabase {
  constructor(private db: PrismaClient, private name: string, private base: ClassSeed) {}
  async read() {
    const cls = await loadClass(this.db,this.name);
    const courses = new Map(cls.courses.map(c => [c.id,c.code]));
    const data: ClassSeed = {
      ...this.base, class: { name:cls.name, semester:cls.semester, timezone:cls.timezone, source_status:cls.sourceStatus, academic_year:cls.academicYear },
      courses:cls.courses.map(c=>({code:c.code,name:c.originalName,credits_sks:c.creditsSks,aliases:c.aliases,source_status:c.sourceStatus})),
      lecturer_associations:cls.courses.flatMap(c=>c.lecturers.map(l=>({course_code:c.code,raw_name:l.lecturer.originalName,verification_status:l.verificationStatus,assigns_to_every_session:l.assignsToEverySession}))),
      schedule_entries:cls.schedules.map(s=>({weekday:s.weekday,start_time:s.startTime,end_time:s.endTime,course_code:courses.get(s.courseId)!,room:s.room,lecturer_assignment:null,source_status:s.sourceStatus})),
    };
    const exceptions = cls.schedules.flatMap(s=>s.exceptions.map(e=>({
      weekday:s.weekday,startTime:s.startTime,date:e.date,kind:e.kind,newStart:e.newStart ?? undefined,newEnd:e.newEnd ?? undefined,
      newRoom:e.newRoom ?? undefined,note:e.note ?? undefined,approvedBy:e.approvedBy ?? '',
    })));
    return { data, exceptions };
  }
  async preview(action: ScheduleAction,input: string) {
    const cls = await loadClass(this.db,this.name);
    const { summary } = plan(cls,this.base,action,input);
    return { summary, change:{action,input,version:version(cls)} };
  }
  async apply(change: ScheduleChange,actor: string) {
    return this.db.$transaction(async tx=>{
      const cls = await loadClass(tx,this.name);
      if (version(cls) !== change.version) throw new InvalidChange('Jadwal berubah sejak pratinjau. Jalankan perintah lagi.');
      const p = plan(cls,this.base,change.action,change.input);
      await tx.botSetting.upsert({where:{key:'schedule.initialized.' + cls.id},update:{},create:{key:'schedule.initialized.' + cls.id,value:true}});
      const backup = 'schedule.backup.' + randomUUID();
      await tx.botSetting.create({data:{key:backup,updatedBy:actor,value:{ classId:cls.id, schedules:JSON.parse(JSON.stringify(cls.schedules)) }}});
      if (p.reset) {
        await tx.schedule.deleteMany({where:{classId:cls.id}});
        await tx.schedule.createMany({data:p.reset.map(s=>({...s,classId:cls.id}))});
      } else if (p.slot && p.old) await tx.schedule.update({where:{id:p.old.id},data:{...p.slot,sourceStatus:'VERIFIED'}});
      else if (p.slot) await tx.schedule.create({data:{...p.slot,classId:cls.id,sourceStatus:'VERIFIED'}});
      else await tx.schedule.delete({where:{id:p.old!.id}});
      await tx.auditLog.create({data:{actor,action:change.action,target:cls.id,result:'ok',payload:{backup}}});
      return backup;
    },{isolationLevel:'Serializable'});
  }
  static failure(error: unknown) {
    return error instanceof InvalidChange ? error.message : 'Database belum dapat memproses jadwal. Periksa .db status dan coba kembali.';
  }
}
