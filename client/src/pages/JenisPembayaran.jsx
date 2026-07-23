import { useState, useEffect, useRef } from 'react'
import { getPembayaran, createPembayaran, updatePembayaran, deletePembayaran, importPembayaran, downloadTemplatePembayaran, exportPembayaran, getTahunAjaran } from '../api'
import { Plus, Edit2, Trash2, CreditCard, DollarSign, Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, FileDown, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function JenisPembayaran() {
  const [pembayaran, setPembayaran] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    nama_pembayaran: '', tahun_ajaran: '', nominal: '',
    periode: 'bulanan', status: 'aktif', keterangan: ''
  })
  const [tahunAjaranList, setTahunAjaranList] = useState([])
  const [filterStatus, setFilterStatus] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => { loadData(); loadTahunAjaran() }, [filterStatus])

  const loadTahunAjaran = async () => {
    try {
      const res = await getTahunAjaran()
      setTahunAjaranList(res.data || [])
    } catch { /* fallback */ }
  }

  const loadData = async () => {
    try {
      const params = {}
      if (filterStatus) params.status = filterStatus
      const res = await getPembayaran(params)
      setPembayaran(res.data)
    } catch (error) {
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const res = await exportPembayaran()
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `jenis_pembayaran_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Data berhasil diexport')
    } catch (error) {
      toast.error('Gagal mengexport data')
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const res = await downloadTemplatePembayaran()
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'template_import_pembayaran.xlsx'
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Template berhasil diunduh')
    } catch (error) {
      toast.error('Gagal mengunduh template')
    }
  }

  const handleFileDrop = (e) => {
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const handleFileSelect = (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      toast.error('Format file tidak didukung. Gunakan .xlsx atau .csv')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB')
      return
    }
    setImportFile(file)
  }

  const handleImport = async () => {
    if (!importFile) return
    setImportLoading(true)
    try {
      const res = await importPembayaran(importFile)
      setImportResult(res.data)
      toast.success('Import selesai')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal mengimport data')
      setImportResult(null)
    } finally {
      setImportLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nama_pembayaran || !form.nominal) {
      toast.error('Nama dan nominal harus diisi')
      return
    }
    try {
      const data = { ...form, nominal: parseInt(form.nominal) }
      if (editing) {
        await updatePembayaran(editing.id, data)
        toast.success('Jenis pembayaran berhasil diupdate')
      } else {
        await createPembayaran(data)
        toast.success('Jenis pembayaran berhasil ditambahkan')
      }
      setShowModal(false)
      setEditing(null)
      setForm({ nama_pembayaran: '', tahun_ajaran: '', nominal: '', periode: 'bulanan', status: 'aktif', keterangan: '' })
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Terjadi kesalahan')
    }
  }

  const handleEdit = (item) => {
    setEditing(item)
    setForm({
      nama_pembayaran: item.nama_pembayaran,
      tahun_ajaran: item.tahun_ajaran,
      nominal: item.nominal.toString(),
      periode: item.periode,
      status: item.status || 'aktif',
      keterangan: item.keterangan || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus jenis pembayaran ini?')) return
    try {
      await deletePembayaran(id)
      toast.success('Jenis pembayaran berhasil dihapus')
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menghapus')
    }
  }

  const formatRupiah = (val) => `Rp ${parseInt(val).toLocaleString('id-ID')}`
  const periodeLabel = { bulanan: 'Bulanan', semester: 'Semester', tahunan: 'Tahunan', sekali: 'Sekali' }
  const periodeColor = { bulanan: 'badge-info', semester: 'badge-warning', tahunan: 'badge-success', sekali: 'badge-danger' }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-annajah-600"></div></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Jenis Pembayaran</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola jenis-jenis pembayaran sekolah</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <FileDown className="w-4 h-4" /> Export
          </button>
          <button onClick={handleDownloadTemplate} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" /> Template
          </button>
          <button onClick={() => { setImportResult(null); setImportFile(null); setShowImportModal(true) }}
            className="btn-secondary flex items-center gap-2">
            <Upload className="w-4 h-4" /> Import
          </button>
          <button onClick={() => { setEditing(null); setForm({ nama_pembayaran: '', tahun_ajaran: '', nominal: '', periode: 'bulanan', status: 'aktif', keterangan: '' }); setShowModal(true) }}
            className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Tambah Baru
          </button>
        </div>
      </div>

      {/* Filter Status */}
      <div className="card">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Filter Status:</label>
          <div className="flex gap-2">
            <button onClick={() => setFilterStatus('')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterStatus === ''
                  ? 'bg-annajah-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              Semua
            </button>
            <button onClick={() => setFilterStatus('aktif')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterStatus === 'aktif'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              Aktif
            </button>
            <button onClick={() => setFilterStatus('tidak_aktif')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filterStatus === 'tidak_aktif'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              Tidak Aktif
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pembayaran.map((item) => (
          <div key={item.id} className={`card group hover:border-annajah-200 transition-all ${item.status === 'tidak_aktif' ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-lg ${item.periode === 'bulanan' ? 'bg-blue-50' : item.periode === 'semester' ? 'bg-yellow-50' : item.periode === 'tahunan' ? 'bg-green-50' : 'bg-red-50'}`}>
                <CreditCard className={`w-5 h-5 ${item.periode === 'bulanan' ? 'text-blue-600' : item.periode === 'semester' ? 'text-yellow-600' : item.periode === 'tahunan' ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(item)} className="p-1.5 hover:bg-blue-100 rounded-lg">
                  <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                </button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-100 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                </button>
              </div>
            </div>
            <h3 className="font-semibold text-gray-800">{item.nama_pembayaran}</h3>
            <p className="text-2xl font-bold text-annajah-600 mt-1">{formatRupiah(item.nominal)}</p>
            <div className="flex items-center gap-2 mt-3">
              <span className={`badge ${periodeColor[item.periode]}`}>{periodeLabel[item.periode]}</span>
              <span className="badge badge-info">{item.tahun_ajaran}</span>
              <span className={`badge ${item.status === 'aktif' ? 'badge-success' : 'badge-danger'}`}>
                {item.status === 'aktif' ? 'Aktif' : 'Tidak Aktif'}
              </span>
            </div>
            {item.keterangan && <p className="text-xs text-gray-400 mt-2">{item.keterangan}</p>}
          </div>
        ))}
      </div>

      {pembayaran.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Belum ada jenis pembayaran</p>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => { if (!importLoading) { setShowImportModal(false); setImportResult(null); setImportFile(null) } }}>
          <div className="modal-content max-w-xl" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Import Jenis Pembayaran</h2>
              <p className="text-sm text-gray-500 mb-5">Upload file Excel untuk mengimport jenis pembayaran secara massal.</p>

              {!importResult ? (
                <>
                  {/* Upload Area */}
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                      ${dragOver ? 'border-annajah-500 bg-annajah-50' : 'border-gray-300 hover:border-annajah-400 hover:bg-gray-50'}`}
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); handleFileDrop(e) }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                      onChange={e => handleFileSelect(e.target.files[0])} />
                    {importFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileSpreadsheet className="w-8 h-8 text-annajah-600" />
                        <div className="text-left">
                          <p className="font-medium text-gray-700">{importFile.name}</p>
                          <p className="text-xs text-gray-400">{(importFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                        {!importLoading && (
                          <button onClick={e => { e.stopPropagation(); setImportFile(null) }}
                            className="p-1 hover:bg-gray-200 rounded-full">
                            <X className="w-4 h-4 text-gray-400" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600 font-medium">Klik atau tarik file ke sini</p>
                        <p className="text-xs text-gray-400 mt-1">Format: .xlsx, .xls, .csv (maks 5MB)</p>
                      </>
                    )}
                  </div>

                  {/* Info Kolom */}
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                    <p className="font-medium mb-1">Kolom yang didukung:</p>
                    <p><span className="font-semibold">Nama Pembayaran*</span>, <span className="font-semibold">Tahun Ajaran*</span>, <span className="font-semibold">Nominal*</span>, Periode (bulanan/semester/tahunan/sekali), Keterangan</p>
                    <p className="mt-1">(*) Wajib diisi. Gunakan <strong>Template</strong> untuk melihat format yang benar.</p>
                  </div>

                  {/* Tombol */}
                  <div className="flex gap-3 mt-5">
                    <button onClick={handleImport} disabled={!importFile || importLoading}
                      className={`btn-primary flex-1 flex items-center justify-center gap-2 ${(!importFile || importLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {importLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengimport...</> : <><Upload className="w-4 h-4" /> Import Data</>}
                    </button>
                    <button onClick={() => { setShowImportModal(false); setImportResult(null); setImportFile(null) }}
                      disabled={importLoading} className={`btn-secondary flex-1 ${importLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      Batal
                    </button>
                  </div>
                </>
              ) : (
                /* Hasil Import */
                <>
                  <div className={`p-4 rounded-lg ${importResult.error_count === 0 ? 'bg-green-50 border border-green-200' : importResult.success_count > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center gap-3">
                      {importResult.error_count === 0 ? (
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                      ) : importResult.success_count > 0 ? (
                        <AlertCircle className="w-8 h-8 text-yellow-500" />
                      ) : (
                        <AlertCircle className="w-8 h-8 text-red-500" />
                      )}
                      <div>
                        <p className="font-semibold text-gray-800">{importResult.message}</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {importResult.success_count} berhasil · {importResult.error_count} gagal · {importResult.total_row} baris diproses
                        </p>
                      </div>
                    </div>
                  </div>

                  {importResult.errors?.length > 0 && (
                    <div className="mt-4 max-h-48 overflow-y-auto">
                      <p className="text-sm font-medium text-red-600 mb-2">Detail Error:</p>
                      {importResult.errors.map((err, i) => (
                        <div key={i} className="text-xs p-2 mb-1 bg-red-50 rounded border border-red-100">
                          <span className="font-medium">Baris {err.row}:</span> {err.nama}
                          <ul className="list-disc list-inside mt-0.5 text-red-600">
                            {err.errors.map((e, j) => <li key={j}>{e}</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3 mt-5">
                    <button onClick={() => { setShowImportModal(false); setImportResult(null); setImportFile(null); loadData() }}
                      className="btn-primary flex-1">
                      Selesai
                    </button>
                    {importResult.error_count > 0 && (
                      <button onClick={() => { setImportResult(null); setImportFile(null) }}
                        className="btn-secondary flex-1">
                        Import Ulang
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">
                {editing ? 'Edit Jenis Pembayaran' : 'Tambah Jenis Pembayaran'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Nama Pembayaran *</label>
                  <input type="text" className="input-field" value={form.nama_pembayaran}
                    onChange={e => setForm({ ...form, nama_pembayaran: e.target.value })}
                    placeholder="Contoh: SPP Bulanan" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Tahun Ajaran</label>
                    <select className="input-field" value={form.tahun_ajaran}
                      onChange={e => setForm({ ...form, tahun_ajaran: e.target.value })}>
                      <option value="">Pilih Tahun Ajaran</option>
                      {tahunAjaranList.map(ta => (
                        <option key={ta.id} value={ta.tahun_ajaran}>{ta.tahun_ajaran} {ta.status === 'aktif' ? '(Aktif)' : ''}</option>
                      ))}
                    </select>
                  </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Periode</label>
                  <select className="input-field" value={form.periode}
                    onChange={e => setForm({ ...form, periode: e.target.value })}>
                    <option value="bulanan">Bulanan</option>
                    <option value="semester">Semester</option>
                    <option value="tahunan">Tahunan</option>
                    <option value="sekali">Sekali</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                  <div className="flex gap-3">
                    <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all flex-1 ${
                      form.status === 'aktif'
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}>
                      <input type="radio" name="status" value="aktif"
                        className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        checked={form.status === 'aktif'}
                        onChange={e => setForm({ ...form, status: e.target.value })} />
                      <span className="text-sm font-semibold">Aktif</span>
                    </label>
                    <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all flex-1 ${
                      form.status === 'tidak_aktif'
                        ? 'border-red-400 bg-red-50 text-red-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}>
                      <input type="radio" name="status" value="tidak_aktif"
                        className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                        checked={form.status === 'tidak_aktif'}
                        onChange={e => setForm({ ...form, status: e.target.value })} />
                      <span className="text-sm font-semibold">Tidak Aktif</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">&nbsp;</label>
                  <p className="text-xs text-gray-400 pt-2">
                    {form.status === 'aktif'
                      ? 'Pembayaran ini akan muncul di pilihan saat input transaksi.'
                      : 'Pembayaran ini disembunyikan dari pilihan transaksi.'}
                  </p>
                </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Nominal *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
                    <input type="number" className="input-field pl-10" value={form.nominal}
                      onChange={e => setForm({ ...form, nominal: e.target.value })}
                      placeholder="250000" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Keterangan</label>
                  <textarea className="input-field" rows="2" value={form.keterangan}
                    onChange={e => setForm({ ...form, keterangan: e.target.value })}
                    placeholder="Deskripsi pembayaran (opsional)"></textarea>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="btn-primary flex-1">
                    {editing ? 'Simpan' : 'Tambah'}
                  </button>
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Batal</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
