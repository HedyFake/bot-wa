import { existsSync, mkdirSync } from 'node:fs';
import type {
  ConnectionState,
  InboundMessage,
  OutboundMessage,
  SendResult,
  WhatsAppProvider,
} from './types.js';

export interface WWebJsAdapterOptions {
  authDir: string;
  executablePath?: string;
}

const CHROMIUM_CANDIDATES = [
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/snap/bin/chromium',
];

function detectChromiumExecutable(explicit?: string): string | undefined {
  if (explicit && existsSync(explicit)) return explicit;
  for (const p of CHROMIUM_CANDIDATES) {
    if (existsSync(p)) return p;
  }
  return undefined;
}

/** Konversi JID internal ke format `whatsapp-web.js` (`@c.us` untuk chat pribadi). */
export function toWWebChatId(jid: string): string {
  if (jid.endsWith('@s.whatsapp.net')) {
    return `${jid.slice(0, -'@s.whatsapp.net'.length)}@c.us`;
  }
  return jid;
}

interface WWebMessageLike {
  id?: { _serialized?: string };
  from?: string;
  to?: string;
  author?: string;
  body?: string;
  fromMe?: boolean;
  isForwarded?: boolean;
  timestamp?: number;
  _data?: { notifyName?: string };
  getContact?: () => Promise<{ number?: string; id?: { user?: string; _serialized?: string } }>;
}

/**
 * Adapter WhatsApp ASLI menggunakan `whatsapp-web.js` + `qrcode-terminal`.
 * - Menampilkan QR Code langsung di terminal saat belum tertaut.
 * - Menyimpan sesi login secara persisten di `WHATSAPP_AUTH_DIR` dengan `LocalAuth`
 *   sehingga tetap tersambung 24/7 setelah restart tanpa perlu scan ulang.
 * - Meresolusi nomor telepon pengirim asli (`getContact().number`) sehingga tetap
 *   mengenali nomor Hedy (`082233038659`) meskipun WhatsApp menggunakan format `@lid` atau `@c.us`.
 * - Mendukung kontrol baik dari nomor lain maupun dari chat ke nomor sendiri (Self-Chat).
 */
export class WWebJsWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'wwebjs';
  private _state: ConnectionState = 'disconnected';
  private msgHandlers: Array<(m: InboundMessage) => Promise<void> | void> = [];
  private stateHandlers: Array<(s: ConnectionState) => void> = [];
  private readonly botSentIds = new Set<string>();
  private client: {
    initialize: () => Promise<void>;
    destroy: () => Promise<void>;
    sendMessage: (chatId: string, content: string) => Promise<{ id?: { _serialized?: string } }>;
  } | null = null;

  constructor(private readonly opts: WWebJsAdapterOptions) {}

  async connect(): Promise<void> {
    this.setState('connecting');
    mkdirSync(this.opts.authDir, { recursive: true, mode: 0o700 });

    const wwebPkg = 'whatsapp-web.js';
    const wwebMod = (await import(wwebPkg)) as unknown as {
      default?: {
        Client: new (opts: Record<string, unknown>) => {
          on: (event: string, cb: (...args: unknown[]) => void) => void;
          initialize: () => Promise<void>;
          destroy: () => Promise<void>;
          sendMessage: (chatId: string, content: string) => Promise<{ id?: { _serialized?: string } }>;
        };
        LocalAuth: new (opts: { dataPath: string; clientId?: string }) => unknown;
      };
      Client?: new (opts: Record<string, unknown>) => {
        on: (event: string, cb: (...args: unknown[]) => void) => void;
        initialize: () => Promise<void>;
        destroy: () => Promise<void>;
        sendMessage: (chatId: string, content: string) => Promise<{ id?: { _serialized?: string } }>;
      };
      LocalAuth?: new (opts: { dataPath: string; clientId?: string }) => unknown;
    };

    const qrPkg = 'qrcode-terminal';
    const qrMod = (await import(qrPkg)) as unknown as {
      default?: { generate: (qr: string, opts?: { small?: boolean }) => void };
      generate?: (qr: string, opts?: { small?: boolean }) => void;
    };

    const Client = wwebMod.default?.Client ?? wwebMod.Client;
    const LocalAuth = wwebMod.default?.LocalAuth ?? wwebMod.LocalAuth;
    const generateQr = qrMod.default?.generate ?? qrMod.generate;

    if (!Client || !LocalAuth) {
      throw new Error('Gagal memuat Client/LocalAuth dari whatsapp-web.js');
    }

    const executablePath = detectChromiumExecutable(
      this.opts.executablePath ?? process.env.PUPPETEER_EXECUTABLE_PATH,
    );

    const client = new Client({
      authStrategy: new LocalAuth({
        dataPath: this.opts.authDir,
        clientId: 'hdybot',
      }),
      puppeteer: {
        headless: true,
        ...(executablePath ? { executablePath } : {}),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      },
    });

    this.client = client;

    client.on('qr', (qrRaw: unknown) => {
      const qr = String(qrRaw ?? '');
      console.log('\n===================================================================');
      console.log(' 📱 SCAN QR CODE INI DI WHATSAPP ANDA UNTUK MENAUTKAN HDYBOT');
      console.log('    Buka WhatsApp -> Perangkat Tertaut -> Tautkan Perangkat');
      console.log('===================================================================\n');
      generateQr?.(qr, { small: true });
      console.log('\n===================================================================\n');
    });

    client.on('authenticated', () => {
      console.log('[WA] ✅ Autentikasi WhatsApp berhasil! Menyimpan sesi...');
    });

    client.on('ready', () => {
      console.log('[WA] 🚀 HdyBot SIAP & TERHUBUNG ke WhatsApp Asli!');
      this.setState('connected');
    });

    client.on('auth_failure', (msg: unknown) => {
      console.error('[WA] ❌ Autentikasi WhatsApp gagal / sesi kadaluarsa:', msg);
      this.setState('session_expired');
    });

    client.on('disconnected', (reason: unknown) => {
      console.warn('[WA] ⚠️ Koneksi WhatsApp terputus:', reason);
      this.setState('disconnected');
    });

    const handleRawMessage = async (msgRaw: unknown) => {
      const m = msgRaw as WWebMessageLike;
      if (!m) return;
      const msgId = String(m.id?._serialized ?? `${Date.now()}`);
      // Abaikan pesan balasan yang dikirim oleh HdyBot sendiri agar tidak terjadi loop
      if (this.botSentIds.has(msgId)) return;

      const text = String(m.body ?? '').trim();
      if (!text) return;

      // Jika pesan dikirim dari perangkat owner sendiri (fromMe), hanya proses jika diawali '.' (command eksplisit)
      if (m.fromMe && !text.startsWith('.')) return;

      const rawChatId = m.fromMe ? String(m.to ?? m.from ?? '') : String(m.from ?? '');
      if (!rawChatId || rawChatId === 'status@broadcast') return;

      const isGroup = rawChatId.endsWith('@g.us');
      let senderJid = isGroup ? String(m.author ?? m.from ?? '') : String(m.from ?? '');

      // Resolusi nomor telepon asli jika WhatsApp Web memakai format @lid atau @c.us
      if (typeof m.getContact === 'function') {
        try {
          const contact = await m.getContact();
          const digits = (contact?.number ?? contact?.id?.user ?? '').replace(/\D/g, '');
          if (digits.length >= 8) {
            senderJid = `${digits}@s.whatsapp.net`;
          }
        } catch {
          // Gunakan senderJid apa adanya jika getContact gagal
        }
      }

      const inbound: InboundMessage = {
        providerMessageId: msgId,
        chatJid: rawChatId,
        chatType: isGroup ? 'group' : 'private',
        senderJid,
        pushName: m._data?.notifyName,
        text,
        isForwarded: Boolean(m.isForwarded),
        receivedAt: m.timestamp ? new Date(m.timestamp * 1000) : new Date(),
      };

      for (const h of this.msgHandlers) {
        await h(inbound);
      }
    };

    // Gunakan message_create agar menangkap pesan masuk dari orang lain MAUPUN command yang diketik owner sendiri
    client.on('message_create', (msgRaw: unknown) => {
      void handleRawMessage(msgRaw);
    });

    await client.initialize();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.destroy().catch(() => undefined);
      this.client = null;
    }
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
    if (!this.client || this._state !== 'connected') {
      return { ok: false, error: `not_connected:${this._state}` };
    }
    try {
      const chatId = toWWebChatId(msg.chatJid);
      const sent = await this.client.sendMessage(chatId, msg.text);
      const serializedId = sent?.id?._serialized ?? msg.idempotencyKey;
      this.botSentIds.add(serializedId);
      // Batasi ukuran cache ID pesan keluar
      if (this.botSentIds.size > 2000) {
        const first = this.botSentIds.values().next().value;
        if (first) this.botSentIds.delete(first);
      }
      return {
        ok: true,
        providerMessageId: serializedId,
      };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'send_failed',
      };
    }
  }

  private setState(s: ConnectionState): void {
    this._state = s;
    for (const h of this.stateHandlers) h(s);
  }
}
