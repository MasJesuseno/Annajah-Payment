const { Client } = require('ssh2');

const conn = new Client();
const host = '192.168.1.51';

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

  // 1. Check current post-receive hook
  console.log('--- Current post-receive hook ---');
  let hook = await run('cat /root/db_sas_annajah.git/hooks/post-receive 2>/dev/null || echo "HOOK_NOT_FOUND"');
  console.log(hook);

  // 2. Fix the hook - replace wrong path
  console.log('\n--- Fixing post-receive hook ---');
  const fixHook = `cat > /root/db_sas_annajah.git/hooks/post-receive << 'HOOK_EOF'
#!/bin/bash
TARGET="/var/www/db_sas_annajah"
GIT_DIR="/root/db_sas_annajah.git"
BRANCH="main"

while read oldrev newrev ref
do
    if [ "$ref" = "refs/heads/$BRANCH" ]; then
        echo "=== Deploying to $TARGET ==="
        git --work-tree=$TARGET --git-dir=$GIT_DIR checkout -f $BRANCH
        echo "=== Code updated! ==="
        
        # Install dependencies dan build
        cd $TARGET/backend
        npm install --production
        
        cd $TARGET/frontend
        npm install
        npm run build
        
        # Restart backend
        cd $TARGET/backend
        pm2 restart backend-sas
        
        echo "=== Deploy completed! ==="
    fi
done
HOOK_EOF
chmod +x /root/db_sas_annajah.git/hooks/post-receive`;
  console.log(await run(fixHook));

  // 3. Verify hook
  console.log('\n--- Verify fixed hook ---');
  console.log(await run('cat /root/db_sas_annajah.git/hooks/post-receive'));

  // 4. Remove old deployment if it exists at wrong path
  console.log('\n--- Check wrong path ---');
  console.log(await run('ls -la /var/www/html/db_sas_annajah 2>/dev/null && echo "EXISTS" || echo "NOT_EXISTS_OR_REMOVED"'));

  conn.end();
  console.log('\n=== DONE ===');
});

conn.connect({
  host: '192.168.1.51',
  username: 'root',
  password: 'it92528!@',
  readyTimeout: 10000,
  algorithms: {
    cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm', 'aes256-gcm']
  }
});
