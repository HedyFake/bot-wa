/**
 * Normalisasi nomor telepon ke E.164. Default negara: Indonesia (+62).
 * Mengembalikan null jika tidak valid. Tidak pernah menebak dari nama kontak.
 */
export function normalizeE164(input: string, defaultCountryCode = '62'): string | null {
  if (typeof input !== 'string') return null;
  // Buang suffix JID WhatsApp (mis. 628xx@s.whatsapp.net / 628xx:12@s.whatsapp.net)
  let s = input.trim();
  const at = s.indexOf('@');
  if (at >= 0) {
    const domain = s.slice(at + 1);
    if (domain !== 's.whatsapp.net' && domain !== 'c.us') return null; // grup/lid bukan nomor pribadi
    s = s.slice(0, at).split(':')[0] ?? '';
  }
  const hasPlus = s.startsWith('+');
  const digits = s.replace(/[\s\-().]/g, '').replace(/^\+/, '');
  if (!/^\d+$/.test(digits)) return null;

  let national: string;
  if (hasPlus) national = digits;
  else if (digits.startsWith('00')) national = digits.slice(2);
  else if (digits.startsWith('0')) national = defaultCountryCode + digits.slice(1);
  else national = digits;

  if (national.length < 8 || national.length > 15 || national.startsWith('0')) return null;
  return `+${national}`;
}

/** E.164 -> JID pribadi WhatsApp. */
export function e164ToJid(e164: string): string {
  return `${e164.replace(/^\+/, '')}@s.whatsapp.net`;
}

/** Masking untuk log: +62822****8659 */
export function maskPhone(e164: string): string {
  if (e164.length <= 8) return '****';
  return `${e164.slice(0, 6)}****${e164.slice(-4)}`;
}
