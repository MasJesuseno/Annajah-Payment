const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { handleError } = require('../helpers/errorHandler');
const { enrichGps, formatAddress } = require('../helpers/geocodeHelper');

router.use(authenticateToken);

// Helper: get guru_id for the current user (from DB since JWT doesn't include it)
async function getGuruId(db, userId) {
  const [rows] = await db.execute('SELECT id AS guru_id FROM guru WHERE id_user = ?', [userId]);
  return rows[0]?.guru_id || null;
}

// GET /api/kehadiran-guru — list all guru attendance (admin/bendahara)
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tanggal_awal, tanggal_akhir, id_guru, status, page, per_page } = req.query;

    let where = ' WHERE 1=1';
    const params = [];

    if (tanggal_awal) {
      where += ' AND k.tanggal >= ?';
      params.push(tanggal_awal);
    }
    if (tanggal_akhir) {
      where += ' AND k.tanggal <= ?';
      params.push(tanggal_akhir);
    }
    if (id_guru) {
      where += ' AND k.id_guru = ?';
      params.push(id_guru);
    }
    if (status === 'hadir') {
      where += ' AND k.jam_masuk IS NOT NULL AND k.jam_keluar IS NOT NULL';
    } else if (status === 'ijin' || status === 'belum_keluar') {
      where += ' AND k.jam_masuk IS NOT NULL AND k.jam_keluar IS NULL';
    } else if (status === 'alpa') {
      where += ' AND k.jam_masuk IS NULL';
    }

    const baseQuery = `
      FROM kehadiran_guru k
      JOIN guru g ON g.id = k.id_guru
    `;

    // Count total
    const [countRows] = await db.query(`SELECT COUNT(*) as total ${baseQuery}${where}`, params);
    const total = countRows[0].total;

    // Fetch data
    let query = `
      SELECT k.*, g.nik, g.nama AS nama_guru, g.foto
      ${baseQuery}${where}
      ORDER BY k.tanggal DESC, k.jam_masuk DESC
    `;

    let dataParams = [...params];
    if (page) {
      const pg = parseInt(page);
      const pp = parseInt(per_page);
      const limit = (pp && pp > 0) ? pp : 25;
      const offset = (pg && pg > 0) ? (pg - 1) * limit : 0;
      query += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    const [rows] = await db.query(query, dataParams);

    if (page) {
      const limit = parseInt(per_page) || 25;
      const currentPage = parseInt(page);
      res.json({
        data: rows,
        total,
        page: currentPage,
        per_page: limit,
        total_pages: Math.ceil(total / limit),
      });
    } else {
      res.json(rows);
    }
  } catch (error) {
    handleError(error, req, res, 'Gagal memuat data kehadiran guru');
  }
});

// GET /api/kehadiran-guru/saya — guru's own attendance
router.get('/saya', async (req, res) => {
  try {
    const db = await getDatabase();
    const idGuru = await getGuruId(db, req.user.id);

    if (!idGuru) {
      return res.status(400).json({ message: 'Akun guru tidak ditemukan' });
    }

    const { tanggal_awal, tanggal_akhir, page, per_page } = req.query;

    let where = ' WHERE k.id_guru = ?';
    const params = [idGuru];

    if (tanggal_awal) {
      where += ' AND k.tanggal >= ?';
      params.push(tanggal_awal);
    }
    if (tanggal_akhir) {
      where += ' AND k.tanggal <= ?';
      params.push(tanggal_akhir);
    }

    const baseQuery = ` FROM kehadiran_guru k JOIN guru g ON g.id = k.id_guru `;

    // Count
    const [countRows] = await db.query(`SELECT COUNT(*) as total ${baseQuery}${where}`, params);
    const total = countRows[0].total;

    let query = `
      SELECT k.*, g.nik, g.nama AS nama_guru, g.foto
      ${baseQuery}${where}
      ORDER BY k.tanggal DESC, k.jam_masuk DESC
    `;

    let dataParams = [...params];
    if (page) {
      const pg = parseInt(page);
      const pp = parseInt(per_page);
      const limit = (pp && pp > 0) ? pp : 25;
      const offset = (pg && pg > 0) ? (pg - 1) * limit : 0;
      query += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    const [rows] = await db.query(query, dataParams);

    if (page) {
      const limit = parseInt(per_page) || 25;
      const currentPage = parseInt(page);
      res.json({
        data: rows,
        total,
        page: currentPage,
        per_page: limit,
        total_pages: Math.ceil(total / limit),
      });
    } else {
      res.json(rows);
    }
  } catch (error) {
    handleError(error, req, res, 'Gagal memuat riwayat kehadiran');
  }
});

// GET /api/kehadiran-guru/status-hari-ini — check if already clocked in today
router.get('/status-hari-ini', async (req, res) => {
  try {
    const db = await getDatabase();
    const idGuru = await getGuruId(db, req.user.id);

    if (!idGuru) {
      return res.status(400).json({ message: 'Akun guru tidak ditemukan' });
    }

    const today = new Date().toISOString().split('T')[0];

    const [rows] = await db.execute(
      'SELECT id, jam_masuk, jam_keluar, gps_masuk, gps_keluar FROM kehadiran_guru WHERE id_guru = ? AND tanggal = ?',
      [idGuru, today]
    );

    // Helper to parse GPS JSON into display string
    const parseGps = (gpsRaw) => {
      if (!gpsRaw) return null;
      try {
        const parsed = JSON.parse(gpsRaw);
        if (parsed.kelurahan || parsed.kecamatan) {
          return {
            display: formatAddress(parsed),
            raw: parsed,
          };
        }
        return { display: `${parsed.lat || ''}, ${parsed.lng || ''}`, raw: parsed };
      } catch {
        return { display: gpsRaw, raw: null };
      }
    };

    if (rows[0]) {
      res.json({
        sudah_absen: true,
        sudah_keluar: !!rows[0].jam_keluar,
        data: {
          id: rows[0].id,
          jam_masuk: rows[0].jam_masuk ? rows[0].jam_masuk.slice(0, 5) : null,
          jam_keluar: rows[0].jam_keluar ? rows[0].jam_keluar.slice(0, 5) : null,
          gps_masuk: parseGps(rows[0].gps_masuk),
          gps_keluar: parseGps(rows[0].gps_keluar),
        }
      });
    } else {
      res.json({ sudah_absen: false, sudah_keluar: false, data: null });
    }
  } catch (error) {
    handleError(error, req, res, 'Gagal mengecek status kehadiran');
  }
});

// POST /api/kehadiran-guru/absen-masuk — clock in with GPS
router.post('/absen-masuk', async (req, res) => {
  try {
    const db = await getDatabase();
    const idGuru = await getGuruId(db, req.user.id);

    if (!idGuru) {
      return res.status(400).json({ message: 'Akun guru tidak ditemukan' });
    }

    const { gps_masuk } = req.body;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const jamMasuk = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // Cek apakah sudah absen hari ini
    const [existing] = await db.execute(
      'SELECT id FROM kehadiran_guru WHERE id_guru = ? AND tanggal = ?',
      [idGuru, today]
    );

    if (existing[0]) {
      return res.status(400).json({ message: 'Anda sudah melakukan absen masuk hari ini' });
    }

    // Enrich GPS dengan informasi wilayah (kelurahan, kecamatan, kabupaten, provinsi)
    let gps = gps_masuk || null;
    if (gps && typeof gps === 'object') {
      gps = await enrichGps(gps);
    }

    const [result] = await db.execute(
      'INSERT INTO kehadiran_guru (id_guru, tanggal, jam_masuk, gps_masuk) VALUES (?, ?, ?, ?)',
      [idGuru, today, jamMasuk, gps]
    );

    // Parse GPS for response
    let gpsDisplay = gps;
    try {
      const parsed = JSON.parse(gps);
      if (parsed.kelurahan) {
        gpsDisplay = formatAddress(parsed);
      }
    } catch {}

    res.status(201).json({
      id: result.insertId,
      message: 'Absen masuk berhasil',
      data: {
        id: result.insertId,
        tanggal: today,
        jam_masuk: jamMasuk.slice(0, 5),
        gps_masuk: gpsDisplay,
      }
    });
  } catch (error) {
    handleError(error, req, res, 'Gagal absen masuk');
  }
});

// PUT /api/kehadiran-guru/absen-keluar/:id — clock out with GPS
router.put('/absen-keluar/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const idGuru = await getGuruId(db, req.user.id);

    if (!idGuru) {
      return res.status(400).json({ message: 'Akun guru tidak ditemukan' });
    }

    const { gps_keluar } = req.body;

    // Validasi kepemilikan
    const [existing] = await db.execute(
      'SELECT id, jam_keluar FROM kehadiran_guru WHERE id = ? AND id_guru = ?',
      [req.params.id, idGuru]
    );

    if (!existing[0]) {
      return res.status(404).json({ message: 'Data kehadiran tidak ditemukan' });
    }

    if (existing[0].jam_keluar) {
      return res.status(400).json({ message: 'Anda sudah melakukan absen keluar hari ini' });
    }

    const now = new Date();
    const jamKeluar = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    let gps = gps_keluar || null;
    if (gps && typeof gps === 'object') {
      gps = await enrichGps(gps);
    }

    await db.execute(
      'UPDATE kehadiran_guru SET jam_keluar = ?, gps_keluar = ? WHERE id = ?',
      [jamKeluar, gps, req.params.id]
    );

    // Parse GPS for response
    let gpsDisplay = gps;
    try {
      const parsed = JSON.parse(gps);
      if (parsed.kelurahan) {
        gpsDisplay = formatAddress(parsed);
      }
    } catch {}

    res.json({
      message: 'Absen keluar berhasil',
      data: {
        id: parseInt(req.params.id),
        jam_keluar: jamKeluar.slice(0, 5),
        gps_keluar: gpsDisplay,
      }
    });
  } catch (error) {
    handleError(error, req, res, 'Gagal absen keluar');
  }
});

// GET /api/kehadiran-guru/trend — guru attendance trend (weekly/monthly)
router.get('/trend', async (req, res) => {
  try {
    const db = await getDatabase();
    const { periode } = req.query; // 'weekly' or 'monthly'

    if (periode === 'monthly') {
      const [data] = await db.execute(`
        SELECT
          DATE_FORMAT(k.tanggal, '%m') as \`key\`,
          DATE_FORMAT(k.tanggal, '%b') as label,
          COUNT(CASE WHEN k.jam_masuk IS NOT NULL THEN 1 END) as hadir,
          COUNT(*) as total
        FROM kehadiran_guru k
        WHERE DATE_FORMAT(k.tanggal, '%Y') = YEAR(CURDATE())
        GROUP BY DATE_FORMAT(k.tanggal, '%m'), DATE_FORMAT(k.tanggal, '%b')
        ORDER BY MIN(k.tanggal) ASC
      `);

      const bulanNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const result = bulanNames.map((nama, i) => {
        const key = String(i + 1).padStart(2, '0');
        const d = data.find(x => x.key === key);
        return {
          label: nama,
          hadir: d ? Number(d.hadir) : 0,
          total: d ? Number(d.total) : 0,
        };
      });

      const grandTotal = {
        hadir: result.reduce((s, r) => s + r.hadir, 0),
      };
      grandTotal.total = grandTotal.hadir;

      return res.json({ data: result, grand_total: grandTotal, periode: 'monthly' });
    }

    // Default: weekly — last 12 weeks
    const [data] = await db.execute(`
      SELECT
        YEARWEEK(k.tanggal) as \`key\`,
        DATE_FORMAT(DATE_SUB(k.tanggal, INTERVAL WEEKDAY(k.tanggal) DAY), '%d %b') as label,
        COUNT(CASE WHEN k.jam_masuk IS NOT NULL THEN 1 END) as hadir,
        COUNT(*) as total
      FROM kehadiran_guru k
      WHERE k.tanggal >= DATE_SUB(CURDATE(), INTERVAL 12 WEEK)
      GROUP BY YEARWEEK(k.tanggal)
      ORDER BY MIN(k.tanggal) ASC
    `);

    const result = data.map(d => ({
      label: d.label,
      hadir: Number(d.hadir),
      total: Number(d.total),
    }));

    const grandTotal = {
      hadir: result.reduce((s, r) => s + r.hadir, 0),
    };
    grandTotal.total = grandTotal.hadir;

    res.json({ data: result, grand_total: grandTotal, periode: 'weekly' });
  } catch (error) {
    handleError(error, req, res, 'Gagal memuat data trend kehadiran guru');
  }
});

// POST /api/kehadiran-guru — create manual attendance record (admin)
router.post('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id_guru, tanggal, jam_masuk, jam_keluar } = req.body;

    if (!id_guru || !tanggal) {
      return res.status(400).json({ message: 'Guru dan tanggal harus diisi' });
    }

    // Verify guru exists
    const [guru] = await db.execute('SELECT id, nama FROM guru WHERE id = ?', [id_guru]);
    if (!guru[0]) {
      return res.status(404).json({ message: 'Guru tidak ditemukan' });
    }

    // Check if record already exists for this guru on this date
    const [existing] = await db.execute(
      'SELECT id FROM kehadiran_guru WHERE id_guru = ? AND tanggal = ?',
      [id_guru, tanggal]
    );
    if (existing[0]) {
      return res.status(400).json({
        message: `Data kehadiran untuk ${guru[0].nama} pada tanggal ${tanggal} sudah ada`
      });
    }

    const [result] = await db.execute(
      'INSERT INTO kehadiran_guru (id_guru, tanggal, jam_masuk, jam_keluar) VALUES (?, ?, ?, ?)',
      [id_guru, tanggal, jam_masuk || null, jam_keluar || null]
    );

    const [created] = await db.execute(`
      SELECT k.*, g.nik, g.nama AS nama_guru, g.foto
      FROM kehadiran_guru k
      JOIN guru g ON g.id = k.id_guru
      WHERE k.id = ?
    `, [result.insertId]);

    res.status(201).json({ message: 'Data kehadiran berhasil ditambahkan', data: created[0] });
  } catch (error) {
    handleError(error, req, res, 'Gagal menambah data kehadiran');
  }
});

// PUT /api/kehadiran-guru/:id — update guru attendance record (admin)
router.put('/:id', async (req, res) => {

  try {
    const db = await getDatabase();
    const { id } = req.params;
    const { tanggal, jam_masuk, jam_keluar } = req.body;

    // Verify record exists
    const [existing] = await db.execute('SELECT id FROM kehadiran_guru WHERE id = ?', [id]);
    if (!existing[0]) {
      return res.status(404).json({ message: 'Data kehadiran tidak ditemukan' });
    }

    const fields = [];
    const params = [];

    if (tanggal !== undefined) {
      fields.push('tanggal = ?');
      params.push(tanggal);
    }
    if (jam_masuk !== undefined) {
      fields.push('jam_masuk = ?');
      params.push(jam_masuk || null);
    }
    if (jam_keluar !== undefined) {
      fields.push('jam_keluar = ?');
      params.push(jam_keluar || null);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'Tidak ada data yang diubah' });
    }

    params.push(id);
    await db.execute(`UPDATE kehadiran_guru SET ${fields.join(', ')} WHERE id = ?`, params);

    const [updated] = await db.execute(`
      SELECT k.*, g.nik, g.nama AS nama_guru, g.foto
      FROM kehadiran_guru k
      JOIN guru g ON g.id = k.id_guru
      WHERE k.id = ?
    `, [id]);

    res.json({ message: 'Data kehadiran berhasil diupdate', data: updated[0] });
  } catch (error) {
    handleError(error, req, res, 'Gagal mengupdate data kehadiran');
  }
});

// GET /api/kehadiran-guru/ringkasan — Summary stats for dashboard
router.get('/ringkasan', async (req, res) => {
  try {
    const db = await getDatabase();

    // Total guru
    const [guruRows] = await db.execute('SELECT COUNT(*) as total FROM guru');
    const totalGuru = guruRows[0].total;

    // Today
    const today = new Date().toISOString().split('T')[0];
    const [todayRows] = await db.execute(`
      SELECT
        COUNT(*) as total_hari_ini,
        SUM(CASE WHEN jam_masuk IS NOT NULL THEN 1 ELSE 0 END) as hadir,
        SUM(CASE WHEN jam_masuk IS NOT NULL AND jam_keluar IS NOT NULL THEN 1 ELSE 0 END) as sudah_keluar,
        SUM(CASE WHEN jam_masuk IS NULL THEN 1 ELSE 0 END) as belum_absen
      FROM kehadiran_guru
      WHERE tanggal = ?
    `, [today]);

    const td = todayRows[0];
    const hadirHariIni = Number(td.hadir);
    const sudahKeluarHariIni = Number(td.sudah_keluar);
    const ijinHariIni = 0;
    const belumAbsen = Math.max(0, totalGuru - Number(td.total_hari_ini));

    // Average daily attendance (last 30 days)
    const [avgRows] = await db.execute(`
      SELECT
        COUNT(DISTINCT tanggal) as hari_aktif,
        SUM(CASE WHEN jam_masuk IS NOT NULL AND jam_keluar IS NOT NULL THEN 1 ELSE 0 END) as total_hadir
      FROM kehadiran_guru
      WHERE tanggal >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `);

    const hariAktif = Number(avgRows[0].hari_aktif) || 1;
    const totalHadir = Number(avgRows[0].total_hadir);
    const rataRataHarian = parseFloat((totalHadir / hariAktif).toFixed(1));

    // Rata-rata per hari dalam seminggu terakhir
    const [avgWeekRows] = await db.execute(`
      SELECT
        COUNT(DISTINCT tanggal) as hari_aktif,
        SUM(CASE WHEN jam_masuk IS NOT NULL AND jam_keluar IS NOT NULL THEN 1 ELSE 0 END) as total_hadir
      FROM kehadiran_guru
      WHERE tanggal >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    `);

    const hariAktifWeek = Number(avgWeekRows[0].hari_aktif) || 1;
    const totalHadirWeek = Number(avgWeekRows[0].total_hadir);
    const rataRataMingguan = parseFloat((totalHadirWeek / hariAktifWeek).toFixed(1));

    res.json({
      total_guru: totalGuru,
      hadir_hari_ini: hadirHariIni,
      sudah_keluar_hari_ini: sudahKeluarHariIni,
      belum_keluar_hari_ini: Math.max(0, hadirHariIni - sudahKeluarHariIni),
      ijin_hari_ini: ijinHariIni,
      belum_absen: belumAbsen,
      total_hari_ini: Number(td.total_hari_ini),
      rata_rata_harian: rataRataHarian,
      rata_rata_mingguan: rataRataMingguan,
      persentase_hari_ini: totalGuru > 0 ? parseFloat(((hadirHariIni / totalGuru) * 100).toFixed(1)) : 0,
    });
  } catch (error) {
    handleError(error, req, res, 'Gagal memuat ringkasan kehadiran guru');
  }
});

// GET /api/kehadiran-guru/export-excel — Export guru attendance to Excel
router.get('/export-excel', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tanggal_awal, tanggal_akhir, id_guru, saya } = req.query;

    let where = ' WHERE 1=1';
    const params = [];

    if (saya === 'true') {
      const idGuru = await getGuruId(db, req.user.id);
      if (!idGuru) {
        return res.status(400).json({ message: 'Akun guru tidak ditemukan' });
      }
      where += ' AND k.id_guru = ?';
      params.push(idGuru);
    }

    if (tanggal_awal) {
      where += ' AND k.tanggal >= ?';
      params.push(tanggal_awal);
    }
    if (tanggal_akhir) {
      where += ' AND k.tanggal <= ?';
      params.push(tanggal_akhir);
    }
    if (id_guru) {
      where += ' AND k.id_guru = ?';
      params.push(id_guru);
    }

    const [rows] = await db.query(`
      SELECT k.*, g.nik, g.nama AS nama_guru
      FROM kehadiran_guru k
      JOIN guru g ON g.id = k.id_guru
      ${where}
      ORDER BY k.tanggal DESC, g.nama ASC
    `, params);

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Kehadiran Guru');

    const headers = ['No', 'Nama Guru', 'NIK', 'Tanggal', 'Jam Masuk', 'Jam Keluar', 'Status', 'GPS Masuk', 'GPS Keluar'];
    sheet.columns = headers.map((h) => ({
      header: h,
      key: h.toLowerCase().replace(/\s+/g, '_'),
      width: Math.max(h.length + 5, 16),
    }));

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

    // Helper to parse GPS JSON for Excel display (reuses formatAddress from geocodeHelper)
    const formatGpsCell = (gpsRaw) => {
      if (!gpsRaw) return '-';
      try {
        const parsed = JSON.parse(gpsRaw);
        if (parsed.kelurahan) return formatAddress(parsed);
        return `${parsed.lat || ''}, ${parsed.lng || ''}`;
      } catch {
        return gpsRaw;
      }
    };

    const statusColorMap = {
      hadir: 'FFDCFCE7', alpa: 'FFFEE2E2',
    };

    rows.forEach((row, idx) => {
      const status = row.jam_masuk ? 'Hadir'
        : 'Alpa';

      const r = sheet.addRow([
        idx + 1,
        row.nama_guru,
        row.nik || '-',
        row.tanggal ? new Date(row.tanggal).toLocaleDateString('id-ID') : '-',
        row.jam_masuk ? row.jam_masuk.slice(0, 5) : '-',
        row.jam_keluar ? row.jam_keluar.slice(0, 5) : '-',
        status,
        formatGpsCell(row.gps_masuk),
        formatGpsCell(row.gps_keluar),
      ]);
      r.height = 22;
      r.eachCell((cell, colIdx) => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' },
        };
        cell.alignment = { vertical: 'middle', horizontal: colIdx === 0 ? 'center' : 'left' };
        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        }
        // Color the status column
        if (colIdx === 6 && statusColorMap[status.toLowerCase()]) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColorMap[status.toLowerCase()] } };
        }
      });
    });

    const filename = `kehadiran_guru_${tanggal_awal || 'all'}_${tanggal_akhir || 'all'}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    handleError(error, req, res, 'Gagal export Excel kehadiran guru');
  }
});

// GET /api/kehadiran-guru/rekap-bulanan — Monthly attendance recap with daily summaries
router.get('/rekap-bulanan', async (req, res) => {
  try {
    const db = await getDatabase();
    const { bulan, tahun } = req.query;

    const month = parseInt(bulan) || (new Date().getMonth() + 1);
    const year = parseInt(tahun) || new Date().getFullYear();

    // Total guru
    const [guruRows] = await db.execute('SELECT COUNT(*) as total FROM guru');
    const totalGuru = guruRows[0].total;

    // Attendance records for the month with detail per teacher
    const [rows] = await db.execute(`
      SELECT
        k.id_guru,
        g.nama AS nama_guru,
        k.tanggal,
        k.jam_masuk,
        k.jam_keluar,
        k.gps_masuk,
        k.gps_keluar
      FROM kehadiran_guru k
      JOIN guru g ON g.id = k.id_guru
      WHERE YEAR(k.tanggal) = ? AND MONTH(k.tanggal) = ?
      ORDER BY k.tanggal ASC, g.nama ASC
    `, [year, month]);

    // Group by day
    const dailyMap = {};
    rows.forEach((row) => {
      const tgl = row.tanggal instanceof Date
        ? row.tanggal.toISOString().split('T')[0]
        : new Date(row.tanggal).toISOString().split('T')[0];

      if (!dailyMap[tgl]) {
        dailyMap[tgl] = {
          tanggal: tgl,
          detail: [],
          hadir: 0,
          alpa: 0,
          total: 0,
        };
      }

      let status;
      if (row.jam_masuk) {
        status = 'hadir';
        dailyMap[tgl].hadir++;
      } else {
        status = 'alpa';
        dailyMap[tgl].alpa++;
      }
      dailyMap[tgl].total++;

      dailyMap[tgl].detail.push({
        id_guru: row.id_guru,
        nama_guru: row.nama_guru,
        jam_masuk: row.jam_masuk ? row.jam_masuk.slice(0, 5) : null,
        jam_keluar: row.jam_keluar ? row.jam_keluar.slice(0, 5) : null,
        gps_masuk: row.gps_masuk,
        gps_keluar: row.gps_keluar,
        status,
      });
    });

    // Convert to array sorted by date
    const hari = Object.values(dailyMap).sort((a, b) => a.tanggal.localeCompare(b.tanggal));

    // Monthly summary
    const totalHari = hari.length;
    const totalHadir = hari.reduce((s, d) => s + d.hadir, 0);
    const totalAlpa = hari.reduce((s, d) => s + d.alpa, 0);
    const rataRataHarian = totalHari > 0 ? parseFloat((totalHadir / totalHari).toFixed(1)) : 0;

    res.json({
      hari,
      ringkasan: {
        total_guru: totalGuru,
        total_hari: totalHari,
        total_hadir: totalHadir,
        total_alpa: totalAlpa,
        rata_rata_harian: rataRataHarian,
        persentase_kehadiran: totalGuru > 0 && totalHari > 0
          ? parseFloat(((totalHadir / (totalGuru * totalHari)) * 100).toFixed(1))
          : 0,
      },
      bulan: month,
      tahun: year,
    });
  } catch (error) {
    handleError(error, req, res, 'Gagal memuat rekap bulanan kehadiran guru');
  }
});

// POST /api/kehadiran-guru/backfill-gps — Reverse geocode existing GPS coordinates (admin only)
router.post('/backfill-gps', async (req, res) => {
  try {
    // Only admin can trigger backfill
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Hanya admin yang dapat menjalankan backfill GPS' });
    }

    const db = await getDatabase();

    // Find records where gps_masuk or gps_keluar is:
    // 1. A plain coordinate string (not JSON), OR
    // 2. JSON without address fields (kelurahan/kecamatan) — needs re-enriching
    const [rows] = await db.execute(`
      SELECT id, gps_masuk, gps_keluar
      FROM kehadiran_guru
      WHERE (gps_masuk IS NOT NULL AND gps_masuk NOT LIKE '%kelurahan%')
         OR (gps_keluar IS NOT NULL AND gps_keluar NOT LIKE '%kelurahan%')
      ORDER BY id ASC
    `);

    if (rows.length === 0) {
      return res.json({ message: 'Tidak ada data GPS yang perlu di-backfill', total: 0, processed: 0, failed: 0 });
    }

    const total = rows.length;
    let processed = 0;
    let failed = 0;
    const errors = [];

    // Helper to check if GPS already has address info
    function hasAddressInfo(gpsRaw) {
      if (!gpsRaw) return false;
      return gpsRaw.includes('kelurahan') || gpsRaw.includes('kecamatan');
    }

    // Process sequentially to respect Nominatim rate limit (1 req/sec)
    for (const row of rows) {
      let updatedFields = [];
      let updatedValues = [];

      // Process gps_masuk — enrich if plain coords OR JSON without address fields
      if (row.gps_masuk && !hasAddressInfo(row.gps_masuk)) {
        try {
          const enriched = await enrichGps(row.gps_masuk);
          if (enriched && enriched !== row.gps_masuk) {
            updatedFields.push('gps_masuk = ?');
            updatedValues.push(enriched);
          }
        } catch (e) {
          failed++;
          errors.push({ id: row.id, field: 'gps_masuk', error: e.message });
        }
        // Wait 1.2s between Nominatim API calls
        await new Promise(r => setTimeout(r, 1200));
      }

      // Process gps_keluar — enrich if plain coords OR JSON without address fields
      if (row.gps_keluar && !hasAddressInfo(row.gps_keluar)) {
        try {
          const enriched = await enrichGps(row.gps_keluar);
          if (enriched && enriched !== row.gps_keluar) {
            updatedFields.push('gps_keluar = ?');
            updatedValues.push(enriched);
          }
        } catch (e) {
          failed++;
          errors.push({ id: row.id, field: 'gps_keluar', error: e.message });
        }
        // Wait 1.2s between Nominatim API calls
        await new Promise(r => setTimeout(r, 1200));
      }

      if (updatedFields.length > 0) {
        updatedValues.push(row.id);
        await db.execute(
          `UPDATE kehadiran_guru SET ${updatedFields.join(', ')} WHERE id = ?`,
          updatedValues
        );
        processed++;
      }
    }

    res.json({
      message: `Backfill selesai. ${processed} data berhasil diproses dari ${total} total.`,
      total,
      processed,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    handleError(error, req, res, 'Gagal menjalankan backfill GPS');
  }
});

module.exports = router;
