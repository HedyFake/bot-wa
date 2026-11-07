import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { validateSafeExternalUrl } from '../../security/guards.js';

export interface AssignmentItem {
  id: string;
  course: string;
  title: string;
  dueDateIso: string;
  description: string;
  status: 'open' | 'done';
  pic?: string;
  createdBy: string;
  createdAt: string;
}

export interface CustomReminderItem {
  id: string;
  whenIso: string;
  title: string;
  targetJid: string;
  status: 'scheduled' | 'sent' | 'cancelled';
  snoozedMinutes?: number;
}

export interface AnnouncementDraft {
  id: string;
  priority: 'urgent' | 'penting' | 'normal' | 'info';
  title: string;
  content: string;
  status: 'draft' | 'sent' | 'cancelled';
  createdAt: string;
}

export interface ClassNoteItem {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

export interface AfkEntry {
  userJid: string;
  reason: string;
  sinceIso: string;
}

export interface ActiveQuizSession {
  kind: 'tebakkata' | 'caklontong' | 'family100' | 'mathquiz';
  question: string;
  answer: string;
  hint: string;
}

export interface PersistedBotState {
  assignments: AssignmentItem[];
  reminders: CustomReminderItem[];
  announcements: AnnouncementDraft[];
  notes: ClassNoteItem[];
  afk: Record<string, AfkEntry>;
  commandUsage: Record<string, number>;
  messageCountByChat: Record<string, number>;
  classOfficers: {
    ketuaKelas: string;
    wakilKetua: string;
    sekretaris: string;
    bendahara: string;
    waliKelas: string;
    semester: string;
    tahunAjaran: string;
  };
}

const DEFAULT_STATE: PersistedBotState = {
  assignments: [
    {
      id: 'TUG-1',
      course: 'Metodologi Penelitian',
      title: 'Proposal Bab 1–3 Latar Belakang & Rumusan Masalah',
      dueDateIso: '2026-11-14',
      description: 'Kumpulkan draft PDF melalui PJ Mata Kuliah sebelum pukul 14:00 WIB.',
      status: 'open',
      pic: 'Hedy',
      createdBy: 'seed',
      createdAt: '2026-11-06T08:00:00.000Z',
    },
    {
      id: 'TUG-2',
      course: 'Keperawatan Gerontik',
      title: 'Asuhan Keperawatan Lansia (Studi Kasus Kelompok)',
      dueDateIso: '2026-11-18',
      description: 'Presentasi kelompok sesuai pembagian kelompok Semester 5A.',
      status: 'open',
      pic: 'PJ Gerontik',
      createdBy: 'seed',
      createdAt: '2026-11-06T08:00:00.000Z',
    },
  ],
  reminders: [],
  announcements: [],
  notes: [],
  afk: {},
  commandUsage: {},
  messageCountByChat: {},
  classOfficers: {
    ketuaKelas: 'Hedy (Koordinator Utama / Owner HdyBot)',
    wakilKetua: 'Pengurus Nursing Class A (perlu verifikasi)',
    sekretaris: 'Sekretaris Kelas 5A (dibantu HdyBot Digital Secretary)',
    bendahara: 'Bendahara Kelas 5A (perlu verifikasi)',
    waliKelas: 'Dosen Wali Semester 5A (perlu verifikasi dokumen akademik)',
    semester: 'Semester 5A',
    tahunAjaran: '2026/2027 Ganjil',
  },
};

const QUOTES_UMUM = [
  '“Perawat yang hebat tidak hanya merawat luka fisik, tetapi juga menenangkan jiwa pasien.” — Nursing Class A',
  '“Ilmu keperawatan adalah perpaduan antara ketepatan sains dan ketulusan empati.” — Florence Nightingale',
  '“Konsistensi belajar sedikit demi sedikit setiap hari jauh lebih kuat daripada SKS semalam.” — HdyBot',
  '“Setiap pasien yang kita rawat hari ini adalah guru terbaik bagi profesionalisme kita esok hari.”',
  '“Ketelitian membaca rekam medis dan dosis adalah wujud nyata kepedulian seorang Ners.”',
];

const QUOTES_ISLAMI = [
  '“Barangsiapa menempuh jalan untuk mencari ilmu, maka Allah akan mudahkan baginya jalan menuju surga.” (HR. Muslim)',
  '“Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia lainnya.” (HR. Ahmad)',
  '“Sesungguhnya bersama kesulitan ada kemudahan.” (QS. Al-Insyirah: 6)',
  '“Maka nikmat Tuhanmu yang manakah yang kamu dustakan?” (QS. Ar-Rahman: 13)',
];

const QUOTES_MOTIVASI = [
  '“Jangan takut lelah saat praktikum dan menyusun askep; lelahmu hari ini adalah keahlianmu saat menyelamatkan nyawa kelak.”',
  '“Semester 5A adalah jembatan menuju klinik dan skripsi. Fokus satu langkah demi satu langkah!”',
  '“Disiplin waktu dimulai dari hadir tepat waktu di sesi kuliah jam 08:00 WIB.”',
];

const FAKTA_UNIK = [
  'Jantung manusia rata-rata berdetak sekitar 100.000 kali per hari dan memompa sekitar 7.500 liter darah.',
  'Florence Nightingale dikenal sebagai pelopor keperawatan modern sekaligus pelopor visualisasi data statistik kesehatan.',
  'Tulang paha (femur) adalah tulang terpanjang dan terkuat di dalam tubuh manusia.',
  'Kulit merupakan organ terbesar pada tubuh manusia, menyumbang sekitar 15% dari total berat badan orang dewasa.',
  'Otak manusia menggunakan sekitar 20% dari total oksigen dan energi tubuh meskipun beratnya hanya sekitar 2% dari berat tubuh.',
];

const PANTUN_KOLEKSI = [
  'Pergi ke kampus membawa buku,\nJangan lupa memakai sepatu.\nSelamat belajar teman-teman 5A-ku,\nSemoga sukses meraih cita-citamu!',
  'Pagi hari minum air hangat,\nSiang hari makan buah pepaya.\nWalau tugas Metpen terasa berat,\nKalau dikerjakan bersama pasti berjaya!',
  'Bunga melati tumbuh di taman,\nHarum semerbak di pagi hari.\nJadwal kuliah sudah diingatkan,\nJangan sampai terlambat lagi!',
];

const DOA_HARIAN = [
  '🤲 *Doa Sebelum Belajar:*\n“Rabbi zidnii ‘ilman warzuqnii fahman, waj’alnii minash-shaalihiin.”\n(Ya Allah, tambahkanlah ilmu kepadaku, berikanlah aku pemahaman, dan jadikanlah aku termasuk golongan orang-orang yang saleh).',
  '🤲 *Doa Kemudahan Urusan & Ujian:*\n“Allahumma laa sahla illaa maa ja’altahu sahlaa, wa anta taj’alul hazna idzaa syi’ta sahlaa.”\n(Ya Allah, tidak ada kemudahan selain yang Engkau jadikan mudah, dan Engkau menjadikan kesedihan/kesulitan, jika Engkau kehendaki, pasti menjadi mudah).',
  '🤲 *Doa Mendoakan Kesembuhan Pasien:*\n“Allahumma Rabban-naas, adzhibil ba’sa, isyfi anta Asy-Syaafii, laa syifaa’a illaa syifaa’uka, syifaa’an laa yughaadiru saqaman.”',
];

const DAFTAR_SURAH_RINGKAS = [
  '1. Al-Fatihah (Pembukaan — 7 ayat)',
  '2. Al-Baqarah (Sapi Betina — 286 ayat)',
  '18. Al-Kahfi (Penghuni Gua — 110 ayat)',
  '36. Yasin (Yasin — 83 ayat)',
  '55. Ar-Rahman (Yang Maha Pemurah — 78 ayat)',
  '56. Al-Waqi’ah (Hari Kiamat — 96 ayat)',
  '67. Al-Mulk (Kerajaan — 30 ayat)',
  '93. Ad-Dhuha (Waktu Dhuha — 11 ayat)',
  '94. Al-Insyirah (Kelapangan — 8 ayat)',
  '112. Al-Ikhlas (Ikhlas — 4 ayat)',
  '113. Al-Falaq (Waktu Subuh — 5 ayat)',
  '114. An-Nas (Manusia — 6 ayat)',
];

const TRUTH_LIST = [
  'Mata kuliah apa di Semester 5A yang menurutmu paling menantang sejauh ini?',
  'Apa kebiasaan belajar terbaik yang ingin kamu mulai minggu ini?',
  'Ceritakan pengalaman paling berkesan selama kuliah atau praktikum keperawatan!',
  'Siapa teman di Nursing Class A yang paling sering membantumu memahami materi?',
];

const DARE_LIST = [
  'Kirimkan 1 kutipan motivasi belajar terbaikmu ke chat ini sekarang!',
  'Sebutkan 3 mata kuliah Semester 5A beserta jumlah SKS-nya tanpa melihat jadwal!',
  'Buat 1 pantun semangat belajar untuk teman-teman Nursing Class A!',
  'Rangkum 1 konsep keperawatan yang kamu pelajari minggu ini dalam 2 kalimat!',
];

const TEBAK_KATA_BANK = [
  { q: 'STETOSKOP', hint: 'Alat medis untuk mendengarkan suara jantung dan paru-paru (auskultasi).' },
  { q: 'ANAMNESIS', hint: 'Wawancara medis antara tenaga kesehatan dengan pasien untuk mengumpulkan riwayat kesehatan.' },
  { q: 'GERONTIK', hint: 'Bidang keperawatan yang berfokus pada pelayanan kesehatan lanjut usia (lansia).' },
  { q: 'HIPERTENSI', hint: 'Kondisi medis ketika tekanan darah arteri meningkat secara kronis di atas 140/90 mmHg.' },
  { q: 'METODOLOGI', hint: 'Ilmu tentang metode atau cara sistematis dalam melaksanakan penelitian ilmiah.' },
];

const CAK_LONTONG_BANK = [
  { q: 'Orang yang sakit biasanya dibawa ke...', a: 'kamar', hint: 'Kalau di rumah sakit pun tetap masuk ke ruangan/kamar dulu.' },
  { q: 'Sebelum minum obat sebaiknya kita...', a: 'buka', hint: 'Kalau bungkusnya tidak dibuka, bagaimana cara minumnya?' },
  { q: 'Mahasiswa keperawatan kalau ujian harus...', a: 'bangun', hint: 'Kalau masih tidur tidak bisa ikut ujian.' },
];

const FAMILY100_BANK = [
  { q: 'Sebutkan alat yang selalu dibawa mahasiswa keperawatan saat praktikum!', a: 'tensimeter', hint: 'Alat pengukur tekanan darah.' },
  { q: 'Sebutkan tanda-tanda vital (TTV) utama pada pemeriksaan pasien!', a: 'nadi', hint: 'Selain tekanan darah, suhu, dan pernapasan.' },
];

/**
 * Layanan Fitur Lengkap HdyBot (Akademik + Utilitas + Hiburan Aman Akira).
 */
export class FunAndUtilityService {
  private state: PersistedBotState;
  private readonly persistPath?: string;
  private readonly activeQuizzes = new Map<string, ActiveQuizSession>();

  constructor(opts?: { persistPath?: string }) {
    this.persistPath = opts?.persistPath;
    this.state = this.loadState();
  }

  private loadState(): PersistedBotState {
    if (this.persistPath && existsSync(this.persistPath)) {
      try {
        const raw = JSON.parse(readFileSync(this.persistPath, 'utf8')) as Partial<PersistedBotState>;
        return {
          ...structuredClone(DEFAULT_STATE),
          ...raw,
          classOfficers: { ...DEFAULT_STATE.classOfficers, ...(raw.classOfficers ?? {}) },
        };
      } catch {
        return structuredClone(DEFAULT_STATE);
      }
    }
    return structuredClone(DEFAULT_STATE);
  }

  private saveState(): void {
    if (!this.persistPath) return;
    try {
      mkdirSync(dirname(this.persistPath), { recursive: true });
      writeFileSync(this.persistPath, JSON.stringify(this.state, null, 2), 'utf8');
    } catch {
      // abaikan bila filesystem read-only pada test
    }
  }

  recordCommandUsage(command: string, chatJid: string): void {
    this.state.commandUsage[command] = (this.state.commandUsage[command] ?? 0) + 1;
    this.state.messageCountByChat[chatJid] = (this.state.messageCountByChat[chatJid] ?? 0) + 1;
    this.saveState();
  }

  // ==================== 1. TUGAS & DEADLINE ====================
  listAssignments(filter?: string): AssignmentItem[] {
    const q = (filter ?? '').trim().toLowerCase();
    return this.state.assignments.filter((a) => {
      if (!q || q === 'list' || q === 'terdekat') return a.status === 'open';
      if (q === 'all' || q === 'semua') return true;
      if (q === 'done' || q === 'selesai') return a.status === 'done';
      return (
        a.course.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.id.toLowerCase() === q
      );
    });
  }

  addAssignment(input: {
    course: string;
    title: string;
    dueDateIso: string;
    description?: string;
    createdBy: string;
  }): AssignmentItem {
    const id = `TUG-${this.state.assignments.length + 1}`;
    const item: AssignmentItem = {
      id,
      course: input.course.trim(),
      title: input.title.trim(),
      dueDateIso: input.dueDateIso.trim(),
      description: (input.description ?? '-').trim(),
      status: 'open',
      createdBy: input.createdBy,
      createdAt: new Date().toISOString(),
    };
    this.state.assignments.push(item);
    this.saveState();
    return item;
  }

  completeAssignment(id: string): AssignmentItem | null {
    const item = this.state.assignments.find((a) => a.id.toUpperCase() === id.trim().toUpperCase());
    if (!item) return null;
    item.status = 'done';
    this.saveState();
    return item;
  }

  deleteAssignment(id: string): boolean {
    const idx = this.state.assignments.findIndex((a) => a.id.toUpperCase() === id.trim().toUpperCase());
    if (idx === -1) return false;
    this.state.assignments.splice(idx, 1);
    this.saveState();
    return true;
  }

  // ==================== 2. REMINDER CUSTOM ====================
  listReminders(): CustomReminderItem[] {
    return this.state.reminders.filter((r) => r.status === 'scheduled');
  }

  addReminder(whenIso: string, title: string, targetJid: string): CustomReminderItem {
    const item: CustomReminderItem = {
      id: `REM-${this.state.reminders.length + 1}`,
      whenIso: whenIso.trim(),
      title: title.trim(),
      targetJid,
      status: 'scheduled',
    };
    this.state.reminders.push(item);
    this.saveState();
    return item;
  }

  deleteReminder(id: string): boolean {
    const item = this.state.reminders.find((r) => r.id.toUpperCase() === id.trim().toUpperCase());
    if (!item) return false;
    item.status = 'cancelled';
    this.saveState();
    return true;
  }

  snoozeReminder(id: string, minutes: number): CustomReminderItem | null {
    const item = this.state.reminders.find((r) => r.id.toUpperCase() === id.trim().toUpperCase());
    if (!item) return null;
    item.snoozedMinutes = (item.snoozedMinutes ?? 0) + minutes;
    this.saveState();
    return item;
  }

  // ==================== 3. PENGUMUMAN & CATATAN KELAS ====================
  createAnnouncementDraft(
    priority: AnnouncementDraft['priority'],
    title: string,
    content: string,
  ): AnnouncementDraft {
    const draft: AnnouncementDraft = {
      id: `ANN-${this.state.announcements.length + 1}`,
      priority,
      title: title.trim(),
      content: content.trim(),
      status: 'draft',
      createdAt: new Date().toISOString(),
    };
    this.state.announcements.push(draft);
    this.saveState();
    return draft;
  }

  getAnnouncement(id: string): AnnouncementDraft | undefined {
    return this.state.announcements.find((a) => a.id.toUpperCase() === id.trim().toUpperCase());
  }

  listAnnouncements(): AnnouncementDraft[] {
    return [...this.state.announcements].slice(-10);
  }

  addNote(title: string, content: string, createdBy: string): ClassNoteItem {
    const note: ClassNoteItem = {
      id: `NOTE-${this.state.notes.length + 1}`,
      title: title.trim(),
      content: content.trim(),
      createdBy,
      createdAt: new Date().toISOString(),
    };
    this.state.notes.push(note);
    this.saveState();
    return note;
  }

  listNotes(): ClassNoteItem[] {
    return [...this.state.notes];
  }

  deleteNote(id: string): boolean {
    const idx = this.state.notes.findIndex((n) => n.id.toUpperCase() === id.trim().toUpperCase());
    if (idx === -1) return false;
    this.state.notes.splice(idx, 1);
    this.saveState();
    return true;
  }

  // ==================== 4. AFK & PROFIL KELAS ====================
  setAfk(userJid: string, reason: string): AfkEntry {
    const entry: AfkEntry = {
      userJid,
      reason: reason.trim() || 'Sedang kuliah / praktikum',
      sinceIso: new Date().toISOString(),
    };
    this.state.afk[userJid] = entry;
    this.saveState();
    return entry;
  }

  clearAfk(userJid: string): AfkEntry | null {
    const cur = this.state.afk[userJid];
    if (!cur) return null;
    delete this.state.afk[userJid];
    this.saveState();
    return cur;
  }

  getClassOfficers() {
    return this.state.classOfficers;
  }

  // ==================== 5. UTILITAS MATEMATIKA, KONVERSI, WAKTU, URL ====================
  /** Evaluator ekspresi matematika aman (tanpa `eval` / `Function`). */
  evaluateMath(expr: string): { ok: boolean; result?: number; error?: string } {
    const cleaned = expr.replace(/,/g, '.').replace(/[×xX]/g, '*').replace(/÷/g, '/').trim();
    if (!cleaned || !/^[0-9+\-*/().%\s^]+$/.test(cleaned)) {
      return { ok: false, error: 'Ekspresi hanya boleh berisi angka dan operator +, -, *, /, %, ^, (, )' };
    }
    try {
      const tokens = cleaned.match(/\d+(?:\.\d+)?|[+\-*/()%^]/g);
      if (!tokens || !tokens.length) return { ok: false, error: 'Ekspresi kosong' };
      let pos = 0;

      const parseExpr = (): number => {
        let val = parseTerm();
        while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
          const op = tokens[pos++]!;
          const rhs = parseTerm();
          val = op === '+' ? val + rhs : val - rhs;
        }
        return val;
      };

      const parseTerm = (): number => {
        let val = parsePower();
        while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/' || tokens[pos] === '%')) {
          const op = tokens[pos++]!;
          const rhs = parsePower();
          if ((op === '/' || op === '%') && rhs === 0) throw new Error('Pembagian dengan nol');
          val = op === '*' ? val * rhs : op === '/' ? val / rhs : val % rhs;
        }
        return val;
      };

      const parsePower = (): number => {
        let base = parseFactor();
        while (pos < tokens.length && tokens[pos] === '^') {
          pos++;
          base = Math.pow(base, parseFactor());
        }
        return base;
      };

      const parseFactor = (): number => {
        const tok = tokens[pos];
        if (tok === undefined) throw new Error('Akhir ekspresi tidak terduga');
        if (tok === '+' || tok === '-') {
          pos++;
          return tok === '-' ? -parseFactor() : parseFactor();
        }
        if (tok === '(') {
          pos++;
          const v = parseExpr();
          if (tokens[pos] !== ')') throw new Error('Kurung tutup tidak cocok');
          pos++;
          return v;
        }
        pos++;
        const n = Number(tok);
        if (!Number.isFinite(n)) throw new Error('Angka tidak valid');
        return n;
      };

      const res = parseExpr();
      if (pos !== tokens.length || !Number.isFinite(res)) {
        return { ok: false, error: 'Sintaks matematika tidak valid' };
      }
      return { ok: true, result: Number(res.toFixed(6)) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Gagal menghitung' };
    }
  }

  /** Konversi satuan (suhu, panjang, berat, dan mata uang referensi). */
  convertUnit(amount: number, fromRaw: string, toRaw: string): string {
    const from = fromRaw.toLowerCase();
    const to = toRaw.toLowerCase();
    if (!Number.isFinite(amount)) return '⚠️ Nilai angka tidak valid.';

    // Suhu
    if (['c', 'f', 'k'].includes(from) && ['c', 'f', 'k'].includes(to)) {
      const c = from === 'c' ? amount : from === 'f' ? ((amount - 32) * 5) / 9 : amount - 273.15;
      const out = to === 'c' ? c : to === 'f' ? (c * 9) / 5 + 32 : c + 273.15;
      return `🌡️ *Konversi Suhu:* ${amount} °${from.toUpperCase()} = *${out.toFixed(2)} °${to.toUpperCase()}*`;
    }

    // Panjang
    const lengthToMeter: Record<string, number> = { km: 1000, m: 1, cm: 0.01, mm: 0.001 };
    if (lengthToMeter[from] && lengthToMeter[to]) {
      const meters = amount * lengthToMeter[from]!;
      const out = meters / lengthToMeter[to]!;
      return `📏 *Konversi Panjang:* ${amount} ${from} = *${out.toFixed(4).replace(/\.?0+$/, '')} ${to}*`;
    }

    // Berat
    const weightToGram: Record<string, number> = { kg: 1000, g: 1, mg: 0.001, lb: 453.59237 };
    if (weightToGram[from] && weightToGram[to]) {
      const grams = amount * weightToGram[from]!;
      const out = grams / weightToGram[to]!;
      return `⚖️ *Konversi Berat:* ${amount} ${from} = *${out.toFixed(3).replace(/\.?0+$/, '')} ${to}*`;
    }

    // Mata uang (kurs referensi edukatif ke IDR)
    const fxToIdr: Record<string, number> = { idr: 1, usd: 15850, eur: 17100, sgd: 11800, myr: 3580 };
    if (fxToIdr[from] && fxToIdr[to]) {
      const idr = amount * fxToIdr[from]!;
      const out = idr / fxToIdr[to]!;
      return `💱 *Estimasi Kurs Referensi:* ${amount} ${from.toUpperCase()} ≈ *${out.toLocaleString('id-ID', { maximumFractionDigits: 2 })} ${to.toUpperCase()}* _(kurs indikatif)_`;
    }

    return '⚠️ Satuan belum didukung. Contoh: `.convert 37.5 c f`, `.convert 5 km m`, `.convert 60 kg lb`, `.convert 100 usd idr`.';
  }

  formatWorldClock(now = new Date()): string {
    const fmt = (tz: string) =>
      new Intl.DateTimeFormat('id-ID', {
        timeZone: tz,
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now);
    return (
      `🕒 *Informasi Waktu Nasional & Dunia*\n` +
      `• *WIB (Asia/Jakarta):* ${fmt('Asia/Jakarta')}\n` +
      `• *WITA (Asia/Makassar):* ${fmt('Asia/Makassar')}\n` +
      `• *WIT (Asia/Jayapura):* ${fmt('Asia/Jayapura')}\n` +
      `• *UTC:* ${now.toISOString()}`
    );
  }

  checkUrlSafety(rawUrl: string): string {
    const candidate = rawUrl.startsWith('http://') || rawUrl.startsWith('https://') ? rawUrl : `https://${rawUrl}`;
    const res = validateSafeExternalUrl(candidate);
    if (!res.ok) {
      return `🛑 *URL Tidak Aman / Ditolak SSRF Guard*\n• Alasan: \`${res.reason}\``;
    }
    const u = res.url;
    return (
      `🔍 *Pemeriksaan Keamanan URL/Domain*\n` +
      `• URL Normal: ${u.href}\n` +
      `• Hostname: \`${u.hostname}\`\n` +
      `• Protokol: *${u.protocol.replace(':', '').toUpperCase()}*\n` +
      `• Status SSRF Guard: *AMAN (bukan IP privat/loopback/metadata)*`
    );
  }

  // ==================== 6. INTEGRASI API PUBLIK (DENGAN FALLBACK AMAN) ====================
  async getWeather(cityRaw: string): Promise<string> {
    const city = (cityRaw || 'Jakarta').trim();
    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=id&format=json`;
      const gCheck = validateSafeExternalUrl(geoUrl);
      if (gCheck.ok) {
        const gRes = await fetch(geoUrl, { signal: AbortSignal.timeout(4500) });
        if (gRes.ok) {
          const gData = (await gRes.json()) as {
            results?: Array<{ name: string; country?: string; latitude: number; longitude: number }>;
          };
          const loc = gData.results?.[0];
          if (loc) {
            const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=Asia%2FJakarta`;
            const wRes = await fetch(wUrl, { signal: AbortSignal.timeout(4500) });
            if (wRes.ok) {
              const wData = (await wRes.json()) as {
                current?: { temperature_2m?: number; relative_humidity_2m?: number; wind_speed_10m?: number };
              };
              const c = wData.current;
              if (c) {
                return (
                  `🌤️ *Cuaca Saat Ini — ${loc.name}${loc.country ? `, ${loc.country}` : ''}*\n` +
                  `• Suhu: *${c.temperature_2m ?? '-'} °C*\n` +
                  `• Kelembapan: *${c.relative_humidity_2m ?? '-'}%*\n` +
                  `• Kecepatan Angin: *${c.wind_speed_10m ?? '-'} km/jam*\n` +
                  `_Sumber: Open-Meteo (Asia/Jakarta)_`
                );
              }
            }
          }
        }
      }
    } catch {
      // Gunakan fallback lokal jika jaringan offline/timeout
    }
    return (
      `🌤️ *Info Cuaca — ${city}*\n` +
      `• Estimasi Wilayah Tropis Indonesia: 26°C – 32°C (Kelembapan 70%–85%)\n` +
      `_Catatan: Layanan cuaca eksternal sedang tidak terjangkau; menampilkan referensi iklim lokal._`
    );
  }

  async searchWikipedia(queryRaw: string): Promise<string> {
    const query = queryRaw.trim();
    if (!query) return '⚠️ Format: `.wiki <topik pencarian>`';
    try {
      const url = `https://id.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/\s+/g, '_'))}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'HdyBot-NursingClassA/1.0' },
        signal: AbortSignal.timeout(4500),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          title?: string;
          extract?: string;
          content_urls?: { desktop?: { page?: string } };
        };
        if (data.extract) {
          return (
            `📖 *Wikipedia Bahasa Indonesia — ${data.title ?? query}*\n` +
            `${data.extract}\n\n` +
            `🔗 Sumber: ${data.content_urls?.desktop?.page ?? `https://id.wikipedia.org/wiki/${encodeURIComponent(query)}`}`
          );
        }
      }
    } catch {
      // fallback
    }
    return (
      `📖 *Pencarian Ensiklopedia — ${query}*\n` +
      `Artikel langsung belum ditemukan atau koneksi sedang offline. Gunakan \`.ask ${query}\` untuk penjelasan konsep akademik keperawatan.`
    );
  }

  // ==================== 7. HIBURAN AMAN, QUOTES, GAME, & KREATIVITAS TEKS AKIRA ====================
  randomQuote(kind: 'umum' | 'islami' | 'motivasi' = 'umum'): string {
    const pool = kind === 'islami' ? QUOTES_ISLAMI : kind === 'motivasi' ? QUOTES_MOTIVASI : QUOTES_UMUM;
    return `💬 *Kutipan Hari Ini*\n${pool[Math.floor(Math.random() * pool.length)]!}`;
  }

  randomFact(): string {
    return `🧬 *Fakta Unik Kesehatan & Sains*\n${FAKTA_UNIK[Math.floor(Math.random() * FAKTA_UNIK.length)]!}`;
  }

  randomPantun(): string {
    return `🎭 *Pantun Kelas 5A*\n${PANTUN_KOLEKSI[Math.floor(Math.random() * PANTUN_KOLEKSI.length)]!}`;
  }

  randomDoa(): string {
    return DOA_HARIAN[Math.floor(Math.random() * DOA_HARIAN.length)]!;
  }

  listSurah(): string {
    return `📖 *Daftar Surah Pilihan Al-Qur'an*\n${DAFTAR_SURAH_RINGKAS.join('\n')}\n\n_Ketik \`.doaharian\` untuk doa belajar & klinik._`;
  }

  prayerSchedule(cityRaw = 'Jakarta / Jawa Timur'): string {
    const city = cityRaw.trim() || 'Jakarta / Jawa Timur';
    return (
      `🕌 *Estimasi Jadwal Sholat Harian (${city} — WIB)*\n` +
      `• Subuh: 04:15 WIB\n` +
      `• Dzuhur: 11:45 WIB _(bertepatan jam istirahat kuliah 11:20–12:30 WIB)_\n` +
      `• Ashar: 15:05 WIB\n` +
      `• Maghrib: 17:50 WIB\n` +
      `• Isya: 19:00 WIB`
    );
  }

  truthOrDare(mode: 'truth' | 'dare'): string {
    const list = mode === 'truth' ? TRUTH_LIST : DARE_LIST;
    const item = list[Math.floor(Math.random() * list.length)]!;
    return mode === 'truth' ? `🎯 *TRUTH (Jujur):*\n${item}` : `🔥 *DARE (Tantangan Aman):*\n${item}`;
  }

  rollDice(): string {
    const d = Math.floor(Math.random() * 6) + 1;
    return `🎲 *Lempar Dadu:* Kamu mendapatkan angka *${d}*!`;
  }

  flipCoin(): string {
    const side = Math.random() < 0.5 ? 'ANGKA (Heads)' : 'GAMBAR (Tails)';
    return `🪙 *Lempar Koin:* Hasilnya adalah *${side}*!`;
  }

  playSuit(userChoiceRaw: string): string {
    const choices = ['batu', 'gunting', 'kertas'] as const;
    const user = userChoiceRaw.trim().toLowerCase();
    if (!choices.includes(user as (typeof choices)[number])) {
      return '⚠️ Format: `.suit batu`, `.suit gunting`, atau `.suit kertas`';
    }
    const bot = choices[Math.floor(Math.random() * choices.length)]!;
    let outcome = 'SERI 🤝';
    if (
      (user === 'batu' && bot === 'gunting') ||
      (user === 'gunting' && bot === 'kertas') ||
      (user === 'kertas' && bot === 'batu')
    ) {
      outcome = 'KAMU MENANG! 🎉';
    } else if (user !== bot) {
      outcome = 'HDYBOT MENANG! 🤖';
    }
    return `✊✌️✋ *Suit Jepang*\n• Kamu: *${user.toUpperCase()}*\n• HdyBot: *${bot.toUpperCase()}*\n• Hasil: *${outcome}*`;
  }

  magicShell(kind: 'apakah' | 'kapankah' | 'bisakah' | 'kerangajaib' | 'rate', query: string): string {
    const q = query.trim() || 'hal tersebut';
    if (kind === 'rate') {
      let hash = 0;
      for (const ch of q) hash = (hash * 31 + ch.charCodeAt(0)) % 101;
      return `📊 *Penilaian HdyBot untuk "${q}":* *${hash}/100* ⭐`;
    }
    if (kind === 'kapankah') {
      const opts = ['Besok pagi', 'Minggu depan', 'Bulan depan', 'Saat semester ini selesai', 'Segera setelah tugas selesai!'];
      return `🔮 *Pertanyaan:* Kapankah ${q}?\n*Jawaban:* ${opts[q.length % opts.length]!}`;
    }
    const answers = ['Ya, tentu saja!', 'Sangat mungkin bila kamu berusaha.', 'Coba tanyakan lagi setelah belajar.', 'Sepertinya perlu persiapan lebih matang.', 'InsyaAllah bisa!'];
    return `🐚 *Kerang Ajaib HdyBot*\n• Pertanyaan: _${q}_\n• Jawaban: *${answers[q.length % answers.length]!}*`;
  }

  startQuiz(chatJid: string, kind: ActiveQuizSession['kind']): string {
    if (kind === 'mathquiz') {
      const a = Math.floor(Math.random() * 20) + 5;
      const b = Math.floor(Math.random() * 15) + 3;
      const session: ActiveQuizSession = {
        kind: 'mathquiz',
        question: `Berapakah hasil dari ${a} × ${b} + 10 ?`,
        answer: String(a * b + 10),
        hint: 'Hitung perkalian terlebih dahulu lalu tambahkan 10.',
      };
      this.activeQuizzes.set(chatJid, session);
      return `🧮 *Kuis Matematika Cepat*\nSoal: *${session.question}*\nBalas dengan \`.jawab <angka>\``;
    }

    if (kind === 'caklontong') {
      const item = CAK_LONTONG_BANK[Math.floor(Math.random() * CAK_LONTONG_BANK.length)]!;
      this.activeQuizzes.set(chatJid, {
        kind: 'caklontong',
        question: item.q,
        answer: item.a,
        hint: item.hint,
      });
      return `😂 *Teka-Teki Cak Lontong*\nSoal: *${item.q}*\nPetunjuk: ${item.hint}\nBalas dengan \`.jawab <jawaban>\``;
    }

    if (kind === 'family100') {
      const item = FAMILY100_BANK[Math.floor(Math.random() * FAMILY100_BANK.length)]!;
      this.activeQuizzes.set(chatJid, {
        kind: 'family100',
        question: item.q,
        answer: item.a,
        hint: item.hint,
      });
      return `👨‍👩‍👧‍👦 *Survei Family 100 Kelas 5A*\nPertanyaan: *${item.q}*\nPetunjuk: ${item.hint}\nBalas dengan \`.jawab <jawaban>\``;
    }

    const item = TEBAK_KATA_BANK[Math.floor(Math.random() * TEBAK_KATA_BANK.length)]!;
    const scrambled = item.q
      .split('')
      .sort((a, b) => a.localeCompare(b))
      .join(' - ');
    this.activeQuizzes.set(chatJid, {
      kind: 'tebakkata',
      question: scrambled,
      answer: item.q.toLowerCase(),
      hint: item.hint,
    });
    return `🧩 *Tebak Kata Keperawatan*\nHuruf Acak: *${scrambled}*\nPetunjuk: _${item.hint}_\nBalas dengan \`.jawab <kata>\``;
  }

  answerQuiz(chatJid: string, guessRaw: string): { ok: boolean; message: string } {
    const session = this.activeQuizzes.get(chatJid);
    if (!session) {
      return { ok: false, message: 'ℹ️ Belum ada kuis aktif di chat ini. Mulai dengan `.tebakkata`, `.caklontong`, `.family100`, atau `.mathquiz`.' };
    }
    const guess = guessRaw.trim().toLowerCase();
    if (guess === session.answer.toLowerCase()) {
      this.activeQuizzes.delete(chatJid);
      return { ok: true, message: `🎉 *BENAR!* Jawabannya adalah *${session.answer.toUpperCase()}* (+15 XP).` };
    }
    return { ok: false, message: `❌ Belum tepat! Petunjuk: _${session.hint}_ (atau ketik \`.nyerah\` untuk melihat jawaban).` };
  }

  giveUpQuiz(chatJid: string): string {
    const session = this.activeQuizzes.get(chatJid);
    if (!session) return 'ℹ️ Tidak ada kuis yang sedang berlangsung.';
    this.activeQuizzes.delete(chatJid);
    return `🏳️ Kuis dihentikan. Jawaban yang benar adalah: *${session.answer.toUpperCase()}*.`;
  }

  transformText(mode: 'hilih' | 'alay' | 'besarkecil' | 'balikhuruf' | 'namaninja', input: string): string {
    const s = input.trim() || 'Nursing Class A';
    switch (mode) {
      case 'hilih':
        return s.replace(/[aiueo]/g, 'i').replace(/[AIUEO]/g, 'I');
      case 'alay':
        return s
          .replace(/a/gi, '4')
          .replace(/i/gi, '1')
          .replace(/e/gi, '3')
          .replace(/s/gi, '5')
          .replace(/o/gi, '0');
      case 'besarkecil':
        return s
          .split('')
          .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()))
          .join('');
      case 'balikhuruf':
        return s.split('').reverse().join('');
      case 'namaninja': {
        const map: Record<string, string> = {
          a: 'ka', b: 'zu', c: 'mi', d: 'te', e: 'ku', f: 'lu', g: 'ji', h: 'ri', i: 'ki',
          j: 'zu', k: 'me', l: 'ta', m: 'rin', n: 'to', o: 'mo', p: 'no', q: 'ke', r: 'shi',
          s: 'ari', t: 'chi', u: 'do', v: 'ru', w: 'mei', x: 'na', y: 'fu', z: 'zi',
        };
        return s
          .toLowerCase()
          .split('')
          .map((c) => map[c] ?? c)
          .join('');
      }
    }
  }

  // ==================== 8. ANALITIK & LAPORAN KELAS ====================
  formatStats(period: 'summary' | 'week' | 'month' | 'semester' = 'summary'): string {
    const totalCommands = Object.values(this.state.commandUsage).reduce((a, b) => a + b, 0);
    const topCommands = Object.entries(this.state.commandUsage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => `${k} (${v}x)`)
      .join(', ');
    const openTasks = this.state.assignments.filter((a) => a.status === 'open').length;
    const doneTasks = this.state.assignments.filter((a) => a.status === 'done').length;
    const activeReminders = this.state.reminders.filter((r) => r.status === 'scheduled').length;

    return (
      `📈 *Laporan Analitik Kelas (${period.toUpperCase()}) — Nursing Class A*\n` +
      `• Total Eksekusi Command: *${totalCommands}*\n` +
      `• Command Terpopuler: ${topCommands || 'belum ada data'}\n` +
      `• Tugas Aktif: *${openTasks}* | Tugas Selesai: *${doneTasks}*\n` +
      `• Pengingat Terjadwal: *${activeReminders}*\n` +
      `• Catatan Kelas Tersimpan: *${this.state.notes.length}*\n` +
      `_Data agregat kelas (privasi terjaga)._`
    );
  }
}
