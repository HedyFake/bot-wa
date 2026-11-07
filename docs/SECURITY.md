# KEAMANAN & PRIVASI (`docs/SECURITY.md`)

## 1. Autentikasi Admin Berlapis (Nomor Admin + Password Interaktif `hedyfake`)
- **Nomor Admin Utama**: `082233038659` (`+6282233038659`).
- **Nomor Bot**: Bebas/random dan dapat diganti kapan saja melalui scan QR Code tanpa mengubah kode.
- **Verifikasi Password Chat Pribadi**:
  - Ketika admin (`082233038659`) menghubungi bot di chat pribadi, bot meminta password terlebih dahulu.
  - Password (`hedyfake` secara default, dikonfigurasi lewat `ADMIN_PASSWORD`) disimpan dalam bentuk hash `scrypt` dengan salt acak dan diverifikasi menggunakan `timingSafeEqual`.
  - Percobaan password yang gagal dibatasi oleh *rate limiter* (`maxAuthFailuresPerWindow`).
  - Command admin **ditolak keras** bila dikirim dari dalam grup (`group_context_not_admin`).

## 2. Konfirmasi One-Time Nonce untuk Aksi Berdampak Tinggi
- Pengiriman pengumuman ke grup utama (`.send <id>`) wajib melalui persetujuan `.approve <id>` diikuti konfirmasi `.confirm <nonce>` yang terikat ke JID aktor dan memiliki masa berlaku (TTL).

## 3. Redaksi Rahasia & Perlindungan SSRF / Path Traversal
- Pino logger (`src/observability/logger.ts`) menyensor `NVIDIA_API_KEY`, `ADMIN_PASSWORD`, token, dan pola `nvapi-*` secara otomatis.
- `validateSafeExternalUrl` (`src/security/guards.ts`) memblokir akses ke loopback (`127.0.0.1`, `localhost`), IP privat RFC1918 (`10.x`, `172.16-31.x`, `192.168.x`), dan cloud metadata (`169.254.169.254`).
- `resolveSafeStoragePath` mencegah serangan *path traversal* (`../`).

## 4. Peringatan Rotasi Key
- Setiap API key yang pernah ditempelkan pada chat atau riwayat commit lama wajib di-revoke di dashboard provider dan diganti dengan key baru di `/opt/hdybot/.env` (`chmod 0600`).
