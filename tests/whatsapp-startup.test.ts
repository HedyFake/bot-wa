import { EventEmitter } from 'node:events';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { WWebJsWhatsAppProvider } from '../src/whatsapp/adapters/wwebjs.js';

let client: EventEmitter;
let emitQr = true;
let socketState: ((state: unknown) => Promise<void>) | undefined;
const phone = vi.fn(async () => { client.emit('code', 'ABCD1234'); return 'ABCD1234'; });
vi.mock('whatsapp-web.js', () => ({
  default: {
    MessageMedia: class {},
    LocalAuth: class {},
    Client: class extends EventEmitter {
      constructor() { super(); client = this; }
      pupPage = {
        exposeFunction: async (name:string, callback:(state:unknown)=>Promise<void>) => {
          if (name === 'onAuthAppStateChangedEvent') socketState = callback;
        },
      };
      async inject() {}
      async initialize() { await this.inject(); if (emitQr) this.emit('qr', 'pairing-fixture'); }
      requestPairingCode = phone;
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

it.each(['','081234567890'])('menjaga sesi setelah HP mulai menautkan (%s)', async pairingPhone => {
  const dir = mkdtempSync(join(tmpdir(),'hdybot-linking-'));
  socketState = undefined;
  vi.useFakeTimers();
  try {
    const provider = new WWebJsWhatsAppProvider({authDir:dir,pairingPhone});
    if (pairingPhone) phone.mockImplementationOnce(async () => new Promise<string>(() => {}));
    const connecting = provider.connect();
    await vi.waitFor(() => expect(socketState).toBeTypeOf('function'));
    await socketState!('PAIRING');
    client.emit('qr','stale-qr'); client.emit('code','STALE123');
    await vi.advanceTimersByTimeAsync(30_000);
    expect(readFileSync(join(dir,'connection-state'),'utf8')).toContain('syncing');
    expect(existsSync(join(dir,'pairing-qr.txt'))).toBe(false);
    expect(existsSync(join(dir,'pairing-code.txt'))).toBe(false);
    client.emit('authenticated'); client.emit('ready');
    await connecting;
    expect(provider.state()).toBe('connected');
    await provider.disconnect();
  } finally { socketState = undefined; vi.useRealTimers(); rmSync(dir,{recursive:true,force:true}); }
});

it('menghasilkan kode setelah QR pertama dan menandai sinkronisasi sebelum ready', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'hdybot-code-'));
  try {
    const provider = new WWebJsWhatsAppProvider({authDir:dir,pairingPhone:'081234567890'});
    const ready = vi.fn();
    provider.onStateChange(ready);
    await provider.connect();
    expect(phone).toHaveBeenCalledWith('6281234567890', true, 180000);
    expect(readFileSync(join(dir,'pairing-code.txt'),'utf8')).toContain('ABCD-1234');
    client.emit('authenticated'); client.emit('authenticated');
    expect(readFileSync(join(dir,'connection-state'),'utf8')).toContain('syncing');
    client.emit('ready'); client.emit('ready');
    expect(ready.mock.calls.filter(([s])=>s==='connected')).toHaveLength(1);
    await provider.disconnect();
  } finally { rmSync(dir,{recursive:true,force:true}); }
});

it('memulai ulang dengan QR jika permintaan kode telepon gagal', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'hdybot-code-fail-'));
  try {
    phone.mockClear().mockRejectedValueOnce(new TypeError('pairing unavailable'));
    const provider = new WWebJsWhatsAppProvider({authDir:dir,pairingPhone:'081234567890'});
    await provider.connect();
    await vi.waitFor(()=>expect(provider.state()).toBe('disconnected'));
    await provider.connect();
    expect(phone).toHaveBeenCalledTimes(1);
    expect(readFileSync(join(dir,'pairing-qr.txt'),'utf8')).toContain('█');
    await provider.disconnect();
  } finally { rmSync(dir,{recursive:true,force:true}); }
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

it('memberi waktu untuk sinkronisasi sesi tersimpan yang melampaui timeout QR', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'hdybot-sync-'));
  emitQr = false;
  vi.useFakeTimers();
  try {
    const provider = new WWebJsWhatsAppProvider({authDir:dir});
    const connecting = provider.connect();
    await vi.waitFor(() => expect(vi.getTimerCount()).toBeGreaterThan(0));
    client.emit('loading_screen', 25, 'WhatsApp');
    await vi.advanceTimersByTimeAsync(180_000);
    expect(readFileSync(join(dir,'connection-state'),'utf8')).toContain('syncing');
    client.emit('authenticated'); client.emit('ready');
    await connecting;
    expect(provider.state()).toBe('connected');
    await provider.disconnect();
  } finally { vi.useRealTimers(); emitQr = true; rmSync(dir,{recursive:true,force:true}); }
});
