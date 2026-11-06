#!/usr/bin/env bash
# =============================================================================
# HdyBot — Nursing Class A Assistant
# Installer & Runner 24/7 Sekali Klik untuk Ubuntu Server (22.04 / 24.04 LTS)
# Menggunakan `whatsapp-web.js` + `qrcode-terminal` + Google Chrome Stable (.deb)
#
# Cara pakai:
#   chmod +x install.sh && sudo ./install.sh
#
# Sub-perintah operasional:
#   sudo ./install.sh --qr                # tampilkan QR code / log WhatsApp live
#   sudo ./install.sh --status            # cek status service systemd
#   sudo ./install.sh --logs              # lihat log live
#   sudo ./install.sh --cli               # simulasi chat admin dari terminal
#   sudo ./install.sh --restart           # restart service HdyBot
#   sudo ./install.sh --reset-wa          # hapus sesi WA lama & munculkan QR baru
#   sudo ./install.sh --uninstall-service # hapus unit systemd (data & DB aman)
#
# Catatan penting:
#   - TIDAK memasang dan TIDAK mengaktifkan UFW maupun Fail2Ban agar IP VPS
#     owner tidak pernah terblokir.
#   - TIDAK membuka port TCP/HTTP sama sekali (bebas bentrok EADDRINUSE port 3000).
#   - Memasang Google Chrome Stable (.deb native, BUKAN Snap) agar Puppeteer &
#     whatsapp-web.js berjalan mulus di dalam systemd service Ubuntu Server.
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
  --qr|--logs)
    echo "Menampilkan log live & QR Code WhatsApp (Tekan Ctrl+C untuk keluar dari tampilan log; bot tetap jalan 24/7 di background)..."
    if [[ -f /tmp/hdybot-qr.txt ]]; then
      cat /tmp/hdybot-qr.txt
    fi
    exec env LANG=C.UTF-8 LC_ALL=C.UTF-8 journalctl -u "$APP_NAME" -f -n 100 -o cat ;;
  --status)
    systemctl --no-pager status "$APP_NAME" hdybot-backup.timer || true
    exit 0 ;;
  --cli)
    exec sudo -u "$APP_USER" -H bash -c "cd $APP_DIR && npm run -s cli" ;;
  --cmd)
    shift
    exec sudo -u "$APP_USER" -H bash -c "cd $APP_DIR && npm run -s cli -- \"$*\"" ;;
  --restart)
    systemctl reset-failed "$APP_NAME" 2>/dev/null || true
    systemctl restart "$APP_NAME"
    sleep 2
    systemctl --no-pager status "$APP_NAME"
    exit 0 ;;
  --reset-wa)
    systemctl stop "$APP_NAME" || true
    rm -rf "${DATA_DIR}/whatsapp-auth/"* /tmp/hdybot-qr.txt
    systemctl reset-failed "$APP_NAME" 2>/dev/null || true
    systemctl start "$APP_NAME"
    c_ok "Sesi WhatsApp di-reset. Menampilkan QR Code baru..."
    exec env LANG=C.UTF-8 LC_ALL=C.UTF-8 journalctl -u "$APP_NAME" -f -n 100 -o cat ;;
  --uninstall-service)
    systemctl disable --now "$APP_NAME" hdybot-watchdog.timer hdybot-backup.timer 2>/dev/null || true
    rm -f /etc/systemd/system/hdybot*.service /etc/systemd/system/hdybot*.timer
    systemctl daemon-reload
    c_ok "Service & timer dihapus (database dan data di $DATA_DIR TIDAK dihapus)."
    exit 0 ;;
esac

randhex() { openssl rand -hex "${1:-24}"; }

# Hentikan service di awal agar tidak terus mencoba restart selama proses instalasi berlangsung
systemctl stop hdybot.service 2>/dev/null || true
systemctl disable --now hdybot-watchdog.timer hdybot-watchdog.service 2>/dev/null || true
rm -f /etc/systemd/system/hdybot-watchdog.timer /etc/systemd/system/hdybot-watchdog.service
systemctl reset-failed hdybot.service 2>/dev/null || true

# ---------------------------------------------------------------- 1. Paket Dasar + Google Chrome Stable (.deb native)
c_info "Memasang paket dasar, PostgreSQL, Redis, dan Google Chrome Stable untuk whatsapp-web.js (tanpa UFW & tanpa Fail2Ban)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y \
  ca-certificates curl wget gnupg openssl rsync \
  postgresql postgresql-contrib redis-server \
  fonts-liberation libatk-bridge2.0-0 libatk1.0-0 libcups2 libdbus-1-3 \
  libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 libx11-xcb1 libxcomposite1 \
  libxdamage1 libxfixes3 libxkbcommon0 libxrandr2 xdg-utils
apt-get install -y libasound2t64 2>/dev/null || apt-get install -y libasound2 2>/dev/null || true

# Pasang Google Chrome Stable (.deb native, BUKAN Snap!) agar Puppeteer berjalan stabil di systemd
if [[ ! -x /usr/bin/google-chrome-stable ]]; then
  c_info "Mengunduh & memasang Google Chrome Stable (.deb native untuk Ubuntu Server)..."
  CHROME_DEB="/tmp/google-chrome-stable_current_amd64.deb"
  wget -q -O "$CHROME_DEB" https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
  apt-get install -y "$CHROME_DEB" || { apt-get -f install -y && apt-get install -y "$CHROME_DEB"; }
  rm -f "$CHROME_DEB"
fi
c_ok "Google Chrome Stable: $(/usr/bin/google-chrome-stable --version 2>/dev/null || echo 'terpasang')"

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
rm -rf /etc/systemd/system/postgresql.service.d /etc/systemd/system/redis-server.service.d
sed -i 's/^#\?\s*bind .*/bind 127.0.0.1 ::1/' /etc/redis/redis.conf || true
sed -i 's/^supervised .*/supervised systemd/' /etc/redis/redis.conf || true
systemctl daemon-reload
systemctl reset-failed postgresql.service redis-server.service 2>/dev/null || true
systemctl enable --now postgresql redis-server
systemctl restart postgresql redis-server
redis-cli ping | grep -q PONG && c_ok "PostgreSQL & Redis aktif normal"

# ---------------------------------------------------------------- 4. User & Direktori
id "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --home-dir "/home/$APP_USER" --shell /bin/bash "$APP_USER"
usermod -s /bin/bash "$APP_USER" 2>/dev/null || true
install -d -o "$APP_USER" -g "$APP_USER" -m 0750 "$APP_DIR" "$DATA_DIR" "$DATA_DIR/whatsapp-auth" "$DATA_DIR/storage" "$BACKUP_DIR" "/home/$APP_USER"
chmod 0700 "$DATA_DIR/whatsapp-auth" "$BACKUP_DIR"

# Hanya jalankan rsync bila install.sh tidak sedang dijalankan langsung dari dalam /opt/hdybot
if [[ "$(readlink -f "$SRC_DIR")" != "$(readlink -f "$APP_DIR")" ]]; then
  c_info "Menyalin source code proyek dari $SRC_DIR ke $APP_DIR ..."
  rsync -a --delete \
    --exclude node_modules --exclude dist --exclude .git --exclude '.env' --exclude '.pg-*.local' \
    --exclude whatsapp-auth --exclude storage --exclude backups \
    "$SRC_DIR/" "$APP_DIR/"
else
  c_info "install.sh dijalankan langsung di $APP_DIR (skip rsync ke diri sendiri)"
fi
rm -rf "$APP_DIR/dist" "$APP_DIR/src/app/http.ts"
chmod +x "$APP_DIR/scripts/"*.sh 2>/dev/null || true
chown -R "$APP_USER:$APP_USER" "$APP_DIR" "$DATA_DIR" "$BACKUP_DIR" "/home/$APP_USER"

# ---------------------------------------------------------------- 5. File .env & Database (WHATSAPP_PROVIDER=wwebjs)
ENV_FILE="$APP_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  DB_PASS="$(randhex 24)"
  BACKUP_KEY="$(randhex 32)"
  cp "$APP_DIR/.env.example" "$ENV_FILE"
  sed -i "s|^NODE_ENV=.*|NODE_ENV=production|" "$ENV_FILE"
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}|" "$ENV_FILE"
  sed -i "s|^REDIS_URL=.*|REDIS_URL=redis://127.0.0.1:6379|" "$ENV_FILE"
  sed -i "s|^WHATSAPP_PROVIDER=.*|WHATSAPP_PROVIDER=wwebjs|" "$ENV_FILE"
  sed -i "s|^WHATSAPP_AUTH_DIR=.*|WHATSAPP_AUTH_DIR=${DATA_DIR}/whatsapp-auth|" "$ENV_FILE"
  sed -i "s|^OUTBOUND_ENABLED=.*|OUTBOUND_ENABLED=true|" "$ENV_FILE"
  sed -i "s|^DRY_RUN=.*|DRY_RUN=false|" "$ENV_FILE"
  {
    echo ""
    echo "# Dibuat otomatis oleh install.sh pada $(date -Iseconds)"
    echo "PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable"
    echo "STORAGE_DIR=${DATA_DIR}/storage"
    echo "BACKUP_DIR=${BACKUP_DIR}"
    echo "BACKUP_ENCRYPTION_KEY=${BACKUP_KEY}"
  } >> "$ENV_FILE"
  c_ok ".env dibuat dengan WHATSAPP_PROVIDER=wwebjs & Chrome Stable (permission 0600)"
else
  sed -i "s|^WHATSAPP_PROVIDER=.*|WHATSAPP_PROVIDER=wwebjs|" "$ENV_FILE"
  sed -i "s|^WHATSAPP_AUTH_DIR=.*|WHATSAPP_AUTH_DIR=${DATA_DIR}/whatsapp-auth|" "$ENV_FILE"
  sed -i "s|^OUTBOUND_ENABLED=.*|OUTBOUND_ENABLED=true|" "$ENV_FILE"
  sed -i "s|^DRY_RUN=.*|DRY_RUN=false|" "$ENV_FILE"
  grep -q '^PUPPETEER_EXECUTABLE_PATH=' "$ENV_FILE" \
    && sed -i "s|^PUPPETEER_EXECUTABLE_PATH=.*|PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable|" "$ENV_FILE" \
    || echo "PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable" >> "$ENV_FILE"
  DB_PASS="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')"
  c_ok ".env diperbarui (WHATSAPP_PROVIDER=wwebjs & PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable)"
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
c_info "Menjalankan npm install (whatsapp-web.js, qrcode-terminal, prisma)..."
as_app "PUPPETEER_SKIP_DOWNLOAD=true npm install --no-fund --no-audit"
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
# Catatan: Jangan gunakan ProtectSystem=strict atau NoNewPrivileges=true agar
# Google Chrome headless dapat membuat sub-proses & crashpad tanpa error resources.
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
Environment="HOME=/home/${APP_USER}"
Environment="LANG=C.UTF-8"
Environment="LC_ALL=C.UTF-8"
Environment="PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable"
EnvironmentFile=${ENV_FILE}
ExecStart=/usr/bin/node ${APP_DIR}/dist/index.js
Restart=always
RestartSec=5
TimeoutStopSec=25
KillSignal=SIGTERM
UMask=0077
StandardOutput=journal
StandardError=journal
SyslogIdentifier=hdybot

[Install]
WantedBy=multi-user.target
EOF

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

rm -f /tmp/hdybot-qr.txt
systemctl daemon-reload
systemctl reset-failed hdybot.service postgresql.service redis-server.service 2>/dev/null || true
systemctl enable --now hdybot.service hdybot-backup.timer
sleep 3

if systemctl is-active --quiet hdybot; then
  c_ok "Service hdybot AKTIF dan berjalan terus-menerus (Restart=always)"
else
  journalctl -u hdybot -n 40 --no-pager
  die "Service hdybot gagal menyala"
fi

echo
echo "==================================================================="
echo " HDYBOT — INSTALASI UBUNTU SERVER SELESAI (24/7 MODE)"
echo "  Browser WA  : Google Chrome Stable (/usr/bin/google-chrome-stable)"
echo "  Lihat QR    : sudo ./install.sh --qr"
echo "  Reset Sesi  : sudo ./install.sh --reset-wa"
echo "  Status      : sudo ./install.sh --status"
echo "==================================================================="
echo
echo "📲 Menunggu QR Code dari whatsapp-web.js (biasanya 5-10 detik saat Chrome headless start)..."
echo "   (Tekan Ctrl+C kapan saja untuk keluar dari tampilan log; bot tetap jalan 24/7 di background)"
if [[ -f /tmp/hdybot-qr.txt ]]; then
  cat /tmp/hdybot-qr.txt
fi
exec env LANG=C.UTF-8 LC_ALL=C.UTF-8 journalctl -u hdybot -f -n 80 -o cat
