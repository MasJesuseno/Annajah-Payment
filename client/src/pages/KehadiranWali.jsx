import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getKehadiranByWali, updateKehadiran, deleteKehadiran, downloadExcelKehadiranWali, downloadPdfKehadiranWali } from '../api'
import { Search, Calendar, Filter, ChevronLeft, ChevronRight, UserCheck, UserX, Clock, Activity, AlertCircle, PieChart as PieChartIcon, Download, FileText, Edit2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const PER_PAGE = 25

// ─── Status Badge ───
const statusColors = {
  hadir: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: 'check' },
  ijin: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', icon: 'clock' },
  sakit: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', icon: 'activity' },
  alpa: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: 'x' },
}

function StatusBadge({ status }) {
  const s = status?.toLowerCase() || 'hadir'
  const color = statusColors[s] || statusColors.hadir
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${color.bg} ${color.text} ${color.border}`}>
      {s === 'hadir' && <UserCheck className="w-3 h-3" />}
      {s === 'ijin' && <Clock className="w-3 h-3" />}
      {s === 'sakit' && <Activity className="w-3 h-3" />}
      {s === 'alpa' && <UserX className="w-3 h-3" />}
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-48" />
        <div className="h-3 bg-gray-100 rounded w-32" />
      </div>
      <div className="h-5 bg-gray-100 rounded w-20" />
      <div className="h-5 bg-gray-100 rounded w-16" />
    </div>
  )
}

const PIE_COLORS = ['#22c55e', '#eab308', '#3b82f6', '#ef4444']

function DistribusiKehadiran({ kehadiran }) {
  const counts = { hadir: 0, ijin: 0, sakit: 0, alpa: 0 }
  kehadiran.forEach(k => { if (counts[k.status] !== undefined) counts[k.status]++ })

  const data = [
    { name: 'Hadir', value: counts.hadir },
    { name: 'Ijin', value: counts.ijin },
    { name: 'Sakit', value: counts.sakit },
    { name: 'Alpa', value: counts.alpa },
  ].filter(d => d.value > 0)

  if (data.length === 0) return null

  const total = data.reduce((s, d) => s + d.value, 0)

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0]
      const pct = ((item.value / total) * 100).toFixed(1)
      return (
        <div className="bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-gray-800" style={{ color: item.payload.fill }}>{item.name}</p>
          <p className="text-lg font-bold text-gray-900">{item.value} <span className="text-sm font-normal text-gray-400">({pct}%)</span></p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <PieChartIcon className="w-4 h-4 text-annajah-600" />
        Distribusi Kehadiran
      </h3>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="w-52 h-52 sm:w-48 sm:h-48 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {data.map((d, i) => {
            const pct = ((d.value / total) * 100).toFixed(1)
            return (
              <div key={d.name} className="flex items-center gap-2.5">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">{d.name}</p>
                  <p className="text-xs text-gray-400">{d.value} ({pct}%)</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function RingkasanCard({ kehadiran }) {
  const counts = { hadir: 0, ijin: 0, sakit: 0, alpa: 0 }
  kehadiran.forEach(k => { if (counts[k.status] !== undefined) counts[k.status]++ })

  const cards = [
    { label: 'Hadir', count: counts.hadir, color: 'green', icon: UserCheck },
    { label: 'Ijin', count: counts.ijin, color: 'yellow', icon: Clock },
    { label: 'Sakit', count: counts.sakit, color: 'blue', icon: Activity },
    { label: 'Alpa', count: counts.alpa, color: 'red', icon: AlertCircle },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map(c => {
        const colorMap = {
          green: 'bg-green-50 text-green-700 border-green-200',
          yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
          blue: 'bg-blue-50 text-blue-700 border-blue-200',
          red: 'bg-red-50 text-red-700 border-red-200',
        }
        const Icon = c.icon
        return (
          <div key={c.label} className={`rounded-xl border p-4 ${colorMap[c.color]}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-80">{c.label}</span>
              <Icon className="w-4 h-4 opacity-60" />
            </div>
            <p className="text-2xl font-bold">{c.count}</p>
          </div>
        )
      })}
    </div>
  )
}

export default function KehadiranWali() {
  const { user } = useAuth()
  const guruId = user?.guru_id

  const [kehadiran, setKehadiran] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ tanggal: '', jam_masuk: '', jam_keluar: '', status: 'hadir' })
  const [submitting, setSubmitting] = useState(false)

  // Filters
  const [tanggalAwal, setTanggalAwal] = useState('')
  const [tanggalAkhir, setTanggalAkhir] = useState('')
  const [filterSearch, setFilterSearch] = useState('')
  const [filterSearchInput, setFilterSearchInput] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilterSearch(filterSearchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [filterSearchInput])

  useEffect(() => {
    loadKehadiran()
  }, [page, tanggalAwal, tanggalAkhir, filterSearch, filterStatus, guruId])

  const loadKehadiran = async () => {
    if (!guruId) return
    setLoading(true)
    try {
      const params = { page, per_page: PER_PAGE }
      if (tanggalAwal) params.tanggal_awal = tanggalAwal
      if (tanggalAkhir) params.tanggal_akhir = tanggalAkhir
      if (filterSearch) params.search = filterSearch
      if (filterStatus) params.status = filterStatus

      const res = await getKehadiranByWali(guruId, params)
      setKehadiran(res.data.data || [])
      setTotal(res.data.total || 0)
      setTotalPages(res.data.total_pages || 1)
    } catch (error) {
      toast.error('Gagal memuat data kehadiran')
    } finally {
      setLoading(false)
    }
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      tanggal: formatDateInput(item.tanggal),
      jam_masuk: item.jam_masuk ? item.jam_masuk.slice(0, 5) : '',
      jam_keluar: item.jam_keluar ? item.jam_keluar.slice(0, 5) : '',
      status: item.status,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.tanggal || !form.status) {
      toast.error('Tanggal dan status harus diisi')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        tanggal: form.tanggal,
        jam_masuk: form.jam_masuk || null,
        jam_keluar: form.jam_keluar || null,
        status: form.status,
      }
      await updateKehadiran(editing.id, payload)
      toast.success('Data kehadiran berhasil diperbarui')
      setShowModal(false)
      loadKehadiran()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal memperbarui data')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id, nama) => {
    if (!confirm(`Yakin ingin menghapus data kehadiran ${nama}?`)) return
    try {
      await deleteKehadiran(id)
      toast.success('Data kehadiran berhasil dihapus')
      loadKehadiran()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menghapus data')
    }
  }

  const handleFilterReset = () => {
    setTanggalAwal('')
    setTanggalAkhir('')
    setFilterSearch('')
    setFilterSearchInput('')
    setFilterStatus('')
    setPage(1)
  }

  const hasFilters = tanggalAwal || tanggalAkhir || filterSearch || filterStatus

  const fotoUrl = (filename) => filename ? `/uploads/siswa/${filename}` : null
  const formatJam = (jam) => jam ? jam.slice(0, 5) : '-'
  const formatDateInput = (tgl) => {
    if (!tgl) return ''
    const d = new Date(tgl)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const formatTanggal = (tgl) => {
    if (!tgl) return '-'
    const d = new Date(tgl)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const handleExportExcel = async () => {
    try {
      const params = {}
      if (tanggalAwal) params.tanggal_awal = tanggalAwal
      if (tanggalAkhir) params.tanggal_akhir = tanggalAkhir
      if (filterStatus) params.status = filterStatus
      if (filterSearch) params.search = filterSearch

      const res = await downloadExcelKehadiranWali(guruId, params)
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'kehadiran_wali_kelas.xlsx'
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Data kehadiran berhasil diunduh (Excel)')
    } catch (error) {
      toast.error('Gagal mengunduh Excel')
    }
  }

  const handleExportPdf = async () => {
    try {
      const params = {}
      if (tanggalAwal) params.tanggal_awal = tanggalAwal
      if (tanggalAkhir) params.tanggal_akhir = tanggalAkhir
      if (filterStatus) params.status = filterStatus
      if (filterSearch) params.search = filterSearch

      const res = await downloadPdfKehadiranWali(guruId, params)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'kehadiran_wali_kelas.pdf'
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Data kehadiran berhasil diunduh (PDF)')
    } catch (error) {
      toast.error('Gagal mengunduh PDF')
    }
  }

  const showRingkasan = kehadiran.length > 0 && (tanggalAwal || tanggalAkhir || filterStatus || filterSearch)

  if (!guruId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <UserCheck className="w-16 h-16 mb-4 opacity-30" />
        <h2 className="text-lg font-semibold text-gray-500">Akun karyawan tidak ditemukan</h2>
        <p className="text-sm mt-1">Hubungi administrator untuk informasi lebih lanjut.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kehadiran Siswa</h1>
          <p className="text-gray-500 text-sm mt-1">Daftar kehadiran siswa di kelas wali Anda</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportExcel}
            disabled={loading}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <Download className="w-4 h-4 text-green-600" />
            Excel
          </button>
          <button
            onClick={handleExportPdf}
            disabled={loading}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <FileText className="w-4 h-4 text-red-500" />
            PDF
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              className="input-field pl-10"
              value={tanggalAwal}
              onChange={e => { setTanggalAwal(e.target.value); setPage(1) }}
              placeholder="Tanggal Awal"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              className="input-field pl-10"
              value={tanggalAkhir}
              onChange={e => { setTanggalAkhir(e.target.value); setPage(1) }}
              placeholder="Tanggal Akhir"
            />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="input-field pl-10"
              value={filterSearchInput}
              onChange={e => setFilterSearchInput(e.target.value)}
              placeholder="Cari nama siswa..."
            />
            {filterSearchInput && (
              <button
                onClick={() => { setFilterSearchInput(''); setFilterSearch(''); setPage(1) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              className="input-field pl-10"
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
            >
              <option value="">Semua Status</option>
              <option value="hadir">Hadir</option>
              <option value="ijin">Ijin</option>
              <option value="sakit">Sakit</option>
              <option value="alpa">Alpa</option>
            </select>
          </div>
          {hasFilters && (
            <button onClick={handleFilterReset} className="btn-secondary text-sm sm:col-start-1 sm:col-end-2">
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* ── Ringkasan & Grafik ── */}
      {showRingkasan && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <RingkasanCard kehadiran={kehadiran} />
          </div>
          <div>
            <DistribusiKehadiran kehadiran={kehadiran} />
          </div>
        </div>
      )}

      {/* ── Tabel Kehadiran ── */}
      <div className="card p-0 overflow-hidden">
        <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <div className="col-span-4 flex items-center gap-3">
            <span className="w-10" />
            <span>Nama Siswa</span>
          </div>
          <div className="col-span-2">Kelas</div>
          <div className="col-span-2">Tanggal</div>
          <div className="col-span-1">Jam Masuk</div>
          <div className="col-span-1">Jam Keluar</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1" />
        </div>

        {loading ? (
          <div className="divide-y divide-gray-50">
            {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : kehadiran.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Calendar className="w-14 h-14 mb-3 opacity-30" />
            <p className="text-sm font-medium text-gray-500">
              {hasFilters ? 'Tidak ada data kehadiran yang cocok dengan filter' : 'Belum ada data kehadiran'}
            </p>
            <p className="text-xs text-gray-300 mt-1">
              {hasFilters ? 'Coba ubah filter atau reset' : 'Data kehadiran siswa akan muncul di sini'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {kehadiran.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 px-5 py-3.5 hover:bg-annajah-50/40 transition-all duration-150 items-center">
                {/* Nama + Foto */}
                <div className="col-span-12 sm:col-span-4 flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 border-2 border-gray-100">
                    {item.foto ? (
                      <img src={fotoUrl(item.foto)} alt={item.nama_siswa} className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none' }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">
                        {item.nama_siswa?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{item.nama_siswa}</p>
                    <p className="text-xs text-gray-400 font-mono">{item.nis}</p>
                  </div>
                </div>

                <div className="hidden sm:block col-span-2">
                  <span className="text-sm text-gray-600">{item.nama_kelas || '-'}</span>
                </div>

                <div className="hidden sm:block col-span-2">
                  <span className="text-sm text-gray-600">{formatTanggal(item.tanggal)}</span>
                </div>

                <div className="hidden sm:block col-span-1">
                  <span className="text-sm text-gray-600 font-mono">{formatJam(item.jam_masuk)}</span>
                </div>

                <div className="hidden sm:block col-span-1">
                  <span className="text-sm text-gray-600 font-mono">{formatJam(item.jam_keluar)}</span>
                </div>

                <div className="hidden sm:block col-span-1">
                  <StatusBadge status={item.status} />
                </div>

                <div className="hidden sm:flex col-span-1 gap-1 justify-end">
                  <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors" title="Edit">
                    <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                  </button>
                  <button onClick={() => handleDelete(item.id, item.nama_siswa)} className="p-1.5 hover:bg-red-100 rounded-lg transition-colors" title="Hapus">
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </button>
                </div>

                {/* Mobile layout */}
                <div className="col-span-12 sm:hidden mt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{formatTanggal(item.tanggal)}</span>
                      <span className="text-gray-200">|</span>
                      <span className="text-xs text-gray-400">{item.nama_kelas || '-'}</span>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>Masuk: {formatJam(item.jam_masuk)}</span>
                    <span>Keluar: {formatJam(item.jam_keluar)}</span>
                    <div className="ml-auto flex gap-1">
                      <button onClick={() => openEdit(item)} className="p-1 hover:bg-blue-100 rounded-lg">
                        <Edit2 className="w-3 h-3 text-blue-600" />
                      </button>
                      <button onClick={() => handleDelete(item.id, item.nama_siswa)} className="p-1 hover:bg-red-100 rounded-lg">
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-400">
              Halaman {page} dari {totalPages} ({total} data)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
                      onClick={() => setPage(p)}
                      className={`w-7 h-7 text-xs font-medium rounded-lg transition-all ${
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
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Edit ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">Edit Data Kehadiran</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Siswa (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Siswa</label>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                      {editing?.foto ? (
                        <img src={`/uploads/siswa/${editing.foto}`} alt={editing.nama_siswa} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">
                          {editing?.nama_siswa?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{editing?.nama_siswa}</p>
                      <p className="text-xs text-gray-400 font-mono">{editing?.nis} — {editing?.nama_kelas}</p>
                    </div>
                  </div>
                </div>

                {/* Tanggal */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Tanggal <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    className="input-field"
                    value={form.tanggal}
                    onChange={e => setForm({ ...form, tanggal: e.target.value })}
                  />
                </div>

                {/* Jam Masuk & Jam Keluar */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Jam Masuk</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="time"
                        className="input-field pl-10"
                        value={form.jam_masuk}
                        onChange={e => setForm({ ...form, jam_masuk: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Jam Keluar</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="time"
                        className="input-field pl-10"
                        value={form.jam_keluar}
                        onChange={e => setForm({ ...form, jam_keluar: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Status <span className="text-red-500">*</span></label>
                  <div className="grid grid-cols-2 gap-2">
                    {['hadir', 'ijin', 'sakit', 'alpa'].map(st => {
                      const selected = form.status === st
                      const colors = statusColors[st]
                      return (
                        <label
                          key={st}
                          className={`flex items-center gap-2 p-3 rounded-xl cursor-pointer border transition-all ${
                            selected
                              ? `${colors.bg} ${colors.text} ${colors.border} ring-2 ring-offset-1 ring-opacity-50 ${colors.text.replace('text-', 'ring-')}`
                              : 'border-gray-200 hover:bg-gray-50 text-gray-500'
                          }`}
                        >
                          <input
                            type="radio"
                            name="status"
                            className="sr-only"
                            checked={selected}
                            onChange={() => setForm({ ...form, status: st })}
                          />
                          {st === 'hadir' && <UserCheck className="w-4 h-4" />}
                          {st === 'ijin' && <Clock className="w-4 h-4" />}
                          {st === 'sakit' && <Activity className="w-4 h-4" />}
                          {st === 'alpa' && <UserX className="w-4 h-4" />}
                          <span className="text-sm font-medium capitalize">{st}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {submitting && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    {submitting ? 'Menyimpan...' : 'Simpan'}
                  </button>
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Batal</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
