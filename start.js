#!/usr/bin/env node
/**
 * Entrypoint utama HdyBot untuk dijalankan langsung dengan Node.js atau PM2:
 *   - `pm2 start start.js --name hdybot && pm2 save`
 *   - `node start.js`
 *
 * Otomatis memeriksa apakah hasil kompilasi `./dist/index.js` sudah tersedia.
 * Bila belum ada, skrip akan menjalankan `npm run build` terlebih dahulu secara otomatis.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));
process.chdir(rootDir);

// Cegah bentrok 2 instance (PM2 vs systemd hdybot.service) yang dapat membuat sesi WA logout sendiri
if (process.platform === 'linux' && !process.env.INVOCATION_ID) {
  try {
    execSync('systemctl is-active --quiet hdybot.service', { stdio: 'ignore' });
    console.log('[HdyBot] Menghentikan hdybot.service (systemd) agar tidak bentrok ganda dengan PM2/Node...');
    try {
      execSync('systemctl stop hdybot.service || sudo -n systemctl stop hdybot.service', {
        stdio: 'ignore',
      });
    } catch {
      console.warn(
        '[HdyBot] ⚠️ Peringatan: hdybot.service (systemd) masih aktif! Jalankan `sudo systemctl stop hdybot` jika memakai PM2 agar sesi WA tidak bentrok.',
      );
    }
  } catch {
    // hdybot.service tidak aktif — aman
  }
}

const distEntry = resolve(rootDir, 'dist', 'index.js');
if (!existsSync(distEntry)) {
  console.log('[HdyBot] Membangun TypeScript ke dist/index.js terlebih dahulu...');
  execSync('npm run build', { stdio: 'inherit' });
}

await import(pathToFileURL(distEntry).href);
