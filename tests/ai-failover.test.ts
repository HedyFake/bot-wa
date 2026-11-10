import { expect, it, vi } from 'vitest';
import { ModelRouter } from '../src/ai/model-router/router.js';
import { LunaTransport } from '../src/ai/openai/luna.js';
import { NvidiaProviderError } from '../src/ai/nvidia/registry.js';

const req = {task:'faq' as const, modality:'text' as const, messages:[{role:'user' as const, content:'Halo'}]};
function waitForAbort(signal?: AbortSignal): Promise<never> {
  return new Promise((_,reject) => signal!.addEventListener('abort',() => reject(new Error('aborted')),{once:true}));
}

it('memulai dengan Luna, beralih ke NVIDIA saat lambat, lalu kembali ke Luna bila NVIDIA lambat', async () => {
  vi.useFakeTimers();
  try {
    const calls:string[] = [];
    let slow = 'luna';
    const provider = (name:string) => ({async complete(_:unknown, signal?:AbortSignal) {
      calls.push(name);
      if (name === slow) return waitForAbort(signal);
      return {content:name};
    }});
    const router = new ModelRouter({transport:provider('nvidia'),openai:provider('luna'),switchMs:100});
    const first = router.invoke(req);
    await vi.advanceTimersByTimeAsync(100);
    expect((await first).text).toBe('nvidia');
    slow = 'nvidia';
    const second = router.invoke(req);
    await vi.advanceTimersByTimeAsync(100);
    expect((await second).alias).toBe('luna');
    expect(calls).toEqual(['luna','nvidia','nvidia','luna']);
  } finally { vi.useRealTimers(); }
});

it('kunci NVIDIA ditolak tanpa menghentikan Luna', async () => {
  const nv = vi.fn(async () => {throw new NvidiaProviderError('unauthorized',401);});
  const router = new ModelRouter({transport:{complete:nv},openai:{complete:async()=>({content:'Halo!'})}});
  router.setMode('pinned:super-vl');
  expect((await router.invoke(req)).alias).toBe('luna');
  expect((await router.invoke(req)).alias).toBe('luna');
  expect(nv).toHaveBeenCalledTimes(1);
});

it('mengutamakan Luna lagi setelah masa cadangan selesai', async () => {
  let now = 0;
  const openai = vi.fn().mockRejectedValueOnce(new NvidiaProviderError('busy', 503)).mockResolvedValue({content:'utama'});
  const router = new ModelRouter({now:()=>now, openai:{complete:openai}, transport:{complete:async()=>({content:'cadangan'})}});
  expect((await router.invoke(req)).text).toBe('cadangan');
  now = 59_000;
  expect((await router.invoke(req)).text).toBe('cadangan');
  now = 60_000;
  expect((await router.invoke(req)).alias).toBe('luna');
  expect(openai).toHaveBeenCalledTimes(2);
});

it('mengirim permintaan gambar ke model Luna yang tepat dan mengecualikan video', async () => {
  const image = {type:'image_url' as const,image_url:{url:'data:image/png;base64,fixture'}};
  const fetcher:typeof fetch = async (url,opts) => {
    expect(String(url)).toBe('https://api.openai.com/v1/chat/completions');
    expect(opts?.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(String(opts?.body));
    expect(body).toMatchObject({model:'gpt-6-luna',reasoning_effort:'none',store:false});
    expect(body.messages[0].content[0]).toEqual(image);
    return Response.json({choices:[{message:{content:'Gambar uji'}}]});
  };
  const router = new ModelRouter({openai:new LunaTransport('test-key',fetcher)});
  expect((await router.invoke({...req, modality:'image',messages:[{role:'user',content:[image]}]})).text).toBe('Gambar uji');
  await expect(router.invoke({...req,modality:'video'})).rejects.toThrow('vision_model_unavailable');
});
