import type { AssignmentItem, FunAndUtilityService } from '../fun/fun-utility-service.js';
import type { OutboundGate } from '../../whatsapp/outbound/gate.js';
import { taskCard } from './assignment-format.js';

export interface DeadlineNotice {
  id: string;
  taskId: string;
  revision: number;
  kind: 'baru' | 'h3' | 'h2' | 'h1' | 'h0';
  day?: string; // Tanggal WIB untuk satu pengingat harian.
  sendAt: number;
  delivery: 'queued' | 'sending' | 'delivered' | 'uncertain' | 'failed';
  share: 'pending' | 'sending' | 'sent' | 'rejected' | 'uncertain';
  target?: string;
  attempts: number;
  retryAt?: number;
}

const DAY = 86_400_000;
export function jakartaDay(time: number) {
  return new Date(time + 7 * 3_600_000).toISOString().slice(0, 10);
}
export function deadlineEnd(t: AssignmentItem) {
  return t.dueDateIso ? +new Date(t.dueDateIso + 'T' + (t.dueTime ?? '23:59') + ':59.999+07:00') : Infinity;
}

export function buildNotices(t: AssignmentItem, now: number, includeNew: boolean): DeadlineNotice[] {
  if (now > deadlineEnd(t)) return [];
  const revision = t.revision ?? 1;
  const make = (kind: DeadlineNotice['kind'], sendAt: number, day?: string): DeadlineNotice => ({
    id: t.id + '.' + revision + '.' + kind, taskId: t.id, revision, kind, day, sendAt,
    delivery: 'queued', share: 'pending', attempts: 0,
  });
  if (!t.dueDateIso) return includeNew ? [make('baru', now)] : [];

  const dueTime = Date.parse(t.dueDateIso + 'T' + (t.dueTime ?? '09:00') + ':00+07:00');
  if (!Number.isFinite(dueTime)) return includeNew ? [make('baru', now)] : [];
  const today = jakartaDay(now);
  const notices: DeadlineNotice[] = [];
  const beforeFinalHour = Boolean(t.dueTime && today === t.dueDateIso && now < dueTime);
  if (includeNew && (today < jakartaDay(dueTime - 3 * DAY) || beforeFinalHour)) notices.push(make('baru', now));
  for (const [offset, kind] of [[3,'h3'], [2,'h2'], [1,'h1'], [0,'h0']] as const) {
    const scheduled = dueTime - offset * DAY;
    const day = jakartaDay(scheduled);
    if (day < today) continue;
    // Tugas baru di dalam jendela pengingat langsung diberitahukan sekali hari itu.
    const sendAt = day === today && includeNew && !beforeFinalHour ? now : scheduled;
    notices.push(make(kind, sendAt, day));
  }
  return notices;
}

export function noticeCurrent(job: DeadlineNotice, task: AssignmentItem, now: Date) {
  if (job.sendAt > +now || +now > deadlineEnd(task)) return false;
  if (job.kind !== 'baru') return job.day === jakartaDay(+now);
  if (!task.dueDateIso) return true;
  const today = jakartaDay(+now);
  if (task.dueTime && today === task.dueDateIso && jakartaDay(job.sendAt) === today) {
    return +now < Date.parse(task.dueDateIso + 'T' + task.dueTime + ':00+07:00');
  }
  return today < jakartaDay(Date.parse(task.dueDateIso + 'T12:00:00+07:00') - 3 * DAY);
}
export function noticeBody(job:DeadlineNotice,t:AssignmentItem,now:Date) {
  const dateToday = new Date(+now+7*3600_000).toISOString().slice(0,10);
  const days = (Date.parse(t.dueDateIso) - Date.parse(dateToday))/86400_000;
  const heading = job.kind === 'baru' ? 'Tenggat baru' : days === 0 ? 'Deadline hari ini' : 'Pengingat H−' + Math.max(0,days);
  return '*' + heading + '*\n\n' + taskCard(t);
}
export class DeadlineNotifier {
  private busy = false;
  constructor(private fun:FunAndUtilityService, private outbound:OutboundGate, private owner:string) {}
  get processing() { return this.busy; }
  async tick(now:Date) {
    if (this.busy) return;
    this.busy=true;
    try {
      let attempted = 0;
      for (const candidate of this.fun.activeNotices().filter(j=>j.share==='pending' && j.delivery==='queued' && Math.max(j.sendAt,j.retryAt??0)<=+now).sort((a,b)=>a.sendAt-b.sendAt)) {
        const job=this.fun.activeNotices().find(j=>j.id===candidate.id);
        if (!job || job.share!=='pending' || job.delivery!=='queued') continue;
        const task = this.fun.noticeTask(job);
        if (!task) continue;
        if (!noticeCurrent(job, task, now)) {
          this.fun.saveNotice({...job,share:'rejected'});
          continue;
        }
        if (attempted++ >= 10) break;
        this.fun.saveNotice({...job,delivery:'sending',attempts:job.attempts+1});
        const instruction = task.dueDateIso ? '' : 'Tanggal belum jelas. Lengkapi dengan .tugas deadline ' + task.id + ' YYYY-MM-DD [HH:mm].';
        const text = [noticeBody(job,task,now),instruction,'Khusus Hedy. Pilih grup dengan .tugas grup, lalu .tugas tujuan ' + job.id + ' <grup>.', 'Untuk melewati pemberitahuan ini: .tugas tolak ' + job.id].filter(Boolean).join('\n\n');
        const res = await this.outbound.send({chatJid:this.owner,text,idempotencyKey:'deadline-owner:' + job.id});
        const current = this.fun.activeNotices().find(j=>j.id===job.id);
        if (!current) continue;
        const delivered = res.ok && !res.dryRun;
        this.fun.saveNotice({...current,delivery:delivered ? 'delivered' : res.error==='send_failed' ? 'uncertain' : current.attempts>=3 ? 'failed' : 'queued',retryAt:+now+60_000});
      }
    } finally { this.busy=false; }
  }
}
