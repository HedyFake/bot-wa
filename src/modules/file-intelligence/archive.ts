import { inflateRawSync, crc32 } from 'node:zlib';
import { load } from 'cheerio';
import { posix } from 'node:path';
import type { ExtractedSection } from '../materials/extract.js';

interface Entry { name:string; start:number; compressed:number; size:number; method:number; crc:number }
export class FileError extends Error {}
export class SafeZip {
  readonly entries=new Map<string,Entry>();
  constructor(private readonly bytes:Buffer) {
    const bad=()=>new FileError('Struktur ZIP tidak valid atau melebihi batas aman.');
    const e=bytes.lastIndexOf(Buffer.from('504b0506','hex'));
    if(e<0 || e+22>bytes.length || e+22+bytes.readUInt16LE(e+20)!==bytes.length || bytes.readUInt32LE(e+4)!==0) throw bad();
    const count=bytes.readUInt16LE(e+10), central=bytes.readUInt32LE(e+16);
    if(count>1000 || central+bytes.readUInt32LE(e+12)!==e) throw bad();
    let off=central,total=0;
    for(let i=0;i<count;i++){
      if(off+46>e || bytes.readUInt32LE(off)!==0x02014b50) throw bad();
      const flags=bytes.readUInt16LE(off+8), method=bytes.readUInt16LE(off+10);
      const compressed=bytes.readUInt32LE(off+20),size=bytes.readUInt32LE(off+24);
      const len=bytes.readUInt16LE(off+28), next=off+46+len+bytes.readUInt16LE(off+30)+bytes.readUInt16LE(off+32);
      if(next>e || len>512 || !len) throw bad();
      const name=bytes.subarray(off+46,off+46+len).toString('utf8');
      const local=bytes.readUInt32LE(off+42);
      if(flags&1) throw new FileError('Arsip atau dokumen terenkripsi. Kirim salinan yang dapat dibaca.');
      if(/(^\/|\\|^[a-z]:|[\x00-\x1f]|\.\.(\/|$))/i.test(name) || this.entries.has(name) || ![0,8].includes(method) ||
        local+30>central || bytes.readUInt32LE(local)!==0x04034b50 || ((bytes.readUInt32LE(off+38)>>>16)&0xf000)===0xa000) throw bad();
      const start=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28);
      total+=size;
      if(start+compressed>central || size>12_000_000 || total>48_000_000 || size>Math.max(256_000,compressed*150)) throw bad();
      this.entries.set(name,{name,start,compressed,size,method,crc:bytes.readUInt32LE(off+16)});
      off=next;
    }
    if(off!==e) throw bad();
  }
  xml(name:string) {
    const e=this.entries.get(name);
    if(!e || e.size>4_000_000) throw new FileError('Bagian dokumen tidak ditemukan atau terlalu besar.');
    const packed=this.bytes.subarray(e.start,e.start+e.compressed);
    const data=e.method===8?inflateRawSync(packed,{maxOutputLength:Math.max(1,e.size)}):packed;
    if(data.length!==e.size || crc32(data)!==e.crc) throw new FileError('Bagian dokumen rusak.');
    const xml=data.toString('utf8');
    if(/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new FileError('Deklarasi entitas XML tidak didukung.');
    return load(xml,{xmlMode:true});
  }
}

export function officeSections(zip:SafeZip,format:string):ExtractedSection[] {
  const out:ExtractedSection[]=[];
  let chars=0;
  const add=(label:string,text:string)=>{
    text=text.trim().slice(0,5000);
    if(text && out.length<1500 && chars<400000){out.push({label,text}); chars+=text.length;}
  };
  if(format==='zip') {
    for(const name of zip.entries.keys()) add('Isi arsip',name);
  } else if (format==='docx') {
    const $=zip.xml('word/document.xml');
    $('w\\:p').each((i,p)=>add('Paragraf '+(i+1),$(p).find('w\\:t').map((_,t)=>$(t).text()).get().join('')));
  } else if(format==='xlsx') {
    const workbook=zip.xml('xl/workbook.xml'), rels=zip.xml('xl/_rels/workbook.xml.rels');
    const sst=zip.entries.has('xl/sharedStrings.xml')?zip.xml('xl/sharedStrings.xml'):undefined;
    const strings=sst?sst('si').map((_,v)=>sst(v).find('t').text()).get():[];
    workbook('sheet').slice(0,64).each((_,s)=>{
      const sheet=workbook(s), id=sheet.attr('r:id'), rel=rels('Relationship').filter((_,r)=>rels(r).attr('Id')===id).first();
      const target=rel.attr('Target')??'';
      const path=posix.normalize(target.startsWith('/')?target.slice(1):posix.join('xl',target));
      if(!path.startsWith('xl/worksheets/') || rel.attr('TargetMode')==='External') return;
      const $=zip.xml(path);
      $('row').slice(0,1500).each((i,row)=>{
        const cells=$(row).find('c').slice(0,100).map((_,c)=>{
          const cell=$(c), v=cell.find('v').text(), type=cell.attr('t'), f=cell.find('f').text();
          return (cell.attr('r')??'?')+' '+(type==='s'?strings[Number(v)]??'':type==='inlineStr'?cell.find('t').text():v)+(f?' [rumus '+f+']':'');
        }).get();
        add((sheet.attr('name')??'Sheet')+' · baris '+($(row).attr('r')??i+1),cells.join(' | '));
      });
    });
  } else if(format==='pptx') {
    const pres=zip.xml('ppt/presentation.xml'), rel=zip.xml('ppt/_rels/presentation.xml.rels');
    pres('p\\:sldId').slice(0,120).each((i,s)=>{
      const id=pres(s).attr('r:id'), r=rel('Relationship').filter((_,n)=>rel(n).attr('Id')===id).first();
      const path=posix.normalize(posix.join('ppt',r.attr('Target')??''));
      if (!path.startsWith('ppt/slides/') || r.attr('TargetMode')==='External') return;
      const $=zip.xml(path); add('Slide '+(i+1),$('a\\:t').map((_,t)=>$(t).text()).get().join('\n'));
      const links=posix.join(posix.dirname(path),'_rels',posix.basename(path)+'.rels');
      if(zip.entries.has(links)){
        const rr=zip.xml(links);
        const dest=rr('Relationship').filter((_,n)=>rr(n).attr('Type')?.endsWith('/notesSlide')===true).attr('Target');
        if(dest){ const note=posix.normalize(posix.join(posix.dirname(path),dest)); if(note.startsWith('ppt/notesSlides/') && zip.entries.has(note)){
          const n=zip.xml(note); add('Catatan slide '+(i+1),n('a\\:t').map((_,t)=>n(t).text()).get().join('\n'));
        }}
      }
    });
  } else {
    const $=zip.xml('content.xml');
    if(format==='odp') $('draw\\:page').each((i,p)=>add('Slide '+(i+1),$(p).find('text\\:p').map((_,t)=>$(t).text()).get().join('\n')));
    else $('text\\:h,text\\:p').each((i,p)=>add('Bagian '+(i+1),$(p).text()));
  }
  return out;
}
