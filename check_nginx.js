/**
 * Cek nginx config dan web root di server
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
    
    // 1. Cek nginx site config
    console.log('=== NGINX SITES-AVAILABLE ===');
    let r = await runCmd(conn, 'ls /etc/nginx/sites-available/ 2>&1');
    console.log(r.stdout || r.stderr);
    
    console.log('\n=== NGINX SITES-ENABLED ===');
    r = await runCmd(conn, 'ls /etc/nginx/sites-enabled/ 2>&1');
    console.log(r.stdout || r.stderr);
    
    // 2. Baca config nginx untuk sas_annajah
    console.log('\n=== NGINX CONFIG SAS ANNAJAH ===');
    r = await runCmd(conn, 'cat /etc/nginx/sites-available/sas_annajah 2>&1');
    console.log(r.stdout || r.stderr);
    
    // 3. Cek apakah ada folder /var/www/html/db_sas_annajah
    console.log('\n=== CEK /var/www/html/db_sas_annajah ===');
    r = await runCmd(conn, 'ls -la /var/www/html/db_sas_annajah/ 2>&1 | head -10');
    console.log(r.stdout || r.stderr);
    
    // 4. Cek pm2 working directory
    console.log('\n=== PM2 WORKDIR ===');
    r = await runCmd(conn, 'pm2 show backend-sas --no-color 2>&1 | grep -i "cwd\\|exec\\|script\\|working\\|root" | head -10');
    console.log(r.stdout || r.stderr);
    
    // 5. Cek juga apakah ada symlink
    console.log('\n=== CEK SYMLINK ===');
    r = await runCmd(conn, 'ls -la /var/www/ 2>&1');
    console.log(r.stdout || r.stderr);
    r = await runCmd(conn, 'readlink -f /var/www/html 2>&1');
    console.log('readlink html:', r.stdout || r.stderr);
    r = await runCmd(conn, 'file /var/www/html 2>&1');
    console.log('file type:', r.stdout || r.stderr);
    
    // 6. Cek post-receive hook detail
    console.log('\n=== POST-RECEIVE HOOK ===');
    r = await runCmd(conn, 'cat /root/sas-annajah.git/hooks/post-receive 2>&1');
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
