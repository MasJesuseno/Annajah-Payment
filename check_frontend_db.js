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

    // 1. Cek kapan frontend terakhir di-build
    console.log('=== FRONTEND BUILD TIME ===');
    let r = await run(conn, 'stat /var/www/db_sas_annajah/frontend/dist/index.html 2>&1 | grep Modify');
    console.log(r);
    
    // 2. Cek source version (dari package.json)
    console.log('\n=== VERSION PACKAGE ===');
    r = await run(conn, 'cat /var/www/db_sas_annajah/frontend/package.json 2>&1 | head -10');
    console.log(r);

    // 3. Cek apakah ada node_modules di frontend
    console.log('\n=== CEK FRONTEND NODE_MODULES ===');
    r = await run(conn, 'ls -d /var/www/db_sas_annajah/frontend/node_modules 2>&1');
    console.log(r);

    // 4. Cek data kehadiran guru di database
    console.log('\n=== STRUKTUR TABEL KEHADIRAN GURU ===');
    r = await run(conn, "mysql -u root -p'it92528!@' dbannajah -e \"DESCRIBE kehadiran_guru\" 2>&1");
    console.log(r);

    // 5. Data kehadiran terbaru
    console.log('\n=== DATA KEHADIRAN GURU (10 TERAKHIR) ===');
    r = await run(conn, "mysql -u root -p'it92528!@' dbannajah -e \"SELECT kg.*, g.nama FROM kehadiran_guru kg LEFT JOIN guru g ON kg.guru_id = g.id ORDER BY kg.id DESC LIMIT 10\" 2>&1");
    console.log(r);

    // 6. Cek PM2 log terbaru
    console.log('\n=== PM2 LOG (error terbaru) ===');
    r = await run(conn, 'pm2 logs backend-sas --no-color --lines 30 2>&1 | tail -20');
    console.log(r);
    
    // 7. Restart PM2
    console.log('\n=== RESTART PM2 ===');
    r = await run(conn, 'cd /var/www/db_sas_annajah/backend && pm2 restart backend-sas 2>&1');
    console.log(r);

    conn.end();
    console.log('\n✅ SELESAI');
  });
  
  conn.on('error', (e) => { console.error('ERROR:', e.message); process.exit(1); });
  conn.connect({ host: HOST, port: 22, username: USER, password: PASSWORD, readyTimeout: 10000 });
}
main();
