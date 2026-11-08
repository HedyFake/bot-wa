import QRCode from 'qrcode';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import type {
  ConnectionState,
  InboundMessage,
  OutboundMessage,
  SendResult,
  WhatsAppProvider,
} from './types.js';

export interface BaileysAdapterOptions {
  authDir: string;
  allowExperimental: boolean;
  pairingPhoneE164?: string;
  onPairingCode?: (code: string) => void;
}

/**
 * Adapter WhatsApp berbasis `@whiskeysockets/baileys` (eksperimental/tidak resmi).
 * - Hanya boleh diaktifkan jika `WHATSAPP_ALLOW_EXPERIMENTAL_BAILEYS=true`.
 * - Menggunakan dynamic import sehingga tidak membebani runtime/test saat mode `mock`.
 * - Menyimpan sesi di `authDir` (di luar Git, permission 0700 di Ubuntu Server).
 */
export class BaileysWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'baileys';
  private _state: ConnectionState = 'disconnected';
  private msgHandlers: Array<(m: InboundMessage) => Promise<void> | void> = [];
  private stateHandlers: Array<(s: ConnectionState) => void> = [];
  private sock: {
    sendMessage: (jid: string, content: { text: string }) => Promise<{ key?: { id?: string } } | undefined>;
    end?: (err?: Error) => void;
  } | null = null;

  constructor(private readonly opts: BaileysAdapterOptions) {
    if (!opts.allowExperimental) {
      throw new Error(
        'Baileys adalah integrasi tidak resmi. Set WHATSAPP_ALLOW_EXPERIMENTAL_BAILEYS=true setelah memahami risiko ToS.',
      );
    }
  }

  async connect(): Promise<void> {
    this.setState('connecting');
    mkdirSync(this.opts.authDir, { recursive: true, mode: 0o700 });

    const moduleName = '@whiskeysockets/baileys';
    let baileys: Record<string, unknown>;
    try {
      baileys = (await import(moduleName)) as Record<string, unknown>;
    } catch {
      this.setState('disconnected');
      throw new Error(
        'Paket @whiskeysockets/baileys belum terpasang. Jalankan: npm install @whiskeysockets/baileys',
      );
    }

    const useMultiFileAuthState = baileys.useMultiFileAuthState as (
      dir: string,
    ) => Promise<{ state: { creds: { registered?: boolean } }; saveCreds: () => Promise<void> }>;
    const makeWASocket = (baileys.default ?? baileys.makeWASocket) as (
      cfg: Record<string, unknown>,
    ) => {
      ev: {
        on: (event: string, cb: (arg: Record<string, unknown>) => void) => void;
      };
      requestPairingCode?: (phone: string) => Promise<string>;
      sendMessage: (jid: string, content: { text: string }) => Promise<{ key?: { id?: string } } | undefined>;
      end?: (err?: Error) => void;
    };

    const { state, saveCreds } = await useMultiFileAuthState(this.opts.authDir);
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
    });
    this.sock = sock;

    if (this.opts.pairingPhoneE164 && !state.creds.registered && sock.requestPairingCode) {
      const digits = this.opts.pairingPhoneE164.replace(/\D/g, '');
      const code = await sock.requestPairingCode(digits);
      this.opts.onPairingCode?.(code);
    }

    sock.ev.on('creds.update', () => {
      void saveCreds();
    });

    sock.ev.on('connection.update', (u: Record<string, unknown>) => {
      if (typeof u.qr === 'string') {
        void QRCode.toBuffer(u.qr).then(data => {
          if (this._state === 'connecting') writeFileSync(join(this.opts.authDir, 'pairing-qr.png'), data, { mode: 0o600 });
        }).catch(() => undefined);
      }
      const connection = u.connection as string | undefined;
      if (connection === 'open') {
        rmSync(join(this.opts.authDir, 'pairing-qr.png'), { force: true });
        rmSync(join(this.opts.authDir, 'pairing-code.txt'), { force: true });
        this.setState('connected');
      }
      else if (connection === 'connecting') this.setState('connecting');
      else if (connection === 'close') {
        const last = u.lastDisconnect as { error?: { output?: { statusCode?: number } } } | undefined;
        this.setState(last?.error?.output?.statusCode === 401 ? 'logged_out' : 'disconnected');
      }
    });

    sock.ev.on('messages.upsert', (ev: Record<string, unknown>) => {
      const messages = (ev.messages as Array<Record<string, unknown>> | undefined) ?? [];
      for (const raw of messages) {
        const key = (raw.key as Record<string, unknown> | undefined) ?? {};
        if (key.fromMe) continue;
        const remoteJid = String(key.remoteJid ?? '');
        if (!remoteJid || remoteJid === 'status@broadcast') continue;
        const isGroup = remoteJid.endsWith('@g.us');
        const senderJid = isGroup ? String(key.participant ?? '') : remoteJid;
        const msgObj = (raw.message as Record<string, unknown> | undefined) ?? {};
        const extText = (msgObj.extendedTextMessage as Record<string, unknown> | undefined)?.text;
        const text = String(msgObj.conversation ?? extText ?? '');
        if (!text.trim()) continue;

        const inbound: InboundMessage = {
          providerMessageId: String(key.id ?? `${Date.now()}`),
          chatJid: remoteJid,
          chatType: isGroup ? 'group' : 'private',
          senderJid,
          pushName: typeof raw.pushName === 'string' ? raw.pushName : undefined,
          text,
          receivedAt: new Date(),
        };
        for (const h of this.msgHandlers) void h(inbound);
      }
    });
  }

  async disconnect(): Promise<void> {
    this.sock?.end?.();
    this.sock = null;
    this.setState('disconnected');
  }

  state(): ConnectionState {
    return this._state;
  }

  onMessage(handler: (msg: InboundMessage) => Promise<void> | void): void {
    this.msgHandlers.push(handler);
  }

  onStateChange(handler: (s: ConnectionState) => void): void {
    this.stateHandlers.push(handler);
  }

  async send(msg: OutboundMessage): Promise<SendResult> {
    if (!this.sock || this._state !== 'connected') {
      return { ok: false, error: `not_connected:${this._state}` };
    }
    if (msg.media) return { ok: false, error: 'media_unsupported' };
    try {
      const res = await this.sock.sendMessage(msg.chatJid, { text: msg.text });
      return res?.key?.id ? { ok: true, providerMessageId: res.key.id } : { ok: false, error: 'send_failed' };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.name : 'send_failed' };
    }
  }

  private setState(s: ConnectionState): void {
    this._state = s;
    for (const h of this.stateHandlers) h(s);
  }
}
