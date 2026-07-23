import { useState, useEffect } from 'react'
import { School, MapPin } from 'lucide-react'

export default function Header({ pengaturan, logoError, onLogoError }) {
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date) =>
    date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const formatDate = (date) =>
    date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  return (
    <header className="relative bg-gradient-to-r from-annajah-900/80 via-annajah-800/70 to-gray-900/80 backdrop-blur-xl px-8 py-3 flex items-center justify-between border-b border-white/5 shrink-0 z-10">
      {/* Left: Logo + School Info */}
      <div className="flex items-center gap-4 group">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-annajah-400/30 to-annajah-600/30 rounded-xl blur-md transition-all duration-500 group-hover:blur-lg" />
          <div className="relative w-12 h-12 rounded-xl bg-white/5 backdrop-blur border border-white/10 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-annajah-400/30 group-hover:scale-105">
            {pengaturan?.logo && !logoError ? (
              <img
                src={pengaturan.logo}
                alt="Logo"
                className="w-full h-full object-contain p-1"
                onError={() => onLogoError(true)}
              />
            ) : (
              <School className="w-7 h-7 text-annajah-300" />
            )}
          </div>
        </div>
        <div className="transition-all duration-300">
          <h1 className="text-2xl font-bold tracking-wide bg-gradient-to-r from-white via-annajah-100 to-white bg-clip-text text-transparent">
            {pengaturan?.nama_sekolah || 'SMA Annajah'}
          </h1>
          <div className="flex items-center gap-1 text-xs text-white/40">
            <MapPin className="w-3 h-3" />
            <span>{pengaturan?.alamat_sekolah || ''}</span>
          </div>
        </div>
      </div>

      {/* Right: Clock */}
      <div className="text-right">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-annajah-400/10 to-transparent rounded-lg blur-md" />
          <div className="relative">
            <p className="text-4xl font-bold tracking-[0.2em] tabular-nums bg-gradient-to-r from-annajah-200 via-annajah-300 to-annajah-200 bg-clip-text text-transparent">
              {formatTime(currentTime)}
            </p>
          </div>
        </div>
        <p className="text-xs text-white/50 mt-0.5">{formatDate(currentTime)}</p>
      </div>
    </header>
  )
}
