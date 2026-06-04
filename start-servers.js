const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const rootDir = __dirname;
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

console.log('============================================');
console.log('  SMA Annajah - Sistem Administrasi Sekolah');
console.log('============================================');
console.log('');

function waitForServer(url, label, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      http.get(url, (res) => {
        console.log(`  [OK] ${label} siap di ${url}`);
        resolve();
      }).on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error(`${label} tidak merespon setelah ${timeout/1000} detik`));
        } else {
          setTimeout(check, 1000);
        }
      });
    }
    setTimeout(check, 2000);
  });
}

// Start Backend
console.log('[1] Menjalankan Backend (port 5000)...');
const backend = spawn('node', ['server.js'], {
  cwd: backendDir,
  stdio: 'pipe',
  shell: true
});

backend.stdout.on('data', (data) => {
  console.log(`  [Backend] ${data.toString().trim()}`);
});

backend.stderr.on('data', (data) => {
  console.error(`  [Backend Error] ${data.toString().trim()}`);
});

backend.on('close', (code) => {
  console.log(`  [Backend] Proses selesai (kode: ${code})`);
});

// Start Frontend
console.log('[2] Menjalankan Frontend (port 3000)...');
const frontend = spawn('npm.cmd', ['run', 'dev'], {
  cwd: frontendDir,
  stdio: 'pipe',
  shell: true
});

frontend.stdout.on('data', (data) => {
  const msg = data.toString().trim();
  console.log(`  [Frontend] ${msg}`);
  // Check when Vite is ready
  if (msg.includes('Local:') || msg.includes('localhost')) {
    console.log('');
    console.log('============================================');
    console.log('  APLIKASI SIAP DIGUNAKAN!');
    console.log('============================================');
    console.log('');
    console.log('  Buka browser Anda:');
    console.log('  http://localhost:3000');
    console.log('');
    console.log('  Akun Demo:');
    console.log('  Admin     : admin / admin123');
    console.log('  Bendahara : bendahara / bendahara123');
    console.log('');
    console.log('  Tekan Ctrl+C untuk menghentikan server');
    console.log('');
  }
});

frontend.stderr.on('data', (data) => {
  console.error(`  [Frontend Error] ${data.toString().trim()}`);
});

frontend.on('close', (code) => {
  console.log(`  [Frontend] Proses selesai (kode: ${code})`);
  backend.kill();
  process.exit(0);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n  Menghentikan server...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});
