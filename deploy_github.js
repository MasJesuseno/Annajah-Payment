const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', async () => {
  console.log('=== SSH CONNECTED ===\n');

  const run = (cmd) => new Promise((resolve) => {
    conn.exec(cmd, (err, stream) => {
      if (err) { resolve(`ERROR: ${err.message}`); return; }
      let out = '';
      stream.on('data', (d) => out += d.toString());
      stream.stderr.on('data', (d) => out += d.toString());
      stream.on('close', () => resolve(out.trim()));
    });
  });

  // 1. Backup current folder first
  console.log('--- Backup existing app ---');
  console.log(await run('cp -r /var/www/db_sas_annajah /var/www/db_sas_annajah_bak_$(date +%Y%m%d_%H%M%S) 2>/dev/null; echo "BACKUP_DONE"'));

  // 2. Remove old app folder (but keep uploads!)
  console.log('\n--- Clean app folder (keeping uploads) ---');
  console.log(await run('cd /var/www/db_sas_annajah && mkdir -p /tmp/upload_backup && cp -r uploads /tmp/upload_backup/ 2>/dev/null; echo "UPLOADS_BACKEDUP"'));

  // 3. Clone from GitHub
  console.log('\n--- Clone from GitHub ---');
  console.log(await run('rm -rf /var/www/db_sas_annajah && git clone https://github.com/susenorg/db_sas_annajah.git /var/www/db_sas_annajah 2>&1 | tail -5'));

  // 4. Restore uploads from backup
  console.log('\n--- Restore uploads ---');
  console.log(await run('cp -r /tmp/upload_backup/uploads /var/www/db_sas_annajah/ 2>/dev/null; echo "UPLOADS_RESTORED"'));

  // 5. Install backend dependencies
  console.log('\n--- Installing backend dependencies ---');
  console.log(await run('cd /var/www/db_sas_annajah/backend && npm install --production 2>&1 | tail -5'));

  // 6. Install frontend dependencies & build
  console.log('\n--- Building frontend ---');
  console.log(await run('cd /var/www/db_sas_annajah/frontend && npm install 2>&1 | tail -5 && npm run build 2>&1 | tail -10'));

  // 7. Restart PM2
  console.log('\n--- Restarting PM2 ---');
  console.log(await run('cd /var/www/db_sas_annajah/backend && pm2 restart backend-sas 2>&1'));

  // 8. Verify deployment
  console.log('\n--- Verify ---');
  console.log(await run('pm2 list 2>&1 | head -5'));
  console.log(await run('ls /var/www/db_sas_annajah/frontend/dist/ 2>/dev/null | head -5 || echo "DIST_NOT_FOUND"'));
  console.log(await run('ls /var/www/db_sas_annajah/uploads/ 2>/dev/null'));

  conn.end();
  console.log('\n=== DEPLOYMENT COMPLETE ===');
});

conn.connect({
  host: '192.168.1.51',
  username: 'root',
  password: 'it92528!@',
  readyTimeout: 15000,
  algorithms: {
    cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm', 'aes256-gcm']
  }
});
