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

    // 1. Cek waktu build frontend
    console.log('=== WAKTU BUILD FRONTEND ===');
    let r = await run(conn, 'stat -c "%y" /var/www/db_sas_annajah/frontend/dist/index.html 2>&1');
    console.log('index.html:', r);
    r = await run(conn, 'stat -c "%y" /var/www/db_sas_annajah/frontend/dist/assets/*.css 2>&1 | head -1');
    console.log('CSS terakhir:', r);
    r = await run(conn, 'stat -c "%y" /var/www/db_sas_annajah/frontend/dist/assets/*.js 2>&1 | head -1');
    console.log('JS terakhir:', r);

    // 2. Cek tanggal di database vs file foto
    console.log('\n=== FOTO DI DB vs DI DISK ===');
    r = await run(conn, "mysql -u root -p'it92528!@' dbannajah -e \"SELECT id, guru_id, foto_masuk, foto_keluar FROM kehadiran_guru ORDER BY id DESC LIMIT 5\" 2>&1");
    console.log(r);

    // 3. Cek apakah foto yang dirujuk database ada di disk
    console.log('\n=== CEK FOTO MASA LALU ===');
    r = await run(conn, "for f in $(mysql -u root -p'it92528!@' dbannajah -N -e \"SELECT foto_masuk FROM kehadiran_guru WHERE foto_masuk IS NOT NULL UNION SELECT foto_keluar FROM kehadiran_guru WHERE foto_keluar IS NOT NULL\" 2>/dev/null); do echo -n \"$f: \"; [ -f \"/var/www/db_sas_annajah/backend/uploads/kehadiran-guru/$f\" ] && echo \"OK $(stat -c '%s bytes' /var/www/db_sas_annajah/backend/uploads/kehadiran-guru/$f)\" || echo \"MISSING\"; done");
    console.log(r);

    // 4. Cek akses foto via nginx langsung
    console.log('\n=== AKSES FOTO VIA NGINX ===');
    r = await run(conn, "curl -s -o /dev/null -w \"%{http_code} %{size_download} bytes\" http://127.0.0.1/uploads/kehadiran-guru/absen_1780649086165_8nykp9.jpg 2>&1");
    console.log('Foto absen 1:', r);
    r = await run(conn, "curl -s -o /dev/null -w \"%{http_code} %{size_download} bytes\" http://127.0.0.1/uploads/kehadiran-guru/absen_1780649227102_3mwn7t.jpg 2>&1");
    console.log('Foto absen 2:', r);

    // 5. Cek URL foto yang dipakai frontend - cek bagaimana frontend meminta foto
    console.log('\n=== CEK FORMAT URL FOTO ===');
    r = await run(conn, "mysql -u root -p'it92528!@' dbannajah -e \"SELECT kg.id, g.nama, kg.foto_masuk, kg.foto_keluar FROM kehadiran_guru kg JOIN guru g ON kg.guru_id = g.id ORDER BY kg.id DESC LIMIT 5\" 2>&1");
    console.log(r);

    // 6. Cek apakah ada error di console
    console.log('\n=== PM2 LOG ERROR ===');
    r = await run(conn, 'pm2 logs backend-sas --no-color --lines 15 2>&1 | head -20');
    console.log(r);

    conn.end();
    console.log('\n✅ SELESAI');
  });
  
  conn.on('error', (e) => { console.error('ERROR:', e.message); process.exit(1); });
  conn.connect({ host: HOST, port: 22, username: USER, password: PASSWORD, readyTimeout: 10000 });
}
main();
