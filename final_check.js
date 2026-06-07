const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', async () => {
  const run = (cmd) => new Promise((resolve) => {
    conn.exec(cmd, (err, stream) => {
      if (err) { resolve(`ERROR: ${err.message}`); return; }
      let out = '';
      stream.on('data', (d) => out += d.toString());
      stream.stderr.on('data', (d) => out += d.toString());
      stream.on('close', () => resolve(out.trim()));
    });
  });

  console.log('=== Uploads directory ===');
  console.log(await run('ls -la /var/www/db_sas_annajah/uploads/'));
  console.log('');

  console.log('=== Kehadiran-guru photos ===');
  console.log(await run('ls -la /var/www/db_sas_annajah/uploads/kehadiran-guru/'));
  console.log('');

  console.log('=== Guru photos ===');
  console.log(await run('ls -la /var/www/db_sas_annajah/uploads/guru/'));
  console.log('');

  console.log('=== Backend health ===');
  console.log(await run('curl -s -o /dev/null -w "Backend: HTTP %{http_code}\n" http://localhost:5000/'));
  console.log('');

  console.log('=== Photo access via backend ===');
  const kgFiles = await run('ls /var/www/db_sas_annajah/uploads/kehadiran-guru/');
  const kgList = kgFiles.split('\n').filter(f => f.endsWith('.jpg'));
  for (const f of kgList) {
    const fn = f.trim().split(/\s+/).pop();
    console.log(await run(`curl -s -o /dev/null -w "kehadiran-guru/${fn}: HTTP %{http_code} (%{content_type})\n" "http://localhost:5000/uploads/kehadiran-guru/${fn}"`));
  }

  const guruFiles = await run('ls /var/www/db_sas_annajah/uploads/guru/');
  const guruList = guruFiles.split('\n').filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
  for (const f of guruList) {
    const fn = f.trim().split(/\s+/).pop();
    console.log(await run(`curl -s -o /dev/null -w "guru/${fn}: HTTP %{http_code} (%{content_type})\n" "http://localhost:5000/uploads/guru/${fn}"`));
  }
  console.log('');

  console.log('=== Photo access via nginx/domain ===');
  console.log(await run('curl -s -o /dev/null -w "Domain root: HTTP %{http_code}\n" https://sas.smaannajah.sch.id/'));

  conn.end();
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
