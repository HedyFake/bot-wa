/** Kontrak provider WhatsApp. Business logic hanya bergantung pada interface ini. */

export type ChatType = 'private' | 'group';

export interface InboundMessage {
  /** ID pesan dari provider (dipakai untuk dedup). */
  providerMessageId: string;
  /** JID chat (private: nomor@s.whatsapp.net, grup: id@g.us). */
  chatJid: string;
  chatType: ChatType;
  /** JID pengirim dari metadata provider yang terverifikasi — BUKAN push name. */
  senderJid: string;
  /** Push name hanya untuk tampilan, tidak untuk otorisasi. */
  pushName?: string;
  text: string;
  quoted?: { providerMessageId: string; senderJid?: string; text?: string };
  isForwarded?: boolean;
  media?: { mimeType: string; sizeBytes: number; kind: 'image' | 'video' | 'audio' | 'document' };
  receivedAt: Date;
}

export interface OutboundMessage {
  chatJid: string;
  text: string;
  /** Kunci idempotensi agar retry tidak mengirim ganda. */
  idempotencyKey: string;
}

export interface SendResult {
  ok: boolean;
  providerMessageId?: string;
  dryRun?: boolean;
  error?: string;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'logged_out' | 'session_expired';

export interface WhatsAppProvider {
  readonly name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  state(): ConnectionState;
  onMessage(handler: (msg: InboundMessage) => Promise<void> | void): void;
  onStateChange(handler: (s: ConnectionState) => void): void;
  send(msg: OutboundMessage): Promise<SendResult>;
}
