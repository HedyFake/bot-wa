import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { AdminAuthenticator } from './admin/authentication/authenticator.js';
import { ConfirmationManager } from './admin/authorization/confirmation.js';
import { CommandDispatcher } from './admin/commands/dispatcher.js';
import { GroupIntelligenceService } from './ai/classification/group-intelligence.js';
import { ModelRouter } from './ai/model-router/router.js';
import { HttpNvidiaTransport } from './ai/nvidia/registry.js';
import { runHealth } from './app/health.js';
import { loadConfig } from './config/env.js';
import { FunAndUtilityService } from './modules/fun/fun-utility-service.js';
import { ReminderWorker } from './modules/reminders/worker.js';
import { DriveCatalog } from './modules/materials/drive.js';
import { MediaService } from './modules/media/media-service.js';
import { readFileSync } from 'node:fs';
import { parseSeed } from './database/seed-schema.js';
import { ScheduleDatabase } from './modules/schedule/database.js';
import { ScheduleService } from './modules/schedule/service.js';
import { Monitor, resources } from './observability/monitor.js';
import { e164ToJid } from './security/phone.js';
import { createLogger } from './observability/logger.js';
import { maskPhone } from './security/phone.js';
import { BaileysWhatsAppProvider } from './whatsapp/adapters/baileys.js';
import { MockWhatsAppProvider } from './whatsapp/adapters/mock.js';
import type { WhatsAppProvider } from './whatsapp/adapters/types.js';
import { WWebJsWhatsAppProvider } from './whatsapp/adapters/wwebjs.js';
import { OutboundGate } from './whatsapp/outbound/gate.js';

async function main() {
  const config = loadConfig();
  const log = createLogger(config.LOG_LEVEL);
  const startedAt = new Date();
  const monitor = new Monitor();
  const prisma = config.DATABASE_URL ? new PrismaClient() : undefined;

  let whatsapp: WhatsAppProvider;
  if (config.WHATSAPP_PROVIDER === 'mock') {
    whatsapp = new MockWhatsAppProvider();
  } else if (config.WHATSAPP_PROVIDER === 'wwebjs') {
    whatsapp = new WWebJsWhatsAppProvider({
      authDir: config.WHATSAPP_AUTH_DIR,
      maxMediaBytes: config.MEDIA_MAX_MB * 1024 * 1024,
      pairingPhone: config.WHATSAPP_PAIRING_PHONE,
    });
  } else if (config.WHATSAPP_PROVIDER === 'baileys') {
    whatsapp = new BaileysWhatsAppProvider({
      authDir: config.WHATSAPP_AUTH_DIR,
      allowExperimental: config.WHATSAPP_ALLOW_EXPERIMENTAL_BAILEYS,
      pairingPhoneE164: config.WHATSAPP_PAIRING_PHONE,
      onPairingCode: code => writeFileSync(join(config.WHATSAPP_AUTH_DIR, 'pairing-code.txt'), code, { mode: 0o600 }),
    });
  } else {
    throw new Error(`Provider ${config.WHATSAPP_PROVIDER} memerlukan konfigurasi adapter aktif`);
  }

  const outbound = new OutboundGate({
    provider: whatsapp,
    outboundEnabled: config.OUTBOUND_ENABLED,
    dryRun: config.DRY_RUN,
    allowedGroupJids: config.WHATSAPP_PRIMARY_GROUP_JID ? [config.WHATSAPP_PRIMARY_GROUP_JID] : [],
  });

  const auth = new AdminAuthenticator({
    ownerE164: config.OWNER_WHATSAPP,
    adminAllowlistE164: config.ADMIN_WHATSAPP_ALLOWLIST,
    adminPassword: config.ADMIN_PASSWORD,
    requirePassword: config.ADMIN_REQUIRE_PASSWORD,
  });

  const confirmations = new ConfirmationManager();

  const transport = config.NVIDIA_API_KEY
    ? new HttpNvidiaTransport({ apiKey: config.NVIDIA_API_KEY, baseUrl: config.NVIDIA_BASE_URL })
    : undefined;

  const router = new ModelRouter({
    transport,
    modelIds: {
      ultra: config.NVIDIA_MODEL_ULTRA,
      'super-vl': config.NVIDIA_MODEL_SUPER_VL,
      lightning: config.NVIDIA_MODEL_LIGHTNING,
    },
    initialMode: config.AI_ROUTER_MODE,
    fallbackEnabled: config.AI_FALLBACK_ENABLED,
    maxRetries: config.AI_MAX_RETRIES,
    timeoutMs: config.NVIDIA_TIMEOUT_MS,
  });

  const baseSchedule = parseSeed(JSON.parse(readFileSync('data/class-5a.seed.json','utf8')));
  const schedule = new ScheduleService(baseSchedule);
  const scheduleDatabase = prisma ? new ScheduleDatabase(prisma,config.CLASS_NAME,baseSchedule) : undefined;
  if (scheduleDatabase) schedule.useDatabase(scheduleDatabase);
  const intelligence = new GroupIntelligenceService({
    primaryGroupJid: config.WHATSAPP_PRIMARY_GROUP_JID,
  });
  const mediaService = new MediaService();
  const funService = new FunAndUtilityService({
    persistPath: './data/runtime/bot-state.json',
  });

  const worker = prisma ? new ReminderWorker(prisma, outbound, () => funService.listReminders()) : undefined;
  const drive = config.GOOGLE_APPLICATION_CREDENTIALS ? DriveCatalog.serviceAccount(config.GOOGLE_DRIVE_FOLDER_ID, config.GOOGLE_APPLICATION_CREDENTIALS, prisma ? async files => {
    const key = 'drive.catalog.' + config.GOOGLE_DRIVE_FOLDER_ID;
    const value = { indexedAt: new Date().toISOString(), files: JSON.parse(JSON.stringify(files)) };
    await prisma.botSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  } : undefined) : undefined;
  const dispatcher = new CommandDispatcher({
    config,
    whatsapp,
    outbound,
    auth,
    confirmations,
    router,
    schedule,
    scheduleDatabase,
    intelligence,
    mediaService,
    funService,
    drive,
    monitor,
    deliveryAudit: prisma ? async (actor, target, result) => {
      await prisma.auditLog.create({ data: { actor, action: 'drive.delivery', target, result } });
    } : undefined,
    worker,
    dbProbe: prisma ? async () => { await prisma.$queryRaw`SELECT 1`; } : undefined,
    startedAt,
  });

  whatsapp.onMessage(async (msg) => {
    try {
      await schedule.refresh().catch(() => monitor.record('Database','warning','Jadwal belum dapat dimuat'));
      await dispatcher.handleInbound(msg);
    } catch (e) {
      log.error({ err: e instanceof Error ? e.name : 'unknown' }, 'gagal memproses pesan masuk');
      if (msg.chatType === 'private' || msg.isBotMentioned || msg.text.startsWith('.')) {
        await outbound.send({ chatJid: msg.chatJid, text: '⚠️ HdyBot belum dapat memproses permintaan ini. Silakan coba kembali.', quotedMessageId: msg.providerMessageId, idempotencyKey: 'error:' + msg.providerMessageId }).catch(() => undefined);
      }
    }
  });

  let stopping = false;
  let failures = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  const onState = (s: ReturnType<WhatsAppProvider['state']>) => {
    monitor.record('WhatsApp', ['disconnected', 'session_expired', 'logged_out'].includes(s) ? 'warning' : 'info', s);
    log.info({ state: s }, 'whatsapp state');
    if (s === 'connected') failures = 0;
    if (s !== 'disconnected' && reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    // Reconnect otomatis bila koneksi terputus atau sesi lama kadaluarsa di luar shutdown sengaja.
    if (s === 'disconnected' && !stopping && !reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!stopping) void connect();
      }, Math.min(120_000, 1_000 * 2 ** Math.min(failures++, 7)) + Math.floor(Math.random() * 1_000));
      reconnectTimer.unref();
    }
  };
  whatsapp.onStateChange(onState);
  async function connect() {
    try { await whatsapp.connect(); } catch {
      log.warn("Koneksi WhatsApp gagal");
      if (!['session_expired', 'logged_out'].includes(whatsapp.state())) onState('disconnected');
    }
  }
  void connect();

  // Pemantauan health/ready murni internal & disajikan melalui chat WhatsApp pribadi Hedy (.health, .status, .dashboard).
  const health = () =>
    runHealth({
      config,
      whatsapp,
      startedAt,
      dbProbe: prisma ? async () => { await prisma.$queryRaw`SELECT 1`; } : undefined,
    });

  // Heartbeat periodik menjaga event loop Node.js selalu hidup 24/7.
  const syncDrive = () => void drive?.sync().catch(() => monitor.record('Drive', 'error', 'Sinkronisasi gagal'));
  syncDrive();
  const syncTimer = setInterval(syncDrive, 15 * 60_000);
  const jobTimer = setInterval(() => {
    if (whatsapp.state() === 'connected' && config.OUTBOUND_ENABLED && !config.DRY_RUN) {
      void worker?.tick().catch(() => monitor.record('Scheduler', 'error', 'Pemrosesan antrean gagal'));
    }
  }, 15_000);
  let lastAlert = 0;
  let lastCpu = process.cpuUsage();
  let lastSample = Date.now();
  const heartbeat = setInterval(async () => {
    try {
      const h = await health();
      log.debug({ status: h.status, uptimeSec: h.uptimeSec }, 'heartbeat');
      if (h.checks.some(c => c.name === 'database' && c.status === 'down')) monitor.record('Database', 'error', 'Probe gagal');
      const r = await resources();
      const delta = process.cpuUsage(lastCpu);
      const cpu = (delta.user + delta.system) / (1000 * Math.max(1, Date.now() - lastSample));
      lastCpu = r.cpuTime;
      lastSample = Date.now();
      if ((r.diskFree < 0.1 || r.ramUsed > 0.9 || cpu > 0.9 * Math.max(1, r.cores)) && Date.now() - lastAlert > 3600_000) {
        monitor.record('Sistem', 'warning', 'Tekanan resource tinggi');
        if (config.OUTBOUND_ENABLED && !config.DRY_RUN && whatsapp.state() === 'connected') {
          const sent = await outbound.send({ chatJid: e164ToJid(config.OWNER_WHATSAPP), text: '⚠️ Resource VPS tinggi. Periksa .storage dan .health melalui chat pribadi.', idempotencyKey: 'resource:' + Math.floor(Date.now() / 3600_000) });
          if (sent.ok) lastAlert = Date.now();
        }
      }
    } catch {
      // Jangan biarkan error heartbeat mematikan proses.
    }
  }, 60_000);

  log.info(
    {
      bot: config.BOT_NAME,
      owner: config.OWNER_NAME,
      ownerPhone: maskPhone(config.OWNER_WHATSAPP),
      admins: config.ADMIN_WHATSAPP_ALLOWLIST.length,
      provider: whatsapp.name,
      outbound: config.OUTBOUND_ENABLED,
      dryRun: config.DRY_RUN,
      tz: config.TIMEZONE,
    },
    `${config.BOT_DISPLAY_NAME} berjalan terus-menerus (kontrol & health via WA Admin DM)`,
  );
  log.info({ health: await health() }, 'health awal');

  const shutdown = async (sig: string) => {
    if (stopping) return;
    stopping = true;
    clearInterval(heartbeat);
    clearInterval(jobTimer);
    clearInterval(syncTimer);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    log.info({ sig }, 'shutdown: stop ingest, tutup koneksi');
    await whatsapp.disconnect().catch(() => undefined);
    await prisma?.$disconnect().catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (r) =>
    log.error(
      { err: r instanceof Error ? r.name : 'Error' },
      'unhandledRejection',
    ),
  );
  process.on('uncaughtException', (e) =>
    log.error(
      { err: e instanceof Error ? e.name : 'Error' },
      'uncaughtException',
    ),
  );
}

main().catch((e) => {
  console.error('Startup HdyBot gagal.', e instanceof Error ? e.name : 'Error');
  process.exit(1);
});
