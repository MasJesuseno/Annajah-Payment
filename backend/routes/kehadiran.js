const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { handleError } = require('../helpers/errorHandler');

router.use(authenticateToken);

// GET /api/kehadiran — list kehadiran with filters
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tanggal_awal, tanggal_akhir, id_kelas, id_siswa, search, status, page, per_page } = req.query;

    let where = ' WHERE 1=1';
    const params = [];

    if (tanggal_awal) {
      where += ' AND k.tanggal >= ?';
      params.push(tanggal_awal);
    }
    if (tanggal_akhir) {
      where += ' AND k.tanggal <= ?';
      params.push(tanggal_akhir);
    }
    if (id_kelas) {
      where += ' AND s.id_kelas = ?';
      params.push(id_kelas);
    }
    if (id_siswa) {
      where += ' AND k.id_siswa = ?';
      params.push(id_siswa);
    }
    if (search) {
      where += ' AND s.nama LIKE ?';
      params.push(`%${search}%`);
    }
    if (status) {
      where += ' AND k.status = ?';
      params.push(status);
    }

    const baseQuery = `
      FROM kehadiran k
      JOIN siswa s ON s.id = k.id_siswa
      LEFT JOIN kelas kl ON kl.id = s.id_kelas
    `;

    // Count total
    const [countRows] = await db.query(`SELECT COUNT(*) as total ${baseQuery}${where}`, params);
    const total = countRows[0].total;

    // Fetch data
    let query = `
      SELECT k.*, s.nis, s.nama AS nama_siswa, s.foto, kl.nama_kelas
      ${baseQuery}${where}
      ORDER BY k.tanggal DESC, k.jam_masuk DESC
    `;

    // Pagination — use fresh params array for the data query
    let dataParams = [...params];
    if (page) {
      const pg = parseInt(page);
      const pp = parseInt(per_page);
      const limit = (pp && pp > 0) ? pp : 25;
      const offset = (pg && pg > 0) ? (pg - 1) * limit : 0;
      query += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    const [rows] = await db.query(query, dataParams);

    if (page) {
      const limit = parseInt(per_page) || 25;
      const currentPage = parseInt(page);
      res.json({
        data: rows,
        total,
        page: currentPage,
        per_page: limit,
        total_pages: Math.ceil(total / limit),
      });
    } else {
      res.json(rows);
    }
  } catch (error) {
    handleError(error, req, res, 'Gagal memuat data kehadiran');
  }
});

// GET /api/kehadiran/rekap-mingguan/:guru_id — Ringkasan kehadiran siswa minggu ini untuk wali kelas
router.get('/rekap-mingguan/:guru_id', async (req, res) => {
  try {
    const db = await getDatabase();
    const guruId = req.params.guru_id;

    // Get classes where this guru is wali kelas
    const [kelasList] = await db.execute('SELECT id, nama_kelas FROM kelas WHERE id_wali = ?', [guruId]);
    if (kelasList.length === 0) {
      return res.json({
        total_siswa: 0,
        minggu: [],
        ringkasan: { hadir: 0, ijin: 0, sakit: 0, alpa: 0, total: 0 },
        persentase: 0,
      });
    }

    const kelasIds = kelasList.map(k => k.id);
    const placeholders = kelasIds.map(() => '?').join(',');
    const params = kelasIds.map(String);

    // Count total siswa in wali classes
    const [siswaRows] = await db.execute(
      `SELECT COUNT(*) as total FROM siswa WHERE id_kelas IN (${placeholders}) AND status = 'aktif'`,
      params
    );
    const totalSiswa = siswaRows[0].total;

    // Calculate current week (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const tanggalAwal = monday.toISOString().split('T')[0];
    const tanggalAkhir = sunday.toISOString().split('T')[0];

    // Fetch attendance records for this week for all students in wali classes
    const [rows] = await db.query(`
      SELECT k.tanggal, k.status
      FROM kehadiran k
      JOIN siswa s ON s.id = k.id_siswa
      WHERE s.id_kelas IN (${placeholders})
        AND k.tanggal >= ?
        AND k.tanggal <= ?
      ORDER BY k.tanggal ASC
    `, [...params, tanggalAwal, tanggalAkhir]);

    // Build day-by-day data
    const dayLabels = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const minggu = [];
    const ringkasan = { hadir: 0, ijin: 0, sakit: 0, alpa: 0, total: 0 };

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = dayLabels[date.getDay()];
      const isFuture = date > now;

      const dayRecords = rows.filter(r => {
        const rDate = r.tanggal instanceof Date
          ? r.tanggal.toISOString().split('T')[0]
          : new Date(r.tanggal).toISOString().split('T')[0];
        return rDate === dateStr;
      });

      const hadir = dayRecords.filter(r => r.status === 'hadir').length;
      const ijin = dayRecords.filter(r => r.status === 'ijin').length;
      const sakit = dayRecords.filter(r => r.status === 'sakit').length;
      const alpa = dayRecords.filter(r => r.status === 'alpa').length;
      const totalHari = dayRecords.length;

      ringkasan.hadir += hadir;
      ringkasan.ijin += ijin;
      ringkasan.sakit += sakit;
      ringkasan.alpa += alpa;
      ringkasan.total += totalHari;

      minggu.push({
        tanggal: dateStr,
        hari: dayName,
        hadir,
        ijin,
        sakit,
        alpa,
        total: totalHari,
        is_future: isFuture,
        is_today: dateStr === now.toISOString().split('T')[0],
      });
    }

    // Calculate attendance percentage (hadir / (total_siswa * hari_terlewat))
    const hariTerlewat = minggu.filter(d => !d.is_future && (d.tanggal <= now.toISOString().split('T')[0])).length;
    const totalPotensi = totalSiswa * Math.max(hariTerlewat, 1);
    const persentase = totalPotensi > 0 ? Math.round((ringkasan.hadir / totalPotensi) * 100) : 0;

    res.json({
      total_siswa: totalSiswa,
      kelas_wali: kelasList.map(k => k.nama_kelas),
      tanggal_awal: tanggalAwal,
      tanggal_akhir: tanggalAkhir,
      minggu,
      ringkasan,
      persentase,
    });
  } catch (error) {
    handleError(error, req, res, 'Gagal memuat rekap mingguan kehadiran');
  }
});

// GET /api/kehadiran/by-wali/:guru_id — Kehadiran by wali kelas
router.get('/by-wali/:guru_id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tanggal_awal, tanggal_akhir, search, status, page, per_page } = req.query;

    // Get classes where this guru is wali kelas
    const [kelasList] = await db.execute('SELECT id FROM kelas WHERE id_wali = ?', [req.params.guru_id]);
    if (kelasList.length === 0) {
      return res.json(page ? { data: [], total: 0, page: 1, per_page: 25, total_pages: 0 } : []);
    }

    const kelasIds = kelasList.map(k => k.id);
    const placeholders = kelasIds.map(() => '?').join(',');
    const params = kelasIds.map(String);

    let where = ` WHERE s.id_kelas IN (${placeholders})`;

    if (tanggal_awal) {
      where += ' AND k.tanggal >= ?';
      params.push(tanggal_awal);
    }
    if (tanggal_akhir) {
      where += ' AND k.tanggal <= ?';
      params.push(tanggal_akhir);
    }
    if (search) {
      where += ' AND s.nama LIKE ?';
      params.push(`%${search}%`);
    }
    if (status) {
      where += ' AND k.status = ?';
      params.push(status);
    }

    const baseQuery = `
      FROM kehadiran k
      JOIN siswa s ON s.id = k.id_siswa
      LEFT JOIN kelas kl ON kl.id = s.id_kelas
    `;

    // Count total
    const [countRows] = await db.query(`SELECT COUNT(*) as total ${baseQuery}${where}`, params);
    const total = countRows[0].total;

    // Fetch data
    let query = `
      SELECT k.*, s.nis, s.nama AS nama_siswa, s.foto, kl.nama_kelas
      ${baseQuery}${where}
      ORDER BY k.tanggal DESC, k.jam_masuk DESC
    `;

    let dataParams = [...params];
    if (page) {
      const pg = parseInt(page);
      const pp = parseInt(per_page);
      const limit = (pp && pp > 0) ? pp : 25;
      const offset = (pg && pg > 0) ? (pg - 1) * limit : 0;
      query += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    const [rows] = await db.query(query, dataParams);

    if (page) {
      const limit = parseInt(per_page) || 25;
      const currentPage = parseInt(page);
      res.json({
        data: rows,
        total,
        page: currentPage,
        per_page: limit,
        total_pages: Math.ceil(total / limit),
      });
    } else {
      res.json(rows);
    }
  } catch (error) {
    handleError(error, req, res, 'Gagal memuat data kehadiran wali kelas');
  }
});

// GET /api/kehadiran/cek-harian — Cek status pengisian kehadiran hari ini
router.get('/cek-harian', async (req, res) => {
  try {
    const db = await getDatabase();
    const today = new Date().toISOString().split('T')[0];

    // Jumlah siswa aktif
    const [siswaRows] = await db.execute(
      "SELECT COUNT(*) as total FROM siswa WHERE status = 'aktif'"
    );
    const totalSiswa = siswaRows[0].total;

    // Jumlah siswa yang sudah mengisi kehadiran hari ini
    const [hadirRows] = await db.execute(
      'SELECT COUNT(DISTINCT id_siswa) as total FROM kehadiran WHERE tanggal = ?',
      [today]
    );
    const sudahHadir = hadirRows[0].total;

    // Detail per status hari ini
    const [statusRows] = await db.execute(`
      SELECT status, COUNT(*) as jumlah
      FROM kehadiran
      WHERE tanggal = ?
      GROUP BY status
    `, [today]);

    const statusDetail = { hadir: 0, ijin: 0, sakit: 0, alpa: 0 };
    statusRows.forEach(r => {
      if (statusDetail[r.status] !== undefined) {
        statusDetail[r.status] = r.jumlah;
      }
    });

    const belumHadir = totalSiswa - sudahHadir;
    const sudahTerisi = sudahHadir > 0;

    res.json({
      tanggal: today,
      total_siswa: totalSiswa,
      sudah_hadir: sudahHadir,
      belum_hadir: belumHadir,
      sudah_terisi: sudahTerisi,
      status_detail: statusDetail,
      pesan: sudahTerisi
        ? `Kehadiran hari ini sudah diisi (${sudahHadir} dari ${totalSiswa} siswa)`
        : `Belum ada data kehadiran untuk hari ini. Silakan isi kehadiran siswa.`
    });
  } catch (error) {
    handleError(error, req, res, 'Gagal mengecek status kehadiran harian');
  }
});

// GET /api/kehadiran/:id — detail kehadiran
router.get('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute(`
      SELECT k.*, s.nis, s.nama AS nama_siswa, s.foto, kl.nama_kelas
      FROM kehadiran k
      JOIN siswa s ON s.id = k.id_siswa
      LEFT JOIN kelas kl ON kl.id = s.id_kelas
      WHERE k.id = ?
    `, [req.params.id]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Data kehadiran tidak ditemukan' });
    }
    res.json(rows[0]);
  } catch (error) {
    handleError(error, req, res, 'Gagal memuat data kehadiran');
  }
});

// POST /api/kehadiran — tambah kehadiran
router.post('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id_siswa, tanggal, jam_masuk, jam_keluar, status } = req.body;

    if (!id_siswa || !tanggal || !status) {
      return res.status(400).json({ message: 'Siswa, tanggal, dan status harus diisi' });
    }

    const statusValid = ['hadir', 'ijin', 'sakit', 'alpa'];
    if (!statusValid.includes(status)) {
      return res.status(400).json({ message: `Status tidak valid. Pilihan: ${statusValid.join(', ')}` });
    }

    // Validasi siswa
    const [siswa] = await db.execute('SELECT id FROM siswa WHERE id = ?', [id_siswa]);
    if (!siswa[0]) {
      return res.status(400).json({ message: 'Siswa tidak ditemukan' });
    }

    // Cek duplikat (satu siswa, satu tanggal)
    const [existing] = await db.execute(
      'SELECT id FROM kehadiran WHERE id_siswa = ? AND tanggal = ?',
      [id_siswa, tanggal]
    );
    if (existing[0]) {
      return res.status(400).json({ message: 'Siswa ini sudah memiliki data kehadiran pada tanggal tersebut' });
    }

    const [result] = await db.execute(
      'INSERT INTO kehadiran (id_siswa, tanggal, jam_masuk, jam_keluar, status) VALUES (?, ?, ?, ?, ?)',
      [id_siswa, tanggal, jam_masuk || null, jam_keluar || null, status]
    );

    res.status(201).json({ id: result.insertId, message: 'Data kehadiran berhasil ditambahkan' });
  } catch (error) {
    handleError(error, req, res, 'Gagal menambah data kehadiran');
  }
});

// PUT /api/kehadiran/:id — update kehadiran
router.put('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id_siswa, tanggal, jam_masuk, jam_keluar, status } = req.body;

    const [existing] = await db.execute('SELECT id FROM kehadiran WHERE id = ?', [req.params.id]);
    if (!existing[0]) {
      return res.status(404).json({ message: 'Data kehadiran tidak ditemukan' });
    }

    // Build dynamic update
    const fields = [];
    const params = [];
    if (id_siswa !== undefined) { fields.push('id_siswa = ?'); params.push(id_siswa); }
    if (tanggal !== undefined) { fields.push('tanggal = ?'); params.push(tanggal); }
    if (jam_masuk !== undefined) { fields.push('jam_masuk = ?'); params.push(jam_masuk || null); }
    if (jam_keluar !== undefined) { fields.push('jam_keluar = ?'); params.push(jam_keluar || null); }
    if (status !== undefined) {
      const statusValid = ['hadir', 'ijin', 'sakit', 'alpa'];
      if (!statusValid.includes(status)) {
        return res.status(400).json({ message: `Status tidak valid. Pilihan: ${statusValid.join(', ')}` });
      }
      fields.push('status = ?');
      params.push(status);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'Tidak ada data yang diupdate' });
    }

    params.push(req.params.id);
    await db.execute(`UPDATE kehadiran SET ${fields.join(', ')} WHERE id = ?`, params);

    res.json({ message: 'Data kehadiran berhasil diupdate' });
  } catch (error) {
    handleError(error, req, res, 'Gagal mengupdate data kehadiran');
  }
});

// POST /api/kehadiran/bulk — bulk insert/upsert kehadiran
router.post('/bulk', async (req, res) => {
  try {
    const db = await getDatabase();
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Data kehadiran harus diisi minimal 1 item' });
    }

    const statusValid = ['hadir', 'ijin', 'sakit', 'alpa'];
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const item of items) {
      const { id_siswa, tanggal, jam_masuk, jam_keluar, status } = item;

      if (!id_siswa || !tanggal || !status) {
        skipped++;
        continue;
      }
      if (!statusValid.includes(status)) {
        skipped++;
        continue;
      }

      // Cek apakah sudah ada data untuk siswa + tanggal ini
      const [existing] = await db.execute(
        'SELECT id FROM kehadiran WHERE id_siswa = ? AND tanggal = ?',
        [id_siswa, tanggal]
      );

      if (existing[0]) {
        // Update
        await db.execute(
          'UPDATE kehadiran SET jam_masuk = ?, jam_keluar = ?, status = ? WHERE id = ?',
          [jam_masuk || null, jam_keluar || null, status, existing[0].id]
        );
        updated++;
      } else {
        // Insert
        await db.execute(
          'INSERT INTO kehadiran (id_siswa, tanggal, jam_masuk, jam_keluar, status) VALUES (?, ?, ?, ?, ?)',
          [id_siswa, tanggal, jam_masuk || null, jam_keluar || null, status]
        );
        inserted++;
      }
    }

    res.status(201).json({
      message: `Kehadiran berhasil diproses: ${inserted} baru, ${updated} diupdate, ${skipped} dilewati`,
      inserted,
      updated,
      skipped,
    });
  } catch (error) {
    handleError(error, req, res, 'Gagal memproses kehadiran bulk');
  }
});

// DELETE /api/kehadiran/:id — hapus kehadiran
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [existing] = await db.execute('SELECT id FROM kehadiran WHERE id = ?', [req.params.id]);
    if (!existing[0]) {
      return res.status(404).json({ message: 'Data kehadiran tidak ditemukan' });
    }
    await db.execute('DELETE FROM kehadiran WHERE id = ?', [req.params.id]);
    res.json({ message: 'Data kehadiran berhasil dihapus' });
  } catch (error) {
    handleError(error, req, res, 'Gagal menghapus data kehadiran');
  }
});

module.exports = router;
