import { useState, useEffect } from 'react'
import { Clock, MapPin, Search, RefreshCw, ChevronLeft, ChevronRight, Calendar, CheckCircle, XCircle, FileDown, Camera, CameraOff, LogIn, LogOut } from 'lucide-react'
import { getKehadiranGuruSaya, downloadExcelKehadiranGuru } from '../api'
import { parseGpsData } from '../utils/formatGps'

function formatTanggal(tgl) {
  if (!tgl) return '-'
  const d = new Date(tgl)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatJam(jam) {
  if (!jam) return '-'
  return jam.slice(0, 5)
}

function getStatusKehadiran(item) {
  if (item.jam_masuk) return { label: 'Hadir', color: 'bg-green-100 text-green-700' }
  return { label: 'Alpa', color: 'bg-red-100 text-red-700' }
}

export default function DaftarKehadiranSaya() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [exporting, setExporting] = useState(false)

  // Filters
  const [tanggalAwal, setTanggalAwal] = useState('')
  const [tanggalAkhir, setTanggalAkhir] = useState('')
  const [filterApplied, setFilterApplied] = useState(false)

  const loadData = async (p) => {
    try {
      setLoading(true)
      const params = { page: p || page, per_page: 20 }
      if (tanggalAwal) params.tanggal_awal = tanggalAwal
      if (tanggalAkhir) params.tanggal_akhir = tanggalAkhir
      const res = await getKehadiranGuruSaya(params)
      setData(res.data.data || [])
      setTotal(res.data.total || 0)
      setTotalPages(res.data.total_pages || 1)
      setPage(res.data.page || 1)
    } catch (err) {
      console.error(err)
      setData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(1)
  }, [])

  const handleCari = () => {
    setFilterApplied(true)
    loadData(1)
  }

  const handleReset = () => {
    setTanggalAwal('')
    setTanggalAkhir('')
    setFilterApplied(false)
    loadData(1)
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      const params = { saya: 'true' }
      if (tanggalAwal) params.tanggal_awal = tanggalAwal
      if (tanggalAkhir) params.tanggal_akhir = tanggalAkhir
      const res = await downloadExcelKehadiranGuru(params)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `daftar_kehadiran_saya_${tanggalAwal || 'all'}_${tanggalAkhir || 'all'}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-annajah-50 flex items-center justify-center">
            <Clock className="w-5 h-5 text-annajah-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Daftar Kehadiran Saya</h1>
            <p className="text-gray-500 text-sm mt-0.5">Riwayat absensi dan kehadiran pribadi</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            {exporting ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            {exporting ? 'Mengexport...' : 'Export Excel'}
          </button>
          <button onClick={() => loadData(page)} className="btn-secondary text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div className="flex-1 w-full sm:w-auto">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Tanggal Awal</label>
            <input
              type="date"
              value={tanggalAwal}
              onChange={e => setTanggalAwal(e.target.value)}
              className="input-field w-full sm:w-auto"
            />
          </div>
          <div className="flex-1 w-full sm:w-auto">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Tanggal Akhir</label>
            <input
              type="date"
              value={tanggalAkhir}
              onChange={e => setTanggalAkhir(e.target.value)}
              className="input-field w-full sm:w-auto"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button onClick={handleCari} className="btn-primary text-sm flex items-center gap-2 flex-1 sm:flex-none justify-center">
              <Search className="w-4 h-4" /> Cari
            </button>
            {(tanggalAwal || tanggalAkhir || filterApplied) && (
              <button onClick={handleReset} className="btn-secondary text-sm flex-1 sm:flex-none justify-center">
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info Total */}
      {!loading && total > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="w-4 h-4 text-annajah-500" />
          Menampilkan <span className="font-semibold text-gray-700">{total}</span> data kehadiran
          {filterApplied && ' (difilter)'}
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {/* Desktop Header */}
        <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <div className="col-span-2">Tanggal</div>
          <div className="col-span-2">Jam Masuk</div>
          <div className="col-span-2">Jam Keluar</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-3">Lokasi GPS</div>
          <div className="col-span-1">Foto</div>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 px-5 py-4 animate-pulse">
                <div className="col-span-2 h-4 bg-gray-200 rounded" />
                <div className="col-span-2 h-4 bg-gray-200 rounded" />
                <div className="col-span-2 h-4 bg-gray-200 rounded" />
                <div className="col-span-2 h-4 bg-gray-200 rounded" />
                <div className="col-span-3 h-4 bg-gray-200 rounded" />
                <div className="col-span-1 h-4 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Clock className="w-14 h-14 mb-3 opacity-20" />
            <p className="text-sm font-medium text-gray-500">Belum ada data kehadiran</p>
            <p className="text-xs text-gray-300 mt-1">Lakukan absen untuk mulai mencatat kehadiran</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.map((item) => {
              const status = getStatusKehadiran(item)
              return (
                <div key={item.id} className="grid grid-cols-12 gap-4 px-5 py-3.5 hover:bg-annajah-50/40 transition-all duration-150 items-center">
                  {/* Tanggal */}
                  <div className="col-span-12 sm:col-span-2">
                    <span className="text-sm font-medium text-gray-700">{formatTanggal(item.tanggal)}</span>
                  </div>
                  {/* Jam Masuk */}
                  <div className="col-span-6 sm:col-span-2">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400 sm:hidden" />
                      {item.jam_masuk ? (
                        <span className="text-sm font-medium text-green-700">{formatJam(item.jam_masuk)}</span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </div>
                  </div>
                  {/* Jam Keluar */}
                  <div className="col-span-6 sm:col-span-2">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400 sm:hidden" />
                      {item.jam_keluar ? (
                        <span className="text-sm font-medium text-amber-700">{formatJam(item.jam_keluar)}</span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </div>
                  </div>
                  {/* Status */}
                  <div className="col-span-6 sm:col-span-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.color}`}>
                      {status.label === 'Hadir' ? <CheckCircle className="w-3 h-3 inline mr-1 -mt-0.5" /> : <XCircle className="w-3 h-3 inline mr-1 -mt-0.5" />}
                      {status.label}
                    </span>
                  </div>
                  {/* GPS */}
                  <div className="col-span-6 sm:col-span-3 text-right sm:text-left">
                    <div className="flex flex-col gap-0.5">
                      {(() => {
                        const gpsMasuk = parseGpsData(item.gps_masuk)
                        const gpsKeluar = parseGpsData(item.gps_keluar)
                        return (
                          <>
                            {gpsMasuk ? (
                              <span className="text-[11px] text-gray-500 flex items-center gap-1" title={gpsMasuk.lat ? `(${gpsMasuk.lat}, ${gpsMasuk.lng})` : ''}>
                                <MapPin className="w-3 h-3" /> Masuk: {gpsMasuk.display}
                              </span>
                            ) : (
                              <span className="text-[11px] text-gray-400">-</span>
                            )}
                            {gpsKeluar ? (
                              <span className="text-[11px] text-gray-500 flex items-center gap-1" title={gpsKeluar.lat ? `(${gpsKeluar.lat}, ${gpsKeluar.lng})` : ''}>
                                <MapPin className="w-3 h-3" /> Keluar: {gpsKeluar.display}
                              </span>
                            ) : null}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                  {/* Foto */}
                  <div className="col-span-6 sm:col-span-1 text-right sm:text-left">
                    <div className="flex items-center gap-1.5">
                      {item.foto_masuk ? (
                        <img
                          src={`/uploads/kehadiran-guru/${item.foto_masuk}`}
                          alt="Foto"
                          className="w-7 h-7 rounded-lg object-cover border border-green-200 cursor-pointer"
                          onClick={() => window.open(`/uploads/kehadiran-guru/${item.foto_masuk}`, '_blank')}
                          title="Foto Masuk"
                        />
                      ) : null}
                      {item.foto_keluar ? (
                        <img
                          src={`/uploads/kehadiran-guru/${item.foto_keluar}`}
                          alt="Foto"
                          className="w-7 h-7 rounded-lg object-cover border border-amber-200 cursor-pointer"
                          onClick={() => window.open(`/uploads/kehadiran-guru/${item.foto_keluar}`, '_blank')}
                          title="Foto Keluar"
                        />
                      ) : null}
                      {!item.foto_masuk && !item.foto_keluar && (
                        <CameraOff className="w-3.5 h-3.5 text-gray-300" />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-400">Halaman {page} dari {totalPages} ({total} data)</p>
            <div className="flex items-center gap-2">
              <button onClick={() => loadData(page - 1)} disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                return p > totalPages ? null : (
                  <button key={p} onClick={() => loadData(p)}
                    className={`w-7 h-7 text-xs font-medium rounded-lg transition-all ${p === page ? 'bg-annajah-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>
                    {p}
                  </button>
                )
              })}
              <button onClick={() => loadData(page + 1)} disabled={page >= totalPages}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
