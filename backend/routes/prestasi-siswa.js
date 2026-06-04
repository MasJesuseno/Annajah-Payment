const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const nodemailer = require('nodemailer');
const { getDatabase } = require('../database');
const { getSettings } = require('../helpers/pdfHelpers');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// ─── Default Piagam Template Settings ───
const DEFAULT_PIAGAM_SETTINGS = {
  judul_piagam: 'PIAGAM PENGHARGAAN',
  subtitle_piagam: 'Diberikan kepada:',
  teks_prestasi: 'Telah berhasil meraih prestasi',
  kutipan: '\"Sesungguhnya bersama kesulitan ada kemudahan\" (QS. Al-Insyirah: 6)',
  warna_aksen: '#D4A853',
  warna_teks_judul: '#D4A853',
  warna_teks_utama: '#1C1917',
  ukuran_judul: '22',
  ukuran_nama: '28',
  tampilkan_logo: '1',
  tampilkan_kutipan: '1',
  tampilkan_footer: '1',
  alignment: 'center',
};

async function getPiagamSettings(db) {
  const [settings] = await db.execute(
    "SELECT `key`, `value` FROM pengaturan WHERE `key` LIKE 'prestasi_piagam_%'"
  );
  const result = {};
  for (const s of settings) {
    result[s.key.replace('prestasi_piagam_', '')] = s.value;
  }
  return { ...DEFAULT_PIAGAM_SETTINGS, ...result };
}

// ─── Konfigurasi Multer untuk Upload Foto ───
const fotoDir = path.join(__dirname, '..', 'uploads', 'prestasi');
if (!fs.existsSync(fotoDir)) {
  fs.mkdirSync(fotoDir, { recursive: true });
}

const fotoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, fotoDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `prestasi_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`);
  },
});

const uploadFoto = multer({
  storage: fotoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Format foto tidak didukung. Gunakan JPG, PNG, GIF, atau WebP.'));
    }
    cb(null, true);
  },
});

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

// GET /rekap — Statistik dan ringkasan prestasi siswa
router.get('/rekap', async (req, res) => {
  try {
    const db = await getDatabase();

    // 1. Ringkasan umum
    const [totalRow] = await db.execute(`
      SELECT
        COUNT(*) AS total_prestasi,
        COUNT(DISTINCT id_siswa) AS total_siswa,
        COUNT(DISTINCT CONCAT(penyelenggara, nama_agenda)) AS total_agenda,
        COUNT(DISTINCT penyelenggara) AS total_penyelenggara
      FROM prestasi_siswa
    `);

    // 2. Per bulan (12 bulan terakhir)
    const [perBulan] = await db.execute(`
      SELECT
        DATE_FORMAT(tanggal, '%Y-%m') AS bulan,
        COUNT(*) AS jumlah
      FROM prestasi_siswa
      WHERE tanggal >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(tanggal, '%Y-%m')
      ORDER BY bulan ASC
    `);

    // 3. Jenis prestasi (distribution)
    const [jenisPrestasi] = await db.execute(`
      SELECT prestasi, COUNT(*) AS jumlah
      FROM prestasi_siswa
      GROUP BY prestasi
      ORDER BY jumlah DESC
      LIMIT 15
    `);

    // 4. Top siswa berprestasi (top 10)
    const [topSiswa] = await db.execute(`
      SELECT p.id_siswa, s.nis, s.nama AS nama_siswa, k.nama_kelas,
        COUNT(*) AS jumlah
      FROM prestasi_siswa p
      JOIN siswa s ON s.id = p.id_siswa
      LEFT JOIN kelas k ON k.id = s.id_kelas
      GROUP BY p.id_siswa
      ORDER BY jumlah DESC
      LIMIT 10
    `);

    // 5. Per penyelenggara (top 10)
    const [topPenyelenggara] = await db.execute(`
      SELECT penyelenggara, COUNT(*) AS jumlah
      FROM prestasi_siswa
      GROUP BY penyelenggara
      ORDER BY jumlah DESC
      LIMIT 10
    `);

    res.json({
      ringkasan: {
        total_prestasi: totalRow[0].total_prestasi,
        total_siswa: totalRow[0].total_siswa,
        total_agenda: totalRow[0].total_agenda,
        total_penyelenggara: totalRow[0].total_penyelenggara,
      },
      per_bulan: perBulan,
      jenis_prestasi: jenisPrestasi,
      top_siswa: topSiswa,
      top_penyelenggara: topPenyelenggara,
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat rekap prestasi', error: error.message });
  }
});

// GET /piagam-settings — Ambil pengaturan template piagam
router.get('/piagam-settings', async (req, res) => {
  try {
    const db = await getDatabase();
    const settings = await getPiagamSettings(db);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat pengaturan piagam', error: error.message });
  }
});

// PUT /piagam-settings — Simpan pengaturan template piagam
router.put('/piagam-settings', async (req, res) => {
  try {
    const db = await getDatabase();
    const allowedFields = ['judul_piagam', 'subtitle_piagam', 'teks_prestasi', 'kutipan',
      'warna_aksen', 'warna_teks_judul', 'warna_teks_utama',
      'ukuran_judul', 'ukuran_nama', 'tampilkan_logo', 'tampilkan_kutipan', 'tampilkan_footer',
      'alignment'];

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const upsertSql = 'INSERT INTO pengaturan (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)';

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          await conn.execute(upsertSql, [`prestasi_piagam_${field}`, String(req.body[field])]);
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    res.json({ message: 'Pengaturan template piagam berhasil disimpan' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menyimpan pengaturan piagam', error: error.message });
  }
});

// GET /export-excel — Export data prestasi ke Excel
router.get('/export-excel', async (req, res) => {
  try {
    const db = await getDatabase();
    const { search, id_siswa, penyelenggara, tanggal_mulai, tanggal_selesai } = req.query;

    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(s.nama LIKE ? OR s.nis LIKE ? OR p.nama_agenda LIKE ? OR p.prestasi LIKE ? OR p.penyelenggara LIKE ?)');
      const q = `%${search}%`;
      params.push(q, q, q, q, q);
    }
    if (id_siswa) {
      conditions.push('p.id_siswa = ?');
      params.push(id_siswa);
    }
    if (penyelenggara) {
      conditions.push('p.penyelenggara LIKE ?');
      params.push(`%${penyelenggara}%`);
    }
    if (tanggal_mulai) {
      conditions.push('p.tanggal >= ?');
      params.push(tanggal_mulai);
    }
    if (tanggal_selesai) {
      conditions.push('p.tanggal <= ?');
      params.push(tanggal_selesai);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await db.execute(`
      SELECT p.id, p.tanggal, p.id_siswa, p.penyelenggara, p.nama_agenda, p.prestasi, p.foto, p.created_at,
        s.nis, s.nama AS nama_siswa, k.nama_kelas
      FROM prestasi_siswa p
      JOIN siswa s ON s.id = p.id_siswa
      LEFT JOIN kelas k ON k.id = s.id_kelas
      ${whereClause}
      ORDER BY p.tanggal DESC, p.id DESC
    `, params);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Prestasi Siswa');

    const columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'NIS', key: 'nis', width: 14 },
      { header: 'Nama Siswa', key: 'nama_siswa', width: 30 },
      { header: 'Kelas', key: 'kelas', width: 14 },
      { header: 'Tanggal', key: 'tanggal', width: 16 },
      { header: 'Penyelenggara', key: 'penyelenggara', width: 25 },
      { header: 'Nama Agenda', key: 'nama_agenda', width: 30 },
      { header: 'Prestasi', key: 'prestasi', width: 18 },
    ];

    sheet.columns = columns;

    // Style header
    const headerRow = sheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    // Data rows
    rows.forEach((r, i) => {
      const row = sheet.addRow({
        no: i + 1,
        nis: r.nis,
        nama_siswa: r.nama_siswa,
        kelas: r.nama_kelas || '-',
        tanggal: r.tanggal ? new Date(r.tanggal).toLocaleDateString('id-ID') : '-',
        penyelenggara: r.penyelenggara,
        nama_agenda: r.nama_agenda,
        prestasi: r.prestasi,
      });
      row.height = 22;
      row.eachCell((cell, colIdx) => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' },
        };
        cell.alignment = { vertical: 'middle', horizontal: colIdx === 0 ? 'center' : 'left' };
        // Zebra striping
        if (i % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        }
      });
    });

    // Footer
    const footerRow = sheet.addRow({
      no: '', nis: '', nama_siswa: '', kelas: '', tanggal: '',
      penyelenggara: '', nama_agenda: '',
      prestasi: `Total: ${rows.length} prestasi`
    });
    footerRow.eachCell((cell) => {
      cell.font = { bold: true, italic: true, size: 10, color: { argb: 'FF6B7280' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=data_prestasi_siswa.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Gagal export Excel', error: error.message });
  }
});

// ─── Helper: Generate Piagam PDF sebagai buffer ───
async function generatePiagamPdf(prestasi, pengaturan, piagam) {
  return new Promise((resolve, reject) => {
    try {
      const sekolah = pengaturan.nama_sekolah || 'SMA Annajah';
      const alamatLengkap = [pengaturan.alamat_sekolah, pengaturan.kota, pengaturan.provinsi].filter(Boolean).join(', ');
      const warnaAksen = piagam.warna_aksen || '#D4A853';
      const warnaJudul = piagam.warna_teks_judul || '#D4A853';
      const warnaUtama = piagam.warna_teks_utama || '#1C1917';
      const ukuranJudul = parseInt(piagam.ukuran_judul) || 22;
      const ukuranNama = parseInt(piagam.ukuran_nama) || 28;
      const tampilkanLogo = piagam.tampilkan_logo !== '0';
      const tampilkanKutipan = piagam.tampilkan_kutipan !== '0';
      const tampilkanFooter = piagam.tampilkan_footer !== '0';
      const textAlign = piagam.alignment || 'center';

      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 0,
        info: {
          Title: `Piagam Prestasi - ${prestasi.nama_siswa}`,
          Author: sekolah,
        }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageW = doc.page.width;
      const pageH = doc.page.height;

      // ── Layout Constants ──
      const margin = 20;
      const innerMargin = margin + 15;
      const contentWidth = pageW - innerMargin * 2;
      const textWidth = contentWidth - 40;

      // ── Background ──
      doc.rect(0, 0, pageW, pageH).fill('#FAFAF9');

      // ── Double Border Dekoratif ──
      doc.rect(margin, margin, pageW - margin * 2, pageH - margin * 2).lineWidth(2).stroke(warnaAksen);
      doc.rect(margin + 6, margin + 6, pageW - (margin + 6) * 2, pageH - (margin + 6) * 2).lineWidth(0.5).stroke(warnaAksen);

      // ── Corner Ornaments ──
      const cornerSize = 28;
      const cornerGap = 4;
      const drawCorner = (x, y, angle) => {
        doc.save();
        doc.translate(x, y);
        doc.rotate(angle);
        doc.moveTo(0, cornerGap).lineTo(cornerSize, cornerGap)
          .lineTo(cornerSize, 0).lineWidth(1.5).stroke(warnaAksen);
        doc.moveTo(cornerGap, 0).lineTo(cornerGap, cornerSize)
          .lineTo(0, cornerSize).lineWidth(1.5).stroke(warnaAksen);
        doc.restore();
      };
      drawCorner(margin + 10, margin + 10, 0);
      drawCorner(pageW - margin - 10, margin + 10, 90);
      drawCorner(pageW - margin - 10, pageH - margin - 10, 180);
      drawCorner(margin + 10, pageH - margin - 10, 270);

      // ── Logo (jika ada) ──
      let headerTop = 38;
      if (tampilkanLogo) {
        const logoPath = pengaturan.logo;
        if (logoPath) {
          const fullPath = path.join(__dirname, '..', logoPath.replace(/^\//, ''));
          if (fs.existsSync(fullPath)) {
            try {
              const img = doc.openImage(fullPath);
              const maxW = 48, maxH = 48;
              const scale = Math.min(maxW / img.width, maxH / img.height);
              const lw = img.width * scale;
              const lh = img.height * scale;
              doc.image(fullPath, (pageW - lw) / 2, 32, { width: lw, height: lh });
              headerTop = 32 + lh + 6;
            } catch (e) { /* ignore */ }
          }
        }
      }

      // ── Garis aksen atas ──
      const topLineY = headerTop - 4;
      doc.moveTo(innerMargin, topLineY).lineTo(pageW - innerMargin, topLineY)
        .lineWidth(0.5).stroke(warnaAksen);
      doc.moveTo(innerMargin, topLineY + 3).lineTo(pageW - innerMargin, topLineY + 3)
        .lineWidth(1.5).stroke(warnaAksen);
      doc.y = topLineY + 14;

      // ── Nama Sekolah ──
      doc.fontSize(15).font('Helvetica-Bold').fillColor(warnaUtama);
      doc.text(sekolah, innerMargin, doc.y, {
        width: contentWidth,
        align: 'center',
      });

      if (alamatLengkap) {
        doc.fontSize(8).fillColor('#78716C').font('Helvetica');
        doc.text(alamatLengkap, innerMargin, doc.y, {
          width: contentWidth,
          align: 'center',
        });
      }

      const kontakParts = [];
      if (pengaturan.no_telp) kontakParts.push(`Telp: ${pengaturan.no_telp}`);
      if (pengaturan.email) kontakParts.push(`Email: ${pengaturan.email}`);
      if (pengaturan.website) kontakParts.push(pengaturan.website);
      if (kontakParts.length > 0) {
        doc.fontSize(7).fillColor('#A8A29E').font('Helvetica');
        doc.text(kontakParts.join('  |  '), innerMargin, doc.y, {
          width: contentWidth,
          align: 'center',
        });
      }

      // ── Garis aksen bawah header ──
      const bottomHeaderLine = doc.y + 10;
      doc.moveTo(innerMargin, bottomHeaderLine).lineTo(pageW - innerMargin, bottomHeaderLine)
        .lineWidth(1.5).stroke(warnaAksen);
      doc.moveTo(innerMargin, bottomHeaderLine + 3).lineTo(pageW - innerMargin, bottomHeaderLine + 3)
        .lineWidth(0.5).stroke(warnaAksen);
      doc.y = bottomHeaderLine + 18;

      // ── Title Piagam ──
      doc.fontSize(ukuranJudul).font('Helvetica-Bold').fillColor(warnaJudul);
      doc.text(piagam.judul_piagam || 'PIAGAM PENGHARGAAN', {
        width: contentWidth,
        align: 'center',
      });
      doc.moveDown(0.4);

      // ── Subtitle ──
      doc.fontSize(10).fillColor('#78716C').font('Helvetica');
      doc.text(piagam.subtitle_piagam || 'Diberikan kepada:', {
        width: contentWidth,
        align: 'center',
      });
      doc.moveDown(0.6);

      // ── Nama Siswa ──
      doc.fontSize(ukuranNama).font('Helvetica-Bold').fillColor(warnaUtama);
      doc.text(prestasi.nama_siswa, {
        width: contentWidth,
        align: 'center',
      });
      doc.moveDown(0.3);

      // ── NIS / Kelas ──
      doc.fontSize(10).fillColor('#78716C').font('Helvetica');
      const siswaInfo = [];
      if (prestasi.nis) siswaInfo.push(`NIS: ${prestasi.nis}`);
      if (prestasi.nama_kelas) siswaInfo.push(`Kelas: ${prestasi.nama_kelas}`);
      if (siswaInfo.length > 0) {
        doc.text(siswaInfo.join('  |  '), {
          width: contentWidth,
          align: 'center',
        });
        doc.moveDown(0.6);
      } else {
        doc.moveDown(0.3);
      }

      // ── Body Content (alignment mengikuti pengaturan) ──
      const contentAlign = textAlign === 'justify' ? 'justify' : textAlign;

      // Teks Prestasi
      doc.fontSize(12).fillColor('#44403C').font('Helvetica');
      doc.text(piagam.teks_prestasi || 'Telah berhasil meraih prestasi', {
        width: textWidth,
        align: contentAlign,
        lineGap: 4,
      });
      doc.moveDown(0.6);

      // Nama Prestasi (lebih besar)
      doc.fontSize(20).font('Helvetica-Bold').fillColor(warnaJudul);
      doc.text(prestasi.prestasi, {
        width: textWidth,
        align: contentAlign,
      });
      doc.moveDown(0.4);

      // Detail Agenda
      doc.fontSize(11).fillColor('#44403C').font('Helvetica');
      const detailParts = [];
      if (prestasi.nama_agenda) detailParts.push(prestasi.nama_agenda);
      if (prestasi.penyelenggara) detailParts.push(`diselenggarakan oleh ${prestasi.penyelenggara}`);
      if (detailParts.length > 0) {
        doc.text(detailParts.join(', '), {
          width: textWidth,
          align: contentAlign,
          lineGap: 2,
        });
        doc.moveDown(0.4);
      }

      // Tanggal
      doc.fontSize(10).fillColor('#78716C').font('Helvetica');
      if (prestasi.tanggal) {
        const tgl = new Date(prestasi.tanggal).toLocaleDateString('id-ID', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        doc.text(tgl, {
          width: textWidth,
          align: contentAlign,
        });
        doc.moveDown(0.6);
      }

      // ── Separator sebelum kutipan ──
      if (tampilkanKutipan && piagam.kutipan) {
        const sepY = doc.y;
        doc.moveTo(pageW / 2 - 60, sepY)
          .lineTo(pageW / 2 + 60, sepY)
          .lineWidth(0.5).stroke(warnaAksen);
        doc.y = sepY + 10;

        doc.fontSize(8).fillColor('#A8A29E').font('Helvetica-Oblique');
        doc.text(`"${piagam.kutipan.replace(/"/g, '')}"`, {
          width: textWidth,
          align: 'center',
          lineGap: 2,
        });
        doc.moveDown(0.4);
      }

      // ── Tanda Tangan ──
      // Cari posisi Y minimal untuk tanda tangan (beri jarak dari konten)
      const minTtdY = Math.max(doc.y + 10, doc.page.height - 130);
      const ttdW = 160;
      const ttdCenter = pageW / 2;

      doc.y = minTtdY;
      const ttdLineY = doc.y;
      doc.moveTo(ttdCenter - ttdW / 2, ttdLineY)
        .lineTo(ttdCenter + ttdW / 2, ttdLineY)
        .lineWidth(1).stroke(warnaUtama);

      doc.fontSize(10).font('Helvetica-Bold').fillColor(warnaUtama);
      doc.text(pengaturan.kepala_sekolah || '___________________', ttdCenter - ttdW / 2, ttdLineY + 6, {
        width: ttdW,
        align: 'center',
      });

      doc.fontSize(8).fillColor('#78716C').font('Helvetica');
      doc.text('Kepala Sekolah', ttdCenter - ttdW / 2, doc.y + 4, {
        width: ttdW,
        align: 'center',
      });

      // ── Footer ──
      if (tampilkanFooter) {
        doc.fontSize(6.5).fillColor('#A8A29E').font('Helvetica');
        doc.text(
          `Dicetak dari Sistem Administrasi Sekolah ${sekolah} — Dokumen ini sah dan resmi`,
          innerMargin, doc.page.height - 32,
          { width: contentWidth, align: 'center' }
        );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ─── Helper: Kirim piagam via email ───
async function kirimPiagamEmail(prestasi, pengaturan, pdfBuffer, emailTujuan) {
  const sekolah = pengaturan.nama_sekolah || 'SMA Annajah';
  const filename = `piagam_${prestasi.nama_siswa.replace(/\s+/g, '_')}.pdf`;

  const transporter = nodemailer.createTransport({
    host: pengaturan.smtp_host,
    port: parseInt(pengaturan.smtp_port || '587'),
    secure: parseInt(pengaturan.smtp_port || '587') === 465,
    auth: {
      user: pengaturan.smtp_user,
      pass: pengaturan.smtp_pass,
    },
  });

  const tanggal = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const kontakSekolah = [
    pengaturan.no_telp ? `Telp: ${pengaturan.no_telp}` : '',
    pengaturan.email ? `Email: ${pengaturan.email}` : '',
    [pengaturan.alamat_sekolah, pengaturan.kota, pengaturan.provinsi].filter(Boolean).join(', '),
  ].filter(Boolean).join(' | ');

  await transporter.sendMail({
    from: `"${pengaturan.smtp_nama_pengirim || sekolah}" <${pengaturan.smtp_email_pengirim || pengaturan.smtp_user}>`,
    to: emailTujuan,
    subject: `Piagam Penghargaan - ${prestasi.nama_siswa} - ${sekolah}`,
    html: `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
  <div style="height: 6px; background: linear-gradient(90deg, #D4A853, #EAB308, #D4A853);"></div>
  <div style="background: linear-gradient(135deg, #1C1917, #292524); padding: 35px 30px; text-align: center;">
    <div style="font-size: 48px; line-height: 1; margin-bottom: 12px;">\uD83C\uDFC6</div>
    <h1 style="color: #D4A853; margin: 0; font-size: 22px; letter-spacing: 1px;">PIAGAM PENGHARGAAN</h1>
    <p style="color: #A8A29E; margin: 8px 0 0; font-size: 13px;">${sekolah}</p>
  </div>
  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
    <div style="padding: 30px 35px;">
      <p style="font-size: 16px; color: #1C1917; margin: 0 0 5px;">Yth. <strong>${prestasi.nama_siswa}</strong></p>
      <p style="font-size: 14px; color: #44403C; line-height: 1.7;">
        Dengan bangga kami sampaikan bahwa Anda telah meraih prestasi:
      </p>
      <div style="background: linear-gradient(135deg, #FEF3C7, #FDE68A); border: 1px solid #F59E0B; border-radius: 12px; padding: 16px 20px; margin: 16px 0; text-align: center;">
        <p style="margin: 0; font-size: 20px; font-weight: 700; color: #92400E;">${prestasi.prestasi}</p>
        ${prestasi.nama_agenda ? `<p style="margin: 8px 0 0; font-size: 13px; color: #92400E;">${prestasi.nama_agenda}</p>` : ''}
        ${prestasi.penyelenggara ? `<p style="margin: 4px 0 0; font-size: 12px; color: #92400E;">diselenggarakan oleh ${prestasi.penyelenggara}</p>` : ''}
      </div>
      <p style="font-size: 14px; color: #44403C; line-height: 1.7;">
        Sebagai bentuk apresiasi, kami lampirkan Piagam Penghargaan dalam format PDF.
        Simpan dan cetak piagam ini sebagai bukti pencapaian Anda.
      </p>
      <p style="font-size: 13px; color: #78716C; margin-top: 16px;">
        Tanggal: ${tanggal}<br/>
        File: ${filename}
      </p>
    </div>
    <div style="border-top: 1px solid #e2e8f0; padding: 15px 35px; text-align: center;">
      <p style="margin: 0; font-size: 11px; color: #94a3b8;">
        Email ini dikirim otomatis oleh Sistem Administrasi Sekolah ${sekolah}<br/>
        ${kontakSekolah}
      </p>
    </div>
  </div>
  <div style="height: 6px; background: linear-gradient(90deg, #D4A853, #EAB308, #D4A853);"></div>
</div>`,
    attachments: [{
      filename,
      content: pdfBuffer,
      contentType: 'application/pdf',
    }],
  });
}

// GET /cetak-piagam/:id — Cetak piagam/sertifikat prestasi ke PDF
router.get('/cetak-piagam/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute(`
      SELECT p.*, s.nis, s.nama AS nama_siswa, s.tempat_lahir, s.tanggal_lahir, k.nama_kelas
      FROM prestasi_siswa p
      JOIN siswa s ON s.id = p.id_siswa
      LEFT JOIN kelas k ON k.id = s.id_kelas
      WHERE p.id = ?
    `, [req.params.id]);

    if (!rows[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });

    const prestasi = rows[0];
    const pengaturan = await getSettings(db);
    const piagam = await getPiagamSettings(db);
    const pdfBuffer = await generatePiagamPdf(prestasi, pengaturan, piagam);

    const filename = `piagam_${prestasi.nama_siswa.replace(/\s+/g, '_')}_${prestasi.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mencetak piagam', error: error.message });
  }
});

// POST /:id/kirim-piagam — Kirim piagam via email ke siswa
router.post('/:id/kirim-piagam', async (req, res) => {
  try {
    const db = await getDatabase();
    const { email_tujuan } = req.body;

    if (!email_tujuan) {
      return res.status(400).json({ message: 'Email tujuan harus diisi' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email_tujuan)) {
      return res.status(400).json({ message: 'Format email tidak valid' });
    }

    // Ambil data prestasi + siswa
    const [rows] = await db.execute(`
      SELECT p.*, s.nis, s.nama AS nama_siswa, s.email AS email_siswa, k.nama_kelas
      FROM prestasi_siswa p
      JOIN siswa s ON s.id = p.id_siswa
      LEFT JOIN kelas k ON k.id = s.id_kelas
      WHERE p.id = ?
    `, [req.params.id]);

    if (!rows[0]) return res.status(404).json({ message: 'Data prestasi tidak ditemukan' });

    const prestasi = rows[0];
    const pengaturan = await getSettings(db);

    // Pastikan SMTP sudah dikonfigurasi
    if (!pengaturan.smtp_host || !pengaturan.smtp_user || !pengaturan.smtp_pass) {
      return res.status(400).json({
        message: 'Konfigurasi SMTP belum lengkap. Silakan atur di menu Pengaturan > Konfigurasi Email terlebih dahulu.',
      });
    }

    // Generate piagam PDF
    const piagam = await getPiagamSettings(db);
    const pdfBuffer = await generatePiagamPdf(prestasi, pengaturan, piagam);

    // Kirim email
    await kirimPiagamEmail(prestasi, pengaturan, pdfBuffer, email_tujuan);

    res.json({ message: `Piagam berhasil dikirim ke ${email_tujuan}` });
  } catch (error) {
    console.error('Kirim piagam email error:', error);
    res.status(500).json({
      message: 'Gagal mengirim piagam via email. Periksa konfigurasi SMTP.',
      error: error.message,
    });
  }
});

// GET / — Daftar prestasi dengan filter
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { search, id_siswa, penyelenggara, tanggal_mulai, tanggal_selesai } = req.query;

    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(s.nama LIKE ? OR s.nis LIKE ? OR p.nama_agenda LIKE ? OR p.prestasi LIKE ? OR p.penyelenggara LIKE ?)');
      const q = `%${search}%`;
      params.push(q, q, q, q, q);
    }
    if (id_siswa) {
      conditions.push('p.id_siswa = ?');
      params.push(id_siswa);
    }
    if (penyelenggara) {
      conditions.push('p.penyelenggara LIKE ?');
      params.push(`%${penyelenggara}%`);
    }
    if (tanggal_mulai) {
      conditions.push('p.tanggal >= ?');
      params.push(tanggal_mulai);
    }
    if (tanggal_selesai) {
      conditions.push('p.tanggal <= ?');
      params.push(tanggal_selesai);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await db.execute(`
      SELECT p.id, p.tanggal, p.id_siswa, p.penyelenggara, p.nama_agenda, p.prestasi, p.foto, p.created_at,
        s.nis, s.nama AS nama_siswa, s.foto AS foto_siswa, k.nama_kelas
      FROM prestasi_siswa p
      JOIN siswa s ON s.id = p.id_siswa
      LEFT JOIN kelas k ON k.id = s.id_kelas
      ${whereClause}
      ORDER BY p.tanggal DESC, p.id DESC
    `, params);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat data prestasi', error: error.message });
  }
});

// GET /:id — Detail prestasi
router.get('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute(`
      SELECT p.*, s.nis, s.nama AS nama_siswa, k.nama_kelas
      FROM prestasi_siswa p
      JOIN siswa s ON s.id = p.id_siswa
      LEFT JOIN kelas k ON k.id = s.id_kelas
      WHERE p.id = ?
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// POST / — Tambah prestasi (dengan foto opsional)
router.post('/', (req, res) => {
  uploadFoto.single('foto')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Ukuran foto maksimal 2MB' });
      }
      return res.status(400).json({ message: err.message || 'Gagal upload foto' });
    }

    try {
      const db = await getDatabase();
      const { tanggal, id_siswa, penyelenggara, nama_agenda, prestasi } = req.body;

      if (!tanggal || !id_siswa || !penyelenggara || !nama_agenda || !prestasi) {
        // Hapus file yg sudah terupload jika validasi gagal
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ message: 'Semua field harus diisi' });
      }

      const foto = req.file ? req.file.filename : null;

      const [result] = await db.execute(
        'INSERT INTO prestasi_siswa (tanggal, id_siswa, penyelenggara, nama_agenda, prestasi, foto) VALUES (?, ?, ?, ?, ?, ?)',
        [tanggal, id_siswa, penyelenggara, nama_agenda, prestasi, foto]
      );

      const [newRow] = await db.execute(`
        SELECT p.*, s.nis, s.nama AS nama_siswa, k.nama_kelas
        FROM prestasi_siswa p
        JOIN siswa s ON s.id = p.id_siswa
        LEFT JOIN kelas k ON k.id = s.id_kelas
        WHERE p.id = ?
      `, [result.insertId]);

      res.status(201).json(newRow[0]);
    } catch (error) {
      // Hapus file jika error database
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      res.status(500).json({ message: 'Gagal menambah data prestasi', error: error.message });
    }
  });
});

// PUT /:id — Update prestasi (dengan foto opsional)
router.put('/:id', (req, res) => {
  uploadFoto.single('foto')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Ukuran foto maksimal 2MB' });
      }
      return res.status(400).json({ message: err.message || 'Gagal upload foto' });
    }

    try {
      const db = await getDatabase();
      const [existing] = await db.execute('SELECT * FROM prestasi_siswa WHERE id = ?', [req.params.id]);
      if (!existing[0]) {
        if (req.file) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        return res.status(404).json({ message: 'Data tidak ditemukan' });
      }

      const { tanggal, id_siswa, penyelenggara, nama_agenda, prestasi } = req.body;
      const foto = req.file ? req.file.filename : existing[0].foto;

      // Hapus foto lama jika diganti
      if (req.file && existing[0].foto) {
        const oldPath = path.join(fotoDir, existing[0].foto);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (e) {}
        }
      }

      await db.execute(
        'UPDATE prestasi_siswa SET tanggal=?, id_siswa=?, penyelenggara=?, nama_agenda=?, prestasi=?, foto=? WHERE id=?',
        [
          tanggal || existing[0].tanggal,
          id_siswa || existing[0].id_siswa,
          penyelenggara !== undefined ? penyelenggara : existing[0].penyelenggara,
          nama_agenda !== undefined ? nama_agenda : existing[0].nama_agenda,
          prestasi !== undefined ? prestasi : existing[0].prestasi,
          foto,
          req.params.id
        ]
      );

      const [updated] = await db.execute(`
        SELECT p.*, s.nis, s.nama AS nama_siswa, k.nama_kelas
        FROM prestasi_siswa p
        JOIN siswa s ON s.id = p.id_siswa
        LEFT JOIN kelas k ON k.id = s.id_kelas
        WHERE p.id = ?
      `, [req.params.id]);

      res.json(updated[0]);
    } catch (error) {
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      res.status(500).json({ message: 'Gagal mengupdate data prestasi', error: error.message });
    }
  });
});

// DELETE /:id — Hapus prestasi beserta foto
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [existing] = await db.execute('SELECT * FROM prestasi_siswa WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });

    // Hapus file foto jika ada
    if (existing[0].foto) {
      const filePath = path.join(fotoDir, existing[0].foto);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }

    await db.execute('DELETE FROM prestasi_siswa WHERE id = ?', [req.params.id]);
    res.json({ message: 'Data prestasi berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus data prestasi', error: error.message });
  }
});

// DELETE /:id/foto — Hapus foto saja
router.delete('/:id/foto', async (req, res) => {
  try {
    const db = await getDatabase();
    const [existing] = await db.execute('SELECT * FROM prestasi_siswa WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });

    if (existing[0].foto) {
      const filePath = path.join(fotoDir, existing[0].foto);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
      await db.execute('UPDATE prestasi_siswa SET foto = NULL WHERE id = ?', [req.params.id]);
    }

    res.json({ message: 'Foto berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus foto', error: error.message });
  }
});

module.exports = router;
