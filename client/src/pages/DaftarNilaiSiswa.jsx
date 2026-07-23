import { useState, useEffect, useRef } from 'react'
import { getNilaiSiswa, deleteNilaiSiswa, getMataPelajaran, getPeriodePenilaian, getGuru, getTahunAjaran, exportExcelNilaiSiswa, importNilaiSiswa, downloadTemplateNilaiSiswa } from '../api'
import { ClipboardCheck, Edit2, Trash2, Search, Filter, Plus, GraduationCap, FileDown, FileUp, Download, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function DaftarNilaiSiswa() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [mataPelajaranList, setMataPelajaranList] = useState([])
  const [periodeList, setPeriodeList] = useState([])
  const [guruList, setGuruList] = useState([])
  const [tahunAjaranList, setTahunAjaranList] = useState([])
  const [search, setSearch] = useState('')
  const [filterTahunAjaran, setFilterTahunAjaran] = useState('')
  const [filterPeriode, setFilterPeriode] = useState('')
  const [filterMapel, setFilterMapel] = useState('')
  const [filterGuru, setFilterGuru] = useState('')
  const [importResult, setImportResult] = useState(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    Promise.all([loadReferensi(), loadData()])
  }, [])

  const loadReferensi = async () => {
    try {
      const [resMapel, resPeriode, resGuru, resTA] = await Promise.all([
        getMataPelajaran({}),
        getPeriodePenilaian(),
        getGuru(),
        getTahunAjaran(),
      ])
      setMataPelajaranList(resMapel.data || [])
      setPeriodeList(resPeriode.data || [])
      setGuruList(resGuru.data || [])
      setTahunAjaranList(resTA.data || [])
    } catch { /* ignore */ }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const params = {}
      if (search) params.search = search
      if (filterTahunAjaran) params.tahun_pelajaran = filterTahunAjaran
      if (filterPeriode) params.id_periode = filterPeriode
      if (filterMapel) params.id_mata_pelajaran = filterMapel
      if (filterGuru) params.id_guru = filterGuru
      const res = await getNilaiSiswa(params)
      setData(res.data)
    } catch {
      toast.error('Gagal memuat data nilai siswa')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    loadData()
  }

  const resetFilters = () => {
    setSearch('')
    setFilterTahunAjaran('')
    setFilterPeriode('')
    setFilterMapel('')
    setFilterGuru('')
    setTimeout(() => loadData(), 0)
  }

  const hasFilters = search || filterTahunAjaran || filterPeriode || filterMapel || filterGuru

  const handleExportExcel = async () => {
    try {
      const params = {}
      if (search) params.search = search
      if (filterTahunAjaran) params.tahun_pelajaran = filterTahunAjaran
      if (filterPeriode) params.id_periode = filterPeriode
      if (filterMapel) params.id_mata_pelajaran = filterMapel
      if (filterGuru) params.id_guru = filterGuru
      const res = await exportExcelNilaiSiswa(params)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `data_nilai_siswa_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Data nilai siswa berhasil diexport')
    } catch {
      toast.error('Gagal mengexport data')
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const res = await downloadTemplateNilaiSiswa()
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'template_import_nilai_siswa.xlsx'
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Template berhasil diunduh')
    } catch {
      toast.error('Gagal mengunduh template')
    }
  }

  const handleFileImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setImporting(true)
      setImportResult(null)
      const res = await importNilaiSiswa(file)
      setImportResult(res.data)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengimport data')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus nilai ini?')) return
    try {
      await deleteNilaiSiswa(id)
      toast.success('Nilai berhasil dihapus')
      loadData()
    } catch {
      toast.error('Gagal menghapus nilai')
    }
  }

  const getStatusNilai = (nilai, kkm) => {
    const n = parseFloat(nilai)
    const k = parseInt(kkm) || 75
    if (isNaN(n)) return { label: '-', color: 'bg-gray-100 text-gray-500' }
    if (n >= k) return { label: 'Tuntas', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' }
    return { label: 'Belum Tuntas', color: 'bg-red-50 text-red-700 border border-red-200' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Daftar Nilai Siswa</h1>
          <p className="text-gray-500 text-sm mt-1">Lihat dan kelola nilai akademik siswa</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportExcel} className="btn-secondary flex items-center gap-2">
            <FileDown className="w-4 h-4" /> Export
          </button>
          <button onClick={handleDownloadTemplate} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" /> Template
          </button>
          <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv" onChange={handleFileImport}
            className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={importing}
            className="btn-secondary flex items-center gap-2">
            {importing ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div> Mengimport...</>
            ) : (
              <><FileUp className="w-4 h-4" /> Import</>
            )}
          </button>
          <Link to="/nilai-siswa/input" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Input Nilai
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{data.length}</p>
              <p className="text-xs text-gray-500">Total Nilai</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {data.filter(d => parseFloat(d.nilai) >= (parseInt(d.kkm) || 75)).length}
              </p>
              <p className="text-xs text-gray-500">Tuntas</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {data.filter(d => parseFloat(d.nilai) < (parseInt(d.kkm) || 75)).length}
              </p>
              <p className="text-xs text-gray-500">Belum Tuntas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" className="input-field pl-10" placeholder="Cari nama siswa..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="w-full sm:w-44 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select className="input-field pl-10" value={filterTahunAjaran}
              onChange={e => setFilterTahunAjaran(e.target.value)}>
              <option value="">Semua Tahun Ajaran</option>
              {tahunAjaranList.map(ta => (
                <option key={ta.id} value={ta.tahun_ajaran}>{ta.tahun_ajaran} {ta.status === 'aktif' ? '(Aktif)' : ''}</option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-44 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select className="input-field pl-10" value={filterPeriode}
              onChange={e => setFilterPeriode(e.target.value)}>
              <option value="">Semua Periode</option>
              {periodeList.map(p => <option key={p.id} value={p.id}>{p.periode}</option>)}
            </select>
          </div>
          <div className="w-full sm:w-48 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select className="input-field pl-10" value={filterMapel}
              onChange={e => setFilterMapel(e.target.value)}>
              <option value="">Semua Mapel</option>
              {mataPelajaranList.map(m => <option key={m.id} value={m.id}>{m.nama_pelajaran}</option>)}
            </select>
          </div>
          <div className="w-full sm:w-48 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select className="input-field pl-10" value={filterGuru}
              onChange={e => setFilterGuru(e.target.value)}>
              <option value="">Semua Guru</option>
              {guruList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
            </select>
          </div>
          <button type="submit" className="btn-primary">Cari</button>
          {hasFilters && (
            <button type="button" onClick={resetFilters} className="btn-secondary flex items-center gap-2">
              <Filter className="w-4 h-4" /> Reset
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
                <th className="table-header">No</th>
                <th className="table-header">Tahun Pelajaran</th>
                <th className="table-header">Nama Siswa</th>
                <th className="table-header hidden md:table-cell">Mata Pelajaran</th>
                <th className="table-header hidden md:table-cell">Nama Guru</th>
                <th className="table-header hidden md:table-cell">Periode</th>
                <th className="table-header text-center">Nilai</th>
                <th className="table-header text-center hidden sm:table-cell">KKM</th>
                <th className="table-header text-center hidden sm:table-cell">Status</th>
                <th className="table-header text-right w-24">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="10" className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                </td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="10" className="text-center py-12 text-gray-400">
                  <ClipboardCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  Belum ada data nilai siswa
                </td></tr>
              ) : data.map((item, idx) => {
                const status = getStatusNilai(item.nilai, item.kkm)
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell text-center text-sm text-gray-500">{idx + 1}</td>
                    <td className="table-cell">
                      <span className="text-sm font-medium">{item.tahun_pelajaran}</span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        {item.foto_siswa ? (
                          <img
                            src={`/uploads/siswa/${item.foto_siswa}`}
                            alt={item.nama_siswa}
                            className="w-7 h-7 rounded-full object-cover shrink-0 border border-gray-200"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.nextElementSibling.style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${item.foto_siswa ? 'hidden' : 'bg-indigo-100 text-indigo-600'}`}>
                          {item.nama_siswa?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="text-sm text-gray-700">{item.nama_siswa}</span>
                      </div>
                    </td>
                    <td className="table-cell hidden md:table-cell">
                      <span className="text-sm text-gray-600">{item.nama_pelajaran}</span>
                    </td>
                    <td className="table-cell hidden md:table-cell">
                      <span className="text-sm text-gray-600">{item.nama_guru || '-'}</span>
                    </td>
                    <td className="table-cell hidden md:table-cell">
                      <span className="text-sm text-gray-500">{item.nama_periode}</span>
                    </td>
                    <td className="table-cell text-center">
                      <span className={`text-sm font-bold ${
                        parseFloat(item.nilai) >= (parseInt(item.kkm) || 75)
                          ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {parseFloat(item.nilai).toFixed(2)}
                      </span>
                    </td>
                    <td className="table-cell text-center hidden sm:table-cell">
                      <span className="text-sm text-gray-500">{item.kkm || 75}</span>
                    </td>
                    <td className="table-cell text-center hidden sm:table-cell">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex justify-end gap-1">
                        <Link to={`/nilai-siswa/input?id=${item.id}`}
                          className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Edit">
                          <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                        </Link>
                        <button onClick={() => handleDelete(item.id)}
                          className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                          title="Hapus">
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {/* Modal Hasil Import */}
      {importResult && (
        <div className="modal-overlay" onClick={() => setImportResult(null)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {importResult.error_count > 0 ? (
                    <AlertCircle className="w-6 h-6 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">Hasil Import</h3>
                    <p className="text-xs text-gray-500 mt-1">{importResult.message}</p>
                  </div>
                </div>
                <button onClick={() => setImportResult(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{importResult.success_count || 0}</p>
                  <p className="text-xs text-emerald-600">Berhasil</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">{importResult.error_count || 0}</p>
                  <p className="text-xs text-amber-600">Gagal</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{importResult.total_row || 0}</p>
                  <p className="text-xs text-blue-600">Total Baris</p>
                </div>
              </div>

              {importResult.errors?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-red-100 border-b border-red-200">
                    <p className="text-xs font-semibold text-red-700">Detail Error</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {importResult.errors.map((err, i) => (
                      <div key={i} className="px-4 py-2.5 border-b border-red-100 last:border-0">
                        <p className="text-xs font-medium text-red-800">
                          Baris {err.row}: {err.nama}
                        </p>
                        <p className="text-xs text-red-600 mt-0.5">{err.errors?.join(', ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button onClick={() => setImportResult(null)}
                  className="btn-primary">Tutup</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
