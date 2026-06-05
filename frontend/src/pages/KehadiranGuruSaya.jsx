import { useState, useEffect, useCallback, useRef } from 'react'
import { Clock, MapPin, LogIn, LogOut, RefreshCw, History, CheckCircle, XCircle, Loader2, Navigation, ChevronLeft, ChevronRight, Camera, CameraOff, Image as ImageIcon } from 'lucide-react'
import { getStatusKehadiranGuru, absenMasukGuru, absenKeluarGuru, getKehadiranGuruSaya } from '../api'
import { parseGpsData } from '../utils/formatGps'

const FOTO_BASE_URL = '/uploads/kehadiran-guru/'

function formatTanggal(tgl) {
  if (!tgl) return '-'
  const d = new Date(tgl)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatJam(jam) {
  if (!jam) return '-'
  return jam.slice(0, 5)
}

// Camera capture modal component
function CameraModal({ mode, onCapture, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [capturedImage, setCapturedImage] = useState(null)
  const [cameraError, setCameraError] = useState('')
  const [loading, setLoading] = useState(true)

  const startCamera = useCallback(async () => {
    try {
      setLoading(true)
      setCameraError('')
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      setStream(s)
      if (videoRef.current) {
        videoRef.current.srcObject = s
      }
    } catch (err) {
      let msg = 'Tidak dapat mengakses kamera'
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Izin kamera ditolak. Izinkan akses kamera di browser.'
      } else if (err.name === 'NotFoundError') {
        msg = 'Kamera tidak ditemukan di perangkat ini.'
      }
      setCameraError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    startCamera()
    return () => {
      // Cleanup: stop all tracks
      if (stream) {
        stream.getTracks().forEach(t => t.stop())
      }
    }
  }, [startCamera])

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    const imageData = canvas.toDataURL('image/jpeg', 0.7)
    setCapturedImage(imageData)
  }

  const handleRetake = () => {
    setCapturedImage(null)
  }

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage)
    }
    // Stop camera
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
    }
  }

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop())
    }
    onClose()
  }

  const label = mode === 'masuk' ? 'Absen Masuk' : 'Absen Keluar'

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-annajah-600" />
            <h2 className="text-lg font-semibold text-gray-800">Foto {label}</h2>
          </div>
          <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-all">
            <XCircle className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Camera / Preview */}
        <div className="p-4">
          {cameraError ? (
            <div className="text-center py-10 space-y-3">
              <CameraOff className="w-16 h-16 text-red-300 mx-auto" />
              <p className="text-sm text-red-600 font-medium">{cameraError}</p>
              <p className="text-xs text-gray-400">Atau, lanjutkan absen tanpa foto</p>
              <div className="flex gap-3 justify-center pt-2">
                <button onClick={startCamera} className="btn-secondary text-sm">
                  Coba Lagi
                </button>
                <button onClick={() => { onCapture(null); handleClose() }} className="btn-primary text-sm">
                  Lanjut Tanpa Foto
                </button>
              </div>
            </div>
          ) : !capturedImage ? (
            <div className="relative bg-black rounded-xl overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-[4/3] object-cover"
              />
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden">
              <img src={capturedImage} alt="Preview" className="w-full aspect-[4/3] object-cover" />
              <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Foto diambil
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!cameraError && (
          <div className="flex gap-3 p-4 border-t border-gray-100">
            {!capturedImage ? (
              <>
                <button onClick={handleCapture} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2 py-3">
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                  {loading ? 'Menyiapkan kamera...' : 'Ambil Foto'}
                </button>
                <button onClick={() => { onCapture(null); handleClose() }} className="btn-secondary flex-1">
                  Lewati
                </button>
              </>
            ) : (
              <>
                <button onClick={handleConfirm} className="btn-primary flex-1 flex items-center justify-center gap-2 py-3">
                  <CheckCircle className="w-5 h-5" />
                  Gunakan Foto Ini
                </button>
                <button onClick={handleRetake} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                  <Camera className="w-4 h-4" />
                  Ulang
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function KehadiranGuruSaya() {
  const [todayStatus, setTodayStatus] = useState(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [gpsStatus, setGpsStatus] = useState('idle') // idle, loading, acquired, error
  const [gpsCoords, setGpsCoords] = useState(null)
  const [gpsError, setGpsError] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })

  // Camera modal
  const [showCamera, setShowCamera] = useState(false)
  const [cameraMode, setCameraMode] = useState('masuk') // 'masuk' or 'keluar'

  // History
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 5000)
  }

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus('error')
      setGpsError('Geolocation tidak didukung browser ini')
      return null
    }
    return new Promise((resolve) => {
      setGpsStatus('loading')
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            latitude: pos.coords.latitude.toFixed(6),
            longitude: pos.coords.longitude.toFixed(6),
          }
          setGpsCoords(coords)
          setGpsStatus('acquired')
          resolve(coords)
        },
        (err) => {
          let msg = 'Gagal mendapatkan lokasi'
          if (err.code === 1) msg = 'Izin lokasi ditolak. Izinkan akses lokasi di browser.'
          else if (err.code === 2) msg = 'Lokasi tidak tersedia'
          else if (err.code === 3) msg = 'Waktu mendapatkan lokasi habis'
          setGpsStatus('error')
          setGpsError(msg)
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    })
  }, [])

  const loadStatus = async () => {
    try {
      setLoadingStatus(true)
      const res = await getStatusKehadiranGuru()
      setTodayStatus(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingStatus(false)
    }
  }

  const loadHistory = async (p) => {
    try {
      setLoadingHistory(true)
      const params = { page: p || page, per_page: 20 }
      const res = await getKehadiranGuruSaya(params)
      setHistory(res.data.data || [])
      setTotal(res.data.total || 0)
      setTotalPages(res.data.total_pages || 1)
      setPage(res.data.page || 1)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    loadStatus()
    loadHistory(1)
    getLocation()
  }, [getLocation])

  // Open camera modal before absen
  const handleAbsenMasukClick = () => {
    setCameraMode('masuk')
    setShowCamera(true)
  }

  const handleAbsenKeluarClick = () => {
    setCameraMode('keluar')
    setShowCamera(true)
  }

  // Called after camera captures (or skips) a photo
  const handleCameraCapture = async (fotoBase64) => {
    setShowCamera(false)

    // Proceed with absen
    if (cameraMode === 'masuk') {
      await doAbsenMasuk(fotoBase64)
    } else {
      await doAbsenKeluar(fotoBase64)
    }
  }

  const doAbsenMasuk = async (fotoBase64) => {
    if (submitting) return
    try {
      setSubmitting(true)
      let gps = null
      if (navigator.geolocation) {
        gps = await getLocation()
      }
      const payload = { gps_masuk: gps || undefined }
      if (fotoBase64) {
        payload.foto_masuk = fotoBase64
      }
      await absenMasukGuru(payload)
      showMessage('success', 'Absen masuk berhasil dengan foto!')
      await loadStatus()
      await loadHistory(1)
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal absen masuk'
      showMessage('error', msg)
    } finally {
      setSubmitting(false)
    }
  }

  const doAbsenKeluar = async (fotoBase64) => {
    if (submitting || !todayStatus?.data?.id) return
    try {
      setSubmitting(true)
      let gps = null
      if (navigator.geolocation) {
        gps = await getLocation()
      }
      const payload = { gps_keluar: gps || undefined }
      if (fotoBase64) {
        payload.foto_keluar = fotoBase64
      }
      await absenKeluarGuru(todayStatus.data.id, payload)
      showMessage('success', 'Absen keluar berhasil dengan foto!')
      await loadStatus()
      await loadHistory(1)
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal absen keluar'
      showMessage('error', msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Absen Kehadiran</h1>
          <p className="text-gray-500 text-sm mt-1">Absen masuk & keluar dengan foto dan lokasi GPS</p>
        </div>
        <button onClick={() => { loadStatus(); loadHistory(page) }} className="btn-secondary text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-4 rounded-xl text-sm flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Today's Status + Absen Card */}
      <div className="card bg-gradient-to-br from-annajah-50 to-blue-50 border border-annajah-100 overflow-hidden">
        <div className="text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-6">
          {/* Status info */}
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-800 mb-1">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </h2>
            {loadingStatus ? (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Memeriksa status...
              </div>
            ) : todayStatus?.sudah_absen ? (
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                  <CheckCircle className="w-4 h-4" /> Sudah absen masuk
                </span>
                {todayStatus.data?.jam_masuk && (
                  <p className="text-sm text-gray-600 mt-2">
                    <Clock className="w-4 h-4 inline mr-1" /> Masuk: {todayStatus.data.jam_masuk}
                    {todayStatus.data?.gps_masuk?.display && (
                      <span className="ml-3 text-xs text-gray-400">
                        <MapPin className="w-3 h-3 inline mr-0.5" /> {todayStatus.data.gps_masuk.display}
                      </span>
                    )}
                    {todayStatus.data?.foto_masuk && (
                      <span className="ml-3 text-xs text-green-500">
                        <Camera className="w-3 h-3 inline mr-0.5" /> Ada foto
                      </span>
                    )}
                  </p>
                )}
                {todayStatus.sudah_keluar ? (
                  <p className="text-sm text-amber-700 mt-1">
                    <LogOut className="w-4 h-4 inline mr-1" /> Sudah absen keluar jam {todayStatus.data?.jam_keluar}
                    {todayStatus.data?.gps_keluar?.display && (
                      <span className="ml-3 text-xs text-gray-400">
                        <MapPin className="w-3 h-3 inline mr-0.5" /> {todayStatus.data.gps_keluar.display}
                      </span>
                    )}
                    {todayStatus.data?.foto_keluar && (
                      <span className="ml-3 text-xs text-amber-500">
                        <Camera className="w-3 h-3 inline mr-0.5" /> Ada foto
                      </span>
                    )}
                  </p>
                ) : todayStatus.sudah_absen && (
                  <p className="text-sm text-amber-600 mt-1">Belum absen keluar</p>
                )}
              </div>
            ) : (
              <div>
                <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-sm font-medium">
                  <XCircle className="w-4 h-4" /> Belum absen hari ini
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:items-end gap-3 mt-4 sm:mt-0">
            {/* GPS Status */}
            <div className="flex items-center gap-2 text-xs">
              <Navigation className={`w-3.5 h-3.5 ${
                gpsStatus === 'acquired' ? 'text-green-500' :
                gpsStatus === 'loading' ? 'text-blue-500 animate-pulse' :
                gpsStatus === 'error' ? 'text-red-500' : 'text-gray-400'
              }`} />
              <span className={
                gpsStatus === 'acquired' ? 'text-green-600' :
                gpsStatus === 'loading' ? 'text-blue-600' :
                gpsStatus === 'error' ? 'text-red-500' : 'text-gray-400'
              }>
                {gpsStatus === 'acquired' ? `Lokasi: ${gpsCoords?.latitude}, ${gpsCoords?.longitude}` :
                 gpsStatus === 'loading' ? 'Mendapatkan lokasi...' :
                 gpsStatus === 'error' ? gpsError :
                 'Menunggu lokasi...'}
              </span>
              {gpsStatus !== 'acquired' && gpsStatus !== 'loading' && (
                <button onClick={getLocation} className="text-annajah-600 hover:underline ml-1">Dapatkan Lokasi</button>
              )}
            </div>

            {/* Absen buttons */}
            <div className="flex gap-3">
              {!todayStatus?.sudah_absen ? (
                <button
                  onClick={handleAbsenMasukClick}
                  disabled={submitting}
                  className="btn-primary flex items-center gap-2 px-6 py-3 text-base"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <LogIn className="w-5 h-5" />
                  )}
                  {submitting ? 'Memproses...' : 'Absen Masuk'}
                </button>
              ) : !todayStatus?.sudah_keluar ? (
                <button
                  onClick={handleAbsenKeluarClick}
                  disabled={submitting}
                  className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2 px-6 py-3 rounded-xl text-base font-medium transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <LogOut className="w-5 h-5" />
                  )}
                  {submitting ? 'Memproses...' : 'Absen Keluar'}
                </button>
              ) : (
                <div className="text-center sm:text-right">
                  <span className="inline-flex items-center gap-1.5 text-green-600 text-sm font-medium">
                    <CheckCircle className="w-5 h-5" /> Hari ini sudah lengkap
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <CameraModal
          mode={cameraMode}
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* History */}
      <div className="flex items-center gap-2">
        <History className="w-5 h-5 text-gray-500" />
        <h2 className="text-lg font-semibold text-gray-700">Riwayat Kehadiran</h2>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <div className="col-span-2">Tanggal</div>
          <div className="col-span-2">Jam Masuk</div>
          <div className="col-span-2">Jam Keluar</div>
          <div className="col-span-3">Lokasi</div>
          <div className="col-span-3">Foto</div>
        </div>

        {loadingHistory ? (
          <div className="divide-y divide-gray-50">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 px-5 py-4 animate-pulse">
                <div className="col-span-2 h-4 bg-gray-200 rounded" />
                <div className="col-span-2 h-4 bg-gray-200 rounded" />
                <div className="col-span-2 h-4 bg-gray-200 rounded" />
                <div className="col-span-3 h-4 bg-gray-200 rounded" />
                <div className="col-span-3 h-4 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <History className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm text-gray-500">Belum ada riwayat kehadiran</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {history.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 px-5 py-3.5 hover:bg-annajah-50/40 transition-all duration-150 items-center">
                <div className="col-span-12 sm:col-span-2">
                  <span className="text-sm font-medium text-gray-700">{formatTanggal(item.tanggal)}</span>
                </div>
                <div className="col-span-12 sm:col-span-2">
                  {item.jam_masuk ? (
                    <span className="text-sm font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {formatJam(item.jam_masuk)}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </div>
                <div className="col-span-12 sm:col-span-2">
                  {item.jam_keluar ? (
                    <span className="text-sm font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {formatJam(item.jam_keluar)}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </div>
                <div className="col-span-12 sm:col-span-3">
                  <div className="flex flex-col gap-0.5">
                    {(() => {
                      const gpsMasuk = parseGpsData(item.gps_masuk)
                      const gpsKeluar = parseGpsData(item.gps_keluar)
                      return (
                        <>
                          {gpsMasuk && (
                            <span className="text-[10px] text-gray-500" title={gpsMasuk.lat ? `(${gpsMasuk.lat}, ${gpsMasuk.lng})` : ''}>
                              <MapPin className="w-3 h-3 inline" /> Masuk: {gpsMasuk.display}
                            </span>
                          )}
                          {gpsKeluar && (
                            <span className="text-[10px] text-gray-500" title={gpsKeluar.lat ? `(${gpsKeluar.lat}, ${gpsKeluar.lng})` : ''}>
                              <MapPin className="w-3 h-3 inline" /> Keluar: {gpsKeluar.display}
                            </span>
                          )}
                          {!gpsMasuk && !gpsKeluar && <span className="text-[10px] text-gray-400">-</span>}
                        </>
                      )
                    })()}
                  </div>
                </div>
                <div className="col-span-12 sm:col-span-3">
                  <div className="flex items-center gap-2">
                    {item.foto_masuk ? (
                      <div className="group relative" title="Foto Masuk">
                        <img
                          src={`${FOTO_BASE_URL}${item.foto_masuk}`}
                          alt="Foto masuk"
                          className="w-9 h-9 rounded-lg object-cover border border-green-200 cursor-pointer"
                          onClick={() => window.open(`${FOTO_BASE_URL}${item.foto_masuk}`, '_blank')}
                        />
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full flex items-center justify-center">
                          <LogIn className="w-2 h-2 text-white" />
                        </span>
                      </div>
                    ) : null}
                    {item.foto_keluar ? (
                      <div className="group relative" title="Foto Keluar">
                        <img
                          src={`${FOTO_BASE_URL}${item.foto_keluar}`}
                          alt="Foto keluar"
                          className="w-9 h-9 rounded-lg object-cover border border-amber-200 cursor-pointer"
                          onClick={() => window.open(`${FOTO_BASE_URL}${item.foto_keluar}`, '_blank')}
                        />
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center">
                          <LogOut className="w-2 h-2 text-white" />
                        </span>
                      </div>
                    ) : null}
                    {!item.foto_masuk && !item.foto_keluar && (
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <CameraOff className="w-3 h-3" /> Tanpa foto
                      </span>
                    )}
                  </div>
                </div>

                {/* Mobile detail */}
                <div className="col-span-12 sm:hidden -mt-1 flex flex-wrap gap-2 text-xs text-gray-400">
                  {(() => {
                    const gpsMasuk = parseGpsData(item.gps_masuk)
                    const gpsKeluar = parseGpsData(item.gps_keluar)
                    return (
                      <>
                        {gpsMasuk && <span><MapPin className="w-3 h-3 inline" /> Masuk: {gpsMasuk.display}</span>}
                        {gpsKeluar && <span><MapPin className="w-3 h-3 inline" /> Keluar: {gpsKeluar.display}</span>}
                      </>
                    )
                  })()}
                  {item.foto_masuk && <span className="text-green-500"><Camera className="w-3 h-3 inline" /> Foto masuk</span>}
                  {item.foto_keluar && <span className="text-amber-500"><Camera className="w-3 h-3 inline" /> Foto keluar</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-400">Halaman {page} dari {totalPages} ({total} data)</p>
            <div className="flex items-center gap-2">
              <button onClick={() => loadHistory(page - 1)} disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                return p > totalPages ? null : (
                  <button key={p} onClick={() => loadHistory(p)}
                    className={`w-7 h-7 text-xs font-medium rounded-lg transition-all ${p === page ? 'bg-annajah-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>
                    {p}
                  </button>
                )
              })}
              <button onClick={() => loadHistory(page + 1)} disabled={page >= totalPages}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
