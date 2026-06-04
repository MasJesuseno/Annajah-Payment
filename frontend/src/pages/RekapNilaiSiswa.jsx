import { useState, useEffect } from 'react'
import { getRekapNilaiSiswa, getPeriodePenilaian } from '../api'
import {
  BarChart3, RefreshCw, Users, GraduationCap, TrendingUp, Award,
  Filter, School, Target, BookOpen
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'

export default function RekapNilaiSiswa() {
  const [data, setData] = useState(null)
  const [periodeList, setPeriodeList] = useState([])
  const [filterPeriode, setFilterPeriode] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPeriode()
  }, [])

  useEffect(() => {
    loadData()
  }, [filterPeriode])

  const loadPeriode = async () => {
    try {
      const res = await getPeriodePenilaian()
      setPeriodeList(res.data || [])
    } catch { /* ignore */ }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const params = {}
      if (filterPeriode) params.id_periode = filterPeriode
      const res = await getRekapNilaiSiswa(params)
      setData(res.data)
    } catch {
      toast.error('Gagal memuat rekap nilai')
    } finally {
      setLoading(false)
    }
  }

  // Chart data
  const chartData = data?.per_kelas?.map(k => ({
    label: k.nama_kelas,
    'Rata-rata': k.rata_rata,
    Tuntas: k.tuntas,
  })) || []

  if (loading && !data) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Rekap Nilai Siswa</h1>
            <p className="text-gray-500 text-sm mt-0.5">Ringkasan nilai akademik per kelas</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select className="input-field pl-10 py-2 text-sm" value={filterPeriode}
              onChange={e => setFilterPeriode(e.target.value)}>
              <option value="">Semua Periode</option>
              {periodeList.map(p => <option key={p.id} value={p.id}>{p.periode}</option>)}
            </select>
          </div>
          <button onClick={loadData} className="btn-secondary text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {data?.ringkasan?.total_nilai === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <BookOpen className="w-14 h-14 mb-3 opacity-20" />
          <p className="text-sm font-medium text-gray-500">Belum ada data nilai</p>
          <p className="text-xs text-gray-300 mt-1">Input nilai siswa terlebih dahulu untuk melihat rekap</p>
        </div>
      ) : (
        <>
          {data?.ringkasan && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="card bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-medium text-indigo-700">Total Data Nilai</span>
                  </div>
                  <p className="text-2xl font-bold text-indigo-700">{data.ringkasan.total_nilai}</p>
                  <p className="text-xs text-gray-400 mt-0.5">seluruh data nilai</p>
                </div>
                <div className="card bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-700">Total Siswa</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">{data.ringkasan.total_siswa}</p>
                  <p className="text-xs text-gray-400 mt-0.5">siswa memiliki nilai</p>
                </div>
                <div className="card bg-gradient-to-br from-amber-50 to-white border border-amber-100 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-medium text-amber-700">Rata-rata Nilai</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-700">{data.ringkasan.rata_rata}</p>
                  <p className="text-xs text-gray-400 mt-0.5">dari semua nilai</p>
                </div>
                <div className="card bg-gradient-to-br from-blue-50 to-white border border-blue-100 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700">Ketuntasan</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">
                    {data.ringkasan.total_nilai > 0
                      ? ((data.ringkasan.tuntas / data.ringkasan.total_nilai) * 100).toFixed(1)
                      : 0}%
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{data.ringkasan.tuntas} tuntas dari {data.ringkasan.total_nilai}</p>
                </div>
              </div>

              {/* Chart */}
              {chartData.length > 0 && (
                <div className="card">
                  <div className="flex items-center gap-2 mb-5">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-semibold text-gray-800 text-sm">Rata-rata Nilai per Kelas</h3>
                  </div>
                  <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null
                            return (
                              <div className="bg-white shadow-xl border border-gray-100 rounded-xl p-3">
                                <p className="text-xs font-semibold text-gray-800 mb-1">{label}</p>
                                {payload.map((p, i) => (
                                  <p key={i} className="text-sm font-bold" style={{ color: p.color }}>
                                    {p.name}: {p.value}
                                  </p>
                                ))}
                              </div>
                            )
                          }}
                          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                        />
                        <Bar dataKey="Rata-rata" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={36} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Table per Kelas */}
              <div className="card p-0 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <School className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-gray-800 text-sm">Rekap Nilai per Kelas</h3>
                  <span className="text-xs text-gray-400 ml-auto">{data?.per_kelas?.length || 0} kelas</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">Kelas</th>
                        <th className="table-header text-center">Jumlah Siswa</th>
                        <th className="table-header text-center">Total Nilai</th>
                        <th className="table-header text-center">Rata-rata</th>
                        <th className="table-header text-center hidden sm:table-cell">Min</th>
                        <th className="table-header text-center hidden sm:table-cell">Max</th>
                        <th className="table-header text-center">Tuntas</th>
                        <th className="table-header text-center">Belum</th>
                        <th className="table-header text-center hidden md:table-cell">Ketuntasan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.per_kelas?.map((k, i) => {
                        const pct = k.jumlah_nilai > 0 ? ((k.tuntas / k.jumlah_nilai) * 100).toFixed(1) : 0
                        return (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="table-cell">
                              <div className="flex items-center gap-2">
                                <School className="w-4 h-4 text-indigo-400" />
                                <span className="font-medium text-sm">{k.nama_kelas}</span>
                              </div>
                            </td>
                            <td className="table-cell text-center text-sm text-gray-600">{k.jumlah_siswa}</td>
                            <td className="table-cell text-center text-sm text-gray-600">{k.jumlah_nilai}</td>
                            <td className="table-cell text-center">
                              <span className={`text-sm font-bold ${k.rata_rata >= 75 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {k.rata_rata}
                              </span>
                            </td>
                            <td className="table-cell text-center hidden sm:table-cell text-sm text-gray-500">{k.nilai_min}</td>
                            <td className="table-cell text-center hidden sm:table-cell text-sm text-gray-500">{k.nilai_max}</td>
                            <td className="table-cell text-center">
                              <span className="text-sm font-medium text-emerald-600">{k.tuntas}</span>
                            </td>
                            <td className="table-cell text-center">
                              <span className="text-sm font-medium text-red-600">{k.belum_tuntas}</span>
                            </td>
                            <td className="table-cell text-center hidden md:table-cell">
                              <div className="flex items-center gap-2 justify-center">
                                <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all"
                                    style={{ width: `${Math.min(pct, 100)}%` }} />
                                </div>
                                <span className="text-xs font-medium text-gray-500">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card p-4 flex items-center gap-3">
                  <Target className="w-8 h-8 text-emerald-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Tuntas</p>
                    <p className="text-lg font-bold text-emerald-600">{data.ringkasan.tuntas}</p>
                    <p className="text-xs text-gray-400">
                      {data.ringkasan.total_nilai > 0
                        ? `(${((data.ringkasan.tuntas / data.ringkasan.total_nilai) * 100).toFixed(1)}%)`
                        : ''}
                    </p>
                  </div>
                </div>
                <div className="card p-4 flex items-center gap-3">
                  <Target className="w-8 h-8 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Belum Tuntas</p>
                    <p className="text-lg font-bold text-red-600">{data.ringkasan.belum_tuntas}</p>
                    <p className="text-xs text-gray-400">
                      {data.ringkasan.total_nilai > 0
                        ? `(${((data.ringkasan.belum_tuntas / data.ringkasan.total_nilai) * 100).toFixed(1)}%)`
                        : ''}
                    </p>
                  </div>
                </div>
                <div className="card p-4 flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-indigo-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Nilai Tertinggi</p>
                    <p className="text-lg font-bold text-indigo-600">{data.ringkasan.nilai_max}</p>
                    <p className="text-xs text-gray-400">Terendah: {data.ringkasan.nilai_min}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
