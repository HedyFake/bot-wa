# 08 — Group Intelligence: Filter Chat, Rangkuman, dan Routing

## Tujuan

Menganalisis percakapan pada grup sumber yang disetujui, memilih informasi akademik yang relevan, dan menyampaikan ringkasan / pengumuman ke admin atau grup utama sesuai policy.

## Pipeline

1. Ingest event yang masuk.
2. Validasi group JID terdaftar dan enabled.
3. Deduplicate provider message ID.
4. Normalize text/caption/quoted context.
5. Bila media: validate MIME/size, download secara aman, OCR/transcribe/vision sesuai tipe.
6. Klasifikasi prioritas dan kategori.
7. Ekstrak fakta akademik terstruktur.
8. Deteksi duplicate, update, cancellation, contradiction.
9. Score sumber dan confidence.
10. Simpan review item / knowledge fact.
11. Kirim private digest ke admin.
12. Setelah approval: update data dan/atau buat outbound announcement.
13. Audit semua keputusan.

## Priority definitions

- `URGENT`: perubahan mendadak yang berdampak langsung (kelas batal, ujian dimajukan, deadline hari ini, ruang berubah beberapa saat sebelum kelas). Tetap membutuhkan validasi sumber / admin sesuai policy.
- `IMPORTANT`: tugas baru, deadline, materi, presentasi, jadwal beberapa hari ke depan, instruksi akademik yang jelas.
- `NORMAL`: diskusi akademik umum dan informasi berguna tanpa tindakan mendesak; masuk digest.
- `LOW`: candaan, stiker, salam, percakapan non-akademik; tidak perlu diteruskan ke grup utama.
- `REVIEW`: potensi penting tetapi sumber, tanggal, maksud, atau kebenarannya tidak jelas.

Priority adalah urgency; confidence adalah keyakinan ekstraksi; source reliability adalah otoritas sumber. Jangan satukan ketiganya.

## Rule awal

- Pesan dari admin akademik/dosen yang teridentifikasi dan grup resmi: reliability tinggi, tetapi identitas pengirim tetap diverifikasi dari metadata dan registry.
- Ketua/sekretaris kelas terdaftar: reliability menengah/tinggi untuk informasi yang mereka sahkan.
- Anggota biasa: sumber awal; perubahan akademik harus direview.
- Forwarded message tanpa sumber yang dapat ditelusuri: `REVIEW`.
- Konflik dua pesan: jangan pilih berdasarkan timestamp saja; tampilkan perbandingan.
- Jika pesan mengandung “ralat”, “koreksi”, “dibatalkan”, “bukan”, “jadi”, atau quoted reply, proses sebagai kandidat update/cancellation.
- Pesan bercanda yang menyebut “besok libur” tidak boleh menjadi perubahan jadwal tanpa konteks/sumber.

## Message linking

Simpan message thread context secara terbatas: quoted message ID, reply author, group ID, and nearby related messages. Jangan mengirim seluruh histori grup ke model untuk setiap pesan. Ambil jendela konteks kecil yang relevan dan patuhi retention.

## Routing destinations

- Semua kandidat penting → private admin digest.
- Kandidat yang belum terverifikasi → review queue privat.
- Pesan LOW → tidak diteruskan.
- Pengumuman kelas → Nursing Class A hanya setelah approval sesuai policy.
- Rangkuman berkala → grup utama hanya bila admin mengaktifkan jadwal dan anggota sudah diberi tahu.

## Anti-noise controls

- Group quiet hours.
- Digest batching.
- Similarity dedupe.
- Suppress duplicate reminder / re-forward.
- Per-group category filter.
- Admin dapat `.filter pause <group>` / `.filter resume <group>`.

## Admin digest example

```text
RINGKASAN INFORMASI PENTING
Rentang: 06 Nov 2026 00.00–12.00 WIB

1. [PENTING] Metodologi Penelitian — kandidat tugas baru
   Sumber: Grup ... | 09.21 WIB
   Validasi: menunggu admin

2. [REVIEW] Dugaan perubahan jadwal
   Sumber: Forwarded message | 10.05 WIB
   Catatan: tanggal belum jelas

3. [NORMAL] Materi Keperawatan Gerontik dibagikan
   Sumber: Grup ... | 11.10 WIB
```

## Prompt untuk coding agent

> Bangun ingestion/classification/extraction/dedupe/review/digest/publish pipeline. Tambahkan fixture pesan bahasa Indonesia sehari-hari, typo, singkatan, pesan bercanda, forward tanpa sumber, quoted correction, pesan ganda, dan konflik. Ukur false-positive URGENT dan false-negative deadline. Jangan auto-broadcast berdasarkan classifier saja.
