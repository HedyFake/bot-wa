# Prompt 03 — NVIDIA Nemotron Auto Router

Gunakan bersama `docs/06_NVIDIA_MODELS_AND_ROUTER.md` dan `docs/07_AI_SYSTEM_PROMPTS.md`.

Bangun NVIDIA OpenAI-compatible client. Model IDs: `nvidia/nemotron-3-ultra-550b-a55b`, `nvidia/nemotron-3.5-super-vl-120b-a12b`, `nvidia/nemotron-3.5-lightning-30b-a3b`. Router otomatis mengganti model per task. Image/video harus masuk model vision-compatible. Complex reasoning masuk Ultra. Lightning hanya dijadikan fast lane setelah benchmark Bahasa Indonesia. Ada manual pin TTL, retry/fallback, per-model request settings, schema validation, metrics, no reasoning leakage.
