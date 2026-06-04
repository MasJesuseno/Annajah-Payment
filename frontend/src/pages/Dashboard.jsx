import { useState, useEffect, useRef } from 'react'
import { getDashboard, getKehadiranTren, getPpdbStatistik, getKehadiranGuruTrend, getKehadiranGuruRingkasan } from '../api'
import { Users, DollarSign, CalendarCheck, TrendingUp, ArrowUp, Receipt, School, CheckCircle, XCircle, Clock, UserCheck, UserX, Activity, BarChart3, UserPlus, Briefcase } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, PieChart, Pie, Cell } from 'recharts'

// ─── Animated Counter ───
function AnimatedCounter({ value, prefix = '', suffix = '', duration = 1000 }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const startTime = Date.now()
    const numVal = typeof value === 'number' ? value : parseInt(String(value).replace(/\D/g, '')) || 0

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * numVal))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value, duration])

  const formatted = display.toLocaleString('id-ID')
  return <span>{prefix}{formatted}{suffix}</span>
}

// ─── Custom Tooltip ───
const CustomBarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const data = payload[0].payload
  return (
    <div className="bg-white shadow-xl border border-gray-100 rounded-xl p-3 min-w-[160px]">
      <p className="text-sm font-semibold text-gray-800 mb-1">{label}</p>
      <div className="space-y-1">
        <p className="text-xs text-gray-500">
          Total: <span className="font-semibold text-annajah-600">
            Rp {data.total.toLocaleString('id-ID')}
          </span>
        </p>
        <p className="text-xs text-gray-500">
          Transaksi: <span className="font-semibold text-blue-600">{data.jumlah_transaksi}x</span>
        </p>
      </div>
    </div>
  )
}

const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white shadow-xl border border-gray-100 rounded-xl p-3 min-w-[160px]">
      <p className="text-sm font-semibold text-gray-800 mb-1">{d.name}</p>
      <p className="text-xs text-gray-500">
        Total: <span className="font-semibold text-annajah-600">
          Rp {d.value.toLocaleString('id-ID')}
        </span>
      </p>
      <p className="text-xs text-gray-400">
        {d.payload.jumlah_transaksi} transaksi
      </p>
    </div>
  )
}

// ─── Skeleton Loader ───
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
}

function StatCardSkeleton() {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-12 w-12 rounded-lg" />
      </div>
    </div>
  )
}

// ─── Colors ───
const CHART_COLORS = ['#16a34a', '#2563eb', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#6366f1']

// ─── Stat Cards ───
const ppdbStatCards = [
  { key: 'total_pendaftar', label: 'Total Pendaftar', icon: Users, color: 'from-annajah-500 to-annajah-600', bg: 'bg-annajah-50', textColor: 'text-annajah-600' },
  { key: 'menunggu', label: 'Menunggu', icon: Clock, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', textColor: 'text-amber-600' },
  { key: 'diterima', label: 'Diterima', icon: CheckCircle, color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', textColor: 'text-emerald-600' },
  { key: 'ditolak', label: 'Ditolak', icon: XCircle, color: 'from-red-500 to-red-600', bg: 'bg-red-50', textColor: 'text-red-600' },
]

const statusCards = [
  { key: 'total_siswa_aktif', label: 'Siswa Aktif', icon: Users, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', textColor: 'text-blue-600', format: 'number' },
  { key: 'pembayaran_hari_ini', label: 'Pembayaran Hari Ini', icon: CalendarCheck, color: 'from-green-500 to-emerald-600', bg: 'bg-green-50', textColor: 'text-green-600', format: 'count' },
  { key: 'pembayaran_bulan_ini', label: 'Pembayaran Bulan Ini', icon: TrendingUp, color: 'from-purple-500 to-violet-600', bg: 'bg-purple-50', textColor: 'text-purple-600', format: 'count' },
  { key: 'total_semua_pembayaran', label: 'Total Pemasukan', icon: DollarSign, color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', textColor: 'text-amber-600', format: 'currency' },
]

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chartYear, setChartYear] = useState(new Date().getFullYear())
  const [hoveredBar, setHoveredBar] = useState(null)
  const [kehadiranTren, setKehadiranTren] = useState(null)
  const [loadingTren, setLoadingTren] = useState(true)
  const [trenPeriode, setTrenPeriode] = useState('weekly')
  const [kehadiranGuruTren, setKehadiranGuruTren] = useState(null)
  const [loadingGuruTren, setLoadingGuruTren] = useState(true)
  const [guruTrenPeriode, setGuruTrenPeriode] = useState('weekly')
  const [ppdbStats, setPpdbStats] = useState(null)
  const [loadingPpdb, setLoadingPpdb] = useState(true)
  const [ppdbChartYear, setPpdbChartYear] = useState(new Date().getFullYear())
  const [guruRingkasan, setGuruRingkasan] = useState(null)
  const [loadingGuruRingkasan, setLoadingGuruRingkasan] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [chartYear])

  useEffect(() => {
    loadKehadiranTren()
  }, [trenPeriode])

  useEffect(() => {
    loadKehadiranGuruTren()
  }, [guruTrenPeriode])

  useEffect(() => {
    loadPpdbStatistik()
  }, [ppdbChartYear])

  useEffect(() => {
    loadGuruRingkasan()
  }, [])

  const loadGuruRingkasan = async () => {
    try {
      setLoadingGuruRingkasan(true)
      const res = await getKehadiranGuruRingkasan()
      setGuruRingkasan(res.data)
    } catch {
      setGuruRingkasan(null)
    } finally {
      setLoadingGuruRingkasan(false)
    }
  }

  const loadPpdbStatistik = async () => {
    try {
      setLoadingPpdb(true)
      const res = await getPpdbStatistik({ tahun: ppdbChartYear })
      setPpdbStats(res.data)
    } catch (error) {
      console.error('PPDB stats error:', error)
      setPpdbStats(null)
    } finally {
      setLoadingPpdb(false)
    }
  }

  const getPpdbStatValue = (key) => {
    if (!ppdbStats) return 0
    switch (key) {
      case 'total_pendaftar': return ppdbStats.total_pendaftar
      case 'menunggu': return ppdbStats.status?.menunggu || 0
      case 'diterima': return ppdbStats.status?.diterima || 0
      case 'ditolak': return ppdbStats.status?.ditolak || 0
      default: return 0
    }
  }

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const res = await getDashboard({ tahun: chartYear })
      setDashboard(res.data)
    } catch (error) {
      console.error('Dashboard error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadKehadiranGuruTren = async () => {
    try {
      setLoadingGuruTren(true)
      const res = await getKehadiranGuruTrend({ periode: guruTrenPeriode })
      setKehadiranGuruTren(res.data)
    } catch {
      setKehadiranGuruTren(null)
    } finally {
      setLoadingGuruTren(false)
    }
  }

  const loadKehadiranTren = async () => {
    try {
      setLoadingTren(true)
      const res = await getKehadiranTren({ periode: trenPeriode })
      setKehadiranTren(res.data)
    } catch {
      setKehadiranTren(null)
    } finally {
      setLoadingTren(false)
    }
  }

  const formatRupiah = (value) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)

  const getStatValue = (key) => {
    if (!dashboard) return 0
    switch (key) {
      case 'total_siswa_aktif': return dashboard.total_siswa_aktif
      case 'pembayaran_hari_ini': return dashboard.pembayaran_hari_ini?.count || 0
      case 'pembayaran_bulan_ini': return dashboard.pembayaran_bulan_ini?.count || 0
      case 'total_semua_pembayaran': return dashboard.total_semua_pembayaran?.total || 0
      default: return 0
    }
  }

  const getStatSubtext = (key) => {
    if (!dashboard) return ''
    switch (key) {
      case 'pembayaran_hari_ini':
        return `Rp ${(dashboard.pembayaran_hari_ini?.total || 0).toLocaleString('id-ID')}`
      case 'pembayaran_bulan_ini':
        return `Rp ${(dashboard.pembayaran_bulan_ini?.total || 0).toLocaleString('id-ID')}`
      default: return ''
    }
  }

  const getStatChange = (key) => {
    // Simple comparison: month-ago vs current
    if (!dashboard || !dashboard.pembayaran_per_bulan) return null
    const currentMonth = new Date().getMonth()
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const curr = dashboard.pembayaran_per_bulan[currentMonth]?.total || 0
    const prev = dashboard.pembayaran_per_bulan[prevMonth]?.total || 0
    if (prev === 0) return null
    const pct = ((curr - prev) / prev) * 100
    return { value: pct, positive: pct >= 0 }
  }

  // ─── Loading State ───
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    )
  }

  const pembayaranPerBulan = dashboard?.pembayaran_per_bulan || []
  const pembayaranPerJenis = dashboard?.pembayaran_per_jenis || []
  const sppBulanIni = dashboard?.spp_bulan_ini || 0
  const totalSiswa = dashboard?.total_siswa_aktif || 1
  const sppProgress = totalSiswa > 0 ? Math.round((sppBulanIni / totalSiswa) * 100) : 0

  // Find month with highest total
  const maxTotal = Math.max(...pembayaranPerBulan.map(d => d.total), 0)
  const totalTahunIni = pembayaranPerBulan.reduce((s, d) => s + d.total, 0)

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Ringkasan data pembayaran SMA Annajah</p>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span>Live</span>
          <span className="text-gray-300">|</span>
          <span className="hidden sm:inline">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          <span className="sm:hidden">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statusCards.map((card) => {
          const Icon = card.icon
          const value = getStatValue(card.key)
          const subtext = getStatSubtext(card.key)
          const change = getStatChange(card.key)

          return (
            <div key={card.key} className="card group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                  <p className={`text-2xl font-bold text-gray-800`}>
                    {card.format === 'currency' ? (
                      <AnimatedCounter value={value} prefix="Rp " />
                    ) : (
                      <AnimatedCounter value={value} suffix={card.format === 'count' ? 'x' : ''} />
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    {subtext && <p className="text-xs text-gray-400">{subtext}</p>}
                    {change && (
                      <span className={`flex items-center gap-0.5 text-xs font-medium ${change.positive ? 'text-green-600' : 'text-red-500'}`}>
                        <ArrowUp className={`w-3 h-3 ${!change.positive && 'rotate-180'}`} />
                        {Math.abs(change.value).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className={`${card.bg} p-3 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-6 h-6 ${card.textColor}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Ringkasan Pemasukan & Pengeluaran ── */}
      <div className="card">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Ringkasan Pemasukan &amp; Pengeluaran</h3>
            <p className="text-xs text-gray-400 mt-0.5">Perbandingan transaksi Masuk dan Keluar</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : dashboard?.ringkasan_jenis ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Hari Ini */}
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Hari Ini</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                    <ArrowUp className="w-3.5 h-3.5" /> Pemasukan
                  </span>
                  <span className="text-sm font-bold text-emerald-700">
                    Rp {dashboard.ringkasan_jenis.hari_ini.masuk.total.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-red-500">
                    <ArrowUp className="w-3.5 h-3.5 rotate-180" /> Pengeluaran
                  </span>
                  <span className="text-sm font-bold text-red-600">
                    Rp {dashboard.ringkasan_jenis.hari_ini.keluar.total.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Transaksi</span>
                    <span className="font-semibold text-gray-700">
                      {dashboard.ringkasan_jenis.hari_ini.masuk.count} Masuk / {dashboard.ringkasan_jenis.hari_ini.keluar.count} Keluar
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bulan Ini */}
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Bulan Ini</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                    <ArrowUp className="w-3.5 h-3.5" /> Pemasukan
                  </span>
                  <span className="text-sm font-bold text-emerald-700">
                    Rp {dashboard.ringkasan_jenis.bulan_ini.masuk.total.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-red-500">
                    <ArrowUp className="w-3.5 h-3.5 rotate-180" /> Pengeluaran
                  </span>
                  <span className="text-sm font-bold text-red-600">
                    Rp {dashboard.ringkasan_jenis.bulan_ini.keluar.total.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Transaksi</span>
                    <span className="font-semibold text-gray-700">
                      {dashboard.ringkasan_jenis.bulan_ini.masuk.count} Masuk / {dashboard.ringkasan_jenis.bulan_ini.keluar.count} Keluar
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Semua Waktu */}
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Semua Waktu</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                    <ArrowUp className="w-3.5 h-3.5" /> Pemasukan
                  </span>
                  <span className="text-sm font-bold text-emerald-700">
                    Rp {dashboard.ringkasan_jenis.semua.masuk.total.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-red-500">
                    <ArrowUp className="w-3.5 h-3.5 rotate-180" /> Pengeluaran
                  </span>
                  <span className="text-sm font-bold text-red-600">
                    Rp {dashboard.ringkasan_jenis.semua.keluar.total.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Transaksi</span>
                    <span className="font-semibold text-gray-700">
                      {dashboard.ringkasan_jenis.semua.masuk.count} Masuk / {dashboard.ringkasan_jenis.semua.keluar.count} Keluar
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Mini bar perbandingan */}
        {dashboard?.ringkasan_jenis?.semua && (dashboard.ringkasan_jenis.semua.masuk.total + dashboard.ringkasan_jenis.semua.keluar.total) > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>Pemasukan</span>
              <span>Pengeluaran</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
              {dashboard.ringkasan_jenis.semua.masuk.total > 0 && (
                <div
                  className={`h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700 ${
                    dashboard.ringkasan_jenis.semua.keluar.total > 0 ? 'rounded-l-full' : 'rounded-full'
                  }`}
                  style={{
                    width: `${(dashboard.ringkasan_jenis.semua.masuk.total / (dashboard.ringkasan_jenis.semua.masuk.total + dashboard.ringkasan_jenis.semua.keluar.total)) * 100}%`,
                  }}
                />
              )}
              {dashboard.ringkasan_jenis.semua.keluar.total > 0 && (
                <div
                  className={`h-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-700 ${
                    dashboard.ringkasan_jenis.semua.masuk.total > 0 ? 'rounded-r-full' : 'rounded-full'
                  }`}
                  style={{
                    width: `${(dashboard.ringkasan_jenis.semua.keluar.total / (dashboard.ringkasan_jenis.semua.masuk.total + dashboard.ringkasan_jenis.semua.keluar.total)) * 100}%`,
                  }}
                />
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
              <span>{((dashboard.ringkasan_jenis.semua.masuk.total / (dashboard.ringkasan_jenis.semua.masuk.total + dashboard.ringkasan_jenis.semua.keluar.total)) * 100).toFixed(1)}%</span>
              <span className="font-medium text-gray-500">
                Selisih: Rp {(dashboard.ringkasan_jenis.semua.masuk.total - dashboard.ringkasan_jenis.semua.keluar.total).toLocaleString('id-ID')}
              </span>
              <span>{((dashboard.ringkasan_jenis.semua.keluar.total / (dashboard.ringkasan_jenis.semua.masuk.total + dashboard.ringkasan_jenis.semua.keluar.total)) * 100).toFixed(1)}%</span>
            </div>
          </div>
        )}

        {/* ── Grafik Perbandingan Pemasukan vs Pengeluaran per Bulan ── */}
        {dashboard?.pembayaran_per_bulan_jenis?.some(d => d.pemasukan > 0 || d.pengeluaran > 0) && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-100 to-red-100 flex items-center justify-center">
                <BarChart3 className="w-4 h-5 text-gray-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 text-sm">Grafik Perbandingan per Bulan</h4>
                <p className="text-xs text-gray-400 mt-0.5">Pemasukan vs Pengeluaran ({chartYear})</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dashboard.pembayaran_per_bulan_jenis} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  tickFormatter={(val) => `${(val / 1000000).toFixed(val >= 1000000 ? 1 : 0)}jt`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0]?.payload
                    return (
                      <div className="bg-white shadow-xl border border-gray-100 rounded-xl p-3 min-w-[180px]">
                        <p className="text-xs font-semibold text-gray-800 mb-2">{label}</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5">
                              <ArrowUp className="w-3 h-3 text-emerald-500" /> Pemasukan
                            </span>
                            <span className="font-semibold text-emerald-700">Rp {d.pemasukan.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5">
                              <ArrowUp className="w-3 h-3 text-red-500 rotate-180" /> Pengeluaran
                            </span>
                            <span className="font-semibold text-red-600">Rp {d.pengeluaran.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="pt-2 border-t border-gray-100 mt-2">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-gray-600">Selisih</span>
                              <span className={d.pemasukan - d.pengeluaran >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                                Rp {Math.abs(d.pemasukan - d.pengeluaran).toLocaleString('id-ID')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }}
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                />
                <Bar dataKey="pemasukan" name="Pemasukan" fill="#16a34a" radius={[4,4,0,0]} maxBarSize={32} stackId="a" />
                <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#ef4444" radius={[4,4,0,0]} maxBarSize={32} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex items-center justify-center gap-8 mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span>Pemasukan (Masuk)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-3 h-3 rounded-sm bg-red-500" />
                <span>Pengeluaran (Keluar)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Ringkasan Kehadiran Guru ── */}
      <div className="card">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Ringkasan Kehadiran Karyawan</h3>
            <p className="text-xs text-gray-400 mt-0.5">Statistik absensi karyawan hari ini & rata-rata</p>
          </div>
        </div>
        {loadingGuruRingkasan ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : guruRingkasan ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Hadir Hari Ini */}
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-emerald-600">Hadir Hari Ini</span>
                <UserCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-gray-800">{guruRingkasan.hadir_hari_ini}</p>
              <p className="text-[11px] text-gray-400 mt-1">
                {guruRingkasan.persentase_hari_ini}% dari {guruRingkasan.total_guru} guru
              </p>
            </div>

            {/* Belum Absen Keluar */}
            <div className="p-4 bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-amber-600">Belum Keluar</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-gray-800">{guruRingkasan.belum_keluar_hari_ini || 0}</p>
              <p className="text-[11px] text-gray-400 mt-1">Sudah absen masuk</p>
            </div>

            {/* Belum Absen */}
            <div className="p-4 bg-gradient-to-br from-red-50 to-white rounded-xl border border-red-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-red-500">Belum Absen</span>
                <UserX className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-2xl font-bold text-gray-800">{guruRingkasan.belum_absen}</p>
              <p className="text-[11px] text-gray-400 mt-1">Karyawan tanpa absen hari ini</p>
            </div>

            {/* Rata-rata Harian */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-white rounded-xl border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-blue-600">Rata-rata / Hari</span>
                <Activity className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-gray-800">
                {guruRingkasan.rata_rata_harian}
                <span className="text-sm font-normal text-gray-400 ml-0.5">karyawan</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                30 hari terakhir · {guruRingkasan.rata_rata_mingguan} (minggu ini)
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* Bar Chart: Monthly Payments */}
        <div className="lg:col-span-4 card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800">Tren Pembayaran Tahunan</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Total: <span className="font-semibold text-annajah-600">{formatRupiah(totalTahunIni)}</span>
              </p>
            </div>
            <select
              className="input-field w-auto text-sm py-1.5 px-3"
              value={chartYear}
              onChange={e => setChartYear(parseInt(e.target.value))}
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {pembayaranPerBulan.some(d => d.total > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={pembayaranPerBulan}
                margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                onMouseMove={(e) => {
                  if (e?.activeTooltipIndex !== undefined) {
                    setHoveredBar(e.activeTooltipIndex)
                  }
                }}
                onMouseLeave={() => setHoveredBar(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                  tickFormatter={(val) => `${(val / 1000000).toFixed(val >= 1000000 ? 1 : 0)}jt`} />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(22, 163, 74, 0.08)' }} />
                <Bar
                  dataKey="total"
              fill="#16a34a"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                >
                  {pembayaranPerBulan.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.total === maxTotal && entry.total > 0 ? '#166534' : '#16a34a'}
                      opacity={hoveredBar === null || hoveredBar === index ? 1 : 0.5}
                    />
                  ))}
                </Bar>
                {/* Line overlay for trend */}
                <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={false} opacity={0.4} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
              <TrendingUp className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Belum ada data transaksi di tahun {chartYear}</p>
              <p className="text-xs text-gray-300 mt-1">Transaksi akan muncul di grafik setelah dicatat</p>
            </div>
          )}
        </div>

        {/* Donut Chart: Payment Distribution */}
        <div className="lg:col-span-3 card">
          <div>
            <h3 className="font-semibold text-gray-800">Distribusi Bulan Ini</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {pembayaranPerJenis.length} jenis pembayaran
            </p>
          </div>

          {pembayaranPerJenis.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pembayaranPerJenis}
                    cx="50%" cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="total"
                    nameKey="nama_pembayaran"
                  >
                    {pembayaranPerJenis.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]}
                        stroke="white" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="w-full grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                {pembayaranPerJenis.slice(0, 6).map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-gray-600 truncate">{item.nama_pembayaran}</span>
                  </div>
                ))}
              </div>
              {pembayaranPerJenis.length > 6 && (
                <p className="text-[10px] text-gray-400 mt-1">+{pembayaranPerJenis.length - 6} lainnya</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
              <svg className="w-12 h-12 mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <p className="text-sm">Belum ada data bulan ini</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Kehadiran Trend Chart ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-semibold text-gray-800">Tren Kehadiran</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {loadingTren ? 'Memuat...' : (
                  <>
                    Total: <span className="font-semibold text-annajah-600">
                      {kehadiranTren?.grand_total?.total || 0} records
                    </span>
                    {' '}(Hadir: {kehadiranTren?.grand_total?.hadir || 0}, 
                    Ijin: {kehadiranTren?.grand_total?.ijin || 0}, 
                    Sakit: {kehadiranTren?.grand_total?.sakit || 0}, 
                    Alpa: {kehadiranTren?.grand_total?.alpa || 0})
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setTrenPeriode('weekly')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  trenPeriode === 'weekly'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Mingguan
              </button>
              <button
                onClick={() => setTrenPeriode('monthly')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  trenPeriode === 'monthly'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Bulanan
              </button>
            </div>
          </div>
        </div>

        {loadingTren ? (
          <Skeleton className="h-[280px] w-full" />
        ) : kehadiranTren?.data?.length > 0 && kehadiranTren.data.some(d => d.total > 0) ? (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={kehadiranTren.data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0]?.payload
                    return (
                      <div className="bg-white shadow-xl border border-gray-100 rounded-xl p-3 min-w-[180px]">
                        <p className="text-xs font-semibold text-gray-800 mb-2">{label}</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                            <span className="text-gray-500">Hadir:</span>
                            <span className="font-semibold text-gray-800 ml-auto">{d?.hadir || 0}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                            <span className="text-gray-500">Ijin:</span>
                            <span className="font-semibold text-gray-800 ml-auto">{d?.ijin || 0}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                            <span className="text-gray-500">Sakit:</span>
                            <span className="font-semibold text-gray-800 ml-auto">{d?.sakit || 0}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                            <span className="text-gray-500">Alpa:</span>
                            <span className="font-semibold text-gray-800 ml-auto">{d?.alpa || 0}</span>
                          </div>
                          <div className="border-t border-gray-100 pt-1.5 mt-1.5">
                            <div className="flex items-center gap-2 text-xs font-semibold">
                              <span className="text-gray-600">Total:</span>
                              <span className="text-gray-900 ml-auto">{d?.total || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }}
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                />
                <Bar dataKey="hadir" stackId="a" fill="#22c55e" radius={[0,0,0,0]} maxBarSize={32} />
                <Bar dataKey="ijin" stackId="a" fill="#eab308" radius={[0,0,0,0]} maxBarSize={32} />
                <Bar dataKey="sakit" stackId="a" fill="#3b82f6" radius={[0,0,0,0]} maxBarSize={32} />
                <Bar dataKey="alpa" stackId="a" fill="#ef4444" radius={[4,4,0,0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-2 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <UserCheck className="w-3.5 h-3.5 text-green-500" />
                <span>Hadir</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5 text-yellow-500" />
                <span>Ijin</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Activity className="w-3.5 h-3.5 text-blue-500" />
                <span>Sakit</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <UserX className="w-3.5 h-3.5 text-red-500" />
                <span>Alpa</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[280px] text-gray-400">
            <CalendarCheck className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Belum ada data kehadiran</p>
            <p className="text-xs text-gray-300 mt-1">Data kehadiran akan muncul setelah dicatat</p>
          </div>
        )}
      </div>

      {/* ── Tren Kehadiran Guru ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Tren Kehadiran Karyawan</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {loadingGuruTren ? 'Memuat...' : (
                  <>
                    Total: <span className="font-semibold text-amber-600">
                      {kehadiranGuruTren?.grand_total?.total || 0} records
                    </span>
                    {' '}(Hadir: {kehadiranGuruTren?.grand_total?.hadir || 0})
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setGuruTrenPeriode('weekly')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                guruTrenPeriode === 'weekly'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Mingguan
            </button>
            <button
              onClick={() => setGuruTrenPeriode('monthly')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                guruTrenPeriode === 'monthly'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Bulanan
            </button>
          </div>
        </div>

        {loadingGuruTren ? (
          <Skeleton className="h-[260px] w-full" />
        ) : kehadiranGuruTren?.data?.length > 0 && kehadiranGuruTren.data.some(d => d.total > 0) ? (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={kehadiranGuruTren.data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0]?.payload
                    return (
                      <div className="bg-white shadow-xl border border-gray-100 rounded-xl p-3 min-w-[160px]">
                        <p className="text-xs font-semibold text-gray-800 mb-2">{label}</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span className="text-gray-500">Hadir:</span>
                            <span className="font-semibold text-gray-800 ml-auto">{d?.hadir || 0}</span>
                          </div>

                          <div className="border-t border-gray-100 pt-1.5 mt-1.5">
                            <div className="flex items-center gap-2 text-xs font-semibold">
                              <span className="text-gray-600">Total:</span>
                              <span className="text-gray-900 ml-auto">{d?.total || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }}
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                />
                <Bar dataKey="hadir" stackId="a" fill="#10b981" radius={[4,4,0,0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-2 pt-3 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Hadir</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[260px] text-gray-400">
            <Clock className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Belum ada data kehadiran karyawan</p>
            <p className="text-xs text-gray-300 mt-1">Data akan muncul setelah karyawan melakukan absen</p>
          </div>
        )}
      </div>

      {/* ── PPDB Statistics ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-annajah-100 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-annajah-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Statistik PPDB</h3>
              <p className="text-xs text-gray-400 mt-0.5">Pendaftaran peserta didik baru</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="input-field w-auto text-sm py-1.5 px-3"
              value={ppdbChartYear}
              onChange={e => setPpdbChartYear(parseInt(e.target.value))}
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* PPDB Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ppdbStatCards.map((card) => {
            const Icon = card.icon
            const value = getPpdbStatValue(card.key)
            return (
              <div key={card.key} className="card group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{card.label}</p>
                    {loadingPpdb ? (
                      <Skeleton className="h-6 w-12 mt-1" />
                    ) : (
                      <p className="text-xl font-bold text-gray-800 mt-0.5">
                        <AnimatedCounter value={value} />
                      </p>
                    )}
                  </div>
                  <div className={`${card.bg} p-2.5 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-5 h-5 ${card.textColor}`} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* PPDB Charts Row */}
        {!loadingPpdb && ppdbStats ? (
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
            {/* Chart: Pendaftar per Bulan */}
            <div className="lg:col-span-4 card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-gray-800 text-sm">Pendaftar per Bulan</h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Total: <span className="font-semibold text-annajah-600">{ppdbStats.pendaftar_per_bulan.reduce((s, d) => s + d.total, 0)} pendaftar</span>
                  </p>
                </div>
                <BarChart3 className="w-5 h-5 text-gray-300" />
              </div>
              {ppdbStats.pendaftar_per_bulan.some(d => d.total > 0) ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={ppdbStats.pendaftar_per_bulan} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="bulan" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div className="bg-white shadow-xl border border-gray-100 rounded-xl p-3">
                            <p className="text-xs font-semibold text-gray-800 mb-1">{label}</p>
                            <p className="text-xs text-gray-500">
                              Pendaftar: <span className="font-semibold text-annajah-600">{payload[0].value} orang</span>
                            </p>
                          </div>
                        )
                      }}
                      cursor={{ fill: 'rgba(22, 163, 74, 0.08)' }}
                    />
                    <Bar dataKey="total" fill="#16a34a" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[260px] text-gray-400">
                  <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">Belum ada pendaftar di tahun {ppdbChartYear}</p>
                </div>
              )}
            </div>

            {/* Chart: Pendaftar per Hari (30 hari) */}
            <div className="lg:col-span-3 card">
              <div className="mb-4">
                <h4 className="font-semibold text-gray-800 text-sm">30 Hari Terakhir</h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Total: <span className="font-semibold text-annajah-600">{ppdbStats.pendaftar_per_hari.reduce((s, d) => s + d.total, 0)} pendaftar</span>
                </p>
              </div>
              {ppdbStats.pendaftar_per_hari.some(d => d.total > 0) ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={ppdbStats.pendaftar_per_hari} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 8, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={3} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div className="bg-white shadow-xl border border-gray-100 rounded-xl p-3">
                            <p className="text-xs font-semibold text-gray-800 mb-1">{label}</p>
                            <p className="text-xs text-gray-500">
                              Pendaftar: <span className="font-semibold text-annajah-600">{payload[0].value} orang</span>
                            </p>
                          </div>
                        )
                      }}
                      cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
                    />
                    <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[260px] text-gray-400">
                  <BarChart3 className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">Belum ada pendaftar dalam 30 hari terakhir</p>
                </div>
              )}
            </div>

            {/* Recent 5 Pendaftar */}
            <div className="lg:col-span-7 card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-gray-800 text-sm">Pendaftar Terbaru</h4>
                  <p className="text-xs text-gray-400 mt-0.5">5 pendaftar terakhir</p>
                </div>
                <UserPlus className="w-5 h-5 text-gray-300" />
              </div>
              {ppdbStats.pendaftar_terbaru?.length > 0 ? (
                <div className="space-y-2">
                  {ppdbStats.pendaftar_terbaru.map((p, idx) => {
                    const statusStyle = p.status === 'diterima' ? 'text-emerald-600 bg-emerald-50' :
                      p.status === 'ditolak' ? 'text-red-500 bg-red-50' : 'text-amber-600 bg-amber-50'
                    return (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-200 hover:pl-4 group cursor-default" style={{ animationDelay: `${idx * 50}ms` }}>
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-full bg-annajah-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                            <UserPlus className="w-4 h-4 text-annajah-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{p.nama_lengkap}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span className="font-mono">{p.no_pendaftaran}</span>
                              <span>•</span>
                              <span>{new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                            </div>
                          </div>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ml-3 ${statusStyle}`}>
                          {p.status === 'diterima' ? 'Diterima' : p.status === 'ditolak' ? 'Ditolak' : 'Menunggu'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                  <UserPlus className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">Belum ada pendaftar</p>
                </div>
              )}
            </div>
          </div>
        ) : loadingPpdb ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-[300px]" />
            <Skeleton className="h-[300px]" />
          </div>
        ) : null}
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-4 card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800">Transaksi Terbaru</h3>
              <p className="text-xs text-gray-400 mt-0.5">5 transaksi terakhir</p>
            </div>
            <Receipt className="w-5 h-5 text-gray-300" />
          </div>

          {dashboard?.transaksi_terbaru?.length > 0 ? (
            <div className="space-y-2">
              {dashboard.transaksi_terbaru.map((trx, idx) => (
                <div
                  key={trx.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-200 hover:pl-4 group cursor-default"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-annajah-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Receipt className="w-4 h-4 text-annajah-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{trx.nama_siswa}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{trx.nama_pembayaran}</span>
                        <span>•</span>
                        <span>{new Date(trx.tanggal_bayar).toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-semibold text-annajah-600">
                      Rp {parseInt(trx.jumlah_bayar).toLocaleString('id-ID')}
                    </p>
                    <p className="text-[10px] text-gray-300">{trx.no_kwitansi}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <Receipt className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">Belum ada transaksi</p>
            </div>
          )}
        </div>

        {/* SPP Progress + Stats */}
        <div className="lg:col-span-3 card">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Status SPP Bulan Ini</h3>
                <p className="text-xs text-gray-400 mt-0.5">Siswa yang sudah membayar SPP</p>
              </div>
              <div className="w-10 h-10 bg-annajah-100 rounded-xl flex items-center justify-center">
                <School className="w-5 h-5 text-annajah-600" />
              </div>
            </div>
          </div>

          {/* Progress Ring */}
          <div className="flex items-center justify-center my-6">
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#f0f0f0" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke="#16a34a"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - sppProgress / 100)}`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-800">{sppProgress}%</span>
                <span className="text-xs text-gray-400 mt-0.5">terbayar</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-green-50 rounded-xl">
              <div className="flex items-center gap-1.5 text-green-600 mb-1">
                <CheckCircle className="w-4 h-4" />
                <span className="text-xs font-medium">Lunas</span>
              </div>
              <p className="text-xl font-bold text-gray-800">{sppBulanIni}</p>
              <p className="text-[10px] text-gray-400">siswa</p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl">
              <div className="flex items-center gap-1.5 text-red-500 mb-1">
                <XCircle className="w-4 h-4" />
                <span className="text-xs font-medium">Belum</span>
              </div>
              <p className="text-xl font-bold text-gray-800">{totalSiswa - sppBulanIni}</p>
              <p className="text-[10px] text-gray-400">siswa</p>
            </div>
          </div>

          {/* Mini bar */}
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-annajah-400 to-annajah-600 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${sppProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
