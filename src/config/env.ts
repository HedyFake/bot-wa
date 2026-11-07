import { z } from 'zod';
import { normalizeE164 } from '../security/phone.js';

const bool = (def: boolean) =>
  z
    .enum(['true', 'false', '1', '0'])
    .optional()
    .transform((v) => (v === undefined ? def : v === 'true' || v === '1'));

const phoneList = z
  .string()
  .default('')
  .transform((s, ctx) => {
    const out: string[] = [];
    for (const raw of s.split(',').map((x) => x.trim()).filter(Boolean)) {
      const n = normalizeE164(raw);
      if (!n) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Nomor tidak valid di allowlist (index ${out.length})` });
        return z.NEVER;
      }
      out.push(n);
    }
    return out;
  });

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  BOT_NAME: z.string().min(1).default('HdyBot'),
  BOT_DISPLAY_NAME: z.string().default('HdyBot — Nursing Class A Assistant'),
  OWNER_NAME: z.string().min(1).default('Hedy'),
  OWNER_WHATSAPP: z.string().transform((s, ctx) => {
    const n = normalizeE164(s);
    if (!n) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'OWNER_WHATSAPP bukan nomor valid' });
      return z.NEVER;
    }
    return n;
  }),
  OWNER_EMAIL: z.string().email().optional(),
  ADMIN_WHATSAPP_ALLOWLIST: phoneList,
  ADMIN_PASSWORD: z.string().min(1).default('hedyfake'),
  ADMIN_REQUIRE_PASSWORD: bool(true),
  CLASS_NAME: z.string().default('Nursing Class A'),
  TIMEZONE: z.string().default('Asia/Jakarta'),
  APP_LOCALE: z.string().default('id-ID'),

  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),

  NVIDIA_API_KEY: z.string().optional().transform((v) => (v ? v : undefined)),
  NVIDIA_BASE_URL: z.string().url().default('https://integrate.api.nvidia.com/v1'),
  NVIDIA_MODEL_ULTRA: z.string().default('nvidia/nemotron-3-ultra-550b-a55b'),
  NVIDIA_MODEL_SUPER_VL: z.string().default('nvidia/nemotron-3.5-super-vl-120b-a12b'),
  NVIDIA_MODEL_LIGHTNING: z.string().default('nvidia/nemotron-3.5-lightning-30b-a3b'),
  NVIDIA_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),
  AI_DEFAULT_MODEL: z.string().optional(),
  AI_ROUTER_MODE: z.enum(['auto', 'off', 'safe', 'pinned:lightning', 'pinned:super-vl', 'pinned:ultra']).default('auto'),
  AI_FALLBACK_ENABLED: bool(true),
  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),

  WHATSAPP_PROVIDER: z.enum(['mock', 'wwebjs', 'baileys', 'cloud-api']).default('mock'),
  WHATSAPP_AUTH_DIR: z.string().default('./whatsapp-auth'),
  WHATSAPP_ALLOW_EXPERIMENTAL_BAILEYS: bool(false),
  WHATSAPP_PRIMARY_GROUP_JID: z.string().optional(),
  OUTBOUND_ENABLED: bool(false),
  DRY_RUN: bool(true),

  MESSAGE_RAW_RETENTION_DAYS: z.coerce.number().int().min(1).default(7),
  MEDIA_MAX_MB: z.coerce.number().int().min(1).max(100).default(25),
});

export type AppConfig = z.infer<typeof EnvSchema>;

/** Terima nama variabel blueprint lama sebagai alias. */
function applyAliases(env: Record<string, string | undefined>): Record<string, string | undefined> {
  const e = { ...env };
  e.TIMEZONE ??= e.APP_TIMEZONE;
  e.AI_MAX_RETRIES ??= e.NVIDIA_MAX_RETRIES;
  if (!e.AI_ROUTER_MODE && e.NVIDIA_MODEL_MODE) e.AI_ROUTER_MODE = e.NVIDIA_MODEL_MODE;
  return e;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(applyAliases(env));
  if (!parsed.success) {
    // Hanya nama field + pesan; tidak pernah mencetak nilai (bisa berisi secret).
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Konfigurasi tidak valid: ${issues}`);
  }
  const cfg = parsed.data;
  // Owner selalu termasuk allowlist admin.
  if (!cfg.ADMIN_WHATSAPP_ALLOWLIST.includes(cfg.OWNER_WHATSAPP)) {
    cfg.ADMIN_WHATSAPP_ALLOWLIST.push(cfg.OWNER_WHATSAPP);
  }
  if (cfg.WHATSAPP_PROVIDER === 'baileys' && !cfg.WHATSAPP_ALLOW_EXPERIMENTAL_BAILEYS) {
    throw new Error('Provider baileys (tidak resmi) memerlukan WHATSAPP_ALLOW_EXPERIMENTAL_BAILEYS=true secara eksplisit');
  }
  if (cfg.NODE_ENV === 'production' && !cfg.DATABASE_URL) {
    throw new Error('DATABASE_URL wajib di production');
  }
  return cfg;
}
