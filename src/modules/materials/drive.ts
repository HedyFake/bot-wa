import { JWT } from 'google-auth-library';
import { createReadStream } from 'node:fs';
import type { OutboundMediaPayload } from '../../whatsapp/adapters/types.js';

const base = 'https://www.googleapis.com/drive/v3/files';
const folderType = 'application/vnd.google-apps.folder';
const exportTypes: Record<string, string> = {
  'application/vnd.google-apps.document': 'application/pdf',
  'application/vnd.google-apps.presentation': 'application/pdf',
  'application/vnd.google-apps.spreadsheet': 'application/pdf',
};
const allowedMime = /^(application\/(pdf|msword|vnd\.ms-(powerpoint|excel)|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|presentationml\.presentation|spreadsheetml\.sheet))|text\/(csv|plain)|image\/(jpeg|png|webp))$/;
interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  md5Checksum?: string;
  capabilities?: { canDownload?: boolean };
}
interface CatalogFile extends DriveFile { folderId: string; path: string }
const fields = 'id,name,mimeType,size,modifiedTime,md5Checksum,capabilities(canDownload)';

export class DriveCatalog {
  private files = new Map<string, CatalogFile>();
  private pending?: Promise<void>;
  private syncedAt?: Date;
  private failure = false;

  constructor(private root: string, private token: () => Promise<string>, private request = fetch, private persist?: (files: CatalogFile[]) => Promise<void>) {}
  static serviceAccount(root: string, keyFile: string, persist?: (files: CatalogFile[]) => Promise<void>) {
    const auth = new JWT({ scopes: ['https://www.googleapis.com/auth/drive.readonly'] });
    let loaded: Promise<void> | undefined;
    return new DriveCatalog(root, async () => {
      loaded ??= auth.fromStream(createReadStream(keyFile)).catch(error => { loaded = undefined; throw error; });
      await loaded;
      const { token } = await auth.getAccessToken();
      if (!token) throw new Error('Autentikasi Drive gagal.');
      return token;
    }, fetch, persist);
  }
  status() {
    return [this.failure ? 'Sinkronisasi terakhir gagal.' : this.syncedAt ? 'Sinkronisasi berhasil.' : 'Belum disinkronkan.',
      'Jumlah dokumen: ' + this.files.size, 'Indeks terakhir: ' + (this.syncedAt?.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) ?? '—')].join('\n');
  }
  private async get(path: string, params: Record<string, string>) {
    const url = base + path + '?' + new URLSearchParams(params);
    const res = await this.request(url, { headers: { Authorization: 'Bearer ' + await this.token() }, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error('Akses Google Drive gagal.');
    return res;
  }
  sync() {
    this.pending ??= this.scan().then(() => { this.failure = false; }).catch(error => {
      this.failure = true;
      throw error;
    }).finally(() => { this.pending = undefined; });
    return this.pending;
  }
  private async scan() {
    const root = await (await this.get('/' + encodeURIComponent(this.root), { fields: 'mimeType,trashed', supportsAllDrives: 'true' })).json();
    if (root.mimeType !== folderType || root.trashed) throw new Error('Folder utama tidak tersedia.');
    const queue = [{ id: this.root, path: '' }];
    const visited = new Set<string>();
    const found = new Map<string, CatalogFile>();
    for (const folder of queue) {
      if (visited.has(folder.id)) continue;
      visited.add(folder.id);
      let page = '';
      do {
        const params: Record<string, string> = { q: "'" + folder.id + "' in parents and trashed = false", fields: 'nextPageToken,incompleteSearch,files(' + fields + ')',
          pageSize: '1000', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true' };
        if (page) params.pageToken = page;
        const result = await (await this.get('', params)).json() as { files: DriveFile[]; nextPageToken?: string; incompleteSearch?: boolean };
        if (result.incompleteSearch) throw new Error('Indeks Drive belum lengkap.');
        for (const file of result.files) {
          if (!/^[\w-]+$/.test(file.id)) continue;
          if (file.mimeType === folderType) queue.push({ id: file.id, path: [folder.path, file.name].filter(Boolean).join('/') });
          else found.set(file.id, { ...file, folderId: folder.id, path: folder.path });
        }
        page = result.nextPageToken ?? '';
      } while (page);
    }
    await this.persist?.([...found.values()]);
    this.files = found;
    this.syncedAt = new Date();
  }
  async matchMaterial(input: string) {
    await this.sync();
    const normalized = input.toLowerCase().replace(/\s+/g, ' ').trim();
    const matches = [...this.files.values()].map(f => {
      const labels = [f.id, f.name, f.path.split('/').at(-1) ?? ''].filter(Boolean).sort((a,b) => b.length - a.length);
      const label = labels.find(l => normalized.startsWith(l.toLowerCase() + ' ') || normalized === l.toLowerCase());
      return { file: f, label };
    }).filter(m => m.label).sort((a,b) => b.label!.length - a.label!.length);
    const first = matches[0];
    if (!first) return { prompt: 'Cantumkan ID materi atau nama folder mata kuliah di awal pertanyaan. Gunakan .materi untuk mencari ID.' };
    const same = matches.filter(m => m.label === first.label);
    if (same.length > 1) return { prompt: 'Pilih dokumen dengan .tanyadokumen <id> <pertanyaan>:\n' + same.slice(0,20).map(m => m.file.name + ' · ' + m.file.id).join('\n') };
    return { id: first.file.id, question: input.trim().slice(first.label!.length).trim() };
  }
  async search(term: string) {
    if (!this.syncedAt || this.failure || Date.now() - this.syncedAt.getTime() > 300_000) await this.sync();
    const detail = term.match(/^detail\s+(\S+)$/i);
    if (detail) {
      const f = this.files.get(detail[1]!);
      return f ? [f.name, 'ID: ' + f.id, f.path || 'Folder utama', f.mimeType, 'Diubah: ' + (f.modifiedTime ?? '—'), f.capabilities?.canDownload ? 'Unduhan diizinkan' : 'Unduhan dibatasi'].join('\n') : 'ID tidak ditemukan.';
    }
    const suffix = term.match(/(?:^|\s)halaman\s+(\d+)$/i);
    const page = suffix ? Number(suffix[1]) : 1;
    const query = term.replace(/(?:^|\s)halaman\s+\d+$/i, '').replace(/^cari\s+/i, '').trim().toLowerCase().replace(/^minggu\s*(\d+)$/, 'minggu $1');
    const files = [...this.files.values()].filter(f => query === 'terbaru' || (f.name + ' ' + f.path).toLowerCase().includes(query))
      .sort((a,b) => (b.modifiedTime ?? '').localeCompare(a.modifiedTime ?? ''));
    if (!files.length) return 'Tidak ada dokumen yang cocok.';
    const total = Math.ceil(files.length / 15);
    if (page < 1 || page > total) return 'Pilih halaman 1–' + total + '.';
    return files.slice((page - 1) * 15, page * 15).map(f => f.name + '\n' + (f.path || 'Folder utama') + ' · ' + f.id).join('\n\n') + '\n\nHalaman ' + page + '/' + total + (page < total ? '\n.materi ' + query + ' halaman ' + (page + 1) : '');
  }
  async download(id: string, limit: number, extractText = false): Promise<{ text: string; media?: OutboundMediaPayload }> {
    await this.sync(); // Verifikasi kembali keanggotaan folder dan izin saat diminta.
    const file = this.files.get(id);
    if (!file) return { text: 'Dokumen tidak ditemukan dalam folder kelas.' };
    const link = 'https://drive.google.com/open?id=' + encodeURIComponent(id);
    if (!file.capabilities?.canDownload) return { text: 'Unduhan dibatasi oleh pemilik. Buka melalui akun Google Anda: ' + link };
    const mime = extractText && file.mimeType === 'application/vnd.google-apps.document' ? 'text/plain' : exportTypes[file.mimeType] ?? file.mimeType;
    if (extractText && !['text/plain', 'text/csv', 'application/pdf'].includes(mime) && !mime.startsWith('image/')) return { text: 'Ekstraksi teks untuk format dokumen ini belum tersedia.' };
    if (!allowedMime.test(mime)) return { text: 'Format dokumen belum didukung. ' + link };
    const tooLarge = { text: 'Ukuran dokumen melebihi batas pengiriman. ' + link };
    if (Number(file.size) > limit) return tooLarge;
    const res = exportTypes[file.mimeType] ? await this.get('/' + id + '/export', { mimeType: mime }) :
      await this.get('/' + id, { alt: 'media', supportsAllDrives: 'true' });
    const reader = res.body?.getReader();
    if (!reader) throw new Error('Konten Drive kosong.');
    let size = 0;
    const parts: Uint8Array[] = [];
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) { await reader.cancel(); return tooLarge; }
      parts.push(value);
    }
    if (!size) return { text: 'Dokumen kosong.' };
    return { text: [file.name, file.path || 'Belum dikategorikan'].join(' · '), media: { data: Buffer.concat(parts), mimeType: mime,
      filename: file.name.replace(/[\\/\r\n]/g, '_') + (exportTypes[file.mimeType] ? '.pdf' : ''), asDocument: true } };
  }
}
