import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useRef, useEffect } from 'react'
import {
  LayoutDashboard, Users, GraduationCap, CreditCard,
  ArrowLeftRight, FileText, LogOut, School, ChevronRight,
  X, Settings, Shield, Database as DatabaseIcon, ClipboardList,
  User, DoorOpen, Mail, CheckSquare,  Clock, History, CalendarDays,
  Medal, BarChart3, HeartHandshake, Trophy, Award, Palette, BookOpen, ClipboardCheck, Calendar
} from 'lucide-react'
import { getPengaturan } from '../api'

// ─── Menu Structure with Groups ───
const menuGroups = [
  {
    label: 'Utama',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, hideForRoles: ['guru'] },
      { path: '/guru-dashboard', label: 'Dashboard', icon: LayoutDashboard, showForRoles: ['guru'] },
      { path: '/profil-saya', label: 'Profil Saya', icon: User, showForRoles: ['guru'] },
      { path: '/daftar-kehadiran-saya', label: 'Daftar Kehadiran Saya', icon: History, showForRoles: ['guru'] },
      { path: '/kehadiran-guru-saya', label: 'Absen Kehadiran', icon: Clock, showForRoles: ['guru'] },
    ],
  },
  {
    label: 'Karyawan',
    guruLabel: 'Data Kesiswaan',
    items: [
      { path: '/siswa-wali', label: 'Daftar Siswa', icon: ClipboardList, showForRoles: ['guru'] },
      { path: '/kehadiran-wali', label: 'Kehadiran Siswa', icon: ClipboardList, showForRoles: ['guru'] },      {
        path: '/input-kehadiran-wali', label: 'Input Kehadiran Siswa Masal', icon: CheckSquare, showForRoles: ['guru'] },
      { path: '/guru', label: 'Data Karyawan', icon: Users, hideForRoles: ['guru'] },
      { path: '/kehadiran-guru', label: 'Kehadiran Karyawan', icon: Clock, hideForRoles: ['guru'] },
      { path: '/rekap-kehadiran-guru', label: 'Rekap Kehadiran Karyawan', icon: CalendarDays, hideForRoles: ['guru'] },
    ],
    subGroups: [
      {
        label: 'Kesiswaan',
        items: [
          { path: '/siswa', label: 'Data Siswa', icon: Users, hideForRoles: ['guru'] },
          { path: '/alumni', label: 'Alumni', icon: GraduationCap, hideForRoles: ['guru'] },
          { path: '/kelas', label: 'Kelas', icon: GraduationCap, hideForRoles: ['guru'] },
          { path: '/kehadiran', label: 'Kehadiran Siswa', icon: ClipboardList, hideForRoles: ['guru'] },
          { path: '/kehadiran/bulk', label: 'Input Kehadiran Masal', icon: CheckSquare, hideForRoles: ['guru'] },
        ],
      },
      {
        label: 'Ekstrakurikuler',
        items: [
          { path: '/ekstrakurikuler/peserta', label: 'Peserta Ekstrakurikuler', icon: Medal, showForRoles: ['guru'] },
          { path: '/ekstrakurikuler/input-peserta', label: 'Input Peserta', icon: User, showForRoles: ['guru'] },
          { path: '/ekstrakurikuler/rekap', label: 'Rekap Peserta', icon: BarChart3, showForRoles: ['guru'] },
        ],
      },
      {
        label: 'Bimbingan Konseling',
        items: [
          { path: '/bimbingan-konseling', label: 'Daftar BK', icon: HeartHandshake },
          { path: '/bimbingan-konseling/input', label: 'Input BK', icon: User },
          { path: '/bimbingan-konseling/rekap', label: 'Rekap BK', icon: BarChart3 },
        ],
      },        { label: 'Nilai Siswa',
        items: [
          { path: '/nilai-siswa', label: 'Daftar Nilai', icon: ClipboardCheck },
          { path: '/nilai-siswa/input', label: 'Input Nilai', icon: User },
          { path: '/nilai-siswa/rekap', label: 'Rekap Nilai', icon: BarChart3 },
          { path: '/periode-penilaian', label: 'Periode Penilaian', icon: CalendarDays },
        ],
      },
      { label: 'Prestasi Siswa',
        items: [
          { path: '/prestasi-siswa', label: 'Daftar Prestasi', icon: Trophy },
          { path: '/prestasi-siswa/input', label: 'Input Prestasi', icon: Award },
          { path: '/prestasi-siswa/rekap', label: 'Rekap Prestasi', icon: BarChart3 },
          { path: '/prestasi-siswa/pengaturan', label: 'Template Piagam', icon: Palette, hideForRoles: ['guru'] },
        ],
      },
    ],
  },
  {
    label: 'Mata Pelajaran',
    items: [
      { path: '/mata-pelajaran', label: 'Mata Pelajaran', icon: BookOpen },
    ],
  },
  {
    label: 'PPDB',
    items: [
      { path: '/ppdb/admin', label: 'Data PPDB', icon: DoorOpen, ppdbAccessRequired: true },
      { path: '/ppdb/pengaturan', label: 'Pengaturan PPDB', icon: Mail, ppdbAccessRequired: true },
    ],
  },
  {
    label: 'Transaksi & Laporan',
    items: [
      { path: '/transaksi', label: 'Transaksi', icon: ArrowLeftRight, hideForRoles: ['guru'] },
      { path: '/laporan', label: 'Laporan', icon: FileText, hideForRoles: ['guru'] },
      { path: '/pembayaran', label: 'Jenis Pembayaran', icon: CreditCard, hideForRoles: ['guru'] },
    ],
  },
  {
    label: 'Ekstrakurikuler',
    items: [
      { path: '/ekstrakurikuler', label: 'Data Ekstrakurikuler', icon: Medal, hideForRoles: ['guru'] },
    ],
    subGroups: [
      {
        label: 'Peserta',
        items: [
          { path: '/ekstrakurikuler/peserta', label: 'Peserta Ekstrakurikuler', icon: Users, hideForRoles: ['guru'] },
          { path: '/ekstrakurikuler/input-peserta', label: 'Input Peserta', icon: User, hideForRoles: ['guru'] },
          { path: '/ekstrakurikuler/rekap', label: 'Rekap Peserta', icon: BarChart3, hideForRoles: ['guru'] },
        ],
      },
    ],
  },
  {
    label: 'Pengaturan',
    items: [
      { path: '/pengaturan', label: 'Pengaturan', icon: Settings, hideForRoles: ['guru'] },
      { path: '/tahun-ajaran', label: 'Tahun Pelajaran', icon: Calendar, hideForRoles: ['guru'] },
      { path: '/users', label: 'Manajemen User', icon: Shield, adminOnly: true },
      { path: '/database', label: 'Backup Database', icon: DatabaseIcon, adminOnly: true },
    ],
  },
]

// ─── Collapsed Tooltip ───
function Tooltip({ label, children, collapsed }) {
  const [show, setShow] = useState(false)
  const timeoutRef = useRef(null)

  if (!collapsed) return children

  return (
    <div
      className="relative group"
      onMouseEnter={() => {
        timeoutRef.current = setTimeout(() => setShow(true), 300)
      }}
      onMouseLeave={() => {
        clearTimeout(timeoutRef.current)
        setShow(false)
      }}
    >
      {children}
      {show && (
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-[60] pointer-events-none">
          <div className="bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap animate-fade-in">
            {label}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Single Nav Item ───
function NavItem({ item, collapsed, isActive, onClick }) {
  const Icon = item.icon
  return (
    <Tooltip label={item.label} collapsed={collapsed}>
      <NavLink
        to={item.path}
        onClick={onClick}
        className={`
          group relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium
          transition-all duration-200 ease-out
          ${isActive
            ? 'bg-gradient-to-r from-annajah-50 to-white text-annajah-700 shadow-sm'
            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100/80'
          }
          ${collapsed ? 'justify-center mx-2 px-0' : ''}
        `}
      >
        {/* Active indicator */}
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-annajah-600 rounded-r-full animate-slide-in" />
        )}

        {/* Icon with active glow */}
        <span className={`
          relative flex items-center justify-center
          transition-transform duration-200
          ${isActive ? 'scale-110' : 'group-hover:scale-105'}
        `}>
          <Icon className={`
            w-5 h-5 transition-all duration-200
            ${isActive ? 'text-annajah-600 drop-shadow-sm' : 'text-gray-400 group-hover:text-gray-600'}
          `} />

        </span>

        {/* Label */}
        {!collapsed && (
          <span className="truncate transition-all duration-200">{item.label}</span>
        )}

        {/* Active dot for collapsed */}
        {collapsed && isActive && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-annajah-500 rounded-full animate-pulse-slow" />
        )}
      </NavLink>
    </Tooltip>
  )
}

// ─── Logout Button ───
function LogoutButton({ collapsed, onLogout }) {
  return (
    <Tooltip label="Keluar" collapsed={collapsed}>
      <button
        onClick={onLogout}
        className={`
          group relative flex items-center gap-3 w-full rounded-xl text-sm font-medium
          transition-all duration-200 ease-out
          text-red-400 hover:text-red-600 hover:bg-red-50
          ${collapsed ? 'justify-center mx-2 px-0' : 'px-4 py-2.5'}
        `}
      >
        <span className="transition-transform duration-200 group-hover:scale-105">
          <LogOut className="w-5 h-5 transition-all duration-200 group-hover:rotate-12" />
        </span>
        {!collapsed && <span className="truncate">Keluar</span>}
      </button>
    </Tooltip>
  )
}

// ─── User Profile ───
function UserProfile({ user, collapsed }) {
  if (!user) return null

  const initials = user.nama
    ?.split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  return (
    <div className={`
      flex items-center gap-3 px-4 py-3
      ${collapsed ? 'justify-center px-0' : ''}
    `}>
      <div className={`
        w-9 h-9 rounded-xl bg-gradient-to-br from-annajah-400 to-annajah-600
        flex items-center justify-center text-white text-sm font-bold
        shadow-md shrink-0
        transition-transform duration-200
      `}>
        {initials}
      </div>
      {!collapsed && (
        <div className="overflow-hidden transition-all duration-200">
          <p className="text-sm font-medium text-gray-700 truncate leading-tight">{user.nama}</p>
          <p className="text-[11px] text-gray-400 capitalize">{user.jenis_karyawan || user.role}</p>
        </div>
      )}
    </div>
  )
}

// ─── Group Label ───
function GroupLabel({ label, collapsed }) {
  return (
    <div className={`
      px-4 py-2 transition-all duration-300 ease-out
      ${collapsed ? 'opacity-0 max-h-0 overflow-hidden py-0' : 'opacity-100'}
    `}>
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
        {label}
      </span>
    </div>
  )
}

// ─── Sub-Menu Label ───
function SubMenuLabel({ label, collapsed }) {
  return (
    <div className={`
      px-4 pt-3 pb-1 transition-all duration-300 ease-out
      ${collapsed ? 'opacity-0 max-h-0 overflow-hidden py-0' : 'opacity-100'}
    `}>
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider ml-1">
        ▸ {label}
      </span>
    </div>
  )
}

// ─── Logo Display ───
function LogoDisplay({ collapsed, logoUrl }) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="flex items-center gap-3">
      {logoUrl && !imgError ? (
        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-md shrink-0 transition-transform duration-300 hover:scale-105">
          <img
            src={logoUrl}
            alt="Logo"
            className="max-w-full max-h-full object-contain p-1"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div className="w-10 h-10 bg-gradient-to-br from-annajah-500 to-annajah-700 rounded-xl flex items-center justify-center shadow-lg shrink-0 transition-transform duration-300 hover:rotate-3">
          <School className="w-5 h-5 text-white" />
        </div>
      )}
      <div className={`
        overflow-hidden transition-all duration-300 ease-in-out
        ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}
      `}>
        <h1 className="font-bold text-gray-800 text-sm leading-tight whitespace-nowrap">SMA Annajah</h1>
        <p className="text-[10px] text-gray-400 whitespace-nowrap">Sistem Administrasi Sekolah</p>
      </div>
    </div>
  )
}

// ─── Sidebar (Main) ───
export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [logoUrl, setLogoUrl] = useState(null)

  useEffect(() => {
    loadLogo()
  }, [location.pathname])

  const loadLogo = async () => {
    try {
      const res = await getPengaturan()
      if (res.data?.logo) {
        setLogoUrl(res.data.logo)
      }
    } catch {
      // Abaikan error — fallback ke icon default
    }
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-gray-100 transition-all duration-300">
        <LogoDisplay collapsed={collapsed} logoUrl={logoUrl} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-1 scrollbar-thin">
        {menuGroups.map((group) => {
          const visibleItems = group.items.filter(item => {
            if (item.adminOnly && user?.role !== 'admin') return false
            if (item.hideForRoles?.includes(user?.role)) return false
            if (item.showForRoles && !item.showForRoles.includes(user?.role)) return false
            if (item.ppdbAccessRequired && user?.role === 'guru' && !user?.ppdb_access) return false
            return true
          })
          if (visibleItems.length === 0) return null

          const visibleSubGroups = (group.subGroups || [])
            .map(sg => ({
              ...sg,
              visibleItems: sg.items.filter(item => {
                if (item.adminOnly && user?.role !== 'admin') return false
                if (item.hideForRoles?.includes(user?.role)) return false
                if (item.showForRoles && !item.showForRoles.includes(user?.role)) return false
                if (item.ppdbAccessRequired && user?.role === 'guru' && !user?.ppdb_access) return false
                return true
              })
            }))
            .filter(sg => sg.visibleItems.length > 0)

          return (
            <div key={group.label} className="mb-1">
              <GroupLabel label={user?.role === 'guru' ? group.guruLabel || group.label : group.label} collapsed={collapsed} />
              <div className="space-y-0.5 px-2">
                {visibleItems.map((item) => {
                  if (item.type === 'subheader') return null
                  const isActive = location.pathname === item.path
                  return (
                    <NavItem
                      key={item.path}
                      item={item}
                      collapsed={collapsed}
                      isActive={isActive}
                      onClick={() => setMobileOpen?.(false)}
                    />
                  )
                })}
                {visibleSubGroups.map((sg) => (
                  <div key={sg.label}>
                    <SubMenuLabel label={sg.label} collapsed={collapsed} />
                    <div className="space-y-0.5">
                      {sg.visibleItems.map((item) => {
                        const isActive = location.pathname === item.path
                        return (
                          <NavItem
                            key={item.path}
                            item={item}
                            collapsed={collapsed}
                            isActive={isActive}
                            onClick={() => setMobileOpen?.(false)}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-gray-100 pt-2 pb-3 space-y-1 transition-all duration-300">
        <UserProfile user={user} collapsed={collapsed} />
        <div className={collapsed ? 'px-2' : 'px-3'}>
          <LogoutButton collapsed={collapsed} onLogout={logout} />
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile overlay with blur */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl
        transform transition-all duration-300 ease-out
        md:hidden
        ${mobileOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}
      `}>
        <div className="flex flex-col h-full relative">
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:rotate-90 z-10"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
          {sidebarContent}
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className={`
        hidden md:flex md:flex-col bg-white border-r border-gray-200
        transition-all duration-300 ease-out relative
        ${collapsed ? 'w-[72px]' : 'w-64'}
      `}>
        {/* Toggle button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="
            absolute -right-3 top-[72px] z-10
            w-6 h-6 bg-white border border-gray-200 rounded-full
            flex items-center justify-center
            hover:bg-gray-50 hover:border-gray-300 hover:shadow-md
            transition-all duration-200 shadow-sm
          "
        >
          <ChevronRight className={`
            w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ease-out
            ${collapsed ? '' : 'rotate-180'}
          `} />
        </button>
        {sidebarContent}
      </aside>
    </>
  )
}
