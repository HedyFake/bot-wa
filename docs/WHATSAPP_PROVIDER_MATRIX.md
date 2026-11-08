# MATRIKS KEMAMPUAN PROVIDER WHATSAPP (`docs/WHATSAPP_PROVIDER_MATRIX.md`)

| Kemampuan / Fitur | `wwebjs` (`whatsapp-web.js` + `qrcode-terminal`) **[AKTIF UTAMA]** | `baileys` (Socket Eksperimental) | `cloud-api` (WhatsApp Business Platform) | `mock` (Simulasi Test & CI) |
|---|---|---|---|---|
| Login via QR Code Terminal (`qrcode-terminal`) | **DIDUKUNG & TERUJI** | Didukung (eksperimental) | Tidak (menggunakan token bisnis) | Simulasi instan |
| Nomor Bot Dinamis / Bisa Ganti-Ganti | **DIDUKUNG PENUH** | Didukung | Terikat WABA bisnis | Simulasi |
| Verifikasi Pengirim Admin (`082233038659`) + Password (`<password admin dari konfigurasi>`) | **DIDUKUNG & TERUJI** | Didukung | Didukung | **DIDUKUNG & TERUJI** |
| Resolusi Nomor Asli dari `@lid` / `@c.us` (`getContact`) | **DIDUKUNG (`wwebjs.ts`)** | Parsial | N/A | N/A |
| Terima Pesan Grup Sumber (`@g.us`) | **DIDUKUNG** | Didukung | Terbatas pada akun bisnis tertentu | **DIDUKUNG & TERUJI** |
| Kirim Pengumuman ke Grup Utama | **DIDUKUNG (dengan OutboundGate)** | Didukung | Terbatas | **DIDUKUNG & TERUJI** |
| Kirim & Terima Stiker WebP (`.sticker`, `.ttp`) | **DIDUKUNG (`MessageMedia` + `sendMediaAsSticker`)** | Didukung | Terbatas | **DIDUKUNG & TERUJI** |
| Kirim Gambar PNG / QR Code / Dokumen PDF | **DIDUKUNG (`MessageMedia`)** | Didukung | Didukung | **DIDUKUNG & TERUJI** |
| Penyimpanan Sesi Persisten 24/7 (`LocalAuth`) | **DIDUKUNG (`WHATSAPP_AUTH_DIR`)** | Didukung | Stateless token | In-memory |

## Catatan Kepatuhan & Risiko Operasional
1. `whatsapp-web.js` (`wwebjs`) dan `baileys` menggunakan mekanisme *Linked Devices* (WhatsApp Web) menggunakan browser headless Google Chrome Stable (`.deb`).
2. Untuk menjaga keamanan nomor bot:
   - Seluruh pengiriman ke grup melewati `OutboundGate` (allowlist grup, deduplikasi idempotency key, dan `.admin pause` emergency stop).
   - Tidak ada fitur broadcast spam atau pengiriman massal tanpa izin.
   - Nomor bot dapat diganti kapan saja dengan menjalankan `sudo ./install.sh --reset-wa` lalu memindai QR Code menggunakan nomor WhatsApp baru.
