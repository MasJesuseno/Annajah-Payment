/**
 * Backfill GPS kehadiran_guru — mengisi detail wilayah (kelurahan, kecamatan,
 * kabupaten, provinsi) pada data lama yang masih berupa koordinat mentah atau
 * JSON tanpa field alamat, memakai reverse geocode Nominatim (OpenStreetMap).
 *
 * Pemakaian:
 *   node scripts/backfill-gps-kehadiran.js
 *
 * Jeda 1,2 detik per request mengikuti aturan rate limit Nominatim (1 req/s).
 * Logika sama dengan endpoint admin POST /api/kehadiran-guru/backfill-gps.
 */
const { getDatabase, closeDatabase } = require('../database');
const { enrichGps, formatAddress } = require('../helpers/geocodeHelper');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const hasAddressInfo = (gpsRaw) => Boolean(gpsRaw) && gpsRaw.includes('kelurahan');

(async () => {
  const db = await getDatabase();

  const [rows] = await db.query(`
    SELECT id, tanggal, gps_masuk, gps_keluar
    FROM kehadiran_guru
    WHERE (gps_masuk IS NOT NULL AND gps_masuk NOT LIKE '%kelurahan%')
       OR (gps_keluar IS NOT NULL AND gps_keluar NOT LIKE '%kelurahan%')
    ORDER BY id ASC
  `);

  if (rows.length === 0) {
    console.log('Tidak ada data GPS yang perlu di-backfill.');
    await closeDatabase();
    return;
  }

  console.log(`Memproses ${rows.length} data kehadiran...`);
  let updated = 0;
  let failed = 0;

  for (const row of rows) {
    const fields = [];
    const values = [];

    for (const field of ['gps_masuk', 'gps_keluar']) {
      const raw = row[field];
      if (!raw || hasAddressInfo(raw)) continue;

      try {
        const enriched = await enrichGps(raw);
        if (enriched && enriched !== raw) {
          fields.push(`${field} = ?`);
          values.push(enriched);
          if (!enriched.includes('kelurahan')) {
            failed++;
            console.log(`  #${row.id} ${field}: wilayah tidak ditemukan (koordinat tetap disimpan)`);
          }
        }
      } catch (err) {
        failed++;
        console.log(`  #${row.id} ${field} GAGAL: ${err.message}`);
      }

      // Rate limit Nominatim: 1 request per detik
      await sleep(1200);
    }

    if (fields.length > 0) {
      values.push(row.id);
      await db.execute(`UPDATE kehadiran_guru SET ${fields.join(', ')} WHERE id = ?`, values);
      updated++;

      // Tampilkan contoh hasil untuk kolom pertama
      try {
        const sample = JSON.parse(values[0]);
        console.log(`  #${row.id} (${String(row.tanggal).slice(0, 10)}) → ${formatAddress(sample)}`);
      } catch {
        console.log(`  #${row.id} (${String(row.tanggal).slice(0, 10)}) diperbarui`);
      }
    }
  }

  console.log(`Selesai: ${updated} data diperbarui, ${failed} tanpa wilayah/gagal.`);
  await closeDatabase();
})().catch(async (err) => {
  console.error('ERROR:', err);
  await closeDatabase().catch(() => {});
  process.exit(1);
});
