import { LmsError } from './client.js';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import CFB from 'cfb';
import { inflateRawSync } from 'node:zlib';
import type { OutboundMediaPayload } from '../../whatsapp/adapters/types.js';

function officeEntry(data:Buffer, wanted:string) {
  const end=data.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));
  if(end<0 || end+22>data.length) return false;
  let offset=data.readUInt32LE(end+16);
  const names=new Set<string>();
  for(let n=0;n<data.readUInt16LE(end+10);n++) {
    if(offset+46>end || data.readUInt32LE(offset)!==0x02014b50) return false;
    const size=data.readUInt16LE(offset+28), length=46+size+data.readUInt16LE(offset+30)+data.readUInt16LE(offset+32);
    if(offset+length>end) return false;
    const name=data.subarray(offset+46,offset+46+size).toString();
    if(name.includes('..') || /^[/\\]/.test(name)) return false;
    if(name===wanted || name==='[Content_Types].xml'){
      const start=data.readUInt32LE(offset+42), len=data.readUInt32LE(offset+20), method=data.readUInt16LE(offset+10);
      if(start+30>end || data.readUInt32LE(start)!==0x04034b50 || !len)return false;
      const begin=start+30+data.readUInt16LE(start+26)+data.readUInt16LE(start+28);
      if(begin+len>end || len>8_000_000 || ![0,8].includes(method))return false;
      const packed=data.subarray(begin,begin+len);
      const xml=(method===8?inflateRawSync(packed,{maxOutputLength:8_000_000}):packed).toString('utf8');
      const root=name==='[Content_Types].xml'?'Types':wanted.startsWith('word/')?'document':'presentation';
      if(!new RegExp('<(?:[\\w-]+:)?'+root+'[\\s/>]').test(xml))return false;
      names.add(name);
    }
    offset+=length;
  }
  return names.has('[Content_Types].xml') && names.has(wanted);
}
export async function documentPayload(data:Buffer, mime:string,title:string):Promise<OutboundMediaPayload> {
  let ext='';
  if(data.subarray(0,5).toString()==='%PDF-') {
    await PDFDocument.load(data); ext='pdf';
  } else if(data.subarray(0,4).equals(Buffer.from([80,75,3,4]))) {
    if(officeEntry(data,'ppt/presentation.xml')) ext='pptx';
    else if(officeEntry(data,'word/document.xml')) ext='docx';
  } else if(data.subarray(0,8).equals(Buffer.from('d0cf11e0a1b11ae1','hex')) && data.length>=512) {
    const file=CFB.read(data,{type:'buffer'});
    const word=CFB.find(file,'WordDocument'), ppt=CFB.find(file,'PowerPoint Document');
    if(word?.content && Buffer.from(word.content).subarray(0,2).equals(Buffer.from([0xec,0xa5])))ext='doc';
    else if(ppt?.content && ppt.content.length>=8 && CFB.find(file,'Current User'))ext='ppt';
  } else if(mime.startsWith('image/')) {
    const meta=await sharp(data,{limitInputPixels:24_000_000}).metadata();
    if(meta.format==='jpeg' || meta.format==='png') ext=meta.format;
  }
  const types:Record<string,string>={doc:'application/msword',ppt:'application/vnd.ms-powerpoint',pdf:'application/pdf',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',png:'image/png',jpeg:'image/jpeg'};
  if(!ext || (mime!==types[ext] && mime!=='application/octet-stream' && !(mime==='application/zip' && ['docx','pptx'].includes(ext))))
    throw new LmsError('Jenis atau isi dokumen belum dapat divalidasi. Buka file di LMS.');
  const safe=title.replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,70)||'Materi';
  return {data,mimeType:types[ext]!,filename:safe+'.'+ext,asDocument:true};
}
