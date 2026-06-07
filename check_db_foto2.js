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

    // 1. Cek foto guru di database
    console.log('=== FOTO GURU DI DATABASE ===');
    let r = await run(conn, "mysql -u root -p'it92528!@' dbannajah -e \"SELECT id, nama, foto FROM guru WHERE foto IS NOT NULL\" 2>&1");
    console.log(r);

    // 2. Cek foto kehadiran guru di database
    console.log('\n=== FOTO KEHADIRAN GURU DI DATABASE ===');
    r = await run(conn, "mysql -u root -p'it92528!@' dbannajah -e \"SELECT id, guru_id, foto_masuk, foto_keluar, DATE(tanggal) as tgl FROM kehadiran_guru WHERE foto_masuk IS NOT NULL OR foto_keluar IS NOT NULL ORDER BY id DESC LIMIT 20\" 2>&1");
    console.log(r);
    
    // 3. Cek 10 baris terakhir kehadiran guru
    console.log('\n=== 10 BARIS TERAKHIR KEHADIRAN GURU ===');
    r = await run(conn, "mysql -u root -p'it92528!@' dbannajah -e \"SELECT id, guru_id, DATE(tanggal) as tgl, foto_masuk, foto_keluar FROM kehadiran_guru ORDER BY id DESC LIMIT 10\" 2>&1");
    console.log(r);

    // 4. File di disk
    console.log('\n=== FILE DI DISK: uploads/guru/ ===');
    r = await run(conn, 'ls -la /var/www/db_sas_annajah/backend/uploads/guru/ 2>&1');
    console.log(r);
    
    console.log('\n=== FILE DI DISK: uploads/kehadiran-guru/ ===');
    r = await run(conn, 'ls -la /var/www/db_sas_annajah/backend/uploads/kehadiran-guru/ 2>&1');
    console.log(r);
    
    // 5. Bandingkan - foto yang di database ada di disk?
    console.log('\n=== CEK FOTO GURU ===');
    r = await run(conn, "for f in $(mysql -u root -p'it92528!@' dbannajah -N -e \"SELECT foto FROM guru WHERE foto IS NOT NULL\" 2>/dev/null); do echo -n \"$f: \"; [ -f \"/var/www/db_sas_annajah/backend/uploads/guru/$f\" ] && echo \"OK\" || echo \"MISSING\"; done");
    console.log(r);
    
    console.log('\n=== CEK FOTO KEHADIRAN GURU ===');
    r = await run(conn, "for f in $(mysql -u root -p'it92528!@' dbannajah -N -e \"SELECT foto_masuk FROM kehadiran_guru WHERE foto_masuk IS NOT NULL UNION SELECT foto_keluar FROM kehadiran_guru WHERE foto_keluar IS NOT NULL\" 2>/dev/null); do echo -n \"$f: \"; [ -f \"/var/www/db_sas_annajah/backend/uploads/kehadiran-guru/$f\" ] && echo \"OK\" || echo \"MISSING\"; done");
    console.log(r);

    // 6. Cek apakah backend melayani file statis
    console.log('\n=== CEK AKSES BACKEND ===');
    r = await run(conn, 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5000/uploads/guru/ 2>&1');
    console.log('Backend /uploads/guru/:', r);
    
    conn.end();
    console.log('\n✅ SELESAI');
  });
  
  conn.on('error', (e) => { console.error('ERROR:', e.message); process.exit(1); });
  conn.connect({ host: HOST, port: 22, username: USER, password: PASSWORD, readyTimeout: 10000 });
}
main();
