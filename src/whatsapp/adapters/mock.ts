import type {
  ConnectionState, InboundMessage, OutboundMessage, SendResult, WhatsAppProvider,
} from './types.js';

/** Provider simulasi untuk development & CI. Tidak pernah menyentuh jaringan. */
export class MockWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'mock';
  private _state: ConnectionState = 'disconnected';
  private msgHandlers: Array<(m: InboundMessage) => Promise<void> | void> = [];
  private stateHandlers: Array<(s: ConnectionState) => void> = [];
  readonly sent: Array<OutboundMessage & { providerMessageId: string }> = [];
  private seq = 0;
  /** Bisa diatur di test untuk mensimulasikan kegagalan. */
  failNextSend: string | null = null;

  async connect(): Promise<void> {
    this.setState('connecting');
    this.setState('connected');
  }
  async disconnect(): Promise<void> {
    this.setState('disconnected');
  }
  state(): ConnectionState {
    return this._state;
  }
  onMessage(h: (m: InboundMessage) => Promise<void> | void): void {
    this.msgHandlers.push(h);
  }
  onStateChange(h: (s: ConnectionState) => void): void {
    this.stateHandlers.push(h);
  }
  async send(msg: OutboundMessage): Promise<SendResult> {
    if (this._state !== 'connected') return { ok: false, error: `not_connected:${this._state}` };
    if (this.failNextSend) {
      const e = this.failNextSend;
      this.failNextSend = null;
      return { ok: false, error: e };
    }
    const providerMessageId = `mock-out-${++this.seq}`;
    this.sent.push({ ...msg, providerMessageId });
    return { ok: true, providerMessageId };
  }

  /** Helper test: suntikkan pesan masuk. */
  async inject(msg: InboundMessage): Promise<void> {
    for (const h of this.msgHandlers) await h(msg);
  }
  /** Helper test: simulasikan perubahan koneksi (reconnect/logout/expiry). */
  simulateState(s: ConnectionState): void {
    this.setState(s);
  }
  private setState(s: ConnectionState): void {
    this._state = s;
    for (const h of this.stateHandlers) h(s);
  }
}
