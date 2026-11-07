import 'dotenv/config';
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
import { MediaService } from './modules/media/media-service.js';
import { ScheduleService } from './modules/schedule/service.js';
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
  const prisma = config.DATABASE_URL ? new PrismaClient() : undefined;

  let whatsapp: WhatsAppProvider;
  if (config.WHATSAPP_PROVIDER === 'mock') {
    whatsapp = new MockWhatsAppProvider();
  } else if (config.WHATSAPP_PROVIDER === 'wwebjs') {
    whatsapp = new WWebJsWhatsAppProvider({
      authDir: config.WHATSAPP_AUTH_DIR,
    });
  } else if (config.WHATSAPP_PROVIDER === 'baileys') {
    whatsapp = new BaileysWhatsAppProvider({
      authDir: config.WHATSAPP_AUTH_DIR,
      allowExperimental: config.WHATSAPP_ALLOW_EXPERIMENTAL_BAILEYS,
      onPairingCode: (code) => log.info({ pairingCodeIssued: true, length: code.length }, 'Kode pairing WA siap'),
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

  const schedule = new ScheduleService();
  const intelligence = new GroupIntelligenceService({
    primaryGroupJid: config.WHATSAPP_PRIMARY_GROUP_JID,
  });
  const mediaService = new MediaService();
  const funService = new FunAndUtilityService({
    persistPath: './data/runtime/bot-state.json',
  });

  const dispatcher = new CommandDispatcher({
    config,
    whatsapp,
    outbound,
    auth,
    confirmations,
    router,
    schedule,
    intelligence,
    mediaService,
    funService,
    startedAt,
  });

  whatsapp.onMessage(async (msg) => {
    try {
      await dispatcher.handleInbound(msg);
    } catch (e) {
      log.error({ err: e instanceof Error ? e.name : 'unknown' }, 'gagal memproses pesan masuk');
    }
  });

  whatsapp.onStateChange((s) => {
    log.info({ state: s }, 'whatsapp state');
    // Reconnect otomatis bila koneksi terputus di luar shutdown sengaja.
    if (s === 'disconnected' && !stopping) {
      setTimeout(() => {
        if (!stopping) void whatsapp.connect().catch(() => undefined);
      }, 5_000).unref();
    }
  });

  await whatsapp.connect().catch((e: unknown) => {
    const errMsg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    log.error({ err: errMsg }, 'whatsapp connect gagal, akan dicoba ulang otomatis');
  });

  // Pemantauan health/ready murni internal & disajikan melalui chat WhatsApp pribadi Hedy (.health, .status, .dashboard).
  const health = () =>
    runHealth({
      config,
      whatsapp,
      startedAt,
      dbProbe: prisma ? async () => { await prisma.$queryRaw`SELECT 1`; } : undefined,
    });

  // Heartbeat periodik menjaga event loop Node.js selalu hidup 24/7.
  const heartbeat = setInterval(async () => {
    try {
      const h = await health();
      log.debug({ status: h.status, uptimeSec: h.uptimeSec }, 'heartbeat');
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

  let stopping = false;
  const shutdown = async (sig: string) => {
    if (stopping) return;
    stopping = true;
    clearInterval(heartbeat);
    log.info({ sig }, 'shutdown: stop ingest, tutup koneksi');
    await whatsapp.disconnect().catch(() => undefined);
    await prisma?.$disconnect().catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (r) =>
    log.error({ err: r instanceof Error ? r.name : 'unknown' }, 'unhandledRejection'),
  );
  process.on('uncaughtException', (e) =>
    log.error({ err: e instanceof Error ? e.name : 'unknown' }, 'uncaughtException'),
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
