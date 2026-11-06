#!/usr/bin/env bash
# =============================================================================
# HdyBot — Nursing Class A Assistant
# Installer & Runner 24/7 Sekali Klik untuk Ubuntu Server (22.04 / 24.04 LTS)
#
# Cara pakai:
#   chmod +x install.sh && sudo ./install.sh
#
# Sub-perintah operasional:
#   sudo ./install.sh --status            # cek status service systemd
#   sudo ./install.sh --logs              # lihat log live (journalctl -f)
#   sudo ./install.sh --restart           # restart service HdyBot
#   sudo ./install.sh --uninstall-service # hapus unit systemd (data & DB aman)
#
# Catatan penting:
#   - TIDAK memasang dan TIDAK mengaktifkan UFW maupun Fail2Ban agar IP VPS
#     owner tidak pernah terblokir.
#   - TIDAK membuka port TCP/HTTP sama sekali (bebas bentrok EADDRINUSE port 3000);
#     seluruh pemantauan health/ready/status dilakukan lewat chat WhatsApp
#     pribadi Hedy (.status, .health, .dashboard, .ping, .runtime).
#   - Membersihkan override systemd postgresql.service yang tidak kompatibel
#     dengan Type=oneshot di Ubuntu.
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
    systemctl --no-pager status "$APP_NAME" hdybot-backup.timer || true
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

# ---------------------------------------------------------------- 1. Paket Dasar (TANPA ufw & TANPA fail2ban)
c_info "Memasang paket dasar sistem, PostgreSQL, dan Redis (tanpa UFW & tanpa Fail2Ban)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg openssl rsync postgresql postgresql-contrib redis-server
c_ok "Paket dasar terpasang (UFW & Fail2Ban tidak digunakan)"

# ---------------------------------------------------------------- 2. Node.js LTS (>= 20)
if ! command -v node >/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  c_info "Memasang Node.js ${NODE_MAJOR} LTS..."
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
  apt-get update -y && apt-get install -y nodejs
fi
c_ok "Node $(node -v), npm $(npm -v)"

# ---------------------------------------------------------------- 3. Perbaiki & Nyalakan PostgreSQL + Redis
# PENTING: Di Ubuntu, postgresql.service adalah wrapper Type=oneshot sehingga
# TIDAK BOLEH diberi Restart=always di override.conf (menyebabkan "bad unit file setting").
rm -rf /etc/systemd/system/postgresql.service.d /etc/systemd/system/redis-server.service.d
sed -i 's/^#\?\s*bind .*/bind 127.0.0.1 ::1/' /etc/redis/redis.conf || true
sed -i 's/^supervised .*/supervised systemd/' /etc/redis/redis.conf || true
systemctl daemon-reload
systemctl enable --now postgresql redis-server
systemctl restart postgresql redis-server
redis-cli ping | grep -q PONG && c_ok "PostgreSQL & Redis aktif normal"

# ---------------------------------------------------------------- 4. User & Direktori
id "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --home-dir "/home/$APP_USER" --shell /usr/sbin/nologin "$APP_USER"
install -d -o "$APP_USER" -g "$APP_USER" -m 0750 "$APP_DIR" "$DATA_DIR" "$DATA_DIR/whatsapp-auth" "$DATA_DIR/storage" "$BACKUP_DIR"
chmod 0700 "$DATA_DIR/whatsapp-auth" "$BACKUP_DIR"

# Hentikan service lama sebelum menyalin agar file tidak terkunci
systemctl stop hdybot.service 2>/dev/null || true
rm -rf "$APP_DIR/dist" "$APP_DIR/src/app/http.ts"

c_info "Menyalin source code proyek ke $APP_DIR ..."
rsync -a --delete \
  --exclude node_modules --exclude dist --exclude .git --exclude '.env' --exclude '.pg-*.local' \
  --exclude whatsapp-auth --exclude storage --exclude backups \
  "$SRC_DIR/" "$APP_DIR/"
chmod +x "$APP_DIR/scripts/"*.sh 2>/dev/null || true
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ---------------------------------------------------------------- 5. File .env & Database
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

# ---------------------------------------------------------------- 6. Install, Migrate, Seed, Test, Build
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

# ---------------------------------------------------------------- 7. Systemd Daemon 24/7 + Backup Timer
# Bersihkan unit watchdog lama bila pernah dibuat
systemctl disable --now hdybot-watchdog.timer hdybot-watchdog.service 2>/dev/null || true
rm -f /etc/systemd/system/hdybot-watchdog.timer /etc/systemd/system/hdybot-watchdog.service

cat > /etc/systemd/system/hdybot.service <<EOF
[Unit]
Description=HdyBot — Nursing Class A Assistant (24/7 WhatsApp Admin Control)
After=network-online.target postgresql.service redis-server.service
Wants=network-online.target postgresql.service redis-server.service
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
systemctl reset-failed hdybot.service postgresql.service redis-server.service 2>/dev/null || true
systemctl enable --now hdybot.service hdybot-backup.timer
sleep 3

if systemctl is-active --quiet hdybot; then
  c_ok "Service hdybot AKTIF dan berjalan terus-menerus tanpa membuka port HTTP (Restart=always)"
else
  journalctl -u hdybot -n 40 --no-pager
  die "Service hdybot gagal menyala"
fi

echo
echo "==================================================================="
echo " HDYBOT — INSTALASI UBUNTU SERVER SELESAI (24/7 MODE)"
echo "  Lokasi App  : ${APP_DIR}"
echo "  Firewall    : UFW & Fail2Ban TIDAK digunakan (IP VPS aman)"
echo "  Port HTTP   : TIDAK membuka port (bebas EADDRINUSE 3000)"
echo "  Health/Ready: Dipantau via chat WA pribadi Hedy (.status / .health / .dashboard)"
echo "  Status      : sudo ./install.sh --status"
echo "  Live Log    : sudo ./install.sh --logs"
echo "  Restart     : sudo ./install.sh --restart"
echo "==================================================================="
