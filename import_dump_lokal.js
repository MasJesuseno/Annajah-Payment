/**
 * Script untuk mengimport dump SQL ke database MySQL lokal
 * Cara pakai: node import_dump_lokal.js
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
};

const DB_NAME = 'dbannajah';
const DUMP_FILE = path.join(__dirname, 'backup-annajah-full.sql');

async function main() {
  console.log('=== Import Database ke Lokal ===\n');

  // Baca file dump
  if (!fs.existsSync(DUMP_FILE)) {
    console.error(`❌ File tidak ditemukan: ${DUMP_FILE}`);
    console.log('\n💡 Jalankan dulu: node dump_dari_server.js');
    process.exit(1);
  }

  const stats = fs.statSync(DUMP_FILE);
  console.log(`1. File dump: ${DUMP_FILE} (${(stats.size / 1024).toFixed(1)} KB)`);

  // Konek ke MySQL tanpa database dulu
  console.log('2. Menyambung ke MySQL lokal...');
  const conn = await mysql.createConnection(DB_CONFIG);

  try {
    // Buat database jika belum ada (pakai query, bukan execute — karena prepared statement)
    console.log(`3. Membuat database ${DB_NAME} jika belum ada...`);
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${DB_NAME}\``);

    // Baca file SQL
    console.log('4. Membaca file SQL...');
    const sqlContent = fs.readFileSync(DUMP_FILE, 'utf8');

    // Pecah SQL per statement (split by ;\n — standar mysqldump)
    const statements = sqlContent
      .split(';\n')
      .map(s => s.trim() + ';')
      .filter(s => s.length > 1);

    console.log(`5. Mengeksekusi ${statements.length} pernyataan SQL...\n`);

    let successCount = 0;
    let errorCount = 0;
    let totalInserts = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      try {
        // Skip empty
        if (!stmt || stmt === ';') continue;

        // Gunakan query() bukan execute() untuk hindari prepared statement protocol
        await conn.query(stmt);

        // Hitung INSERT
        if (stmt.toUpperCase().startsWith('INSERT INTO')) {
          totalInserts++;
        }

        successCount++;
      } catch (e) {
        // Skip error yang umum — table sudah ada, data duplikat
        if (e.code === 'ER_TABLE_EXISTS_ERROR' || 
            e.code === 'ER_DUP_ENTRY' ||
            e.code === 'ER_DUP_KEYNAME') {
          successCount++;
          continue;
        }

        errorCount++;
        if (errorCount <= 5) {
          console.log(`   ⚠️  [${i}] ${e.message.substring(0, 120)}`);
        }
      }

      // Progress setiap 10%
      if (i > 0 && i % Math.max(1, Math.floor(statements.length / 10)) === 0) {
        process.stdout.write(`   Progress: ${Math.round((i / statements.length) * 100)}% (${successCount} ok, ${errorCount} error)\r`);
      }
    }

    // Hitung total data
    console.log('\n\n6. Menghitung total data...');
    const [tables] = await conn.query(
      "SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME",
      [DB_NAME]
    );
    let totalRows = 0;
    for (const t of tables) {
      totalRows += Number(t.TABLE_ROWS);
    }

    console.log(`\n=== ✅ IMPORT SELESAI ===`);
    console.log(`   ✅ Berhasil: ${successCount} pernyataan`);
    console.log(`   ⚠️  Gagal: ${errorCount} pernyataan`);
    console.log(`   📊 Total data: ${totalRows.toLocaleString()} baris (${tables.length} tabel)`);
    console.log(`   📦 Database: ${DB_NAME} @ localhost:3306`);

    // Tampilkan daftar tabel
    console.log('\n📋 Daftar tabel:');
    for (const t of tables) {
      console.log(`   • ${t.TABLE_NAME}: ${Number(t.TABLE_ROWS).toLocaleString()} baris`);
    }

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  console.log('\n💡 Pastikan MySQL lokal sudah berjalan.');
  process.exit(1);
});
