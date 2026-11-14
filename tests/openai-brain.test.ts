import { expect, it, vi } from 'vitest';
import { ModelRouter } from '../src/ai/model-router/router.js';
import { LunaTransport } from '../src/ai/openai/luna.js';
import { conversationTools } from '../src/ai/tool-registry.js';
import { ScheduleService } from '../src/modules/schedule/service.js';
import { CommandDispatcher } from '../src/admin/commands/dispatcher.js';
import { AdminAuthenticator } from '../src/admin/authentication/authenticator.js';
import { ConfirmationManager } from '../src/admin/authorization/confirmation.js';
import { GroupIntelligenceService } from '../src/ai/classification/group-intelligence.js';
import { MockWhatsAppProvider } from '../src/whatsapp/adapters/mock.js';
import { OutboundGate } from '../src/whatsapp/outbound/gate.js';
import { loadConfig } from '../src/config/env.js';
import type { NvidiaCompletionRequest } from '../src/ai/nvidia/registry.js';
import { reserveOpenAiRequest } from '../src/ai/openai/usage.js';
import { ConversationContext } from '../src/ai/context-manager.js';
import type { PrismaClient } from '@prisma/client';

const message = (text: string) => ({ type: 'message', content: [{ type: 'output_text', text }] });
const response = (item: unknown) => Response.json({ status: 'completed', output: [item], usage: { input_tokens: 10, output_tokens: 5 } });
const call = (name: string, args: object) => ({ type: 'function_call', name, arguments: JSON.stringify(args), call_id: 'call-test' });
const req = { model: 'gpt-6-luna', messages: [{ role: 'user' as const, content: 'Tanya kelas' }], max_tokens: 500, top_p: 1, temperature: 0 };
const now = () => new Date('2026-11-08T18:00:00Z');
const schedule = new ScheduleService();
const runtime = () => ({ whatsapp: 'connected', uptimeSeconds: 10 });

it('menjawab .ask melalui WhatsApp mock memakai jadwal Senin WIB dari service', async () => {
  const config = loadConfig({ OWNER_WHATSAPP: '6280000000000' });
  let rounds = 0;
  const transport = new LunaTransport('uji', async (_, init) => {
    const body = JSON.parse(String(init?.body));
    expect(body.store).toBe(false);
    expect(body.tools.map((t: {name: string}) => t.name)).not.toContain('bot_runtime');
    if (++rounds === 1) return response(call('class_schedule', { day: 'hari ini' }));
    const output = body.input.at(-1);
    expect(output).toMatchObject({ type: 'function_call_output', call_id: 'call-test' });
    const data = JSON.parse(output.output).data;
    expect(data.date).toBe('2026-11-09');
    expect(data.schedule).toContain('Senin');
    return response(message(data.schedule));
  });
  const wa = new MockWhatsAppProvider();
  await wa.connect();
  const dispatcher = new CommandDispatcher({ config, whatsapp: wa, schedule, now, startedAt: now(),
    router: new ModelRouter({ openai: transport }), confirmations: new ConfirmationManager(),
    auth: new AdminAuthenticator({ ownerE164: config.OWNER_WHATSAPP, adminAllowlistE164: [] }),
    outbound: new OutboundGate({ provider: wa, outboundEnabled: true, dryRun: false }),
    intelligence: new GroupIntelligenceService() });
  const answer = await dispatcher.handleInbound({ chatType: 'private', chatJid: '6281111111100@c.us', senderJid: '6281111111100@c.us',
    receivedAt: now(), providerMessageId: 'test-ask', text: '.ask Apa agenda akademik pagiku?' });
  expect(rounds).toBe(2);
  expect(answer).toContain('Senin');
  expect(wa.sent.at(-1)?.text).toBe(answer);
});

it('memeriksa role saat eksekusi, menolak parameter tambahan dan memakai kalkulator lokal', () => {
  let admin = true;
  const tools = conversationTools({ schedule, now, runtime, canMonitor: () => admin });
  const monitor = tools.find(t => t.definition.name === 'bot_runtime')!;
  expect(monitor.run('{}')).toEqual(runtime());
  admin = false;
  expect(() => monitor.run('{}')).toThrow();
  const calc = tools.find(t => t.definition.name === 'nursing_calculator')!;
  expect(calc.run('{"kind":"imt","values":"60 165"}')).toMatchObject({ result: expect.stringContaining('22,04') });
  expect(() => calc.run('{"kind":"imt","values":"60 165","sender":"admin"}')).toThrow();
});

it('menolak fungsi di luar registri dan menghentikan model yang mengabaikan batas panggilan', async () => {
  const tools = conversationTools({ schedule, now, runtime, canMonitor: () => false });
  let count = 0;
  const transport = new LunaTransport('uji', async (_, init) => {
    const body = JSON.parse(String(init?.body));
    if (++count === 2) {
      expect(body.tool_choice).toBe('none');
      expect(JSON.parse(body.input.at(-1).output)).toEqual({ ok: false, error: 'tool_not_available' });
    }
    return response(call('bot_runtime', {}));
  }, { maxCalls: 1 });
  await expect(transport.complete(req, undefined, { tools })).rejects.toThrow('openai_tool_limit');
  expect(count).toBe(2);
});

it('memblokir identitas pasien sebelum provider dan menyamarkan rahasia pada fallback', async () => {
  const primary = vi.fn(async () => { throw Error('offline'); });
  const fallback = vi.fn(async (r: NvidiaCompletionRequest) => ({ content: String(r.messages[0]!.content) }));
  const router = new ModelRouter({ openai: { complete: primary }, transport: { complete: fallback }, secrets: ['sandi-contoh'] });
  const run = (text: string) => router.invoke({ task: 'faq', modality: 'text', messages: [{ role: 'user', content: text }] });
  await expect(run('Nama pasien: Contoh')).rejects.toThrow('patient_identifiers_present');
  expect(primary).not.toHaveBeenCalled();
  const result = await run('sandi-contoh token saya sk-12345678901234567890');
  expect(result.text).not.toMatch(/sandi-contoh|sk-123/);
});

it('menolak request berkuota saat penyimpanan kuota belum tersedia', async () => {
  await expect(reserveOpenAiRequest(undefined, 1, 0)).rejects.toThrow('budget_storage_unavailable');
});

it('memesan periode bulan dan hari WIB pada transaksi yang sama dan menghentikan request saat penuh', async () => {
  const exec = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(0);
  const transaction = vi.fn(fn => fn({ $executeRaw: exec }));
  const db = { $transaction: transaction } as unknown as PrismaClient;
  await expect(reserveOpenAiRequest(db, 1, 10, new Date('2026-11-30T18:00:00Z'))).rejects.toThrow('budget_exhausted');
  expect(transaction).toHaveBeenCalledTimes(1);
  expect(exec.mock.calls.map(args => args.slice(1))).toEqual([['openai.requests.2026-12',10], ['openai.requests.2026-12-01',1]]);
});

it('menjaga konteks tiap percakapan terpisah, menyamarkan sandi dan mengakhiri konteks setelah 30 menit', () => {
  let at = 0;
  const memory = new ConversationContext(() => at, ['sandi-uji']);
  memory.remember('a', 'Satu', 'pesan sandi-uji', 'jawab');
  memory.remember('b', 'Dua', 'Nama pasien: Contoh', 'ok');
  expect(memory.get('b')).toEqual([]);
  expect(memory.get('a')[0]?.text).toBe('pesan [rahasia disamarkan]');
  at += 30 * 60_000;
  expect(memory.get('a')).toEqual([]);
});

it('meneruskan hasil perhitungan ke NVIDIA bila sintesis OpenAI gagal', async () => {
  const tools = conversationTools({ schedule, now, runtime, canMonitor: () => false });
  let count = 0;
  const primary = new LunaTransport('uji', async () => ++count === 1
    ? response(call('nursing_calculator', { kind: 'imt', values: '60 165' }))
    : new Response(null, { status: 503 }));
  const router = new ModelRouter({ openai: primary, transport: { complete: async r => {
    const evidence = JSON.parse(String(r.messages.at(-1)?.content));
    expect(evidence.tool).toBe('nursing_calculator');
    return { content: evidence.data.result };
  } } });
  const out = await router.invoke({ task: 'faq', modality: 'text', messages: req.messages, tools });
  expect(out.alias).not.toBe('luna');
  expect(out.text).toContain('22,04');
});

it('mengirim schema strict untuk klasifikasi intent dan mematuhi sakelar tool', async () => {
  const format = { name: 'uji_intent', schema: { type: 'object', properties: { args: { type: 'string' } }, required: ['args'], additionalProperties: false } };
  const transport = new LunaTransport('uji', async (url, init) => {
    const body = JSON.parse(String(init?.body));
    expect(String(url)).toBe('https://contoh.test/v1/responses');
    expect(body.text.format).toEqual({ ...format, type: 'json_schema', strict: true });
    expect(body.tools).toBeUndefined();
    expect(body.max_output_tokens).toBe(100);
    return response(message('{"args":"besok"}'));
  }, { toolCalling: false, baseUrl: 'https://contoh.test/v1/', maxTokens: 100 });
  const tools = conversationTools({ schedule, now, runtime, canMonitor: () => false });
  expect((await transport.complete(req, undefined, { tools, format })).content).toBe('{"args":"besok"}');
});
