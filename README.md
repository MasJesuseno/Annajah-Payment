# SMA Annajah - Sistem Administrasi Sekolah

Aplikasi web manajemen pembayaran untuk SMA Annajah. Dibangun dengan **Node.js + Express + React**.

## Fitur

- 🔐 **Autentikasi** - Login multi-user (Admin & Bendahara)
- 📊 **Dashboard** - Ringkasan data pembayaran real-time
- 👨‍🎓 **Manajemen Siswa** - CRUD data siswa dengan pencarian & filter
- 🏫 **Manajemen Kelas** - Kelola kelas per tingkat (X, XI, XII)
- 💳 **Jenis Pembayaran** - Atur SPP, gedung, ujian, buku, dll
- 💰 **Transaksi** - Catat pembayaran dengan kwitansi otomatis
- 📈 **Laporan** - Rekap per jenis, grafik per bulan, riwayat per siswa
- 📄 **Cetak Kwitansi** - Kwitansi PDF siap cetak
- 🔍 **Cek Status SPP** - Lihat bulan lunas/belum per siswa

## Persyaratan

- Node.js 18+
- NPM

## Instalasi & Menjalankan

### 1. Clone/Extract project
```bash
cd Annajah/sma-annajah-payment
```

### 2. Install Backend
```bash
cd backend
npm install
npm start
```
Backend berjalan di `http://localhost:5000`

### 3. Install Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend berjalan di `http://localhost:3000`

### 4. Build untuk production
```bash
cd frontend
npm run build
```
Kemudian akses melalui backend di `http://localhost:5000`

## Akun Demo

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Bendahara | bendahara | bendahara123 |

## Struktur Database

- **users** - Data pengguna
- **kelas** - Data kelas
- **siswa** - Data siswa
- **jenis_pembayaran** - Jenis pembayaran (SPP, dll)
- **transaksi** - Riwayat pembayaran
- **pengaturan** - Pengaturan sekolah

## API Endpoints

- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Profile user
- `GET/POST/PUT/DELETE /api/siswa` - CRUD siswa
- `GET/POST/PUT/DELETE /api/kelas` - CRUD kelas
- `GET/POST/PUT/DELETE /api/pembayaran` - CRUD jenis pembayaran
- `GET/POST/DELETE /api/transaksi` - Transaksi
- `GET /api/transaksi/cek-spp/:id` - Cek SPP siswa
- `GET /api/laporan/rekap` - Rekap laporan
- `GET /api/laporan/per-bulan` - Laporan per bulan
- `GET /api/laporan/dashboard` - Dashboard
- `GET /api/laporan/kwitansi/:id` - Cetak kwitansi PDF
