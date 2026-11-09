import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ModelRouter } from '../src/ai/model-router/router.js';
import {
  DEFAULT_MODEL_IDS,
  NvidiaProviderError,
  type NvidiaTransport,
  sanitizeModelContent,
} from '../src/ai/nvidia/registry.js';

describe('ModelRouter & NVIDIA policies', () => {
  it('mengalihkan dokumen dari Kimi ke Ultra saat API menolak, lalu mencoba Kimi kembali setelah satu jam', async () => {
    let now = 100;
    const calls: string[] = [];
    const router = new ModelRouter({ now: () => now, transport: { async complete(req) {
      calls.push(req.model);
      if (req.model === DEFAULT_MODEL_IDS.kimi && now === 100) throw new NvidiaProviderError('preview_only', 404);
      return { content: 'Ringkasan' };
    } } });
    const req = { task: 'long_document_analysis' as const, modality: 'text' as const, messages: [] };
    expect((await router.invoke(req)).alias).toBe('ultra');
    expect((await router.invoke(req)).alias).toBe('ultra');
    now += 3600_000;
    expect((await router.invoke(req)).alias).toBe('kimi');
    expect(calls).toEqual([DEFAULT_MODEL_IDS.kimi, DEFAULT_MODEL_IDS.ultra, DEFAULT_MODEL_IDS.ultra, DEFAULT_MODEL_IDS.kimi]);
  });
  it('mengakhiri percobaan intent ketika anggaran waktu lintas model habis', async () => {
    let elapsed = 0;
    let calls = 0;
    const router = new ModelRouter({ now: () => elapsed, transport: {
      async complete() {
        calls++;
        elapsed += 3000;
        throw new NvidiaProviderError('request_timeout', undefined, true);
      },
    } });
    await expect(router.invoke({ task: 'intent_detection', modality: 'text', messages: [], responseBudgetMs: 3000 })).rejects.toThrow('response_timeout');
    expect(calls).toBe(1);
  });
  it('memilih DeepSeek untuk tugas sederhana, Super-VL untuk gambar/video, dan Ultra untuk reasoning kompleks', () => {
    const router = new ModelRouter();

    const fast = router.decide({ task: 'classification', modality: 'text' });
    expect(fast.alias).toBe('deepseek');
    expect(fast.spec.modelId).toBe(DEFAULT_MODEL_IDS.deepseek);

    const vision = router.decide({ task: 'vision_schedule', modality: 'image' });
    expect(vision.alias).toBe('super-vl');
    expect(vision.spec.modelId).toBe(DEFAULT_MODEL_IDS['super-vl']);
    // Vision tidak boleh mengklaim fallback ke model text-only
    expect(vision.fallbacks).toEqual(['mistral','kimi','minimax']);
    expect(router.decide({task:'coding', modality:'text'}).alias).toBe('minimax');
    expect(router.decide({task:'reformat_announcement', modality:'text'}).alias).toBe('mistral');
    expect(router.decide({task:'long_document_analysis', modality:'text'}).alias).toBe('kimi');

    const complex = router.decide({ task: 'conflict_resolution', modality: 'text', complexity: 'high' });
    expect(complex.alias).toBe('ultra');
    expect(complex.spec.modelId).toBe(DEFAULT_MODEL_IDS.ultra);
  });

  it('menjalankan fallback saat model utama timeout dan berhenti pada 401/403', async () => {
    const calls: string[] = [];
    const transport: NvidiaTransport = {
      async complete(req) {
        calls.push(req.model);
        if (req.model === DEFAULT_MODEL_IDS.deepseek) {
          throw new NvidiaProviderError('request_timeout', undefined, true);
        }
        return { content: 'Ringkasan berhasil dari fallback', promptTokens: 10, completionTokens: 5 };
      },
    };

    const router = new ModelRouter({ transport, maxRetries: 1 });
    const res = await router.invoke({
      task: 'short_summary',
      modality: 'text',
      messages: [{ role: 'user', content: 'Ringkas pesan ini' }],
    });

    expect(res.alias).toBe('super-vl');
    expect(res.text).toBe('Ringkasan berhasil dari fallback');
    // 2 percobaan ke DeepSeek lalu 1x ke Super-VL
    expect(calls).toEqual([
      DEFAULT_MODEL_IDS.deepseek,
      DEFAULT_MODEL_IDS.deepseek,
      DEFAULT_MODEL_IDS['super-vl'],
    ]);
  });

  it('menandai model tidak tersedia (404/422) sebagai unhealthy tanpa retry berulang dan menolak vision bila Super-VL down', async () => {
    const transport: NvidiaTransport = {
      async complete(req) {
        if (req.model === DEFAULT_MODEL_IDS.deepseek) {
          throw new NvidiaProviderError('http_404', 404);
        }
        return { content: 'Dijawab oleh model sehat' };
      },
    };
    const router = new ModelRouter({ transport, maxRetries: 2 });
    const out = await router.invoke({
      task: 'classification',
      modality: 'text',
      messages: [{ role: 'user', content: 'Apa jadwal hari ini?' }],
    });
    expect(out.alias).toBe('super-vl');
    expect(router.status().models.deepseek.healthy).toBe(false);

    // Jika Super-VL unhealthy, permintaan vision wajib gagal dengan jelas (tidak mengirim gambar ke model text)
    router.markUnhealthy('super-vl');
    expect(router.decide({task:'vision_document', modality:'image'}).alias).toBe('mistral');
    router.markUnhealthy('mistral');
    router.markUnhealthy('kimi');
    router.markUnhealthy('minimax');
    expect(() => router.decide({ task: 'vision_schedule', modality: 'image' })).toThrow(/vision_model_unavailable/);
  });

  it('menghapus <think> / reasoning internal dan mendukung structured output dengan eskalasi ke Ultra', async () => {
    expect(sanitizeModelContent('<think>rahasia rantai pikir</think>Jawaban bersih')).toBe('Jawaban bersih');

    let count = 0;
    const transport: NvidiaTransport = {
      async complete() {
        count++;
        if (count === 1) return { content: 'bukan json valid' };
        return { content: '```json\n{"category":"IMPORTANT","confidence":0.9}\n```' };
      },
    };
    const router = new ModelRouter({ transport, maxRetries: 0 });
    const schema = z.object({ category: z.string(), confidence: z.number() });
    const parsed = await router.invokeStructured(
      { task: 'classification', modality: 'text', messages: [{ role: 'user', content: 'tes' }] },
      schema,
    );
    expect(parsed.data).toEqual({ category: 'IMPORTANT', confidence: 0.9 });
    expect(parsed.alias).toBe('ultra');
  });
});
