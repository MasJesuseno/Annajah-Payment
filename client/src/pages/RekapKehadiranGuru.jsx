import { useState, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight, Calendar, Clock, MapPin,
  CheckCircle, XCircle, RefreshCw, Users, BarChart3, Info
} from 'lucide-react'
import { getRekapKehadiranGuru } from '../api'
import { parseGpsData } from '../utils/formatGps'

const statusColors = {
  hadir: 'bg-green-100 text-green-700 border-green-200',
  ijin: 'bg-amber-100 text-amber-700 border-amber-200',
  alpa: 'bg-red-100 text-red-700 border-red-200',
}

const statusDotColors = {
  hadir: 'bg-green-500',
  ijin: 'bg-amber-500',
  alpa: 'bg-red-500',
}

function formatTanggal(tgl) {
  if (!tgl) return '-'
  const d = new Date(tgl)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month - 1, 1).getDay()
}

export default function RekapKehadiranGuru() {
  const now = new Date()
  const [bulan, setBulan] = useState(now.getMonth() + 1)
  const [tahun, setTahun] = useState(now.getFullYear())
  const [data, setData] = useState([])
  const [ringkasan, setRingkasan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)

  const hariNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
  const bulanNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]

  const loadData = async (b, t) => {
    try {
      setLoading(true)
      const res = await getRekapKehadiranGuru({ bulan: b || bulan, tahun: t || tahun })
      setData(res.data.hari || [])
      setRingkasan(res.data.ringkasan || null)
    } catch (err) {
      console.error(err)
      setData([])
      setRingkasan(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(bulan, tahun)
  }, [bulan, tahun])

  const prevMonth = () => {
    if (bulan === 1) {
      setBulan(12)
      setTahun(tahun - 1)
    } else {
      setBulan(bulan - 1)
    }
    setSelectedDay(null)
  }

  const nextMonth = () => {
    if (bulan === 12) {
      setBulan(1)
      setTahun(tahun + 1)
    } else {
      setBulan(bulan + 1)
    }
    setSelectedDay(null)
  }

  const getDayData = (day) => {
    const dateStr = `${tahun}-${String(bulan).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return data.find(d => d.tanggal === dateStr)
  }

  const daysInMonth = getDaysInMonth(tahun, bulan)
  const firstDay = getFirstDayOfMonth(tahun, bulan)
  const today = new Date()

  // Build calendar grid
  const calendarDays = []
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-annajah-50 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-annajah-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Rekap Kehadiran Karyawan</h1>
            <p className="text-gray-500 text-sm mt-0.5">Tampilan kalender rekap absensi karyawan per bulan</p>
          </div>
        </div>
        <button onClick={() => loadData(bulan, tahun)} className="btn-secondary text-sm flex items-center gap-2 self-start">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {ringkasan && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="card bg-gradient-to-br from-emerald-50 to-white border border-emerald-100">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700">Total Hadir</span>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{ringkasan.total_hadir}</p>
          </div>
          <div className="card bg-gradient-to-br from-amber-50 to-white border border-amber-100">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">Total Ijin</span>
            </div>
            <p className="text-2xl font-bold text-amber-700">{ringkasan.total_ijin}</p>
          </div>
          <div className="card bg-gradient-to-br from-red-50 to-white border border-red-100">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-xs font-medium text-red-700">Total Alpa</span>
            </div>
            <p className="text-2xl font-bold text-red-700">{ringkasan.total_alpa}</p>
          </div>
          <div className="card bg-gradient-to-br from-blue-50 to-white border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Rata-rata / Hari</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{ringkasan.rata_rata_harian}</p>
          </div>
          <div className="card bg-gradient-to-br from-purple-50 to-white border border-purple-100">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-medium text-purple-700">Kehadiran</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{ringkasan.persentase_kehadiran}%</p>
          </div>
        </div>
      )}

      {/* Calendar Card */}
      <div className="card overflow-hidden">
        {/* Month Navigation */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl hover:bg-gray-100 transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
          <h2 className="text-lg font-bold text-gray-800">
            {bulanNames[bulan - 1]} {tahun}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl hover:bg-gray-100 transition-all"
          >
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-5 py-2 bg-gray-50/50 border-b border-gray-100 text-xs">
          <span className="text-gray-500 font-medium flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Hadir
          </span>
          <span className="text-gray-500 font-medium flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Ijin
          </span>
          <span className="text-gray-500 font-medium flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Alpa
          </span>
          <span className="text-gray-400 ml-auto">
            <Info className="w-3 h-3 inline mr-0.5" />
            Klik tanggal untuk detail
          </span>
        </div>

        {loading ? (
          <div className="p-6">
            <div className="grid grid-cols-7 gap-1.5">
              {hariNames.map(h => (
                <div key={h} className="h-8 bg-gray-100 rounded animate-pulse" />
              ))}
              {[...Array(35)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-50 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3 sm:p-5">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1.5 mb-2">
              {hariNames.map(h => (
                <div key={h} className="text-center text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider py-1">
                  {h}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="aspect-square" />
                }

                const dayData = getDayData(day)
                const isToday =
                  day === today.getDate() &&
                  bulan === today.getMonth() + 1 &&
                  tahun === today.getFullYear()
                const isSelected = selectedDay === day

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`
                      aspect-square rounded-xl p-1 sm:p-2 flex flex-col items-center justify-start sm:justify-center gap-0.5
                      transition-all duration-150 border-2
                      ${isSelected
                        ? 'border-annajah-500 bg-annajah-50 shadow-sm ring-2 ring-annajah-200'
                        : isToday
                          ? 'border-annajah-300 bg-annajah-50/50'
                          : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    <span className={`
                      text-xs sm:text-sm font-semibold leading-tight
                      ${isToday ? 'text-annajah-700' : 'text-gray-700'}
                      ${isSelected ? 'text-annajah-700' : ''}
                    `}>
                      {day}
                    </span>
                    {dayData ? (
                      <div className="flex items-center gap-0.5 mt-auto sm:mt-0.5">
                        {dayData.hadir > 0 && (
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500" title={`Hadir: ${dayData.hadir}`} />
                        )}
                        {dayData.ijin > 0 && (
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500" title={`Ijin: ${dayData.ijin}`} />
                        )}
                        {dayData.alpa > 0 && (
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500" title={`Alpa: ${dayData.alpa}`} />
                        )}
                      </div>
                    ) : (
                      <span className="text-[8px] text-gray-300 mt-auto sm:mt-0.5">-</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected Day Detail */}
      {selectedDay && (() => {
        const dateStr = `${tahun}-${String(bulan).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
        const dayData = data.find(d => d.tanggal === dateStr)

        return (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-annajah-600" />
                <h3 className="font-semibold text-gray-800">{formatTanggal(dateStr)}</h3>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-all"
              >
                Tutup
              </button>
            </div>

            {!dayData || dayData.detail.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <XCircle className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm font-medium text-gray-500">Tidak ada data kehadiran</p>
                <p className="text-xs text-gray-300 mt-1">Belum ada catatan absensi untuk tanggal ini</p>
              </div>
            ) : (
              <>
                {/* Day Summary Pills */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                    Hadir: {dayData.hadir}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                    Ijin: {dayData.ijin}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                    Alpa: {dayData.alpa}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {ringkasan?.total_guru} guru
                  </span>
                </div>

                {/* Detail Table */}
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  {/* Desktop Header */}
                  <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2.5 bg-gray-50 rounded-xl text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <div className="col-span-3">Nama Guru</div>
                    <div className="col-span-2">Jam Masuk</div>
                    <div className="col-span-2">Jam Keluar</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-3">GPS</div>
                  </div>

                  <div className="divide-y divide-gray-50 mt-2">
                    {dayData.detail.map((guru) => (
                      <div key={guru.id_guru} className="grid grid-cols-12 gap-4 px-4 py-2.5 hover:bg-annajah-50/40 transition-all rounded-lg items-center">
                        <div className="col-span-12 sm:col-span-3">
                          <span className="text-sm font-medium text-gray-800">{guru.nama_guru}</span>
                        </div>
                        <div className="col-span-6 sm:col-span-2">
                          <span className="flex items-center gap-1 text-sm">
                            {guru.jam_masuk ? (
                              <span className="font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-xs">
                                <Clock className="w-3 h-3 inline mr-0.5" />{guru.jam_masuk}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </span>
                        </div>
                        <div className="col-span-6 sm:col-span-2">
                          {guru.jam_keluar ? (
                            <span className="font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-xs">
                              <Clock className="w-3 h-3 inline mr-0.5" />{guru.jam_keluar}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                        <div className="col-span-6 sm:col-span-2">
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusColors[guru.status] || ''}`}>
                            {guru.status === 'hadir' ? <CheckCircle className="w-3 h-3 inline mr-1 -mt-0.5" /> :
                             guru.status === 'ijin' ? <Clock className="w-3 h-3 inline mr-1 -mt-0.5" /> :
                             <XCircle className="w-3 h-3 inline mr-1 -mt-0.5" />}
                            {guru.status === 'hadir' ? 'Hadir' : guru.status === 'ijin' ? 'Ijin' : 'Alpa'}
                          </span>
                        </div>
                        <div className="col-span-6 sm:col-span-3">
                          <div className="flex flex-col gap-0.5">
                            {(() => {
                              const gps = parseGpsData(guru.gps_masuk)
                              return gps ? (
                                <span className="text-[10px] text-gray-500 truncate" title={gps.lat ? `(${gps.lat}, ${gps.lng})` : ''}>
                                  <MapPin className="w-3 h-3 inline mr-0.5" />{gps.display}
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-400">-</span>
                              )
                            })()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )
      })()}

      {/* Empty State - no selected day & no data */}
      {!selectedDay && !loading && data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Calendar className="w-14 h-14 mb-3 opacity-20" />
          <p className="text-sm font-medium text-gray-500">Belum ada data kehadiran</p>
          <p className="text-xs text-gray-300 mt-1">Belum ada catatan kehadiran karyawan untuk bulan ini</p>
        </div>
      )}
    </div>
  )
}
