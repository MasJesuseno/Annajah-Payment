/**
 * Script untuk menjalankan update lengkap di server 192.168.1.51
 * 1. git pull
 * 2. npm install backend
 * 3. npm install & npm run build frontend
 * 4. pm2 restart backend-sas
 */
const { Client } = require('ssh2');

const HOST = '192.168.1.51';
const USER = 'root';
const PASSWORD = 'it92528!@';
const APP_DIR = '/var/www/db_sas_annajah';

function runCmd(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('data', (data) => { stdout += data.toString(); });
      stream.stderr.on('data', (data) => { stderr += data.toString(); });
      stream.on('close', (code) => resolve({ stdout, stderr, code }));
    });
  });
}

async function main() {
  const conn = new Client();
  
  conn.on('ready', async () => {
    console.log('✅ TERHUBUNG KE SERVER\n');
    
    try {
      // Step 1: Git pull
      console.log('📥 [1/5] Git pull...');
      let r = await runCmd(conn, `cd ${APP_DIR} && git pull origin main 2>&1`);
      console.log(r.stdout || r.stderr);
      
      // Step 2: Backend install
      console.log('\n📦 [2/5] Install backend dependencies...');
      r = await runCmd(conn, `cd ${APP_DIR}/backend && npm install --production 2>&1 | tail -5`);
      console.log(r.stdout || r.stderr);
      
      // Step 3: Frontend install
      console.log('\n📦 [3/5] Install frontend dependencies...');
      r = await runCmd(conn, `cd ${APP_DIR}/frontend && npm install 2>&1 | tail -5`);
      console.log(r.stdout || r.stderr);
      
      // Step 4: Build frontend
      console.log('\n🎨 [4/5] Build frontend...');
      r = await runCmd(conn, `cd ${APP_DIR}/frontend && npm run build 2>&1 | tail -10`);
      console.log(r.stdout || r.stderr);
      
      // Step 5: Restart PM2
      console.log('\n🔄 [5/5] Restart PM2...');
      r = await runCmd(conn, `cd ${APP_DIR}/backend && pm2 restart backend-sas 2>&1`);
      console.log(r.stdout || r.stderr);
      
      // Final check
      console.log('\n=== FINAL CHECK ===');
      r = await runCmd(conn, `pm2 list --no-color 2>&1 | head -10`);
      console.log(r.stdout || r.stderr);
      
      console.log('\n✅ UPDATE SELESAI!');
      console.log('Silakan refresh halaman Kehadiran Guru.');
      
    } catch (err) {
      console.error('ERROR:', err.message);
    }
    
    conn.end();
  });
  
  conn.on('error', (err) => {
    console.error('KONEKSI ERROR:', err.message);
    process.exit(1);
  });
  
  conn.connect({
    host: HOST,
    port: 22,
    username: USER,
    password: PASSWORD,
    readyTimeout: 15000,
  });
}

main();
