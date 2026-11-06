#!/usr/bin/env bash
# =============================================================================
# HdyBot — Nursing Class A Assistant
# Installer & Runner 24/7 Sekali Klik untuk Ubuntu Server (22.04 / 24.04 LTS)
#
# Cara pakai:
#   chmod +x install.sh && sudo ./install.sh
#
# Sub-perintah operasional:
#   sudo ./install.sh --status            # cek status service, watchdog, & health
#   sudo ./install.sh --logs              # lihat log live (journalctl -f)
#   sudo ./install.sh --restart           # restart service HdyBot
#   sudo ./install.sh --uninstall-service # hapus unit systemd (data & DB aman)
#
# Jaminan berjalan terus-menerus (24/7):
#   - systemd `Restart=always`, `RestartSec=5`, `StartLimitIntervalSec=0` (tak terbatas)
#   - Otomatis menyala saat Ubuntu Server reboot (`systemctl enable hdybot`)
#   - Watchdog timer setiap 2 menit mengecek `http://127.0.0.1:3000/health/ready`
#     dan me-restart `hdybot.service` jika proses hang / tidak merespons
#   - Backup PostgreSQL terenkripsi otomatis setiap pukul 02:30 WIB
# =============================================================================
set -euo pipefail

APP_NAME="hdybot"
APP_USER="hdybot"
APP_DIR="/opt/hdybot"
DATA_DIR="/var/lib/hdybot"
BACKUP_DIR="/var/backups/hdybot"
DB_NAME="hdybot"
DB_USER="hdybot"
NODE_MAJOR="22"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

c_ok()   { echo -e "\e[32m[OK]\e[0m $*"; }
c_info() { echo -e "\e[36m[..]\e[0m $*"; }
c_warn() { echo -e "\e[33m[!!]\e[0m $*"; }
die()    { echo -e "\e[31m[XX]\e[0m $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Jalankan dengan sudo: sudo bash install.sh"
if [[ -f /etc/os-release ]]; then
  . /etc/os-release
  [[ "${ID:-}" == "ubuntu" || "${ID_LIKE:-}" == *"debian"* ]] || c_warn "Terdeteksi OS ${ID:-unknown}; skrip dioptimalkan untuk Ubuntu Server."
fi

case "${1:-}" in
  --status)
    systemctl --no-pager status "$APP_NAME" hdybot-watchdog.timer hdybot-backup.timer || true
    echo "--- Health Endpoint ---"
    curl -fsS http://127.0.0.1:3000/health/ready || true
    echo ""
    exit 0 ;;
  --logs)
    exec journalctl -u "$APP_NAME" -f ;;
  --restart)
    systemctl restart "$APP_NAME"
    sleep 2
    systemctl --no-pager status "$APP_NAME"
    exit 0 ;;
  --uninstall-service)
    systemctl disable --now "$APP_NAME" hdybot-watchdog.timer hdybot-backup.timer 2>/dev/null || true
    rm -f /etc/systemd/system/hdybot*.service /etc/systemd/system/hdybot*.timer
    systemctl daemon-reload
    c_ok "Service & timer dihapus (database dan data di $DATA_DIR TIDAK dihapus)."
    exit 0 ;;
esac

randhex() { openssl rand -hex "${1:-24}"; }

# ---------------------------------------------------------------- 1. Paket Dasar
c_info "Memasang paket dasar sistem, PostgreSQL, Redis, UFW, dan Fail2Ban..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg openssl rsync ufw fail2ban postgresql postgresql-contrib redis-server
c_ok "Paket dasar terpasang"

# ---------------------------------------------------------------- 2. Node.js 22 LTS
if ! command -v node >/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  c_info "Memasang Node.js ${NODE_MAJOR} LTS..."
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
  apt-get update -y && apt-get install -y nodejs
fi
c_ok "Node $(node -v), npm $(npm -v)"

# ---------------------------------------------------------------- 3. Firewall & Fail2Ban
ufw allow OpenSSH >/dev/null || true
ufw --force enable >/dev/null || true
systemctl enable --now fail2ban >/dev/null || true
c_ok "Firewall UFW & Fail2Ban aktif (health port hanya bind 127.0.0.1)"

# ---------------------------------------------------------------- 4. PostgreSQL & Redis (Always-On)
sed -i 's/^#\?\s*bind .*/bind 127.0.0.1 ::1/' /etc/redis/redis.conf || true
sed -i 's/^supervised .*/supervised systemd/' /etc/redis/redis.conf || true
mkdir -p /etc/systemd/system/postgresql.service.d /etc/systemd/system/redis-server.service.d
cat > /etc/systemd/system/postgresql.service.d/override.conf <<EOF
[Service]
Restart=always
RestartSec=5
EOF
cat > /etc/systemd/system/redis-server.service.d/override.conf <<EOF
[Service]
Restart=always
RestartSec=5
EOF
systemctl daemon-reload
systemctl enable --now redis-server postgresql
systemctl restart redis-server
redis-cli ping | grep -q PONG && c_ok "Redis & PostgreSQL aktif (auto-restart enabled)"

# ---------------------------------------------------------------- 5. User & Direktori
id "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --home-dir "/home/$APP_USER" --shell /usr/sbin/nologin "$APP_USER"
install -d -o "$APP_USER" -g "$APP_USER" -m 0750 "$APP_DIR" "$DATA_DIR" "$DATA_DIR/whatsapp-auth" "$DATA_DIR/storage" "$BACKUP_DIR"
chmod 0700 "$DATA_DIR/whatsapp-auth" "$BACKUP_DIR"

c_info "Menyalin source code proyek ke $APP_DIR ..."
rsync -a --delete \
  --exclude node_modules --exclude dist --exclude .git --exclude '.env' --exclude '.pg-*.local' \
  --exclude whatsapp-auth --exclude storage --exclude backups \
  "$SRC_DIR/" "$APP_DIR/"
chmod +x "$APP_DIR/scripts/"*.sh 2>/dev/null || true
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ---------------------------------------------------------------- 6. File .env & Database
ENV_FILE="$APP_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  DB_PASS="$(randhex 24)"
  BACKUP_KEY="$(randhex 32)"
  cp "$APP_DIR/.env.example" "$ENV_FILE"
  sed -i "s|^NODE_ENV=.*|NODE_ENV=production|" "$ENV_FILE"
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}|" "$ENV_FILE"
  sed -i "s|^REDIS_URL=.*|REDIS_URL=redis://127.0.0.1:6379|" "$ENV_FILE"
  sed -i "s|^WHATSAPP_AUTH_DIR=.*|WHATSAPP_AUTH_DIR=${DATA_DIR}/whatsapp-auth|" "$ENV_FILE"
  {
    echo ""
    echo "# Dibuat otomatis oleh install.sh pada $(date -Iseconds)"
    echo "STORAGE_DIR=${DATA_DIR}/storage"
    echo "BACKUP_DIR=${BACKUP_DIR}"
    echo "BACKUP_ENCRYPTION_KEY=${BACKUP_KEY}"
    echo "HEALTH_HOST=127.0.0.1"
  } >> "$ENV_FILE"
  c_ok ".env dibuat dengan kredensial lokal acak (permission 0600)"
else
  DB_PASS="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')"
  c_ok ".env sudah ada — dipertahankan"
fi
chown "$APP_USER:$APP_USER" "$ENV_FILE"
chmod 0600 "$ENV_FILE"

sudo -u postgres psql -v ON_ERROR_STOP=1 -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 \
  || sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}'" >/dev/null
sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASS}' CREATEDB" >/dev/null
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 \
  || sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
c_ok "PostgreSQL database '${DB_NAME}' siap"

# ---------------------------------------------------------------- 7. Install, Migrate, Seed, Test, Build
as_app() { sudo -u "$APP_USER" -H bash -c "cd $APP_DIR && $*"; }
c_info "Menjalankan npm install & prisma generate..."
if [[ -f "$APP_DIR/package-lock.json" ]]; then
  as_app "npm ci --no-fund --no-audit || npm install --no-fund --no-audit"
else
  as_app "npm install --no-fund --no-audit"
fi
as_app "npx prisma generate"
c_info "Menjalankan migrasi database PostgreSQL..."
as_app "npx prisma migrate deploy"
c_info "Menjalankan seed data Semester 5A (idempotent)..."
as_app "npm run db:seed"
c_info "Memverifikasi typecheck, unit/integration test, dan build..."
as_app "npm run typecheck"
as_app "npm test"
as_app "npm run build"
c_ok "Seluruh test, typecheck, migrasi, seed, dan build LULUS"

# ---------------------------------------------------------------- 8. Systemd Daemon 24/7 + Watchdog + Backup Timer
cat > /etc/systemd/system/hdybot.service <<EOF
[Unit]
Description=HdyBot — Nursing Class A Assistant (24/7 Daemon)
After=network-online.target postgresql.service redis-server.service
Wants=network-online.target
Requires=postgresql.service redis-server.service
StartLimitIntervalSec=0

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5
TimeoutStopSec=20
KillSignal=SIGTERM
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${DATA_DIR} ${BACKUP_DIR}
UMask=0077
StandardOutput=journal
StandardError=journal
SyslogIdentifier=hdybot

[Install]
WantedBy=multi-user.target
EOF

# Watchdog: cek /health/ready setiap 2 menit; bila tidak merespons, restart hdybot.service
cat > /etc/systemd/system/hdybot-watchdog.service <<EOF
[Unit]
Description=HdyBot Health Watchdog Check
[Service]
Type=oneshot
ExecStart=/bin/bash -c 'curl -fsS --max-time 10 http://127.0.0.1:3000/health/ready >/dev/null || systemctl restart hdybot.service'
EOF

cat > /etc/systemd/system/hdybot-watchdog.timer <<EOF
[Unit]
Description=Run HdyBot Health Watchdog every 2 minutes
[Timer]
OnBootSec=2min
OnUnitActiveSec=2min
AccuracySec=15s
Persistent=true
[Install]
WantedBy=timers.target
EOF

# Backup harian terenkripsi pukul 02:30 WIB
cat > /etc/systemd/system/hdybot-backup.service <<EOF
[Unit]
Description=HdyBot Encrypted PostgreSQL Backup
[Service]
Type=oneshot
User=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=/bin/bash ${APP_DIR}/scripts/backup.sh
EOF

cat > /etc/systemd/system/hdybot-backup.timer <<EOF
[Unit]
Description=Daily Encrypted Backup for HdyBot at 02:30 WIB
[Timer]
OnCalendar=*-*-* 02:30:00 Asia/Jakarta
Persistent=true
[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now hdybot.service hdybot-watchdog.timer hdybot-backup.timer
sleep 3

if systemctl is-active --quiet hdybot; then
  c_ok "Service hdybot AKTIF dan berjalan terus-menerus (Restart=always + Watchdog 2m)"
else
  journalctl -u hdybot -n 40 --no-pager
  die "Service hdybot gagal menyala"
fi

echo
echo "==================================================================="
echo " HDYBOT — INSTALASI UBUNTU SERVER SELESAI (24/7 MODE)"
echo "  Lokasi App  : ${APP_DIR}"
echo "  Status      : sudo bash install.sh --status"
echo "  Live Log    : sudo bash install.sh --logs"
echo "  Restart     : sudo bash install.sh --restart"
echo "  Health URL  : http://127.0.0.1:3000/health/ready"
echo ""
echo " Konfigurasi NVIDIA API Key (opsional, untuk fitur AI penuh):"
echo "  1. sudo nano ${ENV_FILE}   # isi NVIDIA_API_KEY=<key_baru_anda>"
echo "  2. sudo systemctl restart hdybot"
echo "==================================================================="
