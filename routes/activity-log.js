const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { logActivity } = require('../helpers/activityLogHelper');

// GET /api/activity-log — ambil activity log dengan filter tanggal & username (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Hanya admin yang dapat melihat log aktivitas' });
    }

    const { start_date, end_date, username } = req.query;
    const db = await getDatabase();

    // Query utama untuk data log
    let query = 'SELECT * FROM activity_log';
    const params = [];
    const conditions = [];

    if (start_date && end_date) {
      conditions.push('created_at >= ? AND created_at <= ?');
      params.push(start_date + ' 00:00:00', end_date + ' 23:59:59');
    } else if (start_date) {
      conditions.push('created_at >= ?');
      params.push(start_date + ' 00:00:00');
    } else if (end_date) {
      conditions.push('created_at <= ?');
      params.push(end_date + ' 23:59:59');
    }

    if (username) {
      conditions.push('username = ?');
      params.push(username);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC LIMIT 500';

    const [rows] = await db.execute(query, params);

    // Query tambahan untuk daftar username unik (untuk filter dropdown)
    const [usernames] = await db.execute(
      'SELECT DISTINCT username FROM activity_log WHERE username IS NOT NULL AND username != "" ORDER BY username ASC'
    );

    res.json({
      data: rows,
      usernames: usernames.map(u => u.username),
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat log aktivitas', error: error.message });
  }
});

// POST /api/activity-log — catat aktivitas (dari client side jika diperlukan)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { action, entity_type, entity_id, description } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    await logActivity({
      id_user: req.user.id,
      username: req.user.username,
      action,
      entity_type,
      entity_id,
      description,
      ip_address: ip,
      user_agent: userAgent,
    });

    res.json({ message: 'Log berhasil dicatat' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal mencatat log', error: error.message });
  }
});

module.exports = router;
