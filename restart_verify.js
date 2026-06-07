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
      const timer = setTimeout(() => { if (!done) { done = true; resolve('TIMEOUT'); } }, 10000);
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
    const BASE = '/var/www/db_sas_annajah';

    // Restart PM2
    console.log('=== RESTART PM2 ===');
    let r = await run(conn, `cd ${BASE}/backend && pm2 restart backend-sas 2>&1`);
    console.log(r);

    // Wait a moment
    await new Promise(r => setTimeout(r, 2000));

    // Check status
    console.log('\n=== STATUS PM2 ===');
    r = await run(conn, 'pm2 status 2>&1');
    console.log(r);

    // Verify photos
    console.log('\n=== VERIFIKASI FOTO ===');
    r = await run(conn, 'curl -s -m 3 -o /dev/null -w "HTTP %{http_code}" http://127.0.0.1/uploads/kehadiran-guru/absen_1780649086165_8nykp9.jpg 2>&1');
    console.log('Foto via backend:', r);
    r = await run(conn, 'curl -s -m 3 -o /dev/null -w "HTTP %{http_code}" http://192.168.1.51/uploads/guru/guru_1779878431137_1jm3db.jpg 2>&1');
    console.log('Foto via nginx:', r);
    r = await run(conn, 'curl -s -m 3 -o /dev/null -w "HTTP %{http_code}" http://192.168.1.51/ 2>&1');
    console.log('Frontend page:', r);

    conn.end();
    console.log('\n✅ SELESAI');
  });
  conn.on('error', (e) => { console.error('ERROR:', e.message); process.exit(1); });
  conn.connect({ host: HOST, port: 22, username: USER, password: PASSWORD, readyTimeout: 15000 });
}
main();
