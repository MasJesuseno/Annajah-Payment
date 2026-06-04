import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSiswa, getKelas, getRekapMingguanKehadiran } from '../api'
import { Users, School, BookOpen, ArrowRight, GraduationCap, LayoutDashboard, ClipboardList, ChevronRight, UserCheck, CheckCircle, XCircle, Calendar, Clock, Thermometer, BarChart3 } from 'lucide-react'

// ─── Quick Stat Card ───
function StatCard({ icon: Icon, label, value, color, bg, onClick }) {
  return (
    <button
      onClick={onClick}
      className="card group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 text-left w-full"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={`${bg} p-3 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </button>
  )
}

// ─── Menu Card ───
function MenuCard({ icon: Icon, title, description, color, bg, iconBg, onClick }) {
  return (
    <button
      onClick={onClick}
      className="card group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 text-left w-full overflow-hidden relative"
    >
      {/* Decorative gradient */}
      <div className={`absolute top-0 right-0 w-24 h-24 opacity-5 rounded-full -mr-8 -mt-8 bg-gradient-to-br ${color}`} />

      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 rounded-2xl ${iconBg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
          <Icon className={`w-7 h-7 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-800 text-base">{title}</h3>
          <p className="text-sm text-gray-400 mt-0.5">{description}</p>
        </div>
        <ChevronRight className={`w-5 h-5 ${color} opacity-0 group-hover:opacity-100 transition-all duration-200 -mr-1`} />
      </div>
    </button>
  )
}

export default function GuruDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const guruId = user?.guru_id

  const [totalSiswa, setTotalSiswa] = useState(0)
  const [kelasWali, setKelasWali] = useState([])
  const [siswaPerKelas, setSiswaPerKelas] = useState({})
  const [rekapMingguan, setRekapMingguan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingRekap, setLoadingRekap] = useState(true)

  useEffect(() => {
    if (!guruId) return
    loadData()
    loadRekapMingguan()
  }, [guruId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [siswaRes, kelasRes] = await Promise.all([
        getSiswa({ wali_kelas: guruId }),
        getKelas(),
      ])
      const waliKelas = kelasRes.data.filter(k => Number(k.id_wali) === Number(guruId))
      setKelasWali(waliKelas)

      // Group siswa by id_kelas for per-class counts
      const siswaList = Array.isArray(siswaRes.data) ? siswaRes.data : (siswaRes.data?.data || [])
      setTotalSiswa(siswaList.length)

      const grouped = {}
      for (const s of siswaList) {
        const kelasId = s.id_kelas || 'unknown'
        if (!grouped[kelasId]) {
          grouped[kelasId] = { count: 0, nama_kelas: s.nama_kelas || 'Tanpa Kelas' }
        }
        grouped[kelasId].count++
      }
      setSiswaPerKelas(grouped)
    } catch (error) {
      console.error('Gagal memuat data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRekapMingguan = async () => {
    try {
      setLoadingRekap(true)
      const res = await getRekapMingguanKehadiran(guruId)
      setRekapMingguan(res.data)
    } catch (error) {
      console.error('Gagal memuat rekap kehadiran:', error)
    } finally {
      setLoadingRekap(false)
    }
  }

  if (!guruId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Users className="w-16 h-16 mb-4 opacity-30" />
        <h2 className="text-lg font-semibold text-gray-500">Akun karyawan tidak ditemukan</h2>
        <p className="text-sm mt-1">Hubungi administrator untuk informasi lebih lanjut.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
          Selamat datang, {user?.nama}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Panel khusus karyawan — Kelola siswa di kelas wali Anda
        </p>
      </div>

      {/* ── Class Info Card ── */}
      {kelasWali.length > 0 && (
        <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shrink-0">
              <School className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 flex-wrap">
                <span>Kelas Wali</span>
                <div className="flex flex-wrap gap-1.5">
                  {kelasWali.map(k => (
                    <span
                      key={k.id}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/80 text-blue-700 border border-blue-200 shadow-sm"
                    >
                      <GraduationCap className="w-3 h-3" />
                      {k.nama_kelas}
                      {k.tingkat && (
                        <span className="text-blue-400 font-normal">({k.tingkat})</span>
                      )}
                    </span>
                  ))}
                </div>
              </h2>
              <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {totalSiswa} siswa
                </span>
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4" />
                  {kelasWali.length} kelas
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          icon={Users}
          label="Total Siswa"
          value={totalSiswa}
          color="text-blue-600"
          bg="bg-blue-50"
          onClick={() => navigate('/siswa-wali')}
        />
        <StatCard
          icon={BookOpen}
          label="Kelas Wali"
          value={kelasWali.length}
          color="text-emerald-600"
          bg="bg-emerald-50"
          onClick={() => navigate('/siswa-wali')}
        />
      </div>

      {/* ── Ringkasan Kehadiran Minggu Ini ── */}
      {!loadingRekap && rekapMingguan && rekapMingguan.total_siswa > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base font-semibold text-gray-700">Ringkasan Kehadiran Minggu Ini</h2>
            {rekapMingguan.kelas_wali?.length > 0 && (
              <span className="text-xs text-gray-400 font-normal">
                — {rekapMingguan.kelas_wali.join(', ')}
              </span>
            )}
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="card bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
                <div>
                  <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider">Hadir</p>
                  <p className="text-2xl font-bold text-emerald-700">{rekapMingguan.ringkasan.hadir}</p>
                </div>
              </div>
            </div>
            <div className="card bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-100 p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-amber-500" />
                <div>
                  <p className="text-xs text-amber-600 font-medium uppercase tracking-wider">Ijin</p>
                  <p className="text-2xl font-bold text-amber-700">{rekapMingguan.ringkasan.ijin}</p>
                </div>
              </div>
            </div>
            <div className="card bg-gradient-to-br from-orange-50 to-red-50 border border-orange-100 p-4">
              <div className="flex items-center gap-3">
                <Thermometer className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-xs text-orange-600 font-medium uppercase tracking-wider">Sakit</p>
                  <p className="text-2xl font-bold text-orange-700">{rekapMingguan.ringkasan.sakit}</p>
                </div>
              </div>
            </div>
            <div className="card bg-gradient-to-br from-red-50 to-rose-50 border border-red-100 p-4">
              <div className="flex items-center gap-3">
                <XCircle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-xs text-red-600 font-medium uppercase tracking-wider">Alpa</p>
                  <p className="text-2xl font-bold text-red-700">{rekapMingguan.ringkasan.alpa}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Persentase + Per-day Bar */}
          <div className="card p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Kehadiran per Hari</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs text-gray-500">Hadir</span>
                <div className="w-2 h-2 rounded-full bg-amber-400 ml-1" />
                <span className="text-xs text-gray-500">Ijin</span>
                <div className="w-2 h-2 rounded-full bg-orange-400 ml-1" />
                <span className="text-xs text-gray-500">Sakit</span>
                <div className="w-2 h-2 rounded-full bg-red-400 ml-1" />
                <span className="text-xs text-gray-500">Alpa</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-100">
                <span className="text-sm font-bold text-emerald-700">{rekapMingguan.persentase}%</span>
                <span className="text-xs text-emerald-600">Kehadiran</span>
              </div>
            </div>

            {/* Day Bars */}
            <div className="grid grid-cols-7 gap-2">
              {rekapMingguan.minggu.map((hari) => {
                const totalBar = Math.max(hari.total, 1)
                const hadirPct = (hari.hadir / totalBar) * 100
                const ijinPct = (hari.ijin / totalBar) * 100
                const sakitPct = (hari.sakit / totalBar) * 100
                const alpaPct = (hari.alpa / totalBar) * 100

                return (
                  <div key={hari.tanggal} className="text-center">
                    <p className={`text-xs font-medium mb-1.5 ${
                      hari.is_today ? 'text-blue-600 font-bold' :
                      hari.is_future ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {hari.hari.slice(0, 3)}
                      <br />
                      <span className={`text-[10px] ${hari.is_future ? 'text-gray-200' : 'text-gray-400'}`}>
                        {new Date(hari.tanggal).getDate()}
                      </span>
                    </p>
                    {hari.is_future ? (
                      <div className="h-28 flex items-center justify-center">
                        <span className="text-[10px] text-gray-300">—</span>
                      </div>
                    ) : (
                      <div className="h-28 flex flex-col justify-end">
                        <div className="space-y-0.5">
                          <div
                            className="w-full rounded-t-sm bg-emerald-400 transition-all"
                            style={{ height: `${Math.max(hadirPct * 0.6, 2)}px` }}
                            title={`Hadir: ${hari.hadir}`}
                          />
                          {hari.ijin > 0 && (
                            <div
                              className="w-full bg-amber-400 transition-all"
                              style={{ height: `${Math.max(ijinPct * 0.6, 2)}px` }}
                              title={`Ijin: ${hari.ijin}`}
                            />
                          )}
                          {hari.sakit > 0 && (
                            <div
                              className="w-full bg-orange-400 transition-all"
                              style={{ height: `${Math.max(sakitPct * 0.6, 2)}px` }}
                              title={`Sakit: ${hari.sakit}`}
                            />
                          )}
                          {hari.alpa > 0 && (
                            <div
                              className="w-full bg-red-400 transition-all"
                              style={{ height: `${Math.max(alpaPct * 0.6, 2)}px` }}
                              title={`Alpa: ${hari.alpa}`}
                            />
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {hari.total}/{rekapMingguan.total_siswa}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Loading Ringkasan ── */}
      {loadingRekap && (
        <div className="animate-pulse">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-5 w-5 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-48" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="card p-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-gray-200 rounded" />
                  <div>
                    <div className="h-3 bg-gray-200 rounded w-12 mb-1" />
                    <div className="h-6 bg-gray-200 rounded w-8" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Ringkasan Kelas Wali ── */}
      {kelasWali.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="w-5 h-5 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-700">Ringkasan Kelas Wali</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {kelasWali.map(k => {
              const kelasCount = siswaPerKelas[k.id]?.count || 0
              return (
                <button
                  key={k.id}
                  onClick={() => navigate('/siswa-wali')}
                  className="card group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 text-left w-full relative overflow-hidden"
                >
                  {/* Decorative accent */}
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-indigo-500 rounded-l-lg" />

                  <div className="pl-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center shrink-0 border border-blue-100">
                          <School className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800 text-sm">{k.nama_kelas}</h3>
                          {k.tingkat && (
                            <p className="text-xs text-gray-400">Tingkat {k.tingkat}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">{kelasCount}</p>
                        <p className="text-xs text-gray-400">siswa</p>
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs text-blue-500 font-medium group-hover:underline flex items-center gap-1">
                        Lihat siswa
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Menu Navigasi ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <LayoutDashboard className="w-5 h-5 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-700">Menu</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MenuCard
            icon={ClipboardList}
            title="Daftar Siswa"
            description={`Lihat dan cari data ${totalSiswa} siswa di kelas wali Anda`}
            color="text-blue-600"
            bg="bg-blue-50"
            iconBg="bg-blue-50"
            onClick={() => navigate('/siswa-wali')}
          />
          <MenuCard
            icon={Users}
            title="Profil Saya"
            description="Informasi akun dan data diri Anda"
            color="text-purple-600"
            bg="bg-purple-50"
            iconBg="bg-purple-50"
            onClick={() => navigate('/profil-saya')}
          />
        </div>
      </div>

      {/* ── Loading State ── */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="card animate-pulse">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-20" />
                  <div className="h-7 bg-gray-200 rounded w-12" />
                </div>
                <div className="h-12 w-12 bg-gray-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && kelasWali.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <School className="w-16 h-16 mb-4 opacity-20" />
          <h2 className="text-lg font-semibold text-gray-500">Belum Ada Kelas Wali</h2>
          <p className="text-sm mt-1 text-center max-w-md">
            Anda belum ditetapkan sebagai wali kelas. Silakan hubungi administrator untuk menetapkan kelas yang Anda wali.
          </p>
        </div>
      )}
    </div>
  )
}
