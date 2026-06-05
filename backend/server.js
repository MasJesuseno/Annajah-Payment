const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (uploads seperti logo)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/siswa', require('./routes/siswa'));
app.use('/api/kelas', require('./routes/kelas'));
app.use('/api/pembayaran', require('./routes/pembayaran'));
app.use('/api/transaksi', require('./routes/transaksi'));
app.use('/api/laporan', require('./routes/laporan'));
app.use('/api/laporan', require('./routes/excel'));
app.use('/api/laporan', require('./routes/pdf'));
app.use('/api/pengaturan', require('./routes/pengaturan'));
app.use('/api/email', require('./routes/email'));
app.use('/api/users', require('./routes/users'));
app.use('/api/database', require('./routes/database'));
app.use('/api/guru', require('./routes/guru'));
app.use('/api/kehadiran', require('./routes/kehadiran'));
app.use('/api/ppdb', require('./routes/ppdb'));
app.use('/api/kehadiran-guru', require('./routes/kehadiran-guru'));
app.use('/api/ekstrakurikuler', require('./routes/ekstrakurikuler'));
app.use('/api/bimbingan-konseling', require('./routes/bimbingan-konseling'));
app.use('/api/prestasi-siswa', require('./routes/prestasi-siswa'));
app.use('/api/mata-pelajaran', require('./routes/mata-pelajaran'));
app.use('/api/periode-penilaian', require('./routes/periode-penilaian'));
app.use('/api/nilai-siswa', require('./routes/nilai-siswa'));
app.use('/api/tahun-ajaran', require('./routes/tahun-ajaran'));
app.use('/api/role-permissions', require('./routes/role-permissions'));
app.use('/api/activity-log', require('./routes/activity-log'));

// Serve frontend in production
const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendPath, 'index.html'));
  }
});

// Global error handler — pastikan semua error dikembalikan sebagai JSON
app.use((err, req, res, next) => {
  console.error('========================================');
  console.error(`[${new Date().toISOString()}] UNHANDLED ERROR: ${req.method} ${req.originalUrl}`);
  console.error(`  Message: ${err.message}`);
  if (err.stack) console.error(`  Stack: ${err.stack.split('\n').slice(0, 4).join('\n')}`);
  console.error('========================================');

  // Multer specific errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'Ukuran file melebihi batas maksimal' });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ message: err.message });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Terjadi kesalahan server',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`SMA Annajah Payment System API berjalan di port ${PORT}`);
  console.log(`Akses aplikasi di http://localhost:${PORT}`);
});
