import { load } from 'cheerio';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export const origin = 'https://lms.shj.ac.id';
export class LmsError extends Error {}
export class TooLarge extends LmsError { constructor() { super('Ukuran dokumen melebihi batas pengiriman.'); } }
export class SessionExpired extends LmsError { constructor() { super('Sesi LMS berakhir. Silakan login kembali di DM.'); } }
export function belongsTo(html:string,nim:string) {
  if(!/^\d{7,16}$/.test(nim))return false;
  const doc=load(html);doc('script,style').remove();
  const sidebar=doc('.user-panel .user-nim').first().text().trim();
  if(sidebar)return new RegExp('^NIM\\s*:\\s*'+nim+'$','i').test(sidebar);
  return new RegExp('\\bNIM\\s*:?\\s*'+nim+'(?:\\D|$)','i').test(doc('body').text());
}
export function official(raw:string, base=origin) {
  const url = new URL(raw,base);
  if (url.origin !== origin || url.username || url.password) throw new LmsError('Tujuan di luar LMS ditolak.');
  url.hash = '';
  return url.href;
}
export function seal(key:Buffer, owner:string, data:unknown) {
  const iv=randomBytes(12), c=createCipheriv('aes-256-gcm',key,iv);
  c.setAAD(Buffer.from(owner));
  const encrypted=Buffer.concat([c.update(JSON.stringify(data),'utf8'),c.final()]);
  return Buffer.concat([iv,c.getAuthTag(),encrypted]).toString('base64');
}
export function unseal<T>(key:Buffer, owner:string, input:string):T {
  const bytes=Buffer.from(input,'base64'), c=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12));
  c.setAAD(Buffer.from(owner)); c.setAuthTag(bytes.subarray(12,28));
  return JSON.parse(Buffer.concat([c.update(bytes.subarray(28)),c.final()]).toString('utf8'));
}
export class LmsClient {
  private readonly until=Date.now()+45_000;
  private nim?:string;
  forStudent(nim:string) { this.nim=nim;return this; }
  constructor(public cookie='', private request:typeof fetch=fetch, private shutdown?:AbortSignal) {}
  private async read(raw:string, limit:number, form?:URLSearchParams) {
    let url=official(raw);
    const remaining=this.until-Date.now();
    if(remaining<=0)throw new LmsError('Batas waktu pemeriksaan LMS tercapai. Coba sinkronisasi kembali.');
    const timeout=AbortSignal.timeout(Math.min(12_000,remaining));
    const signal=this.shutdown?AbortSignal.any([this.shutdown,timeout]):timeout;
    for(let redirects=0;redirects<=4;redirects++) {
      const headers:Record<string,string>={};
      if(this.cookie) headers.cookie='ci_session='+this.cookie;
      const res=await this.request(url,{method:form?'POST':'GET',body:form,headers,signal,redirect:'manual'});
      for(const value of res.headers.getSetCookie()) {
        const match=/^ci_session=([A-Za-z0-9%.,_~-]*)[;\s]?/.exec(value);
        if(match) this.cookie=match[1]!;
      }
      const target=res.headers.get('location');
      if(target && [301,302,303,307,308].includes(res.status)) {
        await res.body?.cancel();
        if(form && res.status>=307) throw new LmsError('Konfirmasi login tambahan diperlukan melalui LMS.');
        url=official(target,url); form=undefined; continue;
      }
      if(!res.ok || Number(res.headers.get('content-length'))>limit) {
        await res.body?.cancel();
        if ([401,403].includes(res.status)) throw new SessionExpired();
        if(res.ok) throw new TooLarge();
        throw new LmsError('Respons LMS gagal atau terlalu besar.');
      }
      const reader=res.body?.getReader();
      if(!reader) throw new LmsError('LMS tidak memberikan konten.');
      const parts:Uint8Array[]=[]; let size=0;
      for(;;) {
        const {done,value}=await reader.read(); if(done) break;
        size+=value.length;
        if(size>limit) { await reader.cancel(); throw new TooLarge(); }
        parts.push(value);
      }
      return {url,data:Buffer.concat(parts),mime:(res.headers.get('content-type')??'').split(';')[0]!.trim().toLowerCase()};
    }
    throw new LmsError('Terlalu banyak pengalihan LMS.');
  }
  async page(url:string) {
    const res=await this.read(url,1_500_000);
    if(!['text/html','application/xhtml+xml'].includes(res.mime)) throw new LmsError('Halaman LMS tidak dikenali.');
    const html=res.data.toString('utf8');
    const doc=load(html);
    if(doc('input[type=password]').length) throw new SessionExpired();
    const sidebar=doc('.user-panel .user-nim').first().text().trim();
    if(this.nim && sidebar && !new RegExp('^NIM\\s*:\\s*'+this.nim+'$','i').test(sidebar))throw new SessionExpired();
    return {url:res.url,html};
  }
  async login(nim:string,password:string) {
    const login=await this.read(origin,1_500_000);
    const $=load(login.data.toString('utf8')), form=$('input[name=password]').closest('form');
    if(form.length!==1 || !form.find('input[name=username]').length || form.attr('method')?.toUpperCase()!=='POST' ||
      $('input[autocomplete=one-time-code], [data-sitekey], iframe[src*=captcha]').length)
      throw new LmsError('Form berubah atau memerlukan verifikasi. Buka LMS secara langsung.');
    const action=official(form.attr('action')??'',login.url);
    if(new URL(action).pathname!=='/auth/proses_login') throw new LmsError('Endpoint login berubah.');
    const fields=new URLSearchParams();
    form.find('input[type=hidden][name]').each((_,el)=>{fields.set($(el).attr('name')!,$(el).attr('value')??'');});
    fields.set('username',nim); fields.set('password',password);
    const res=await this.read(action,1_500_000,fields);
    const html=res.data.toString('utf8'), doc=load(html);
    doc('script,style').remove();
    if(!this.cookie || !/^\/mahasiswa_panel(?:\/|$)/.test(new URL(res.url).pathname) || doc('input[type=password]').length ||
      !belongsTo(html,nim))
      throw new LmsError('Login atau identitas NIM di dashboard belum terverifikasi.');
    this.nim=nim;
    const logout=doc('a[href]').toArray().some(el=>{
      try{return official(doc(el).attr('href')!,res.url)===origin+'/auth/logout';}catch{return false;}
    });
    return {html,url:res.url,logout};
  }
  async logout() {
    const res=await this.request(origin+'/auth/logout',{headers:{cookie:'ci_session='+this.cookie},
      signal:AbortSignal.timeout(3000),redirect:'manual'});
    await res.body?.cancel();
    return res.ok || [301,302,303].includes(res.status);
  }
  async material(url:string,limit:number) {
    const res=await this.read(url,limit);
    if(res.mime.includes('html') || /^\s*(?:<!doctype|<html|<form)/i.test(res.data.subarray(0,256).toString())){
      if(res.data.length>1_500_000)throw new LmsError('Halaman materi terlalu besar.');
      const html=res.data.toString(),doc=load(html);
      if(doc('input[type=password]').length || (this.nim && doc('.user-nim').length && !new RegExp('^NIM\\s*:\\s*'+this.nim+'$','i').test(doc('.user-nim').first().text().trim()))) throw new SessionExpired();
      return {kind:'page' as const,html,url:res.url};
    }
    return {kind:'file' as const,file:res};
  }
  async file(url:string,limit:number) {
    const res=await this.read(url,limit);
    if(res.mime.includes('html') || /^\s*(?:<!doctype|<html|<form)/i.test(res.data.subarray(0,256).toString())) {
      if(load(res.data.toString())('input[type=password]').length) throw new SessionExpired();
      throw new LmsError('LMS memberikan halaman HTML, bukan dokumen.');
    }
    return res;
  }
}
