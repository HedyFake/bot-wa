import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { z } from 'zod';
import type { AppConfig } from '../../config/env.js';
import type { Attachment } from './inspect.js';
import { FileError } from './archive.js';
import type { ExtractedSection } from '../materials/extract.js';

const run=promisify(execFile);
const probe=z.object({format:z.object({duration:z.coerce.number().positive().max(3600)}),
  streams:z.array(z.object({codec_type:z.string(),width:z.number().optional(),height:z.number().optional()}))});
const demux:Record<string,string>={mp3:'mp3',wav:'wav',ogg:'ogg',flac:'flac',m4a:'mov',mp4:'mov',mov:'mov',mkv:'matroska',webm:'matroska'};
export interface Frame {time:number; image:Buffer}
export interface Recording {sections:ExtractedSection[];frames:Frame[];duration:number}
export function stamp(n:number){return new Date(Math.round(n*1000)).toISOString().slice(11,23);}
export async function transcribe(data:Buffer,config:AppConfig,signal:AbortSignal,reserve:()=>Promise<void>,request:typeof fetch=fetch) {
  if(!config.OPENAI_API_KEY) throw new FileError('Transkripsi memerlukan OPENAI_API_KEY di server.');
  if(data.length>25_000_000) throw new FileError('Potongan audio melampaui 25 MB.');
  const form=new FormData();
  form.append('model',config.OPENAI_TRANSCRIPTION_MODEL);
  form.append('file',new Blob([new Uint8Array(data)],{type:'audio/wav'}),'segmen.wav');
  await reserve();
  const resp=await request(config.OPENAI_BASE_URL.replace(/\/$/,'')+'/audio/transcriptions',{method:'POST',redirect:'error',
    headers:{Authorization:'Bearer '+config.OPENAI_API_KEY},body:form,signal:AbortSignal.any([signal,AbortSignal.timeout(config.OPENAI_TIMEOUT)])});
  if(!resp.ok)throw new FileError('Transkripsi gagal dari provider (HTTP '+resp.status+').');
  const result=z.object({text:z.string().max(100000)}).parse(await resp.json());
  return result.text.trim();
}
export async function recording(file:Attachment,config:AppConfig,signal:AbortSignal,reserve:()=>Promise<void>):Promise<Recording> {
  const dir=await mkdtemp(join(tmpdir(),'hdybot-media-'));
  const path=join(dir,'input'), format=demux[file.format];
  try {
    if(!format)throw new FileError('Format rekaman belum didukung.');
    await writeFile(path,file.data,{mode:0o600});
    const input=['-protocol_whitelist','file,pipe','-f',format];
    const options={encoding:'buffer' as const,timeout:25_000,windowsHide:true,signal,maxBuffer:12_000_000};
    const raw=await run('ffprobe',['-v','error',...input,'-show_entries','format=duration:stream=codec_type,width,height','-of','json',path],options);
    const info=probe.safeParse(JSON.parse(raw.stdout.toString()));
    if(!info.success) throw new FileError('Durasi rekaman tidak terbaca atau melebihi 60 menit.');
    const {format:{duration},streams}=info.data;
    if(streams.length>16 || streams.some(s=>(s.width??0)*(s.height??0)>16_000_000))throw new FileError('Resolusi atau jumlah track melebihi batas pemrosesan.');
    const decode=async(at:number,args:string[])=>{
      const result=await run('ffmpeg',['-v','error','-nostdin','-threads','1',...input,'-ss',String(at),'-i',path,...args,'pipe:1'],options);
      return result.stdout;
    };
    const sections:ExtractedSection[]=[],frames:Frame[]=[];
    if(streams.some(s=>s.codec_type==='video')) {
      const count=Math.min(6,Math.max(1,Math.ceil(duration/15)));
      for(let i=0;i<count;i++){
        const time=Math.floor(duration*i/count);
        const image=await decode(time,['-map','0:v:0','-frames:v','1','-vf','scale=960:720:force_original_aspect_ratio=decrease','-threads','1','-c:v','mjpeg','-f','image2pipe']);
        if(image.length) frames.push({time,image});
      }
    }
    if(streams.some(s=>s.codec_type==='audio')){
      for(let t=0;t<duration;t+=240){
        const audio=await decode(t,['-map','0:a:0','-t','240','-vn','-ac','1','-ar','16000','-c:a','pcm_s16le','-f','wav']);
        const text=await transcribe(audio,config,signal,reserve);
        sections.push({label:stamp(t)+'–'+stamp(Math.min(t+240,duration)),text:text||'[Tidak ada ucapan terbaca]'});
      }
    }
    if(!sections.length && !frames.length)throw new FileError('Track audio atau video tidak dapat dibaca.');
    return {duration,sections,frames};
  } catch(e) {
    if(e instanceof FileError)throw e;
    if(signal.aborted)throw new FileError('Pekerjaan dibatalkan atau batas waktu habis.');
    if((e as NodeJS.ErrnoException).code==='ENOENT')throw new FileError('FFmpeg dan ffprobe diperlukan pada server untuk rekaman ini.');
    throw new FileError('Rekaman tidak dapat didekode atau provider transkripsi tidak menjawab.');
  } finally { await rm(dir,{recursive:true,force:true}); }
}
