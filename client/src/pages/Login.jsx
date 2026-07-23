import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { School, Eye, EyeOff, LogIn, RefreshCw, HelpCircle, Shield } from 'lucide-react'
import { getLogoPublic, getCaptcha } from '../api'
import toast from 'react-hot-toast'

export default function Login() {
  const { login } = useAuth()
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
      if (res.data?.logo) {
        setLogoUrl(res.data.logo)
      }
    } catch {
      // Fallback ke icon default
    }
  }

  const fetchCaptcha = async () => {
    setCaptchaLoading(true)
    setCaptchaAnswer('')
    try {
      const res = await getCaptcha()
      setCaptcha(res.data)
    } catch {
      console.error('Gagal memuat captcha')
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
    if (password.length < 6) {
      toast.error('Password minimal 6 karakter')
      return
    }
    if (!captchaAnswer.trim()) {
      toast.error('Harap isi jawaban captcha')
      return
    }
    setLoading(true)
    try {
      await login(username, password, {
        token: captcha?.token,
        answer: captchaAnswer
      })
      toast.success('Login berhasil!')
    } catch (error) {
      const data = error.response?.data || {}
      const msg = data.message || 'Username atau password salah'
      toast.error(msg)
      fetchCaptcha()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-annajah-900 via-annajah-700 to-annajah-500 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white opacity-5 rounded-full"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white opacity-5 rounded-full"></div>
        <div className="absolute top-1/2 left-1/4 w-4 h-4 bg-white opacity-10 rounded-full"></div>
        <div className="absolute top-1/3 right-1/3 w-6 h-6 bg-white opacity-10 rounded-full"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-xl mb-6 overflow-hidden">
            {logoUrl && !logoError ? (
              <img
                src={logoUrl}
                alt="Logo SMA Annajah"
                className="w-full h-full object-contain p-2"
                onError={() => setLogoError(true)}
              />
            ) : (
              <School className="w-10 h-10 text-annajah-600" />
            )}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">SMA Annajah</h1>
          <p className="text-annajah-200 text-sm">Sistem Administrasi Sekolah</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-annajah-500 to-annajah-600 flex items-center justify-center shadow-md">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-800">Masuk ke Aplikasi</h2>
              <p className="text-xs text-gray-400">Gunakan akun yang telah diberikan administrator</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                placeholder="Masukkan username"
                autoFocus
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Captcha */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                <span className="inline-flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Verifikasi Keamanan
                </span>
              </label>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                <div className="flex-1 min-w-0">
                  {captchaLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                      Memuat captcha...
                    </div>
                  ) : captcha ? (
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold tracking-widest text-gray-700 bg-white px-3 py-1 rounded-lg border border-gray-200 select-none">
                        {captcha.question} = ?
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-red-500">Gagal memuat captcha</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={fetchCaptcha}
                  disabled={captchaLoading}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all flex-shrink-0"
                  title="Muat ulang captcha"
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
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-annajah-500 to-annajah-600"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Masuk
                </>
              )}
            </button>
          </form>

          <div className="mt-6 p-3 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              Sistem akan menyesuaikan menu yang tersedia berdasarkan role dan hak akses akun Anda.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
