import type { PrismaClient } from '@prisma/client';
import { createHmac } from 'node:crypto';
import { seal,unseal } from '../lms/client.js';
import type { Attachment } from './inspect.js';
import type { Recording } from './recording.js';

type Saved=Omit<Attachment,'data'> & {data:string};
export class FileVault {
  constructor(private db:PrismaClient,private key:Buffer){}
  private scope(chat:string){return createHmac('sha256',this.key).update(chat).digest('hex');}
  async save(chat:string,f:Attachment){
    const scope=this.scope(chat),checksum=this.scope(scope+f.checksum),expires=new Date(Date.now()+30*60_000);
    const payload=seal(this.key,scope,{id:f.id,checksum:f.checksum,message:f.message,sender:f.sender,chat:f.chat,created:f.created,
      name:f.name,mime:f.mime,format:f.format,size:f.size,sections:f.sections,data:f.data.toString('base64')});
    return this.db.$transaction(async tx=>{
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${scope}))`;
      const row=await tx.mediaFile.upsert({where:{scope_checksum:{scope,checksum}},update:{message:this.scope(f.message),created:new Date(),expires,payload},
        create:{id:f.id,scope,message:this.scope(f.message),checksum,size:f.size,expires,payload,fileAccessPermission:{create:{value:'owner_chat_only'}}},select:{id:true}});
      const old=await tx.mediaFile.findMany({where:{scope},orderBy:[{created:'desc'},{id:'desc'}],skip:4,select:{id:true}});
      if(old.length)await tx.mediaFile.deleteMany({where:{scope,id:{in:old.map(v=>v.id)}}});
      return row.id;
    },{timeout:15000});
  }
  async load(chat:string){
    const scope=this.scope(chat);
    const list=await this.db.mediaFile.findMany({where:{scope,expires:{gt:new Date()}},orderBy:{created:'desc'},take:4,
      include:{documentChunk:{orderBy:{created:'desc'},take:1},mediaTranscript:{orderBy:{created:'desc'},take:1},mediaFrame:{orderBy:{created:'desc'},take:1}}});
    return list.reverse().map(r=>{
      const s=unseal<Saved>(this.key,scope,r.payload);
      const sections=r.documentChunk[0]?unseal<Attachment['sections']>(this.key,scope,r.documentChunk[0].value):undefined;
      const transcript=r.mediaTranscript[0]?unseal<Omit<Recording,'frames'>>(this.key,scope,r.mediaTranscript[0].value):undefined;
      const frames=r.mediaFrame[0]?unseal<{time:number;image:string}[]>(this.key,scope,r.mediaFrame[0].value):[];
      return {...s,id:r.id,data:Buffer.from(s.data,'base64'),sections:sections??s.sections,record:transcript?{...transcript,frames:frames.map(f=>({...f,image:Buffer.from(f.image,'base64')}))}:undefined};
    });
  }
  async extracted(chat:string,f:Attachment & {record?:Recording}){
    const scope=this.scope(chat);
    await this.db.$transaction(async tx=>{
      const exists=await tx.mediaFile.findFirst({where:{scope,id:f.id,expires:{gt:new Date()}},select:{id:true}});
      if(!exists)return;
      await tx.mediaExtraction.create({data:{fileId:f.id,value:'ready'}});
      if(f.sections){
        await tx.documentChunk.deleteMany({where:{fileId:f.id}});
        await tx.documentChunk.create({data:{fileId:f.id,value:seal(this.key,scope,f.sections)}});
      }
      if(f.record){
        await tx.mediaTranscript.deleteMany({where:{fileId:f.id}});await tx.mediaFrame.deleteMany({where:{fileId:f.id}});
        await tx.mediaTranscript.create({data:{fileId:f.id,value:seal(this.key,scope,{duration:f.record.duration,sections:f.record.sections})}});
        if(f.record.frames.length)await tx.mediaFrame.create({data:{fileId:f.id,value:seal(this.key,scope,f.record.frames.map(v=>({time:v.time,image:v.image.toString('base64')})))}});
      }
    });
  }
  async job(chat:string,id:string,status:string){
    if(await this.db.mediaFile.findFirst({where:{id,scope:this.scope(chat),expires:{gt:new Date()}},select:{id:true}}))
      await this.db.mediaProcessingJob.create({data:{fileId:id,value:status}});
  }
  async delivery(chat:string,id:string,ok:boolean){
    if(await this.db.mediaFile.findFirst({where:{id,scope:this.scope(chat)},select:{id:true}}))
      await this.db.fileDeliveryHistory.create({data:{fileId:id,value:ok?'provider_accepted':'unconfirmed'}});
  }
  async clear(chat:string){await this.db.mediaFile.deleteMany({where:{scope:this.scope(chat)}});}
  async expire(){await this.db.mediaFile.deleteMany({where:{expires:{lte:new Date()}}});}
}
