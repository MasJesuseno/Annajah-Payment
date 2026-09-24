const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDatabase } = require('../database');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { generateCaptcha, validateCaptcha } = require('../helpers/captchaHelper');
const { logActivity } = require('../helpers/activityLogHelper');

// ─────────────────────────────────────────────────────────────
//  Panel /Internal — modul mobile untuk login karyawan
//  Endpoint ini berdiri sendiri (namespace /api/internal) agar
//  aplikasi mobile bisa dipakai tanpa membawa seluruh bundle admin.
// ─────────────────────────────────────────────────────────────

// Helper untuk log percobaan login ke tabel log_login
async function logLoginToDb({ username, status, alasan, ip, userAgent }) {
  try {
    const db = await getDatabase();
    await db.execute(
      'INSERT INTO log_login (username, status, alasan, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
      [username, status, alasan || null, ip || null, userAgent || null]
    );
  } catch (err) {
    // Jangan sampai error logging mengganggu response login
    console.error('[internal:logLogin] Gagal menulis log:', err.message);
  }
}

// GET /api/internal/captcha — captcha matematika untuk halaman login mobile
router.get('/captcha', (req, res) => {
  res.json(generateCaptcha());
});

// POST /api/internal/login
router.post('/login', async (req, res) => {
  try {
    const { username, password, captcha_token, captcha_answer } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (!username || !password) {
      await logLoginToDb({ username: username || '(kosong)', status: 'gagal', alasan: 'Username/password kosong', ip, userAgent });
      return res.status(400).json({ message: 'Username dan password harus diisi' });
    }

    // Validasi captcha
    if (!validateCaptcha(captcha_token, captcha_answer)) {
      await logLoginToDb({ username, status: 'gagal', alasan: 'Captcha salah', ip, userAgent });
      return res.status(400).json({ message: 'Captcha salah. Silakan coba lagi.', captchaError: true });
    }

    const db = await getDatabase();
    const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];

    if (!user) {
      await logLoginToDb({ username, status: 'gagal', alasan: 'Username tidak ditemukan', ip, userAgent });
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    if (!bcrypt.compareSync(password, user.password)) {
      await logLoginToDb({ username, status: 'gagal', alasan: 'Password salah', ip, userAgent });
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    await logLoginToDb({ username, status: 'sukses', alasan: 'Login berhasil (Panel Internal)', ip, userAgent });

    await logActivity({
      id_user: user.id,
      username: user.username,
      action: 'login',
      entity_type: 'user',
      entity_id: user.id,
      description: `Login berhasil melalui Panel Internal (${user.role})`,
      ip_address: ip,
      user_agent: userAgent,
    });

    const token = generateToken(user);
    const responseUser = await buildSessionUser(db, user);

    res.json({ token, user: responseUser });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/internal/me — sesi aktif + hak akses menu untuk panel mobile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }
    res.json(await buildSessionUser(db, user));
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

/**
 * Susun data sesi user untuk panel Internal:
 * informasi dasar + data karyawan (jika terhubung) + peta hak akses menu.
 */
async function buildSessionUser(db, user) {
  const responseUser = {
    id: user.id,
    username: user.username,
    nama: user.nama,
    role: user.role,
    ppdb_access: Boolean(user.ppdb_access),
  };

  // Data karyawan (jika akun ini terhubung ke tabel guru)
  try {
    const [guruRows] = await db.execute(
      'SELECT id AS guru_id, nama, nik, jenis_karyawan, foto FROM guru WHERE id_user = ?',
      [user.id]
    );
    if (guruRows[0]) {
      responseUser.guru_id = guruRows[0].guru_id;
      responseUser.jenis_karyawan = guruRows[0].jenis_karyawan;
      if (guruRows[0].foto) responseUser.foto = guruRows[0].foto;
    }
  } catch (e) {
    // Tabel guru mungkin belum ada — abaikan
  }

  // Peta hak akses menu: { [menu_path]: boolean }
  try {
    const [permRows] = await db.execute(
      'SELECT menu_path, can_access FROM role_permissions WHERE role = ?',
      [user.role]
    );
    const permissions = {};
    for (const row of permRows) {
      permissions[row.menu_path] = Boolean(row.can_access);
    }
    responseUser.permissions = permissions;
  } catch (e) {
    responseUser.permissions = null;
  }

  return responseUser;
}

module.exports = router;
