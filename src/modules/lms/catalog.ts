import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import { LmsClient, official } from './client.js';

export type Kind = 'matkul'|'materi'|'tugas'|'kuis';
export interface Item { id:string; kind:Kind; title:string; course:string; fields:Record<string,string>; source:string; listing:string; files:string[]; access?:boolean; firstSeen?:string }
export interface Catalog { items:Item[]; checked:string; partial:boolean; profile:Record<string,string> }
const trimmed=(s:string)=>s.replace(/\s+/g,' ').trim().slice(0,1000);
function category(text:string):Kind|undefined {
  if(/\b(kuis|quiz)\b/i.test(text)) return 'kuis';
  if(/\btugas\b/i.test(text)) return 'tugas';
  if(/\b(materi|bahan ajar)\b/i.test(text)) return 'materi';
  if(/\b(matkul|mata kuliah|matakuliah)\b/i.test(text)) return 'matkul';
}
const unsafe=/\b(logout|hapus|delete|submit|simpan|kumpulkan|mulai|kerjakan|start|attempt|edit|reset|absen|hadir|enrol|daftar)\b/i;
function readLink(raw:string,base:string,label:string) {
  if(!raw || raw.startsWith('#') || unsafe.test(label)) return;
  try {
    const url=official(raw,base);
    if(unsafe.test(decodeURIComponent(url).replace(/[_/-]/g,' '))) return;
    return url;
  } catch { return; }
}
export function parsePage(html:string,url:string,context?:Kind,course='') {
  const $=load(html); $('script,style,noscript').remove();
  const items:Item[]=[], links:{url:string;kind:Kind;course:string}[]=[];
  const profile:Record<string,string>={};
  const textOf=(selector:string)=>trimmed($(selector).first().text());
  const student=textOf('.user-panel .user-name'), identity=textOf('.user-panel .user-nim').match(/\bNIM\s*:\s*(\d+)/i);
  if(student)profile.Nama=student;
  if(identity)profile.NIM=identity[1]!;
  const term=textOf('.greeting-card .ta-badge-card');
  if(term)profile['Periode akademik']=term;
  $('.stat-mini-card').each((_,e)=>{
    const label=trimmed($(e).find('.stat-mini-label').text()), value=trimmed($(e).find('.stat-mini-num').text());
    if(label && /^\d+$/.test(value))profile[label]=value;
  });
  $('#daftarMatkul .mk-card').each((_,el)=>{
    const card=$(el), title=trimmed(card.find('.mk-name').text());
    const source=readLink(card.find('.masuk-btn[href]').attr('href')??'',url,'Masuk');
    if(!title || !source || !/^\/mahasiswa_panel\/kelas\/\d+\/?$/.test(new URL(source).pathname))return;
    const fields: Record<string,string>={};
    if(term)fields.Semester=term;
    for(const [key,selector] of Object.entries({Kode:'.mk-code-badge',SKS:'.mk-sks-badge',Kelas:'.mk-class',Pengampu:'.dosen-name-tag',Pertemuan:'.pertemuan-info',Notifikasi:'.notif-chip'})){
      const value=card.find(selector).map((_,node)=>trimmed($(node).text())).get().join('\n');
      if(value)fields[key]=value;
    }
    const id=createHash('sha256').update('kelas|'+source).digest('hex').slice(0,14);
    items.push({id,kind:'matkul',title,course:title,fields,source,listing:url,files:[]});
    links.push({url:source,kind:'matkul',course:title});
  });
  const className=textOf('.kelas-hero h2') || course;
  const classMeta=textOf('.kelas-hero .meta');
  $('#tab-materi tbody tr').each((_,el)=>{
    const row=$(el), title=trimmed(row.find('.materi-title').text());
    const source=readLink(row.find('.buka-btn[href]').attr('href')??'',url,'Buka');
    if(!title||!source)return;
    const fields:Record<string,string>={};
    if(classMeta)fields.Kelas=classMeta;
    for(const [key,sel] of Object.entries({Pertemuan:'.pert-badge',Pengampu:'.materi-meta',status:'.status-chip-read,.status-chip-unread'})){
      const val=trimmed(row.find(sel).text());if(val)fields[key]=val;
    }
    const id=createHash('sha256').update('materi|'+url+'|'+source).digest('hex').slice(0,14);
    items.push({id,kind:'materi',course:className,title,source,listing:url,fields,files:[],access:true});
  });
  $('#tab-tugas .tugas-card,#tab-kuis .kuis-card').each((_,el)=>{
    const card=$(el),kind=card.hasClass('tugas-card')?'tugas':'kuis';
    const title=trimmed(card.find(kind==='tugas'?'.tugas-title':'.kuis-title').text());
    if(!title)return;
    const fields:Record<string,string>={};
    if(kind==='tugas' && card.hasClass('submitted'))fields.status='Sudah dikumpulkan';
    if(kind==='tugas' && card.hasClass('not-submitted'))fields.status='Belum dikumpulkan';
    card.find('.badge,[data-status]').each((_,badge)=>{
      const label=trimmed($(badge).text());
      if(/^(aktif|terbuka|berlangsung|ditutup|selesai|belum dikumpulkan|sudah dikumpulkan)$/i.test(label))fields.status=label;
    });
    card.find('small,p,li,.kuis-time-row > *,time').each((_,node)=>{
      const label=trimmed($(node).text()).match(/^(deadline|batas waktu|mulai|durasi|pengampu|dosen|tanggal dibuat)\s*:\s*(.+)$/i);
      if(label)fields[label[1]!.toLowerCase()]=label[2]!;
    });
    for(const [key,sel] of Object.entries({deskripsi:'.kuis-desc',waktu:'.kuis-time-row',nilai:'.nilai-number'})){
      const val=trimmed(card.find(sel).text());if(val)fields[key]=val;
    }
    const id=createHash('sha256').update([url,kind,title].join('|')).digest('hex').slice(0,14);
    items.push({id,kind,course:className,title,source:url,listing:url,fields,files:[]});
  });
  $('tr, dl').each((_,el)=>{
    const cells=$(el).children('td,th,dt,dd');
    if(cells.length!==2) return;
    const key=trimmed(cells.first().text()).replace(/:$/,'').trim();
    if(/^(nama(?: mahasiswa)?|nim|semester(?: aktif)?|tahun akademik|program studi|prodi|jumlah (tugas|materi|kuis|mata kuliah).*)$/i.test(key))
      profile[key]=trimmed(cells.last().text());
  });
  $('table').each((_,t)=>{
    if($(t).closest('#tab-materi').length)return;
    const table=$(t), headers=table.find('tr').first().children('th,td').map((_,h)=>trimmed($(h).text()).toLowerCase()).get();
    const heading=table.find('caption').text() || table.prevAll('h1,h2,h3,h4,h5').first().text();
    const kind=category(heading) ?? category(headers.filter(h=>!/^(kode|nama)?\s*(mata kuliah|matkul)$/i.test(h)).join(' ')) ?? context ?? category(headers.join(' '));
    if(!kind) return;
    const ti=headers.findIndex(h=>kind==='matkul'?/^(nama( mata kuliah)?|mata kuliah|matakuliah|matkul)$/.test(h):/^(judul.*|nama( materi| tugas| kuis)?|materi|tugas|kuis|topik)$/.test(h));
    if(ti<0) return;
    table.find('tr').slice(1).each((_,tr)=>{
      const cells=$(tr).children('td');
      if(cells.length!==headers.length) return;
      const title=trimmed(cells.eq(ti).text()); if(!title) return;
      const fields:Record<string,string>={};
      headers.forEach((h,i)=>{if(h && !/^(no|aksi|action|password|token)$/.test(h)) fields[h]=trimmed(cells.eq(i).text());});
      const currentCourse=kind==='matkul'? title:fields['mata kuliah']||fields.matkul||course;
      const files:string[]=[]; let source=url;
      $(tr).find('a[href]').each((_,a)=>{
        const name=trimmed($(a).text()), link=readLink($(a).attr('href')!,url,name); if(!link) return;
        if(/\.(pdf|pptx?|docx?|png|jpe?g|mp4)(?:$|\?)/i.test(link) || /\b(unduh|download|file)\b/i.test(name)) files.push(link);
        else if(name===title || /\b(detail|lihat|buka)\b/i.test(name)) {
          source=link;
          if(kind==='matkul') links.push({url:link,kind,course:currentCourse});
        }
      });
      const idUrl=new URL(source);
      for(const key of [...idUrl.searchParams.keys()]) if(!/^(?:id|kode|page|id_\w+)$/i.test(key))idUrl.searchParams.delete(key);
      const id=createHash('sha256').update(JSON.stringify([kind,currentCourse,title,idUrl.href])).digest('hex').slice(0,14);
      items.push({id,kind,title,course:currentCourse,fields,source,listing:url,files:[...new Set(files)]});
    });
  });
  $('a[href]').each((_,a)=>{
    const name=trimmed($(a).text()), kind=category(name);
    if(context && ($(a).attr('rel')==='next' || /^(berikutnya|selanjutnya|next)$/i.test(name))) {
      const urlNext=readLink($(a).attr('href')!,url,name);
      if(urlNext) links.push({url:urlNext,kind:context,course});
    }
    if(!kind || !/^(?:daftar |lihat |semua )?(?:mata kuliah|matakuliah|matkul|materi(?: kuliah)?|bahan ajar|tugas(?: kuliah)?|kuis|quiz)(?: saya)?$/i.test(name)) return;
    const link=readLink($(a).attr('href')!,url,name);
    if(link && link!==url) links.push({url:link,kind,course});
  });
  return {items,links,profile};
}
export function detailFiles(html:string,url:string) {
  const $=load(html), found=new Set<string>();
  $('a[href],iframe[src],embed[src],object[data],video[src],video source[src]').each((_,el)=>{
    const name=trimmed($(el).text()), raw=$(el).attr('href')||$(el).attr('src')||$(el).attr('data')||'';
    const link=readLink(raw,url,name);
    if(link && (/\.(?:pdf|pptx?|docx?|png|jpe?g|mp4)(?:$|\?)/i.test(link) || /\b(unduh|download)\b/i.test(name)))found.add(link);
  });
  return [...found];
}
export async function crawl(client:LmsClient, first:{html:string;url:string}, limit=30):Promise<Catalog> {
  const initial=parsePage(first.html,first.url), items=new Map(initial.items.map(i=>[i.id,i]));
  const queue=[...initial.links], seen=new Set([first.url]);
  while(queue.length && seen.size<limit) {
    const job=queue.shift()!;
    if(seen.has(job.url)) continue;
    seen.add(job.url);
    await new Promise(resolve=>setTimeout(resolve,120));
    const page=await client.page(job.url);
    const parsed=parsePage(page.html,page.url,job.kind,job.course);
    for(const item of parsed.items) items.set(item.id,item);
    queue.push(...parsed.links.filter(l=>!seen.has(l.url)));
  }
  let partial=queue.length>0 || !items.size;
  for(const i of items.values()) {
    if(i.kind!=='materi' || i.access || i.files.length || i.source===i.listing)continue;
    if(seen.size>=limit){partial=true;break;}
    seen.add(i.source);
    await new Promise(resolve=>setTimeout(resolve,120));
    const detail=await client.page(i.source);
    i.files=detailFiles(detail.html,detail.url);
  }
  const checked=new Date().toISOString();
  for(const [label,kind] of [['Mata Kuliah','matkul'],['Materi Baru','materi'],['Tugas Pending','tugas'],['Kuis Aktif','kuis']] as const){
    const claimed=initial.profile[label];
    if(claimed && Number(claimed)>[...items.values()].filter(i=>i.kind===kind).length) partial=true;
  }
  return {items:[...items.values()].map(i=>({...i,firstSeen:checked})),profile:initial.profile,checked,partial};
}
