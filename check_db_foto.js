const { Client } = require('ssh2');

const HOST = '192.168.1.51';
const USER = 'root';
const PASSWORD = 'it92528!@';

function run(conn, cmd) {
  return new Promise((resolve) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return resolve(`ERROR: ${err.message}`);
      let out = '';
      stream.on('data', (d) => out += d.toString());
      stream.stderr.on('data', (d) => out += d.toString());
      stream.on('close', () => resolve(out));
    });
  });
}

async function main() {
  const conn = new Client();
  conn.on('ready', async () => {
    console.log('✅ TERHUBUNG\n');

    // 1. Cek foto guru dari database
    console.log('=== FOTO GURU DI DATABASE ===');
    let r = await run(conn, "mysql -u root -p'it92528!@' sas_annajah -e \"SELECT id, nama, foto FROM guru WHERE foto IS NOT NULL\" 2>&1");
    console.log(r);

    // 2. Cek foto kehadiran guru dari database
    console.log('\n=== FOTO KEHADIRAN GURU DI DATABASE ===');
    r = await run(conn, "mysql -u root -p'it92528!@' sas_annajah -e \"SELECT id, guru_id, foto_masuk, foto_keluar, DATE(tanggal) as tgl FROM kehadiran_guru WHERE foto_masuk IS NOT NULL OR foto_keluar IS NOT NULL ORDER BY id DESC LIMIT 20\" 2>&1");
    console.log(r);

    // 3. Cek file di disk
    console.log('\n=== FILE DI DISK: uploads/guru/ ===');
    r = await run(conn, 'ls -la /var/www/db_sas_annajah/backend/uploads/guru/ 2>&1');
    console.log(r);

    console.log('\n=== FILE DI DISK: uploads/kehadiran-guru/ ===');
    r = await run(conn, 'ls -la /var/www/db_sas_annajah/backend/uploads/kehadiran-guru/ 2>&1');
    console.log(r);

    // 4. Cek apakah frontend build terbaru - cek tanggal build
    console.log('\n=== TANGGAL BUILD FRONTEND ===');
    r = await run(conn, 'ls -la /var/www/db_sas_annajah/frontend/dist/ 2>&1');
    console.log(r);
    r = await run(conn, 'ls -la /var/www/db_sas_annajah/frontend/dist/assets/ 2>&1');
    console.log(r);

    // 5. Cek source map atau versi build
    console.log('\n=== ISI INDEX.HTML ===');
    r = await run(conn, 'cat /var/www/db_sas_annajah/frontend/dist/index.html 2>&1');
    console.log(r);

    // 6. Cek file foto dari LOCAL (file yang sudah di-sync sebelumnya)
    console.log('\n=== CEK FOTO LOKAL ===');
    r = await run(conn, 'md5sum /var/www/db_sas_annajah/backend/uploads/kehadiran-guru/*.jpg 2>&1 | head -10');
    console.log(r);
    r = await run(conn, 'md5sum /var/www/db_sas_annajah/backend/uploads/guru/*.jpg 2>&1 | head -10');
    console.log(r);

    conn.end();
    console.log('\n✅ SELESAI');
  });
  
  conn.on('error', (e) => { console.error('ERROR:', e.message); process.exit(1); });
  conn.connect({ host: HOST, port: 22, username: USER, password: PASSWORD, readyTimeout: 10000 });
}

main();
