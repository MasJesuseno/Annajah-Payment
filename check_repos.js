const { Client } = require('ssh2');

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

  const cmds = [
    'echo "=== sas-annajah.git hooks ===" && ls -la /root/sas-annajah.git/hooks/',
    'echo "--- post-receive ---" && cat /root/sas-annajah.git/hooks/post-receive 2>/dev/null || echo "NO_FILE"',
    'echo "=== project.git hooks ===" && ls -la /root/project.git/hooks/',
    'echo "--- post-receive ---" && cat /root/project.git/hooks/post-receive 2>/dev/null || echo "NO_FILE"',
    'echo "=== sas-annajah.git config ===" && cat /root/sas-annajah.git/config 2>/dev/null || echo "NO_CONFIG"',
    'echo "=== project.git config ===" && cat /root/project.git/config 2>/dev/null || echo "NO_CONFIG"',
    'echo "=== App folder contents ===" && ls -la /var/www/db_sas_annajah/ | head -20',
    'echo "=== Check if PM2 runs backend from this path ===" && pm2 describe backend-sas 2>/dev/null | head -20 || echo "NO_PM2_BACKEND"',
    'echo "=== PM2 list ===" && pm2 list 2>/dev/null || echo "PM2_NOT_FOUND"',
  ];
  
  for (const cmd of cmds) {
    console.log(await run(cmd));
    console.log('');
  }

  conn.end();
  console.log('=== DONE ===');
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
