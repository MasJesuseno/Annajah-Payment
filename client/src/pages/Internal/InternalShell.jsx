import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, School, LayoutGrid } from 'lucide-react'
import { getPengaturan } from '../../api'

/**
 * Kerangka tampilan mobile untuk halaman di dalam Panel /Internal.
 * Menyediakan header ringkas dengan tombol kembali ke daftar menu.
 */
export default function InternalShell({ title, subtitle, children }) {
  const navigate = useNavigate()
  const [logoUrl, setLogoUrl] = useState(null)
  const [logoError, setLogoError] = useState(false)

  useEffect(() => {
    getPengaturan()
      .then((res) => { if (res.data?.logo) setLogoUrl(res.data.logo) })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header mobile */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-md mx-auto px-3 py-2.5 flex items-center gap-2">
          <button
            onClick={() => navigate('/internal')}
            className="p-2 -ml-1 rounded-xl hover:bg-gray-100 active:scale-95 transition-all shrink-0"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0">
            {logoUrl && !logoError ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="w-full h-full object-contain p-0.5"
                onError={() => setLogoError(true)}
              />
            ) : (
              <School className="w-4 h-4 text-annajah-600" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-semibold text-gray-800 text-sm truncate leading-tight">{title}</h1>
            {subtitle && <p className="text-[10px] text-gray-400 truncate">{subtitle}</p>}
          </div>

          <button
            onClick={() => navigate('/internal')}
            className="p-2 rounded-xl hover:bg-gray-100 active:scale-95 transition-all shrink-0"
            aria-label="Menu utama"
          >
            <LayoutGrid className="w-5 h-5 text-annajah-600" />
          </button>
        </div>
      </header>

      {/* Konten */}
      <main className="flex-1 max-w-md w-full mx-auto p-3 pb-10">
        {children}
      </main>
    </div>
  )
}
