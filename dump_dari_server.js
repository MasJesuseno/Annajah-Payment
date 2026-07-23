/**
 * Script untuk mendump database dari server 192.168.1.51 ke lokal
 * Cara pakai: node dump_dari_server.js
 */
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const SSH = { host: '192.168.1.51', username: 'root', password: 'it92528!@', readyTimeout: 30000 };
const REMOTE_DB_USER = 'root';
const REMOTE_DB_PASS = '$a$Login4dmin';
const REMOTE_DB_NAME = 'dbannajah';
const REMOTE_DUMP_PATH = '/tmp/dbannajah_dump.sql';
const LOCAL_DUMP_PATH = path.join(__dirname, 'backup-annajah-full.sql');

async function main() {
  console.log('=== Dump Database dari Server 192.168.1.51 ke Lokal ===\n');
  
  console.log('1. Connecting ke server...');
  const ssh = new Client();
  
  ssh.on('ready', () => {
    console.log('   ✅ Terkoneksi!');
    
    // Step 1: Run mysqldump di server
    console.log('2. Menjalankan mysqldump di server...');
    const dumpCmd = `mysqldump -u ${REMOTE_DB_USER} -p'${REMOTE_DB_PASS}' --routines --triggers --events ${REMOTE_DB_NAME} > ${REMOTE_DUMP_PATH} 2>&1 && echo 'DUMP_OK'`;
    
    ssh.exec(dumpCmd, (err, stream) => {
      if (err) {
        console.error('   ❌ Gagal menjalankan mysqldump:', err.message);
        ssh.end();
        return;
      }
      
      let output = '';
      stream.on('data', (data) => { output += data.toString(); });
      stream.stderr.on('data', (data) => { output += data.toString(); });
      
      stream.on('close', (code) => {
        if (output.includes('DUMP_OK')) {
          console.log('   ✅ mysqldump selesai, file sementara di ' + REMOTE_DUMP_PATH);
        } else {
          console.log('   ⚠️ Ada issue:\n' + output.substring(0, 1000));
        }
        
        // Step 2: Download file via SFTP
        console.log('3. Mendownload file dump...');
        ssh.sftp((err, sftp) => {
          if (err) {
            console.error('   ❌ SFTP error:', err.message);
            ssh.end();
            return;
          }
          
          const localFile = LOCAL_DUMP_PATH;
          sftp.fastGet(REMOTE_DUMP_PATH, localFile, {}, (err) => {
            if (err) {
              console.error('   ❌ Download error:', err.message);
              sftp.end();
              ssh.end();
              return;
            }
            
            const stats = fs.statSync(localFile);
            console.log(`   ✅ Download selesai! File: ${localFile}`);
            console.log(`   📦 Ukuran: ${(stats.size / 1024).toFixed(1)} KB`);
            
            sftp.end();
            
            // Step 3: Hapus file sementara di server
            console.log('4. Membersihkan file sementara di server...');
            ssh.exec(`rm -f ${REMOTE_DUMP_PATH} && echo 'CLEAN_OK'`, (err, stream) => {
              let cleanOut = '';
              stream.on('data', (d) => { cleanOut += d.toString(); });
              stream.on('close', () => {
                if (cleanOut.includes('CLEAN_OK')) {
                  console.log('   ✅ File sementara dihapus');
                }
                
                // Step 4: Info
                console.log('\n=== ✅ DUMP SELESAI ===');
                console.log(`   File: ${LOCAL_DUMP_PATH}`);
                console.log(`   Server: 192.168.1.51 → Database: ${REMOTE_DB_NAME}`);
                console.log('\n💡 Cara import ke lokal:');
                console.log(`   mysql -u root dbannajah < "${LOCAL_DUMP_PATH}"\n`);
                
                ssh.end();
              });
            });
          });
        });
      });
    });
  });
  
  ssh.on('error', (err) => {
    console.error('   ❌ SSH error:', err.message);
    console.log('\n💡 Pastikan:');
    console.log('   1. Server 192.168.1.51 bisa dijangkau');
    console.log('   2. SSH server berjalan');
    console.log('   3. Kredensial SSH masih valid');
  });
  
  ssh.connect(SSH);
}

main();
