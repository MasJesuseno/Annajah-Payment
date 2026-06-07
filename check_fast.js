const { Client } = require('ssh2');
const HOST = '192.168.1.51';
const USER = 'root';
const PASSWORD = 'it92528!@';

function run(conn, cmd) {
  return new Promise((resolve) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return resolve(`ERROR: ${err.message}`);
      let out = '';
      let done = false;
      const timer = setTimeout(() => { if (!done) { done = true; resolve('TIMEOUT'); } }, 8000);
      stream.on('data', (d) => out += d.toString());
      stream.stderr.on('data', (d) => out += d.toString());
      stream.on('close', () => { if (!done) { done = true; clearTimeout(timer); resolve(out); } });
    });
  });
}

async function main() {
  const conn = new Client();
  conn.on('ready', async () => {
    console.log('✅ TERHUBUNG\n');

    // Simple checks one by one
    console.log('=== 1. BUILD TIME ===');
    let r = await run(conn, 'ls -la /var/www/db_sas_annajah/frontend/dist/index.html 2>&1');
    console.log(r);

    console.log('\n=== 2. FOTO DB vs DISK ===');
    r = await run(conn, "mysql -u root -p'it92528!@' dbannajah -e \"SELECT id, guru_id, foto_masuk, foto_keluar FROM kehadiran_guru ORDER BY id DESC LIMIT 3\" 2>&1");
    console.log(r);

    console.log('\n=== 3. CEK SEMUA FOTO DI DISK ===');
    r = await run(conn, 'ls -la /var/www/db_sas_annajah/backend/uploads/kehadiran-guru/ 2>&1');
    console.log(r);
    r = await run(conn, 'ls -la /var/www/db_sas_annajah/backend/uploads/guru/ 2>&1');
    console.log(r);

    console.log('\n=== 4. AKSES FOTO VIA NGINX (localhost) ===');
    r = await run(conn, 'curl -s -m 3 -o /dev/null -w "HTTP %{http_code} %{size_download}B" http://127.0.0.1/uploads/kehadiran-guru/absen_1780649086165_8nykp9.jpg 2>&1');
    console.log('absen_1780649086165:', r);
    r = await run(conn, 'curl -s -m 3 -o /dev/null -w "HTTP %{http_code} %{size_download}B" http://127.0.0.1/uploads/guru/guru_1779878431137_1jm3db.jpg 2>&1');
    console.log('guru_1779878431137:', r);

    console.log('\n=== 5. AKSES VIA URL DIREK ===');
    r = await run(conn, 'curl -s -m 3 -o /dev/null -w "HTTP %{http_code}" http://192.168.1.51/uploads/kehadiran-guru/absen_1780649086165_8nykp9.jpg 2>&1');
    console.log('Via public IP:', r);

    conn.end();
    console.log('\n✅ SELESAI');
  });
  
  conn.on('error', (e) => { console.error('ERROR:', e.message); process.exit(1); });
  conn.connect({ host: HOST, port: 22, username: USER, password: PASSWORD, readyTimeout: 10000 });
}
main();
