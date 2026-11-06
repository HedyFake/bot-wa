# 03 — WhatsApp Connector and Group Sources

## Tujuan

Terima chat pribadi admin, pesan dari grup yang disetujui, dan command anggota. Kirim balasan privat, reminder, serta pengumuman yang telah disetujui. Business logic tidak boleh bergantung pada satu library.

## Connector abstraction

Buat interface seperti:

```ts
interface WhatsAppProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getConnectionState(): ConnectionState;
  sendText(to: WhatsAppJid, text: string, options?: SendOptions): Promise<SendResult>;
  sendMedia(to: WhatsAppJid, media: MediaPayload, caption?: string): Promise<SendResult>;
  onMessage(handler: (message: NormalizedMessage) => Promise<void>): Unsubscribe;
  getGroupMetadata?(jid: WhatsAppJid): Promise<GroupMetadata>;
}
```

Jangan gunakan interface ini sebagai klaim bahwa provider mana pun mendukung seluruh kemampuan. Tiap adapter harus mendeklarasikan capabilities, limitations, version, dan health.

## Baileys reference

Repo Akira menggunakan `@adiwajshing/baileys` 3.3.0. Jangan gunakan paket itu. Kandidat library komunitas saat audit adalah `@whiskeysockets/baileys`; versi 7 membawa breaking changes dan harus dipilih secara eksplisit. Ikuti migrasi dan docs versi yang tepat. Simpan auth state secara persisten, terenkripsi, dan jangan commit folder auth.

Baileys bukan API resmi WhatsApp dan tidak berafiliasi dengan Meta/WhatsApp. Penggunaan dapat menimbulkan risiko kebijakan atau pembatasan akun. Bangun adapter dengan feature flag; sediakan mode dev/mock dan rencana migrasi ke provider resmi. Periksa Terms/Guidelines terkini sebelum menghubungkan nomor utama.

## Mode integrasi

- `MOCK`: simulasi event, wajib tersedia untuk test.
- `BAILEYS_EXPERIMENTAL`: hanya bila administrator menerima risiko platform dan telah memeriksa ketentuan terbaru; gunakan nomor uji khusus, jangan nomor utama.
- `OFFICIAL_PROVIDER`: adapter bagi provider resmi bila kebutuhan grup/DM didukung dan akun memenuhi syarat.

Jangan mengasumsikan Official WhatsApp Business Platform dapat membaca seluruh grup yang ada. Kemampuan group API punya eligibility dan batas sendiri; periksa docs Meta terkini sebelum memilihnya.

## Group registry

Setiap grup harus didaftarkan manual dengan metadata:

- `group_jid`, `display_name`, `purpose`, `is_enabled`, `is_source`, `is_destination`.
- `consent_status`, `approved_by`, `approved_at`, `data_retention_days`.
- `allowed_categories`, `forward_policy`, `min_confidence`, `quiet_hours`.
- `source_reliability`: `official`, `class_officer`, `member`, `unknown`.

Grup tujuan `Nursing Class A` tidak otomatis menjadi grup sumber. Administrator harus mendaftarkan JID dan menguji tujuan dengan dry-run.

## Incoming message normalization

Normalisasi:

- provider message ID;
- remote JID / group JID;
- sender JID;
- message timestamp;
- text/caption;
- message type: text, image, video, document, audio, sticker, location, poll, reaction;
- quoted message context;
- media metadata (MIME, size, hash), bukan file tanpa batas;
- `is_from_me`, `is_group`, `is_private_dm`;
- source group registry lookup.

Abaikan status/story, call signaling, group event tanpa kebutuhan, dan pesan kosong kecuali fitur tertentu menggunakannya.

## Outbound safeguards

- hanya destination allowlist;
- hanya pesan yang disetujui sesuai approval policy;
- duplicate key untuk mencegah double-send;
- per-chat rate limit;
- send queue dan delivery status;
- retry terbatas untuk error sementara;
- jangan auto-resend untuk ambiguous provider result tanpa cek idempotency;
- tanda tangan bot yang jelas, jangan menyamar sebagai dosen.

## Admin DM precedence

Pesan direct dari admin diproses admin command router lebih dulu. Pesan dari grup, termasuk pesan dari pengirim admin sendiri, tidak pernah menjadi admin control command.

## Prompt untuk coding agent

> Implementasikan provider abstraction, mock adapter, dan connector eksperimental sesuai dokumentasi versi Baileys yang dipilih. Buat group registry, metadata caching, normalizer, deduper, outbound queue, reconnection strategy, connection health, and tests. Sebelum menyalakan adapter real, tampilkan checklist risiko WhatsApp dan minta admin mengaktifkan explicit feature flag. Tidak ada spam atau broadcast tanpa izin.
