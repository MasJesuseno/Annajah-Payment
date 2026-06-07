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

    console.log('=== STRUKTUR TABEL: kehadiran_guru ===');
    let r = await run(conn, "mysql -u root -p'it92528!@' dbannajah -e \"DESCRIBE kehadiran_guru\" 2>&1");
    console.log(r);

    console.log('\n=== STRUKTUR TABEL: guru ===');
    r = await run(conn, "mysql -u root -p'it92528!@' dbannajah -e \"DESCRIBE guru\" 2>&1");
    console.log(r);

    console.log('\n=== SAMPLE DATA: kehadiran_guru (3 baris) ===');
    r = await run(conn, "mysql -u root -p'it92528!@' dbannajah -e \"SELECT * FROM kehadiran_guru ORDER BY id DESC LIMIT 3\" 2>&1");
    console.log(r);

    console.log('\n=== SAMPLE DATA: guru (3 baris) ===');
    r = await run(conn, "mysql -u root -p'it92528!@' dbannajah -e \"SELECT id, nama, foto FROM guru ORDER BY id DESC LIMIT 5\" 2>&1");
    console.log(r);

    conn.end();
    console.log('\n✅ SELESAI');
  });
  
  conn.on('error', (e) => { console.error('ERROR:', e.message); process.exit(1); });
  conn.connect({ host: HOST, port: 22, username: USER, password: PASSWORD, readyTimeout: 10000 });
}
main();
