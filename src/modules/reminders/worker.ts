import type { PrismaClient } from '@prisma/client';
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
  constructor(private db: PrismaClient, private outbound: OutboundGate, private legacy: () => CustomReminderItem[]) {}
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
  async status() {
    const counts = await this.db.reminder.groupBy({ by: ['status'], _count: true });
    const paused = await this.db.botSetting.findUnique({ where: { key: 'reminders.paused' } });
    return [paused?.value === true ? 'Pengiriman dijeda.' : 'Pengiriman aktif.', ...counts.map(c => c.status + ': ' + c._count)].join('\n');
  }
  async tick(now = new Date()) {
    if (this.running) return;
    this.running = true;
    try {
      await this.importLegacy();
      if ((await this.db.botSetting.findUnique({ where: { key: 'reminders.paused' } }))?.value === true) return;
      const jobs = await this.db.reminder.findMany({ where: { status: 'scheduled', paused: false, fireAt: { lte: now } }, orderBy: { fireAt: 'asc' }, take: 10 });
      for (const job of jobs) {
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
