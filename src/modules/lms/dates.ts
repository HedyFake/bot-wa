const months='januari februari maret april mei juni juli agustus september oktober november desember'.split(' ');
export function lmsDate(raw:string) {
  const text=raw.trim().toLowerCase().replace(/^(?:senin|selasa|rabu|kamis|jumat|sabtu|minggu),?\s+/,'');
  const iso=text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const local=text.match(/^(\d{1,2})[ /-]([a-z]+|\d{1,2})[ /-](\d{4})/);
  if(!iso && !local)return undefined;
  const year=Number(iso?.[1]??local![3]), day=Number(iso?.[3]??local![1]);
  const month=iso?Number(iso[2]):Number(local![2])||months.indexOf(local![2]!)+1;
  const tm=text.slice((iso??local)![0].length).match(/(?:t|\s|pukul)\s*(\d{1,2})[:.](\d{2})/);
  const h=Number(tm?.[1]??0),m=Number(tm?.[2]??0);
  if(year<2000||month<1||month>12||day<1||day>new Date(Date.UTC(year,month,0)).getUTCDate()||h>23||m>59)return undefined;
  return Date.UTC(year,month-1,day,h-7,m);
}
