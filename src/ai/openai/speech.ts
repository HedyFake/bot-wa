import type { AppConfig } from '../../config/env.js';
import { providerMessages } from '../privacy.js';

export async function synthesizeSpeech(input: string, config: AppConfig, reserve?: () => Promise<void>) {
  if (!config.OPENAI_API_KEY || (!reserve && (config.OPENAI_DAILY_BUDGET || config.OPENAI_MONTHLY_BUDGET))) throw Error('speech_unavailable');
  const text = providerMessages([{role:'user',content:input}], [config.ADMIN_PASSWORD])[0]!.content;
  await reserve?.();
  const response = await fetch(config.OPENAI_BASE_URL.replace(/\/$/,'') + '/audio/speech', {
    method:'POST', redirect:'error', signal:AbortSignal.timeout(Math.min(8000,config.OPENAI_TIMEOUT)),
    headers:{Authorization:'Bearer ' + config.OPENAI_API_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({model:'gpt-4o-mini-tts',voice:'coral',input:text,response_format:'wav'}),
  });
  if (!response.ok || !response.body) throw Error('speech_unavailable');
  const limit=Math.min(12_000_000,config.MEDIA_MAX_MB*1024*1024);
  const reader=response.body.getReader();
  const chunks:Uint8Array[]=[];
  let size=0;
  try {
    for (;;) {
      const {value,done}=await reader.read();
      if (done) break;
      size+=value.byteLength;
      if (size>limit) {await reader.cancel();throw Error('speech_too_large');}
      chunks.push(value);
    }
  } finally {reader.releaseLock();}
  const data=Buffer.concat(chunks);
  if (data.length<=44 || data.toString('ascii',0,4)!=='RIFF' || data.toString('ascii',8,12)!=='WAVE' || data.indexOf('data',12)<0) throw Error('invalid_wave');
  return data;
}
