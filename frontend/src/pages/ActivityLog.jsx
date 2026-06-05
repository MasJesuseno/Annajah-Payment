import { useState, useEffect } from 'react'
import { getActivityLog } from '../api'
import {
  Activity, LogIn, LogOut, Trash2, Edit, Plus, Download, Upload,
  FileText, Search, RefreshCw, Clock, Monitor, CalendarDays, X
} from 'lucide-react'
import toast from 'react-hot-toast'

function formatDateInput(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

const QUICK_FILTERS = [
  { label: 'Hari Ini', days: 0 },
  { label: '7 Hari', days: 7 },
  { label: '30 Hari', days: 30 },
  { label: '90 Hari', days: 90 },
]

const ACTION_ICONS = {
  login: { icon: LogIn, color: 'text-blue-600', bg: 'bg-blue-100' },
  logout: { icon: LogOut, color: 'text-gray-600', bg: 'bg-gray-100' },
  create: { icon: Plus, color: 'text-green-600', bg: 'bg-green-100' },
  update: { icon: Edit, color: 'text-amber-600', bg: 'bg-amber-100' },
  delete: { icon: Trash2, color: 'text-red-600', bg: 'bg-red-100' },
  import: { icon: Upload, color: 'text-purple-600', bg: 'bg-purple-100' },
  export: { icon: Download, color: 'text-indigo-600', bg: 'bg-indigo-100' },
}

const ACTION_LABELS = {
  login: 'Login',
  logout: 'Logout',
  create: 'Tambah',
  update: 'Ubah',
  delete: 'Hapus',
  import: 'Import',
  export: 'Export',
}

const ENTITY_LABELS = {
  user: 'User',
  siswa: 'Siswa',
  guru: 'Karyawan',
  kelas: 'Kelas',
  transaksi: 'Transaksi',
  pembayaran: 'Pembayaran',
  kehadiran: 'Kehadiran',
  ekstrakurikuler: 'Ekstrakurikuler',
  'bimbingan-konseling': 'BK',
  prestasi_siswa: 'Prestasi',
  'mata-pelajaran': 'Mapel',
  ppdb: 'PPDB',
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)

  if (mins < 1) return 'Baru saja'
  if (mins < 60) return `${mins} menit lalu`
  if (hours < 24) return `${hours} jam lalu`

  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ActivityLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [activeQuickFilter, setActiveQuickFilter] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const [usernames, setUsernames] = useState([])
  const [filterUsername, setFilterUsername] = useState('')

  const loadLogs = async () => {
    try {
      const params = {}
      if (startDate) params.start_date = startDate
      if (endDate) params.end_date = endDate
      if (filterUsername) params.username = filterUsername
      const res = await getActivityLog(params)
      setLogs(res.data.data || [])
      if (res.data.usernames) {
        setUsernames(res.data.usernames)
      }
    } catch {
      toast.error('Gagal memuat log aktivitas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [startDate, endDate, filterUsername])

  // Auto refresh setiap 30 detik
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(loadLogs, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  const applyQuickFilter = (days) => {
    setActiveQuickFilter(days)
    if (days === 0) {
      // Hari ini
      setStartDate(todayStr())
      setEndDate(todayStr())
    } else {
      setStartDate(daysAgo(days))
      setEndDate(todayStr())
    }
  }

  const clearDateFilter = () => {
    setStartDate('')
    setEndDate('')
    setActiveQuickFilter(null)
  }

  const hasDateFilter = startDate || endDate

  const filteredLogs = logs.filter(log => {
    if (filterAction && log.action !== filterAction) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        (log.username || '').toLowerCase().includes(q) ||
        (log.description || '').toLowerCase().includes(q) ||
        (log.entity_type || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Log Aktivitas</h1>
          <p className="text-gray-500 text-sm mt-1">
            Riwayat aktivitas pengguna dalam sistem
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
            <div
              className={`w-9 h-5 rounded-full transition-colors duration-200 relative cursor-pointer ${
                autoRefresh ? 'bg-annajah-500' : 'bg-gray-300'
              }`}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform duration-200 ${
                autoRefresh ? 'translate-x-[18px]' : 'translate-x-[3px]'
              }`} />
            </div>
            Auto Refresh
          </label>
          <button
            onClick={loadLogs}
            className="btn-secondary flex items-center gap-2 px-4 py-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Row 1: Search, Username & Action Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari aktivitas..."
              className="input-field pl-10"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <select
              className="input-field pr-8 appearance-none cursor-pointer min-w-[160px]"
              value={filterUsername}
              onChange={e => setFilterUsername(e.target.value)}
            >
              <option value="">Semua User</option>
              {usernames.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <select
              className="input-field pr-8 appearance-none cursor-pointer min-w-[150px]"
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
            >
              <option value="">Semua Aksi</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="create">Tambah</option>
              <option value="update">Ubah</option>
              <option value="delete">Hapus</option>
              <option value="import">Import</option>
              <option value="export">Export</option>
            </select>
          </div>
          <span className="text-xs text-gray-400">
            {filteredLogs.length} dari {logs.length} log
          </span>
        </div>

        {/* Row 2: Date Range Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />

          {/* Quick filters */}
          {QUICK_FILTERS.map(qf => (
            <button
              key={qf.days}
              onClick={() => applyQuickFilter(qf.days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                activeQuickFilter === qf.days
                  ? 'bg-annajah-50 text-annajah-700 border-annajah-300 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {qf.label}
            </button>
          ))}

          {/* Separator */}
          <span className="w-px h-5 bg-gray-200" />

          {/* Date inputs */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setActiveQuickFilter(null) }}
              className="input-field !py-1.5 !px-2.5 text-xs min-w-[130px]"
              placeholder="Tanggal mulai"
            />
            <span className="text-xs text-gray-400">—</span>
            <input
              type="date"
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setActiveQuickFilter(null) }}
              className="input-field !py-1.5 !px-2.5 text-xs min-w-[130px]"
              placeholder="Tanggal akhir"
            />
          </div>

          {/* Clear date filter */}
          {hasDateFilter && (
            <button
              onClick={clearDateFilter}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-annajah-600"></div>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="card text-center py-12">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Belum ada log aktivitas</p>
          <p className="text-gray-400 text-sm mt-1">
            {search || filterAction ? 'Coba ubah filter pencarian' : 'Log akan muncul saat pengguna melakukan aktivitas'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map(log => {
            const actionConfig = ACTION_ICONS[log.action] || { icon: Activity, color: 'text-gray-600', bg: 'bg-gray-100' }
            const ActionIcon = actionConfig.icon
            const entityLabel = ENTITY_LABELS[log.entity_type] || log.entity_type || ''

            return (
              <div
                key={log.id}
                className="card !p-4 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start gap-3">
                  {/* Action Icon */}
                  <div className={`w-9 h-9 rounded-lg ${actionConfig.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <ActionIcon className={`w-4 h-4 ${actionConfig.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-800 text-sm">
                        {log.username || 'Sistem'}
                      </span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        log.action === 'login' ? 'text-blue-700 bg-blue-50' :
                        log.action === 'delete' ? 'text-red-700 bg-red-50' :
                        log.action === 'create' ? 'text-green-700 bg-green-50' :
                        log.action === 'update' ? 'text-amber-700 bg-amber-50' :
                        log.action === 'import' ? 'text-purple-700 bg-purple-50' :
                        log.action === 'export' ? 'text-indigo-700 bg-indigo-50' :
                        'text-gray-700 bg-gray-50'
                      }`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                      {entityLabel && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          {entityLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {log.description || '-'}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(log.created_at)}
                      </span>
                      {log.ip_address && (
                        <span className="flex items-center gap-1">
                          <Monitor className="w-3 h-3" />
                          {log.ip_address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
