import { EventEmitter } from 'node:events';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { WWebJsWhatsAppProvider } from '../src/whatsapp/adapters/wwebjs.js';

let client: EventEmitter;
let emitQr = true;
vi.mock('whatsapp-web.js', () => ({
  default: {
    MessageMedia: class {},
    LocalAuth: class {},
    Client: class extends EventEmitter {
      constructor() { super(); client = this; }
      async initialize() { if (emitQr) this.emit('qr', 'pairing-fixture'); }
      async destroy() {}
    },
  },
}));

it('menampilkan QR privat lalu menandai sesi siap dan memproses teks tanpa pencarian kontak tambahan', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'hdybot-qr-'));
  try {
    const provider = new WWebJsWhatsAppProvider({ authDir: dir });
    await provider.connect();
    const qr = join(dir, 'pairing-qr.txt');
    expect(readFileSync(qr, 'utf8')).toContain('█');
    client.emit('ready');
    expect(existsSync(qr)).toBe(false);
    expect(readFileSync(join(dir, 'connection-state'), 'utf8').trim()).toBe(process.pid + ' connected');
    const getContact = vi.fn();
    const received = new Promise(resolve => provider.onMessage(resolve));
    client.emit('message_create', { id: { _serialized: 'cmd-1' }, from: '628123456789@c.us', body: '.menu', getContact });
    await expect(received).resolves.toMatchObject({ text: '.menu', senderJid: '628123456789@s.whatsapp.net' });
    expect(getContact).not.toHaveBeenCalled();
    const getChat = vi.fn(async () => ({name:'Kelas',participants:[]}));
    const getQuotedMessage = vi.fn();
    for (const id of ['cmd-2','cmd-3']) {
      const inbound = new Promise(resolve => provider.onMessage(resolve));
      client.emit('message_create', { id:{_serialized:id}, from:'kelas@g.us', author:'628123456789@c.us',
        body:'.jadwal', hasQuotedMsg:true, getQuotedMessage, getChat });
      await expect(inbound).resolves.toMatchObject({chatName:'Kelas',text:'.jadwal'});
    }
    expect(getChat).toHaveBeenCalledTimes(1);
    expect(getQuotedMessage).not.toHaveBeenCalled();
    await provider.disconnect();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

it('mendeteksi startup tanpa QR atau ready meski initialize selesai', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'hdybot-qr-timeout-'));
  emitQr = false;
  vi.useFakeTimers();
  try {
    const provider = new WWebJsWhatsAppProvider({ authDir: dir });
    const pending = expect(provider.connect()).rejects.toThrow('startup_timeout');
    await vi.waitFor(() => expect(vi.getTimerCount()).toBeGreaterThan(0));
    await vi.advanceTimersByTimeAsync(120_000);
    await pending;
    expect(provider.state()).toBe('disconnected');
  } finally { vi.useRealTimers(); emitQr = true; rmSync(dir, { recursive: true, force: true }); }
});
