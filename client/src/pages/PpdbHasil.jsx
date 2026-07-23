import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { School, ArrowLeft, SearchCheck, Loader2, CheckCircle, XCircle, Clock, GraduationCap, AlertCircle, User, Printer } from 'lucide-react'
import { getLogoPublic, cekPpdb, cetakPpdbPdf } from '../api'
import toast from 'react-hot-toast'

export default function PpdbHasil() {
  const [logoUrl, setLogoUrl] = useState(null)
  const [logoError, setLogoError] = useState(false)
  const [noPendaftaran, setNoPendaftaran] = useState('')
  const [kodeRahasia, setKodeRahasia] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadLogo()
  }, [])

  const loadLogo = async () => {
    try {
      const res = await getLogoPublic()
      if (res.data?.logo) setLogoUrl(res.data.logo)
    } catch { /* fallback */ }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!noPendaftaran.trim()) {
      toast.error('Masukkan nomor pendaftaran')
      return
    }

    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const res = await cekPpdb(noPendaftaran.trim(), kodeRahasia.trim())
      setResult(res.data)
    } catch (error) {
      if (error.response?.status === 404) {
        setError('Nomor pendaftaran tidak ditemukan. Periksa kembali nomor Anda.')
      } else {
        setError(error.response?.data?.message || 'Gagal memeriksa data')
      }
    } finally {
      setLoading(false)
    }
  }

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'diterima':
        return {
          icon: CheckCircle,
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-600',
          label: 'Selamat! Anda Diterima',
          desc: 'Anda telah diterima sebagai peserta didik baru. Silakan menghubungi sekolah untuk informasi lebih lanjut.',
          color: 'from-emerald-500 to-emerald-600',
        }
      case 'ditolak':
        return {
          icon: XCircle,
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-600',
          label: 'Mohon Maaf',
          desc: 'Anda belum diterima pada seleksi kali ini. Tetap semangat dan coba lagi di kesempatan berikutnya.',
          color: 'from-red-500 to-red-600',
        }
      default:
        return {
          icon: Clock,
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-600',
          label: 'Menunggu Verifikasi',
          desc: 'Pendaftaran Anda sedang dalam proses verifikasi oleh pihak sekolah. Silakan cek kembali secara berkala.',
          color: 'from-amber-500 to-amber-600',
        }
    }
  }

  const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-annajah-500/20 focus:border-annajah-500 outline-none transition-all duration-200 bg-white"

  return (
    <div className="min-h-screen bg-gradient-to-br from-annajah-900 via-annajah-700 to-annajah-500 flex flex-col relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white opacity-5 rounded-full"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white opacity-5 rounded-full"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 px-4 py-4">
        <Link to="/ppdb" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Link>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 pb-12 relative z-10">
        <div className="w-full max-w-lg">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-xl mb-4 overflow-hidden">
              {logoUrl && !logoError ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1.5"
                  onError={() => setLogoError(true)} />
              ) : (
                <GraduationCap className="w-8 h-8 text-annajah-600" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-white">Cek Hasil Pendaftaran</h1>
            <p className="text-annajah-200 text-sm">Masukkan nomor pendaftaran untuk melihat hasil</p>
          </div>

          {/* Search Form */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Nomor Pendaftaran</label>
                <input
                  type="text"
                  value={noPendaftaran}
                  onChange={(e) => setNoPendaftaran(e.target.value.toUpperCase())}
                  className={inputClass}
                  placeholder="Contoh: PPDB2026000001"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Kode Rahasia</label>
                <input
                  type="text"
                  value={kodeRahasia}
                  onChange={(e) => setKodeRahasia(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={inputClass}
                  placeholder="6 digit kode rahasia"
                  inputMode="numeric"
                  maxLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-annajah-500 to-annajah-600 text-white font-medium py-3 px-6 rounded-xl hover:from-annajah-600 hover:to-annajah-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <SearchCheck className="w-5 h-5" />
                )}
                {loading ? 'Memeriksa...' : 'Cek Hasil'}
              </button>
            </form>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center animate-fade-in">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-red-600 font-medium text-sm">{error}</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="animate-fade-in space-y-4">
              {/* Status Banner */}
              {(() => {
                const display = getStatusDisplay(result.status)
                const Icon = display.icon
                return (
                  <div className={`${display.bg} ${display.border} border rounded-2xl p-6 text-center`}>
                    <div className={`w-16 h-16 bg-gradient-to-br ${display.color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h2 className={`text-xl font-bold ${display.text} mb-2`}>{display.label}</h2>
                    <p className="text-sm text-gray-500">{display.desc}</p>
                    {result.keterangan && (
                      <div className="mt-3 bg-white/60 rounded-xl px-4 py-3 text-sm text-gray-600 border border-gray-100">
                        <span className="font-medium">Catatan:</span> {result.keterangan}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Detail */}
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-annajah-500" />
                  Data Pendaftar
                </h3>

                {/* Foto */}
                {result.foto && (
                  <div className="flex justify-center mb-4">
                    <div className="w-24 h-28 rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm">
                      <img
                        src={`/api/ppdb/foto/${result.foto}`}
                        alt="Foto"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-500">No. Pendaftaran</span>
                    <span className="text-sm font-medium text-gray-800 font-mono">{result.no_pendaftaran}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-500">NISN</span>
                    <span className="text-sm font-medium text-gray-800">{result.nisn}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-500">Nama Lengkap</span>
                    <span className="text-sm font-medium text-gray-800">{result.nama_lengkap}</span>
                  </div>
                  {result.tempat_lahir && (
                    <div className="flex justify-between py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-500">Tempat Lahir</span>
                      <span className="text-sm font-medium text-gray-800">{result.tempat_lahir}</span>
                    </div>
                  )}
                  {result.jenis_kelamin !== '-' && (
                    <div className="flex justify-between py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-500">Jenis Kelamin</span>
                      <span className="text-sm font-medium text-gray-800">{result.jenis_kelamin}</span>
                    </div>
                  )}
                  {result.asal_sekolah && (
                    <div className="flex justify-between py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-500">Asal Sekolah</span>
                      <span className="text-sm font-medium text-gray-800">{result.asal_sekolah}</span>
                    </div>
                  )}

                </div>
              </div>

              {/* Cetak PDF */}
              <button
                onClick={async () => {
                  try {
                    const res = await cetakPpdbPdf(result.no_pendaftaran)
                    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `ppdb_${result.no_pendaftaran}.pdf`
                    a.click()
                    window.URL.revokeObjectURL(url)
                    toast.success('PDF berhasil diunduh')
                  } catch (error) {
                    toast.error('Gagal mengunduh PDF')
                  }
                }}
                className="w-full bg-white text-annajah-700 font-medium py-2.5 px-6 rounded-xl border border-annajah-200 hover:bg-annajah-50 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm mt-4"
              >
                <Printer className="w-4 h-4" />
                Cetak PDF Hasil Pendaftaran
              </button>

              {/* Action */}
              <div className="text-center">
                <Link
                  to="/ppdb"
                  className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
