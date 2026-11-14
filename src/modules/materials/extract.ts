import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function convert(command: string, args: string[], input: Buffer, maxBuffer: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = execFile(command, args, { timeout: 20_000, maxBuffer, encoding: 'buffer', windowsHide: true },
      (error, output) => error ? reject(new Error('Ekstraksi dokumen gagal.')) : resolve(output));
    child.stdin?.on('error', () => undefined); // Proses dapat selesai sebelum membaca semua masukan.
    child.stdin?.end(input);
  });
}

export interface ExtractedSection { label: string; text: string }

let active = 0;
export async function extractSections(data: Buffer, mime: string): Promise<ExtractedSection[]> {
  if (active >= 2) throw new Error('Worker dokumen sibuk.');
  active++;
  try {
    let pages: string[];
    if (mime === 'application/pdf') {
      // Xpdf on Windows needs an input path. Both Xpdf and Poppler can stream their output.
      const dir = await mkdtemp(join(tmpdir(), 'hdybot-pdf-'));
      let output: Buffer;
      try {
        const input = join(dir, 'input.pdf');
        await writeFile(input, data, { mode: 0o600 });
        output = await convert('pdftotext', ['-f', '1', '-l', '80', '-enc', 'UTF-8', input, '-'], Buffer.alloc(0), 4_000_000);
      } finally {
        await rm(dir, {recursive:true,force:true});
      }
      pages = output.toString('utf8').split('\f');
      if (pages.at(-1)?.trim() === '') pages.pop();
      for (let i = 0; i < Math.min(pages.length, 8); i++) {
        if (pages[i]?.trim()) continue;
        const page = String(i + 1);
        const png = await convert('pdftoppm', ['-f', page, '-l', page, '-scale-to', '1400', '-png', '-singlefile', '-'], data, 8_000_000);
        pages[i] = (await convert('tesseract', ['stdin', 'stdout', '-l', 'ind+eng'], png, 1_000_000)).toString('utf8');
      }
    } else if (mime.startsWith('image/')) {
      pages = [(await convert('tesseract', ['stdin', 'stdout', '-l', 'ind+eng'], data, 1_000_000)).toString('utf8')];
    } else if (mime === 'text/plain' || mime === 'text/csv') pages = [data.toString('utf8')];
    else throw new Error('Format belum didukung untuk ekstraksi teks.');
    return pages.flatMap((text, i) => (text.trim().match(/[\s\S]{1,1000}/g) ?? []).map((chunk, j) => ({
      label: (mime === 'application/pdf' ? 'hal. ' + (i + 1) + ', ' : '') + 'bagian ' + (j + 1), text: chunk,
    })));
  } finally { active--; }
}
