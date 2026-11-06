# 06 — NVIDIA API, Nemotron Registry, dan Auto Model Router

## NVIDIA endpoint

- Base URL: `https://integrate.api.nvidia.com/v1`
- Chat endpoint: `/chat/completions`
- SDK: `openai` npm package.
- API key: `process.env.NVIDIA_API_KEY`; jangan pernah hardcode.

## Model IDs yang benar

| Alias aplikasi | Exact model ID | Peran |
|---|---|---|
| `ultra` | `nvidia/nemotron-3-ultra-550b-a55b` | Reasoning teks kompleks, planning, tool-use, konflik informasi |
| `super-vl` | `nvidia/nemotron-3.5-super-vl-120b-a12b` | Input teks, gambar, video; dokumen visual/OCR dan reasoning multimodal |
| `lightning` | `nvidia/nemotron-3.5-lightning-30b-a3b` | Kandidat jalur cepat untuk klasifikasi, routing ringan, ringkasan singkat dan pekerjaan rutin setelah evaluasi |

Model Super-VL yang benar berakhiran `a12b`, bukan `a12`. ID model harus dikonfigurasi satu kali di `ModelRegistry`, bukan disalin ke banyak modul.

## Kemampuan dan batas yang diketahui saat blueprint dibuat

- Super-VL: 120B total / 12B aktif, konteks hingga 1M, input text/image/video, output text, reasoning configurable. NVIDIA merekomendasikan sampling text temperature 1.0 / top_p 0.95 dan vision temperature 0.6 / top_p 0.95.
- Ultra: 550B total / 55B aktif, konteks hingga 1M, input/output teks, kuat untuk agentic reasoning/planning/tool use. Model card Ultra yang diperiksa juga tidak mencantumkan Bahasa Indonesia dalam daftar bahasa yang disebutkan.
- Lightning: 30B total / 3B aktif, konteks hingga 1M, model cepat untuk agentic workflow. Model card yang diperiksa mencantumkan English dan sejumlah bahasa Eropa/Jepang tetapi tidak mencantumkan Indonesian.
- Super-VL API reference menjelaskan input text/image/video dan document understanding; daftar dukungan bahasa Indonesia tidak dipastikan pada halaman referensi tersebut.

Karena Bahasa Indonesia tidak tercantum pada daftar yang tersedia untuk setidaknya dua model dan tidak dipastikan untuk Super-VL, jalankan benchmark Bahasa Indonesia untuk **semua** model sebelum produksi. Jangan menganggap nama “multilingual” otomatis berarti kualitas Bahasa Indonesia memadai.

**Catatan:** ukuran parameter bukan jaminan model mana yang paling baik atau paling murah. Lakukan benchmark tugas nyata, ukur latency, token, error rate, dan akurasi Bahasa Indonesia.

## Auto routing policy

Router dijalankan per task/turn. User tidak perlu memilih model secara manual. Admin bisa override sementara untuk debugging.

| Kondisi | Model awal | Alasan |
|---|---|---|
| Pesan singkat, command sederhana, klasifikasi ringan | Lightning | Jalur cepat jika hasil evaluasi memadai |
| Pertanyaan rutin dari data kelas yang sudah ada | Lightning atau deterministic SQL/service | Tidak perlu reasoning besar; data faktual diambil dari DB |
| Gambar jadwal, foto papan, screenshot, dokumen hasil scan | Super-VL | Vision input |
| File PDF berbasis teks | RAG/parser dulu; model sesuai kompleksitas | Tidak perlu vision jika teks bisa diekstrak |
| Video/frames | Super-VL | Video input / sampled frames |
| Multi-step planning, konflik beberapa sumber, analisis panjang, keputusan tool kompleks | Ultra | Reasoning teks tingkat lanjut |
| Tool call administratif | AI memilih schema; policy layer memutuskan | Model tidak mendapat akses langsung |
| Output confidence rendah / JSON invalid | Escalate satu kali | Hindari loop tanpa batas |

Jangan mengirim gambar ke model text-only. Jangan meneruskan file besar tanpa preprocessing. Untuk pesan jadwal biasa, deterministic schedule query lebih akurat daripada AI generatif.

## Suggested routing algorithm

1. Normalize message and resolve intent deterministically where possible.
2. Detect modality: text/image/video/audio/document.
3. Run permission and safety policy before model call.
4. Estimate complexity and expected output shape.
5. Choose model from capability-compatible candidates.
6. Call model with timeout, token cap, and validated schema.
7. Validate JSON/schema and confidence.
8. If invalid/low confidence, escalate once to compatible stronger model.
9. If provider fails, fallback only to a model that supports the same modality and task.
10. Record alias, model ID, route reason, latency, token usage if available, and error code. Do not log prompts containing personal data by default.
11. Return final response only; never expose internal `reasoning_content`.

## Model modes

- `auto` — default, per-task routing.
- `pinned:<alias>` — admin debug override; must show pinned mode in status.
- `off` — AI disabled; deterministic commands continue.
- `safe` — no tool calls and no outbound publishing.

Admin commands: `.ai models`, `.ai auto`, `.ai pin lightning`, `.ai pin super-vl`, `.ai pin ultra`, `.ai unpin`, `.ai status`, `.ai test <prompt>`, `.ai usage`.

Global pin and API key changes require owner permission. Manual pin has TTL and automatically returns to auto mode.

## Node.js OpenAI SDK example

```ts
import OpenAI from 'openai';

const apiKey = process.env.NVIDIA_API_KEY;
if (!apiKey) throw new Error('NVIDIA_API_KEY is missing');

const openai = new OpenAI({
  apiKey,
  baseURL: 'https://integrate.api.nvidia.com/v1',
  timeout: 60_000,
  maxRetries: 1,
});

const response = await openai.chat.completions.create({
  model: 'nvidia/nemotron-3.5-super-vl-120b-a12b',
  messages: [
    { role: 'system', content: 'Jawab dalam Bahasa Indonesia. Gunakan hanya informasi yang tersedia.' },
    { role: 'user', content: 'Jelaskan isi gambar ini.' },
  ],
  temperature: 0.6,
  top_p: 0.95,
  max_tokens: 4096,
  stream: false,
});

const finalText = response.choices[0]?.message?.content;
if (typeof finalText !== 'string' || !finalText.trim()) {
  throw new Error('NVIDIA returned an empty final answer');
}
console.log(finalText);
```

Untuk input image, gunakan content array dengan `type: 'text'` dan `type: 'image_url'` sesuai API reference. Validasi URL dan MIME/size sebelum mengirim. Hindari URL dari pesan yang belum tepercaya; download melalui media pipeline dan gunakan signed internal reference bila diperlukan.

## Contoh input gambar (Super-VL)

```ts
const response = await openai.chat.completions.create({
  model: 'nvidia/nemotron-3.5-super-vl-120b-a12b',
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'Baca jadwal pada gambar. Ekstrak hari, jam, mata kuliah, dan SKS. Jangan menebak teks yang tidak terbaca.' },
      { type: 'image_url', image_url: { url: 'https://example.invalid/temporary-signed-image-url' } },
    ],
  }],
  temperature: 0.6,
  top_p: 0.95,
  max_tokens: 4096,
  stream: false,
});
```

Ganti URL contoh dengan URL signed yang benar-benar dibuat oleh storage aplikasi. Jangan gunakan domain `.invalid` saat runtime. Jika memakai media upload WhatsApp, lakukan ukuran/MIME check, simpan sementara, scan bila tersedia, lalu berikan referensi file yang dapat dijangkau endpoint model. Hindari public URL permanen.

## Streaming

Jika `stream: true`, iterasi SSE chunks. Gabungkan `delta.content` untuk jawaban akhir. `delta.reasoning_content` dapat muncul terpisah, tetapi jangan ditampilkan atau dicatat. Satu pesan WhatsApp jangan dikirim per token; kumpulkan jawaban sampai selesai lalu kirim satu kali atau gunakan edit/message-update hanya jika provider mendukung dengan benar.

## Tool calling

NVIDIA Chat Completions mendukung `tools`, `tool_choice`, `parallel_tool_calls`, dan `response_format` pada model/endpoints yang mendukung. Tetap:

- gunakan tool schema sempit;
- validasi tool call dengan Zod;
- policy layer memeriksa actor, scope, approval, dan data;
- jangan biarkan AI menjalankan shell, arbitrary SQL, atau arbitrary URL fetch;
- tool call paralel hanya untuk operasi read-only yang independen;
- mutasi dan send selalu serial dan idempotent.

## Parameter per model

Endpoint tiap model dapat berbeda. `reasoning_effort` tersedia pada dokumentasi Ultra/Super-VL yang diperiksa dengan nilai yang berbeda sesuai model; gunakan hanya opsi yang didukung. Jangan mengirim parameter khusus model secara global ke semua alias. Simpan `requestProfile` per model dan validasi terhadap API reference sebelum rilis.

## Retry / fallback

- Retry satu kali untuk 429/5xx/network timeout dengan backoff.
- 400/422: jangan retry parameter identik; catat request schema issue dan tandai model adapter unhealthy.
- 401/403: stop provider calls, beri alert admin; kemungkinan key/permission.
- Provider unavailable: fallback model-compatible.
- No compatible fallback for image/video: beri tahu admin bahwa multimodal service unavailable; jangan diam-diam buang media.

## Benchmark Bahasa Indonesia

Buat dataset anonymized minimal 100 contoh: command, slang mahasiswa, typo, tanggal relatif, tugas, perubahan jadwal, pertanyaan dosen, ringkasan pesan, OCR foto jadwal, prompt injection. Skor: intent accuracy, extraction F1, false urgent rate, hallucination rate, JSON validity, latency, token usage. Tentukan model default berdasar hasil, bukan klaim marketing.

## Prompt untuk coding agent

> Implementasikan NVIDIA provider client dan router tiga model secara terpusat. Gunakan exact model IDs di atas. Buat unit tests untuk routing text/image/video, pinned mode TTL, malformed schema, provider timeout, 429/401/422, fallback compatibility, dan sanitasi reasoning. Tambahkan script benchmark Bahasa Indonesia. Jangan membuat UI dashboard; status router dapat dibaca dari admin WhatsApp DM.

## Official references checked

- Super-VL model/API: https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3_5-super-vl-120b-a12b
- Super-VL inference: https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3_5-super-vl-120b-a12b-infer
- Ultra model card: https://build.nvidia.com/nvidia/nemotron-3-ultra-550b-a55b/modelcard
- Ultra inference: https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3-ultra-550b-a55b-infer
- Lightning model card: https://build.nvidia.com/nvidia/nemotron-3.5-lightning-30b-a3b/modelcard
- NVIDIA OpenAI-compatible endpoint: https://integrate.api.nvidia.com/v1/chat/completions

API schema dan model availability dapat berubah. Coding agent wajib mengecek ulang sebelum lockfile/release, dan tidak boleh menyimpulkan seluruh model memiliki parameter identik hanya karena endpoint OpenAI-compatible.
