import pino, { type Logger } from 'pino';

export const REDACT_PATHS = [
  'apiKey', '*.apiKey', 'api_key', '*.api_key',
  'authorization', '*.authorization', 'headers.authorization',
  'password', '*.password', 'token', '*.token', 'secret', '*.secret',
  'session', '*.session', 'creds', '*.creds', 'otp', '*.otp', 'pin', '*.pin',
  'NVIDIA_API_KEY', '*.NVIDIA_API_KEY',
  'SOUNDCLOUD_CLIENT_SECRET', '*.SOUNDCLOUD_CLIENT_SECRET', 'refresh_token', '*.refresh_token', 'access_token', '*.access_token',
  'ADMIN_PASSWORD', '*.ADMIN_PASSWORD',
  'adminPassword', '*.adminPassword',
];

const SECRET_PATTERNS: RegExp[] = [
  /nvapi-[A-Za-z0-9_\-]{10,}/g,
  /Bearer\s+[A-Za-z0-9._\-]{10,}/gi,
  /sk-[A-Za-z0-9]{16,}/g,
];

/** Redaksi string bebas (mis. pesan error dari provider). */
export function redactString(s: string): string {
  return SECRET_PATTERNS.reduce((acc, re) => acc.replace(re, '[REDACTED]'), s);
}

export function createLogger(level = 'info', destination?: pino.DestinationStream): Logger {
  return pino(
    {
      name: 'hdybot',
      level,
      redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
      formatters: { level: (label) => ({ level: label }) },
      hooks: {
        logMethod(args, method) {
          const mapped = args.map((a) => (typeof a === 'string' ? redactString(a) : a));
          method.apply(this, mapped as Parameters<typeof method>);
        },
      },
    },
    destination,
  );
}
