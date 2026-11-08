export interface GameQuestion {
  category: string;
  level: 'easy' | 'medium' | 'hard';
  prompt: string;
  answer: string;
  hint: string;
  explanation: string;
}

export const questions: GameQuestion[] = [
  { category: 'sinonim', level: 'easy', prompt: 'Apa sinonim cermat yang diawali huruf T?', answer: 'teliti', hint: 'Enam huruf.', explanation: 'Teliti dan cermat sama-sama menggambarkan perhatian terhadap detail.' },
  { category: 'antonim', level: 'easy', prompt: 'Apa lawan kata konkret?', answer: 'abstrak', hint: 'Diawali huruf A.', explanation: 'Konkret dapat diamati secara langsung. Abstrak merujuk pada gagasan.' },
  { category: 'anagram', level: 'easy', prompt: 'Susun I — S — R — U — K menjadi nama benda.', answer: 'kursi', hint: 'Digunakan untuk duduk.', explanation: 'Kursi memakai kelima huruf tepat satu kali.' },
  { category: 'tebakemoji', level: 'easy', prompt: '📚 + 🐛 mengingatkan pada ungkapan apa untuk orang yang gemar membaca?', answer: 'kutu buku', hint: 'Dua kata.', explanation: 'Kutu buku merupakan ungkapan untuk orang yang gemar membaca.' },
  { category: 'deretangka', level: 'medium', prompt: 'Lanjutkan pola 3, 6, 11, 18, …', answer: '27', hint: 'Perhatikan selisih antarangka.', explanation: 'Selisihnya 3, 5, 7, lalu 9. Jadi 18 + 9 = 27.' },
  { category: 'asahotak', level: 'medium', prompt: 'Ada 5 tim. Setiap pasang tim bertemu satu kali. Berapa pertandingan?', answer: '10', hint: 'Setiap tim menghadapi empat lawan.', explanation: '5 × 4 menghitung setiap pertandingan dua kali. Hasilnya 20 ÷ 2 = 10.' },
  { category: 'tebakpola', level: 'hard', prompt: 'A, C, F, J, O, … Huruf berikutnya?', answer: 'u', hint: 'Jarak lompatan bertambah satu.', explanation: 'Posisinya 1, 3, 6, 10, 15, 21. Huruf ke-21 adalah U.' },
  { category: 'komputer', level: 'medium', prompt: 'Bilangan biner 1011 bernilai berapa dalam desimal?', answer: '11', hint: 'Bobot digit dari kanan: 1, 2, 4, 8.', explanation: '8 + 0 + 2 + 1 = 11.' },
  { category: 'matematika', level: 'hard', prompt: 'Dua dadu adil dilempar. Berapa pasangan berurutan yang jumlahnya delapan?', answer: '5', hint: 'Mulai dari (2,6).', explanation: 'Pasangannya (2,6), (3,5), (4,4), (5,3), dan (6,2).' },
];
