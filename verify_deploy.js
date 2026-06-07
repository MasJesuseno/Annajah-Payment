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
    'echo "=== Uploads directory ===" && ls -la /var/www/db_sas_annajah/uploads/',
    'echo "=== Kehadiran-guru photos ===" && ls -la /var/www/db_sas_annajah/uploads/kehadiran-guru/ 2>/dev/null || echo "DIR_NOT_FOUND"',
    'echo "=== Guru photos ===" && ls -la /var/www/db_sas_annajah/uploads/guru/ 2>/dev/null || echo "DIR_NOT_FOUND"',
    'echo "=== Siswa photos ===" && ls -la /var/www/db_sas_annajah/uploads/siswa/ 2>/dev/null || echo "DIR_NOT_FOUND"',
    'echo "=== Check PM2 ===" && pm2 list 2>&1 | head -5',
    'echo "=== Test backend HTTP ===" && curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:5000/',
    'echo "=== Test specific photo ===" && ls /var/www/db_sas_annajah/uploads/kehadiran-guru/*.jpg 2>/dev/null | head -3',
    'for f in /var/www/db_sas_annajah/uploads/kehadiran-guru/*.jpg 2>/dev/null; do echo "Testing $f"; curl -s -o /dev/null -w "HTTP %{http_code}\n" "http://localhost:5000/uploads/kehadiran-guru/$(basename $f)"; done',
    'for f in /var/www/db_sas_annajah/uploads/guru/*.jpg 2>/dev/null; do echo "Testing $f"; curl -s -o /dev/null -w "HTTP %{http_code}\n" "http://localhost:5000/uploads/guru/$(basename $f)"; done',
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
