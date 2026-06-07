const Client = require('ssh2-sftp-client');
const path = require('path');
const fs = require('fs');

const REMOTE_APP = '/var/www/db_sas_annajah';
const LOCAL_UPLOADS = path.join(process.cwd(), 'backend', 'uploads');

async function uploadDir(sftp, localDir, remoteDir) {
  const entries = fs.readdirSync(localDir, { withFileTypes: true });
  for (const entry of entries) {
    const localPath = path.join(localDir, entry.name);
    const remotePath = `${remoteDir}/${entry.name}`;
    if (entry.isDirectory()) {
      await sftp.mkdir(remotePath, true);
      await uploadDir(sftp, localPath, remotePath);
    } else if (entry.isFile()) {
      try {
        await sftp.put(localPath, remotePath);
        console.log(`  UPLOADED: ${path.relative(LOCAL_UPLOADS, localPath)}`);
      } catch (e) {
        console.log(`  FAILED: ${entry.name}: ${e.message}`);
      }
    }
  }
}

async function main() {
  // First check if backup exists on server via SSH
  console.log('=== Checking for backup on server ===');
  const SSH2 = require('ssh2');
  
  const conn = new SSH2.Client();
  await new Promise((resolve, reject) => {
    conn.on('ready', async () => {
      const run = (cmd) => new Promise((r) => {
        conn.exec(cmd, (err, stream) => {
          if (err) { r(`ERROR: ${err.message}`); return; }
          let out = '';
          stream.on('data', (d) => out += d.toString());
          stream.stderr.on('data', (d) => out += d.toString());
          stream.on('close', () => r(out.trim()));
        });
      });
      
      // Check backup
      const backupCheck = await run('ls -d /var/www/db_sas_annajah_bak_* 2>/dev/null | head -1');
      if (backupCheck && !backupCheck.startsWith('ERROR') && !backupCheck.includes('No such')) {
        console.log(`Backup found: ${backupCheck}`);
        console.log('Restoring uploads from backup...');
        const restore = await run(`cp -r ${backupCheck}/uploads ${REMOTE_APP}/uploads 2>/dev/null && echo "RESTORED" || echo "FAILED"`);
        console.log(`Restore: ${restore}`);
      } else {
        console.log('No backup found, will upload from local');
      }
      
      // List current uploads
      console.log('\nCurrent uploads:');
      console.log(await run(`ls -la ${REMOTE_APP}/uploads/ 2>/dev/null || echo "NOT_FOUND"`));
      
      conn.end();
      resolve();
    });
    conn.on('error', reject);
    conn.connect({
      host: '192.168.1.51',
      username: 'root',
      password: 'it92528!@',
      readyTimeout: 15000,
      algorithms: {
        cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm', 'aes256-gcm']
      }
    });
  });

  // If no backup, upload from local
  const sftp = new Client();
  try {
    await sftp.connect({
      host: '192.168.1.51',
      username: 'root',
      password: 'it92528!@',
      readyTimeout: 15000,
      algorithms: {
        cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm', 'aes256-gcm']
      }
    });

    if (fs.existsSync(LOCAL_UPLOADS)) {
      console.log(`\n=== Uploading from local: ${LOCAL_UPLOADS} ===`);
      await uploadDir(sftp, LOCAL_UPLOADS, `${REMOTE_APP}/uploads`);
      console.log('=== Upload complete ===');
    } else {
      console.log(`\nLocal uploads not found at: ${LOCAL_UPLOADS}`);
    }
  } finally {
    await sftp.end();
  }

  // Final verification via SSH
  console.log('\n=== Final verification ===');
  const conn2 = new SSH2.Client();
  await new Promise((resolve, reject) => {
    conn2.on('ready', async () => {
      const run = (cmd) => new Promise((r) => {
        conn2.exec(cmd, (err, stream) => {
          if (err) { r(`ERROR: ${err.message}`); return; }
          let out = '';
          stream.on('data', (d) => out += d.toString());
          stream.stderr.on('data', (d) => out += d.toString());
          stream.on('close', () => r(out.trim()));
        });
      });
      
      console.log(await run(`echo "=== Uploads ===" && ls -R ${REMOTE_APP}/uploads/ 2>/dev/null | head -30`));
      console.log(await run(`for f in ${REMOTE_APP}/uploads/kehadiran-guru/*.jpg 2>/dev/null; do echo "Testing \$(basename \$f)"; curl -s -o /dev/null -w "HTTP %{http_code}\n" "http://localhost:5000/uploads/kehadiran-guru/\$(basename \$f)"; done`));
      console.log(await run(`for f in ${REMOTE_APP}/uploads/guru/*.jpg 2>/dev/null; do echo "Testing \$(basename \$f)"; curl -s -o /dev/null -w "HTTP %{http_code}\n" "http://localhost:5000/uploads/guru/\$(basename \$f)"; done`));
      
      conn2.end();
      resolve();
    });
    conn2.on('error', reject);
    conn2.connect({
      host: '192.168.1.51',
      username: 'root',
      password: 'it92528!@',
      readyTimeout: 15000,
      algorithms: {
        cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm', 'aes256-gcm']
      }
    });
  });
}

main().catch(console.error);
