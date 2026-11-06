import { validateSafeExternalUrl } from '../../security/guards.js';

export interface MaterialChunk {
  pageOrSlide: number;
  text: string;
}

export interface MaterialRecord {
  id: string;
  courseCode?: string;
  title: string;
  kind: 'pdf' | 'pptx' | 'docx' | 'image' | 'video' | 'link';
  sourceUrl?: string;
  fetchedAt?: string;
  verification: 'USER_PROVIDED_PENDING_CONFIRMATION' | 'VERIFIED' | 'REFERENCE_TO_CHECK';
  chunks: MaterialChunk[];
  createdAt: string;
}

export interface CitationHit {
  materialId: string;
  title: string;
  courseCode?: string;
  pageOrSlide: number;
  snippet: string;
  verification: MaterialRecord['verification'];
}

export const SHJ_OFFICIAL_REFERENCES: ReadonlyArray<{
  label: string;
  url: string;
  status: 'REFERENCE_TO_CHECK';
}> = [
  { label: 'Website SHJ', url: 'https://shj.ac.id/', status: 'REFERENCE_TO_CHECK' },
  { label: 'Prodi Profesi Ners', url: 'https://shj.ac.id/prodi-profesi-ners/', status: 'REFERENCE_TO_CHECK' },
  { label: 'Materi Pembelajaran', url: 'https://shj.ac.id/materi-pembelajaran/', status: 'REFERENCE_TO_CHECK' },
  { label: 'Halaman Download', url: 'https://shj.ac.id/halaman-download-file/', status: 'REFERENCE_TO_CHECK' },
  { label: 'SIAKAD', url: 'https://siakad.shj.ac.id/', status: 'REFERENCE_TO_CHECK' },
  { label: 'LMS', url: 'https://lms.shj.ac.id/', status: 'REFERENCE_TO_CHECK' },
  { label: 'E-Journal', url: 'https://e-journal.shj.ac.id/', status: 'REFERENCE_TO_CHECK' },
];

export const NURSING_EDUCATIONAL_DISCLAIMER =
  'Catatan Akademik: Penjelasan ini disusun oleh asisten AI untuk keperluan belajar Semester 5A Nursing Class A, bukan pengganti arahan dosen pengampu, pembimbing klinik (CI), atau protokol klinis rumah sakit.';

/**
 * Knowledge Base Materi & AI Class Assistant:
 * - Menyimpan materi per mata kuliah lengkap dengan chunk halaman/slide dan status verifikasi.
 * - Mencari kutipan berbasis kata kunci dan menyertakan sitasi `[Sumber: <judul>, hal./slide <n>]`.
 * - Tidak pernah mengarang sitasi, DOI, atau jurnal jika materi tidak ditemukan di repositori.
 */
export class KnowledgeBaseService {
  private readonly materials = new Map<string, MaterialRecord>();
  private seq = 0;

  addMaterial(input: {
    courseCode?: string;
    title: string;
    kind: MaterialRecord['kind'];
    sourceUrl?: string;
    verification?: MaterialRecord['verification'];
    pages?: string[];
  }): MaterialRecord {
    if (input.sourceUrl) {
      const check = validateSafeExternalUrl(input.sourceUrl);
      if (!check.ok) throw new Error(`URL materi tidak aman: ${check.reason}`);
    }
    const id = `MAT-${++this.seq}`;
    const chunks: MaterialChunk[] = (input.pages ?? []).map((text, idx) => ({
      pageOrSlide: idx + 1,
      text: text.trim(),
    }));
    const rec: MaterialRecord = {
      id,
      courseCode: input.courseCode?.toUpperCase(),
      title: input.title.trim(),
      kind: input.kind,
      sourceUrl: input.sourceUrl,
      fetchedAt: input.sourceUrl ? new Date().toISOString() : undefined,
      verification: input.verification ?? 'USER_PROVIDED_PENDING_CONFIRMATION',
      chunks,
      createdAt: new Date().toISOString(),
    };
    this.materials.set(id, rec);
    return rec;
  }

  listMaterials(courseQuery?: string): MaterialRecord[] {
    const all = [...this.materials.values()];
    if (!courseQuery) return all;
    const q = courseQuery.trim().toLowerCase();
    return all.filter(
      (m) =>
        m.courseCode?.toLowerCase() === q ||
        m.title.toLowerCase().includes(q),
    );
  }

  /** Cari potongan materi yang relevan beserta nomor halaman/slide untuk sitasi. */
  searchCitations(query: string, limit = 3): CitationHit[] {
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.replace(/[^a-z0-9]/g, ''))
      .filter((t) => t.length >= 3);
    if (!terms.length) return [];

    const scored: Array<{ score: number; hit: CitationHit }> = [];
    for (const mat of this.materials.values()) {
      for (const ch of mat.chunks) {
        const low = `${mat.title} ${ch.text}`.toLowerCase();
        const score = terms.reduce((acc, term) => acc + (low.includes(term) ? 1 : 0), 0);
        if (score > 0) {
          scored.push({
            score,
            hit: {
              materialId: mat.id,
              title: mat.title,
              courseCode: mat.courseCode,
              pageOrSlide: ch.pageOrSlide,
              snippet: ch.text.slice(0, 220),
              verification: mat.verification,
            },
          });
        }
      }
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.hit);
  }

  /** Jawab pertanyaan akademik berdasarkan materi yang terverifikasi; tidak mengarang sitasi bila kosong. */
  answerGroundedQuestion(question: string): {
    foundInMaterials: boolean;
    citations: CitationHit[];
    formattedAnswer: string;
  } {
    const citations = this.searchCitations(question, 3);
    if (citations.length === 0) {
      return {
        foundInMaterials: false,
        citations: [],
        formattedAnswer:
          `ℹ️ *Belum ditemukan dokumen sumber di repositori materi Nursing Class A* yang memuat kata kunci tersebut.\n` +
          `Silakan unggah file PDF/PPTX materi kuliah terlebih dahulu agar HdyBot dapat memberikan jawaban dengan sitasi halaman yang akurat.\n\n` +
          `_${NURSING_EDUCATIONAL_DISCLAIMER}_`,
      };
    }

    const lines = citations.map(
      (c, i) =>
        `${i + 1}. "${c.snippet}"\n   📎 *[Sumber: ${c.title}${c.courseCode ? ` (${c.courseCode})` : ''}, hal./slide ${c.pageOrSlide} | status: ${c.verification}]*`,
    );
    return {
      foundInMaterials: true,
      citations,
      formattedAnswer:
        `📖 *Temuan dari Materi Kelas (${citations.length} kutipan):*\n` +
        lines.join('\n\n') +
        `\n\n_${NURSING_EDUCATIONAL_DISCLAIMER}_`,
    };
  }

  /** Buat flashcard belajar dari materi yang tersimpan tanpa mengarang fakta di luar teks sumber. */
  generateFlashcards(materialId: string): Array<{ cardNumber: number; front: string; back: string; citation: string }> {
    const mat = this.materials.get(materialId.toUpperCase());
    if (!mat || mat.chunks.length === 0) return [];
    return mat.chunks.slice(0, 5).map((ch, idx) => ({
      cardNumber: idx + 1,
      front: `Konsep utama pada ${mat.title} (Bagian/Halaman ${ch.pageOrSlide})?`,
      back: ch.text.slice(0, 200),
      citation: `${mat.title}, hal./slide ${ch.pageOrSlide}`,
    }));
  }
}
