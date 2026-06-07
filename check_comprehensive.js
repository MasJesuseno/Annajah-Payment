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

  // 1. FULL nginx config
  console.log('=== SITES-ENABLED ===');
  console.log(await run('cat /etc/nginx/sites-enabled/* 2>/dev/null'));

  console.log('\n=== NGINX CONF.D ===');
  console.log(await run('cat /etc/nginx/conf.d/*.conf 2>/dev/null'));

  // 2. Count records with photos
  console.log('\n=== DATA KEHADIRAN DENGAN FOTO ===');
  console.log(await run(`mysql -u root -p"it92528!@" dbannajah -e "
    SELECT COUNT(*) as total_with_photos FROM kehadiran_guru WHERE foto_masuk IS NOT NULL OR foto_keluar IS NOT NULL;
    SELECT COUNT(*) as total_all FROM kehadiran_guru;
    SELECT id, id_guru, tanggal, foto_masuk, foto_keluar FROM kehadiran_guru WHERE foto_masuk IS NOT NULL OR foto_keluar IS NOT NULL ORDER BY id;
  " 2>/dev/null`));

  // 3. Check file permissions
  console.log('\n=== FILE PERMISSIONS ===');
  console.log(await run('ls -la /var/www/db_sas_annajah/backend/uploads/kehadiran-guru/ 2>/dev/null'));
  console.log(await run('ls -la /var/www/db_sas_annajah/backend/uploads/guru/ 2>/dev/null'));

  // 4. Test via curl with the domain URL
  console.log('\n=== TEST VIA DOMAIN (localhost curl) ===');
  const files = (await run('ls /var/www/db_sas_annajah/backend/uploads/kehadiran-guru/ 2>/dev/null')).trim().split('\n');
  for (const f of files) {
    if (f.trim()) {
      const result = await run(`curl -s -D - "http://localhost:5000/uploads/kehadiran-guru/${f.trim()}" 2>/dev/null | head -20`);
      console.log(`\nFile: ${f.trim()}`);
      console.log(result.substring(0, 300));
    }
  }

  // 5. Check the actual JS bundle for how URLs are formed  
  console.log('\n=== CHECK BUILT JS FOR IMAGE PATHS ===');
  console.log(await run('grep -l "kehadiran-guru" /var/www/db_sas_annajah/frontend/dist/assets/*.js 2>/dev/null'));
  console.log(await run('grep -o "uploads/[^\"]*" /var/www/db_sas_annajah/frontend/dist/assets/*.js 2>/dev/null | head -20'));

  // 6. Cloudflare or reverse proxy check
  console.log('\n=== NGINX TEST ===');
  console.log(await run('nginx -t 2>&1'));

  conn.end();
}).connect({
  host: '192.168.1.51',
  username: 'root',
  password: 'it92528!@',
  readyTimeout: 10000,
});
