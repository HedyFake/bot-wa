export const modelAliases = ['deepseek', 'super-vl', 'mistral', 'ultra', 'kimi', 'minimax', 'lightning'] as const;
export type ModelAlias = typeof modelAliases[number];
export function isModelAlias(value: string): value is ModelAlias {
  return modelAliases.some(alias => alias === value);
}
export type InputModality = 'text' | 'image' | 'video';

export interface ModelSpec {
  alias: ModelAlias;
  modelId: string;
  lane: 'fast' | 'vision' | 'reasoning';
  modalities: readonly InputModality[];
  defaultTemperature: number;
  visionTemperature?: number;
  topP: number;
  maxTokens: number;
  supportsTools: boolean;
}

export const DEFAULT_MODEL_IDS: Record<ModelAlias, string> = {
  deepseek: 'deepseek-ai/deepseek-v4.1-flash',
  mistral: 'mistralai/mistral-large-4-1t-a52b',
  kimi: 'moonshotai/kimi-k3.1-pro',
  minimax: 'minimaxai/minimax-m3.1-flash',
  ultra: 'nvidia/nemotron-3-ultra-550b-a55b',
  'super-vl': 'nvidia/nemotron-3.5-super-vl-120b-a12b',
  lightning: 'nvidia/nemotron-3.5-lightning-30b-a3b',
};

export function createModelRegistry(overrides?: Partial<Record<ModelAlias, string>>): Record<ModelAlias, ModelSpec> {
  const ids = { ...DEFAULT_MODEL_IDS, ...overrides };
  const model = (alias: ModelAlias, lane: ModelSpec['lane'], modalities: ModelSpec['modalities']): ModelSpec => ({
    alias, lane, modalities, modelId: ids[alias], defaultTemperature: 0.6, topP: 0.95, maxTokens: 4096, supportsTools: false,
  });
  return {
    deepseek: model('deepseek','fast',['text']),
    mistral: model('mistral','vision',['text','image']),
    kimi: model('kimi','reasoning',['text','image','video']),
    minimax: model('minimax','fast',['text','image']),
    lightning: {
      alias: 'lightning',
      modelId: ids.lightning,
      lane: 'fast',
      modalities: ['text'],
      defaultTemperature: 0.4,
      topP: 0.95,
      maxTokens: 2048,
      supportsTools: true,
    },
    'super-vl': {
      alias: 'super-vl',
      modelId: ids['super-vl'],
      lane: 'vision',
      modalities: ['text', 'image', 'video'],
      defaultTemperature: 1.0,
      visionTemperature: 0.6,
      topP: 0.95,
      maxTokens: 4096,
      supportsTools: false,
    },
    ultra: {
      alias: 'ultra',
      modelId: ids.ultra,
      lane: 'reasoning',
      modalities: ['text'],
      defaultTemperature: 0.6,
      topP: 0.95,
      maxTokens: 4096,
      supportsTools: true,
    },
  };
}

export interface ChatContentPartText {
  type: 'text';
  text: string;
}
export interface ChatContentPartImage {
  type: 'image_url';
  image_url: { url: string };
}
export type ChatMessageContent = string | Array<ChatContentPartText | ChatContentPartImage>;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: ChatMessageContent;
}

export interface NvidiaCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature: number;
  top_p: number;
  max_tokens: number;
}

export interface NvidiaCompletionResult {
  content: string;
  promptTokens?: number;
  completionTokens?: number;
}

export class NvidiaProviderError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly isTimeout = false,
  ) {
    super(message);
    this.name = 'NvidiaProviderError';
  }
}

export interface NvidiaTransport {
  complete(req: NvidiaCompletionRequest, signal?: AbortSignal): Promise<NvidiaCompletionResult>;
  listModels?(signal?: AbortSignal): Promise<string[]>;
}

/**
 * Sanitasi output model:
 * - Tidak pernah menyertakan `reasoning_content` atau blok `<think>...</think>`.
 */
export function sanitizeModelContent(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

/**
 * OpenAI-compatible HTTP transport ke `https://integrate.api.nvidia.com/v1`.
 * Memakai `fetch` bawaan Node 20+ sehingga ringan dan bebas dependency berat.
 */
export class HttpNvidiaTransport implements NvidiaTransport {
  constructor(
    private readonly opts: {
      apiKey: string;
      baseUrl: string;
      fetchImpl?: typeof fetch;
    },
  ) {}

  private get f(): typeof fetch {
    return this.opts.fetchImpl ?? fetch;
  }

  async complete(req: NvidiaCompletionRequest, signal?: AbortSignal): Promise<NvidiaCompletionResult> {
    const url = `${this.opts.baseUrl.replace(/\/$/, '')}/chat/completions`;
    let res: Response;
    try {
      res = await this.f(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.opts.apiKey}`,
        },
        body: JSON.stringify({ ...req, stream: false }),
        signal,
      });
    } catch (e) {
      const isAbort = e instanceof Error && (e.name === 'AbortError' || /timeout|aborted/i.test(e.message));
      throw new NvidiaProviderError(isAbort ? 'request_timeout' : 'network_error', undefined, isAbort);
    }

    if (!res.ok) {
      throw new NvidiaProviderError(`http_${res.status}`, res.status, res.status === 408 || res.status === 504);
    }

    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: unknown; reasoning_content?: unknown } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    // Sengaja abaikan `reasoning_content` agar tidak pernah bocor ke user/log.
    const text = sanitizeModelContent(body.choices?.[0]?.message?.content);
    if (!text) {
      throw new NvidiaProviderError('empty_content', 502, false);
    }
    return {
      content: text,
      promptTokens: body.usage?.prompt_tokens,
      completionTokens: body.usage?.completion_tokens,
    };
  }

  async listModels(signal?: AbortSignal): Promise<string[]> {
    const url = `${this.opts.baseUrl.replace(/\/$/, '')}/models`;
    const res = await this.f(url, {
      headers: { authorization: `Bearer ${this.opts.apiKey}` },
      signal,
    });
    if (!res.ok) throw new NvidiaProviderError(`http_${res.status}`, res.status);
    const body = (await res.json()) as { data?: Array<{ id?: string }> };
    return (body.data ?? []).map((d) => d.id).filter((x): x is string => Boolean(x));
  }
}
