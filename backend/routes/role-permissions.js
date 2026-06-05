const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { logActivity } = require('../helpers/activityLogHelper');

// Middleware: hanya admin yang bisa akses
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Hanya admin yang dapat mengelola permission' });
  }
  next();
}

router.use(authenticateToken);

// GET /api/role-permissions — Ambil semua permission per role
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute('SELECT * FROM role_permissions ORDER BY role, menu_path');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat permission', error: error.message });
  }
});

// GET /api/role-permissions/:role — Ambil permission untuk role tertentu
router.get('/:role', async (req, res) => {
  try {
    const { role } = req.params;
    const db = await getDatabase();
    const [rows] = await db.execute(
      'SELECT menu_path, can_access FROM role_permissions WHERE role = ?',
      [role]
    );
    const permissions = {};
    for (const row of rows) {
      permissions[row.menu_path] = Boolean(row.can_access);
    }
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat permission', error: error.message });
  }
});

// PUT /api/role-permissions/:role — Update permission untuk role tertentu
router.put('/:role', adminOnly, async (req, res) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body; // { menu_path: true/false, ... }
    const db = await getDatabase();

    const validRoles = ['admin', 'bendahara', 'guru'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Role tidak valid' });
    }

    // Pastikan admin tidak bisa mencabut aksesnya sendiri ke role-permissions
    if (role === 'admin' && permissions['/role-permissions'] === false) {
      return res.status(400).json({ message: 'Admin tidak dapat mencabut akses ke halaman ini' });
    }

    for (const [menuPath, canAccess] of Object.entries(permissions)) {
      await db.execute(
        'INSERT INTO role_permissions (role, menu_path, can_access) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE can_access = ?',
        [role, menuPath, canAccess ? 1 : 0, canAccess ? 1 : 0]
      );
    }

    await logActivity(req, 'Ubah', 'Role Permissions', null, `Memperbarui permission untuk role: ${role}`);
    res.json({ message: `Permission untuk role ${role} berhasil diperbarui` });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengupdate permission', error: error.message });
  }
});

module.exports = router;
