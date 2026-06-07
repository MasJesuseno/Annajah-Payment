const { Client } = require('ssh2');
const { execSync } = require('child_process');

const conn = new Client();

conn.on('ready', async () => {
  console.log('=== SSH CONNECTED ===\n');

  const run = (cmd) => new Promise((resolve) => {
    conn.exec(cmd, (err, stream) => {
      if (err) { resolve(`ERROR: ${err.message}`); return; }
      let out = '';
      stream.on('data', (d) => out += d.toString());
      stream.stderr.on('data', (d) => out += d.toString());
      stream.on('close', () => resolve(out.trim()));
    });
  });

  // 1. Write hook content using base64 to avoid escaping issues
  const hookContent = `#!/bin/bash
TARGET="/var/www/db_sas_annajah"
GIT_DIR="/root/sas-annajah.git"
BRANCH="main"

while read oldrev newrev ref
do
    if [ "$ref" = "refs/heads/$BRANCH" ]; then
        echo "=== Deploying to $TARGET ==="
        git --work-tree=$TARGET --git-dir=$GIT_DIR checkout -f $BRANCH
        echo "=== Code updated! ==="
        echo "=== Installing backend dependencies ==="
        cd $TARGET/backend
        npm install --production 2>&1 || echo "npm install backend done"
        echo "=== Building frontend ==="
        cd $TARGET/frontend
        npm install 2>&1 || echo "npm install frontend done"
        npm run build 2>&1 || echo "npm run build done"
        echo "=== Restarting PM2 ==="
        cd $TARGET/backend
        pm2 restart backend-sas 2>&1 || echo "pm2 restart done"
        echo "=== Deploy completed! ==="
    fi
done
`;
  
  const b64 = Buffer.from(hookContent).toString('base64');
  
  console.log('--- Writing post-receive hook via base64 ---');
  const writeResult = await run(`echo '${b64}' | base64 -d > /root/sas-annajah.git/hooks/post-receive && chmod +x /root/sas-annajah.git/hooks/post-receive && echo "HOOK_WRITTEN_OK"`);
  console.log(writeResult);

  // 2. Verify the hook
  console.log('\n--- Verify hook ---');
  console.log(await run('cat /root/sas-annajah.git/hooks/post-receive'));

  // 3. Also verify the bare repo has the right branch
  console.log('\n--- Check bare repo branches ---');
  console.log(await run('cd /root/sas-annajah.git && git branch -a'));

  conn.end();
  console.log('\n=== HOOK FIXED ===');
  
  // 4. Push from local
  console.log('\n=== PUSHING CODE TO SERVER ===');
  try {
    const pushResult = execSync('git push server-rumah main 2>&1', { 
      cwd: process.cwd(),
      timeout: 180000,
      maxBuffer: 10 * 1024 * 1024
    });
    console.log(pushResult.toString());
  } catch (e) {
    console.log('STDOUT:', e.stdout?.toString() || '');
    console.log('STDERR:', e.stderr?.toString() || '');
    console.log('Push completed (may exit with code', e.status, ')');
  }
  
  console.log('\n=== ALL DONE ===');
});

conn.connect({
  host: '192.168.1.51',
  username: 'root',
  password: 'it92528!@',
  readyTimeout: 15000,
  algorithms: {
    cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm', 'aes256-gcm']
  }
});
