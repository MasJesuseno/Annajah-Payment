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

  // 1. Kapan frontend terakhir di-build?
  console.log('=== FRONTEND BUILD TIME ===');
  console.log(await run('stat /var/www/db_sas_annajah/frontend/dist/index.html 2>/dev/null | grep -i modify'));
  console.log(await run('ls -la /var/www/db_sas_annajah/frontend/dist/assets/ 2>/dev/null | head -10'));

  // 2. Cek apakah ada file package.json di frontend
  console.log('\n=== FRONTEND PACKAGE.JSON ===');
  console.log(await run('cat /var/www/db_sas_annajah/frontend/package.json 2>/dev/null | head -30'));

  // 3. Cek apakah node_modules ada
  console.log('\n=== NODE_MODULES CEK ===');
  console.log(await run('ls /var/www/db_sas_annajah/frontend/node_modules/.package-lock.json 2>/dev/null && echo "node_modules exists" || echo "node_modules NOT found"'));

  // 4. Cek update-server.sh
  console.log('\n=== UPDATE-SERVER.SH ===');
  console.log(await run('cat /var/www/db_sas_annajah/update-server.sh 2>/dev/null || echo "File not found"'));

  // 5. Cek apakah post-receive hook di bare repo berfungsi
  console.log('\n=== BARE REPO HOOK ===');
  console.log(await run('cat /root/sas-annajah.git/hooks/post-receive 2>/dev/null || echo "No post-receive hook"'));

  // 6. Cek backend package.json untuk versi
  console.log('\n=== BACKEND PACKAGE ===');
  console.log(await run('cat /var/www/db_sas_annajah/backend/package.json 2>/dev/null | grep -E "name|version|description"'));

  conn.end();
}).connect({
  host: '192.168.1.51',
  username: 'root',
  password: 'it92528!@',
  readyTimeout: 10000,
});
