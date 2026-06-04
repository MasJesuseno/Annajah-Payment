import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getSiswaById, getTransaksi, getKehadiran, getKehadiranTren, updateKehadiran, downloadExcel, downloadExcelKehadiranSiswa, downloadPdfKehadiranSiswa, deleteSiswa, uploadFotoSiswa, deleteFotoSiswa, getBimbinganKonseling } from '../api'
import { useAuth } from '../context/AuthContext'
import {
  ArrowLeft, Edit2, Trash2, User, Mail, Phone, MapPin,
  Calendar, BookOpen, CreditCard, Hash, Award, AlertCircle,
  ChevronRight, FileText, Download, Loader2, School,
  Camera, ZoomIn, Crop, X, Clock, CheckCircle2, XCircle, HelpCircle, HeartHandshake
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Cropper from 'react-easy-crop'
import { getCroppedImg, blobToFile } from '../utils/cropImage'
import toast from 'react-hot-toast'

export default function DetailSiswa() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isGuru = user?.role === 'guru'
  const [siswa, setSiswa] = useState(null)
  const [transaksi, setTransaksi] = useState([])
  const [kehadiran, setKehadiran] = useState([])
  const [kehadiranStats, setKehadiranStats] = useState({ hadir: 0, ijin: 0, sakit: 0, alpa: 0, total: 0 })
  const [kehadiranTren, setKehadiranTren] = useState(null)
  const [loadingTren, setLoadingTren] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingKehadiran, setLoadingKehadiran] = useState(true)
  const [editingStatus, setEditingStatus] = useState(null)
  const [updatingStatus, setUpdatingStatus] = useState(null)
  const [bkData, setBkData] = useState([])
  const [loadingBk, setLoadingBk] = useState(true)
  const statusDropdownRef = useRef(null)
  const [stats, setStats] = useState({ totalTransaksi: 0, totalBayar: 0, sppLunas: 0, sppTotal: 0 })

  // ─── Foto Upload / Crop State ───
  const [showCropModal, setShowCropModal] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [fotoError, setFotoError] = useState(false)
  const fotoInputRef = useRef(null)

  // Reset fotoError saat foto berubah
  useEffect(() => {
    setFotoError(false)
  }, [siswa?.foto, fotoPreview])

  // Click outside to close status editor
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) {
        setEditingStatus(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    loadData()
  }, [id])

  const loadKehadiran = async () => {
    try {
      setLoadingKehadiran(true)
      setLoadingTren(true)
      const [kehadiranRes, trenRes] = await Promise.all([
        getKehadiran({ id_siswa: id, per_page: 50 }),
        getKehadiranTren({ id_siswa: id, periode: 'monthly' }).catch(() => null),
      ])
      const data = kehadiranRes.data?.data || kehadiranRes.data || []
      setKehadiran(data)
      const stats = { hadir: 0, ijin: 0, sakit: 0, alpa: 0, total: data.length }
      data.forEach((k) => {
        if (stats[k.status] !== undefined) stats[k.status]++
      })
      setKehadiranStats(stats)

      if (trenRes?.data) {
        setKehadiranTren(trenRes.data)
      }
    } catch (error) {
      // silent fail
    } finally {
      setLoadingKehadiran(false)
      setLoadingTren(false)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [siswaRes, transaksiRes] = await Promise.all([
        getSiswaById(id),
        getTransaksi({ id_siswa: id, limit: 10 }),
      ])
      setSiswa(siswaRes.data)
      const dataTransaksi = transaksiRes.data || []
      setTransaksi(dataTransaksi)

      // Load kehadiran
      loadKehadiran()
      // Load BK
      loadBk()

      // Hitung statistik
      const totalTransaksi = dataTransaksi.length
      const totalBayar = dataTransaksi.reduce((sum, t) => sum + Number(t.jumlah_bayar || 0), 0)

      // Hitung SPP
      const sppTransaksi = dataTransaksi.filter(t =>
        t.nama_pembayaran?.toLowerCase().includes('spp')
      )
      const sppLunas = [...new Set(sppTransaksi.map(t => t.bulan_bayar).filter(Boolean))].length

      setStats({
        totalTransaksi,
        totalBayar,
        sppLunas,
        sppTotal: Math.max(sppTransaksi.length, 12), // max 12 bulan
      })
    } catch (error) {
      toast.error('Gagal memuat data siswa')
      navigate('/siswa')
    } finally {
      setLoading(false)
    }
  }

  // ─── Foto Upload / Crop Handlers ───
  const handleFotoSelect = (e) => {
    const file = e.target.files?.[0]
    processFotoFile(file)
  }

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const processFotoFile = (file) => {
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
      const croppedFile = blobToFile(blob, 'foto_siswa.jpg')

      if (croppedFile.size > 2 * 1024 * 1024) {
        toast.error('Hasil crop terlalu besar. Silakan crop area yang lebih kecil.')
        return
      }

      if (fotoPreview?.startsWith('blob:')) URL.revokeObjectURL(fotoPreview)
      setFotoFile(croppedFile)
      setFotoPreview(URL.createObjectURL(blob))
      setShowCropModal(false)
      setCropImageSrc(null)

      // Upload foto langsung
      setUploadingFoto(true)
      try {
        await uploadFotoSiswa(id, croppedFile)
        toast.success('Foto berhasil diupload')
        // Muat ulang data siswa untuk memperbarui foto
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
    if (!confirm('Hapus foto siswa ini?')) return
    try {
      await deleteFotoSiswa(id)
      toast.success('Foto berhasil dihapus')
      setFotoPreview(null)
      setFotoFile(null)
      loadData()
    } catch (error) {
      toast.error('Gagal menghapus foto')
    }
  }

  const handleExportKehadiran = async () => {
    try {
      await downloadExcel(
        (params) => downloadExcelKehadiranSiswa(params),
        { id_siswa: id },
        `rekap_kehadiran_${siswa?.nis || id}.xlsx`
      )
      toast.success('Data kehadiran berhasil diexport')
    } catch (error) {
      toast.error('Gagal mengexport data kehadiran')
    }
  }

  const handleQuickEditStatus = async (kehadiranId, newStatus) => {
    if (updatingStatus) return
    setUpdatingStatus(kehadiranId)
    try {
      await updateKehadiran(kehadiranId, { status: newStatus })
      // Update local state
      setKehadiran(prev => prev.map(k =>
        k.id === kehadiranId ? { ...k, status: newStatus } : k
      ))
      // Recalculate stats
      setKehadiranStats(prev => {
        const updated = { ...prev }
        const oldRow = kehadiran.find(k => k.id === kehadiranId)
        if (oldRow && prev[oldRow.status] !== undefined) {
          updated[oldRow.status] = Math.max(0, prev[oldRow.status] - 1)
        }
        if (updated[newStatus] !== undefined) {
          updated[newStatus] = (updated[newStatus] || 0) + 1
        }
        return updated
      })
      setEditingStatus(null)
      toast.success('Status kehadiran berhasil diubah')
    } catch (error) {
      toast.error('Gagal mengubah status kehadiran')
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleExportKehadiranPdf = async () => {
    try {
      const res = await downloadPdfKehadiranSiswa({ id_siswa: id })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `rekap_kehadiran_${siswa?.nis || id}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('PDF kehadiran berhasil diexport')
    } catch (error) {
      toast.error('Gagal mengexport PDF kehadiran')
    }
  }

  const loadBk = async () => {
    try {
      setLoadingBk(true)
      const res = await getBimbinganKonseling({ id_siswa: id })
      setBkData(res.data || [])
    } catch {
      // silent fail
    } finally {
      setLoadingBk(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Yakin ingin menghapus siswa ini? Semua transaksinya juga akan dihapus.')) return
    try {
      await deleteSiswa(id)
      toast.success('Siswa berhasil dihapus')
      navigate('/siswa')
    } catch (error) {
      toast.error('Gagal menghapus siswa')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-annajah-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Memuat data siswa...</p>
        </div>
      </div>
    )
  }

  if (!siswa) return null

  const formatRupiah = (num) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num)

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const statusColor = {
    aktif: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    lulus: 'bg-blue-100 text-blue-700 border-blue-200',
    keluar: 'bg-red-100 text-red-700 border-red-200',
  }

  const statusIcon = {
    aktif: <Award className="w-3.5 h-3.5" />,
    lulus: <Award className="w-3.5 h-3.5" />,
    keluar: <AlertCircle className="w-3.5 h-3.5" />,
  }

  const getInitials = (nama) => {
    return nama
      ?.split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(isGuru ? '/siswa-wali' : '/siswa')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors group"
        >
          <div className="p-1.5 rounded-lg bg-white border border-gray-200 shadow-sm group-hover:shadow transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium">{isGuru ? 'Kembali ke Daftar Siswa' : 'Kembali ke Data Siswa'}</span>
        </button>
        {!isGuru && (
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/siswa', { state: { editSiswa: siswa } })}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Edit2 className="w-4 h-4" /> Edit
            </button>
            <button onClick={handleDelete} className="btn-secondary flex items-center gap-2 text-sm text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="w-4 h-4" /> Hapus
            </button>
          </div>
        )}
      </div>

      {/* Profile Card */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-annajah-600 to-annajah-800 px-6 py-8 sm:px-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
            {/* Foto - clickable with upload/delete */}
            <div className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-4 border-white/30 shadow-xl flex-shrink-0 -mb-16 sm:-mb-20 bg-white ${isGuru ? '' : 'group cursor-pointer'}`}
              onClick={() => isGuru ? null : fotoInputRef.current?.click()}>
              {(siswa.foto || fotoPreview) && !fotoError ? (
                <img
                  src={fotoPreview || `/uploads/siswa/${siswa.foto}`}
                  alt={siswa.nama}
                  className="w-full h-full object-cover"
                  onError={() => setFotoError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-annajah-100">
                  <span className="text-annajah-600 text-3xl font-bold">{getInitials(siswa.nama)}</span>
                </div>
              )}

              {/* Overlay hover untuk upload — hanya untuk non-guru */}
              {!isGuru && (
                <>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                    <div className="text-white text-xs font-medium flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      <Camera className="w-3.5 h-3.5" />
                      {siswa.foto ? 'Ganti Foto' : 'Upload Foto'}
                    </div>
                  </div>

                  {/* Tombol Hapus — terpisah dengan stopPropagation agar tidak trigger file picker */}
                  {siswa.foto && !uploadingFoto && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteFoto() }}
                      className="absolute bottom-2 right-2 z-10 text-white text-[10px] font-medium flex items-center gap-1 bg-red-500/60 hover:bg-red-500/80 backdrop-blur-sm px-2 py-1 rounded-full transition-all opacity-0 group-hover:opacity-100"
                      title="Hapus foto"
                    >
                      <Trash2 className="w-3 h-3" /> Hapus
                    </button>
                  )}

                  {/* Loading spinner saat upload */}
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
                </>
              )}
            </div>

            {/* Info dasar */}
            <div className="text-white text-center sm:text-left pb-1 flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">{siswa.nama}</h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-white/80 text-sm">
                <span className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> {siswa.nis}
                </span>
                {siswa.nisn && (
                  <span className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" /> NISN: {siswa.nisn}
                  </span>
                )}
                {siswa.nama_kelas && (
                  <span className="flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5" /> {siswa.nama_kelas}
                  </span>
                )}
              </div>
            </div>

            {/* Status badge */}
            <div className="pb-1">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-sm
                ${statusColor[siswa.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                {statusIcon[siswa.status]}
                {siswa.status?.charAt(0).toUpperCase() + siswa.status?.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 pt-24 sm:pt-20 pb-6">
          <div className="bg-gradient-to-br from-annajah-50 to-white rounded-xl p-4 border border-annajah-100">
            <div className="flex items-center gap-2 text-annajah-600 mb-1">
              <CreditCard className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total Transaksi</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{stats.totalTransaksi}</p>
            <p className="text-xs text-gray-400 mt-0.5">riwayat pembayaran</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl p-4 border border-emerald-100">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total Bayar</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{formatRupiah(stats.totalBayar)}</p>
            <p className="text-xs text-gray-400 mt-0.5">jumlah seluruh pembayaran</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">SPP Lunas</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{stats.sppLunas} <span className="text-sm font-normal text-gray-400">/ {stats.sppTotal} bln</span></p>
            <p className="text-xs text-gray-400 mt-0.5">pembayaran SPP</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl p-4 border border-purple-100">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <BookOpen className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Status</span>
            </div>
            <p className="text-2xl font-bold text-gray-800 capitalize">{siswa.status || '-'}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {siswa.status === 'aktif' ? 'Siswa aktif' : siswa.status === 'lulus' ? 'Telah lulus' : 'Tidak aktif'}
            </p>
          </div>
        </div>
      </div>

      {/* Biodata & Transaksi */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Biodata */}
        <div className="lg:col-span-3 card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-annajah-600" />
            Biodata Lengkap
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <InfoItem label="NIS" value={siswa.nis} icon={<Hash className="w-4 h-4 text-gray-400" />} />
            <InfoItem label="NISN" value={siswa.nisn || '-'} icon={<Award className="w-4 h-4 text-gray-400" />} />
            <InfoItem label="Nama Lengkap" value={siswa.nama} icon={<User className="w-4 h-4 text-gray-400" />} />
            <InfoItem
              label="Jenis Kelamin"
              value={siswa.jenis_kelamin === 'L' ? 'Laki-laki' : siswa.jenis_kelamin === 'P' ? 'Perempuan' : '-'}
              icon={<User className="w-4 h-4 text-gray-400" />}
            />
            <InfoItem label="Tempat Lahir" value={siswa.tempat_lahir || '-'} icon={<MapPin className="w-4 h-4 text-gray-400" />} />
            <InfoItem label="Tanggal Lahir" value={formatDate(siswa.tanggal_lahir)} icon={<Calendar className="w-4 h-4 text-gray-400" />} />
            <InfoItem label="Kelas" value={siswa.nama_kelas || '-'} icon={<School className="w-4 h-4 text-gray-400" />} />
            <InfoItem label="Tingkat" value={siswa.tingkat ? `Kelas ${siswa.tingkat}` : '-'} icon={<BookOpen className="w-4 h-4 text-gray-400" />} />
            <div className="sm:col-span-2">
              <InfoItem label="Alamat" value={siswa.alamat || '-'} icon={<MapPin className="w-4 h-4 text-gray-400" />} />
            </div>
            <InfoItem label="No. Telepon" value={siswa.no_telp || '-'} icon={<Phone className="w-4 h-4 text-gray-400" />} />
            <InfoItem label="Email" value={siswa.email || '-'} icon={<Mail className="w-4 h-4 text-gray-400" />} />
            <InfoItem label="Status" value={siswa.status || '-'} icon={<Award className="w-4 h-4 text-gray-400" />} />
            <InfoItem label="Asal Sekolah" value={siswa.asal_sekolah || '-'} icon={<School className="w-4 h-4 text-gray-400" />} />
            <InfoItem label="Alamat Sekolah" value={siswa.alamat_sekolah || '-'} icon={<MapPin className="w-4 h-4 text-gray-400" />} />
            <InfoItem label="Kota Asal Sekolah" value={siswa.kota_asal_sekolah || '-'} icon={<MapPin className="w-4 h-4 text-gray-400" />} />
            <InfoItem label="Universitas" value={siswa.universitas || '-'} icon={<School className="w-4 h-4 text-gray-400" />} />
            <InfoItem label="Jurusan" value={siswa.jurusan || '-'} icon={<BookOpen className="w-4 h-4 text-gray-400" />} />
            <InfoItem label="Tanggal Daftar" value={formatDate(siswa.created_at)} icon={<Calendar className="w-4 h-4 text-gray-400" />} />
          </div>
        </div>

        {/* Transaksi Terbaru */}
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-annajah-600" />
              Transaksi Terbaru
            </span>
            <Link
              to={`/transaksi?id_siswa=${siswa.id}`}
              className="text-xs text-annajah-600 hover:text-annajah-800 font-medium flex items-center gap-0.5"
            >
              Lihat Semua <ChevronRight className="w-3 h-3" />
            </Link>
          </h2>

          {transaksi.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Belum ada transaksi</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transaksi.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group cursor-default"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-800 truncate">{t.nama_pembayaran}</p>
                      <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        t.jenis_transaksi === 'Masuk'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {t.jenis_transaksi || 'Masuk'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      <span>{t.bulan_bayar || '-'}</span>
                      {t.tanggal_bayar && <span>· {formatDate(t.tanggal_bayar)}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-sm font-semibold text-emerald-600">{formatRupiah(t.jumlah_bayar)}</p>
                    {t.no_kwitansi && (
                      <p className="text-[10px] text-gray-400 font-mono">{t.no_kwitansi}</p>
                    )}
                  </div>
                </div>
              ))}
              {transaksi.length > 5 && (
                <Link
                  to={`/transaksi?id_siswa=${siswa.id}`}
                  className="block text-center text-sm text-annajah-600 hover:text-annajah-800 font-medium py-2"
                >
                  + {transaksi.length - 5} transaksi lainnya
                </Link>
              )}
            </div>
          )}

          {/* Tombol aksi cepat — hanya untuk non-guru */}
          {!isGuru && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Link
                to={`/transaksi?id_siswa=${siswa.id}`}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
              >
                <CreditCard className="w-4 h-4" /> Catat Pembayaran Baru
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ─── Kehadiran Siswa ─── */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-annajah-600" />
            Rekap Kehadiran
          </h2>
          <div className="flex items-center gap-2">
            {kehadiran.length > 0 && !loadingKehadiran && (
              <>
                <button
                  onClick={handleExportKehadiran}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all hover:shadow-sm"
                  title="Export Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  Excel
                </button>
                <button
                  onClick={handleExportKehadiranPdf}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-all hover:shadow-sm"
                  title="Export PDF"
                >
                  <FileText className="w-3.5 h-3.5" />
                  PDF
                </button>
              </>
            )}
            <Link
              to={`/kehadiran?id_siswa=${siswa.id}`}
              className="text-xs text-annajah-600 hover:text-annajah-800 font-medium flex items-center gap-0.5"
            >
              Lihat Semua <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {loadingKehadiran ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : kehadiran.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada data kehadiran</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl p-4 border border-emerald-100 text-center">
                <div className="flex items-center justify-center gap-1.5 text-emerald-600 mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Hadir</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{kehadiranStats.hadir}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {kehadiranStats.total > 0
                    ? `${Math.round((kehadiranStats.hadir / kehadiranStats.total) * 100)}%`
                    : '0%'}
                </p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-4 border border-amber-100 text-center">
                <div className="flex items-center justify-center gap-1.5 text-amber-600 mb-1">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Ijin</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{kehadiranStats.ijin}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {kehadiranStats.total > 0
                    ? `${Math.round((kehadiranStats.ijin / kehadiranStats.total) * 100)}%`
                    : '0%'}
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-4 border border-blue-100 text-center">
                <div className="flex items-center justify-center gap-1.5 text-blue-600 mb-1">
                  <HelpCircle className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Sakit</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{kehadiranStats.sakit}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {kehadiranStats.total > 0
                    ? `${Math.round((kehadiranStats.sakit / kehadiranStats.total) * 100)}%`
                    : '0%'}
                </p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-white rounded-xl p-4 border border-red-100 text-center">
                <div className="flex items-center justify-center gap-1.5 text-red-600 mb-1">
                  <XCircle className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Alpa</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">{kehadiranStats.alpa}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {kehadiranStats.total > 0
                    ? `${Math.round((kehadiranStats.alpa / kehadiranStats.total) * 100)}%`
                    : '0%'}
                </p>
              </div>
            </div>

            {/* Tren Kehadiran Bulanan */}
            {!loadingTren && kehadiranTren?.data?.length > 0 && kehadiranTren.data.some(d => d.total > 0) && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">Tren Kehadiran Bulanan</h4>
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {new Date().getFullYear()}
                  </span>
                </div>
                <div className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={kehadiranTren.data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null
                          const d = payload[0]?.payload
                          return (
                            <div className="bg-white shadow-xl border border-gray-100 rounded-xl p-3 min-w-[160px]">
                              <p className="text-xs font-semibold text-gray-800 mb-2">{label}</p>
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                  <span className="text-gray-500">Hadir:</span>
                                  <span className="font-semibold text-gray-800 ml-auto">{d?.hadir || 0}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                                  <span className="text-gray-500">Ijin:</span>
                                  <span className="font-semibold text-gray-800 ml-auto">{d?.ijin || 0}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                  <span className="text-gray-500">Sakit:</span>
                                  <span className="font-semibold text-gray-800 ml-auto">{d?.sakit || 0}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                  <span className="text-gray-500">Alpa:</span>
                                  <span className="font-semibold text-gray-800 ml-auto">{d?.alpa || 0}</span>
                                </div>
                              </div>
                            </div>
                          )
                        }}
                        cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                      />
                      <Bar dataKey="hadir" stackId="a" fill="#22c55e" radius={[0,0,0,0]} maxBarSize={28} />
                      <Bar dataKey="ijin" stackId="a" fill="#eab308" radius={[0,0,0,0]} maxBarSize={28} />
                      <Bar dataKey="sakit" stackId="a" fill="#3b82f6" radius={[0,0,0,0]} maxBarSize={28} />
                      <Bar dataKey="alpa" stackId="a" fill="#ef4444" radius={[4,4,0,0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div className="flex items-center justify-center gap-5 mt-2 pt-2.5 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                      <span>Hadir</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                      <span>Ijin</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span>Sakit</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span>Alpa</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Jam Masuk</th>
                    <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Jam Keluar</th>
                    <th className="text-right py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {kehadiran.slice(0, 10).map((k) => (
                    <tr key={k.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-3 text-gray-800 font-medium whitespace-nowrap">
                        {new Date(k.tanggal + 'T00:00:00').toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                        {k.jam_masuk ? k.jam_masuk.slice(0, 5) : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                        {k.jam_keluar ? k.jam_keluar.slice(0, 5) : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap relative">
                        {editingStatus === k.id ? (
                          <div ref={statusDropdownRef} className="inline-flex flex-col gap-0.5 bg-white border border-gray-200 rounded-lg shadow-xl p-1 min-w-[120px] z-20">
                            {['hadir', 'ijin', 'sakit', 'alpa'].map(option => {
                              const isSelected = k.status === option
                              const isUpdating = updatingStatus === k.id
                              const colors = {
                                hadir: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100',
                                ijin: 'text-amber-700 bg-amber-50 hover:bg-amber-100',
                                sakit: 'text-blue-700 bg-blue-50 hover:bg-blue-100',
                                alpa: 'text-red-700 bg-red-50 hover:bg-red-100',
                              }
                              return (
                                <button
                                  key={option}
                                  disabled={isUpdating}
                                  onClick={() => handleQuickEditStatus(k.id, option)}
                                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all text-left ${
                                    isSelected
                                      ? `${colors[option]} ring-1 ring-inset ring-gray-200`
                                      : 'text-gray-600 hover:bg-gray-50'
                                  } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  <StatusIcon status={option} className="w-3.5 h-3.5" />
                                  <span className="capitalize">{option}</span>
                                  {isSelected && (
                                    <span className="ml-auto">
                                      <CheckCircle2 className="w-3 h-3 text-gray-400" />
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                            {updatingStatus === k.id && (
                              <div className="flex items-center justify-center gap-1.5 py-1 text-[10px] text-gray-400">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Menyimpan...
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingStatus(k.id)}
                            className="transition-transform hover:scale-105 active:scale-95"
                            title="Klik untuk mengubah status"
                          >
                            <StatusBadge status={k.status} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {kehadiran.length > 10 && (
              <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                <Link
                  to={`/kehadiran?id_siswa=${siswa.id}`}
                  className="text-sm text-annajah-600 hover:text-annajah-800 font-medium inline-flex items-center gap-1"
                >
                  Lihat {kehadiran.length - 10} kehadiran lainnya <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Riwayat Bimbingan Konseling ─── */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-annajah-600" />
            Riwayat Bimbingan Konseling
          </h2>
          <Link
            to={`/bimbingan-konseling/input?id_siswa=${siswa.id}`}
            className="text-xs text-annajah-600 hover:text-annajah-800 font-medium flex items-center gap-0.5"
          >
            Input BK <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {loadingBk ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : bkData.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <HeartHandshake className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada riwayat bimbingan konseling</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bkData.map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-gray-50 hover:bg-annajah-50/50 transition-colors border border-gray-100">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(item.tanggal).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}</span>
                  </div>
                  <Link
                    to={`/bimbingan-konseling/input?id=${item.id}`}
                    className="p-1 hover:bg-blue-100 rounded-lg transition-colors shrink-0"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-white border border-red-100">
                    <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mb-1">Kasus</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.kasus}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white border border-emerald-100">
                    <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider mb-1">Tindakan</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.tindakan}</p>
                  </div>
                </div>
              </div>
            ))}

            {bkData.length > 5 && (
              <div className="text-center pt-2">
                <Link
                  to="/bimbingan-konseling"
                  className="text-sm text-annajah-600 hover:text-annajah-800 font-medium inline-flex items-center gap-1"
                >
                  Lihat semua BK <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Crop Foto Modal — hanya untuk non-guru */}
      {!isGuru && showCropModal && (
        <div className="modal-overlay" onClick={handleCropCancel}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-semibold text-gray-800">Crop Foto</h2>
                <button onClick={handleCropCancel} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Seret untuk memilih area foto. Gunakan slider untuk zoom.
              </p>

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

              {/* Zoom Slider */}
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
// ─── Status Badge Component ───
const statusConfig = {
  hadir: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle2 },
  ijin: { bg: 'bg-amber-100', text: 'text-amber-700', icon: FileText },
  sakit: { bg: 'bg-blue-100', text: 'text-blue-700', icon: HelpCircle },
  alpa: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
}

function StatusBadge({ status }) {
  const config = statusConfig[status]
  if (!config) {
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{status}</span>
  }
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} capitalize`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  )
}

function StatusIcon({ status, className = 'w-3 h-3' }) {
  const config = statusConfig[status]
  if (!config) return null
  const Icon = config.icon
  return <Icon className={className} />
}

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
