const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const { getDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// ─────────────────────────────────────────────
// FIXED-PATH ROUTES (harus sebelum parameterized routes!)
// ─────────────────────────────────────────────

// GET /
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute(`
      SELECT e.*,
        (SELECT COUNT(*) FROM ekstrakurikuler_peserta ep WHERE ep.id_ekstrakurikuler = e.id) AS jumlah_peserta
      FROM ekstrakurikuler e
      ORDER BY e.hari, e.jam_mulai
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat data ekstrakurikuler', error: error.message });
  }
});

// GET /rekap — Rekap peserta per ekstrakurikuler
router.get('/rekap', async (req, res) => {
  try {
    const db = await getDatabase();
    const [ekskul] = await db.execute(`
      SELECT e.*,
        (SELECT COUNT(*) FROM ekstrakurikuler_peserta ep WHERE ep.id_ekstrakurikuler = e.id) AS jumlah_peserta
      FROM ekstrakurikuler e
      ORDER BY e.hari, e.jam_mulai
    `);

    // Ambil peserta per ekstrakurikuler
    const result = await Promise.all(ekskul.map(async (e) => {
      const [peserta] = await db.execute(`
        SELECT ep.id AS peserta_id, s.nis, s.nama AS nama_siswa, k.nama_kelas,
          ep.created_at AS tanggal_daftar
        FROM ekstrakurikuler_peserta ep
        JOIN siswa s ON s.id = ep.id_siswa
        LEFT JOIN kelas k ON k.id = s.id_kelas
        WHERE ep.id_ekstrakurikuler = ?
        ORDER BY s.nama
      `, [e.id]);
      return {
        id: e.id,
        nama: e.nama,
        pelatih: e.pelatih,
        kontak_pelatih: e.kontak_pelatih,
        hari: e.hari,
        jam_mulai: e.jam_mulai,
        jam_selesai: e.jam_selesai,
        status: e.status,
        jumlah_peserta: e.jumlah_peserta,
        peserta,
      };
    }));

    const totalEkskul = result.length;
    const totalAktif = result.filter(e => e.status === 'Aktif').length;
    const totalPeserta = result.reduce((sum, e) => sum + parseInt(e.jumlah_peserta), 0);

    res.json({
      data: result,
      ringkasan: {
        total_ekskul: totalEkskul,
        total_aktif: totalAktif,
        total_tidak_aktif: totalEkskul - totalAktif,
        total_peserta: totalPeserta,
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat rekap', error: error.message });
  }
});

// GET /export-excel — Export data peserta ke Excel
router.get('/export-excel', async (req, res) => {
  try {
    const db = await getDatabase();
    const { search, kelas, ekskul } = req.query;

    let whereClause = '';
    let havingClause = '';
    const params = [];
    if (search) {
      whereClause = 'WHERE s.nama LIKE ? OR s.nis LIKE ?';
      const q = `%${search}%`;
      params.push(q, q);
    }
    if (kelas) {
      whereClause = whereClause ? `${whereClause} AND s.id_kelas = ?` : 'WHERE s.id_kelas = ?';
      params.push(kelas);
    }

    if (ekskul) {
      havingClause = 'HAVING jumlah_ekskul > 0 AND JSON_SEARCH(ekstrakurikuler, \'one\', ?, NULL, \'$.id\') IS NOT NULL';
      params.push(parseInt(ekskul));
    }

    const [siswa] = await db.execute(`
      SELECT s.id, s.nis, s.nama, s.nama_kelas,
        COALESCE(
          (SELECT JSON_ARRAYAGG(
            JSON_OBJECT('id', e.id, 'nama', e.nama, 'hari', e.hari, 'jam_mulai', e.jam_mulai, 'jam_selesai', e.jam_selesai, 'status', e.status, 'pelatih', e.pelatih)
          ) FROM ekstrakurikuler_peserta ep
          JOIN ekstrakurikuler e ON e.id = ep.id_ekstrakurikuler
          WHERE ep.id_siswa = s.id
          ), '[]'
        ) AS ekstrakurikuler,
        (SELECT COUNT(*) FROM ekstrakurikuler_peserta ep WHERE ep.id_siswa = s.id) AS jumlah_ekskul
      FROM (
        SELECT s.id, s.nis, s.nama, k.nama_kelas
        FROM siswa s
        LEFT JOIN kelas k ON k.id = s.id_kelas
        ${whereClause}
        ORDER BY s.nama
      ) s
      ${havingClause}
    `, params);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Peserta Ekstrakurikuler');

    const columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'NIS', key: 'nis', width: 14 },
      { header: 'Nama Siswa', key: 'nama', width: 30 },
      { header: 'Kelas', key: 'kelas', width: 14 },
      { header: 'Jumlah Ekskul', key: 'jumlah_ekskul', width: 16 },
      { header: 'Ekstrakurikuler', key: 'ekstrakurikuler', width: 50 },
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
    siswa.forEach((s, i) => {
      const ekskulList = typeof s.ekstrakurikuler === 'string'
        ? JSON.parse(s.ekstrakurikuler)
        : (s.ekstrakurikuler || []);
      const ekskulStr = ekskulList.map(e =>
        `${e.nama} (${e.hari}, ${(e.jam_mulai || '').slice(0, 5)}-${(e.jam_selesai || '').slice(0, 5)})${e.status !== 'Aktif' ? ' - Tidak Aktif' : ''}`
      ).join('; ');

      const row = sheet.addRow({
        no: i + 1,
        nis: s.nis,
        nama: s.nama,
        kelas: s.nama_kelas || '-',
        jumlah_ekskul: parseInt(s.jumlah_ekskul) || 0,
        ekstrakurikuler: ekskulStr || '-',
      });
      row.height = 22;
      row.eachCell((cell, colIdx) => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' },
        };
        cell.alignment = { vertical: 'middle', horizontal: colIdx === 0 ? 'center' : colIdx === 4 ? 'center' : 'left' };
        // Zebra striping
        if (i % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        }
      });
    });

    // Footer
    const totalTerdaftar = siswa.filter(s => parseInt(s.jumlah_ekskul) > 0).length;
    const totalPendaftaran = siswa.reduce((sum, s) => sum + (parseInt(s.jumlah_ekskul) || 0), 0);
    const footerRow = sheet.addRow({
      no: '', nis: '', nama: '',
      kelas: '', jumlah_ekskul: '',
      ekstrakurikuler: `Total: ${siswa.length} siswa | ${totalTerdaftar} terdaftar | ${totalPendaftaran} pendaftaran`
    });
    footerRow.eachCell((cell) => {
      cell.font = { bold: true, italic: true, size: 10, color: { argb: 'FF6B7280' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=peserta_ekstrakurikuler.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Gagal export Excel', error: error.message });
  }
});

// GET /export-excel-rekap — Export rekap peserta per ekstrakurikuler ke Excel
router.get('/export-excel-rekap', async (req, res) => {
  try {
    const db = await getDatabase();
    const [ekskul] = await db.execute(`
      SELECT e.*,
        (SELECT COUNT(*) FROM ekstrakurikuler_peserta ep WHERE ep.id_ekstrakurikuler = e.id) AS jumlah_peserta
      FROM ekstrakurikuler e
      ORDER BY e.hari, e.jam_mulai
    `);

    const result = await Promise.all(ekskul.map(async (e) => {
      const [peserta] = await db.execute(`
        SELECT s.nis, s.nama AS nama_siswa, k.nama_kelas
        FROM ekstrakurikuler_peserta ep
        JOIN siswa s ON s.id = ep.id_siswa
        LEFT JOIN kelas k ON k.id = s.id_kelas
        WHERE ep.id_ekstrakurikuler = ?
        ORDER BY s.nama
      `, [e.id]);
      return { ...e, peserta };
    }));

    const workbook = new ExcelJS.Workbook();

    // Sheet Ringkasan
    const sheetRingkasan = workbook.addWorksheet('Ringkasan');
    sheetRingkasan.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Ekstrakurikuler', key: 'nama', width: 25 },
      { header: 'Pelatih', key: 'pelatih', width: 20 },
      { header: 'Hari', key: 'hari', width: 12 },
      { header: 'Jam', key: 'jam', width: 14 },
      { header: 'Jumlah Peserta', key: 'jumlah_peserta', width: 18 },
      { header: 'Status', key: 'status', width: 12 },
    ];

    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
    };
    const borderStyle = {
      top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' },
    };

    const headerRow = sheetRingkasan.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell) => { Object.assign(cell, headerStyle); });

    result.forEach((e, i) => {
      const row = sheetRingkasan.addRow({
        no: i + 1,
        nama: e.nama,
        pelatih: e.pelatih,
        hari: e.hari,
        jam: `${(e.jam_mulai || '').slice(0, 5)}-${(e.jam_selesai || '').slice(0, 5)}`,
        jumlah_peserta: parseInt(e.jumlah_peserta),
        status: e.status,
      });
      row.height = 22;
      row.eachCell((cell, colIdx) => {
        cell.border = borderStyle;
        cell.alignment = { vertical: 'middle', horizontal: colIdx === 0 ? 'center' : colIdx === 5 ? 'center' : 'left' };
        if (i % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
      });
    });

    const totalPeserta = result.reduce((sum, e) => sum + parseInt(e.jumlah_peserta), 0);
    const footerRow = sheetRingkasan.addRow({
      no: '', nama: '', pelatih: '', hari: '', jam: '',
      jumlah_peserta: '',
      status: `Total: ${result.length} ekskul | ${totalPeserta} peserta`
    });
    footerRow.eachCell((cell) => {
      cell.font = { bold: true, italic: true, size: 10, color: { argb: 'FF6B7280' } };
      cell.border = { top: { style: 'thin', color: { argb: 'FFD1D5DB' } }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    // Sheet Detail per Ekstrakurikuler
    result.forEach((e) => {
      if (e.peserta.length === 0) return;
      const sheet = workbook.addWorksheet(e.nama.substring(0, 30));
      sheet.columns = [
        { header: 'No', key: 'no', width: 6 },
        { header: 'NIS', key: 'nis', width: 14 },
        { header: 'Nama Siswa', key: 'nama_siswa', width: 30 },
        { header: 'Kelas', key: 'kelas', width: 14 },
      ];

      const hRow = sheet.getRow(1);
      hRow.height = 30;
      hRow.eachCell((cell) => { Object.assign(cell, headerStyle); });

      e.peserta.forEach((p, i) => {
        const row = sheet.addRow({
          no: i + 1,
          nis: p.nis,
          nama_siswa: p.nama_siswa,
          kelas: p.nama_kelas || '-',
        });
        row.height = 22;
        row.eachCell((cell, colIdx) => {
          cell.border = borderStyle;
          cell.alignment = { vertical: 'middle', horizontal: colIdx === 0 ? 'center' : 'left' };
          if (i % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        });
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=rekap_ekstrakurikuler.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ message: 'Gagal export Excel rekap', error: error.message });
  }
});

// GET /semua-peserta
router.get('/semua-peserta', async (req, res) => {
  try {
    const db = await getDatabase();
    const { search, kelas, ekskul } = req.query;

    let whereClause = '';
    let havingClause = '';
    const params = [];
    if (search) {
      whereClause = 'WHERE s.nama LIKE ? OR s.nis LIKE ?';
      const q = `%${search}%`;
      params.push(q, q);
    }
    if (kelas) {
      whereClause = whereClause ? `${whereClause} AND s.id_kelas = ?` : 'WHERE s.id_kelas = ?';
      params.push(kelas);
    }

    if (ekskul) {
      havingClause = 'HAVING jumlah_ekskul > 0 AND JSON_SEARCH(ekstrakurikuler, \'one\', ?, NULL, \'$.id\') IS NOT NULL';
      params.push(parseInt(ekskul));
    }

    const [siswa] = await db.execute(`
      SELECT s.id, s.nis, s.nama, s.nama_kelas,
        COALESCE(
          (SELECT JSON_ARRAYAGG(
            JSON_OBJECT('id', e.id, 'nama', e.nama, 'hari', e.hari, 'jam_mulai', e.jam_mulai, 'jam_selesai', e.jam_selesai, 'status', e.status)
          ) FROM ekstrakurikuler_peserta ep
          JOIN ekstrakurikuler e ON e.id = ep.id_ekstrakurikuler
          WHERE ep.id_siswa = s.id
          ), '[]'
        ) AS ekstrakurikuler,
        (SELECT COUNT(*) FROM ekstrakurikuler_peserta ep WHERE ep.id_siswa = s.id) AS jumlah_ekskul
      FROM (
        SELECT s.id, s.nis, s.nama, k.nama_kelas
        FROM siswa s
        LEFT JOIN kelas k ON k.id = s.id_kelas
        ${whereClause}
        ORDER BY s.nama
      ) s
      ${havingClause}
    `, params);

    res.json(siswa);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat data peserta', error: error.message });
  }
});

// GET /by-siswa/:id_siswa — Ambil semua ekskul yang diikuti siswa
router.get('/by-siswa/:id_siswa', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute(`
      SELECT e.id, e.nama, e.hari, e.jam_mulai, e.jam_selesai, e.status,
        ep.id AS peserta_id
      FROM ekstrakurikuler_peserta ep
      JOIN ekstrakurikuler e ON e.id = ep.id_ekstrakurikuler
      WHERE ep.id_siswa = ?
      ORDER BY e.hari, e.jam_mulai
    `, [req.params.id_siswa]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat data', error: error.message });
  }
});

// POST /
router.post('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { nama, pelatih, kontak_pelatih, hari, jam_mulai, jam_selesai, status } = req.body;

    if (!nama || !pelatih || !hari || !jam_mulai || !jam_selesai) {
      return res.status(400).json({ message: 'Semua field harus diisi' });
    }

    const validDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    if (!validDays.includes(hari)) {
      return res.status(400).json({ message: 'Hari tidak valid' });
    }

    const [result] = await db.execute(
      'INSERT INTO ekstrakurikuler (nama, pelatih, kontak_pelatih, hari, jam_mulai, jam_selesai, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nama, pelatih, kontak_pelatih || null, hari, jam_mulai, jam_selesai, status || 'Aktif']
    );

    const [newRow] = await db.execute('SELECT * FROM ekstrakurikuler WHERE id = ?', [result.insertId]);
    res.status(201).json(newRow[0]);
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambah ekstrakurikuler', error: error.message });
  }
});

// POST /siswa-peserta — Simpan semua pilihan ekskul untuk satu siswa (bulk replace)
router.post('/siswa-peserta', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id_siswa, id_ekstrakurikuler_list } = req.body;

    if (!id_siswa) {
      return res.status(400).json({ message: 'ID siswa harus diisi' });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Hapus semua pendaftaran lama
      await conn.execute('DELETE FROM ekstrakurikuler_peserta WHERE id_siswa = ?', [id_siswa]);

      // Tambah yang baru
      if (id_ekstrakurikuler_list && id_ekstrakurikuler_list.length > 0) {
        const values = id_ekstrakurikuler_list.map(id => [id_siswa, id]);
        await conn.query(
          'INSERT INTO ekstrakurikuler_peserta (id_siswa, id_ekstrakurikuler) VALUES ?',
          [values]
        );
      }

      await conn.commit();
      res.json({ message: 'Data peserta berhasil disimpan' });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    res.status(500).json({ message: 'Gagal menyimpan data peserta', error: error.message });
  }
});

// ─────────────────────────────────────────────
// PARAMETERIZED ROUTES (harus setelah fixed-path routes)
// ─────────────────────────────────────────────

// GET /:id
router.get('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute('SELECT * FROM ekstrakurikuler WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /:id/peserta
router.get('/:id/peserta', async (req, res) => {
  try {
    const db = await getDatabase();
    const [peserta] = await db.execute(`
      SELECT ep.id AS peserta_id, ep.id_ekstrakurikuler, ep.id_siswa, ep.created_at AS tanggal_daftar,
        s.nis, s.nama AS nama_siswa, s.nama_kelas
      FROM ekstrakurikuler_peserta ep
      JOIN (
        SELECT s.id, s.nis, s.nama, k.nama_kelas
        FROM siswa s
        LEFT JOIN kelas k ON k.id = s.id_kelas
      ) s ON s.id = ep.id_siswa
      WHERE ep.id_ekstrakurikuler = ?
      ORDER BY s.nama
    `, [req.params.id]);
    res.json(peserta);
  } catch (error) {
    res.status(500).json({ message: 'Gagal memuat data peserta', error: error.message });
  }
});

// PUT /:id
router.put('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const { nama, pelatih, kontak_pelatih, hari, jam_mulai, jam_selesai, status } = req.body;

    const [existing] = await db.execute('SELECT * FROM ekstrakurikuler WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });

    const validDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    if (hari && !validDays.includes(hari)) {
      return res.status(400).json({ message: 'Hari tidak valid' });
    }

    await db.execute(
      'UPDATE ekstrakurikuler SET nama=?, pelatih=?, kontak_pelatih=?, hari=?, jam_mulai=?, jam_selesai=?, status=? WHERE id=?',
      [
        nama || existing[0].nama,
        pelatih || existing[0].pelatih,
        kontak_pelatih !== undefined ? kontak_pelatih : existing[0].kontak_pelatih,
        hari || existing[0].hari,
        jam_mulai || existing[0].jam_mulai,
        jam_selesai || existing[0].jam_selesai,
        status !== undefined ? status : existing[0].status,
        req.params.id
      ]
    );

    const [updated] = await db.execute('SELECT * FROM ekstrakurikuler WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ message: 'Gagal mengupdate ekstrakurikuler', error: error.message });
  }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [existing] = await db.execute('SELECT * FROM ekstrakurikuler WHERE id = ?', [req.params.id]);
    if (!existing[0]) return res.status(404).json({ message: 'Data tidak ditemukan' });

    await db.execute('DELETE FROM ekstrakurikuler WHERE id = ?', [req.params.id]);
    res.json({ message: 'Ekstrakurikuler berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus ekstrakurikuler', error: error.message });
  }
});

// POST /:id/peserta — Tambah peserta
router.post('/:id/peserta', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id_siswa } = req.body;

    if (!id_siswa) {
      return res.status(400).json({ message: 'Pilih siswa terlebih dahulu' });
    }

    // Cek duplikasi
    const [existing] = await db.execute(
      'SELECT id FROM ekstrakurikuler_peserta WHERE id_ekstrakurikuler = ? AND id_siswa = ?',
      [req.params.id, id_siswa]
    );
    if (existing[0]) {
      return res.status(400).json({ message: 'Siswa sudah terdaftar di ekstrakurikuler ini' });
    }

    await db.execute(
      'INSERT INTO ekstrakurikuler_peserta (id_ekstrakurikuler, id_siswa) VALUES (?, ?)',
      [req.params.id, id_siswa]
    );

    res.status(201).json({ message: 'Peserta berhasil ditambahkan' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menambah peserta', error: error.message });
  }
});

// DELETE /:id/peserta/:pesertaId — Hapus peserta
router.delete('/:id/peserta/:pesertaId', async (req, res) => {
  try {
    const db = await getDatabase();
    await db.execute(
      'DELETE FROM ekstrakurikuler_peserta WHERE id = ? AND id_ekstrakurikuler = ?',
      [req.params.pesertaId, req.params.id]
    );
    res.json({ message: 'Peserta berhasil dihapus' });
  } catch (error) {
    res.status(500).json({ message: 'Gagal menghapus peserta', error: error.message });
  }
});

module.exports = router;
