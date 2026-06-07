/**
 * Script untuk menyalin folder uploads dari lokal ke server Ubuntu (192.168.1.51)
 * via SFTP menggunakan ssh2-sftp-client
 * 
 * Cara pakai:
 *   node sync_uploads.js
 */

const path = require('path');
const fs = require('fs');
const SftpClient = require('ssh2-sftp-client');

const HOST = '192.168.1.51';
const USER = 'root';
const PASSWORD = 'it92528!@';
const LOCAL_UPLOADS = path.join(__dirname, 'backend', 'uploads');
const REMOTE_UPLOADS = '/var/www/db_sas_annajah/backend/uploads';

async function ensureDir(sftp, remotePath) {
  try {
    await sftp.stat(remotePath);
  } catch (err) {
    console.log(`  [BUAT] ${remotePath}`);
    await sftp.mkdir(remotePath, true);
  }
}

async function syncDir(sftp, localPath, remotePath) {
  if (!fs.existsSync(localPath)) {
    console.log(`  [SKIP] ${localPath} tidak ditemukan`);
    return;
  }

  await ensureDir(sftp, remotePath);

  const items = fs.readdirSync(localPath);
  for (const item of items) {
    const localItem = path.join(localPath, item);
    const remoteItem = `${remotePath}/${item}`;
    const stat = fs.statSync(localItem);

    if (stat.isDirectory()) {
      await syncDir(sftp, localItem, remoteItem);
    } else if (stat.isFile()) {
      try {
        const remoteStat = await sftp.stat(remoteItem);
        if (remoteStat.size === stat.size) {
          // File sudah ada dengan ukuran sama, skip
          continue;
        }
      } catch (err) {
        // File tidak ada di remote, lanjutkan upload
      }

      console.log(`  [COPY] ${item}`);
      await sftp.put(localItem, remoteItem);
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  SYNC UPLOADS KE SERVER 192.168.1.51');
  console.log('='.repeat(60));
  console.log();

  if (!fs.existsSync(LOCAL_UPLOADS)) {
    console.error(`ERROR: Folder lokal tidak ditemukan: ${LOCAL_UPLOADS}`);
    process.exit(1);
  }

  console.log(`Lokal  : ${LOCAL_UPLOADS}`);
  console.log(`Remote : ${REMOTE_UPLOADS}`);
  console.log();

  const sftp = new SftpClient();

  try {
    console.log('Menghubungkan ke server...');
    await sftp.connect({
      host: HOST,
      port: 22,
      username: USER,
      password: PASSWORD,
    });
    console.log('Terhubung!');
    console.log();

    // Sync folder: guru, kehadiran-guru, siswa, logo, ppdb, prestasi
    const folders = ['guru', 'kehadiran-guru', 'siswa', 'logo', 'ppdb', 'prestasi'];
    for (const folder of folders) {
      const localDir = path.join(LOCAL_UPLOADS, folder);
      const remoteDir = `${REMOTE_UPLOADS}/${folder}`;
      if (fs.existsSync(localDir)) {
        console.log(`\n📁 Folder: ${folder}/`);
        await syncDir(sftp, localDir, remoteDir);
      } else {
        console.log(`\n📁 Folder: ${folder}/ -> [tidak ada di lokal]`);
      }
    }

    console.log();
    console.log('='.repeat(60));
    console.log('✅ SINKRONISASI SELESAI!');
    console.log('='.repeat(60));
    console.log();
    console.log('File foto sekarang sudah tersalin ke server.');
    console.log('Coba refresh halaman Kehadiran Guru — foto seharusnya sudah muncul.');
  } catch (err) {
    console.error(`\nERROR: ${err.message}`);
    process.exit(1);
  } finally {
    await sftp.end();
  }
}

main();
