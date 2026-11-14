import { z } from 'zod';

const metadata=z.object({full_name:z.string(),archived:z.boolean(),default_branch:z.string(),
  language:z.string().nullable(),license:z.object({spdx_id:z.string().nullable()}).nullable()});
export async function inspectRepository(input:string, request:typeof fetch=fetch) {
  const parts=/^https:\/\/github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9_.-]{1,100})\/?$/.exec(input.trim());
  if (!parts || /^\.{1,2}$/.test(parts[2]!)) return 'Kirim URL repositori lengkap, misalnya https://github.com/organisasi/proyek.';
  const name=parts[1]+'/'+parts[2]!.replace(/\.git$/,'');
  try {
    const response=await request('https://api.github.com/repos/'+name,{signal:AbortSignal.timeout(5000),redirect:'error',
      headers:{accept:'application/vnd.github+json','user-agent':'HdyBot'}});
    if (!response.ok) throw Error('repository_unavailable');
    const repo=metadata.parse(await response.json());
    if (repo.full_name.toLowerCase()!==name.toLowerCase()) throw Error('repository_mismatch');
    return ['🔎 *Repositori '+repo.full_name+'*','Cabang utama: '+repo.default_branch,'Bahasa: '+(repo.language??'belum tercantum'),
      'Lisensi: '+(repo.license?.spdx_id??'belum tercantum'),'Status: '+(repo.archived?'diarsipkan':'aktif'),
      'Sumber: https://github.com/'+name,'Pemeriksaan ini hanya membaca metadata. Kode dan dependensi belum ditinjau untuk instalasi.'].join('\n');
  } catch { return 'Metadata repositori belum dapat diverifikasi melalui GitHub.'; }
}
