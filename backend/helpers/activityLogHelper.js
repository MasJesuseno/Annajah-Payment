const { getDatabase } = require('../database');

/**
 * Catat aktivitas user ke tabel activity_log
 *
 * Mendukung dua gaya pemanggilan:
 * 1. Object style: logActivity({ id_user, username, action, entity_type, entity_id, description, ip_address, user_agent })
 * 2. Positional style: logActivity(req, action, entity_type, entity_id, description)
 *    (req harus memiliki properti .user, .ip, .get() seperti Express request object)
 *
 * @param {Object|Express.Request} paramsOrReq - Object parameter atau Express Request
 * @param {string} [action] - Tindakan (hanya untuk positional style)
 * @param {string} [entity_type] - Jenis entitas (hanya untuk positional style)
 * @param {number} [entity_id] - ID entitas (hanya untuk positional style)
 * @param {string} [description] - Deskripsi kegiatan (hanya untuk positional style)
 */
async function logActivity(paramsOrReq, action, entity_type, entity_id, description) {
  try {
    const db = await getDatabase();

    let id_user, username, act, entType, entId, desc, ip_address, user_agent;

    if (paramsOrReq && paramsOrReq.user) {
      // Positional style: logActivity(req, action, entity_type, entity_id, description)
      const req = paramsOrReq;
      id_user = req.user?.id;
      username = req.user?.username;
      act = action;
      entType = entity_type;
      entId = entity_id;
      desc = description;
      ip_address = req.ip || req.connection?.remoteAddress;
      user_agent = req.get?.('User-Agent');
    } else {
      // Object style: logActivity({ id_user, username, action, entity_type, ... })
      const p = paramsOrReq || {};
      id_user = p.id_user;
      username = p.username;
      act = p.action;
      entType = p.entity_type;
      entId = p.entity_id;
      desc = p.description;
      ip_address = p.ip_address;
      user_agent = p.user_agent;
    }

    await db.execute(
      `INSERT INTO activity_log (id_user, username, action, entity_type, entity_id, description, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id_user || null, username || null, act || null, entType || null, entId || null, desc || null, ip_address || null, user_agent || null]
    );
  } catch (err) {
    // Jangan sampai error logging mengganggu proses utama
    console.error('[activityLog] Gagal menulis log:', err.message);
  }
}

module.exports = { logActivity };
