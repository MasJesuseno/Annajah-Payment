import { useState, useEffect } from 'react'
import { getRekapBk } from '../api'
import {
  HeartHandshake, Users, Activity, BarChart3, ChevronRight, RefreshCw,
  Calendar, User, BookOpen, TrendingUp
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'

export default function RekapBimbinganKonseling() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await getRekapBk()
      setData(res.data)
    } catch {
      toast.error('Gagal memuat rekap BK')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-annajah-600"></div></div>
  }

  const ringkasan = data?.ringkasan || {}
  const perBulan = data?.per_bulan || []
  const topSiswa = data?.top_siswa || []

  const bulanNames = {
    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
    '05': 'Mei', '06': 'Jun', '07': 'Jul', '08': 'Agu',
    '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Des'
  }

  const chartData = perBulan.map(item => {
    const [, month] = item.bulan.split('-')
    return {
      label: bulanNames[month] || item.bulan,
      jumlah: item.jumlah,
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-annajah-50 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-annajah-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Rekap Bimbingan Konseling</h1>
            <p className="text-gray-500 text-sm mt-0.5">Statistik dan ringkasan data BK</p>
          </div>
        </div>
        <button onClick={loadData} className="btn-secondary text-sm flex items-center gap-2 self-start">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary Cards — selalu tampil */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card bg-gradient-to-br from-annajah-50 to-white border border-annajah-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <HeartHandshake className="w-4 h-4 text-annajah-600" />
            <span className="text-xs font-medium text-annajah-700">Total Catatan BK</span>
          </div>
          <p className="text-2xl font-bold text-annajah-700">{ringkasan.total_catatan || 0}</p>
          <p className="text-xs text-gray-400 mt-0.5">seluruh riwayat BK</p>
        </div>
        <div className="card bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">Total Siswa</span>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{ringkasan.total_siswa || 0}</p>
          <p className="text-xs text-gray-400 mt-0.5">siswa pernah dibimbing</p>
        </div>
        <div className="card bg-gradient-to-br from-blue-50 to-white border border-blue-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Rata-rata</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">
            {ringkasan.total_siswa > 0
              ? (ringkasan.total_catatan / ringkasan.total_siswa).toFixed(1)
              : 0}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">catatan per siswa</p>
        </div>
        <div className="card bg-gradient-to-br from-purple-50 to-white border border-purple-100 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-700">Bulan Ini</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">
            {(() => {
              const now = new Date()
              const bln = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
              const item = perBulan.find(p => p.bulan === bln)
              return item?.jumlah || 0
            })()}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">catatan bulan berjalan</p>
        </div>
      </div>

      {/* Konten: hanya tampil jika ada data */}
      {ringkasan.total_catatan === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <HeartHandshake className="w-14 h-14 mb-3 opacity-20" />
          <p className="text-sm font-medium text-gray-500">Belum ada data bimbingan konseling</p>
          <p className="text-xs text-gray-300 mt-1">Input data BK terlebih dahulu untuk melihat statistik</p>
        </div>
      ) : (
        <>
          {/* Chart: Tren Bulanan */}
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <Calendar className="w-5 h-5 text-annajah-600" />
              <h3 className="font-semibold text-gray-800 text-sm">Tren BK Bulanan (12 Bulan)</h3>
            </div>

            <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="bg-white shadow-xl border border-gray-100 rounded-xl p-3">
                          <p className="text-xs font-semibold text-gray-800 mb-1">{label}</p>
                          <p className="text-sm font-bold text-annajah-600">
                            {payload[0].value} catatan
                          </p>
                        </div>
                      )
                    }}
                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  />
                  <Bar dataKey="jumlah" fill="#e11d48" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Siswa */}
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-annajah-600" />
                <h3 className="font-semibold text-gray-800 text-sm">Siswa dengan BK Terbanyak</h3>
              </div>
              <span className="text-xs text-gray-400">Top {topSiswa.length}</span>
            </div>

            <div className="space-y-2">
              {topSiswa.map((s, i) => (
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
                    <span className="text-xs text-gray-400">catatan</span>
                  </div>
                  {/* Mini bar */}
                  <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden shrink-0 hidden sm:block">
                    <div className="h-full bg-gradient-to-r from-annajah-400 to-annajah-600 rounded-full transition-all"
                      style={{ width: `${Math.min((s.jumlah / topSiswa[0].jumlah) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
