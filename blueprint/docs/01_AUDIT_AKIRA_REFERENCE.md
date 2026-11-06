# 01 — Audit `akirabotv1-main.zip`

## Temuan dari arsip

- Folder root `akirabotv1-main/`.
- File utama `akirabot.js` berukuran sekitar 402 KB (sekitar 7.363 baris) dan memiliki handler pesan serta `switch(command)` besar. Pemeriksaan statis menemukan 623 label `case` dengan 583 label unik; sebagian adalah variasi/alias dan fitur hiburan/NSFW, bukan 583 modul akademik.
- `index.js` menjalankan proses bot sebagai child process dan menangani pesan `reset` / `uptime`.
- Package menggunakan `@adiwajshing/baileys` versi `^3.3.0`; README meminta Node.js v12.
- Penyimpanan memakai banyak file JSON di `database/bot`, `database/group`, dan `database/user`.
- Helper modular tersedia dalam `akiraganz/`, termasuk help, rules, OCR, fetcher, media, TTS, dan lainnya.
- Ada konsep owner number, group metadata, group admin, owner-only command, runtime, QR login, leveling, limit, registered users, dan fitur media.
- Ada 87 pemanggilan `fs.readFileSync`, 38 `fs.writeFileSync`, dan 19 pemanggilan `child_process.exec` pada source utama yang diperiksa. Beberapa command menyusun command shell `wget` / `ffmpeg` memakai string interpolasi; pola ini jangan dipindahkan ke aplikasi baru.
- Asset `akira.jpeg` adalah artwork anime biru/cyan dengan branding “AKIRA BOT WA”. Asset ini hanya referensi visual, bukan identitas yang harus dipakai untuk bot Nursing Class A.

## Komponen yang dapat dijadikan inspirasi

| Referensi | Ide yang dipertahankan | Implementasi baru |
|---|---|---|
| `ownerNumber` | owner gate | allowlist JID + bootstrap pairing + RBAC |
| message parser | command handling | typed command registry + natural language intent |
| `switch(command)` | daftar perintah | module command handlers |
| `groupMetadata` | context grup | authorized group registry + metadata cache |
| `runtime` | status uptime | health service + uptime |
| JSON files | pemisahan data | PostgreSQL schema + migrations |
| `help.js` | menu/help | interactive text menu and help |
| `ocr.js` | pemrosesan gambar | upload pipeline + OCR + Super-VL vision |
| QR auth | pairing | provider adapter auth flow |

## Hal yang tidak boleh diwarisi

- Node.js 12 dan dependency lawas.
- Baileys 3.x API dan event model lama.
- File monolith lebih dari ratusan KB.
- Penulisan JSON sinkron untuk data inti.
- Shell command yang dibentuk dari string interpolasi dan path/URL dari sumber luar; gunakan API proses dengan argumen terpisah dan validasi file/URL.
- Hardcoded API keys, owner phone number, atau credentials.
- Auto command tanpa idempotency / permission gates.
- Kumpulan fitur hiburan/NSFW yang tidak relevan.
- Logging isi chat dan nomor pribadi berlebihan.

## Keputusan

Bangun ulang dari nol dengan TypeScript, PostgreSQL, Redis/BullMQ, connector abstraction, policy layer, dan model router. Jangan menganggap kode lama kompatibel dengan Baileys 6/7. Jika agent ingin mengambil ide dari source lama, ia harus menjelaskan fungsi yang diporting dan membuat test baru.

## Prompt untuk coding agent

> Audit repository Akira yang disediakan sebagai referensi konsep. Identifikasi command, owner authorization, event handling, group handling, runtime, dan helper yang relevan untuk class assistant. Buat daftar inspirasi dan risiko. Jangan menyalin kode deprecated. Implementasikan ulang hanya fitur yang tercantum pada blueprint ini dengan test modern.
