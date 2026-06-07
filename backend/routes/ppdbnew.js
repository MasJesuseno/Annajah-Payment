const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const { getSettings } = require('../helpers/pdfHelpers');
const { enrichGps } = require('../helpers/geocodeHelper');
const { validateCaptcha } = require('../helpers/captchaHelper');
const { handleError } = require('../helpers/errorHandler');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const nodemailer = require('nodemailer');

// ─── Multer config for bukti transfer ───
const uploadBuktiTransfer = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, ppdbFotoDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `bukti_transfer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(ext)) {
      return cb(new Error('Format file tidak didukung. Gunakan .jpg, .png, .webp, atau .pdf.'));
    }
    cb(null, true);
  },
});

// ─── Static foto & bukti transfer ───
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

router.get('/bukti-transfer/:filename', async (req, res) => {
  try {
    const filePath = path.join(ppdbFotoDir, req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Bukti transfer tidak ditemukan' });
    }
    res.sendFile(filePath);
  } catch (error) {
    handleError(error, req, res, 'Gagal memuat bukti transfer');
  }
});

// ─── Multer config for registration photo ───
if (!fs.existsSync(ppdbFotoDir)) {
  fs.mkdirSync(ppdbFotoDir, { recursive: true });
}

const daftarFotoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ppdbFotoDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `ppdbnew_daftar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
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

// ─── Helper: Generate nomor pendaftaran ───
async function generateNoPendaftaran(db) {
  const now = new Date();
  const year = now.getFullYear();
  const prefix = `PPDB${year}`;
  const [rows] = await db.execute(
    'SELECT no_pendaftaran FROM ppdb_pendaftar WHERE no_pendaftaran LIKE ? ORDER BY id DESC LIMIT 1',
    [`${prefix}%`]
  );
  let nextNum = 1;
  if (rows[0]?.no_pendaftaran) {
    const lastNum = parseInt(rows[0].no_pendaftaran.slice(prefix.length), 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }
  return `${prefix}${String(nextNum).padStart(6, '0')}`;
}

// ─── Helper: Kirim email setelah pendaftaran ───
async function kirimEmailPendaftaran(pendaftar, pengaturan) {
  try {
    if (!pengaturan.smtp_host || !pengaturan.smtp_user || !pengaturan.smtp_pass) {
      console.log('ppdbnew: SMTP belum dikonfigurasi, lewati email');
      return false;
    }
    if (!pendaftar.email) return false;

    const sekolah = pengaturan.nama_sekolah || 'SMA Annajah';
    const tahunAjaran = pengaturan.tahun_ajaran_aktif || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

    const transporter = nodemailer.createTransport({
      host: pengaturan.smtp_host,
      port: parseInt(pengaturan.smtp_port || '587'),
      secure: parseInt(pengaturan.smtp_port || '587') === 465,
      auth: { user: pengaturan.smtp_user, pass: pengaturan.smtp_pass },
    });

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
      Terima kasih telah mendaftar di <strong>${sekolah}</strong>.
      Berikut adalah data pendaftaran Anda:
    </p>
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 40%; border-bottom: 1px solid #e5e7eb;">No. Pendaftaran</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 15px;">${pendaftar.no_pendaftaran}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Kode Rahasia</td>
          <td style="padding: 8px 0; color: #d97706; font-weight: 700; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 15px;">${pendaftar.kode_rahasia}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">NISN</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 600; border-bottom: 1px solid #e5e7eb;">${pendaftar.nisn}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Nama Lengkap</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${pendaftar.nama_lengkap}</td>
        </tr>
      </table>
    </div>
    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
      <p style="margin: 0; font-size: 13px; color: #92400e; font-weight: 600;">📌 Simpan Informasi Berikut:</p>
      <p style="margin: 8px 0 0; font-size: 13px; color: #92400e; line-height: 1.6;">
        Gunakan <strong>Nomor Pendaftaran</strong> dan <strong>Kode Rahasia</strong> untuk:
      </p>
      <ul style="margin: 6px 0 0; padding-left: 20px; font-size: 12px; color: #92400e; line-height: 1.8;">
        <li>Mengedit data pendaftaran jika ada kesalahan</li>
        <li>Mengunggah ulang foto</li>
        <li>Melihat hasil seleksi</li>
        <li>Mencetak kartu pendaftaran</li>
      </ul>
    </div>
    <p style="font-size: 12px; color: #6b7280; line-height: 1.6;">
      Status pendaftaran Anda saat ini: <strong style="color: #d97706;">MENUNGGU VERIFIKASI</strong>.
      Kami akan mengirimkan notifikasi jika status berubah.
    </p>
  </div>
  <div style="border-top: 1px solid #e2e8f0; padding: 20px 35px; text-align: center;">
    <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.6;">
      Email ini dikirim otomatis oleh <strong>Sistem PPDB ${sekolah}</strong><br/>
      ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    </p>
  </div>
  <div style="height: 6px; background: linear-gradient(90deg, #059669, #10b981, #34d399, #10b981, #059669);"></div>
</div>`;

    await transporter.sendMail({
      from: `"${pengaturan.smtp_nama_pengirim || sekolah}" <${pengaturan.smtp_email_pengirim || pengaturan.smtp_user}>`,
      to: pendaftar.email,
      subject: `Pendaftaran Berhasil - ${pendaftar.no_pendaftaran} | ${sekolah}`,
      html: htmlContent,
    });

    console.log(`ppdbnew: Email pendaftaran terkirim ke ${pendaftar.email}`);
    return true;
  } catch (error) {
    console.error('ppdbnew: Gagal kirim email:', error.message);
    return false;
  }
}

// ─── POST /api/ppdbnew/daftar — Pendaftaran baru ───
router.post('/daftar', (req, res, next) => {
  uploadDaftarFoto.single('foto')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'Ukuran file foto maksimal 2MB' });
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

    // Validasi captcha
    if (!validateCaptcha(captcha_token, captcha_answer)) {
      return res.status(400).json({
        message: 'Captcha salah. Silakan muat ulang halaman dan coba lagi.',
        captchaError: true,
      });
    }

    // Validasi wajib (termasuk email)
    if (!nisn || !nama_lengkap || !no_telp || !email) {
      return res.status(400).json({
        message: 'NISN, Nama Lengkap, No. Telepon, dan Email harus diisi',
      });
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Format email tidak valid' });
    }

    // Cek duplikat NISN — tampilkan nama pendaftar yang sudah terdaftar
    const [existing] = await db.execute(
      'SELECT id, no_pendaftaran, nama_lengkap, status FROM ppdb_pendaftar WHERE nisn = ?',
      [nisn]
    );
    if (existing[0]) {
      return res.status(400).json({
        message: `NISN ${nisn} sudah terdaftar atas nama "${existing[0].nama_lengkap}" dengan No. Pendaftaran ${existing[0].no_pendaftaran} (Status: ${existing[0].status}). Pendaftaran ditolak.`,
        nisnTerdaftar: true,
        existingData: {
          nama: existing[0].nama_lengkap,
          no_pendaftaran: existing[0].no_pendaftaran,
          status: existing[0].status,
        },
      });
    }

    // Generate nomor pendaftaran
    const no_pendaftaran = await generateNoPendaftaran(db);

    // Normalisasi jenis kelamin
    let jk = null;
    if (jenis_kelamin) {
      const upper = jenis_kelamin.toUpperCase();
      if (upper === 'LAKI-LAKI' || upper === 'LAKI' || upper === 'L') jk = 'L';
      else if (upper === 'PEREMPUAN' || upper === 'WANITA' || upper === 'P') jk = 'P';
      else jk = jenis_kelamin;
    }

    let tglLahir = tanggal_lahir || null;
    if (tglLahir && typeof tglLahir === 'string' && tglLahir.includes('T')) tglLahir = tglLahir.split('T')[0];

    // Generate kode rahasia 6 digit
    let kode_rahasia;
    let kodeUnik = false;
    for (let percobaan = 1; percobaan <= 10; percobaan++) {
      kode_rahasia = String(Math.floor(100000 + Math.random() * 900000));
      const [cekKode] = await db.execute('SELECT id FROM ppdb_pendaftar WHERE kode_rahasia = ?', [kode_rahasia]);
      if (!cekKode[0]) { kodeUnik = true; break; }
    }
    if (!kodeUnik) {
      return res.status(500).json({ message: 'Gagal menghasilkan kode rahasia unik. Silakan coba lagi.' });
    }

    // Enrich GPS
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
      [no_pendaftaran, kode_rahasia, nisn, nama_lengkap, tempat_lahir || null,
        tglLahir, jk, alamat || null, asal_sekolah || null,
        no_telp, email, nama_ayah || null, nama_ibu || null, gpsEnriched]
    );

    // Handle foto
    let fotoFilename = null;
    if (req.file) {
      try {
        const [insertResult] = await db.execute('SELECT LAST_INSERT_ID() as id');
        const pendaftarId = insertResult[0].id;
        const ext = path.extname(req.file.originalname).toLowerCase();
        const newFilename = `ppdbnew_${pendaftarId}_${Date.now()}${ext}`;
        const newPath = path.join(ppdbFotoDir, newFilename);
        fs.renameSync(req.file.path, newPath);
        fotoFilename = newFilename;
        await db.execute('UPDATE ppdb_pendaftar SET foto = ? WHERE id = ?', [fotoFilename, pendaftarId]);
      } catch (fotoErr) {
        console.error('ppdbnew: Gagal menyimpan foto:', fotoErr.message);
        if (req.file && fs.existsSync(req.file.path)) {
          try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
      }
    }

    // Kirim email notifikasi pendaftaran
    const pengaturan = await getSettings(db);
    const emailTerkirim = await kirimEmailPendaftaran({
      no_pendaftaran, kode_rahasia, nisn, nama_lengkap, email,
    }, pengaturan);

    res.status(201).json({
      message: 'Pendaftaran berhasil! Silakan cek email Anda untuk detail pendaftaran.',
      no_pendaftaran,
      kode_rahasia,
      foto: fotoFilename,
      email_terkirim: emailTerkirim,
      email: email,
    });
  } catch (error) {
    handleError(error, req, res, 'Gagal mendaftarkan PPDB');
  }
});

// ─── GET /api/ppdbnew/cek/:no_pendaftaran — Cek hasil pendaftaran ───
router.get('/cek/:no_pendaftaran', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute(
      `SELECT id, no_pendaftaran, nisn, nama_lengkap, tempat_lahir,
              tanggal_lahir, jenis_kelamin, asal_sekolah, alamat, no_telp, email,
              nama_ayah, nama_ibu, nilai,
              status, keterangan, created_at, foto, kode_rahasia, bukti_transfer,
              status_pembayaran
       FROM ppdb_pendaftar WHERE no_pendaftaran = ?`,
      [req.params.no_pendaftaran]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: 'Nomor pendaftaran tidak ditemukan' });
    }

    const data = rows[0];

    // Validasi kode rahasia
    const kodeInput = req.query.kode_rahasia;
    if (!kodeInput || kodeInput !== data.kode_rahasia) {
      return res.status(404).json({ message: 'Nomor pendaftaran atau kode rahasia tidak valid' });
    }

    const statusLabel = {
      menunggu: 'Menunggu Verifikasi',
      diterima: 'Diterima',
      ditolak: 'Ditolak',
    };

    res.json({
      id: data.id,
      no_pendaftaran: data.no_pendaftaran,
      nisn: data.nisn,
      nama_lengkap: data.nama_lengkap,
      tempat_lahir: data.tempat_lahir,
      tanggal_lahir: data.tanggal_lahir,
      jenis_kelamin: data.jenis_kelamin === 'L' ? 'Laki-laki' : data.jenis_kelamin === 'P' ? 'Perempuan' : '-',
      asal_sekolah: data.asal_sekolah,
      alamat: data.alamat,
      no_telp: data.no_telp,
      email: data.email,
      nama_ayah: data.nama_ayah,
      nama_ibu: data.nama_ibu,
      nilai: data.nilai,
      status: data.status,
      status_label: statusLabel[data.status] || data.status,
      keterangan: data.keterangan,
      tanggal_daftar: data.created_at,
      foto: data.foto,
      bukti_transfer: data.bukti_transfer,
      status_pembayaran: data.status_pembayaran || 'belum_lunas',
    });
  } catch (error) {
    handleError(error, req, res, 'Gagal memeriksa pendaftaran');
  }
});

// ─── PUT /api/ppdbnew/edit/:no_pendaftaran — Edit data pendaftar ───
router.put('/edit/:no_pendaftaran', async (req, res) => {
  try {
    const db = await getDatabase();
    const { kode_rahasia, ...data } = req.body;

    // Cari pendaftar
    const [rows] = await db.execute(
      'SELECT * FROM ppdb_pendaftar WHERE no_pendaftaran = ?',
      [req.params.no_pendaftaran]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: 'Data pendaftar tidak ditemukan' });
    }

    const pendaftar = rows[0];

    // Validasi kode rahasia
    if (!kode_rahasia || kode_rahasia !== pendaftar.kode_rahasia) {
      return res.status(403).json({ message: 'Kode rahasia tidak valid' });
    }

    // Validasi field yang boleh diedit
    const allowedFields = [
      'nama_lengkap', 'tempat_lahir', 'tanggal_lahir',
      'jenis_kelamin', 'alamat', 'asal_sekolah', 'no_telp',
      'nama_ayah', 'nama_ibu'
    ];

    const updates = [];
    const params = [];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        // Normalisasi jenis kelamin
        if (field === 'jenis_kelamin' && data[field]) {
          const upper = data[field].toUpperCase();
          if (upper === 'LAKI-LAKI' || upper === 'LAKI' || upper === 'L') {
            updates.push('jenis_kelamin = ?');
            params.push('L');
            continue;
          } else if (upper === 'PEREMPUAN' || upper === 'WANITA' || upper === 'P') {
            updates.push('jenis_kelamin = ?');
            params.push('P');
            continue;
          }
        }
        // Sanitize date
        if (field === 'tanggal_lahir' && data[field] && typeof data[field] === 'string' && data[field].includes('T')) {
          updates.push('tanggal_lahir = ?');
          params.push(data[field].split('T')[0]);
          continue;
        }
        updates.push(`${field} = ?`);
        params.push(data[field] === '' ? null : data[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Tidak ada data yang diubah' });
    }

    // Jangan izinkan edit NISN
    if (data.nisn !== undefined && data.nisn !== pendaftar.nisn) {
      return res.status(400).json({ message: 'NISN tidak dapat diubah. Hubungi admin jika ada kesalahan.' });
    }
    // Jangan izinkan edit email
    if (data.email !== undefined && data.email !== pendaftar.email) {
      return res.status(400).json({ message: 'Email tidak dapat diubah. Hubungi admin jika ada kesalahan.' });
    }

    params.push(req.params.no_pendaftaran);
    await db.execute(
      `UPDATE ppdb_pendaftar SET ${updates.join(', ')} WHERE no_pendaftaran = ?`,
      params
    );

    res.json({ message: 'Data pendaftaran berhasil diperbarui' });
  } catch (error) {
    handleError(error, req, res, 'Gagal mengupdate data');
  }
});

// ─── PUT /api/ppdbnew/bukti-transfer/:no_pendaftaran — Upload bukti transfer ───
router.put('/bukti-transfer/:no_pendaftaran', (req, res, next) => {
  uploadBuktiTransfer.single('bukti_transfer')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'Ukuran file bukti transfer maksimal 2MB' });
      return res.status(400).json({ message: err.message || 'File bukti transfer tidak valid' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const db = await getDatabase();
    const { kode_rahasia } = req.body;

    const [rows] = await db.execute(
      'SELECT * FROM ppdb_pendaftar WHERE no_pendaftaran = ?',
      [req.params.no_pendaftaran]
    );

    if (!rows[0]) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch (e) {} }
      return res.status(404).json({ message: 'Data pendaftar tidak ditemukan' });
    }

    const pendaftar = rows[0];

    if (!kode_rahasia || kode_rahasia !== pendaftar.kode_rahasia) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch (e) {} }
      return res.status(403).json({ message: 'Kode rahasia tidak valid' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diupload' });
    }

    // Hapus bukti transfer lama
    if (pendaftar.bukti_transfer) {
      const oldPath = path.join(ppdbFotoDir, pendaftar.bukti_transfer);
      if (fs.existsSync(oldPath)) { try { fs.unlinkSync(oldPath); } catch (e) {} }
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const newFilename = `bukti_transfer_${pendaftar.id}_${Date.now()}${ext}`;
    const newPath = path.join(ppdbFotoDir, newFilename);
    fs.renameSync(req.file.path, newPath);

    await db.execute('UPDATE ppdb_pendaftar SET bukti_transfer = ? WHERE no_pendaftaran = ?', [newFilename, req.params.no_pendaftaran]);

    res.json({ message: 'Bukti transfer berhasil diupload', bukti_transfer: newFilename });
  } catch (error) {
    if (req.file) { try { fs.unlinkSync(req.file.path); } catch (e) {} }
    handleError(error, req, res, 'Gagal mengupload bukti transfer');
  }
});

// ─── PUT /api/ppdbnew/foto/:no_pendaftaran — Upload ulang foto ───
router.put('/foto/:no_pendaftaran', (req, res, next) => {
  uploadDaftarFoto.single('foto')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'Ukuran file foto maksimal 2MB' });
      return res.status(400).json({ message: err.message || 'File foto tidak valid' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const db = await getDatabase();
    const { kode_rahasia } = req.body;

    const [rows] = await db.execute(
      'SELECT * FROM ppdb_pendaftar WHERE no_pendaftaran = ?',
      [req.params.no_pendaftaran]
    );

    if (!rows[0]) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch (e) {} }
      return res.status(404).json({ message: 'Data pendaftar tidak ditemukan' });
    }

    const pendaftar = rows[0];

    // Validasi kode rahasia
    if (!kode_rahasia || kode_rahasia !== pendaftar.kode_rahasia) {
      if (req.file) { try { fs.unlinkSync(req.file.path); } catch (e) {} }
      return res.status(403).json({ message: 'Kode rahasia tidak valid' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada file yang diupload' });
    }

    // Hapus foto lama
    if (pendaftar.foto) {
      const oldPath = path.join(ppdbFotoDir, pendaftar.foto);
      if (fs.existsSync(oldPath)) { try { fs.unlinkSync(oldPath); } catch (e) {} }
    }

    // Simpan foto baru
    const ext = path.extname(req.file.originalname).toLowerCase();
    const newFilename = `ppdbnew_${pendaftar.id}_${Date.now()}${ext}`;
    const newPath = path.join(ppdbFotoDir, newFilename);
    fs.renameSync(req.file.path, newPath);

    await db.execute('UPDATE ppdb_pendaftar SET foto = ? WHERE no_pendaftaran = ?', [newFilename, req.params.no_pendaftaran]);

    res.json({ message: 'Foto berhasil diperbarui', foto: newFilename });
  } catch (error) {
    if (req.file) { try { fs.unlinkSync(req.file.path); } catch (e) {} }
    handleError(error, req, res, 'Gagal mengupload foto');
  }
});

// ─── GET /api/ppdbnew/cetak-kartu/:no_pendaftaran — Cetak kartu pendaftaran ───
router.get('/cetak-kartu/:no_pendaftaran', async (req, res) => {
  try {
    const db = await getDatabase();
    const [rows] = await db.execute('SELECT * FROM ppdb_pendaftar WHERE no_pendaftaran = ?', [req.params.no_pendaftaran]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Data tidak ditemukan' });
    }

    const pendaftar = rows[0];
    const pengaturan = await getSettings(db);

    // Generate QR code
    let qrBuffer = null;
    try {
      const d = pendaftar;
      const sekolah = pengaturan.nama_sekolah || 'SMA Annajah';
      const statusLabel = d.status === 'diterima' ? 'DITERIMA' : d.status === 'ditolak' ? 'DITOLAK' : 'MENUNGGU VERIFIKASI';
      const qrContent = [
        `PPDB ${sekolah}`,
        `No: ${d.no_pendaftaran}`,
        `NISN: ${d.nisn}`,
        `Nama: ${d.nama_lengkap}`,
        `Kode: ${d.kode_rahasia}`,
        `Status: ${statusLabel}`,
      ].filter(Boolean).join('\n');
      qrBuffer = await QRCode.toBuffer(qrContent, {
        type: 'png', margin: 2, width: 300,
        color: { dark: '#15803D', light: '#FFFFFF' },
        errorCorrectionLevel: 'M',
      });
    } catch (e) {
      console.error('QR Code error:', e.message);
    }

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=kartu_ppdb_${pendaftar.no_pendaftaran}.pdf`);
      res.send(pdfBuffer);
    });

    const sekolah = pengaturan.nama_sekolah || 'SMA Annajah';
    const alamatLengkap = [pengaturan.alamat_sekolah, pengaturan.kota, pengaturan.provinsi].filter(Boolean).join(', ');
    const tahunAjaran = pengaturan.tahun_ajaran_aktif || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
    const pageWidth = doc.page.width - 60;
    const pageHeight = doc.page.height - 60;

    // ─── Background ───
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f0fdf4');
    doc.rect(15, 15, doc.page.width - 30, doc.page.height - 30).fill('#ffffff').stroke('#15803D');

    // ─── Left Side: Photo & QR ───
    // Photo
    let fotoY = 50;
    if (pendaftar.foto) {
      const fotoFullPath = path.join(ppdbFotoDir, pendaftar.foto);
      if (fs.existsSync(fotoFullPath)) {
        try {
          const img = doc.openImage(fotoFullPath);
          const maxW = 110, maxH = 140;
          const scale = Math.min(maxW / img.width, maxH / img.height);
          const fw = img.width * scale, fh = img.height * scale;
          const fx = 45 + (110 - fw) / 2, fy = 50 + (140 - fh) / 2;
          doc.rect(40, 45, 120, 150).fill('#f8fafc').stroke('#15803D');
          doc.image(fotoFullPath, fx, fy, { width: fw, height: fh });
          fotoY = 45 + 150 + 15;
        } catch (e) {}
      }
    } else {
      doc.rect(40, 45, 120, 150).fill('#f8fafc').stroke('#15803D');
      doc.fontSize(10).fillColor('#9CA3AF').font('Helvetica').text('(foto)', 40, 110, { width: 120, align: 'center' });
      fotoY = 45 + 150 + 15;
    }

    // QR Code
    if (qrBuffer) {
      const qrSize = 80;
      const qrX = 40 + (120 - qrSize) / 2;
      doc.image(qrBuffer, qrX, fotoY + 5, { width: qrSize, height: qrSize });
      doc.fontSize(5.5).fillColor('#15803D').font('Helvetica').text('Scan untuk verifikasi', 40, fotoY + qrSize + 8, { width: 120, align: 'center' });
    }

    // ─── Right Side: Data ───
    const textX = 180;
    const textW = pageWidth - 180;

    // Header
    doc.fontSize(16).fillColor('#15803D').font('Helvetica-Bold');
    doc.text(sekolah, textX, 40, { width: textW });
    doc.fontSize(8).fillColor('#6B7280').font('Helvetica');
    doc.text(`NPSN: ${pengaturan.npsn || '-'} | ${alamatLengkap}`, textX, doc.y, { width: textW });

    // Kontak
    const kontakParts = [];
    if (pengaturan.no_telp) kontakParts.push(`Telp: ${pengaturan.no_telp}`);
    if (pengaturan.email) kontakParts.push(`Email: ${pengaturan.email}`);
    if (pengaturan.website) kontakParts.push(pengaturan.website);
    if (kontakParts.length > 0) {
      doc.fontSize(7).fillColor('#9CA3AF').font('Helvetica');
      doc.text(kontakParts.join('  |  '), textX, doc.y, { width: textW });
    }

    doc.moveDown(0.5);
    const lineY = doc.y;
    doc.moveTo(textX, lineY).lineTo(doc.page.width - 30, lineY).stroke('#15803D');
    doc.y = lineY + 8;

    // Title
    doc.fontSize(13).fillColor('#374151').font('Helvetica-Bold');
    doc.text('KARTU PENDAFTARAN PPDB', textX, doc.y, { width: textW, align: 'center' });
    doc.fontSize(9).fillColor('#6B7280').font('Helvetica');
    doc.text(`Tahun Ajaran ${tahunAjaran}`, textX, doc.y, { width: textW, align: 'center' });
    doc.moveDown(0.8);

    // Status badge
    const statusColor = pendaftar.status === 'diterima' ? '#059669' : pendaftar.status === 'ditolak' ? '#DC2626' : '#D97706';
    const statusBg = pendaftar.status === 'diterima' ? '#D1FAE5' : pendaftar.status === 'ditolak' ? '#FEE2E2' : '#FEF3C7';
    const statusLabel = pendaftar.status === 'diterima' ? 'DITERIMA' : pendaftar.status === 'ditolak' ? 'DITOLAK' : 'MENUNGGU VERIFIKASI';

    doc.roundedRect(textX + textW - 110, doc.y - 12, 110, 20, 10).fill(statusBg);
    doc.fillColor(statusColor).fontSize(9).font('Helvetica-Bold');
    doc.text(statusLabel, textX + textW - 105, doc.y - 8, { width: 100, align: 'center' });

    doc.moveDown(0.5);

    // Data fields
    const fields = [
      ['No. Pendaftaran', pendaftar.no_pendaftaran, true],
      ['Kode Rahasia', pendaftar.kode_rahasia, true],
      ['NISN', pendaftar.nisn, false],
      ['Nama Lengkap', pendaftar.nama_lengkap, false],
      ['Tempat Lahir', pendaftar.tempat_lahir || '-', false],
      ['Tanggal Lahir', pendaftar.tanggal_lahir ? new Date(pendaftar.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-', false],
      ['Jenis Kelamin', pendaftar.jenis_kelamin === 'L' ? 'Laki-laki' : pendaftar.jenis_kelamin === 'P' ? 'Perempuan' : '-', false],
      ['Alamat', pendaftar.alamat || '-', false],
      ['Asal Sekolah', pendaftar.asal_sekolah || '-', false],
      ['No. Telepon', pendaftar.no_telp || '-', false],
      ['Email', pendaftar.email || '-', false],
      ['Nama Ayah', pendaftar.nama_ayah || '-', false],
      ['Nama Ibu', pendaftar.nama_ibu || '-', false],
      ['Status Pembayaran', pendaftar.status_pembayaran === 'lunas' ? 'Lunas' : 'Belum Lunas', false],
    ];

    const rowH = 16;
    const labelW = 100;
    const valueW = textW - labelW - 10;
    let yPos = doc.y + 5;

    fields.forEach(([label, value, mono], i) => {
      const bg = i % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
      doc.rect(textX, yPos, textW, rowH).fill(bg).fillOpacity(1);
      doc.fillColor('#6B7280').fontSize(7.5).font('Helvetica');
      doc.text(label, textX + 5, yPos + 4, { width: labelW });
      doc.fillColor('#374151').fontSize(7.5).font(mono ? 'Courier' : 'Helvetica');
      doc.text(String(value), textX + labelW + 5, yPos + 4, { width: valueW });
      yPos += rowH;
    });

    // Footer
    doc.y = Math.max(yPos + 10, doc.page.height - 60);
    doc.moveTo(textX, doc.y).lineTo(doc.page.width - 30, doc.y).stroke('#E5E7EB');
    doc.moveDown(0.3);
    doc.fontSize(6).fillColor('#9CA3AF').font('Helvetica');
    doc.text('Kartu ini adalah bukti pendaftaran resmi. Simpan sebagai bukti pendaftaran.', textX, doc.y, { width: textW, align: 'center' });
    doc.fontSize(5.5);
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, textX, doc.y, { width: textW, align: 'center' });

    doc.end();
  } catch (error) {
    handleError(error, req, res, 'Gagal mencetak kartu pendaftaran');
  }
});

module.exports = router;
