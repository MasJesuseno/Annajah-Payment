require('dotenv').config();

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: 'dbannajah',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let pool;
let initPromise = null;

async function getDatabase() {
  if (!pool) {
    // Guard against race condition: if another call is already initializing, wait for it
    if (!initPromise) {
      initPromise = (async () => {
        // First connect without database to create it if needed
        const initConn = await mysql.createConnection({
          host: DB_CONFIG.host,
          port: DB_CONFIG.port,
          user: DB_CONFIG.user,
          password: DB_CONFIG.password,
        });
        await initConn.execute(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await initConn.end();

        // Create the connection pool
        pool = mysql.createPool(DB_CONFIG);
        await initDatabase();
        await seedData();
      })();
    }
    try {
      await initPromise;
    } catch (err) {
      // Jika inisialisasi gagal, reset agar request berikutnya bisa mencoba lagi
      initPromise = null;
      pool = null;
      throw err;
    }
  }
  return pool;
}

async function initDatabase() {
  const conn = await pool.getConnection();
  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        nama VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS kelas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_kelas VARCHAR(100) NOT NULL,
        tingkat VARCHAR(10) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS siswa (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nis VARCHAR(50) UNIQUE NOT NULL,
        nisn VARCHAR(50),
        nama VARCHAR(255) NOT NULL,
        jenis_kelamin CHAR(1) CHECK(jenis_kelamin IN ('L', 'P')),
        tempat_lahir VARCHAR(255),
        tanggal_lahir DATE,
        alamat TEXT,
        no_telp VARCHAR(50),
        email VARCHAR(255),
        foto VARCHAR(255),
        asal_sekolah VARCHAR(255),
        id_kelas INT,
        status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'lulus', 'keluar')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_kelas) REFERENCES kelas(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS jenis_pembayaran (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_pembayaran VARCHAR(255) NOT NULL,
        tahun_ajaran VARCHAR(20) NOT NULL,
        nominal DOUBLE NOT NULL,
        periode VARCHAR(20) DEFAULT 'bulanan',
        keterangan TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS transaksi (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_siswa INT NOT NULL,
        id_jenis_pembayaran INT NOT NULL,
        jumlah_bayar DOUBLE NOT NULL,
        bulan_bayar VARCHAR(20),
        tanggal_bayar DATE DEFAULT (CURDATE()),
        keterangan TEXT,
        id_user INT,
        no_kwitansi VARCHAR(100) UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_siswa) REFERENCES siswa(id) ON DELETE CASCADE,
        FOREIGN KEY (id_jenis_pembayaran) REFERENCES jenis_pembayaran(id) ON DELETE CASCADE,
        FOREIGN KEY (id_user) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS guru (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nik VARCHAR(50) UNIQUE,
        nuptk VARCHAR(50),
        nama VARCHAR(255) NOT NULL,
        jenis_kelamin CHAR(1) CHECK(jenis_kelamin IN ('L', 'P')),
        tempat_lahir VARCHAR(255),
        tanggal_lahir DATE,
        alamat TEXT,
        no_telp VARCHAR(50),
        foto VARCHAR(255),
        id_user INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_user) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add foto_masuk & foto_keluar columns to kehadiran_guru if not exists (for migration)
    try {
      await conn.execute(`ALTER TABLE kehadiran_guru ADD COLUMN foto_masuk VARCHAR(255) DEFAULT NULL`);
    } catch (e) {}
    try {
      await conn.execute(`ALTER TABLE kehadiran_guru ADD COLUMN foto_keluar VARCHAR(255) DEFAULT NULL`);
    } catch (e) {}

    // Add id_wali column to kelas if not exists
    try {
      await conn.execute(`ALTER TABLE kelas ADD COLUMN id_wali INT DEFAULT NULL`);
    } catch (e) {
      // Column already exists
    }

    // Add nuptk column to guru if not exists
    try {
      await conn.execute(`ALTER TABLE guru ADD COLUMN nuptk VARCHAR(50) DEFAULT NULL`);
    } catch (e) {
      // Column already exists
    }

    // Add jenis_karyawan column to guru if not exists
    try {
      await conn.execute(`ALTER TABLE guru ADD COLUMN jenis_karyawan VARCHAR(50) DEFAULT 'Guru'`);
    } catch (e) {
      // Column already exists
    }

    // Add jenis_transaksi column to transaksi if not exists
    try {
      await conn.execute(`ALTER TABLE transaksi ADD COLUMN jenis_transaksi ENUM('Masuk','Keluar') DEFAULT 'Masuk'`);
    } catch (e) {}

    // Make id_siswa nullable in transaksi for pengeluaran (Keluar) transactions
    try {
      await conn.execute(`ALTER TABLE transaksi MODIFY COLUMN id_siswa INT NULL`);
    } catch (e) {}

    // Add ppdb_access column to users for PPDB menu access control
    try {
      await conn.execute(`ALTER TABLE users ADD COLUMN ppdb_access TINYINT(1) DEFAULT 0`);
    } catch (e) {}

    // Add status column to jenis_pembayaran
    try {
      await conn.execute(`ALTER TABLE jenis_pembayaran ADD COLUMN status ENUM('aktif','tidak_aktif') DEFAULT 'aktif'`);
    } catch (e) {}

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS mata_pelajaran (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_pelajaran VARCHAR(255) NOT NULL,
        id_kelas INT NOT NULL,
        id_guru INT NOT NULL,
        status ENUM('aktif','tidak_aktif') DEFAULT 'aktif',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_kelas) REFERENCES kelas(id) ON DELETE CASCADE,
        FOREIGN KEY (id_guru) REFERENCES guru(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Auto-create Pengeluaran jenis_pembayaran
    try {
      const [existing] = await conn.execute(`SELECT id FROM jenis_pembayaran WHERE nama_pembayaran = 'Pengeluaran' LIMIT 1`);
      if (existing.length === 0) {
        await conn.execute(
          `INSERT INTO jenis_pembayaran (nama_pembayaran, tahun_ajaran, nominal, periode, keterangan) VALUES (?, ?, ?, ?, ?)`,
          ['Pengeluaran', '2024/2025', 0, 'sekali', 'Transaksi pengeluaran / biaya operasional']
        );
      }
    } catch (e) {}

    // Auto-create Pemasukan Non-Siswa jenis_pembayaran
    try {
      const [existing] = await conn.execute(`SELECT id FROM jenis_pembayaran WHERE nama_pembayaran = 'Pemasukan Non-Siswa' LIMIT 1`);
      if (existing.length === 0) {
        await conn.execute(
          `INSERT INTO jenis_pembayaran (nama_pembayaran, tahun_ajaran, nominal, periode, keterangan) VALUES (?, ?, ?, ?, ?)`,
          ['Pemasukan Non-Siswa', '2024/2025', 0, 'sekali', 'Pemasukan dari sumber non-siswa / umum']
        );
      }
    } catch (e) {}

    // Add email column to siswa if not exists
    try {
      await conn.execute(`ALTER TABLE siswa ADD COLUMN email VARCHAR(255) DEFAULT NULL`);
    } catch (e) {}

    // Add asal_sekolah columns to siswa if not exists
    try {
      await conn.execute(`ALTER TABLE siswa ADD COLUMN asal_sekolah VARCHAR(255) DEFAULT NULL`);
    } catch (e) {}
    try {
      await conn.execute(`ALTER TABLE siswa ADD COLUMN alamat_sekolah TEXT DEFAULT NULL`);
    } catch (e) {}
    try {
      await conn.execute(`ALTER TABLE siswa ADD COLUMN kota_asal_sekolah VARCHAR(255) DEFAULT NULL`);
    } catch (e) {}

    // Add universitas & jurusan columns to siswa for alumni tracking
    try {
      await conn.execute(`ALTER TABLE siswa ADD COLUMN universitas VARCHAR(255) DEFAULT NULL`);
    } catch (e) {}
    try {
      await conn.execute(`ALTER TABLE siswa ADD COLUMN jurusan VARCHAR(255) DEFAULT NULL`);
    } catch (e) {}

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS kehadiran (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_siswa INT NOT NULL,
        tanggal DATE NOT NULL,
        jam_masuk TIME DEFAULT NULL,
        jam_keluar TIME DEFAULT NULL,
        status ENUM('hadir','ijin','sakit','alpa') NOT NULL DEFAULT 'hadir',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_siswa) REFERENCES siswa(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS pengaturan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(100) UNIQUE NOT NULL,
        \`value\` TEXT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ppdb_pendaftar (
        id INT AUTO_INCREMENT PRIMARY KEY,
        no_pendaftaran VARCHAR(30) UNIQUE NOT NULL,
        nisn VARCHAR(50) NOT NULL,
        nama_lengkap VARCHAR(255) NOT NULL,
        tempat_lahir VARCHAR(255),
        tanggal_lahir DATE,
        jenis_kelamin CHAR(1) CHECK(jenis_kelamin IN ('L', 'P')),
        alamat TEXT,
        asal_sekolah VARCHAR(255),
        no_telp VARCHAR(50),
        email VARCHAR(255),
        nama_ayah VARCHAR(255),
        nama_ibu VARCHAR(255),
        pilihan_tingkat VARCHAR(10) DEFAULT '10',
        nilai INT DEFAULT NULL,
        dikonversi TINYINT(1) DEFAULT 0,
        status ENUM('menunggu','diterima','ditolak') DEFAULT 'menunggu',
        keterangan TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS kehadiran_guru (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_guru INT NOT NULL,
        tanggal DATE NOT NULL,
        jam_masuk TIME DEFAULT NULL,
        jam_keluar TIME DEFAULT NULL,
        gps_masuk VARCHAR(500) DEFAULT NULL,
        gps_keluar VARCHAR(500) DEFAULT NULL,
        foto_masuk VARCHAR(255) DEFAULT NULL,
        foto_keluar VARCHAR(255) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_guru) REFERENCES guru(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS riwayat_pendidikan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_guru INT NOT NULL,
        jenjang VARCHAR(10) NOT NULL COMMENT 'SD/SMP/SMA/S1/S2/S3',
        nama_sekolah VARCHAR(255) NOT NULL,
        jurusan VARCHAR(255) DEFAULT NULL,
        tahun_masuk INT NOT NULL,
        tahun_lulus INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_guru) REFERENCES guru(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS log_login (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        status ENUM('gagal','sukses') NOT NULL DEFAULT 'gagal',
        alasan VARCHAR(255) DEFAULT NULL,
        ip_address VARCHAR(50) DEFAULT NULL,
        user_agent TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ekstrakurikuler (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(255) NOT NULL,
        pelatih VARCHAR(255) NOT NULL,
        hari ENUM('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu') NOT NULL,
        jam_mulai TIME NOT NULL,
        jam_selesai TIME NOT NULL,
        status ENUM('Aktif','Tidak') DEFAULT 'Aktif',
        kontak_pelatih VARCHAR(100) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add kontak_pelatih column if not exists
    try {
      await conn.execute(`ALTER TABLE ekstrakurikuler ADD COLUMN kontak_pelatih VARCHAR(100) DEFAULT NULL`);
    } catch (e) {}

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS bimbingan_konseling (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_siswa INT NOT NULL,
        tanggal DATE NOT NULL,
        kasus TEXT NOT NULL,
        tindakan TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_siswa) REFERENCES siswa(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ekstrakurikuler_peserta (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_ekstrakurikuler INT NOT NULL,
        id_siswa INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_ekstrakurikuler) REFERENCES ekstrakurikuler(id) ON DELETE CASCADE,
        FOREIGN KEY (id_siswa) REFERENCES siswa(id) ON DELETE CASCADE,
        UNIQUE KEY unique_peserta (id_ekstrakurikuler, id_siswa)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS prestasi_siswa (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tanggal DATE NOT NULL,
        id_siswa INT NOT NULL,
        penyelenggara VARCHAR(255) NOT NULL,
        nama_agenda VARCHAR(255) NOT NULL,
        prestasi VARCHAR(255) NOT NULL,
        foto VARCHAR(255) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_siswa) REFERENCES siswa(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS periode_penilaian (
        id INT AUTO_INCREMENT PRIMARY KEY,
        periode VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS nilai_siswa (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tahun_pelajaran VARCHAR(50) NOT NULL,
        id_siswa INT NOT NULL,
        id_mata_pelajaran INT NOT NULL,
        id_periode_penilaian INT NOT NULL,
        nilai DECIMAL(5,2) NOT NULL,
        kkm INT NOT NULL DEFAULT 75,
        keterangan TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_siswa) REFERENCES siswa(id) ON DELETE CASCADE,
        FOREIGN KEY (id_mata_pelajaran) REFERENCES mata_pelajaran(id) ON DELETE CASCADE,
        FOREIGN KEY (id_periode_penilaian) REFERENCES periode_penilaian(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create tahun_ajaran master table
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS tahun_ajaran (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tahun_ajaran VARCHAR(20) NOT NULL UNIQUE,
        status ENUM('aktif','tidak_aktif') DEFAULT 'tidak_aktif',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Seed default tahun ajaran if empty
    try {
      const [count] = await conn.execute('SELECT COUNT(*) as count FROM tahun_ajaran');
      if (count[0].count === 0) {
        const years = [
          ['2024/2025', 'aktif'],
          ['2025/2026', 'tidak_aktif'],
          ['2026/2027', 'tidak_aktif'],
        ];
        const insertTA = 'INSERT INTO tahun_ajaran (tahun_ajaran, status) VALUES (?, ?)';
        for (const [ta, st] of years) {
          await conn.execute(insertTA, [ta, st]);
        }
      }
    } catch (e) {}

    // Add id_guru column to nilai_siswa if not exists
    try {
      await conn.execute(`ALTER TABLE nilai_siswa ADD COLUMN id_guru INT DEFAULT NULL`);
    } catch (e) {}

    // Add kode_rahasia column to ppdb_pendaftar if not exists
    try {
      await conn.execute(`ALTER TABLE ppdb_pendaftar ADD COLUMN kode_rahasia VARCHAR(10) DEFAULT NULL`);
    } catch (e) {}

    // Add gps_masuk column to ppdb_pendaftar if not exists
    try {
      await conn.execute(`ALTER TABLE ppdb_pendaftar ADD COLUMN gps_masuk TEXT DEFAULT NULL`);
    } catch (e) {}

    // Add nilai column to ppdb_pendaftar if not exists
    try {
      await conn.execute(`ALTER TABLE ppdb_pendaftar ADD COLUMN nilai INT DEFAULT NULL`);
    } catch (e) {}

    try {
      await conn.execute(`ALTER TABLE ppdb_pendaftar ADD COLUMN dikonversi TINYINT(1) DEFAULT 0`);
    } catch (e) {}
    // Isi dikonversi = 1 untuk data lama yang sudah dikonversi
    try {
      await conn.execute(`UPDATE ppdb_pendaftar SET dikonversi = 1 WHERE keterangan LIKE 'Dikonversi ke siswa%' AND dikonversi = 0`);
    } catch (e) {}

    try {
      await conn.execute(`ALTER TABLE ppdb_pendaftar ADD COLUMN bukti_transfer VARCHAR(255) DEFAULT NULL`);
    } catch (e) {}

    try {
      await conn.execute(`ALTER TABLE ppdb_pendaftar ADD COLUMN status_pembayaran ENUM('belum_lunas','lunas') DEFAULT 'belum_lunas'`);
    } catch (e) {}

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role VARCHAR(50) NOT NULL,
        menu_path VARCHAR(255) NOT NULL,
        can_access TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_role_menu (role, menu_path)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Tambah menu /log-aktivitas untuk role yang sudah ada (migrasi database existing)
    try {
      const [logPathExists] = await conn.execute(
        "SELECT COUNT(*) as count FROM role_permissions WHERE menu_path = '/log-aktivitas' AND role = 'admin'"
      );
      if (logPathExists[0].count === 0) {
        // Admin: full access
        await conn.execute(
          'INSERT INTO role_permissions (role, menu_path, can_access) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE can_access = VALUES(can_access)',
          ['admin', '/log-aktivitas', 1]
        );
        // Bendahara: no access
        await conn.execute(
          'INSERT INTO role_permissions (role, menu_path, can_access) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE can_access = VALUES(can_access)',
          ['bendahara', '/log-aktivitas', 0]
        );
        // Guru: no access
        await conn.execute(
          'INSERT INTO role_permissions (role, menu_path, can_access) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE can_access = VALUES(can_access)',
          ['guru', '/log-aktivitas', 0]
        );
      }
    } catch (e) {
      console.log('[role_permissions] Log aktivitas migration error (non-fatal):', e.message);
    }

    // Migrate ppdb_access to role_permissions for guru role if not yet migrated
    try {
      const [permCount] = await conn.execute("SELECT COUNT(*) as count FROM role_permissions WHERE role = 'admin'");
      if (permCount[0].count === 0) {
        // Seed default permissions for all roles
        const allMenus = [
          '/dashboard', '/guru-dashboard', '/profil-saya', '/daftar-kehadiran-saya', '/kehadiran-guru-saya',
          '/siswa-wali', '/kehadiran-wali', '/input-kehadiran-wali',
          '/guru', '/kehadiran-guru', '/rekap-kehadiran-guru',
          '/siswa', '/alumni', '/kelas', '/kehadiran', '/kehadiran/bulk',
          '/ekstrakurikuler', '/ekstrakurikuler/peserta', '/ekstrakurikuler/input-peserta', '/ekstrakurikuler/rekap',
          '/bimbingan-konseling', '/bimbingan-konseling/input', '/bimbingan-konseling/rekap',
          '/nilai-siswa', '/nilai-siswa/input', '/nilai-siswa/rekap', '/periode-penilaian',
          '/prestasi-siswa', '/prestasi-siswa/input', '/prestasi-siswa/rekap', '/prestasi-siswa/pengaturan',
          '/mata-pelajaran',
          '/ppdb/admin', '/ppdb/pengaturan',
          '/transaksi', '/laporan', '/pembayaran',
          '/pengaturan', '/tahun-ajaran', '/users', '/database',
          '/role-permissions', '/log-aktivitas',
        ];
        const insertPerm = 'INSERT INTO role_permissions (role, menu_path, can_access) VALUES (?, ?, ?)';
        
        // Admin: all menus
        for (const path of allMenus) {
          await conn.execute(insertPerm, ['admin', path, 1]);
        }
        
        // Bendahara: all except users, database, role-permissions, log-aktivitas
        for (const path of allMenus) {
          if (path === '/users' || path === '/database' || path === '/role-permissions' || path === '/log-aktivitas') {
            await conn.execute(insertPerm, ['bendahara', path, 0]);
          } else {
            await conn.execute(insertPerm, ['bendahara', path, 1]);
          }
        }
        
        // Guru: only guru-specific menus + shared menus
        const guruAccess = [
          '/guru-dashboard', '/profil-saya', '/daftar-kehadiran-saya', '/kehadiran-guru-saya',
          '/siswa-wali', '/kehadiran-wali', '/input-kehadiran-wali',
          '/ekstrakurikuler/peserta', '/ekstrakurikuler/input-peserta', '/ekstrakurikuler/rekap',
          '/bimbingan-konseling', '/bimbingan-konseling/input', '/bimbingan-konseling/rekap',
          '/nilai-siswa', '/nilai-siswa/input', '/nilai-siswa/rekap', '/periode-penilaian',
          '/prestasi-siswa', '/prestasi-siswa/input', '/prestasi-siswa/rekap',
          '/mata-pelajaran',
        ];
        for (const path of allMenus) {
          await conn.execute(insertPerm, ['guru', path, guruAccess.includes(path) ? 1 : 0]);
        }
      }
    } catch (e) {
      console.log('[role_permissions] Seed error (non-fatal):', e.message);
    }

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_user INT DEFAULT NULL,
        username VARCHAR(100) DEFAULT NULL,
        action VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) DEFAULT NULL,
        entity_id INT DEFAULT NULL,
        description TEXT DEFAULT NULL,
        ip_address VARCHAR(50) DEFAULT NULL,
        user_agent TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_user) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ppdb_email_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ppdb_id INT NOT NULL,
        status_ppdb ENUM('diterima','ditolak') NOT NULL,
        email_tujuan VARCHAR(255) NOT NULL,
        subjek VARCHAR(255) NOT NULL,
        status_kirim ENUM('sukses','gagal') NOT NULL DEFAULT 'sukses',
        pesan_error TEXT,
        dikirim_oleh INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ppdb_id) REFERENCES ppdb_pendaftar(id) ON DELETE CASCADE,
        FOREIGN KEY (dikirim_oleh) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } finally {
    conn.release();
  }
}

async function seedData() {
  const conn = await pool.getConnection();
  try {
    // Seed default admin user
    const [userRows] = await conn.execute('SELECT COUNT(*) as count FROM users');
    if (userRows[0].count === 0) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      await conn.execute(
        'INSERT INTO users (username, password, nama, role) VALUES (?, ?, ?, ?)',
        ['admin', hashedPassword, 'Administrator', 'admin']
      );
      await conn.execute(
        'INSERT INTO users (username, password, nama, role) VALUES (?, ?, ?, ?)',
        ['bendahara', bcrypt.hashSync('bendahara123', 10), 'Bendahara', 'bendahara']
      );
    }

    // Seed default settings
    const [settingRows] = await conn.execute('SELECT COUNT(*) as count FROM pengaturan');
    if (settingRows[0].count === 0) {
      const defaultSettings = [
        ['nama_sekolah', 'SMA Annajah'],
        ['alamat_sekolah', 'Jl. Pendidikan No. 1'],
        ['kota', 'Jakarta'],
        ['provinsi', 'DKI Jakarta'],
        ['kode_pos', '12345'],
        ['no_telp', '(021) 12345678'],
        ['email', 'info@smaannajah.sch.id'],
        ['website', 'www.smaannajah.sch.id'],
        ['npsn', '12345678'],
        ['tahun_ajaran_aktif', '2024/2025'],
        ['kepala_sekolah', ''],
        ['bendahara', ''],
        ['logo', ''],
        ['smtp_host', ''],
        ['smtp_port', '587'],
        ['smtp_user', ''],
        ['smtp_pass', ''],
        ['smtp_email_pengirim', ''],
        ['smtp_nama_pengirim', 'SMA Annajah'],
        ['ttd_kepala_sekolah', ''],
        ['ttd_bendahara', ''],
        ['tampilkan_ttd_kepala_sekolah', '1'],
        ['tampilkan_ttd_bendahara', '1'],
        ['rekening_bank', 'BANK BRI'],
        ['rekening_nomor', '1234567890'],
        ['rekening_atas_nama', 'SMA Annajah'],
        ['biaya_pendaftaran', '350000'],
        ['ketua_panitia_ppdb', ''],
        ['ttd_ketua_panitia_ppdb', ''],
        ['tampilkan_ttd_ketua_panitia_ppdb', '1'],
      ];
      const insertSetting = 'INSERT INTO pengaturan (`key`, `value`) VALUES (?, ?)';
      for (const [key, value] of defaultSettings) {
        await conn.execute(insertSetting, [key, value]);
      }
    }

    // Seed sample kelas
    const [kelasRows] = await conn.execute('SELECT COUNT(*) as count FROM kelas');
    if (kelasRows[0].count === 0) {
      const kelasData = [
        ['X-A', '10'], ['X-B', '10'], ['X-C', '10'],
        ['XI-A', '11'], ['XI-B', '11'], ['XI-C', '11'],
        ['XII-A', '12'], ['XII-B', '12'], ['XII-C', '12']
      ];
      const insertKelas = 'INSERT INTO kelas (nama_kelas, tingkat) VALUES (?, ?)';
      for (const [nama, tingkat] of kelasData) {
        await conn.execute(insertKelas, [nama, tingkat]);
      }
    }

    // Seed sample jenis pembayaran
    const [pembayaranRows] = await conn.execute('SELECT COUNT(*) as count FROM jenis_pembayaran');
    if (pembayaranRows[0].count === 0) {
      const pembayaranData = [
        ['SPP Bulanan', '2024/2025', 250000, 'bulanan', 'Biaya SPP bulanan'],
        ['Biaya Gedung', '2024/2025', 500000, 'sekali', 'Biaya pembangunan gedung'],
        ['Biaya Pendaftaran', '2024/2025', 350000, 'sekali', 'Biaya pendaftaran siswa baru'],
        ['Biaya Ujian', '2024/2025', 200000, 'semester', 'Biaya ujian semester'],
        ['Biaya Buku', '2024/2025', 300000, 'tahunan', 'Biaya buku pelajaran'],
        ['Biaya Kegiatan', '2024/2025', 150000, 'bulanan', 'Biaya kegiatan ekstrakurikuler'],
      ];
      const insertPembayaran = 'INSERT INTO jenis_pembayaran (nama_pembayaran, tahun_ajaran, nominal, periode, keterangan) VALUES (?, ?, ?, ?, ?)';
      for (const [nama, ta, nominal, periode, ket] of pembayaranData) {
        await conn.execute(insertPembayaran, [nama, ta, nominal, periode, ket]);
      }
    }

    // Seed sample siswa
    const [siswaRows] = await conn.execute('SELECT COUNT(*) as count FROM siswa');
    if (siswaRows[0].count === 0) {
      const siswaData = [
        ['2024001', '0012345678', 'Ahmad Fauzi', 'L', 'Jakarta', '2008-01-15', 'Jl. Merdeka No. 10', '081234567890', 1],
        ['2024002', '0012345679', 'Siti Nurhaliza', 'P', 'Jakarta', '2008-03-20', 'Jl. Sudirman No. 25', '081234567891', 1],
        ['2024003', '0012345680', 'Budi Santoso', 'L', 'Depok', '2008-05-10', 'Jl. Raya Bogor No. 5', '081234567892', 2],
        ['2024004', '0012345681', 'Dewi Lestari', 'P', 'Jakarta', '2007-07-22', 'Jl. Kebon Jeruk No. 8', '081234567893', 4],
        ['2024005', '0012345682', 'Rudi Hermawan', 'L', 'Tangerang', '2007-09-01', 'Jl. Gading No. 15', '081234567894', 5],
      ];
      const insertSiswa = 'INSERT INTO siswa (nis, nisn, nama, jenis_kelamin, tempat_lahir, tanggal_lahir, alamat, no_telp, id_kelas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
      for (const s of siswaData) {
        await conn.execute(insertSiswa, s);
      }
    }
  } finally {
    conn.release();
  }
}

async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { getDatabase, closeDatabase };
