import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type {
  ConnectionState,
  InboundMediaPayload,
  InboundMessage,
  MediaKind,
  OutboundMessage,
  SendResult,
  WhatsAppProvider,
} from './types.js';

const DEFAULT_CHROME_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

export interface WWebJsAdapterOptions {
  authDir: string;
  maxMediaBytes?: number;
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
 * Bangun User-Agent Desktop Linux yang persis sama dengan versi binary Chrome yang terpasang
 * (tanpa string "HeadlessChrome") agar `navigator.userAgent`, `navigator.platform`, dan
 * Client Hints (`sec-ch-ua`) 100% konsisten saat verifikasi `syncd` pasca-scan QR.
 */
function buildMatchedUserAgent(executablePath?: string): string {
  if (executablePath && existsSync(executablePath)) {
    try {
      const out = execFileSync(executablePath, ['--version'], {
        encoding: 'utf8',
        timeout: 3000,
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();
      const m = out.match(/(\d+\.\d+\.\d+\.\d+)/);
      if (m?.[1]) {
        return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${m[1]} Safari/537.36`;
      }
    } catch {
      // gunakan fallback bila gagal membaca versi
    }
  }
  return DEFAULT_CHROME_USER_AGENT;
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
    pupPage?: {
      evaluate: <T = unknown>(fn: (...args: unknown[]) => T, ...args: unknown[]) => Promise<T>;
      exposeFunction?: (name: string, fn: (...args: unknown[]) => unknown) => Promise<void>;
    };
    lastLoggedOut?: boolean;
    inject?: () => Promise<void>;
    attachEventListeners?: () => Promise<void>;
    getChatById?: (chatId: unknown) => Promise<unknown>;
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
    // Chromium memegang lock profilnya sendiri. Jangan hentikan proses lain.

    const QR_CACHE_FILE = join(this.opts.authDir, 'pairing-qr.txt');
    const QR_CACHE_TS_FILE = join(this.opts.authDir, 'pairing-qr.ts');
    const PAIRING_CODE_CACHE_FILE = join(this.opts.authDir, 'pairing-code.txt');
    const authMarker = join(resolve(this.opts.authDir), '.hdybot-authenticated');

    const wwebPkg = 'whatsapp-web.js';
    type WWebClientInstance = NonNullable<WWebJsWhatsAppProvider['client']> & {
      on: (event: string, cb: (...args: unknown[]) => void) => void;
    };
    const wwebMod = (await import(wwebPkg)) as unknown as {
      default?: {
        Client: new (opts: Record<string, unknown>) => WWebClientInstance;
        LocalAuth: new (opts: { dataPath: string; clientId?: string }) => unknown;
        MessageMedia?: new (mimetype: string, data: string, filename?: string) => unknown;
      };
      Client?: new (opts: Record<string, unknown>) => WWebClientInstance;
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
    const matchedUserAgent = buildMatchedUserAgent(executablePath);
    const rawPairingPhone = (this.opts.pairingPhone ?? process.env.WHATSAPP_PAIRING_PHONE ?? '').replace(/\D/g, '');
    const normalizedPairingPhone = rawPairingPhone.startsWith('0')
      ? `62${rawPairingPhone.slice(1)}`
      : rawPairingPhone;

    console.log(
      `[WA] Memulai whatsapp-web.js (browser: ${executablePath ?? 'puppeteer-bundled'}${
        normalizedPairingPhone ? `, mode: Pairing Code` : ', mode: QR Code Live'
      })...`,
    );

    const localAuth = new LocalAuth({
      dataPath: this.opts.authDir,
      clientId: 'hdybot',
    }) as { logout?: () => Promise<void> };
    // LocalAuth.logout() menghapus profil Chromium. Arsipkan/ganti sesi hanya melalui tindakan owner.
    localAuth.logout = async () => { this.setState('logged_out'); };

    const clientOptions: Record<string, unknown> = {
      authStrategy: localAuth,
      // PENTING:
      // 1. Gunakan versi live web.whatsapp.com secara langsung (`type: 'none'`).
      // 2. JANGAN set `deviceName` atau `browserName`! Di whatsapp-web.js, `setDeviceName`
      //    mengubah `WAWebMiscBrowserUtils.info().os` setelah halaman dimuat sehingga tidak cocok
      //    dengan platform registrasi awal saat `syncd` pasca-QR dan menyebabkan `LOGOUT` otomatis!
      webVersionCache: {
        type: 'none',
      },
      userAgent: matchedUserAgent,
      bypassCSP: true,
      authTimeoutMs: 120000,
      qrMaxRetries: 0,
      puppeteer: {
        headless: true,
        defaultViewport: { width: 1280, height: 800 },
        ...(executablePath ? { executablePath } : {}),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-gpu',
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

    // --- Patch 1: Normalisasi & amankan `getChatById` agar event internal `onChatUnreadCountEvent`
    // di whatsapp-web.js 1.34.2 (yang mengirim object `{_serialized}` alih-alih string) tidak melempar unhandledRejection.
    if (typeof client.getChatById === 'function') {
      const origGetChatById = client.getChatById.bind(client);
      client.getChatById = async (chatId: unknown) => {
        try {
          const normalizedId =
            typeof chatId === 'object' && chatId !== null && '_serialized' in chatId
              ? String((chatId as { _serialized?: unknown })._serialized ?? '')
              : String(chatId ?? '');
          if (!normalizedId) return undefined;
          return await origGetChatById(normalizedId);
        } catch {
          return undefined;
        }
      };
    }

    // --- Patch 2: Lindungi `client.inject` dari bug `onAuthAppStateChangedEvent` (window.require di Node.js)
    // serta race condition `framenavigated` pada iframe setelah status READY.
    if (typeof client.inject === 'function') {
      const origInject = client.inject.bind(client);
      let isInjecting = false;
      const patchedPages = new WeakSet<object>();

      client.inject = async () => {
        if (isInjecting) return;
        isInjecting = true;
        try {
          const page = client.pupPage;
          if (page && this._state === 'connected' && !client.lastLoggedOut) {
            const alreadyReady = await page
              .evaluate(() => {
                const w = window as unknown as { AuthStore?: unknown; WWebJS?: unknown };
                return Boolean(w.AuthStore && w.WWebJS);
              })
              .catch(() => false);
            if (alreadyReady) {
              return;
            }
          }

          if (page && typeof page.exposeFunction === 'function' && !patchedPages.has(page)) {
            patchedPages.add(page);
            // Buat page.exposeFunction idempotent agar tidak pernah gagal dengan
            // "window['onAddMessageEvent'] already exists!" saat attachEventListeners dipanggil ulang.
            const origExpose = page.exposeFunction.bind(page);
            page.exposeFunction = async (name: string, fn: (...args: unknown[]) => unknown) => {
              try {
                await origExpose(name, fn);
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                if (msg.includes('already exists')) {
                  return;
                }
                throw err;
              }
            };

            await page
              .exposeFunction('onAuthAppStateChangedEvent', async (state: unknown) => {
                if (state === 'UNPAIRED_IDLE' && !normalizedPairingPhone) {
                  try {
                    await page.evaluate(() => {
                      const w = window as unknown as {
                        require?: (m: string) => { Cmd?: { refreshQR?: () => void } };
                      };
                      w.require?.('WAWebCmd')?.Cmd?.refreshQR?.();
                    });
                  } catch {
                    // abaikan bila halaman sedang berpindah/reload
                  }
                }
              })
              .catch(() => undefined);
          }

          await origInject();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (
            !msg.includes('Execution context was destroyed') &&
            !msg.includes('Target closed') &&
            !msg.includes('Session closed')
          ) {
            console.warn('[WA] Peringatan saat inject halaman WA Web (diabaikan):', msg);
          }
        } finally {
          isInjecting = false;
        }
      };
    }

    // --- Patch 3: Matikan listener `Chat.on('change:unreadCount')` di dalam browser setelah `attachEventListeners`
    // agar sinkronisasi awal pasca-scan QR tidak membanjiri websocket dengan puluhan `groupMetadata.update`
    // secara bersamaan yang menyebabkan `unhandledRejection` & `LOGOUT` saat `syncd` berlangsung.
    if (typeof client.attachEventListeners === 'function') {
      const origAttach = client.attachEventListeners.bind(client);
      let isAttaching = false;
      client.attachEventListeners = async () => {
        if (isAttaching) return;
        isAttaching = true;
        try {
          await origAttach();
        } catch (err) {
          console.warn('[WA] Peringatan saat attachEventListeners (diabaikan):', err);
        } finally {
          isAttaching = false;
        }
        try {
          await client.pupPage?.evaluate(() => {
            const w = window as unknown as {
              require?: (mod: string) => Record<string, unknown>;
              WWebJS?: Record<string, (...args: unknown[]) => unknown>;
            };
            try {
              const collections = w.require?.('WAWebCollections') as
                | { Chat?: { off?: (ev: string) => void } }
                | undefined;
              collections?.Chat?.off?.('change:unreadCount');
            } catch {
              // abaikan
            }
            if (w.WWebJS && typeof w.WWebJS.getChat === 'function') {
              const origGetChat = w.WWebJS.getChat.bind(w.WWebJS);
              w.WWebJS.getChat = async (chatId: unknown, opts?: unknown) => {
                const normalized =
                  typeof chatId === 'object' && chatId !== null && '_serialized' in chatId
                    ? (chatId as { _serialized: string })._serialized
                    : chatId;
                if (!normalized || typeof normalized !== 'string') return null;
                try {
                  return await origGetChat(normalized, opts);
                } catch {
                  return null;
                }
              };
            }
          });
        } catch {
          // abaikan
        }
      };
    }

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

            '===================================================================',
            asciiQr,
            '===================================================================',
            '',
          ].join('\n');

          try {
            writeFileSync(QR_CACHE_FILE, banner, { encoding: 'utf8', mode: 0o600 });
            writeFileSync(QR_CACHE_TS_FILE, String(nowSec), { encoding: 'utf8', mode: 0o600 });
          } catch {
            // abaikan bila /tmp tidak dapat ditulis
          }
        });

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

      try {
        writeFileSync(PAIRING_CODE_CACHE_FILE, banner, { encoding: 'utf8', mode: 0o600 });
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
        rmSync(PAIRING_CODE_CACHE_FILE, { force: true });
        writeFileSync(authMarker, new Date().toISOString(), { encoding: 'utf8', mode: 0o600 });
      } catch {
        // abaikan
      }
      const widUser = client.info?.wid?.user ?? null;
      this._botPhoneNumber = widUser ? `+${widUser.replace(/\D/g, '')}` : null;
      console.log('[WA] HdyBot terhubung.');
      this.setState('connected');
    });

    client.on('auth_failure', () => {
      if (this.client !== client) return;
      console.warn('[WA] Autentikasi gagal. Periksa sesi melalui akses privat VPS.');
      this.setState('session_expired');
    });

    client.on('disconnected', (reason: unknown) => {
      if (this.client !== client) return;
      console.warn('[WA] Koneksi WhatsApp terputus.');
      if (String(reason ?? '').toUpperCase().includes('LOGOUT')) {
        try {
          rmSync(authMarker, { force: true });
        } catch {
          // abaikan
        }
      }
      if (this.client === client) {
        this.client = null;
      }
      void client.destroy().catch(() => undefined);
      if (this._state !== 'session_expired') this.setState(String(reason).toUpperCase().includes('LOGOUT') ? 'logged_out' : 'disconnected');
    });

    const extractMedia = async (msgObj: WWebMessageLike): Promise<InboundMediaPayload | undefined> => {
      if (!msgObj.hasMedia || typeof msgObj.downloadMedia !== 'function') return undefined;
      try {
        const downloaded = await msgObj.downloadMedia();
        if (!downloaded?.data || !downloaded?.mimetype) return undefined;
        if (downloaded.data.length > Math.ceil((this.opts.maxMediaBytes ?? 25 * 1024 * 1024) / 3) * 4) return undefined;
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

      // Pesan keluar (termasuk isi relay) tidak boleh masuk kembali sebagai perintah.
      if (m.fromMe) return;

      const rawChatId = m.fromMe ? String(m.to ?? m.from ?? '') : String(m.from ?? '');
      if (!rawChatId || rawChatId === 'status@broadcast') return;

      const isGroup = rawChatId.endsWith('@g.us');
      let senderJid = isGroup ? String(m.author ?? m.from ?? '') : String(m.from ?? '');
      const isLidSender = senderJid.endsWith('@lid');

      if (typeof m.getContact === 'function') {
        try {
          const contact = await m.getContact();
          const contactNumberDigits = (contact?.number ?? '').replace(/\D/g, '');
          const contactUserDigits = (contact?.id?.user ?? '').replace(/\D/g, '');
          if (isLidSender) {
            // Untuk pengirim @lid, hanya ganti ke @s.whatsapp.net bila contact.number berisi nomor telepon asli
            // yang berbeda dari ID LID internal.
            if (contactNumberDigits.length >= 8 && contactNumberDigits !== contactUserDigits) {
              senderJid = `${contactNumberDigits}@s.whatsapp.net`;
            }
          } else {
            const digits = contactNumberDigits || contactUserDigits;
            if (digits.length >= 8) {
              senderJid = `${digits}@s.whatsapp.net`;
            }
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
        participantJid: isGroup ? m.author : undefined,
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
      void handleRawMessage(msgRaw).catch((err) => {
        console.warn('[WA] Gagal memproses message_create:', err instanceof Error ? err.name : 'Error');
      });
    });

    try {
      await client.initialize();
    } catch (err) {
      if (!['logged_out', 'session_expired'].includes(this.state())) this.setState('disconnected');
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

      const options: Record<string, unknown> = { sendSeen: false, quotedMessageId: msg.quotedMessageId, mentions: msg.mentionedJids?.map(toWWebChatId) };
      if (msg.media && !this.MessageMediaCtor) return { ok: false, error: 'media_unavailable' };
      if (msg.media && this.MessageMediaCtor) {
        const mediaObj = new this.MessageMediaCtor(
          msg.media.mimeType,
          msg.media.data.toString('base64'),
          msg.media.filename,
        );
        if (msg.media.asDocument) options.sendMediaAsDocument = true;
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
        sent = await this.client.sendMessage(chatId, msg.text, options);
      }

      const serializedId = sent?.id?._serialized;
      if (!serializedId) return { ok: false, error: 'send_failed' };
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
        error: 'send_failed',
      };
    }
  }

  private setState(s: ConnectionState): void {
    this._state = s;
    for (const h of this.stateHandlers) h(s);
  }
}
