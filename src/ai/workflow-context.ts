import type { StudyDraft } from '../modules/academic/study-draft.js';
import type { AcademicJournalItem } from '../modules/fun/fun-utility-service.js';
import type { InboundMessage } from '../whatsapp/adapters/types.js';

export function conversationKey(msg: Pick<InboundMessage,'chatType'|'chatJid'|'senderJid'>) {
  return msg.chatType === 'private' ? msg.chatJid : JSON.stringify([msg.chatJid,msg.senderJid]);
}

/** Simpan referensi ke hasil yang benar-benar ditampilkan, tanpa menyalin berkas atau kredensial. */
export class WorkflowContext {
  private readonly entries = new Map<string,{at:number; value:string | AcademicJournalItem[] | StudyDraft}>();
  constructor(private readonly now: () => number) {}
  private put(key:string, value:string | AcademicJournalItem[] | StudyDraft) {
    this.entries.delete(key);
    if (this.entries.size >= 512) this.entries.delete(this.entries.keys().next().value!);
    this.entries.set(key,{at:this.now(),value});
  }
  private get(key:string) {
    const entry = this.entries.get(key);
    if (entry && this.now()-entry.at < 30*60_000) return entry.value;
    this.entries.delete(key);
  }
  saveResearch(key:string, items:AcademicJournalItem[]) { this.put('research:'+key,items.slice(0,10)); }
  research(key:string) { const value=this.get('research:'+key); return Array.isArray(value) ? value : []; }
  askCity(key:string, period:string) { this.put('city:'+key,period); }
  takeCity(key:string) { const value=this.get('city:'+key); this.entries.delete('city:'+key); return typeof value==='string' ? value : undefined; }
  saveDraft(key:string,draft:StudyDraft) { this.put('draft:'+key,draft); }
  askTopic(key:string,subject:string) { this.put('topic:'+key,subject); }
  takeTopic(key:string) { const value=this.get('topic:'+key); this.entries.delete('topic:'+key); return typeof value==='string' ? value : undefined; }
  draft(key:string) { const v=this.get('draft:'+key); return v && typeof v==='object' && !Array.isArray(v) ? v : undefined; }
  clear(key:string) { this.entries.delete('draft:'+key); this.entries.delete('city:'+key); this.entries.delete('research:'+key); this.entries.delete('topic:'+key); }
}
