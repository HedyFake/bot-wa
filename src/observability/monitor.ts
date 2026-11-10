import { cpus, freemem, totalmem } from 'node:os';
import { readdir, stat, statfs } from 'node:fs/promises';
import { join } from 'node:path';

type Level = 'info' | 'warning' | 'error';
type Service = 'WhatsApp' | 'Database' | 'Scheduler' | 'Drive' | 'Sistem' | 'AI' | 'LMS';
export class Monitor {
  private events: { at: Date; level: Level; service: Service; message: string }[] = [];
  record(service: Service, level: Level, message: string) {
    this.events.push({ at: new Date(), level, service, message });
    if (this.events.length > 500) this.events.shift();
  }
  report(limit: number, errors: boolean, today: boolean, now: Date) {
    const date = (d: Date) => d.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });
    const rows = this.events.filter(e => (!errors || e.level !== 'info') && (!today || date(e.at) === date(now))).slice(-limit);
    return (errors ? '⚠️ *Laporan kendala*' : '📋 *Log operasional*') + '\n' + (rows.reverse().map(e =>
      e.at.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB · ' + e.service + ' · ' + e.message).join('\n') || 'Belum ada kejadian yang sesuai sejak proses dimulai.');
  }
}

export async function backupStatus(path: string) {
  try {
    const names = (await readdir(path)).filter(n => /^hdybot-\d{8}-\d{6}\.sql\.gz\.enc$/.test(n)).sort().reverse();
    for (const name of names) {
      const archive = await stat(join(path, name));
      const checksum = await stat(join(path, name + '.sha256')).catch(() => null);
      if (archive.isFile() && archive.size && checksum?.isFile()) return '💾 Arsip terakhir: ' + name + '\nUkuran: ' + archive.size + ' byte. Pemulihan belum diuji.';
    }
    return 'Belum ditemukan arsip backup dengan berkas checksum.';
  } catch { return 'Direktori backup tidak tersedia.'; }
}

export async function resources() {
  const disk = await statfs(process.cwd());
  return { ramUsed: 1 - freemem() / totalmem(), diskFree: disk.bavail / disk.blocks, diskGiB: disk.bavail * disk.bsize / 1024 ** 3,
    processMiB: process.memoryUsage().rss / 1024 ** 2, cpuTime: process.cpuUsage(), cores: cpus().length };
}
