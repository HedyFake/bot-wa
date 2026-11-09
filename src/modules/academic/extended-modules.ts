/**
 * Modul Akademik Lanjutan (Phase 8):
 * - GroupGeneratorService (pembagian kelompok adil, tanpa atribut sensitif, penetapan peran).
 * - AcademicCalendarService (kalender akademik & countdown tanpa mengarang tanggal).
 * - DocumentGeneratorService (template surat/notulensi/dokumen dengan watermark DRAFT eksplisit).
 * - GamificationService (XP & badge opt-in transparan, dapat dimatikan per anggota).
 * - UtilityService (kalkulator IPK/GPA & BMI edukatif dengan validasi).
 */

export interface GeneratedGroup {
  groupNumber: number;
  members: string[];
  roles: {
    leader: string;
    secretary?: string;
    presenter?: string;
    moderator?: string;
  };
}

export class GroupGeneratorService {
  /**
   * Membagi daftar nama anggota menjadi sejumlah kelompok dengan ukuran seimbang
   * (selisih jumlah anggota antar kelompok maksimal 1).
   */
  generateFairGroups(
    membersInput: string[],
    groupCount: number,
    seedOffset = 0,
  ): GeneratedGroup[] {
    const cleaned = membersInput.map((m) => m.trim()).filter(Boolean);
    if (cleaned.length === 0) throw new Error('Daftar anggota kosong');
    if (!Number.isInteger(groupCount) || groupCount < 1 || groupCount > cleaned.length) {
      throw new Error('Jumlah kelompok harus antara 1 dan jumlah anggota');
    }

    // Rotasi deterministik berdasarkan seedOffset agar bisa diuji dan menghindari pengulangan kombinasi
    const rotated = cleaned.map((_, i) => cleaned[(i + seedOffset) % cleaned.length]!);
    const buckets: string[][] = Array.from({ length: groupCount }, () => []);
    rotated.forEach((member, idx) => {
      buckets[idx % groupCount]!.push(member);
    });

    return buckets.map((members, i) => ({
      groupNumber: i + 1,
      members,
      roles: {
        leader: members[0]!,
        secretary: members[1],
        presenter: members[2] ?? members[0],
        moderator: members[3] ?? members[1] ?? members[0],
      },
    }));
  }
}

export interface CalendarEvent {
  id: string;
  title: string;
  category: 'UTS' | 'UAS' | 'PRACTICUM' | 'SEMINAR' | 'KKN' | 'PKL' | 'THESIS' | 'HOLIDAY' | 'OTHER';
  dateIso: string; // YYYY-MM-DD (Asia/Jakarta)
  source: string;
  verification: 'USER_PROVIDED_PENDING_CONFIRMATION' | 'VERIFIED';
}

export class AcademicCalendarService {
  private readonly events = new Map<string, CalendarEvent>();
  private seq = 0;

  addEvent(e: Omit<CalendarEvent, 'id'>): CalendarEvent {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.dateIso)) {
      throw new Error('Format tanggal kalender harus YYYY-MM-DD');
    }
    const id = `CAL-${++this.seq}`;
    const item: CalendarEvent = { ...e, id };
    this.events.set(id, item);
    return item;
  }

  listEvents(): CalendarEvent[] {
    return [...this.events.values()].sort((a, b) => a.dateIso.localeCompare(b.dateIso));
  }

  countdownDays(targetDateIso: string, now = new Date()): number {
    const targetMs = new Date(`${targetDateIso}T00:00:00+07:00`).getTime();
    const diff = targetMs - now.getTime();
    return Math.ceil(diff / (24 * 60 * 60 * 1000));
  }
}

export class DocumentGeneratorService {
  static readonly DRAFT_WATERMARK =
    '[DRAFT OTOMATIS HDYBOT — BELUM DISAHKAN / BUKAN DOKUMEN RESMI KAMPUS / TANPA TANDA TANGAN DOSEN]';

  generatePermissionLetterDraft(input: {
    studentName: string;
    nim?: string;
    courseName: string;
    dateIso: string;
    reason: string;
  }): string {
    return (
      `${DocumentGeneratorService.DRAFT_WATERMARK}\n\n` +
      `Perihal : Permohonan Izin Tidak Mengikuti Perkuliahan\n` +
      `Kelas   : Nursing Class A (Semester 5A)\n` +
      `Tanggal : ${input.dateIso}\n\n` +
      `Yth. Dosen Pengampu Mata Kuliah ${input.courseName},\n` +
      `Dengan hormat, saya yang bertanda tangan di bawah ini:\n` +
      `• Nama : ${input.studentName}\n` +
      `• NIM  : ${input.nim ?? '(belum diisi)'}\n` +
      `• Kelas: Nursing Class A (Semester 5A)\n\n` +
      `Memohon izin untuk tidak dapat mengikuti perkuliahan pada ${input.dateIso} dikarenakan: ${input.reason}.\n` +
      `Demikian surat permohonan ini dibuat untuk ditinjau dan ditandatangani secara sah oleh mahasiswa terkait.\n\n` +
      `${DocumentGeneratorService.DRAFT_WATERMARK}`
    );
  }

  generateMinutesDraft(input: {
    title: string;
    dateIso: string;
    attendeesCount: number;
    decisions: string[];
  }): string {
    return (
      `${DocumentGeneratorService.DRAFT_WATERMARK}\n\n` +
      `NOTULENSI KEGIATAN KELAS — NURSING CLASS A (5A)\n` +
      `Kegiatan : ${input.title}\n` +
      `Tanggal  : ${input.dateIso}\n` +
      `Hadir    : ${input.attendeesCount} orang\n\n` +
      `Keputusan / Ringkasan:\n` +
      input.decisions.map((d, i) => `${i + 1}. ${d}`).join('\n') +
      `\n\n${DocumentGeneratorService.DRAFT_WATERMARK}`
    );
  }
}

export class GamificationService {
  private readonly optInUsers = new Set<string>();
  private readonly xpByUser = new Map<string, number>();

  constructor(initial: Record<string, number> = {}, private persist?: (scores: Record<string, number>) => void) {
    for (const [jid, xp] of Object.entries(initial)) {
      this.optInUsers.add(jid);
      this.xpByUser.set(jid, xp);
    }
  }

  private save() {
    this.persist?.(Object.fromEntries([...this.optInUsers].map(jid => [jid, this.xpByUser.get(jid) ?? 0])));
  }

  setOptIn(userJid: string, enabled: boolean): void {
    if (enabled) {
      this.optInUsers.add(userJid);
    } else {
      this.optInUsers.delete(userJid);
      this.xpByUser.delete(userJid);
    }
    this.save();
  }

  isOptedIn(userJid: string): boolean {
    return this.optInUsers.has(userJid);
  }

  /** Hanya menambah XP untuk aktivitas akademik valid (kuis/tugas/kontribusi materi), bukan jumlah chat. */
  awardXp(
    userJid: string,
    activity: 'quiz_completed' | 'task_completed' | 'material_contributed',
    points = 10,
  ): { awarded: boolean; totalXp: number } {
    if (!this.optInUsers.has(userJid) || points <= 0) {
      return { awarded: false, totalXp: this.xpByUser.get(userJid) ?? 0 };
    }
    void activity;
    const next = (this.xpByUser.get(userJid) ?? 0) + points;
    this.xpByUser.set(userJid, next);
    this.save();
    return { awarded: true, totalXp: next };
  }

  leaderboard(limit = 10): Array<{ userJid: string; xp: number; level: number }> {
    return [...this.xpByUser.entries()]
      .filter(([jid]) => this.optInUsers.has(jid))
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([userJid, xp]) => ({ userJid, xp, level: Math.floor(xp / 100) + 1 }));
  }
}

export class UtilityService {
  /** Hitung IP/GPA dari daftar `{ sks, gradePoint }` (skala 0.0–4.0). */
  static calculateGpa(items: Array<{ sks: number; gradePoint: number }>): { totalSks: number; gpa: number } {
    if (!items.length) throw new Error('Daftar nilai kosong');
    let totalSks = 0;
    let weighted = 0;
    for (const it of items) {
      if (it.sks <= 0 || it.gradePoint < 0 || it.gradePoint > 4) {
        throw new Error('Nilai SKS atau bobot indeks tidak valid');
      }
      totalSks += it.sks;
      weighted += it.sks * it.gradePoint;
    }
    return { totalSks, gpa: Number((weighted / totalSks).toFixed(2)) };
  }

  /** Hitung BMI untuk edukasi keperawatan dasar. */
  static calculateBmi(weightKg: number, heightCm: number): { bmi: number; category: string } {
    if (weightKg <= 0 || heightCm <= 0) throw new Error('Berat dan tinggi harus positif');
    const hM = heightCm / 100;
    const bmi = Number((weightKg / (hM * hM)).toFixed(1));
    const category =
      bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obesitas';
    return { bmi, category };
  }
}
