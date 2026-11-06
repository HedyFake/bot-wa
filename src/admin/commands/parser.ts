/**
 * Command & Natural-Language Parser untuk HdyBot.
 * PENTING: Hanya membaca `text` dari pesan pengirim saat ini.
 * Konten `quoted` TIDAK PERNAH dievaluasi sebagai command.
 */

export type CanonicalCommand =
  | 'owner'
  | 'dashboard'
  | 'system'
  | 'status'
  | 'health'
  | 'ping'
  | 'runtime'
  | 'logs'
  | 'errors'
  | 'help'
  | 'menu'
  | 'ai.status'
  | 'ai.models'
  | 'ai.model'
  | 'ai.auto'
  | 'ai.test'
  | 'groups'
  | 'groups.sources'
  | 'groups.add'
  | 'groups.pause'
  | 'groups.resume'
  | 'filter.status'
  | 'filter.review'
  | 'priority'
  | 'digest'
  | 'pending'
  | 'approve'
  | 'reject'
  | 'send'
  | 'broadcast.preview'
  | 'broadcast.send'
  | 'schedule'
  | 'schedule.day'
  | 'schedule.tomorrow'
  | 'schedule.week'
  | 'schedule.next'
  | 'schedule.today_courses'
  | 'schedule.today_lecturers'
  | 'schedule.today_rooms'
  | 'schedule.check_date'
  | 'schedule.add'
  | 'schedule.edit'
  | 'schedule.delete'
  | 'schedule.reset'
  | 'courses'
  | 'lecturers'
  | 'tasks'
  | 'reminders'
  | 'reminders.pause'
  | 'backup'
  | 'audit'
  | 'emergency.stop'
  | 'emergency.resume'
  | 'confirm'
  | 'cancel'
  | 'pair'
  | 'unknown';

export interface ParsedCommand {
  kind: 'dot' | 'natural' | 'none';
  command: CanonicalCommand;
  args: string[];
  rawArgs: string;
  adminOnly: boolean;
  requiresConfirmation: boolean;
}

const ADMIN_ONLY = new Set<CanonicalCommand>([
  'owner', 'dashboard', 'system', 'logs', 'errors',
  'ai.status', 'ai.models', 'ai.model', 'ai.auto', 'ai.test',
  'groups', 'groups.sources', 'groups.add', 'groups.pause', 'groups.resume',
  'filter.status', 'filter.review', 'priority', 'digest',
  'pending', 'approve', 'reject', 'send', 'broadcast.preview', 'broadcast.send',
  'schedule.add', 'schedule.edit', 'schedule.delete', 'schedule.reset',
  'reminders.pause', 'backup', 'audit', 'emergency.stop', 'emergency.resume',
  'confirm', 'cancel', 'pair',
]);

const REQUIRES_CONFIRMATION = new Set<CanonicalCommand>([
  'broadcast.send', 'schedule.add', 'schedule.edit', 'schedule.delete', 'schedule.reset',
]);

const DAY_NAMES = new Set(['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu']);

function build(
  kind: ParsedCommand['kind'],
  command: CanonicalCommand,
  args: string[] = [],
  rawArgs = '',
): ParsedCommand {
  return {
    kind,
    command,
    args,
    rawArgs: rawArgs.trim(),
    adminOnly: ADMIN_ONLY.has(command),
    requiresConfirmation: REQUIRES_CONFIRMATION.has(command),
  };
}

export function parseCommand(textInput: string): ParsedCommand {
  const text = (textInput ?? '').trim();
  if (!text) return build('none', 'unknown');

  if (text.startsWith('.')) {
    const withoutDot = text.slice(1).trim();
    const parts = withoutDot.split(/\s+/);
    const head = (parts[0] ?? '').toLowerCase();
    const sub = (parts[1] ?? '').toLowerCase();
    const rest = parts.slice(1);
    const rest2 = parts.slice(2);
    const rawRest = withoutDot.slice(head.length).trim();
    const rawRest2 = rawRest.slice(sub.length).trim();

    switch (head) {
      case 'owner': return build('dot', 'owner');
      case 'dashboard': return build('dot', 'dashboard');
      case 'system': return build('dot', 'system');
      case 'status': return build('dot', 'status');
      case 'health': return build('dot', 'health');
      case 'ping': return build('dot', 'ping');
      case 'runtime': return build('dot', 'runtime');
      case 'logs': return build('dot', 'logs');
      case 'errors': return build('dot', 'errors');
      case 'help': return build('dot', 'help');
      case 'menu': return build('dot', 'menu');
      case 'priority': return build('dot', 'priority');
      case 'pending': return build('dot', 'pending');
      case 'approve': return build('dot', 'approve', rest, rawRest);
      case 'reject': return build('dot', 'reject', rest, rawRest);
      case 'send': return build('dot', 'send', rest, rawRest);
      case 'tasks':
      case 'tugas': return build('dot', 'tasks', rest, rawRest);
      case 'backup': return build('dot', 'backup');
      case 'audit': return build('dot', 'audit');
      case 'confirm': return build('dot', 'confirm', rest, rawRest);
      case 'cancel': return build('dot', 'cancel', rest, rawRest);
      case 'pair': return build('dot', 'pair', rest, rawRest);
      case 'matkul': return build('dot', 'courses', rest, rawRest);
      case 'dosen': return build('dot', 'lecturers', rest, rawRest);
      case 'besok': return build('dot', 'schedule.tomorrow');
      case 'mingguini': return build('dot', 'schedule.week');
      case 'kuliahberikutnya': return build('dot', 'schedule.next');
      case 'matkulhariini': return build('dot', 'schedule.today_courses');
      case 'dosenhariini': return build('dot', 'schedule.today_lecturers');
      case 'ruanganhariini': return build('dot', 'schedule.today_rooms');
      case 'cekjadwal': return build('dot', 'schedule.check_date', rest, rawRest);
      case 'tambahjadwal': return build('dot', 'schedule.add', rest, rawRest);
      case 'editjadwal': return build('dot', 'schedule.edit', rest, rawRest);
      case 'hapusjadwal': return build('dot', 'schedule.delete', rest, rawRest);
      case 'resetjadwal': return build('dot', 'schedule.reset', rest, rawRest);
      case 'ai':
        if (sub === 'status') return build('dot', 'ai.status');
        if (sub === 'models') return build('dot', 'ai.models');
        if (sub === 'model' || sub === 'pin') return build('dot', 'ai.model', rest2, rawRest2);
        if (sub === 'unpin') return build('dot', 'ai.auto', ['on'], 'on');
        if (sub === 'auto') return build('dot', 'ai.auto', rest2.length ? rest2 : ['on'], rawRest2 || 'on');
        if (sub === 'test') return build('dot', 'ai.test', rest2, rawRest2);
        return build('dot', 'ai.status');
      case 'groups':
        if (sub === 'sources') return build('dot', 'groups.sources');
        if (sub === 'add') return build('dot', 'groups.add', rest2, rawRest2);
        if (sub === 'pause') return build('dot', 'groups.pause', rest2, rawRest2);
        if (sub === 'resume') return build('dot', 'groups.resume', rest2, rawRest2);
        return build('dot', 'groups');
      case 'filter':
        if (sub === 'status') return build('dot', 'filter.status');
        if (sub === 'review') return build('dot', 'filter.review');
        if (sub === 'pause') return build('dot', 'groups.pause', rest2, rawRest2);
        if (sub === 'resume') return build('dot', 'groups.resume', rest2, rawRest2);
        return build('dot', 'filter.status');
      case 'digest':
        return build('dot', 'digest', [sub || 'today'], rawRest || 'today');
      case 'broadcast':
        if (sub === 'send') return build('dot', 'broadcast.send', rest2, rawRest2);
        return build('dot', 'broadcast.preview', rest2, rawRest2);
      case 'schedule':
      case 'jadwal':
        if (sub === 'add') return build('dot', 'schedule.add', rest2, rawRest2);
        if (sub === 'edit') return build('dot', 'schedule.edit', rest2, rawRest2);
        if (sub === 'delete') return build('dot', 'schedule.delete', rest2, rawRest2);
        if (sub === 'reset') return build('dot', 'schedule.reset', rest2, rawRest2);
        if (sub === 'besok') return build('dot', 'schedule.tomorrow');
        if (DAY_NAMES.has(sub)) return build('dot', 'schedule.day', [sub], sub);
        return build('dot', 'schedule');
      case 'reminders':
        if (sub === 'pause') return build('dot', 'reminders.pause', rest2, rawRest2);
        return build('dot', 'reminders');
      case 'admin':
        if (sub === 'menu') return build('dot', 'menu');
        if (sub === 'status') return build('dot', 'status');
        if (sub === 'overview') return build('dot', 'dashboard');
        if (sub === 'pause') return build('dot', 'emergency.stop');
        if (sub === 'resume') return build('dot', 'emergency.resume');
        if (sub === 'review') return build('dot', 'pending');
        if (sub === 'approve') return build('dot', 'approve', rest2, rawRest2);
        if (sub === 'reject') return build('dot', 'reject', rest2, rawRest2);
        if (sub === 'audit') return build('dot', 'audit');
        if (sub === 'backup') return build('dot', 'backup');
        return build('dot', 'dashboard');
      default:
        return build('dot', 'unknown', parts, withoutDot);
    }
  }

  // Padanan bahasa alami (natural language intent deterministik)
  const low = text.toLowerCase();
  if (/tampilkan\s+dashboard|dashboard\s+hari\s+ini/i.test(low)) return build('natural', 'dashboard');
  if (/status\s+koneksi(\s+whatsapp|\s+nvidia)?|periksa\s+status/i.test(low)) return build('natural', 'status');
  if (/model\s+apa\s+yang\s+(sedang\s+)?dipakai|status\s+(model|ai)/i.test(low)) return build('natural', 'ai.status');
  if (/ganti\s+model.*lightning/i.test(low)) return build('natural', 'ai.model', ['lightning'], 'lightning');
  if (/ganti\s+model.*super[- ]?vl/i.test(low)) return build('natural', 'ai.model', ['super-vl'], 'super-vl');
  if (/ganti\s+model.*ultra/i.test(low)) return build('natural', 'ai.model', ['ultra'], 'ultra');
  if (/ringkas\s+informasi\s+penting|ringkasan\s+hari\s+ini/i.test(low)) return build('natural', 'digest', ['today'], 'today');
  if (/pesan\s+yang\s+menunggu\s+persetujuan|antrean\s+review/i.test(low)) return build('natural', 'pending');
  if (/matikan\s+sementara\s+pengiriman|hentikan\s+outbound|emergency\s+stop/i.test(low)) return build('natural', 'emergency.stop');
  if (/kuliah\s+berikutnya|kelas\s+selanjutnya/i.test(low)) return build('natural', 'schedule.next');
  if (/jadwal\s+besok/i.test(low)) return build('natural', 'schedule.tomorrow');
  if (/jadwal\s+minggu\s+ini/i.test(low)) return build('natural', 'schedule.week');
  for (const d of DAY_NAMES) {
    if (new RegExp(`\\bjadwal\\s+(hari\\s+)?${d}\\b`, 'i').test(low)) {
      return build('natural', 'schedule.day', [d], d);
    }
  }
  if (/\bjadwal(\s+hari\s+ini|\s+5a)?\b/i.test(low)) return build('natural', 'schedule');
  if (/tugas.*deadline.*dekat|deadline\s+terdekat/i.test(low)) return build('natural', 'tasks', ['terdekat'], 'terdekat');
  if (/daftar\s+dosen/i.test(low)) return build('natural', 'lecturers');
  if (/daftar\s+(mata\s+kuliah|matkul)/i.test(low)) return build('natural', 'courses');

  return build('none', 'unknown', [], text);
}
