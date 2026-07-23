import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSiswa, getKelas, getGuru } from '../api'
import { Users, Search, ChevronLeft, ChevronRight, School, Camera, BookOpen, GraduationCap, Filter } from 'lucide-react'

const fotoUrl = (filename) => {
  if (!filename) return null
  return `/uploads/siswa/${filename}`
}

const PER_PAGE = 25

// ─── Status Badge ───
function StatusBadge({ status }) {
  const styles = {
    aktif: 'bg-green-100 text-green-700 border-green-200',
    alumni: 'bg-gray-100 text-gray-500 border-gray-200',
    keluar: 'bg-red-100 text-red-600 border-red-200',
  }
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${styles[status] || styles.aktif}`}>
      {status}
    </span>
  )
}

// ─── Skeleton ───
function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-3 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-48" />
        <div className="h-3 bg-gray-100 rounded w-32" />
      </div>
      <div className="h-5 bg-gray-100 rounded w-16" />
    </div>
  )
}

export default function SiswaWali() {
  const { user } = useAuth()
  const guruId = user?.guru_id

  const [siswa, setSiswa] = useState([])
  const [kelas, setKelas] = useState([])
  const [guruList, setGuruList] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterWaliKelas, setFilterWaliKelas] = useState('')
  const [filterKelas, setFilterKelas] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [kelasWali, setKelasWali] = useState([])
  const [initialLoad, setInitialLoad] = useState(true)
  const searchTimeoutRef = useRef(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [search])

  useEffect(() => {
    if (!guruId) return
    loadInitialData()
  }, [guruId])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      // Load guru list and kelas for filters
      const [guruRes, kelasRes] = await Promise.all([getGuru(), getKelas()])
      setGuruList(guruRes.data || [])
      setKelas(kelasRes.data || [])

      // Set default filter to teacher's own class
      const waliKelas = kelasRes.data.filter(k => Number(k.id_wali) === Number(guruId))
      setKelasWali(waliKelas)
      if (waliKelas.length > 0) {
        setFilterWaliKelas(String(guruId))
      }

      setInitialLoad(false)
    } catch (error) {
      console.error('Gagal memuat data:', error)
      setInitialLoad(false)
    } finally {
      setLoading(false)
    }
  }

  // Fetch siswa when filters change
  useEffect(() => {
    if (initialLoad) return
    loadSiswa(1)
  }, [filterWaliKelas, filterKelas, debouncedSearch])

  const loadSiswa = async (pageOverride) => {
    try {
      setLoading(true)
      const currentPage = pageOverride || page
      const params = {
        page: currentPage,
        per_page: PER_PAGE,
      }
      if (filterWaliKelas) params.wali_kelas = filterWaliKelas
      if (filterKelas) params.kelas = filterKelas
      if (debouncedSearch) params.search = debouncedSearch

      const res = await getSiswa(params)
      setSiswa(res.data.data || [])
      setTotal(res.data.total || 0)
      setTotalPages(res.data.total_pages || 1)
      setPage(currentPage)
    } catch (error) {
      console.error('Gagal memuat siswa:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchChange = (e) => {
    setSearch(e.target.value)
  }

  // ── No guru_id ──
  if (!guruId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Users className="w-16 h-16 mb-4 opacity-30" />
        <h2 className="text-lg font-semibold text-gray-500">Akun guru tidak ditemukan</h2>
        <p className="text-sm mt-1">Hubungi administrator untuk informasi lebih lanjut.</p>
      </div>
    )
  }

  const namaKelas = kelasWali.map(k => k.nama_kelas).join(', ')

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Daftar Siswa</h1>
          <p className="text-gray-500 text-sm mt-1">
            {filterWaliKelas
              ? `Menampilkan siswa di kelas wali Anda (${namaKelas})`
              : 'Menampilkan semua siswa'}
          </p>
        </div>
      </div>

      {/* ── Class Info Card (if filter by wali kelas) ── */}
      {filterWaliKelas && kelasWali.length > 0 && (
        <div className="card bg-gradient-to-br from-annajah-50 to-blue-50 border border-annajah-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-annajah-500 to-annajah-600 flex items-center justify-center shadow-lg shrink-0">
              <School className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-800">
                Kelas {namaKelas}
                {kelasWali[0]?.tingkat && (
                  <span className="text-sm text-gray-400 ml-2 font-normal">({kelasWali[0].tingkat})</span>
                )}
              </h2>
              <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {total} siswa
                </span>
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  Wali Kelas: <strong className="text-annajah-600">{user?.nama}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="input-field pl-10"
              placeholder="Cari nama atau NIS..."
              value={search}
              onChange={handleSearchChange}
            />
          </div>
          <div className="w-full sm:w-56 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              className="input-field pl-10"
              value={filterWaliKelas}
              onChange={e => { setFilterWaliKelas(e.target.value); setPage(1) }}
            >
              <option value="">Semua Wali Kelas</option>
              {guruList.map(g => (
                <option key={g.id} value={g.id}>{g.nama}</option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-44 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              className="input-field pl-10"
              value={filterKelas}
              onChange={e => { setFilterKelas(e.target.value); setPage(1) }}
            >
              <option value="">Semua Kelas</option>
              {kelas.map(k => (
                <option key={k.id} value={k.id}>{k.nama_kelas}</option>
              ))}
            </select>
          </div>
          {(filterWaliKelas || filterKelas || search) && (
            <button
              onClick={() => {
                setSearch('')
                setFilterKelas('')
                setFilterWaliKelas(String(guruId))
                setPage(1)
              }}
              className="btn-secondary text-sm px-3 py-2"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Student List ── */}
      <div className="card p-0 overflow-hidden">
        {/* Header */}
        <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <div className="col-span-5 flex items-center gap-3">
            <span className="w-10" />
            <span>Nama Siswa</span>
          </div>
          <div className="col-span-2">NIS</div>
          <div className="col-span-2">Kelas</div>
          <div className="col-span-2">Wali Kelas</div>
          <div className="col-span-1 text-right">Status</div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="divide-y divide-gray-50">
            {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : siswa.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Users className="w-14 h-14 mb-3 opacity-30" />
            <p className="text-sm font-medium text-gray-500">
              {search ? 'Tidak ada siswa yang cocok dengan pencarian' : 'Belum ada data siswa'}
            </p>
            <p className="text-xs text-gray-300 mt-1">
              {search ? 'Coba gunakan kata kunci lain' : 'Data siswa akan muncul setelah ditambahkan oleh admin'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {siswa.map((s, idx) => (
              <div
                key={s.id}
                className="grid grid-cols-12 gap-4 px-5 py-3.5 hover:bg-annajah-50/40 transition-all duration-150 items-center"
              >
                {/* Nama + Foto */}
                <div className="col-span-12 sm:col-span-5 flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 border-2 border-gray-100">
                    {s.foto ? (
                      <img
                        src={fotoUrl(s.foto)}
                        alt={s.nama}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.querySelector('.fallback')?.classList.remove('hidden') }}
                      />
                    ) : null}
                    <div className={`w-full h-full flex items-center justify-center text-gray-400 ${s.foto ? 'hidden fallback' : ''}`}>
                      <Camera className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <Link to={`/siswa-wali/${s.id}`} className="text-sm font-medium text-annajah-600 hover:text-annajah-800 truncate hover:underline">{s.nama}</Link>
                    <p className="text-xs text-gray-400 truncate">
                      {s.nisn ? `NISN: ${s.nisn}` : ''}
                    </p>
                  </div>
                </div>

                {/* NIS */}
                <div className="hidden sm:block col-span-2">
                  <span className="text-sm text-gray-600 font-mono">{s.nis}</span>
                </div>

                {/* Kelas */}
                <div className="hidden sm:block col-span-2">
                  <span className="text-sm text-gray-600">{s.nama_kelas || '-'}</span>
                </div>

                {/* Wali Kelas */}
                <div className="hidden sm:block col-span-2">
                  <span className="text-sm text-gray-500">{s.wali_kelas || '-'}</span>
                </div>

                {/* Status */}
                <div className="hidden sm:block col-span-1 text-right">
                  <StatusBadge status={s.status} />
                </div>

                {/* Mobile layout */}
                <div className="col-span-12 sm:hidden mt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-mono">{s.nis}</span>
                      <span className="text-gray-200">|</span>
                      <span className="text-xs text-gray-400">{s.nama_kelas || '-'}</span>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                  {s.wali_kelas && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Wali: <span className="text-gray-600">{s.wali_kelas}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-400">
              Halaman {page} dari {totalPages} ({total} siswa)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadSiswa(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
              >
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                  const p = start + i
                  if (p > totalPages) return null
                  return (
                    <button
                      key={p}
                      onClick={() => loadSiswa(p)}
                      className={`w-7 h-7 text-xs font-medium rounded-lg transition-all duration-150 ${
                        p === page
                          ? 'bg-annajah-600 text-white shadow-sm'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => loadSiswa(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
              >
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
