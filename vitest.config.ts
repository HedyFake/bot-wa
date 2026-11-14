import { defineConfig } from 'vitest/config';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

// Fontconfig dipakai Sharp untuk merender teks pada stiker dan kartu jadwal.
const testEnv: Record<string, string> = { TZ: 'UTC' };
if (process.platform === 'win32' && !process.env.XDG_CACHE_HOME) {
  const cache = join(tmpdir(), 'hdybot-test-cache');
  mkdirSync(cache, { recursive: true });
  testEnv.XDG_CACHE_HOME = cache;
}

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 15000,
    env: testEnv,
  },
});
