import { type NvidiaCompletionRequest, NvidiaProviderError, sanitizeModelContent } from '../nvidia/registry.js';

export class LunaTransport {
  constructor(private apiKey: string, private request: typeof fetch = fetch) {}

  async complete(req: NvidiaCompletionRequest, signal?: AbortSignal) {
    const res = await this.request('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal, redirect: 'error',
      headers: {Authorization: 'Bearer ' + this.apiKey, 'Content-Type': 'application/json'},
      body: JSON.stringify({model:'gpt-6-luna', messages:req.messages, reasoning_effort:'none',
        max_completion_tokens:req.max_tokens, store:false}),
    });
    if (!res.ok) throw new NvidiaProviderError('openai_http_' + res.status, res.status);
    const data = await res.json();
    const content = sanitizeModelContent(data.choices?.[0]?.message?.content);
    if (!content) throw new NvidiaProviderError('openai_empty_content', 502);
    return {content, promptTokens:data.usage?.prompt_tokens, completionTokens:data.usage?.completion_tokens};
  }
}
