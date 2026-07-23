/**
 * Simple script to dump local MySQL db and upload to server.
 * Run from project root: NODE_PATH=backend/node_modules node dump_and_upload_db.js
 */
const mysql = require('mysql2/promise');
const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const DB = { host: 'localhost', port: 3306, user: 'root', password: '', database: 'dbannajah' };
const SSH = { host: '192.168.1.51', username: 'root', password: 'it92528!@', readyTimeout: 15000 };
const REMOTE = '/var/www/db_sas_annajah';

function q(s) { return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"; }

function fmtDate(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return null;
  var y = d.getFullYear();
  var M = ('0' + (d.getMonth()+1)).slice(-2);
  var day = ('0' + d.getDate()).slice(-2);
  var h = ('0' + d.getHours()).slice(-2);
  var m = ('0' + d.getMinutes()).slice(-2);
  var s2 = ('0' + d.getSeconds()).slice(-2);
  return y + '-' + M + '-' + day + ' ' + h + ':' + m + ':' + s2;
}

function escape(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  if (v instanceof Date) {
    var ds = fmtDate(v);
    if (ds) return q(ds);
    return 'NULL';
  }
  return q(String(v));
}

async function main() {
  console.log('=== Database Dump & Upload ===\n');
  
  // Connect to local MySQL
  console.log('Connecting to local MySQL...');
  var conn = await mysql.createConnection(DB);
  var [tables] = await conn.execute(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME",
    [DB.database]
  );
  
  // Build SQL
  var sql = '';
  sql += 'SET FOREIGN_KEY_CHECKS = 0;\n';
  sql += 'SET UNIQUE_CHECKS = 0;\n';
  sql += '\n';
  
  var totalRows = 0;
  
  for (var i = 0; i < tables.length; i++) {
    var tbl = tables[i].TABLE_NAME;
    process.stdout.write('  ' + tbl + '... ');
    
    var [cr] = await conn.execute('SHOW CREATE TABLE `' + tbl + '`');
    sql += 'DROP TABLE IF EXISTS `' + tbl + '`;\n';
    sql += cr[0]['Create Table'] + ';\n\n';
    
    var [rows] = await conn.execute('SELECT * FROM `' + tbl + '`');
    totalRows += rows.length;
    
    if (rows.length > 0) {
      var cols = Object.keys(rows[0]);
      var names = cols.map(function(c) { return '`' + c + '`'; }).join(', ');
      
      for (var r = 0; r < rows.length; r++) {
        var vals = cols.map(function(c) { return escape(rows[r][c]); });
        sql += 'INSERT INTO `' + tbl + '` (' + names + ') VALUES (' + vals.join(',') + ');\n';
      }
      sql += '\n';
    }
    
    console.log(rows.length + ' rows');
  }
  
  sql += 'SET FOREIGN_KEY_CHECKS = 1;\n';
  sql += 'SET UNIQUE_CHECKS = 1;\n';
  
  await conn.end();
  console.log('\nTotal: ' + tables.length + ' tables, ' + totalRows + ' rows');
  console.log('SQL size: ' + (sql.length / 1024).toFixed(1) + ' KB');
  
  // Upload to server via SSH
  console.log('\nConnecting to server...');
  var localFile = path.join(__dirname, 'db_upload_temp.sql');
  fs.writeFileSync(localFile, sql, 'utf8');
  
  var ssh = new Client();
  ssh.on('ready', function() {
    console.log('Uploading via SFTP...');
    ssh.sftp(function(err, sftp) {
      if (err) { console.error('SFTP error:', err.message); cleanup(); return; }
      sftp.fastPut(localFile, REMOTE + '/db_upload.sql', {}, function(err) {
        if (err) { console.error('Upload error:', err.message); cleanup(); return; }
        console.log('Uploaded! Importing...');
        sftp.end();
        
        ssh.exec("mysql -u root -p'$a$Login4dmin' dbannajah < " + REMOTE + "/db_upload.sql 2>&1 && echo 'IMPORT_OK' && rm -f " + REMOTE + "/db_upload.sql", function(err, stream) {
          if (err) { console.error('Import error:', err.message); cleanup(); return; }
          var out = '';
          stream.on('data', function(d) { out += d.toString(); });
          stream.stderr.on('data', function(d) { out += d.toString(); });
          stream.on('close', function() {
            if (out.indexOf('IMPORT_OK') >= 0) {
              console.log('Database imported successfully!');
            } else {
              console.log('Issues during import:\n' + out.substring(0, 1000));
            }
            cleanup();
            
            // Verify
            console.log('\nVerifying...');
            ssh.exec("curl -s http://localhost:3001/api/pengaturan-tv/display | python3 -c \"import sys,json; d=json.load(sys.stdin); print('Videos:', len(d.get('videos',[])), '| Agenda:', len(d.get('agenda',[])), '| Kata Bijak:', len(d.get('kataBijak',[])))\"", function(err, stream) {
              var vout = '';
              stream.on('data', function(d) { vout += d.toString(); });
              stream.on('close', function() { console.log(vout); ssh.end(); console.log('\n=== ALL DONE ==='); });
            });
          });
        });
      });
    });
  });
  ssh.on('error', function(err) { console.error('SSH error:', err.message); cleanup(); });
  ssh.connect(SSH);
  
  function cleanup() {
    try { fs.unlinkSync(localFile); } catch(e) {}
  }
}

main();
