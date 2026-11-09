/** Konversi Markdown ke teks WhatsApp sambil mempertahankan contoh kode. */
export function whatsappText(text: string): string {
  return text.trim().split(/(```[\s\S]*?(?:```|$)|`[^`\n]*`)/g).map((part, i) =>
    i % 2 ? part : part.replace(/\*\*([^*\n]+)\*\*/g, '*$1*')
      .replace(/^#{1,4}\s+(.+)$/gm, '*$1*').replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, '\n\n'),
  ).join('');
}
