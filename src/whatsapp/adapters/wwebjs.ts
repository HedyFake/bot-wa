import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import type {
  ConnectionState,
  InboundMediaPayload,
  InboundMessage,
  MediaKind,
  OutboundMessage,
  SendResult,
  WhatsAppProvider,
} from './types.js';

export const QR_CACHE_FILE = '/tmp/hdybot-qr.txt';

export interface WWebJsAdapterOptions {
  authDir: string;
  executablePath?: string;
}

const CHROMIUM_CANDIDATES = [
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
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

function classifyMimeKind(mime: string, wwebType?: string): MediaKind {
  if (wwebType === 'sticker' || mime.includes('webp')) return 'sticker';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'document';
}

interface WWebDownloadedMedia {
  mimetype?: string;
  data?: string;
  filename?: string;
}

interface WWebMessageLike {
  id?: { _serialized?: string };
  from?: string;
  to?: string;
  author?: string;
  body?: string;
  type?: string;
  fromMe?: boolean;
  hasMedia?: boolean;
  hasQuotedMsg?: boolean;
  isForwarded?: boolean;
  timestamp?: number;
  mentionedIds?: string[];
  _data?: { notifyName?: string; mentionedJidList?: string[] };
  getContact?: () => Promise<{ number?: string; id?: { user?: string; _serialized?: string } }>;
  getChat?: () => Promise<{
    name?: string;
    isGroup?: boolean;
    participants?: Array<{
      id?: { user?: string; _serialized?: string };
      isAdmin?: boolean;
      isSuperAdmin?: boolean;
    }>;
  }>;
  downloadMedia?: () => Promise<WWebDownloadedMedia | undefined>;
  getQuotedMessage?: () => Promise<WWebMessageLike | undefined>;
}

/**
 * Adapter WhatsApp ASLI menggunakan `whatsapp-web.js` + `qrcode-terminal`.
 * - Nomor bot bersifat dinamis/random (bisa ganti nomor WA kapan saja cukup dengan scan QR baru).
 * - Nomor admin utama (`082233038659`) dikenali otomatis + diverifikasi dengan password `hedyfake`.
 * - Mendukung teks, stiker, gambar, audio, PDF/dokumen, dan balasan media (quoted media).
 */
export class WWebJsWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'wwebjs';
  private _state: ConnectionState = 'disconnected';
  private _botPhoneNumber: string | null = null;
  private msgHandlers: Array<(m: InboundMessage) => Promise<void> | void> = [];
  private stateHandlers: Array<(s: ConnectionState) => void> = [];
  private readonly botSentIds = new Set<string>();
  private MessageMediaCtor: (new (mimetype: string, data: string, filename?: string) => unknown) | null = null;
  private client: {
    info?: { wid?: { user?: string; _serialized?: string }; pushname?: string };
    initialize: () => Promise<void>;
    destroy: () => Promise<void>;
    sendMessage: (
      chatId: string,
      content: unknown,
      options?: Record<string, unknown>,
    ) => Promise<{ id?: { _serialized?: string } }>;
  } | null = null;

  constructor(private readonly opts: WWebJsAdapterOptions) {}

  botPhoneNumber(): string | null {
    return this._botPhoneNumber;
  }

  async connect(): Promise<void> {
    this.setState('connecting');
    mkdirSync(this.opts.authDir, { recursive: true, mode: 0o700 });

    const wwebPkg = 'whatsapp-web.js';
    const wwebMod = (await import(wwebPkg)) as unknown as {
      default?: {
        Client: new (opts: Record<string, unknown>) => {
          info?: { wid?: { user?: string; _serialized?: string }; pushname?: string };
          on: (event: string, cb: (...args: unknown[]) => void) => void;
          initialize: () => Promise<void>;
          destroy: () => Promise<void>;
          sendMessage: (
            chatId: string,
            content: unknown,
            options?: Record<string, unknown>,
          ) => Promise<{ id?: { _serialized?: string } }>;
        };
        LocalAuth: new (opts: { dataPath: string; clientId?: string }) => unknown;
        MessageMedia?: new (mimetype: string, data: string, filename?: string) => unknown;
      };
      Client?: new (opts: Record<string, unknown>) => {
        info?: { wid?: { user?: string; _serialized?: string }; pushname?: string };
        on: (event: string, cb: (...args: unknown[]) => void) => void;
        initialize: () => Promise<void>;
        destroy: () => Promise<void>;
        sendMessage: (
          chatId: string,
          content: unknown,
          options?: Record<string, unknown>,
        ) => Promise<{ id?: { _serialized?: string } }>;
      };
      LocalAuth?: new (opts: { dataPath: string; clientId?: string }) => unknown;
      MessageMedia?: new (mimetype: string, data: string, filename?: string) => unknown;
    };

    const qrPkg = 'qrcode-terminal';
    const qrMod = (await import(qrPkg)) as unknown as {
      default?: {
        generate: (
          qr: string,
          opts?: { small?: boolean },
          cb?: (asciiQr: string) => void,
        ) => void;
      };
      generate?: (
        qr: string,
        opts?: { small?: boolean },
        cb?: (asciiQr: string) => void,
      ) => void;
    };

    const Client = wwebMod.default?.Client ?? wwebMod.Client;
    const LocalAuth = wwebMod.default?.LocalAuth ?? wwebMod.LocalAuth;
    this.MessageMediaCtor = wwebMod.default?.MessageMedia ?? wwebMod.MessageMedia ?? null;
    const qrTerminal = qrMod.default?.generate ? qrMod.default : qrMod;

    if (!Client || !LocalAuth) {
      this.setState('disconnected');
      throw new Error('Gagal memuat Client/LocalAuth dari whatsapp-web.js');
    }

    const executablePath = detectChromiumExecutable(
      this.opts.executablePath ?? process.env.PUPPETEER_EXECUTABLE_PATH,
    );
    console.log(`[WA] Memulai whatsapp-web.js (browser: ${executablePath ?? 'puppeteer-bundled'})...`);

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
          '--disable-software-rasterizer',
        ],
      },
    });

    this.client = client;

    client.on('qr', (qrRaw: unknown) => {
      const qr = String(qrRaw ?? '');
      try {
        qrTerminal.generate?.(qr, { small: true }, (asciiQr: string) => {
          const banner = [
            '',
            '===================================================================',
            ' 📱 SCAN QR CODE INI DI WHATSAPP BOT ANDA (NOMOR BOT BEBAS/RANDOM)',
            '    Buka WhatsApp Bot -> Perangkat Tertaut -> Tautkan Perangkat',
            '    Nomor Admin Kontrol: 082233038659 (Password: hedyfake)',
            '===================================================================',
            asciiQr,
            '===================================================================',
            '',
          ].join('\n');
          process.stdout.write(`${banner}\n`);
          try {
            writeFileSync(QR_CACHE_FILE, banner, { encoding: 'utf8', mode: 0o644 });
          } catch {
            // abaikan bila /tmp tidak dapat ditulis
          }
        });
      } catch (err) {
        console.error('[WA] Gagal merender QR Code di terminal:', err);
      }
    });

    client.on('authenticated', () => {
      try {
        rmSync(QR_CACHE_FILE, { force: true });
      } catch {
        // abaikan
      }
      console.log('[WA] ✅ Autentikasi WhatsApp berhasil! Menyimpan sesi di', this.opts.authDir);
    });

    client.on('ready', () => {
      try {
        rmSync(QR_CACHE_FILE, { force: true });
      } catch {
        // abaikan
      }
      const widUser = client.info?.wid?.user ?? null;
      this._botPhoneNumber = widUser ? `+${widUser.replace(/\D/g, '')}` : null;
      console.log(
        `[WA] 🚀 HdyBot SIAP & TERHUBUNG! Nomor WA Bot Aktif: ${this._botPhoneNumber ?? 'terhubung'} | Admin Utama: +6282233038659`,
      );
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

    const extractMedia = async (msgObj: WWebMessageLike): Promise<InboundMediaPayload | undefined> => {
      if (!msgObj.hasMedia || typeof msgObj.downloadMedia !== 'function') return undefined;
      try {
        const downloaded = await msgObj.downloadMedia();
        if (!downloaded?.data || !downloaded?.mimetype) return undefined;
        const buf = Buffer.from(downloaded.data, 'base64');
        return {
          mimeType: downloaded.mimetype,
          sizeBytes: buf.byteLength,
          kind: classifyMimeKind(downloaded.mimetype, msgObj.type),
          data: buf,
          filename: downloaded.filename,
        };
      } catch {
        return undefined;
      }
    };

    const handleRawMessage = async (msgRaw: unknown) => {
      const m = msgRaw as WWebMessageLike;
      if (!m) return;
      const msgId = String(m.id?._serialized ?? `${Date.now()}`);
      if (this.botSentIds.has(msgId)) return;

      const text = String(m.body ?? '').trim();
      if (!text && !m.hasMedia) return;

      // Jika pesan dikirim dari perangkat bot sendiri (fromMe), hanya proses bila diawali '.'
      if (m.fromMe && !text.startsWith('.')) return;

      const rawChatId = m.fromMe ? String(m.to ?? m.from ?? '') : String(m.from ?? '');
      if (!rawChatId || rawChatId === 'status@broadcast') return;

      const isGroup = rawChatId.endsWith('@g.us');
      let senderJid = isGroup ? String(m.author ?? m.from ?? '') : String(m.from ?? '');

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

      const media = await extractMedia(m);
      let quoted: InboundMessage['quoted'];
      let quotedFromBot = false;
      if (m.hasQuotedMsg && typeof m.getQuotedMessage === 'function') {
        try {
          const q = await m.getQuotedMessage();
          if (q) {
            quotedFromBot = Boolean(q.fromMe);
            const qMedia = await extractMedia(q);
            quoted = {
              providerMessageId: String(q.id?._serialized ?? ''),
              senderJid: q.author ?? q.from,
              text: q.body,
              media: qMedia,
            };
          }
        } catch {
          // abaikan bila gagal mengambil quoted message
        }
      }

      let chatName: string | undefined;
      let isGroupAdmin = false;
      if (isGroup && typeof m.getChat === 'function') {
        try {
          const chat = await m.getChat();
          chatName = chat?.name;
          const senderDigits = senderJid.replace(/\D/g, '');
          const rawAuthor = String(m.author ?? '');
          if (Array.isArray(chat?.participants)) {
            for (const p of chat.participants) {
              const pSerialized = String(p.id?._serialized ?? '');
              const pDigits = String(p.id?.user ?? pSerialized).replace(/\D/g, '');
              if (
                (pSerialized && pSerialized === rawAuthor) ||
                (senderDigits.length >= 8 && pDigits === senderDigits)
              ) {
                if (p.isAdmin || p.isSuperAdmin) {
                  isGroupAdmin = true;
                }
                break;
              }
            }
          }
        } catch {
          // abaikan bila metadata chat grup gagal diambil
        }
      }

      const rawMentions = [
        ...(Array.isArray(m.mentionedIds) ? m.mentionedIds : []),
        ...(Array.isArray(m._data?.mentionedJidList) ? m._data!.mentionedJidList! : []),
      ].map((id) => String(id));
      const mentionedJids = [...new Set(rawMentions)];
      const botUserDigits = (client.info?.wid?.user ?? this._botPhoneNumber ?? '').replace(/\D/g, '');
      const botWidSerialized = client.info?.wid?._serialized ?? '';
      const mentionedBotById = mentionedJids.some((id) => {
        const d = id.replace(/\D/g, '');
        return (
          (botWidSerialized && id === botWidSerialized) ||
          (botUserDigits.length >= 8 && d === botUserDigits)
        );
      });
      const mentionedBotByText = /(@hdybot|@bot\b|\bsenggol\s+bot\b|\bcolek\s+bot\b|\bpanggil\s+bot\b)/i.test(text);
      const isBotMentioned = mentionedBotById || quotedFromBot || mentionedBotByText;

      const inbound: InboundMessage = {
        providerMessageId: msgId,
        chatJid: rawChatId,
        chatType: isGroup ? 'group' : 'private',
        chatName,
        senderJid,
        pushName: m._data?.notifyName,
        isGroupAdmin,
        mentionedJids: mentionedJids.length ? mentionedJids : undefined,
        isBotMentioned,
        text,
        quoted,
        media,
        isForwarded: Boolean(m.isForwarded),
        receivedAt: m.timestamp ? new Date(m.timestamp * 1000) : new Date(),
      };

      for (const h of this.msgHandlers) {
        await h(inbound);
      }
    };

    client.on('message_create', (msgRaw: unknown) => {
      void handleRawMessage(msgRaw);
    });

    try {
      await client.initialize();
    } catch (err) {
      this.setState('disconnected');
      throw err;
    }
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
      let sent: { id?: { _serialized?: string } } | undefined;

      if (msg.media && this.MessageMediaCtor) {
        const mediaObj = new this.MessageMediaCtor(
          msg.media.mimeType,
          msg.media.data.toString('base64'),
          msg.media.filename,
        );
        const options: Record<string, unknown> = {};
        if (msg.media.asSticker) {
          options.sendMediaAsSticker = true;
          options.stickerAuthor = 'HdyBot — Nursing Class A';
          options.stickerName = 'HdyBot Sticker';
        } else if (msg.media.asVoice) {
          options.sendAudioAsVoice = true;
        } else if (msg.media.caption || msg.text) {
          options.caption = msg.media.caption ?? msg.text;
        }
        sent = await this.client.sendMessage(chatId, mediaObj, options);
      } else {
        sent = await this.client.sendMessage(chatId, msg.text);
      }

      const serializedId = sent?.id?._serialized ?? msg.idempotencyKey;
      this.botSentIds.add(serializedId);
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
