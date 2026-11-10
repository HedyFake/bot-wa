import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config/env.js';

const base = { OWNER_WHATSAPP: '082233038659' };

describe('loadConfig', () => {
  it('memakai password default untuk nilai kosong dan menghormati password yang dikonfigurasi', () => {
    expect(loadConfig(base).ADMIN_PASSWORD).toBe('hedyfake');
    expect(loadConfig({...base,ADMIN_PASSWORD:' '}).ADMIN_PASSWORD).toBe('hedyfake');
    expect(loadConfig({...base,ADMIN_PASSWORD:'custom-fixture'}).ADMIN_PASSWORD).toBe('custom-fixture');
  });
  it('memuat identitas default dan memasukkan owner ke allowlist', () => {
    const c = loadConfig(base);
    expect(c.BOT_NAME).toBe('HdyBot');
    expect(c.OWNER_NAME).toBe('Hedy');
    expect(c.TIMEZONE).toBe('Asia/Jakarta');
    expect(c.OWNER_WHATSAPP).toBe('+6282233038659');
    expect(c.ADMIN_WHATSAPP_ALLOWLIST).toEqual(['+6282233038659']);
    expect(c.WHATSAPP_PROVIDER).toBe('mock');
    expect(c.OUTBOUND_ENABLED).toBe(false);
    expect(c.DRY_RUN).toBe(true);
    expect(c.AI_ROUTER_MODE).toBe('auto');
  });

  it('menormalisasi allowlist dan tidak menduplikasi owner', () => {
    const c = loadConfig({ ...base, ADMIN_WHATSAPP_ALLOWLIST: '+6282233038659, 081234567890' });
    expect(c.ADMIN_WHATSAPP_ALLOWLIST).toEqual(['+6282233038659', '+6281234567890']);
  });

  it('menolak nomor owner tidak valid tanpa membocorkan nilai', () => {
    expect(() => loadConfig({ OWNER_WHATSAPP: 'saya owner' })).toThrow(/OWNER_WHATSAPP/);
  });

  it('pesan error tidak memuat nilai secret', () => {
    try {
      loadConfig({ ...base, NVIDIA_API_KEY: 'nvapi-SUPERSECRET123456', NVIDIA_BASE_URL: 'not a url' });
      expect.fail('harus throw');
    } catch (e) {
      expect(String(e)).not.toContain('SUPERSECRET');
    }
  });

  it('baileys wajib opt-in eksplisit', () => {
    expect(() => loadConfig({ ...base, WHATSAPP_PROVIDER: 'baileys' })).toThrow(/WHATSAPP_ALLOW_EXPERIMENTAL_BAILEYS/);
    expect(loadConfig({ ...base, WHATSAPP_PROVIDER: 'baileys', WHATSAPP_ALLOW_EXPERIMENTAL_BAILEYS: 'true', ADMIN_PASSWORD: 'fixture' }).WHATSAPP_PROVIDER).toBe('baileys');
  });

  it('menerima alias env blueprint', () => {
    const c = loadConfig({ ...base, APP_TIMEZONE: 'Asia/Jakarta', NVIDIA_MODEL_MODE: 'off', NVIDIA_MAX_RETRIES: '1' });
    expect(c.AI_ROUTER_MODE).toBe('off');
    expect(c.AI_MAX_RETRIES).toBe(1);
  });

  it('production wajib DATABASE_URL', () => {
    expect(() => loadConfig({ ...base, NODE_ENV: 'production' })).toThrow(/DATABASE_URL/);
  });
});
