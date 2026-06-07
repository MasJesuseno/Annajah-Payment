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

  // Cari bare repo (.git bare)
  console.log('--- Cari bare git repositories ---');
  const cmds = [
    'find / -name "*.git" -type d 2>/dev/null | head -10',
    'find /root -name "post-receive" 2>/dev/null',
    'find /home -name "post-receive" 2>/dev/null',
    'find /var -name "*.git" -type d 2>/dev/null | head -10',
    'ls -la /root/ | head -20',
    'ls -la /var/www/db_sas_annajah/.git 2>/dev/null || echo "NO_GIT_IN_APP_DIR"',
    'cat /var/www/db_sas_annajah/.git/config 2>/dev/null || echo "NO_GIT_CONFIG"',
    'cat /var/www/db_sas_annajah/update-server.sh 2>/dev/null || echo "NO_UPDATE_SCRIPT"',
  ];
  
  for (const cmd of cmds) {
    console.log(`$ ${cmd}`);
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
