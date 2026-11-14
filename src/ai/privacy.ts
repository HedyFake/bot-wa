import { redactString } from '../observability/logger.js';
import type { ChatMessage } from './nvidia/registry.js';

/** Minimalkan teks pada batas provider, termasuk saat failover. */
export function providerMessages(messages: ChatMessage[], secrets: readonly string[] = []): ChatMessage[] {
  const clean = (input: string) => {
    if (/\b(?:nama pasien|nomor rekam medis|no\.?\s*rm|NIK pasien)\s*[:=#]\s*\S/i.test(input)) {
      throw Error('patient_identifiers_present');
    }
    let text = redactString(input)
      .replace(/\b(?:password|passwd|api[_ -]?key|authorization|cookie|session[_-]?id|access_token)\s*[:=]\s*[^\r\n]+/gi, '[rahasia disamarkan]')
      .replace(/\b(?:\+?62|0)8\d{8,13}(?:@(?:c\.us|s\.whatsapp\.net))?\b/g, '[nomor disamarkan]');
    for (const secret of secrets) if (secret) text = text.replaceAll(secret, '[rahasia disamarkan]');
    return text;
  };
  return messages.map(msg => ({ ...msg, content: typeof msg.content === 'string' ? clean(msg.content)
    : msg.content.map(part => part.type === 'text' ? { ...part, text: clean(part.text) } : part) }));
}

/** Hasil tool dapat memuat teks mahasiswa. Bersihkan setiap nilai sebelum kedua provider menerimanya. */
export function providerToolData(value: unknown, secrets: readonly string[] = []): unknown {
  if (typeof value === 'string') return providerMessages([{ role: 'user', content: value }], secrets)[0]!.content;
  if (Array.isArray(value)) return value.map(item => providerToolData(item, secrets));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, providerToolData(item, secrets)]));
  }
  return value;
}
