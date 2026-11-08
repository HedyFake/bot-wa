import type { ZodType } from 'zod';
import {
  type ChatMessage,
  createModelRegistry,
  type InputModality,
  type ModelAlias,
  type ModelSpec,
  NvidiaProviderError,
  type NvidiaTransport,
} from '../nvidia/registry.js';

export type RouterMode = 'auto' | 'off' | 'safe' | 'pinned:lightning' | 'pinned:super-vl' | 'pinned:ultra';

export type TaskKind =
  | 'classification'
  | 'date_extraction'
  | 'intent_detection'
  | 'short_summary'
  | 'faq'
  | 'reformat_announcement'
  | 'vision_schedule'
  | 'vision_screenshot'
  | 'vision_document'
  | 'conflict_resolution'
  | 'multi_step_planning'
  | 'long_document_analysis'
  | 'complex_qa';

export interface RouteRequest {
  task: TaskKind;
  modality: InputModality;
  complexity?: 'low' | 'medium' | 'high';
  contextChars?: number;
  requiresTools?: boolean;
  messages: ChatMessage[];
}

export interface RouteDecision {
  alias: ModelAlias;
  spec: ModelSpec;
  reason: string;
  temperature: number;
  fallbacks: ModelAlias[];
}

export interface UsageLogEntry {
  alias: ModelAlias;
  modelId: string;
  task: TaskKind;
  routeReason: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  status: 'ok' | 'fallback_ok' | 'error';
  errorCode?: string;
}

export interface RouterStatus {
  mode: RouterMode;
  pinnedUntil?: string;
  fallbackEnabled: boolean;
  authHalted: boolean;
  unhealthyAliases: ModelAlias[];
  models: Record<ModelAlias, { modelId: string; lane: string; healthy: boolean }>;
  totalCalls: number;
  lastError?: string;
}

const VISION_TASKS = new Set<TaskKind>(['vision_schedule', 'vision_screenshot', 'vision_document']);
const ULTRA_TASKS = new Set<TaskKind>([
  'conflict_resolution', 'multi_step_planning', 'long_document_analysis', 'complex_qa',
]);

export class ModelRouter {
  private readonly registry: Record<ModelAlias, ModelSpec>;
  private mode: RouterMode;
  private pinnedUntilMs: number | null = null;
  private readonly fallbackEnabled: boolean;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;
  private readonly unhealthy = new Set<ModelAlias>();
  private authHalted = false;
  private inFlight = 0;
  private lastError?: string;
  private callCount = 0;
  readonly usageHistory: UsageLogEntry[] = [];
  private readonly now: () => number;

  constructor(
    private readonly opts: {
      transport?: NvidiaTransport;
      modelIds?: Partial<Record<ModelAlias, string>>;
      initialMode?: RouterMode;
      fallbackEnabled?: boolean;
      maxRetries?: number;
      timeoutMs?: number;
      now?: () => number;
    } = {},
  ) {
    this.registry = createModelRegistry(opts.modelIds);
    this.mode = opts.initialMode ?? 'auto';
    this.fallbackEnabled = opts.fallbackEnabled ?? true;
    this.maxRetries = opts.maxRetries ?? 2;
    this.timeoutMs = opts.timeoutMs ?? 60_000;
    this.now = opts.now ?? (() => Date.now());
  }

  setMode(mode: RouterMode, pinTtlMs = 30 * 60 * 1000): void {
    this.mode = mode;
    this.pinnedUntilMs = mode.startsWith('pinned:') ? this.now() + pinTtlMs : null;
  }

  getEffectiveMode(): RouterMode {
    if (this.mode.startsWith('pinned:') && this.pinnedUntilMs && this.now() >= this.pinnedUntilMs) {
      this.mode = 'auto';
      this.pinnedUntilMs = null;
    }
    return this.mode;
  }

  markUnhealthy(alias: ModelAlias): void {
    this.unhealthy.add(alias);
  }
  markHealthy(alias: ModelAlias): void {
    this.unhealthy.delete(alias);
  }

  /** Pilih model + daftar fallback yang kompatibel modalitas. */
  decide(req: Omit<RouteRequest, 'messages'>): RouteDecision {
    const mode = this.getEffectiveMode();
    if (mode === 'off') throw new Error('ai_disabled');

    const isMultimodal = req.modality === 'image' || req.modality === 'video' || VISION_TASKS.has(req.task);

    // Aturan keras: input gambar/video WAJIB ke model yang mendukung vision (super-vl).
    if (isMultimodal) {
      const spec = this.registry['super-vl'];
      if (this.unhealthy.has('super-vl')) {
        throw new Error('vision_model_unavailable');
      }
      return {
        alias: 'super-vl',
        spec,
        reason: 'multimodal_requires_super_vl',
        temperature: spec.visionTemperature ?? 0.6,
        // Tidak ada model lain yang mendukung vision -> fallback kosong (jangan klaim text model bisa vision!)
        fallbacks: [],
      };
    }

    let primary: ModelAlias = 'lightning';
    let reason = 'default_fast_lane';

    if (mode.startsWith('pinned:')) {
      primary = mode.slice('pinned:'.length) as ModelAlias;
      reason = `admin_pinned_${primary}`;
    } else if (
      ULTRA_TASKS.has(req.task) ||
      req.complexity === 'high' ||
      (req.contextChars ?? 0) > 16_000
    ) {
      primary = 'ultra';
      reason = 'complex_reasoning_lane';
    }

    const candidates: ModelAlias[] =
      primary === 'ultra'
        ? ['ultra', 'lightning', 'super-vl']
        : primary === 'lightning'
          ? ['lightning', 'ultra', 'super-vl']
          : ['super-vl', 'ultra', 'lightning'];

    const healthy = candidates.filter((a) => !this.unhealthy.has(a));
    const chosen = healthy[0];
    if (!chosen) throw new Error('no_healthy_model_available');
    if (chosen !== primary) reason = `${reason}->fallback_healthy_${chosen}`;

    const spec = this.registry[chosen];
    const fallbacks = this.fallbackEnabled ? healthy.slice(1) : [];

    return {
      alias: chosen,
      spec,
      reason,
      temperature: spec.defaultTemperature,
      fallbacks,
    };
  }

  private recordUsage(entry: UsageLogEntry) {
    if (this.usageHistory.length >= 1000) this.usageHistory.shift();
    this.usageHistory.push(entry);
    this.callCount++;
  }

  /** Jalankan permintaan ke NVIDIA dengan retry terbatas dan fallback kompatibel. */
  async invoke(req: RouteRequest): Promise<{ text: string; alias: ModelAlias; modelId: string; routeReason: string }> {
    if (this.inFlight >= 3) throw new Error('ai_busy');
    this.inFlight++;
    try { return await this.invokeAvailable(req); } finally { this.inFlight--; }
  }

  private async invokeAvailable(req: RouteRequest) {
    if (this.authHalted) throw new Error('nvidia_auth_halted');
    if (!this.opts.transport) throw new Error('nvidia_transport_not_configured');

    const decision = this.decide(req);
    const chain: ModelAlias[] = [decision.alias, ...decision.fallbacks];
    let lastErr: unknown;

    for (let idx = 0; idx < chain.length; idx++) {
      const alias = chain[idx]!;
      const spec = this.registry[alias];
      const temperature =
        req.modality === 'image' || req.modality === 'video'
          ? (spec.visionTemperature ?? spec.defaultTemperature)
          : spec.defaultTemperature;

      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        const t0 = this.now();
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
        try {
          const res = await this.opts.transport.complete(
            {
              model: spec.modelId,
              messages: req.messages,
              temperature,
              top_p: spec.topP,
              max_tokens: spec.maxTokens,
            },
            ctrl.signal,
          );
          clearTimeout(timer);
          this.recordUsage({
            alias,
            modelId: spec.modelId,
            task: req.task,
            routeReason: idx === 0 ? decision.reason : `${decision.reason}->fallback:${alias}`,
            latencyMs: this.now() - t0,
            promptTokens: res.promptTokens,
            completionTokens: res.completionTokens,
            status: idx === 0 ? 'ok' : 'fallback_ok',
          });
          return {
            text: res.content,
            alias,
            modelId: spec.modelId,
            routeReason: idx === 0 ? decision.reason : `${decision.reason}->fallback:${alias}`,
          };
        } catch (err) {
          clearTimeout(timer);
          lastErr = err;
          const pErr = err instanceof NvidiaProviderError ? err : new NvidiaProviderError('unknown_error');
          const code = pErr.isTimeout ? 'timeout' : pErr.statusCode ? `http_${pErr.statusCode}` : pErr.message;
          this.lastError = `${alias}:${code}`;
          this.recordUsage({
            alias,
            modelId: spec.modelId,
            task: req.task,
            routeReason: decision.reason,
            latencyMs: this.now() - t0,
            status: 'error',
            errorCode: code,
          });

          // 401/403: stop total agar tidak terus memukul API dengan key salah.
          if (pErr.statusCode === 401 || pErr.statusCode === 403) {
            this.authHalted = true;
            throw new Error(`nvidia_auth_error_${pErr.statusCode}`);
          }
          // 400/422: masalah skema/parameter, atau 404 model tidak tersedia -> tandai model unhealthy & pindah fallback.
          if (pErr.statusCode === 400 || pErr.statusCode === 422 || pErr.statusCode === 404) {
            this.unhealthy.add(alias);
            break;
          }
          // Retry hanya untuk timeout / 429 / 5xx.
        }
      }
    }

    throw lastErr instanceof Error ? lastErr : new Error('all_models_failed');
  }

  /** Invoke + validasi JSON terstruktur menggunakan Zod; eskalasi 1x ke Ultra jika JSON invalid. */
  async invokeStructured<T>(
    req: RouteRequest,
    schema: ZodType<T>,
  ): Promise<{ data: T; alias: ModelAlias; modelId: string }> {
    const first = await this.invoke(req);
    const parsed1 = this.tryParseSchema(first.text, schema);
    if (parsed1.ok) return { data: parsed1.data, alias: first.alias, modelId: first.modelId };

    // Eskalasi satu kali ke Ultra jika belum memakai Ultra dan modalitas teks.
    if (first.alias !== 'ultra' && req.modality === 'text' && !this.unhealthy.has('ultra')) {
      const prevMode = this.mode;
      this.setMode('pinned:ultra', 60_000);
      try {
        const second = await this.invoke(req);
        const parsed2 = this.tryParseSchema(second.text, schema);
        if (parsed2.ok) return { data: parsed2.data, alias: second.alias, modelId: second.modelId };
      } finally {
        this.mode = prevMode;
      }
    }
    throw new Error('structured_output_validation_failed');
  }

  private tryParseSchema<T>(raw: string, schema: ZodType<T>): { ok: true; data: T } | { ok: false } {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    try {
      const obj = JSON.parse(cleaned);
      const res = schema.safeParse(obj);
      return res.success ? { ok: true, data: res.data } : { ok: false };
    } catch {
      return { ok: false };
    }
  }

  status(): RouterStatus {
    const mode = this.getEffectiveMode();
    return {
      mode,
      pinnedUntil: this.pinnedUntilMs ? new Date(this.pinnedUntilMs).toISOString() : undefined,
      fallbackEnabled: this.fallbackEnabled,
      authHalted: this.authHalted,
      unhealthyAliases: [...this.unhealthy],
      models: {
        lightning: {
          modelId: this.registry.lightning.modelId,
          lane: this.registry.lightning.lane,
          healthy: !this.unhealthy.has('lightning'),
        },
        'super-vl': {
          modelId: this.registry['super-vl'].modelId,
          lane: this.registry['super-vl'].lane,
          healthy: !this.unhealthy.has('super-vl'),
        },
        ultra: {
          modelId: this.registry.ultra.modelId,
          lane: this.registry.ultra.lane,
          healthy: !this.unhealthy.has('ultra'),
        },
      },
      totalCalls: this.callCount,
      lastError: this.lastError,
    };
  }
}
