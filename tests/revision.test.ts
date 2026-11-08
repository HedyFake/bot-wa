import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { commandRegistry, parseCommand } from '../src/admin/commands/parser.js';
import { describe, expect, it } from 'vitest';
import { DriveCatalog } from '../src/modules/materials/drive.js';
import { FunAndUtilityService } from '../src/modules/fun/fun-utility-service.js';
import { menuPage } from '../src/admin/commands/menu.js';
import { reminderTime } from '../src/modules/reminders/worker.js';

describe('Drive API simulasi', () => {
  function fixture(canDownload = true) {
    const calls: string[] = [];
    const doc = { id: 'DOC', name: 'Kuliah', mimeType: 'application/vnd.google-apps.document', capabilities: { canDownload } };
    const pdf = { id: 'PDF', name: 'Panduan.pdf', mimeType: 'application/pdf', capabilities: { canDownload } };
    const request: typeof fetch = async (input, init) => {
      const url = new URL(String(input));
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer fixture');
      calls.push(url.pathname);
      if (url.pathname.endsWith('/ROOT')) return Response.json({ mimeType: 'application/vnd.google-apps.folder' });
      if (url.searchParams.has('alt') || url.pathname.endsWith('/export')) return new Response('%PDF-1.7');
      if (url.searchParams.has('pageToken')) return Response.json({ files: [pdf] });
      if (url.searchParams.get('q')?.includes("'CHILD'")) return Response.json({ files: [doc] });
      return Response.json({ files: [{ id: 'CHILD', name: 'Gerontik', mimeType: 'application/vnd.google-apps.folder' }], nextPageToken: 'next' });
    };
    return { catalog: new DriveCatalog('ROOT', async () => 'fixture', request), calls };
  }
  it('menelusuri subfolder dan halaman berikutnya, mengunduh PDF dan mengekspor Docs', async () => {
    const { catalog } = fixture();
    expect(await catalog.search('Gerontik')).toContain('DOC');
    expect(await catalog.search('Panduan')).toContain('PDF');
    expect((await catalog.download('DOC', 200)).media?.filename).toBe('Kuliah.pdf');
    expect((await catalog.download('PDF', 200)).media?.data.toString()).toBe('%PDF-1.7');
    expect((await catalog.download('PDF', 2)).media).toBeUndefined();
    expect((await catalog.download('lain', 200)).text).toContain('tidak ditemukan');
  });
  it('menolak ekspor ketika pemilik membatasi pengunduhan', async () => {
    const { catalog, calls } = fixture(false);
    expect((await catalog.download('DOC', 200)).media).toBeUndefined();
    expect(calls.some(p => p.endsWith('/export'))).toBe(false);
  });
  it('membedakan kegagalan autentikasi dari folder kosong', async () => {
    const catalog = new DriveCatalog('ROOT', async () => { throw Error('invalid'); });
    await expect(catalog.sync()).rejects.toThrow();
    expect(catalog.status()).toContain('gagal');
  });
});

it('memfilter menu dan memberi petunjuk halaman serta alias', () => {
  expect(menuPage('7', false)).not.toContain('.health');
  expect(menuPage('7', true)).toContain('.health');
  expect(menuPage('2', false)).toContain('.jadwal');
  expect(menuPage('hitung', false, true)).toContain('.calc');
});
it('menafsirkan pengingat sebagai WIB dan menolak tanggal yang tidak ada', () => {
  expect(reminderTime('2026-11-09 08:00')?.toISOString()).toBe('2026-11-09T01:00:00.000Z');
  expect(reminderTime('2026-02-31 08:00')).toBeNull();
});
 

it('memisahkan sesi dua grup dan menilai jawaban sekali', () => {
  const service = new FunAndUtilityService();
  service.startBankQuiz('a@g.us', 'antonim', 'easy');
  service.startBankQuiz('b@g.us', 'asahotak', 'medium');
  expect(service.answerQuiz('b@g.us', 'abstrak').ok).toBe(false);
  expect(service.answerQuiz('a@g.us', 'abstrak')).toMatchObject({ ok: true, points: 10 });
  expect(service.answerQuiz('a@g.us', 'abstrak').ok).toBe(false);
  expect(service.answerQuiz('b@g.us', '10')).toMatchObject({ ok: true, points: 20 });
});

it('memetakan setiap alias registry ke handler dan kebijakan yang sama', () => {
  const names = new Set<string>();
  for (const entry of commandRegistry) {
    const canonical = parseCommand('.' + entry.names[0] + ' arg');
    for (const name of entry.names) {
      expect(names.has(name)).toBe(false);
      names.add(name);
      expect(parseCommand('.' + name + ' arg')).toMatchObject({ command: entry.command, adminOnly: canonical.adminOnly, args: entry.args ? ['arg'] : [] });
    }
  }
});

it('installer systemd tidak menjalankan firewall dan bot tidak membuka panel HTTP', () => {
  const installer = readFileSync('install.sh', 'utf8').split('\n').filter(s => !s.trim().startsWith('#') && !s.trim().startsWith('c_info')).join('\n');
  expect(installer).not.toMatch(/\b(?:ufw|fail2ban)\b/i);
  expect(installer).toContain('WantedBy=multi-user.target');
  expect(installer).toContain('StartLimitBurst=8');
  const main = readFileSync('src/index.ts', 'utf8');
  expect(main).not.toMatch(/createServer\(|\.listen\(/);
});

it('memulihkan sesi duel dan mode grup dari state lama setelah restart', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hdybot-games-'));
  try {
    const opts = { persistPath: join(dir, 'state.json') };
    const fun = new FunAndUtilityService(opts);
    fun.setNimbrung('kelas', true);
    fun.gameRoom('kelas', 'host', ['buat', 'duel'], false);
    fun.gameRoom('kelas', 'teman', ['gabung'], false);
    expect(fun.gameRoom('kelas', 'lain', ['gabung'], false)).toContain('penuh');
    expect(fun.gameRoom('kelas', 'teman', ['stop'], false)).toContain('pembuat');
    fun.gameRoom('kelas', 'host', ['mulai', 'antonim'], false);
    const restored = new FunAndUtilityService(opts);
    expect(restored.nimbrungActive('kelas')).toBe(true);
    expect(restored.answerQuiz('kelas', 'abstrak', 'lain').ok).toBe(false);
    expect(restored.answerQuiz('kelas', 'abstrak', 'teman').ok).toBe(true);
    expect(restored.gameRoom('kelas', 'teman', ['riwayat'], false)).toContain('10 poin');
    expect(new FunAndUtilityService(opts).answerQuiz('kelas', 'abstrak', 'teman').ok).toBe(false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
