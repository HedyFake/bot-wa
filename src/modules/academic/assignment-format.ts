import type { AssignmentItem } from '../fun/fun-utility-service.js';

const dateFormat = new Intl.DateTimeFormat('id-ID',{ timeZone:'Asia/Jakarta', day:'numeric', month:'long', year:'numeric' });
export function indonesianDate(date: string) {
  const instant = new Date(date + 'T12:00:00+07:00');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(+instant) || instant.toISOString().slice(0,10) !== date) return '';
  return dateFormat.format(instant);
}
export function parseDeadline(value: string) {
  const m = /^(\d{4}-\d{2}-\d{2})(?:[ T]([01]\d|2[0-3]):([0-5]\d))?$/.exec(value.trim());
  if (!m || !indonesianDate(m[1]!)) return undefined;
  return { date:m[1]!, time:m[2] ? m[2] + ':' + m[3] : undefined };
}
export function taskCard(t: AssignmentItem, index = 1) {
  const date = indonesianDate(t.dueDateIso);
  const due = date ? date + (t.dueTime ? ', pukul ' + t.dueTime + ' WIB' : '') : 'Belum diketahui';
  const fields = [
    '*' + index + '.*',
    (t.kind==='deadline' ? '📌 Kegiatan: ' : '📑 Tugas: ') + t.title,
    '🗓️ Deadline: ' + due,
    '🧑‍🏫 Dari dosen: ' + (t.lecturer || 'Belum tercatat'),
    '📖 Matkul: ' + (t.course || 'Belum tercatat'),
    '👨‍🎓 Penanggung jawab: ' + (t.pic || 'Belum ditentukan'),
  ];
  if (t.description && t.description !== '-') fields.push('📝 Catatan: ' + t.description);
  fields.push('ID: ' + t.id + ' · ' + (t.status === 'done' ? 'Selesai' : 'Aktif'));
  return fields.join('\n');
}
export function taskList(items: AssignmentItem[]) {
  return ['*LIST TUGAS*', ...items.map((t,i)=>taskCard(t,i+1))].join('\n\n');
}
