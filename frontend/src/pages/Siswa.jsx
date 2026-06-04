import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getSiswa, createSiswa, updateSiswa, deleteSiswa, getKelas, getGuru, importSiswa, downloadTemplateSiswa, exportSiswa, getFilterOptionsSiswa } from '../api'
import { Plus, Edit2, Trash2, Search, Filter, User, X, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, FileDown, ChevronLeft, ChevronRight, Camera, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Siswa() {
  const [siswa, setSiswa] = useState([])
  const [kelas, setKelas] = useState([])
  const [guruList, setGuruList] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [filterKelas, setFilterKelas] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterWaliKelas, setFilterWaliKelas] = useState('')
  const [filterUniversitas, setFilterUniversitas] = useState('')
  const [filterJurusan, setFilterJurusan] = useState('')
  const [universitasList, setUniversitasList] = useState([])
  const [jurusanList, setJurusanList] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const perPage = 25
  const searchTimeoutRef = useRef(null)
  const initialMount = useRef(true)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({
    nis: '', nisn: '', nama: '', jenis_kelamin: 'L', tempat_lahir: '',
    tanggal_lahir: '', alamat: '', no_telp: '', email: '', id_kelas: '', status: 'aktif',
    asal_sekolah: '', alamat_sekolah: '', kota_asal_sekolah: '', universitas: '', jurusan: ''
  })
  const [fotoPreview, setFotoPreview] = useState(null)
  const [fotoError, setFotoError] = useState(false)

  const location = useLocation()
  const editFromDetailHandled = useRef(false)

  // Debounced search value untuk server-side filtering
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [search])

  useEffect(() => {
    loadData()
    loadFilterOptions()
  }, [])

  const loadFilterOptions = async () => {
    try {
      const res = await getFilterOptionsSiswa()
      setUniversitasList(res.data.universitas || [])
      setJurusanList(res.data.jurusan || [])
    } catch { /* ignore */ }
  }

  // Fetch ulang saat filter berubah — reset ke halaman 1
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false
      return
    }
    loadData(1)
  }, [filterKelas, filterStatus, debouncedSearch, filterWaliKelas, filterUniversitas, filterJurusan])

  const loadData = async (pageOverride) => {
    try {
      setLoading(true)
      const currentPage = pageOverride !== undefined ? pageOverride : page
      const params = { page: currentPage, per_page: perPage }
      if (filterKelas) params.kelas = filterKelas
      if (filterStatus) params.status = filterStatus
      if (filterWaliKelas) params.wali_kelas = filterWaliKelas
      if (filterUniversitas) params.universitas = filterUniversitas
      if (filterJurusan) params.jurusan = filterJurusan
      if (debouncedSearch) params.search = debouncedSearch
      const [siswaRes, kelasRes, guruRes] = await Promise.all([getSiswa(params), getKelas(), getGuru()])
      setSiswa(siswaRes.data.data || [])
      setTotal(siswaRes.data.total || 0)
      setTotalPages(siswaRes.data.total_pages || 1)
      if (pageOverride) setPage(pageOverride)
      setKelas(kelasRes.data)
      setGuruList(guruRes.data || [])
    } catch (error) {
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  const goToPage = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return
    setPage(newPage)
    loadData(newPage)
  }

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      let start = Math.max(2, page - 1)
      let end = Math.min(totalPages - 1, page + 1)
      if (start > 2) pages.push('...')
      for (let i = start; i <= end; i++) pages.push(i)
      if (end < totalPages - 1) pages.push('...')
      pages.push(totalPages)
    }
    return pages
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
      const res = await importSiswa(importFile)
      setImportResult(res.data)
      toast.success('Import selesai')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal mengimport data')
      setImportResult(null)
    } finally {
      setImportLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const params = {}
      if (filterKelas) params.kelas = filterKelas
      if (filterStatus) params.status = filterStatus
      if (filterWaliKelas) params.wali_kelas = filterWaliKelas
      if (filterUniversitas) params.universitas = filterUniversitas
      if (filterJurusan) params.jurusan = filterJurusan
      if (search) params.search = search
      const res = await exportSiswa(params)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `data_siswa_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Data siswa berhasil diexport')
    } catch (error) {
      toast.error('Gagal mengexport data')
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const res = await downloadTemplateSiswa()
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'template_import_siswa.xlsx'
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Template berhasil diunduh')
    } catch (error) {
      toast.error('Gagal mengunduh template')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nis || !form.nama) {
      toast.error('NIS dan Nama harus diisi')
      return
    }
    try {
      if (editing) {
        await updateSiswa(editing.id, form)
        toast.success('Data siswa berhasil diupdate')
      } else {
        const res = await createSiswa(form)
        toast.success('Siswa berhasil ditambahkan')
      }

      setShowModal(false)
      setEditing(null)
      setFotoPreview(null)
      setForm({ nis: '', nisn: '', nama: '', jenis_kelamin: 'L', tempat_lahir: '', tanggal_lahir: '', alamat: '', no_telp: '', email: '', id_kelas: '', status: 'aktif', asal_sekolah: '', alamat_sekolah: '', kota_asal_sekolah: '', universitas: '', jurusan: '' })
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Terjadi kesalahan')
    }
  }

  // Helper: format tanggal ISO ke YYYY-MM-DD untuk input type="date"
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Tampilkan foto di modal edit (read-only, upload/hapus hanya di Detail Siswa)
  const renderFotoSection = () => {
    if (!editing) return null
    if (fotoPreview && !fotoError) {
      return (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-600 mb-3">Foto Siswa</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
              <img
                src={fotoPreview}
                alt="Foto"
                className="w-full h-full object-cover"
                onError={() => setFotoError(true)}
              />
            </div>
            <p className="text-sm text-gray-500">
              Kelola foto melalui halaman <strong>Detail Siswa</strong>
            </p>
          </div>
        </div>
      )
    }
    if (editing?.foto && fotoError) {
      return (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-600 mb-3">Foto Siswa</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Camera className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">
              Foto tidak dapat dimuat. Kelola melalui halaman <strong>Detail Siswa</strong>
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  const handleEdit = (item) => {
    setEditing(item)
    setForm({
      nis: item.nis, nisn: item.nisn || '', nama: item.nama,
      jenis_kelamin: item.jenis_kelamin, tempat_lahir: item.tempat_lahir || '',
      tanggal_lahir: formatDateForInput(item.tanggal_lahir), alamat: item.alamat || '',
      no_telp: item.no_telp || '', email: item.email || '', id_kelas: item.id_kelas || '', status: item.status || 'aktif',
      asal_sekolah: item.asal_sekolah || '', alamat_sekolah: item.alamat_sekolah || '',
      kota_asal_sekolah: item.kota_asal_sekolah || '',
      universitas: item.universitas || '', jurusan: item.jurusan || ''
    })
    setFotoPreview(item.foto ? `/uploads/siswa/${item.foto}` : null)
    setFotoError(false)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus siswa ini? Semua transaksinya juga akan dihapus.')) return
    try {
      await deleteSiswa(id)
      toast.success('Siswa berhasil dihapus')
      loadData()
    } catch (error) {
      toast.error('Gagal menghapus siswa')
    }
  }

  const handleResetModal = () => {
    setShowModal(false)
    setEditing(null)
    setFotoPreview(null)
    setForm({ nis: '', nisn: '', nama: '', jenis_kelamin: 'L', tempat_lahir: '', tanggal_lahir: '', alamat: '', no_telp: '', email: '', id_kelas: '', status: 'aktif', asal_sekolah: '', alamat_sekolah: '', kota_asal_sekolah: '', universitas: '', jurusan: '' })
  }

  // Buka modal edit jika datang dari halaman Detail Siswa
  useEffect(() => {
    if (location.state?.editSiswa && !editFromDetailHandled.current) {
      editFromDetailHandled.current = true
      handleEdit(location.state.editSiswa)
    }
  }, [location.state])

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-annajah-600"></div></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Data Siswa</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola data siswa SMA Annajah</p>
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
          </button>              <button onClick={() => { setEditing(null); setForm({ nis: '', nisn: '', nama: '', jenis_kelamin: 'L', tempat_lahir: '', tanggal_lahir: '', alamat: '', no_telp: '', email: '', id_kelas: '', status: 'aktif', asal_sekolah: '', alamat_sekolah: '', kota_asal_sekolah: '', universitas: '', jurusan: '' }); setFotoPreview(null); setShowModal(true) }}
            className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Tambah Siswa
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" className="input-field pl-10" placeholder="Cari nama atau NIS..."
              value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
                  setDebouncedSearch(search)
                }
              }} />
          </div>
          <div className="w-full sm:w-48 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select className="input-field pl-10" value={filterKelas} onChange={e => setFilterKelas(e.target.value)}>
              <option value="">Semua Kelas</option>
              {kelas.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
            </select>
          </div>
          <div className="w-full sm:w-44 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select className="input-field pl-10" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="lulus">Lulus</option>
              <option value="keluar">Keluar</option>
            </select>
          </div>
          <div className="w-full sm:w-48 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select className="input-field pl-10" value={filterWaliKelas} onChange={e => setFilterWaliKelas(e.target.value)}>
              <option value="">Semua Wali Kelas</option>
              {guruList.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
            </select>
          </div>
          <div className="w-full sm:w-56 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select className="input-field pl-10" value={filterUniversitas} onChange={e => setFilterUniversitas(e.target.value)}>
              <option value="">Semua Universitas</option>
              {universitasList.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="w-full sm:w-48 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select className="input-field pl-10" value={filterJurusan} onChange={e => setFilterJurusan(e.target.value)}>
              <option value="">Semua Jurusan</option>
              {jurusanList.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
          {(search || filterKelas || filterStatus || filterWaliKelas || filterUniversitas || filterJurusan) && (
            <button onClick={() => { setSearch(''); setDebouncedSearch(''); setFilterKelas(''); setFilterStatus(''); setFilterWaliKelas(''); setFilterUniversitas(''); setFilterJurusan('') }} className="btn-secondary flex items-center gap-2">
              <X className="w-4 h-4" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Siswa</th>
                <th className="table-header hidden sm:table-cell">JK</th>
                <th className="table-header hidden sm:table-cell">Kelas</th>
                <th className="table-header hidden md:table-cell">No. Telp</th>
                <th className="table-header hidden sm:table-cell">Status</th>
                <th className="table-header text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {siswa.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-12 text-gray-400">
                  <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  Tidak ada data siswa
                </td></tr>
              ) : siswa.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-annajah-100 flex-shrink-0">
                        {s.foto ? (
                          <img src={`/uploads/siswa/${s.foto}`} alt={s.nama}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-annajah-600 text-sm font-bold">' + s.nama.charAt(0).toUpperCase() + '</div>' }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-annajah-600 text-sm font-bold">
                            {s.nama.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{s.nama}</div>
                        <div className="text-xs text-gray-400 font-mono">{s.nis}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell hidden sm:table-cell">{s.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                  <td className="table-cell hidden sm:table-cell">{s.nama_kelas || '-'}</td>
                  <td className="table-cell hidden md:table-cell">{s.no_telp || '-'}</td>
                  <td className="table-cell hidden sm:table-cell">
                    <span className={`badge ${s.status === 'aktif' ? 'badge-success' : s.status === 'lulus' ? 'badge-info' : 'badge-danger'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex justify-end gap-1">
                      <Link to={`/siswa/${s.id}`} className="p-1.5 hover:bg-annajah-100 rounded-lg transition-colors">
                        <Eye className="w-3.5 h-3.5 text-annajah-600" />
                      </Link>
                      <button onClick={() => handleEdit(s)} className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors">
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 hover:bg-red-100 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
          <span>Total: {total} siswa</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button onClick={() => goToPage(page - 1)} disabled={page <= 1}
                className={`p-1 rounded ${page <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-200'}`}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              {getPageNumbers().map((p, i) =>
                p === '...' ? (
                  <span key={`e${i}`} className="px-1 text-gray-300">...</span>
                ) : (
                  <button key={p} onClick={() => goToPage(p)}
                    className={`w-7 h-7 rounded text-xs font-medium transition-colors
                      ${page === p ? 'bg-annajah-600 text-white' : 'text-gray-500 hover:bg-gray-200'}`}
                  >
                    {p}
                  </button>
                )
              )}
              <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages}
                className={`p-1 rounded ${page >= totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-200'}`}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => { if (!importLoading) { setShowImportModal(false); setImportResult(null); setImportFile(null) } }}>
          <div className="modal-content max-w-xl" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Import Data Siswa</h2>
              <p className="text-sm text-gray-500 mb-5">Upload file Excel untuk mengimport data siswa secara massal.</p>

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
                    <p><span className="font-semibold">NIS*</span>, NISN, <span className="font-semibold">Nama*</span>, Jenis Kelamin (L/P), Tempat Lahir, Tanggal Lahir, Alamat, No. Telepon, Kelas, Asal Sekolah, Alamat Sekolah, Kota Asal Sekolah, Universitas, Jurusan</p>
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
                          <span className="font-medium">Baris {err.row}:</span> {err.nis} - {err.nama}
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
          <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">
                {editing ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">NIS *</label>
                    <input type="text" className="input-field" value={form.nis}
                      onChange={e => setForm({ ...form, nis: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">NISN</label>
                    <input type="text" className="input-field" value={form.nisn}
                      onChange={e => setForm({ ...form, nisn: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-600 mb-1">Nama Lengkap *</label>
                    <input type="text" className="input-field" value={form.nama}
                      onChange={e => setForm({ ...form, nama: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Jenis Kelamin</label>
                    <select className="input-field" value={form.jenis_kelamin}
                      onChange={e => setForm({ ...form, jenis_kelamin: e.target.value })}>
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Kelas</label>
                    <select className="input-field" value={form.id_kelas}
                      onChange={e => setForm({ ...form, id_kelas: e.target.value })}>
                      <option value="">Pilih Kelas</option>
                      {kelas.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Tempat Lahir</label>
                    <input type="text" className="input-field" value={form.tempat_lahir}
                      onChange={e => setForm({ ...form, tempat_lahir: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Tanggal Lahir</label>
                    <input type="date" className="input-field" value={form.tanggal_lahir}
                      onChange={e => setForm({ ...form, tanggal_lahir: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-600 mb-1">Alamat</label>
                    <textarea className="input-field" rows="2" value={form.alamat}
                      onChange={e => setForm({ ...form, alamat: e.target.value })}></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">No. Telepon</label>
                    <input type="text" className="input-field" value={form.no_telp}
                      onChange={e => setForm({ ...form, no_telp: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                    <input type="email" className="input-field" value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="email@contoh.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                    <select className="input-field" value={form.status}
                      onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option value="aktif">Aktif</option>
                      <option value="lulus">Lulus</option>
                      <option value="keluar">Keluar</option>
                    </select>
                  </div>
                </div>

                {/* Asal Sekolah */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                    Asal Sekolah
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Nama Sekolah Asal</label>
                      <input type="text" className="input-field" value={form.asal_sekolah}
                        onChange={e => setForm({ ...form, asal_sekolah: e.target.value })}
                        placeholder="Contoh: SMPN 1 Jakarta" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Kota Asal Sekolah</label>
                      <input type="text" className="input-field" value={form.kota_asal_sekolah}
                        onChange={e => setForm({ ...form, kota_asal_sekolah: e.target.value })}
                        placeholder="Contoh: Jakarta" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Alamat Sekolah Asal</label>
                      <textarea className="input-field" rows="2" value={form.alamat_sekolah}
                        onChange={e => setForm({ ...form, alamat_sekolah: e.target.value })}
                        placeholder="Alamat lengkap sekolah asal"></textarea>
                    </div>
                  </div>
                </div>

                {/* Universitas & Jurusan (untuk alumni) */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                    Informasi Alumni (Universitas)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Universitas</label>
                      <input type="text" className="input-field" value={form.universitas}
                        onChange={e => setForm({ ...form, universitas: e.target.value })}
                        placeholder="Contoh: Universitas Indonesia" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Jurusan</label>
                      <input type="text" className="input-field" value={form.jurusan}
                        onChange={e => setForm({ ...form, jurusan: e.target.value })}
                        placeholder="Contoh: Teknik Informatika" />
                    </div>
                  </div>
                </div>

                {/* Tampilan Foto (upload/hapus hanya di Detail Siswa) */}
                {renderFotoSection()}

                <div className="flex gap-3 mt-6">
                  <button type="submit" className="btn-primary flex-1">
                    {editing ? 'Simpan Perubahan' : 'Tambah Siswa'}
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
