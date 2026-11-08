import { describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ModelRouter } from '../src/ai/model-router/router.js';
import { inferIntent } from '../src/admin/commands/intent.js';
import { parseCommand } from '../src/admin/commands/parser.js';
import { nursingCalculation, perawatAnswer } from '../src/modules/academic/perawat.js';
import { MusicService } from '../src/modules/media/music.js';

describe('percakapan, referensi, dan musik', () => {
  it('memetakan tag, perintah eksplisit, kuis Ukom dan unduhan Drive yang sudah ada', async () => {
    const router = new ModelRouter({transport:{complete:async()=>({content:'{"command":"besok","args":""}'})}});
    expect((await inferIntent('@12345 aku masuk kelas apa esok?', router)).command).toBe('schedule.tomorrow');
    expect((await inferIntent('@12345 .menu', router)).command).toBe('menu');
    expect((await inferIntent('HdyBot sdki nyeri akut', router)).command).toBe('nursing');
    expect(parseCommand('.kuis ukom').args).toEqual(['kuisukom']);
    expect(parseCommand('.download').args).toEqual(['ebook']);
    expect(parseCommand('.download doc123').command).toBe('download');
  });
  it('mengabaikan keputusan AI yang meminta operasi admin', async () => {
    const router = new ModelRouter({transport:{complete:async()=>({content:'{"command":"relay","args":"kirim abc"}'})}});
    expect((await inferIntent('HdyBot bagaimana kabarmu?',router)).command).toBe('unknown');
  });
  it('menghitung satuan secara eksplisit dan meminta data tetes yang belum diberikan', () => {
    expect(nursingCalculation('tetesan','500 ml 6 jam')).toContain('tambahkan faktor');
    expect(nursingCalculation('tetesan','500 ml 6 jam 20 tetes/ml')).toContain('28 tetes/menit');
    expect(nursingCalculation('tetesan','500 ml 0 jam')).toContain('Gunakan');
    expect(nursingCalculation('gcs','E4 V5 M6')).toContain('15/15');
    expect(nursingCalculation('gcs','E5 V5 M6')).toContain('Gunakan');
    expect(nursingCalculation('balance','1800 ml 1500 ml')).toContain('300 mL');
    expect(nursingCalculation('imt','65 kg 170 cm')).toContain('22,49');
  });
  it('menggunakan isi halaman sumber untuk ringkasan dan menyertakan tautannya', async () => {
    let sourceRead = false;
    const router = new ModelRouter({ transport: { complete: async req => {
      sourceRead = JSON.stringify(req.messages).includes('contoh bahan bacaan');
      return { content:'Ringkasan bahan bacaan.' };
    } } });
    const answer = await perawatAnswer('sdki','nyeri akut',router,async () => new Response('<main><h1>Nyeri akut</h1><article class="entry-content"><h2>Definisi</h2><p>contoh bahan bacaan</p></article></main>'));
    expect(sourceRead).toBe(true);
    expect(answer).toContain('https://perawat.org/nyeri-akut/');
    expect(answer).toContain('Ringkasan bahan bacaan.');
    expect(await perawatAnswer('sop','pasang infus',router,async()=>new Response('',{status:403}))).toContain('belum dapat dibaca');
  });
  it('mencari di SoundCloud dan hanya melampirkan MP3 dari direktori koleksi', async () => {
    const dir = await mkdtemp(join(tmpdir(),'hdybot-music-'));
    const endpoints: string[] = [];
    try {
      const service = new MusicService({clientId:'test-id',secret:'fixture',library:dir,maxBytes:100},async url=>{
        endpoints.push(String(url));
        if (String(url).includes('oauth/token')) return Response.json({access_token:'fixture',expires_in:3600});
        return Response.json({collection:[{title:'Rekaman',user:{username:'Musisi'},permalink_url:'https://soundcloud.com/musisi/rekaman'}]});
      });
      const first = await service.search('fals');
      expect(first.text).toContain('Musisi'); expect(first.media).toBeUndefined();
      await writeFile(join(dir,'fals-demo.mp3'),Buffer.from('ID3fixture'));
      const second = await service.search('fals');
      expect(second.media?.filename).toBe('fals-demo.mp3');
      expect(second.media?.data.toString()).toBe('ID3fixture');
      expect(endpoints.filter(url=>url.includes('oauth/token'))).toHaveLength(1);
    } finally { await rm(dir,{recursive:true,force:true}); }
  });
});
