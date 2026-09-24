/**
 * Parse enriched GPS data stored as JSON string in the database.
 * Supports both new format (JSON with address components) and old format (plain "lat,lng" string).
 *
 * @param {string|null} gpsRaw - Raw GPS value from database
 * @returns {{ display: string, lat?: string, lng?: string, kelurahan?: string, kecamatan?: string, kabupaten?: string, provinsi?: string } | null}
 */
export function parseGpsData(gpsRaw) {
  if (!gpsRaw) return null

  // Try parsing as JSON (new format)
  try {
    const parsed = JSON.parse(gpsRaw)
    if (parsed && typeof parsed === 'object') {
      const coordLabel = parsed.lat && parsed.lng ? `(${parsed.lat}, ${parsed.lng})` : null
      const wilayahLabel = formatWilayah(parsed)

      return {
        ...parsed,
        display: wilayahLabel
          ? coordLabel
            ? `${coordLabel} — ${wilayahLabel}`
            : wilayahLabel
          : coordLabel || `${parsed.lat || ''}, ${parsed.lng || ''}`,
      }
    }
  } catch {
    // Not JSON — fall through to old format
  }

  // Old format: plain "lat,lng" string
  return { display: gpsRaw, lat: gpsRaw.split(',')[0]?.trim(), lng: gpsRaw.split(',')[1]?.trim() }
}

/**
 * Format objek wilayah → "Kel. X, Kec. Y, Kabupaten Z, Provinsi".
 * @returns {string|null} null bila tidak ada komponen wilayah
 */
export function formatWilayah(gps) {
  if (!gps) return null
  const parts = []
  if (gps.kelurahan) parts.push(`Kel. ${gps.kelurahan}`)
  if (gps.kecamatan) parts.push(`Kec. ${gps.kecamatan}`)
  if (gps.kabupaten) parts.push(gps.kabupaten)
  if (gps.provinsi) parts.push(gps.provinsi)
  return parts.length ? parts.join(', ') : null
}

/** Ekstrak komponen wilayah dari respons Nominatim.
 *  Logika SAMAKAN dengan helpers/geocodeHelper.js (reverseGeocode). */
function extractWilayah(data) {
  const addr = data.address || {}
  const first = (...vals) => vals.find((v) => v) || ''
  const fromKeys = {
    kelurahan: first(addr.village, addr.suburb, addr.neighbourhood, addr.hamlet),
    kecamatan: first(addr.district, addr.city_district, addr.municipality, addr.borough),
    kabupaten: first(addr.city, addr.town, addr.county, addr.state_district, addr.region),
    provinsi: first(addr.state, addr.province),
  }
  // Urutan display_name Indonesia:
  //   ..., Kelurahan, Kecamatan, Kabupaten/Kota, Provinsi, [Kode Pos], Indonesia
  const tail = String(data.display_name || '').split(',').map((s) => s.trim()).filter(Boolean)
  if (tail[tail.length - 1] === 'Indonesia') tail.pop()
  if (/^\d{4,5}$/.test(tail[tail.length - 1] || '')) tail.pop()
  const t = [...tail]
  const fromDisplay = { provinsi: t.pop() || '', kabupaten: t.pop() || '', kecamatan: t.pop() || '' }
  return {
    kelurahan: fromKeys.kelurahan || t.pop() || '',
    kecamatan: fromDisplay.kecamatan || fromKeys.kecamatan || '',
    kabupaten: fromDisplay.kabupaten || fromKeys.kabupaten || '',
    provinsi: fromDisplay.provinsi || fromKeys.provinsi || '',
  }
}

/**
 * Reverse geocode koordinat → detail wilayah (Kelurahan, Kecamatan, Kabupaten,
 * Provinsi) via Nominatim/OpenStreetMap. Dipakai untuk status GPS live di
 * halaman absen sebelum data dikirim ke server.
 * @returns {Promise<object|null>} { lat, lng, kelurahan, kecamatan, kabupaten, provinsi } atau null bila gagal
 */
export async function reverseGeocodeGps(lat, lng) {
  if (lat == null || lng == null) return null
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json&addressdetails=1&accept-language=id`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.address) return null
    const wilayah = extractWilayah(data)
    if (!Object.values(wilayah).some(Boolean)) return null
    return { lat: String(lat), lng: String(lng), ...wilayah }
  } catch {
    return null
  }
}

/**
 * Format GPS data for the status-hari-ini API response (where it's already parsed as object).
 */
export function formatGpsDisplay(gpsObj) {
  if (!gpsObj) return '-'
  if (typeof gpsObj === 'string') return parseGpsData(gpsObj)?.display || gpsObj
  if (gpsObj.display) return gpsObj.display
  return '-'
}
