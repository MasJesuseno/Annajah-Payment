/**
 * Reverse geocode coordinates using Nominatim (OpenStreetMap).
 * Returns address components: kelurahan, kecamatan, kabupaten, provinsi.
 */

const https = require('https');

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

    // Truncate address fields to fit within VARCHAR(500) column when JSON stringified
    const truncate = (val, maxLen = 60) => val ? String(val).substring(0, maxLen) : '';

    // Map OpenStreetMap address fields to Indonesian administrative divisions
    const result = {
      lat: String(latNum),
      lng: String(lngNum),
      kelurahan: truncate(addr.village || addr.suburb || addr.neighbourhood || addr.hamlet || addr.town || ''),
      kecamatan: truncate(addr.county || addr.city_district || addr.municipality || ''),
      kabupaten: truncate(addr.city || addr.town || addr.state_district || addr.region || ''),
      provinsi: truncate(addr.state || addr.province || ''),
    };

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
 */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const options = new URL(url);
    options.headers = {
      'User-Agent': 'SMAAnnajahApp/1.0 (administrasi@sma-annajah.sch.id)',
      'Accept': 'application/json',
    };
    options.timeout = 5000;
    const req = client.get(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error('Invalid JSON response'));
        }
      });
    });
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
