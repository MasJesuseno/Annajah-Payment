import { useState, useEffect, useCallback } from 'react'

export default function WeatherPanel({ latitude, longitude }) {
  const [weather, setWeather] = useState(null)
  const [forecast, setForecast] = useState([])
  const [loading, setLoading] = useState(true)
  const [locationName, setLocationName] = useState('')

  const fetchWeather = useCallback(async (lat, lon) => {
    try {
      const latitude = parseFloat(lat) || -6.2088
      const longitude = parseFloat(lon) || 106.8456

      setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)

      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=3&timezone=auto`
      )
      const data = await res.json()
      setWeather(data.current)

      if (data.daily) {
        const forecastDays = []
        for (let i = 1; i < data.daily.time.length; i++) {
          forecastDays.push({
            date: data.daily.time[i],
            tempMax: data.daily.temperature_2m_max[i],
            tempMin: data.daily.temperature_2m_min[i],
            weatherCode: data.daily.weather_code[i],
          })
        }
        setForecast(forecastDays)
      }
    } catch {
      console.error('Gagal memuat cuaca')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!latitude || !longitude) {
      setLoading(false)
      return
    }
    fetchWeather(latitude, longitude)
    const interval = setInterval(() => fetchWeather(latitude, longitude), 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [latitude, longitude, fetchWeather])

  const getDayName = (dateStr, idx) => {
    if (idx === 0) return 'Besok'
    if (idx === 1) return 'Lusa'
    const d = new Date(dateStr + 'T00:00:00')
    const hari = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
    return hari[d.getDay()]
  }

  const getWeatherIcon = (code) => {
    if (code === 0 || code === 1) return '☀️'
    if (code === 2) return '⛅'
    if (code === 3) return '☁️'
    if (code >= 45 && code <= 48) return '🌫️'
    if (code >= 51 && code <= 57) return '🌦️'
    if (code >= 61 && code <= 67) return '🌧️'
    if (code >= 71 && code <= 77) return '🌨️'
    if (code >= 80 && code <= 82) return '🌦️'
    if (code >= 85 && code <= 86) return '🌨️'
    if (code >= 95) return '⛈️'
    return '🌤️'
  }

  const getWeatherLabel = (code) => {
    if (code === 0 || code === 1) return 'Cerah'
    if (code === 2) return 'Berawan'
    if (code === 3) return 'Mendung'
    if (code >= 45 && code <= 48) return 'Berkabut'
    if (code >= 51 && code <= 57) return 'Gerimis'
    if (code >= 61 && code <= 67) return 'Hujan'
    if (code >= 71 && code <= 77) return 'Salju'
    if (code >= 80 && code <= 82) return 'Hujan Ringan'
    if (code >= 85 && code <= 86) return 'Salju'
    if (code >= 95) return 'Badai Petir'
    return 'Cerah Berawan'
  }

  if (loading) {
    return (
      <div className="flex-[1] bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-4 min-h-0 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-annajah-400/30 border-t-annajah-400 rounded-full animate-spin" />
          <span className="text-xs text-white/30">Memuat cuaca...</span>
        </div>
      </div>
    )
  }

  if (!weather) {
    return (
      <div className="flex-[1] bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-4 min-h-0 flex items-center justify-center">
        <div className="flex items-center gap-2 text-white/20">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
            />
          </svg>
          <span className="text-xs">Cuaca tidak tersedia</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-[1] bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-4 transition-all duration-300 hover:border-white/10 min-h-0 flex flex-col justify-center">
      {/* Current Weather */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-annajah-500/20 to-annajah-500/5 flex items-center justify-center border border-annajah-500/10">
            <svg className="w-4 h-4 text-annajah-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
              />
            </svg>
          </div>
          <div>
            <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Sekarang</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg leading-none">{getWeatherIcon(weather.weather_code)}</span>
              <span className="text-sm font-bold text-white/80 tabular-nums">
                {Math.round(weather.temperature_2m)}°C
              </span>
              <span className="text-xs text-white/40">{getWeatherLabel(weather.weather_code)}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          {locationName && (
            <div className="flex items-center gap-1 text-white/30">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-[10px]">{locationName}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-white/20">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
            <span className="text-[10px]">{weather.relative_humidity_2m}%</span>
          </div>
        </div>
      </div>

      {/* 3-Day Forecast */}
      {forecast.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.05]">
          <div className="flex items-center justify-between gap-2">
            {forecast.map((day, idx) => (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center gap-1 py-1 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
              >
                <span className="text-[10px] text-white/40 font-medium">{getDayName(day.date, idx)}</span>
                <span className="text-base leading-none">{getWeatherIcon(day.weatherCode)}</span>
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-white/70 font-medium tabular-nums">{Math.round(day.tempMax)}°</span>
                  <span className="text-white/20">/</span>
                  <span className="text-white/30 tabular-nums">{Math.round(day.tempMin)}°</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
