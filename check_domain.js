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

    // Cek akses via domain
    console.log('=== AKSES VIA DOMAIN CLOUDFLARE ===');
    let r = await run(conn, 'curl -s -m 5 -o /dev/null -w "HTTP %{http_code}" https://sas.smaannajah.sch.id/uploads/kehadiran-guru/absen_1780649086165_8nykp9.jpg 2>&1');
    console.log('[HTTPS] Foto absen:', r);
    
    r = await run(conn, 'curl -s -m 5 -o /dev/null -w "HTTP %{http_code}" https://sas.smaannajah.sch.id/uploads/guru/guru_1779878431137_1jm3db.jpg 2>&1');
    console.log('[HTTPS] Foto guru:', r);
    
    r = await run(conn, 'curl -s -m 5 -o /dev/null -w "HTTP %{http_code}" https://sas.smaannajah.sch.id/ 2>&1');
    console.log('[HTTPS] Halaman utama:', r);

    // Cek juga via HTTP IP langsung
    console.log('\n=== AKSES VIA IP LANGSUNG ===');
    r = await run(conn, 'curl -s -m 5 -o /dev/null -w "HTTP %{http_code}" http://192.168.1.51/uploads/kehadiran-guru/absen_1780649086165_8nykp9.jpg 2>&1');
    console.log('[HTTP IP] Foto absen:', r);
    
    r = await run(conn, 'curl -s -m 5 -o /dev/null -w "HTTP %{http_code}" http://192.168.1.51/uploads/guru/guru_1779878431137_1jm3db.jpg 2>&1');
    console.log('[HTTP IP] Foto guru:', r);

    // Cek file di disk
    console.log('\n=== CEK FILE FOTO DI DISK ===');
    r = await run(conn, 'ls -la /var/www/db_sas_annajah/backend/uploads/kehadiran-guru/ 2>&1');
    console.log('kehadiran-guru:', r);
    r = await run(conn, 'ls -la /var/www/db_sas_annajah/backend/uploads/guru/ 2>&1');
    console.log('guru:', r);

    // Cek database untuk foto guru
    console.log('\n=== DATA GURU DENGAN FOTO ===');
    r = await run(conn, "mysql -u root -p'it92528!@' dbannajah -e \"SELECT id, nama, foto FROM guru WHERE foto IS NOT NULL\" 2>&1");
    console.log(r);

    conn.end();
    console.log('\n✅ SELESAI');
  });
  conn.on('error', (e) => { console.error('ERROR:', e.message); process.exit(1); });
  conn.connect({ host: HOST, port: 22, username: USER, password: PASSWORD, readyTimeout: 15000 });
}
main();
