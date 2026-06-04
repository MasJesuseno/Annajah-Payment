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
      const parts = []
      if (parsed.kelurahan) parts.push(`Kel. ${parsed.kelurahan}`)
      if (parsed.kecamatan) parts.push(`Kec. ${parsed.kecamatan}`)
      if (parsed.kabupaten) parts.push(parsed.kabupaten)
      if (parsed.provinsi) parts.push(parsed.provinsi)

      const coordLabel = parsed.lat && parsed.lng ? `(${parsed.lat}, ${parsed.lng})` : null
    const wilayahLabel = parts.length > 0 ? parts.join(', ') : null

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
 * Format GPS data for the status-hari-ini API response (where it's already parsed as object).
 */
export function formatGpsDisplay(gpsObj) {
  if (!gpsObj) return '-'
  if (typeof gpsObj === 'string') return parseGpsData(gpsObj)?.display || gpsObj
  if (gpsObj.display) return gpsObj.display
  return '-'
}
