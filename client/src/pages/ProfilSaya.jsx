import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getGuruById, getKelasByWali, uploadFotoGuru, deleteFotoGuru, ubahPassword, updateGuru, createRiwayatPendidikan, updateRiwayatPendidikan, deleteRiwayatPendidikan } from '../api'
import {
  User, Phone, MapPin, Calendar, BookOpen, Hash,
  School, Loader2, Camera, ZoomIn, Crop, X, GraduationCap,
  Users, Key, Lock, CheckCircle, Eye, EyeOff, ArrowLeft, Pencil, Plus,
  GraduationCap as Diploma, Save, Edit2, Trash2
} from 'lucide-react'
import Cropper from 'react-easy-crop'
import { getCroppedImg, blobToFile } from '../utils/cropImage'
import toast from 'react-hot-toast'

export default function ProfilSaya() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const guruId = user?.guru_id

  const [guru, setGuru] = useState(null)
  const [kelasWali, setKelasWali] = useState([])
  const [riwayatList, setRiwayatList] = useState([])
  const [loading, setLoading] = useState(true)

  // ─── Riwayat Pendidikan CRUD State ───
  const [showRiwayatModal, setShowRiwayatModal] = useState(false)
  const [editingRiwayat, setEditingRiwayat] = useState(null)
  const [savingRiwayat, setSavingRiwayat] = useState(false)
  const [riwayatForm, setRiwayatForm] = useState({
    id_guru: '', jenjang: 'SMA', nama_sekolah: '', jurusan: '',
    tahun_masuk: new Date().getFullYear(), tahun_lulus: '',
  })

  const currentYear = new Date().getFullYear()
  const tahunOptions = Array.from({ length: 50 }, (_, i) => currentYear - i)

  // ─── Foto State ───
  const [showCropModal, setShowCropModal] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [fotoError, setFotoError] = useState(false)
  const fotoInputRef = useRef(null)

  // ─── Edit Profil State ───
  const [isEditing, setIsEditing] = useState(false)
  const [savingProfil, setSavingProfil] = useState(false)
  const [editForm, setEditForm] = useState({
    nik: '', nuptk: '', nama: '', jenis_kelamin: 'L',
    tempat_lahir: '', tanggal_lahir: '', alamat: '', no_telp: '',
  })

  // Populate editForm when guru data loads
  useEffect(() => {
    if (guru) {
      setEditForm({
        nik: guru.nik || '',
        nuptk: guru.nuptk || '',
        nama: guru.nama || '',
        jenis_kelamin: guru.jenis_kelamin || 'L',
        tempat_lahir: guru.tempat_lahir || '',
        tanggal_lahir: guru.tanggal_lahir ? formatDateForInput(guru.tanggal_lahir) : '',
        alamat: guru.alamat || '',
        no_telp: guru.no_telp || '',
      })
    }
  }, [guru])

  // ─── Ubah Password State ───
  const [showUbahPassword, setShowUbahPassword] = useState(false)
  const [passwordLama, setPasswordLama] = useState('')
  const [passwordBaru, setPasswordBaru] = useState('')
  const [konfirmasiPassword, setKonfirmasiPassword] = useState('')
  const [showPasswordLama, setShowPasswordLama] = useState(false)
  const [showPasswordBaru, setShowPasswordBaru] = useState(false)
  const [showKonfirmasi, setShowKonfirmasi] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // Reset fotoError
  useEffect(() => { setFotoError(false) }, [guru?.foto, fotoPreview])

  useEffect(() => {
    if (!guruId) {
      setLoading(false)
      return
    }
    loadData()
  }, [guruId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [guruRes, kelasRes] = await Promise.all([
        getGuruById(guruId),
        getKelasByWali(guruId),
      ])
      setGuru(guruRes.data)
      setRiwayatList(guruRes.data?.riwayat_pendidikan || [])
      setKelasWali(kelasRes.data || [])
    } catch (error) {
      toast.error('Gagal memuat data profil')
    } finally {
      setLoading(false)
    }
  }

  // ─── Foto Upload / Crop ───
  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleFotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      toast.error('Format foto tidak didukung. Gunakan JPG/JPEG, PNG, GIF, atau WebP')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCropImageSrc(ev.target.result)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedAreaPixels(null)
      setShowCropModal(true)
    }
    reader.readAsDataURL(file)
  }

  const handleCropCancel = () => {
    setShowCropModal(false)
    setCropImageSrc(null)
    setCroppedAreaPixels(null)
    if (fotoInputRef.current) fotoInputRef.current.value = ''
  }

  const handleCropSave = async () => {
    if (!cropImageSrc || !croppedAreaPixels) {
      toast.error('Silakan pilih area crop terlebih dahulu')
      return
    }
    try {
      const blob = await getCroppedImg(cropImageSrc, croppedAreaPixels, 400)
      const croppedFile = blobToFile(blob, 'foto_guru.jpg')
      if (croppedFile.size > 2 * 1024 * 1024) {
        toast.error('Hasil crop terlalu besar. Silakan crop area yang lebih kecil.')
        return
      }
      if (fotoPreview?.startsWith('blob:')) URL.revokeObjectURL(fotoPreview)
      setFotoPreview(URL.createObjectURL(blob))
      setShowCropModal(false)
      setCropImageSrc(null)

      setUploadingFoto(true)
      try {
        await uploadFotoGuru(guruId, croppedFile)
        toast.success('Foto berhasil diupload')
        loadData()
      } catch (err) {
        toast.error('Gagal mengupload foto')
      }
      setUploadingFoto(false)
    } catch (error) {
      toast.error('Gagal memproses crop foto')
    }
  }

  const handleDeleteFoto = async () => {
    if (!confirm('Hapus foto profil Anda?')) return
    try {
      await deleteFotoGuru(guruId)
      toast.success('Foto berhasil dihapus')
      setFotoPreview(null)
      loadData()
    } catch (error) {
      toast.error('Gagal menghapus foto')
    }
  }

  // ─── Ubah Password ───
  const handleUbahPassword = async (e) => {
    e.preventDefault()
    if (!passwordLama || !passwordBaru || !konfirmasiPassword) {
      return toast.error('Semua field password harus diisi')
    }
    if (passwordBaru.length < 6) {
      return toast.error('Password baru minimal 6 karakter')
    }
    if (passwordBaru !== konfirmasiPassword) {
      return toast.error('Konfirmasi password tidak cocok')
    }

    setSavingPassword(true)
    try {
      await ubahPassword({ password_lama: passwordLama, password_baru: passwordBaru })
      toast.success('Password berhasil diubah')
      setPasswordLama('')
      setPasswordBaru('')
      setKonfirmasiPassword('')
      setShowUbahPassword(false)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal mengubah password')
    } finally {
      setSavingPassword(false)
    }
  }

  // ─── Simpan Profil ───
  const handleSimpanProfil = async (e) => {
    e.preventDefault()
    if (!editForm.nama) return toast.error('Nama lengkap harus diisi')

    setSavingProfil(true)
    try {
      await updateGuru(guruId, editForm)
      toast.success('Profil berhasil diperbarui')
      setIsEditing(false)
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan profil')
    } finally {
      setSavingProfil(false)
    }
  }

  // ─── Riwayat Pendidikan CRUD ───
  const openTambahRiwayat = () => {
    setEditingRiwayat(null)
    setRiwayatForm({
      id_guru: guruId,
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
      id_guru: guruId,
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
    if (!riwayatForm.jenjang || !riwayatForm.nama_sekolah || !riwayatForm.tahun_masuk) {
      return toast.error('Jenjang, nama sekolah, dan tahun masuk harus diisi')
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
      loadData()
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
      loadData()
    } catch (error) {
      toast.error('Gagal menghapus riwayat pendidikan')
    }
  }

  if (!guruId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <User className="w-16 h-16 mb-4 opacity-30" />
        <h2 className="text-lg font-semibold text-gray-500">Akun karyawan tidak ditemukan</h2>
        <p className="text-sm mt-1">Hubungi administrator untuk informasi lebih lanjut.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-annajah-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Memuat profil...</p>
        </div>
      </div>
    )
  }

  if (!guru) return null

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  }

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

  const getInitials = (nama) => {
    return nama?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">          <button
          onClick={() => navigate('/guru-dashboard')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors group"
        >
          <div className="p-1.5 rounded-lg bg-white border border-gray-200 shadow-sm group-hover:shadow transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium">Kembali ke Dashboard</span>
        </button>
        <button
          onClick={() => {
            if (isEditing) {
              setIsEditing(false)
              // Reset form to original data
              setEditForm({
                nik: guru.nik || '', nuptk: guru.nuptk || '', nama: guru.nama || '',
                jenis_kelamin: guru.jenis_kelamin || 'L', tempat_lahir: guru.tempat_lahir || '',
                tanggal_lahir: guru.tanggal_lahir ? formatDateForInput(guru.tanggal_lahir) : '',
                alamat: guru.alamat || '', no_telp: guru.no_telp || '',
              })
            } else {
              setIsEditing(true)
            }
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            isEditing
              ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              : 'bg-annajah-500 text-white hover:bg-annajah-600 shadow-sm'
          }`}
        >
          <Pencil className="w-4 h-4" />
          {isEditing ? 'Batal Edit' : 'Edit Profil'}
        </button>
      </div>

      {/* Profile Card */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-annajah-600 to-annajah-800 px-6 py-8 sm:px-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
            {/* Foto */}
            <div
              className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-4 border-white/30 shadow-xl flex-shrink-0 -mb-16 sm:-mb-20 bg-white group cursor-pointer"
              onClick={() => fotoInputRef.current?.click()}
            >
              {(guru.foto || fotoPreview) && !fotoError ? (
                <img
                  src={fotoPreview || `/uploads/guru/${guru.foto}`}
                  alt={guru.nama}
                  className="w-full h-full object-cover"
                  onError={() => setFotoError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-annajah-100">
                  <span className="text-annajah-600 text-3xl font-bold">{getInitials(guru.nama)}</span>
                </div>
              )}

              {/* Overlay hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                <div className="text-white text-xs font-medium flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <Camera className="w-3.5 h-3.5" />
                  {guru.foto ? 'Ganti Foto' : 'Upload Foto'}
                </div>
              </div>

              {/* Tombol Hapus Foto */}
              {guru.foto && !uploadingFoto && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDeleteFoto() }}
                  className="absolute bottom-2 right-2 z-10 text-white text-[10px] font-medium flex items-center gap-1 bg-red-500/60 hover:bg-red-500/80 backdrop-blur-sm px-2 py-1 rounded-full transition-all opacity-0 group-hover:opacity-100"
                  title="Hapus foto"
                >
                  <X className="w-3 h-3" /> Hapus
                </button>
              )}

              {uploadingFoto && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}

              <input
                ref={fotoInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp"
                className="hidden"
                onChange={handleFotoSelect}
              />
            </div>

            {/* Info dasar */}
            <div className="text-white text-center sm:text-left pb-1 flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">{guru.nama}</h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-white/80 text-sm">
                {guru.nik && (
                  <span className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" /> NIK: {guru.nik}
                  </span>
                )}
                {guru.jenis_kelamin && (
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {guru.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> @{guru.username || user.username}
                </span>
              </div>
            </div>

            {/* Role badge */}
            <div className="pb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-sm bg-white/20 text-white border-white/30">
                <GraduationCap className="w-3.5 h-3.5" />
                Karyawan
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6 pt-24 sm:pt-20 pb-6">
          <div className="bg-gradient-to-br from-annajah-50 to-white rounded-xl p-4 border border-annajah-100">
            <div className="flex items-center gap-2 text-annajah-600 mb-1">
              <School className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Kelas Wali</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{kelasWali.length}</p>
            {kelasWali.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {kelasWali.map(k => (
                  <span
                    key={k.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-annajah-100 text-annajah-700 border border-annajah-200"
                  >
                    <School className="w-3 h-3" />
                    {k.nama_kelas}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">belum ditetapkan</p>
            )}
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl p-4 border border-emerald-100">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Bergabung</span>
            </div>
            <p className="text-xl font-bold text-gray-800">{formatDate(guru.created_at)}</p>
            <p className="text-xs text-gray-400 mt-0.5">tanggal terdaftar</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Akun Login</span>
            </div>
            <p className="text-xl font-bold text-gray-800 truncate">{guru.username || user.username}</p>
            <p className="text-xs text-gray-400 mt-0.5">username login sistem</p>
          </div>
        </div>
      </div>

      {/* Biodata & Kelas Wali */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Biodata */}
        <div className="lg:col-span-3 card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-annajah-600" />
            Biodata Lengkap
          </h2>

          {isEditing ? (
            <form id="form-edit-profil" onSubmit={handleSimpanProfil}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">NIK</label>
                  <input type="text" className="input-field" placeholder="NIK"
                    value={editForm.nik} onChange={e => setEditForm({ ...editForm, nik: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">NUPTK</label>
                  <input type="text" className="input-field" placeholder="NUPTK"
                    value={editForm.nuptk} onChange={e => setEditForm({ ...editForm, nuptk: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Nama Lengkap <span className="text-red-400">*</span></label>
                  <input type="text" className="input-field" placeholder="Nama lengkap"
                    value={editForm.nama} onChange={e => setEditForm({ ...editForm, nama: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Jenis Kelamin</label>
                  <select className="input-field" value={editForm.jenis_kelamin}
                    onChange={e => setEditForm({ ...editForm, jenis_kelamin: e.target.value })}>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Tempat Lahir</label>
                  <input type="text" className="input-field" placeholder="Tempat lahir"
                    value={editForm.tempat_lahir} onChange={e => setEditForm({ ...editForm, tempat_lahir: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Tanggal Lahir</label>
                  <input type="date" className="input-field" value={editForm.tanggal_lahir}
                    onChange={e => setEditForm({ ...editForm, tanggal_lahir: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">No. Telepon</label>
                  <input type="text" className="input-field" placeholder="No. telepon"
                    value={editForm.no_telp} onChange={e => setEditForm({ ...editForm, no_telp: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-600 mb-1">Alamat</label>
                  <textarea className="input-field" rows={2} placeholder="Alamat lengkap"
                    value={editForm.alamat} onChange={e => setEditForm({ ...editForm, alamat: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => {
                  setIsEditing(false)
                  setEditForm({
                    nik: guru.nik || '', nuptk: guru.nuptk || '', nama: guru.nama || '',
                    jenis_kelamin: guru.jenis_kelamin || 'L', tempat_lahir: guru.tempat_lahir || '',
                    tanggal_lahir: guru.tanggal_lahir ? formatDateForInput(guru.tanggal_lahir) : '',
                    alamat: guru.alamat || '', no_telp: guru.no_telp || '',
                  })
                }} className="btn-secondary flex-1">Batal</button>
                <button type="submit" disabled={savingProfil} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {savingProfil ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {savingProfil ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <InfoItem label="NIK" value={guru.nik || '-'} icon={<Hash className="w-4 h-4 text-gray-400" />} />
              <InfoItem label="NUPTK" value={guru.nuptk || '-'} icon={<Hash className="w-4 h-4 text-gray-400" />} />
              <InfoItem label="Nama Lengkap" value={guru.nama} icon={<User className="w-4 h-4 text-gray-400" />} />
              <InfoItem
                label="Jenis Kelamin"
                value={guru.jenis_kelamin === 'L' ? 'Laki-laki' : guru.jenis_kelamin === 'P' ? 'Perempuan' : '-'}
                icon={<User className="w-4 h-4 text-gray-400" />}
              />
              <InfoItem label="Tempat Lahir" value={guru.tempat_lahir || '-'} icon={<MapPin className="w-4 h-4 text-gray-400" />} />
              <InfoItem label="Tanggal Lahir" value={formatDate(guru.tanggal_lahir)} icon={<Calendar className="w-4 h-4 text-gray-400" />} />
              <div className="sm:col-span-2">
                <InfoItem label="Alamat" value={guru.alamat || '-'} icon={<MapPin className="w-4 h-4 text-gray-400" />} />
              </div>
              <InfoItem label="No. Telepon" value={guru.no_telp || '-'} icon={<Phone className="w-4 h-4 text-gray-400" />} />
              <InfoItem label="Username" value={guru.username || user.username} icon={<User className="w-4 h-4 text-gray-400" />} />
              <InfoItem label="Tanggal Daftar" value={formatDate(guru.created_at)} icon={<Calendar className="w-4 h-4 text-gray-400" />} />
            </div>
          )}
        </div>

        {/* Kelas Wali & Ubah Password */}
        <div className="lg:col-span-2 space-y-6">
          {/* Kelas Wali */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <School className="w-5 h-5 text-annajah-600" />
              Kelas Wali
            </h2>

            {kelasWali.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <School className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Belum ditetapkan sebagai wali kelas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {kelasWali.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-annajah-50 to-blue-50 border border-annajah-100"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-annajah-500 to-annajah-600 flex items-center justify-center shadow-sm shrink-0">
                      <School className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{k.nama_kelas}</p>
                      <p className="text-xs text-gray-400">Tingkat {k.tingkat}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Link
              to="/siswa-wali"
              className="mt-4 w-full btn-secondary flex items-center justify-center gap-2 text-sm"
            >
              <BookOpen className="w-4 h-4" /> Lihat Siswa
            </Link>
          </div>

          {/* Ubah Password */}
          <div className="card">
            <button
              onClick={() => setShowUbahPassword(!showUbahPassword)}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Key className="w-5 h-5 text-annajah-600" />
                Ubah Password
              </h2>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showUbahPassword ? 'rotate-180' : ''}`} />
            </button>

            {showUbahPassword && (
              <form onSubmit={handleUbahPassword} className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                {/* Password Lama */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Password Lama</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPasswordLama ? 'text' : 'password'}
                      className="input-field pl-10 pr-10"
                      placeholder="Masukkan password lama"
                      value={passwordLama}
                      onChange={e => setPasswordLama(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordLama(!showPasswordLama)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswordLama ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Baru */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Password Baru</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showPasswordBaru ? 'text' : 'password'}
                      className="input-field pl-10 pr-10"
                      placeholder="Minimal 6 karakter"
                      value={passwordBaru}
                      onChange={e => setPasswordBaru(e.target.value)}
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordBaru(!showPasswordBaru)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswordBaru ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Konfirmasi Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Konfirmasi Password Baru</label>
                  <div className="relative">
                    <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showKonfirmasi ? 'text' : 'password'}
                      className="input-field pl-10 pr-10"
                      placeholder="Ulangi password baru"
                      value={konfirmasiPassword}
                      onChange={e => setKonfirmasiPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKonfirmasi(!showKonfirmasi)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showKonfirmasi ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingPassword}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {savingPassword ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4" />
                  )}
                  {savingPassword ? 'Menyimpan...' : 'Simpan Password Baru'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Riwayat Pendidikan */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Diploma className="w-5 h-5 text-annajah-600" />
            Riwayat Pendidikan
          </h2>
          <button onClick={openTambahRiwayat} className="btn-primary flex items-center gap-1.5 text-xs py-2">
            <Plus className="w-3.5 h-3.5" /> Tambah
          </button>
        </div>

        {riwayatList.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Diploma className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada riwayat pendidikan</p>
            <button onClick={openTambahRiwayat} className="text-annajah-600 hover:text-annajah-800 text-sm font-medium mt-1">
              + Tambah sekarang
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {riwayatList.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:shadow-sm hover:border-gray-200 transition-all group"
              >
                {/* Jenjang Badge */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${jenjangBadge(item.jenjang).split(' ')[0]}`}>
                  <span className="text-sm font-bold">{item.jenjang}</span>
                </div>

                {/* Detail */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{item.nama_sekolah}</p>
                  {item.jurusan && (
                    <p className="text-xs text-gray-500 mt-0.5">{item.jurusan}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {item.tahun_masuk}{item.tahun_lulus ? ` - ${item.tahun_lulus}` : ' - Sekarang'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                  <button
                    onClick={() => openEditRiwayat(item)}
                    className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleHapusRiwayat(item)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Riwayat Pendidikan */}
      {showRiwayatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowRiwayatModal(false)}>
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

      {/* Crop Foto Modal */}
      {showCropModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70" onClick={handleCropCancel}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-semibold text-gray-800">Crop Foto</h2>
                <button onClick={handleCropCancel} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">Seret untuk memilih area foto. Gunakan slider untuk zoom.</p>

              <div className="relative w-full h-72 md:h-80 bg-gray-900 rounded-xl overflow-hidden">
                <Cropper
                  image={cropImageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1 / 1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              <div className="flex items-center gap-3 mt-4">
                <ZoomIn className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={e => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-annajah-600"
                />
                <ZoomIn className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={handleCropSave} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Crop className="w-4 h-4" /> Terapkan Crop
                </button>
                <button onClick={handleCropCancel} className="btn-secondary flex-1">Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Info Item Component ───
function InfoItem({ label, value, icon }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-gray-800 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  )
}

// ─── ChevronDown Icon Component ───
function ChevronDown({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
