const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { getDatabase, closeDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { logActivity } = require('../helpers/activityLogHelper');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// Pastikan folder backups ada
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Middleware admin
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Hanya admin yang dapat mengakses fitur ini' });
  }
  next();
}

router.use(authenticateToken);
router.use(adminOnly);

// Konfigurasi multer untuk upload file (max 50MB) - .sql files for MySQL restore
const upload = multer({
  dest: path.join(__dirname, '..', 'temp_uploads'),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.sql') {
      cb(null, true);
    } else {
      cb(new Error('Hanya file .sql yang diperbolehkan'));
    }
  }
});

// Helper: escape string for SQL
function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  return "'" + String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r') + "'";
}

// Helper: generate SQL dump untuk semua tabel
async function generateSqlDump(db) {
  const tables = ['users', 'kelas', 'siswa', 'jenis_pembayaran', 'transaksi', 'pengaturan'];
  const lines = [];

  lines.push('-- ============================================');
  lines.push('-- Backup Database: dbannajah');
  lines.push(`-- Tanggal: ${new Date().toISOString()}`);
  lines.push('-- ============================================');
  lines.push('');

  for (const table of tables) {
    // Check if table exists
    const [tableCheck] = await db.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
      [table]
    );
    if (tableCheck.length === 0) continue;

    // Get CREATE TABLE
    const [createRows] = await db.execute(`SHOW CREATE TABLE \`${table}\``);
    lines.push(`DROP TABLE IF EXISTS \`${table}\`;`);
    lines.push(createRows[0]['Create Table'] + ';');
    lines.push('');

    // Get data
    const [rows] = await db.execute(`SELECT * FROM \`${table}\``);
    if (rows.length === 0) continue;

    const columns = Object.keys(rows[0]);
    const colNames = columns.map(c => `\`${c}\``).join(', ');

    for (const row of rows) {
      const values = columns.map(col => escapeSql(row[col])).join(', ');
      lines.push(`INSERT INTO \`${table}\` (${colNames}) VALUES (${values});`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// GET /api/database/backups — Daftar file backup
router.get('/backups', (req, res) => {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.sql'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return {
          filename: f,
          size: stat.size,
          sizeFormatted: formatSize(stat.size),
          createdAt: stat.birthtime || stat.mtime,
          createdAtFormatted: new Date(stat.birthtime || stat.mtime).toLocaleDateString('id-ID', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(files);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat daftar backup', error: error.message });
  }
});

// POST /api/database/backup — Buat backup baru (SQL dump)
router.post('/backup', async (req, res) => {
  try {
    const db = await getDatabase();
    const sqlContent = await generateSqlDump(db);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFilename = `backup-${timestamp}.sql`;
    const backupPath = path.join(BACKUP_DIR, backupFilename);

    fs.writeFileSync(backupPath, sqlContent, 'utf-8');

    const stat = fs.statSync(backupPath);

    await logActivity(req, 'Tambah', 'Database', null, `Membuat backup database: ${backupFilename}`);
    res.json({
      message: 'Backup berhasil dibuat',
      filename: backupFilename,
      tables: ['users', 'kelas', 'siswa', 'jenis_pembayaran', 'transaksi', 'pengaturan'],
      size: stat.size,
      sizeFormatted: formatSize(stat.size),
      createdAt: stat.birthtime || stat.mtime,
      createdAtFormatted: new Date(stat.birthtime || stat.mtime).toLocaleDateString('id-ID', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal membuat backup', error: error.message });
  }
});

// GET /api/database/backup/:filename — Download file backup
router.get('/backup/:filename', (req, res) => {
  try {
    const { filename } = req.params;

    if (filename.includes('..') || filename.includes('/') || filename.includes('\\\\')) {
      return res.status(400).json({ message: 'Nama file tidak valid' });
    }

    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File backup tidak ditemukan' });
    }

    res.download(filePath, filename);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengunduh backup', error: error.message });
  }
});

// POST /api/database/restore — Restore database dari file .sql yang diupload
router.post('/restore', upload.single('file'), async (req, res) => {
  let tempFile = null;

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Pilih file SQL untuk direstore' });
    }

    tempFile = req.file.path;

    // Baca file SQL
    let sqlContent;
    try {
      sqlContent = fs.readFileSync(tempFile, 'utf-8');
    } catch (err) {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      return res.status(400).json({ message: 'File SQL tidak dapat dibaca atau rusak' });
    }

    // Validasi: cek apakah ada INSERT untuk tabel yang diperlukan
    const requiredTables = ['users', 'kelas', 'siswa', 'jenis_pembayaran', 'transaksi', 'pengaturan'];
    const hasRequiredTables = requiredTables.every(t => sqlContent.includes(`INSERT INTO \`${t}\``));
    if (!hasRequiredTables) {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      return res.status(400).json({
        message: 'File SQL tidak valid. Pastikan file berisi data untuk semua tabel yang diperlukan.'
      });
    }

    // Backup otomatis database saat ini sebelum restore
    const db = await getDatabase();
    const autoBackupSql = await generateSqlDump(db);
    const autoBackupFilename = `before-restore-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.sql`;
    fs.writeFileSync(path.join(BACKUP_DIR, autoBackupFilename), autoBackupSql, 'utf-8');

    // Execute SQL restore dalam transaksi
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Nonaktifkan foreign key checks sementara
      await conn.execute('SET FOREIGN_KEY_CHECKS = 0');

      // Hapus data yang ada
      for (const table of requiredTables) {
        await conn.execute(`DROP TABLE IF EXISTS \`${table}\``);
      }

      // Execute SQL restore (split by semicolon)
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const stmt of statements) {
        try {
          await conn.execute(stmt);
        } catch (stmtErr) {
          // Skip errors for individual statements (some may fail due to duplicate drops etc.)
          console.warn('Statement warning:', stmtErr.message);
        }
      }

      await conn.execute('SET FOREIGN_KEY_CHECKS = 1');
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    // Hapus file upload
    if (tempFile && fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
      tempFile = null;
    }

    await logActivity(req, 'Ubah', 'Database', null, `Merestore database dari file: ${req.file?.originalname || 'unknown'}`);
    res.json({
      message: 'Database berhasil direstore',
      backupAuto: autoBackupFilename
    });
  } catch (error) {
    // Coba pulihkan jika ada error
    try {
      if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    } catch (_) {}

    res.status(500).json({ message: 'Gagal merestore database', error: error.message });
  }
});

// DELETE /api/database/backup/:filename — Hapus file backup
router.delete('/backup/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    if (filename.includes('..') || filename.includes('/') || filename.includes('\\\\')) {
      return res.status(400).json({ message: 'Nama file tidak valid' });
    }

    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File backup tidak ditemukan' });
    }

    fs.unlinkSync(filePath);
    await logActivity(req, 'Hapus', 'Database', null, `Menghapus file backup: ${filename}`);
    res.json({ message: 'File backup berhasil dihapus', filename });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus backup', error: error.message });
  }
});

// GET /api/database/info — Informasi database (ukuran, jumlah tabel, dll)
router.get('/info', async (req, res) => {
  try {
    const db = await getDatabase();

    // Get table list with row counts
    const [tables] = await db.execute(`
      SELECT TABLE_NAME as name, 
             (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = t.TABLE_NAME) as columns
      FROM information_schema.TABLES t 
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME
    `);

    const tableCounts = [];
    for (const t of tables) {
      const [countRows] = await db.execute(`SELECT COUNT(*) as count FROM \`${t.name}\``);
      tableCounts.push({
        name: t.name,
        count: countRows[0].count,
        columns: t.columns
      });
    }

    res.json({
      type: 'MySQL',
      database: 'dbannajah',
      tableCount: tables.length,
      tables: tableCounts,
      totalRecords: tableCounts.reduce((sum, t) => sum + t.count, 0)
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat info database', error: error.message });
  }
});

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;
