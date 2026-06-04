const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/kelas
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const [kelas] = await db.execute(`
      SELECT k.*, g.nama AS wali_kelas, g.foto AS wali_foto,
        (SELECT COUNT(*) FROM siswa s WHERE s.id_kelas = k.id) AS jumlah_siswa
      FROM kelas k
      LEFT JOIN guru g ON g.id = k.id_wali
      ORDER BY k.tingkat, k.nama_kelas
    `);
    res.json(kelas);
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// POST /api/kelas
router.post('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { nama_kelas, tingkat, id_wali } = req.body;
    if (!nama_kelas || !tingkat) {
      return res.status(400).json({ message: 'Nama kelas dan tingkat harus diisi' });
    }
    const [result] = await db.execute('INSERT INTO kelas (nama_kelas, tingkat, id_wali) VALUES (?, ?, ?)', [nama_kelas, tingkat, id_wali || null]);
    res.status(201).json({ id: result.insertId, message: 'Kelas berhasil ditambahkan' });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// PUT /api/kelas/:id
router.put('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { nama_kelas, tingkat, id_wali } = req.body;
    await db.execute('UPDATE kelas SET nama_kelas=?, tingkat=?, id_wali=? WHERE id=?', [nama_kelas, tingkat, id_wali || null, req.params.id]);
    res.json({ message: 'Kelas berhasil diupdate' });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/kelas/by-wali/:guru_id — Ambil kelas berdasarkan wali kelas
router.get('/by-wali/:guru_id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [kelas] = await db.execute(`
      SELECT k.*, g.nama AS wali_kelas, g.foto AS wali_foto,
        (SELECT COUNT(*) FROM siswa s WHERE s.id_kelas = k.id) AS jumlah_siswa
      FROM kelas k
      LEFT JOIN guru g ON g.id = k.id_wali
      WHERE k.id_wali = ?
      ORDER BY k.tingkat, k.nama_kelas
    `, [req.params.guru_id]);
    res.json(kelas);
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// DELETE /api/kelas/:id
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [countRows] = await db.execute('SELECT COUNT(*) as count FROM siswa WHERE id_kelas = ?', [req.params.id]);
    if (countRows[0].count > 0) {
      return res.status(400).json({ message: 'Tidak dapat menghapus kelas yang masih memiliki siswa' });
    }
    await db.execute('DELETE FROM kelas WHERE id = ?', [req.params.id]);
    res.json({ message: 'Kelas berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

module.exports = router;
