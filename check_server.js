/**
 * Script untuk mengecek status server 192.168.1.51
 * Cek: PM2, file uploads, frontend build
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
    console.log('✅ TERHUBUNG KE SERVER\n');
    
    // 1. Cek PM2
    console.log('=== PM2 STATUS ===');
    let r = await runCmd(conn, 'pm2 list --no-color 2>&1 | head -20');
    console.log(r.stdout || r.stderr);
    
    // 2. Cek file uploads
    console.log('\n=== FILE UPLOADS ===');
    r = await runCmd(conn, 'ls -la /var/www/db_sas_annajah/backend/uploads/kehadiran-guru/ 2>&1');
    console.log(r.stdout || r.stderr);
    
    console.log('\n=== FILE FOTO GURU ===');
    r = await runCmd(conn, 'ls -la /var/www/db_sas_annajah/backend/uploads/guru/ 2>&1');
    console.log(r.stdout || r.stderr);
    
    // 3. Cek frontend build
    console.log('\n=== FRONTEND BUILD ===');
    r = await runCmd(conn, 'ls -la /var/www/db_sas_annajah/frontend/dist/assets/ 2>&1 | head -10');
    console.log(r.stdout || r.stderr);
    
    // 4. Cek port backend
    console.log('\n=== BACKEND PORT ===');
    r = await runCmd(conn, 'ss -tlnp | grep 5000 2>&1 || netstat -tlnp 2>/dev/null | grep 5000');
    console.log(r.stdout || r.stderr);
    
    // 5. Test akses foto langsung
    console.log('\n=== TEST AKSES FOTO ===');
    r = await runCmd(conn, 'curl -s -o /dev/null -w "HTTP %{http_code} (%{size_download} bytes)" http://127.0.0.1:5000/uploads/kehadiran-guru/ 2>&1; echo');
    console.log('Backend /uploads:', r.stdout || r.stderr);
    
    r = await runCmd(conn, 'for f in /var/www/db_sas_annajah/backend/uploads/kehadiran-guru/*; do echo "$(basename $f): $(curl -s -o /dev/null -w \"%{http_code}\" http://127.0.0.1:5000/uploads/kehadiran-guru/$(basename $f))"; done 2>&1');
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
