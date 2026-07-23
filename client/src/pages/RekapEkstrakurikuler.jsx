import { useState, useEffect } from 'react'
import { getRekapEkstrakurikuler, exportExcelRekapEkstrakurikuler } from '../api'
import { Medal, Users, ChevronDown, ChevronUp, FileDown, BarChart3, Clock, CalendarDays, Phone, Activity } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RekapEkstrakurikuler() {
  const [data, setData] = useState([])
  const [ringkasan, setRingkasan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const res = await getRekapEkstrakurikuler()
      setData(res.data.data || [])
      setRingkasan(res.data.ringkasan || null)
    } catch {
      toast.error('Gagal memuat rekap')
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = async () => {
    setExporting(true)
    try {
      const res = await exportExcelRekapEkstrakurikuler()
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'rekap_ekstrakurikuler.xlsx'
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Excel berhasil didownload')
    } catch {
      toast.error('Gagal export Excel')
    } finally {
      setExporting(false)
    }
  }

  const hariOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

  const groupedByHari = {}
  data.forEach(e => {
    if (!groupedByHari[e.hari]) groupedByHari[e.hari] = []
    groupedByHari[e.hari].push(e)
  })

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-annajah-600"></div></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-annajah-50 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-annajah-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Rekap Peserta Ekstrakurikuler</h1>
            <p className="text-gray-500 text-sm mt-0.5">Ringkasan peserta per ekstrakurikuler</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="btn-secondary text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" /> Refresh
          </button>
          <button onClick={handleExportExcel} disabled={exporting}
            className="btn-secondary flex items-center gap-2">
            <FileDown className="w-4 h-4" />
            {exporting ? 'Mengexport...' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {ringkasan && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card bg-gradient-to-br from-annajah-50 to-white border border-annajah-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Medal className="w-4 h-4 text-annajah-600" />
              <span className="text-xs font-medium text-annajah-700">Total Ekskul</span>
            </div>
            <p className="text-2xl font-bold text-annajah-700">{ringkasan.total_ekskul}</p>
          </div>
          <div className="card bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700">Aktif</span>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{ringkasan.total_aktif}</p>
          </div>
          <div className="card bg-gradient-to-br from-gray-50 to-white border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-medium text-gray-600">Tidak Aktif</span>
            </div>
            <p className="text-2xl font-bold text-gray-500">{ringkasan.total_tidak_aktif}</p>
          </div>
          <div className="card bg-gradient-to-br from-blue-50 to-white border border-blue-100 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Total Peserta</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{ringkasan.total_peserta}</p>
          </div>
        </div>
      )}

      {/* Per Hari */}
      {hariOrder.map(hari => {
        const items = groupedByHari[hari]
        if (!items || items.length === 0) return null
        return (
          <div key={hari}>
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="w-4 h-4 text-annajah-600" />
              <h3 className="font-semibold text-gray-800 text-sm">{hari}</h3>
              <span className="text-xs text-gray-400">({items.length} ekskul)</span>
            </div>
            <div className="space-y-3">
              {items.map(ekskul => (
                <div key={ekskul.id} className={`card overflow-hidden transition-all duration-200 ${
                  ekskul.status !== 'Aktif' ? 'opacity-60' : ''
                }`}>
                  {/* Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                    onClick={() => setExpandedId(expandedId === ekskul.id ? null : ekskul.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        ekskul.status === 'Aktif' ? 'bg-annajah-50' : 'bg-gray-100'
                      }`}>
                        <Medal className={`w-5 h-5 ${
                          ekskul.status === 'Aktif' ? 'text-annajah-600' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-gray-800 text-sm truncate">{ekskul.nama}</h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Users className="w-3 h-3" /> {ekskul.jumlah_peserta} peserta
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {ekskul.jam_mulai?.slice(0, 5)}-{ekskul.jam_selesai?.slice(0, 5)}
                          </span>
                          {ekskul.kontak_pelatih && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {ekskul.kontak_pelatih}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        ekskul.status === 'Aktif'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {ekskul.status}
                      </span>
                      {ekskul.peserta.length > 0 ? (
                        <span className="text-xs font-bold text-annajah-600 bg-annajah-50 px-2.5 py-0.5 rounded-full">
                          {ekskul.peserta.length}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                      {expandedId === ekskul.id ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded: Daftar Peserta */}
                  {expandedId === ekskul.id && (
                    <div className="border-t border-gray-100">
                      {ekskul.peserta.length === 0 ? (
                        <div className="px-4 py-6 text-center text-gray-400 text-sm">
                          Belum ada peserta terdaftar
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">No</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">NIS</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Nama Siswa</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Kelas</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Tanggal Daftar</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {ekskul.peserta.map((p, i) => (
                                <tr key={p.peserta_id} className="hover:bg-annajah-50/30 transition-colors">
                                  <td className="px-4 py-2 text-xs text-gray-400">{i + 1}</td>
                                  <td className="px-4 py-2 text-sm text-gray-500 font-mono">{p.nis}</td>
                                  <td className="px-4 py-2 text-sm font-medium text-gray-800">{p.nama_siswa}</td>
                                  <td className="px-4 py-2 text-sm text-gray-500">{p.nama_kelas || '-'}</td>
                                  <td className="px-4 py-2 text-sm text-gray-500">
                                    {p.tanggal_daftar ? new Date(p.tanggal_daftar).toLocaleDateString('id-ID') : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <BarChart3 className="w-14 h-14 mb-3 opacity-20" />
          <p className="text-sm font-medium text-gray-500">Belum ada data ekstrakurikuler</p>
          <p className="text-xs text-gray-300 mt-1">Tambah data ekstrakurikuler terlebih dahulu</p>
        </div>
      )}
    </div>
  )
}
