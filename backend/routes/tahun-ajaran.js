const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { logActivity } = require('../helpers/activityLogHelper');

router.use(authenticateToken);

// GET / — Daftar semua tahun ajaran
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute(
      'SELECT * FROM tahun_ajaran ORDER BY tahun_ajaran DESC'
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat data tahun ajaran', error: error.message });
  }
});

// GET /aktif — Ambil tahun ajaran yang aktif
router.get('/aktif', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute(
      "SELECT * FROM tahun_ajaran WHERE status = 'aktif' LIMIT 1"
    );
    res.json(rows[0] || null);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat tahun ajaran aktif', error: error.message });
  }
});

// POST / — Tambah tahun ajaran baru
router.post('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tahun_ajaran, status } = req.body;

    if (!tahun_ajaran) {
      return res.status(400).json({ message: 'Tahun ajaran harus diisi' });
    }

    const [result] = await db.execute(
      'INSERT INTO tahun_ajaran (tahun_ajaran, status) VALUES (?, ?)',
      [tahun_ajaran, status || 'tidak_aktif']
    );

    const [newRow] = await db.execute('SELECT * FROM tahun_ajaran WHERE id = ?', [result.insertId]);
    await logActivity(req, 'Tambah', 'Tahun Ajaran', result.insertId, `Menambah tahun ajaran: ${tahun_ajaran}`);
    res.status(201).json(newRow[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Tahun ajaran sudah ada' });
    }
    res.status(500).json({ message: 'Gagal menambah tahun ajaran', error: error.message });
  }
});

// PUT /:id — Update tahun ajaran
router.put('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [existing] = await db.execute('SELECT * FROM tahun_ajaran WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });

    const { tahun_ajaran, status } = req.body;

    // If setting this as active, deactivate all others
    if (status === 'aktif') {
      await db.execute("UPDATE tahun_ajaran SET status = 'tidak_aktif'");
    }

    await db.execute(
      'UPDATE tahun_ajaran SET tahun_ajaran = ?, status = ? WHERE id = ?',
      [
        tahun_ajaran || existing[0].tahun_ajaran,
        status || existing[0].status,
        req.params.id,
      ]
    );

    const [updated] = await db.execute('SELECT * FROM tahun_ajaran WHERE id = ?', [req.params.id]);
    await logActivity(req, 'Ubah', 'Tahun Ajaran', req.params.id, `Mengubah tahun ajaran #${req.params.id}`);
    res.json(updated[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Tahun ajaran sudah ada' });
    }
    res.status(500).json({ message: 'Gagal mengupdate tahun ajaran', error: error.message });
  }
});

// DELETE /:id — Hapus tahun ajaran
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [existing] = await db.execute('SELECT * FROM tahun_ajaran WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });
    if (existing[0].status === 'aktif') {
      return res.status(400).json({ message: 'Tidak dapat menghapus tahun ajaran yang sedang aktif' });
    }
    await db.execute('DELETE FROM tahun_ajaran WHERE id = ?', [req.params.id]);
    await logActivity(req, 'Hapus', 'Tahun Ajaran', req.params.id, `Menghapus tahun ajaran #${req.params.id}`);
    res.json({ message: 'Tahun ajaran berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus tahun ajaran', error: error.message });
  }
});

module.exports = router;
