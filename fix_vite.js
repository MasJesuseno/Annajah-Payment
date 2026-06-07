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

    // Fix vite permission
    console.log('=== FIX VITE PERMISSION ===');
    let r = await run(conn, `chmod 755 ${BASE}/frontend/node_modules/.bin/vite 2>&1`);
    console.log(r);
    r = await run(conn, `ls -la ${BASE}/frontend/node_modules/.bin/vite 2>&1`);
    console.log(r);

    // Build frontend
    console.log('\n=== BUILD FRONTEND ===');
    r = await run(conn, `cd ${BASE}/frontend && npx vite build 2>&1 | tail -15`);
    console.log(r);

    // Check result
    console.log('\n=== HASIL BUILD ===');
    r = await run(conn, `ls -la ${BASE}/frontend/dist/assets/ 2>&1`);
    console.log(r);

    conn.end();
    console.log('\n✅ SELESAI');
  });
  conn.on('error', (e) => { console.error('ERROR:', e.message); process.exit(1); });
  conn.connect({ host: HOST, port: 22, username: USER, password: PASSWORD, readyTimeout: 15000 });
}
main();
