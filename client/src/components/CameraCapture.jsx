import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Camera, CameraOff, CheckCircle, XCircle, Loader2, RefreshCw,
  ShieldCheck, AlertTriangle, Image as ImageIcon, User,
} from 'lucide-react'
import {
  getFaceDescriptor, getProfileDescriptor, faceDistance, similarityPercent,
  MATCH_THRESHOLD, loadImage, preloadFaceModels, loadFaceModels, isFaceModelReady,
} from '../utils/faceMatch'

// Batas waktu memuat model wajah (unduhan ±7MB) — bila koneksi tersendat,
// pengguna diberi pesan error alih-alih berputar tanpa batas
const MODEL_LOAD_TIMEOUT_MS = 30000
// Batas waktu deteksi & perbandingan wajah — foto identitas ikut diunduh saat
// verifikasi, jadi koneksi yang menggantung harus berakhir dengan pesan jelas
const VERIFY_TIMEOUT_MS = 20000

const rejectAfter = (ms) =>
  new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))

/**
 * Modal kamera yang dipakai bersama oleh halaman Profil Saya dan Absen Kehadiran.
 *
 * - `verifyFace` — bila true, foto hasil jepretan wajib cocok dengan foto
 *   identitas (`referenceFotoUrl`, yaitu foto profil karyawan). Foto hanya bisa
 *   dipakai jika verifikasi berhasil.
 * - `onCapture(base64, meta)` — dipanggil dengan foto (base64 JPEG) dan meta
 *   verifikasi `{ distance, similarity, verified, reusedIdentity }`.
 *   base64 = null bila pengguna memilih melewati foto.
 */
export default function CameraCapture({
  title = 'Ambil Foto',
  subtitle = null,
  referenceFotoUrl = null,
  verifyFace = false,
  allowSkip = true,
  onCapture,
  onClose,
}) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [cameraError, setCameraError] = useState('')
  const [capturedImage, setCapturedImage] = useState(null)
  const [verifyStatus, setVerifyStatus] = useState('idle') // idle | loadingmodel | checking | match | mismatch | noface | noreference | loaderror
  const [distance, setDistance] = useState(null)
  const [usingIdentity, setUsingIdentity] = useState(false)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const startCamera = useCallback(async () => {
    try {
      setLoading(true)
      setCameraError('')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      let msg = 'Tidak dapat mengakses kamera'
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Izin kamera ditolak. Izinkan akses kamera di browser.'
      } else if (err.name === 'NotFoundError') {
        msg = 'Kamera tidak ditemukan di perangkat ini.'
      } else if (err.name === 'NotReadableError') {
        msg = 'Kamera sedang dipakai aplikasi lain.'
      }
      setCameraError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    startCamera()
    // Unduh model wajah lebih awal supaya verifikasi tidak lama saat foto diambil
    if (verifyFace) preloadFaceModels()
    return () => stopCamera()
  }, [startCamera, stopCamera, verifyFace])

  // Pasang (ulang) stream ke elemen video — elemen ini dirender ulang setelah "Ambil Ulang"
  useEffect(() => {
    if (!capturedImage && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [capturedImage, cameraError])

  // Bandingkan wajah hasil jepretan dengan foto identitas
  const verifyCaptured = async (base64) => {
    if (!referenceFotoUrl) {
      setVerifyStatus('noreference')
      return
    }
    setDistance(null)
    setVerifyStatus(isFaceModelReady() ? 'checking' : 'loadingmodel')

    // Pastikan model wajah siap. Bila belum, tampilkan status pengunduhan;
    // dibatasi waktu supaya koneksi tersendat tidak bikin spinner abadi
    try {
      await Promise.race([loadFaceModels(), rejectAfter(MODEL_LOAD_TIMEOUT_MS)])
    } catch (err) {
      console.error('Model wajah gagal dimuat:', err)
      setVerifyStatus('loaderror')
      return
    }

    setVerifyStatus('checking')
    let capturedDescriptor = null
    try {
      capturedDescriptor = await Promise.race([
        getFaceDescriptor(base64),
        rejectAfter(VERIFY_TIMEOUT_MS),
      ])
    } catch (err) {
      console.error('Deteksi wajah absen gagal:', err)
      setVerifyStatus('loaderror')
      return
    }
    if (!capturedDescriptor) {
      setVerifyStatus('noface')
      return
    }

    let referenceDescriptor = null
    try {
      referenceDescriptor = await Promise.race([
        getProfileDescriptor(referenceFotoUrl),
        rejectAfter(VERIFY_TIMEOUT_MS),
      ])
    } catch (err) {
      console.error('Foto identitas gagal dibaca:', err)
      setVerifyStatus('noreference')
      return
    }
    if (!referenceDescriptor) {
      setVerifyStatus('noreference')
      return
    }

    const d = faceDistance(referenceDescriptor, capturedDescriptor)
    setDistance(d)
    setVerifyStatus(d <= MATCH_THRESHOLD ? 'match' : 'mismatch')
  }

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = canvas.toDataURL('image/jpeg', 0.7)
    setCapturedImage(imageData)
    setUsingIdentity(false)
    // Bebaskan kamera/GPU selama verifikasi berjalan — mencegah konflik
    // konteks WebGL saat inference face-api di perangkat mobile
    stopCamera()
    if (verifyFace) verifyCaptured(imageData)
  }

  const handleRetake = () => {
    setCapturedImage(null)
    setVerifyStatus('idle')
    setDistance(null)
    setUsingIdentity(false)
    startCamera()
  }

  const handleConfirm = () => {
    if (!capturedImage) return
    onCapture(capturedImage, {
      distance,
      similarity: similarityPercent(distance),
      verified: !verifyFace || verifyStatus === 'match',
      reusedIdentity: usingIdentity,
    })
    stopCamera()
  }

  // Jalan terakhir saat kamera bermasalah: pakai foto identitas sebagai foto absen
  const handleUseIdentity = async () => {
    if (!referenceFotoUrl) return
    try {
      setLoading(true)
      const img = await loadImage(referenceFotoUrl)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || 400
      canvas.height = img.naturalHeight || 400
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      const base64 = canvas.toDataURL('image/jpeg', 0.8)
      setCapturedImage(base64)
      setUsingIdentity(true)
      setDistance(0)
      setVerifyStatus(verifyFace ? 'match' : 'idle')
    } catch {
      setCameraError('Gagal memuat foto identitas')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    stopCamera()
    onClose()
  }

  const handleSkip = () => {
    onCapture(null, { distance: null, similarity: null, verified: false, reusedIdentity: false })
    stopCamera()
  }

  const canConfirm = !verifyFace || verifyStatus === 'match'
  const verifyPending = verifyStatus === 'checking' || verifyStatus === 'loadingmodel'
  const similarity = similarityPercent(distance)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-annajah-600" />
            <div>
              <h2 className="text-base font-semibold text-gray-800 leading-tight">{title}</h2>
              {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-all" title="Tutup">
            <XCircle className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Foto identitas sebagai acuan */}
        {referenceFotoUrl && (
          <div className="flex items-center gap-3 px-4 py-3 bg-annajah-50/60 border-b border-annajah-100">
            <img
              src={referenceFotoUrl}
              alt="Foto identitas"
              className="w-11 h-11 rounded-lg object-cover border-2 border-white shadow-sm"
            />
            <div className="text-xs">
              <p className="font-semibold text-annajah-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Foto identitas absensi
              </p>
              <p className="text-gray-500">Posisikan wajah seperti pada foto ini</p>
            </div>
          </div>
        )}

        {/* Kamera / pratinjau */}
        <div className="p-4">
          {cameraError && !capturedImage ? (
            <div className="text-center py-8 space-y-3">
              <CameraOff className="w-14 h-14 text-red-300 mx-auto" />
              <p className="text-sm text-red-600 font-medium">{cameraError}</p>
              <div className="flex flex-wrap gap-2 justify-center pt-1">
                <button onClick={startCamera} className="btn-secondary text-sm flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Coba Lagi
                </button>
                {referenceFotoUrl && verifyFace && (
                  <button onClick={handleUseIdentity} className="btn-primary text-sm flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Pakai Foto Identitas
                  </button>
                )}
              </div>
              {referenceFotoUrl && verifyFace && (
                <p className="text-[11px] text-gray-400">
                  Foto identitas hanya dipakai bila kamera tidak dapat diakses.
                </p>
              )}
            </div>
          ) : !capturedImage ? (
            <div className="relative bg-black rounded-xl overflow-hidden">
              <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-[4/3] object-cover" />
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden">
              <img src={capturedImage} alt="Pratinjau" className="w-full aspect-[4/3] object-cover" />

              {(verifyStatus === 'checking' || verifyStatus === 'loadingmodel') && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 text-white">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-sm text-center px-4">
                    {verifyStatus === 'loadingmodel'
                      ? 'Mengunduh model verifikasi wajah (±7 MB, sekali saja)...'
                      : 'Memverifikasi wajah...'}
                  </p>
                </div>
              )}

              {verifyStatus === 'match' && (
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {usingIdentity ? 'Foto identitas' : `Wajah cocok${similarity !== null ? ` · ${similarity}%` : ''}`}
                </div>
              )}

              {verifyStatus === 'mismatch' && (
                <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
                  <XCircle className="w-3.5 h-3.5" /> Wajah tidak cocok
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status verifikasi */}
        {capturedImage && !['idle', 'checking', 'loadingmodel'].includes(verifyStatus) && (
          <div className="px-4">
            {verifyStatus === 'match' && (
              <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-xs text-green-700 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Wajah cocok dengan foto identitas Anda
                  {similarity !== null && ` (kemiripan ${similarity}%)`}.
                </span>
              </div>
            )}
            {verifyStatus === 'mismatch' && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Wajah tidak sesuai dengan foto identitas. Pastikan pencahayaan cukup, wajah
                  terlihat jelas, dan tidak memakai penutup wajah. Ambil ulang foto.
                </span>
              </div>
            )}
            {verifyStatus === 'noface' && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Wajah tidak terdeteksi pada foto. Dekatkan wajah ke kamera dan ambil ulang.</span>
              </div>
            )}
            {verifyStatus === 'noreference' && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Foto identitas tidak dapat dibaca petugas. Pastikan foto profil diambil ulang
                  dari kamera di menu Profil Saya.
                </span>
              </div>
            )}
            {verifyStatus === 'loaderror' && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Gagal menjalankan verifikasi wajah. Lihat detailnya di Console
                  browser (F12), lalu ambil ulang foto.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Aksi */}
        {(!cameraError || capturedImage) && (
          <div className="flex gap-3 p-4 border-t border-gray-100 mt-4">
            {!capturedImage ? (
              <>
                <button onClick={handleCapture} disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2 py-3">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                  {loading ? 'Menyiapkan kamera...' : 'Ambil Foto'}
                </button>
                {allowSkip && (
                  <button onClick={handleSkip} className="btn-secondary flex-1">Lewati</button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={handleConfirm}
                  disabled={!canConfirm}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-5 h-5" />
                  {canConfirm ? 'Gunakan Foto Ini' : verifyPending ? 'Memverifikasi...' : 'Wajah Tidak Cocok'}
                </button>
                <button onClick={handleRetake} className="btn-secondary flex-1 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Ambil Ulang
                </button>
              </>
            )}
          </div>
        )}

        {!cameraError && verifyFace && !capturedImage && (
          <p className="px-4 pb-4 -mt-2 text-[11px] text-gray-400 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            Foto ini hanya dipakai untuk verifikasi wajah dan tidak disimpan di sistem.
          </p>
        )}
      </div>
    </div>
  )
}
