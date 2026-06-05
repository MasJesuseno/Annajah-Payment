import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  LayoutDashboard, Users, GraduationCap, CreditCard,
  ArrowLeftRight, FileText, LogOut, School, ChevronRight,
  X, Settings, Shield, Database as DatabaseIcon, ClipboardList,
  User, DoorOpen, Mail, CheckSquare,  Clock, History, CalendarDays,
  Medal, BarChart3, HeartHandshake, Trophy, Award, Palette, BookOpen, ClipboardCheck, Calendar, Activity, ChevronDown
} from 'lucide-react'
import { getPengaturan, getRolePermissionsByRole } from '../api'

// ─── Menu Structure with Groups ───
const menuGroups = [
  {
    label: 'Utama',
    icon: LayoutDashboard,
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/guru-dashboard', label: 'Dashboard (Karyawan)', icon: LayoutDashboard },
      { path: '/profil-saya', label: 'Profil Saya', icon: User },
      { path: '/daftar-kehadiran-saya', label: 'Daftar Kehadiran Saya', icon: History },
      { path: '/kehadiran-guru-saya', label: 'Absen Kehadiran', icon: Clock },
    ],
  },
  {
    label: 'Kepegawaian',
    icon: Users,
    items: [
      { path: '/guru', label: 'Data Karyawan', icon: Users },
      { path: '/kehadiran-guru', label: 'Kehadiran Karyawan', icon: Clock },
      { path: '/rekap-kehadiran-guru', label: 'Rekap Kehadiran Karyawan', icon: CalendarDays },
    ],
  },
  {
    label: 'Kesiswaan',
    icon: GraduationCap,
    items: [
      { path: '/siswa-wali', label: 'Daftar Siswa (Wali Kelas)', icon: ClipboardList },
      { path: '/kehadiran-wali', label: 'Kehadiran Siswa (Wali Kelas)', icon: ClipboardList },
      { path: '/input-kehadiran-wali', label: 'Input Kehadiran Masal (Wali)', icon: CheckSquare },
      { path: '/siswa', label: 'Data Siswa', icon: Users },
      { path: '/alumni', label: 'Alumni', icon: GraduationCap },
      { path: '/kelas', label: 'Kelas', icon: GraduationCap },
      { path: '/kehadiran', label: 'Kehadiran Siswa', icon: ClipboardList },
      { path: '/kehadiran/bulk', label: 'Input Kehadiran Masal', icon: CheckSquare },
    ],
  },
  {
    label: 'Ekstrakurikuler',
    icon: Medal,
    items: [
      { path: '/ekstrakurikuler', label: 'Data Ekstrakurikuler', icon: Medal },
      { path: '/ekstrakurikuler/peserta', label: 'Peserta Ekstrakurikuler', icon: Users },
      { path: '/ekstrakurikuler/input-peserta', label: 'Input Peserta', icon: User },
      { path: '/ekstrakurikuler/rekap', label: 'Rekap Peserta', icon: BarChart3 },
    ],
  },
  {
    label: 'Bimbingan Konseling',
    icon: HeartHandshake,
    items: [
      { path: '/bimbingan-konseling', label: 'Daftar BK', icon: HeartHandshake },
      { path: '/bimbingan-konseling/input', label: 'Input BK', icon: User },
      { path: '/bimbingan-konseling/rekap', label: 'Rekap BK', icon: BarChart3 },
    ],
  },
  {
    label: 'Nilai Siswa',
    icon: ClipboardCheck,
    items: [
      { path: '/nilai-siswa', label: 'Daftar Nilai', icon: ClipboardCheck },
      { path: '/nilai-siswa/input', label: 'Input Nilai', icon: User },
      { path: '/nilai-siswa/rekap', label: 'Rekap Nilai', icon: BarChart3 },
      { path: '/periode-penilaian', label: 'Periode Penilaian', icon: CalendarDays },
    ],
  },
  {
    label: 'Prestasi Siswa',
    icon: Trophy,
    items: [
      { path: '/prestasi-siswa', label: 'Daftar Prestasi', icon: Trophy },
      { path: '/prestasi-siswa/input', label: 'Input Prestasi', icon: Award },
      { path: '/prestasi-siswa/rekap', label: 'Rekap Prestasi', icon: BarChart3 },
      { path: '/prestasi-siswa/pengaturan', label: 'Template Piagam', icon: Palette },
    ],
  },
  {
    label: 'Mata Pelajaran',
    icon: BookOpen,
    items: [
      { path: '/mata-pelajaran', label: 'Mata Pelajaran', icon: BookOpen },
    ],
  },
  {
    label: 'PPDB',
    icon: DoorOpen,
    items: [
      { path: '/ppdb/admin', label: 'Data PPDB', icon: DoorOpen },
      { path: '/ppdb/pengaturan', label: 'Pengaturan PPDB', icon: Mail },
    ],
  },
  {
    label: 'Transaksi & Laporan',
    icon: ArrowLeftRight,
    items: [
      { path: '/transaksi', label: 'Transaksi', icon: ArrowLeftRight },
      { path: '/laporan', label: 'Laporan', icon: FileText },
      { path: '/pembayaran', label: 'Jenis Pembayaran', icon: CreditCard },
    ],
  },
  {
    label: 'Pengaturan',
    icon: Settings,
    items: [
      { path: '/pengaturan', label: 'Pengaturan', icon: Settings },
      { path: '/tahun-ajaran', label: 'Tahun Pelajaran', icon: Calendar },
      { path: '/users', label: 'Manajemen User', icon: Shield },
      { path: '/database', label: 'Backup Database', icon: DatabaseIcon },
      { path: '/role-permissions', label: 'Hak Akses Menu', icon: Shield },
      { path: '/log-aktivitas', label: 'Log Aktivitas', icon: Activity },
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
function GroupLabel({ label, icon: Icon, collapsed, isExpanded, onToggle, primaryColor, itemCount }) {
  const bgColor = primaryColor || '#15803D'

  return (
    <button
      onClick={onToggle}
      className={`
        w-full text-left transition-all duration-300 ease-out group
        ${collapsed ? 'opacity-0 max-h-0 overflow-hidden py-0 pointer-events-none' : 'opacity-100'}
      `}
    >
      <div
        className="mx-2 mt-1 mb-0.5 px-3 py-1.5 rounded-lg flex items-center justify-between transition-all duration-200 hover:shadow-md group-hover:brightness-105"
        style={{ backgroundColor: `${bgColor}0D` }}
      >
        <div className="flex items-center gap-2">
          {/* Icon with hover scale + glow effect */}
          <span className="
            flex items-center justify-center w-5 h-5
            transition-all duration-300 ease-out
            group-hover:scale-125 group-hover:drop-shadow-[0_0_6px_var(--glow-color)]
          "
            style={{ '--glow-color': bgColor }}
          >
            {Icon && (
              <Icon
                className="w-3.5 h-3.5 transition-all duration-300"
                style={{ color: bgColor }}
                strokeWidth={2.5}
              />
            )}
          </span>
          <span
            className="text-[10px] font-semibold uppercase tracking-widest transition-all duration-200"
            style={{ color: bgColor }}
          >
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium opacity-50 transition-all duration-200" style={{ color: bgColor }}>
            {itemCount}
          </span>
          <ChevronDown
            className={`w-3 h-3 transition-all duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            style={{ color: bgColor }}
            strokeWidth={2.5}
          />
        </div>
      </div>
    </button>
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
  const [primaryColor, setPrimaryColor] = useState('#1A56DB')
  const [expandedGroups, setExpandedGroups] = useState(() => {
    // Default: semua grup yang ada itemnya di-expand
    const saved = localStorage.getItem('sidebar_expanded_groups')
    if (saved) {
      try { return new Set(JSON.parse(saved)) } catch {}
    }
    // Default: expand semua grup
    return new Set(menuGroups.map(g => g.label))
  })
  const [permissions, setPermissions] = useState(null) // { [path]: true/false }
  const [loadingPerms, setLoadingPerms] = useState(true)

  // Load permissions from API for the user's role
  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoadingPerms(true)
    getRolePermissionsByRole(user.role)
      .then(res => {
        if (!cancelled) {
          setPermissions(res.data)
          setLoadingPerms(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Fallback: set to null so isPathAllowed returns true for all
          setPermissions(null)
          setLoadingPerms(false)
        }
      })
    return () => { cancelled = true }
  }, [user?.role])

  // Toggle group expand/collapse
  const toggleGroup = useCallback((label) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(label)) {
        next.delete(label)
      } else {
        next.add(label)
      }
      // Simpan preferensi ke localStorage
      localStorage.setItem('sidebar_expanded_groups', JSON.stringify([...next]))
      return next
    })
  }, [])

  useEffect(() => {
    loadSettings()
  }, [location.pathname])

  const loadSettings = async () => {
    try {
      const res = await getPengaturan()
      if (res.data?.logo) {
        setLogoUrl(res.data.logo)
      }
      if (res.data?.warna_utama) {
        setPrimaryColor(res.data.warna_utama)
      }
    } catch {
      // Abaikan error — fallback ke icon default
    }
  }

  // Check if a menu path is allowed based on permissions
  const isPathAllowed = useCallback((path) => {
    if (!permissions) return true // while loading, show all
    // If explicitly set, use the value
    if (path in permissions) {
      return permissions[path]
    }
    // Path not found in permissions - default to not showing
    return false
  }, [permissions])

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-gray-100 transition-all duration-300">
        <LogoDisplay collapsed={collapsed} logoUrl={logoUrl} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-1 scrollbar-thin">
        {loadingPerms ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-annajah-300 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : menuGroups.map((group) => {
          const visibleItems = group.items.filter(item => isPathAllowed(item.path))
          if (visibleItems.length === 0) return null

          const isExpanded = expandedGroups.has(group.label)

          return (
            <div key={group.label} className="mb-1">
              <GroupLabel
                label={group.label}
                icon={group.icon}
                collapsed={collapsed}
                isExpanded={isExpanded}
                onToggle={() => toggleGroup(group.label)}
                primaryColor={primaryColor}
                itemCount={visibleItems.length}
              />
              <div className={`
                overflow-hidden transition-all duration-300 ease-in-out
                ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}
              `}>
                <div className="space-y-0.5 px-2">
                  {visibleItems.map((item) => {
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
