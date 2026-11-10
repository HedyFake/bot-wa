/** Kontrak provider WhatsApp. Business logic hanya bergantung pada interface ini. */

export type ChatType = 'private' | 'group';

export type MediaKind = 'image' | 'video' | 'audio' | 'document' | 'sticker';

export interface InboundMediaPayload {
  mimeType: string;
  sizeBytes: number;
  kind: MediaKind;
  data?: Buffer;
  filename?: string;
}

export interface OutboundMediaPayload {
  data: Buffer;
  mimeType: string;
  filename?: string;
  asDocument?: boolean;
  asSticker?: boolean;
  asVoice?: boolean;
  caption?: string;
}

export interface InboundMessage {
  /** ID pesan dari provider (dipakai untuk dedup). */
  providerMessageId: string;
  /** JID chat (private: nomor@s.whatsapp.net, grup: id@g.us). */
  chatJid: string;
  chatType: ChatType;
  /** Nama grup WhatsApp jika berasal dari grup (mis. "PJMK Semester 5" atau "Nursing Class A"). */
  chatName?: string;
  /** JID pengirim dari metadata provider yang terverifikasi — BUKAN push name. */
  senderJid: string;
  participantJid?: string;
  /** Push name hanya untuk tampilan, tidak untuk otorisasi. */
  pushName?: string;
  /** Apakah pengirim merupakan admin di grup WhatsApp tersebut. */
  isGroupAdmin?: boolean;
  /** Daftar JID yang di-mention/di-tag di dalam pesan. */
  mentionedJids?: string[];
  /** Apakah bot di-tag / disenggol secara langsung di pesan ini (mention atau reply ke pesan bot). */
  isBotMentioned?: boolean;
  text: string;
  quoted?: {
    providerMessageId: string;
    senderJid?: string;
    text?: string;
    media?: InboundMediaPayload;
  };
  isForwarded?: boolean;
  media?: InboundMediaPayload;
  adapterReceivedAt?: number;
  receivedAt: Date;
}

export interface OutboundMessage {
  chatJid: string;
  text: string;
  /** Kunci idempotensi agar retry tidak mengirim ganda. */
  idempotencyKey: string;
  quotedMessageId?: string;
  mentionedJids?: string[];
  /** Lampiran media opsional (stiker, gambar, QR, PDF, audio TTS). */
  media?: OutboundMediaPayload;
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
