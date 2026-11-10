import { LunaTransport } from '../ai/openai/luna.js';
/**
 * CLI Simulasi Chat Pribadi Admin WhatsApp Hedy (`+6282233038659`).
 * Memungkinkan Hedy menguji perintah `.dashboard`, `.health`, `.status`, `.jadwal`,
 * `.ai status`, `.ai test <prompt>`, dll. langsung dari terminal Ubuntu Server:
 *   - Satu perintah: `npm run cli -- ".dashboard"` atau `sudo ./install.sh --cmd ".health"`
 *   - Mode interaktif: `npm run cli` atau `sudo ./install.sh --cli`
 */
import 'dotenv/config';
import { createInterface } from 'node:readline';
import { AdminAuthenticator } from '../admin/authentication/authenticator.js';
import { ConfirmationManager } from '../admin/authorization/confirmation.js';
import { CommandDispatcher } from '../admin/commands/dispatcher.js';
import { GroupIntelligenceService } from '../ai/classification/group-intelligence.js';
import { ModelRouter } from '../ai/model-router/router.js';
import { HttpNvidiaTransport } from '../ai/nvidia/registry.js';
import { loadConfig } from '../config/env.js';
import { ScheduleService } from '../modules/schedule/service.js';
import { e164ToJid } from '../security/phone.js';
import { MockWhatsAppProvider } from '../whatsapp/adapters/mock.js';
import { OutboundGate } from '../whatsapp/outbound/gate.js';

async function main() {
  const config = loadConfig();
  const wa = new MockWhatsAppProvider();
  await wa.connect();

  const outbound = new OutboundGate({
    provider: wa,
    outboundEnabled: config.OUTBOUND_ENABLED,
    dryRun: config.DRY_RUN,
    allowedGroupJids: config.WHATSAPP_PRIMARY_GROUP_JID ? [config.WHATSAPP_PRIMARY_GROUP_JID] : [],
  });

  const auth = new AdminAuthenticator({
    ownerE164: config.OWNER_WHATSAPP,
    adminAllowlistE164: config.ADMIN_WHATSAPP_ALLOWLIST,
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
    openai: config.OPENAI_API_KEY ? new LunaTransport(config.OPENAI_API_KEY) : undefined,
    switchMs: config.AI_PROVIDER_SWITCH_MS,
    timeoutMs: config.NVIDIA_TIMEOUT_MS,
  });

  const dispatcher = new CommandDispatcher({
    config,
    whatsapp: wa,
    outbound,
    auth,
    confirmations,
    router,
    schedule: new ScheduleService(),
    intelligence: new GroupIntelligenceService({ primaryGroupJid: config.WHATSAPP_PRIMARY_GROUP_JID }),
    startedAt: new Date(),
  });

  const ownerJid = e164ToJid(config.OWNER_WHATSAPP);
  let seq = 0;

  const sendAsHedy = async (text: string) => {
    const reply = await dispatcher.handleInbound({
      providerMessageId: `cli-${++seq}`,
      chatJid: ownerJid,
      chatType: 'private',
      senderJid: ownerJid,
      text,
      receivedAt: new Date(),
    });
    if (reply) console.log(`\n${reply}\n`);
  };

  const singleArg = process.argv.slice(2).join(' ').trim();
  if (singleArg) {
    await sendAsHedy(singleArg);
    return;
  }

  console.log(`=== ${config.BOT_DISPLAY_NAME} — Terminal Admin DM (${config.OWNER_NAME}) ===`);
  console.log('Ketik perintah WhatsApp (mis. .dashboard, .health, .jadwal, .help) atau "exit" untuk keluar.\n');

  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: 'Hedy> ' });
  rl.prompt();
  rl.on('line', (line) => {
    const t = line.trim();
    if (t === 'exit' || t === 'quit') {
      rl.close();
      return;
    }
    void sendAsHedy(t).then(() => rl.prompt());
  });
}

void main();
