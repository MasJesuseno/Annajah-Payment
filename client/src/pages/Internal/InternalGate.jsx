import { useAuth } from '../../context/AuthContext'
import InternalLogin from './InternalLogin'

/**
 * Gerbang Panel /Internal.
 * - Saat sesi masih dimuat → tampilkan spinner.
 * - Belum login → tampilkan halaman login mobile (dengan captcha).
 * - Sudah login → render halaman panel.
 */
export default function InternalGate({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-annajah-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!user) return <InternalLogin />

  return children
}
