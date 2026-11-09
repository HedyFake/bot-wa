import { describe, expect, it } from 'vitest';
import { FunAndUtilityService } from '../src/modules/fun/fun-utility-service.js';
import { MediaService } from '../src/modules/media/media-service.js';
import { ScheduleService } from '../src/modules/schedule/service.js';

describe('regresi dari audit katalog perintah', () => {
  it('ID catatan dan tugas tetap unik setelah entri tengah dihapus', () => {
    const fun = new FunAndUtilityService();
    const createTask = () => fun.addAssignment({course:'Kelas',title:'Contoh',dueDateIso:'2026-11-09',createdBy:'uji'});
    const a = createTask(); const b = createTask(); const c = createTask();
    fun.deleteAssignment(b.id);
    expect(new Set([a.id,c.id,createTask().id]).size).toBe(3);
    const notes = Array.from({length:3},()=>fun.addNote('Catatan','Belajar','uji'));
    fun.deleteNote(notes[1]!.id);
    const next = fun.addNote('Catatan baru','Belajar','uji');
    expect(notes.some(n=>n.id===next.id)).toBe(false);
  });
  it('menggunakan hari WIB dan minggu Senin–Minggu untuk filter tugas', () => {
    const fun = new FunAndUtilityService();
    const add = (date:string) => fun.addAssignment({course:'Contoh',title:'Contoh',dueDateIso:date,createdBy:'uji'});
    const today = add('2026-11-09'), last = add('2026-11-15'), later = add('2026-11-16');
    const midnight = new Date('2026-11-08T17:01:00Z');
    expect(fun.listAssignments('hariini',midnight)).toContain(today);
    expect(fun.listAssignments('mingguini',midnight)).toContain(last);
    expect(fun.listAssignments('mingguini',midnight)).not.toContain(later);
    fun.completeAssignment(today.id);
    expect(fun.listAssignments('hariini',midnight)).not.toContain(today);
  });
  it('mempertahankan prioritas pangkat, tanda negatif, dan angka desimal', () => {
    const fun = new FunAndUtilityService();
    for (const [expr,result] of [['-2^2',-4],['2^-2',0.25],['2^3^2',512],['.5+.25',0.75]] as const) {
      expect(fun.evaluateMath(expr)).toEqual({ok:true,result});
    }
    expect(fun.evaluateMath('3.4.5').ok).toBe(false);
  });
  it('membuat halaman lanjutan untuk PDF panjang yang memuat simbol Unicode', async () => {
    const media = new MediaService();
    const pdf = await media.generatePdfDocument({title:'Panduan 📝',bodyLines:Array.from({length:95},(_,i)=>'Bagian '+i+' → selesai')});
    expect((await media.inspectPdf(pdf)).pageCount).toBeGreaterThan(1);
  });
  it('mengurutkan kelas menurut jam baru sesudah pengecualian tanggal diterapkan', () => {
    const service = new ScheduleService();
    service.addException({kind:'moved',weekday:'MONDAY',date:'2026-11-09',startTime:'08:00',newStart:'16:00',newEnd:'17:00',approvedBy:'admin'});
    const times = service.getToday(new Date('2026-11-09T00:00:00Z')).sessions.map(s=>s.startTime);
    expect(times).toEqual([...times].sort());
    expect(times).toContain('16:00');
  });
});
