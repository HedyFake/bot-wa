import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createLogger, redactString } from '../src/observability/logger.js';

function capture() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) { lines.push(chunk.toString()); cb(); },
  });
  return { lines, stream };
}

describe('logger redaction', () => {
  it('meredaksi field sensitif', () => {
    const { lines, stream } = capture();
    const log = createLogger('info', stream);
    log.info({ apiKey: 'nvapi-abcdefghijklmnop', nested: { token: 'xyz', otp: '123456' } }, 'test');
    const out = lines.join('');
    expect(out).not.toContain('nvapi-abcdefghijklmnop');
    expect(out).not.toContain('123456');
    expect(out).toContain('[REDACTED]');
  });

  it('meredaksi pola secret di string pesan', () => {
    const { lines, stream } = capture();
    const log = createLogger('info', stream);
    log.error('gagal dengan Bearer abcdefghijklmnopqrstu dan nvapi-1234567890abcdef');
    const out = lines.join('');
    expect(out).not.toContain('abcdefghijklmnopqrstu');
    expect(out).not.toContain('nvapi-1234567890abcdef');
  });

  it('redactString', () => {
    expect(redactString('key=nvapi-ABCDEFGHIJKLMN')).toBe('key=[REDACTED]');
  });
});
