const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { logActivity } = require('../helpers/activityLogHelper');

// ─────────────────────────────────────────────
// PUBLIC ROUTES (no auth required for TV display)
// ─────────────────────────────────────────────

// GET /api/pengaturan-tv/display — Semua data untuk tampilan TV publik
router.get('/display', async (req, res) => {
  try {
    const db = await getDatabase();

    // Ambil video yang tampil = Ya
    const [videos] = await db.execute(
      "SELECT * FROM tv_video WHERE tampil = 'Ya' ORDER BY urutan ASC, created_at DESC"
    );

    // Ambil agenda dari 2 hari lalu hingga 7 hari ke depan
    const [agenda] = await db.execute(
      "SELECT * FROM tv_agenda WHERE tanggal >= DATE_SUB(CURDATE(), INTERVAL 2 DAY) AND tanggal <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) ORDER BY tanggal ASC"
    );

    // Ambil kata bijak yang tampil = Ya
    const [kataBijak] = await db.execute(
      "SELECT * FROM tv_kata_bijak WHERE tampil = 'Ya' ORDER BY created_at DESC"
    );

    // Ambil pengaturan sekolah (logo, nama, visi, misi)
    const [settings] = await db.execute(
      "SELECT `key`, `value` FROM pengaturan WHERE `key` IN ('nama_sekolah', 'logo', 'visi', 'misi', 'alamat_sekolah', 'latitude', 'longitude')"
    );
    const pengaturan = {};
    for (const row of settings) {
      pengaturan[row.key] = row.value;
    }

    res.json({
      videos,
      agenda,
      kataBijak,
      pengaturan,
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat data display TV', error: error.message });
  }
});

// ─────────────────────────────────────────────
// AUTHENTICATED ROUTES (CRUD)
// ─────────────────────────────────────────────

router.use(authenticateToken);

// ─────────────────────────────────────────────
// AGENDA
// ─────────────────────────────────────────────

// GET /api/pengaturan-tv/agenda
router.get('/agenda', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute(
      'SELECT * FROM tv_agenda ORDER BY tanggal DESC'
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat agenda', error: error.message });
  }
});

// POST /api/pengaturan-tv/agenda
router.post('/agenda', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tanggal, agenda } = req.body;

    if (!tanggal || !agenda) {
      return res.status(400).json({ message: 'Tanggal dan agenda harus diisi' });
    }

    const [result] = await db.execute(
      'INSERT INTO tv_agenda (tanggal, agenda) VALUES (?, ?)',
      [tanggal, agenda]
    );

    const [newRow] = await db.execute('SELECT * FROM tv_agenda WHERE id = ?', [result.insertId]);

    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    await logActivity({
      id_user: req.user.id, username: req.user.username,
      action: 'create', entity_type: 'tv_agenda', entity_id: result.insertId,
      description: `Menambah agenda TV: ${agenda.substring(0, 50)}`,
      ip_address: ip, user_agent: userAgent,
    });

    res.status(201).json(newRow[0]);
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambah agenda', error: error.message });
  }
});

// PUT /api/pengaturan-tv/agenda/:id
router.put('/agenda/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tanggal, agenda } = req.body;

    const [existing] = await db.execute('SELECT * FROM tv_agenda WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });

    await db.execute(
      'UPDATE tv_agenda SET tanggal = ?, agenda = ? WHERE id = ?',
      [tanggal || existing[0].tanggal, agenda || existing[0].agenda, req.params.id]
    );

    const [updated] = await db.execute('SELECT * FROM tv_agenda WHERE id = ?', [req.params.id]);

    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    await logActivity({
      id_user: req.user.id, username: req.user.username,
      action: 'update', entity_type: 'tv_agenda', entity_id: parseInt(req.params.id),
      description: `Mengupdate agenda TV ID: ${req.params.id}`,
      ip_address: ip, user_agent: userAgent,
    });

    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengupdate agenda', error: error.message });
  }
});

// DELETE /api/pengaturan-tv/agenda/:id
router.delete('/agenda/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [existing] = await db.execute('SELECT * FROM tv_agenda WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });

    await db.execute('DELETE FROM tv_agenda WHERE id = ?', [req.params.id]);

    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    await logActivity({
      id_user: req.user.id, username: req.user.username,
      action: 'delete', entity_type: 'tv_agenda', entity_id: parseInt(req.params.id),
      description: `Menghapus agenda TV ID: ${req.params.id}`,
      ip_address: ip, user_agent: userAgent,
    });

    res.json({ message: 'Agenda berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus agenda', error: error.message });
  }
});

// ─────────────────────────────────────────────
// KATA BIJAK
// ─────────────────────────────────────────────

// GET /api/pengaturan-tv/kata-bijak
router.get('/kata-bijak', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute(
      'SELECT * FROM tv_kata_bijak ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat kata bijak', error: error.message });
  }
});

// POST /api/pengaturan-tv/kata-bijak
router.post('/kata-bijak', async (req, res) => {
  try {
    const db = await getDatabase();
    const { kata_bijak, tampil } = req.body;

    if (!kata_bijak) {
      return res.status(400).json({ message: 'Kata bijak harus diisi' });
    }

    const [result] = await db.execute(
      'INSERT INTO tv_kata_bijak (kata_bijak, tampil) VALUES (?, ?)',
      [kata_bijak, tampil || 'Ya']
    );

    const [newRow] = await db.execute('SELECT * FROM tv_kata_bijak WHERE id = ?', [result.insertId]);

    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    await logActivity({
      id_user: req.user.id, username: req.user.username,
      action: 'create', entity_type: 'tv_kata_bijak', entity_id: result.insertId,
      description: `Menambah kata bijak`,
      ip_address: ip, user_agent: userAgent,
    });

    res.status(201).json(newRow[0]);
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambah kata bijak', error: error.message });
  }
});

// PUT /api/pengaturan-tv/kata-bijak/:id
router.put('/kata-bijak/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { kata_bijak, tampil } = req.body;

    const [existing] = await db.execute('SELECT * FROM tv_kata_bijak WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });

    await db.execute(
      'UPDATE tv_kata_bijak SET kata_bijak = ?, tampil = ? WHERE id = ?',
      [
        kata_bijak || existing[0].kata_bijak,
        tampil !== undefined ? tampil : existing[0].tampil,
        req.params.id
      ]
    );

    const [updated] = await db.execute('SELECT * FROM tv_kata_bijak WHERE id = ?', [req.params.id]);

    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    await logActivity({
      id_user: req.user.id, username: req.user.username,
      action: 'update', entity_type: 'tv_kata_bijak', entity_id: parseInt(req.params.id),
      description: `Mengupdate kata bijak ID: ${req.params.id}`,
      ip_address: ip, user_agent: userAgent,
    });

    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengupdate kata bijak', error: error.message });
  }
});

// DELETE /api/pengaturan-tv/kata-bijak/:id
router.delete('/kata-bijak/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [existing] = await db.execute('SELECT * FROM tv_kata_bijak WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });

    await db.execute('DELETE FROM tv_kata_bijak WHERE id = ?', [req.params.id]);

    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    await logActivity({
      id_user: req.user.id, username: req.user.username,
      action: 'delete', entity_type: 'tv_kata_bijak', entity_id: parseInt(req.params.id),
      description: `Menghapus kata bijak ID: ${req.params.id}`,
      ip_address: ip, user_agent: userAgent,
    });

    res.json({ message: 'Kata bijak berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus kata bijak', error: error.message });
  }
});

// ─────────────────────────────────────────────
// VIDEO
// ─────────────────────────────────────────────

// GET /api/pengaturan-tv/video
router.get('/video', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute(
      'SELECT * FROM tv_video ORDER BY urutan ASC, created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat video', error: error.message });
  }
});

// POST /api/pengaturan-tv/video
router.post('/video', async (req, res) => {
  try {
    const db = await getDatabase();
    const { link_video, tampil, deskripsi } = req.body;

    if (!link_video) {
      return res.status(400).json({ message: 'Link video harus diisi' });
    }

    // Auto-calculate next urutan
    const [maxUrutan] = await db.execute('SELECT COALESCE(MAX(urutan), 0) + 1 AS next_urutan FROM tv_video');
    const nextUrutan = maxUrutan[0].next_urutan;

    const [result] = await db.execute(
      'INSERT INTO tv_video (link_video, tampil, deskripsi, urutan) VALUES (?, ?, ?, ?)',
      [link_video, tampil || 'Ya', deskripsi || null, nextUrutan]
    );

    const [newRow] = await db.execute('SELECT * FROM tv_video WHERE id = ?', [result.insertId]);

    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    await logActivity({
      id_user: req.user.id, username: req.user.username,
      action: 'create', entity_type: 'tv_video', entity_id: result.insertId,
      description: `Menambah video TV`,
      ip_address: ip, user_agent: userAgent,
    });

    res.status(201).json(newRow[0]);
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambah video', error: error.message });
  }
});

// PUT /api/pengaturan-tv/video/reorder — Bulk reorder videos
// NOTE: This must be BEFORE /video/:id to avoid Express route collision
router.put('/video/reorder', async (req, res) => {
  try {
    const db = await getDatabase();
    const { orders } = req.body; // Array of { id, urutan }

    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ message: 'Data urutan tidak valid' });
    }

    for (const item of orders) {
      await db.execute(
        'UPDATE tv_video SET urutan = ? WHERE id = ?',
        [item.urutan, item.id]
      );
    }

    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    await logActivity({
      id_user: req.user.id, username: req.user.username,
      action: 'update', entity_type: 'tv_video', entity_id: 0,
      description: 'Mengurutkan ulang video TV',
      ip_address: ip, user_agent: userAgent,
    });

    res.json({ message: 'Urutan video berhasil diperbarui' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengurutkan video', error: error.message });
  }
});

// PUT /api/pengaturan-tv/video/:id
router.put('/video/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { link_video, tampil, deskripsi, urutan } = req.body;

    const [existing] = await db.execute('SELECT * FROM tv_video WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });

    await db.execute(
      'UPDATE tv_video SET link_video = ?, tampil = ?, deskripsi = ?, urutan = ? WHERE id = ?',
      [
        link_video || existing[0].link_video,
        tampil !== undefined ? tampil : existing[0].tampil,
        deskripsi !== undefined ? deskripsi : existing[0].deskripsi,
        urutan !== undefined ? urutan : existing[0].urutan,
        req.params.id
      ]
    );

    const [updated] = await db.execute('SELECT * FROM tv_video WHERE id = ?', [req.params.id]);

    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    await logActivity({
      id_user: req.user.id, username: req.user.username,
      action: 'update', entity_type: 'tv_video', entity_id: parseInt(req.params.id),
      description: `Mengupdate video TV ID: ${req.params.id}`,
      ip_address: ip, user_agent: userAgent,
    });

    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengupdate video', error: error.message });
  }
});

// DELETE /api/pengaturan-tv/video/:id
router.delete('/video/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [existing] = await db.execute('SELECT * FROM tv_video WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });

    await db.execute('DELETE FROM tv_video WHERE id = ?', [req.params.id]);

    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    await logActivity({
      id_user: req.user.id, username: req.user.username,
      action: 'delete', entity_type: 'tv_video', entity_id: parseInt(req.params.id),
      description: `Menghapus video TV ID: ${req.params.id}`,
      ip_address: ip, user_agent: userAgent,
    });

    res.json({ message: 'Video berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus video', error: error.message });
  }
});

module.exports = router;
