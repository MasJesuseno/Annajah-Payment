import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Play,
} from 'lucide-react'

export default function VideoPlayer({ videos, currentVideoIndex, onPrevVideo, onNextVideo, onVideoChange }) {
  const [isMuted, setIsMuted] = useState(true)
  const [soundActivated, setSoundActivated] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)

  const videoContainerRef = useRef(null)
  const playerRef = useRef(null)
  const apiReadyRef = useRef(false)
  const progressIntervalRef = useRef(null)
  const currentVideoIdRef = useRef(null)
  const autoUnmuteRef = useRef(null)
  const userInteractedRef = useRef(false)
  const playerInitializedRef = useRef(false)

  // ─── Refs untuk props terbaru (supaya event handler YouTube tidak stale) ───
  const videosRef = useRef(videos)
  const currentVideoIndexRef = useRef(currentVideoIndex)
  const onVideoChangeRef = useRef(onVideoChange)

  useEffect(() => { videosRef.current = videos }, [videos])
  useEffect(() => { currentVideoIndexRef.current = currentVideoIndex }, [currentVideoIndex])
  useEffect(() => { onVideoChangeRef.current = onVideoChange }, [onVideoChange])

  // ─── Show tooltip initially ───
  useEffect(() => {
    if (videos?.length > 0) {
      setShowTooltip(true)
      const timer = setTimeout(() => setShowTooltip(false), 6000)
      return () => clearTimeout(timer)
    }
  }, [videos?.length])

  // ─── Hide tooltip after sound activated ───
  useEffect(() => {
    if (soundActivated) {
      setShowTooltip(false)
    }
  }, [soundActivated])

  // ─── Track video progress ───
  const startProgressTracker = useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current?.getCurrentTime && playerRef.current?.getDuration) {
        try {
          const current = playerRef.current.getCurrentTime()
          const duration = playerRef.current.getDuration()
          if (duration > 0) {
            setVideoProgress(current)
            setVideoDuration(duration)
          }
        } catch {
          // Player not ready
        }
      }
    }, 500)
  }, [])

  // ─── Load YouTube IFrame API ───
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

  // ─── Handler video ended ───
  const handleVideoEnded = useCallback(() => {
    const curVideos = videosRef.current
    const curIndex = currentVideoIndexRef.current
    if (!curVideos?.length) return

    if (curVideos.length === 1) {
      playerRef.current?.seekTo(0)
      playerRef.current?.playVideo()
    } else {
      const nextIdx = (curIndex + 1) % curVideos.length
      setTimeout(() => {
        onVideoChangeRef.current(nextIdx)
      }, 300)
    }
  }, [])

  // ─── Toggle sound ───
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

  // ─── Helper: ekstrak YouTube ID ───
  const getYoutubeId = (url) => {
    if (!url) return null
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
      /^([a-zA-Z0-9_-]{11})$/,
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  // ─── Buat player & ganti video ───
  // Effect ini:
  //   - Pertama kali: membuat player YouTube baru
  //   - Video berikutnya: panggil loadVideoById() pada player yang sama
  //     (tidak perlu destroy/recreate, jadi autoplay tetap jalan)
  useEffect(() => {
    if (!videos?.length || !apiReadyRef.current || !videoContainerRef.current) return

    const currentVideo = videos[currentVideoIndex]
    const youtubeId = currentVideo ? getYoutubeId(currentVideo.link_video) : null
    if (!youtubeId) return

    // Skip jika video yang sama sudah dimuat (misal dari refetch data)
    if (currentVideoIdRef.current === youtubeId && playerInitializedRef.current) return

    currentVideoIdRef.current = youtubeId
    setVideoProgress(0)
    setVideoDuration(0)

    if (playerInitializedRef.current && playerRef.current) {
      // Player sudah ada → muat video baru dengan loadVideoById (autoplay tetap jalan)
      playerRef.current.loadVideoById(youtubeId)
      return
    }

    // Pertama kali → buat player baru
    videoContainerRef.current.innerHTML = ''
    const playerDiv = document.createElement('div')
    videoContainerRef.current.appendChild(playerDiv)

    playerRef.current = new window.YT.Player(playerDiv, {
      height: '100%',
      width: '100%',
      videoId: youtubeId,
      playerVars: {
        autoplay: 1,
        mute: 1,
        controls: 0,
        showinfo: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
      },
      events: {
        onReady: (event) => {
          playerInitializedRef.current = true
          // Langsung play (muted) tanpa perlu klik — browser izinkan autoplay muted
          event.target.playVideo()
          startProgressTracker()
          if (userInteractedRef.current) {
            // User sudah pernah interaksi sebelumnya → auto-unmute
            autoUnmuteRef.current = setTimeout(() => {
              event.target.unMute()
              event.target.setVolume(100)
              setIsMuted(false)
              setSoundActivated(true)
              autoUnmuteRef.current = null
            }, 200)
          }
        },
        onStateChange: (event) => {
          if (event.data === 0) {
            handleVideoEnded()
          }
          if (event.data === 1) {
            startProgressTracker()
          }
          if (event.data === 2) {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
          }
        },
        onError: () => {
          const curVideos = videosRef.current
          const curIndex = currentVideoIndexRef.current
          if (curVideos?.length > 1) {
            setTimeout(() => {
              const nextIdx = (curIndex + 1) % curVideos.length
              onVideoChangeRef.current(nextIdx)
            }, 500)
          }
        },
      },
    })

    // Cleanup saat deps berubah: hanya bersihkan interval/timeout
    // (player TIDAK di-destroy agar autoplay tetap jalan di video berikutnya)
    return () => {
      if (autoUnmuteRef.current) {
        clearTimeout(autoUnmuteRef.current)
        autoUnmuteRef.current = null
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }
  }, [currentVideoIndex, videos, handleVideoEnded, startProgressTracker])

  // ─── Cleanup player hanya saat komponen unmount ───
  useEffect(() => {
    return () => {
      if (autoUnmuteRef.current) {
        clearTimeout(autoUnmuteRef.current)
        autoUnmuteRef.current = null
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
        playerInitializedRef.current = false
      }
    }
  }, [])

  const progressPercent = videoDuration > 0 ? (videoProgress / videoDuration) * 100 : 0
  const hasVideos = videos?.length > 0
  const currentVideo = videos?.[currentVideoIndex]

  return (
    <div className="flex-[2] flex flex-col min-h-0">
      <div className="flex-1 flex flex-col min-h-0 gap-3">
        {/* Video Player */}
        <div className="relative flex-1 bg-black/30 rounded-2xl overflow-hidden border border-white/5 group shadow-2xl shadow-black/20">
          {/* Glow border effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-annajah-500/10 via-transparent to-annajah-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

          {/* YouTube Player Container */}
          <div ref={videoContainerRef} className="w-full h-full" />

          {/* Gradient overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

          {/* No video placeholder */}
          {!hasVideos && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full border-2 border-white/10 flex items-center justify-center">
                  <Play className="w-12 h-12 ml-1" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-annajah-500/20 rounded-full animate-pulse-slow" />
              </div>
              <p className="text-lg font-light tracking-wider">Tidak ada video untuk ditampilkan</p>
              <p className="text-sm text-white/10 mt-2">Tambahkan video di menu Pengaturan TV</p>
            </div>
          )}

          {/* Sound toggle */}
          {hasVideos && (
            <button
              onClick={toggleSound}
              className="absolute top-4 right-4 z-20 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full p-3 transition-all duration-300 group/btn cursor-pointer border border-white/5 hover:border-white/10"
              title={isMuted ? 'Aktifkan suara' : 'Nonaktifkan suara'}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white/60 group-hover/btn:text-white group-hover/btn:scale-110 transition-all duration-300" />
              ) : (
                <Volume2 className="w-5 h-5 text-annajah-300 group-hover/btn:text-annajah-200 group-hover/btn:scale-110 transition-all duration-300" />
              )}
            </button>
          )}

          {/* Sound status toast */}
          {hasVideos && showTooltip && isMuted && !soundActivated && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/5 shadow-xl pointer-events-none animate-bounce-gentle">
              <div className="flex items-center gap-3">
                <span className="text-annajah-300 text-lg">🔇</span>
                <div>
                  <p className="text-white/80 text-sm font-medium">Suara akan menyala otomatis</p>
                  <p className="text-white/40 text-xs">Atau klik ikon speaker</p>
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
                  onClick={() => onVideoChange(i)}
                  className={`transition-all duration-500 rounded-full cursor-pointer ${
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
        {hasVideos && (
          <div className="relative h-1 bg-white/5 rounded-full overflow-hidden group/progress">
            <div
              className="h-full bg-gradient-to-r from-annajah-500 via-annajah-400 to-annajah-300 rounded-full transition-all duration-300 ease-linear relative"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-annajah-300 rounded-full shadow-lg shadow-annajah-400/50 opacity-0 group-hover/progress:opacity-100 transition-opacity" />
            </div>
          </div>
        )}

        {/* Video description + Navigation */}
        {currentVideo?.deskripsi && (
          <div className="bg-white/[0.03] backdrop-blur-xl rounded-xl border border-white/[0.06] px-5 py-3 shrink-0 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.05]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-annajah-500/20 to-annajah-500/5 flex items-center justify-center shrink-0">
                  <Play className="w-4 h-4 text-annajah-300" fill="currentColor" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Sedang Diputar</p>
                  <p className="text-sm text-white/80 leading-relaxed truncate">{currentVideo.deskripsi}</p>
                </div>
              </div>
              {videos?.length > 1 && (
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-[10px] text-white/30 tabular-nums">
                    {currentVideoIndex + 1}/{videos.length}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={onPrevVideo}
                      className="bg-white/5 hover:bg-white/10 backdrop-blur rounded-lg p-2 transition-all duration-200 hover:scale-110 cursor-pointer group/btn border border-white/5 hover:border-white/10"
                      title="Video sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4 text-white/50 group-hover/btn:text-white transition-colors" />
                    </button>
                    <button
                      onClick={onNextVideo}
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
  )
}
