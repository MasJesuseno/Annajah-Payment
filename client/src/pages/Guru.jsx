import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getGuru, createGuru, updateGuru, deleteGuru, uploadFotoGuru, deleteFotoGuru, getKelas, exportGuru, exportGuruPdf, importGuru, downloadTemplateGuru, getRiwayatPendidikan, createRiwayatPendidikan, updateRiwayatPendidikan, deleteRiwayatPendidikan } from '../api'
import { Plus, Pencil, Trash2, Search, User, Key, X, Camera, Crop, ZoomIn, AlertTriangle, CheckCircle, Loader2, Image as ImageIcon, GraduationCap, Eye, FileDown, FileText, Upload, Download, FileSpreadsheet, AlertCircle, Save, BookOpen } from 'lucide-react'
import Cropper from 'react-easy-crop'
import { getCroppedImg, blobToFile } from '../utils/cropImage'
import toast from 'react-hot-toast'

export default function Guru() {
  const location = useLocation()
  const [guru, setGuru] = useState([])
  const [kelas, setKelas] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterJenisKaryawan, setFilterJenisKaryawan] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // ── Riwayat Pendidikan State ──
  const [riwayatList, setRiwayatList] = useState([])
  const [showRiwayatModal, setShowRiwayatModal] = useState(false)
  const [editingRiwayat, setEditingRiwayat] = useState(null)
  const [savingRiwayat, setSavingRiwayat] = useState(false)
  const [riwayatForm, setRiwayatForm] = useState({
    id_guru: '', jenjang: 'SMA', nama_sekolah: '', jurusan: '',
    tahun_masuk: new Date().getFullYear(), tahun_lulus: '',
  })

  const currentYear = new Date().getFullYear()
  const tahunOptions = Array.from({ length: 50 }, (_, i) => currentYear - i)

  const openTambahRiwayat = () => {
    if (!editing) return toast.error('Simpan data karyawan terlebih dahulu')
    setEditingRiwayat(null)
    setRiwayatForm({
      id_guru: editing.id,
      jenjang: 'SMA',
      nama_sekolah: '',
      jurusan: '',
      tahun_masuk: currentYear,
      tahun_lulus: '',
    })
    setShowRiwayatModal(true)
  }

  const openEditRiwayat = (item) => {
    setEditingRiwayat(item)
    setRiwayatForm({
      id_guru: editing.id,
      jenjang: item.jenjang,
      nama_sekolah: item.nama_sekolah,
      jurusan: item.jurusan || '',
      tahun_masuk: item.tahun_masuk,
      tahun_lulus: item.tahun_lulus || '',
    })
    setShowRiwayatModal(true)
  }

  const handleSimpanRiwayat = async (e) => {
    e.preventDefault()
    if (!riwayatForm.nama_sekolah || !riwayatForm.tahun_masuk) {
      return toast.error('Nama sekolah dan tahun masuk harus diisi')
    }
    setSavingRiwayat(true)
    try {
      const payload = {
        ...riwayatForm,
        tahun_lulus: riwayatForm.tahun_lulus || null,
        jurusan: riwayatForm.jurusan || null,
      }
      if (editingRiwayat) {
        await updateRiwayatPendidikan(editingRiwayat.id, payload)
        toast.success('Riwayat pendidikan berhasil diupdate')
      } else {
        await createRiwayatPendidikan(payload)
        toast.success('Riwayat pendidikan berhasil ditambahkan')
      }
      setShowRiwayatModal(false)
      loadRiwayat()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan riwayat pendidikan')
    } finally {
      setSavingRiwayat(false)
    }
  }

  const handleHapusRiwayat = async (item) => {
    if (!confirm(`Hapus riwayat pendidikan ${item.nama_sekolah}?`)) return
    try {
      await deleteRiwayatPendidikan(item.id)
      toast.success('Riwayat pendidikan berhasil dihapus')
      loadRiwayat()
    } catch (error) {
      toast.error('Gagal menghapus riwayat pendidikan')
    }
  }

  const loadRiwayat = async (guruId) => {
    const id = guruId || editing?.id
    if (!id) return
    try {
      const res = await getRiwayatPendidikan(id)
      setRiwayatList(res.data)
    } catch {
      // silent
    }
  }

  const jenjangBadge = (jenjang) => {
    const colors = {
      'SD': 'bg-blue-100 text-blue-700 border-blue-200',
      'SMP': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'SMA': 'bg-amber-100 text-amber-700 border-amber-200',
      'S1': 'bg-purple-100 text-purple-700 border-purple-200',
      'S2': 'bg-rose-100 text-rose-700 border-rose-200',
      'S3': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    }
    return colors[jenjang] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  // Import state
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const importFileInputRef = useRef(null)

  // Form state
  const [form, setForm] = useState({
    nik: '', nuptk: '', nama: '', jenis_kelamin: 'L', tempat_lahir: '',
    tanggal_lahir: '', alamat: '', no_telp: '', username: '', password: '',
    kelas_wali_ids: [], jenis_karyawan: 'Guru',
  })

  // Foto state
  const [fotoPreview, setFotoPreview] = useState(null)
  const [fotoError, setFotoError] = useState(false)
  const [fotoFile, setFotoFile] = useState(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [showCropModal, setShowCropModal] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const fotoInputRef = useRef(null)

  // Reset fotoError on preview change
  useEffect(() => { setFotoError(false) }, [fotoPreview])

  useEffect(() => {
    loadData()
    loadKelas()
  }, [])

  // Handle editing from detail page (via location state)
  useEffect(() => {
    if (location.state?.editGuru) {
      openEditModal(location.state.editGuru)
      // Clear state so refresh doesn't re-open
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const loadData = async () => {
    try {
      const res = await getGuru()
      setGuru(res.data)
    } catch {
      toast.error('Gagal memuat data karyawan')
    } finally {
      setLoading(false)
    }
  }

  const loadKelas = async () => {
    try {
      const res = await getKelas()
      setKelas(res.data)
    } catch {
      // silent — kelas list not critical
    }
  }

  const openCreateModal = () => {
    setEditing(null)
    setForm({ nik: '', nuptk: '', nama: '', jenis_kelamin: 'L', tempat_lahir: '', tanggal_lahir: '', alamat: '', no_telp: '', username: '', password: '', kelas_wali_ids: [], jenis_karyawan: 'Guru' })
    setFotoPreview(null)
    setFotoFile(null)
    setFotoError(false)
    setShowModal(true)
  }

  const openEditModal = (item) => {
    // Cari semua kelas yang memiliki guru ini sebagai wali kelas
    const kelasWaliIds = kelas.filter(k => k.id_wali === item.id).map(k => k.id)
    setEditing(item)
    setForm({
      nik: item.nik || '',
      nuptk: item.nuptk || '',
      nama: item.nama,
      jenis_kelamin: item.jenis_kelamin || 'L',
      tempat_lahir: item.tempat_lahir || '',
      tanggal_lahir: item.tanggal_lahir ? formatDateForInput(item.tanggal_lahir) : '',
      alamat: item.alamat || '',
      no_telp: item.no_telp || '',
      username: item.username || '',
      password: '',
      kelas_wali_ids: kelasWaliIds,
      jenis_karyawan: item.jenis_karyawan || 'Guru',
    })
    setFotoPreview(item.foto ? `/uploads/guru/${item.foto}` : null)
    setFotoFile(null)
    setFotoError(false)
    setShowModal(true)
    // Load riwayat pendidikan
    loadRiwayat(item.id)
  }

  // Helper: format date to YYYY-MM-DD
  function formatDateForInput(value) {
    if (!value) return ''
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
    const d = new Date(value)
    if (isNaN(d.getTime())) return value
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nama) return toast.error('Nama karyawan harus diisi')
    if (!editing && !form.username) return toast.error('Username harus diisi untuk login')
    if (!editing && !form.password) return toast.error('Password harus diisi')
    if (form.password && form.password.length < 6) return toast.error('Password minimal 6 karakter')

    setSaving(true)
    try {
      if (editing) {
        const payload = { ...form }
        if (!payload.password) delete payload.password
        // kelas_wali_ids dikirim sebagai array (bisa kosong jika tidak ada kelas dipilih)
        await updateGuru(editing.id, payload)
        toast.success('Data karyawan berhasil diupdate')

        // Upload foto if changed
        if (fotoFile && editing.id) {
          try {
            setUploadingFoto(true)
            await uploadFotoGuru(editing.id, fotoFile)
          } catch (err) {
            toast.error('Gagal upload foto')
          }
          setUploadingFoto(false)
        }
      } else {
        const res = await createGuru(form)
        toast.success('Karyawan baru berhasil ditambahkan')

        // Upload foto if any
        if (fotoFile && res.data?.id) {
          try {
            setUploadingFoto(true)
            await uploadFotoGuru(res.data.id, fotoFile)
          } catch (err) {
            toast.error('Gagal upload foto')
          }
          setUploadingFoto(false)
        }
      }
      setShowModal(false)
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan data karyawan')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    try {
      await deleteGuru(item.id)
      setGuru(prev => prev.filter(g => g.id !== item.id))
      toast.success('Karyawan berhasil dihapus')
      setDeleteConfirm(null)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menghapus karyawan')
    }
  }

  // ── Import ──
  const handleFileDrop = (e) => {
    const file = e.dataTransfer.files[0]
    if (file) handleImportFileSelect(file)
  }

  const handleImportFileSelect = (file) => {
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
      const res = await importGuru(importFile)
      setImportResult(res.data)
      toast.success('Import selesai')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal mengimport data')
      setImportResult(null)
    } finally {
      setImportLoading(false)
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const res = await downloadTemplateGuru()
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'template_import_karyawan.xlsx'
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Template berhasil diunduh')
    } catch (error) {
      toast.error('Gagal mengunduh template')
    }
  }

  // ── Foto Upload / Crop ──
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowed.includes(file.type)) {
      toast.error('Format foto tidak didukung. Gunakan JPG/JPEG, PNG, GIF, atau WebP')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setCropImageSrc(reader.result)
      setShowCropModal(true)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleCropSave = async () => {
    if (!cropImageSrc || !croppedAreaPixels) return
    try {
      const croppedImg = await getCroppedImg(cropImageSrc, croppedAreaPixels)
      const file = blobToFile(croppedImg, 'foto-guru.jpg')
      if (fotoPreview?.startsWith('blob:')) URL.revokeObjectURL(fotoPreview)
      setFotoPreview(URL.createObjectURL(file))
      setFotoFile(file)
      setShowCropModal(false)
      setCropImageSrc(null)
    } catch {
      toast.error('Gagal memotong foto')
    }
  }

  const handleHapusFoto = () => {
    if (fotoPreview?.startsWith('blob:')) URL.revokeObjectURL(fotoPreview)
    setFotoPreview(null)
    setFotoFile(null)
    if (editing?.foto) {
      deleteFotoGuru(editing.id).catch(() => {})
    }
  }

  const handleExportExcel = async () => {
    try {
      const params = {}
      if (search) params.search = search
      const res = await exportGuru(params)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `data_karyawan_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Data karyawan berhasil diexport')
    } catch (error) {
      toast.error('Gagal mengexport data karyawan')
    }
  }

  const handleExportPdf = async () => {
    try {
      const params = {}
      if (search) params.search = search
      const res = await exportGuruPdf(params)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `data_karyawan_${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Data karyawan berhasil diexport')
    } catch (error) {
      toast.error('Gagal mengexport PDF karyawan')
    }
  }

  const filtered = guru.filter(g => {
    const matchSearch = g.nama.toLowerCase().includes(search.toLowerCase()) ||
      (g.nik || '').toLowerCase().includes(search.toLowerCase()) ||
      (g.nuptk || '').toLowerCase().includes(search.toLowerCase()) ||
      (g.username || '').toLowerCase().includes(search.toLowerCase())
    const matchJenis = !filterJenisKaryawan || g.jenis_karyawan === filterJenisKaryawan
    return matchSearch && matchJenis
  })

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-annajah-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Data Karyawan</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola data karyawan dan wali kelas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownloadTemplate} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" /> Template
          </button>
          <button onClick={() => { setImportResult(null); setImportFile(null); setShowImportModal(true) }}
            className="btn-secondary flex items-center gap-2">
            <Upload className="w-4 h-4" /> Import
          </button>
          <button onClick={handleExportExcel} className="btn-secondary flex items-center gap-2">
            <FileDown className="w-4 h-4" /> Export Excel
          </button>
          <button onClick={handleExportPdf} className="btn-secondary flex items-center gap-2">
            <FileText className="w-4 h-4" /> Export PDF
          </button>
          <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Tambah Karyawan
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari karyawan..."
            className="input-field pl-10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field sm:max-w-[200px]"
          value={filterJenisKaryawan}
          onChange={e => setFilterJenisKaryawan(e.target.value)}
        >
          <option value="">Semua Jenis Karyawan</option>
          <option value="Guru">Guru</option>
          <option value="Tata Usaha">Tata Usaha</option>
          <option value="Umum">Umum</option>
          <option value="Konsultan">Konsultan</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Foto</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Nama</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">NUPTK</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">NIK</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">L/P</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Jenis Karyawan</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Pend. Terakhir</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Username</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Mapel</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Wali Kelas</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(g => (
                <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                      {g.foto ? (
                        <img src={`/uploads/guru/${g.foto}`} alt="" className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<span class=\"text-xs font-bold text-gray-400\">' + g.nama.charAt(0).toUpperCase() + '</span>' }} />
                      ) : (
                        <span className="text-xs font-bold text-gray-400">{g.nama.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/guru/${g.id}`} className="text-sm font-medium text-annajah-600 hover:text-annajah-800 hover:underline">
                      {g.nama}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">{g.nuptk || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">{g.nik || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">{g.jenis_kelamin === 'L' ? 'Laki-laki' : g.jenis_kelamin === 'P' ? 'Perempuan' : '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      g.jenis_karyawan === 'Guru' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      g.jenis_karyawan === 'Tata Usaha' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                      g.jenis_karyawan === 'Konsultan' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      'bg-gray-50 text-gray-700 border border-gray-200'
                    }`}>{g.jenis_karyawan || 'Guru'}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-sm text-gray-500">{g.pendidikan_terakhir || '-'}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-sm text-gray-500">{g.username || '-'}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-annajah-600">
                      <BookOpen className="w-3.5 h-3.5" />
                      {g.jumlah_mapel || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(() => {
                        const waliKelas = kelas.filter(k => k.id_wali === g.id)
                        return waliKelas.length > 0 ? (
                          waliKelas.map(k => (
                            <span key={k.id} className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-annajah-50 text-annajah-700 border border-annajah-200">
                              {k.nama_kelas}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )
                      })()}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/guru/${g.id}`}
                        className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => openEditModal(g)}
                        className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(g)}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                    <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Tidak ada karyawan ditemukan</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => { if (!importLoading) { setShowImportModal(false); setImportResult(null); setImportFile(null) } }}>
          <div className="modal-content max-w-xl" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Import Data Karyawan</h2>
              <p className="text-sm text-gray-500 mb-5">Upload file Excel untuk mengimport data karyawan secara massal.</p>

              {!importResult ? (
                <>
                  {/* Upload Area */}
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                      ${dragOver ? 'border-annajah-500 bg-annajah-50' : 'border-gray-300 hover:border-annajah-400 hover:bg-gray-50'}`}
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); handleFileDrop(e) }}
                    onClick={() => importFileInputRef.current?.click()}
                  >
                    <input ref={importFileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                      onChange={e => handleImportFileSelect(e.target.files[0])} />
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
                    <p><span className="font-semibold">Nama Lengkap*</span>, <span className="font-semibold">Username*</span>, <span className="font-semibold">Password*</span>, NIK, Jenis Kelamin (L/P), <span className="font-semibold">Jenis Karyawan</span> (Guru/Tata Usaha/Umum/Konsultan), Tempat Lahir, Tanggal Lahir, Alamat, No. Telepon</p>
                    <p className="mt-1">(*) Wajib diisi. Password minimal 6 karakter. Gunakan <strong>Template</strong> untuk melihat format yang benar.</p>
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
                        <CheckCircle className="w-8 h-8 text-green-500" />
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

      {/* Modal Tambah/Edit Guru */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex justify-center p-4 bg-black/50 overflow-y-auto" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-8" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 bg-white">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {editing ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editing ? 'Ubah data karyawan' : 'Buat data karyawan baru dengan akun login'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Data Diri Guru */}
              <div className="p-6 border-b border-gray-100 bg-white">
                <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-annajah-600" />
                  Data Diri Karyawan
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Foto */}
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-600 mb-2">Foto</label>
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100 cursor-pointer group border-2 border-dashed border-gray-300 hover:border-annajah-400 transition-all"
                        onClick={() => fotoInputRef.current?.click()}
                      >
                        {uploadingFoto ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                          </div>
                        ) : null}
                        {fotoPreview && !fotoError ? (
                          <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover" onError={() => setFotoError(true)} />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <Camera className="w-8 h-8 mb-1" />
                            <span className="text-[10px]">Klik untuk upload</span>
                          </div>
                        )}
                        {/* Overlay hover */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                          <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 px-3 py-1 rounded-full">
                            {fotoPreview ? 'Ganti Foto' : 'Upload Foto'}
                          </span>
                        </div>
                        {/* Delete button */}
                        {fotoPreview && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleHapusFoto() }}
                            className="absolute top-1 right-1 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md z-20 opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <input ref={fotoInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleFileSelect} />
                      <span className="text-[10px] text-gray-400 text-center">JPG/JPEG, PNG, GIF, WebP. Maks 2MB.</span>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">NIK</label>
                        <input type="text" className="input-field" placeholder="Nomor Induk Kependudukan"
                          value={form.nik} onChange={e => setForm({ ...form, nik: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">NUPTK</label>
                        <input type="text" className="input-field" placeholder="Nomor Unik Pendidik dan Tenaga Kependidikan"
                          value={form.nuptk} onChange={e => setForm({ ...form, nuptk: e.target.value })} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Nama Lengkap <span className="text-red-400">*</span></label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" className="input-field pl-10" placeholder="Nama lengkap karyawan"
                          value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} required />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Jenis Kelamin</label>
                        <select className="input-field" value={form.jenis_kelamin}
                          onChange={e => setForm({ ...form, jenis_kelamin: e.target.value })}>
                          <option value="L">Laki-laki</option>
                          <option value="P">Perempuan</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Jenis Karyawan</label>
                        <select className="input-field" value={form.jenis_karyawan}
                          onChange={e => setForm({ ...form, jenis_karyawan: e.target.value })}>
                          <option value="Guru">Guru</option>
                          <option value="Tata Usaha">Tata Usaha</option>
                          <option value="Umum">Umum</option>
                          <option value="Konsultan">Konsultan</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Tempat Lahir</label>
                        <input type="text" className="input-field" placeholder="Tempat lahir"
                          value={form.tempat_lahir} onChange={e => setForm({ ...form, tempat_lahir: e.target.value })} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Tanggal Lahir</label>
                        <input type="date" className="input-field" value={form.tanggal_lahir}
                          onChange={e => setForm({ ...form, tanggal_lahir: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">No. Telepon</label>
                        <input type="text" className="input-field" placeholder="Nomor telepon"
                          value={form.no_telp} onChange={e => setForm({ ...form, no_telp: e.target.value })} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Alamat</label>
                      <textarea className="input-field" rows={2} placeholder="Alamat lengkap"
                        value={form.alamat} onChange={e => setForm({ ...form, alamat: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Wali Kelas (multi-select) */}
              <div className="px-6 py-4 border-b border-gray-100 bg-white">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-annajah-600" />
                  Wali Kelas
                </h4>
                <p className="text-xs text-gray-400 mb-3">Pilih kelas yang menjadi wali dari karyawan ini (opsional, bisa lebih dari satu).</p>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3 bg-white">
                  {kelas.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-2">Tidak ada kelas tersedia</p>
                  )}
                  {kelas.map(k => {
                    const checked = form.kelas_wali_ids.includes(k.id)
                    const isWaliOlehGuruLain = k.id_wali && k.id_wali !== (editing?.id)
                    return (
                      <label
                        key={k.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors
                          ${checked ? 'bg-annajah-50 border border-annajah-200' : 'hover:bg-gray-50 border border-transparent'}
                          ${isWaliOlehGuruLain ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-annajah-600 rounded border-gray-300 focus:ring-annajah-500"
                          checked={checked}
                          disabled={isWaliOlehGuruLain}
                          onChange={() => {
                            if (isWaliOlehGuruLain) return
                            setForm(prev => ({
                              ...prev,
                              kelas_wali_ids: checked
                                ? prev.kelas_wali_ids.filter(id => id !== k.id)
                                : [...prev.kelas_wali_ids, k.id],
                            }))
                          }}
                        />
                        <div className="flex items-center justify-between flex-1">
                          <span className="text-sm font-medium text-gray-700">{k.nama_kelas}</span>
                          {isWaliOlehGuruLain ? (
                            <span className="text-xs text-gray-400">(wali: {k.wali_kelas})</span>
                          ) : checked ? (
                            <span className="text-xs text-annajah-600 font-medium">Terpilih</span>
                          ) : null}
                        </div>
                      </label>
                    )
                  })}
                </div>
                {form.kelas_wali_ids.length > 0 && (
                  <p className="text-xs text-annajah-600 mt-1.5">
                    {form.kelas_wali_ids.length} kelas dipilih sebagai wali
                  </p>
                )}
              </div>

              {/* Riwayat Pendidikan */}
              <div className="px-6 py-4 border-b border-gray-100 bg-white">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-annajah-600" />
                  Riwayat Pendidikan
                </h4>
                <p className="text-xs text-gray-400 mb-3">Riwayat pendidikan karyawan (hanya untuk mode edit).</p>

                {editing ? (
                  <>
                    {riwayatList.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 border border-dashed border-gray-200 rounded-xl">
                        <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-xs">Belum ada riwayat pendidikan</p>
                        <button onClick={openTambahRiwayat} className="text-annajah-600 hover:text-annajah-800 text-xs font-medium mt-1">
                          + Tambah sekarang
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {riwayatList.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/50 group">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${jenjangBadge(item.jenjang).split(' ')[0]}`}>
                              <span className="text-xs font-bold">{item.jenjang}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{item.nama_sekolah}</p>
                              <p className="text-xs text-gray-400">
                                {item.jurusan ? `${item.jurusan} · ` : ''}
                                {item.tahun_masuk}{item.tahun_lulus ? ` - ${item.tahun_lulus}` : ' - Sekarang'}
                              </p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                              <button onClick={() => openEditRiwayat(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleHapusRiwayat(item)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Hapus">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        <button onClick={openTambahRiwayat} className="btn-secondary text-xs py-1.5 w-full flex items-center justify-center gap-1.5">
                          <Plus className="w-3 h-3" /> Tambah Riwayat
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 text-gray-400 border border-dashed border-gray-200 rounded-xl">
                    <p className="text-xs">Simpan data karyawan terlebih dahulu untuk menambah riwayat pendidikan</p>
                  </div>
                )}
              </div>

              {/* Akun Login */}
              <div className="px-6 py-4 border-b border-gray-100 bg-white">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Key className="w-4 h-4 text-annajah-600" />
                  Akun Login
                </h4>
                <p className="text-xs text-gray-400 mb-3">Buat akun login untuk karyawan ini agar bisa masuk ke sistem.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Username <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" className="input-field pl-10" placeholder="username untuk login"
                        value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                        required={!editing} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Password {!editing && <span className="text-red-400">*</span>}
                      {editing && <span className="text-gray-400 text-xs font-normal"> (kosongkan jika tidak diubah)</span>}
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="password" className="input-field pl-10" placeholder={editing ? 'Biarkan kosong' : 'Minimal 6 karakter'}
                        value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                        required={!editing} minLength={6} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="px-6 py-4 bg-white rounded-b-2xl">
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                    Batal
                  </button>
                  <button type="submit" disabled={saving || uploadingFoto} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    {saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Tambah Karyawan'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {showCropModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70" onClick={() => setShowCropModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Crop className="w-4 h-4 text-annajah-600" /> Crop Foto
              </h3>
              <button onClick={() => setShowCropModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="relative w-full h-80 bg-gray-900">
              <Cropper
                image={cropImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <ZoomIn className="w-4 h-4 text-gray-400 shrink-0" />
                <input type="range" min={1} max={3} step={0.1} value={zoom}
                  onChange={e => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-annajah-600" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowCropModal(false)} className="btn-secondary flex-1">Batal</button>
                <button onClick={handleCropSave} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Simpan Foto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Riwayat Pendidikan */}
      {showRiwayatModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50" onClick={() => setShowRiwayatModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-1">
                {editingRiwayat ? 'Edit Riwayat Pendidikan' : 'Tambah Riwayat Pendidikan'}
              </h3>
              <p className="text-xs text-gray-400 mb-5">
                {editingRiwayat ? 'Ubah data riwayat pendidikan' : 'Tambahkan riwayat pendidikan baru'}
              </p>

              <form onSubmit={handleSimpanRiwayat} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Jenjang <span className="text-red-400">*</span></label>
                  <select className="input-field" value={riwayatForm.jenjang}
                    onChange={e => setRiwayatForm({ ...riwayatForm, jenjang: e.target.value })} required>
                    <option value="SD">SD / Sederajat</option>
                    <option value="SMP">SMP / Sederajat</option>
                    <option value="SMA">SMA / Sederajat</option>
                    <option value="S1">S1 / D4</option>
                    <option value="S2">S2</option>
                    <option value="S3">S3</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Nama Sekolah / Institusi <span className="text-red-400">*</span></label>
                  <input type="text" className="input-field" placeholder="Nama sekolah atau universitas"
                    value={riwayatForm.nama_sekolah}
                    onChange={e => setRiwayatForm({ ...riwayatForm, nama_sekolah: e.target.value })}
                    required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Jurusan</label>
                  <input type="text" className="input-field" placeholder="IPA, IPS, Teknik Informatika, dll"
                    value={riwayatForm.jurusan}
                    onChange={e => setRiwayatForm({ ...riwayatForm, jurusan: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Tahun Masuk <span className="text-red-400">*</span></label>
                    <select className="input-field" value={riwayatForm.tahun_masuk}
                      onChange={e => setRiwayatForm({ ...riwayatForm, tahun_masuk: Number(e.target.value) })}
                      required>
                      {tahunOptions.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Tahun Lulus</label>
                    <select className="input-field" value={riwayatForm.tahun_lulus}
                      onChange={e => setRiwayatForm({ ...riwayatForm, tahun_lulus: e.target.value ? Number(e.target.value) : '' })}>
                      <option value="">- Belum Lulus -</option>
                      {tahunOptions.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowRiwayatModal(false)} className="btn-secondary flex-1">Batal</button>
                  <button type="submit" disabled={savingRiwayat} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {savingRiwayat ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {savingRiwayat ? 'Menyimpan...' : editingRiwayat ? 'Simpan Perubahan' : 'Tambah'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Hapus Karyawan?</h3>
              <p className="text-sm text-gray-500 mt-1">
                Yakin ingin menghapus <strong className="text-gray-700">{deleteConfirm.nama}</strong>?
                Semua data terkait dan akun loginnya akan dihapus.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Batal</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger flex-1 flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
