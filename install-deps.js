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

const rootDir = __dirname;
const clientDir = path.join(rootDir, 'client');

console.log('Installing server dependencies...');
run('npm.cmd install', rootDir);

console.log('\nInstalling client (frontend) dependencies...');
run('npm.cmd install', clientDir);

console.log('\n=== All dependencies installed successfully! ===');
console.log('\nTo run:');
console.log('  Production: npm.cmd start');
console.log('  Client dev: cd client && npm.cmd run dev');
console.log('  Both:       npm.cmd run dev:all');
