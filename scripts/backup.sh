#!/usr/bin/env bash
# Backup PostgreSQL terenkripsi (AES-256, kunci dari BACKUP_ENCRYPTION_KEY di .env).
# Retensi default 14 hari. Jalankan sebagai user hdybot.
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL kosong}"
: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY kosong}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/hdybot}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
umask 077
mkdir -p "$BACKUP_DIR"
TS="$(TZ=Asia/Jakarta date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/hdybot-$TS.sql.gz.enc"
DB_URL="${DATABASE_URL%%\?*}"
pg_dump --no-owner --no-privileges "$DB_URL" | gzip -9 \
  | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass env:BACKUP_ENCRYPTION_KEY -out "$OUT"
sha256sum "$OUT" > "$OUT.sha256"
find "$BACKUP_DIR" -name 'hdybot-*.enc*' -mtime +"$RETENTION_DAYS" -delete
echo "Backup OK: $OUT"
