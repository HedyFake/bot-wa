import { describe, expect, it } from 'vitest';
import { e164ToJid, maskPhone, normalizeE164 } from '../src/security/phone.js';
import { toWWebChatId } from '../src/whatsapp/adapters/wwebjs.js';

describe('normalizeE164', () => {
  it.each([
    ['082233038659', '+6282233038659'],
    ['+6282233038659', '+6282233038659'],
    ['6282233038659', '+6282233038659'],
    ['0822-3303-8659', '+6282233038659'],
    ['+62 822 3303 8659', '+6282233038659'],
    ['006282233038659', '+6282233038659'],
    ['6282233038659@s.whatsapp.net', '+6282233038659'],
    ['6282233038659@c.us', '+6282233038659'],
    ['6282233038659:12@s.whatsapp.net', '+6282233038659'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeE164(input)).toBe(expected);
  });

  it.each(['', 'abc', '123', '12345678@g.us', 'Hedy', '+62822330386590000000', '0822x3303'])(
    'menolak %s', (input) => {
      expect(normalizeE164(input)).toBeNull();
    },
  );

  it('JID, whatsapp-web.js @c.us & masking', () => {
    expect(e164ToJid('+6282233038659')).toBe('6282233038659@s.whatsapp.net');
    expect(toWWebChatId('6282233038659@s.whatsapp.net')).toBe('6282233038659@c.us');
    expect(toWWebChatId('120363000000@g.us')).toBe('120363000000@g.us');
    expect(maskPhone('+6282233038659')).toBe('+62822****8659');
  });
});
