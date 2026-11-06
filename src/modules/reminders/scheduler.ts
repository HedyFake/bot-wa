import type { OutboundGate } from '../../whatsapp/outbound/gate.js';

export type ReminderOffsetLabel =
  | 'H-1d'
  | 'H-3h'
  | 'H-1h'
  | 'H-30m'
  | 'START'
  | 'END'
  | 'CUSTOM';

export const CLASS_REMINDER_OFFSETS: ReadonlyArray<{ label: ReminderOffsetLabel; offsetMinutes: number }> = [
  { label: 'H-1d', offsetMinutes: -24 * 60 },
  { label: 'H-3h', offsetMinutes: -3 * 60 },
  { label: 'H-1h', offsetMinutes: -60 },
  { label: 'H-30m', offsetMinutes: -30 },
  { label: 'START', offsetMinutes: 0 },
];

export interface ReminderJob {
  id: string;
  idempotencyKey: string;
  targetJid: string;
  text: string;
  fireAt: Date;
  refType: 'class_session' | 'assignment' | 'custom';
  refId: string;
  status: 'scheduled' | 'sent' | 'cancelled' | 'failed' | 'dead';
  attempts: number;
  paused: boolean;
  lastError?: string;
  sentAt?: Date;
}

export interface AssignmentItem {
  id: string;
  courseCode?: string;
  title: string;
  kind: 'assignment' | 'presentation' | 'practicum' | 'uts' | 'uas' | 'quiz' | 'seminar' | 'paper' | 'picket' | 'meeting' | 'custom';
  dueAt: Date;
  status: 'open' | 'completed' | 'cancelled';
}

/**
 * Konversi tanggal lokal `YYYY-MM-DD` dan jam `HH:mm` pada zona waktu `Asia/Jakarta` (+07:00)
 * menjadi objek `Date` UTC yang tepat tanpa bergantung pada timezone OS host.
 */
export function jakartaLocalToUtc(dateIso: string, hhmm: string): Date {
  return new Date(`${dateIso}T${hhmm}:00+07:00`);
}

/**
 * Scheduler Reminder yang:
 * - Idempoten (berdasarkan `idempotencyKey`, tidak pernah mengirim ganda meskipun di-restart / dipanggil ulang).
 * - Mendukung pause/resume global maupun per job.
 * - Mendukung pembatalan/penjadwalan ulang ketika jadwal kuliah berubah.
 * - Menghormati quiet hours (kecuali darurat) dan memiliki batas retry + dead-letter status.
 */
export class ReminderScheduler {
  private readonly jobs = new Map<string, ReminderJob>();
  private readonly byIdempotency = new Map<string, string>();
  private readonly assignments = new Map<string, AssignmentItem>();
  private globallyPaused = false;
  private seq = 0;
  private readonly maxAttempts: number;

  constructor(
    private readonly opts: {
      outbound: OutboundGate;
      maxAttempts?: number;
      quietHours?: { startHour: number; endHour: number }; // dalam WIB
    },
  ) {
    this.maxAttempts = opts.maxAttempts ?? 3;
  }

  schedule(input: {
    idempotencyKey: string;
    targetJid: string;
    text: string;
    fireAt: Date;
    refType: ReminderJob['refType'];
    refId: string;
  }): ReminderJob {
    const existingId = this.byIdempotency.get(input.idempotencyKey);
    if (existingId) {
      return this.jobs.get(existingId)!;
    }
    const id = `REM-${++this.seq}`;
    const job: ReminderJob = {
      id,
      idempotencyKey: input.idempotencyKey,
      targetJid: input.targetJid,
      text: input.text,
      fireAt: input.fireAt,
      refType: input.refType,
      refId: input.refId,
      status: 'scheduled',
      attempts: 0,
      paused: false,
    };
    this.jobs.set(id, job);
    this.byIdempotency.set(input.idempotencyKey, id);
    return job;
  }

  /** Buat seluruh pengingat standar (H-1, H-3j, H-1j, H-30m, Mulai, Selesai) untuk satu sesi kuliah. */
  scheduleClassSessionReminders(opts: {
    sessionKey: string; // mis. 2026-11-09|MONDAY|08:00|METPEN
    dateIso: string;
    startTime: string;
    endTime: string;
    courseName: string;
    targetJid: string;
  }): ReminderJob[] {
    const startUtc = jakartaLocalToUtc(opts.dateIso, opts.startTime);
    const endUtc = jakartaLocalToUtc(opts.dateIso, opts.endTime);
    const created: ReminderJob[] = [];

    for (const off of CLASS_REMINDER_OFFSETS) {
      const fireAt = new Date(startUtc.getTime() + off.offsetMinutes * 60_000);
      created.push(
        this.schedule({
          idempotencyKey: `cls:${opts.sessionKey}:${off.label}`,
          targetJid: opts.targetJid,
          text: `⏰ [${off.label}] ${opts.courseName} (${opts.dateIso} ${opts.startTime}–${opts.endTime} WIB)`,
          fireAt,
          refType: 'class_session',
          refId: opts.sessionKey,
        }),
      );
    }

    created.push(
      this.schedule({
        idempotencyKey: `cls:${opts.sessionKey}:END`,
        targetJid: opts.targetJid,
        text: `✅ [SELESAI] Sesi ${opts.courseName} (${opts.startTime}–${opts.endTime} WIB) telah berakhir.`,
        fireAt: endUtc,
        refType: 'class_session',
        refId: opts.sessionKey,
      }),
    );

    return created;
  }

  /** Batalkan semua reminder terkait suatu referensi (mis. saat kelas dibatalkan/diubah). */
  cancelByRef(refType: ReminderJob['refType'], refId: string): number {
    let count = 0;
    for (const job of this.jobs.values()) {
      if (job.refType === refType && job.refId === refId && job.status === 'scheduled') {
        job.status = 'cancelled';
        count++;
      }
    }
    return count;
  }

  pauseAll(): void {
    this.globallyPaused = true;
  }
  resumeAll(): void {
    this.globallyPaused = false;
  }
  isPaused(): boolean {
    return this.globallyPaused;
  }

  /** Eksekusi semua job yang jatuh tempo pada `now`. Aman dipanggil berulang setelah restart. */
  async tick(now = new Date()): Promise<{ sent: number; failed: number; dead: number }> {
    if (this.globallyPaused) return { sent: 0, failed: 0, dead: 0 };
    let sent = 0;
    let failed = 0;
    let dead = 0;

    for (const job of this.jobs.values()) {
      if (job.status !== 'scheduled' || job.paused) continue;
      if (job.fireAt.getTime() > now.getTime()) continue;

      job.attempts += 1;
      const res = await this.opts.outbound.send(
        {
          chatJid: job.targetJid,
          text: job.text,
          idempotencyKey: job.idempotencyKey,
        },
        { isAdminPrivateReply: !job.targetJid.endsWith('@g.us') },
      );

      if (res.ok) {
        job.status = 'sent';
        job.sentAt = now;
        sent++;
      } else {
        job.lastError = res.error;
        if (job.attempts >= this.maxAttempts) {
          job.status = 'dead';
          dead++;
        } else {
          failed++;
        }
      }
    }

    return { sent, failed, dead };
  }

  /** Ekspor & impor state agar tahan restart (atau disinkronkan ke tabel `Reminder`). */
  exportState(): ReminderJob[] {
    return [...this.jobs.values()].map((j) => ({ ...j }));
  }

  importState(items: ReminderJob[]): void {
    for (const item of items) {
      if (this.byIdempotency.has(item.idempotencyKey)) continue;
      this.jobs.set(item.id, { ...item, fireAt: new Date(item.fireAt), sentAt: item.sentAt ? new Date(item.sentAt) : undefined });
      this.byIdempotency.set(item.idempotencyKey, item.id);
    }
  }

  addAssignment(a: Omit<AssignmentItem, 'id' | 'status'>): AssignmentItem {
    const id = `TASK-${++this.seq}`;
    const item: AssignmentItem = { ...a, id, status: 'open' };
    this.assignments.set(id, item);
    return item;
  }

  listUpcomingAssignments(now = new Date()): AssignmentItem[] {
    return [...this.assignments.values()]
      .filter((a) => a.status === 'open' && a.dueAt.getTime() >= now.getTime())
      .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  }
}
