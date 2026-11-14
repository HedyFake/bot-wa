import { z } from 'zod';

const locations = z.object({ error:z.literal(false).optional(), results: z.array(z.object({
  name: z.string(), admin1: z.string().optional(), country: z.string().optional(),
  latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180),
})).optional() });
const values = z.array(z.number().nullable());
const forecast = z.object({
  current: z.object({ time: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/), temperature_2m: z.number().nullable(),
    relative_humidity_2m: z.number().nullable(), wind_speed_10m: z.number().nullable(), weather_code: z.number().nullable() }),
  hourly: z.object({time: z.array(z.string()), precipitation_probability: values}),
  daily: z.object({time: z.array(z.string().date()), weather_code: values, temperature_2m_min: values,
    temperature_2m_max: values, precipitation_probability_max: values}),
});

export const cityPrompt = 'Kota mana yang ingin kamu cek cuacanya?';
export function weatherQuery(input: string) {
  const week = /\b(?:7|tujuh)\s*hari\b|\b(?:seminggu|sepekan)\b/i.test(input);
  const tomorrow = /\bbesok\b/i.test(input);
  const city = input.replace(/\b(?:sekarang\s+dan\s+)?(?:7|tujuh)\s*hari(?:\s+ke\s+depan)?\b|\b(?:seminggu|sepekan|besok|hari ini|sekarang)\b/gi,'')
    .trim().replace(/^di\s+/i,'').replace(/[?!.]+$/,'').trim();
  return { city, days: week ? 7 : tomorrow ? 2 : 1, tomorrow: tomorrow && !week };
}
function condition(code: number | null | undefined) {
  if (code === 0) return 'cerah';
  if (code === 1) return 'umumnya cerah';
  if (code === 2) return 'cerah berawan';
  if (code === 3) return 'berawan';
  if (code === 45 || code === 48) return 'berkabut';
  if (code != null && [51,53,55,56,57].includes(code)) return 'gerimis';
  if (code != null && [61,63,65,66,67,80,81,82].includes(code)) return 'hujan';
  if (code != null && [71,73,75,77,85,86].includes(code)) return 'salju';
  if (code != null && [95,96,99].includes(code)) return 'badai petir';
  return 'kondisi belum tersedia';
}
function metric(n: number | null | undefined, unit: string) {
  return typeof n === 'number' ? n.toLocaleString('id-ID') + unit : '—';
}
export async function weatherReport(input: string, request: typeof fetch = fetch, onUnavailable?: () => void) {
  const {city, days, tomorrow} = weatherQuery(input);
  if (!city) return cityPrompt;
  if (city.length > 100) return 'Nama kota terlalu panjang. Ketik nama kota saja.';
  const signal = AbortSignal.timeout(8000);
  async function read(url: URL) {
    const response = await request(url, { signal, redirect: 'error' });
    if (!response.ok) throw new Error('weather_provider');
    return response.json();
  }
  try {
    const geo = new URL('https://geocoding-api.open-meteo.com/v1/search');
    geo.search = new URLSearchParams({name:city,count:'1',language:'id',format:'json'}).toString();
    const place = locations.parse(await read(geo)).results?.[0];
    if (!place) return 'Kota “' + city + '” belum ditemukan. Coba nama kota atau kabupaten lain.';
    const api = new URL('https://api.open-meteo.com/v1/forecast');
    api.search = new URLSearchParams({latitude:String(place.latitude), longitude:String(place.longitude),
      timezone:'Asia/Jakarta', forecast_days:String(days), timeformat:'iso8601',
      current:'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
      hourly:'precipitation_probability', daily:'weather_code,temperature_2m_min,temperature_2m_max,precipitation_probability_max'}).toString();
    const raw = await read(api);
    // ISO 8601 dari Open-Meteo memakai presisi menit dalam zona yang diminta.
    const data = forecast.parse(raw);
    const {current, daily} = data;
    const location = [...new Set([place.name,place.admin1,place.country].filter(Boolean))].join(', ');
    const parts = ['🌤️ *Cuaca ' + location + '*', 'Waktu data: ' + current.time.replace('T',' ') + ' WIB'];
    if (!tomorrow) {
      const hour = data.hourly.time.findIndex(t => t.slice(0,13) === current.time.slice(0,13));
      parts.push('*Sekarang* · ' + condition(current.weather_code),
        'Suhu ' + metric(current.temperature_2m,' °C') + ' · Kelembapan ' + metric(current.relative_humidity_2m,'%'),
        'Angin ' + metric(current.wind_speed_10m,' km/jam') + ' · Peluang hujan jam ini ' + metric(data.hourly.precipitation_probability[hour],'%'));
    }
    const dates = daily.time.slice(tomorrow ? 1 : 0,days);
    parts.push('', tomorrow ? '*Prakiraan besok*' : days === 7 ? '*Prakiraan tujuh hari*' : '*Prakiraan hari ini*');
    for (const [index,date] of dates.entries()) {
      const i = index + (tomorrow ? 1 : 0);
      const label = new Date(date + 'T12:00:00+07:00').toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short',timeZone:'Asia/Jakarta'});
      parts.push(label + ' · ' + condition(daily.weather_code[i]) + ' · ' + metric(daily.temperature_2m_min[i],'°') + '–' + metric(daily.temperature_2m_max[i],'°') + ' · hujan ' + metric(daily.precipitation_probability_max[i],'%'));
    }
    if (dates.length !== (tomorrow ? 1 : days)) parts.push('Prakiraan untuk sebagian tanggal belum tersedia.');
    parts.push('', 'Sumber: Open-Meteo · https://open-meteo.com/');
    return parts.join('\n');
  } catch {
    onUnavailable?.();
    return 'Data cuaca untuk ' + city + ' belum tersedia dari Open-Meteo. Coba lagi nanti.';
  }
}
