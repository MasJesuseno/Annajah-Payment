const { execSync } = require('child_process');
const path = require('path');

function run(cmd, cwd) {
  console.log(`\n=== Running: ${cmd} in ${cwd} ===`);
  try {
    execSync(cmd, { cwd, stdio: 'inherit', shell: true });
  } catch (e) {
    console.error(`Failed: ${e.message}`);
    process.exit(1);
  }
}

const backendDir = path.join(__dirname, 'backend');
const frontendDir = path.join(__dirname, 'frontend');

console.log('Installing backend dependencies...');
run('npm.cmd install', backendDir);

console.log('\nInstalling frontend dependencies...');
run('npm.cmd install', frontendDir);

console.log('\n=== All dependencies installed successfully! ===');
console.log('\nTo run:');
console.log('  Backend:  cd backend && npm.cmd start');
console.log('  Frontend: cd frontend && npm.cmd run dev');
