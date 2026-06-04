const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const PDFDocument = require('pdfkit');

router.use(authenticateToken);

// GET /api/laporan/rekap
router.get('/rekap', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tanggal_awal, tanggal_akhir, id_jenis_pembayaran, status_siswa } = req.query;

    let query = `
      SELECT jp.nama_pembayaran, COUNT(t.id) as jumlah_transaksi, 
             COALESCE(SUM(t.jumlah_bayar), 0) as total, jp.periode
      FROM transaksi t
      JOIN jenis_pembayaran jp ON t.id_jenis_pembayaran = jp.id
      JOIN siswa s ON t.id_siswa = s.id
      WHERE 1=1
    `;
    const params = [];
    if (tanggal_awal) { query += ' AND t.tanggal_bayar >= ?'; params.push(tanggal_awal); }
    if (tanggal_akhir) { query += ' AND t.tanggal_bayar <= ?'; params.push(tanggal_akhir); }
    if (id_jenis_pembayaran) { query += ' AND t.id_jenis_pembayaran = ?'; params.push(id_jenis_pembayaran); }
    if (status_siswa) {
      const statusList = status_siswa.split(',').map(s => s.trim()).filter(Boolean);
      if (statusList.length === 1) {
        query += ' AND s.status = ?';
        params.push(statusList[0]);
      } else if (statusList.length > 1) {
        query += ` AND s.status IN (${statusList.map(() => '?').join(',')})`;
        params.push(...statusList);
      }
    }
    query += ' GROUP BY jp.id ORDER BY total DESC';

    const [rekap] = await db.execute(query, params);
    const grandTotal = rekap.reduce((sum, r) => sum + Number(r.total), 0);

    res.json({ data: rekap, grand_total: grandTotal });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/per-bulan
router.get('/per-bulan', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tahun, jenis_transaksi } = req.query;
    const year = tahun || new Date().getFullYear();

    let jenisFilter = '';
    const params = [String(year)];
    if (jenis_transaksi) {
      jenisFilter = ' AND jenis_transaksi = ?';
      params.push(jenis_transaksi);
    }

    const [data] = await db.execute(`
      SELECT 
        DATE_FORMAT(tanggal_bayar, '%m') as bulan,
        COUNT(*) as jumlah_transaksi,
        COALESCE(SUM(jumlah_bayar), 0) as total
      FROM transaksi
      WHERE DATE_FORMAT(tanggal_bayar, '%Y') = ?${jenisFilter}
      GROUP BY DATE_FORMAT(tanggal_bayar, '%m')
      ORDER BY bulan
    `, params);

    const bulanNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const result = bulanNames.map((nama, i) => {
      const bulan = String(i + 1).padStart(2, '0');
      const d = data.find(d => d.bulan === bulan);
      return {
        bulan: nama,
        jumlah_transaksi: d ? d.jumlah_transaksi : 0,
        total: d ? Number(d.total) : 0
      };
    });

    const grandTotal = result.reduce((sum, r) => sum + r.total, 0);
    res.json({ data: result, grand_total: grandTotal });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/siswa
router.get('/siswa', async (req, res) => {
  try {
    const db = await getDatabase();
    const { id_siswa, tanggal_awal, tanggal_akhir, jenis_transaksi } = req.query;

    let query = `
      SELECT t.*, jp.nama_pembayaran, jp.nominal as nominal_tagihan,
             s.nama as nama_siswa, s.nis
      FROM transaksi t
      JOIN jenis_pembayaran jp ON t.id_jenis_pembayaran = jp.id
      JOIN siswa s ON t.id_siswa = s.id
      WHERE 1=1
    `;
    const params = [];
    if (id_siswa) { query += ' AND t.id_siswa = ?'; params.push(id_siswa); }
    if (tanggal_awal) { query += ' AND t.tanggal_bayar >= ?'; params.push(tanggal_awal); }
    if (tanggal_akhir) { query += ' AND t.tanggal_bayar <= ?'; params.push(tanggal_akhir); }
    if (jenis_transaksi) { query += ' AND t.jenis_transaksi = ?'; params.push(jenis_transaksi); }
    query += ' ORDER BY t.tanggal_bayar DESC';

    const [transaksi] = await db.execute(query, params);
    const totalBayar = transaksi.reduce((sum, t) => sum + Number(t.jumlah_bayar), 0);

    res.json({ data: transaksi, total_bayar: totalBayar });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tahun } = req.query;
    const year = parseInt(tahun) || new Date().getFullYear();

    const [totalSiswaRows] = await db.execute("SELECT COUNT(*) as count FROM siswa WHERE status = 'aktif'");
    const totalSiswa = totalSiswaRows[0].count;

    const [hariIniRows] = await db.execute(
      "SELECT COUNT(*) as count, COALESCE(SUM(jumlah_bayar), 0) as total FROM transaksi WHERE tanggal_bayar = CURDATE()"
    );
    const totalPembayaranHariIni = hariIniRows[0];

    const [hariIniByJenis] = await db.execute(`
      SELECT jenis_transaksi, COUNT(*) as count, COALESCE(SUM(jumlah_bayar), 0) as total
      FROM transaksi WHERE tanggal_bayar = CURDATE()
      GROUP BY jenis_transaksi
    `);

    const [bulanIniRows] = await db.execute(
      "SELECT COUNT(*) as count, COALESCE(SUM(jumlah_bayar), 0) as total FROM transaksi WHERE DATE_FORMAT(tanggal_bayar, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')"
    );
    const totalPembayaranBulanIni = bulanIniRows[0];

    const [bulanIniByJenis] = await db.execute(`
      SELECT jenis_transaksi, COUNT(*) as count, COALESCE(SUM(jumlah_bayar), 0) as total
      FROM transaksi WHERE DATE_FORMAT(tanggal_bayar, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
      GROUP BY jenis_transaksi
    `);

    const [semuaRows] = await db.execute(
      "SELECT COUNT(*) as count, COALESCE(SUM(jumlah_bayar), 0) as total FROM transaksi"
    );
    const totalSemuaPembayaran = semuaRows[0];

    const [semuaByJenis] = await db.execute(`
      SELECT jenis_transaksi, COUNT(*) as count, COALESCE(SUM(jumlah_bayar), 0) as total
      FROM transaksi
      GROUP BY jenis_transaksi
    `);

    // Helper to get Masuk/Keluar from grouped data
    const getJenis = (data, jenis) => {
      const row = data.find(d => d.jenis_transaksi === jenis);
      return { count: row ? Number(row.count) : 0, total: row ? Number(row.total) : 0 };
    };

    const masukHariIni = getJenis(hariIniByJenis, 'Masuk');
    const keluarHariIni = getJenis(hariIniByJenis, 'Keluar');
    const masukBulanIni = getJenis(bulanIniByJenis, 'Masuk');
    const keluarBulanIni = getJenis(bulanIniByJenis, 'Keluar');
    const masukSemua = getJenis(semuaByJenis, 'Masuk');
    const keluarSemua = getJenis(semuaByJenis, 'Keluar');

    // SPP status
    const [sppRows] = await db.execute("SELECT id FROM jenis_pembayaran WHERE nama_pembayaran LIKE '%SPP%'");
    const spp = sppRows[0];
    let sppBulanIni = 0;
    if (spp) {
      const [sppCountRows] = await db.execute(
        "SELECT COUNT(*) as count FROM transaksi WHERE id_jenis_pembayaran = ? AND DATE_FORMAT(tanggal_bayar, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')",
        [spp.id]
      );
      sppBulanIni = sppCountRows[0].count;
    }

    // Per-bulan data for chart
    const [perBulan] = await db.execute(`
      SELECT DATE_FORMAT(tanggal_bayar, '%m') as bulan,
             COUNT(*) as jumlah_transaksi,
             COALESCE(SUM(jumlah_bayar), 0) as total
      FROM transaksi
      WHERE DATE_FORMAT(tanggal_bayar, '%Y') = ?
      GROUP BY DATE_FORMAT(tanggal_bayar, '%m')
      ORDER BY bulan
    `, [String(year)]);

    const bulanNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const pembayaranPerBulan = bulanNames.map((nama, i) => {
      const bulan = String(i + 1).padStart(2, '0');
      const d = perBulan.find(x => x.bulan === bulan);
      return { bulan: nama, jumlah_transaksi: d ? d.jumlah_transaksi : 0, total: d ? Number(d.total) : 0 };
    });

    // Per-bulan breakdown by jenis_transaksi for comparison chart
    const [perBulanJenis] = await db.execute(`
      SELECT DATE_FORMAT(tanggal_bayar, '%m') as bulan,
             jenis_transaksi,
             COALESCE(SUM(jumlah_bayar), 0) as total
      FROM transaksi
      WHERE DATE_FORMAT(tanggal_bayar, '%Y') = ?
      GROUP BY DATE_FORMAT(tanggal_bayar, '%m'), jenis_transaksi
      ORDER BY bulan, jenis_transaksi
    `, [String(year)]);

    const pembayaranPerBulanJenis = bulanNames.map((nama, i) => {
      const bulan = String(i + 1).padStart(2, '0');
      const masuk = perBulanJenis.find(x => x.bulan === bulan && x.jenis_transaksi === 'Masuk');
      const keluar = perBulanJenis.find(x => x.bulan === bulan && x.jenis_transaksi === 'Keluar');
      return {
        bulan: nama,
        pemasukan: masuk ? Number(masuk.total) : 0,
        pengeluaran: keluar ? Number(keluar.total) : 0,
      };
    });

    // Per-jenis data for pie chart
    const [perJenis] = await db.execute(`
      SELECT jp.nama_pembayaran, COUNT(t.id) as jumlah_transaksi,
             COALESCE(SUM(t.jumlah_bayar), 0) as total
      FROM transaksi t
      JOIN jenis_pembayaran jp ON t.id_jenis_pembayaran = jp.id
      WHERE DATE_FORMAT(t.tanggal_bayar, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
      GROUP BY jp.id
      ORDER BY total DESC
    `);

    // 5 transaksi terbaru
    const [transaksiTerbaru] = await db.execute(`
      SELECT t.*, s.nama as nama_siswa, s.nis, jp.nama_pembayaran
      FROM transaksi t
      JOIN siswa s ON t.id_siswa = s.id
      JOIN jenis_pembayaran jp ON t.id_jenis_pembayaran = jp.id
      ORDER BY t.created_at DESC LIMIT 5
    `);

    res.json({
      total_siswa_aktif: totalSiswa,
      pembayaran_hari_ini: totalPembayaranHariIni,
      pembayaran_bulan_ini: totalPembayaranBulanIni,
      total_semua_pembayaran: totalSemuaPembayaran,
      spp_bulan_ini: sppBulanIni,
      transaksi_terbaru: transaksiTerbaru,
      pembayaran_per_bulan: pembayaranPerBulan,
      pembayaran_per_jenis: perJenis,
      pembayaran_per_bulan_jenis: pembayaranPerBulanJenis,
      ringkasan_jenis: {
        hari_ini: { masuk: masukHariIni, keluar: keluarHariIni },
        bulan_ini: { masuk: masukBulanIni, keluar: keluarBulanIni },
        semua: { masuk: masukSemua, keluar: keluarSemua },
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/kwitansi/:id
router.get('/kwitansi/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute(`
      SELECT t.*, s.nama as nama_siswa, s.nis, s.alamat as alamat_siswa,
             jp.nama_pembayaran, jp.nominal as nominal_tagihan, jp.periode,
             u.nama as nama_user
      FROM transaksi t
      LEFT JOIN siswa s ON t.id_siswa = s.id
      JOIN jenis_pembayaran jp ON t.id_jenis_pembayaran = jp.id
      LEFT JOIN users u ON t.id_user = u.id
      WHERE t.id = ?
    `, [req.params.id]);

    const transaksi = rows[0];

    if (!transaksi) {
      return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
    }

    const [settings] = await db.execute('SELECT `key`, `value` FROM pengaturan');
    const pengaturan = {};
    for (const s of settings) { pengaturan[s.key] = s.value; }

    const doc = new PDFDocument({ size: 'A5', layout: 'landscape', margin: 30 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=kwitansi_${(transaksi.no_kwitansi || 'KW-' + transaksi.id).replace(/\//g, '_')}.pdf`);
    doc.pipe(res);

    const pageWidth = doc.page.width - 60;
    const centerX = pageWidth / 2;

    // ── Kop Surat dengan Logo ──
    const logoPath = pengaturan.logo;
    const marginLeft = 30;
    const marginRight = 30;
    const kwPageWidth = doc.page.width - marginLeft - marginRight;

    let hasLogo = false;
    let logoWidth = 0;

    if (logoPath) {
      const fullPath = path.join(__dirname, '..', logoPath.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        try {
          const img = doc.openImage(fullPath);
          const maxW = 35, maxH = 35;
          const scale = Math.min(maxW / img.width, maxH / img.height);
          logoWidth = img.width * scale;
          const logoHeight = img.height * scale;
          doc.image(fullPath, marginLeft, doc.y, { width: logoWidth, height: logoHeight });
          hasLogo = true;
        } catch (e) {
          // Abaikan
        }
      }
    }

    const textX = hasLogo ? marginLeft + logoWidth + 8 : marginLeft;
    const textWidth = hasLogo ? kwPageWidth - logoWidth - 8 : kwPageWidth;
    const textAlign = hasLogo ? 'left' : 'center';
    const startY = doc.y;

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#15803D')
      .text(pengaturan.nama_sekolah || 'SMA Annajah', textX, startY, { width: textWidth, align: textAlign });

    const alamatLengkap = [pengaturan.alamat_sekolah, pengaturan.kota, pengaturan.provinsi].filter(Boolean).join(', ');
    const kontakStr = [alamatLengkap, pengaturan.no_telp ? `Telp: ${pengaturan.no_telp}` : '', pengaturan.email ? `Email: ${pengaturan.email}` : ''].filter(Boolean).join(' | ');
    if (kontakStr) {
      doc.fontSize(7).fillColor('#6B7280').font('Helvetica').text(kontakStr, textX, doc.y, { width: textWidth, align: textAlign });
    }
    if (pengaturan.npsn) {
      doc.fontSize(7).fillColor('#9CA3AF').font('Helvetica').text(`NPSN: ${pengaturan.npsn}`, textX, doc.y, { width: textWidth, align: textAlign });
    }

    // Sesuaikan Y agar tidak tumpang tindih dengan logo
    const kwTextEndY = doc.y;
    const kwLogoEndY = startY + 35 + 4;
    doc.y = Math.max(kwTextEndY, kwLogoEndY);

    doc.moveDown(0.3);
    doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).stroke('#15803D');
    doc.moveDown(0.3);

    doc.fontSize(10).fillColor('#374151').font('Helvetica-Bold')
      .text('K W I T A N S I', { align: 'center' });
    doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).stroke('#15803D');
    doc.moveDown(0.5);

    doc.fontSize(9).fillColor('#374151').font('Helvetica');
    const infoLeftX = 35;
    const infoRightX = 200;
    let infoY = doc.y;

    const infoItems = [
      { label: 'No. Kwitansi', value: transaksi.no_kwitansi || '-' },
      { label: 'Tanggal', value: new Date(transaksi.tanggal_bayar).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
      { label: 'NIS', value: transaksi.nis || '-' },
      { label: 'Nama', value: transaksi.nama_siswa || namaNonSiswa(transaksi) },
    ];

    infoItems.forEach(item => {
      doc.text(item.label, infoLeftX, infoY);
      doc.text(':  ' + item.value, infoRightX, infoY);
      infoY += 13;
    });
    doc.y = infoY + 2;

    doc.moveDown(0.5);

    const tabelTop = doc.y;
    const cols = [
      { x: 30, w: 95, label: 'Jenis Pembayaran' },
      { x: 130, w: 45, label: 'Periode' },
      { x: 178, w: 50, label: 'Bulan' },
      { x: 232, w: 158, label: 'Keterangan' },
      { x: 395, w: 130, label: 'Jumlah', align: 'right' },
    ];

    doc.rect(30, tabelTop, pageWidth, 18).fill('#15803D');
    cols.forEach(col => {
      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
      doc.text(col.label, col.x + 3, tabelTop + 4, { width: col.w - 6, align: col.align || 'left' });
    });

    const rowY = tabelTop + 18;
    doc.rect(30, rowY, pageWidth, 20).fill('#F0FDF4');
    doc.rect(30, rowY, pageWidth, 20).fillOpacity(0).stroke('#E5E7EB');
    doc.fillOpacity(1); // Reset fill opacity agar teks tidak transparan

    const rowData = [
      transaksi.nama_pembayaran,
      transaksi.periode || '-',
      transaksi.bulan_bayar || '-',
      transaksi.keterangan || '-',
      `Rp ${parseInt(transaksi.jumlah_bayar).toLocaleString('id-ID')}`
    ];
    cols.forEach((col, i) => {
      doc.fillColor('#374151').fontSize(8).font('Helvetica');
      doc.text(rowData[i], col.x + 3, rowY + 5, { width: col.w - 6, align: col.align || 'left' });
    });

    doc.y = rowY + 25;

    doc.rect(30, doc.y, pageWidth, 20).fill('#15803D');
    doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
    doc.text('Total', 35, doc.y + 4);
    doc.text(`Rp ${parseInt(transaksi.jumlah_bayar).toLocaleString('id-ID')}`, 35 + pageWidth - 120, doc.y + 4, { width: 115, align: 'right' });
    doc.y = doc.y + 25;

    doc.fillColor('#374151').fontSize(8).font('Helvetica');
    doc.text(`Terbilang: # ${terbilang(transaksi.jumlah_bayar)} Rupiah #`);
    doc.moveDown(1.5);

    const ttdY = doc.y;
    const ttdLeftX = 50;
    const ttdRightX = doc.page.width - 150;

    doc.fontSize(8).fillColor('#374151').font('Helvetica');
    doc.text('Penerima', ttdLeftX + 25, ttdY, { align: 'center' });
    doc.text('Mengetahui / Hormat Kami', ttdRightX + 20, ttdY, { align: 'center' });

    doc.moveDown(3.5);
    doc.text(`( ${transaksi.nama_user || '________'} )`, ttdLeftX, doc.y, { align: 'center', width: 100 });
    doc.text(`( ${pengaturan.kepala_sekolah || '________'} )`, ttdRightX, doc.y, { align: 'center', width: 120 });
    doc.moveDown(0.3);
    doc.fontSize(7).fillColor('#6B7280');
    doc.text('Petugas', ttdLeftX, doc.y, { align: 'center', width: 100 });
    doc.text('Kepala Sekolah', ttdRightX, doc.y, { align: 'center', width: 120 });

    doc.moveDown(1.5);
    doc.fontSize(6).fillColor('#9CA3AF').font('Helvetica');
    doc.text('Lembar ini adalah bukti pembayaran yang sah. Simpan sebagai arsip penting.', { align: 'center' });

    doc.end();
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

function namaNonSiswa(transaksi) {
  // Ekstrak nama pengeluaran/pemasukan dari keterangan
  // Format: "Pengeluaran: Nama" or "Pemasukan Non-Siswa: Nama"
  const ket = transaksi.keterangan || '';
  if (transaksi.jenis_transaksi === 'Keluar' && ket.startsWith('Pengeluaran: ')) {
    return ket.substring('Pengeluaran: '.length).split(' — ')[0];
  }
  if ((transaksi.jenis_transaksi || 'Masuk') === 'Masuk' && ket.startsWith('Pemasukan Non-Siswa: ')) {
    return ket.substring('Pemasukan Non-Siswa: '.length).split(' — ')[0];
  }
  return transaksi.jenis_transaksi === 'Keluar' ? 'Pengeluaran' : 'Non-Siswa';
}

function terbilang(n) {
  if (n === 0) return '';
  const angka = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  if (n < 12) return angka[n];
  if (n < 20) return terbilang(n - 10) + ' Belas';
  if (n < 100) {
    const sisa = n % 10;
    return terbilang(Math.floor(n / 10)) + ' Puluh' + (sisa > 0 ? ' ' + terbilang(sisa) : '');
  }
  if (n < 200) return 'Seratus' + (n > 100 ? ' ' + terbilang(n - 100) : '');
  if (n < 1000) {
    const sisa = n % 100;
    return terbilang(Math.floor(n / 100)) + ' Ratus' + (sisa > 0 ? ' ' + terbilang(sisa) : '');
  }
  if (n < 2000) return 'Seribu' + (n > 1000 ? ' ' + terbilang(n - 1000) : '');
  if (n < 1000000) {
    const sisa = n % 1000;
    return terbilang(Math.floor(n / 1000)) + ' Ribu' + (sisa > 0 ? ' ' + terbilang(sisa) : '');
  }
  if (n < 1000000000) {
    const sisa = n % 1000000;
    return terbilang(Math.floor(n / 1000000)) + ' Juta' + (sisa > 0 ? ' ' + terbilang(sisa) : '');
  }
  return '';
}

// GET /api/laporan/wali-kelas-per-tingkat — Daftar wali kelas per tingkat
router.get('/wali-kelas-per-tingkat', async (req, res) => {
  try {
    const db = await getDatabase();
    const [kelas] = await db.execute(`
      SELECT 
        k.id, k.nama_kelas,
        CASE k.tingkat
          WHEN '10' THEN 'X'
          WHEN '11' THEN 'XI'
          WHEN '12' THEN 'XII'
          ELSE k.tingkat
        END as tingkat,
        g.id AS wali_id, g.nama AS wali_nama, g.nik AS wali_nik, g.foto AS wali_foto,
        (SELECT COUNT(*) FROM siswa s WHERE s.id_kelas = k.id) AS jumlah_siswa
      FROM kelas k
      LEFT JOIN guru g ON k.id_wali = g.id
      WHERE k.id_wali IS NOT NULL
      ORDER BY k.tingkat, k.nama_kelas
    `);

    // Group by tingkat
    const grouped = {};
    for (const k of kelas) {
      if (!grouped[k.tingkat]) {
        grouped[k.tingkat] = [];
      }
      grouped[k.tingkat].push({
        id: k.id,
        nama_kelas: k.nama_kelas,
        jumlah_siswa: k.jumlah_siswa,
        wali: k.wali_id ? {
          id: k.wali_id,
          nama: k.wali_nama,
          nik: k.wali_nik,
          foto: k.wali_foto,
        } : null,
      });
    }

    const tingkatOrder = ['X', 'XI', 'XII'];
    const data = tingkatOrder
      .filter(t => grouped[t])
      .map(t => ({
        tingkat: t,
        total_kelas: grouped[t].length,
        total_siswa: grouped[t].reduce((sum, k) => sum + k.jumlah_siswa, 0),
        kelas: grouped[t],
      }));

    res.json({ data });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/perbandingan-status — Perbandingan pembayaran berdasarkan status siswa
router.get('/perbandingan-status', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tahun } = req.query;
    const year = tahun || new Date().getFullYear();

    const [data] = await db.execute(`
      SELECT 
        s.status,
        COUNT(t.id) as jumlah_transaksi,
        COALESCE(SUM(t.jumlah_bayar), 0) as total
      FROM transaksi t
      JOIN siswa s ON t.id_siswa = s.id
      WHERE DATE_FORMAT(t.tanggal_bayar, '%Y') = ?
      GROUP BY s.status
      ORDER BY s.status
    `, [String(year)]);

    // Pastikan semua status muncul (aktif, lulus, keluar)
    const statusLabels = { aktif: 'Aktif', lulus: 'Lulus', keluar: 'Keluar' };
    const statusColors = { aktif: '#16a34a', lulus: '#2563eb', keluar: '#ef4444' };
    const result = ['aktif', 'lulus', 'keluar'].map(status => {
      const d = data.find(r => r.status === status);
      return {
        status,
        label: statusLabels[status] || status,
        color: statusColors[status] || '#6b7280',
        jumlah_transaksi: d ? Number(d.jumlah_transaksi) : 0,
        total: d ? Number(d.total) : 0,
      };
    });

    res.json({ data: result, tahun: year });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// ─── LAPORAN PPDB ───

// GET /api/laporan/ppdb-statistik — Statistik pendaftar PPDB per hari/bulan
router.get('/ppdb-statistik', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tahun } = req.query;
    const year = tahun || new Date().getFullYear();

    // Total per status
    const [totalStatus] = await db.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'menunggu' THEN 1 ELSE 0 END) as menunggu,
        SUM(CASE WHEN status = 'diterima' THEN 1 ELSE 0 END) as diterima,
        SUM(CASE WHEN status = 'ditolak' THEN 1 ELSE 0 END) as ditolak
      FROM ppdb_pendaftar
    `);

    // Per bulan (untuk tahun tertentu)
    const [perBulan] = await db.execute(`
      SELECT 
        DATE_FORMAT(created_at, '%m') as bulan,
        COUNT(*) as total
      FROM ppdb_pendaftar
      WHERE DATE_FORMAT(created_at, '%Y') = ?
      GROUP BY DATE_FORMAT(created_at, '%m')
      ORDER BY bulan
    `, [String(year)]);

    const bulanNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const pendaftarPerBulan = bulanNames.map((nama, i) => {
      const bulan = String(i + 1).padStart(2, '0');
      const d = perBulan.find(x => x.bulan === bulan);
      return { bulan: nama, total: d ? Number(d.total) : 0 };
    });

    // Per hari (30 hari terakhir)
    const [perHari] = await db.execute(`
      SELECT 
        DATE(created_at) as tanggal,
        COUNT(*) as total
      FROM ppdb_pendaftar
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY tanggal ASC
    `);

    // Pad missing days with zero
    const pendaftarPerHari = [];
    const today = new Date();
    for (let i = 30; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const found = perHari.find(x => {
        const xDate = x.tanggal instanceof Date ? x.tanggal.toISOString().split('T')[0] : String(x.tanggal).split(' ')[0];
        return xDate === dateStr;
      });
      pendaftarPerHari.push({
        tanggal: dateStr,
        label,
        total: found ? Number(found.total) : 0,
      });
    }

    // 10 pendaftar terbaru
    const [terbaru] = await db.execute(`
      SELECT id, no_pendaftaran, nisn, nama_lengkap, asal_sekolah, status, created_at
      FROM ppdb_pendaftar
      ORDER BY created_at DESC LIMIT 5
    `);

    res.json({
      total_pendaftar: Number(totalStatus[0].total),
      status: {
        menunggu: Number(totalStatus[0].menunggu),
        diterima: Number(totalStatus[0].diterima),
        ditolak: Number(totalStatus[0].ditolak),
      },
      pendaftar_per_bulan: pendaftarPerBulan,
      pendaftar_per_hari: pendaftarPerHari,
      pendaftar_terbaru: terbaru,
    });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// ─── LAPORAN KEHADIRAN ───

// GET /api/laporan/kehadiran-tren — Tren kehadiran per minggu/bulan
router.get('/kehadiran-tren', async (req, res) => {
  try {
    const db = await getDatabase();
    const { periode, id_siswa } = req.query; // 'weekly' or 'monthly'

    let whereSiswa = '';
    const params = [];
    if (id_siswa) {
      whereSiswa = ' AND k.id_siswa = ?';
      params.push(id_siswa);
    }

    if (periode === 'monthly') {
      // Monthly grouping for current year
      const [data] = await db.execute(`
        SELECT 
          DATE_FORMAT(k.tanggal, '%m') as key,
          DATE_FORMAT(k.tanggal, '%b') as label,
          COUNT(CASE WHEN k.status = 'hadir' THEN 1 END) as hadir,
          COUNT(CASE WHEN k.status = 'ijin' THEN 1 END) as ijin,
          COUNT(CASE WHEN k.status = 'sakit' THEN 1 END) as sakit,
          COUNT(CASE WHEN k.status = 'alpa' THEN 1 END) as alpa,
          COUNT(*) as total
        FROM kehadiran k
        JOIN siswa s ON k.id_siswa = s.id
        WHERE DATE_FORMAT(k.tanggal, '%Y') = YEAR(CURDATE())${whereSiswa}
        GROUP BY DATE_FORMAT(k.tanggal, '%m'), DATE_FORMAT(k.tanggal, '%b')
        ORDER BY MIN(k.tanggal) ASC
      `, params);

      // Pad missing months with zero
      const bulanNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const result = bulanNames.map((nama, i) => {
        const key = String(i + 1).padStart(2, '0');
        const d = data.find(x => x.key === key);
        return {
          label: nama,
          hadir: d ? Number(d.hadir) : 0,
          ijin: d ? Number(d.ijin) : 0,
          sakit: d ? Number(d.sakit) : 0,
          alpa: d ? Number(d.alpa) : 0,
          total: d ? Number(d.total) : 0,
        };
      });

      const grandTotal = {
        hadir: result.reduce((s, r) => s + r.hadir, 0),
        ijin: result.reduce((s, r) => s + r.ijin, 0),
        sakit: result.reduce((s, r) => s + r.sakit, 0),
        alpa: result.reduce((s, r) => s + r.alpa, 0),
      };
      grandTotal.total = grandTotal.hadir + grandTotal.ijin + grandTotal.sakit + grandTotal.alpa;

      return res.json({ data: result, grand_total: grandTotal, periode: 'monthly' });
    }

    // Default: weekly — last 12 weeks
    const [data] = await db.execute(`
      SELECT 
        YEARWEEK(k.tanggal) as key,
        DATE_FORMAT(DATE_SUB(k.tanggal, INTERVAL WEEKDAY(k.tanggal) DAY), '%d %b') as label,
        COUNT(CASE WHEN k.status = 'hadir' THEN 1 END) as hadir,
        COUNT(CASE WHEN k.status = 'ijin' THEN 1 END) as ijin,
        COUNT(CASE WHEN k.status = 'sakit' THEN 1 END) as sakit,
        COUNT(CASE WHEN k.status = 'alpa' THEN 1 END) as alpa,
        COUNT(*) as total
      FROM kehadiran k
      JOIN siswa s ON k.id_siswa = s.id
      WHERE k.tanggal >= DATE_SUB(CURDATE(), INTERVAL 12 WEEK)${whereSiswa}
      GROUP BY YEARWEEK(k.tanggal)
      ORDER BY MIN(k.tanggal) ASC
    `, params);

    const result = data.map(d => ({
      label: d.label,
      hadir: Number(d.hadir),
      ijin: Number(d.ijin),
      sakit: Number(d.sakit),
      alpa: Number(d.alpa),
      total: Number(d.total),
    }));

    const grandTotal = {
      hadir: result.reduce((s, r) => s + r.hadir, 0),
      ijin: result.reduce((s, r) => s + r.ijin, 0),
      sakit: result.reduce((s, r) => s + r.sakit, 0),
      alpa: result.reduce((s, r) => s + r.alpa, 0),
    };
    grandTotal.total = grandTotal.hadir + grandTotal.ijin + grandTotal.sakit + grandTotal.alpa;

    res.json({ data: result, grand_total: grandTotal, periode: 'weekly' });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/kehadiran-rekap — Rekap kehadiran per kelas
router.get('/kehadiran-rekap', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tanggal_awal, tanggal_akhir, id_kelas } = req.query;

    let where = ' WHERE 1=1';
    const params = [];

    if (tanggal_awal) { where += ' AND k.tanggal >= ?'; params.push(tanggal_awal); }
    if (tanggal_akhir) { where += ' AND k.tanggal <= ?'; params.push(tanggal_akhir); }
    if (id_kelas) { where += ' AND s.id_kelas = ?'; params.push(id_kelas); }

    // Per-kelas summary
    const [perKelas] = await db.execute(`
      SELECT 
        kl.nama_kelas, kl.tingkat, kl.id as id_kelas,
        COUNT(CASE WHEN k.status = 'hadir' THEN 1 END) as hadir,
        COUNT(CASE WHEN k.status = 'ijin' THEN 1 END) as ijin,
        COUNT(CASE WHEN k.status = 'sakit' THEN 1 END) as sakit,
        COUNT(CASE WHEN k.status = 'alpa' THEN 1 END) as alpa,
        COUNT(*) as total
      FROM kehadiran k
      JOIN siswa s ON k.id_siswa = s.id
      JOIN kelas kl ON s.id_kelas = kl.id
      ${where}
      GROUP BY kl.id, kl.nama_kelas, kl.tingkat
      ORDER BY kl.tingkat, kl.nama_kelas
    `, params);

    // Grand total
    const grandTotal = {
      hadir: perKelas.reduce((s, r) => s + Number(r.hadir), 0),
      ijin: perKelas.reduce((s, r) => s + Number(r.ijin), 0),
      sakit: perKelas.reduce((s, r) => s + Number(r.sakit), 0),
      alpa: perKelas.reduce((s, r) => s + Number(r.alpa), 0),
    };
    grandTotal.total = grandTotal.hadir + grandTotal.ijin + grandTotal.sakit + grandTotal.alpa;

    res.json({ data: perKelas, grand_total: grandTotal });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/kehadiran-siswa — Rekap kehadiran per siswa
router.get('/kehadiran-siswa', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tanggal_awal, tanggal_akhir, id_kelas } = req.query;

    let where = ' WHERE 1=1';
    const params = [];

    if (tanggal_awal) { where += ' AND k.tanggal >= ?'; params.push(tanggal_awal); }
    if (tanggal_akhir) { where += ' AND k.tanggal <= ?'; params.push(tanggal_akhir); }
    if (id_kelas) { where += ' AND s.id_kelas = ?'; params.push(id_kelas); }

    const [data] = await db.execute(`
      SELECT 
        s.id as id_siswa, s.nis, s.nama as nama_siswa, s.foto,
        kl.nama_kelas, kl.tingkat,
        COUNT(CASE WHEN k.status = 'hadir' THEN 1 END) as hadir,
        COUNT(CASE WHEN k.status = 'ijin' THEN 1 END) as ijin,
        COUNT(CASE WHEN k.status = 'sakit' THEN 1 END) as sakit,
        COUNT(CASE WHEN k.status = 'alpa' THEN 1 END) as alpa,
        COUNT(*) as total_hadir
      FROM kehadiran k
      JOIN siswa s ON k.id_siswa = s.id
      JOIN kelas kl ON s.id_kelas = kl.id
      ${where}
      GROUP BY s.id, s.nis, s.nama, s.foto, kl.nama_kelas, kl.tingkat
      ORDER BY kl.tingkat, kl.nama_kelas, s.nama ASC
    `, params);

    res.json({ data });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/ringkasan-keuangan — Ringkasan pemasukan vs pengeluaran per periode
router.get('/ringkasan-keuangan', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tanggal_awal, tanggal_akhir, grup, id_jenis_pembayaran } = req.query; // grup: 'hari' | 'bulan' | 'tahun'

    let dateFilter = '';
    const params = [];
    if (tanggal_awal) {
      dateFilter += ' AND t.tanggal_bayar >= ?';
      params.push(tanggal_awal);
    }
    if (tanggal_akhir) {
      dateFilter += ' AND t.tanggal_bayar <= ?';
      params.push(tanggal_akhir);
    }
    if (id_jenis_pembayaran) {
      dateFilter += ' AND t.id_jenis_pembayaran = ?';
      params.push(id_jenis_pembayaran);
    }

    // Default group by bulan
    let groupFormat, labelKey, sortKey;
    if (grup === 'hari') {
      groupFormat = "DATE_FORMAT(t.tanggal_bayar, '%Y-%m-%d')";
      labelKey = 'tanggal';
      sortKey = 'MIN(t.tanggal_bayar)';
    } else if (grup === 'tahun') {
      groupFormat = "DATE_FORMAT(t.tanggal_bayar, '%Y')";
      labelKey = 'tahun';
      sortKey = 'MIN(t.tanggal_bayar)';
    } else {
      groupFormat = "DATE_FORMAT(t.tanggal_bayar, '%Y-%m')";
      labelKey = 'periode';
      sortKey = 'MIN(t.tanggal_bayar)';
    }

    const query = `
      SELECT 
        ${groupFormat} as \`${labelKey}\`,
        SUM(CASE WHEN t.jenis_transaksi = 'Masuk' THEN t.jumlah_bayar ELSE 0 END) as pemasukan,
        SUM(CASE WHEN t.jenis_transaksi = 'Keluar' THEN t.jumlah_bayar ELSE 0 END) as pengeluaran,
        COUNT(CASE WHEN t.jenis_transaksi = 'Masuk' THEN 1 END) as jumlah_pemasukan,
        COUNT(CASE WHEN t.jenis_transaksi = 'Keluar' THEN 1 END) as jumlah_pengeluaran,
        COUNT(*) as total_transaksi
      FROM transaksi t
      WHERE 1=1${dateFilter}
      GROUP BY ${groupFormat}
      ORDER BY ${sortKey} ASC
    `;

    const [data] = await db.execute(query, params);

    const result = data.map(d => ({
      periode: d[labelKey],
      pemasukan: Number(d.pemasukan),
      pengeluaran: Number(d.pengeluaran),
      selisih: Number(d.pemasukan) - Number(d.pengeluaran),
      jumlah_pemasukan: Number(d.jumlah_pemasukan),
      jumlah_pengeluaran: Number(d.jumlah_pengeluaran),
      total_transaksi: Number(d.total_transaksi),
    }));

    // Grand total
    const grandTotal = {
      pemasukan: result.reduce((s, r) => s + r.pemasukan, 0),
      pengeluaran: result.reduce((s, r) => s + r.pengeluaran, 0),
      jumlah_pemasukan: result.reduce((s, r) => s + r.jumlah_pemasukan, 0),
      jumlah_pengeluaran: result.reduce((s, r) => s + r.jumlah_pengeluaran, 0),
      total_transaksi: result.reduce((s, r) => s + r.total_transaksi, 0),
    };
    grandTotal.selisih = grandTotal.pemasukan - grandTotal.pengeluaran;

    res.json({ data: result, grand_total: grandTotal });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

// GET /api/laporan/transaksi-gabungan — Laporan transaksi gabungan (Masuk & Keluar) dengan filter
router.get('/transaksi-gabungan', async (req, res) => {
  try {
    const db = await getDatabase();
    const { tanggal_awal, tanggal_akhir, id_jenis_pembayaran, search, jenis_transaksi } = req.query;

    let query = `
      SELECT t.*, s.nama as nama_siswa, s.nis, jp.nama_pembayaran, jp.nominal as nominal_tagihan, u.nama as nama_user
      FROM transaksi t
      LEFT JOIN siswa s ON t.id_siswa = s.id
      JOIN jenis_pembayaran jp ON t.id_jenis_pembayaran = jp.id
      LEFT JOIN users u ON t.id_user = u.id
      WHERE 1=1
    `;
    const params = [];

    if (tanggal_awal) { query += ' AND t.tanggal_bayar >= ?'; params.push(tanggal_awal); }
    if (tanggal_akhir) { query += ' AND t.tanggal_bayar <= ?'; params.push(tanggal_akhir); }
    if (id_jenis_pembayaran) { query += ' AND t.id_jenis_pembayaran = ?'; params.push(id_jenis_pembayaran); }
    if (search) { query += ' AND (s.nama LIKE ? OR s.nis LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (jenis_transaksi) { query += ' AND t.jenis_transaksi = ?'; params.push(jenis_transaksi); }

    query += ' ORDER BY t.tanggal_bayar DESC, t.created_at DESC';

    const [transaksi] = await db.query(query, params);

    // Hitung summary
    const totalMasuk = transaksi
      .filter(t => t.jenis_transaksi === 'Masuk')
      .reduce((sum, t) => sum + Number(t.jumlah_bayar), 0);
    const totalKeluar = transaksi
      .filter(t => t.jenis_transaksi === 'Keluar')
      .reduce((sum, t) => sum + Number(t.jumlah_bayar), 0);
    const jumlahMasuk = transaksi.filter(t => t.jenis_transaksi === 'Masuk').length;
    const jumlahKeluar = transaksi.filter(t => t.jenis_transaksi === 'Keluar').length;

    res.json({
      data: transaksi,
      total_transaksi: transaksi.length,
      ringkasan: {
        total_masuk: totalMasuk,
        total_keluar: totalKeluar,
        selisih: totalMasuk - totalKeluar,
        jumlah_masuk: jumlahMasuk,
        jumlah_keluar: jumlahKeluar,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Terjadi kesalahan', error: error.message });
  }
});

module.exports = router;
