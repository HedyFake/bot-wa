# Audit multimedia HdyBot

Audit sumber lokal sebelum implementasi, 14 November 2026.

| Jalur | Kondisi awal | Dampak |
| --- | --- | --- |
| `src/whatsapp/adapters/wwebjs.ts` | Memanggil downloadMedia untuk media langsung dan kutipan. Batas diterapkan setelah hasil Base64 tersedia. | Gambar, dokumen, audio, video, stiker dan caption bisa mencapai dispatcher. Gagal unduh menjadi undefined. Belum ada pemeriksaan khusus pesan sementara dan sekali lihat. |
| `src/whatsapp/adapters/baileys.ts` | Membaca conversation dan extendedTextMessage. Adapter pengiriman sudah mendukung dokumen dan media. | Pesan media tanpa teks dilewati. Belum ada pengunduh atau dukungan media kutipan. |
| `src/index.ts`, dispatcher | Deduplikasi berdasarkan chat dan ID pesan. LMS dan autentikasi memiliki alur tersendiri. | Gambar dapat masuk ke .ask, stiker dan OCR lewat perintah khusus. Belum ada konteks lampiran lintas pesan. |
| `src/modules/materials/extract.ts`, `src/modules/lms/document.ts` | Poppler, Tesseract, pdf-lib, Sharp dan validasi dokumen LMS sudah tersedia. | Ekstraksi PDF dibatasi 80 halaman dan OCR delapan halaman pertama. |
| `src/ai/openai/luna.ts` | Responses API dengan teks dan input_image, timeout, kuota, dan perutean cadangan. | Belum ada permintaan transkripsi berkas atau ekstraksi video. |
| `src/whatsapp/outbound/gate.ts` | Memeriksa MIME, signature, ukuran, izin grup, idempotensi, dry-run, dan hasil provider. | Bisa digunakan kembali untuk balasan dengan lampiran. |
| Prisma/PostgreSQL, install.sh | Ada Document dan AuditLog, cache LMS terenkripsi, systemd MemoryMax 2G. Installer memasang Poppler dan Tesseract. | Belum ada katalog lampiran pribadi dan histori pemrosesan multimodal. Kuota disk, RAM bebas, alat terpasang, dan kondisi VPS sebenarnya belum diukur. |

Kontrak awal hanya memuat satu lampiran langsung dan satu kutipan. Album atau beberapa unggahan perlu dirangkai melalui identitas chat dan pengirim. Log kegagalan pesan masuk mencatat kelas error, tanpa mencetak isi file.
