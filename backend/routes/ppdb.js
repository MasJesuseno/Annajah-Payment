const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { handleError } = require('../helpers/errorHandler');
const { getSettings } = require('../helpers/pdfHelpers');
const { enrichGps, formatAddress } = require('../helpers/geocodeHelper');
const PDFDocument = require('pdfkit');
const { validateCaptcha } = require('../helpers/captchaHelper');
const { logActivity } = require('../helpers/activityLogHelper');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const { PDFDocument: PDFLibDocument } = require('pdf-lib');

// ─── Serve static foto (public) — HARUS sebelum router.use(authenticateToken) ───
const ppdbFotoDir = path.join(__dirname, '..', 'uploads', 'ppdb');
router.get('/foto/:filename', async (req, res) => {
  try {
    const fotoPath = path.join(ppdbFotoDir, req.params.filename);
    if (!fs.existsSync(fotoPath)) {
      return res.status(404).json({ message: 'Foto tidak ditemukan' });
    }
    res.sendFile(fotoPath);
  } catch (error) {
    handleError(error, req, res, 'Gagal memuat foto');
  }
});

// ─── Helper: Generate nomor pendaftaran ───
async function generateNoPendaftaran(db) {
  const now = new Date();
  const year = now.getFullYear();
  const prefix = `PPDB${year}`;

  // Cari nomor terakhir di tahun ini
  const [rows] = await db.execute(
    'SELECT no_pendaftaran FROM ppdb_pendaftar WHERE no_pendaftaran LIKE ? ORDER BY id DESC LIMIT 1',
    [`${prefix}%`]
  );

  let nextNum = 1;
  if (rows[0]?.no_pendaftaran) {
    const lastNum = parseInt(rows[0].no_pendaftaran.slice(prefix.length), 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return `${prefix}${String(nextNum).padStart(6, '0')}`;
}

// =================================================================
// PUBLIC ROUTES (tidak perlu autentikasi)
// =================================================================

// GET /api/ppdb/cetak/:no_pendaftaran — Cetak PDF hasil pendaftaran (public)
router.get('/cetak/:no_pendaftaran', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute('SELECT * FROM ppdb_pendaftar WHERE no_pendaftaran = ?', [req.params.no_pendaftaran]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    const pendaftar = rows[0];
    const pengaturan = await getSettings(db);
    const pdfBuffer = await generatePpdbResultPdf(pendaftar, pengaturan);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ppdb_${pendaftar.no_pendaftaran}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    handleError(error, req, res, 'Gagal mencetak PDF');
  }
});

// GET /api/ppdb/cetak-kartu/:no_pendaftaran — Cetak Kartu Pendaftaran (public)
router.get('/cetak-kartu/:no_pendaftaran', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute('SELECT * FROM ppdb_pendaftar WHERE no_pendaftaran = ?', [req.params.no_pendaftaran]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    const pendaftar = rows[0];
    const pengaturan = await getSettings(db);
    const kartuSettings = await getPpdbKartuSettings(db);
    const pdfBuffer = await generatePpdbKartuPendaftaran(pendaftar, pengaturan, kartuSettings);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=kartu_ppdb_${pendaftar.no_pendaftaran}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    handleError(error, req, res, 'Gagal mencetak kartu pendaftaran');
  }
});

// ─── Konfigurasi Multer untuk Foto Pendaftaran Baru ───
const ppdbFotoUploadDir = path.join(__dirname, '..', 'uploads', 'ppdb');
if (!fs.existsSync(ppdbFotoUploadDir)) {
  fs.mkdirSync(ppdbFotoUploadDir, { recursive: true });
}

const daftarFotoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ppdbFotoUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `ppdb_daftar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const uploadDaftarFoto = multer({
  storage: daftarFotoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return cb(new Error('Format file tidak didukung. Gunakan .jpg, .png, atau .webp.'));
    }
    cb(null, true);
  },
});

// POST /api/ppdb/daftar — Pendaftaran baru
router.post('/daftar', (req, res, next) => {
  uploadDaftarFoto.single('foto')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Ukuran file foto maksimal 2MB' });
      }
      return res.status(400).json({ message: err.message || 'File foto tidak valid' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const db = await getDatabase();
    const {
      nisn, nama_lengkap, tempat_lahir, tanggal_lahir,
      jenis_kelamin, alamat, asal_sekolah, no_telp,
      email, nama_ayah, nama_ibu, gps_latitude, gps_longitude,
      captcha_token, captcha_answer,
    } = req.body;

    // Validasi captcha untuk keamanan dari bot
    if (!validateCaptcha(captcha_token, captcha_answer)) {
      return res.status(400).json({
        message: 'Captcha salah. Silakan muat ulang halaman dan coba lagi.',
        captchaError: true,
      });
    }

    // Validasi wajib
    if (!nisn || !nama_lengkap || !no_telp) {
      return res.status(400).json({
        message: 'NISN, Nama Lengkap, dan No. Telepon harus diisi',
      });
    }

    // Cek duplikat NISN
    const [existing] = await db.execute(
      'SELECT id, no_pendaftaran, status FROM ppdb_pendaftar WHERE nisn = ?',
      [nisn]
    );
    if (existing[0]) {
      return res.status(400).json({
        message: `NISN sudah terdaftar dengan No. Pendaftaran ${existing[0].no_pendaftaran} (Status: ${existing[0].status})`,
      });
    }

    // Generate nomor pendaftaran
    const no_pendaftaran = await generateNoPendaftaran(db);

    // Normalisasi jenis kelamin
    let jk = null;
    if (jenis_kelamin) {
      const upper = jenis_kelamin.toUpperCase();
      if (upper === 'LAKI-LAKI' || upper === 'LAKI' || upper === 'L') {
        jk = 'L';
      } else if (upper === 'PEREMPUAN' || upper === 'WANITA' || upper === 'P') {
        jk = 'P';
      } else {
        jk = jenis_kelamin;
      }
    }

    // Sanitize date
    let tglLahir = tanggal_lahir || null;
    if (tglLahir && typeof tglLahir === 'string') {
      if (tglLahir.includes('T')) tglLahir = tglLahir.split('T')[0];
    }

    // Generate kode rahasia 6 digit (dengan validasi duplikat & retry loop)
    let kode_rahasia;
    let kodeUnik = false;
    for (let percobaan = 1; percobaan <= 10; percobaan++) {
      kode_rahasia = String(Math.floor(100000 + Math.random() * 900000));
      const [cekKode] = await db.execute(
        'SELECT id FROM ppdb_pendaftar WHERE kode_rahasia = ?',
        [kode_rahasia]
      );
      if (!cekKode[0]) {
        kodeUnik = true;
        break;
      }
    }
    if (!kodeUnik) {
      return res.status(500).json({
        message: 'Gagal menghasilkan kode rahasia unik. Silakan coba lagi.',
      });
    }

    // Enrich GPS coordinates if provided
    let gpsEnriched = null;
    if (gps_latitude && gps_longitude) {
      gpsEnriched = await enrichGps({ latitude: gps_latitude, longitude: gps_longitude });
    }

    await db.execute(
      `INSERT INTO ppdb_pendaftar 
        (no_pendaftaran, kode_rahasia, nisn, nama_lengkap, tempat_lahir, tanggal_lahir,
         jenis_kelamin, alamat, asal_sekolah, no_telp, email,
         nama_ayah, nama_ibu, gps_masuk, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'menunggu')`,
      [
        no_pendaftaran, kode_rahasia, nisn, nama_lengkap, tempat_lahir || null,
        tglLahir, jk, alamat || null, asal_sekolah || null,
        no_telp, email || null, nama_ayah || null, nama_ibu || null,
        gpsEnriched,
      ]
    );

    // Handle foto jika ada
    let fotoFilename = null;
    if (req.file) {
      try {
        // Dapatkan ID yang baru diinsert
        const [insertResult] = await db.execute('SELECT LAST_INSERT_ID() as id');
        const pendaftarId = insertResult[0].id;

        const ext = path.extname(req.file.originalname).toLowerCase();
        const newFilename = `ppdb_${pendaftarId}_${Date.now()}${ext}`;
        const newPath = path.join(ppdbFotoUploadDir, newFilename);

        fs.renameSync(req.file.path, newPath);
        fotoFilename = newFilename;

        await db.execute('UPDATE ppdb_pendaftar SET foto = ? WHERE id = ?', [fotoFilename, pendaftarId]);
      } catch (fotoErr) {
        console.error('Gagal menyimpan foto pendaftar:', fotoErr.message);
        // Hapus file temporary jika gagal
        if (req.file && fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
      }
    }

    await logActivity(req, 'Tambah', 'PPDB', null, `Pendaftaran PPDB baru: ${no_pendaftaran} - ${nama_lengkap}`);
    res.status(201).json({
      message: 'Pendaftaran berhasil! Silakan catat nomor pendaftaran Anda.',
      no_pendaftaran,
      kode_rahasia,
      foto: fotoFilename,
      gps_location: gpsEnriched,
    });
  } catch (error) {
    handleError(error, req, res, 'Gagal mendaftarkan PPDB');
  }
});

// GET /api/ppdb/cek/:no_pendaftaran — Cek hasil pendaftaran (public)
router.get('/cek/:no_pendaftaran', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute(
      `SELECT id, no_pendaftaran, nisn, nama_lengkap, tempat_lahir,
              tanggal_lahir, jenis_kelamin, asal_sekolah,
              status, keterangan, created_at, foto, kode_rahasia
       FROM ppdb_pendaftar WHERE no_pendaftaran = ?`,
      [req.params.no_pendaftaran]
    );

    if (!rows[0]) {
      return res.status(404).json({
        message: 'Nomor pendaftaran tidak ditemukan',
      });
    }

    const data = rows[0];

    // Validasi kode rahasia
    const kodeInput = req.query.kode_rahasia;
    if (!kodeInput || kodeInput !== data.kode_rahasia) {
      return res.status(404).json({
        message: 'Nomor pendaftaran atau kode rahasia tidak valid',
      });
    }
    const statusLabel = {
      menunggu: 'Menunggu Verifikasi',
      diterima: 'Diterima',
      ditolak: 'Ditolak',
    };

    res.json({
      no_pendaftaran: data.no_pendaftaran,
      nisn: data.nisn,
      nama_lengkap: data.nama_lengkap,
      tempat_lahir: data.tempat_lahir,
      tanggal_lahir: data.tanggal_lahir,
      jenis_kelamin: data.jenis_kelamin === 'L' ? 'Laki-laki' : data.jenis_kelamin === 'P' ? 'Perempuan' : '-',
      asal_sekolah: data.asal_sekolah,
      status: data.status,
      status_label: statusLabel[data.status] || data.status,
      keterangan: data.keterangan,
      tanggal_daftar: data.created_at,
      foto: data.foto,
    });
  } catch (error) {
    handleError(error, req, res, 'Gagal memeriksa pendaftaran');
  }
});

// POST /api/ppdb/kirim-kartu-email — Kirim kartu pendaftaran via email (public)
router.post('/kirim-kartu-email', async (req, res) => {
  try {
    const { no_pendaftaran, email_tujuan } = req.body;

    if (!no_pendaftaran || !email_tujuan) {
      return res.status(400).json({ message: 'Nomor pendaftaran dan email tujuan harus diisi' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email_tujuan)) {
      return res.status(400).json({ message: 'Format email tidak valid' });
    }

    const db = await getDatabase();

    // Cari pendaftar
    const [rows] = await db.execute('SELECT * FROM ppdb_pendaftar WHERE no_pendaftaran = ?', [no_pendaftaran]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Data pendaftar tidak ditemukan' });
    }

    const pendaftar = rows[0];
    const pengaturan = await getSettings(db);

    // Pastikan SMTP sudah dikonfigurasi
    if (!pengaturan.smtp_host || !pengaturan.smtp_user || !pengaturan.smtp_pass) {
      return res.status(400).json({
        message: 'Konfigurasi SMTP belum lengkap. Silakan atur di menu Pengaturan > Konfigurasi Email terlebih dahulu.',
      });
    }

    // Generate kartu PDF
    const kartuSettings = await getPpdbKartuSettings(db);
    const pdfBuffer = await generatePpdbKartuPendaftaran(pendaftar, pengaturan, kartuSettings);

    // Siapkan konten email
    const sekolah = pengaturan.nama_sekolah || 'SMA Annajah';
    const kontakSekolah = [
      pengaturan.no_telp ? `Telepon: ${pengaturan.no_telp}` : '',
      pengaturan.email ? `Email: ${pengaturan.email}` : '',
      [pengaturan.alamat_sekolah, pengaturan.kota, pengaturan.provinsi].filter(Boolean).join(', '),
    ].filter(Boolean).join('<br/>');

    const tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const tahunAjaran = pengaturan.tahun_ajaran_aktif || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

    const htmlContent = `
<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
  <div style="height: 6px; background: linear-gradient(90deg, #059669, #10b981, #34d399, #10b981, #059669);"></div>
  <div style="background: linear-gradient(135deg, #059669 0%, #047857 40%, #065f46 100%); padding: 35px 30px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${sekolah}</h1>
    <p style="color: #a7f3d0; margin: 8px 0 0; font-size: 13px;">Penerimaan Peserta Didik Baru Tahun Ajaran ${tahunAjaran}</p>
  </div>
  <div style="background: #ffffff; padding: 30px 35px;">
    <p style="font-size: 16px; color: #065f46; font-weight: 600; margin: 0 0 5px;">Yth. ${pendaftar.nama_lengkap}</p>
    <p style="font-size: 14px; color: #374151; line-height: 1.6;">
      Terima kasih telah mendaftarkan diri di <strong>${sekolah}</strong>.
      Berikut kami lampirkan <strong>Kartu Pendaftaran PPDB</strong> Anda dalam format PDF.
    </p>
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #6b7280; width: 40%;">No. Pendaftaran</td>
          <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${pendaftar.no_pendaftaran}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">NISN</td>
          <td style="padding: 6px 0; color: #0f172a;">${pendaftar.nisn}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Nama Lengkap</td>
          <td style="padding: 6px 0; color: #0f172a;">${pendaftar.nama_lengkap}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Status</td>
          <td style="padding: 6px 0; color: #d97706; font-weight: 600;">MENUNGGU VERIFIKASI</td>
        </tr>
      </table>
    </div>
    <p style="font-size: 13px; color: #6b7280; line-height: 1.6;">
      Anda dapat menggunakan nomor pendaftaran dan kode rahasia untuk mengecek hasil seleksi.
      Simpan kartu pendaftaran ini sebagai bukti pendaftaran.
    </p>
  </div>
  <div style="border-top: 1px solid #e2e8f0; padding: 20px 35px; text-align: center;">
    <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.6;">
      Email ini dikirim otomatis oleh <strong>Sistem PPDB ${sekolah}</strong><br/>
      ${tanggal}
    </p>
    <div style="margin-top: 8px; font-size: 11px; color: #cbd5e1;">
      ${kontakSekolah}
    </div>
  </div>
  <div style="height: 6px; background: linear-gradient(90deg, #059669, #10b981, #34d399, #10b981, #059669);"></div>
</div>`;

    const transporter = nodemailer.createTransport({
      host: pengaturan.smtp_host,
      port: parseInt(pengaturan.smtp_port || '587'),
      secure: parseInt(pengaturan.smtp_port || '587') === 465,
      auth: {
        user: pengaturan.smtp_user,
        pass: pengaturan.smtp_pass,
      },
    });

    await transporter.sendMail({
      from: `"${pengaturan.smtp_nama_pengirim || sekolah}" <${pengaturan.smtp_email_pengirim || pengaturan.smtp_user}>`,
      to: email_tujuan,
      subject: `Kartu Pendaftaran PPDB - ${pendaftar.no_pendaftaran}`,
      html: htmlContent,
      attachments: [{
        filename: `kartu_ppdb_${pendaftar.no_pendaftaran}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    });

    res.json({ message: `Kartu pendaftaran berhasil dikirim ke ${email_tujuan}` });
  } catch (error) {
    handleError(error, req, res, 'Gagal mengirim email kartu pendaftaran');
  }
});

// =================================================================
// ADMIN ROUTES (perlu autentikasi)
// =================================================================
router.use(authenticateToken);

// ─── Konfigurasi Multer untuk Import ───
const uploadDir = path.join(__dirname, '..', 'uploads', 'temp');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const importStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `import_ppdb_${Date.now()}${ext}`);
  },
});

const uploadImport = multer({
  storage: importStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      return cb(new Error('Format file tidak didukung. Gunakan .xlsx atau .csv.'));
    }
    cb(null, true);
  },
});

// ─── Konfigurasi Multer untuk Foto Pendaftar ───
if (!fs.existsSync(ppdbFotoDir)) {
  fs.mkdirSync(ppdbFotoDir, { recursive: true });
}

const fotoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ppdbFotoDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `ppdb_${req.params.id}_${Date.now()}${ext}`);
  },
});

const uploadFoto = multer({
  storage: fotoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return cb(new Error('Format file tidak didukung. Gunakan .jpg, .png, atau .webp.'));
    }
    cb(null, true);
  },
});

// GET /api/ppdb — Daftar semua pendaftar (admin)
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const { status, search, page, per_page } = req.query;

    let where = ' WHERE 1=1';
    const params = [];

    if (status) {
      where += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      where += ' AND (nama_lengkap LIKE ? OR no_pendaftaran LIKE ? OR nisn LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (req.query.tanggal_mulai) {
      where += ' AND DATE(created_at) >= ?';
      params.push(req.query.tanggal_mulai);
    }
    if (req.query.tanggal_selesai) {
      where += ' AND DATE(created_at) <= ?';
      params.push(req.query.tanggal_selesai);
    }

    // Hitung total
    const [countRows] = await db.execute(
      `SELECT COUNT(*) as total FROM ppdb_pendaftar${where}`,
      params
    );
    const total = countRows[0].total;

    // Pagination
    const limit = parseInt(per_page) || 25;
    const p = parseInt(page) || 1;
    const offset = (p - 1) * limit;

    const [rows] = await db.execute(
      `SELECT id, no_pendaftaran, kode_rahasia, nisn, nama_lengkap, tempat_lahir, tanggal_lahir,
              jenis_kelamin, alamat, asal_sekolah, no_telp, email,
              nama_ayah, nama_ibu, status, keterangan, nilai, dikonversi,
              foto, gps_masuk, created_at
       FROM ppdb_pendaftar${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({
      data: rows,
      total,
      page: p,
      per_page: limit,
      total_pages: Math.ceil(total / limit),
    });
  } catch (error) {
    handleError(error, req, res, 'Gagal memuat data PPDB');
  }
});

// GET /api/ppdb/export — Export ke Excel (admin)
router.get('/export', async (req, res) => {
  try {
    const db = await getDatabase();
    const { status } = req.query;

    let where = ' WHERE 1=1';
    const params = [];
    if (status) {
      where += ' AND status = ?';
      params.push(status);
    }
    if (req.query.tanggal_mulai) {
      where += ' AND DATE(created_at) >= ?';
      params.push(req.query.tanggal_mulai);
    }
    if (req.query.tanggal_selesai) {
      where += ' AND DATE(created_at) <= ?';
      params.push(req.query.tanggal_selesai);
    }

    const [rows] = await db.execute(
      `SELECT * FROM ppdb_pendaftar${where} ORDER BY created_at DESC`,
      params
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Data PPDB');

    sheet.columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'No. Pendaftaran', key: 'no_pendaftaran', width: 20 },
      { header: 'NISN', key: 'nisn', width: 16 },
      { header: 'Nama Lengkap', key: 'nama_lengkap', width: 30 },
      { header: 'Tempat Lahir', key: 'tempat_lahir', width: 18 },
      { header: 'Tanggal Lahir', key: 'tanggal_lahir', width: 16 },
      { header: 'Jenis Kelamin', key: 'jenis_kelamin', width: 16 },
      { header: 'Alamat', key: 'alamat', width: 35 },
      { header: 'Asal Sekolah', key: 'asal_sekolah', width: 25 },
      { header: 'No. Telepon', key: 'no_telp', width: 16 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Nama Ayah', key: 'nama_ayah', width: 25 },
      { header: 'Nama Ibu', key: 'nama_ibu', width: 25 },
      { header: 'Nilai', key: 'nilai', width: 10 },
      { header: 'Lokasi GPS', key: 'gps_masuk', width: 35 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Keterangan', key: 'keterangan', width: 30 },
      { header: 'Tanggal Daftar', key: 'created_at', width: 20 },
    ];

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
      const statusLabel = r.status === 'menunggu' ? 'Menunggu' :
        r.status === 'diterima' ? 'Diterima' : 'Ditolak';

      const row = sheet.addRow({
        no: i + 1,
        no_pendaftaran: r.no_pendaftaran,
        nisn: r.nisn,
        nama_lengkap: r.nama_lengkap,
        tempat_lahir: r.tempat_lahir || '-',
        tanggal_lahir: r.tanggal_lahir ? new Date(r.tanggal_lahir).toLocaleDateString('id-ID') : '-',
        jenis_kelamin: r.jenis_kelamin === 'L' ? 'Laki-laki' : r.jenis_kelamin === 'P' ? 'Perempuan' : '-',
        gps_masuk: r.gps_masuk ? (() => { try { const g = JSON.parse(r.gps_masuk); return formatAddress(g); } catch { return r.gps_masuk; } })() : '-',
        alamat: r.alamat || '-',
        asal_sekolah: r.asal_sekolah || '-',
        no_telp: r.no_telp || '-',
        email: r.email || '-',
        nama_ayah: r.nama_ayah || '-',
        nama_ibu: r.nama_ibu || '-',
        nilai: r.nilai !== null && r.nilai !== undefined ? r.nilai : '-',
        status: statusLabel,
        keterangan: r.keterangan || '-',
        created_at: r.created_at ? new Date(r.created_at).toLocaleString('id-ID') : '-',
      });
      row.height = 22;
      row.eachCell((cell, colIdx) => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' },
        };
        cell.alignment = { vertical: 'middle', horizontal: colIdx === 0 ? 'center' : 'left' };
        if (i % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        }
      });
    });

    // Footer
    const footerRow = sheet.addRow({
      no: '', no_pendaftaran: '', nisn: '', nama_lengkap: '', tempat_lahir: '',
      tanggal_lahir: '', jenis_kelamin: '', alamat: '', asal_sekolah: '',        no_telp: '', email: '', nama_ayah: '', nama_ibu: '',
        status: `Total: ${rows.length} pendaftar`, keterangan: '', created_at: '',
    });
    footerRow.eachCell((cell) => {
      cell.font = { bold: true, italic: true, size: 10, color: { argb: 'FF6B7280' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=data_ppdb.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    handleError(error, req, res, 'Gagal mengexport data PPDB');
  }
});

// GET /api/ppdb/export/pdf-bulk — Export PDF hasil pendaftaran massal per status (admin)
router.get('/export/pdf-bulk', async (req, res) => {
  try {
    const db = await getDatabase();
    const { status } = req.query;

    if (!status || !['diterima', 'ditolak'].includes(status)) {
      return res.status(400).json({ message: 'Parameter status harus diisi (diterima / ditolak).' });
    }

    let where = ' WHERE status = ?';
    const params = [status];

    if (req.query.tanggal_mulai) {
      where += ' AND DATE(created_at) >= ?';
      params.push(req.query.tanggal_mulai);
    }
    if (req.query.tanggal_selesai) {
      where += ' AND DATE(created_at) <= ?';
      params.push(req.query.tanggal_selesai);
    }

    const [rows] = await db.execute(
      `SELECT * FROM ppdb_pendaftar${where} ORDER BY nama_lengkap ASC`,
      params
    );

    if (rows.length === 0) {
      const statusLabel = status === 'diterima' ? 'diterima' : 'ditolak';
      return res.status(404).json({ message: `Tidak ada pendaftar berstatus ${statusLabel}.` });
    }

    const pengaturan = await getSettings(db);

    // Generate PDF untuk setiap pendaftar
    const pdfBuffers = [];
    for (const pendaftar of rows) {
      try {
        const buf = await generatePpdbResultPdf(pendaftar, pengaturan);
        pdfBuffers.push(buf);
      } catch (pdfErr) {
        console.error(`Gagal generate PDF untuk ${pendaftar.no_pendaftaran}:`, pdfErr.message);
        // Skip pendaftar yang gagal
      }
    }

    if (pdfBuffers.length === 0) {
      return res.status(500).json({ message: 'Gagal menghasilkan PDF untuk semua pendaftar.' });
    }

    // Gabungkan semua PDF menggunakan pdf-lib
    const mergedPdf = await PDFLibDocument.create();

    for (const buf of pdfBuffers) {
      try {
        const donorPdf = await PDFLibDocument.load(buf);
        const pageIndices = donorPdf.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(donorPdf, pageIndices);
        copiedPages.forEach(page => mergedPdf.addPage(page));
      } catch (mergeErr) {
        console.error('Gagal merge halaman PDF:', mergeErr.message);
      }
    }

    const mergedPdfBytes = await mergedPdf.save();

    const statusLabel = status === 'diterima' ? 'Diterima' : 'Ditolak';
    const filename = `ppdb_${status}_${rows.length}_pendaftar.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(Buffer.from(mergedPdfBytes));
  } catch (error) {
    handleError(error, req, res, 'Gagal mengexport PDF massal PPDB');
  }
});

// GET /api/ppdb/export/pdf — Export ke PDF format kwitansi (admin)
router.get('/export/pdf', async (req, res) => {
  try {
    const db = await getDatabase();
    const { status } = req.query;

    let where = ' WHERE 1=1';
    const params = [];
    if (status) {
      where += ' AND status = ?';
      params.push(status);
    }
    if (req.query.tanggal_mulai) {
      where += ' AND DATE(created_at) >= ?';
      params.push(req.query.tanggal_mulai);
    }
    if (req.query.tanggal_selesai) {
      where += ' AND DATE(created_at) <= ?';
      params.push(req.query.tanggal_selesai);
    }

    const [rows] = await db.execute(
      `SELECT * FROM ppdb_pendaftar${where} ORDER BY created_at DESC`,
      params
    );

    const pengaturan = await getSettings(await getDatabase());
    const sekolah = pengaturan.nama_sekolah || 'SMA Annajah';
    const alamatLengkap = [pengaturan.alamat_sekolah, pengaturan.kota, pengaturan.provinsi].filter(Boolean).join(', ');

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=data_ppdb.pdf');
    doc.pipe(res);

    const marginLeft = 40;
    const marginRight = 40;
    const pageWidth = doc.page.width - marginLeft - marginRight;

    // ── Render halaman per halaman ──
    function renderHeader() {
      // Kop Surat dengan Logo
      const logoPath = pengaturan.logo;
      let hasLogo = false;
      let logoWidth = 0;
      let logoHeight = 0;

      if (logoPath) {
        const fullPath = path.join(__dirname, '..', logoPath.replace(/^\//, ''));
        if (fs.existsSync(fullPath)) {
          try {
            const img = doc.openImage(fullPath);
            const maxW = 40, maxH = 40;
            const scale = Math.min(maxW / img.width, maxH / img.height);
            logoWidth = img.width * scale;
            logoHeight = img.height * scale;
            doc.image(fullPath, marginLeft, doc.y, { width: logoWidth, height: logoHeight });
            hasLogo = true;
          } catch (e) {
            // Abaikan
          }
        }
      }

      const textX = hasLogo ? marginLeft + logoWidth + 10 : marginLeft;
      const textWidth = hasLogo ? pageWidth - logoWidth - 10 : pageWidth;
      const textAlign = hasLogo ? 'left' : 'center';
      const startY = doc.y;

      // Nama Sekolah
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#15803D');
      doc.text(sekolah, textX, startY, { width: textWidth, align: textAlign });

      // NPSN & Alamat
      const infoParts = [];
      if (pengaturan.npsn) infoParts.push(`NPSN: ${pengaturan.npsn}`);
      if (alamatLengkap) infoParts.push(alamatLengkap);
      if (infoParts.length > 0) {
        doc.fontSize(7.5).fillColor('#6B7280').font('Helvetica');
        doc.text(infoParts.join('  |  '), textX, doc.y, { width: textWidth, align: textAlign });
      }

      // Kontak
      const kontakParts = [];
      if (pengaturan.no_telp) kontakParts.push(`Telp: ${pengaturan.no_telp}`);
      if (pengaturan.email) kontakParts.push(`Email: ${pengaturan.email}`);
      if (pengaturan.website) kontakParts.push(pengaturan.website);
      if (kontakParts.length > 0) {
        doc.fontSize(7).fillColor('#9CA3AF').font('Helvetica');
        doc.text(kontakParts.join('  |  '), textX, doc.y, { width: textWidth, align: textAlign });
      }

      // Sesuaikan Y agar tidak tumpang tindih dengan logo
      const textEndY = doc.y;
      const logoEndY = startY + logoHeight + 4;
      doc.y = Math.max(textEndY, logoEndY);

      doc.moveDown(0.3);

      // Garis pemisah
      const lineY = doc.y;
      doc.moveTo(marginLeft, lineY).lineTo(doc.page.width - marginRight, lineY).stroke('#15803D');
      doc.y = lineY + 3;

      doc.moveDown(0.3);

      // Judul
      doc.fontSize(11).fillColor('#374151').font('Helvetica-Bold');
      doc.text('DATA PENDAFTAR PPDB', { align: 'center' });

      doc.moveDown(0.2);
      doc.fontSize(8).fillColor('#6B7280').font('Helvetica');
      doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'right' });

      doc.moveDown(0.3);
      doc.moveTo(marginLeft, doc.y).lineTo(doc.page.width - marginRight, doc.y).stroke('#15803D');
      doc.moveDown(0.5);
    }

    function drawPpdbTable(data, startIdx) {
      const headers = ['No', 'No. Pendaftaran', 'NISN', 'Nama Lengkap', 'Asal Sekolah', 'Status'];
      const colWidths = [20, 75, 50, 90, 80, 65];
      const rowHeight = 16;
      const headerHeight = 18;
      const tableWidth = colWidths.reduce((a, b) => a + b, 0);
      const startX = marginLeft + (pageWidth - tableWidth) / 2;

      let currentY = doc.y;
      let rowNum = 0;

      function drawHeader() {
        if (currentY + headerHeight > doc.page.height - 50) {
          doc.addPage();
          renderHeader();
          currentY = doc.y;
        }
        doc.rect(startX, currentY, tableWidth, headerHeight).fill('#15803D');
        let xPos = startX;
        headers.forEach((header, i) => {
          doc.fillColor('#FFFFFF').fontSize(7).font('Helvetica-Bold');
          doc.text(header, xPos + 2, currentY + 4, { width: colWidths[i] - 4, align: i === 0 ? 'center' : 'left' });
          xPos += colWidths[i];
        });
        currentY += headerHeight;
      }

      drawHeader();

      for (let i = 0; i < data.length; i++) {
        if (currentY + rowHeight > doc.page.height - 40) {
          // Footer summary
          drawFooter(data.length, startIdx);
          doc.addPage();
          renderHeader();
          currentY = doc.y;
          drawHeader();
        }

        const d = data[i];
        const statusLabel = d.status === 'menunggu' ? 'Menunggu' : d.status === 'diterima' ? 'Diterima' : 'Ditolak';

        if (rowNum % 2 === 1) {
          doc.rect(startX, currentY, tableWidth, rowHeight).fill('#F0FDF4');
        }
        doc.rect(startX, currentY, tableWidth, rowHeight).fillOpacity(0).stroke('#E5E7EB');
        doc.fillOpacity(1);

        const rowData = [
          String(startIdx + i + 1),
          d.no_pendaftaran,
          d.nisn,
          d.nama_lengkap,
          d.asal_sekolah || '-',
          statusLabel,
        ];

        let xPos = startX;
        rowData.forEach((cell, ci) => {
          doc.fillColor(d.status === 'diterima' ? '#059669' : d.status === 'ditolak' ? '#DC2626' : '#374151')
            .fontSize(7).font('Helvetica');
          const align = ci === 0 ? 'center' : ci === 5 ? 'center' : 'left';
          doc.text(cell, xPos + 2, currentY + 4, { width: colWidths[ci] - 4, align });
          xPos += colWidths[ci];
        });
        currentY += rowHeight;
        rowNum++;
      }

      doc.y = currentY;
      drawFooter(data.length, startIdx);
    }

    function drawFooter(totalCount, startIdx) {
      doc.moveDown(0.5);

      // Summary bar
      const tableWidth = colWidths.reduce((a, b) => a + b, 0);
      const startX = marginLeft + (pageWidth - tableWidth) / 2;
      const footY = doc.y;
      
      // Count by status
      const countMenunggu = rows.filter(r => r.status === 'menunggu').length;
      const countDiterima = rows.filter(r => r.status === 'diterima').length;
      const countDitolak = rows.filter(r => r.status === 'ditolak').length;

      doc.rect(startX, footY, tableWidth, 20).fill('#15803D');
      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
      doc.text(`Total: ${totalCount} pendaftar`, startX + 4, footY + 5);
      doc.text(`Menunggu: ${countMenunggu}  |  Diterima: ${countDiterima}  |  Ditolak: ${countDitolak}`, startX + 4 + tableWidth * 0.35, footY + 5, { width: tableWidth * 0.63, align: 'right' });
      doc.y = footY + 24;
    }

    // ── Page header ──
    // Calculate col widths for footer
    const colWidths = [20, 75, 50, 90, 80, 40, 65];
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);

    if (rows.length === 0) {
      renderHeader();
      doc.moveDown(2);
      doc.fontSize(10).fillColor('#9CA3AF').font('Helvetica').text('Belum ada data pendaftar.', { align: 'center' });
    } else {
      renderHeader();
      drawPpdbTable(rows, 0);
    }

    // Signature
    doc.moveDown(1);
    const ttdY = doc.y;
    const ttdLeftX = marginLeft + 20;
    const ttdRightX = doc.page.width - marginRight - 120;

    doc.fontSize(8).fillColor('#374151').font('Helvetica');
    doc.text('Mengetahui,', ttdLeftX + 30, ttdY);
    doc.text('Hormat Kami,', ttdRightX + 30, ttdY);
    doc.moveDown(4);
    doc.text(`( ${pengaturan.kepala_sekolah || '________'} )`, ttdLeftX, doc.y, { align: 'center', width: 120 });
    doc.text(`( ${pengaturan.bendahara || '________'} )`, ttdRightX, doc.y, { align: 'center', width: 120 });
    doc.moveDown(0.3);
    doc.fontSize(7).fillColor('#6B7280').font('Helvetica');
    doc.text('Kepala Sekolah', ttdLeftX, doc.y, { align: 'center', width: 120 });
    doc.text('Bendahara', ttdRightX, doc.y, { align: 'center', width: 120 });

    // Footer
    doc.moveDown(1);
    doc.fontSize(6).fillColor('#9CA3AF').font('Helvetica');
    doc.text('Dokumen ini dicetak dari Sistem PPDB - Data ini adalah data resmi pendaftaran peserta didik baru.', { align: 'center' });

    doc.end();
  } catch (error) {
    handleError(error, req, res, 'Gagal mengexport PDF PPDB');
  }
});

// GET /api/ppdb/import/template — Download template Excel untuk import
router.get('/import/template', async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Template PPDB');

    const columns = [
      { header: 'NISN', key: 'nisn', width: 16 },
      { header: 'Nama Lengkap', key: 'nama_lengkap', width: 30 },
      { header: 'Tempat Lahir', key: 'tempat_lahir', width: 18 },
      { header: 'Tanggal Lahir', key: 'tanggal_lahir', width: 16 },
      { header: 'Jenis Kelamin', key: 'jenis_kelamin', width: 16 },
      { header: 'Alamat', key: 'alamat', width: 35 },
      { header: 'Asal Sekolah', key: 'asal_sekolah', width: 25 },
      { header: 'No. Telepon', key: 'no_telp', width: 16 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Nama Ayah', key: 'nama_ayah', width: 25 },
      { header: 'Nama Ibu', key: 'nama_ibu', width: 25 },
      { header: 'Nilai', key: 'nilai', width: 10 },
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

    // Contoh data
    const exampleRow = sheet.addRow({
      nisn: '0012345678',
      nama_lengkap: 'Contoh Pendaftar',
      tempat_lahir: 'Jakarta',
      tanggal_lahir: '2009-01-15',
      jenis_kelamin: 'L',
      alamat: 'Jl. Contoh No. 1',
      asal_sekolah: 'SMP Contoh',
      no_telp: '081234567890',
      email: 'contoh@email.com',
      nama_ayah: 'Ayah Contoh',
      nama_ibu: 'Ibu Contoh',
      nilai: 80,
    });
    exampleRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
      cell.alignment = { vertical: 'middle' };
    });

    // Sheet kedua: petunjuk
    const sheetInfo = workbook.addWorksheet('Petunjuk');
    sheetInfo.columns = [{ header: 'Informasi', key: 'info', width: 80 }];
    const infoHeader = sheetInfo.getRow(1);
    infoHeader.height = 25;
    infoHeader.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const petunjuk = [
      'PETUNJUK PENGISIAN TEMPLATE IMPORT PPDB',
      '',
      '1. Kolom bertanda * wajib diisi: NISN, Nama Lengkap, No. Telepon',
      '2. Kolom Jenis Kelamin: isi L (Laki-laki) atau P (Perempuan)',
      '3. Kolom Tanggal Lahir: format YYYY-MM-DD (contoh: 2009-01-15)',
            '4. Baris pertama (header) jangan dihapus atau diubah',
      '5. Isi data mulai dari baris ke-3 (baris ke-2 adalah contoh)',
      '',
      'Kolom wajib: NISN, Nama Lengkap, No. Telepon',
      'Kolom lainnya boleh dikosongkan.',
    ];

    petunjuk.forEach((p) => {
      const r = sheetInfo.addRow({ info: p });
      r.eachCell((cell) => {
        cell.font = { size: 11, color: { argb: p.startsWith('PETUNJUK') || p.startsWith('Kolom wajib') ? 'FFDC2626' : 'FF374151' }, bold: p.startsWith('PETUNJUK') || p.startsWith('Kolom wajib') };
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=template_import_ppdb.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    handleError(error, req, res, 'Gagal mengunduh template');
  }
});

// POST /api/ppdb/import — Import data pendaftar dari Excel
router.post('/import', (req, res, next) => {
  uploadImport.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Ukuran file maksimal 5MB' });
      }
      return res.status(400).json({ message: err.message || 'File tidak valid' });
    }
    next();
  });
}, async (req, res) => {
  let importedFile = null;
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diupload' });
    }
    importedFile = req.file;

    const db = await getDatabase();

    // Baca workbook
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return res.status(400).json({ message: 'File Excel kosong atau tidak valid' });
    }

    // Baca baris pertama sebagai header
    const headerRow = sheet.getRow(1);
    const headers = [];
    headerRow.eachCell({ includeEmpty: false }, (cell) => {
      headers.push(String(cell.value || '').toLowerCase().replace(/\s+/g, ''));
    });

    // Validasi header minimal
    const requiredHeaders = ['nisn', 'nama'];
    const missingHeaders = requiredHeaders.filter(h => !headers.some(hh => hh.includes(h)));
    if (missingHeaders.length > 0) {
      return res.status(400).json({
        message: `Kolom wajib tidak ditemukan: ${missingHeaders.join(', ')}. Pastikan file memiliki kolom NISN dan Nama Lengkap.`
      });
    }

    // Mapping index kolom
    const colMap = {
      nisn: headers.findIndex(h => h.includes('nisn')),
      nama_lengkap: headers.findIndex(h => h.includes('nama')),
      tempat_lahir: headers.findIndex(h => h.includes('tempat') && h.includes('lahir')),
      tanggal_lahir: headers.findIndex(h => h.includes('tanggal') || (h.includes('tgl') && h.includes('lahir'))),
      jenis_kelamin: headers.findIndex(h => h.includes('jenis') || h.includes('kelamin') || h === 'jk'),
      alamat: headers.findIndex(h => h.includes('alamat') && !h.includes('sekolah')),
      asal_sekolah: headers.findIndex(h => (h.includes('asal') && h.includes('sekolah')) || h === 'asalsekolah'),
      no_telp: headers.findIndex(h => h.includes('telp') || h.includes('telepon') || h.includes('notelp') || h.includes('hp')),
      email: headers.findIndex(h => h.includes('email')),
      nama_ayah: headers.findIndex(h => (h.includes('nama') && h.includes('ayah')) || h === 'ayah'),
      nama_ibu: headers.findIndex(h => (h.includes('nama') && h.includes('ibu')) || h === 'ibu'),
    };

    const parsedSuccess = [];
    const parseErrors = [];
    let rowNumber = 1;

    // Proses setiap baris (mulai dari baris 2)
    sheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return; // skip header
      rowNumber = rowIndex;

      const getVal = (idx) => {
        if (idx === -1) return '';
        const cell = row.getCell(idx + 1);
        if (cell.value === null || cell.value === undefined) return '';
        if (cell.value instanceof Date) {
          return cell.value.toISOString().split('T')[0]; // Format: YYYY-MM-DD
        }
        return String(cell.value).trim();
      };

      const nisn = getVal(colMap.nisn);
      const nama_lengkap = getVal(colMap.nama_lengkap);
      const tempat_lahir = getVal(colMap.tempat_lahir);
      const tanggal_lahir = getVal(colMap.tanggal_lahir);
      let jenis_kelamin = getVal(colMap.jenis_kelamin);
      const alamat = getVal(colMap.alamat);
      const asal_sekolah = getVal(colMap.asal_sekolah);
      const no_telp = getVal(colMap.no_telp);
      const email = getVal(colMap.email);
      const nama_ayah = getVal(colMap.nama_ayah);
      const nama_ibu = getVal(colMap.nama_ibu);
      const nilai = getVal(colMap.nilai);

      // Validasi
      const rowErrors = [];
      if (!nisn) rowErrors.push('NISN tidak boleh kosong');
      if (!nama_lengkap) rowErrors.push('Nama Lengkap tidak boleh kosong');
      if (!no_telp) rowErrors.push('No. Telepon tidak boleh kosong');

      // Normalisasi jenis kelamin
      if (jenis_kelamin) {
        const jk = jenis_kelamin.toUpperCase();
        if (jk === 'LAKI-LAKI' || jk === 'LAKI' || jk === 'L') {
          jenis_kelamin = 'L';
        } else if (jk === 'PEREMPUAN' || jk === 'WANITA' || jk === 'P') {
          jenis_kelamin = 'P';
        } else {
          rowErrors.push('Jenis kelamin tidak valid (gunakan L/P atau Laki-laki/Perempuan)');
        }
      }

      if (rowErrors.length > 0) {
        parseErrors.push({ row: rowIndex, nisn, nama: nama_lengkap, errors: rowErrors });
        return;
      }

      parsedSuccess.push({ nisn, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, asal_sekolah, no_telp, email, nama_ayah, nama_ibu });
    });

    // Insert data valid ke database
    const insertSuccess = [];
    const insertErrors = [];

    for (const data of parsedSuccess) {
      try {
        // Cek duplikat NISN
        const [existing] = await db.execute('SELECT id, no_pendaftaran FROM ppdb_pendaftar WHERE nisn = ?', [data.nisn]);
        if (existing[0]) {
          insertErrors.push({ row: '-', nisn: data.nisn, nama: data.nama_lengkap, errors: [`NISN sudah terdaftar (${existing[0].no_pendaftaran})`] });
          continue;
        }

        // Generate nomor pendaftaran
        const no_pendaftaran = await generateNoPendaftaran(db);

        await db.execute(
          `INSERT INTO ppdb_pendaftar 
            (no_pendaftaran, nisn, nama_lengkap, tempat_lahir, tanggal_lahir,
             jenis_kelamin, alamat, asal_sekolah, no_telp, email,
             nama_ayah, nama_ibu, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'menunggu')`,
          [
            no_pendaftaran, data.nisn, data.nama_lengkap, data.tempat_lahir || null,
            data.tanggal_lahir || null, data.jenis_kelamin || null, data.alamat || null,
            data.asal_sekolah || null, data.no_telp, data.email || null,
            data.nama_ayah || null, data.nama_ibu || null,
          ]
        );

        insertSuccess.push(no_pendaftaran);
      } catch (err) {
        insertErrors.push({ row: '-', nisn: data.nisn, nama: data.nama_lengkap, errors: [err.message] });
      }
    }

    // Hapus file temporary
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) { /* ignore */ }

    // Gabungkan error parsing + error insert
    const allErrors = [...parseErrors, ...insertErrors];

    res.json({
      message: `Import selesai. ${insertSuccess.length} pendaftar berhasil diimport${allErrors.length > 0 ? `, ${allErrors.length} gagal.` : '.'}`,
      success_count: insertSuccess.length,
      error_count: allErrors.length,
      total_row: rowNumber - 1,
      errors: allErrors,
    });

  } catch (error) {
    // Hapus file jika ada error
    if (importedFile && req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }
    handleError(error, req, res, 'Gagal mengimport data PPDB');
  }
});

// GET /api/ppdb/:id/cetak-pdf — Cetak PDF hasil pendaftaran perorangan (admin)
router.get('/:id/cetak-pdf', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute('SELECT * FROM ppdb_pendaftar WHERE id = ?', [req.params.id]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    const pendaftar = rows[0];
    const pengaturan = await getSettings(db);
    const pdfBuffer = await generatePpdbResultPdf(pendaftar, pengaturan);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ppdb_${pendaftar.no_pendaftaran}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    handleError(error, req, res, 'Gagal mencetak PDF');
  }
});

// ─── Default PPDB Email Templates ───
const DEFAULT_EMAIL_TEMPLATES = {
  diterima: {
    subject: '[PPDB {sekolah}] Selamat! Pendaftaran {no_pendaftaran} — DITERIMA',
    body: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
  <!-- Decorative Top Bar -->
  <div style="height: 6px; background: linear-gradient(90deg, #059669, #10b981, #34d399, #10b981, #059669); border-radius: 0 0 0 0;"></div>

  <!-- Header with Decorative Pattern -->
  <div style="background: linear-gradient(135deg, #059669 0%, #047857 40%, #065f46 100%); padding: 40px 30px 35px; text-align: center; position: relative;">
    <!-- Decorative circles (subtle pattern) -->
    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0.08; background-image: radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px); background-size: 40px 40px;"></div>
    <!-- Trophy/Star emoji -->
    <div style="font-size: 48px; line-height: 1; margin-bottom: 12px;">\uD83C\uDFC6</div>
    <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.15);">{sekolah}</h1>
    <p style="color: #a7f3d0; margin: 8px 0 0; font-size: 14px; font-weight: 500;">Penerimaan Peserta Didik Baru Tahun Ajaran {tahun_ajaran}</p>
  </div>

  <!-- Main Content Card -->
  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
    <div style="padding: 35px 35px 30px;">
      <!-- Status Badge with Icon -->
      <div style="text-align: center; margin-bottom: 28px;">
        <!-- Checkmark circle -->
        <div style="display: inline-block; width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #d1fae5, #a7f3d0); margin-bottom: 12px;">
          <div style="font-size: 40px; line-height: 80px; text-align: center;">\u2705</div>
        </div>
        <div style="display: inline-block; padding: 8px 32px; border-radius: 50px; font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; background: linear-gradient(135deg, #059669, #047857); color: white; box-shadow: 0 4px 12px rgba(5,150,105,0.3);">DITERIMA</div>
        <p style="color: #059669; font-size: 14px; font-weight: 600; margin: 10px 0 0;">Selamat! Anda dinyatakan lulus seleksi</p>
      </div>

      <!-- Congratulations Message -->
      <div style="background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; border: 1px solid #a7f3d0;">
        <p style="font-size: 15px; color: #065f46; line-height: 1.7; margin: 0;">
          <strong style="font-size: 17px;">Yth. {nama_lengkap}</strong>
        </p>
        <p style="font-size: 14px; color: #065f46; line-height: 1.7; margin: 10px 0 0;">
          Dengan penuh sukacita, kami menginformasikan bahwa setelah melalui proses seleksi yang ketat,
          Anda dinyatakan <strong style="color: #059669; font-size: 15px;">DITERIMA</strong>
          sebagai peserta didik baru di <strong>{sekolah}</strong>.
        </p>
      </div>

      <!-- Data Pendaftar Card -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
        <div style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); padding: 12px 16px; border-bottom: 1px solid #bbf7d0;">
          <p style="margin: 0; font-size: 13px; font-weight: 700; color: #065f46; letter-spacing: 0.5px;">\uD83D\uDCCB DATA PENDAFTAR</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 12px 16px; color: #64748b; background: #f8fafc; border-bottom: 1px solid #f1f5f9; width: 40%;">No. Pendaftaran</td>
            <td style="padding: 12px 16px; color: #0f172a; font-weight: 700; background: #f8fafc; border-bottom: 1px solid #f1f5f9;">{no_pendaftaran}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; color: #64748b; border-bottom: 1px solid #f1f5f9;">NISN</td>
            <td style="padding: 12px 16px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">{nisn}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; color: #64748b; background: #f8fafc; border-bottom: 1px solid #f1f5f9;">Nama Lengkap</td>
            <td style="padding: 12px 16px; color: #0f172a; font-weight: 600; background: #f8fafc; border-bottom: 1px solid #f1f5f9;">{nama_lengkap}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; color: #64748b; background: #f8fafc;">Status</td>
            <td style="padding: 12px 16px; color: #059669; font-weight: 700; background: #f8fafc;">\u2705 DITERIMA</td>
          </tr>
        </table>
      </div>

      {keterangan_html}

      <!-- Next Steps -->
      <div style="background: linear-gradient(135deg, #f0fdf4, #ecfdf5); border: 1.5px solid #86efac; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 12px; font-size: 14px; color: #065f46; font-weight: 700;">\uD83D\uDCCB Langkah Selanjutnya:</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #065f46; vertical-align: top; width: 28px;">1.</td>
            <td style="padding: 6px 0; font-size: 13px; color: #065f46; line-height: 1.5;">Hadiri acara <strong>daftar ulang</strong> sesuai jadwal yang ditentukan</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #065f46; vertical-align: top;">2.</td>
            <td style="padding: 6px 0; font-size: 13px; color: #065f46; line-height: 1.5;">Lengkapi <strong>persyaratan administrasi</strong> yang diperlukan</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-size: 13px; color: #065f46; vertical-align: top;">3.</td>
            <td style="padding: 6px 0; font-size: 13px; color: #065f46; line-height: 1.5;">Hubungi pihak sekolah untuk <strong>informasi lebih lanjut</strong></td>
          </tr>
        </table>
      </div>

      <!-- Contact Information -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px;">
        <p style="margin: 0 0 8px; font-size: 12px; color: #64748b; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">Informasi Kontak</p>
        <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">
          {kontak_sekolah}
        </p>
      </div>
    </div>

    <!-- Footer Divider -->
    <div style="border-top: 1px solid #e2e8f0; padding: 20px 35px; text-align: center;">
      <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.6;">
        Email ini dikirim otomatis oleh <strong>Sistem PPDB {sekolah}</strong><br/>
        {tanggal}
      </p>
      <div style="margin-top: 12px; font-size: 10px; color: #cbd5e1;">
        © {sekolah} — Dokumen elektronik ini sah tanpa tanda tangan basah
      </div>
    </div>
  </div>

  <!-- Decorative Bottom Bar -->
  <div style="height: 6px; background: linear-gradient(90deg, #059669, #10b981, #34d399, #10b981, #059669); border-radius: 0 0 0 0; margin-top: 0;"></div>
</div>`,
  },
  ditolak: {
    subject: '[PPDB {sekolah}] Hasil Pendaftaran {no_pendaftaran} — DITOLAK',
    body: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
  <!-- Decorative Top Bar -->
  <div style="height: 6px; background: linear-gradient(90deg, #dc2626, #ef4444, #f87171, #ef4444, #dc2626); border-radius: 0 0 0 0;"></div>

  <!-- Header with Decorative Pattern -->
  <div style="background: linear-gradient(135deg, #991b1b 0%, #b91c1c 40%, #dc2626 100%); padding: 40px 30px 35px; text-align: center; position: relative;">
    <!-- Decorative circles (subtle pattern) -->
    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0.06; background-image: radial-gradient(circle at 30% 20%, white 1px, transparent 1px), radial-gradient(circle at 70% 80%, white 1px, transparent 1px); background-size: 40px 40px;"></div>
    <div style="font-size: 48px; line-height: 1; margin-bottom: 12px;">\uD83D\uDE4F</div>
    <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.15);">{sekolah}</h1>
    <p style="color: #fca5a5; margin: 8px 0 0; font-size: 14px; font-weight: 500;">Penerimaan Peserta Didik Baru Tahun Ajaran {tahun_ajaran}</p>
  </div>

  <!-- Main Content Card -->
  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
    <div style="padding: 35px 35px 30px;">
      <!-- Status Badge with Icon -->
      <div style="text-align: center; margin-bottom: 28px;">
        <div style="display: inline-block; width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #fee2e2, #fecaca); margin-bottom: 12px;">
          <div style="font-size: 40px; line-height: 80px; text-align: center;">\uD83D\uDE14</div>
        </div>
        <div style="display: inline-block; padding: 8px 32px; border-radius: 50px; font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; box-shadow: 0 4px 12px rgba(220,38,38,0.3);">DITOLAK</div>
        <p style="color: #dc2626; font-size: 14px; font-weight: 600; margin: 10px 0 0;">Kami mohon maaf atas hasil ini</p>
      </div>

      <!-- Notification Message -->
      <div style="background: linear-gradient(135deg, #fef2f2, #fee2e2); border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; border: 1px solid #fecaca;">
        <p style="font-size: 15px; color: #991b1b; line-height: 1.7; margin: 0;">
          <strong style="font-size: 17px;">Yth. {nama_lengkap}</strong>
        </p>
        <p style="font-size: 14px; color: #991b1b; line-height: 1.7; margin: 10px 0 0;">
          Setelah melalui proses seleksi dan penilaian yang cermat, dengan berat hati
          kami informasikan bahwa pendaftaran Anda dinyatakan
          <strong style="color: #dc2626; font-size: 15px;">BELUM DAPAT DITERIMA</strong>
          di <strong>{sekolah}</strong> untuk Tahun Ajaran <strong>{tahun_ajaran}</strong>.
        </p>
      </div>

      <!-- Data Pendaftar Card -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
        <div style="background: linear-gradient(135deg, #fef2f2, #fee2e2); padding: 12px 16px; border-bottom: 1px solid #fecaca;">
          <p style="margin: 0; font-size: 13px; font-weight: 700; color: #991b1b; letter-spacing: 0.5px;">\uD83D\uDCCB DATA PENDAFTAR</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 12px 16px; color: #64748b; background: #f8fafc; border-bottom: 1px solid #f1f5f9; width: 40%;">No. Pendaftaran</td>
            <td style="padding: 12px 16px; color: #0f172a; font-weight: 700; background: #f8fafc; border-bottom: 1px solid #f1f5f9;">{no_pendaftaran}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; color: #64748b; border-bottom: 1px solid #f1f5f9;">NISN</td>
            <td style="padding: 12px 16px; color: #0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">{nisn}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; color: #64748b; background: #f8fafc; border-bottom: 1px solid #f1f5f9;">Nama Lengkap</td>
            <td style="padding: 12px 16px; color: #0f172a; font-weight: 600; background: #f8fafc; border-bottom: 1px solid #f1f5f9;">{nama_lengkap}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; color: #64748b; background: #f8fafc;">Status</td>
            <td style="padding: 12px 16px; color: #dc2626; font-weight: 700; background: #f8fafc;">\u274C DITOLAK</td>
          </tr>
        </table>
      </div>

      {keterangan_html}

      <!-- Encouragement Message -->
      <div style="background: linear-gradient(135deg, #fefce8, #fef9c3); border: 1.5px solid #fde68a; border-radius: 12px; padding: 20px 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; font-size: 14px; color: #92400e; font-weight: 700;">\uD83C\uDF1F Tetap Semangat!</p>
        <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.7;">
          Terima kasih telah berpartisipasi dalam seleksi PPDB di {sekolah}.
          Kegagalan bukanlah akhir dari segalanya. Teruslah berusaha dan jangan menyerah
          untuk melanjutkan pendidikan di sekolah lain. Kami yakin Anda akan sukses
          di mana pun Anda belajar.
        </p>
      </div>

      <!-- Contact Information -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px;">
        <p style="margin: 0 0 8px; font-size: 12px; color: #64748b; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">Informasi Kontak</p>
        <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">
          {kontak_sekolah}
        </p>
      </div>
    </div>

    <!-- Footer Divider -->
    <div style="border-top: 1px solid #e2e8f0; padding: 20px 35px; text-align: center;">
      <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.6;">
        Email ini dikirim otomatis oleh <strong>Sistem PPDB {sekolah}</strong><br/>
        {tanggal}
      </p>
      <div style="margin-top: 12px; font-size: 10px; color: #cbd5e1;">
        © {sekolah} — Dokumen elektronik ini sah tanpa tanda tangan basah
      </div>
    </div>
  </div>

  <!-- Decorative Bottom Bar -->
  <div style="height: 6px; background: linear-gradient(90deg, #dc2626, #ef4444, #f87171, #ef4444, #dc2626); border-radius: 0 0 0 0; margin-top: 0;"></div>
</div>`,
  },
};

// ─── Helper: Apply template placeholders ───
function applyTemplate(template, data) {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`{${key}}`, 'g'), value || '');
  }
  return result;
}

// ─── Default Kartu Template Settings ───
const DEFAULT_KARTU_SETTINGS = {
  warna_utama: '#15803D',
  tampilkan_field: 'no_pendaftaran,nisn,nama_lengkap,tempat_lahir,tanggal_lahir,jenis_kelamin,asal_sekolah',
  tampilkan_qr: '1',
  judul_kartu: 'KARTU PENDAFTARAN',
  warna_header: '#15803D',
  warna_aksen: '#F0FDF4',
};

// ─── Helper: Dapatkan PPDB settings ───
async function getPpdbSettings(db) {
  const [settings] = await db.execute(
    "SELECT `key`, `value` FROM pengaturan WHERE `key` LIKE 'ppdb_%'"
  );
  const result = {};
  for (const s of settings) {
    result[s.key] = s.value;
  }
  return result;
}

// ─── Helper: Dapatkan kartu template settings ───
async function getPpdbKartuSettings(db) {
  const [settings] = await db.execute(
    "SELECT `key`, `value` FROM pengaturan WHERE `key` LIKE 'ppdb_kartu_%'"
  );
  const result = {};
  for (const s of settings) {
    result[s.key.replace('ppdb_kartu_', '')] = s.value;
  }
  return { ...DEFAULT_KARTU_SETTINGS, ...result };
}

// ─── GET /api/ppdb/settings — Ambil pengaturan PPDB (email + kartu) (BEFORE /:id) ───
router.get('/settings', async (req, res) => {
  try {
    const db = await getDatabase();
    const settings = await getPpdbSettings(db);
    const kartuSettings = await getPpdbKartuSettings(db);
    res.json({
      // Email settings
      diterima_subject: settings.ppdb_email_diterima_subject || DEFAULT_EMAIL_TEMPLATES.diterima.subject,
      diterima_body: settings.ppdb_email_diterima_body || DEFAULT_EMAIL_TEMPLATES.diterima.body,
      ditolak_subject: settings.ppdb_email_ditolak_subject || DEFAULT_EMAIL_TEMPLATES.ditolak.subject,
      ditolak_body: settings.ppdb_email_ditolak_body || DEFAULT_EMAIL_TEMPLATES.ditolak.body,
      // Kartu settings
      kartu_warna_utama: kartuSettings.warna_utama,
      kartu_warna_header: kartuSettings.warna_header,
      kartu_warna_aksen: kartuSettings.warna_aksen,
      kartu_tampilkan_field: kartuSettings.tampilkan_field,
      kartu_tampilkan_qr: kartuSettings.tampilkan_qr,
      kartu_judul: kartuSettings.judul_kartu,
    });
  } catch (error) {
    handleError(error, req, res, 'Gagal memuat pengaturan PPDB');
  }
});

// ─── POST /api/ppdb/settings/test-kirim — Test kirim email notifikasi (admin) ───
router.post('/settings/test-kirim', async (req, res) => {
  try {
    const db = await getDatabase();
    const { type, email_tujuan, subject_template, body_template } = req.body;

    if (!type || !['diterima', 'ditolak'].includes(type)) {
      return res.status(400).json({ message: 'Tipe template tidak valid. Gunakan "diterima" atau "ditolak".' });
    }
    if (!email_tujuan) {
      return res.status(400).json({ message: 'Alamat email tujuan harus diisi.' });
    }
    if (!subject_template || !body_template) {
      return res.status(400).json({ message: 'Subject dan Body template harus diisi.' });
    }

    const pengaturan = await getSettings(db);

    // Pastikan SMTP sudah dikonfigurasi
    if (!pengaturan.smtp_host || !pengaturan.smtp_user || !pengaturan.smtp_pass) {
      return res.status(400).json({
        message: 'Konfigurasi SMTP belum lengkap. Silakan atur di menu Pengaturan > Konfigurasi Email terlebih dahulu.',
      });
    }

    const sekolah = pengaturan.nama_sekolah || 'SMA Annajah';
    const tahunAjaran = pengaturan.tahun_ajaran_aktif || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
    const isDiterima = type === 'diterima';

    const kontakSekolah = [
      pengaturan.no_telp ? `Telepon: ${pengaturan.no_telp}` : '',
      pengaturan.email ? `Email: ${pengaturan.email}` : '',
      [pengaturan.alamat_sekolah, pengaturan.kota, pengaturan.provinsi].filter(Boolean).join(', '),
    ].filter(Boolean).join('<br/>');

    const sampleKeterangan = isDiterima
      ? 'Silakan melakukan daftar ulang pada 1-10 Juli 2025 di sekolah dengan membawa kelengkapan administrasi.'
      : 'Terima kasih atas partisipasi Anda. Kami berharap Anda sukses di sekolah lain.';

    const keteranganHtml = `<div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px 15px; margin: 15px 0;"><p style="margin: 0; font-size: 13px; color: #92400e;"><strong>Catatan (Data Sampel):</strong><br/>${sampleKeterangan}</p></div>`;

    const tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const templateData = {
      sekolah,
      tahun_ajaran: tahunAjaran,
      no_pendaftaran: 'PPDB' + new Date().getFullYear() + '000001',
      nisn: '0012345678',
      nama_lengkap: 'Andi Pratama (Data Sampel)',
      status: isDiterima ? 'DITERIMA' : 'DITOLAK',
      keterangan: sampleKeterangan,
      keterangan_html: keteranganHtml,
      kontak_sekolah: kontakSekolah,
      tanggal,
      no_telp: pengaturan.no_telp || '(021) 12345678',
      email_sekolah: pengaturan.email || 'info@smaannajah.sch.id',
      alamat_sekolah: pengaturan.alamat_sekolah || 'Jl. Pendidikan No. 1',
    };

    const subject = applyTemplate(subject_template, templateData);
    const htmlContent = applyTemplate(body_template, templateData);

    // Tambahkan watermark test di body
    const htmlWithWatermark = `
      <div style="position: relative;">
        <div style="position: absolute; top: 10px; right: 10px; background: #f59e0b; color: white; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; z-index: 100;">\uD83D\uDCE8 EMAIL UJI COBA</div>
        ${htmlContent}
        <div style="text-align: center; padding: 12px; margin-top: 8px; background: #fef3c7; border: 1px dashed #f59e0b; border-radius: 8px;">
          <p style="margin: 0; font-size: 12px; color: #92400e;">\u26A0\uFE0F Email ini adalah <strong>uji coba</strong> dari halaman Pengaturan Email PPDB. Data yang ditampilkan adalah data sampel.</p>
        </div>
      </div>`;

    const transporter = nodemailer.createTransport({
      host: pengaturan.smtp_host,
      port: parseInt(pengaturan.smtp_port || '587'),
      secure: parseInt(pengaturan.smtp_port || '587') === 465,
      auth: {
        user: pengaturan.smtp_user,
        pass: pengaturan.smtp_pass,
      },
    });

    const info = await transporter.sendMail({
      from: `"${pengaturan.smtp_nama_pengirim || sekolah}" <${pengaturan.smtp_email_pengirim || pengaturan.smtp_user}>`,
      to: email_tujuan,
      subject: `[TEST] ${subject}`,
      html: htmlWithWatermark,
    });

    res.json({
      message: `Email uji coba berhasil dikirim ke ${email_tujuan}`,
      message_id: info.messageId,
    });
  } catch (error) {
    handleError(error, req, res, 'Gagal mengirim email uji coba. Periksa konfigurasi SMTP.');
  }
});

// ─── PUT /api/ppdb/settings — Simpan pengaturan PPDB (email + kartu) (BEFORE /:id) ───
router.put('/settings', async (req, res) => {
  try {
    const db = await getDatabase();
    const { diterima_subject, diterima_body, ditolak_subject, ditolak_body, kartu_warna_utama, kartu_warna_header, kartu_warna_aksen, kartu_tampilkan_field, kartu_tampilkan_qr, kartu_judul } = req.body;

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const upsertSql = 'INSERT INTO pengaturan (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)';
      
      // Email settings
      if (diterima_subject !== undefined)
        await conn.execute(upsertSql, ['ppdb_email_diterima_subject', diterima_subject]);
      if (diterima_body !== undefined)
        await conn.execute(upsertSql, ['ppdb_email_diterima_body', diterima_body]);
      if (ditolak_subject !== undefined)
        await conn.execute(upsertSql, ['ppdb_email_ditolak_subject', ditolak_subject]);
      if (ditolak_body !== undefined)
        await conn.execute(upsertSql, ['ppdb_email_ditolak_body', ditolak_body]);

      // Kartu template settings
      if (kartu_warna_utama !== undefined)
        await conn.execute(upsertSql, ['ppdb_kartu_warna_utama', kartu_warna_utama]);
      if (kartu_warna_header !== undefined)
        await conn.execute(upsertSql, ['ppdb_kartu_warna_header', kartu_warna_header]);
      if (kartu_warna_aksen !== undefined)
        await conn.execute(upsertSql, ['ppdb_kartu_warna_aksen', kartu_warna_aksen]);
      if (kartu_tampilkan_field !== undefined)
        await conn.execute(upsertSql, ['ppdb_kartu_tampilkan_field', kartu_tampilkan_field]);
      if (kartu_tampilkan_qr !== undefined)
        await conn.execute(upsertSql, ['ppdb_kartu_tampilkan_qr', kartu_tampilkan_qr]);
      if (kartu_judul !== undefined)
        await conn.execute(upsertSql, ['ppdb_kartu_judul', kartu_judul]);

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    await logActivity(req, 'Ubah', 'PPDB', null, 'Menyimpan pengaturan PPDB');
    res.json({ message: 'Pengaturan PPDB berhasil disimpan' });
  } catch (error) {
    handleError(error, req, res, 'Gagal menyimpan pengaturan PPDB');
  }
});

// ─── GET /api/ppdb/email-log — Ambil riwayat email (admin) ───
router.get('/email-log', async (req, res) => {
  try {
    const db = await getDatabase();
    const { ppdb_id } = req.query;

    let where = ' WHERE 1=1';
    const params = [];

    if (ppdb_id) {
      where += ' AND l.ppdb_id = ?';
      params.push(ppdb_id);
    }

    const [rows] = await db.execute(
      `SELECT l.*, p.nama_lengkap, p.no_pendaftaran
       FROM ppdb_email_log l
       LEFT JOIN ppdb_pendaftar p ON l.ppdb_id = p.id
       ${where}
       ORDER BY l.created_at DESC
       LIMIT 100`,
      params
    );

    res.json(rows);
  } catch (error) {
    handleError(error, req, res, 'Gagal memuat log email PPDB');
  }
});

// POST /api/ppdb/:id/kirim-email — Kirim ulang notifikasi email (admin)
router.post('/:id/kirim-email', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute('SELECT * FROM ppdb_pendaftar WHERE id = ?', [req.params.id]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    const pendaftar = rows[0];

    if (pendaftar.status === 'menunggu') {
      return res.status(400).json({ message: 'Pendaftar masih berstatus Menunggu. Ubah status terlebih dahulu untuk mengirim notifikasi.' });
    }

    if (!pendaftar.email) {
      return res.status(400).json({ message: 'Pendaftar tidak memiliki alamat email. Notifikasi tidak dapat dikirim.' });
    }

    const emailSent = await sendStatusEmail(pendaftar, pendaftar.status, pendaftar.keterangan);

    if (emailSent) {
      await logActivity(req, 'Ubah', 'PPDB', req.params.id, `Mengirim ulang email notifikasi PPDB ke ${pendaftar.email}`);
      res.json({ message: `Notifikasi email berhasil dikirim ulang ke ${pendaftar.email}` });
    } else {
      res.status(500).json({ message: 'Gagal mengirim email. Periksa konfigurasi SMTP di menu Pengaturan.' });
    }
  } catch (error) {
    handleError(error, req, res, 'Gagal mengirim ulang email');
  }
});

// GET /api/ppdb/:id — Detail pendaftar (admin)
router.get('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute(
      `SELECT id, no_pendaftaran, kode_rahasia, nisn, nama_lengkap, tempat_lahir, tanggal_lahir,
              jenis_kelamin, alamat, asal_sekolah, no_telp, email,
              nama_ayah, nama_ibu, status, keterangan, nilai, dikonversi,
              foto, gps_masuk, created_at
       FROM ppdb_pendaftar WHERE id = ?`,
      [req.params.id]
    );
    if (!rows[0]) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }
    res.json(rows[0]);
  } catch (error) {
    handleError(error, req, res, 'Gagal memuat data');
  }
});

// PUT /api/ppdb/:id — Update data pendaftar (admin)
router.put('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute('SELECT * FROM ppdb_pendaftar WHERE id = ?', [req.params.id]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    const {
      nisn, nama_lengkap, tempat_lahir, tanggal_lahir,
      jenis_kelamin, alamat, asal_sekolah, no_telp,
      email, nama_ayah, nama_ibu, nilai,
    } = req.body;

    // Validasi wajib
    if (!nisn || !nama_lengkap || !no_telp) {
      return res.status(400).json({
        message: 'NISN, Nama Lengkap, dan No. Telepon harus diisi',
      });
    }

    // Normalisasi jenis kelamin
    let jk = jenis_kelamin;
    if (jk) {
      const upper = jk.toUpperCase();
      if (upper === 'LAKI-LAKI' || upper === 'LAKI' || upper === 'L') {
        jk = 'L';
      } else if (upper === 'PEREMPUAN' || upper === 'WANITA' || upper === 'P') {
        jk = 'P';
      }
    }

    // Sanitize date
    let tglLahir = tanggal_lahir || null;
    if (tglLahir && typeof tglLahir === 'string') {
      if (tglLahir.includes('T')) tglLahir = tglLahir.split('T')[0];
    }

    // Sanitize nilai
    const nilaiFinal = nilai !== undefined && nilai !== '' ? parseInt(nilai) : null;

    await db.execute(
      `UPDATE ppdb_pendaftar SET
        nisn = ?, nama_lengkap = ?, tempat_lahir = ?, tanggal_lahir = ?,
        jenis_kelamin = ?, alamat = ?, asal_sekolah = ?, no_telp = ?,
        email = ?, nama_ayah = ?, nama_ibu = ?, nilai = ?
       WHERE id = ?`,
      [
        nisn, nama_lengkap, tempat_lahir || null,
        tglLahir, jk || null, alamat || null, asal_sekolah || null,
        no_telp, email || null, nama_ayah || null, nama_ibu || null,
        nilaiFinal,
        req.params.id,
      ]
    );

    await logActivity(req, 'Ubah', 'PPDB', req.params.id, `Mengupdate data pendaftar PPDB #${req.params.id}`);
    res.json({ message: 'Data pendaftar berhasil diupdate' });
  } catch (error) {
    handleError(error, req, res, 'Gagal mengupdate data pendaftar');
  }
});

// PUT /api/ppdb/:id/foto — Upload foto pendaftar (admin)
router.put('/:id/foto', (req, res, next) => {
  uploadFoto.single('foto')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Ukuran file maksimal 2MB' });
      }
      return res.status(400).json({ message: err.message || 'File tidak valid' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute('SELECT * FROM ppdb_pendaftar WHERE id = ?', [req.params.id]);
    if (!rows[0]) {
      // Hapus file yang sudah terupload jika data tidak ditemukan
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
      }
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diupload' });
    }

    const pendaftar = rows[0];

    // Hapus foto lama jika ada
    if (pendaftar.foto) {
      const oldPath = path.join(ppdbFotoDir, pendaftar.foto);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (e) { /* ignore */ }
      }
    }

    // Simpan nama file di database
    await db.execute('UPDATE ppdb_pendaftar SET foto = ? WHERE id = ?', [req.file.filename, req.params.id]);

    await logActivity(req, 'Ubah', 'PPDB', req.params.id, `Upload foto pendaftar PPDB #${req.params.id}`);
    res.json({
      message: 'Foto berhasil diupload',
      foto: req.file.filename,
    });
  } catch (error) {
    // Hapus file jika ada error
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
    }
    handleError(error, req, res, 'Gagal mengupload foto');
  }
});

// DELETE /api/ppdb/:id/foto — Hapus foto pendaftar (admin)
router.delete('/:id/foto', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute('SELECT * FROM ppdb_pendaftar WHERE id = ?', [req.params.id]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    const pendaftar = rows[0];
    if (!pendaftar.foto) {
      return res.status(400).json({ message: 'Tidak ada foto untuk dihapus' });
    }

    // Hapus file foto
    const fotoPath = path.join(ppdbFotoDir, pendaftar.foto);
    if (fs.existsSync(fotoPath)) {
      try { fs.unlinkSync(fotoPath); } catch (e) { /* ignore */ }
    }

    // Update database
    await db.execute('UPDATE ppdb_pendaftar SET foto = NULL WHERE id = ?', [req.params.id]);

    await logActivity(req, 'Hapus', 'PPDB', req.params.id, `Menghapus foto pendaftar PPDB #${req.params.id}`);
    res.json({ message: 'Foto berhasil dihapus' });
  } catch (error) {
    handleError(error, req, res, 'Gagal menghapus foto');
  }
});

// GET /api/ppdb/:id/cetak-kartu — Cetak Kartu Pendaftaran perorangan (admin)
router.get('/:id/cetak-kartu', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute('SELECT * FROM ppdb_pendaftar WHERE id = ?', [req.params.id]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    const pendaftar = rows[0];
    const pengaturan = await getSettings(db);
    const kartuSettings = await getPpdbKartuSettings(db);
    const pdfBuffer = await generatePpdbKartuPendaftaran(pendaftar, pengaturan, kartuSettings);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=kartu_ppdb_${pendaftar.no_pendaftaran}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    handleError(error, req, res, 'Gagal mencetak kartu pendaftaran');
  }
});

// ─── Helper: Generate PDF hasil pendaftaran sebagai buffer ───
async function generatePpdbResultPdf(pendaftar, pengaturan) {
  // Generate QR code buffer terlebih dahulu (async)
  let qrBuffer = null;
  try {
    const d = pendaftar;
    const sekolah = pengaturan.nama_sekolah || 'SMA Annajah';
    const statusLabel = d.status === 'diterima' ? 'DITERIMA' : d.status === 'ditolak' ? 'DITOLAK' : 'MENUNGGU VERIFIKASI';
    const website = pengaturan.website || '';
    const verifyUrl = website ? `${website}/cek/${d.no_pendaftaran}` : '';
    const qrContent = [
      `PPDB ${sekolah}`,
      `No: ${d.no_pendaftaran}`,
      `NISN: ${d.nisn}`,
      `Nama: ${d.nama_lengkap}`,
      `Status: ${statusLabel}`,
      verifyUrl ? `Verifikasi: ${verifyUrl}` : '',
    ].filter(Boolean).join('\n');

    qrBuffer = await QRCode.toBuffer(qrContent, {
      type: 'png',
      margin: 2,
      width: 300,
      color: { dark: '#15803D', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    });
  } catch (e) {
    console.error('QR Code PPDB: Gagal generate:', e.message);
  }

  // Buat PDF
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const d = pendaftar;
      const sekolah = pengaturan.nama_sekolah || 'SMA Annajah';
      const alamatLengkap = [pengaturan.alamat_sekolah, pengaturan.kota, pengaturan.provinsi].filter(Boolean).join(', ');
      const tahunAjaran = pengaturan.tahun_ajaran_aktif || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

      const marginLeft = 40;
      const marginRight = 40;
      const pageWidth = doc.page.width - marginLeft - marginRight;

      // ── Border ──
      const border = 20;
      doc.rect(border, border, doc.page.width - border * 2, doc.page.height - border * 2).stroke('#15803D');

      // ── Watermark Diagonal ──
      doc.save();
      doc.opacity(0.04);
      const centerX = doc.page.width / 2;
      const centerY = doc.page.height / 2;
      doc.fontSize(48).font('Helvetica-Bold').fillColor('#15803D');
      for (let row = -2; row <= 2; row++) {
        doc.text('PPDB SMA ANNAJAH', centerX - 200 + row * 150, centerY - 350 + row * 200, { width: 400, align: 'center' });
      }
      doc.translate(centerX, centerY);
      doc.rotate(-25);
      doc.fontSize(40);
      for (let row = -2; row <= 2; row++) {
        doc.text('PPDB SMA ANNAJAH', -250, -400 + row * 180, { width: 500, align: 'center' });
      }
      doc.rotate(25);
      doc.translate(-centerX, -centerY);
      doc.restore();

      // ── Kop Surat ──
      const logoPath = pengaturan.logo;
      let hasLogo = false;
      if (logoPath) {
        const fullPath = path.join(__dirname, '..', logoPath.replace(/^\//, ''));
        if (fs.existsSync(fullPath)) {
          try {
            const img = doc.openImage(fullPath);
            const maxW = 50, maxH = 50;
            const scale = Math.min(maxW / img.width, maxH / img.height);
            doc.image(fullPath, marginLeft + 15, 35, { width: img.width * scale, height: img.height * scale });
            hasLogo = true;
          } catch (e) {}
        }
      }

      const textX = hasLogo ? marginLeft + 70 : marginLeft + 10;
      const textW = hasLogo ? pageWidth - 70 : pageWidth - 10;

      doc.fontSize(14).font('Helvetica-Bold').fillColor('#15803D');
      doc.text(sekolah, textX, 35, { width: textW, align: hasLogo ? 'left' : 'center' });

      doc.fontSize(8).fillColor('#6B7280').font('Helvetica');
      const infoParts = [];
      if (pengaturan.npsn) infoParts.push(`NPSN: ${pengaturan.npsn}`);
      if (alamatLengkap) infoParts.push(alamatLengkap);
      doc.text(infoParts.join('  |  '), textX, doc.y, { width: textW, align: hasLogo ? 'left' : 'center' });

      const kontakParts = [];
      if (pengaturan.no_telp) kontakParts.push(`Telp: ${pengaturan.no_telp}`);
      if (pengaturan.email) kontakParts.push(`Email: ${pengaturan.email}`);
      if (pengaturan.website) kontakParts.push(pengaturan.website);
      if (kontakParts.length > 0) {
        doc.fontSize(7.5).fillColor('#9CA3AF').font('Helvetica');
        doc.text(kontakParts.join('  |  '), textX, doc.y, { width: textW, align: hasLogo ? 'left' : 'center' });
      }

      // ── Foto Pendaftar (jika ada) ──
      let fotoX = 0, fotoY = 0, fotoW = 0, fotoH = 0;
      let hasFoto = false;
      if (d.foto) {
        const fotoFullPath = path.join(ppdbFotoDir, d.foto);
        if (fs.existsSync(fotoFullPath)) {
          try {
            const img = doc.openImage(fotoFullPath);
            const maxW = 72, maxH = 90;
            const scale = Math.min(maxW / img.width, maxH / img.height);
            fotoW = img.width * scale;
            fotoH = img.height * scale;
            fotoX = doc.page.width - marginRight - fotoW - 15;
            fotoY = doc.y + 4;
            // Simpan Y saat ini
            doc.image(fotoFullPath, fotoX, fotoY, { width: fotoW, height: fotoH });
            // Border foto
            doc.rect(fotoX - 2, fotoY - 2, fotoW + 4, fotoH + 4).lineWidth(0.5).stroke('#E5E7EB');
            hasFoto = true;
          } catch (e) {
            // Abaikan error foto
          }
        }
      }

      doc.y = 98;
      if (hasFoto) {
        // Jika ada foto, geser Y ke bawah sesuai tinggi foto
        doc.y = Math.max(doc.y, fotoY + fotoH + 10);
      }
      doc.moveTo(marginLeft + 10, doc.y).lineTo(doc.page.width - marginLeft - 10, doc.y).stroke('#15803D');
      doc.moveDown(0.8);

      // ── Judul ──
      doc.fontSize(13).fillColor('#374151').font('Helvetica-Bold');
      doc.text('SURAT KETERANGAN HASIL PENDAPTARAN', { align: 'center' });
      doc.fontSize(10).fillColor('#6B7280').font('Helvetica');
      doc.text(`Penerimaan Peserta Didik Baru Tahun Ajaran ${tahunAjaran}`, { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(7).fillColor('#9CA3AF');
      doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, { align: 'right' });
      doc.moveDown(0.3);
      doc.moveTo(marginLeft + 10, doc.y).lineTo(doc.page.width - marginLeft - 10, doc.y).stroke('#E5E7EB');
      doc.moveDown(0.8);

      // ── Status Badge ──
      const statusColor = d.status === 'diterima' ? '#059669' : d.status === 'ditolak' ? '#DC2626' : '#D97706';
      const statusBg = d.status === 'diterima' ? '#D1FAE5' : d.status === 'ditolak' ? '#FEE2E2' : '#FEF3C7';
      const statusLabel = d.status === 'diterima' ? 'DITERIMA' : d.status === 'ditolak' ? 'DITOLAK' : 'MENUNGGU VERIFIKASI';

      doc.roundedRect(pageWidth / 2 - 60, doc.y, 120, 28, 14).fill(statusBg);
      doc.fillColor(statusColor).fontSize(12).font('Helvetica-Bold');
      doc.text(statusLabel, pageWidth / 2 - 55, doc.y + 7, { width: 110, align: 'center' });
      doc.y += 36;

      // ── Data Pemohon ──
      doc.fontSize(9).fillColor('#374151').font('Helvetica-Bold');
      doc.text('DATA PEMOHON', marginLeft + 10, doc.y);
      doc.moveDown(0.3);
      doc.moveTo(marginLeft + 10, doc.y).lineTo(doc.page.width - marginLeft - 10, doc.y).stroke('#E5E7EB');
      doc.moveDown(0.4);

      const labelW = 110;
      const valueW = pageWidth - labelW - 20;
      const rowH = 18;
      const startX = marginLeft + 15;

      // ── Kode Rahasia ──
      const kodeRahasiaDisplay = d.kode_rahasia ? `${d.no_pendaftaran} - ${d.kode_rahasia}` : d.no_pendaftaran;

      const fields = [
        ['No. Pendaftaran', kodeRahasiaDisplay, true],
        ['NISN', d.nisn, true],
        ['Nama Lengkap', d.nama_lengkap, false],
        ['Tempat Lahir', d.tempat_lahir || '-', false],
        ['Tanggal Lahir', d.tanggal_lahir ? new Date(d.tanggal_lahir).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '-', false],
        ['Jenis Kelamin', d.jenis_kelamin === 'L' ? 'Laki-laki' : d.jenis_kelamin === 'P' ? 'Perempuan' : '-', false],
        ['Alamat', d.alamat || '-', false],
        ['Asal Sekolah', d.asal_sekolah || '-', false],
        ['No. Telepon', d.no_telp || '-', false],
        ['Email', d.email || '-', false],
        ['Nama Ayah', d.nama_ayah || '-', false],
        ['Nama Ibu', d.nama_ibu || '-', false]
      ];

      let yPos = doc.y;
      fields.forEach(([label, value, mono], i) => {
        if (yPos > doc.page.height - 80) {
          doc.addPage();
          doc.rect(border, border, doc.page.width - border * 2, doc.page.height - border * 2).stroke('#15803D');
          yPos = 50;
        }
        const bg = i % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
        doc.rect(startX - 5, yPos, labelW + valueW + 10, rowH).fill(bg);
        doc.fillOpacity(1);
        doc.fillColor('#6B7280').fontSize(8).font('Helvetica');
        doc.text(label, startX, yPos + 5, { width: labelW });
        doc.fillColor('#374151').fontSize(8).font(mono ? 'Courier' : 'Helvetica');
        doc.text(String(value), startX + labelW, yPos + 5, { width: valueW });
        yPos += rowH;
      });

      doc.y = yPos + 10;

      // ── Keterangan ──
      if (d.keterangan) {
        doc.moveTo(marginLeft + 10, doc.y).lineTo(doc.page.width - marginLeft - 10, doc.y).stroke('#E5E7EB');
        doc.moveDown(0.3);
        doc.fontSize(9).fillColor('#374151').font('Helvetica-Bold');
        doc.text('KETERANGAN', marginLeft + 10, doc.y);
        doc.moveDown(0.3);
        doc.fontSize(8).fillColor('#6B7280').font('Helvetica');
        doc.text(d.keterangan, marginLeft + 15, doc.y, { width: pageWidth - 10 });
        doc.moveDown(0.5);
      }

      // ── QR Code (Verifikasi) ──
      const qrSize = 65;
      const qrX = doc.page.width - marginRight - qrSize - 20;
      const qrY = doc.y;
      if (qrBuffer) {
        doc.roundedRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 30, 6)
          .fillOpacity(1).fill('#FFFFFF').stroke('#15803D').fillOpacity(1);
        doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
        doc.fontSize(5.5).fillColor('#15803D').font('Helvetica').text('Scan untuk verifikasi', qrX - 2, qrY + qrSize + 4, { width: qrSize + 8, align: 'center' });
      }

      // ── Tanda Tangan ──
      doc.y = Math.max(qrY + 20, doc.page.height - 150);
      const ttdY = doc.y;
      const ttdW = 130;
      const ttdLeft = marginLeft + 20;
      const ttdRight = doc.page.width - marginRight - ttdW - 20;

      doc.fontSize(8).fillColor('#374151').font('Helvetica');
      doc.text('Mengetahui,', ttdLeft, ttdY);
      doc.text('Hormat Kami,', ttdRight, ttdY);

      doc.moveDown(4);
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text(`( ${pengaturan.kepala_sekolah || '___________________'} )`, ttdLeft, doc.y, { width: ttdW, align: 'center' });
      doc.text(`( ${pengaturan.bendahara || '___________________'} )`, ttdRight, doc.y, { width: ttdW, align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(7.5).fillColor('#6B7280').font('Helvetica');
      doc.text('Kepala Sekolah', ttdLeft, doc.y, { width: ttdW, align: 'center' });
      doc.text('Bendahara', ttdRight, doc.y, { width: ttdW, align: 'center' });

      // ── Footer ──
      doc.fontSize(6.5).fillColor('#9CA3AF').font('Helvetica');
      doc.text('Dokumen ini dicetak dari Sistem PPDB dan merupakan dokumen resmi.', marginLeft + 10, doc.page.height - 50, { width: pageWidth, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ─── Helper: Catat log pengiriman email PPDB ───
async function logEmailPpdb(db, ppdbId, statusPpdb, emailTujuan, subjek, statusKirim, pesanError, userId) {
  await db.execute(
    `INSERT INTO ppdb_email_log (ppdb_id, status_ppdb, email_tujuan, subjek, status_kirim, pesan_error, dikirim_oleh)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [ppdbId, statusPpdb, emailTujuan, subjek || '', statusKirim, pesanError || null, userId || null]
  );
}

// ─── POST /api/ppdb/:id/konversi-siswa — Konversi pendaftar PPDB menjadi siswa ───
router.post('/:id/konversi-siswa', async (req, res) => {
  try {
    const db = await getDatabase();
    const { nis, id_kelas } = req.body;

    if (!nis || !id_kelas) {
      return res.status(400).json({ message: 'NIS dan Kelas harus diisi' });
    }

    // Cek pendaftar PPDB
    const [pendaftar] = await db.execute('SELECT * FROM ppdb_pendaftar WHERE id = ?', [req.params.id]);
    if (!pendaftar[0]) {
      return res.status(404).json({ message: 'Data pendaftar tidak ditemukan' });
    }

    const p = pendaftar[0];

    // Cek duplikat NIS di tabel siswa
    const [existing] = await db.execute('SELECT id FROM siswa WHERE nis = ?', [nis]);
    if (existing[0]) {
      return res.status(400).json({ message: 'NIS sudah terdaftar di data siswa' });
    }

    // Cek kelas
    const [kelas] = await db.execute('SELECT id FROM kelas WHERE id = ?', [id_kelas]);
    if (!kelas[0]) {
      return res.status(400).json({ message: 'Kelas tidak ditemukan' });
    }

    // Buat siswa baru dari data PPDB
    const [result] = await db.execute(`
      INSERT INTO siswa (nis, nisn, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telp, foto, id_kelas, status, asal_sekolah)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif', ?)
    `, [
      nis,
      p.nisn || null,
      p.nama_lengkap,
      p.jenis_kelamin || null,
      p.tempat_lahir || null,
      p.tanggal_lahir || null,
      p.alamat || null,
      p.no_telp || null,
      p.foto || null,
      id_kelas,
      p.asal_sekolah || null,
    ]);

    // Update status pendaftar PPDB — tandai sudah dikonversi
    await db.execute(
      'UPDATE ppdb_pendaftar SET status = ?, keterangan = ?, dikonversi = 1 WHERE id = ?',
      ['diterima', `Dikonversi ke siswa (NIS: ${nis})`, req.params.id]
    );

    await logActivity(req, 'Tambah', 'PPDB', req.params.id, `Konversi pendaftar PPDB ke siswa (NIS: ${nis})`);
    res.json({
      message: 'Pendaftar berhasil dikonversi menjadi siswa',
      siswa_id: result.insertId,
      nis,
    });
  } catch (error) {
    handleError(error, req, res, 'Gagal mengkonversi pendaftar menjadi siswa');
  }
});

// ─── Helper: Kirim notifikasi email saat status PPDB berubah ───
async function sendStatusEmail(pendaftar, statusBaru, keterangan, userId) {
  let db;
  try {
    db = await getDatabase();
    const pengaturan = await getSettings(db);

    // Pastikan SMTP sudah dikonfigurasi
    if (!pengaturan.smtp_host || !pengaturan.smtp_user || !pengaturan.smtp_pass) {
      console.log('Email PPDB: SMTP belum dikonfigurasi, lewati notifikasi');
      return false;
    }

    // Pastikan pendaftar punya email
    if (!pendaftar.email) {
      console.log(`Email PPDB: Pendaftar ${pendaftar.no_pendaftaran} tidak punya email, lewati`);
      return false;
    }

    const statusLabel = statusBaru === 'diterima' ? 'DITERIMA' : statusBaru === 'ditolak' ? 'DITOLAK' : 'MENUNGGU';
    const isDiterima = statusBaru === 'diterima';

    const sekolah = pengaturan.nama_sekolah || 'SMA Annajah';
    const tahunAjaran = pengaturan.tahun_ajaran_aktif || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

    // Ambil template yang bisa dikustomisasi
    const ppdbSettings = await getPpdbSettings(db);
    const templateKey = isDiterima ? 'diterima' : 'ditolak';
    const subjectTemplate = ppdbSettings[`ppdb_email_${templateKey}_subject`] || DEFAULT_EMAIL_TEMPLATES[templateKey].subject;
    const bodyTemplate = ppdbSettings[`ppdb_email_${templateKey}_body`] || DEFAULT_EMAIL_TEMPLATES[templateKey].body;

    // Siapkan data placeholder
    const kontakSekolah = [
      pengaturan.no_telp ? `Telepon: ${pengaturan.no_telp}` : '',
      pengaturan.email ? `Email: ${pengaturan.email}` : '',
      [pengaturan.alamat_sekolah, pengaturan.kota, pengaturan.provinsi].filter(Boolean).join(', '),
    ].filter(Boolean).join('<br/>');

    const keteranganHtml = keterangan
      ? `<div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px 15px; margin: 15px 0;"><p style="margin: 0; font-size: 13px; color: #92400e;"><strong>Catatan:</strong><br/>${keterangan.replace(/\n/g, '<br/>')}</p></div>`
      : '';

    const tanggal = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const templateData = {
      sekolah,
      tahun_ajaran: tahunAjaran,
      no_pendaftaran: pendaftar.no_pendaftaran,
      nisn: pendaftar.nisn,
      nama_lengkap: pendaftar.nama_lengkap,
      status: statusLabel,
      keterangan: keterangan || '',
      keterangan_html: keteranganHtml,
      kontak_sekolah: kontakSekolah,
      tanggal,
      no_telp: pengaturan.no_telp || '',
      email_sekolah: pengaturan.email || '',
      alamat_sekolah: pengaturan.alamat_sekolah || '',
    };

    const subject = applyTemplate(subjectTemplate, templateData);
    const htmlContent = applyTemplate(bodyTemplate, templateData);

    const transporter = nodemailer.createTransport({
      host: pengaturan.smtp_host,
      port: parseInt(pengaturan.smtp_port || '587'),
      secure: parseInt(pengaturan.smtp_port || '587') === 465,
      auth: {
        user: pengaturan.smtp_user,
        pass: pengaturan.smtp_pass,
      },
    });

    // Generate PDF hasil pendaftaran sebagai lampiran
    let pdfAttachment = null;
    try {
      const pdfBuffer = await generatePpdbResultPdf(pendaftar, pengaturan);
      pdfAttachment = {
        filename: `hasil_ppdb_${pendaftar.no_pendaftaran}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      };
    } catch (pdfError) {
      console.error('Email PPDB: Gagal generate PDF lampiran:', pdfError.message);
      // Tetap kirim email tanpa PDF jika gagal generate
    }

    const mailOptions = {
      from: `"${pengaturan.smtp_nama_pengirim || sekolah}" <${pengaturan.smtp_email_pengirim || pengaturan.smtp_user}>`,
      to: pendaftar.email,
      subject,
      html: htmlContent,
    };

    if (pdfAttachment) {
      mailOptions.attachments = [pdfAttachment];
    }

    await transporter.sendMail(mailOptions);

    console.log(`Email PPDB: Notifikasi ${statusBaru} terkirim ke ${pendaftar.email} (${pendaftar.no_pendaftaran})${pdfAttachment ? ' + PDF' : ''}`);

    // Catat log sukses
    await logEmailPpdb(db, pendaftar.id, statusBaru, pendaftar.email, subject, 'sukses', null, userId);
    return true;
  } catch (error) {
    console.error('Email PPDB: Gagal mengirim notifikasi:', error.message);

    // Catat log gagal (gunakan db yang sudah ada atau buka koneksi baru)
    try {
      const logDb = db || await getDatabase();
      await logEmailPpdb(logDb, pendaftar.id, statusBaru, pendaftar.email, '', 'gagal', error.message, userId);
    } catch (e) {
      console.error('Email PPDB: Gagal mencatat log:', e.message);
    }
    return false;
  }
}

// ─── Helper: Generate Kartu Pendaftaran sebagai buffer ───
async function generatePpdbKartuPendaftaran(pendaftar, pengaturan, kartuSettings = {}) {
  // Apply defaults for any missing kartu settings
  const ks = { ...DEFAULT_KARTU_SETTINGS, ...kartuSettings };
  const warnaUtama = ks.warna_utama;
  const warnaHeader = ks.warna_header || ks.warna_utama;
  const warnaAksen = ks.warna_aksen;
  const judulKartu = ks.judul_kartu;
  const tampilkanField = ks.tampilkan_field.split(',').map(f => f.trim()).filter(Boolean);
  const tampilkanQr = ks.tampilkan_qr === '1';

  // Generate QR code berisi no_pendaftaran
  let qrBuffer = null;
  if (tampilkanQr) {
    try {
      qrBuffer = await QRCode.toBuffer(pendaftar.no_pendaftaran, {
        type: 'png',
        margin: 2,
        width: 400,
        color: { dark: warnaUtama, light: '#FFFFFF' },
        errorCorrectionLevel: 'M',
      });
    } catch (e) {
      console.error('QR Kartu: Gagal generate:', e.message);
    }
  }

  return new Promise((resolve, reject) => {
    try {
      // Ukuran kartu: 380x580 pts (~13.4 x 20.5 cm) — proporsi vertikal seperti KTP/kartu
      const doc = new PDFDocument({ size: [380, 580], margin: 0 });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const d = pendaftar;
      const sekolah = pengaturan.nama_sekolah || 'SMA Annajah';
      const tahunAjaran = pengaturan.tahun_ajaran_aktif || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
      const pageW = doc.page.width;
      const pageH = doc.page.height;

      // ── Outer border ──
      doc.rect(6, 6, pageW - 12, pageH - 12).lineWidth(2).stroke(warnaUtama);
      doc.rect(10, 10, pageW - 20, pageH - 20).lineWidth(0.5).stroke(warnaUtama);

      // ── Header background ──
      doc.rect(12, 12, pageW - 24, 100).fill(warnaHeader);

      // ── Foto Pendaftar (jika ada) ──
      let fotoWidth = 0;
      if (d.foto) {
        const fotoFullPath = path.join(ppdbFotoDir, d.foto);
        if (fs.existsSync(fotoFullPath)) {
          try {
            const img = doc.openImage(fotoFullPath);
            const maxW = 52, maxH = 65;
            const scale = Math.min(maxW / img.width, maxH / img.height);
            const fw = img.width * scale;
            const fh = img.height * scale;
            const fx = pageW - 12 - fw - 14;
            const fy = 26 + (100 - fh) / 2;
            fotoWidth = fw + 18;
            // Lingkaran/clip area untuk foto
            doc.save();
            doc.roundedRect(fx - 3, fy - 3, fw + 6, fh + 6, 4).fill('#FFFFFF').fillOpacity(1);
            doc.image(fotoFullPath, fx, fy, { width: fw, height: fh });
            doc.roundedRect(fx - 3, fy - 3, fw + 6, fh + 6).lineWidth(1.5).stroke(warnaUtama);
            doc.restore();
            doc.fillOpacity(1);
          } catch (e) {}
        }
      }

      // ── Logo ──
      const logoPath = pengaturan.logo;
      let hasLogo = false;
      if (logoPath) {
        const fullPath = path.join(__dirname, '..', logoPath.replace(/^\//, ''));
        if (fs.existsSync(fullPath)) {
          try {
            const img = doc.openImage(fullPath);
            const maxW = 45, maxH = 45;
            const scale = Math.min(maxW / img.width, maxH / img.height);
            doc.image(fullPath, 28, 38, { width: img.width * scale, height: img.height * scale });
            hasLogo = true;
          } catch (e) {}
        }
      }

      // ── Judul Header ──
      // Jika ada foto, teks header dikurangi lebarnya
      const headerRightPad = fotoWidth > 0 ? fotoWidth : 0;
      const headerX = hasLogo ? 82 : 15;
      const headerMaxW = pageW - (hasLogo ? 97 : 30) - headerRightPad;
      const headerW = Math.max(headerMaxW, 80); // minimum 80
      doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold');
      doc.text(sekolah.toUpperCase(), headerX, 30, { width: headerW, align: hasLogo ? 'left' : 'center' });
      doc.fontSize(7).font('Helvetica');
      doc.text('PENERIMAAN PESERTA DIDIK BARU', headerX, doc.y + 2, { width: headerW, align: hasLogo ? 'left' : 'center' });
      doc.fontSize(6.5).font('Helvetica-Bold');
      doc.text(`TAHUN AJARAN ${tahunAjaran}`, headerX, doc.y + 2, { width: headerW, align: hasLogo ? 'left' : 'center' });

      // Garis pemisah header
      doc.y = 112;
      doc.moveTo(12, doc.y).lineTo(pageW - 12, doc.y).lineWidth(0.5).stroke(warnaUtama);

      // ── Title ──
      doc.y = 170;
      doc.fillColor(warnaUtama).fontSize(10).font('Helvetica-Bold');
      doc.text(judulKartu, { align: 'center' });

      // Garis bawah title
      doc.moveDown(0.2);
      const titleLineY = doc.y;
      doc.moveTo(pageW / 2 - 60, titleLineY).lineTo(pageW / 2 + 60, titleLineY).lineWidth(1).stroke(warnaUtama);
      doc.y = titleLineY + 8;

      // ── Data Diri ──
      const startY = doc.y;
      const labelW = 100;
      const rowH = 22;
      const dataStartX = 20;

      // Semua field yang tersedia
      const allFields = [
        { key: 'no_pendaftaran', label: 'No. Pendaftaran', value: `${d.no_pendaftaran} (Kode: ${d.kode_rahasia || '--'})`, mono: false, bold: true, size: 9, color: warnaUtama },
        { key: 'nisn', label: 'NISN', value: d.nisn, mono: true, size: 9 },
        { key: 'nama_lengkap', label: 'Nama Lengkap', value: d.nama_lengkap, size: 9 },
        { key: 'tempat_lahir', label: 'Tempat Lahir', value: d.tempat_lahir || '-', size: 8 },
        { key: 'tanggal_lahir', label: 'Tanggal Lahir', value: d.tanggal_lahir ? new Date(d.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-', size: 8 },
        { key: 'jenis_kelamin', label: 'Jenis Kelamin', value: d.jenis_kelamin === 'L' ? 'Laki-laki' : d.jenis_kelamin === 'P' ? 'Perempuan' : '-', size: 8 },
        { key: 'alamat', label: 'Alamat', value: d.alamat || '-', size: 7 },
        { key: 'asal_sekolah', label: 'Asal Sekolah', value: d.asal_sekolah || '-', size: 8 },
        { key: 'no_telp', label: 'No. Telepon', value: d.no_telp || '-', size: 8 },
        { key: 'email', label: 'Email', value: d.email || '-', size: 7 },
        { key: 'nama_ayah', label: 'Nama Ayah', value: d.nama_ayah || '-', size: 7 },
        { key: 'nama_ibu', label: 'Nama Ibu', value: d.nama_ibu || '-', size: 7 },
      ];

      // Filter fields sesuai settings, urutkan sesuai urutan di tampilkanField
      const dataFields = tampilkanField
        .map(key => allFields.find(f => f.key === key))
        .filter(Boolean);

      // Jika tidak ada field yang dipilih, tampilkan default (semua kecuali alamat, no_telp, email, nama_ayah, nama_ibu)
      const defaultKeys = ['no_pendaftaran', 'nisn', 'nama_lengkap', 'tempat_lahir', 'tanggal_lahir', 'jenis_kelamin', 'asal_sekolah'];
      const fieldsToRender = dataFields.length > 0 ? dataFields : allFields.filter(f => defaultKeys.includes(f.key));

      let yPos = startY;
      fieldsToRender.forEach((field, i) => {
        const bg = i % 2 === 0 ? warnaAksen : '#FFFFFF';
        doc.rect(dataStartX, yPos, pageW - dataStartX * 2, rowH).fill(bg);
        doc.fillOpacity(1);

        doc.fillColor('#6B7280').fontSize(7).font('Helvetica');
        doc.text(field.label, dataStartX + 8, yPos + 3, { width: labelW });

        doc.fillColor(field.color || '#374151').fontSize(field.size || 8).font(field.mono ? 'Courier' : (field.bold ? 'Helvetica-Bold' : 'Helvetica'));
        doc.text(String(field.value), dataStartX + labelW, yPos + 3, { width: pageW - dataStartX * 2 - labelW - 16 });
        yPos += rowH;
      });

      // Simpan posisi Y terakhir data
      const dataEndY = yPos;

      // ── QR Code (large, prominent) ──
      if (tampilkanQr && qrBuffer) {
        // Beri jarak antara data dan QR section
        const qrSectionY = dataEndY + 8;
        const qrSize = 100;
        const qrX = (pageW - qrSize) / 2;

        // Card background untuk QR
        doc.roundedRect(qrX - 10, qrSectionY - 6, qrSize + 20, qrSize + 34, 8)
          .fillOpacity(1).fill('#FFFFFF').lineWidth(1.5).stroke(warnaUtama).fillOpacity(1);
        doc.image(qrBuffer, qrX, qrSectionY, { width: qrSize, height: qrSize });

        // Label "SCAN ME" di bawah QR
        doc.fontSize(6).fillColor(warnaUtama).font('Helvetica-Bold');
        doc.text('SCAN UNTUK VERIFIKASI', qrX - 10, qrSectionY + qrSize + 4, { width: qrSize + 20, align: 'center' });

        // Teks no_pendaftaran di bawah QR
        doc.fontSize(7).fillColor('#374151').font('Courier');
        doc.text(d.no_pendaftaran, qrX - 10, qrSectionY + qrSize + 16, { width: qrSize + 20, align: 'center' });
      }

      // ── Footer ──
      doc.fillColor('#9CA3AF').fontSize(5.5).font('Helvetica');
      doc.text('Dokumen ini adalah bukti pendaftaran resmi.', 20, pageH - 35, { width: pageW - 40, align: 'center' });
      doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 20, pageH - 28, { width: pageW - 40, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
router.put('/:id/status', async (req, res) => {
  try {
    const db = await getDatabase();
    const { status, keterangan } = req.body;

    if (!['menunggu', 'diterima', 'ditolak'].includes(status)) {
      return res.status(400).json({ message: 'Status tidak valid' });
    }

    const [rows] = await db.execute('SELECT * FROM ppdb_pendaftar WHERE id = ?', [req.params.id]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    const pendaftar = rows[0];
    const statusLama = pendaftar.status;

    await db.execute(
      'UPDATE ppdb_pendaftar SET status = ?, keterangan = ? WHERE id = ?',
      [status, keterangan || null, req.params.id]
    );

    let emailSent = false;
    // Kirim email hanya jika status berubah (dari menunggu → diterima/ditolak)
    if (status !== statusLama && (status === 'diterima' || status === 'ditolak')) {
      emailSent = await sendStatusEmail(pendaftar, status, keterangan);
    }

    res.json({
      message: `Status berhasil diubah menjadi ${status}`,
      email_notified: emailSent,
      email_sent_to: emailSent ? pendaftar.email : null,
    });
  } catch (error) {
    handleError(error, req, res, 'Gagal mengupdate status');
  }
});

// DELETE /api/ppdb/:id — Hapus pendaftar (admin)
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute('SELECT * FROM ppdb_pendaftar WHERE id = ?', [req.params.id]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    // Hapus file foto jika ada
    if (rows[0].foto) {
      const fotoPath = path.join(ppdbFotoDir, rows[0].foto);
      if (fs.existsSync(fotoPath)) {
        try { fs.unlinkSync(fotoPath); } catch (e) { /* ignore */ }
      }
    }

    await db.execute('DELETE FROM ppdb_pendaftar WHERE id = ?', [req.params.id]);
    res.json({ message: 'Data berhasil dihapus' });
  } catch (error) {
    handleError(error, req, res, 'Gagal menghapus data');
  }
});

module.exports = router;
