import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import QRCode from 'qrcode';
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
export const QR_CACHE_TS_FILE = '/tmp/hdybot-qr.ts';
export const QR_CACHE_PNG_FILE = '/tmp/hdybot-qr.png';
export const PAIRING_CODE_CACHE_FILE = '/tmp/hdybot-pairing-code.txt';

const MODERN_CHROME_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export interface WWebJsAdapterOptions {
  authDir: string;
  executablePath?: string;
  pairingPhone?: string;
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

/**
 * Bersihkan file lock Chromium (`SingletonLock`, `SingletonCookie`, `SingletonSocket`)
 * dan cache `.wwebjs_cache` usang yang sering membuat proses penautan QR gagal
 * dengan pesan "Tidak dapat menautkan perangkat. Coba lagi nanti".
 */
function cleanupChromiumLocksAndStaleCache(authDir: string): void {
  const absAuth = resolve(authDir);
  const authMarker = join(absAuth, '.hdybot-authenticated');
  const sessionDir = join(absAuth, 'session-hdybot');

  // Jika belum pernah berhasil autentikasi sama sekali tetapi ada folder session setengah jadi
  // akibat percobaan scan QR sebelumnya yang terputus, bersihkan agar kunci IndexedDB baru bersih.
  if (!existsSync(authMarker) && existsSync(sessionDir)) {
    try {
      rmSync(sessionDir, { recursive: true, force: true });
    } catch {
      // abaikan
    }
  }

  // Hapus file lock Chromium yang tertinggal bila proses sebelumnya di-restart paksa
  const removeLocksIn = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const lockName of ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'Lockfile']) {
      try {
        rmSync(join(dir, lockName), { force: true });
      } catch {
        // abaikan
      }
    }
  };

  removeLocksIn(absAuth);
  removeLocksIn(sessionDir);
  removeLocksIn(join(sessionDir, 'Default'));

  // Hapus folder .wwebjs_cache lokal agar whatsapp-web.js selalu mengambil versi WhatsApp Web terbaru
  for (const cacheCandidate of [
    resolve('.wwebjs_cache'),
    join(absAuth, '.wwebjs_cache'),
  ]) {
    if (existsSync(cacheCandidate)) {
      try {
        rmSync(cacheCandidate, { recursive: true, force: true });
      } catch {
        // abaikan
      }
    }
  }
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
 * - Sudah dioptimalkan agar bebas dari error "Tidak dapat menautkan perangkat, coba lagi nanti":
 *   1. `webVersionCache: { type: 'none' }` (selalu memakai protokol WhatsApp Web live terbaru, bukan cache 2024).
 *   2. User-Agent Chrome 131 Desktop Linux modern + `bypassCSP: true`.
 *   3. Tanpa flag `--no-zygote` yang merusak worker IndexedDB/WebCrypto saat sinkronisasi kunci QR.
 *   4. Pembersihan otomatis `SingletonLock` & sesi setengah jadi sebelum inisialisasi QR baru.
 *   5. Mendukung baik Scan QR Code (auto-refresh tiap 20 detik) maupun Kode Pairing 8-Digit (`WHATSAPP_PAIRING_PHONE`).
 */
export class WWebJsWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'wwebjs';
  private _state: ConnectionState = 'disconnected';
  private _botPhoneNumber: string | null = null;
  private msgHandlers: Array<(m: InboundMessage) => Promise<void> | void> = [];
  private stateHandlers: Array<(s: ConnectionState) => void> = [];
  private readonly botSentIds = new Set<string>();
  private MessageMediaCtor: (new (mimetype: string, data: string, filename?: string) => unknown) | null = null;
  private connectingPromise: Promise<void> | null = null;
  private qrCount = 0;
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
    if (this.connectingPromise) {
      return this.connectingPromise;
    }
    this.connectingPromise = this.doConnect().finally(() => {
      this.connectingPromise = null;
    });
    return this.connectingPromise;
  }

  private async doConnect(): Promise<void> {
    // Pastikan instance client lama dibersihkan terlebih dahulu agar tidak terjadi bentrok 2 Chrome
    if (this.client) {
      await this.client.destroy().catch(() => undefined);
      this.client = null;
    }

    this.setState('connecting');
    mkdirSync(this.opts.authDir, { recursive: true, mode: 0o700 });
    cleanupChromiumLocksAndStaleCache(this.opts.authDir);

    const authMarker = join(resolve(this.opts.authDir), '.hdybot-authenticated');

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
    const rawPairingPhone = (this.opts.pairingPhone ?? process.env.WHATSAPP_PAIRING_PHONE ?? '').replace(/\D/g, '');
    const normalizedPairingPhone = rawPairingPhone.startsWith('0')
      ? `62${rawPairingPhone.slice(1)}`
      : rawPairingPhone;

    console.log(
      `[WA] Memulai whatsapp-web.js (browser: ${executablePath ?? 'puppeteer-bundled'}${
        normalizedPairingPhone ? `, mode: Pairing Code untuk +${normalizedPairingPhone}` : ', mode: QR Code Live'
      })...`,
    );

    const clientOptions: Record<string, unknown> = {
      authStrategy: new LocalAuth({
        dataPath: this.opts.authDir,
        clientId: 'hdybot',
      }),
      // PENTING: Gunakan versi live web.whatsapp.com secara langsung agar tidak memakai HTML cache usang
      // yang menyebabkan error "Tidak dapat menautkan perangkat, coba lagi nanti" saat scan QR!
      webVersionCache: {
        type: 'none',
      },
      userAgent: MODERN_CHROME_USER_AGENT,
      deviceName: 'HdyBot Nursing 5A',
      browserName: 'Chrome',
      bypassCSP: true,
      takeoverOnConflict: true,
      takeoverTimeoutMs: 5000,
      authTimeoutMs: 90000,
      qrMaxRetries: 15,
      puppeteer: {
        headless: true,
        defaultViewport: { width: 1280, height: 800 },
        ...(executablePath ? { executablePath } : {}),
        // Catatan penting: JANGAN sertakan '--no-zygote' atau '--single-process' karena pada Chrome 120+
        // flag tersebut mematikan worker IndexedDB/WebCrypto saat proses penautan perangkat multi-device.
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--mute-audio',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--window-size=1280,800',
        ],
      },
    };

    if (normalizedPairingPhone.length >= 9) {
      clientOptions.pairWithPhoneNumber = {
        phoneNumber: normalizedPairingPhone,
        showNotification: true,
        intervalMs: 180000,
      };
    }

    const client = new Client(clientOptions);
    this.client = client;
    this.qrCount = 0;

    client.on('qr', (qrRaw: unknown) => {
      const qr = String(qrRaw ?? '').trim();
      if (!qr) return;
      this.qrCount += 1;
      const nowSec = Math.floor(Date.now() / 1000);
      const timeLabel = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false });

      try {
        qrTerminal.generate?.(qr, { small: true }, (asciiQr: string) => {
          const banner = [
            '',
            '===================================================================',
            ` 📱 SCAN QR CODE WHATSAPP BOT (Refresh #${this.qrCount} — ${timeLabel} WIB)`,
            '    ⚠️ PENTING: Scan QR PALING BAWAH / TERBARU ini dalam < 20 detik!',
            '    Buka WA Bot -> Perangkat Tertaut -> Tautkan Perangkat',
            '    (Jika gagal/lama, ketik: sudo ./install.sh --reset-wa)',
            '    (Atau pakai kode 8 digit: sudo ./install.sh --pair 08xxxxxxxxxx)',
            '    Nomor Admin Kontrol: 082233038659 (Password: hedyfake)',
            '===================================================================',
            asciiQr,
            '===================================================================',
            '',
          ].join('\n');
          process.stdout.write(`${banner}\n`);
          try {
            writeFileSync(QR_CACHE_FILE, banner, { encoding: 'utf8', mode: 0o644 });
            writeFileSync(QR_CACHE_TS_FILE, String(nowSec), { encoding: 'utf8', mode: 0o644 });
          } catch {
            // abaikan bila /tmp tidak dapat ditulis
          }
        });

        // Simpan juga versi gambar PNG resolusi tajam di /tmp/hdybot-qr.png
        void QRCode.toFile(QR_CACHE_PNG_FILE, qr, {
          type: 'png',
          width: 600,
          margin: 4,
          errorCorrectionLevel: 'M',
        }).catch(() => undefined);
      } catch (err) {
        console.error('[WA] Gagal merender QR Code di terminal:', err);
      }
    });

    client.on('code', (codeRaw: unknown) => {
      const raw = String(codeRaw ?? '').trim();
      const formatted = raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
      const banner = [
        '',
        '===================================================================',
        ' 🔑 KODE PAIRING 8-DIGIT WHATSAPP BOT ANDA SIAP!',
        `    KODE TAUtKAN PERANGKAT :  [  ${formatted}  ]`,
        `    Nomor WA Bot           :  +${normalizedPairingPhone}`,
        '    Cara Pakai di HP Bot   :  Buka WhatsApp -> Perangkat Tertaut ->',
        '                              Tautkan Perangkat -> Tautkan dengan nomor',
        '                              telepon saja -> Masukkan kode di atas!',
        '===================================================================',
        '',
      ].join('\n');
      process.stdout.write(`${banner}\n`);
      try {
        writeFileSync(PAIRING_CODE_CACHE_FILE, banner, { encoding: 'utf8', mode: 0o644 });
      } catch {
        // abaikan
      }
    });

    client.on('loading_screen', (percent: unknown, message: unknown) => {
      console.log(`[WA] ⏳ Menautkan & menyinkronkan perangkat WhatsApp: ${String(percent ?? 0)}% (${String(message ?? 'WhatsApp')})...`);
    });

    client.on('authenticated', () => {
      try {
        rmSync(QR_CACHE_FILE, { force: true });
        rmSync(QR_CACHE_TS_FILE, { force: true });
        rmSync(QR_CACHE_PNG_FILE, { force: true });
        rmSync(PAIRING_CODE_CACHE_FILE, { force: true });
        writeFileSync(authMarker, new Date().toISOString(), { encoding: 'utf8', mode: 0o600 });
      } catch {
        // abaikan
      }
      console.log('[WA] ✅ Autentikasi WhatsApp berhasil! Menyimpan sesi di', this.opts.authDir);
    });

    client.on('ready', () => {
      try {
        rmSync(QR_CACHE_FILE, { force: true });
        rmSync(QR_CACHE_TS_FILE, { force: true });
        rmSync(QR_CACHE_PNG_FILE, { force: true });
        rmSync(PAIRING_CODE_CACHE_FILE, { force: true });
        writeFileSync(authMarker, new Date().toISOString(), { encoding: 'utf8', mode: 0o600 });
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
      console.error('[WA] ❌ Autentikasi WhatsApp gagal / sesi rusak, membersihkan sesi lama agar QR baru bersih:', msg);
      try {
        rmSync(authMarker, { force: true });
        for (const entry of readdirSync(this.opts.authDir)) {
          rmSync(join(this.opts.authDir, entry), { recursive: true, force: true });
        }
      } catch {
        // abaikan
      }
      this.setState('session_expired');
    });

    client.on('disconnected', (reason: unknown) => {
      console.warn('[WA] ⚠️ Koneksi WhatsApp terputus:', reason);
      if (String(reason ?? '').toUpperCase().includes('LOGOUT')) {
        try {
          rmSync(authMarker, { force: true });
        } catch {
          // abaikan
        }
      }
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
