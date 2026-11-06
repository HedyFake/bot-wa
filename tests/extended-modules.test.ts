import { describe, expect, it } from 'vitest';
import {
  AcademicCalendarService,
  DocumentGeneratorService,
  GamificationService,
  GroupGeneratorService,
  UtilityService,
} from '../src/modules/academic/extended-modules.js';
import {
  KnowledgeBaseService,
  NURSING_EDUCATIONAL_DISCLAIMER,
  SHJ_OFFICIAL_REFERENCES,
} from '../src/modules/materials/knowledge-base.js';
import {
  resolveSafeStoragePath,
  validateSafeExternalUrl,
  validateUploadedMedia,
} from '../src/security/guards.js';

describe('Security Guards (SSRF, Path Traversal, Upload Validation)', () => {
  it('memblokir SSRF ke localhost, IP privat RFC1918, cloud metadata 169.254.169.254, dan port non-standar', () => {
    expect(validateSafeExternalUrl('https://shj.ac.id/materi-pembelajaran/').ok).toBe(true);
    expect(validateSafeExternalUrl('http://127.0.0.1:3000/health')).toEqual({
      ok: false,
      reason: 'disallowed_protocol',
    });
    expect(validateSafeExternalUrl('https://127.0.0.1/secret').ok).toBe(false);
    expect(validateSafeExternalUrl('https://169.254.169.254/latest/meta-data/').ok).toBe(false);
    expect(validateSafeExternalUrl('https://192.168.1.10/admin').ok).toBe(false);
    expect(validateSafeExternalUrl('https://10.0.0.5/internal').ok).toBe(false);
    expect(validateSafeExternalUrl('https://172.20.0.1/internal').ok).toBe(false);
    expect(validateSafeExternalUrl('https://shj.ac.id:8080/test').ok).toBe(false);
  });

  it('memblokir path traversal keluar dari folder storage', () => {
    const safe = resolveSafeStoragePath('/var/lib/hdybot/storage', 'pdf/metpen-1.pdf');
    expect(safe).toContain('metpen-1.pdf');
    expect(() => resolveSafeStoragePath('/var/lib/hdybot/storage', '../../etc/passwd')).toThrow(
      /path_traversal_detected/,
    );
  });

  it('memvalidasi ukuran dan MIME file upload', () => {
    expect(
      validateUploadedMedia({
        filename: 'jadwal-5a.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024 * 100,
        maxMb: 25,
      }).ok,
    ).toBe(true);

    expect(
      validateUploadedMedia({
        filename: 'exploit.exe',
        mimeType: 'application/x-msdownload',
        sizeBytes: 1024,
      }),
    ).toEqual({ ok: false, reason: 'unsupported_mime_type' });
  });
});

describe('KnowledgeBaseService & AI Class Assistant Grounded Q&A', () => {
  it('menyimpan referensi resmi SHJ dan menjawab dengan sitasi halaman serta disclaimer keperawatan', () => {
    expect(SHJ_OFFICIAL_REFERENCES).toHaveLength(7);
    const kb = new KnowledgeBaseService();

    const emptyAns = kb.answerGroundedQuestion('pengkajian nyeri gerontik');
    expect(emptyAns.foundInMaterials).toBe(false);
    expect(emptyAns.formattedAnswer).toContain('Belum ditemukan dokumen sumber');

    const mat = kb.addMaterial({
      courseCode: 'GERO',
      title: 'Modul Keperawatan Gerontik Minggu 1',
      kind: 'pdf',
      sourceUrl: 'https://shj.ac.id/materi-pembelajaran/',
      pages: [
        'Pengantar demografi lansia di Indonesia.',
        'Pengkajian paripurna pasien geriatri mencakup status fungsional ADL Barthel Index dan risiko jatuh.',
      ],
    });

    const grounded = kb.answerGroundedQuestion('Bagaimana pengkajian fungsional Barthel Index geriatri?');
    expect(grounded.foundInMaterials).toBe(true);
    expect(grounded.citations[0]?.pageOrSlide).toBe(2);
    expect(grounded.formattedAnswer).toContain('hal./slide 2');
    expect(grounded.formattedAnswer).toContain(NURSING_EDUCATIONAL_DISCLAIMER);

    const cards = kb.generateFlashcards(mat.id);
    expect(cards).toHaveLength(2);
    expect(cards[1]?.citation).toContain('hal./slide 2');
  });
});

describe('Extended Academic Modules (Groups, Calendar, Documents, Gamification, Utilities)', () => {
  it('membagi kelompok secara adil (selisih ukuran maksimal 1) dan menetapkan peran', () => {
    const gen = new GroupGeneratorService();
    const groups = gen.generateFairGroups(
      ['Ayu', 'Budi', 'Citra', 'Dedi', 'Eka', 'Fajar', 'Gita'],
      3,
    );
    expect(groups).toHaveLength(3);
    const sizes = groups.map((g) => g.members.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    expect(groups[0]?.roles.leader).toBeTruthy();
  });

  it('menghasilkan surat izin dengan watermark DRAFT eksplisit', () => {
    const docs = new DocumentGeneratorService();
    const draft = docs.generatePermissionLetterDraft({
      studentName: 'Siti',
      courseName: 'Metodologi Penelitian',
      dateIso: '2026-11-09',
      reason: 'Sakit',
    });
    expect(draft).toContain(DocumentGeneratorService.DRAFT_WATERMARK);
  });

  it('hanya memberikan XP gamification untuk anggota yang opt-in dan menghapus saat opt-out', () => {
    const gam = new GamificationService();
    const u = '628111111111@s.whatsapp.net';
    expect(gam.awardXp(u, 'quiz_completed', 25).awarded).toBe(false);

    gam.setOptIn(u, true);
    expect(gam.awardXp(u, 'quiz_completed', 25)).toEqual({ awarded: true, totalXp: 25 });
    expect(gam.leaderboard()[0]?.xp).toBe(25);

    gam.setOptIn(u, false);
    expect(gam.leaderboard()).toHaveLength(0);
  });

  it('menghitung countdown kalender akademik, IPK/GPA, dan BMI secara akurat', () => {
    const cal = new AcademicCalendarService();
    cal.addEvent({
      title: 'UTS Semester 5A',
      category: 'UTS',
      dateIso: '2026-11-16',
      source: 'Admin',
      verification: 'USER_PROVIDED_PENDING_CONFIRMATION',
    });
    expect(cal.countdownDays('2026-11-16', new Date('2026-11-06T00:00:00+07:00'))).toBe(10);

    expect(
      UtilityService.calculateGpa([
        { sks: 4, gradePoint: 4.0 },
        { sks: 2, gradePoint: 3.0 },
      ]),
    ).toEqual({ totalSks: 6, gpa: 3.67 });

    expect(UtilityService.calculateBmi(60, 165)).toEqual({ bmi: 22, category: 'Normal' });
  });
});
