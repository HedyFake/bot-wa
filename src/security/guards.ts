import { resolve, sep } from 'node:path';

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'audio/mpeg',
  'audio/ogg',
  'text/plain',
]);

const PRIVATE_IPV4_PATTERNS: RegExp[] = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./, // link-local & cloud metadata 169.254.169.254
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT
];

/**
 * Validasi URL eksternal untuk mencegah SSRF:
 * - Hanya mengizinkan `https:` (atau `http:` bila diizinkan eksplisit).
 * - Memblokir localhost, loopback, IP privat RFC1918, link-local / cloud metadata (`169.254.169.254`), IPv6 lokal, dan kredensial di URL.
 */
export function validateSafeExternalUrl(
  rawUrl: string,
  opts?: { allowHttp?: boolean; allowedHosts?: Iterable<string> },
): { ok: true; url: URL } | { ok: false; reason: string } {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }

  const allowedProtocols = opts?.allowHttp ? ['https:', 'http:'] : ['https:'];
  if (!allowedProtocols.includes(u.protocol)) {
    return { ok: false, reason: 'disallowed_protocol' };
  }
  if (u.username || u.password) {
    return { ok: false, reason: 'credentials_in_url_forbidden' };
  }

  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === '::1' ||
    host === '0:0:0:0:0:0:0:1' ||
    host.startsWith('fc') ||
    host.startsWith('fd') ||
    host.startsWith('fe80:')
  ) {
    return { ok: false, reason: 'private_or_loopback_host' };
  }

  if (PRIVATE_IPV4_PATTERNS.some((re) => re.test(host))) {
    return { ok: false, reason: 'private_ipv4_range' };
  }

  if (u.port && u.port !== '80' && u.port !== '443') {
    return { ok: false, reason: 'non_standard_port' };
  }

  if (opts?.allowedHosts) {
    const allow = new Set([...opts.allowedHosts].map((h) => h.toLowerCase()));
    if (!allow.has(host)) return { ok: false, reason: 'host_not_in_allowlist' };
  }

  return { ok: true, url: u };
}

/**
 * Proteksi Path Traversal: memastikan `relativePath` tidak pernah keluar dari `baseDir`.
 */
export function resolveSafeStoragePath(baseDir: string, relativePath: string): string {
  if (!relativePath || relativePath.includes('\0')) {
    throw new Error('path_invalid_null_byte');
  }
  const root = resolve(baseDir);
  const target = resolve(root, relativePath);
  if (target !== root && !target.startsWith(root + sep)) {
    throw new Error('path_traversal_detected');
  }
  return target;
}

/**
 * Validasi upload file/media: MIME allowlist, ukuran maksimal, dan nama file aman.
 */
export function validateUploadedMedia(input: {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  maxMb?: number;
}): { ok: true } | { ok: false; reason: string } {
  const maxBytes = (input.maxMb ?? 25) * 1024 * 1024;
  if (input.sizeBytes <= 0) return { ok: false, reason: 'empty_file' };
  if (input.sizeBytes > maxBytes) return { ok: false, reason: 'file_too_large' };
  if (!ALLOWED_MIMES.has(input.mimeType.toLowerCase())) {
    return { ok: false, reason: 'unsupported_mime_type' };
  }
  if (/[\\/:*?"<>|\0]/.test(input.filename) || input.filename.includes('..')) {
    return { ok: false, reason: 'unsafe_filename' };
  }
  return { ok: true };
}
