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

const distEntry = resolve(rootDir, 'dist', 'index.js');
if (!existsSync(distEntry)) {
  console.log('[HdyBot] Membangun TypeScript ke dist/index.js terlebih dahulu...');
  execSync('npm run build', { stdio: 'inherit' });
}

await import(pathToFileURL(distEntry).href);
