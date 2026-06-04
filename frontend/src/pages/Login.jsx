import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { School, Eye, EyeOff, LogIn, ShieldCheck, Wallet, GraduationCap, RefreshCw, HelpCircle } from 'lucide-react'
import { getLogoPublic, getCaptcha } from '../api'
import toast from 'react-hot-toast'

const ROLE_OPTIONS = [
  {
    id: 'admin',
    label: 'Admin',
    icon: ShieldCheck,
    color: 'from-annajah-500 to-annajah-600',
    bg: 'bg-annajah-50',
    border: 'border-annajah-200',
    textColor: 'text-annajah-600',
    description: 'Manajemen penuh sistem',
    // Tidak menyertakan kredensial demo di bundle JS — keamanan
  },
  {
    id: 'bendahara',
    label: 'Keuangan',
    icon: Wallet,
    color: 'from-emerald-500 to-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    textColor: 'text-emerald-600',
    description: 'Manajemen pembayaran & laporan',
  },
  {
    id: 'guru',
    label: 'Karyawan',
    icon: GraduationCap,
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    textColor: 'text-blue-600',
    description: 'Data siswa kelas wali',
  },
]

export default function Login() {
  const { login } = useAuth()
  const [selectedRole, setSelectedRole] = useState('admin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [logoUrl, setLogoUrl] = useState(null)
  const [logoError, setLogoError] = useState(false)
  const [captcha, setCaptcha] = useState(null) // { token, question }
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [captchaLoading, setCaptchaLoading] = useState(false)

  useEffect(() => {
    loadLogo()
    fetchCaptcha()
  }, [])

  useEffect(() => {
    // Kosongkan field saat berganti role — tidak auto-fill demi keamanan
    setUsername('')
    setPassword('')
  }, [selectedRole])

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
      const status = error.response?.status
      const data = error.response?.data || {}
      const msg = data.message || 'Username atau password salah'
      
      if (data.captchaError) {
        toast.error(msg)
      } else if (status === 429) {
        toast.error(msg)
      } else {
        toast.error(msg)
      }
      // Refresh captcha setiap gagal login
      fetchCaptcha()
    } finally {
      setLoading(false)
    }
  }

  const currentRole = ROLE_OPTIONS.find(r => r.id === selectedRole)

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
          {/* Role Selection */}
          <div className="flex gap-2 mb-6">
            {ROLE_OPTIONS.map((role) => {
              const Icon = role.icon
              const isActive = selectedRole === role.id
              return (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`
                    flex-1 flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium
                    transition-all duration-200 border-2
                    ${isActive
                      ? `${role.bg} ${role.border} ${role.textColor} shadow-sm scale-105`
                      : 'border-transparent text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                    }
                  `}
                >
                  <div className={`
                    w-9 h-9 rounded-full flex items-center justify-center
                    transition-all duration-200
                    ${isActive
                      ? `bg-gradient-to-br ${role.color} text-white shadow-md`
                      : 'bg-gray-100 text-gray-400'
                    }
                  `}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-semibold">{role.label}</span>
                </button>
              )
            })}
          </div>

          <h2 className="text-lg font-semibold text-gray-800 mb-6 text-center">
            Masuk sebagai {currentRole?.label}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                placeholder={selectedRole === 'guru' ? 'Masukkan username karyawan' : 'Masukkan username'}
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
              className={`btn-primary w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r ${currentRole?.color}`}
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

          {/* Account Info */}
          <div className={`mt-6 p-4 rounded-xl ${currentRole?.bg || 'bg-gray-50'}`}>
            <p className="text-xs font-medium text-gray-500 mb-1">
              {selectedRole === 'admin' ? 'Akun Admin:' :
               selectedRole === 'bendahara' ? 'Akun Bendahara:' :
               'Akun Karyawan:'}
            </p>
            {selectedRole === 'guru' ? (
              <p className="text-xs text-gray-400">
                Gunakan username dan password yang diberikan oleh administrator sekolah.
              </p>
            ) : (
              <p className="text-xs text-gray-400">
                Masukkan username dan password yang diberikan oleh administrator sekolah.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
