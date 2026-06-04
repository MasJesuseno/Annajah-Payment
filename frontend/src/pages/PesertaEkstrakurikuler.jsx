import { useState, useEffect } from 'react'
import { getSemuaPesertaEkstrakurikuler, getKelas, getEkstrakurikuler, exportExcelPesertaEkstrakurikuler } from '../api'
import { Medal, Search, Users, FileDown } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PesertaEkstrakurikuler() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [kelasList, setKelasList] = useState([])
  const [filterKelas, setFilterKelas] = useState('')
  const [ekskulList, setEkskulList] = useState([])
  const [filterEkskul, setFilterEkskul] = useState('')

  useEffect(() => { loadData(); loadKelas(); loadEkskul() }, [])

  const loadData = async () => {
    try {
      const params = {}
      if (search) params.search = search
      if (filterKelas) params.kelas = filterKelas
      if (filterEkskul) params.ekskul = filterEkskul
      const res = await getSemuaPesertaEkstrakurikuler(params)
      setData(res.data)
    } catch {
      toast.error('Gagal memuat data peserta')
    } finally {
      setLoading(false)
    }
  }

  const loadKelas = async () => {
    try {
      const res = await getKelas()
      setKelasList(res.data)
    } catch {}
  }

  const loadEkskul = async () => {
    try {
      const res = await getEkstrakurikuler()
      setEkskulList(res.data.filter(e => e.status === 'Aktif'))
    } catch {}
  }

  const handleSearch = (q) => {
    setSearch(q)
    setLoading(true)
  }

  const handleExportExcel = async () => {
    try {
      const params = {}
      if (search) params.search = search
      if (filterKelas) params.kelas = filterKelas
      if (filterEkskul) params.ekskul = filterEkskul
      const res = await exportExcelPesertaEkstrakurikuler(params)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'peserta_ekstrakurikuler.xlsx'
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Excel berhasil didownload')
    } catch {
      toast.error('Gagal export Excel')
    }
  }

  // Debounced search: hanya trigger loadData saat filter benar-benar berubah
  useEffect(() => {
    if (search || filterKelas || filterEkskul) {
      const timer = setTimeout(() => loadData(), 300)
      return () => clearTimeout(timer)
    }
  }, [search, filterKelas, filterEkskul])

  if (loading && data.length === 0) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-annajah-600"></div></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Users className="w-6 h-6 text-annajah-600" />
          Peserta Ekstrakurikuler
        </h1>
        <p className="text-gray-500 text-sm mt-1">Daftar siswa dan ekstrakurikuler yang diikuti</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-2xl font-bold text-gray-800">{data.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Siswa</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-annajah-600">
            {data.reduce((sum, s) => sum + (parseInt(s.jumlah_ekskul) || 0), 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Total Pendaftaran</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-emerald-600">
            {data.filter(s => parseInt(s.jumlah_ekskul) > 0).length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Siswa Terdaftar</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-gray-400">
            {data.filter(s => parseInt(s.jumlah_ekskul) === 0).length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Belum Terdaftar</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Cari siswa..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field sm:w-48"
          value={filterKelas}
          onChange={e => { setFilterKelas(e.target.value); setLoading(true) }}
        >
          <option value="">Semua Kelas</option>
          {kelasList.map(k => (
            <option key={k.id} value={k.id}>{k.nama_kelas}</option>
          ))}
        </select>
        <select
          className="input-field sm:w-56"
          value={filterEkskul}
          onChange={e => { setFilterEkskul(e.target.value); setLoading(true) }}
        >
          <option value="">Semua Ekstrakurikuler</option>
          {ekskulList.map(e => (
            <option key={e.id} value={e.id}>{e.nama}</option>
          ))}
        </select>
        <button onClick={handleExportExcel} className="btn-secondary flex items-center gap-2 whitespace-nowrap">
          <FileDown className="w-4 h-4" />
          Export Excel
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Nama Siswa</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">NIS</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Kelas</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Ekstrakurikuler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map(siswa => {
                const ekskul = typeof siswa.ekstrakurikuler === 'string'
                  ? JSON.parse(siswa.ekstrakurikuler)
                  : (siswa.ekstrakurikuler || [])
                return (
                  <tr key={siswa.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-800">{siswa.nama}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500 font-mono">{siswa.nis}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {siswa.nama_kelas ? (
                        <span className="text-sm text-gray-500">{siswa.nama_kelas}</span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {ekskul.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">Belum terdaftar</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {ekskul.map(e => (
                            <span
                              key={e.id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                e.status === 'Aktif'
                                  ? 'bg-annajah-100 text-annajah-700'
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              <Medal className="w-3 h-3" />
                              {e.nama}
                              <span className="text-[10px] opacity-70">
                                {e.hari.slice(0, 3)} {e.jam_mulai?.slice(0, 5)}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {data.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Tidak ada data ditemukan</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
