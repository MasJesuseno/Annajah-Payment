const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', async () => {
  const run = (cmd) => new Promise((r) => {
    conn.exec(cmd, (err, s) => {
      if (err) { r(`ERROR: ${err.message}`); return; }
      let o = '';
      s.on('data', (d) => o += d);
      s.stderr.on('data', (d) => o += d);
      s.on('close', () => r(o.trim()));
    });
  });

  console.log('=== POST-RECEIVE HOOK ===');
  console.log(await run('cat /root/sas-annajah.git/hooks/post-receive'));
  console.log('');
  console.log('=== APP DIR CHECK ===');
  console.log(await run('cd /var/www/db_sas_annajah && ls -la | head -10'));
  
  conn.end();
});

conn.connect({
  host: '192.168.1.51', username: 'root', password: 'it92528!@',
  readyTimeout: 10000,
  algorithms: { cipher: ['aes128-ctr','aes192-ctr','aes256-ctr','aes128-gcm','aes256-gcm'] }
});
