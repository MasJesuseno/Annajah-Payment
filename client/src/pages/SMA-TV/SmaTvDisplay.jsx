import { useState, useEffect, useCallback, useRef } from 'react'
import { School, Maximize2, Minimize2, Monitor, MousePointer2 } from 'lucide-react'
import Header from './components/Header'
import VideoPlayer from './components/VideoPlayer'
import AgendaPanel from './components/AgendaPanel'
import WeatherPanel from './components/WeatherPanel'
import QuotesBar from './components/QuotesBar'

const API_BASE = '/api'

export default function SmaTvDisplay() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [logoError, setLogoError] = useState(false)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFullscreenHint, setShowFullscreenHint] = useState(true)
  const [showClickOverlay, setShowClickOverlay] = useState(false)
  const [overlayDismissed, setOverlayDismissed] = useState(false)
  const autoFullscreenAttempted = useRef(false)

  const { videos, agenda, kataBijak, pengaturan } = data || {}

  // ─── Auto Fullscreen on Load ───
  // Browsers block automatic requestFullscreen() without user gesture,
  // so we: (1) try immediately, (2) show click overlay as fallback
  useEffect(() => {
    if (autoFullscreenAttempted.current) return
    autoFullscreenAttempted.current = true

    const tryAutoFullscreen = async () => {
      try {
        await document.documentElement.requestFullscreen()
        setIsFullscreen(true)
        setShowClickOverlay(false)
      } catch {
        // Auto-fullscreen ditolak browser (normal) → show click overlay
        setShowClickOverlay(true)
      }
    }

    // Coba auto-fullscreen setelah komponen mount
    const timer = setTimeout(tryAutoFullscreen, 500)
    return () => clearTimeout(timer)
  }, [])

  // Handle click on overlay to enter fullscreen
  const handleOverlayClick = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen()
      setIsFullscreen(true)
      setShowClickOverlay(false)
      setOverlayDismissed(true)
    } catch (err) {
      console.warn('Gagal masuk fullscreen:', err)
    }
  }, [])

  // ─── Fullscreen API ───

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        setIsFullscreen(true)
        setShowClickOverlay(false)
        setOverlayDismissed(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (err) {
      console.warn('Fullscreen tidak didukung:', err)
    }
  }, [])

  // Listen for fullscreen change events (Esc or browser UI)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fs = !!document.fullscreenElement
      setIsFullscreen(fs)
      // If user exits fullscreen via Esc, show overlay again
      if (!fs && !overlayDismissed) {
        setShowClickOverlay(true)
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [overlayDismissed])

  // Keyboard shortcut: F11 to toggle fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F11') {
        e.preventDefault()
        toggleFullscreen()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleFullscreen])

  // Auto-hide F11 hint after 8 seconds
  useEffect(() => {
    if (!showFullscreenHint) return
    const timer = setTimeout(() => {
      setShowFullscreenHint(false)
    }, 8000)
    return () => clearTimeout(timer)
  }, [showFullscreenHint])

  // ─── Data Fetching ───

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE}/pengaturan-tv/display`)
      const json = await res.json()
      setData(json)
    } catch {
      console.error('Gagal memuat data TV')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // ─── Video Navigation ───

  const prevVideo = useCallback(() => {
    if (!videos?.length) return
    setCurrentVideoIndex((prev) => (prev - 1 + videos.length) % videos.length)
  }, [videos?.length])

  const nextVideo = useCallback(() => {
    if (!videos?.length) return
    setCurrentVideoIndex((prev) => (prev + 1) % videos.length)
  }, [videos?.length])

  const changeVideo = useCallback(
    (index) => {
      if (!videos?.length) return
      setCurrentVideoIndex(index)
    },
    [videos?.length]
  )

  // ─── Handle first play (enter fullscreen) ───
  const handleVideoPlay = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen()
      setIsFullscreen(true)
      setShowClickOverlay(false)
      setOverlayDismissed(true)
    } catch {
      // Browser policy might block, that's okay
    }
  }, [])

  // ─── Loading State ───

  if (loading) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-gray-900 via-annajah-900 to-gray-900 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="relative mx-auto mb-6 w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-annajah-400/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-annajah-400 animate-spin" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-annajah-500 to-annajah-700 flex items-center justify-center">
              <School className="w-8 h-8 text-white" />
            </div>
          </div>
          <p className="text-white/60 text-lg font-light tracking-wider animate-pulse">Memuat Tampilan TV...</p>
          <p className="text-white/30 text-sm mt-2 font-light">SMA Annajah TV Display</p>
        </div>
      </div>
    )
  }

  return (
    <div
      id="sma-tv-container"
      className="h-screen w-screen overflow-hidden bg-gray-950 text-white flex flex-col relative select-none"
    >
      {/* ─── CLICK-TO-FULLSCREEN OVERLAY ─── */}
      {showClickOverlay && (
        <div
          onClick={handleOverlayClick}
          className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm cursor-pointer animate-fade-in"
        >
          <div className="relative">
            {/* Outer glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-annajah-500/20 via-annajah-400/20 to-annajah-500/20 rounded-full blur-3xl animate-pulse-slow" />

            {/* Icon circle */}
            <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-annajah-500/30 to-annajah-700/30 border-2 border-annajah-400/40 flex items-center justify-center mb-8 animate-float-slow shadow-2xl shadow-annajah-500/20">
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-annajah-400 animate-spin-slow" />
              <MousePointer2 className="w-12 h-12 text-annajah-300" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white/90 mb-3 tracking-wide">
            Tampilan TV
          </h2>
          <p className="text-lg text-white/60 font-light mb-6">
            Klik di mana saja untuk layar penuh
          </p>

          <div className="flex items-center gap-3 text-white/30 text-sm">
            <kbd className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-annajah-300">
              F11
            </kbd>
            <span>atau</span>
            <kbd className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-annajah-300">
              Esc
            </kbd>
            <span className="text-white/20 mx-1">|</span>
            <span>keluar</span>
          </div>
        </div>
      )}

      {/* ─── Animated Background ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-annajah-950/60 to-gray-950 animate-gradient-shift" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Floating orbs */}
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-annajah-500/5 blur-[120px] animate-float-slow" />
        <div
          className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[100px] animate-float-slow"
          style={{ animationDelay: '-3s' }}
        />
        <div
          className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-emerald-500/4 blur-[80px] animate-float-slow"
          style={{ animationDelay: '-6s' }}
        />
      </div>

      {/* ─── FULLSCREEN CONTROLS (top-right) ─── */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity duration-300 group/fullscreen">
        {/* F11 hint tooltip */}
        {showFullscreenHint && !isFullscreen && (
          <div className="bg-black/60 backdrop-blur-xl border border-white/10 px-3 py-2 rounded-xl shadow-xl animate-fade-in flex items-center gap-2 pointer-events-none">
            <Monitor className="w-3.5 h-3.5 text-annajah-300" />
            <span className="text-xs text-white/70 whitespace-nowrap">
              Tekan <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-annajah-200 text-[10px] font-mono">F11</kbd> untuk layar penuh
            </span>
          </div>
        )}
        <button
          onClick={toggleFullscreen}
          className="bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-xl p-2.5 transition-all duration-300 cursor-pointer border border-white/5 hover:border-white/20 group/btn shadow-lg"
          title={isFullscreen ? 'Keluar layar penuh (F11)' : 'Layar penuh (F11)'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 text-annajah-300 group-hover/btn:scale-110 transition-transform" />
          ) : (
            <Maximize2 className="w-4 h-4 text-white/60 group-hover/btn:text-white group-hover/btn:scale-110 transition-all" />
          )}
        </button>
      </div>

      {/* Fullscreen status indicator */}
      {isFullscreen && (
        <div className="absolute bottom-20 left-4 z-50 opacity-0 hover:opacity-100 transition-opacity duration-300">
          <div className="bg-black/40 backdrop-blur-md border border-white/5 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <Maximize2 className="w-3 h-3 text-annajah-300" />
            <span className="text-[10px] text-white/50">Layar Penuh</span>
          </div>
        </div>
      )}

      {/* ─── HEADER ─── */}
      <Header pengaturan={pengaturan} logoError={logoError} onLogoError={setLogoError} />

      {/* ─── MAIN CONTENT (2-Column Layout) ─── */}
      <div className="relative flex-1 flex p-4 gap-4 min-h-0 z-10">
        {/* Left Column: Video Player */}
        <VideoPlayer
          videos={videos}
          currentVideoIndex={currentVideoIndex}
          onPrevVideo={prevVideo}
          onNextVideo={nextVideo}
          onVideoChange={changeVideo}
        />

        {/* Right Column: Agenda + Weather */}
        <div className="flex-[1] flex flex-col gap-4 min-h-0">
          <AgendaPanel agenda={agenda} />
          <WeatherPanel
            latitude={pengaturan?.latitude}
            longitude={pengaturan?.longitude}
          />
        </div>
      </div>

      {/* ─── RUNNING TEXT / KATA BIJAK ─── */}
      <QuotesBar kataBijak={kataBijak} namaSekolah={pengaturan?.nama_sekolah} />

      {/* ─── GLOBAL CSS ─── */}
      <style>{`
        @keyframes gradient-shift {
          0%, 100% { opacity: 1; }
          25% { opacity: 0.85; }
          50% { opacity: 0.7; }
          75% { opacity: 0.85; }
        }
        .animate-gradient-shift {
          animation: gradient-shift 15s ease-in-out infinite;
        }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          33% { transform: translateY(-15px) rotate(1deg); }
          66% { transform: translateY(8px) rotate(-1deg); }
        }
        .animate-float-slow {
          animation: float-slow 12s ease-in-out infinite;
        }

        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        @keyframes bounce-gentle {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-5px); }
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }

        .tabular-nums {
          font-variant-numeric: tabular-nums;
        }

        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }

        /* Fullscreen styles */
        #sma-tv-container:-webkit-full-screen {
          width: 100vw;
          height: 100vh;
        }
        #sma-tv-container:fullscreen {
          width: 100vw;
          height: 100vh;
        }

        /* Prevent text selection on TV display */
        #sma-tv-container {
          -webkit-user-select: none;
          user-select: none;
        }

        /* Hide cursor after inactivity on fullscreen */
        @keyframes hide-cursor {
          0%, 95% { cursor: none; }
          100% { cursor: default; }
        }
        #sma-tv-container:fullscreen {
          animation: hide-cursor 5s forwards;
        }
        #sma-tv-container:fullscreen:hover {
          cursor: default;
          animation: none;
        }
      `}</style>
    </div>
  )
}
