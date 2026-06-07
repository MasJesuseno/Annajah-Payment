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

    // 1. Nginx config
    console.log('=== NGINX CONFIG ===');
    let r = await run(conn, 'cat /etc/nginx/sites-available/sas_annajah 2>&1');
    console.log(r);

    // 2. Cek web root yang sebenarnya
    console.log('\n=== WEB ROOT (dari nginx) ===');
    r = await run(conn, "grep root /etc/nginx/sites-available/sas_annajah 2>&1 | head -5");
    console.log(r);

    // 3. Cek direktori yang ada
    console.log('\n=== DIREKTORI YANG ADA ===');
    r = await run(conn, 'ls -la /var/www/ 2>&1');
    console.log(r);
    r = await run(conn, 'ls -la /var/www/html/ 2>&1 | head -10');
    console.log(r);

    // 4. Cek frontend dist langsung
    console.log('\n=== CEK FRONTEND DIST ===');
    r = await run(conn, 'ls -la /var/www/db_sas_annajah/frontend/dist/assets/ 2>&1 | head -10');
    console.log(r);

    // 5. Cek apakah ada file index.html di web root
    console.log('\n=== CIUM INDEX.HTML ===');
    r = await run(conn, 'cat /var/www/db_sas_annajah/frontend/dist/index.html 2>&1 | head -20');
    console.log(r);
    r = await run(conn, 'cat /var/www/html/db_sas_annajah/frontend/dist/index.html 2>&1 | head -5 || echo "not found"');
    console.log(r);

    // 6. Cek link foto dari dalam server
    console.log('\n=== AKSES FOTO VIA LOCALHOST ===');
    r = await run(conn, 'curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/uploads/guru/foto_suseno.jpg 2>&1 || echo "error"');
    console.log('Status foto guru:', r);
    
    r = await run(conn, 'curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/uploads/kehadiran-guru/ 2>&1 | head -5');
    console.log('ls kehadiran-guru:', r);
    
    r = await run(conn, 'ls -la /var/www/db_sas_annajah/backend/uploads/kehadiran-guru/ 2>&1 | head -15');
    console.log('Files:', r);

    // 7. Cek URL foto via public IP/domain
    console.log('\n=== AKSES FOTO VIA HTTP ===');
    r = await run(conn, 'curl -s -o /dev/null -w "%{http_code}" http://192.168.1.51/uploads/guru/foto_suseno.jpg 2>&1');
    console.log('Status via nginx (foto_suseno):', r);
    
    r = await run(conn, 'curl -s -o /dev/null -w "%{http_code}" http://192.168.1.51/uploads/kehadiran-guru/absen_1749128309467.jpg 2>&1');
    console.log('Status via nginx (foto absen):', r);

    // 8. Cek full isi uploads guru
    console.log('\n=== UPLOADS GURU ===');
    r = await run(conn, 'ls -la /var/www/db_sas_annajah/backend/uploads/guru/ 2>&1');
    console.log(r);

    // 9. Cek full isi uploads kehadiran-guru
    console.log('\n=== UPLOADS KEHADIRAN GURU ===');
    r = await run(conn, 'ls -la /var/www/db_sas_annajah/backend/uploads/kehadiran-guru/ 2>&1');
    console.log(r);

    conn.end();
    console.log('\n✅ SELESAI');
  });
  
  conn.on('error', (e) => { console.error('ERROR:', e.message); process.exit(1); });
  conn.connect({ host: HOST, port: 22, username: USER, password: PASSWORD, readyTimeout: 10000 });
}

main();
