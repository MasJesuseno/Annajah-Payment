const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { getDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { logActivity } = require('../helpers/activityLogHelper');

// ─── Public Route: Logo (tidak perlu auth agar bisa dipakai di halaman login) ───
router.get('/logo', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute('SELECT `value` FROM pengaturan WHERE `key` = ?', ['logo']);
    res.json({ logo: rows[0]?.value || '' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat logo', error: error.message });
  }
});

// ─── Public Route: Data PPDB (tanpa auth) ───
router.get('/public', async (req, res) => {
  try {
    const db = await getDatabase();
    const [settings] = await db.execute('SELECT `key`, `value` FROM pengaturan ORDER BY `key`');
    const result = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    // Override tahun_ajaran_aktif from master table if available
    try {
      const [taRows] = await db.execute(
        "SELECT tahun_ajaran FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1"
      );
      if (taRows[0]?.tahun_ajaran) {
        result.tahun_ajaran_aktif = taRows[0].tahun_ajaran;
      }
    } catch (e) {
      // Master table might not exist yet
    }

    // Hanya kirim field yang aman untuk publik
    const safeFields = [
      'nama_sekolah', 'alamat_sekolah', 'kota', 'provinsi', 'kode_pos',
      'no_telp', 'email', 'website', 'npsn', 'kepala_sekolah',
      'warna_utama', 'warna_sekunder', 'warna_aksen', 'warna_tulisan_ppdb',
      'warna_footer_bg', 'warna_footer_text', 'warna_footer_judul',
      'tahun_ajaran_aktif', 'ttd_kepala_sekolah', 'ttd_bendahara', 'tampilkan_ttd_kepala_sekolah', 'tampilkan_ttd_bendahara',
      'rekening_bank', 'rekening_nomor', 'rekening_atas_nama', 'biaya_pendaftaran',
      'ketua_panitia_ppdb', 'ttd_ketua_panitia_ppdb', 'tampilkan_ttd_ketua_panitia_ppdb',
    ]
    const safeResult = {}
    for (const key of safeFields) {
      if (result[key] !== undefined) {
        safeResult[key] = result[key]
      }
    }
    res.json(safeResult);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat data', error: error.message });
  }
});

router.use(authenticateToken);

// ─── Konfigurasi Multer untuk Logo ───
const logoDir = path.join(__dirname, '..', 'uploads', 'logo');

// Pastikan direktori ada
if (!fs.existsSync(logoDir)) {
  fs.mkdirSync(logoDir, { recursive: true });
}

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, logoDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo_${Date.now()}${ext}`);
  },
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.includes(ext)) {
      return cb(new Error('Format file tidak didukung. Gunakan JPG, PNG, GIF, atau WebP.'));
    }
    cb(null, true);
  },
});

// GET /api/pengaturan - Ambil semua pengaturan
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const [settings] = await db.execute('SELECT `key`, `value` FROM pengaturan ORDER BY `key`');
    const result = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat pengaturan', error: error.message });
  }
});

// PUT /api/pengaturan - Simpan semua pengaturan
router.put('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const data = req.body;

    // Jangan timpa logo via JSON (logo diupload terpisah)
    delete data.logo;

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const updateSql = 'INSERT INTO pengaturan (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)';
      for (const [key, value] of Object.entries(data)) {
        await conn.execute(updateSql, [key, String(value || '')]);
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    await logActivity(req, 'Ubah', 'Pengaturan', null, 'Menyimpan pengaturan sekolah');
    res.json({ message: 'Pengaturan berhasil disimpan' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menyimpan pengaturan', error: error.message });
  }
});

// POST /api/pengaturan/logo — Upload logo sekolah
router.post('/logo', uploadLogo.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diupload' });
    }

    const db = await getDatabase();
    const logoUrl = `/uploads/logo/${req.file.filename}`;

    // Hapus logo lama jika ada
    const [rows] = await db.execute('SELECT `value` FROM pengaturan WHERE `key` = ?', ['logo']);
    const oldLogo = rows[0]?.value;
    if (oldLogo && oldLogo.startsWith('/uploads/logo/')) {
      const oldPath = path.join(__dirname, '..', oldLogo.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Simpan path logo ke database
    await db.execute(
      'INSERT INTO pengaturan (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
      ['logo', logoUrl]
    );

    await logActivity(req, 'Ubah', 'Pengaturan', null, 'Mengupload logo sekolah');
    res.json({ message: 'Logo berhasil diupload', logo: logoUrl });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengupload logo', error: error.message });
  }
});

// DELETE /api/pengaturan/logo — Hapus logo
router.delete('/logo', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute('SELECT `value` FROM pengaturan WHERE `key` = ?', ['logo']);
    const oldLogo = rows[0]?.value;

    if (oldLogo && oldLogo.startsWith('/uploads/logo/')) {
      const filePath = path.join(__dirname, '..', oldLogo.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Reset ke string kosong
    await db.execute(
      'INSERT INTO pengaturan (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
      ['logo', '']
    );

    await logActivity(req, 'Hapus', 'Pengaturan', null, 'Menghapus logo sekolah');
    res.json({ message: 'Logo berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus logo', error: error.message });
  }
});

// ─── Upload Tanda Tangan Kepala Sekolah ───
const ttdDir = path.join(__dirname, '..', 'uploads', 'ttd');

if (!fs.existsSync(ttdDir)) {
  fs.mkdirSync(ttdDir, { recursive: true });
}

const ttdStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ttdDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `ttd_${Date.now()}${ext}`);
  },
});

const uploadTtd = multer({
  storage: ttdStorage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedTypes.includes(ext)) {
      return cb(new Error('Format file tidak didukung. Gunakan JPG, PNG, GIF, atau WebP.'));
    }
    cb(null, true);
  },
});

// POST /api/pengaturan/ttd/:jenis — Upload tanda tangan (kepala_sekolah / bendahara)
router.post('/ttd/:jenis', uploadTtd.single('ttd'), async (req, res) => {
  try {
    const { jenis } = req.params;
    if (!['kepala_sekolah', 'bendahara', 'ketua_panitia_ppdb'].includes(jenis)) {
      return res.status(400).json({ message: 'Jenis tanda tangan tidak valid' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diupload' });
    }

    const db = await getDatabase();
    const key = `ttd_${jenis}`;
    const ttdUrl = `/uploads/ttd/${req.file.filename}`;

    // Hapus ttd lama jika ada
    const [rows] = await db.execute('SELECT `value` FROM pengaturan WHERE `key` = ?', [key]);
    const oldTtd = rows[0]?.value;
    if (oldTtd && oldTtd.startsWith('/uploads/ttd/')) {
      const oldPath = path.join(__dirname, '..', oldTtd.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    await db.execute(
      'INSERT INTO pengaturan (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
      [key, ttdUrl]
    );
    const labelTtd = { kepala_sekolah: 'Kepala Sekolah', bendahara: 'Tata Usaha', ketua_panitia_ppdb: 'Ketua Panitia PPDB' };
    await logActivity(req, 'Ubah', 'Pengaturan', null, `Mengupload tanda tangan ${labelTtd[jenis] || jenis}`);
    res.json({ message: 'Tanda tangan berhasil diupload', url: ttdUrl });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengupload tanda tangan', error: error.message });
  }
});

// DELETE /api/pengaturan/ttd/:jenis — Hapus tanda tangan
router.delete('/ttd/:jenis', async (req, res) => {
  try {
    const { jenis } = req.params;
    if (!['kepala_sekolah', 'bendahara', 'ketua_panitia_ppdb'].includes(jenis)) {
      return res.status(400).json({ message: 'Jenis tanda tangan tidak valid' });
    }

    const db = await getDatabase();
    const key = `ttd_${jenis}`;

    const [rows] = await db.execute('SELECT `value` FROM pengaturan WHERE `key` = ?', [key]);
    const oldTtd = rows[0]?.value;
    if (oldTtd && oldTtd.startsWith('/uploads/ttd/')) {
      const filePath = path.join(__dirname, '..', oldTtd.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await db.execute(
      'INSERT INTO pengaturan (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
      [key, '']
    );
    const labelTtd = { kepala_sekolah: 'Kepala Sekolah', bendahara: 'Tata Usaha', ketua_panitia_ppdb: 'Ketua Panitia PPDB' };
    await logActivity(req, 'Hapus', 'Pengaturan', null, `Menghapus tanda tangan ${labelTtd[jenis] || jenis}`);
    res.json({ message: 'Tanda tangan berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus tanda tangan', error: error.message });
  }
});

// Error handler untuk multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Ukuran file maksimal 2MB' });
    }
    return res.status(400).json({ message: err.message });
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
});

module.exports = router;
