import type { InboundMediaPayload, InboundMessage, MediaKind } from './types.js';
type Fields=Record<string,unknown>;
type Download=(media:Fields,type:string)=>Promise<AsyncIterable<Uint8Array>>;
const object=(v:unknown):Fields=>v && typeof v==='object'?v as Fields:{};
export async function readBaileys(raw:Fields,download:Download,limit:number):Promise<InboundMessage|undefined>{
  const key=object(raw.key),chat=String(key.remoteJid??''),group=chat.endsWith('@g.us'),sender=group?String(key.participant??''):chat;
  if(key.fromMe || !key.id || !sender || chat==='status@broadcast')return;
  async function content(message:Fields,allow:boolean){
    const blocked=Object.keys(message).some(k=>k.startsWith('viewOnceMessage') || k==='ephemeralMessage');
    const inner=object(object(message.documentWithCaptionMessage).message);
    const obj=Object.keys(inner).length?inner:message;
    const field=Object.keys(obj).find(k=>/^(image|document|audio|video|sticker)Message$/.test(k));
    const part=object(field?obj[field]:obj.extendedTextMessage);
    const context=object(part.contextInfo), kind=(field?.replace('Message','')??'document') as MediaKind;
    const error=(why:string):InboundMediaPayload=>({kind,sizeBytes:0,mimeType:'',error:why});
    let media:InboundMediaPayload|undefined;
    if(blocked || part.viewOnce || Number(context.expiration)>0 || Number(object(message.messageContextInfo).expiration)>0)
      media=error('Media sekali lihat atau pesan sementara tidak dapat diproses.');
    else if(field && allow){
      if(Number(part.fileLength)>limit) media=error('Lampiran melebihi batas ukuran bot.');
      else try{
        const stream=await download(part,kind),chunks:Buffer[]=[];let size=0;
        for await(const chunk of stream){size+=chunk.byteLength;if(size>limit)throw Error();chunks.push(Buffer.from(chunk));}
        if(!size)throw Error();
        media={kind,data:Buffer.concat(chunks),mimeType:String(part.mimetype??'application/octet-stream'),sizeBytes:size,
          filename:typeof part.fileName==='string'?part.fileName:undefined};
      }catch{media=error('Lampiran tidak tersedia atau melebihi batas ukuran bot.');}
    }
    return {text:blocked?'':String(obj.conversation??part.caption??part.text??''),media,context};
  }
  const current=await content(object(raw.message),true);
  let quoted:InboundMessage['quoted'];
  const q=current.context;
  if(!current.media?.error && q.quotedMessage && q.stanzaId){
    const qSender=String(q.participant??'');
    const match=qSender===sender;
    const value=await content(object(q.quotedMessage),match);
    quoted={providerMessageId:String(q.stanzaId),senderJid:qSender,text:value.text,media:value.media};
  }
  if(!current.text.trim() && !current.media)return;
  const timestamp=Number(raw.messageTimestamp);
  return {providerMessageId:String(key.id),chatJid:chat,senderJid:sender,chatType:group?'group':'private',participantJid:group?sender:undefined,
    receivedAt:Number.isFinite(timestamp)&&timestamp>0?new Date(timestamp*1000):new Date(),text:current.text,quoted,
    media:current.media,mentionedJids:Array.isArray(q.mentionedJid)?q.mentionedJid.map(String):undefined};
}
