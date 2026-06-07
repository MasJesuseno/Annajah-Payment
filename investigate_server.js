/**
 * Investigasi struktur server untuk memahami deployment
 */
const { Client } = require('ssh2');

const HOST = '192.168.1.51';
const USER = 'root';
const PASSWORD = 'it92528!@';

function runCmd(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('data', (data) => { stdout += data.toString(); });
      stream.stderr.on('data', (data) => { stderr += data.toString(); });
      stream.on('close', () => resolve({ stdout, stderr }));
    });
  });
}

async function main() {
  const conn = new Client();
  
  conn.on('ready', async () => {
    console.log('✅ TERHUBUNG\n');
    
    // 1. Cek struktur /var/www
    console.log('=== STRUKTUR /var/www ===');
    let r = await runCmd(conn, 'ls -la /var/www/ 2>&1');
    console.log(r.stdout || r.stderr);
    
    // 2. Cek apakah ada .git di folder app
    console.log('\n=== APAKAH ADA .GIT? ===');
    r = await runCmd(conn, 'ls -la /var/www/db_sas_annajah/.git 2>&1');
    console.log(r.stdout || r.stderr);
    
    // 3. Cek bare repo
    console.log('\n=== BARE REPO ===');
    r = await runCmd(conn, 'ls -la /root/sas-annajah.git 2>&1');
    console.log(r.stdout || r.stderr);
    
    // 4. Cek hooks (auto-deploy?)
    console.log('\n=== GIT HOOKS ===');
    r = await runCmd(conn, 'ls -la /root/sas-annajah.git/hooks/ 2>&1');
    console.log(r.stdout || r.stderr);
    r = await runCmd(conn, 'cat /root/sas-annajah.git/hooks/post-receive 2>&1');
    console.log('post-receive:', r.stdout || r.stderr);
    r = await runCmd(conn, 'cat /root/sas-annajah.git/hooks/post-update 2>&1');
    console.log('post-update:', r.stdout || r.stderr);
    
    // 5. Cek apakah ada script deploy di server
    console.log('\n=== SCRIPT DEPLOY ===');
    r = await runCmd(conn, 'ls /var/www/db_sas_annajah/update-server.sh 2>&1; cat /var/www/db_sas_annajah/update-server.sh 2>&1 | head -5');
    console.log(r.stdout || r.stderr);
    
    // 6. Cek frontend dist vs git
    console.log('\n=== GIT LOG DI SERVER ===');
    r = await runCmd(conn, 'cd /root/sas-annajah.git && git log --oneline -5 2>&1');
    console.log(r.stdout || r.stderr);
    
    // 7. Cek isi direktori frontend dist
    console.log('\n=== FRONTEND DIST ===');
    r = await runCmd(conn, 'ls -la /var/www/db_sas_annajah/frontend/dist/assets/ 2>&1');
    console.log(r.stdout || r.stderr);
    
    // 8. Cek apakah vite ada
    console.log('\n=== CEK VITE ===');
    r = await runCmd(conn, 'ls -la /var/www/db_sas_annajah/frontend/node_modules/.bin/vite 2>&1');
    console.log(r.stdout || r.stderr);
    r = await runCmd(conn, 'ls -la /var/www/db_sas_annajah/frontend/node_modules/vite/bin/vite.js 2>&1');
    console.log(r.stdout || r.stderr);
    
    conn.end();
    console.log('\n✅ SELESAI');
  });
  
  conn.on('error', (err) => {
    console.error('ERROR:', err.message);
    process.exit(1);
  });
  
  conn.connect({
    host: HOST,
    port: 22,
    username: USER,
    password: PASSWORD,
    readyTimeout: 10000,
  });
}

main();
