const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

const { formatRupiah, terbilang, drawTable, writeHeader, writeGrandTotal, writeSignature, getSettings, getDailyDate } = require('../helpers/pdfHelpers');

router.use(authenticateToken);

// Helper: generate PDF laporan sebagai buffer
async function generatePdfReport(jenis, params) {
  const db = await getDatabase();
  const pengaturan = await getSettings(db);
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  
  return new Promise(async (resolve, reject) => {
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      const pageWidth = doc.page.width - 80;

      if (jenis === 'rekap') {
          const { tanggal_awal, tanggal_akhir } = params;
          let query = `SELECT jp.nama_pembayaran, COUNT(t.id) as jumlah_transaksi, SUM(t.jumlah_bayar) as total, jp.periode
            FROM transaksi t JOIN jenis_pembayaran jp ON t.id_jenis_pembayaran = jp.id WHERE 1=1`;
          const qParams = [];
          if (tanggal_awal) { query += ' AND t.tanggal_bayar >= ?'; qParams.push(tanggal_awal); }
          if (tanggal_akhir) { query += ' AND t.tanggal_bayar <= ?'; qParams.push(tanggal_akhir); }
          query += ' GROUP BY jp.id ORDER BY total DESC';
          const [data] = await db.execute(query, qParams);
          const grandTotal = data.reduce((s, r) => s + Number(r.total), 0);

          writeHeader(doc, pengaturan, 'LAPORAN REKAPITULASI PEMBAYARAN', `Periode: ${tanggal_awal || 'Semua'} s/d ${tanggal_akhir || 'Semua'}`);
          doc.text(`Total Jenis Pembayaran: ${data.length}`);
          doc.moveDown(1);

          const colWidths = [pageWidth * 0.3, pageWidth * 0.2, pageWidth * 0.2, pageWidth * 0.3];
          const rows = data.map(d => [d.nama_pembayaran, d.periode || '-', `${d.jumlah_transaksi}x`, formatRupiah(d.total)]);
          drawTable(doc, ['Jenis Pembayaran', 'Periode', 'Jumlah Transaksi', 'Total'], rows, { columnWidths: colWidths });
          writeGrandTotal(doc, 'GRAND TOTAL', formatRupiah(grandTotal), pageWidth);
          doc.fontSize(9).fillColor('#374151').font('Helvetica').text(`Terbilang: # ${terbilang(grandTotal)} Rupiah #`);
          doc.moveDown(2);
          writeSignature(doc, pengaturan);
        } else if (jenis === 'per-bulan') {
          const year = params.tahun || new Date().getFullYear();
          const [data] = await db.execute(`SELECT DATE_FORMAT(tanggal_bayar, '%m') as bulan, COUNT(*) as jumlah_transaksi, SUM(jumlah_bayar) as total FROM transaksi WHERE DATE_FORMAT(tanggal_bayar, '%Y') = ? GROUP BY DATE_FORMAT(tanggal_bayar, '%m') ORDER BY bulan`, [String(year)]);
          const bulanNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
          const rows = bulanNames.map((nama, i) => {
            const bulan = String(i + 1).padStart(2, '0');
            const d = data.find(x => x.bulan === bulan);
            return [nama, d ? `${d.jumlah_transaksi}x` : '0x', d ? formatRupiah(d.total) : formatRupiah(0)];
          });
          const grandTotal = data.reduce((s, d) => s + Number(d.total), 0);

          writeHeader(doc, pengaturan, 'LAPORAN PEMBAYARAN PER BULAN', `Tahun ${year}`);
          const colWidths = [pageWidth * 0.33, pageWidth * 0.33, pageWidth * 0.34];
          drawTable(doc, ['Bulan', 'Jumlah Transaksi', 'Total Pembayaran'], rows, { columnWidths: colWidths });
          writeGrandTotal(doc, 'GRAND TOTAL', formatRupiah(grandTotal), pageWidth);
          doc.fontSize(9).fillColor('#374151').font('Helvetica').text(`Terbilang: # ${terbilang(grandTotal)} Rupiah #`);
          doc.moveDown(2);
          writeSignature(doc, pengaturan);
        } else if (jenis === 'siswa') {
          const { id_siswa } = params;
          const [transaksi] = await db.execute(`SELECT t.*, jp.nama_pembayaran, jp.nominal as nominal_tagihan, jp.periode, s.nama as nama_siswa, s.nis, k.nama_kelas
            FROM transaksi t JOIN jenis_pembayaran jp ON t.id_jenis_pembayaran = jp.id JOIN siswa s ON t.id_siswa = s.id LEFT JOIN kelas k ON s.id_kelas = k.id
            WHERE t.id_siswa = ? ORDER BY t.tanggal_bayar DESC`, [id_siswa]);
          const namaSiswa = transaksi[0]?.nama_siswa || 'Siswa';
          const nis = transaksi[0]?.nis || '-';
          const kelas = transaksi[0]?.nama_kelas || '-';
          const totalBayar = transaksi.reduce((sum, t) => sum + Number(t.jumlah_bayar), 0);

          writeHeader(doc, pengaturan, 'RIWAYAT PEMBAYARAN SISWA');
          doc.fontSize(10).fillColor('#374151').font('Helvetica');
          doc.text(`NIS           : ${nis}`);
          doc.text(`Nama          : ${namaSiswa}`);
          doc.text(`Kelas         : ${kelas}`);
          doc.text(`Tanggal Cetak : ${getDailyDate()}`);
          doc.moveDown(1);

          const colWidths = [pageWidth * 0.2, pageWidth * 0.25, pageWidth * 0.2, pageWidth * 0.2, pageWidth * 0.15];
          const rows = transaksi.map(t => [
            new Date(t.tanggal_bayar).toLocaleDateString('id-ID'),
            t.nama_pembayaran, t.periode || '-', t.bulan_bayar || '-', formatRupiah(t.jumlah_bayar)
          ]);
          drawTable(doc, ['Tanggal', 'Jenis Pembayaran', 'Periode', 'Bulan', 'Jumlah'], rows, { columnWidths: colWidths });
          writeGrandTotal(doc, 'TOTAL', formatRupiah(totalBayar), pageWidth);
          doc.fontSize(9).fillColor('#374151').font('Helvetica').text(`Terbilang: # ${terbilang(totalBayar)} Rupiah #`);
          doc.moveDown(2);
          writeSignature(doc, pengaturan);
        } else if (jenis === 'transaksi') {
          const { tanggal_awal, tanggal_akhir } = params;
          let query = `SELECT t.no_kwitansi, t.tanggal_bayar, s.nis, s.nama as nama_siswa, jp.nama_pembayaran, t.bulan_bayar, t.jumlah_bayar, u.nama as petugas
            FROM transaksi t JOIN siswa s ON t.id_siswa = s.id JOIN jenis_pembayaran jp ON t.id_jenis_pembayaran = jp.id LEFT JOIN users u ON t.id_user = u.id WHERE 1=1`;
          const qParams = [];
          if (tanggal_awal) { query += ' AND t.tanggal_bayar >= ?'; qParams.push(tanggal_awal); }
          if (tanggal_akhir) { query += ' AND t.tanggal_bayar <= ?'; qParams.push(tanggal_akhir); }
          query += ' ORDER BY t.tanggal_bayar DESC';
          const [data] = await db.execute(query, qParams);
          const grandTotal = data.reduce((sum, r) => sum + Number(r.jumlah_bayar), 0);

          writeHeader(doc, pengaturan, 'LAPORAN TRANSAKSI PEMBAYARAN', `Periode: ${tanggal_awal || 'Semua'} s/d ${tanggal_akhir || 'Semua'}`);
          doc.text(`Total Transaksi: ${data.length}`);
          doc.moveDown(1);

          const colWidths = [pageWidth * 0.15, pageWidth * 0.1, pageWidth * 0.1, pageWidth * 0.17, pageWidth * 0.13, pageWidth * 0.1, pageWidth * 0.15, pageWidth * 0.1];
          const rows = data.map(d => [d.no_kwitansi || '-', new Date(d.tanggal_bayar).toLocaleDateString('id-ID'), d.nis, d.nama_siswa, d.nama_pembayaran, d.bulan_bayar || '-', formatRupiah(d.jumlah_bayar), d.petugas || '-']);
          drawTable(doc, ['No. Kwitansi', 'Tanggal', 'NIS', 'Nama Siswa', 'Pembayaran', 'Bulan', 'Jumlah', 'Petugas'], rows, { columnWidths: colWidths, fontSize: 7 });
          writeGrandTotal(doc, 'GRAND TOTAL', formatRupiah(grandTotal), pageWidth);
          doc.fontSize(9).fillColor('#374151').font('Helvetica').text(`Terbilang: # ${terbilang(grandTotal)} Rupiah #`);
          doc.moveDown(2);
          writeSignature(doc, pengaturan);
        } else {
          reject(new Error('Jenis laporan tidak dikenal'));
        }

        doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// POST /api/email/kirim — Kirim laporan PDF via email
router.post('/kirim', async (req, res) => {
  try {
    const { jenis, params: filterParams, email_tujuan, subject, pesan } = req.body;

    if (!jenis || !email_tujuan) {
      return res.status(400).json({ message: 'Jenis laporan dan email tujuan harus diisi' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email_tujuan)) {
      return res.status(400).json({ message: 'Format email tidak valid' });
    }

    const db = await getDatabase();
    const pengaturan = await getSettings(db);

    if (!pengaturan.smtp_host || !pengaturan.smtp_user || !pengaturan.smtp_pass) {
      return res.status(400).json({
        message: 'Konfigurasi SMTP belum lengkap. Silakan atur di menu Pengaturan > Konfigurasi Email.',
      });
    }

    const pdfBuffer = await generatePdfReport(jenis, filterParams || {});

    const fileLabels = {
      'rekap': 'Rekap_Pembayaran',
      'per-bulan': 'Pembayaran_Per_Bulan',
      'siswa': 'Riwayat_Pembayaran_Siswa',
      'transaksi': 'Laporan_Transaksi',
    };
    const filename = `${fileLabels[jenis] || 'Laporan'}_${new Date().toISOString().split('T')[0]}.pdf`;

    const transporter = nodemailer.createTransport({
      host: pengaturan.smtp_host,
      port: parseInt(pengaturan.smtp_port || '587'),
      secure: parseInt(pengaturan.smtp_port || '587') === 465,
      auth: {
        user: pengaturan.smtp_user,
        pass: pengaturan.smtp_pass,
      },
    });

    const mailOptions = {
      from: `"${pengaturan.smtp_nama_pengirim || pengaturan.nama_sekolah || 'SMA Annajah'}" <${pengaturan.smtp_email_pengirim || pengaturan.smtp_user}>`,
      to: email_tujuan,
      subject: subject || `Laporan Pembayaran - ${pengaturan.nama_sekolah || 'SMA Annajah'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #15803D, #166534); padding: 30px; border-radius: 12px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px;">${pengaturan.nama_sekolah || 'SMA Annajah'}</h1>
            <p style="color: #bbf7d0; margin: 5px 0 0; font-size: 13px;">Sistem Administrasi Sekolah</p>
          </div>
          <div style="padding: 30px 0; color: #374151;">
            <p style="font-size: 15px;">Yth. Bapak/Ibu,</p>
            <p style="font-size: 14px; line-height: 1.6;">
              Berikut kami lampirkan laporan pembayaran dalam format PDF.
              ${pesan ? `<br/><br/><strong>Pesan:</strong><br/>${pesan.replace(/\n/g, '<br/>')}` : ''}
            </p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px 12px; background: #f0fdf4; border-radius: 8px 0 0 8px; font-size: 13px; color: #6b7280;">Jenis Laporan</td>
                <td style="padding: 8px 12px; background: #f0fdf4; border-radius: 0 8px 8px 0; font-size: 13px; font-weight: 600;">
                  ${jenis === 'rekap' ? 'Rekap Pembayaran' : jenis === 'per-bulan' ? 'Per Bulan' : jenis === 'siswa' ? 'Per Siswa' : 'Transaksi'}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-size: 13px; color: #6b7280;">Tanggal Cetak</td>
                <td style="padding: 8px 12px; font-size: 13px; font-weight: 600;">${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
              </tr>
            </table>
            <p style="font-size: 13px; color: #9ca3af; margin-top: 20px;">
              <strong>File:</strong> ${filename}<br/>
              <strong>Ukuran:</strong> ${(pdfBuffer.length / 1024).toFixed(1)} KB
            </p>
          </div>
          <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; text-align: center; font-size: 11px; color: #9ca3af;">
            <p>Email ini dikirim otomatis oleh Sistem Administrasi Sekolah SMA Annajah</p>
            <p>${pengaturan.alamat_sekolah || ''} | ${pengaturan.no_telp || ''} | ${pengaturan.email || ''}</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    res.json({
      message: 'Laporan berhasil dikirim via email',
      email: email_tujuan,
      filename,
    });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({
      message: 'Gagal mengirim email. Periksa konfigurasi SMTP.',
      error: error.message,
    });
  }
});

// POST /api/email/test — Tes koneksi SMTP
router.post('/test', async (req, res) => {
  try {
    const db = await getDatabase();
    const pengaturan = await getSettings(db);

    if (!pengaturan.smtp_host || !pengaturan.smtp_user || !pengaturan.smtp_pass) {
      return res.status(400).json({ message: 'Konfigurasi SMTP belum lengkap' });
    }

    const transporter = nodemailer.createTransport({
      host: pengaturan.smtp_host,
      port: parseInt(pengaturan.smtp_port || '587'),
      secure: parseInt(pengaturan.smtp_port || '587') === 465,
      auth: {
        user: pengaturan.smtp_user,
        pass: pengaturan.smtp_pass,
      },
    });

    await transporter.verify();
    res.json({ message: 'Koneksi SMTP berhasil! Email siap digunakan.' });
  } catch (error) {
    res.status(500).json({
      message: 'Koneksi SMTP gagal. Periksa kembali konfigurasi.',
      error: error.message,
    });
  }
});

module.exports = router;
