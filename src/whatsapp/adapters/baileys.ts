import { readBaileys } from './baileys-media.js';
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
  maxMediaBytes?:number;
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
    sendMessage: (jid: string, content: Record<string,unknown>) => Promise<{ key?: { id?: string } } | undefined>;
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
      sendMessage: (jid: string, content: Record<string,unknown>) => Promise<{ key?: { id?: string } } | undefined>;
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

    const download=baileys.downloadContentFromMessage as Parameters<typeof readBaileys>[1];
    sock.ev.on('messages.upsert', async (ev: Record<string,unknown>)=>{
      for(const raw of (ev.messages as Array<Record<string,unknown>>|undefined)??[]) {
        try {
          const msg=await readBaileys(raw,download,this.opts.maxMediaBytes??25*1024*1024);
          if(msg){const own=(sock as {user?:{id?:string}}).user?.id?.replace(/:\d+@/,'@');
            msg.isBotMentioned=!!own && !!msg.mentionedJids?.some(j=>j.replace(/:\d+@/,'@')===own);
            for(const h of this.msgHandlers)await h(msg);}
        } catch {console.warn('[WA] Pesan Baileys belum dapat diproses.');}
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
    try {
      const m=msg.media;
      let content:Record<string,unknown>={text:msg.text};
      if (m) {
        if(m.asSticker) content={sticker:m.data};
        else if(!m.asDocument && m.mimeType.startsWith('image/')) content={image:m.data,caption:msg.text};
        else if(!m.asDocument && m.mimeType.startsWith('video/')) content={video:m.data,caption:msg.text,mimetype:m.mimeType};
        else if(!m.asDocument && m.mimeType.startsWith('audio/')) content={audio:m.data,ptt:!!m.asVoice,mimetype:m.mimeType};
        else content={document:m.data,fileName:m.filename||'dokumen',mimetype:m.mimeType,caption:msg.text};
      }
      if(msg.mentionedJids?.length) content.mentions=msg.mentionedJids;
      const res = await this.sock.sendMessage(msg.chatJid, content);
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
