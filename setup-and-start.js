const { execSync, spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const clientDir = path.join(rootDir, 'client');

console.log('============================================');
console.log('  SMA Annajah - Sistem Administrasi Sekolah');
console.log('============================================\n');

function run(cmd, cwd) {
  console.log(`  > ${cmd} (di ${path.basename(cwd)})`);
  try {
    execSync(cmd, { cwd, stdio: 'inherit', shell: true });
    return true;
  } catch (e) {
    console.error(`  [ERROR] ${e.message}`);
    return false;
  }
}

// Install server
console.log('[1/2] Install Server Dependencies...\n');
if (!run('npm.cmd install', rootDir)) {
  console.error('\nGagal install server. Pastikan Node.js sudah terinstall.');
  process.exit(1);
}

// Install client
console.log('\n[2/2] Install Client (Frontend) Dependencies...\n');
if (!run('npm.cmd install', clientDir)) {
  console.error('\nGagal install client. Pastikan Node.js sudah terinstall.');
  process.exit(1);
}

console.log('\n✅ Semua dependencies terinstall!\n');
console.log('============================================');
console.log('  Memulai Server...');
console.log('============================================\n');

// Start Backend
console.log('  [Server] Menjalankan di port 3000...\n');
const backend = spawn('node', ['server.js'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true
});

backend.on('error', (err) => {
  console.error(`  [Backend Error] ${err.message}`);
});

// Start Frontend after a moment
setTimeout(() => {
  console.log('\n  [Frontend] Menjalankan di port 3000...\n');
  const frontend = spawn('npm.cmd', ['run', 'dev'], {
    cwd: clientDir,
    stdio: 'inherit',
    shell: true
  });

  frontend.on('error', (err) => {
    console.error(`  [Frontend Error] ${err.message}`);
  });

  frontend.on('close', () => {
    backend.kill();
    process.exit(0);
  });

  console.log('\n============================================');
  console.log('  ✅ APLIKASI SIAP!');
  console.log('============================================\n');
  console.log('  Buka browser: http://localhost:3001\n');
  console.log('  Akun Demo:');
  console.log('    Admin     : admin / admin123');
  console.log('    Bendahara : bendahara / bendahara123\n');
  console.log('  (Tekan Ctrl+C di jendela ini untuk stop)\n');
}, 3000);

process.on('SIGINT', () => {
  console.log('\n  Menghentikan server...');
  process.exit(0);
});
