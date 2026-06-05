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

## Konfigurasi Server (Production)

### Server 1: 192.168.1.51 (Web Server)

| Item | Detail |
|------|--------|
| **IP Address** | `192.168.1.51` |
| **Hostname** | `WebServer` |
| **OS** | Ubuntu 26.04 LTS |
| **SSH User/Password** | `root` / `it92528!@` |

#### Lokasi Aplikasi

```
/var/www/db_sas_annajah/
├── backend/        # Backend API (Express.js)
├── frontend/       # Frontend (React + Vite)
└── ...
```

#### PM2 Process

Aplikasi berjalan menggunakan **PM2** dengan nama `backend-sas`:

```bash
pm2 list                    # Lihat status
pm2 restart backend-sas     # Restart aplikasi
pm2 logs backend-sas        # Lihat log
```

#### Database MySQL

| Item | Detail |
|------|--------|
| **Host** | `192.168.1.51` |
| **Port** | `3306` |
| **Database** | `dbannajah` |
| **User** | `root` |
| **Password** | `$a$Login4dmin` |
| **Auth Plugin** | `caching_sha2_password` |
| **Versi** | MySQL 8.4.9 |

#### Service Ports

| Port | Service |
|------|---------|
| **22** | SSH |
| **80** | HTTP (Frontend) |
| **5000** | Backend API (Express) |
| **3306** | MySQL |

#### Konfigurasi Database (.env)

Lokasi: `/var/www/db_sas_annajah/backend/.env`

```env
# MySQL Database Configuration
DB_HOST=192.168.1.51
DB_PORT=3306
DB_USER=root
DB_PASS=$a$Login4dmin
DB_NAME=dbannajah
```

#### Backup Database

Untuk backup database via SSH:

```bash
# Dump ke file
mysqldump -h 192.168.1.51 -u root -p'$a$Login4dmin' dbannajah > backup_$(date +%Y%m%d).sql

# Restore dari file
mysql -h 192.168.1.51 -u root -p'$a$Login4dmin' dbannajah < backup_file.sql
```

> **Catatan:** Password mengandung karakter `$`. Di shell, gunakan **single quotes** (`'...'`) agar tidak diinterpretasikan sebagai variable.

### Server Lokal (Development)

| Item | Detail |
|------|--------|
| **Host** | `localhost` |
| **MySQL User** | `root` |
| **MySQL Password** | (kosong) |
| **Database** | `dbannajah` |
| **Backend** | `http://localhost:5000` |
| **Frontend** | `http://localhost:3000` |
| **Frontend (build)** | `http://localhost:5000` |
