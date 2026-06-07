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

    // 1. Cek apakah git update sudah sampai
    console.log('=== 1. CEK GIT STATUS ===');
    let r = await run(conn, `cd ${BASE} && git log --oneline -3 2>&1 || echo "NOT A GIT REPO - checking via remote"`);
    console.log(r);
    
    // Cek HEAD dari bare repo
    r = await run(conn, 'git --git-dir=/root/sas-annajah.git log --oneline -3 2>&1');
    console.log('Bare repo HEAD:', r);

    // 2. Install dependencies backend
    console.log('\n=== 2. INSTALL BACKEND DEPS ===');
    r = await run(conn, `cd ${BASE}/backend && npm install --production 2>&1 | tail -5`);
    console.log(r);

    // 3. Install dependencies frontend & build
    console.log('\n=== 3. BUILD FRONTEND ===');
    r = await run(conn, `cd ${BASE}/frontend && npm install 2>&1 | tail -5`);
    console.log(r);
    
    r = await run(conn, `cd ${BASE}/frontend && npm run build 2>&1 | tail -20`);
    console.log(r);

    // 4. Cek hasil build
    console.log('\n=== 4. CEK HASIL BUILD ===');
    r = await run(conn, `ls -la ${BASE}/frontend/dist/assets/ 2>&1`);
    console.log(r);

    // 5. Restart PM2
    console.log('\n=== 5. RESTART PM2 ===');
    r = await run(conn, `cd ${BASE}/backend && pm2 restart backend-sas 2>&1`);
    console.log(r);

    // 6. Cek status
    console.log('\n=== 6. STATUS PM2 ===');
    r = await run(conn, 'pm2 status 2>&1');
    console.log(r);

    // 7. Verifikasi akses foto
    console.log('\n=== 7. VERIFIKASI FOTO ===');
    r = await run(conn, 'curl -s -o /dev/null -w "HTTP %{http_code} %{size_download}B" http://127.0.0.1/uploads/kehadiran-guru/absen_1780649086165_8nykp9.jpg 2>&1');
    console.log('Foto absen:', r);
    r = await run(conn, 'curl -s -o /dev/null -w "HTTP %{http_code} %{size_download}B" http://192.168.1.51/uploads/guru/guru_1779878431137_1jm3db.jpg 2>&1');
    console.log('Foto guru via IP:', r);

    conn.end();
    console.log('\n✅ SELESAI - Silakan coba refresh halaman Kehadiran Karyawan di browser!');
  });
  
  conn.on('error', (e) => { console.error('ERROR:', e.message); process.exit(1); });
  conn.connect({ host: HOST, port: 22, username: USER, password: PASSWORD, readyTimeout: 10000 });
}

main();
