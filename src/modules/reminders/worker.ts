import { deadlineFromQuote } from '../academic/task-intake.js';
import { toJakartaParts } from '../schedule/service.js';
import type { FunAndUtilityService } from '../fun/fun-utility-service.js';
import type { PrismaClient, Reminder } from '@prisma/client';
import type { OutboundGate } from '../../whatsapp/outbound/gate.js';
import type { CustomReminderItem } from '../fun/fun-utility-service.js';

export function reminderTime(input: string) {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(input)) return null;
  const date = new Date(input.replace(' ', 'T') + ':00+07:00');
  if (!Number.isFinite(+date)) return null;
  return new Date(+date + 7 * 3600_000).toISOString().slice(0, 16) === input.replace(' ', 'T') ? date : null;
}

export class ReminderWorker {
  private running = false;
  private imported = false;
  constructor(private db: PrismaClient, private outbound: OutboundGate, private legacy: () => CustomReminderItem[], private tasks?: FunAndUtilityService) {}
  async importLegacy() {
    if (this.imported) return;
    for (const old of this.legacy()) {
      const date = reminderTime(old.whenIso);
      if (!date) continue;
      const idempotencyKey = 'legacy:' + old.targetJid + ':' + old.id;
      await this.db.reminder.upsert({ where: { idempotencyKey }, update: {}, create: {
        id: old.id, idempotencyKey, text: old.title, targetJid: old.targetJid, fireAt: new Date(+date + (old.snoozedMinutes ?? 0) * 60_000),
      } });
    }
    this.imported = true;
  }
  async command(chat: string, key: string, sub: string, args: string) {
    await this.importLegacy();
    if (sub === 'add' || sub === 'tambah') {
      const [when, title] = args.split('|').map(s => s.trim());
      const date = reminderTime(when ?? '');
      if (!date || !title) return 'Gunakan .reminder add YYYY-MM-DD HH:mm|judul (WIB).';
      const idempotencyKey = 'wa:' + chat + ':' + key;
      const job = await this.db.reminder.upsert({ where: { idempotencyKey }, update: {}, create: {
        idempotencyKey, targetJid: chat, text: title, fireAt: date,
      } });
      return '⏰ Pengingat tersimpan. ID ' + job.id;
    }
    if (['delete', 'del', 'hapus', 'snooze'].includes(sub)) {
      const [id, delay] = args.split(/\s+/);
      const job = await this.db.reminder.findFirst({ where: { id, targetJid: chat, status: 'scheduled' } });
      if (!id || !job) return 'Pengingat aktif tidak ditemukan di chat ini.';
      const minutes = Number(delay ?? 15);
      if (sub === 'snooze' && (!Number.isInteger(minutes) || minutes < 1 || minutes > 10080)) return 'Masukkan 1–10080 menit.';
      const result = await this.db.reminder.updateMany({ where: { id, targetJid: chat, status: 'scheduled' },
        data: sub === 'snooze' ? { fireAt: new Date(+job.fireAt + minutes * 60_000) } : { status: 'cancelled' } });
      return result.count ? '✅ Pengingat diperbarui.' : 'Pengingat sudah diproses.';
    }
    const jobs = await this.db.reminder.findMany({ where: { targetJid: chat, status: 'scheduled' }, orderBy: { fireAt: 'asc' }, take: 30 });
    return '⏰ *Pengingat chat ini*\n' + (jobs.map(j => j.id + ' · ' + j.fireAt.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB\n' + j.text).join('\n\n') || 'Belum ada pengingat.');
  }
  async pause(paused: boolean) {
    await this.db.botSetting.upsert({ where: { key: 'reminders.paused' }, update: { value: paused }, create: { key: 'reminders.paused', value: paused } });
  }
  async isPaused() { return (await this.db.botSetting.findUnique({where:{key:'reminders.paused'}}))?.value === true; }
  async status() {
    const counts = await this.db.reminder.groupBy({ by: ['status'], _count: true });
    const paused = await this.db.botSetting.findUnique({ where: { key: 'reminders.paused' } });
    return [paused?.value === true ? 'Pengiriman dijeda.' : 'Pengiriman aktif.', ...counts.map(c => c.status + ': ' + c._count)].join('\n');
  }
  private async adoptDeadline(job:Reminder, now:Date) {
    if (!this.tasks) return;
    if (job.status!=='deadline_intake') {
      const claim=await this.db.reminder.updateMany({where:{id:job.id,status:'scheduled',paused:false,fireAt:job.fireAt},data:{status:'deadline_intake'}});
      if (!claim.count) return;
    }
    const key='reminder:'+job.idempotencyKey;
    if (!this.tasks.hasTaskSource(key)) {
      const assignment=job.refType==='assignment' && job.refId ? await this.db.assignment.findUnique({where:{id:job.refId}}) : undefined;
      if (assignment && ['completed','done','cancelled'].includes(assignment.status)) {
        await this.db.reminder.updateMany({where:{id:job.id,status:'deadline_intake'},data:{status:'cancelled'}});
        return;
      }
      const known=assignment ? toJakartaParts(assignment.dueAt) : undefined;
      const extracted=deadlineFromQuote(job.text,job.createdAt);
      this.tasks.addAssignment({sourceKey:key,sourceChat:job.targetJid,detected:true,createdBy:'scheduler',course:'',title:assignment?.title ?? job.text,kind:assignment?'tugas':'deadline',
        dueDateIso:known?.dateIso ?? extracted?.date ?? '',dueTime:known?.hhmm ?? extracted?.time,now,
        description:'Dari pengingat lama. Jadwal pengingat sebelumnya: '+job.fireAt.toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})+' WIB.'});
    }
    await this.db.reminder.updateMany({where:{id:job.id,status:'deadline_intake'},data:{status:'awaiting_owner'}});
  }
  async tick(now = new Date()) {
    if (this.running) return;
    this.running = true;
    try {
      await this.importLegacy();
      if ((await this.db.botSetting.findUnique({ where: { key: 'reminders.paused' } }))?.value === true) return;
      if (this.tasks) {
        const legacyDeadlines=await this.db.$queryRaw<Reminder[]>`
          SELECT * FROM "Reminder" WHERE NOT "paused" AND
            ("status"='deadline_intake' OR ("status"='scheduled' AND
              ("refType"='assignment' OR (("refType" IS NULL OR "refType"='custom') AND
                "text" ~* '(^|[^[:alnum:]_])(tugas|deadline|tenggat|pengumpulan)($|[^[:alnum:]_])'))))
          ORDER BY "fireAt", "id" LIMIT 50`;
        for (const job of legacyDeadlines) await this.adoptDeadline(job,now);
      }
      const jobs = await this.db.reminder.findMany({ where: { status: 'scheduled', paused: false, fireAt: { lte: now } }, orderBy: { fireAt: 'asc' }, take: 10 });
      for (const job of jobs) {
        if (this.tasks && (job.refType==='assignment' || ((!job.refType || job.refType==='custom') && /\b(tugas|deadline|tenggat|pengumpulan)\b/i.test(job.text)))) { await this.adoptDeadline(job,now); continue; }
        const claim = await this.db.reminder.updateMany({ where: { id: job.id, status: 'scheduled', fireAt: job.fireAt, paused: false },
          data: { status: 'sending', attempts: { increment: 1 } } });
        if (!claim.count) continue;
        // Bila proses mati setelah klaim, status sending perlu diperiksa sebelum dikirim ulang.
        const res = await this.outbound.send({ chatJid: job.targetJid, text: '⏰ ' + job.text, idempotencyKey: job.idempotencyKey });
        const success = res.ok && !res.dryRun;
        const uncertain = res.error === 'send_failed';
        await this.db.reminder.update({ where: { id: job.id }, data: { status: success ? 'sent' : uncertain ? 'needs_review' : job.attempts >= 2 ? 'failed' : 'scheduled',
          sentAt: success ? now : null, lastError: success ? null : 'delivery_failed' } });
      }
    } finally { this.running = false; }
  }
}
