/**
 * Reverse geocode coordinates using Nominatim (OpenStreetMap).
 * Returns address components: kelurahan, kecamatan, kabupaten, provinsi.
 */

const https = require('https');
const http = require('http');

/**
 * Reverse geocode latitude/longitude to get administrative region info.
 * @param {number|string} lat - Latitude
 * @param {number|string} lng - Longitude
 * @returns {Promise<Object>} Object with lat, lng, and address components (or empty strings if failed)
 */
async function reverseGeocode(lat, lng) {
  try {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return { lat: String(lat || ''), lng: String(lng || '') };
    }

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latNum}&lon=${lngNum}&format=json&addressdetails=1&accept-language=id`;

    const data = await fetchJson(url);

    if (!data || !data.address) {
      return { lat: String(latNum), lng: String(lngNum) };
    }

    const addr = data.address;
    const first = (...vals) => vals.find((v) => v) || '';

    // Truncate address fields to fit within VARCHAR(500) column when JSON stringified
    const truncate = (val, maxLen = 60) => val ? String(val).substring(0, maxLen) : '';

    // Kunci address Nominatim bervariasi per wilayah (kota memakai district/
    // city_district, desa memakai county, dsb) — dipakai sebagai nilai utama
    // untuk kelurahan dan cadangan untuk lainnya.
    const fromKeys = {
      kelurahan: first(addr.village, addr.suburb, addr.neighbourhood, addr.hamlet),
      kecamatan: first(addr.district, addr.city_district, addr.municipality, addr.borough),
      kabupaten: first(addr.city, addr.town, addr.county, addr.state_district, addr.region),
      provinsi: first(addr.state, addr.province),
    };

    // display_name Indonesia selalu berurutan:
    //   ..., Kelurahan/Desa, Kecamatan, Kabupaten/Kota, Provinsi, [Kode Pos], Indonesia
    // Dipakai sebagai sumber utama Kecamatan/Kabupaten/Provinsi supaya tidak
    // tertukar (pemetaan key saja sering meleset antar wilayah).
    const tail = String(data.display_name || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (tail[tail.length - 1] === 'Indonesia') tail.pop();
    if (/^\d{4,5}$/.test(tail[tail.length - 1] || '')) tail.pop();
    const t = [...tail];
    const fromDisplay = {
      provinsi: t.pop() || '',
      kabupaten: t.pop() || '',
      kecamatan: t.pop() || '',
    };

    const result = {
      lat: String(latNum),
      lng: String(lngNum),
      kelurahan: fromKeys.kelurahan || t.pop() || '',
      kecamatan: fromDisplay.kecamatan || fromKeys.kecamatan || '',
      kabupaten: fromDisplay.kabupaten || fromKeys.kabupaten || '',
      provinsi: fromDisplay.provinsi || fromKeys.provinsi || '',
    };

    result.kelurahan = truncate(result.kelurahan);
    result.kecamatan = truncate(result.kecamatan);
    result.kabupaten = truncate(result.kabupaten);
    result.provinsi = truncate(result.provinsi);

    // Ensure the entire JSON string fits in VARCHAR(500)
    const jsonStr = JSON.stringify(result);
    if (jsonStr.length > 480) {
      // Aggressively truncate if still too long
      result.kelurahan = result.kelurahan.substring(0, 40);
      result.kecamatan = result.kecamatan.substring(0, 40);
      result.kabupaten = result.kabupaten.substring(0, 40);
      result.provinsi = result.provinsi.substring(0, 30);
    }

    return result;
  } catch (error) {
    console.warn('Reverse geocode gagal:', error.message);
    return { lat: String(lat || ''), lng: String(lng || '') };
  }
}

/**
 * Simple HTTPS/HTTP JSON fetcher with timeout.
 * Catatan: header & timeout HARUS dikirim sebagai opsi kedua `client.get(url, opts, cb)`
 * — men-set properti di objek URL diabaikan Node, sehingga User-Agent tidak
 * terkirim dan Nominatim membalas 403 (wilayah tidak pernah ter-enrich).
 */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(
      url,
      {
        headers: {
          'User-Agent': 'SMAAnnajahApp/1.0 (administrasi@sma-annajah.sch.id)',
          'Accept': 'application/json',
        },
        timeout: 8000, // Nominatim bisa lambat di request pertama
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            return reject(new Error(`HTTP ${res.statusCode}`));
          }
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error('Invalid JSON response'));
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Format GPS data object to a display string for UI.
 * @param {Object} gpsData - Object with lat, lng, kelurahan, etc.
 * @returns {string} Formatted string like "Kel. Gambir, Kec. Gambir, Jakarta Pusat, DKI Jakarta"
 */
function formatAddress(gpsData) {
  if (!gpsData) return '-';
  const coordLabel = gpsData.lat && gpsData.lng ? `(${gpsData.lat}, ${gpsData.lng})` : null;
  const parts = [];
  if (gpsData.kelurahan) parts.push(`Kel. ${gpsData.kelurahan}`);
  if (gpsData.kecamatan) parts.push(`Kec. ${gpsData.kecamatan}`);
  if (gpsData.kabupaten) parts.push(gpsData.kabupaten);
  if (gpsData.provinsi) parts.push(gpsData.provinsi);
  const wilayahLabel = parts.length > 0 ? parts.join(', ') : null;
  if (wilayahLabel) {
    return coordLabel ? `${coordLabel} — ${wilayahLabel}` : wilayahLabel;
  }
  return coordLabel || '-';
}

/**
 * Enrich raw GPS coordinates with region info via reverse geocoding.
 * Returns a JSON string to store in the database.
 * @param {string|object|null} gpsInput - Raw GPS input (object {latitude, longitude} or string "lat,lng")
 * @returns {Promise<string|null>} JSON string or null
 */
async function enrichGps(gpsInput) {
  if (!gpsInput) return null;

  let lat, lng;

  if (typeof gpsInput === 'object') {
    lat = gpsInput.latitude;
    lng = gpsInput.longitude;
  } else if (typeof gpsInput === 'string') {
    // Try parsing as JSON first (stored JSON without address fields)
    try {
      const parsed = JSON.parse(gpsInput);
      if (parsed && typeof parsed === 'object') {
        lat = parsed.lat;
        lng = parsed.lng;
      }
    } catch {
      // Not JSON — treat as plain "lat,lng" string
      const parts = gpsInput.split(',');
      lat = parts[0]?.trim();
      lng = parts[1]?.trim();
    }
  }

  if (!lat || !lng) return String(gpsInput || '');

  const result = await reverseGeocode(lat, lng);
  return JSON.stringify(result);
}

module.exports = { reverseGeocode, formatAddress, enrichGps };
