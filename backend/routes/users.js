const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { logActivity } = require('../helpers/activityLogHelper');

// Middleware: hanya admin yang bisa akses
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Hanya admin yang dapat mengelola user' });
  }
  next();
}

router.use(authenticateToken);
router.use(adminOnly);

// GET /api/users — Daftar semua user
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const [users] = await db.execute(`
      SELECT u.id, u.username, u.nama, u.role, u.ppdb_access, u.created_at,
        g.id AS guru_id, g.nik AS guru_nik,
        g.jenis_kelamin AS guru_jenis_kelamin, g.no_telp AS guru_no_telp
      FROM users u
      LEFT JOIN guru g ON g.id_user = u.id
      ORDER BY u.created_at DESC
    `);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat data user', error: error.message });
  }
});

// POST /api/users — Tambah user baru
router.post('/', async (req, res) => {
  try {
    const { username, password, nama, role } = req.body;
    const db = await getDatabase();

    if (!username || !password || !nama) {
      return res.status(400).json({ message: 'Username, password, dan nama harus diisi' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password minimal 6 karakter' });
    }

    const validRoles = ['admin', 'bendahara', 'guru'];
    const userRole = validRoles.includes(role) ? role : 'bendahara';

    const [existingRows] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);
    if (existingRows[0]) {
      return res.status(400).json({ message: 'Username sudah digunakan' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const ppdbAccess = userRole === 'guru' ? (req.body.ppdb_access ? 1 : 0) : 0;
    const [result] = await db.execute(
      'INSERT INTO users (username, password, nama, role, ppdb_access) VALUES (?, ?, ?, ?, ?)',
      [username, hashedPassword, nama, userRole, ppdbAccess]
    );
    const userId = result.insertId;

    // Jika role=guru, auto-create guru record
    if (userRole === 'guru') {
      const { nik, jenis_kelamin, no_telp } = req.body;
      await db.execute(
        'INSERT INTO guru (nik, nama, jenis_kelamin, no_telp, id_user) VALUES (?, ?, ?, ?, ?)',
        [nik || null, nama, jenis_kelamin || null, no_telp || null, userId]
      );
    }

    const [newUserRows] = await db.execute(`
      SELECT u.id, u.username, u.nama, u.role, u.ppdb_access, u.created_at,
        g.id AS guru_id, g.nik AS guru_nik,
        g.jenis_kelamin AS guru_jenis_kelamin, g.no_telp AS guru_no_telp
      FROM users u
      LEFT JOIN guru g ON g.id_user = u.id
      WHERE u.id = ?
    `, [userId]);

    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    await logActivity({
      id_user: req.user.id, username: req.user.username,
      action: 'create', entity_type: 'user', entity_id: userId,
      description: `Menambah user: ${username} (${userRole})`,
      ip_address: ip, user_agent: userAgent,
    });

    res.status(201).json(newUserRows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambah user', error: error.message });
  }
});

// PUT /api/users/:id — Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, nama, role } = req.body;
    const db = await getDatabase();

    const [userRows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    const user = userRows[0];
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    if (username && username !== user.username) {
      const [existingRows] = await db.execute('SELECT id FROM users WHERE username = ? AND id != ?', [username, id]);
      if (existingRows[0]) {
        return res.status(400).json({ message: 'Username sudah digunakan' });
      }
    }

    const updateFields = [];
    const params = [];

    if (username) { updateFields.push('username = ?'); params.push(username); }
    if (nama) { updateFields.push('nama = ?'); params.push(nama); }
    if (role) {
      const validRoles = ['admin', 'bendahara', 'guru'];
      if (validRoles.includes(role)) {
        updateFields.push('role = ?');
        params.push(role);
      }
    }
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password minimal 6 karakter' });
      }
      updateFields.push('password = ?');
      params.push(bcrypt.hashSync(password, 10));
    }

    // Handle ppdb_access
    if (req.body.ppdb_access !== undefined) {
      const ppdbAccess = req.body.ppdb_access ? 1 : 0;
      updateFields.push('ppdb_access = ?');
      params.push(ppdbAccess);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'Tidak ada data yang diubah' });
    }

    params.push(id);
    await db.execute(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`, params);

    // Cek apakah user memiliki guru record
    const [guruRows] = await db.execute('SELECT id FROM guru WHERE id_user = ?', [id]);
    const hasGuruRecord = guruRows[0];

    if (hasGuruRecord) {
      // Update guru record jika masih role guru
      if (role === 'guru') {
        const guruFields = [];
        const guruParams = [];
        if (nama) { guruFields.push('nama = ?'); guruParams.push(nama); }
        const { nik, jenis_kelamin, no_telp } = req.body;
        if (nik !== undefined) { guruFields.push('nik = ?'); guruParams.push(nik || null); }
        if (jenis_kelamin !== undefined) { guruFields.push('jenis_kelamin = ?'); guruParams.push(jenis_kelamin || null); }
        if (no_telp !== undefined) { guruFields.push('no_telp = ?'); guruParams.push(no_telp || null); }
        if (guruFields.length > 0) {
          guruParams.push(guruRows[0].id);
          await db.execute(`UPDATE guru SET ${guruFields.join(', ')} WHERE id = ?`, guruParams);
        }
      } else {
        // Role diubah dari guru ke lain — hapus guru record
        const [kelasRows] = await db.execute('SELECT COUNT(*) as count FROM kelas WHERE id_wali = ?', [guruRows[0].id]);
        if (kelasRows[0].count > 0) {
          // Set id_wali to null instead of blocking
          await db.execute('UPDATE kelas SET id_wali = NULL WHERE id_wali = ?', [guruRows[0].id]);
        }
        await db.execute('DELETE FROM guru WHERE id_user = ?', [id]);
      }
    } else if (!hasGuruRecord && role === 'guru') {
      // Buat guru record baru (user diubah jadi guru)
      const { nik, jenis_kelamin, no_telp } = req.body;
      await db.execute(
        'INSERT INTO guru (nik, nama, jenis_kelamin, no_telp, id_user) VALUES (?, ?, ?, ?, ?)',
        [nik || null, nama || user.nama, jenis_kelamin || null, no_telp || null, id]
      );
    }

    const [updatedRows] = await db.execute(`
      SELECT u.id, u.username, u.nama, u.role, u.ppdb_access, u.created_at,
        g.id AS guru_id, g.nik AS guru_nik,
        g.jenis_kelamin AS guru_jenis_kelamin, g.no_telp AS guru_no_telp
      FROM users u
      LEFT JOIN guru g ON g.id_user = u.id
      WHERE u.id = ?
    `, [id]);

    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    await logActivity({
      id_user: req.user.id, username: req.user.username,
      action: 'update', entity_type: 'user', entity_id: parseInt(id),
      description: `Mengupdate user: ${username || user.username}`,
      ip_address: ip, user_agent: userAgent,
    });

    res.json(updatedRows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengupdate user', error: error.message });
  }
});

// DELETE /api/users/:id — Hapus user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'Tidak dapat menghapus akun sendiri' });
    }

    const [userRows] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    const user = userRows[0];
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    // Jika user adalah guru, cek wali kelas & hapus guru record
    const [guruRows] = await db.execute('SELECT id FROM guru WHERE id_user = ?', [id]);
    if (guruRows[0]) {
      // Check if guru is assigned as wali kelas
      const [kelasRows] = await db.execute('SELECT COUNT(*) as count FROM kelas WHERE id_wali = ?', [guruRows[0].id]);
      if (kelasRows[0].count > 0) {
        return res.status(400).json({ message: 'Guru masih menjadi wali kelas. Hapus wali kelas terlebih dahulu' });
      }
      await db.execute('DELETE FROM guru WHERE id_user = ?', [id]);
    }

    await db.execute('DELETE FROM users WHERE id = ?', [id]);
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    await logActivity({
      id_user: req.user.id, username: req.user.username,
      action: 'delete', entity_type: 'user', entity_id: parseInt(id),
      description: `Menghapus user: ${user.username} (${user.nama})`,
      ip_address: ip, user_agent: userAgent,
    });

    res.json({ message: 'User berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus user', error: error.message });
  }
});

module.exports = router;
