import { describe, expect, it } from 'vitest';
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

    // 3. Nomor asing mencoba mengirim password hedyfake -> ditolak karena bukan nomor admin 082233038659
    const strangerVer = auth.verifyAdminPassword(
      {
        chatType: 'private',
        chatJid: '6281111222233@s.whatsapp.net',
        senderJid: '6281111222233@s.whatsapp.net',
      },
      'hedyfake',
    );
    expect(strangerVer.ok).toBe(false);
    expect(strangerVer.reason).toBe('not_admin_number');

    // 4. Admin 082233038659 membalas "hedyfake" -> berhasil & otomatis menampilkan .dashboard yang tertunda
    const step3 = await dispatcher.handleInbound(hedyMsg('m3', 'hedyfake'));
    expect(step3).toContain('Password Admin Terverifikasi');
    expect(step3).toContain('DASHBOARD HDYBOT');

    // 5. Command berikutnya langsung berjalan tanpa ditanya password lagi
    const step4 = await dispatcher.handleInbound(hedyMsg('m4', '.status'));
    expect(step4).toContain('Health & Ready Check');

    // 6. Admin melakukan .logout -> sesi terkunci kembali
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
});
