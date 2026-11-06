# 04 — Private WhatsApp Admin Control (Primary Dashboard)

## Prinsip

Nomor bot adalah endpoint kontrol. Admin mengirim pesan **pribadi**, bukan melalui grup, dan memperoleh jawaban seperti dashboard chat. Tidak wajib ada panel web.

## Identitas dan onboarding admin

Konfigurasi:

- `ADMIN_WHATSAPP_JID`: nomor WhatsApp admin dalam format JID yang tepat; nilainya dimasukkan saat deployment.
- `ADMIN_BOOTSTRAP_SECRET_HASH`: hash Argon2id dari secret acak yang berlaku satu kali.
- `ADMIN_BOOTSTRAP_EXPIRES_AT`: batas waktu pairing.

Alur:

1. Owner menjalankan perintah setup di server dan menghasilkan secret acak minimal 32 byte.
2. Owner membuka private chat bot dari nomor yang akan diotorisasi.
3. Owner memasukkan pairing secret satu kali.
4. Sistem memverifikasi hash, expiry, rate limit, exact private JID, dan status bootstrap.
5. Setelah sukses, bootstrap token langsung dinonaktifkan dan `ADMIN_WHATSAPP_JID` dikunci/ditulis ke konfigurasi aman.
6. Owner menerima status, daftar fitur, dan rekomendasi mengganti secret bila token pernah terekspos.

Jangan menaruh password statis dalam code atau prompt. Password yang sebelumnya dikirim di percakapan tidak boleh dipakai ulang karena sudah terekspos dan lemah. Gunakan password baru yang kuat atau secret random satu kali. Jangan pernah menaruh kredensial asli di file markdown.

## Authorization rules

- `remoteJid` harus private JID dan `senderJid` harus cocok exact dengan allowlist.
- Pesan dari grup selalu `admin=false`.
- Jangan mengandalkan push name, nama kontak, profile picture, atau klaim teks “saya owner”.
- Command parser tidak boleh mengevaluasi konten kutipan seolah-olah command pengirim.
- Admin tambahan harus ditambahkan oleh owner melalui flow terkonfirmasi.
- Perintah sensitif membutuhkan confirmation nonce terikat pada actor + action + payload hash + expiry.

## Admin chat menu

```text
NURSING CLASS A — ADMIN CONSOLE
1. Ringkasan / dashboard
2. AI & model NVIDIA
3. Jadwal dan kalender
4. Tugas dan deadline
5. Grup sumber dan filter AI
6. Review informasi penting
7. Pengumuman dan broadcast
8. Materi dan dokumen
9. Dosen dan mata kuliah
10. Reminder
11. Statistik dan laporan
12. Keamanan dan koneksi

Ketik angka, command, atau tulis perintah biasa.
```

## Admin command examples

- `.admin menu`
- `.admin status`
- `.admin overview`
- `.admin groups list`
- `.admin group add <jid>`
- `.admin group pause <jid>`
- `.admin review`
- `.admin approve <review-id>`
- `.admin reject <review-id> <reason>`
- `.admin publish <draft-id>`
- `.admin model auto`
- `.admin model status`
- `.admin model set <alias>` (global override; confirmation required)
- `.admin model reset`
- `.admin pause` / `.admin resume`
- `.admin backup status`

## Confirmation protocol

For high-impact actions:

1. Bot displays intended action, destination, exact text or diff, source, and impact.
2. Bot issues one-time nonce (not a reusable password).
3. Admin replies `.confirm <nonce>` or `.cancel <nonce>` before expiry.
4. Verify actor, action, and payload hash match.
5. Execute idempotently and report provider result.

No hidden confirmation, no “yes” interpreted from unrelated quoted content.

## Conversational examples

Admin: “Tampilkan semua pesan penting sejak tadi pagi.”
Bot: summary sorted by priority + source + verification status.

Admin: “Matikan sementara pemantauan grup tugas.”
Bot: preview group + scope + duration; ask confirmation.

Admin: “Model apa yang sedang dipakai?”
Bot: current route, model aliases, health, last error, and whether route is auto/manual.

Admin: “Kirim ringkasan ini ke Nursing Class A.”
Bot: draft, target group, preview; publish only after allowed confirmation.

## Prompt untuk coding agent

> Jadikan private admin DM sebagai control plane. Implementasikan pairing satu kali, allowlist JID, DM-only guard, RBAC, command + natural-language interface, chat menus, confirmation nonce, rate limits, audit log, pause switch, dan status. Buat integration tests yang mencoba spoofing dari grup, sender mirip, quoted command, replay nonce, secret expired, dan brute force.
