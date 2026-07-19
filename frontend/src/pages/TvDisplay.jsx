import { useState, useEffect, useRef, useCallback } from 'react'
import { School, Volume2, VolumeX, ChevronLeft, ChevronRight, Play, Calendar, Sparkles } from 'lucide-react'

const API_BASE = '/api'

export default function TvDisplay() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [currentKataIndex, setCurrentKataIndex] = useState(0)
  const [logoError, setLogoError] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isMuted, setIsMuted] = useState(true)     // Awalnya mute untuk autoplay policy
  const [soundActivated, setSoundActivated] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [showTooltip, setShowTooltip] = useState(false) // Tooltip dimatikan karena auto unmute
  const [weather, setWeather] = useState(null)
  const [weatherForecast, setWeatherForecast] = useState([])
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [locationName, setLocationName] = useState('')
  const videoContainerRef = useRef(null)
  const playerRef = useRef(null)
  const apiReadyRef = useRef(false)
  const progressIntervalRef = useRef(null)
  const currentVideoIdRef = useRef(null) // Track current video ID to prevent unnecessary recreation
  const autoUnmuteRef = useRef(null) // Track auto-unmute timeout for cleanup
  const agendaContainerRef = useRef(null)
  const agendaContentRef = useRef(null)
  const [agendaScroll, setAgendaScroll] = useState({ active: false, distance: 0 })

  // Derived data from state (di sini biar bisa diakses hooks di bawah)
  const { videos, agenda, kataBijak, pengaturan } = data || {}

  // Fetch data
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

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Hide sound tooltip after 8 seconds
  useEffect(() => {
    if (soundActivated) {
      setShowTooltip(false)
      return
    }
    const timer = setTimeout(() => setShowTooltip(false), 8000)
    return () => clearTimeout(timer)
  }, [soundActivated])

  // Fetch weather from Open-Meteo using coordinates from pengaturan
  const fetchWeather = useCallback(async (lat, lon) => {
    try {
      const latitude = parseFloat(lat) || -6.2088
      const longitude = parseFloat(lon) || 106.8456

      setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)

      // Fetch current weather + 3-day forecast
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days=3&timezone=auto`
      )
      const weatherData = await weatherRes.json()
      setWeather(weatherData.current)

      // Extract 3-day forecast (skip today, take next 2 days)
      if (weatherData.daily) {
        const forecast = []
        for (let i = 1; i < weatherData.daily.time.length; i++) {
          forecast.push({
            date: weatherData.daily.time[i],
            tempMax: weatherData.daily.temperature_2m_max[i],
            tempMin: weatherData.daily.temperature_2m_min[i],
            weatherCode: weatherData.daily.weather_code[i],
          })
        }
        setWeatherForecast(forecast)
      }
    } catch {
      console.error('Gagal memuat data cuaca')
    } finally {
      setWeatherLoading(false)
    }
  }, [])

  // When data loads, fetch weather using coordinates from pengaturan
  useEffect(() => {
    if (!data?.pengaturan) return
    const lat = data.pengaturan.latitude
    const lon = data.pengaturan.longitude
    if (!lat || !lon) return

    fetchWeather(lat, lon)

    // Refresh weather every 15 minutes
    const interval = setInterval(() => {
      fetchWeather(lat, lon)
    }, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [data?.pengaturan?.latitude, data?.pengaturan?.longitude, fetchWeather])

  // Get short day name for forecast (Besok, Lusa, or weekday)
  const getDayName = (dateStr, idx) => {
    if (idx === 0) return 'Besok'
    if (idx === 1) return 'Lusa'
    const d = new Date(dateStr + 'T00:00:00')
    const hari = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
    return hari[d.getDay()]
  }

  // Determine weather icon from WMO code
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

  // Weather condition labels in Indonesian
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

  // Rotate kata bijak every 10 seconds
  useEffect(() => {
    if (!data?.kataBijak?.length || data.kataBijak.length <= 1) return
    const interval = setInterval(() => {
      setCurrentKataIndex(prev => (prev + 1) % data.kataBijak.length)
    }, 10000)
    return () => clearInterval(interval)
  }, [data?.kataBijak?.length])

  // Track video progress
  const startProgressTracker = useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime && playerRef.current.getDuration) {
        try {
          const current = playerRef.current.getCurrentTime()
          const duration = playerRef.current.getDuration()
          if (duration > 0) {
            setVideoProgress(current)
            setVideoDuration(duration)
          }
        } catch {
          // Player not ready yet
        }
      }
    }, 500)
  }, [])

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT) {
      apiReadyRef.current = true
      return
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScript = document.getElementsByTagName('script')[0]
    firstScript.parentNode.insertBefore(tag, firstScript)

    window.onYouTubeIframeAPIReady = () => {
      apiReadyRef.current = true
    }

    return () => {
      window.onYouTubeIframeAPIReady = null
    }
  }, [])

  // Create/destroy YouTube player when video changes
  useEffect(() => {
    if (!videos?.length || !apiReadyRef.current) return

    const currentVideo = videos[currentVideoIndex]
    const youtubeId = currentVideo ? getYoutubeId(currentVideo.link_video) : null
    if (!youtubeId || !videoContainerRef.current) return

    // Jangan recreate player jika video yang sama masih diputar
    // (mencegah restart saat data di-refresh)
    if (playerRef.current && currentVideoIdRef.current === youtubeId) {
      return
    }

    currentVideoIdRef.current = youtubeId

    // Destroy existing player
    if (playerRef.current) {
      playerRef.current.destroy()
      playerRef.current = null
    }
    setVideoProgress(0)
    setVideoDuration(0)

    // Clear container
    videoContainerRef.current.innerHTML = ''

    // Create new player
    const playerDiv = document.createElement('div')
    videoContainerRef.current.appendChild(playerDiv)

    playerRef.current = new window.YT.Player(playerDiv, {
      height: '100%',
      width: '100%',
      videoId: youtubeId,
      playerVars: {
        autoplay: 1,
        mute: isMuted ? 1 : 0,
        controls: 0,
        showinfo: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
      },
      events: {
        onReady: (event) => {
          // Play dulu dalam keadaan mute (biar browser ijinin autoplay)
          event.target.playVideo()
          startProgressTracker()
          // Auto unmute sebentar setelah video mulai (browser policy: muted autoplay allowed)
          autoUnmuteRef.current = setTimeout(() => {
            event.target.unMute()
            event.target.setVolume(100)
            setIsMuted(false)
            setSoundActivated(true)
            autoUnmuteRef.current = null
          }, 200)
        },
        onStateChange: (event) => {
          // YT.PlayerState.ENDED = 0
          if (event.data === 0) {
            if (videos.length === 1) {
              // Jika hanya 1 video, putar ulang dari awal
              event.target.seekTo(0)
              event.target.playVideo()
            } else {
              // Pindah ke video berikutnya
              setTimeout(() => {
                setCurrentVideoIndex(prev => (prev + 1) % videos.length)
              }, 300)
            }
          }
          if (event.data === 1) {
            startProgressTracker()
          }
          if (event.data === 2) {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
          }
        },
      },
    })

    return () => {
      if (autoUnmuteRef.current) {
        clearTimeout(autoUnmuteRef.current)
        autoUnmuteRef.current = null
      }
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
    // NOTE: hanya bergantung pada currentVideoIndex dan videos (bukan data?.videos)
    // agar player tidak recreate saat fetchData
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVideoIndex, videos])

  // Navigate to previous video
  const prevVideo = useCallback(() => {
    if (!data?.videos?.length) return
    setCurrentVideoIndex(prev => (prev - 1 + data.videos.length) % data.videos.length)
  }, [data?.videos?.length])

  // Navigate to next video
  const nextVideo = useCallback(() => {
    if (!data?.videos?.length) return
    setCurrentVideoIndex(prev => (prev + 1) % data.videos.length)
  }, [data?.videos?.length])

  // Handle sound toggle
  const toggleSound = useCallback(() => {
    if (!playerRef.current) return
    if (isMuted) {
      playerRef.current.unMute()
      playerRef.current.setVolume(100)
      setIsMuted(false)
      setSoundActivated(true)
      setShowTooltip(false)
    } else {
      playerRef.current.mute()
      setIsMuted(true)
    }
  }, [isMuted])

  const getYoutubeId = (url) => {
    if (!url) return null
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  // Detect if agenda overflows and calculate scroll distance
  useEffect(() => {
    if (!agendaContainerRef.current || !agendaContentRef.current || !agenda?.length) {
      setAgendaScroll({ active: false, distance: 0 })
      return
    }
    const container = agendaContainerRef.current
    const content = agendaContentRef.current
    const distance = content.scrollHeight - container.clientHeight
    if (distance > 0) {
      setAgendaScroll({ active: true, distance })
    } else {
      setAgendaScroll({ active: false, distance: 0 })
    }
  }, [agenda])

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '-'
    const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    return `${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const formatDateSimple = (date) => {
    return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  const progressPercent = videoDuration > 0 ? (videoProgress / videoDuration) * 100 : 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (loading) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-gray-900 via-annajah-900 to-gray-900 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="relative mx-auto mb-6 w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-annajah-400/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-annajah-400 animate-spin"></div>
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-annajah-500 to-annajah-700 flex items-center justify-center">
              <School className="w-8 h-8 text-white" />
            </div>
          </div>
          <p className="text-white/60 text-lg font-light tracking-wider animate-pulse">Memuat Tampilan TV...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-950 text-white flex flex-col relative">
      {/* ─── Animated Background ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-annajah-950/60 to-gray-950 animate-gradient-shift"></div>

        {/* Animated grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Floating orbs */}
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-annajah-500/5 blur-[120px] animate-float-slow"></div>
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[100px] animate-float-slow" style={{ animationDelay: '-3s' }}></div>
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-emerald-500/4 blur-[80px] animate-float-slow" style={{ animationDelay: '-6s' }}></div>

        {/* Decorative particles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/10 rounded-full animate-particle"
            style={{
              left: `${10 + i * 18}%`,
              top: `${20 + (i % 3) * 30}%`,
              animationDelay: `${i * 1.5}s`,
              animationDuration: `${8 + i * 2}s`,
            }}
          />
        ))}
      </div>

      {/* ─── HEADER ─── */}
      <header className="relative bg-gradient-to-r from-annajah-900/80 via-annajah-800/70 to-gray-900/80 backdrop-blur-xl px-8 py-3 flex items-center justify-between border-b border-white/5 shrink-0 z-10">
        {/* Left: Logo + School Info */}
        <div className="flex items-center gap-4 group">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-annajah-400/30 to-annajah-600/30 rounded-xl blur-md transition-all duration-500 group-hover:blur-lg"></div>
            <div className="relative w-12 h-12 rounded-xl bg-white/5 backdrop-blur border border-white/10 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-annajah-400/30 group-hover:scale-105">
              {pengaturan?.logo && !logoError ? (
                <img
                  src={pengaturan.logo}
                  alt="Logo"
                  className="w-full h-full object-contain p-1"
                  onError={() => setLogoError(true)}
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
            <p className="text-xs text-white/40">{pengaturan?.alamat_sekolah || ''}</p>
          </div>
        </div>

        {/* Right: Clock */}
        <div className="text-right">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-annajah-400/10 to-transparent rounded-lg blur-md"></div>
            <div className="relative">
              <p className="text-4xl font-bold tracking-[0.2em] tabular-nums bg-gradient-to-r from-annajah-200 via-annajah-300 to-annajah-200 bg-clip-text text-transparent">
                {formatTime(currentTime)}
              </p>
            </div>
          </div>
          <p className="text-xs text-white/50 mt-0.5">{formatDateSimple(currentTime)}</p>
        </div>
      </header>

      {/* ─── MAIN CONTENT (2-Column Layout) ─── */}
      <div className="relative flex-1 flex p-4 gap-4 min-h-0 z-10">
        {/* Left Column: Video Player */}
        <div className="flex-[2] flex flex-col min-h-0">
          <div className="flex-1 flex flex-col min-h-0 gap-3">
            {/* Video Player */}
            <div className="relative flex-1 bg-black/30 rounded-2xl overflow-hidden border border-white/5 group shadow-2xl shadow-black/20">
              {/* Glow border effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-annajah-500/10 via-transparent to-annajah-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

              {/* YouTube Player Container */}
              <div ref={videoContainerRef} className="w-full h-full" />

              {/* Gradient overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>

              {/* No video placeholder */}
              {!data?.videos?.length && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
                  <div className="relative mb-6">
                    <div className="w-24 h-24 rounded-full border-2 border-white/10 flex items-center justify-center">
                      <Play className="w-12 h-12 ml-1" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-annajah-500/20 rounded-full animate-pulse-slow"></div>
                  </div>
                  <p className="text-lg font-light tracking-wider">Tidak ada video untuk ditampilkan</p>
                  <p className="text-sm text-white/10 mt-2">Tambahkan video di menu Pengaturan TV</p>
                </div>
              )}

              {/* Sound toggle button */}
              {data?.videos?.length > 0 && (
                <button
                  onClick={toggleSound}
                  className="absolute top-4 right-4 z-20 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full p-3 transition-all duration-300 group/btn cursor-pointer border border-white/5 hover:border-white/10"
                  title={isMuted ? 'Aktifkan suara' : 'Nonaktifkan suara'}
                >
                  <div className="relative">
                    {isMuted ? (
                      <VolumeX className="w-5 h-5 text-white/60 group-hover/btn:text-white group-hover/btn:scale-110 transition-all duration-300" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-annajah-300 group-hover/btn:text-annajah-200 group-hover/btn:scale-110 transition-all duration-300" />
                    )}
                  </div>
                </button>
              )}

              {/* Sound status toast */}
              {data?.videos?.length > 0 && showTooltip && isMuted && !soundActivated && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/5 shadow-xl pointer-events-none animate-bounce-gentle">
                  <div className="flex items-center gap-3">
                    <span className="text-annajah-300 text-lg">🔇</span>
                    <div>
                      <p className="text-white/80 text-sm font-medium">Suara dimatikan</p>
                      <p className="text-white/40 text-xs">Klik ikon speaker untuk mengaktifkan</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Video indicator dots */}
              {videos?.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2.5 z-10">
                  {videos.map((v, i) => (
                    <button
                      key={v.id}
                      onClick={() => setCurrentVideoIndex(i)}
                      className={`transition-all duration-500 rounded-full ${
                        i === currentVideoIndex
                          ? 'w-8 h-2 bg-annajah-400 shadow-lg shadow-annajah-500/30'
                          : 'w-2 h-2 bg-white/20 hover:bg-white/40 hover:scale-110'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Video Progress Bar */}
            {data?.videos?.length > 0 && (
              <div className="relative h-1 bg-white/5 rounded-full overflow-hidden group/progress">
                <div
                  className="h-full bg-gradient-to-r from-annajah-500 via-annajah-400 to-annajah-300 rounded-full transition-all duration-300 ease-linear relative"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-annajah-300 rounded-full shadow-lg shadow-annajah-400/50 opacity-0 group-hover/progress:opacity-100 transition-opacity"></div>
                </div>
              </div>
            )}

            {/* Deskripsi Video + Navigasi */}
            {videos?.[currentVideoIndex]?.deskripsi && (
              <div className="bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/[0.06] px-5 py-3 shrink-0 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.05]">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-annajah-500/20 to-annajah-500/5 flex items-center justify-center shrink-0">
                      <Play className="w-4 h-4 text-annajah-300" fill="currentColor" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Sedang Diputar</p>
                      <p className="text-sm text-white/80 leading-relaxed truncate">
                        {videos[currentVideoIndex].deskripsi}
                      </p>
                    </div>
                  </div>
                  {videos?.length > 1 && (
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-[10px] text-white/30 tabular-nums">
                        {currentVideoIndex + 1}/{videos.length}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); prevVideo() }}
                          className="bg-white/5 hover:bg-white/10 backdrop-blur rounded-lg p-2 transition-all duration-200 hover:scale-110 cursor-pointer group/btn border border-white/5 hover:border-white/10"
                          title="Video sebelumnya"
                        >
                          <ChevronLeft className="w-4 h-4 text-white/50 group-hover/btn:text-white transition-colors" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); nextVideo() }}
                          className="bg-white/5 hover:bg-white/10 backdrop-blur rounded-lg p-2 transition-all duration-200 hover:scale-110 cursor-pointer group/btn border border-white/5 hover:border-white/10"
                          title="Video berikutnya"
                        >
                          <ChevronRight className="w-4 h-4 text-white/50 group-hover/btn:text-white transition-colors" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Agenda + Weather */}
        <div className="flex-[1] flex flex-col gap-4 min-h-0">
          {/* ─── AGENDA SECTION ─── */}
          <div
            ref={agendaContainerRef}
            className="flex-[3] bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5 overflow-hidden min-h-0 transition-all duration-300 hover:border-white/10"
          >
            <div className="flex items-center gap-3 mb-5 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-annajah-500/20 to-annajah-500/5 flex items-center justify-center border border-annajah-500/10">
                <Calendar className="w-4 h-4 text-annajah-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white/90">Agenda Sekolah</h3>
                <p className="text-[10px] text-white/30">Jadwal kegiatan sekolah</p>
              </div>
            </div>

            {agenda?.length > 0 ? (
              <div className="relative">
                {/* Timeline vertical line */}
                <div className="absolute left-[15px] top-0 bottom-0 w-px bg-gradient-to-b from-annajah-500/30 via-annajah-500/10 to-transparent pointer-events-none"></div>

                {/* Gradient fade at top/bottom when scrolling */}
                {agendaScroll.active && (
                  <>
                    <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-gray-950 to-transparent z-10 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-gray-950 to-transparent z-10 pointer-events-none"></div>
                  </>
                )}

                <div
                  ref={agendaContentRef}
                  className="space-y-0"
                  style={agendaScroll.active ? {
                    animation: `scroll-agenda-${agenda.length} ${Math.max(agenda.length * 4, 15)}s linear infinite`,
                  } : {}}
                >
                  {agenda.map((item, idx) => {
                    const itemDate = new Date(item.tanggal)
                    const isToday = itemDate.getTime() === today.getTime()
                    const isPast = itemDate < today
                    return (
                      <div
                        key={item.id}
                        className={`relative flex gap-4 py-2.5 transition-all duration-300 group/item ${
                          isToday ? 'scale-[1.02]' : ''
                        }`}
                      >
                        {/* Timeline dot */}
                        <div className="relative flex flex-col items-center shrink-0">
                          <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center transition-all duration-300 ${
                            isToday
                              ? 'bg-gradient-to-br from-annajah-400 to-annajah-600 shadow-lg shadow-annajah-500/30'
                              : isPast
                                ? 'bg-white/5 border border-white/5'
                                : 'bg-white/5 border border-white/10 group-hover/item:border-annajah-400/30'
                          }`}>
                            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                              isToday ? 'bg-white' : isPast ? 'bg-white/20' : 'bg-white/30 group-hover/item:bg-annajah-300'
                            }`}></div>
                          </div>
                        </div>

                        {/* Content */}
                        <div className={`flex-1 min-w-0 pb-2 ${
                          idx < agenda.length - 1 ? 'border-b border-white/[0.03]' : ''
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            {isToday && (
                              <span className="text-[9px] font-bold bg-gradient-to-r from-annajah-500 to-annajah-400 text-white px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                                Hari Ini
                              </span>
                            )}
                            {isPast && (
                              <span className="text-[9px] font-medium text-white/20 border border-white/10 px-2 py-0.5 rounded-full">
                                ✓ Selesai
                              </span>
                            )}
                            <span className={`text-[11px] font-medium ${
                              isToday ? 'text-annajah-300' : isPast ? 'text-white/30' : 'text-white/50'
                            }`}>
                              {formatDate(item.tanggal)}
                            </span>
                          </div>
                          <p className={`text-[13px] leading-relaxed ${
                            isToday ? 'text-white font-medium' : isPast ? 'text-white/30 line-through' : 'text-white/70'
                          }`}>
                            {item.agenda}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-white/20">
                <div className="w-16 h-16 rounded-2xl border border-white/5 flex items-center justify-center mb-4">
                  <Calendar className="w-8 h-8" />
                </div>
                <p className="text-sm font-light">Belum ada agenda</p>
                <p className="text-xs text-white/10 mt-1">Untuk 7 hari ke depan</p>
              </div>
            )}
          </div>

          {/* ─── WEATHER CARD ─── */}
          <div className="flex-[1] bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-4 transition-all duration-300 hover:border-white/10 min-h-0 flex flex-col justify-center">
            {weatherLoading ? (
              <div className="flex items-center gap-2 justify-center py-2">
                <div className="w-3 h-3 border-2 border-annajah-400/30 border-t-annajah-400 rounded-full animate-spin"></div>
                <span className="text-xs text-white/30">Memuat cuaca...</span>
              </div>
            ) : weather ? (
              <>
                {/* Current Weather Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-annajah-500/20 to-annajah-500/5 flex items-center justify-center border border-annajah-500/10">
                      <svg className="w-4 h-4 text-annajah-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Sekarang</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-lg leading-none">{getWeatherIcon(weather.weather_code)}</span>
                        <span className="text-sm font-bold text-white/80 tabular-nums">{Math.round(weather.temperature_2m)}°C</span>
                        <span className="text-xs text-white/40">{getWeatherLabel(weather.weather_code)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    {locationName && (
                      <div className="flex items-center gap-1 text-white/30">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-[10px]">{locationName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-white/20">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                      <span className="text-[10px]">{weather.relative_humidity_2m}%</span>
                    </div>
                  </div>
                </div>

                {/* 3-Day Forecast Row */}
                {weatherForecast.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/[0.05]">
                    <div className="flex items-center justify-between gap-2">
                      {weatherForecast.map((day, idx) => {
                        const dayName = getDayName(day.date, idx)
                        return (
                          <div key={day.date} className="flex-1 flex flex-col items-center gap-1 py-1 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
                            <span className="text-[10px] text-white/40 font-medium">{dayName}</span>
                            <span className="text-base leading-none">{getWeatherIcon(day.weatherCode)}</span>
                            <div className="flex items-center gap-1 text-[11px]">
                              <span className="text-white/70 font-medium tabular-nums">{Math.round(day.tempMax)}°</span>
                              <span className="text-white/20">/</span>
                              <span className="text-white/30 tabular-nums">{Math.round(day.tempMin)}°</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3 text-white/20">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
                <span className="text-xs">Cuaca tidak tersedia</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── RUNNING TEXT / KATA BIJAK ─── */}
      <div className="relative bg-gradient-to-r from-annajah-900/50 via-annajah-800/40 to-gray-900/50 backdrop-blur-sm border-t border-white/5 py-3 shrink-0 overflow-hidden z-10">
        {kataBijak?.length > 0 ? (
          <div className="relative">
            {/* Decorative quote marks */}
            <span className="absolute left-8 top-1/2 -translate-y-1/2 text-annajah-400/20 text-4xl font-serif leading-none pointer-events-none select-none">❝</span>

            <div className="whitespace-nowrap animate-marquee">
              {kataBijak.map((item) => (
                <span key={item.id} className="inline-flex items-center mx-8">
                  <span className="text-white/90 text-base font-light tracking-wide">
                    {item.kata_bijak}
                  </span>
                  <span className="mx-8 text-white/10 text-lg">✦</span>
                </span>
              ))}
            </div>

            {/* Decorative end quote */}
            <span className="absolute right-8 top-1/2 -translate-y-1/2 text-annajah-400/20 text-4xl font-serif leading-none pointer-events-none select-none">❞</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 text-white/30">
            <Sparkles className="w-4 h-4" />
            <p className="text-sm font-light">
              Selamat datang di {pengaturan?.nama_sekolah || 'SMA Annajah'}
            </p>
            <Sparkles className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* ─── CSS ─── */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee ${kataBijak?.length ? Math.max(kataBijak.length * 20, 35) : 35}s linear infinite;
        }

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

        @keyframes particle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.1; }
          25% { transform: translateY(-30px) translateX(10px); opacity: 0.3; }
          50% { transform: translateY(-60px) translateX(-5px); opacity: 0.15; }
          75% { transform: translateY(-30px) translateX(15px); opacity: 0.25; }
        }
        .animate-particle {
          animation: particle 10s ease-in-out infinite;
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }

        @keyframes bounce-gentle {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-5px); }
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 3px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 10px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.15);
        }

        .tabular-nums {
          font-variant-numeric: tabular-nums;
        }

        ${agendaScroll.active ? `
        @keyframes scroll-agenda-${agenda?.length || 0} {
          0% { transform: translateY(0); }
          10% { transform: translateY(0); }
          75% { transform: translateY(-${agendaScroll.distance}px); }
          90% { transform: translateY(-${agendaScroll.distance}px); }
          100% { transform: translateY(0); }
        }
        ` : ''}
      `}</style>
    </div>
  )
}
