const Client = require('ssh2-sftp-client');
const path = require('path');
const fs = require('fs');

const REMOTE_APP = '/var/www/db_sas_annajah';
const LOCAL_ROOT = process.cwd();

// Files/dirs to exclude from upload
const EXCLUDE = new Set([
  '.git', 'node_modules', 'dist', '.pnpm-store',
  'sync_uploads.js', 'sync_uploads_to_server.py',
  'fix_hook.js', 'find_repo.js', 'check_repos.js',
  'fix_and_push.js', 'deploy_github.js', 'check_*.js',
  'fix_*.js', 'deploy_*.js', 'investigate_*.js',
  'rebuild_*.js', 'restart_*.js', 'sync_uploads*',
  'check_server*', 'check_db*', 'check_domain*',
  'check_foto*', 'check_fast*', 'check_nginx*',
  'check_frontend*', 'check_table*', 'check_headers*',
  'check_build*', 'check_comprehensive*',
  'backend/node_modules', 'backend/uploads',
  'frontend/node_modules', 'frontend/dist',
]);

function shouldExclude(relativePath) {
  const parts = relativePath.split(/[/\\]/);
  return parts.some(p => EXCLUDE.has(p));
}

async function collectFiles(dir, baseDir = dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    if (shouldExclude(relativePath)) continue;
    if (entry.isDirectory()) {
      const subFiles = await collectFiles(fullPath, baseDir);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

async function upload() {
  console.log('=== Collecting files to upload ===');
  const files = await collectFiles(LOCAL_ROOT);
  console.log(`Found ${files.length} files to upload (excluding git, node_modules, etc.)\n`);

  const sftp = new Client();
  
  try {
    console.log('=== Connecting to server ===');
    await sftp.connect({
      host: '192.168.1.51',
      username: 'root',
      password: 'it92528!@',
      readyTimeout: 15000,
      algorithms: {
        cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm', 'aes256-gcm']
      }
    });
    console.log('Connected!\n');

    // Upload each file
    let count = 0;
    const total = files.length;
    const startTime = Date.now();
    
    for (const filePath of files) {
      const relativePath = path.relative(LOCAL_ROOT, filePath);
      const remotePath = path.join(REMOTE_APP, relativePath).replace(/\\/g, '/');
      const remoteDir = path.dirname(remotePath);
      
      try {
        // Ensure directory exists
        await sftp.mkdir(remoteDir, true);
        // Upload file
        await sftp.put(filePath, remotePath);
        count++;
        if (count % 50 === 0) {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          console.log(`Progress: ${count}/${total} files (${elapsed}s)`);
        }
      } catch (err) {
        console.error(`FAILED: ${relativePath}: ${err.message}`);
      }
    }
    
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n=== Upload complete: ${count}/${total} files in ${elapsed}s ===`);

    // Execute post-deploy commands via SSH
    console.log('\n=== Running post-deploy commands ===');
    const SSH2 = require('ssh2');
    
    const commands = [
      `cd ${REMOTE_APP}/backend && npm install --production 2>&1 | tail -5`,
      `cd ${REMOTE_APP}/frontend && npm install 2>&1 | tail -5`,
      `cd ${REMOTE_APP}/frontend && npm run build 2>&1 | tail -10`,
      `cd ${REMOTE_APP}/backend && pm2 restart backend-sas 2>&1`,
      `echo "=== VERIFY ===" && pm2 list 2>&1 | head -5`,
      `ls ${REMOTE_APP}/frontend/dist/ 2>/dev/null | head -5 || echo "DIST_NOT_FOUND"`,
      `curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/uploads/kehadiran-guru/`,
      `curl -s -o /dev/null -w " %{http_code}" http://localhost:5000/uploads/guru/`,
    ];

    const conn = new SSH2.Client();
    await new Promise((resolve, reject) => {
      conn.on('ready', async () => {
        for (const cmd of commands) {
          console.log(`\n$ ${cmd}`);
          try {
            const result = await new Promise((r) => {
              conn.exec(cmd, (err, stream) => {
                if (err) { r(`ERROR: ${err.message}`); return; }
                let out = '';
                stream.on('data', (d) => out += d.toString());
                stream.stderr.on('data', (d) => out += d.toString());
                stream.on('close', () => r(out.trim()));
              });
            });
            console.log(result);
          } catch (e) {
            console.log(`ERROR: ${e.message}`);
          }
        }
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

    console.log('\n=== DEPLOYMENT COMPLETE ===');
    
  } catch (err) {
    console.error('FATAL:', err.message);
  } finally {
    await sftp.end();
  }
}

upload();
