import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import sharp from 'sharp';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= maxCharsPerLine) {
      cur = (cur + ' ' + w).trim();
    } else {
      if (cur) lines.push(cur);
      cur = w.slice(0, maxCharsPerLine);
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines.length ? lines : ['HdyBot'];
}

export type ImageEffectKind = 'blur' | 'invert' | 'grayscale' | 'flip' | 'flop' | 'resize' | 'compress';

/**
 * Layanan Media, Stiker, Gambar, QR Code, dan PDF untuk HdyBot.
 * Mengimplementasikan fitur media nyata menggunakan `sharp`, `qrcode`, dan `pdf-lib`.
 */
export class MediaService {
  /** Konversi buffer gambar (PNG/JPEG/WebP) menjadi stiker WhatsApp WebP 512x512. */
  async imageToSticker(input: Buffer): Promise<Buffer> {
    return sharp(input)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: 85 })
      .toBuffer();
  }

  /** Buat stiker teks warna-warni (.ttp <teks>) ukuran 512x512 WebP. */
  async textToSticker(text: string): Promise<Buffer> {
    const lines = wrapLines(text || 'HdyBot', 14, 5);
    const fontSize = lines.length <= 2 ? 64 : lines.length <= 3 ? 52 : 42;
    const lineHeight = Math.round(fontSize * 1.25);
    const startY = Math.round(256 - ((lines.length - 1) * lineHeight) / 2);

    const tspans = lines
      .map((line, i) => `<tspan x="256" y="${startY + i * lineHeight}">${escapeXml(line)}</tspan>`)
      .join('');

    const svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect x="16" y="16" width="480" height="480" rx="48" fill="#0f172a" fill-opacity="0.88" stroke="#38bdf8" stroke-width="8"/>
      <text text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="${fontSize}" fill="#f8fafc" stroke="#0284c7" stroke-width="2">${tspans}</text>
      <text x="256" y="476" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#94a3b8">HdyBot • Nursing Class A</text>
    </svg>`;

    return sharp(Buffer.from(svg)).webp({ quality: 90 }).toBuffer();
  }

  /** Konversi stiker WebP menjadi gambar PNG (.toimg). */
  async stickerToPng(input: Buffer): Promise<Buffer> {
    return sharp(input).png().toBuffer();
  }

  /** Terapkan efek manipulasi gambar (.blur, .invert, .grayscale, .flip, .flop, .resize, .compress). */
  async applyImageEffect(
    input: Buffer,
    effect: ImageEffectKind,
    opts?: { width?: number; height?: number; quality?: number },
  ): Promise<{ data: Buffer; mimeType: string }> {
    let pipeline = sharp(input);
    switch (effect) {
      case 'blur':
        pipeline = pipeline.blur(6);
        break;
      case 'invert':
        pipeline = pipeline.negate({ alpha: false });
        break;
      case 'grayscale':
        pipeline = pipeline.grayscale();
        break;
      case 'flip':
        pipeline = pipeline.flip();
        break;
      case 'flop':
        pipeline = pipeline.flop();
        break;
      case 'resize':
        pipeline = pipeline.resize(
          Math.min(Math.max(opts?.width ?? 512, 32), 2048),
          Math.min(Math.max(opts?.height ?? 512, 32), 2048),
          { fit: 'inside' },
        );
        break;
      case 'compress': {
        const out = await pipeline.jpeg({ quality: opts?.quality ?? 60 }).toBuffer();
        return { data: out, mimeType: 'image/jpeg' };
      }
    }
    const out = await pipeline.png().toBuffer();
    return { data: out, mimeType: 'image/png' };
  }

  /** Buat kartu kutipan (.quotemaker <kutipan>|<penulis>) dalam format PNG. */
  async generateQuoteCard(quote: string, author = 'Nursing Class A'): Promise<Buffer> {
    const lines = wrapLines(quote, 36, 5);
    const tspans = lines
      .map((l, idx) => `<tspan x="400" y="${165 + idx * 42}">“${escapeXml(l)}”</tspan>`)
      .join('');
    const svg = `<svg width="800" height="450" viewBox="0 0 800 450" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="450" fill="#0f172a"/>
      <rect x="24" y="24" width="752" height="402" rx="24" fill="#1e293b" stroke="#38bdf8" stroke-width="4"/>
      <text x="400" y="75" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="bold" fill="#38bdf8">HDYBOT QUOTE CARD — NURSING CLASS A</text>
      <text text-anchor="middle" font-family="sans-serif" font-size="28" fill="#f8fafc">${tspans}</text>
      <text x="400" y="385" text-anchor="middle" font-family="sans-serif" font-size="22" font-style="italic" fill="#cbd5e1">— ${escapeXml(author)}</text>
    </svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
  }

  /** Buat kartu pengumuman / jadwal visual (.kartujadwal / .kartuucapan) dalam format PNG. */
  async generateScheduleCard(title: string, items: string[]): Promise<Buffer> {
    const safeItems = items.slice(0, 8);
    const rows = safeItems
      .map(
        (item, idx) =>
          `<text x="60" y="${150 + idx * 48}" font-family="sans-serif" font-size="22" fill="#e2e8f0">• ${escapeXml(item.slice(0, 62))}</text>`,
      )
      .join('');
    const svg = `<svg width="900" height="580" viewBox="0 0 900 580" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="580" fill="#0f172a"/>
      <rect x="24" y="24" width="852" height="532" rx="24" fill="#1e293b" stroke="#22c55e" stroke-width="4"/>
      <text x="60" y="85" font-family="sans-serif" font-size="30" font-weight="bold" fill="#4ade80">${escapeXml(title.slice(0, 48))}</text>
      ${rows}
      <text x="60" y="530" font-family="sans-serif" font-size="18" fill="#94a3b8">HdyBot — Nursing Class A (Semester 5A) • Asia/Jakarta</text>
    </svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
  }

  /** Normalisasi buffer gambar hasil pencarian web menjadi PNG yang siap dikirim via WhatsApp. */
  async normalizeSearchImage(input: Buffer): Promise<Buffer> {
    return sharp(input)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
  }

  /** Buat poster visual infografis PNG saat pencari gambar membutuhkan visualisasi langsung (.gambar <topik>). */
  async generateVisualSearchCard(topic: string, summaryLines: string[]): Promise<Buffer> {
    const safeLines = summaryLines.flatMap((l) => wrapLines(l, 56, 3)).slice(0, 7);
    const rows = safeLines
      .map(
        (line, idx) =>
          `<text x="60" y="${175 + idx * 44}" font-family="sans-serif" font-size="22" fill="#f1f5f9">• ${escapeXml(line)}</text>`,
      )
      .join('');
    const svg = `<svg width="900" height="580" viewBox="0 0 900 580" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="580" fill="#0f172a"/>
      <rect x="24" y="24" width="852" height="532" rx="24" fill="#1e293b" stroke="#38bdf8" stroke-width="4"/>
      <rect x="48" y="48" width="804" height="76" rx="14" fill="#0284c7" fill-opacity="0.25"/>
      <text x="68" y="96" font-family="sans-serif" font-size="28" font-weight="bold" fill="#38bdf8">ILUSTRASI &amp; INFO VISUAL: ${escapeXml(topic.toUpperCase().slice(0, 34))}</text>
      ${rows}
      <text x="60" y="530" font-family="sans-serif" font-size="18" fill="#94a3b8">HdyBot AI Image Generator &amp; Search • Nursing Class A (Semester 5A)</text>
    </svg>`;
    return sharp(Buffer.from(svg)).png().toBuffer();
  }

  /** Buat gambar PNG QR Code dari teks atau tautan (.qr <teks>). */
  async generateQrCodePng(text: string): Promise<Buffer> {
    return QRCode.toBuffer(text, {
      type: 'png',
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
  }

  /** Buat dokumen PDF resmi berlabel DRAFT (.doc pdf <judul>|<isi>). */
  async generatePdfDocument(opts: {
    title: string;
    subtitle?: string;
    bodyLines: string[];
    watermark?: string;
  }): Promise<Buffer> {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]); // A4
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);

    const watermark = opts.watermark ?? 'DRAFT — PERLU VERIFIKASI HEDY / ADMIN';
    page.drawText(watermark, {
      x: 50,
      y: 800,
      size: 10,
      font: fontBold,
      color: rgb(0.8, 0.2, 0.2),
    });

    page.drawText(opts.title.slice(0, 70), {
      x: 50,
      y: 765,
      size: 18,
      font: fontBold,
      color: rgb(0.06, 0.09, 0.16),
    });

    if (opts.subtitle) {
      page.drawText(opts.subtitle.slice(0, 90), {
        x: 50,
        y: 742,
        size: 11,
        font: fontRegular,
        color: rgb(0.3, 0.35, 0.45),
      });
    }

    let y = 705;
    for (const rawLine of opts.bodyLines) {
      const wrapped = wrapLines(rawLine, 75, 10);
      for (const l of wrapped) {
        if (y < 60) break;
        page.drawText(l, {
          x: 50,
          y,
          size: 11,
          font: fontRegular,
          color: rgb(0.1, 0.1, 0.1),
        });
        y -= 18;
      }
      if (y < 60) break;
    }

    page.drawText('Dicetak oleh HdyBot — Nursing Class A Assistant (Asia/Jakarta)', {
      x: 50,
      y: 35,
      size: 9,
      font: fontRegular,
      color: rgb(0.45, 0.5, 0.55),
    });

    const bytes = await pdf.save();
    return Buffer.from(bytes);
  }

  /** Periksa jumlah halaman dan metadata dasar file PDF. */
  async inspectPdf(input: Buffer): Promise<{ pageCount: number; title?: string }> {
    const pdf = await PDFDocument.load(input, { ignoreEncryption: true });
    return {
      pageCount: pdf.getPageCount(),
      title: pdf.getTitle(),
    };
  }
}
