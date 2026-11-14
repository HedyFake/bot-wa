import type { PrismaClient } from '@prisma/client';
import { NvidiaProviderError } from '../nvidia/registry.js';

/** Kuota jumlah request. Reservasi per periode bersifat atomik, termasuk bila ada dua worker. */
export async function reserveOpenAiRequest(db: PrismaClient | undefined, daily: number, monthly: number, now = new Date()) {
  if (!db) throw new NvidiaProviderError('openai_budget_storage_unavailable', 503);
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(now);
  const periods = [[date.slice(0, 7), monthly], [date, daily]] as const;
  await db.$transaction(async tx => {
    for (const [period, limit] of periods) {
      if (!limit) continue;
      const key = 'openai.requests.' + period;
      const changed = await tx.$executeRaw`
        INSERT INTO "BotSetting" ("key", "value", "updatedAt") VALUES (${key}, '1'::jsonb, NOW())
        ON CONFLICT ("key") DO UPDATE SET "value" = to_jsonb(("BotSetting"."value"::int + 1)), "updatedAt" = NOW()
        WHERE "BotSetting"."value"::int < ${limit}`;
      if (!changed) throw new NvidiaProviderError('openai_request_budget_exhausted', 429);
    }
  });
}
