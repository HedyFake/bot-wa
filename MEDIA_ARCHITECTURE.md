# Alur lampiran HdyBot

1. Adapter whatsapp-web.js dan Baileys membaca tipe pesan, identitas pengirim, kutipan dan caption. Lampiran dibaca lewat fungsi unduh milik adapter.
2. Dispatcher memisahkan login, command eksplisit, pesan duplikat serta permintaan file. Di grup, panggil bot saat meminta analisis.
3. FileIntelligence memeriksa signature, batas ukuran dan MIME. Ekstraktor Office membaca entri XML lokal. PDF memakai Poppler dan Tesseract. FFmpeg dan ffprobe memeriksa rekaman dan mengambil audio atau frame.
4. Pertanyaan yang merujuk halaman, slide atau baris memakai bagian dokumen terpilih. Cuplikan masuk sebagai pesan pengguna. Router menggunakan kapabilitas teks atau gambar. Transkripsi memakai endpoint audio terpisah.
5. OutboundGate memeriksa lampiran dan mencatat hasil adapter. Persetujuan adapter pengiriman tidak menunjukkan bahwa penerima telah membaca pesan.

Satu pengguna dapat merujuk ke empat lampiran terkini di chat yang sama. Maksimal dua pekerjaan media aktif per proses dan satu per konteks. Saat penuh, bot meminta pengguna mencoba kembali. Penyimpanan memori membatasi jumlah konteks dan byte lampiran mentah. Prisma menyediakan penyimpanan terenkripsi opsional melalui MEDIA_ENCRYPTION_KEY dan DATABASE_URL. Migrasi ada di prisma/migrations/20261114010000_multimodal.

Contoh penggunaan di chat pribadi: unggah dua PDF, lalu kirim “gabungkan kedua PDF”. Untuk menganalisis slide, kirim “jelaskan slide 2 dari file tadi”. Gunakan “batalkan analisis” untuk meminta pembatalan atau “hapus semua file” untuk membersihkan konteks milikmu di chat itu.
