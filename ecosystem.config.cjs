/**
 * Konfigurasi PM2 24/7 untuk HdyBot — Nursing Class A Assistant.
 * Cara pakai di Ubuntu Server / VPS:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup
 *   pm2 logs hdybot
 */
module.exports = {
  apps: [
    {
      name: 'hdybot',
      script: './start.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_restarts: 999999,
      min_uptime: '10s',
      restart_delay: 5000,
      kill_timeout: 20000,
      env: {
        NODE_ENV: 'production',
        LANG: 'C.UTF-8',
        LC_ALL: 'C.UTF-8',
        PUPPETEER_EXECUTABLE_PATH: '/usr/bin/google-chrome-stable',
      },
    },
  ],
};
