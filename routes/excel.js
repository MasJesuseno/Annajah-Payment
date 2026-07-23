const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const { getDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

function formatRupiah(val) {
  return `Rp ${(val || 0).toLocaleString('id-ID')}`;
}

// Helper to create workbook with styled header row
async function createWorkbook(headers, data, sheetName = 'Laporan') {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  // Define columns
  sheet.columns = headers.map((h, i) => ({
    header: h,
    key: `col${i}`,
    width: Math.max(h.length + 5, 18)
  }));

  // Style header
  const headerRow = sheet.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Add data
  data.forEach((row, rowIdx) => {
    const r = sheet.addRow(row);
    r.height = 22;
    r.eachCell((cell, colIdx) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle', horizontal: colIdx === headers.length - 1 ? 'right' : 'left' };
      // Zebra striping
      if (rowIdx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
      }
    });
  });

  return workbook;
}

// GET /api/laporan/excel/rekap
router.get('/excel/rekap', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tanggal_awal, tanggal_akhir, jenis_transaksi } = req.query;

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
    if (jenis_transaksi) { query += ' AND t.jenis_transaksi = ?'; params.push(jenis_transaksi); }
    query += ' GROUP BY jp.id ORDER BY total DESC';

    const [data] = await db.execute(query, params);
    const grandTotal = data.reduce((sum, r) => sum + Number(r.total), 0);

    const rows = data.map(d => [
      d.nama_pembayaran,
      d.periode || '-',
      d.jumlah_transaksi,
      formatRupiah(d.total)
    ]);
    rows.push(['', '', '', '']);
    rows.push(['GRAND TOTAL', '', '', formatRupiah(grandTotal)]);

    const workbook = await createWorkbook(
      ['Jenis Pembayaran', 'Periode', 'Jumlah Transaksi', 'Total'],
      rows,
      'Rekap Pembayaran'
    );

    const filename = `rekap_pembayaran_${tanggal_awal || 'all'}_${tanggal_akhir || 'all'}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/excel/per-bulan
router.get('/excel/per-bulan', async (req, res) => {
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
      return [nama, d ? d.jumlah_transaksi : 0, d ? formatRupiah(d.total) : formatRupiah(0)];
    });
    const grandTotal = data.reduce((sum, d) => sum + Number(d.total), 0);
    const grandCount = data.reduce((sum, d) => sum + d.jumlah_transaksi, 0);
    rows.push(['', '', '']);
    rows.push(['TOTAL', grandCount, formatRupiah(grandTotal)]);

    const workbook = await createWorkbook(
      ['Bulan', 'Jumlah Transaksi', 'Total Pembayaran'],
      rows,
      `Pembayaran ${year}`
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=pembayaran_per_bulan_${year}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/excel/siswa
router.get('/excel/siswa', async (req, res) => {
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
      SELECT t.*, jp.nama_pembayaran, jp.nominal as nominal_tagihan,
             s.nama as nama_siswa, s.nis
      FROM transaksi t
      JOIN jenis_pembayaran jp ON t.id_jenis_pembayaran = jp.id
      JOIN siswa s ON t.id_siswa = s.id
      WHERE t.id_siswa = ?${siswaFilter}
      ORDER BY t.tanggal_bayar DESC
    `, params);

    const namaSiswa = transaksi[0]?.nama_siswa || 'Siswa';
    const totalBayar = transaksi.reduce((sum, t) => sum + Number(t.jumlah_bayar), 0);

    const rows = transaksi.map(t => [
      new Date(t.tanggal_bayar).toLocaleDateString('id-ID'),
      t.nama_pembayaran,
      t.bulan_bayar || '-',
      formatRupiah(t.jumlah_bayar)
    ]);
    rows.push(['', '', '', '']);
    rows.push(['TOTAL', '', '', formatRupiah(totalBayar)]);

    const workbook = await createWorkbook(
      ['Tanggal', 'Jenis Pembayaran', 'Bulan', 'Jumlah'],
      rows,
      `Riwayat ${namaSiswa}`
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=riwayat_${namaSiswa.replace(/\s+/g, '_')}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/excel/transaksi
router.get('/excel/transaksi', async (req, res) => {
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

    const rows = data.map(d => [
      d.no_kwitansi || '-',
      new Date(d.tanggal_bayar).toLocaleDateString('id-ID'),
      d.jenis_transaksi || 'Masuk',
      d.nis,
      d.nama_siswa,
      d.nama_pembayaran,
      d.bulan_bayar || '-',
      formatRupiah(d.jumlah_bayar),
      d.petugas || '-'
    ]);
    rows.push(['', '', '', '', '', '', '', '', '']);
    rows.push(['GRAND TOTAL', '', '', '', '', '', '', formatRupiah(grandTotal), '']);

    const workbook = await createWorkbook(
      ['No. Kwitansi', 'Tanggal', 'Jenis', 'NIS', 'Nama Siswa', 'Pembayaran', 'Bulan', 'Jumlah', 'Petugas'],
      rows,
      'Semua Transaksi'
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=transaksi.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// ─── EXCEL KEHADIRAN ───

// GET /api/laporan/excel/kehadiran-rekap — Export rekap kehadiran per kelas
router.get('/excel/kehadiran-rekap', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tanggal_awal, tanggal_akhir, id_kelas } = req.query;

    let where = ' WHERE 1=1';
    const params = [];

    if (tanggal_awal) { where += ' AND k.tanggal >= ?'; params.push(tanggal_awal); }
    if (tanggal_akhir) { where += ' AND k.tanggal <= ?'; params.push(tanggal_akhir); }
    if (id_kelas) { where += ' AND s.id_kelas = ?'; params.push(id_kelas); }

    const [data] = await db.execute(`
      SELECT 
        kl.nama_kelas, kl.tingkat,
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

    const grandHadir = data.reduce((s, r) => s + Number(r.hadir), 0);
    const grandIjin = data.reduce((s, r) => s + Number(r.ijin), 0);
    const grandSakit = data.reduce((s, r) => s + Number(r.sakit), 0);
    const grandAlpa = data.reduce((s, r) => s + Number(r.alpa), 0);
    const grandTotal = grandHadir + grandIjin + grandSakit + grandAlpa;

    const tingkatLabel = { '10': 'X', '11': 'XI', '12': 'XII' };
    const rows = data.map(d => {
      const pct = d.total > 0 ? ((d.hadir / d.total) * 100).toFixed(1) + '%' : '0%';
      return [
        d.nama_kelas,
        tingkatLabel[d.tingkat] || d.tingkat,
        d.hadir,
        d.ijin,
        d.sakit,
        d.alpa,
        d.total,
        pct
      ];
    });
    const grandPct = grandTotal > 0 ? ((grandHadir / grandTotal) * 100).toFixed(1) + '%' : '0%';
    rows.push(['', '', '', '', '', '', '', '']);
    rows.push(['GRAND TOTAL', '', grandHadir, grandIjin, grandSakit, grandAlpa, grandTotal, grandPct]);

    const workbook = await createWorkbook(
      ['Kelas', 'Tingkat', 'Hadir', 'Ijin', 'Sakit', 'Alpa', 'Total', 'Kehadiran'],
      rows,
      'Rekap Kehadiran per Kelas'
    );

    const filename = `rekap_kehadiran_kelas.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/excel/kehadiran-siswa — Export rekap kehadiran per siswa
router.get('/excel/kehadiran-siswa', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tanggal_awal, tanggal_akhir, id_kelas } = req.query;

    let where = ' WHERE 1=1';
    const params = [];

    if (tanggal_awal) { where += ' AND k.tanggal >= ?'; params.push(tanggal_awal); }
    if (tanggal_akhir) { where += ' AND k.tanggal <= ?'; params.push(tanggal_akhir); }
    if (id_kelas) { where += ' AND s.id_kelas = ?'; params.push(id_kelas); }

    const [data] = await db.execute(`
      SELECT 
        s.nis, s.nama as nama_siswa,
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

    const rows = data.map((d, i) => {
      const totalRow = Number(d.hadir) + Number(d.ijin) + Number(d.sakit) + Number(d.alpa);
      const pct = totalRow > 0 ? ((d.hadir / totalRow) * 100).toFixed(1) + '%' : '0%';
      return [
        i + 1,
        d.nis,
        d.nama_siswa,
        d.nama_kelas || '-',
        d.hadir,
        d.ijin,
        d.sakit,
        d.alpa,
        totalRow,
        pct
      ];
    });

    const workbook = await createWorkbook(
      ['No', 'NIS', 'Nama Siswa', 'Kelas', 'Hadir', 'Ijin', 'Sakit', 'Alpa', 'Total', 'Kehadiran'],
      rows,
      'Rekap Kehadiran per Siswa'
    );

    const filename = `rekap_kehadiran_siswa.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/excel/kehadiran-wali/:guru_id — Export detail kehadiran by wali kelas
router.get('/excel/kehadiran-wali/:guru_id', async (req, res) => {
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

    const tingkatLabel = { '10': 'X', '11': 'XI', '12': 'XII' };
    const rows = data.map(d => [
      d.nis,
      d.nama_siswa,
      `${tingkatLabel[d.tingkat] || d.tingkat} ${d.nama_kelas}`,
      d.tanggal ? new Date(d.tanggal + 'T00:00:00').toLocaleDateString('id-ID') : '-',
      d.jam_masuk ? d.jam_masuk.slice(0, 5) : '-',
      d.jam_keluar ? d.jam_keluar.slice(0, 5) : '-',
      d.status ? d.status.charAt(0).toUpperCase() + d.status.slice(1) : '-',
    ]);

    const workbook = await createWorkbook(
      ['NIS', 'Nama Siswa', 'Kelas', 'Tanggal', 'Jam Masuk', 'Jam Keluar', 'Status'],
      rows,
      'Kehadiran Wali Kelas'
    );

    const filename = `kehadiran_wali_kelas.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/excel/ringkasan-keuangan — Export ringkasan pemasukan vs pengeluaran
router.get('/excel/ringkasan-keuangan', async (req, res) => {
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
      Number(d.jumlah_pemasukan),
      formatRupiah(d.pemasukan),
      Number(d.jumlah_pengeluaran),
      formatRupiah(d.pengeluaran),
      Number(d.pemasukan) - Number(d.pengeluaran) >= 0 ? formatRupiah(Number(d.pemasukan) - Number(d.pengeluaran)) : `(${formatRupiah(Math.abs(Number(d.pemasukan) - Number(d.pengeluaran)))})`,
    ]);

    const grandPemasukan = data.reduce((s, r) => s + Number(r.pemasukan), 0);
    const grandPengeluaran = data.reduce((s, r) => s + Number(r.pengeluaran), 0);
    const grandSelisih = grandPemasukan - grandPengeluaran;
    const grandJumlahMasuk = data.reduce((s, r) => s + Number(r.jumlah_pemasukan), 0);
    const grandJumlahKeluar = data.reduce((s, r) => s + Number(r.jumlah_pengeluaran), 0);

    rows.push(['', '', '', '', '', '']);
    rows.push([
      'GRAND TOTAL',
      grandJumlahMasuk,
      formatRupiah(grandPemasukan),
      grandJumlahKeluar,
      formatRupiah(grandPengeluaran),
      grandSelisih >= 0 ? formatRupiah(grandSelisih) : `(${formatRupiah(Math.abs(grandSelisih))})`,
    ]);

    const workbook = await createWorkbook(
      [labelCol, 'Jml Masuk', 'Pemasukan', 'Jml Keluar', 'Pengeluaran', 'Selisih'],
      rows,
      'Ringkasan Keuangan'
    );

    const filename = `ringkasan_keuangan_${tanggal_awal || 'all'}_${tanggal_akhir || 'all'}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/excel/wali-kelas — Export wali kelas per tingkat
router.get('/excel/wali-kelas', async (req, res) => {
  try {
    const db = await getDatabase();
    const [kelas] = await db.execute(`
      SELECT 
        k.id, k.nama_kelas, k.tingkat,
        g.id AS wali_id, g.nama AS wali_nama, g.nik AS wali_nik,
        (SELECT COUNT(*) FROM siswa s WHERE s.id_kelas = k.id) AS jumlah_siswa
      FROM kelas k
      LEFT JOIN guru g ON k.id_wali = g.id
      WHERE k.id_wali IS NOT NULL
      ORDER BY k.tingkat, k.nama_kelas
    `);

    const tingkatLabel = { '10': 'X', '11': 'XI', '12': 'XII' };
    const rows = kelas.map(k => [
      tingkatLabel[k.tingkat] || k.tingkat,
      k.nama_kelas,
      k.wali_nama || 'Belum ada wali',
      k.wali_nik || '-',
      k.jumlah_siswa,
    ]);

    const workbook = await createWorkbook(
      ['Tingkat', 'Kelas', 'Wali Kelas', 'NIK Wali', 'Jumlah Siswa'],
      rows,
      'Daftar Wali Kelas'
    );

    const filename = `wali_kelas.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/excel/transaksi-gabungan — Export transaksi gabungan (Masuk & Keluar)
router.get('/excel/transaksi-gabungan', async (req, res) => {
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
    rows.push(['', '', '', '', '', '', '', '']);
    rows.push(['GRAND TOTAL PEMASUKAN', '', '', '', '', '', '', formatRupiah(totalMasuk)]);
    rows.push(['GRAND TOTAL PENGELUARAN', '', '', '', '', '', '', formatRupiah(totalKeluar)]);
    rows.push(['SELISIH', '', '', '', '', '', '', formatRupiah(totalMasuk - totalKeluar)]);

    const workbook = await createWorkbook(
      ['Tanggal', 'Jenis', 'Siswa', 'NIS', 'Pembayaran', 'Keterangan', 'Petugas', 'Jumlah'],
      rows,
      'Transaksi Gabungan'
    );

    const filename = `transaksi_gabungan_${tanggal_awal || 'all'}_${tanggal_akhir || 'all'}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

module.exports = router;
