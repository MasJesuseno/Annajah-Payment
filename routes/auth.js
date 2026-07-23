const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDatabase } = require('../database');
const { generateToken, authenticateToken } = require('../middleware/auth');

const { generateCaptcha, validateCaptcha } = require('../helpers/captchaHelper');
const { logActivity } = require('../helpers/activityLogHelper');

// Helper untuk log login ke database
async function logLoginToDb({ username, status, alasan, ip, userAgent }) {
  try {
    const db = await getDatabase();
    await db.execute(
      'INSERT INTO log_login (username, status, alasan, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
      [username, status, alasan || null, ip || null, userAgent || null]
    );
  } catch (err) {
    // Jangan sampai error logging mengganggu response login
    console.error('[logLogin] Gagal menulis log:', err.message);
  }
}

// GET /api/auth/captcha — generate math captcha
router.get('/captcha', (req, res) => {
  const captcha = generateCaptcha();
  res.json(captcha);
});

// POST /api/auth/login
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

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      await logLoginToDb({ username, status: 'gagal', alasan: 'Password salah', ip, userAgent });
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    await logLoginToDb({ username, status: 'sukses', alasan: 'Login berhasil', ip, userAgent });

    // Catat ke activity log
    await logActivity({
      id_user: user.id,
      username: user.username,
      action: 'login',
      entity_type: 'user',
      entity_id: user.id,
      description: `Login berhasil sebagai ${user.role}`,
      ip_address: ip,
      user_agent: userAgent,
    });

    const token = generateToken(user);

    // If guru, include guru_id for profile lookup
    const responseUser = {
      id: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role,
      ppdb_access: Boolean(user.ppdb_access),
    };

    if (user.role === 'guru') {
      const [guruRows] = await db.execute('SELECT id AS guru_id, jenis_karyawan FROM guru WHERE id_user = ?', [user.id]);
      if (guruRows[0]) {
        responseUser.guru_id = guruRows[0].guru_id;
        responseUser.jenis_karyawan = guruRows[0].jenis_karyawan;
      }
    }

    res.json({
      token,
      user: responseUser
    });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute('SELECT id, username, nama, role, ppdb_access FROM users WHERE id = ?', [req.user.id]);
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    const responseUser = {
      id: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role,
      ppdb_access: Boolean(user.ppdb_access),
    };

    if (user.role === 'guru') {
      const [guruRows] = await db.execute('SELECT id AS guru_id, jenis_karyawan FROM guru WHERE id_user = ?', [user.id]);
      if (guruRows[0]) {
        responseUser.guru_id = guruRows[0].guru_id;
        responseUser.jenis_karyawan = guruRows[0].jenis_karyawan;
      }
    }

    res.json(responseUser);
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/auth/log-login — ambil log login untuk admin
router.get('/log-login', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Hanya admin yang dapat melihat log login' });
    }
    const db = await getDatabase();
    const [rows] = await db.execute(
      'SELECT * FROM log_login ORDER BY created_at DESC LIMIT 200'
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// PUT /api/auth/ubah-password
router.put('/ubah-password', authenticateToken, async (req, res) => {
  try {
    const { password_lama, password_baru } = req.body;
    const db = await getDatabase();
    const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const user = rows[0];

    if (!bcrypt.compareSync(password_lama, user.password)) {
      return res.status(400).json({ message: 'Password lama salah' });
    }

    const hashedPassword = bcrypt.hashSync(password_baru, 10);
    await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);
    res.json({ message: 'Password berhasil diubah' });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

module.exports = router;
