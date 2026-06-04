import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu, School } from 'lucide-react'
import { getPengaturan } from '../api'
import Sidebar from './Sidebar'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [logoUrl, setLogoUrl] = useState(null)
  const [logoError, setLogoError] = useState(false)
  const location = useLocation()

  useEffect(() => {
    loadLogo()
  }, [location.pathname])

  const loadLogo = async () => {
    try {
      const res = await getPengaturan()
      if (res.data?.logo) {
        setLogoUrl(res.data.logo)
        setLogoError(false)
      }
    } catch {
      // Fallback ke icon default
    }
  }

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const getPageTitle = () => {
    const titles = {
      '/dashboard': 'Dashboard',
      '/siswa': 'Data Siswa',
      '/kelas': 'Kelas',
      '/pembayaran': 'Jenis Pembayaran',
      '/transaksi': 'Transaksi',
      '/laporan': 'Laporan',
      '/pengaturan': 'Pengaturan',
      '/users': 'Manajemen User',
      '/database': 'Backup Database',
    }
    return titles[location.pathname] || 'SMA Annajah'
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0">
              {logoUrl && !logoError ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="w-full h-full object-contain p-1"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <School className="w-4 h-4 text-annajah-600" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-gray-800 text-sm truncate">{getPageTitle()}</h1>
              <p className="text-[10px] text-gray-400">SMA Annajah</p>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
