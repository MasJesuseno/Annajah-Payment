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

    // 1. Cek konfigurasi database dari file backend
    console.log('=== DATABASE CONFIG ===');
    let r = await run(conn, 'cat /var/www/db_sas_annajah/backend/database.js 2>&1');
    console.log(r);

    // 2. Tampilkan daftar database
    console.log('\n=== LIST DATABASE ===');
    r = await run(conn, "mysql -u root -p'it92528!@' -e 'SHOW DATABASES' 2>&1");
    console.log(r);

    conn.end();
    console.log('\n✅ SELESAI');
  });
  
  conn.on('error', (e) => { console.error('ERROR:', e.message); process.exit(1); });
  conn.connect({ host: HOST, port: 22, username: USER, password: PASSWORD, readyTimeout: 10000 });
}
main();
