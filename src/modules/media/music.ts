import { open, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { OutboundMediaPayload } from '../../whatsapp/adapters/types.js';

export class MusicService {
  private token?: { value: string; expires: number; refresh?: string };
  private exchange?: Promise<string>;
  constructor(private opts: { clientId?: string; secret?: string; library?: string; maxBytes: number }, private request = fetch) {}
  private async accessToken() {
    if (this.token && Date.now() < this.token.expires) return this.token.value;
    this.exchange ??= this.exchangeToken().finally(() => { this.exchange = undefined; });
    return this.exchange;
  }
  private async exchangeToken() {
    const { clientId = '', secret = '' } = this.opts;
    const refresh = this.token?.refresh;
    const body = new URLSearchParams(refresh ? { grant_type: 'refresh_token', client_id: clientId, client_secret: secret, refresh_token: refresh } : { grant_type: 'client_credentials' });
    const res = await this.request('https://secure.soundcloud.com/oauth/token', { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(clientId + ':' + secret).toString('base64'), 'Content-Type':'application/x-www-form-urlencoded' }, body, signal: AbortSignal.timeout(8000), redirect:'error' });
    if (!res.ok) { if (refresh && (res.status === 400 || res.status === 401)) this.token = undefined; throw Error('Autentikasi gagal'); }
    const token = await res.json();
    if (typeof token.access_token !== 'string') throw Error('Token tidak tersedia');
    this.token = { value: token.access_token, refresh: token.refresh_token, expires: Date.now() + (Number(token.expires_in ?? 3600)-60)*1000 };
    return this.token.value;
  }
  async search(query: string): Promise<{ text: string; media?: OutboundMediaPayload }> {
    query = query.trim().slice(0,200);
    if (!query) return { text: 'Ketik .music diikuti judul atau nama musisi, misalnya .music fals.' };
    const link = 'https://soundcloud.com/search/sounds?q=' + encodeURIComponent(query);
    let text = 'Cari “' + query + '” di SoundCloud\n' + link;
    if (this.opts.clientId && this.opts.secret) {
      try {
        const token = await this.accessToken();
        const res = await this.request('https://api.soundcloud.com/tracks?' + new URLSearchParams({ q: query, limit:'4', linked_partitioning:'true' }), { headers:{ Authorization:'OAuth ' + token }, signal:AbortSignal.timeout(8000), redirect:'error' });
        if (!res.ok) throw Error('Pencarian gagal');
        const json = await res.json();
        const tracks = (Array.isArray(json) ? json : json.collection) as {title:string; user?:{username:string}; permalink_url:string}[];
        const rows = tracks.filter(t => /^https:\/\/soundcloud\.com\//.test(t.permalink_url)).map(t => t.title + ' — ' + (t.user?.username ?? 'SoundCloud') + '\n' + t.permalink_url);
        text = rows.length ? '*Musik di SoundCloud*\n\n' + rows.join('\n\n') : 'Lagu belum ditemukan.\n' + link;
      } catch { text = 'Pencarian SoundCloud belum tersedia.\n' + link; }
    }
    if (this.opts.library) {
      const names = await readdir(this.opts.library,{ withFileTypes:true }).catch(() => []);
      const file = names.find(f => f.isFile() && f.name.toLowerCase().endsWith('.mp3') && f.name.toLowerCase().includes(query.toLowerCase()));
      if (file) {
        const handle = await open(join(this.opts.library,file.name),'r');
        try {
          const size = (await handle.stat()).size;
          if (size && size <= this.opts.maxBytes) {
            const data = await handle.readFile();
            if (data.length <= this.opts.maxBytes) return { text, media:{ data, mimeType:'audio/mpeg', filename:file.name, asDocument:true, caption:'MP3 dari koleksi kelas · ' + file.name + '\n\n' + text } };
          }
          text += '\n\nMP3 koleksi kelas melebihi batas pengiriman atau kosong.';
        } finally { await handle.close(); }
      }
    }
    return { text };
  }
}
