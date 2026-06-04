const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const ExcelJS = require('exceljs');
const { getDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { handleError } = require('../helpers/errorHandler');

router.use(authenticateToken);

// ─── Konfigurasi Multer untuk Import ───
const uploadDir = path.join(__dirname, '..', 'uploads', 'temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ─── Konfigurasi Multer untuk Upload Foto ───
const fotoDir = path.join(__dirname, '..', 'uploads', 'siswa');
if (!fs.existsSync(fotoDir)) {
  fs.mkdirSync(fotoDir, { recursive: true });
}

const fotoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, fotoDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `siswa_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`);
  },
});

const uploadFoto = multer({
  storage: fotoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      return cb(new Error('Format foto tidak didukung. Gunakan JPG, PNG, GIF, atau WebP.'));
    }
    cb(null, true);
  },
});

const importStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `import_siswa_${Date.now()}${ext}`);
  },
});

const uploadImport = multer({
  storage: importStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      return cb(new Error('Format file tidak didukung. Gunakan .xlsx atau .csv.'));
    }
    cb(null, true);
  },
});

// ─── Helper: Ambil mapping nama_kelas → id_kelas ───
async function getKelasMap(db) {
  const [kelas] = await db.execute('SELECT id, nama_kelas FROM kelas');
  const map = {};
  for (const k of kelas) {
    map[k.nama_kelas.toLowerCase().trim()] = k.id;
  }
  return map;
}

// Helper: sanitize date value to YYYY-MM-DD for MySQL
function sanitizeDate(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    // Convert ISO string (e.g. '2008-01-14T17:00:00.000Z') → '2008-01-14'
    if (value.includes('T')) return value.split('T')[0];
  }
  return value;
}

// Helper: build query conditions (WHERE clauses) for siswa filtering
function buildSiswaWhereClauses(queryParams) {
  const { kelas, status, search, wali_kelas, universitas, jurusan } = queryParams;
  let where = '';
  const params = [];

  if (kelas) {
    where += ' AND s.id_kelas = ?';
    params.push(kelas);
  }
  if (status) {
    const statusList = status.split(',').map(s => s.trim()).filter(Boolean);
    if (statusList.length === 1) {
      where += ' AND s.status = ?';
      params.push(statusList[0]);
    } else if (statusList.length > 1) {
      where += ` AND s.status IN (${statusList.map(() => '?').join(',')})`;
      params.push(...statusList);
    }
  }
  if (search) {
    where += ' AND (s.nama LIKE ? OR s.nis LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (wali_kelas) {
    where += ' AND k.id_wali = ?';
    params.push(wali_kelas);
  }
  if (universitas) {
    where += ' AND s.universitas = ?';
    params.push(universitas);
  }
  if (jurusan) {
    where += ' AND s.jurusan = ?';
    params.push(jurusan);
  }

  return { where, params };
}

// Helper: get total count of siswa matching filters
async function getSiswaCount(db, queryParams) {
  const { where, params } = buildSiswaWhereClauses(queryParams);
  const [rows] = await db.execute(`SELECT COUNT(*) as total FROM siswa s LEFT JOIN kelas k ON s.id_kelas = k.id WHERE 1=1${where}`, params);
  return rows[0].total;
}

// Helper: build query and fetch siswa data (used by GET / and export)
async function getSiswaData(db, queryParams) {
  const { page, per_page } = queryParams;
  const { where, params } = buildSiswaWhereClauses(queryParams);

  let query = `
    SELECT s.*, k.nama_kelas, k.tingkat, k.id_wali, g.nama AS wali_kelas
    FROM siswa s 
    LEFT JOIN kelas k ON s.id_kelas = k.id 
    LEFT JOIN guru g ON g.id = k.id_wali
    WHERE 1=1${where}
  `;

  query += ' ORDER BY s.nama ASC';

  // Apply pagination if page is provided
  if (page) {
    const limit = parseInt(per_page) || 25;
    const offset = (parseInt(page) - 1) * limit;
    query += ` LIMIT ${limit} OFFSET ${offset}`;
  }

  const [siswa] = await db.query(query, params);
  return siswa;
}

// GET /api/siswa - get all students (with pagination)
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { page, per_page } = req.query;

    if (page) {
      // Return paginated response
      const [siswa, total] = await Promise.all([
        getSiswaData(db, req.query),
        getSiswaCount(db, req.query),
      ]);
      const limit = parseInt(per_page) || 25;
      const currentPage = parseInt(page);
      res.json({
        data: siswa,
        total,
        page: currentPage,
        per_page: limit,
        total_pages: Math.ceil(total / limit),
      });
    } else {
      // No pagination — return flat array (backwards compatible for export, etc.)
      const siswa = await getSiswaData(db, req.query);
      res.json(siswa);
    }
  } catch (error) {
    handleError(error, req, res, 'Gagal memuat daftar siswa');
  }
});

// GET /api/siswa/filter-options — Get distinct universitas & jurusan values for dropdown filters
router.get('/filter-options', async (req, res) => {
  try {
    const db = await getDatabase();
    const [universitas] = await db.execute(
      "SELECT DISTINCT universitas FROM siswa WHERE universitas IS NOT NULL AND universitas != '' ORDER BY universitas"
    );
    const [jurusan] = await db.execute(
      "SELECT DISTINCT jurusan FROM siswa WHERE jurusan IS NOT NULL AND jurusan != '' ORDER BY jurusan"
    );
    res.json({
      universitas: universitas.map(u => u.universitas),
      jurusan: jurusan.map(j => j.jurusan),
    });
  } catch (error) {
    handleError(error, req, res, 'Gagal memuat opsi filter');
  }
});

// GET /api/siswa/export — Export data siswa ke Excel
router.get('/export', async (req, res) => {
  try {
    const db = await getDatabase();
    const siswa = await getSiswaData(db, req.query);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Data Siswa');

    // Definisi kolom
    const columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'NIS', key: 'nis', width: 14 },
      { header: 'NISN', key: 'nisn', width: 16 },
      { header: 'Nama Lengkap', key: 'nama', width: 30 },
      { header: 'Jenis Kelamin', key: 'jk', width: 16 },
      { header: 'Tempat Lahir', key: 'tempat_lahir', width: 18 },
      { header: 'Tanggal Lahir', key: 'tanggal_lahir', width: 16 },
      { header: 'Alamat', key: 'alamat', width: 35 },
      { header: 'No. Telepon', key: 'no_telp', width: 16 },
      { header: 'Kelas', key: 'kelas', width: 14 },
      { header: 'Asal Sekolah', key: 'asal_sekolah', width: 25 },
      { header: 'Alamat Sekolah', key: 'alamat_sekolah', width: 30 },
      { header: 'Kota Asal Sekolah', key: 'kota_asal_sekolah', width: 22 },
      { header: 'Universitas', key: 'universitas', width: 25 },
      { header: 'Jurusan', key: 'jurusan', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
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
    siswa.forEach((s, i) => {
      const row = sheet.addRow({
        no: i + 1,
        nis: s.nis,
        nisn: s.nisn || '-',
        nama: s.nama,
        jk: s.jenis_kelamin === 'L' ? 'Laki-laki' : s.jenis_kelamin === 'P' ? 'Perempuan' : '-',
        tempat_lahir: s.tempat_lahir || '-',
        tanggal_lahir: s.tanggal_lahir ? new Date(s.tanggal_lahir).toLocaleDateString('id-ID') : '-',
        alamat: s.alamat || '-',
        no_telp: s.no_telp || '-',
        kelas: s.nama_kelas || '-',
        asal_sekolah: s.asal_sekolah || '-',
        alamat_sekolah: s.alamat_sekolah || '-',
        kota_asal_sekolah: s.kota_asal_sekolah || '-',
        universitas: s.universitas || '-',
        jurusan: s.jurusan || '-',
        status: s.status || 'aktif',
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

    // Footer total
    const footerRow = sheet.addRow({
      no: '', nis: '', nisn: '', nama: '', jk: '', tempat_lahir: '',
      tanggal_lahir: '', alamat: '', no_telp: '', kelas: '', asal_sekolah: '',
      alamat_sekolah: '', kota_asal_sekolah: '', universitas: '', jurusan: '',
      status: `Total: ${siswa.length} siswa`
    });
    footerRow.eachCell((cell) => {
      cell.font = { bold: true, italic: true, size: 10, color: { argb: 'FF6B7280' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=data_siswa.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    handleError(error, req, res, 'Gagal mengexport data');
  }
});

// GET /api/siswa/:id
router.get('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute(`
      SELECT s.*, k.nama_kelas, k.tingkat, k.id_wali, g.nama AS wali_kelas
      FROM siswa s 
      LEFT JOIN kelas k ON s.id_kelas = k.id 
      LEFT JOIN guru g ON g.id = k.id_wali
      WHERE s.id = ?
    `, [req.params.id]);
    const siswa = rows[0];
    if (!siswa) {
      return res.status(404).json({ message: 'Siswa tidak ditemukan' });
    }
    res.json(siswa);
  } catch (error) {
    handleError(error, req, res, 'Gagal memuat data siswa');
  }
});

// POST /api/siswa/import — Import data siswa dari Excel/CSV
router.post('/import', (req, res, next) => {
  uploadImport.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Ukuran file maksimal 5MB' });
      }
      return res.status(400).json({ message: err.message || 'File tidak valid' });
    }
    next();
  });
}, async (req, res) => {
  let importedFile = null;
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diupload' });
    }
    importedFile = req.file;

    const db = await getDatabase();
    const kelasMap = await getKelasMap(db);

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
    const requiredHeaders = ['nis', 'nama'];
    const missingHeaders = requiredHeaders.filter(h => !headers.some(hh => hh.includes(h)));
    if (missingHeaders.length > 0) {
      return res.status(400).json({
        message: `Kolom wajib tidak ditemukan: ${missingHeaders.join(', ')}. Pastikan file memiliki kolom NIS dan Nama.`
      });
    }

    // Mapping index kolom
    const colMap = {
      nis: headers.findIndex(h => h.includes('nis') && !h.includes('nisn')),
      nisn: headers.findIndex(h => h.includes('nisn')),
      nama: headers.findIndex(h => h.includes('nama')),
      jenis_kelamin: headers.findIndex(h => h.includes('jenis') || h.includes('kelamin') || h === 'jk' || h === 'jkelamin'),
      tempat_lahir: headers.findIndex(h => h.includes('tempat')),
      tanggal_lahir: headers.findIndex(h => h.includes('tanggal') || (h.includes('tgl') && h.includes('lahir'))),
      alamat: headers.findIndex(h => h.includes('alamat') && !h.includes('sekolah')),
      no_telp: headers.findIndex(h => h.includes('telp') || h.includes('telepon') || h.includes('notelp') || h.includes('hp') || h.includes('wa')),
      kelas: headers.findIndex(h => h.includes('kelas') || h.includes('tingkat')),
      asal_sekolah: headers.findIndex(h => (h.includes('asal') && h.includes('sekolah')) || h === 'asalsekolah'),
      alamat_sekolah: headers.findIndex(h => h.includes('alamat') && h.includes('sekolah')),
      kota_asal_sekolah: headers.findIndex(h => (h.includes('kota') && h.includes('sekolah')) || h.includes('kotasekolah') || h.includes('kotaasal')),
      universitas: headers.findIndex(h => h.includes('universitas') || h.includes('univ')),
      jurusan: headers.findIndex(h => h.includes('jurusan')),
    };

    const success = [];
    const errors = [];
    let rowNumber = 1;

    // Proses setiap baris (mulai dari baris 2)
    sheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return; // skip header
      rowNumber = rowIndex;

      const getVal = (idx) => {
        if (idx === -1) return '';
        const cell = row.getCell(idx + 1);
        if (cell.value === null || cell.value === undefined) return '';
        if (cell.value instanceof Date) {
          return cell.value.toISOString().split('T')[0]; // Format: YYYY-MM-DD
        }
        return String(cell.value).trim();
      };

      const nis = getVal(colMap.nis);
      const nama = getVal(colMap.nama);
      const nisn = getVal(colMap.nisn);
      let jenis_kelamin = getVal(colMap.jenis_kelamin);
      const tempat_lahir = getVal(colMap.tempat_lahir);
      const tanggal_lahir = getVal(colMap.tanggal_lahir);
      const alamat = getVal(colMap.alamat);
      const no_telp = getVal(colMap.no_telp);
      const kelasName = getVal(colMap.kelas);

      // Validasi
      const rowErrors = [];
      if (!nis) rowErrors.push('NIS tidak boleh kosong');
      if (!nama) rowErrors.push('Nama tidak boleh kosong');

      // Normalisasi jenis kelamin
      if (jenis_kelamin) {
        const jk = jenis_kelamin.toUpperCase();
        if (jk === 'LAKI-LAKI' || jk === 'LAKI' || jk === 'L') {
          jenis_kelamin = 'L';
        } else if (jk === 'PEREMPUAN' || jk === 'WANITA' || jk === 'P') {
          jenis_kelamin = 'P';
        } else {
          rowErrors.push('Jenis kelamin tidak valid (gunakan L/P atau Laki-laki/Perempuan)');
        }
      }

      if (rowErrors.length > 0) {
        errors.push({ row: rowIndex, nis, nama, errors: rowErrors });
        return;
      }

      // Cari id_kelas dari nama kelas
      let id_kelas = null;
      if (kelasName) {
        const key = kelasName.toLowerCase().trim();
        id_kelas = kelasMap[key] || null;
        if (!id_kelas) {
          errors.push({ row: rowIndex, nis, nama, errors: [`Kelas "${kelasName}" tidak ditemukan`] });
          return;
        }
      }

      const asal_sekolah = getVal(colMap.asal_sekolah);
      const alamat_sekolah = getVal(colMap.alamat_sekolah);
      const kota_asal_sekolah = getVal(colMap.kota_asal_sekolah);
      const universitas = getVal(colMap.universitas);
      const jurusan = getVal(colMap.jurusan);

      success.push({ nis, nisn, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telp, id_kelas, asal_sekolah, alamat_sekolah, kota_asal_sekolah, universitas, jurusan });
    });

    // Insert data valid ke database
    const insertSuccess = [];
    const insertErrors = [];

    for (const data of success) {
      try {
        // Cek duplikat NIS
        const [existing] = await db.execute('SELECT id FROM siswa WHERE nis = ?', [data.nis]);
        if (existing[0]) {
          insertErrors.push({ row: '-', nis: data.nis, nama: data.nama, errors: ['NIS sudah terdaftar'] });
          continue;
        }

        await db.execute(`
          INSERT INTO siswa (nis, nisn, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telp, foto, id_kelas, status, asal_sekolah, alamat_sekolah, kota_asal_sekolah, universitas, jurusan)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [data.nis, data.nisn || null, data.nama, data.jenis_kelamin || null, data.tempat_lahir || null,
            data.tanggal_lahir || null, data.alamat || null, data.no_telp || null, null, data.id_kelas, 'aktif',
            data.asal_sekolah || null, data.alamat_sekolah || null, data.kota_asal_sekolah || null,
            data.universitas || null, data.jurusan || null]);

        insertSuccess.push(data.nis);
      } catch (err) {
        insertErrors.push({ row: '-', nis: data.nis, nama: data.nama, errors: [err.message] });
      }
    }

    // Hapus file temporary
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) { /* ignore */ }

    // Gabungkan error parsing + error insert
    const allErrors = [...errors, ...insertErrors];

    res.json({
      message: `Import selesai. ${insertSuccess.length} siswa berhasil diimport${allErrors.length > 0 ? `, ${allErrors.length} gagal.` : '.'}`,
      success_count: insertSuccess.length,
      error_count: allErrors.length,
      total_row: rowNumber - 1,
      errors: allErrors,
    });

  } catch (error) {
    // Hapus file jika ada error
    if (importedFile && req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }
    handleError(error, req, res, 'Gagal mengimport data');
  }
});

// GET /api/siswa/import/template — Download template Excel
router.get('/import/template', async (req, res) => {
  try {
    const db = await getDatabase();
    const [kelas] = await db.execute('SELECT nama_kelas FROM kelas ORDER BY tingkat, nama_kelas');

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Template Siswa');

    // Definisi kolom
    const columns = [
      { header: 'NIS', key: 'nis', width: 15 },
      { header: 'NISN', key: 'nisn', width: 15 },
      { header: 'Nama Lengkap', key: 'nama', width: 30 },
      { header: 'Jenis Kelamin', key: 'jenis_kelamin', width: 18 },
      { header: 'Tempat Lahir', key: 'tempat_lahir', width: 20 },
      { header: 'Tanggal Lahir', key: 'tanggal_lahir', width: 18 },
      { header: 'Alamat', key: 'alamat', width: 35 },
      { header: 'No. Telepon', key: 'no_telp', width: 18 },
      { header: 'Kelas', key: 'kelas', width: 15 },
      { header: 'Asal Sekolah', key: 'asal_sekolah', width: 25 },
      { header: 'Alamat Sekolah', key: 'alamat_sekolah', width: 30 },
      { header: 'Kota Asal Sekolah', key: 'kota_asal_sekolah', width: 22 },
      { header: 'Universitas', key: 'universitas', width: 25 },
      { header: 'Jurusan', key: 'jurusan', width: 20 },
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

    // Contoh data
    const exampleRow = sheet.addRow({
      nis: '2025001',
      nisn: '0012345999',
      nama: 'Contoh Siswa',
      jenis_kelamin: 'L',
      tempat_lahir: 'Jakarta',
      tanggal_lahir: '2008-01-01',
      alamat: 'Jl. Contoh No. 1',
      no_telp: '081234567899',
      kelas: kelas[0]?.nama_kelas || '',
      asal_sekolah: 'SMP Contoh',
      alamat_sekolah: 'Jl. Sekolah No. 1',
      kota_asal_sekolah: 'Jakarta',
      universitas: 'Universitas Indonesia',
      jurusan: 'Teknik Informatika',
    });
    exampleRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
      cell.alignment = { vertical: 'middle' };
    });

    // Sheet kedua: daftar kelas
    const sheetKelas = workbook.addWorksheet('Daftar Kelas');
    sheetKelas.columns = [
      { header: 'Nama Kelas', key: 'kelas', width: 20 },
    ];
    const kelasHeader = sheetKelas.getRow(1);
    kelasHeader.height = 25;
    kelasHeader.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    for (const k of kelas) {
      const r = sheetKelas.addRow({ kelas: k.nama_kelas });
      r.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' },
        };
        cell.alignment = { vertical: 'middle' };
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=template_import_siswa.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    handleError(error, req, res, 'Gagal mengunduh template');
  }
});

// POST /api/siswa
router.post('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { nis, nisn, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telp, email, id_kelas, status, asal_sekolah, alamat_sekolah, kota_asal_sekolah, universitas, jurusan } = req.body;

    if (!nis || !nama) {
      return res.status(400).json({ message: 'NIS dan Nama harus diisi' });
    }

    const [existingRows] = await db.execute('SELECT id FROM siswa WHERE nis = ?', [nis]);
    if (existingRows[0]) {
      return res.status(400).json({ message: 'NIS sudah terdaftar' });
    }

    const [result] = await db.execute(`
      INSERT INTO siswa (nis, nisn, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telp, email, foto, id_kelas, status, asal_sekolah, alamat_sekolah, kota_asal_sekolah, universitas, jurusan)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [nis, nisn || null, nama, jenis_kelamin || null, tempat_lahir || null, sanitizeDate(tanggal_lahir), alamat || null, no_telp || null, email || null, null, id_kelas || null, status || 'aktif', asal_sekolah || null, alamat_sekolah || null, kota_asal_sekolah || null, universitas || null, jurusan || null]);

    res.status(201).json({ id: result.insertId, message: 'Siswa berhasil ditambahkan' });
  } catch (error) {
    handleError(error, req, res, 'Gagal menambah siswa');
  }
});

// PUT /api/siswa/:id
router.put('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { nis, nisn, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telp, email, id_kelas, status, asal_sekolah, alamat_sekolah, kota_asal_sekolah, universitas, jurusan } = req.body;

    if (!nis || !nama) {
      return res.status(400).json({ message: 'NIS dan Nama harus diisi' });
    }

    const [existingRows] = await db.execute('SELECT id FROM siswa WHERE nis = ? AND id != ?', [nis, req.params.id]);
    if (existingRows[0]) {
      return res.status(400).json({ message: 'NIS sudah digunakan siswa lain' });
    }

    await db.execute(`
      UPDATE siswa SET nis=?, nisn=?, nama=?, jenis_kelamin=?, tempat_lahir=?, 
      tanggal_lahir=?, alamat=?, no_telp=?, email=?, id_kelas=?, status=?, asal_sekolah=?, alamat_sekolah=?, kota_asal_sekolah=?, universitas=?, jurusan=?
      WHERE id=?
    `, [nis, nisn || null, nama, jenis_kelamin || null, tempat_lahir || null, sanitizeDate(tanggal_lahir), alamat || null, no_telp || null, email || null, id_kelas || null, status || 'aktif', asal_sekolah || null, alamat_sekolah || null, kota_asal_sekolah || null, universitas || null, jurusan || null, req.params.id]);
    // NOTE: foto tidak diupdate di sini, gunakan PUT /:id/foto

    res.json({ message: 'Siswa berhasil diupdate' });
  } catch (error) {
    handleError(error, req, res, 'Gagal mengupdate siswa');
  }
});

// PUT /api/siswa/:id/foto — Upload/Update foto siswa
router.put('/:id/foto', (req, res, next) => {
  uploadFoto.single('foto')(req, res, (err) => {
    if (err) {
      // Tangani error dari multer (ukuran file, format, dll) dengan response JSON
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Ukuran foto maksimal 2MB' });
      }
      return res.status(400).json({ message: err.message || 'Gagal mengupload foto' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file foto yang diupload' });
    }

    const db = await getDatabase();

    // Hapus foto lama jika ada
    const [rows] = await db.execute('SELECT foto FROM siswa WHERE id = ?', [req.params.id]);
    if (rows[0]?.foto) {
      const oldPath = path.join(fotoDir, rows[0].foto);
      try { fs.unlinkSync(oldPath); } catch (e) { /* ignore */ }
    }

    const filename = req.file.filename;
    await db.execute('UPDATE siswa SET foto = ? WHERE id = ?', [filename, req.params.id]);

    res.json({ message: 'Foto berhasil diupload', foto: filename });
  } catch (error) {
    handleError(error, req, res, 'Gagal mengupload foto');
  }
});

// DELETE /api/siswa/:id/foto — Hapus foto siswa
router.delete('/:id/foto', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute('SELECT foto FROM siswa WHERE id = ?', [req.params.id]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Siswa tidak ditemukan' });
    }
    if (rows[0].foto) {
      const filePath = path.join(fotoDir, rows[0].foto);
      try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
    }
    await db.execute('UPDATE siswa SET foto = NULL WHERE id = ?', [req.params.id]);
    res.json({ message: 'Foto berhasil dihapus' });
  } catch (error) {
    handleError(error, req, res, 'Gagal menghapus foto');
  }
});

// DELETE /api/siswa/:id — Hapus siswa beserta foto
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDatabase();

    // Hapus file foto jika ada
    const [rows] = await db.execute('SELECT foto FROM siswa WHERE id = ?', [req.params.id]);
    if (rows[0]?.foto) {
      const filePath = path.join(fotoDir, rows[0].foto);
      try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
    }

    await db.execute('DELETE FROM siswa WHERE id = ?', [req.params.id]);
    res.json({ message: 'Siswa berhasil dihapus' });
  } catch (error) {
    handleError(error, req, res, 'Gagal menghapus siswa');
  }
});

module.exports = router;
