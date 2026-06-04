const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// ── Foto Upload Config ──
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'guru');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `guru_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format foto tidak didukung. Gunakan JPG/JPEG, PNG, GIF, atau WebP'), false);
  }
};

const uploadFoto = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

// ── Import File Upload Config ──
const uploadDir = path.join(__dirname, '..', 'uploads', 'temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const importStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `import_guru_${Date.now()}${ext}`);
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

// ── Middleware ──
router.use(authenticateToken);

// Helper: sanitize date
function sanitizeDate(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    return value.split('T')[0];
  }
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  return null;
}

// ── GET /api/guru ──
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const [guru] = await db.execute(`
      SELECT g.*, u.username, u.role,
        (SELECT CONCAT(rp.jenjang, ' - ', rp.nama_sekolah)
         FROM riwayat_pendidikan rp
         WHERE rp.id_guru = g.id
         ORDER BY
           CASE rp.jenjang
             WHEN 'SD' THEN 1 WHEN 'SMP' THEN 2 WHEN 'SMA' THEN 3
             WHEN 'S1' THEN 4 WHEN 'S2' THEN 5 WHEN 'S3' THEN 6
             ELSE 0
           END DESC
         LIMIT 1
        ) as pendidikan_terakhir,
        (SELECT COUNT(*) FROM mata_pelajaran mp WHERE mp.id_guru = g.id) as jumlah_mapel
      FROM guru g
      LEFT JOIN users u ON u.id = g.id_user
      ORDER BY g.nama ASC
    `);
    res.json(guru);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat data guru', error: error.message });
  }
});

// ── GET /api/guru/import/template — Download template Excel ──
router.get('/import/template', async (req, res) => {
  try {
    const db = await getDatabase();
    const [kelas] = await db.execute('SELECT nama_kelas FROM kelas ORDER BY tingkat, nama_kelas');

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Template Guru');

    const columns = [
      { header: 'NIK', key: 'nik', width: 20 },
      { header: 'NUPTK', key: 'nuptk', width: 18 },
      { header: 'Nama Lengkap', key: 'nama', width: 30 },
      { header: 'Jenis Kelamin', key: 'jenis_kelamin', width: 18 },
      { header: 'Tempat Lahir', key: 'tempat_lahir', width: 20 },
      { header: 'Tanggal Lahir', key: 'tanggal_lahir', width: 18 },
      { header: 'Alamat', key: 'alamat', width: 35 },
      { header: 'No. Telepon', key: 'no_telp', width: 18 },
      { header: 'Username', key: 'username', width: 18 },
      { header: 'Password', key: 'password', width: 18 },
      { header: 'Jenis Karyawan', key: 'jenis_karyawan', width: 18 },
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
      nik: '3273010101900001',
      nuptk: '1234567890123456',
      nama: 'Contoh Guru',
      jenis_kelamin: 'P',
      tempat_lahir: 'Jakarta',
      tanggal_lahir: '1990-01-01',
      alamat: 'Jl. Contoh No. 1',
      no_telp: '081234567890',
      username: 'guru_contoh',
      password: 'password123',
      jenis_karyawan: 'Guru',
    });
    exampleRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
      cell.alignment = { vertical: 'middle' };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=template_import_guru.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengunduh template', error: error.message });
  }
});

// ── POST /api/guru/import — Import data guru dari Excel ──
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

    // Baca workbook
    const ExcelJS = require('exceljs');
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
    const requiredHeaders = ['nama', 'username', 'password'];
    const missingHeaders = requiredHeaders.filter(h => !headers.some(hh => hh.includes(h)));
    if (missingHeaders.length > 0) {
      return res.status(400).json({
        message: `Kolom wajib tidak ditemukan: ${missingHeaders.join(', ')}. Pastikan file memiliki kolom Nama, Username, dan Password.`
      });
    }

    // Mapping index kolom
    const colMap = {
      nik: headers.findIndex(h => h.includes('nik') || h.includes('nip')),
      nuptk: headers.findIndex(h => h.includes('nuptk') || (h.includes('nup') && h.includes('tk'))),
      nama: headers.findIndex(h => h.includes('nama')),
      jenis_kelamin: headers.findIndex(h => h.includes('jenis') || h.includes('kelamin') || h === 'jk' || h === 'jkelamin'),
      jenis_karyawan: headers.findIndex(h => h.includes('karyawan') || (h.includes('jenis') && h.includes('karyawan')) || h === 'jabatan'),
      tempat_lahir: headers.findIndex(h => h.includes('tempat')),
      tanggal_lahir: headers.findIndex(h => h.includes('tanggal') || (h.includes('tgl') && h.includes('lahir'))),
      alamat: headers.findIndex(h => h.includes('alamat')),
      no_telp: headers.findIndex(h => h.includes('telp') || h.includes('telepon') || h.includes('notelp') || h.includes('hp') || h.includes('wa')),
      username: headers.findIndex(h => h.includes('username') || h.includes('user')),
      password: headers.findIndex(h => h.includes('password') || h.includes('pass')),
    };

    const success = [];
    const errors = [];
    let rowNumber = 1;

    // Proses setiap baris (mulai dari baris 2)
    sheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return;
      rowNumber = rowIndex;

      const getVal = (idx) => {
        if (idx === -1) return '';
        const cell = row.getCell(idx + 1);
        if (cell.value === null || cell.value === undefined) return '';
        if (cell.value instanceof Date) {
          return cell.value.toISOString().split('T')[0];
        }
        return String(cell.value).trim();
      };

      const nik = getVal(colMap.nik);
      const nuptk = getVal(colMap.nuptk);
      const nama = getVal(colMap.nama);
      const username = getVal(colMap.username);
      const password = getVal(colMap.password);
      let jenis_kelamin = getVal(colMap.jenis_kelamin);
      const jenis_karyawan = getVal(colMap.jenis_karyawan);
      const tempat_lahir = getVal(colMap.tempat_lahir);
      const tanggal_lahir = getVal(colMap.tanggal_lahir);
      const alamat = getVal(colMap.alamat);
      const no_telp = getVal(colMap.no_telp);

      // Validasi
      const rowErrors = [];
      if (!nama) rowErrors.push('Nama tidak boleh kosong');
      if (!username) rowErrors.push('Username tidak boleh kosong');
      if (!password) rowErrors.push('Password tidak boleh kosong');
      else if (password.length < 6) rowErrors.push('Password minimal 6 karakter');

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
        errors.push({ row: rowIndex, nis: nik || '-', nama, errors: rowErrors });
        return;
      }

      // Normalisasi jenis_karyawan
      let jenisKaryawan = jenis_karyawan || 'Guru';
      const validJenis = ['Guru', 'Tata Usaha', 'Umum', 'Konsultan'];
      if (!validJenis.includes(jenisKaryawan)) {
        jenisKaryawan = 'Guru';
      }

      success.push({ nik, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telp, username, password, jenis_karyawan: jenisKaryawan });
    });

    // Insert data valid ke database
    const insertSuccess = [];
    const insertErrors = [];

    for (const data of success) {
      try {
        // Cek duplikat username
        const [existingUser] = await db.execute('SELECT id FROM users WHERE username = ?', [data.username]);
        if (existingUser[0]) {
          insertErrors.push({ row: '-', nis: data.nik || '-', nama: data.nama, errors: ['Username sudah terdaftar'] });
          continue;
        }

        // Cek duplikat NIK
        if (data.nik) {
          const [existingNik] = await db.execute('SELECT id FROM guru WHERE nik = ?', [data.nik]);
          if (existingNik[0]) {
            insertErrors.push({ row: '-', nis: data.nik, nama: data.nama, errors: ['NIK sudah terdaftar'] });
            continue;
          }
        }

        // Buat user account
        const hashedPassword = bcrypt.hashSync(data.password, 10);
        const [userResult] = await db.execute(
          'INSERT INTO users (username, password, nama, role) VALUES (?, ?, ?, ?)',
          [data.username, hashedPassword, data.nama, 'guru']
        );
        const id_user = userResult.insertId;

        // Buat guru record
        await db.execute(`
          INSERT INTO guru (nik, nuptk, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telp, id_user, jenis_karyawan)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          data.nik || null,
          data.nuptk || null,
          data.nama,
          data.jenis_kelamin || null,
          data.tempat_lahir || null,
          sanitizeDate(data.tanggal_lahir),
          data.alamat || null,
          data.no_telp || null,
          id_user,
          data.jenis_karyawan || 'Guru',
        ]);

        insertSuccess.push(data.nama);
      } catch (err) {
        insertErrors.push({ row: '-', nis: data.nik || '-', nama: data.nama, errors: [err.message] });
      }
    }

    // Hapus file temporary
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) { /* ignore */ }

    // Gabungkan error parsing + error insert
    const allErrors = [...errors, ...insertErrors];

    res.json({
      message: `Import selesai. ${insertSuccess.length} guru berhasil diimport${allErrors.length > 0 ? `, ${allErrors.length} gagal.` : '.'}`,
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

// ── GET /api/guru/export — Export data guru ke Excel ──
router.get('/export', async (req, res) => {
  try {
    const db = await getDatabase();
    const { search } = req.query;

    let query = `
      SELECT g.*, u.username, u.role
      FROM guru g
      LEFT JOIN users u ON u.id = g.id_user
    `;
    const params = [];
    if (search) {
      query += ' WHERE g.nama LIKE ? OR g.nik LIKE ? OR g.nuptk LIKE ? OR u.username LIKE ?';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    query += ' ORDER BY g.nama ASC';

    const [guru] = await db.execute(query, params);

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Data Guru');

    const columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'NIK', key: 'nik', width: 18 },
      { header: 'NUPTK', key: 'nuptk', width: 16 },
      { header: 'Nama Lengkap', key: 'nama', width: 30 },
      { header: 'Jenis Kelamin', key: 'jk', width: 16 },
      { header: 'Jenis Karyawan', key: 'jenis_karyawan', width: 18 },
      { header: 'Tempat Lahir', key: 'tempat_lahir', width: 18 },
      { header: 'Tanggal Lahir', key: 'tanggal_lahir', width: 16 },
      { header: 'Alamat', key: 'alamat', width: 35 },
      { header: 'No. Telepon', key: 'no_telp', width: 16 },
      { header: 'Username', key: 'username', width: 16 },
      { header: 'Wali Kelas', key: 'wali_kelas', width: 20 },
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

    // Ambil data wali kelas untuk setiap guru
    const [kelasWali] = await db.execute('SELECT id_wali, GROUP_CONCAT(nama_kelas ORDER BY tingkat, nama_kelas SEPARATOR \', \') as kelas FROM kelas WHERE id_wali IS NOT NULL GROUP BY id_wali');
    const waliMap = {};
    for (const kw of kelasWali) {
      waliMap[kw.id_wali] = kw.kelas;
    }

    // Data rows
    guru.forEach((g, i) => {
      const row = sheet.addRow({
        no: i + 1,
        nik: g.nik || '-',
        nuptk: g.nuptk || '-',
        nama: g.nama,
        jk: g.jenis_kelamin === 'L' ? 'Laki-laki' : g.jenis_kelamin === 'P' ? 'Perempuan' : '-',
        jenis_karyawan: g.jenis_karyawan || 'Guru',
        tempat_lahir: g.tempat_lahir || '-',
        tanggal_lahir: g.tanggal_lahir ? new Date(g.tanggal_lahir).toLocaleDateString('id-ID') : '-',
        alamat: g.alamat || '-',
        no_telp: g.no_telp || '-',
        username: g.username || '-',
        wali_kelas: waliMap[g.id] || '-',
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
      no: '', nik: '', nama: '', jk: '', tempat_lahir: '',
      tanggal_lahir: '', alamat: '', no_telp: '', username: '',
      wali_kelas: `Total: ${guru.length} guru`
    });
    footerRow.eachCell((cell) => {
      cell.font = { bold: true, italic: true, size: 10, color: { argb: 'FF6B7280' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=data_guru.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengexport data', error: error.message });
  }
});

// ── GET /api/guru/export/pdf — Export data guru ke PDF ──
router.get('/export/pdf', async (req, res) => {
  try {
    const db = await getDatabase();
    const { search } = req.query;

    let query = `
      SELECT g.*, u.username, u.role
      FROM guru g
      LEFT JOIN users u ON u.id = g.id_user
    `;
    const params = [];
    if (search) {
      query += ' WHERE g.nama LIKE ? OR g.nik LIKE ? OR g.nuptk LIKE ? OR u.username LIKE ?';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }
    query += ' ORDER BY g.nama ASC';

    const [guru] = await db.execute(query, params);

    // Ambil data wali kelas
    const [kelasWali] = await db.execute('SELECT id_wali, GROUP_CONCAT(nama_kelas ORDER BY tingkat, nama_kelas SEPARATOR \', \') as kelas FROM kelas WHERE id_wali IS NOT NULL GROUP BY id_wali');
    const waliMap = {};
    for (const kw of kelasWali) {
      waliMap[kw.id_wali] = kw.kelas;
    }

    const { getSettings, drawTable, writeHeader, writeSignature } = require('../helpers/pdfHelpers');
    const pengaturan = await getSettings(db);

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=data_guru.pdf');
    doc.pipe(res);

    writeHeader(doc, pengaturan, 'DATA GURU', `Total: ${guru.length} guru`);
    doc.moveDown(1);

    const pageWidth = doc.page.width - 80;
    const colWidths = [pageWidth * 0.05, pageWidth * 0.16, pageWidth * 0.11, pageWidth * 0.12, pageWidth * 0.11, pageWidth * 0.12, pageWidth * 0.11, pageWidth * 0.11, pageWidth * 0.11];
    const headers = ['No', 'Nama', 'NUPTK', 'NIK', 'Jenis Kelamin', 'Jenis Karyawan', 'No. Telp', 'Username', 'Wali Kelas'];
    const rows = guru.map((g, i) => [
      String(i + 1),
      g.nama,
      g.nuptk || '-',
      g.nik || '-',
      g.jenis_kelamin === 'L' ? 'Laki-laki' : g.jenis_kelamin === 'P' ? 'Perempuan' : '-',
      g.jenis_karyawan || 'Guru',
      g.no_telp || '-',
      g.username || '-',
      waliMap[g.id] || '-',
    ]);

    drawTable(doc, headers, rows, { columnWidths: colWidths, fontSize: 8 });
    doc.moveDown(1);
    writeSignature(doc, pengaturan);
    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengexport PDF', error: error.message });
  }
});

// ── GET /api/guru/:id ──
router.get('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute(`
      SELECT g.*, u.username, u.role
      FROM guru g
      LEFT JOIN users u ON u.id = g.id_user
      WHERE g.id = ?
    `, [req.params.id]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Guru tidak ditemukan' });
    }
    const guru = rows[0];

    // Ambil data kelas wali
    const [kelasWali] = await db.execute(
      'SELECT id FROM kelas WHERE id_wali = ?',
      [req.params.id]
    );
    guru.kelas_wali_ids = kelasWali.map(k => k.id);

    // Ambil riwayat pendidikan
    const [riwayat] = await db.execute(
      'SELECT * FROM riwayat_pendidikan WHERE id_guru = ? ORDER BY tahun_masuk ASC',
      [req.params.id]
    );
    guru.riwayat_pendidikan = riwayat;

    res.json(guru);
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// ── POST /api/guru ──
router.post('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { nik, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telp, username, password, kelas_wali_ids, jenis_karyawan } = req.body;

    if (!nama) {
      return res.status(400).json({ message: 'Nama guru harus diisi' });
    }
    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password untuk login harus diisi' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password minimal 6 karakter' });
    }

    // Check username uniqueness
    const [existingUser] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser[0]) {
      return res.status(400).json({ message: 'Username sudah digunakan' });
    }

    // Check nik uniqueness if provided
    if (nik) {
      const [existingNik] = await db.execute('SELECT id FROM guru WHERE nik = ?', [nik]);
      if (existingNik[0]) {
        return res.status(400).json({ message: 'NIK sudah digunakan' });
      }
    }

    // Create user account
    const hashedPassword = bcrypt.hashSync(password, 10);
    const [userResult] = await db.execute(
      'INSERT INTO users (username, password, nama, role) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, nama, 'guru']
    );
    const id_user = userResult.insertId;

    // Create guru record
    const { nuptk } = req.body;
    const [guruResult] = await db.execute(`
      INSERT INTO guru (nik, nuptk, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telp, id_user, jenis_karyawan)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      nik || null,
      nuptk || null,
      nama,
      jenis_kelamin || null,
      tempat_lahir || null,
      sanitizeDate(tanggal_lahir),
      alamat || null,
      no_telp || null,
      id_user,
      jenis_karyawan || 'Guru',
    ]);

    const newGuruId = guruResult.insertId;

    // ── Set wali kelas jika dipilih ──
    if (Array.isArray(kelas_wali_ids) && kelas_wali_ids.length > 0) {
      for (const kelasId of kelas_wali_ids) {
        if (kelasId) {
          await db.execute('UPDATE kelas SET id_wali = ? WHERE id = ?', [newGuruId, kelasId]);
        }
      }
    }

    const [newGuru] = await db.execute(`
      SELECT g.*, u.username, u.role
      FROM guru g
      LEFT JOIN users u ON u.id = g.id_user
      WHERE g.id = ?
    `, [newGuruId]);

    res.status(201).json(newGuru[0]);
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambah guru', error: error.message });
  }
});

// ── PUT /api/guru/:id ──
router.put('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;
    const { nik, nuptk, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telp, username, password, kelas_wali_ids, jenis_karyawan } = req.body;

    const [guruRows] = await db.execute('SELECT * FROM guru WHERE id = ?', [id]);
    const guru = guruRows[0];
    if (!guru) {
      return res.status(404).json({ message: 'Guru tidak ditemukan' });
    }

    // Jika role guru, hanya boleh update data dirinya sendiri
    if (req.user.role === 'guru' && guru.id_user !== req.user.id) {
      return res.status(403).json({ message: 'Anda hanya bisa mengupdate data diri sendiri' });
    }

    // Check NIK uniqueness
    if (nik && nik !== guru.nik) {
      const [existingNik] = await db.execute('SELECT id FROM guru WHERE nik = ? AND id != ?', [nik, id]);
      if (existingNik[0]) {
        return res.status(400).json({ message: 'NIK sudah digunakan' });
      }
    }

    // Update guru fields
    const guruFields = [];
    const guruParams = [];
    if (nik !== undefined) { guruFields.push('nik = ?'); guruParams.push(nik || null); }
    if (nuptk !== undefined) { guruFields.push('nuptk = ?'); guruParams.push(nuptk || null); }
    if (nama !== undefined) { guruFields.push('nama = ?'); guruParams.push(nama); }
    if (jenis_kelamin !== undefined) { guruFields.push('jenis_kelamin = ?'); guruParams.push(jenis_kelamin || null); }
    if (tempat_lahir !== undefined) { guruFields.push('tempat_lahir = ?'); guruParams.push(tempat_lahir || null); }
    if (tanggal_lahir !== undefined) { guruFields.push('tanggal_lahir = ?'); guruParams.push(sanitizeDate(tanggal_lahir)); }
    if (alamat !== undefined) { guruFields.push('alamat = ?'); guruParams.push(alamat || null); }
    if (no_telp !== undefined) { guruFields.push('no_telp = ?'); guruParams.push(no_telp || null); }
    if (jenis_karyawan !== undefined) { guruFields.push('jenis_karyawan = ?'); guruParams.push(jenis_karyawan || 'Guru'); }

    if (guruFields.length > 0) {
      guruParams.push(id);
      await db.execute(`UPDATE guru SET ${guruFields.join(', ')} WHERE id = ?`, guruParams);
    }

    // Update user account
    if (guru.id_user) {
      const userFields = [];
      const userParams = [];
      if (username !== undefined) {
        // Check uniqueness
        const [existingUser] = await db.execute('SELECT id FROM users WHERE username = ? AND id != ?', [username, guru.id_user]);
        if (existingUser[0]) {
          return res.status(400).json({ message: 'Username sudah digunakan' });
        }
        userFields.push('username = ?');
        userParams.push(username);
      }
      if (nama !== undefined) {
        userFields.push('nama = ?');
        userParams.push(nama);
      }
      if (password) {
        if (password.length < 6) {
          return res.status(400).json({ message: 'Password minimal 6 karakter' });
        }
        userFields.push('password = ?');
        userParams.push(bcrypt.hashSync(password, 10));
      }
      if (userFields.length > 0) {
        userParams.push(guru.id_user);
        await db.execute(`UPDATE users SET ${userFields.join(', ')} WHERE id = ?`, userParams);
      }
    }

    // ── Update Wali Kelas (multi-select) ──
    if (kelas_wali_ids !== undefined) {
      // Hapus guru ini dari semua kelas yang sebelumnya menjadi walinya
      await db.execute('UPDATE kelas SET id_wali = NULL WHERE id_wali = ?', [id]);

      // Set wali kelas baru untuk setiap id yang dipilih
      if (Array.isArray(kelas_wali_ids) && kelas_wali_ids.length > 0) {
        for (const kelasId of kelas_wali_ids) {
          if (kelasId) {
            await db.execute('UPDATE kelas SET id_wali = ? WHERE id = ?', [id, kelasId]);
          }
        }
      }
    }

    const [updatedGuru] = await db.execute(`
      SELECT g.*, u.username, u.role
      FROM guru g
      LEFT JOIN users u ON u.id = g.id_user
      WHERE g.id = ?
    `, [id]);

    res.json(updatedGuru[0]);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengupdate guru', error: error.message });
  }
});

// ── DELETE /api/guru/:id ──
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [guruRows] = await db.execute('SELECT * FROM guru WHERE id = ?', [req.params.id]);
    const guru = guruRows[0];
    if (!guru) {
      return res.status(404).json({ message: 'Guru tidak ditemukan' });
    }

    // Check if guru is assigned as wali kelas
    const [kelasRows] = await db.execute('SELECT COUNT(*) as count FROM kelas WHERE id_wali = ?', [req.params.id]);
    if (kelasRows[0].count > 0) {
      return res.status(400).json({ message: 'Guru masih menjadi wali kelas. Hapus/hapus wali kelas terlebih dahulu' });
    }

    // Delete foto file
    if (guru.foto) {
      const fotoPath = path.join(UPLOAD_DIR, guru.foto);
      if (fs.existsSync(fotoPath)) fs.unlinkSync(fotoPath);
    }

    // Delete guru
    await db.execute('DELETE FROM guru WHERE id = ?', [req.params.id]);

    // Delete user account
    if (guru.id_user) {
      await db.execute('DELETE FROM users WHERE id = ?', [guru.id_user]);
    }

    res.json({ message: 'Guru berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus guru', error: error.message });
  }
});

// ── PUT /api/guru/:id/foto ──
router.put('/:id/foto', (req, res, next) => {
  uploadFoto.single('foto')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Ukuran foto maksimal 2MB' });
      }
      return res.status(400).json({ message: err.message || 'Gagal upload foto' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const db = await getDatabase();
    const [guruRows] = await db.execute('SELECT * FROM guru WHERE id = ?', [req.params.id]);
    const guru = guruRows[0];
    if (!guru) {
      // Hapus file yang sudah terupload
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Guru tidak ditemukan' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'File foto tidak ditemukan' });
    }

    // Hapus foto lama
    if (guru.foto) {
      const oldPath = path.join(UPLOAD_DIR, guru.foto);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await db.execute('UPDATE guru SET foto = ? WHERE id = ?', [req.file.filename, req.params.id]);

    res.json({ foto: req.file.filename, message: 'Foto berhasil diupload' });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Gagal upload foto', error: error.message });
  }
});

// ── DELETE /api/guru/:id/foto ──
router.delete('/:id/foto', async (req, res) => {
  try {
    const db = await getDatabase();
    const [guruRows] = await db.execute('SELECT * FROM guru WHERE id = ?', [req.params.id]);
    const guru = guruRows[0];
    if (!guru) {
      return res.status(404).json({ message: 'Guru tidak ditemukan' });
    }

    if (guru.foto) {
      const fotoPath = path.join(UPLOAD_DIR, guru.foto);
      if (fs.existsSync(fotoPath)) fs.unlinkSync(fotoPath);
      await db.execute('UPDATE guru SET foto = NULL WHERE id = ?', [req.params.id]);
    }

    res.json({ message: 'Foto berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus foto', error: error.message });
  }
});

// ── GET /api/guru/:id/riwayat-pendidikan — Ambil riwayat pendidikan guru ──
router.get('/:id/riwayat-pendidikan', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute(
      'SELECT * FROM riwayat_pendidikan WHERE id_guru = ? ORDER BY tahun_masuk ASC',
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat riwayat pendidikan', error: error.message });
  }
});

// ── POST /api/guru/riwayat-pendidikan — Tambah riwayat pendidikan ──
router.post('/riwayat-pendidikan', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id_guru, jenjang, nama_sekolah, jurusan, tahun_masuk, tahun_lulus } = req.body;

    if (!id_guru || !jenjang || !nama_sekolah || !tahun_masuk) {
      return res.status(400).json({ message: 'id_guru, jenjang, nama_sekolah, dan tahun_masuk harus diisi' });
    }

    // Cek apakah guru ada
    const [guru] = await db.execute('SELECT id FROM guru WHERE id = ?', [id_guru]);
    if (!guru[0]) {
      return res.status(404).json({ message: 'Guru tidak ditemukan' });
    }

    const [result] = await db.execute(
      'INSERT INTO riwayat_pendidikan (id_guru, jenjang, nama_sekolah, jurusan, tahun_masuk, tahun_lulus) VALUES (?, ?, ?, ?, ?, ?)',
      [id_guru, jenjang, nama_sekolah, jurusan || null, tahun_masuk, tahun_lulus || null]
    );

    const [newRow] = await db.execute('SELECT * FROM riwayat_pendidikan WHERE id = ?', [result.insertId]);
    res.status(201).json(newRow[0]);
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambah riwayat pendidikan', error: error.message });
  }
});

// ── PUT /api/guru/riwayat-pendidikan/:id — Update riwayat pendidikan ──
router.put('/riwayat-pendidikan/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id } = req.params;
    const { jenjang, nama_sekolah, jurusan, tahun_masuk, tahun_lulus } = req.body;

    const [existing] = await db.execute('SELECT * FROM riwayat_pendidikan WHERE id = ?', [id]);
    if (!existing[0]) {
      return res.status(404).json({ message: 'Riwayat pendidikan tidak ditemukan' });
    }

    const fields = [];
    const params = [];
    if (jenjang !== undefined) { fields.push('jenjang = ?'); params.push(jenjang); }
    if (nama_sekolah !== undefined) { fields.push('nama_sekolah = ?'); params.push(nama_sekolah); }
    if (jurusan !== undefined) { fields.push('jurusan = ?'); params.push(jurusan || null); }
    if (tahun_masuk !== undefined) { fields.push('tahun_masuk = ?'); params.push(tahun_masuk); }
    if (tahun_lulus !== undefined) { fields.push('tahun_lulus = ?'); params.push(tahun_lulus || null); }

    if (fields.length > 0) {
      params.push(id);
      await db.execute(`UPDATE riwayat_pendidikan SET ${fields.join(', ')} WHERE id = ?`, params);
    }

    const [updated] = await db.execute('SELECT * FROM riwayat_pendidikan WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengupdate riwayat pendidikan', error: error.message });
  }
});

// ── DELETE /api/guru/riwayat-pendidikan/:id — Hapus riwayat pendidikan ──
router.delete('/riwayat-pendidikan/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [existing] = await db.execute('SELECT * FROM riwayat_pendidikan WHERE id = ?', [req.params.id]);
    if (!existing[0]) {
      return res.status(404).json({ message: 'Riwayat pendidikan tidak ditemukan' });
    }

    await db.execute('DELETE FROM riwayat_pendidikan WHERE id = ?', [req.params.id]);
    res.json({ message: 'Riwayat pendidikan berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus riwayat pendidikan', error: error.message });
  }
});

module.exports = router;
