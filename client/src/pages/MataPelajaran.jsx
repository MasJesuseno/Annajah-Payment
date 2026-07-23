import { useState, useEffect, useRef } from 'react'
import { getMataPelajaran, createMataPelajaran, updateMataPelajaran, deleteMataPelajaran, exportExcelMataPelajaran, importMataPelajaran, downloadTemplateMataPelajaran } from '../api'
import { BookOpen, Plus, Edit2, Trash2, X, Search, FileDown, FileUp, Download, AlertCircle, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MataPelajaran() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nama_pelajaran: '',
    status: 'aktif',
  })
  const [importResult, setImportResult] = useState(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const params = {}
      if (search) params.search = search
      if (filterStatus) params.status = filterStatus
      const res = await getMataPelajaran(params)
      setData(res.data)
    } catch {
      toast.error('Gagal memuat data mata pelajaran')
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
    setFilterStatus('')
    setTimeout(() => loadData(), 0)
  }

  const hasFilters = search || filterStatus

  const openAdd = () => {
    setEditItem(null)
    setForm({ nama_pelajaran: '', status: 'aktif' })
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({
      nama_pelajaran: item.nama_pelajaran,
      status: item.status,
    })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.nama_pelajaran) {
      toast.error('Nama pelajaran harus diisi')
      return
    }
    try {
      setSaving(true)
      if (editItem) {
        await updateMataPelajaran(editItem.id, form)
        toast.success('Mata pelajaran berhasil diupdate')
      } else {
        await createMataPelajaran(form)
        toast.success('Mata pelajaran berhasil ditambahkan')
      }
      setShowModal(false)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan mata pelajaran')
    } finally {
      setSaving(false)
    }
  }

  const handleExportExcel = async () => {
    try {
      const params = {}
      if (search) params.search = search
      if (filterStatus) params.status = filterStatus
      const res = await exportExcelMataPelajaran(params)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `data_mata_pelajaran_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Data mata pelajaran berhasil diexport')
    } catch {
      toast.error('Gagal mengexport data')
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const res = await downloadTemplateMataPelajaran()
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'template_import_mata_pelajaran.xlsx'
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
      const res = await importMataPelajaran(file)
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
    if (!confirm('Yakin ingin menghapus mata pelajaran ini?')) return
    try {
      await deleteMataPelajaran(id)
      toast.success('Mata pelajaran berhasil dihapus')
      loadData()
    } catch {
      toast.error('Gagal menghapus mata pelajaran')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mata Pelajaran</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola daftar mata pelajaran</p>
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
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{data.length}</p>
              <p className="text-xs text-gray-500">Total Mata Pelajaran</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{data.filter(d => d.status === 'aktif').length}</p>
              <p className="text-xs text-gray-500">Aktif</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{data.filter(d => d.status === 'tidak_aktif').length}</p>
              <p className="text-xs text-gray-500">Tidak Aktif</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" className="input-field pl-10" placeholder="Cari nama mata pelajaran..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="w-full sm:w-40">
            <select className="input-field" value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="tidak_aktif">Tidak Aktif</option>
            </select>
          </div>
          <button type="submit" className="btn-primary">Cari</button>
          {hasFilters && (
            <button type="button" onClick={resetFilters} className="btn-secondary flex items-center gap-2">
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
                <th className="table-header">No</th>
                <th className="table-header">Nama Pelajaran</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right w-24">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-annajah-600 mx-auto"></div>
                </td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-12 text-gray-400">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  Belum ada data mata pelajaran
                </td></tr>
              ) : data.map((item, idx) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell text-center text-sm text-gray-500">{idx + 1}</td>
                  <td className="table-cell">
                    <div className="font-medium text-sm">{item.nama_pelajaran}</div>
                  </td>
                  <td className="table-cell">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      item.status === 'aktif'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {item.status === 'aktif' ? 'Aktif' : 'Tidak Aktif'}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(item)}
                        className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Edit">
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      </button>
                      <button onClick={() => handleDelete(item.id)}
                        className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                        title="Hapus">
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

      {/* Modal Form */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">
                    {editItem ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {editItem ? 'Ubah data mata pelajaran' : 'Masukkan data mata pelajaran baru'}
                  </p>
                </div>
                <button onClick={() => setShowModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Mata Pelajaran <span className="text-red-500">*</span></label>
                  <input type="text" className="input-field" placeholder="Contoh: Matematika Wajib"
                    value={form.nama_pelajaran}
                    onChange={e => setForm({ ...form, nama_pelajaran: e.target.value })}
                    autoFocus />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="status" value="aktif"
                        checked={form.status === 'aktif'}
                        onChange={e => setForm({ ...form, status: e.target.value })}
                        className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm text-gray-700">Aktif</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="status" value="tidak_aktif"
                        checked={form.status === 'tidak_aktif'}
                        onChange={e => setForm({ ...form, status: e.target.value })}
                        className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-gray-700">Tidak Aktif</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Mata pelajaran tidak aktif tidak akan muncul di dropdown pemilihan
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="btn-secondary">Batal</button>
                  <button type="submit" disabled={saving}
                    className="btn-primary flex items-center gap-2 min-w-[120px] justify-center">
                    {saving ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Menyimpan...</>
                    ) : (
                      <><Plus className="w-4 h-4" /> {editItem ? 'Update' : 'Simpan'}</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
