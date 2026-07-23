const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { logActivity } = require('../helpers/activityLogHelper');

router.use(authenticateToken);

// GET / — Daftar semua periode penilaian
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute(`
      SELECT * FROM periode_penilaian ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat data periode penilaian', error: error.message });
  }
});

// GET /:id — Detail periode penilaian
router.get('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute('SELECT * FROM periode_penilaian WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// POST / — Tambah periode penilaian
router.post('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { periode } = req.body;

    if (!periode) {
      return res.status(400).json({ message: 'Periode penilaian harus diisi' });
    }

    const [result] = await db.execute(
      'INSERT INTO periode_penilaian (periode) VALUES (?)',
      [periode]
    );

    const [newRow] = await db.execute('SELECT * FROM periode_penilaian WHERE id = ?', [result.insertId]);

    res.status(201).json(newRow[0]);
    await logActivity(req, 'Tambah', 'Periode Penilaian', result.insertId, `Menambah periode: ${periode}`);
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambah periode penilaian', error: error.message });
  }
});

// PUT /:id — Update periode penilaian
router.put('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [existing] = await db.execute('SELECT * FROM periode_penilaian WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });

    const { periode } = req.body;

    await db.execute(
      'UPDATE periode_penilaian SET periode = ? WHERE id = ?',
      [periode !== undefined ? periode : existing[0].periode, req.params.id]
    );

    const [updated] = await db.execute('SELECT * FROM periode_penilaian WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
    await logActivity(req, 'Ubah', 'Periode Penilaian', req.params.id, `Mengubah periode #${req.params.id}`);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengupdate periode penilaian', error: error.message });
  }
});

// DELETE /:id — Hapus periode penilaian
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [existing] = await db.execute('SELECT * FROM periode_penilaian WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });

    await db.execute('DELETE FROM periode_penilaian WHERE id = ?', [req.params.id]);
    await logActivity(req, 'Hapus', 'Periode Penilaian', req.params.id, `Menghapus periode #${req.params.id}`);
    res.json({ message: 'Periode penilaian berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus periode penilaian', error: error.message });
  }
});

module.exports = router;
