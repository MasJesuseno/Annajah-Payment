const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', async () => {
  const run = (cmd) => new Promise((r) => {
    conn.exec(cmd, (e, s) => {
      let o = '';
      s.on('data', (d) => o += d);
      s.stderr.on('data', (d) => o += d);
      s.on('close', () => r(o));
    });
  });

  // 1. Check response headers for image
  console.log('=== RESPONSE HEADERS FOTO KEHADIRAN ===');
  console.log(await run(`curl -s -D - "http://localhost:5000/uploads/kehadiran-guru/absen_1780649086165_8nykp9.jpg" -o /dev/null 2>/dev/null`));

  console.log('\n=== RESPONSE HEADERS FOTO GURU ===');
  console.log(await run('for f in /var/www/db_sas_annajah/backend/uploads/guru/*.jpg; do echo "=== $(basename $f) ==="; curl -s -D - "http://localhost:5000/uploads/guru/$(basename $f)" -o /dev/null 2>/dev/null; echo; done'));

  // 2. Check if domain (via nginx) returns same headers
  console.log('\n=== VIA DOMAIN (localhost nginx) ===');
  console.log(await run(`curl -s -D - "http://sas.smaannajah.sch.id/uploads/kehadiran-guru/absen_1780649086165_8nykp9.jpg" -o /dev/null 2>/dev/null | head -20`));

  // 3. Check actual API response for the kehadiran record with photos
  console.log('\n=== DB RECORD WITH PHOTOS ===');
  console.log(await run(`mysql -u root -p"it92528!@" dbannajah -e "SELECT * FROM kehadiran_guru WHERE foto_masuk IS NOT NULL OR foto_keluar IS NOT NULL;" 2>/dev/null`));

  // 4. List ALL files in kehadiran-guru dir  
  console.log('\n=== ALL FILES IN KEHADIRAN-GURU ===');
  console.log(await run('ls -la /var/www/db_sas_annajah/backend/uploads/kehadiran-guru/'));

  // 5. Also test the actual built JS to see what URL pattern is used
  console.log('\n=== SEARCH IN BUILT JS ===');
  console.log(await run('grep -r "kehadiran-guru" /var/www/db_sas_annajah/frontend/dist/assets/ 2>/dev/null | head -10'));

  conn.end();
}).connect({
  host: '192.168.1.51',
  username: 'root',
  password: 'it92528!@',
  readyTimeout: 10000,
});
