import { useState, useEffect } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { getRolePermissionsByRole } from '../../api'
import { findMenuByKey, isMenuAllowed } from './menuConfig'
import InternalShell from './InternalShell'

/**
 * Menampilkan salah satu modul Panel /Internal sesuai key pada URL
 * (/internal/<key>), dibungkus kerangka tampilan mobile.
 */
export default function InternalMenuPage() {
  const { menuKey } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const menu = findMenuByKey(menuKey)

  const [permissions, setPermissions] = useState(null)
  const [loadingPerms, setLoadingPerms] = useState(true)

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

  if (!menu) return <Navigate to="/internal" replace />

  if (loadingPerms) {
    return (
      <InternalShell title={menu.label}>
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-annajah-600" />
        </div>
      </InternalShell>
    )
  }

  if (!isMenuAllowed(menu, permissions)) {
    return (
      <InternalShell title={menu.label}>
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-base font-semibold text-gray-700">Akses Ditolak</h2>
          <p className="text-sm text-gray-400 mt-1">
            Akun Anda tidak memiliki hak akses untuk menu ini.
          </p>
          <button
            onClick={() => navigate('/internal')}
            className="mt-5 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-annajah-600 text-white text-sm font-medium shadow-sm active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Menu
          </button>
        </div>
      </InternalShell>
    )
  }

  const Page = menu.component

  return (
    <InternalShell title={menu.label} subtitle={menu.description}>
      <Page />
    </InternalShell>
  )
}
