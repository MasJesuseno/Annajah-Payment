const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const ExcelJS = require('exceljs');
const { getDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { logActivity } = require('../helpers/activityLogHelper');

router.use(authenticateToken);

// ─── Konfigurasi Multer untuk Import ───
const uploadDir = path.join(__dirname, '..', 'uploads', 'temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const importStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `import_nilai_${Date.now()}${ext}`);
  },
});

const uploadImport = multer({
  storage: importStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      return cb(new Error('Format file tidak didukung. Gunakan .xlsx atau .csv.'));
    }
    cb(null, true);
  },
});

// GET / — Daftar semua nilai siswa
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id_periode, id_mata_pelajaran, id_siswa, id_guru, tahun_pelajaran, search } = req.query;

    const conditions = [];
    const params = [];

    if (id_periode) {
      conditions.push('ns.id_periode_penilaian = ?');
      params.push(id_periode);
    }
    if (id_mata_pelajaran) {
      conditions.push('ns.id_mata_pelajaran = ?');
      params.push(id_mata_pelajaran);
    }
    if (id_siswa) {
      conditions.push('ns.id_siswa = ?');
      params.push(id_siswa);
    }
    if (id_guru) {
      conditions.push('ns.id_guru = ?');
      params.push(id_guru);
    }
    if (tahun_pelajaran) {
      conditions.push('ns.tahun_pelajaran = ?');
      params.push(tahun_pelajaran);
    }
    if (search) {
      conditions.push('(s.nama LIKE ? OR ns.tahun_pelajaran LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await db.execute(`
      SELECT ns.id, ns.tahun_pelajaran, ns.id_siswa, ns.id_mata_pelajaran, ns.id_periode_penilaian,
        ns.nilai, ns.kkm, ns.keterangan, ns.id_guru, ns.created_at,
        s.nama AS nama_siswa, s.nis, s.foto AS foto_siswa,
        mp.nama_pelajaran,
        pp.periode AS nama_periode,
        g.nama AS nama_guru
      FROM nilai_siswa ns
      JOIN siswa s ON s.id = ns.id_siswa
      JOIN mata_pelajaran mp ON mp.id = ns.id_mata_pelajaran
      JOIN periode_penilaian pp ON pp.id = ns.id_periode_penilaian
      LEFT JOIN guru g ON g.id = ns.id_guru
      ${whereClause}
      ORDER BY ns.created_at DESC
    `, params);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat data nilai siswa', error: error.message });
  }
});

// POST / — Tambah nilai siswa
router.post('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tahun_pelajaran, id_siswa, id_mata_pelajaran, id_periode_penilaian, nilai, kkm, keterangan, id_guru } = req.body;

    if (!tahun_pelajaran || !id_siswa || !id_mata_pelajaran || !id_periode_penilaian || nilai === undefined || nilai === '') {
      return res.status(400).json({ message: 'Tahun pelajaran, siswa, mata pelajaran, periode penilaian, dan nilai harus diisi' });
    }

    const [result] = await db.execute(
      'INSERT INTO nilai_siswa (tahun_pelajaran, id_siswa, id_mata_pelajaran, id_periode_penilaian, nilai, kkm, keterangan, id_guru) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [tahun_pelajaran, id_siswa, id_mata_pelajaran, id_periode_penilaian, nilai, kkm || 75, keterangan || null, id_guru || null]
    );

    const [newRow] = await db.execute(`
      SELECT ns.*, s.nama AS nama_siswa, s.nis,
        mp.nama_pelajaran,
        pp.periode AS nama_periode,
        g.nama AS nama_guru
      FROM nilai_siswa ns
      JOIN siswa s ON s.id = ns.id_siswa
      JOIN mata_pelajaran mp ON mp.id = ns.id_mata_pelajaran
      JOIN periode_penilaian pp ON pp.id = ns.id_periode_penilaian
      LEFT JOIN guru g ON g.id = ns.id_guru
      WHERE ns.id = ?
    `, [result.insertId]);

    await logActivity(req, 'Tambah', 'Nilai Siswa', result.insertId, `Menambah nilai: ${tahun_pelajaran}`);
    res.status(201).json(newRow[0]);
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambah nilai siswa', error: error.message });
  }
});

// PUT /:id — Update nilai siswa
router.put('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [existing] = await db.execute('SELECT * FROM nilai_siswa WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });

    const { tahun_pelajaran, id_siswa, id_mata_pelajaran, id_periode_penilaian, nilai, kkm, keterangan, id_guru } = req.body;

    await db.execute(
      'UPDATE nilai_siswa SET tahun_pelajaran=?, id_siswa=?, id_mata_pelajaran=?, id_periode_penilaian=?, nilai=?, kkm=?, keterangan=?, id_guru=? WHERE id=?',
      [
        tahun_pelajaran !== undefined ? tahun_pelajaran : existing[0].tahun_pelajaran,
        id_siswa !== undefined ? id_siswa : existing[0].id_siswa,
        id_mata_pelajaran !== undefined ? id_mata_pelajaran : existing[0].id_mata_pelajaran,
        id_periode_penilaian !== undefined ? id_periode_penilaian : existing[0].id_periode_penilaian,
        nilai !== undefined ? nilai : existing[0].nilai,
        kkm !== undefined ? kkm : existing[0].kkm,
        keterangan !== undefined ? keterangan : existing[0].keterangan,
        id_guru !== undefined ? id_guru : existing[0].id_guru,
        req.params.id
      ]
    );

    const [updated] = await db.execute(`
      SELECT ns.*, s.nama AS nama_siswa, s.nis,
        mp.nama_pelajaran,
        pp.periode AS nama_periode,
        g.nama AS nama_guru
      FROM nilai_siswa ns
      JOIN siswa s ON s.id = ns.id_siswa
      JOIN mata_pelajaran mp ON mp.id = ns.id_mata_pelajaran
      JOIN periode_penilaian pp ON pp.id = ns.id_periode_penilaian
      LEFT JOIN guru g ON g.id = ns.id_guru
      WHERE ns.id = ?
    `, [req.params.id]);

    await logActivity(req, 'Ubah', 'Nilai Siswa', req.params.id, `Mengubah nilai #${req.params.id}`);
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengupdate nilai siswa', error: error.message });
  }
});

// DELETE /:id — Hapus nilai siswa
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [existing] = await db.execute('SELECT * FROM nilai_siswa WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });

    await db.execute('DELETE FROM nilai_siswa WHERE id = ?', [req.params.id]);
    await logActivity(req, 'Hapus', 'Nilai Siswa', req.params.id, `Menghapus nilai #${req.params.id}`);
    res.json({ message: 'Nilai siswa berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus nilai siswa', error: error.message });
  }
});



// GET /rekap — Rekap nilai per kelas dan periode
router.get('/rekap', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id_periode } = req.query;

    const periodeFilter = id_periode ? 'WHERE ns.id_periode_penilaian = ?' : '';
    const periodeParams = id_periode ? [id_periode] : [];

    // 1. Ringkasan umum
    let queryTotal = `
      SELECT
        COUNT(*) AS total_nilai,
        COUNT(DISTINCT ns.id_siswa) AS total_siswa,
        ROUND(AVG(ns.nilai), 2) AS rata_rata,
        ROUND(MIN(ns.nilai), 2) AS nilai_min,
        ROUND(MAX(ns.nilai), 2) AS nilai_max
      FROM nilai_siswa ns
      ${periodeFilter}
    `;
    const [totalRow] = await db.execute(queryTotal, periodeParams);

    // 2. Jumlah tuntas / belum tuntas
    let queryTuntas = `
      SELECT
        SUM(CASE WHEN ns.nilai >= ns.kkm THEN 1 ELSE 0 END) AS tuntas,
        SUM(CASE WHEN ns.nilai < ns.kkm THEN 1 ELSE 0 END) AS belum_tuntas
      FROM nilai_siswa ns
      ${periodeFilter}
    `;
    const [tuntasRow] = await db.execute(queryTuntas, periodeParams);

    // 3. Rekap per periode (untuk filter dropdown)
    let queryPerPeriode = `
      SELECT
        pp.id AS id_periode,
        pp.periode,
        COUNT(*) AS jumlah_nilai,
        COUNT(DISTINCT ns.id_siswa) AS jumlah_siswa,
        ROUND(AVG(ns.nilai), 2) AS rata_rata
      FROM nilai_siswa ns
      JOIN periode_penilaian pp ON pp.id = ns.id_periode_penilaian
      GROUP BY pp.id, pp.periode
      ORDER BY pp.created_at DESC
    `;
    const [perPeriode] = await db.execute(queryPerPeriode);

    res.json({
      ringkasan: {
        total_nilai: totalRow[0].total_nilai || 0,
        total_siswa: totalRow[0].total_siswa || 0,
        rata_rata: totalRow[0].rata_rata || 0,
        nilai_min: totalRow[0].nilai_min || 0,
        nilai_max: totalRow[0].nilai_max || 0,
        tuntas: tuntasRow[0].tuntas || 0,
        belum_tuntas: tuntasRow[0].belum_tuntas || 0,
      },
      per_periode: perPeriode,
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat rekap nilai', error: error.message });
  }
});

// GET /export — Export data nilai siswa ke Excel
router.get('/export', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id_periode, id_mata_pelajaran, id_guru, tahun_pelajaran, search } = req.query;

    const conditions = [];
    const params = [];

    if (id_periode) {
      conditions.push('ns.id_periode_penilaian = ?');
      params.push(id_periode);
    }
    if (id_mata_pelajaran) {
      conditions.push('ns.id_mata_pelajaran = ?');
      params.push(id_mata_pelajaran);
    }
    if (id_guru) {
      conditions.push('ns.id_guru = ?');
      params.push(id_guru);
    }
    if (tahun_pelajaran) {
      conditions.push('ns.tahun_pelajaran = ?');
      params.push(tahun_pelajaran);
    }
    if (search) {
      conditions.push('(s.nama LIKE ? OR ns.tahun_pelajaran LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await db.execute(`
      SELECT ns.tahun_pelajaran, s.nis, s.nama AS nama_siswa,
        mp.nama_pelajaran, pp.periode AS nama_periode,
        ns.nilai, ns.kkm, ns.keterangan,
        g.nama AS nama_guru
      FROM nilai_siswa ns
      JOIN siswa s ON s.id = ns.id_siswa
      JOIN mata_pelajaran mp ON mp.id = ns.id_mata_pelajaran
      JOIN periode_penilaian pp ON pp.id = ns.id_periode_penilaian
      LEFT JOIN guru g ON g.id = ns.id_guru
      ${whereClause}
      ORDER BY s.nama ASC
    `, params);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Nilai Siswa');

    const columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Tahun Pelajaran', key: 'tahun_pelajaran', width: 16 },
      { header: 'NIS', key: 'nis', width: 14 },
      { header: 'Nama Siswa', key: 'nama_siswa', width: 30 },
      { header: 'Mata Pelajaran', key: 'nama_pelajaran', width: 28 },
      { header: 'Nama Guru', key: 'nama_guru', width: 24 },
      { header: 'Periode', key: 'nama_periode', width: 28 },
      { header: 'Nilai', key: 'nilai', width: 10 },
      { header: 'KKM', key: 'kkm', width: 8 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Keterangan', key: 'keterangan', width: 30 },
    ];

    sheet.columns = columns;

    // Style header
    const headerRow = sheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    // Data rows
    rows.forEach((r, i) => {
      const nilai = parseFloat(r.nilai);
      const kkm = parseInt(r.kkm) || 75;
      const tuntas = !isNaN(nilai) && nilai >= kkm;

      const row = sheet.addRow({
        no: i + 1,
        tahun_pelajaran: r.tahun_pelajaran,
        nis: r.nis,
        nama_siswa: r.nama_siswa,
        nama_pelajaran: r.nama_pelajaran,
        nama_guru: r.nama_guru || '-',
        nama_periode: r.nama_periode,
        nilai: isNaN(nilai) ? '' : nilai,
        kkm: kkm,
        status: isNaN(nilai) ? '-' : (tuntas ? 'Tuntas' : 'Belum Tuntas'),
        keterangan: r.keterangan || '',
      });
      row.height = 22;
      row.eachCell((cell, colIdx) => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' },
        };
        cell.alignment = { vertical: 'middle', horizontal: colIdx === 0 ? 'center' : 'left' };
        if (i % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
        }
      });
    });

    // Footer
    const footerRow = sheet.addRow({
      no: '', tahun_pelajaran: '', nis: '', nama_siswa: '',
      nama_pelajaran: '', nama_guru: '', nama_periode: '',
      nilai: '', kkm: '', status: `Total: ${rows.length} data nilai`,
      keterangan: ''
    });
    footerRow.eachCell((cell) => {
      cell.font = { bold: true, italic: true, size: 10, color: { argb: 'FF6B7280' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=data_nilai_siswa.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengexport data', error: error.message });
  }
});

// GET /import/template — Download template Excel untuk import
router.get('/import/template', async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Template Nilai Siswa');

    const columns = [
      { header: 'Tahun Pelajaran', key: 'tahun_pelajaran', width: 16 },
      { header: 'NIS', key: 'nis', width: 14 },
      { header: 'Nama Siswa', key: 'nama_siswa', width: 30 },
      { header: 'Nama Mata Pelajaran', key: 'nama_pelajaran', width: 28 },
      { header: 'Nama Guru', key: 'nama_guru', width: 24 },
      { header: 'Periode', key: 'periode', width: 28 },
      { header: 'Nilai', key: 'nilai', width: 10 },
      { header: 'KKM', key: 'kkm', width: 8 },
      { header: 'Keterangan', key: 'keterangan', width: 30 },
    ];

    sheet.columns = columns;

    // Style header
    const headerRow = sheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    // Example row
    const exampleRow = sheet.addRow({
      tahun_pelajaran: '2024/2025',
      nis: '2024001',
      nama_siswa: 'Ahmad Fauzi',
      nama_pelajaran: 'Matematika Wajib',
      nama_guru: 'Budi Hartono',
      periode: 'Penilaian Tengah Semester Ganjil 2024/2025',
      nilai: 85,
      kkm: 75,
      keterangan: 'Baik',
    });
    exampleRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
      cell.alignment = { vertical: 'middle' };
    });

    // Sheet info
    const sheetInfo = workbook.addWorksheet('Informasi');
    sheetInfo.columns = [
      { header: 'Kolom', key: 'kolom', width: 22 },
      { header: 'Keterangan', key: 'ket', width: 60 },
    ];
    const infoHeader = sheetInfo.getRow(1);
    infoHeader.height = 25;
    infoHeader.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    const infoData = [
      ['Tahun Pelajaran', 'Wajib diisi (contoh: 2024/2025)'],
      ['NIS', 'Wajib diisi. NIS siswa yang sudah terdaftar di sistem'],
      ['Nama Siswa', 'Pelengkap (tidak dipakai untuk pencocokan). NIS yang digunakan'],
      ['Nama Mata Pelajaran', 'Wajib diisi. Nama mata pelajaran harus sesuai dengan data yang sudah ada'],
      ['Nama Guru', 'Opsional. Nama guru pengajar (harus sesuai dengan data guru yang sudah ada)'],
      ['Periode', 'Wajib diisi. Nama periode penilaian harus sesuai dengan data yang sudah ada'],
      ['Nilai', 'Wajib diisi. Angka 0-100 (contoh: 85)'],
      ['KKM', 'Opsional. Default: 75'],
      ['Keterangan', 'Opsional. Catatan tambahan'],
    ];
    for (const [kolom, ket] of infoData) {
      const r = sheetInfo.addRow({ kolom, ket });
      r.eachCell((cell) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { vertical: 'middle' };
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=template_import_nilai_siswa.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengunduh template', error: error.message });
  }
});

// POST /import — Import nilai siswa dari Excel
router.post('/import', uploadImport.single('file'), async (req, res) => {
  let importedFile = null;
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diupload' });
    }
    importedFile = req.file;

    const db = await getDatabase();

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return res.status(400).json({ message: 'File Excel kosong atau tidak valid' });
    }

    // Baca header
    const headerRow = sheet.getRow(1);
    const headers = [];
    headerRow.eachCell({ includeEmpty: false }, (cell) => {
      headers.push(String(cell.value || '').toLowerCase().replace(/\s+/g, ''));
    });

    // Validasi header
    const reqHeaders = ['tahun', 'nis', 'pelajaran', 'nilai'];
    const missing = reqHeaders.filter(h => !headers.some(hh => hh.includes(h)));
    if (missing.length > 0) {
      return res.status(400).json({
        message: `Kolom wajib tidak ditemukan: ${missing.join(', ')}. Pastikan file memiliki kolom Tahun Pelajaran, NIS, Nama Mata Pelajaran, dan Nilai.`
      });
    }

    const colMap = {
      tahun_pelajaran: headers.findIndex(h => h.includes('tahun')),
      nis: headers.findIndex(h => h.includes('nis')),
      nama_mapel: headers.findIndex(h => h.includes('pelajaran') || h.includes('mapel')),
      nama_guru: headers.findIndex(h => h.includes('guru')),
      periode: headers.findIndex(h => h.includes('periode')),
      nilai: headers.findIndex(h => h.includes('nilai')),
      kkm: headers.findIndex(h => h.includes('kkm')),
      keterangan: headers.findIndex(h => h.includes('keterangan') || h.includes('ket')),
    };

    // Ambil data referensi
    const [siswaRows] = await db.execute('SELECT id, nis, nama FROM siswa');
    const [mapelRows] = await db.execute('SELECT mp.id, mp.nama_pelajaran FROM mata_pelajaran mp');
    const [periodeRows] = await db.execute('SELECT id, periode FROM periode_penilaian');
    const [guruRows] = await db.execute('SELECT id, nama FROM guru');

    const siswaByNis = {};
    for (const s of siswaRows) {
      siswaByNis[s.nis.toLowerCase().trim()] = s;
    }
    const mapelMap = {};
    for (const m of mapelRows) {
      mapelMap[m.nama_pelajaran.toLowerCase().trim()] = m.id;
    }
    const periodeMap = {};
    for (const p of periodeRows) {
      periodeMap[p.periode.toLowerCase().trim()] = p.id;
    }
    const guruMap = {};
    for (const g of guruRows) {
      guruMap[g.nama.toLowerCase().trim()] = g.id;
    }

    const success = [];
    const errors = [];
    let rowNumber = 1;

    sheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return;
      rowNumber = rowIndex;

      const getVal = (idx) => {
        if (idx === -1) return '';
        const cell = row.getCell(idx + 1);
        if (cell.value === null || cell.value === undefined) return '';
        return String(cell.value).trim();
      };
      const getNum = (idx) => {
        if (idx === -1) return '';
        const cell = row.getCell(idx + 1);
        if (cell.value === null || cell.value === undefined) return '';
        return cell.value;
      };

      let hasValue = false;
      row.eachCell({ includeEmpty: false }, () => { hasValue = true; });
      if (!hasValue) return;

      const tahun_pelajaran = getVal(colMap.tahun_pelajaran);
      const nis = getVal(colMap.nis);
      const nama_mapel = getVal(colMap.nama_mapel);
      const nama_guru = getVal(colMap.nama_guru);
      const nama_periode = getVal(colMap.periode);
      const nilai = getNum(colMap.nilai);
      const kkm = getNum(colMap.kkm);
      const keterangan = getVal(colMap.keterangan);

      const rowErrors = [];
      if (!tahun_pelajaran) rowErrors.push('Tahun pelajaran tidak boleh kosong');
      if (!nis) rowErrors.push('NIS tidak boleh kosong');
      if (!nama_mapel) rowErrors.push('Mata pelajaran tidak boleh kosong');
      if (!nama_periode) rowErrors.push('Periode penilaian tidak boleh kosong');
      if (nilai === '' || nilai === undefined) rowErrors.push('Nilai tidak boleh kosong');

      if (rowErrors.length === 0) {
        const siswaData = nis ? siswaByNis[nis.toLowerCase().trim()] : undefined;
        const mapelId = nama_mapel ? mapelMap[nama_mapel.toLowerCase().trim()] : undefined;
        const periodeId = nama_periode ? periodeMap[nama_periode.toLowerCase().trim()] : undefined;
        const guruId = nama_guru ? guruMap[nama_guru.toLowerCase().trim()] : null;

        if (!siswaData) rowErrors.push(`Siswa dengan NIS "${nis}" tidak ditemukan`);
        if (!mapelId) rowErrors.push(`Mata pelajaran "${nama_mapel}" tidak ditemukan`);
        if (!periodeId) rowErrors.push(`Periode "${nama_periode}" tidak ditemukan`);
        if (nama_guru && !guruId) rowErrors.push(`Guru "${nama_guru}" tidak ditemukan`);

        const nilaiNum = parseFloat(nilai);
        if (isNaN(nilaiNum) || nilaiNum < 0 || nilaiNum > 100) {
          rowErrors.push('Nilai harus angka antara 0-100');
        }

        if (rowErrors.length === 0 && siswaData && mapelId && periodeId) {
          success.push({
            tahun_pelajaran,
            id_siswa: siswaData.id,
            id_mata_pelajaran: mapelId,
            id_periode_penilaian: periodeId,
            id_guru: guruId,
            nilai: nilaiNum,
            kkm: parseInt(kkm) || 75,
            keterangan: keterangan || null,
          });
        } else {
          errors.push({ row: rowIndex, nama: siswaData?.nama || nis || '(kosong)', errors: rowErrors });
        }
      } else {
        errors.push({ row: rowIndex, nama: nis || '(kosong)', errors: rowErrors });
      }
    });

    // Insert
    const insertSuccess = [];
    const insertErrors = [];

    for (const data of success) {
      try {
        const [existing] = await db.execute(
          'SELECT id FROM nilai_siswa WHERE tahun_pelajaran = ? AND id_siswa = ? AND id_mata_pelajaran = ? AND id_periode_penilaian = ?',
          [data.tahun_pelajaran, data.id_siswa, data.id_mata_pelajaran, data.id_periode_penilaian]
        );
        if (existing[0]) {
          insertErrors.push({ row: '-', nama: `${data.tahun_pelajaran} - ${data.id_siswa}`, errors: ['Data nilai untuk siswa dan periode yang sama sudah ada'] });
          continue;
        }

        await db.execute(
          'INSERT INTO nilai_siswa (tahun_pelajaran, id_siswa, id_mata_pelajaran, id_periode_penilaian, nilai, kkm, keterangan, id_guru) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [data.tahun_pelajaran, data.id_siswa, data.id_mata_pelajaran, data.id_periode_penilaian, data.nilai, data.kkm, data.keterangan, data.id_guru]
        );
        insertSuccess.push(data.tahun_pelajaran);
      } catch (err) {
        insertErrors.push({ row: '-', nama: data.tahun_pelajaran, errors: [err.message] });
      }
    }

    try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }

    const allErrors = [...errors, ...insertErrors];

    res.json({
      message: `Import selesai. ${insertSuccess.length} data nilai berhasil diimport${allErrors.length > 0 ? `, ${allErrors.length} gagal.` : '.'}`,
      success_count: insertSuccess.length,
      error_count: allErrors.length,
      total_row: rowNumber - 1,
      errors: allErrors,
    });

  } catch (error) {
    if (importedFile && req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }
    res.status(500).json({ message: 'Gagal mengimport data', error: error.message });
  }
});

// GET /:id — Detail nilai siswa
router.get('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute(`
      SELECT ns.*, s.nama AS nama_siswa, s.nis,
        mp.nama_pelajaran,
        pp.periode AS nama_periode,
        g.nama AS nama_guru
      FROM nilai_siswa ns
      JOIN siswa s ON s.id = ns.id_siswa
      JOIN mata_pelajaran mp ON mp.id = ns.id_mata_pelajaran
      JOIN periode_penilaian pp ON pp.id = ns.id_periode_penilaian
      LEFT JOIN guru g ON g.id = ns.id_guru
      WHERE ns.id = ?
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

module.exports = router;
