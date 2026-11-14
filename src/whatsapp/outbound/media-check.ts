import type { OutboundMediaPayload } from '../adapters/types.js';

/** Pemeriksaan kontainer sebelum adapter menerima buffer. Unduhan LMS memiliki validasi isi tambahan. */
export function validAttachment(media:OutboundMediaPayload, limit:number) {
  const data=media.data;
  if (!Buffer.isBuffer(data) || !data.length || data.length>limit) return false;
  const mime=media.mimeType.toLowerCase().split(';')[0]?.trim();
  const head=data.subarray(0,16).toString('latin1');
  const zip=data.length>=22 && head.startsWith('PK\x03\x04') && data.lastIndexOf(Buffer.from('504b0506','hex'))>=0;
  switch (mime) {
    case 'application/pdf': return head.startsWith('%PDF-') && data.subarray(-2048).includes('%%EOF');
    case 'image/png': return data.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
    case 'image/jpeg': return data.subarray(0,3).equals(Buffer.from('ffd8ff','hex'));
    case 'image/webp': return head.startsWith('RIFF') && head.slice(8,12)==='WEBP';
    case 'audio/wav': case 'audio/x-wav': return head.startsWith('RIFF') && head.slice(8,12)==='WAVE';
    case 'audio/mpeg': return head.startsWith('ID3') || (data[0]===255 && ((data[1]??0)&224)===224);
    case 'audio/ogg': return head.startsWith('OggS');
    case 'audio/mp4': case 'audio/x-m4a': case 'video/mp4': return head.slice(4,8)==='ftyp';
    case 'video/webm': return data.subarray(0,4).equals(Buffer.from('1a45dfa3','hex'));
    case 'application/zip': return zip;
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': return zip && data.includes('xl/workbook.xml');
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation': return zip && data.includes('ppt/presentation.xml');
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': return zip && data.includes('word/document.xml');
    case 'application/msword': case 'application/vnd.ms-powerpoint': return data.subarray(0,8).equals(Buffer.from('d0cf11e0a1b11ae1','hex'));
    case 'text/plain': case 'text/csv': case 'text/vtt': case 'text/markdown': case 'application/json':
      try {
        const text=new TextDecoder('utf-8',{fatal:true}).decode(data);
        if (text.includes('\0')) return false;
        if (mime==='application/json') JSON.parse(text);
        return true;
      } catch { return false; }
    default: return false;
  }
}
