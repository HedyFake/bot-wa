import type { AppConfig } from '../config/env.js';
import type { WhatsAppProvider } from '../whatsapp/adapters/types.js';

export type CheckStatus = 'ok' | 'degraded' | 'down' | 'not_configured';

export interface HealthCheck {
  name: string;
  status: CheckStatus;
  detail?: string;
  latencyMs?: number;
}

export interface HealthReport {
  status: CheckStatus;
  uptimeSec: number;
  checkedAt: string;
  checks: HealthCheck[];
}

export interface HealthDeps {
  config: AppConfig;
  whatsapp?: WhatsAppProvider;
  /** Opsional: probe DB (mis. SELECT 1). */
  dbProbe?: () => Promise<void>;
  startedAt: Date;
  now?: () => Date;
}

async function timed(name: string, fn: () => Promise<void>): Promise<HealthCheck> {
  const t0 = Date.now();
  try {
    await fn();
    return { name, status: 'ok', latencyMs: Date.now() - t0 };
  } catch (e) {
    // Jangan bocorkan connection string; hanya nama error.
    const msg = e instanceof Error ? e.name : 'Error';
    return { name, status: 'down', detail: msg, latencyMs: Date.now() - t0 };
  }
}

export async function runHealth(deps: HealthDeps): Promise<HealthReport> {
  const now = (deps.now ?? (() => new Date()))();
  const checks: HealthCheck[] = [];

  checks.push(
    deps.dbProbe ? await timed('database', deps.dbProbe) : { name: 'database', status: 'not_configured' },
  );

  if (deps.whatsapp) {
    const s = deps.whatsapp.state();
    checks.push({
      name: `whatsapp:${deps.whatsapp.name}`,
      status: s === 'connected' ? 'ok' : s === 'connecting' ? 'degraded' : 'down',
      detail: s,
    });
  } else {
    checks.push({ name: 'whatsapp', status: 'not_configured' });
  }

  checks.push({
    name: 'nvidia',
    status: deps.config.NVIDIA_API_KEY ? 'degraded' : 'not_configured',
    detail: deps.config.NVIDIA_API_KEY ? 'key ada; belum diuji (Phase 3)' : 'NVIDIA_API_KEY kosong',
  });

  checks.push({name:'openai', status:deps.config.OPENAI_API_KEY ? 'degraded' : 'not_configured',
    detail:deps.config.OPENAI_API_KEY ? 'gpt-6-luna dikonfigurasi; koneksi belum diuji' : 'OPENAI_API_KEY kosong'});
  const relevant = checks.filter((c) => c.status !== 'not_configured');
  const status: CheckStatus = relevant.some((c) => c.status === 'down')
    ? 'down'
    : relevant.some((c) => c.status === 'degraded')
      ? 'degraded'
      : 'ok';

  return {
    status,
    uptimeSec: Math.floor((now.getTime() - deps.startedAt.getTime()) / 1000),
    checkedAt: now.toISOString(),
    checks,
  };
}
