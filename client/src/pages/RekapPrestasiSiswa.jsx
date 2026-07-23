import { useState, useEffect } from 'react'
import { getRekapPrestasiSiswa } from '../api'
import {
  Trophy, Users, Award, TrendingUp, RefreshCw, Calendar,
  User, Building2, BarChart3, Medal
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import toast from 'react-hot-toast'

const COLORS = [
  '#e11d48', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#06b6d4', '#d946ef', '#0ea5e9', '#a855f7', '#22c55e'
]

const bulanNames = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'Mei', '06': 'Jun', '07': 'Jul', '08': 'Agu',
  '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Des'
}

// ─── Tooltip Kustom ───
function CustomTooltip({ active, payload, label, valueLabel = '' }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white shadow-xl border border-gray-100 rounded-xl p-3">
      <p className="text-xs font-semibold text-gray-800 mb-1">{label}</p>
      <p className="text-sm font-bold text-annajah-600">
        {payload[0].value} {valueLabel}
      </p>
    </div>
  )
}

// ─── Card Summary ───
function SummaryCard({ icon: Icon, label, value, subtext, color }) {
  const gradientMap = {
    annajah: 'from-annajah-50 to-white border-annajah-100',
    emerald: 'from-emerald-50 to-white border-emerald-100',
    amber: 'from-amber-50 to-white border-amber-100',
    blue: 'from-blue-50 to-white border-blue-100',
  }
  const labelColorMap = {
    annajah: 'text-annajah-700',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    blue: 'text-blue-700',
  }
  const iconColorMap = {
    annajah: 'text-annajah-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    blue: 'text-blue-600',
  }
  const cls = gradientMap[color] || gradientMap.annajah
  const labelCls = labelColorMap[color] || labelColorMap.annajah
  const iconCls = iconColorMap[color] || iconColorMap.annajah

  return (
    <div className={`card bg-gradient-to-br ${cls} p-4`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${iconCls}`} />
        <span className={`text-xs font-medium ${labelCls}`}>{label}</span>
      </div>
      <p className={`text-2xl font-bold ${iconCls}`}>{value}</p>
      {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
    </div>
  )
}

export default function RekapPrestasiSiswa() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await getRekapPrestasiSiswa()
      setData(res.data)
    } catch {
      toast.error('Gagal memuat rekap prestasi')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-annajah-600"></div></div>
  }

  const ringkasan = data?.ringkasan || {}
  const perBulan = data?.per_bulan || []
  const jenisPrestasi = data?.jenis_prestasi || []
  const topSiswa = data?.top_siswa || []
  const topPenyelenggara = data?.top_penyelenggara || []

  // Data untuk chart bulanan
  const chartBulan = perBulan.map(item => {
    const month = item.bulan.split('-')[1]
    return {
      label: bulanNames[month] || item.bulan,
      jumlah: item.jumlah,
    }
  })

  // Data pie chart untuk jenis prestasi
  const pieData = jenisPrestasi.map(item => ({
    name: item.prestasi,
    value: item.jumlah,
  }))

  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  const bulanIni = perBulan.find(p => p.bulan === currentMonth)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-annajah-50 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-annajah-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Rekap Prestasi Siswa</h1>
            <p className="text-gray-500 text-sm mt-0.5">Statistik dan ringkasan prestasi siswa</p>
          </div>
        </div>
        <button onClick={loadData} className="btn-secondary text-sm flex items-center gap-2 self-start">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          icon={Trophy} label="Total Prestasi" value={ringkasan.total_prestasi || 0}
          subtext="seluruh prestasi" color="annajah"
        />
        <SummaryCard
          icon={Users} label="Siswa Berprestasi" value={ringkasan.total_siswa || 0}
          subtext="siswa meraih prestasi" color="emerald"
        />
        <SummaryCard
          icon={Award} label="Jenis Prestasi" value={ringkasan.total_prestasi > 0 ? jenisPrestasi.length : 0}
          subtext="prestasi unik" color="amber"
        />
        <SummaryCard
          icon={TrendingUp} label="Bulan Ini" value={bulanIni?.jumlah || 0}
          subtext="prestasi bulan berjalan" color="blue"
        />
      </div>

      {ringkasan.total_prestasi === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Trophy className="w-14 h-14 mb-3 opacity-20" />
          <p className="text-sm font-medium text-gray-500">Belum ada data prestasi siswa</p>
          <p className="text-xs text-gray-300 mt-1">Input data prestasi terlebih dahulu untuk melihat statistik</p>
        </div>
      ) : (
        <>
          {/* Row: Chart Bulanan + Pie Jenis Prestasi */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Tren Bulanan */}
            <div className="card lg:col-span-2">
              <div className="flex items-center gap-2 mb-5">
                <Calendar className="w-5 h-5 text-annajah-600" />
                <h3 className="font-semibold text-gray-800 text-sm">Tren Prestasi Bulanan (12 Bulan)</h3>
              </div>
              <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartBulan} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip valueLabel="prestasi" />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                    <Bar dataKey="jumlah" fill="#e11d48" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie: Jenis Prestasi */}
            <div className="card">
              <div className="flex items-center gap-2 mb-5">
                <Medal className="w-5 h-5 text-annajah-600" />
                <h3 className="font-semibold text-gray-800 text-sm">Distribusi Jenis Prestasi</h3>
              </div>
              <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                {pieData.length === 0 ? (
                  <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">
                    Belum ada data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip valueLabel="prestasi" />} />
                      <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => (
                          <span className="text-xs text-gray-600">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Row: Top Siswa + Top Penyelenggara */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Siswa Berprestasi */}
            <div className="card">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-annajah-600" />
                  <h3 className="font-semibold text-gray-800 text-sm">Siswa dengan Prestasi Terbanyak</h3>
                </div>
                <span className="text-xs text-gray-400">Top {topSiswa.length}</span>
              </div>
              <div className="space-y-2">
                {topSiswa.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">Belum ada data</div>
                ) : topSiswa.map((s, i) => (
                  <div key={s.id_siswa}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-annajah-50/40 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                      ${i === 0 ? 'bg-amber-100 text-amber-700' :
                        i === 1 ? 'bg-gray-100 text-gray-600' :
                        i === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-annajah-50 text-annajah-600'}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{s.nama_siswa}</p>
                      <p className="text-xs text-gray-400 font-mono">{s.nis} {s.nama_kelas ? `· ${s.nama_kelas}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-annajah-600">{s.jumlah}</span>
                      <span className="text-xs text-gray-400">prestasi</span>
                    </div>
                    <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden shrink-0 hidden sm:block">
                      <div className="h-full bg-gradient-to-r from-annajah-400 to-annajah-600 rounded-full transition-all"
                        style={{ width: `${Math.min((s.jumlah / (topSiswa[0]?.jumlah || 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Penyelenggara */}
            <div className="card">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-annajah-600" />
                  <h3 className="font-semibold text-gray-800 text-sm">Penyelenggara Terbanyak</h3>
                </div>
                <span className="text-xs text-gray-400">Top {topPenyelenggara.length}</span>
              </div>
              <div className="space-y-2">
                {topPenyelenggara.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">Belum ada data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(200, topPenyelenggara.length * 44)}>
                    <BarChart
                      data={topPenyelenggara.map(item => ({ name: item.penyelenggara, jumlah: item.jumlah }))}
                      layout="vertical"
                      margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={130}
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip valueLabel="prestasi" />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                      <Bar dataKey="jumlah" fill="#10b981" radius={[0, 6, 6, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
