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
    cb(null, `import_pembayaran_${Date.now()}${ext}`);
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

// GET /api/pembayaran
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tahun_ajaran, status } = req.query;
    let query = 'SELECT * FROM jenis_pembayaran';
    const conditions = [];
    const params = [];
    if (tahun_ajaran) {
      conditions.push('tahun_ajaran = ?');
      params.push(tahun_ajaran);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY nama_pembayaran ASC';
    const [pembayaran] = await db.execute(query, params);
    res.json(pembayaran);
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/pembayaran/export — Export jenis pembayaran ke Excel
router.get('/export', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tahun_ajaran } = req.query;
    let query = 'SELECT * FROM jenis_pembayaran';
    const params = [];
    if (tahun_ajaran) {
      query += ' WHERE tahun_ajaran = ?';
      params.push(tahun_ajaran);
    }
    query += ' ORDER BY nama_pembayaran ASC';
    const [pembayaran] = await db.execute(query, params);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Jenis Pembayaran');

    const columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Nama Pembayaran', key: 'nama_pembayaran', width: 30 },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 16 },
      { header: 'Nominal', key: 'nominal', width: 20 },
      { header: 'Periode', key: 'periode', width: 14 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Keterangan', key: 'keterangan', width: 35 },
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

    // Periode label map
    const periodeLabel = { bulanan: 'Bulanan', semester: 'Semester', tahunan: 'Tahunan', sekali: 'Sekali' };

    // Data rows
    pembayaran.forEach((p, i) => {
      const row = sheet.addRow({
        no: i + 1,
        nama_pembayaran: p.nama_pembayaran,
        tahun_ajaran: p.tahun_ajaran,
        nominal: `Rp ${parseInt(p.nominal).toLocaleString('id-ID')}`,
        periode: periodeLabel[p.periode] || p.periode,
        status: p.status === 'aktif' ? 'Aktif' : 'Tidak Aktif',
        keterangan: p.keterangan || '-',
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

    // Footer total
    const footerRow = sheet.addRow({
      no: '', nama_pembayaran: '', tahun_ajaran: '',
      nominal: '', periode: '', keterangan: `Total: ${pembayaran.length} jenis pembayaran`
    });
    footerRow.eachCell((cell) => {
      cell.font = { bold: true, italic: true, size: 10, color: { argb: 'FF6B7280' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=jenis_pembayaran.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengexport data', error: error.message });
  }
});

// GET /api/pembayaran/import/template — Download template Excel
router.get('/import/template', async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Template Pembayaran');

    const columns = [
      { header: 'Nama Pembayaran', key: 'nama_pembayaran', width: 30 },
      { header: 'Tahun Ajaran', key: 'tahun_ajaran', width: 16 },
      { header: 'Nominal', key: 'nominal', width: 20 },
      { header: 'Periode', key: 'periode', width: 16 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Keterangan', key: 'keterangan', width: 35 },
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
      nama_pembayaran: 'SPP Bulanan',
      tahun_ajaran: '2024/2025',
      nominal: '250000',
      periode: 'bulanan',
      status: 'aktif',
      keterangan: 'Biaya SPP setiap bulan',
    });
    exampleRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
      cell.alignment = { vertical: 'middle' };
    });

    // Sheet kedua: daftar periode
    const sheetInfo = workbook.addWorksheet('Informasi');
    sheetInfo.columns = [
      { header: 'Kolom', key: 'kolom', width: 25 },
      { header: 'Keterangan', key: 'ket', width: 50 },
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
      ['Nama Pembayaran', 'Wajib diisi. Contoh: SPP Bulanan, Biaya Gedung, dll.'],
      ['Tahun Ajaran', 'Wajib diisi. Format: YYYY/YYYY (contoh: 2024/2025)'],
      ['Nominal', 'Wajib diisi. Angka tanpa titik (contoh: 250000)'],
      ['Periode', 'Pilihan: bulanan, semester, tahunan, sekali'],
      ['Status', 'Opsional. Aktif / Tidak Aktif (default: Aktif)'],
      ['Keterangan', 'Opsional. Deskripsi pembayaran'],
    ];
    for (const [kolom, ket] of infoData) {
      const r = sheetInfo.addRow({ kolom, ket });
      r.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' },
        };
        cell.alignment = { vertical: 'middle' };
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=template_import_pembayaran.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengunduh template', error: error.message });
  }
});

// POST /api/pembayaran/import — Import jenis pembayaran dari Excel
router.post('/import', uploadImport.single('file'), async (req, res) => {
  let importedFile = null;
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diupload' });
    }
    importedFile = req.file;

    const db = await getDatabase();

    // Baca workbook
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return res.status(400).json({ message: 'File Excel kosong atau tidak valid' });
    }

    // Baca baris pertama sebagai header
    const headerRow = sheet.getRow(1);
    const headers = [];
    headerRow.eachCell({ includeEmpty: false }, (cell) => {
      headers.push(String(cell.value || '').toLowerCase().replace(/\s+/g, ''));
    });

    // Validasi header minimal
    const requiredHeaders = ['nama', 'tahun', 'nominal'];
    const missingHeaders = requiredHeaders.filter(h => !headers.some(hh => hh.includes(h)));
    if (missingHeaders.length > 0) {
      return res.status(400).json({
        message: `Kolom wajib tidak ditemukan: ${missingHeaders.join(', ')}. Pastikan file memiliki kolom Nama Pembayaran, Tahun Ajaran, dan Nominal.`
      });
    }

    // Mapping index kolom
    const colMap = {
      nama_pembayaran: headers.findIndex(h => h.includes('nama') && (h.includes('pembayaran') || h.includes('bayar'))),
      tahun_ajaran: headers.findIndex(h => h.includes('tahun') || h.includes('ajaran') || h === 'ta'),
      nominal: headers.findIndex(h => h.includes('nominal') || h.includes('jumlah') || h === 'biaya'),
      periode: headers.findIndex(h => h.includes('periode') || h.includes('tipe')),
      keterangan: headers.findIndex(h => h.includes('keterangan') || h.includes('deskripsi') || h.includes('catatan')),
      status: headers.findIndex(h => h.includes('status')),
    };

    // Fallback jika tidak ada 'nama pembayaran' — mungkin kolom pertama adalah nama
    if (colMap.nama_pembayaran === -1) {
      colMap.nama_pembayaran = headers.findIndex(h => h.includes('nama') || h === 'pembayaran');
    }
    if (colMap.nominal === -1) {
      colMap.nominal = headers.findIndex(h => h.includes('nominal') || h.includes('nom') || h === 'rp');
    }

    const success = [];
    const errors = [];
    let rowNumber = 1;

    // Periode valid
    const periodeValid = ['bulanan', 'semester', 'tahunan', 'sekali'];

    // Proses setiap baris (mulai dari baris 2)
    sheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return;
      rowNumber = rowIndex;

      const getVal = (idx) => {
        if (idx === -1) return '';
        const cell = row.getCell(idx + 1);
        if (cell.value === null || cell.value === undefined) return '';
        return String(cell.value).trim();
      };

      // Lewati baris kosong (semua kolom kosong)
      let hasValue = false;
      row.eachCell({ includeEmpty: false }, () => { hasValue = true; });
      if (!hasValue) return;

      const nama_pembayaran = getVal(colMap.nama_pembayaran);
      const tahun_ajaran = getVal(colMap.tahun_ajaran);
      const nominalStr = getVal(colMap.nominal);
      let periode = getVal(colMap.periode).toLowerCase();
      let status = getVal(colMap.status).toLowerCase();
      const keterangan = getVal(colMap.keterangan);

      // Normalisasi status
      if (status) {
        if (status === 'aktif' || status === 'active' || status === 'ya' || status === '1') {
          status = 'aktif';
        } else {
          status = 'tidak_aktif';
        }
      } else {
        status = 'aktif'; // default
      }

      // Validasi
      const rowErrors = [];
      if (!nama_pembayaran) rowErrors.push('Nama pembayaran tidak boleh kosong');
      if (!tahun_ajaran) rowErrors.push('Tahun ajaran tidak boleh kosong');
      if (!nominalStr) {
        rowErrors.push('Nominal tidak boleh kosong');
      } else if (isNaN(parseInt(nominalStr.replace(/[^\d]/g, ''))) || parseInt(nominalStr.replace(/[^\d]/g, '')) <= 0) {
        rowErrors.push('Nominal harus berupa angka positif');
      }

      // Normalisasi periode
      if (periode) {
        const pMap = {
          'bulanan': 'bulanan', 'bulan': 'bulanan', 'monthly': 'bulanan',
          'semester': 'semester', 'semesteran': 'semester',
          'tahunan': 'tahunan', 'tahun': 'tahunan', 'annual': 'tahunan', 'yearly': 'tahunan',
          'sekali': 'sekali', 'satu kali': 'sekali', 'satu': 'sekali', 'once': 'sekali',
        };
        periode = pMap[periode] || periode;
        if (!periodeValid.includes(periode)) {
          rowErrors.push(`Periode "${periode}" tidak valid. Gunakan: bulanan, semester, tahunan, atau sekali`);
        }
      } else {
        periode = 'bulanan'; // default
      }

      if (rowErrors.length > 0) {
        errors.push({ row: rowIndex, nama: nama_pembayaran || '(kosong)', errors: rowErrors });
        return;
      }

      const nominal = parseInt(nominalStr.replace(/[^\d]/g, ''));
      success.push({ nama_pembayaran, tahun_ajaran, nominal, periode, status, keterangan });
    });

    // Insert data valid ke database
    const insertSuccess = [];
    const insertErrors = [];

    for (const data of success) {
      try {
        // Cek duplikat (nama + tahun ajaran yang sama)
        const [existing] = await db.execute(
          'SELECT id FROM jenis_pembayaran WHERE nama_pembayaran = ? AND tahun_ajaran = ?',
          [data.nama_pembayaran, data.tahun_ajaran]
        );
        if (existing[0]) {
          insertErrors.push({ row: '-', nama: data.nama_pembayaran, errors: ['Nama pembayaran dengan tahun ajaran yang sama sudah terdaftar'] });
          continue;
        }

        await db.execute(
          'INSERT INTO jenis_pembayaran (nama_pembayaran, tahun_ajaran, nominal, periode, status, keterangan) VALUES (?, ?, ?, ?, ?, ?)',
          [data.nama_pembayaran, data.tahun_ajaran, data.nominal, data.periode, data.status, data.keterangan || null]
        );

        insertSuccess.push(data.nama_pembayaran);
      } catch (err) {
        insertErrors.push({ row: '-', nama: data.nama_pembayaran, errors: [err.message] });
      }
    }

    // Hapus file temporary
    try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }

    const allErrors = [...errors, ...insertErrors];

    res.json({
      message: `Import selesai. ${insertSuccess.length} jenis pembayaran berhasil diimport${allErrors.length > 0 ? `, ${allErrors.length} gagal.` : '.'}`,
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

// GET /api/pembayaran/:id
router.get('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute('SELECT * FROM jenis_pembayaran WHERE id = ?', [req.params.id]);
    const pembayaran = rows[0];
    if (!pembayaran) {
      return res.status(404).json({ message: 'Jenis pembayaran tidak ditemukan' });
    }
    res.json(pembayaran);
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// POST /api/pembayaran
router.post('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { nama_pembayaran, tahun_ajaran, nominal, periode, keterangan, status } = req.body;
    if (!nama_pembayaran || !tahun_ajaran || !nominal) {
      return res.status(400).json({ message: 'Nama, tahun ajaran, dan nominal harus diisi' });
    }
    const [result] = await db.execute(
      'INSERT INTO jenis_pembayaran (nama_pembayaran, tahun_ajaran, nominal, periode, status, keterangan) VALUES (?, ?, ?, ?, ?, ?)',
      [nama_pembayaran, tahun_ajaran, nominal, periode || 'bulanan', status || 'aktif', keterangan || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Jenis pembayaran berhasil ditambahkan' });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// PUT /api/pembayaran/:id
router.put('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { nama_pembayaran, tahun_ajaran, nominal, periode, keterangan, status } = req.body;
    await db.execute(
      'UPDATE jenis_pembayaran SET nama_pembayaran=?, tahun_ajaran=?, nominal=?, periode=?, status=?, keterangan=? WHERE id=?',
      [nama_pembayaran, tahun_ajaran, nominal, periode, status || 'aktif', keterangan, req.params.id]
    );
    res.json({ message: 'Jenis pembayaran berhasil diupdate' });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// DELETE /api/pembayaran/:id
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [countRows] = await db.execute('SELECT COUNT(*) as count FROM transaksi WHERE id_jenis_pembayaran = ?', [req.params.id]);
    if (countRows[0].count > 0) {
      return res.status(400).json({ message: 'Tidak dapat menghapus jenis pembayaran yang sudah memiliki transaksi' });
    }
    await db.execute('DELETE FROM jenis_pembayaran WHERE id = ?', [req.params.id]);
    res.json({ message: 'Jenis pembayaran berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

module.exports = router;
