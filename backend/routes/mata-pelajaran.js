const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const ExcelJS = require('exceljs');
const { getDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');

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
    cb(null, `import_mapel_${Date.now()}${ext}`);
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

// GET / — Daftar semua mata pelajaran
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { search, status } = req.query;

    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('nama_pelajaran LIKE ?');
      params.push(`%${search}%`);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await db.execute(`
      SELECT id, nama_pelajaran, status, created_at
      FROM mata_pelajaran
      ${whereClause}
      ORDER BY nama_pelajaran ASC
    `, params);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat data mata pelajaran', error: error.message });
  }
});

// GET /:id — Detail mata pelajaran
router.get('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute(`
      SELECT * FROM mata_pelajaran WHERE id = ?
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// POST / — Tambah mata pelajaran
router.post('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { nama_pelajaran, status } = req.body;

    if (!nama_pelajaran) {
      return res.status(400).json({ message: 'Nama pelajaran harus diisi' });
    }

    const [result] = await db.execute(
      'INSERT INTO mata_pelajaran (nama_pelajaran, status) VALUES (?, ?)',
      [nama_pelajaran, status || 'aktif']
    );

    const [newRow] = await db.execute('SELECT * FROM mata_pelajaran WHERE id = ?', [result.insertId]);

    res.status(201).json(newRow[0]);
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambah mata pelajaran', error: error.message });
  }
});

// PUT /:id — Update mata pelajaran
router.put('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [existing] = await db.execute('SELECT * FROM mata_pelajaran WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });

    const { nama_pelajaran, status } = req.body;

    await db.execute(
      'UPDATE mata_pelajaran SET nama_pelajaran=?, status=? WHERE id=?',
      [
        nama_pelajaran !== undefined ? nama_pelajaran : existing[0].nama_pelajaran,
        status !== undefined ? status : existing[0].status,
        req.params.id
      ]
    );

    const [updated] = await db.execute('SELECT * FROM mata_pelajaran WHERE id = ?', [req.params.id]);

    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengupdate mata pelajaran', error: error.message });
  }
});

// DELETE /:id — Hapus mata pelajaran
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [existing] = await db.execute('SELECT * FROM mata_pelajaran WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });

    await db.execute('DELETE FROM mata_pelajaran WHERE id = ?', [req.params.id]);
    res.json({ message: 'Mata pelajaran berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus mata pelajaran', error: error.message });
  }
});

// GET /export — Export data mata pelajaran ke Excel
router.get('/export', async (req, res) => {
  try {
    const db = await getDatabase();
    const { search, status } = req.query;

    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('nama_pelajaran LIKE ?');
      params.push(`%${search}%`);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await db.execute(`
      SELECT nama_pelajaran, status
      FROM mata_pelajaran
      ${whereClause}
      ORDER BY nama_pelajaran ASC
    `, params);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Mata Pelajaran');

    const columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Nama Pelajaran', key: 'nama_pelajaran', width: 30 },
      { header: 'Status', key: 'status', width: 14 },
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
        nama_pelajaran: r.nama_pelajaran,
        status: r.status === 'aktif' ? 'Aktif' : 'Tidak Aktif',
      });
      row.height = 22;
      row.eachCell((cell, colIdx) => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' },
        };
        cell.alignment = { vertical: 'middle', horizontal: colIdx === 0 ? 'center' : 'left' };
        if (i % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        }
      });
    });

    // Footer
    const footerRow = sheet.addRow({
      no: '', nama_pelajaran: '',
      status: `Total: ${rows.length} mata pelajaran`
    });
    footerRow.eachCell((cell) => {
      cell.font = { bold: true, italic: true, size: 10, color: { argb: 'FF6B7280' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=data_mata_pelajaran.xlsx');
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
    const sheet = workbook.addWorksheet('Template Mata Pelajaran');

    const columns = [
      { header: 'Nama Pelajaran', key: 'nama_pelajaran', width: 30 },
      { header: 'Status', key: 'status', width: 14 },
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

    // Example row
    const exampleRow = sheet.addRow({
      nama_pelajaran: 'Matematika Wajib',
      status: 'aktif',
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
      { header: 'Kolom', key: 'kolom', width: 25 },
      { header: 'Keterangan', key: 'ket', width: 55 },
    ];
    const infoHeader = sheetInfo.getRow(1);
    infoHeader.height = 25;
    infoHeader.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    const infoData = [
      ['Nama Pelajaran', 'Wajib diisi. Nama mata pelajaran (contoh: Matematika Wajib)'],
      ['Status', 'Opsional. Aktif / Tidak Aktif (default: Aktif)'],
    ];
    for (const [kolom, ket] of infoData) {
      const r = sheetInfo.addRow({ kolom, ket });
      r.eachCell((cell) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { vertical: 'middle' };
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=template_import_mata_pelajaran.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengunduh template', error: error.message });
  }
});

// POST /import — Import mata pelajaran dari Excel
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
    if (!headers.some(h => h.includes('nama') || h.includes('pelajaran') || h.includes('mapel'))) {
      return res.status(400).json({
        message: 'Kolom Nama Pelajaran tidak ditemukan. Pastikan file memiliki kolom Nama Pelajaran.'
      });
    }

    const colMap = {
      nama_pelajaran: headers.findIndex(h => h.includes('nama') || h.includes('pelajaran') || h.includes('mapel')),
      status: headers.findIndex(h => h.includes('status')),
    };

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

      let hasValue = false;
      row.eachCell({ includeEmpty: false }, () => { hasValue = true; });
      if (!hasValue) return;

      const nama_pelajaran = getVal(colMap.nama_pelajaran);
      let status = getVal(colMap.status).toLowerCase();

      const rowErrors = [];
      if (!nama_pelajaran) rowErrors.push('Nama pelajaran tidak boleh kosong');

      if (status) {
        if (status === 'aktif' || status === 'active' || status === 'ya' || status === '1') {
          status = 'aktif';
        } else {
          status = 'tidak_aktif';
        }
      } else {
        status = 'aktif';
      }

      if (rowErrors.length === 0) {
        success.push({ nama_pelajaran, status });
      } else {
        errors.push({ row: rowIndex, nama: nama_pelajaran || '(kosong)', errors: rowErrors });
      }
    });

    // Insert
    const insertSuccess = [];
    const insertErrors = [];

    for (const data of success) {
      try {
        const [existing] = await db.execute(
          'SELECT id FROM mata_pelajaran WHERE nama_pelajaran = ?',
          [data.nama_pelajaran]
        );
        if (existing[0]) {
          insertErrors.push({ row: '-', nama: data.nama_pelajaran, errors: ['Mata pelajaran dengan nama tersebut sudah terdaftar'] });
          continue;
        }

        await db.execute(
          'INSERT INTO mata_pelajaran (nama_pelajaran, status) VALUES (?, ?)',
          [data.nama_pelajaran, data.status]
        );
        insertSuccess.push(data.nama_pelajaran);
      } catch (err) {
        insertErrors.push({ row: '-', nama: data.nama_pelajaran, errors: [err.message] });
      }
    }

    try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }

    const allErrors = [...errors, ...insertErrors];

    res.json({
      message: `Import selesai. ${insertSuccess.length} mata pelajaran berhasil diimport${allErrors.length > 0 ? `, ${allErrors.length} gagal.` : '.'}`,
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

module.exports = router;
