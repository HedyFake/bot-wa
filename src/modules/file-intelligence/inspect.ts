import { createHash, randomUUID } from 'node:crypto';
import { basename, extname } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import type { InboundMediaPayload, InboundMessage } from '../../whatsapp/adapters/types.js';
import { extractSections, type ExtractedSection } from '../materials/extract.js';
import { FileError, officeSections, SafeZip } from './archive.js';

export interface Attachment {
  id:string; checksum:string; message:string; sender:string; chat:string; created:string;
  name:string; mime:string; format:string; size:number; data:Buffer; sections?:ExtractedSection[];
}
const mime:Record<string,string[]>={
  png:['image/png'],jpeg:['image/jpeg'],webp:['image/webp'],gif:['image/gif'],pdf:['application/pdf'],
  docx:['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],pptx:['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  xlsx:['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],odt:['application/vnd.oasis.opendocument.text'],odp:['application/vnd.oasis.opendocument.presentation'],
  zip:['application/zip','application/x-zip-compressed'],mp3:['audio/mpeg','audio/mp3'],wav:['audio/wav','audio/x-wav','audio/wave'],ogg:['audio/ogg','audio/opus','application/ogg'],flac:['audio/flac','audio/x-flac'],
  webm:['video/webm','audio/webm'],mkv:['video/x-matroska'],m4a:['audio/mp4','audio/m4a','audio/x-m4a'],mp4:['video/mp4'],mov:['video/quicktime'],
};
const textExt=new Set('txt md markdown json csv tsv js mjs cjs ts py go php java c cpp h css html xml yaml yml sql rs sh'.split(' '));
export async function inspect(msg:InboundMessage, media:InboundMediaPayload,limit:number):Promise<Attachment> {
  const data=media.data;
  if(!data?.length) throw new FileError('Lampiran belum dapat diunduh. Kirim ulang sebagai dokumen.');
  if(data.length>limit || media.sizeBytes>limit) throw new FileError('Ukuran lampiran melebihi batas bot.');
  const declared=media.mimeType.toLowerCase().split(';')[0]!.trim();
  const name=basename((media.filename??'').replaceAll('\\','/')).replace(/[\x00-\x1f\u202a-\u202e\u2066-\u2069]/g,'').slice(0,120);
  const ext=extname(name).toLowerCase().slice(1);
  const head=data.subarray(0,32).toString('latin1');
  let format='', sections:ExtractedSection[]|undefined;
  if(data.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))) format='png';
  else if(head.startsWith('\xff\xd8\xff')) format='jpeg';
  else if(/^GIF8[79]a/.test(head)) format='gif';
  else if(head.startsWith('RIFF') && head.slice(8,12)==='WEBP') format='webp';
  else if(head.startsWith('%PDF-')){
    format='pdf';
    try{ const pdf=await PDFDocument.load(data,{updateMetadata:false}); if(!pdf.getPageCount() || pdf.getPageCount()>200) throw new FileError('PDF kosong atau melebihi 200 halaman.'); }
    catch(e){if(e instanceof FileError) throw e; throw new FileError(/encrypt/i.test(String(e))?'PDF terkunci. Kirim salinan yang dapat dibaca.':'PDF rusak atau tidak lengkap.');}
  } else if(head.startsWith('PK\x03\x04') || head.startsWith('PK\x05\x06')){
    const zip=new SafeZip(data);
    if([...zip.entries.keys()].some(n=>!n.endsWith('/') && /(?:vbaProject\.bin$|\.(?:exe|dll)$|\/embeddings\/)/i.test(n))) throw new FileError('Arsip berisi program, makro, atau objek tertanam.');
    format=zip.entries.has('word/document.xml')?'docx':zip.entries.has('ppt/presentation.xml')?'pptx':zip.entries.has('xl/workbook.xml')?'xlsx':'zip';
    if(zip.entries.has('content.xml') && zip.entries.has('mimetype')){
      const content=zip.xml('content.xml');
      format=content('office\\:presentation').length?'odp':content('office\\:text').length?'odt':'zip';
    }
    sections=officeSections(zip,format);
  } else if(head.startsWith('OggS')) format='ogg';
  else if(head.startsWith('fLaC')) format='flac';
  else if(head.startsWith('ID3') || data[0]===255 && ((data[1]??0)&224)===224) format='mp3';
  else if(head.startsWith('RIFF') && head.slice(8,12)==='WAVE') format='wav';
  else if(head.slice(4,8)==='ftyp') format=head.slice(8,12)==='qt  '?'mov':declared.startsWith('audio/')?'m4a':'mp4';
  else if(data.subarray(0,4).equals(Buffer.from('1a45dfa3','hex'))) format=data.subarray(0,4096).includes('webm')?'webm':'mkv';
  else if((textExt.has(ext) || !ext && declared==='text/plain') && !data.includes(0) && !head.startsWith('MZ') && !head.startsWith('\x7fELF')){
    if(data.length>2_000_000) throw new FileError('Teks melebihi batas 2 MB.');
    let text:string;
    try{text=new TextDecoder('utf-8',{fatal:true}).decode(data);}catch{throw new FileError('Gunakan teks berformat UTF-8.');}
    if(/[\x00-\x08\x0b\x0e-\x1f]/.test(text)) throw new FileError('Data biner tidak dapat dibaca sebagai teks.');
    format=ext||'txt';
    if(format==='json') { try{JSON.parse(text);}catch{throw new FileError('JSON tidak valid.');} }
    if (format==='csv'||format==='tsv') sections=tableSections(text,format==='csv'?',':'\t');
    else sections=(text.match(/[\s\S]{1,1200}/g)??[]).slice(0,400).map((text,i)=>({label:'Bagian '+(i+1),text}));
  } else throw new FileError('Format belum didukung. Untuk dokumen lama, ekspor ke PDF, DOCX, PPTX, atau XLSX.');
  if(declared && declared!=='application/octet-stream' && !(mime[format]?.includes(declared) ||
    (textExt.has(format) && (declared.startsWith('text/') || /^application\/(?:json|xml|javascript|x-[\w+-]+)$/.test(declared))) ||
    (declared==='application/zip' && ['docx','pptx','xlsx','odt','odp'].includes(format)))) throw new FileError('Jenis MIME berbeda dengan isi lampiran.');
  if(['jpg','jpeg','png','gif','webp','pdf','docx','pptx','xlsx','zip','odt','odp'].includes(ext) && (ext==='jpg'?'jpeg':ext)!==format) throw new FileError('Ekstensi tidak cocok dengan isi lampiran.');
  if(['png','jpeg','gif','webp'].includes(format)){
    const meta=await sharp(data,{limitInputPixels:24_000_000}).metadata();
    if((meta.pages??1)>1) throw new FileError('Gambar animasi belum didukung. Kirim satu frame statis.');
  }
  return {id:randomUUID(),checksum:createHash('sha256').update(data).digest('hex'),message:msg.providerMessageId,
    sender:msg.senderJid,chat:msg.chatJid,created:msg.receivedAt.toISOString(),name:name||'lampiran.'+format,
    mime:mime[format]?.includes(declared)?declared:mime[format]?.[0]??declared,format,size:data.length,data,sections};
}
function tableSections(text:string,delim:string) {
  const out:ExtractedSection[]=[]; let row:string[]=[],field='',quoted=false;
  const finish=()=>{row.push(field);out.push({label:'Baris '+(out.length+1),text:row.slice(0,100).map((v,i)=>'Kolom '+(i+1)+' = '+v.slice(0,300)).join(' | ').slice(0,5000)});field='';row=[];};
  for(let i=0;i<text.length && out.length<1500;i++){
    const c=text[i]!;
    if(c==='"'){if(quoted && text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
    else if(!quoted && c===delim){if(row.length<100)row.push(field);field='';}
    else if(!quoted && c==='\n')finish();
    else if(c!=='\r' && field.length<300)field+=c;
  }
  if(quoted && out.length<1500)throw new FileError('Kutipan CSV atau TSV tidak lengkap.');
  if(field || row.length)finish();
  return out;
}
export async function readSections(file:Attachment) {
  if(file.sections) return file.sections;
  if(file.format!=='pdf') return [];
  try {const sections=await extractSections(file.data,'application/pdf');if(!sections.length) throw Error();return file.sections=sections;}
  catch {throw new FileError('Teks PDF belum dapat diekstrak. Untuk scan diperlukan Poppler dan Tesseract di server.');}
}
export function retrieve(sections:ExtractedSection[],question:string) {
  const locator=question.match(/\b(halaman|hal\.?|slide|baris)\s+(\d+)/i);
  const matched=locator?sections.filter(s=>new RegExp('(?:^|\\s)'+(/^hal/i.test(locator[1]!)?'hal\\.':locator[1])+'\\s+'+locator[2]+'\\b','i').test(s.label)):sections;
  const terms=question.toLowerCase().match(/[\p{L}\d]{3,}/gu)??[];
  return matched.map((s,i)=>({s,i,score:terms.reduce((n,t)=>n+Number(s.text.toLowerCase().includes(t)),0)}))
    .sort((a,b)=>b.score-a.score||a.i-b.i).slice(0,12).sort((a,b)=>a.i-b.i).map(x=>x.s);
}
