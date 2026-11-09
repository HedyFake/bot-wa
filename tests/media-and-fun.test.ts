import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminAuthenticator } from '../src/admin/authentication/authenticator.js';
import { ConfirmationManager } from '../src/admin/authorization/confirmation.js';
import { CommandDispatcher } from '../src/admin/commands/dispatcher.js';
import { GroupIntelligenceService } from '../src/ai/classification/group-intelligence.js';
import { ModelRouter } from '../src/ai/model-router/router.js';
import { loadConfig } from '../src/config/env.js';
import { FunAndUtilityService } from '../src/modules/fun/fun-utility-service.js';
import { MediaService } from '../src/modules/media/media-service.js';
import { ScheduleService } from '../src/modules/schedule/service.js';
import { MockWhatsAppProvider } from '../src/whatsapp/adapters/mock.js';
import { OutboundGate } from '../src/whatsapp/outbound/gate.js';

describe('Verifikasi Password Admin Interaktif (hedyfake) & Nomor Admin 082233038659', () => {
  it('meminta password saat admin 082233038659 pertama kali chat, menolak password salah, menerima hedyfake, dan menjalankan command tertunda', async () => {
    const config = loadConfig({
      OWNER_WHATSAPP: '082233038659',
      ADMIN_PASSWORD: 'hedyfake',
      ADMIN_REQUIRE_PASSWORD: 'true',
      OUTBOUND_ENABLED: 'true',
      DRY_RUN: 'true',
    });
    const wa = new MockWhatsAppProvider();
    await wa.connect();
    const outbound = new OutboundGate({
      provider: wa,
      outboundEnabled: true,
      dryRun: true,
    });
    const auth = new AdminAuthenticator({
      ownerE164: config.OWNER_WHATSAPP,
      adminAllowlistE164: config.ADMIN_WHATSAPP_ALLOWLIST,
      adminPassword: config.ADMIN_PASSWORD,
      requirePassword: config.ADMIN_REQUIRE_PASSWORD,
    });
    const dispatcher = new CommandDispatcher({
      config,
      whatsapp: wa,
      outbound,
      auth,
      confirmations: new ConfirmationManager(),
      router: new ModelRouter(),
      schedule: new ScheduleService(),
      intelligence: new GroupIntelligenceService(),
      startedAt: new Date('2026-11-06T00:00:00Z'),
    });

    const hedyMsg = (id: string, text: string) => ({
      providerMessageId: id,
      chatJid: '6282233038659@s.whatsapp.net',
      chatType: 'private' as const,
      senderJid: '6282233038659@s.whatsapp.net',
      text,
      receivedAt: new Date(),
    });

    // 1. Admin mengirim .dashboard -> bot meminta password terlebih dahulu
    const step1 = await dispatcher.handleInbound(hedyMsg('m1', '.dashboard'));
    expect(step1).toContain('Verifikasi Password Admin');

    // 2. Admin membalas password yang salah -> ditolak
    const step2 = await dispatcher.handleInbound(hedyMsg('m2', 'passwordsalah'));
    expect(step2).toContain('Password salah');

    // 3. Pengirim dengan JID @lid atau variasi penulisan 'password "hedyfake"' / 'Hedyfake' diterima di chat pribadi
    const lidVer = auth.verifyAdminPassword(
      {
        chatType: 'private',
        chatJid: '184729182374819@lid',
        senderJid: '184729182374819@s.whatsapp.net',
      },
      'password "Hedyfake"',
    );
    expect(lidVer.ok).toBe(false);
    expect(lidVer.reason).toBe('not_in_allowlist');

    // 4. Admin 082233038659 membalas '"hedyfake"' -> berhasil & otomatis menampilkan .dashboard yang tertunda
    const step3 = await dispatcher.handleInbound(hedyMsg('m3', '"hedyfake"'));
    expect(step3).toContain('Password Admin Terverifikasi');
    expect(step3).toContain('DASHBOARD HDYBOT');

    // 5. Command berikutnya langsung berjalan tanpa ditanya password lagi
    const step4 = await dispatcher.handleInbound(hedyMsg('m4', '.status'));
    expect(step4).toContain('Health & Ready Check');

    // 6. Semua grup otomatis memiliki allow access untuk melihat fitur (.menu, .dashboard, .jadwal, .owner, .groups)
    const groupMenu = await dispatcher.handleInbound({
      providerMessageId: 'grp-allow-1',
      chatJid: '120363999888777@g.us',
      chatType: 'group',
      chatName: 'Grup Diskusi Umum',
      senderJid: '6281111222233@s.whatsapp.net',
      text: '.dashboard',
      receivedAt: new Date(),
    });
    expect(groupMenu).toBeNull();
    for (const cmd of ['.health', '.ai status', '.logs 20', '.db status', '.drive status', '.runtime', '.storage', '.scheduler status']) {
      expect(await dispatcher.handleInbound({ ...hedyMsg('denied-' + cmd, cmd), chatJid: 'private-monitor@g.us', chatType: 'group', isGroupAdmin: true })).toBeNull();
    }

    // 7. Admin melakukan .logout -> sesi terkunci kembali
    const step5 = await dispatcher.handleInbound(hedyMsg('m5', '.logout'));
    expect(step5).toContain('dikunci');
    const step6 = await dispatcher.handleInbound(hedyMsg('m6', '.dashboard'));
    expect(step6).toContain('Verifikasi Password Admin');
  });
});

describe('MediaService & Command Media/Stiker/QR/PDF/Utilitas/Fun', () => {
  it('membuat stiker WebP (.ttp & .sticker), konversi .toimg, efek gambar, QR code PNG, dan dokumen PDF DRAFT', async () => {
    const media = new MediaService();

    // 1. Stiker teks (.ttp)
    const stickerWebp = await media.textToSticker('Semangat Kelas 5A!');
    expect(stickerWebp.byteLength).toBeGreaterThan(100);

    // 2. Konversi stiker WebP -> PNG (.toimg)
    const pngFromSticker = await media.stickerToPng(stickerWebp);
    expect(pngFromSticker.subarray(1, 4).toString('ascii')).toBe('PNG');

    // 3. Konversi PNG -> stiker WebP (.sticker)
    const reSticker = await media.imageToSticker(pngFromSticker);
    expect(reSticker.byteLength).toBeGreaterThan(100);

    // 4. Efek gambar (.grayscale, .invert, .blur)
    const gray = await media.applyImageEffect(pngFromSticker, 'grayscale');
    expect(gray.mimeType).toBe('image/png');
    expect(gray.data.byteLength).toBeGreaterThan(100);

    // 5. Quote Card & Schedule Card
    const quotePng = await media.generateQuoteCard('Merawat dengan hati', 'Hedy');
    expect(quotePng.subarray(1, 4).toString('ascii')).toBe('PNG');

    const schedPng = await media.generateScheduleCard('JADWAL SENIN', ['08:00 Metodologi Penelitian']);
    expect(schedPng.subarray(1, 4).toString('ascii')).toBe('PNG');

    // 6. QR Code PNG
    const qrPng = await media.generateQrCodePng('https://integrate.api.nvidia.com');
    expect(qrPng.subarray(1, 4).toString('ascii')).toBe('PNG');

    // 7. PDF Generator & Inspector
    const pdfBuf = await media.generatePdfDocument({
      title: 'Laporan Praktikum Keperawatan Gerontik',
      subtitle: 'Nursing Class A — Semester 5A',
      bodyLines: ['1. Pengkajian lansia', '2. Diagnosis keperawatan', '3. Intervensi dan evaluasi'],
    });
    const info = await media.inspectPdf(pdfBuf);
    expect(info.pageCount).toBe(1);
  });

  it('menjalankan fitur tugas, reminder, kalkulator, konversi, URL check SSRF, dan permainan aman Akira', async () => {
    const fun = new FunAndUtilityService();

    // Tugas CRUD
    const t = fun.addAssignment({
      course: 'Entrepreneurship 2',
      title: 'Business Plan Kesehatan',
      dueDateIso: '2026-11-25',
      description: 'Presentasi kelompok',
      createdBy: 'Hedy',
    });
    expect(fun.listAssignments().some((x) => x.id === t.id)).toBe(true);
    expect(fun.completeAssignment(t.id)?.status).toBe('done');
    expect(fun.deleteAssignment(t.id)).toBe(true);

    // Kalkulator & Konversi
    expect(fun.evaluateMath('(120 * 3) / 4 + 10')).toEqual({ ok: true, result: 100 });
    expect(fun.convertUnit(37, 'c', 'f')).toContain('98.60 °F');
    expect(fun.convertUnit(5, 'km', 'm')).toContain('5000 m');

    // SSRF Guard pada .urlcheck
    expect(fun.checkUrlSafety('https://id.wikipedia.org/wiki/Keperawatan')).toContain('AMAN');
    expect(fun.checkUrlSafety('http://127.0.0.1:3000/secret')).toContain('Ditolak SSRF Guard');

    // Kuis interaktif & transformasi teks
    const qStart = fun.startQuiz('chat-1', 'mathquiz');
    expect(qStart).toContain('Kuis Matematika');
    expect(fun.giveUpQuiz('chat-1')).toContain('Jawaban yang benar');
    expect(fun.transformText('hilih', 'Selamat Pagi Kelas')).toBe('Silimit Pigi Kilis');
  });

  async function setupGroup() {
    const config = loadConfig({
      OWNER_WHATSAPP: '082233038659',
      ADMIN_PASSWORD: 'hedyfake',
      ADMIN_REQUIRE_PASSWORD: 'true',
      WHATSAPP_PRIMARY_GROUP_JID: 'nursing-class-a@g.us',
      OUTBOUND_ENABLED: 'true',
      DRY_RUN: 'false',
    });
    const wa = new MockWhatsAppProvider();
    await wa.connect();
    const outbound = new OutboundGate({
      provider: wa,
      outboundEnabled: true,
      dryRun: false,
      allowedGroupJids: ['nursing-class-a@g.us'],
    });
    const auth = new AdminAuthenticator({
      ownerE164: config.OWNER_WHATSAPP,
      adminAllowlistE164: config.ADMIN_WHATSAPP_ALLOWLIST,
      adminPassword: config.ADMIN_PASSWORD,
      requirePassword: true,
    });
    const confirmations = new ConfirmationManager();
    const router = new ModelRouter({
      transport: {
        complete: async (req) => {
          const last = req.messages[req.messages.length - 1]?.content;
          const userMsg = typeof last === 'string' ? last : '';
          if (userMsg.includes('PJMK')) {
            return {
              content:
                'Kuliah Metodologi Penelitian (Ns. Rina, M.Kep) dipindahkan ke hari Rabu pukul 13.00 WIB di Ruang Lab 2 dan tugas dikumpulkan sebelum kelas dimulai.',
            };
          }
          return {
            content: 'Halo Bos Hedy & teman-teman Nursing Class A! Siap nimbrung dan bantu diskusi kuliah Semester 5A!',
          };
        },
      },
    });
    const schedule = new ScheduleService();
    const intelligence = new GroupIntelligenceService({ primaryGroupJid: 'nursing-class-a@g.us' });
    intelligence.registerPjmkGroup('pjmk-sem5@g.us');

    const dispatcher = new CommandDispatcher({
      config,
      whatsapp: wa,
      outbound,
      auth,
      confirmations,
      router,
      schedule,
      intelligence,
      startedAt: new Date('2026-11-06T00:00:00Z'),
    });

    return { dispatcher, wa, config };
  }

  afterEach(() => vi.restoreAllMocks());

  it('menangani sapaan anggota serta kontrol nimbrung dan diam dari owner', async () => {
    const { dispatcher, wa } = await setupGroup();
    // 1. Pesan tidak penting di grup dari anggota biasa -> Bot WAJIB DIAM (null)
    const casual1 = await dispatcher.handleInbound({
      providerMessageId: 'grp-casual-1',
      chatJid: 'nursing-class-a@g.us',
      chatType: 'group',
      chatName: 'Nursing Class A',
      senderJid: '628111222333@s.whatsapp.net',
      text: 'wkwk lapar nih kantin yuk habis ini',
      receivedAt: new Date(),
    });
    expect(casual1).toBeNull();

    // Anggota biasa menyuruh bot nimbrung -> Bot TETAP DIAM karena bukan Owner/Admin
    const nonAdminOrder = await dispatcher.handleInbound({
      providerMessageId: 'grp-nonadmin-1',
      chatJid: 'nursing-class-a@g.us',
      chatType: 'group',
      chatName: 'Nursing Class A',
      senderJid: '628111222333@s.whatsapp.net',
      isGroupAdmin: false,
      text: 'bot ikut nimbrung dong',
      receivedAt: new Date(),
    });
    expect(nonAdminOrder).toBeNull();

    // 2. Owner (082233038659) menyenggol / mentag bot atau mengajak nongkrong -> Bot IKUT NIMBRUNG dengan AI
    const ownerTag = await dispatcher.handleInbound({
      providerMessageId: 'grp-owner-tag-1',
      chatJid: 'nursing-class-a@g.us',
      chatType: 'group',
      chatName: 'Nursing Class A',
      senderJid: '6282233038659@s.whatsapp.net',
      pushName: 'Hedy',
      isBotMentioned: true,
      text: '@hdybot bot ikut nimbrung dan ngajak nongkrong sini di grup',
      receivedAt: new Date(),
    });
    expect(ownerTag).toContain('Halo');
    expect(ownerTag).not.toMatch(/NOTIFIKASI|HdyBot Nimbrung|Filter AI/);
    expect(dispatcher.isNimbrungActive('nursing-class-a@g.us')).toBe(true);

    // 3. Saat mode nimbrung aktif, bot merespons obrolan anggota secara lancar dan memberi notif BOT AI AKTIF
    const badChat = await dispatcher.handleInbound({
      providerMessageId: 'grp-bad-1',
      chatJid: 'nursing-class-a@g.us',
      chatType: 'group',
      chatName: 'Nursing Class A',
      senderJid: '628111222333@s.whatsapp.net',
      text: 'dasar goblok tolol',
      receivedAt: new Date(),
    });
    expect(badChat).toBeNull();

    const goodChat = await dispatcher.handleInbound({
      providerMessageId: 'grp-good-1',
      chatJid: 'nursing-class-a@g.us',
      chatType: 'group',
      chatName: 'Nursing Class A',
      senderJid: '628111222333@s.whatsapp.net',
      pushName: 'Siti',
      text: 'Teman-teman, semangat belajar untuk persiapan praktikum besok ya',
      receivedAt: new Date(),
    });
    expect(goodChat).toBeNull();

    const memberFollowUp = await dispatcher.handleInbound({
      providerMessageId: 'grp-good-2',
      chatJid: 'nursing-class-a@g.us',
      chatType: 'group',
      chatName: 'Nursing Class A',
      senderJid: '628555666777@s.whatsapp.net',
      pushName: 'Rizky',
      text: 'Halo bot, besok kuliah apa aja ya?',
      receivedAt: new Date(),
    });
    expect(memberFollowUp).toMatch(/^\*MK /);
    expect(memberFollowUp).not.toMatch(/NOTIFIKASI|Filter AI/);
    expect(wa.sent.at(-1)).toMatchObject({ quotedMessageId: 'grp-good-2', mentionedJids: ['628555666777@s.whatsapp.net'] });
    expect(await dispatcher.handleInbound({ providerMessageId: 'repeat', chatType: 'group', chatJid: 'nursing-class-a@g.us', senderJid: '628555666777@s.whatsapp.net', text: 'Halo bot, besok kuliah apa aja ya?', receivedAt: new Date() })).toBeNull();

    // 4. Owner bilang "bot berhenti" -> Bot berhenti nimbrung dan kembali diam
    const stopMsg = await dispatcher.handleInbound({
      providerMessageId: 'grp-owner-stop-1',
      chatJid: 'nursing-class-a@g.us',
      chatType: 'group',
      chatName: 'Nursing Class A',
      senderJid: '6282233038659@s.whatsapp.net',
      text: 'bot berhenti',
      receivedAt: new Date(),
    });
    expect(stopMsg).toContain('berhenti nongkrong');
    expect(dispatcher.isNimbrungActive('nursing-class-a@g.us')).toBe(false);

    // Setelah berhenti, chat santai kembali diabaikan (diam)
    const casualAfterStop = await dispatcher.handleInbound({
      providerMessageId: 'grp-casual-2',
      chatJid: 'nursing-class-a@g.us',
      chatType: 'group',
      chatName: 'Nursing Class A',
      senderJid: '628111222333@s.whatsapp.net',
      text: 'hehe siap makasih infonya',
      receivedAt: new Date(),
    });
    expect(casualAfterStop).toBeNull();

  });

  it('memerlukan persetujuan Hedy sebelum mengirim relay PJMK', async () => {
    const { dispatcher, wa, config } = await setupGroup();
    const pjmkImportant = await dispatcher.handleInbound({
      providerMessageId: 'pjmk-msg-1',
      chatJid: 'pjmk-sem5@g.us',
      chatType: 'group',
      chatName: 'PJMK Semester 5',
      senderJid: '628999888777@s.whatsapp.net',
      text: 'Info penting dari Dosen Ns. Rina: perubahan jadwal kuliah Metodologi Penelitian pindah jam ke hari Rabu pukul 13:00 WIB di Ruang Lab 2, dan tugas baru dikumpulkan sebelum kuliah.',
      receivedAt: new Date(),
    });
    expect(pjmkImportant).toBeNull();
    const preview = wa.sent.at(-1)!;
    expect(preview.chatJid).toBe('6282233038659@s.whatsapp.net');
    expect(preview.text).toContain('boleh saya kirim');
    const id = preview.text.match(/\.relay kirim (\w+)/)![1];
    const dm = (msgId: string, text: string) => ({providerMessageId: msgId, chatType: 'private' as const, chatJid: preview.chatJid, senderJid: preview.chatJid, text, receivedAt: new Date()});
    expect(await dispatcher.handleInbound({...dm('spoof',' .relay kirim ' + id), chatType:'group', chatJid:'lain@g.us'})).toBeNull();
    await dispatcher.handleInbound(dm('login-relay','.login ' + config.ADMIN_PASSWORD));
    expect(await dispatcher.handleInbound({ ...dm('approval','ya'), quoted: { providerMessageId: 'mock-out-' + wa.sent.findIndex(m => m === preview) } })).not.toContain('sudah dikirim');
    const previewNumber = wa.sent.indexOf(preview) + 1;
    expect(await dispatcher.handleInbound({ ...dm('approval-quoted','ya'), quoted: { providerMessageId: 'mock-out-' + previewNumber } })).toContain('sudah dikirim');
    expect(await dispatcher.handleInbound(dm('repeat-approval','.relay kirim ' + id))).toContain('sudah diproses');
    expect(wa.sent.filter(m => m.chatJid === 'nursing-class-a@g.us' && m.text.startsWith('Info penting dari Dosen'))).toHaveLength(1);

    await dispatcher.handleInbound({providerMessageId:'pjmk-msg-2',chatType:'group',chatJid:'pjmk-sem5@g.us',senderJid:'628999888777@s.whatsapp.net',text:'Info penting: jadwal ujian besok pukul 10.00 di ruang kelas.',receivedAt:new Date()});
    const secondPreview = wa.sent.at(-1)!;
    const secondId = secondPreview.text.match(/\.relay kirim (\w+)/)![1];
    const stranger = { ...dm('foreign',' .relay kirim ' + secondId), senderJid:'628555111777@s.whatsapp.net', chatJid:'628555111777@s.whatsapp.net' };
    expect(await dispatcher.handleInbound(stranger)).toContain('Akses ditolak');
    expect(await dispatcher.handleInbound(dm('deny',' .relay tolak ' + secondId))).toContain('tidak diteruskan');
    expect(await dispatcher.handleInbound(dm('deny-replay','.relay kirim ' + secondId))).toContain('sudah diproses');
    expect(wa.sent.filter(m => m.chatJid === 'nursing-class-a@g.us' && m.text.startsWith('Info penting: jadwal ujian'))).toHaveLength(0);

  });

  it('menampilkan pengurus, anggota, dan dosen dari data kelas', async () => {
    const { dispatcher } = await setupGroup();
    const officersReply = await dispatcher.handleInbound({
      providerMessageId: 'grp-officers-1',
      chatJid: 'nursing-class-a@g.us',
      chatType: 'group',
      chatName: 'Nursing Class A',
      senderJid: '628111222333@s.whatsapp.net',
      text: '.pengurus',
      receivedAt: new Date(),
    });
    expect(officersReply).toContain('Hedi webiyanto');
    expect(officersReply).toContain('Claudia, Velsy');
    expect(officersReply).toContain('sesilia, Suci');
    expect(officersReply).toContain('Gracia, Dina');
    expect(officersReply).toContain('Ester, Meri');
    expect(officersReply).toContain('Meita, Regina');
    expect(officersReply).toContain('Revalina, Alfina');
    expect(officersReply).toContain('Inneke, Fitri');
    expect(officersReply).toContain('rika, Imel');

    const membersReply = await dispatcher.handleInbound({
      providerMessageId: 'grp-members-1',
      chatJid: 'nursing-class-a@g.us',
      chatType: 'group',
      chatName: 'Nursing Class A',
      senderJid: '628111222333@s.whatsapp.net',
      text: '.anggota',
      receivedAt: new Date(),
    });
    expect(membersReply).toContain('36 Mahasiswa');
    expect(membersReply).toContain('Ayu Wulandari');
    expect(membersReply).toContain('2024030003');
    expect(membersReply).toContain('Mochammad Hedy Wibianto');
    expect(membersReply).toContain('2024030025');
    expect(membersReply).toContain('Chlaudya Rumlety');
    expect(membersReply).toContain('2024030115');

    const lecturersReply = await dispatcher.handleInbound({
      providerMessageId: 'grp-lecturers-1',
      chatJid: 'nursing-class-a@g.us',
      chatType: 'group',
      chatName: 'Nursing Class A',
      senderJid: '628111222333@s.whatsapp.net',
      text: '.dosen',
      receivedAt: new Date(),
    });
    expect(lecturersReply).toContain('23 Dosen');
    expect(lecturersReply).toContain('Aditya Nuraminudin Aziz');
    expect(lecturersReply).toContain('08563303549');
    expect(lecturersReply).toContain('Gilang Akbar Shobirin');
    expect(lecturersReply).toContain('082226608763');

  });

  it('mengirim hasil jurnal dan lampiran PDF dari respons indeks uji', async () => {
    const { dispatcher, wa } = await setupGroup();
    const request = vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
      if (String(input).startsWith('https://www.ebi.ac.uk/')) {
        return Response.json({resultList:{result:[{title:'Artikel gerontik uji', authorString:'Tim Uji', pubYear:'2026', doi:'10.1234/test'}]}});
      }
      return Response.json({message:{items:[]}});
    });
    const journalReply = await dispatcher.handleInbound({
      providerMessageId: 'grp-journal-1',
      chatJid: 'nursing-class-a@g.us',
      chatType: 'group',
      chatName: 'Nursing Class A',
      senderJid: '628111222333@s.whatsapp.net',
      text: '.jurnal asuhan keperawatan gerontik hipertensi',
      receivedAt: new Date(),
    });
    expect(journalReply).toContain('PENCARIAN JURNAL ILMIAH AI & GOOGLE SCHOLAR');
    expect(journalReply).toContain('https://scholar.google.com/scholar');
    const sentJournalPdf = wa.sent.find(
      (s) => s.chatJid === 'nursing-class-a@g.us' && s.media?.mimeType === 'application/pdf',
    );
    expect(sentJournalPdf?.media?.data.subarray(0,4).toString()).toBe('%PDF');
    expect(request).toHaveBeenCalled();
    expect(journalReply).toContain('Artikel gerontik uji');
  });

  it('mengirim PNG saat pencarian gambar tidak menemukan hasil', async () => {
    const { dispatcher, wa } = await setupGroup();
    const request = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => Response.json({query:{pages:{}}}));

    const imageReply = await dispatcher.handleInbound({
      providerMessageId: 'grp-image-1',
      chatJid: 'nursing-class-a@g.us',
      chatType: 'group',
      chatName: 'Nursing Class A',
      senderJid: '628111222333@s.whatsapp.net',
      text: '.gambar anatomi jantung manusia',
      receivedAt: new Date(),
    });
    expect(imageReply).toContain('anatomi jantung manusia');
    const sentImage = wa.sent.find(
      (s) => s.chatJid === 'nursing-class-a@g.us' && s.media?.mimeType === 'image/png',
    );
    expect(request).toHaveBeenCalled();
    expect(sentImage?.media?.data.subarray(1,4).toString()).toBe('PNG');
  });
});
