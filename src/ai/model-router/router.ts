import type { ZodType } from 'zod';
import {
  type ChatMessage,
  createModelRegistry,
  type InputModality,
  type ModelAlias,
  modelAliases,
  type ModelSpec,
  NvidiaProviderError,
  type NvidiaTransport,
} from '../nvidia/registry.js';

export type RouterMode = 'auto' | 'off' | 'safe' | `pinned:${ModelAlias}`;

export type TaskKind =
  | 'classification'
  | 'date_extraction'
  | 'intent_detection'
  | 'short_summary'
  | 'coding'
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
  responseBudgetMs?: number;
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
  private readonly retryAfter = new Map<ModelAlias, number>();
  private authHalted = false;
  private lunaAuthHalted = false;
  private preferNvidiaUntil = 0;
  private inFlight = 0;
  private classificationsInFlight = 0;
  private lastError?: string;
  private callCount = 0;
  readonly usageHistory: UsageLogEntry[] = [];
  private readonly now: () => number;

  constructor(
    private readonly opts: {
      transport?: NvidiaTransport;
      openai?: NvidiaTransport;
      switchMs?: number;
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
  decide(req: Omit<RouteRequest, 'messages'>, preferred?: ModelAlias): RouteDecision {
    for (const [alias, time] of this.retryAfter) {
      if (time <= this.now()) this.retryAfter.delete(alias);
    }
    const mode = this.getEffectiveMode();
    if (mode === 'off') throw new Error('ai_disabled');

    const isMultimodal = req.modality === 'image' || req.modality === 'video' || VISION_TASKS.has(req.task);

    const modality = isMultimodal && req.modality === 'text' ? 'image' : req.modality;
    let primary: ModelAlias;
    if (preferred) primary = preferred;
    else if (mode.startsWith('pinned:')) primary = mode.slice(7) as ModelAlias;
    else if (isMultimodal) primary = 'super-vl';
    else if (req.task === 'long_document_analysis' || (req.contextChars ?? 0) > 16000) primary = 'kimi';
    else if (req.task === 'coding') primary = 'minimax';
    else if (req.task === 'reformat_announcement') primary = 'mistral';
    else if (ULTRA_TASKS.has(req.task) || req.complexity === 'high') primary = 'ultra';
    else primary = req.task === 'faq' || req.task === 'intent_detection' ? 'super-vl' : 'deepseek';

    let reason = mode.startsWith('pinned:') ? 'admin_' + mode : 'auto_' + req.task;
    const order: ModelAlias[] = isMultimodal ? ['super-vl','mistral','kimi','minimax']
      : ['kimi','ultra','minimax'].includes(primary) ? ['ultra','minimax','kimi','super-vl','deepseek','mistral']
      : ['deepseek','super-vl','mistral','ultra','kimi','minimax'];
    const candidates: ModelAlias[] = [primary, ...order];
    if (this.opts.openai) {
      const preferLuna = !preferred && !mode.startsWith('pinned:') &&
        (!this.fallbackEnabled || this.preferNvidiaUntil <= this.now());
      candidates.splice(preferLuna ? 0 : 1, 0, 'luna');
      if (preferLuna && modality !== 'video') { primary = 'luna'; reason = 'auto_openai_primary'; }
    }
    const healthy = [...new Set(candidates)].filter(alias =>
      (alias === 'luna' ? this.opts.openai && !this.lunaAuthHalted : !this.authHalted && (this.opts.transport || !this.opts.openai)) &&
      this.registry[alias].modalities.includes(modality) && !this.unhealthy.has(alias) && !this.retryAfter.has(alias));
    const chosen = healthy[0];
    if (!chosen) throw new Error(isMultimodal ? 'vision_model_unavailable' : 'no_healthy_model_available');
    if (chosen !== primary) reason = `${reason}->fallback_healthy_${chosen}`;

    const spec = this.registry[chosen];
    const fallbacks = this.fallbackEnabled ? healthy.slice(1) : [];

    return {
      alias: chosen,
      spec,
      reason,
      temperature: isMultimodal ? spec.visionTemperature ?? spec.defaultTemperature : spec.defaultTemperature,
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
    return this.invokePreferred(req);
  }

  private async invokePreferred(req: RouteRequest, preferred?: ModelAlias) {
    const classification = req.task === 'classification';
    const limit = !classification && this.classificationsInFlight > 0 ? 4 : 3;
    if (this.inFlight >= limit) throw new Error('ai_busy');
    this.inFlight++;
    if (classification) this.classificationsInFlight++;
    try { return await this.invokeAvailable(req, preferred); }
    finally {
      this.inFlight--;
      if (classification) this.classificationsInFlight--;
    }
  }

  private async invokeAvailable(req: RouteRequest, preferred?: ModelAlias) {
    if (this.authHalted && !this.opts.openai) throw new Error('nvidia_auth_halted');
    if (!this.opts.transport && !this.opts.openai) throw new Error('ai_transport_not_configured');

    const decision = this.decide(req, preferred);
    const chain: ModelAlias[] = [decision.alias, ...decision.fallbacks];
    const deadline = this.now() + (req.responseBudgetMs ?? this.timeoutMs);
    let lastErr: unknown;

    for (let idx = 0; idx < chain.length; idx++) {
      const alias = chain[idx]!;
      const spec = this.registry[alias];
      const isLuna = alias === 'luna';
      const transport = isLuna ? this.opts.openai : this.opts.transport;
      if (!transport || (isLuna ? this.lunaAuthHalted : this.authHalted)) continue;
      const switching = chain.slice(idx + 1).some(next => (next === 'luna') !== isLuna);
      const temperature =
        req.modality === 'image' || req.modality === 'video'
          ? (spec.visionTemperature ?? spec.defaultTemperature)
          : spec.defaultTemperature;

      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        const t0 = this.now();
        const ctrl = new AbortController();
        const remaining = deadline - t0;
        if (remaining <= 0) throw new Error('response_timeout');
        const attemptBudget = idx < chain.length - 1 ? Math.ceil(remaining * 0.6) : remaining;
        const timer = setTimeout(() => ctrl.abort(), Math.min(this.timeoutMs, attemptBudget, switching ? this.opts.switchMs ?? 3500 : Infinity));
        try {
          const res = await transport.complete(
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

          if (ctrl.signal.aborted) {
            if (!isLuna) this.retryAfter.set(alias, this.now() + 60_000);
            if (switching) this.preferNvidiaUntil = isLuna ? this.now() + 60_000 : 0;
            break;
          }
          // Kredensial salah menghentikan semua model. Izin dan ketersediaan diperiksa per model.
          if (pErr.statusCode === 401) {
            if (isLuna) this.lunaAuthHalted = true;
            else this.authHalted = true;
            if (switching) break;
            throw new Error(isLuna ? 'openai_auth_error_401' : 'nvidia_auth_error_401');
          }
          if (pErr.statusCode === 403 || pErr.statusCode === 404) {
            this.retryAfter.set(alias, this.now() + 3600_000);
            break;
          }
          if (pErr.statusCode === 400 || pErr.statusCode === 422) {
            break;
          }
          if (switching) {
            this.preferNvidiaUntil = isLuna ? this.now() + 60_000 : 0;
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
      const second = await this.invokePreferred(req, 'ultra');
      const parsed2 = this.tryParseSchema(second.text, schema);
      if (parsed2.ok) return { data: parsed2.data, alias: second.alias, modelId: second.modelId };
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
    const unavailable = new Set([...this.unhealthy, ...[...this.retryAfter].filter(([,time]) => time > this.now()).map(([alias]) => alias)]);
    for (const alias of modelAliases) {
      if (alias === 'luna' ? !this.opts.openai || this.lunaAuthHalted : !this.opts.transport || this.authHalted) unavailable.add(alias);
    }
    return {
      mode,
      pinnedUntil: this.pinnedUntilMs ? new Date(this.pinnedUntilMs).toISOString() : undefined,
      fallbackEnabled: this.fallbackEnabled,
      authHalted: this.authHalted,
      unhealthyAliases: [...unavailable],
      models: Object.fromEntries(modelAliases.map(alias => [alias, { modelId: this.registry[alias].modelId, lane: this.registry[alias].lane, healthy: !unavailable.has(alias) }])) as RouterStatus['models'],
      totalCalls: this.callCount,
      lastError: this.lastError,
    };
  }
}
