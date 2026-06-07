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

    const BASE = '/var/www/db_sas_annajah';

    // 1. Fix permissions on vite and node_modules/.bin
    console.log('=== 1. FIX PERMISSIONS ===');
    let r = await run(conn, `chmod -R 755 ${BASE}/frontend/node_modules/.bin/ 2>&1`);
    console.log('chmod:', r);
    r = await run(conn, `ls -la ${BASE}/frontend/node_modules/.bin/vite 2>&1`);
    console.log('vite binary:', r);

    // 2. Cek apakah node_modules frontend lengkap
    console.log('\n=== 2. CEK NODE_MODULES FRONTEND ===');
    r = await run(conn, `ls ${BASE}/frontend/node_modules/.bin/ | head -20 2>&1`);
    console.log(r);

    // 3. Build frontend lagi
    console.log('\n=== 3. BUILD FRONTEND ===');
    r = await run(conn, `cd ${BASE}/frontend && npx vite build 2>&1 | tail -20`);
    console.log(r);

    // 4. Cek apakah build sukses
    console.log('\n=== 4. CEK BUILD ===');
    r = await run(conn, `ls -la ${BASE}/frontend/dist/assets/ 2>&1`);
    console.log(r);

    // 5. Cek log PM2 untuk error
    console.log('\n=== 5. PM2 LOGS ===');
    r = await run(conn, `pm2 logs backend-sas --no-color --lines 20 2>&1 | head -20`);
    console.log(r);

    // 6. Restart PM2
    console.log('\n=== 6. RESTART PM2 ===');
    r = await run(conn, `cd ${BASE}/backend && pm2 restart backend-sas 2>&1`);
    console.log(r);

    // 7. Tunggu sebentar lalu cek
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n=== 7. STATUS & VERIFIKASI ===');
    r = await run(conn, 'pm2 status 2>&1');
    console.log('Status:', r);

    // 8. Verifikasi akses
    r = await run(conn, 'curl -s -m 5 -o /dev/null -w "HTTP %{http_code}" http://127.0.0.1/uploads/kehadiran-guru/absen_1780649086165_8nykp9.jpg 2>&1');
    console.log('Foto via backend:', r);

    r = await run(conn, 'curl -s -m 5 -o /dev/null -w "HTTP %{http_code}" http://192.168.1.51/uploads/guru/guru_1779878431137_1jm3db.jpg 2>&1');
    console.log('Foto via nginx IP:', r);

    r = await run(conn, 'curl -s -m 5 -o /dev/null -w "HTTP %{http_code}" http://127.0.0.1/ 2>&1');
    console.log('Frontend:', r);

    conn.end();
    console.log('\n✅ SELESAI');
  });
  
  conn.on('error', (e) => { console.error('ERROR:', e.message); process.exit(1); });
  conn.connect({ host: HOST, port: 22, username: USER, password: PASSWORD, readyTimeout: 15000 });
}
main();
