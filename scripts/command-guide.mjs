// Deskripsi untuk tabel README. Kunci terpanjang menang untuk subperintah.
const rows = `
kelas :: Melihat identitas dan ringkasan kelas. :: Kirim tanpa argumen.
anggota :: Mencari nama dan NIM anggota kelas. :: Kosongkan nama untuk daftar lengkap atau tulis potongan nama.
pengurus :: Melihat susunan pengurus dan PJ mata kuliah. :: Kirim perintah atau pilih alias jabatan.
rules :: Membaca aturan kelas. :: Kirim tanpa argumen.
faq :: Membaca pertanyaan yang sering diajukan. :: Kirim tanpa argumen.
profile :: Melihat profil pengirim. :: Jalankan dari akun WhatsApp sendiri.
matkul :: Melihat daftar mata kuliah beserta jadwal dan pengampu. :: Kirim tanpa argumen.
dosen :: Melihat kontak dan data pengampu. :: Tulis nama dosen atau kosongkan untuk daftar.
groupid :: Menampilkan ID chat saat ini. :: Kirim di grup yang JID-nya ingin diketahui.
jadwal/jadwal hariini/matkulhariini/dosenhariini/ruanganhariini :: Melihat sesi kuliah hari ini, termasuk jam, dosen dan ruang yang tercatat. :: Kirim di chat bot atau grup kelas.
jadwal senin :: Melihat jadwal untuk hari tertentu. :: Ganti senin dengan nama hari.
besok/jadwal besok :: Melihat jadwal besok menurut WIB. :: Kirim tanpa tanggal.
mingguini/jadwal minggu :: Melihat sesi selama pekan berjalan. :: Kirim sekali untuk ringkasan sepekan.
kuliahberikutnya :: Mencari sesi terjadwal berikutnya. :: Kirim saat ingin mengetahui jam kuliah terdekat.
cekjadwal :: Melihat jadwal pada tanggal tertentu. :: Masukkan tanggal YYYY-MM-DD.
jadwal export :: Mengekspor data jadwal. :: Pilih csv atau json setelah kata export.
tambahjadwal :: Menambah sesi ke PostgreSQL. :: Pisahkan hari, jam mulai, jam selesai, kode matkul dan ruang dengan tanda pipa. Tinjau lalu konfirmasi.
editjadwal :: Mengubah sesi yang sudah ada. :: Awali dengan hari dan jam lama, lanjutkan data sesi baru. Konfirmasikan pratinjau di DM.
hapusjadwal :: Menghapus satu sesi kuliah. :: Masukkan hari dan jam mulai sesi, kemudian periksa pratinjau.
resetjadwal :: Mengembalikan jadwal ke data awal. :: Baca pratinjau sebelum mengonfirmasi reset.
kelompok :: Membagi peserta ke dalam kelompok. :: Masukkan jumlah kelompok lalu nama peserta, dipisahkan koma.
kalender :: Melihat agenda akademik. :: Kirim tanpa argumen.
countdown :: Menghitung selisih hari menuju tanggal tujuan. :: Gunakan format YYYY-MM-DD.
tasks/tugas list :: Menampilkan daftar tugas di chat. :: Gunakan ID pada kartu untuk membuka detail.
tugas all :: Melihat tugas aktif dan selesai. :: Gunakan ketika mencari tugas lama.
tugas aktif/tugasaktif :: Menampilkan tugas yang belum selesai. :: Kirim tanpa judul tugas.
tugas hariini/tugas mingguini :: Memfilter tugas menurut tenggat hari atau pekan ini. :: Pilih periode sesuai kebutuhan.
tugas detail :: Membuka kartu lengkap satu tugas. :: Ganti TUG-1 dengan ID dari daftar tugas.
tugas add/tambahtugas :: Mencatat tugas beserta tenggat, dosen, dan PJ. :: Pisahkan matkul, judul, tenggat WIB, catatan, dosen dan PJ dengan tanda pipa.
tugas done/selesaitugas :: Menandai tugas sebagai selesai. :: Gunakan ID tugas yang sudah dikumpulkan.
tugas antrean :: Memeriksa pemberitahuan yang menunggu keputusan. :: Buka di DM owner.
tugas grup :: Melihat grup tujuan yang dikenali. :: Salin nama atau JID untuk perintah tujuan.
tugas tujuan :: Memilih grup penerima pengingat. :: Gunakan ID pemberitahuan dan JID grup. Baca pratinjau lalu balas .confirm dengan kode yang diberikan.
tugas tolak :: Melewati satu pemberitahuan. :: Gunakan ID pemberitahuan dari DM.
tugas ulang :: Mengulang pemberitahuan pribadi yang gagal atau belum pasti. :: Cek riwayat pengiriman sebelum menggunakan ID pemberitahuan.
tugas deadline :: Memperbaiki tenggat suatu tugas. :: Masukkan ID tugas, tanggal, dan jam WIB jika diketahui.
tugas del :: Menghapus tugas dari daftar. :: Gunakan ID tugas yang benar.
reminder :: Melihat pengingat chat saat ini. :: Kirim di chat tempat pengingat dibuat.
reminder settings :: Memeriksa pengaturan pengingat. :: Kirim di chat yang ingin diperiksa.
reminder add :: Membuat pengingat. :: Pisahkan tanggal dan jam WIB dari isi pesan dengan tanda pipa. Tenggat akademik masuk alur review owner.
reminder snooze :: Menunda pengingat. :: Masukkan ID dan jumlah menit.
reminder delete :: Membatalkan pengingat terjadwal. :: Gunakan ID dari daftar pengingat.
reminder pause/reminder resume :: Menjeda atau melanjutkan worker pengingat. :: Pilih pause atau resume di DM admin.
announce :: Membuka bantuan pengumuman. :: Gunakan draft untuk menyiapkan isi.
announce draft :: Menyiapkan draf pengumuman kelas. :: Pisahkan tingkat kepentingan, judul, dan isi dengan tanda pipa.
note :: Melihat catatan chat. :: Gunakan .note list untuk daftar.
note add :: Menambahkan catatan. :: Pisahkan judul dan isi dengan tanda pipa.
note del :: Menghapus catatan. :: Ganti NOTE-1 dengan ID dari daftar.
dokumen :: Menampilkan katalog materi. :: Buka di chat yang mendapat izin jika memakai Drive.
carimateri/materi cari/drive search :: Mencari materi berdasarkan kata kunci. :: Ketik kata yang muncul pada judul atau metadata.
materi detail :: Membaca metadata satu materi. :: Salin ID dari hasil pencarian.
materi terbaru :: Melihat materi terbaru. :: Kirim di chat yang memiliki akses materi.
materi minggu1 :: Memfilter materi menurut minggu. :: Gunakan nomor minggu yang dicari.
materi halaman :: Membuka halaman katalog. :: Isi nomor halaman yang diinginkan.
drive status :: Memeriksa sinkronisasi atau kesalahan Drive. :: Buka di DM admin.
drive sync :: Meminta sinkronisasi metadata Drive. :: Pastikan folder dan akun layanan sudah dikonfigurasi.
drive files :: Menampilkan file dari folder yang diizinkan. :: Salin ID file untuk perintah unduh.
ambilmateri :: Mengirim file Drive ke WhatsApp. :: Tulis ID dari katalog dalam chat yang diizinkan. File asli PDF/PPT/PPTX dikirim sebagai dokumen bila tersedia.
download :: Mengirim file Drive atau mengekspor Google Slides. :: Ganti M2 dengan ID presentasi dalam chat berizin.
ringkasdokumen :: Merangkum dokumen Drive yang dapat diekstrak. :: Masukkan ID materi dari katalog.
tanyadokumen/ask materi :: Bertanya berdasarkan isi dokumen Drive. :: Ketik ID, spasi, lalu pertanyaan.
jurnal :: Mencari artikel ilmiah dan mengirim ringkasan pencarian dalam PDF. :: Ketik topik atau kutip teks yang ingin dicari.
ask :: Menjawab pertanyaan belajar. :: Tulis pertanyaan atau sertakan gambar dengan caption .ask.
rapikan :: Menyunting tulisan. :: Kirim teks setelah perintah atau kutip pesan yang akan disunting.
summarize :: Membuat ringkasan teks. :: Tempel teks atau balas pesan yang ingin diringkas.
flashcard/quiz :: Membuat bahan latihan belajar dari topik. :: Tulis topik. Untuk ronde interaktif yang dapat dijawab, gunakan .game ai.
translate :: Menerjemahkan teks. :: Masukkan bahasa tujuan lalu teks.
lms :: Membuka bantuan LMS mahasiswa. :: Mulai di DM atau grup dengan nama sendiri. Baca hasil lewat DM.
keperawatan :: Membuka daftar fitur keperawatan. :: Pilih kategori atau kalkulator dari balasan.
sdki :: Mencari diagnosis keperawatan SDKI. :: Tulis nama diagnosis.
sop :: Mencari prosedur keperawatan. :: Tulis tindakan yang ingin dipelajari.
askep/pengkajian :: Mencari sumber asuhan atau pengkajian keperawatan. :: Tulis penyakit, kelompok pasien, atau topik.
penunjang/ukom/kampus/berita/ppni/mtb/safety :: Membuka informasi pada kategori keperawatan terkait. :: Pilih pemeriksaan penunjang, Ukom, kampus, berita, PPNI, edukasi tanpa bias atau keselamatan pasien.
kuisukom :: Menampilkan latihan Ukom. :: Kirim tanpa argumen untuk contoh latihan.
highalert :: Mencari materi obat high alert. :: Kirim perintah untuk membaca ringkasan dan sumber.
ebook :: Mencari publikasi untuk diunduh. :: Gunakan tanpa ID. Untuk file Drive, .download harus diikuti ID.
imt/bmi :: Menghitung indeks massa tubuh. :: Isi berat dalam kg dan tinggi dalam cm.
gcs :: Menjumlahkan skor Glasgow Coma Scale. :: Isi komponen E, V dan M.
balance :: Menghitung selisih cairan masuk dan keluar. :: Masukkan volume masuk lalu keluar dengan satuan yang sama.
tetesan :: Menghitung tetesan infus untuk latihan. :: Isi volume mL, durasi jam, dan faktor tetes per mL.
kalkulatorperawat :: Melihat pilihan kalkulator keperawatan. :: Pilih perhitungan dan isi satuan seperti contoh.
suratizin/doc create :: Membuat draf surat izin. :: Masukkan nama, matkul, tanggal dan alasan, dipisahkan tanda pipa.
notulensi/doc minutes :: Membuat draf notulensi. :: Isi judul rapat, tanggal dan catatan.
doc pdf :: Membuat lampiran PDF dari teks. :: Pisahkan judul dan isi dengan tanda pipa.
sticker :: Membuat stiker gambar. :: Kirim perintah bersama gambar atau kutip gambar.
ttp :: Membuat stiker teks. :: Tulis kalimat pendek setelah perintah.
toimg :: Mengubah stiker menjadi gambar PNG. :: Balas stiker dengan perintah ini.
blur/invert/grayscale/flip/flop/compress :: Mengolah gambar. :: Kutip gambar lalu pilih efek: kaburkan, balik warna, abu-abu, balik vertikal, balik horizontal, atau kompres.
resize :: Mengubah ukuran gambar. :: Kutip gambar lalu tulis lebar dan tinggi dalam piksel.
quotemaker :: Membuat kartu kutipan. :: Pisahkan kutipan dan nama penulis dengan tanda pipa.
kartujadwal :: Membuat kartu jadwal bergambar. :: Tambahkan hari, atau gunakan jadwal hari ini.
kartuucapan :: Membuat kartu ucapan bergambar. :: Tulis isi ucapan setelah perintah.
gambar :: Mencari gambar untuk suatu topik. :: Tulis objek yang dicari; periksa sumber pada caption.
qr :: Membuat gambar QR dari teks atau tautan. :: Tempel konten setelah .qr. QR masuk akun WhatsApp tersedia melalui installer VPS.
ocr :: Membaca teks pada gambar. :: Kirim atau kutip gambar yang tulisannya terbaca.
tts :: Mengubah teks menjadi audio. :: Tulis kalimat yang ingin dibacakan.
music :: Mencari musik dan mengirim MP3 lokal yang cocok. :: Tulis judul atau musisi. Tanpa koleksi MP3, balasan berupa hasil atau tautan pencarian.
ipk :: Menghitung rata-rata nilai berbobot SKS. :: Tulis pasangan SKS:nilai, pisahkan tiap matkul dengan koma.
calc :: Menghitung ekspresi aritmetika. :: Tulis rumus dengan angka dan operator.
convert :: Mengonversi satuan. :: Urutkan nilai, satuan asal, lalu satuan tujuan.
jam :: Melihat waktu saat ini. :: Kirim tanpa argumen.
cuaca :: Memeriksa cuaca lokasi. :: Tulis nama kota.
wiki :: Mencari ringkasan ensiklopedia. :: Tulis istilah yang ingin dicari.
urlcheck :: Memeriksa kelayakan URL menurut aturan bot. :: Tempel URL lengkap; hasilnya bukan pemindaian malware.
pantun :: Membuat pantun. :: Tambahkan tema jika diinginkan.
quotes/quotesislami/quotesmotivasi/motivasi/katahariini :: Meminta kutipan, motivasi, atau kata hari ini. :: Pilih jenisnya; tambahkan tema jika tersedia.
tebak-tebakan/roasting/gombal/rayuan/cerpen/cerita :: Meminta konten hiburan sesuai jenis perintah. :: Ketik tema untuk tebak-tebakan, candaan, rayuan atau cerita.
faktaunik :: Membaca fakta singkat. :: Kirim tanpa argumen.
doaharian/listsurah :: Membuka doa atau daftar surah. :: Pilih perintah sesuai bacaan yang dicari.
jadwalsholat :: Mencari jadwal salat. :: Tulis nama kota.
truth/dare :: Meminta pertanyaan atau tantangan permainan. :: Kirim saat mendapat giliran.
dadu/koin :: Mengundi angka dadu atau sisi koin. :: Kirim setiap kali ingin mengundi.
suit :: Bermain batu, gunting, kertas. :: Tulis pilihanmu setelah perintah.
apakah/kapankah/bisakah/kerangajaib/rate :: Memberi jawaban atau penilaian untuk hiburan. :: Ketik pertanyaan atau hal yang ingin dinilai.
hilih/alay/besarkecil/balikhuruf/namaninja :: Mengubah gaya atau susunan teks. :: Tulis teks setelah nama efek.
afk/unafk :: Mengatur atau mengakhiri status AFK. :: Sertakan alasan saat AFK, lalu kirim .unafk saat kembali.
game/game list :: Membuka daftar permainan dan kategori. :: Pilih kategori untuk memulai ronde.
game buat :: Membuka ruang bermain di chat. :: Isi jumlah peserta 2–50 atau gunakan duel untuk dua orang.
game gabung/game keluar :: Masuk atau keluar dari ruang permainan. :: Kirim di chat tempat sesi dibuat.
game mulai :: Memulai ronde ruang. :: Pembuat sesi memilih kategori. Peserta membalas lewat .jawab.
game stop :: Menghentikan ruang bermain. :: Jalankan sebagai pembuat sesi atau admin.
game level/game kategori/game waktu :: Mengatur kesulitan, kategori, atau durasi ronde. :: Gunakan pada ruang aktif sebelum memulai ronde.
game riwayat :: Membaca riwayat permainanmu. :: Kirim di chat tempat bermain.
game ai :: Membuat soal baru bertema dengan GPT atau NVIDIA. :: Tulis topik. Ketik .hint untuk petunjuk dan .jawab di chat yang sama.
game acak/game komputer/game matematika :: Memulai soal dari bank permainan. :: Tentukan kategori dan tingkat kesulitan yang tersedia.
sinonim/antonim/anagram/tebakemoji/deretangka/asahotak/tebakpola/tebakkata/caklontong/family100/mathquiz :: Memulai ronde sesuai jenis teka-teki. :: Kirim nama permainan lalu balas .jawab di chat yang sama.
hint :: Melihat petunjuk ronde aktif. :: Kirim setelah permainan dimulai.
dailychallenge :: Memulai tantangan harian. :: Jawab sebelum waktu habis.
score/leaderboard :: Melihat XP pribadi atau peringkat. :: Aktifkan penyimpanan skor melalui pengaturan privasi jika diperlukan.
jawab :: Mengirim tebakan untuk ronde aktif. :: Ganti contoh dengan jawabanmu.
nyerah :: Menyerah dan membuka jawaban. :: Kirim di chat tempat ronde berlangsung.
privacy :: Mengatur penyimpanan skor permainan. :: Gunakan on untuk ikut atau off untuk menonaktifkan.
stats :: Melihat statistik aktivitas. :: Tambahkan periode yang didukung, misalnya week.
login :: Memverifikasi sesi admin. :: Dari DM nomor terdaftar, ketik .login lalu balas password, atau kirim .login <password>.
logout :: Mengunci sesi admin. :: Kirim di DM admin, termasuk saat membatalkan permintaan password.
owner :: Melihat identitas owner yang dikonfigurasi. :: Kirim tanpa argumen.
about/info :: Membaca informasi tentang bot. :: Kirim tanpa argumen.
menu/admin menu/admin :: Membuka menu yang sesuai akses pengirim. :: Ketik .menu lalu nomor untuk berpindah halaman.
help :: Membaca cara pakai suatu perintah. :: Tulis nama perintah atau subperintah setelah .help.
status/health/admin status :: Memeriksa kesiapan layanan bot. :: Buka di DM admin.
system :: Melihat penggunaan sumber daya server. :: Buka di DM admin.
dashboard/admin overview :: Melihat ringkasan operasional kelas dan bot. :: Buka di DM admin.
ping/runtime :: Memeriksa respons atau lama proses berjalan. :: Kirim di DM admin.
logs/errors :: Membaca log atau ringkasan kesalahan. :: Gunakan jumlah entri untuk logs dan periode untuk errors.
audit/admin audit :: Melihat jejak tindakan admin. :: Buka di DM admin.
backup/admin backup :: Memeriksa status backup. :: Gunakan status untuk melihat hasil yang tersedia.
storage :: Melihat informasi penyimpanan server. :: Buka di DM admin.
pair :: Memverifikasi kode bootstrap admin jika diterbitkan. :: Gunakan kode satu kali di DM; pairing perangkat WhatsApp dilakukan di VPS.
db status/whatsapp status/scheduler status :: Memeriksa database, koneksi WhatsApp, atau worker. :: Pilih layanan yang sedang diperiksa.
ai/ai models :: Melihat mode, penyedia, dan daftar model AI. :: Buka di DM admin.
ai model :: Memilih model sementara. :: Gunakan alias yang ditampilkan .ai models, misalnya luna.
ai auto/ai unpin :: Mengatur mode otomatis atau melepas pilihan sementara. :: Gunakan .ai auto on untuk kembali ke router otomatis.
ai test :: Menguji penyedia dan model yang menjawab. :: Sertakan pertanyaan singkat di DM admin.
groups/groups sources :: Menampilkan grup dan sumber yang dikenali. :: Periksa nama dan JID sebelum mengubah konfigurasi.
groups add :: Mendaftarkan grup sumber. :: Isi JID grup dan nama tampilan.
groups pause/groups resume/filter pause/filter resume :: Menjeda atau mengaktifkan pemrosesan grup. :: Masukkan JID grup yang dimaksud.
nimbrung/diam :: Mengatur balasan percakapan grup. :: Gunakan on, off, atau status; di grup, panggil bot sebagai owner atau admin grup saat mengubah mode.
setpjmk/setkelasa :: Menetapkan grup PJMK atau grup utama kelas. :: Masukkan JID yang sudah diverifikasi.
cekpesan :: Menilai isi pesan kelas. :: Masukkan teks yang ingin diperiksa.
filter status/filter review :: Memeriksa status filter atau item review. :: Pilih status untuk konfigurasi atau review untuk daftar.
digest :: Membaca ringkasan informasi kelas. :: Tentukan periode, misalnya today.
priority/pending/admin review :: Melihat item prioritas atau antrean persetujuan. :: Baca ID sebelum mengambil tindakan.
approve/reject/admin approve/admin reject :: Menyetujui atau menolak item review. :: Gunakan ID yang diberikan bot.
send/broadcast preview/broadcast send :: Menyiapkan pratinjau atau pengiriman berita kelas. :: Gunakan ID review, baca isi, dan ikuti konfirmasi dari bot.
confirm/cancel :: Menjalankan atau membatalkan tindakan yang menunggu konfirmasi. :: Ganti NONCE dengan kode terbaru dari DM bot.
relay list :: Melihat antrean relay antarkelompok. :: Jalankan di DM owner.
relay lihat/relay kirim/relay tolak :: Melihat, meneruskan, atau menolak satu relay. :: Gunakan ID pratinjau dalam DM owner.
admin pause/admin resume :: Menghentikan atau melanjutkan pengiriman keluar. :: Jalankan dari DM admin.
`.trim().split('\n');
const guides = new Map();
for (const row of rows) {
  const [keys, purpose, usage] = row.split(' :: ');
  if (!purpose || !usage) throw Error('Panduan kosong: ' + keys);
  for (const key of keys.split('/')) {
    if (guides.has(key)) throw Error('Panduan ganda: ' + key);
    guides.set(key, {purpose,usage});
  }
}
export function commandGuide(name) {
  const words = name.split(' ');
  while (words.length) {
    const guide = guides.get(words.join(' '));
    if (guide) return guide;
    words.pop();
  }
  throw Error('Belum ada panduan: ' + name);
}

export function lmsGuide() {
  const operations = [
    ['daftar <nomor> <NIM> <alias>', 'Mendaftarkan identitas mahasiswa', 'Owner terverifikasi menggunakan nomor dan NIM yang sudah diperiksa.'],
    ['hedy hubungkan <password LMS>', 'Mengaktifkan login otomatis', 'Gunakan sekali di DM jika nama cocok dengan daftar kelas. Nomor berasal dari pengirim.'],
    ['hedy hubungkan-nim <NIM> <password LMS>', 'Menghubungkan akun jika nama belum cocok', 'Ketik di DM. Gunakan NIM dan password akun sendiri.'],
    ['hedy setuju', 'Memberi izin baca LMS', 'Kirim dari nomor mahasiswa yang terdaftar.'],
    ['hedy login <password LMS>', 'Menghubungkan sesi mahasiswa', 'Ketik di DM bot. Gunakan password LMS milik sendiri.'],
    ['hedy', 'Membuka dashboard', 'Bentuk lengkapnya .lms hedy dashboard.'],
    ['hedy status', 'Memeriksa sesi, izin AI dan notifikasi', 'Kirim sebelum melakukan sinkronisasi.'],
    ['hedy matkul gerontik', 'Mencari mata kuliah', 'Kosongkan gerontik untuk semua matkul, atau ganti dengan kode, kelas atau pengampu.'],
    ['hedy detail gerontik', 'Membaca kartu mata kuliah', 'Gunakan nama atau ID yang muncul dalam daftar.'],
    ['hedy dosen gerontik', 'Melihat data pengampu', 'Ganti nama matkul dengan yang ingin diperiksa.'],
    ['hedy materi', 'Mendaftar materi', 'Tambahkan nama matkul atau page 2 untuk halaman berikut.'],
    ['hedy materi list ENTR2.3', 'Memfilter isi kelas', 'Gunakan kode dari dashboard sendiri.'],
    ['hedy materi terbaru', 'Mengurutkan materi terbaru', 'Tanggal LMS atau waktu pertama terdeteksi menentukan urutan.'],
    ['hedy materi baru', 'Melihat materi yang belum ditampilkan atau dikirim bot', 'Jalankan di DM setelah sinkronisasi.'],
    ['hedy materi cari penelitian', 'Mencari metadata dan teks materi', 'Alias .lms hedy cari materi penelitian. Tambahkan page 2 untuk kelompok dokumen berikutnya.'],
    ['hedy materi detail <ID>', 'Memeriksa sumber dan metadata', 'Salin ID dari daftar materi.'],
    ['hedy materi kirim <ID>', 'Mengunduh dan mengirim lampiran ke DM sendiri', 'Alias .lms hedy materi download <ID>. Tambahkan nomor file jika ada beberapa lampiran.'],
    ['hedy tugas', 'Mendaftar tugas akademik', 'Tambahkan matkul, pending, selesai, atau terbaru sebagai filter.'],
    ['hedy tugas cari makalah', 'Mencari tugas', 'Ganti makalah dengan kata kunci.'],
    ['hedy tugas detail <ID>', 'Membuka rincian tugas', 'Gunakan ID dari daftar tugas.'],
    ['hedy deadline', 'Melihat tenggat dari LMS', 'Hanya tugas dengan tenggat yang terbaca yang ditampilkan.'],
    ['hedy kuis aktif', 'Mencari evaluasi di LMS', 'Gunakan kuis, kuis terbaru, kuis <matkul>, atau kuis detail <ID>.'],
    ['hedy sync', 'Menyinkronkan akun', 'Bisa juga memakai .lms sync hedy atau .lms sync now.'],
    ['sync status', 'Memeriksa penjadwal akun', 'Gunakan sync pause untuk menjeda, sync resume untuk melanjutkan, atau sync history untuk riwayat.'],
    ['hedy notif on', 'Menerima notifikasi perubahan pribadi', 'Ganti on dengan off untuk menonaktifkan.'],
    ['hedy ai on', 'Mengizinkan penggunaan kutipan materi oleh AI', 'Ganti on dengan off untuk mencabut izin.'],
    ['hedy ask Apa itu mobilisasi?', 'Bertanya berdasarkan dokumen', 'Gunakan kata kunci materi yang sudah terindeks.'],
    ['hedy summarize <ID>', 'Merangkum materi tertentu', 'Salin ID dokumen yang bisa diekstrak.'],
    ['hedy flashcard gerontik', 'Membuat kartu belajar', 'Ganti gerontik dengan topik dari materi.'],
    ['hedy quiz belajar gerontik', 'Membuat latihan pribadi', 'Jawaban dikirim ke chat; bot tidak mengerjakan kuis kampus.'],
    ['hedy logout', 'Mencabut akses dan menghapus cache sesi', 'Alias .lms hedy cabut dan .lms hedy hapus.'],
  ];
  return ['Ganti `hedy` dengan alias yang didaftarkan. Mulai dari DM atau grup. Kirim kredensial dan pengaturan hanya di DM.', '',
    '| Pesan WhatsApp | Kegunaan | Cara menggunakan |','| --- | --- | --- |',
    ...operations.map(([command,purpose,usage])=>'| `.lms '+command+'` | '+purpose+' | '+usage+' |')];
}
