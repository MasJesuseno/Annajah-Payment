const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const PDFDocument = require('pdfkit');

const { formatRupiah, terbilang, drawTable, writeHeader, writeGrandTotal, writeSignature, getSettings, getDailyDate } = require('../helpers/pdfHelpers');

router.use(authenticateToken);

// GET /api/laporan/pdf/rekap
router.get('/pdf/rekap', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tanggal_awal, tanggal_akhir } = req.query;

    let query = `
      SELECT jp.nama_pembayaran, COUNT(t.id) as jumlah_transaksi, 
             SUM(t.jumlah_bayar) as total, jp.periode
      FROM transaksi t
      JOIN jenis_pembayaran jp ON t.id_jenis_pembayaran = jp.id
      WHERE 1=1
    `;
    const params = [];
    if (tanggal_awal) { query += ' AND t.tanggal_bayar >= ?'; params.push(tanggal_awal); }
    if (tanggal_akhir) { query += ' AND t.tanggal_bayar <= ?'; params.push(tanggal_akhir); }
    query += ' GROUP BY jp.id ORDER BY total DESC';

    const [data] = await db.execute(query, params);
    const grandTotal = data.reduce((sum, r) => sum + Number(r.total), 0);

    const pengaturan = await getSettings(await getDatabase());

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    const filename = `rekap_pembayaran_${tanggal_awal || 'all'}_${tanggal_akhir || 'all'}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    doc.pipe(res);

    writeHeader(doc, pengaturan, 'LAPORAN REKAPITULASI PEMBAYARAN', `Periode: ${tanggal_awal || 'Semua Data'} s/d ${tanggal_akhir || 'Semua Data'}`);
    doc.fontSize(9).fillColor('#374151').font('Helvetica');
    doc.text(`Total Jenis Pembayaran: ${data.length}`);
    doc.moveDown(1);

    const headers = ['Jenis Pembayaran', 'Periode', 'Jumlah Transaksi', 'Total'];
    const pageWidth = doc.page.width - 80;
    const colWidths = [pageWidth * 0.3, pageWidth * 0.2, pageWidth * 0.2, pageWidth * 0.3];
    const rows = data.map(d => [d.nama_pembayaran, d.periode || '-', `${d.jumlah_transaksi}x`, formatRupiah(d.total)]);
    drawTable(doc, headers, rows, { columnWidths: colWidths });

    writeGrandTotal(doc, 'GRAND TOTAL', formatRupiah(grandTotal), pageWidth);
    doc.fontSize(9).fillColor('#374151').font('Helvetica');
    doc.text(`Terbilang: # ${terbilang(grandTotal)} Rupiah #`);
    doc.moveDown(2);
    writeSignature(doc, pengaturan);
    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/pdf/per-bulan
router.get('/pdf/per-bulan', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tahun, jenis_transaksi } = req.query;
    const year = tahun || new Date().getFullYear();

    let jenisFilter = '';
    const params = [String(year)];
    if (jenis_transaksi) {
      jenisFilter = ' AND jenis_transaksi = ?';
      params.push(jenis_transaksi);
    }

    const [data] = await db.execute(`
      SELECT DATE_FORMAT(tanggal_bayar, '%m') as bulan,
             COUNT(*) as jumlah_transaksi,
             SUM(jumlah_bayar) as total
      FROM transaksi
      WHERE DATE_FORMAT(tanggal_bayar, '%Y') = ?${jenisFilter}
      GROUP BY DATE_FORMAT(tanggal_bayar, '%m')
      ORDER BY bulan
    `, params);

    const bulanNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const rows = bulanNames.map((nama, i) => {
      const bulan = String(i + 1).padStart(2, '0');
      const d = data.find(d => d.bulan === bulan);
      return [
        nama,
        d ? `${d.jumlah_transaksi}x` : '0x',
        d ? formatRupiah(d.total) : formatRupiah(0)
      ];
    });

    const grandTotal = data.reduce((sum, d) => sum + Number(d.total), 0);
    const grandCount = data.reduce((sum, d) => sum + d.jumlah_transaksi, 0);

    const pengaturan = await getSettings(await getDatabase());

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=pembayaran_per_bulan_${year}.pdf`);
    doc.pipe(res);

    writeHeader(doc, pengaturan, 'LAPORAN PEMBAYARAN PER BULAN', `Tahun ${year}`);
    doc.moveDown(1);

    const pageWidth = doc.page.width - 80;
    const colWidths = [pageWidth * 0.33, pageWidth * 0.33, pageWidth * 0.34];
    const headers = ['Bulan', 'Jumlah Transaksi', 'Total Pembayaran'];
    drawTable(doc, headers, rows, { columnWidths: colWidths });

    writeGrandTotal(doc, 'GRAND TOTAL', `${grandCount} transaksi  |  ${formatRupiah(grandTotal)}`, pageWidth);
    doc.fontSize(9).fillColor('#374151').font('Helvetica');
    doc.text(`Terbilang: # ${terbilang(grandTotal)} Rupiah #`);
    doc.moveDown(2);
    writeSignature(doc, pengaturan);
    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/pdf/siswa
router.get('/pdf/siswa', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id_siswa, jenis_transaksi } = req.query;

    if (!id_siswa) {
      return res.status(400).json({ message: 'ID siswa harus diisi' });
    }

    let siswaFilter = '';
    const params = [id_siswa];
    if (jenis_transaksi) {
      siswaFilter = ' AND t.jenis_transaksi = ?';
      params.push(jenis_transaksi);
    }

    const [transaksi] = await db.execute(`
      SELECT t.*, jp.nama_pembayaran, jp.nominal as nominal_tagihan, jp.periode,
             s.nama as nama_siswa, s.nis, k.nama_kelas
      FROM transaksi t
      JOIN jenis_pembayaran jp ON t.id_jenis_pembayaran = jp.id
      JOIN siswa s ON t.id_siswa = s.id
      LEFT JOIN kelas k ON s.id_kelas = k.id
      WHERE t.id_siswa = ?${siswaFilter}
      ORDER BY t.tanggal_bayar DESC
    `, params);

    const namaSiswa = transaksi[0]?.nama_siswa || 'Siswa';
    const nis = transaksi[0]?.nis || '-';
    const kelas = transaksi[0]?.nama_kelas || '-';
    const totalBayar = transaksi.reduce((sum, t) => sum + Number(t.jumlah_bayar), 0);

    const pengaturan = await getSettings(await getDatabase());

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    const filename = `riwayat_${namaSiswa.replace(/\s+/g, '_')}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    doc.pipe(res);

    writeHeader(doc, pengaturan, 'RIWAYAT PEMBAYARAN SISWA');
    doc.fontSize(10).fillColor('#374151').font('Helvetica');
    doc.text(`NIS           : ${nis}`);
    doc.text(`Nama          : ${namaSiswa}`);
    doc.text(`Kelas         : ${kelas}`);
    doc.text(`Tanggal Cetak : ${getDailyDate()}`);
    doc.moveDown(1);

    const pageWidth = doc.page.width - 80;
    const colWidths = [pageWidth * 0.2, pageWidth * 0.25, pageWidth * 0.2, pageWidth * 0.2, pageWidth * 0.15];
    const headers = ['Tanggal', 'Jenis Pembayaran', 'Periode', 'Bulan', 'Jumlah'];
    const rows = transaksi.map(t => [
      new Date(t.tanggal_bayar).toLocaleDateString('id-ID'),
      t.nama_pembayaran, t.periode || '-', t.bulan_bayar || '-',
      formatRupiah(t.jumlah_bayar)
    ]);

    drawTable(doc, headers, rows, { columnWidths: colWidths });
    writeGrandTotal(doc, 'TOTAL', formatRupiah(totalBayar), pageWidth);

    doc.fontSize(9).fillColor('#374151').font('Helvetica');
    doc.text(`Terbilang: # ${terbilang(totalBayar)} Rupiah #`);
    doc.moveDown(2);
    writeSignature(doc, pengaturan);
    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/pdf/transaksi
router.get('/pdf/transaksi', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tanggal_awal, tanggal_akhir } = req.query;

    let query = `
      SELECT t.no_kwitansi, t.tanggal_bayar, s.nis, s.nama as nama_siswa,
             jp.nama_pembayaran, t.bulan_bayar, t.jumlah_bayar, t.jenis_transaksi, u.nama as petugas
      FROM transaksi t
      JOIN siswa s ON t.id_siswa = s.id
      JOIN jenis_pembayaran jp ON t.id_jenis_pembayaran = jp.id
      LEFT JOIN users u ON t.id_user = u.id
      WHERE 1=1
    `;
    const params = [];
    if (tanggal_awal) { query += ' AND t.tanggal_bayar >= ?'; params.push(tanggal_awal); }
    if (tanggal_akhir) { query += ' AND t.tanggal_bayar <= ?'; params.push(tanggal_akhir); }
    query += ' ORDER BY t.tanggal_bayar DESC';

    const [data] = await db.execute(query, params);
    const grandTotal = data.reduce((sum, r) => sum + Number(r.jumlah_bayar), 0);

    const pengaturan = await getSettings(await getDatabase());

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=transaksi_pembayaran.pdf`);
    doc.pipe(res);

    writeHeader(doc, pengaturan, 'LAPORAN TRANSAKSI PEMBAYARAN', `Periode: ${tanggal_awal || 'Semua Data'} s/d ${tanggal_akhir || 'Semua Data'}`);
    doc.text(`Total Transaksi: ${data.length}`);
    doc.moveDown(1);

    const pageWidth = doc.page.width - 80;
    const colWidths = [pageWidth * 0.12, pageWidth * 0.09, pageWidth * 0.08, pageWidth * 0.09, pageWidth * 0.17, pageWidth * 0.12, pageWidth * 0.1, pageWidth * 0.13, pageWidth * 0.1];
    const headers = ['No. Kwitansi', 'Tanggal', 'Jenis', 'NIS', 'Nama Siswa', 'Pembayaran', 'Bulan', 'Jumlah', 'Petugas'];
    const rows = data.map(d => [
      d.no_kwitansi || '-', new Date(d.tanggal_bayar).toLocaleDateString('id-ID'),
      d.jenis_transaksi || 'Masuk', d.nis, d.nama_siswa, d.nama_pembayaran, d.bulan_bayar || '-',
      formatRupiah(d.jumlah_bayar), d.petugas || '-'
    ]);

    drawTable(doc, headers, rows, { columnWidths: colWidths, fontSize: 7 });
    writeGrandTotal(doc, 'GRAND TOTAL', formatRupiah(grandTotal), pageWidth);
    doc.fontSize(9).fillColor('#374151').font('Helvetica');
    doc.text(`Terbilang: # ${terbilang(grandTotal)} Rupiah #`);
    doc.moveDown(2);
    writeSignature(doc, pengaturan);
    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/pdf/kehadiran-rekap — Rekap kehadiran per kelas
router.get('/pdf/kehadiran-rekap', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tanggal_awal, tanggal_akhir, id_kelas } = req.query;

    let where = ' WHERE 1=1';
    const params = [];

    if (tanggal_awal) { where += ' AND k.tanggal >= ?'; params.push(tanggal_awal); }
    if (tanggal_akhir) { where += ' AND k.tanggal <= ?'; params.push(tanggal_akhir); }
    if (id_kelas) { where += ' AND s.id_kelas = ?'; params.push(id_kelas); }

    const [perKelas] = await db.execute(`
      SELECT 
        kl.nama_kelas, kl.tingkat, kl.id as id_kelas,
        COUNT(CASE WHEN k.status = 'hadir' THEN 1 END) as hadir,
        COUNT(CASE WHEN k.status = 'ijin' THEN 1 END) as ijin,
        COUNT(CASE WHEN k.status = 'sakit' THEN 1 END) as sakit,
        COUNT(CASE WHEN k.status = 'alpa' THEN 1 END) as alpa,
        COUNT(*) as total
      FROM kehadiran k
      JOIN siswa s ON k.id_siswa = s.id
      JOIN kelas kl ON s.id_kelas = kl.id
      ${where}
      GROUP BY kl.id, kl.nama_kelas, kl.tingkat
      ORDER BY kl.tingkat, kl.nama_kelas
    `, params);

    const grandTotal = {
      hadir: perKelas.reduce((s, r) => s + Number(r.hadir), 0),
      ijin: perKelas.reduce((s, r) => s + Number(r.ijin), 0),
      sakit: perKelas.reduce((s, r) => s + Number(r.sakit), 0),
      alpa: perKelas.reduce((s, r) => s + Number(r.alpa), 0),
      total: 0,
    };
    grandTotal.total = grandTotal.hadir + grandTotal.ijin + grandTotal.sakit + grandTotal.alpa;

    const pengaturan = await getSettings(await getDatabase());

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    const filename = `rekap_kehadiran_kelas_${tanggal_awal || 'all'}_${tanggal_akhir || 'all'}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    doc.pipe(res);

    writeHeader(doc, pengaturan, 'LAPORAN REKAPITULASI KEHADIRAN PER KELAS', `Periode: ${tanggal_awal || 'Semua Data'} s/d ${tanggal_akhir || 'Semua Data'}`);
    doc.fontSize(9).fillColor('#374151').font('Helvetica');
    doc.text(`Total Kelas: ${perKelas.length}  |  Total Data: ${grandTotal.total}`);
    doc.moveDown(1);

    const pageWidth = doc.page.width - 80;
    const colWidths = [pageWidth * 0.2, pageWidth * 0.12, pageWidth * 0.14, pageWidth * 0.14, pageWidth * 0.14, pageWidth * 0.14, pageWidth * 0.12];
    const headers = ['Kelas', 'Tingkat', 'Hadir', 'Ijin', 'Sakit', 'Alpa', 'Kehadiran'];
    const rows = perKelas.map(d => {
      const pct = d.total > 0 ? ((Number(d.hadir) / Number(d.total)) * 100).toFixed(1) : '0.0';
      return [d.nama_kelas, d.tingkat || '-', String(d.hadir), String(d.ijin), String(d.sakit), String(d.alpa), `${pct}%`];
    });
    drawTable(doc, headers, rows, { columnWidths: colWidths });

    // Grand total
    const grandPct = grandTotal.total > 0 ? ((grandTotal.hadir / grandTotal.total) * 100).toFixed(1) : '0.0';
    writeGrandTotal(doc, 'GRAND TOTAL', `Hadir: ${grandTotal.hadir}  |  Ijin: ${grandTotal.ijin}  |  Sakit: ${grandTotal.sakit}  |  Alpa: ${grandTotal.alpa}  |  Total: ${grandTotal.total}  |  ${grandPct}% kehadiran`, pageWidth);

    doc.moveDown(2);
    writeSignature(doc, pengaturan);
    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/pdf/kehadiran-siswa — Rekap kehadiran per siswa
router.get('/pdf/kehadiran-siswa', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tanggal_awal, tanggal_akhir, id_kelas, id_siswa } = req.query;

    let where = ' WHERE 1=1';
    const params = [];

    if (tanggal_awal) { where += ' AND k.tanggal >= ?'; params.push(tanggal_awal); }
    if (tanggal_akhir) { where += ' AND k.tanggal <= ?'; params.push(tanggal_akhir); }
    if (id_kelas) { where += ' AND s.id_kelas = ?'; params.push(id_kelas); }
    if (id_siswa) { where += ' AND s.id = ?'; params.push(id_siswa); }

    const [data] = await db.execute(`
      SELECT 
        s.id as id_siswa, s.nis, s.nama as nama_siswa,
        kl.nama_kelas,
        COUNT(CASE WHEN k.status = 'hadir' THEN 1 END) as hadir,
        COUNT(CASE WHEN k.status = 'ijin' THEN 1 END) as ijin,
        COUNT(CASE WHEN k.status = 'sakit' THEN 1 END) as sakit,
        COUNT(CASE WHEN k.status = 'alpa' THEN 1 END) as alpa,
        COUNT(*) as total_hadir
      FROM kehadiran k
      JOIN siswa s ON k.id_siswa = s.id
      JOIN kelas kl ON s.id_kelas = kl.id
      ${where}
      GROUP BY s.id, s.nis, s.nama, kl.nama_kelas
      ORDER BY kl.nama_kelas, s.nama ASC
    `, params);

    const pengaturan = await getSettings(await getDatabase());

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    const filename = `rekap_kehadiran_siswa_${tanggal_awal || 'all'}_${tanggal_akhir || 'all'}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    doc.pipe(res);

    writeHeader(doc, pengaturan, 'LAPORAN REKAPITULASI KEHADIRAN PER SISWA', `Periode: ${tanggal_awal || 'Semua Data'} s/d ${tanggal_akhir || 'Semua Data'}`);
    doc.fontSize(9).fillColor('#374151').font('Helvetica');
    doc.text(`Total Siswa: ${data.length}`);
    doc.moveDown(1);

    const pageWidth = doc.page.width - 80;
    const colWidths = [pageWidth * 0.05, pageWidth * 0.2, pageWidth * 0.1, pageWidth * 0.15, pageWidth * 0.1, pageWidth * 0.1, pageWidth * 0.1, pageWidth * 0.1, pageWidth * 0.1];
    const headers = ['No', 'Nama Siswa', 'NIS', 'Kelas', 'Hadir', 'Ijin', 'Sakit', 'Alpa', 'Hadir %'];
    const rows = data.map((d, i) => {
      const total = Number(d.hadir) + Number(d.ijin) + Number(d.sakit) + Number(d.alpa);
      const pct = total > 0 ? ((Number(d.hadir) / total) * 100).toFixed(1) : '0.0';
      return [String(i + 1), d.nama_siswa, d.nis || '-', d.nama_kelas || '-', String(d.hadir), String(d.ijin), String(d.sakit), String(d.alpa), `${pct}%`];
    });
    drawTable(doc, headers, rows, { columnWidths: colWidths, fontSize: 7 });

    doc.moveDown(2);
    writeSignature(doc, pengaturan);
    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/pdf/kehadiran-wali/:guru_id — Detail kehadiran by wali kelas
router.get('/pdf/kehadiran-wali/:guru_id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tanggal_awal, tanggal_akhir, status, search } = req.query;

    // Get kelas wali
    const [kelasList] = await db.execute('SELECT id, nama_kelas, tingkat FROM kelas WHERE id_wali = ?', [req.params.guru_id]);
    if (kelasList.length === 0) {
      return res.status(400).json({ message: 'Anda belum ditugaskan sebagai wali kelas' });
    }

    const kelasIds = kelasList.map(k => k.id);
    const placeholders = kelasIds.map(() => '?').join(',');
    const params = kelasIds.map(String);

    let where = ` WHERE s.id_kelas IN (${placeholders})`;

    if (tanggal_awal) { where += ' AND k.tanggal >= ?'; params.push(tanggal_awal); }
    if (tanggal_akhir) { where += ' AND k.tanggal <= ?'; params.push(tanggal_akhir); }
    if (status) { where += ' AND k.status = ?'; params.push(status); }
    if (search) { where += ' AND s.nama LIKE ?'; params.push(`%${search}%`); }

    const [data] = await db.execute(`
      SELECT 
        s.nis, s.nama as nama_siswa,
        kl.nama_kelas, kl.tingkat,
        k.tanggal, k.jam_masuk, k.jam_keluar, k.status
      FROM kehadiran k
      JOIN siswa s ON k.id_siswa = s.id
      JOIN kelas kl ON s.id_kelas = kl.id
      ${where}
      ORDER BY k.tanggal DESC, kl.nama_kelas, s.nama ASC
    `, params);

    // Count per status
    const counts = { hadir: 0, ijin: 0, sakit: 0, alpa: 0 };
    data.forEach(d => { if (counts[d.status] !== undefined) counts[d.status]++; });
    const totalData = data.length;

    const pengaturan = await getSettings(await getDatabase());

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    const filename = `kehadiran_wali_kelas_${tanggal_awal || 'all'}_${tanggal_akhir || 'all'}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    doc.pipe(res);

    const kelasInfo = kelasList.map(k => `${k.nama_kelas} (${k.tingkat})`).join(', ');
    writeHeader(doc, pengaturan, 'LAPORAN KEHADIRAN WALI KELAS', `Kelas: ${kelasInfo}  |  Periode: ${tanggal_awal || 'Semua'} s/d ${tanggal_akhir || 'Semua'}`);
    doc.fontSize(9).fillColor('#374151').font('Helvetica');
    doc.text(`Total Data: ${totalData}  |  Hadir: ${counts.hadir}  |  Ijin: ${counts.ijin}  |  Sakit: ${counts.sakit}  |  Alpa: ${counts.alpa}`);
    doc.moveDown(1);

    const pageWidth = doc.page.width - 80;
    const colWidths = [pageWidth * 0.12, pageWidth * 0.2, pageWidth * 0.12, pageWidth * 0.15, pageWidth * 0.12, pageWidth * 0.12, pageWidth * 0.17];
    const headers = ['NIS', 'Nama Siswa', 'Kelas', 'Tanggal', 'Jam Masuk', 'Jam Keluar', 'Status'];
    const rows = data.map(d => [
      d.nis || '-',
      d.nama_siswa,
      d.nama_kelas || '-',
      d.tanggal ? new Date(d.tanggal + 'T00:00:00').toLocaleDateString('id-ID') : '-',
      d.jam_masuk ? d.jam_masuk.slice(0, 5) : '-',
      d.jam_keluar ? d.jam_keluar.slice(0, 5) : '-',
      d.status ? d.status.charAt(0).toUpperCase() + d.status.slice(1) : '-',
    ]);
    drawTable(doc, headers, rows, { columnWidths: colWidths, fontSize: 7 });

    const pct = totalData > 0 ? ((counts.hadir / totalData) * 100).toFixed(1) : '0.0';
    writeGrandTotal(doc, 'GRAND TOTAL', `Hadir: ${counts.hadir} | Ijin: ${counts.ijin} | Sakit: ${counts.sakit} | Alpa: ${counts.alpa} | Total: ${totalData} | ${pct}% kehadiran`, pageWidth);

    doc.moveDown(2);
    writeSignature(doc, pengaturan);
    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/pdf/ringkasan-keuangan — Export ringkasan pemasukan vs pengeluaran
router.get('/pdf/ringkasan-keuangan', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tanggal_awal, tanggal_akhir, grup, id_jenis_pembayaran } = req.query;

    let dateFilter = '';
    const params = [];
    if (tanggal_awal) { dateFilter += ' AND t.tanggal_bayar >= ?'; params.push(tanggal_awal); }
    if (tanggal_akhir) { dateFilter += ' AND t.tanggal_bayar <= ?'; params.push(tanggal_akhir); }
    if (id_jenis_pembayaran) { dateFilter += ' AND t.id_jenis_pembayaran = ?'; params.push(id_jenis_pembayaran); }

    let groupFormat, labelKey, sortKey;
    let labelCol = 'Periode';
    if (grup === 'hari') {
      groupFormat = "DATE_FORMAT(t.tanggal_bayar, '%Y-%m-%d')";
      labelKey = 'tanggal';
      sortKey = 'MIN(t.tanggal_bayar)';
      labelCol = 'Tanggal';
    } else if (grup === 'tahun') {
      groupFormat = "DATE_FORMAT(t.tanggal_bayar, '%Y')";
      labelKey = 'tahun';
      sortKey = 'MIN(t.tanggal_bayar)';
      labelCol = 'Tahun';
    } else {
      groupFormat = "DATE_FORMAT(t.tanggal_bayar, '%Y-%m')";
      labelKey = 'periode';
      sortKey = 'MIN(t.tanggal_bayar)';
      labelCol = 'Periode';
    }

    const query = `
      SELECT 
        ${groupFormat} as \`${labelKey}\`,
        SUM(CASE WHEN t.jenis_transaksi = 'Masuk' THEN t.jumlah_bayar ELSE 0 END) as pemasukan,
        SUM(CASE WHEN t.jenis_transaksi = 'Keluar' THEN t.jumlah_bayar ELSE 0 END) as pengeluaran,
        COUNT(CASE WHEN t.jenis_transaksi = 'Masuk' THEN 1 END) as jumlah_pemasukan,
        COUNT(CASE WHEN t.jenis_transaksi = 'Keluar' THEN 1 END) as jumlah_pengeluaran,
        COUNT(*) as total_transaksi
      FROM transaksi t
      WHERE 1=1${dateFilter}
      GROUP BY ${groupFormat}
      ORDER BY ${sortKey} ASC
    `;

    const [data] = await db.execute(query, params);

    const rows = data.map(d => [
      d[labelKey],
      `${d.jumlah_pemasukan} / ${d.jumlah_pengeluaran}`,
      formatRupiah(d.pemasukan),
      formatRupiah(d.pengeluaran),
      Number(d.pemasukan) - Number(d.pengeluaran) >= 0
        ? formatRupiah(Number(d.pemasukan) - Number(d.pengeluaran))
        : `(${formatRupiah(Math.abs(Number(d.pemasukan) - Number(d.pengeluaran)))})`,
    ]);

    const grandPemasukan = data.reduce((s, r) => s + Number(r.pemasukan), 0);
    const grandPengeluaran = data.reduce((s, r) => s + Number(r.pengeluaran), 0);
    const grandSelisih = grandPemasukan - grandPengeluaran;
    const grandJumlahMasuk = data.reduce((s, r) => s + Number(r.jumlah_pemasukan), 0);
    const grandJumlahKeluar = data.reduce((s, r) => s + Number(r.jumlah_pengeluaran), 0);

    const pengaturan = await getSettings(await getDatabase());

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    const filename = `ringkasan_keuangan_${tanggal_awal || 'all'}_${tanggal_akhir || 'all'}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    doc.pipe(res);

    writeHeader(doc, pengaturan, 'RINGKASAN PEMASUKAN & PENGELUARAN', `Periode: ${tanggal_awal || 'Semua Data'} s/d ${tanggal_akhir || 'Semua Data'}  |  Grup: ${labelCol}`);
    doc.fontSize(9).fillColor('#374151').font('Helvetica');
    doc.text(`Total Periode: ${data.length}  |  Total Transaksi: ${data.reduce((s, r) => s + Number(r.total_transaksi), 0)}`);
    doc.moveDown(1);

    const pageWidth = doc.page.width - 80;
    const colWidths = [pageWidth * 0.18, pageWidth * 0.16, pageWidth * 0.22, pageWidth * 0.22, pageWidth * 0.22];
    const headers = [labelCol, 'Transaksi (M/K)', 'Pemasukan', 'Pengeluaran', 'Selisih'];
    drawTable(doc, headers, rows, { columnWidths: colWidths, fontSize: 8 });

    const selisihStr = grandSelisih >= 0
      ? formatRupiah(grandSelisih)
      : `(${formatRupiah(Math.abs(grandSelisih))})`;
    writeGrandTotal(doc, 'GRAND TOTAL', `Masuk: ${grandJumlahMasuk}x  |  Keluar: ${grandJumlahKeluar}x  |  Pemasukan: ${formatRupiah(grandPemasukan)}  |  Pengeluaran: ${formatRupiah(grandPengeluaran)}  |  Selisih: ${selisihStr}`, pageWidth);

    doc.moveDown(2);
    writeSignature(doc, pengaturan);
    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/pdf/wali-kelas — Export wali kelas per tingkat
router.get('/pdf/wali-kelas', async (req, res) => {
  try {
    const db = await getDatabase();
    const [kelas] = await db.execute(`
      SELECT 
        k.id, k.nama_kelas,
        CASE k.tingkat
          WHEN '10' THEN 'X'
          WHEN '11' THEN 'XI'
          WHEN '12' THEN 'XII'
          ELSE k.tingkat
        END as tingkat,
        g.nama AS wali_nama, g.nik AS wali_nik,
        (SELECT COUNT(*) FROM siswa s WHERE s.id_kelas = k.id) AS jumlah_siswa
      FROM kelas k
      LEFT JOIN guru g ON k.id_wali = g.id
      WHERE k.id_wali IS NOT NULL
      ORDER BY k.tingkat, k.nama_kelas
    `);

    const pengaturan = await getSettings(await getDatabase());

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    const filename = `wali_kelas.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    doc.pipe(res);

    writeHeader(doc, pengaturan, 'DAFTAR WALI KELAS PER TINGKAT');
    doc.fontSize(9).fillColor('#374151').font('Helvetica');
    doc.text(`Total Kelas: ${kelas.length}  |  Total Guru: ${kelas.filter(k => k.wali_nama).length} wali kelas`);
    doc.moveDown(1);

    const pageWidth = doc.page.width - 80;
    const colWidths = [pageWidth * 0.12, pageWidth * 0.2, pageWidth * 0.28, pageWidth * 0.18, pageWidth * 0.22];
    const headers = ['Tingkat', 'Kelas', 'Wali Kelas', 'NIK Wali', 'Jumlah Siswa'];
    const rows = kelas.map(k => [
      k.tingkat,
      k.nama_kelas,
      k.wali_nama || 'Belum ada wali',
      k.wali_nik || '-',
      String(k.jumlah_siswa),
    ]);
    drawTable(doc, headers, rows, { columnWidths: colWidths });

    const totalSiswa = kelas.reduce((s, k) => s + Number(k.jumlah_siswa), 0);
    writeGrandTotal(doc, 'GRAND TOTAL', `${kelas.length} kelas  |  ${kelas.filter(k => k.wali_nama).length} wali kelas  |  ${totalSiswa} siswa`, pageWidth);

    doc.moveDown(2);
    writeSignature(doc, pengaturan);
    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/pdf/transaksi-gabungan — Export transaksi gabungan (Masuk & Keluar)
router.get('/pdf/transaksi-gabungan', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tanggal_awal, tanggal_akhir, id_jenis_pembayaran, search, jenis_transaksi } = req.query;

    let query = `
      SELECT t.tanggal_bayar, t.jenis_transaksi, t.jumlah_bayar, t.keterangan, t.no_kwitansi,
             s.nama as nama_siswa, s.nis,
             jp.nama_pembayaran,
             u.nama as nama_user
      FROM transaksi t
      LEFT JOIN siswa s ON t.id_siswa = s.id
      JOIN jenis_pembayaran jp ON t.id_jenis_pembayaran = jp.id
      LEFT JOIN users u ON t.id_user = u.id
      WHERE 1=1
    `;
    const params = [];

    if (tanggal_awal) { query += ' AND t.tanggal_bayar >= ?'; params.push(tanggal_awal); }
    if (tanggal_akhir) { query += ' AND t.tanggal_bayar <= ?'; params.push(tanggal_akhir); }
    if (id_jenis_pembayaran) { query += ' AND t.id_jenis_pembayaran = ?'; params.push(id_jenis_pembayaran); }
    if (search) { query += ' AND (s.nama LIKE ? OR s.nis LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (jenis_transaksi) { query += ' AND t.jenis_transaksi = ?'; params.push(jenis_transaksi); }

    query += ' ORDER BY t.tanggal_bayar DESC, t.created_at DESC';

    const [data] = await db.execute(query, params);

    const totalMasuk = data
      .filter(t => t.jenis_transaksi === 'Masuk')
      .reduce((sum, t) => sum + Number(t.jumlah_bayar), 0);
    const totalKeluar = data
      .filter(t => t.jenis_transaksi === 'Keluar')
      .reduce((sum, t) => sum + Number(t.jumlah_bayar), 0);

    const pengaturan = await getSettings(await getDatabase());

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    const filename = `transaksi_gabungan_${tanggal_awal || 'all'}_${tanggal_akhir || 'all'}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    doc.pipe(res);

    writeHeader(doc, pengaturan, 'LAPORAN TRANSAKSI GABUNGAN (MASUK & KELUAR)',
      `Periode: ${tanggal_awal || 'Semua Data'} s/d ${tanggal_akhir || 'Semua Data'}`);
    doc.fontSize(9).fillColor('#374151').font('Helvetica');
    doc.text(`Total Transaksi: ${data.length}  |  Pemasukan: ${data.filter(t => t.jenis_transaksi === 'Masuk').length}x  |  Pengeluaran: ${data.filter(t => t.jenis_transaksi === 'Keluar').length}x`);
    doc.moveDown(1);

    const pageWidth = doc.page.width - 80;
    const colWidths = [pageWidth * 0.12, pageWidth * 0.07, pageWidth * 0.18, pageWidth * 0.08, pageWidth * 0.15, pageWidth * 0.15, pageWidth * 0.1, pageWidth * 0.15];
    const headers = ['Tanggal', 'Jenis', 'Siswa', 'NIS', 'Pembayaran', 'Keterangan', 'Petugas', 'Jumlah'];
    const rows = data.map(d => [
      new Date(d.tanggal_bayar).toLocaleDateString('id-ID'),
      d.jenis_transaksi || 'Masuk',
      d.nama_siswa || 'Non-Siswa',
      d.nis || '-',
      d.nama_pembayaran,
      d.keterangan || '-',
      d.nama_user || '-',
      formatRupiah(d.jumlah_bayar),
    ]);

    drawTable(doc, headers, rows, { columnWidths: colWidths, fontSize: 7 });

    const selisih = totalMasuk - totalKeluar;
    writeGrandTotal(doc, 'GRAND TOTAL PEMASUKAN', formatRupiah(totalMasuk), pageWidth);
    writeGrandTotal(doc, 'GRAND TOTAL PENGELUARAN', formatRupiah(totalKeluar), pageWidth);
    writeGrandTotal(doc, 'SELISIH', `${selisih >= 0 ? '+' : ''}${formatRupiah(selisih)}`, pageWidth);

    doc.fontSize(9).fillColor('#374151').font('Helvetica');
    doc.text(`Terbilang Pemasukan: # ${terbilang(totalMasuk)} Rupiah #`);
    doc.text(`Terbilang Pengeluaran: # ${terbilang(totalKeluar)} Rupiah #`);
    doc.moveDown(2);
    writeSignature(doc, pengaturan);
    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

module.exports = router;
