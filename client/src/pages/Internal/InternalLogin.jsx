import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  School, Eye, EyeOff, LogIn, RefreshCw, HelpCircle, Smartphone, ShieldCheck,
} from 'lucide-react'
import { getLogoPublic, getInternalCaptcha } from '../../api'
import toast from 'react-hot-toast'

/**
 * Halaman login Panel /Internal — versi mobile untuk karyawan.
 * Diawali dengan verifikasi captcha, sama seperti login utama.
 */
export default function InternalLogin() {
  const { loginInternal } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [logoUrl, setLogoUrl] = useState(null)
  const [logoError, setLogoError] = useState(false)
  const [captcha, setCaptcha] = useState(null)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [captchaLoading, setCaptchaLoading] = useState(false)

  useEffect(() => {
    loadLogo()
    fetchCaptcha()
  }, [])

  const loadLogo = async () => {
    try {
      const res = await getLogoPublic()
      if (res.data?.logo) setLogoUrl(res.data.logo)
    } catch {
      // Fallback ke icon default
    }
  }

  const fetchCaptcha = async () => {
    setCaptchaLoading(true)
    setCaptchaAnswer('')
    try {
      const res = await getInternalCaptcha()
      setCaptcha(res.data)
    } catch {
      toast.error('Gagal memuat captcha')
    } finally {
      setCaptchaLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username || !password) {
      toast.error('Username dan password harus diisi')
      return
    }
    if (!captchaAnswer.trim()) {
      toast.error('Harap isi jawaban captcha')
      return
    }
    setLoading(true)
    try {
      await loginInternal(username, password, {
        token: captcha?.token,
        answer: captchaAnswer,
      })
      toast.success('Login berhasil!')
    } catch (error) {
      const data = error.response?.data || {}
      toast.error(data.message || 'Username atau password salah')
      fetchCaptcha()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-annajah-700 to-emerald-500 flex flex-col relative overflow-hidden">
      {/* Dekorasi latar */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-24 w-72 h-72 bg-white opacity-5 rounded-full" />
        <div className="absolute -bottom-32 -left-24 w-80 h-80 bg-white opacity-5 rounded-full" />
        <div className="absolute top-1/3 left-1/4 w-3 h-3 bg-white opacity-20 rounded-full" />
      </div>

      <div className="flex-1 flex flex-col justify-center px-5 py-8 relative z-10 w-full max-w-md mx-auto">
        {/* Logo & Judul */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-xl mb-4 overflow-hidden">
            {logoUrl && !logoError ? (
              <img
                src={logoUrl}
                alt="Logo Sekolah"
                className="w-full h-full object-contain p-2"
                onError={() => setLogoError(true)}
              />
            ) : (
              <School className="w-10 h-10 text-annajah-600" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-white">Panel Internal</h1>
          <p className="text-annajah-100/90 text-sm mt-1 flex items-center justify-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5" />
            Aplikasi Mobile Karyawan
          </p>
        </div>

        {/* Kartu Login */}
        <div className="bg-white rounded-3xl shadow-2xl p-6">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-annajah-500 to-annajah-700 flex items-center justify-center shadow-md shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-800">Masuk Karyawan</h2>
              <p className="text-xs text-gray-400">Gunakan akun karyawan Anda</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                placeholder="Masukkan username"
                autoComplete="username"
                autoCapitalize="none"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-11"
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Tampilkan password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Captcha */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-600">
                <span className="inline-flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Verifikasi Keamanan
                </span>
              </label>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-200">
                <div className="flex-1 min-w-0">
                  {captchaLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                      Memuat captcha...
                    </div>
                  ) : captcha ? (
                    <span className="text-base font-bold tracking-widest text-gray-700 bg-white px-3 py-1 rounded-lg border border-gray-200 select-none">
                      {captcha.question} = ?
                    </span>
                  ) : (
                    <span className="text-sm text-red-500">Gagal memuat captcha</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={fetchCaptcha}
                  disabled={captchaLoading}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all flex-shrink-0"
                  aria-label="Muat ulang captcha"
                >
                  <RefreshCw className={`w-4 h-4 ${captchaLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <input
                type="text"
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                className="input-field text-center font-bold tracking-wider"
                placeholder="Masukkan jawaban"
                autoComplete="off"
                inputMode="numeric"
                pattern="[0-9]*"
              />
            </div>

            <button
              type="submit"
              disabled={loading || captchaLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-annajah-600 to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl active:scale-[0.99] transition-all disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Masuk
                </>
              )}
            </button>
          </form>

          <p className="mt-5 text-xs text-gray-400 text-center">
            Menu yang tersedia menyesuaikan hak akses akun Anda.
          </p>
        </div>

        <p className="text-center text-[11px] text-white/60 mt-6">
          SMA Annajah · Sistem Administrasi Sekolah
        </p>
      </div>
    </div>
  )
}
