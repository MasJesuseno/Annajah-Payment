import { useState, useEffect } from 'react'
import { getBimbinganKonseling, deleteBimbinganKonseling, getSiswa, exportExcelBk } from '../api'
import { Search, HeartHandshake, Plus, Edit2, Trash2, X, Filter, FileDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function DaftarBimbinganKonseling() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSiswa, setFilterSiswa] = useState('')
  const [filterTanggalMulai, setFilterTanggalMulai] = useState('')
  const [filterTanggalSelesai, setFilterTanggalSelesai] = useState('')
  const [siswaList, setSiswaList] = useState([])

  useEffect(() => {
    loadSiswa()
    loadData()
  }, [])

  const loadSiswa = async () => {
    try {
      const res = await getSiswa({ per_page: 9999 })
      setSiswaList(res.data.data || res.data || [])
    } catch { /* ignore */ }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const params = {}
      if (search) params.search = search
      if (filterSiswa) params.id_siswa = filterSiswa
      if (filterTanggalMulai) params.tanggal_mulai = filterTanggalMulai
      if (filterTanggalSelesai) params.tanggal_selesai = filterTanggalSelesai
      const res = await getBimbinganKonseling(params)
      setData(res.data)
    } catch {
      toast.error('Gagal memuat data BK')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    loadData()
  }

  const handleExportExcel = async () => {
    try {
      const params = {}
      if (search) params.search = search
      if (filterSiswa) params.id_siswa = filterSiswa
      if (filterTanggalMulai) params.tanggal_mulai = filterTanggalMulai
      if (filterTanggalSelesai) params.tanggal_selesai = filterTanggalSelesai
      const res = await exportExcelBk(params)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `data_bk_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Data BK berhasil diexport')
    } catch {
      toast.error('Gagal mengexport data BK')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus data BK ini?')) return
    try {
      await deleteBimbinganKonseling(id)
      toast.success('Data BK berhasil dihapus')
      loadData()
    } catch {
      toast.error('Gagal menghapus data BK')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Daftar Bimbingan Konseling</h1>
          <p className="text-gray-500 text-sm mt-1">Riwayat bimbingan konseling siswa</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportExcel} className="btn-secondary flex items-center gap-2">
            <FileDown className="w-4 h-4" /> Export
          </button>
          <Link to="/bimbingan-konseling/input" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Input BK
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" className="input-field pl-10" placeholder="Cari nama siswa atau NIS..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="w-full sm:w-52 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select className="input-field pl-10" value={filterSiswa}
              onChange={e => setFilterSiswa(e.target.value)}>
              <option value="">Semua Siswa</option>
              {siswaList.map(s => <option key={s.id} value={s.id}>{s.nama} ({s.nis})</option>)}
            </select>
          </div>
          <div className="w-full sm:w-44">
            <input type="date" className="input-field" value={filterTanggalMulai}
              onChange={e => setFilterTanggalMulai(e.target.value)}
              placeholder="Dari tanggal" />
          </div>
          <div className="w-full sm:w-44">
            <input type="date" className="input-field" value={filterTanggalSelesai}
              onChange={e => setFilterTanggalSelesai(e.target.value)}
              placeholder="Sampai tanggal" />
          </div>
          <button type="submit" className="btn-primary">Cari</button>
          {(search || filterSiswa || filterTanggalMulai || filterTanggalSelesai) && (
            <button type="button" onClick={() => { setSearch(''); setFilterSiswa(''); setFilterTanggalMulai(''); setFilterTanggalSelesai(''); setTimeout(() => loadData(), 0) }} className="btn-secondary flex items-center gap-2">
              <X className="w-4 h-4" /> Reset
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Siswa</th>
                <th className="table-header hidden sm:table-cell">Tanggal</th>
                <th className="table-header">Kasus</th>
                <th className="table-header hidden md:table-cell">Tindakan</th>
                <th className="table-header text-right w-24">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-annajah-600 mx-auto"></div>
                </td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-12 text-gray-400">
                  <HeartHandshake className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  Belum ada data bimbingan konseling
                </td></tr>
              ) : data.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-2.5">
                      {item.foto_siswa ? (
                        <img
                          src={`/uploads/siswa/${item.foto_siswa}`}
                          alt={item.nama_siswa}
                          className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-200"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${item.foto_siswa ? 'hidden' : 'bg-annajah-100 text-annajah-600'}`}
                      >
                        {item.nama_siswa?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{item.nama_siswa}</div>
                        <div className="text-xs text-gray-400 font-mono">{item.nis}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell hidden sm:table-cell">
                    <span className="text-sm">{new Date(item.tanggal).toLocaleDateString('id-ID')}</span>
                  </td>
                  <td className="table-cell max-w-xs">
                    <p className="text-sm text-gray-700 line-clamp-2">{item.kasus}</p>
                  </td>
                  <td className="table-cell max-w-xs hidden md:table-cell">
                    <p className="text-sm text-gray-700 line-clamp-2">{item.tindakan}</p>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex justify-end gap-1">
                      <Link to={`/bimbingan-konseling/input?id=${item.id}`}
                        className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors">
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      </Link>
                      <button onClick={() => handleDelete(item.id)}
                        className="p-1.5 hover:bg-red-100 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
