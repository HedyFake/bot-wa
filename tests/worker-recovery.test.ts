import { describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { ReminderWorker } from '../src/modules/reminders/worker.js';
import { MockWhatsAppProvider } from '../src/whatsapp/adapters/mock.js';
import { OutboundGate } from '../src/whatsapp/outbound/gate.js';

describe('worker pengingat dengan penyimpanan uji', () => {
  it('melanjutkan antrean yang tertunda setelah restart dan mengklaim pekerjaan sekali', async () => {
    const now = new Date();
    const job = { id: 'job', text: 'Kuliah', targetJid: 'kelas@g.us', idempotencyKey: 'once', status: 'scheduled', attempts: 0, fireAt: now };
    let paused = true;
    const db = {
      botSetting: { findUnique: async () => ({ value: paused }) },
      reminder: {
        findMany: async () => job.status === 'scheduled' ? [{ ...job }] : [],
        updateMany: async () => {
          if (job.status !== 'scheduled') return { count: 0 };
          job.status = 'sending'; job.attempts++;
          return { count: 1 };
        },
        update: async ({ data }: { data: { status: string } }) => { job.status = data.status; },
      },
    } as unknown as PrismaClient;
    const wa = new MockWhatsAppProvider();
    await wa.connect();
    const worker = () => new ReminderWorker(db, new OutboundGate({ provider: wa, outboundEnabled: true, dryRun: false }), () => []);
    await worker().tick(now);
    expect(wa.sent).toHaveLength(0);
    paused = false;
    wa.failNextSend = 'not_connected';
    await worker().tick(now);
    expect(job.status).toBe('scheduled');
    await Promise.all([worker().tick(now), worker().tick(now)]);
    expect(job.status).toBe('sent');
    await worker().tick(now);
    expect(wa.sent).toHaveLength(1);
    expect(job.attempts).toBe(2);
  });
});
