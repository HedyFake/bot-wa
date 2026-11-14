import { providerMessages } from './privacy.js';

interface Turn { role: 'user' | 'assistant'; sender: string; text: string }

/** Konteks sementara dalam RAM. Proses baru memulai percakapan baru. */
export class ConversationContext {
  private readonly chats = new Map<string, { at: number; turns: Turn[] }>();
  constructor(private readonly now: () => number, private readonly secrets: readonly string[]) {}

  get(key: string): readonly Turn[] {
    const entry = this.chats.get(key);
    if (!entry) return [];
    if (this.now() - entry.at >= 30 * 60_000) {
      this.chats.delete(key);
      return [];
    }
    return entry.turns;
  }

  remember(key: string, sender: string, question: string, answer: string) {
    let turns: Turn[];
    try {
      const clean = providerMessages([{ role: 'user', content: sender }, { role: 'user', content: question },
        { role: 'assistant', content: answer }], this.secrets);
      turns = [...this.get(key).slice(-4),
        { role: 'user', sender: String(clean[0]!.content).slice(0,80), text: String(clean[1]!.content).slice(0,350) },
        { role: 'assistant', sender: 'HdyBot', text: String(clean[2]!.content).slice(0,350) }];
    } catch { return; }
    this.chats.delete(key);
    if (this.chats.size >= 512) this.chats.delete(this.chats.keys().next().value!);
    this.chats.set(key, { at: this.now(), turns });
  }

  delete(key: string) { this.chats.delete(key); }
}
