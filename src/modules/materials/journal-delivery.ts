import { documentPayload } from '../lms/document.js';
import type { AcademicJournalItem } from '../fun/fun-utility-service.js';

export async function journalDelivery(item:AcademicJournalItem, limit:number, request:typeof fetch=fetch) {
  const text = ['📚 *' + item.title + '*', item.authors + ' (' + item.year + ') · ' + item.journalName, item.doiOrUrl].join('\n');
  // Tautan penerbit tidak membuktikan hak distribusi. Unduh hanya artikel OA berlisensi yang didukung.
  if (!item.redistributable || !item.pdfUrl || !/^https:\/\/europepmc\.org\/articles\/PMC\d+\?pdf=render$/.test(item.pdfUrl))
    return {text:text+'\n\nBuka tautan publikasi untuk melihat opsi akses naskah.'};
  try {
    const response=await request(item.pdfUrl,{signal:AbortSignal.timeout(8000),redirect:'error'});
    const mime=response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
    if (!response.ok || mime!=='application/pdf' || !response.body || Number(response.headers.get('content-length'))>limit) {
      await response.body?.cancel(); throw new Error('unavailable');
    }
    const reader=response.body.getReader(), chunks:Uint8Array[]=[];
    let bytes=0;
    try {
      for (;;) {
        const {done,value}=await reader.read();
        if (done) break;
        bytes+=value.byteLength;
        if (bytes>limit) { await reader.cancel(); throw new Error('size_limit'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    return {text, media:await documentPayload(Buffer.concat(chunks),mime,item.title)};
  } catch { return {text:text+'\n\nPDF belum dapat dilampirkan. Buka tautan publikasi di atas.'}; }
}
