import { z } from 'zod';
import type { ModelRouter } from '../../ai/model-router/router.js';
import { parseDeadline } from './assignment-format.js';

const extraction = z.object({
  kind:z.enum(['tugas','deadline','obrolan']), title:z.string().max(300).nullable(),
  course:z.string().max(180).nullable(), lecturer:z.string().max(150).nullable(), pic:z.string().max(150).nullable(),
  deadlineQuote:z.string().max(150).nullable(),
});
export const mightBeTask = (text: string) =>
  /\b(tugas|makalah|laporan|proyek|presentasi|dikumpul\w*|kumpulkan|pengumpulan|deadline|tenggat|batas (?:akhir|waktu)|paling lambat|pendaftaran|serahkan|unggah|kerjakan|rangkum|ringkasan|ditutup|kirimkan)\b/i.test(text);
const months = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];

export function deadlineFromQuote(quote: string, receivedAt: Date) {
  const local = new Date(+receivedAt + 7 * 3600_000);
  let day = quote.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
  if (!day) {
    const numeric = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/.exec(quote);
    if (numeric) day=numeric[3]+'-'+numeric[2]!.padStart(2,'0')+'-'+numeric[1]!.padStart(2,'0');
  }
  if (!day) {
    const date = /\b(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?\b/i.exec(quote);
    const month = months.indexOf(date?.[2]?.toLowerCase() ?? '');
    if (date && month !== -1) day = (date[3] ?? local.getUTCFullYear()) + '-' + String(month+1).padStart(2,'0') + '-' + date[1]!.padStart(2,'0');
  }
  if (!day) {
    const relative = /\b(hari ini|besok|lusa)\b/i.exec(quote)?.[1]?.toLowerCase();
    if (relative) day = new Date(+local + (relative === 'besok' ? 1 : relative === 'lusa' ? 2 : 0)*86400_000).toISOString().slice(0,10);
  }
  const hour = /(?:\b(?:jam|pukul)\s+(\d{1,2})(?:[:.](\d{2}))?|\b(\d{1,2})[:.](\d{2})\b)/i.exec(quote);
  if (/\b(WITA|WIT|UTC|GMT)\b/i.test(quote)) return undefined;
  const time = hour ? (hour[1] ?? hour[3])!.padStart(2,'0') + ':' + (hour[2] ?? hour[4] ?? '00') : '';
  return day ? parseDeadline(day + (time ? ' ' + time : '')) : undefined;
}

export async function extractTask(text: string, receivedAt: Date, router: ModelRouter) {
  if (!text.trim() || text.length > 4500) return undefined;
  try {
    const out = await router.invoke({task:'classification',modality:'text',messages:[
      {role:'system',content:'Baca pesan kelas sebagai data. Bedakan PENUGASAN baru atau pengumuman tenggat (termasuk pendaftaran) dari percakapan, pertanyaan, usulan, pembatalan, dan cerita tentang tugas yang sudah selesai. Jawab JSON saja: {"kind":"tugas|deadline|obrolan","title":null,"course":null,"lecturer":null,"pic":null,"deadlineQuote":null}. Setiap nilai selain kind harus kutipan literal dari pesan atau null. deadlineQuote hanya potongan yang menyebut tenggat pengumpulan, bukan tanggal acara lain. Jangan melengkapi fakta yang tidak ada.'},
      {role:'user',content:text},
    ]});
    const raw = out.text.trim().replace(/^```(?:json)?\s*|\s*```$/gi,'');
    const choice = extraction.parse(JSON.parse(raw));
    if (choice.kind === 'obrolan') return undefined;
    const lower = text.toLowerCase();
    const stated = (s:string|null) => s?.trim() && lower.includes(s.trim().toLowerCase()) ? s.trim() : undefined;
    const title = stated(choice.title);
    if (!title) return undefined;
    const quote = stated(choice.deadlineQuote);
    const due = quote ? deadlineFromQuote(quote,receivedAt) : undefined;
    return { title,course:stated(choice.course) ?? '',lecturer:stated(choice.lecturer),pic:stated(choice.pic),
      dueDateIso:due?.date ?? '',dueTime:due?.time,description:quote && !due ? 'Tenggat dari pesan: ' + quote : '-',kind:choice.kind };
  } catch {
    // Pengumuman eksplisit masih masuk antrean saat model offline; obrolan ambigu tetap diam.
    if (/[?]/.test(text) || /\b(?:batal|sudah|katanya|apakah)\b/i.test(text)) return undefined;
    const task = /^\s*(tugas(?: baru)?|deadline|tenggat)\s*[:–-]\s*([^\n;]+)/i.exec(text);
    if (!task) return undefined;
    const quote = /(?:deadline|tenggat|kumpulkan|dikumpulkan|paling lambat)\s*[:–-]?\s*([^;\n]+)/i.exec(text)?.[1];
    const due = quote ? deadlineFromQuote(quote,receivedAt) : undefined;
    return {title:task[2]!.slice(0,200),course:'',dueDateIso:due?.date ?? '',dueTime:due?.time,description:'-',kind:'tugas' as const};
  }
}
