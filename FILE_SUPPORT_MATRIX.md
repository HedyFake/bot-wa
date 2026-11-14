# Format lampiran WhatsApp

| Masukan | Hasil yang tersedia | Batas yang memengaruhi hasil |
| --- | --- | --- |
| JPEG, PNG, WEBP, GIF statis | Pertanyaan visual, pembacaan tulisan atau ilustrasi | Gambar diputar sesuai orientasi dan diperkecil hingga 1600 piksel. Animasi ditolak. |
| PDF | Ekstraksi teks per halaman, OCR, tanya jawab, penggabungan PDF | Ekstraksi 80 halaman pertama. OCR mencoba delapan halaman pertama jika teks kosong. PDF terkunci perlu salinan terbuka. |
| DOCX, ODT | Paragraf berurutan | Tata letak dan objek grafis tidak dirender. |
| PPTX, ODP | Teks per slide, catatan PPTX jika tersedia | Gambar, animasi dan grafik tanpa teks memerlukan ekspor ke gambar untuk analisis visual. |
| XLSX | Sheet, alamat sel, nilai dan teks rumus | Rumus tidak dihitung. Nilai hasil mengikuti cache di workbook. |
| CSV, TSV | Baris dan kolom, termasuk kolom dengan pemisah di dalam kutipan | UTF-8, maksimal 1.500 baris dan 100 kolom untuk ekstraksi. |
| TXT, Markdown, JSON, kode sumber | Cuplikan teks untuk penjelasan dan review | UTF-8. JSON harus valid. Kode dibaca sebagai teks. |
| MP3, WAV, M4A, OGG/Opus, FLAC | Transkrip, ringkasan, subtitle WebVTT per segmen | Memerlukan FFmpeg, ffprobe dan akses API transkripsi. Waktu menunjukkan segmen, bukan kata atau pembicara. |
| MP4, MOV, WebM, MKV | Sampel frame bertimestamp dan transkrip jika ada audio | Maksimal enam frame dan durasi satu jam. Kejadian singkat di antara sampel bisa terlewat. |
| ZIP | Daftar nama entri | Tanpa ekstraksi ke disk. Dokumen dengan makro, executable atau objek tertanam ditolak. |
| DOC, PPT, XLS lama, RTF, TAR, GZ | Pesan format belum didukung | Ekspor ke format Office modern, PDF, atau teks. |

Hasil analisis bisa dikirim sebagai teks WhatsApp, PDF, DOCX, PPTX, TXT, Markdown atau JSON. Transkrip dan subtitle tersedia sebagai lampiran. Kemampuan memvalidasi suatu jenis lampiran di adapter pengiriman tidak otomatis menyediakan generator untuk format itu.
