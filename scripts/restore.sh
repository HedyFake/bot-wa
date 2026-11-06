#!/usr/bin/env bash
# Restore backup terenkripsi ke database di DATABASE_URL.
#   bash scripts/restore.sh /var/backups/hdybot/hdybot-YYYYmmdd-HHMMSS.sql.gz.enc
# PERINGATAN: menimpa isi database. Hentikan service dulu: sudo systemctl stop hdybot
set -euo pipefail
FILE="${1:?Pakai: restore.sh <file.enc>}"
: "${DATABASE_URL:?}"; : "${BACKUP_ENCRYPTION_KEY:?}"
[[ -f "$FILE.sha256" ]] && sha256sum -c "$FILE.sha256"
read -r -p "Ketik RESTORE untuk menimpa database: " ok
[[ "$ok" == "RESTORE" ]] || { echo "Dibatalkan"; exit 1; }
DB_URL="${DATABASE_URL%%\?*}"
psql "$DB_URL" -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_ENCRYPTION_KEY -in "$FILE" | gunzip | psql "$DB_URL" -v ON_ERROR_STOP=1 -q
echo "Restore selesai. Jalankan: sudo systemctl start hdybot"
