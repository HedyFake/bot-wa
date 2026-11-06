import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { loadConfig } from '../config/env.js';
import { runHealth } from '../app/health.js';

const config = loadConfig();
const prisma = config.DATABASE_URL ? new PrismaClient() : undefined;
const report = await runHealth({
  config,
  startedAt: new Date(),
  dbProbe: prisma ? async () => { await prisma.$queryRaw`SELECT 1`; } : undefined,
});
console.log(JSON.stringify(report, null, 2));
await prisma?.$disconnect();
process.exit(report.status === 'down' ? 1 : 0);
