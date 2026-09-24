import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LogOut, School, CheckCircle2, Clock3, CalendarDays, ChevronRight, Loader2,
} from 'lucide-react'
import { getPengaturan, getRolePermissionsByRole, getStatusKehadiranGuru } from '../../api'
import { internalMenus, filterMenusByPermission } from './menuConfig'

function todayLabel() {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function MenuTile({ menu, onClick }) {
  const Icon = menu.icon
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md active:scale-[0.97] transition-all duration-200"
    >
      <span
        className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${menu.gradient} flex items-center justify-center shadow-lg ${menu.glow} group-hover:scale-105 transition-transform duration-200`}
      >
        <Icon className="w-7 h-7 text-white" strokeWidth={2} />
      </span>
      <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">
        {menu.label}
      </span>
    </button>
  )
}

export default function InternalHome() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [logoUrl, setLogoUrl] = useState(null)
  const [permissions, setPermissions] = useState(null)
  const [loadingPerms, setLoadingPerms] = useState(true)
  const [absenStatus, setAbsenStatus] = useState(null)
  const [loadingAbsen, setLoadingAbsen] = useState(false)

  useEffect(() => {
    getPengaturan()
      .then((res) => { if (res.data?.logo) setLogoUrl(res.data.logo) })
      .catch(() => {})
  }, [])

  // Hak akses menu mengikuti role (tabel role_permissions)
  useEffect(() => {
    if (!user?.role) return
    let cancelled = false
    setLoadingPerms(true)
    getRolePermissionsByRole(user.role)
      .then((res) => { if (!cancelled) setPermissions(res.data) })
      .catch(() => { if (!cancelled) setPermissions(null) })
      .finally(() => { if (!cancelled) setLoadingPerms(false) })
    return () => { cancelled = true }
  }, [user?.role])

  // Status absen hari ini (hanya untuk akun yang terhubung ke data karyawan)
  useEffect(() => {
    if (!user?.guru_id) return
    let cancelled = false
    setLoadingAbsen(true)
    getStatusKehadiranGuru()
      .then((res) => { if (!cancelled) setAbsenStatus(res.data) })
      .catch(() => { if (!cancelled) setAbsenStatus(null) })
      .finally(() => { if (!cancelled) setLoadingAbsen(false) })
    return () => { cancelled = true }
  }, [user?.guru_id])

  const menus = filterMenusByPermission(internalMenus, permissions)

  const initials = user?.nama
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  const fotoUrl = user?.foto ? `/uploads/guru/${user.foto}` : null

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-annajah-700 via-annajah-600 to-emerald-500 rounded-b-[28px] shadow-lg">
        <div className="max-w-md mx-auto px-5 pt-6 pb-14">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0 shadow-md">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <School className="w-5 h-5 text-annajah-600" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm leading-tight truncate">Panel Internal</p>
                <p className="text-white/70 text-[10px]">SMA Annajah</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-medium backdrop-blur transition-all active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar
            </button>
          </div>

          {/* Sapaan */}
          <div className="flex items-center gap-3 mt-6">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/20 border-2 border-white/30 flex items-center justify-center shrink-0 backdrop-blur">
              {fotoUrl ? (
                <img src={fotoUrl} alt={user?.nama} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-lg font-bold">{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-white/70 text-xs">Selamat datang,</p>
              <h1 className="text-white text-lg font-bold truncate leading-tight">{user?.nama}</h1>
              <p className="text-white/70 text-[11px] capitalize truncate">
                {user?.jenis_karyawan || user?.role || 'Karyawan'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Konten ── */}
      <div className="max-w-md mx-auto px-4 -mt-9 space-y-5">
        {/* Kartu Status Absen */}
        {user?.guru_id && (
          <button
            onClick={() => navigate('/internal/absen')}
            className="w-full bg-white rounded-2xl shadow-md border border-gray-100 p-4 flex items-center gap-3 text-left active:scale-[0.99] transition-all"
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                absenStatus?.sudah_absen ? 'bg-emerald-50' : 'bg-amber-50'
              }`}
            >
              {loadingAbsen ? (
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              ) : absenStatus?.sudah_absen ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <Clock3 className="w-5 h-5 text-amber-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">
                {loadingAbsen
                  ? 'Memeriksa status absen...'
                  : absenStatus?.sudah_absen
                    ? 'Sudah absen hari ini'
                    : 'Belum absen hari ini'}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {absenStatus?.sudah_absen
                  ? `Masuk ${absenStatus.data?.jam_masuk || '-'} · Keluar ${absenStatus.data?.jam_keluar || '-'}`
                  : 'Ketuk untuk absen masuk sekarang'}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
          </button>
        )}

        {/* Menu Icon Grid */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-semibold text-gray-700">Menu Panel</h2>
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {todayLabel()}
            </span>
          </div>

          {loadingPerms ? (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-3 animate-pulse">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 mx-auto" />
                  <div className="h-2.5 bg-gray-100 rounded mt-2 w-3/4 mx-auto" />
                </div>
              ))}
            </div>
          ) : menus.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <p className="text-sm text-gray-500">Belum ada menu yang tersedia</p>
              <p className="text-xs text-gray-400 mt-1">
                Hubungi administrator untuk pengaturan hak akses.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {menus.map((menu) => (
                <MenuTile
                  key={menu.key}
                  menu={menu}
                  onClick={() => navigate(`/internal/${menu.key}`)}
                />
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-gray-400 pt-2">
          SMA Annajah · Panel Internal Karyawan
        </p>
      </div>
    </div>
  )
}
