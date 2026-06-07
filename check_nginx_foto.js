const { Client } = require('ssh2');
const conn = new Client();
const fs = require('fs');

conn.on('ready', async () => {
  const run = (cmd) => new Promise((r) => {
    conn.exec(cmd, (e, s) => {
      let o = '';
      s.on('data', (d) => o += d);
      s.stderr.on('data', (d) => o += d);
      s.on('close', () => r(o));
    });
  });

  // 1. Nginx config
  console.log('=== NGINX CONFIG ===');
  console.log(await run('cat /etc/nginx/sites-enabled/default 2>/dev/null || cat /etc/nginx/conf.d/default.conf 2>/dev/null || cat /etc/nginx/nginx.conf 2>/dev/null | head -80'));

  // 2. List ALL files in uploads
  console.log('\n=== UPLOADS TREE ===');
  console.log(await run('find /var/www/db_sas_annajah/backend/uploads/ -type f 2>/dev/null'));

  // 3. Database values for kehadiran_guru
  console.log('\n=== DB FOTO VALUES ===');
  console.log(await run(`mysql -u root -p"it92528!@" dbannajah -e "SELECT id, id_guru, foto_masuk, foto_keluar FROM kehadiran_guru WHERE foto_masuk IS NOT NULL OR foto_keluar IS NOT NULL ORDER BY id DESC LIMIT 20;" 2>/dev/null`));

  // 4. Test HTTP access for each foto file
  console.log('\n=== HTTP ACCESS TEST ===');
  const fotoFiles = (await run('ls /var/www/db_sas_annajah/backend/uploads/kehadiran-guru/ 2>/dev/null')).trim().split('\n');
  for (const f of fotoFiles) {
    if (f.trim()) {
      const code = await run(`curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000/uploads/kehadiran-guru/${f.trim()}" 2>/dev/null`);
      console.log(`  /uploads/kehadiran-guru/${f.trim()} -> HTTP ${code}`);
    }
  }

  // 5. Check how the frontend is served
  console.log('\n=== FRONTEND DIST CHECK ===');
  console.log(await run('ls -la /var/www/db_sas_annajah/frontend/dist/assets/ 2>/dev/null | head -10'));
  console.log(await run('stat /var/www/db_sas_annajah/frontend/dist/index.html 2>/dev/null | grep Modify'));

  conn.end();
}).connect({
  host: '192.168.1.51',
  username: 'root',
  password: 'it92528!@',
  readyTimeout: 10000,
});
