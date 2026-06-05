const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const { getDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { logActivity } = require('../helpers/activityLogHelper');

router.use(authenticateToken);

// GET / — Daftar semua BK records with siswa info
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { search, id_siswa, tanggal_mulai, tanggal_selesai } = req.query;

    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(s.nama LIKE ? OR s.nis LIKE ?)');
      const q = `%${search}%`;
      params.push(q, q);
    }
    if (id_siswa) {
      conditions.push('bk.id_siswa = ?');
      params.push(id_siswa);
    }
    if (tanggal_mulai) {
      conditions.push('bk.tanggal >= ?');
      params.push(tanggal_mulai);
    }
    if (tanggal_selesai) {
      conditions.push('bk.tanggal <= ?');
      params.push(tanggal_selesai);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await db.execute(`
      SELECT bk.id, bk.id_siswa, bk.tanggal, bk.kasus, bk.tindakan, bk.created_at,
        s.nis, s.nama AS nama_siswa, s.foto AS foto_siswa, k.nama_kelas
      FROM bimbingan_konseling bk
      JOIN siswa s ON s.id = bk.id_siswa
      LEFT JOIN kelas k ON k.id = s.id_kelas
      ${whereClause}
      ORDER BY bk.tanggal DESC, bk.id DESC
    `, params);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat data BK', error: error.message });
  }
});

// GET /rekap — Statistik BK (total, per bulan, per siswa)
router.get('/rekap', async (req, res) => {
  try {
    const db = await getDatabase();

    // 1. Ringkasan umum
    const [totalRow] = await db.execute(`
      SELECT
        COUNT(*) AS total_catatan,
        COUNT(DISTINCT id_siswa) AS total_siswa
      FROM bimbingan_konseling
    `);

    // 2. Per bulan (12 bulan terakhir)
    const [perBulan] = await db.execute(`
      SELECT
        DATE_FORMAT(tanggal, '%Y-%m') AS bulan,
        COUNT(*) AS jumlah
      FROM bimbingan_konseling
      WHERE tanggal >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(tanggal, '%Y-%m')
      ORDER BY bulan ASC
    `);

    // 3. Siswa dengan BK terbanyak (top 10)
    const [topSiswa] = await db.execute(`
      SELECT bk.id_siswa, s.nis, s.nama AS nama_siswa, k.nama_kelas,
        COUNT(*) AS jumlah
      FROM bimbingan_konseling bk
      JOIN siswa s ON s.id = bk.id_siswa
      LEFT JOIN kelas k ON k.id = s.id_kelas
      GROUP BY bk.id_siswa
      ORDER BY jumlah DESC
      LIMIT 10
    `);

    res.json({
      ringkasan: {
        total_catatan: totalRow[0].total_catatan,
        total_siswa: totalRow[0].total_siswa,
      },
      per_bulan: perBulan,
      top_siswa: topSiswa,
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat rekap BK', error: error.message });
  }
});

// GET /export-excel — Export data BK ke Excel
router.get('/export-excel', async (req, res) => {
  try {
    const db = await getDatabase();
    const { search, id_siswa, tanggal_mulai, tanggal_selesai } = req.query;

    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(s.nama LIKE ? OR s.nis LIKE ?)');
      const q = `%${search}%`;
      params.push(q, q);
    }
    if (id_siswa) {
      conditions.push('bk.id_siswa = ?');
      params.push(id_siswa);
    }
    if (tanggal_mulai) {
      conditions.push('bk.tanggal >= ?');
      params.push(tanggal_mulai);
    }
    if (tanggal_selesai) {
      conditions.push('bk.tanggal <= ?');
      params.push(tanggal_selesai);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const [rows] = await db.execute(`
      SELECT bk.id, bk.id_siswa, bk.tanggal, bk.kasus, bk.tindakan, bk.created_at,
        s.nis, s.nama AS nama_siswa, k.nama_kelas
      FROM bimbingan_konseling bk
      JOIN siswa s ON s.id = bk.id_siswa
      LEFT JOIN kelas k ON k.id = s.id_kelas
      ${whereClause}
      ORDER BY bk.tanggal DESC, bk.id DESC
    `, params);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Bimbingan Konseling');

    const columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'NIS', key: 'nis', width: 14 },
      { header: 'Nama Siswa', key: 'nama_siswa', width: 30 },
      { header: 'Kelas', key: 'kelas', width: 14 },
      { header: 'Tanggal', key: 'tanggal', width: 16 },
      { header: 'Kasus', key: 'kasus', width: 40 },
      { header: 'Tindakan', key: 'tindakan', width: 40 },
    ];

    sheet.columns = columns;

    // Style header
    const headerRow = sheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    // Data rows
    rows.forEach((r, i) => {
      const row = sheet.addRow({
        no: i + 1,
        nis: r.nis,
        nama_siswa: r.nama_siswa,
        kelas: r.nama_kelas || '-',
        tanggal: r.tanggal ? new Date(r.tanggal).toLocaleDateString('id-ID') : '-',
        kasus: r.kasus,
        tindakan: r.tindakan,
      });
      row.height = 22;
      row.eachCell((cell, colIdx) => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' },
        };
        cell.alignment = { vertical: 'middle', horizontal: colIdx === 0 ? 'center' : 'left', wrapText: colIdx >= 5 };
        // Zebra striping
        if (i % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        }
      });
    });

    // Footer
    const footerRow = sheet.addRow({
      no: '', nis: '', nama_siswa: '', kelas: '', tanggal: '',
      kasus: '',
      tindakan: `Total: ${rows.length} catatan BK`
    });
    footerRow.eachCell((cell) => {
      cell.font = { bold: true, italic: true, size: 10, color: { argb: 'FF6B7280' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=data_bimbingan_konseling.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Gagal export Excel', error: error.message });
  }
});

// GET /:id — Detail BK record
router.get('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute(`
      SELECT bk.*, s.nis, s.nama AS nama_siswa, k.nama_kelas
      FROM bimbingan_konseling bk
      JOIN siswa s ON s.id = bk.id_siswa
      LEFT JOIN kelas k ON k.id = s.id_kelas
      WHERE bk.id = ?
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// POST / — Tambah BK record
router.post('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id_siswa, tanggal, kasus, tindakan } = req.body;

    if (!id_siswa || !tanggal || !kasus || !tindakan) {
      return res.status(400).json({ message: 'Semua field harus diisi' });
    }

    const [result] = await db.execute(
      'INSERT INTO bimbingan_konseling (id_siswa, tanggal, kasus, tindakan) VALUES (?, ?, ?, ?)',
      [id_siswa, tanggal, kasus, tindakan]
    );

    const [newRow] = await db.execute(`
      SELECT bk.*, s.nis, s.nama AS nama_siswa, k.nama_kelas
      FROM bimbingan_konseling bk
      JOIN siswa s ON s.id = bk.id_siswa
      LEFT JOIN kelas k ON k.id = s.id_kelas
      WHERE bk.id = ?
    `, [result.insertId]);

    await logActivity(req, 'Tambah', 'Bimbingan Konseling', result.insertId, `Menambah catatan BK untuk siswa`);
    res.status(201).json(newRow[0]);
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambah data BK', error: error.message });
  }
});

// PUT /:id — Edit BK record
router.put('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id_siswa, tanggal, kasus, tindakan } = req.body;

    const [existing] = await db.execute('SELECT * FROM bimbingan_konseling WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });

    await db.execute(
      'UPDATE bimbingan_konseling SET id_siswa=?, tanggal=?, kasus=?, tindakan=? WHERE id=?',
      [
        id_siswa || existing[0].id_siswa,
        tanggal || existing[0].tanggal,
        kasus !== undefined ? kasus : existing[0].kasus,
        tindakan !== undefined ? tindakan : existing[0].tindakan,
        req.params.id
      ]
    );

    const [updated] = await db.execute(`
      SELECT bk.*, s.nis, s.nama AS nama_siswa, k.nama_kelas
      FROM bimbingan_konseling bk
      JOIN siswa s ON s.id = bk.id_siswa
      LEFT JOIN kelas k ON k.id = s.id_kelas
      WHERE bk.id = ?
    `, [req.params.id]);

    await logActivity(req, 'Ubah', 'Bimbingan Konseling', req.params.id, `Mengubah catatan BK #${req.params.id}`);
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengupdate data BK', error: error.message });
  }
});

// DELETE /:id — Hapus BK record
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [existing] = await db.execute('SELECT * FROM bimbingan_konseling WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });

    await db.execute('DELETE FROM bimbingan_konseling WHERE id = ?', [req.params.id]);
    await logActivity(req, 'Hapus', 'Bimbingan Konseling', req.params.id, `Menghapus catatan BK #${req.params.id}`);
    res.json({ message: 'Data BK berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus data BK', error: error.message });
  }
});

module.exports = router;
