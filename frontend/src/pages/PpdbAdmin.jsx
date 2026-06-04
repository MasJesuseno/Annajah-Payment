import { useState, useEffect, useCallback } from 'react'
import {
  Users, Search, Trash2, CheckCircle, XCircle, Clock, X,
  ChevronLeft, ChevronRight, Loader2, RefreshCw, FileSpreadsheet, FileText,
  Mail, Phone, MapPin, Calendar, School as SchoolIcon, User,
  Download, Upload, AlertTriangle, FileDown, Printer, Settings, Save, Palette, Eye, EyeOff,
  Pencil, GraduationCap, Navigation
} from 'lucide-react'
import { getPpdbList, updatePpdb, updateStatusPpdb, deletePpdb, exportPpdb, exportPpdbPdf, exportPpdbPdfBulk, importPpdb, downloadTemplatePpdb, cetakPpdbPdf, cetakPpdbKartu, kirimEmailNotifPpdb, getPpdbEmailLog, getPpdbSettings, updatePpdbSettings, uploadFotoPpdb, deleteFotoPpdb, getKelas, konversiPpdbSiswa, getTahunAjaranAktif } from '../api'
import { parseGpsData } from '../utils/formatGps'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status', color: 'bg-gray-100 text-gray-600' },
  { value: 'menunggu', label: 'Menunggu', color: 'bg-amber-100 text-amber-700' },
  { value: 'diterima', label: 'Diterima', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'ditolak', label: 'Ditolak', color: 'bg-red-100 text-red-700' },
]

const STATUS_BADGE = {
  menunggu: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock, label: 'Menunggu' },
  diterima: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle, label: 'Diterima' },
  ditolak: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Ditolak' },
}

export default function PpdbAdmin() {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedPendaftar, setSelectedPendaftar] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(null)
  const [emailLogs, setEmailLogs] = useState([])
  const [loadingEmailLog, setLoadingEmailLog] = useState(false)
  const [bulkPdfOpen, setBulkPdfOpen] = useState(false)
  const [bulkPdfLoading, setBulkPdfLoading] = useState(null)
  const [cetakKartuLoading, setCetakKartuLoading] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [kartuSettings, setKartuSettings] = useState({
    kartu_warna_utama: '#15803D',
    kartu_warna_header: '#15803D',
    kartu_warna_aksen: '#F0FDF4',
    kartu_tampilkan_field: 'no_pendaftaran,nisn,nama_lengkap,tempat_lahir,tanggal_lahir,jenis_kelamin,asal_sekolah',
    kartu_tampilkan_qr: '1',
    kartu_judul: 'KARTU PENDAFTARAN',
    tahun_ajaran: '',
  })
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    nisn: '', nama_lengkap: '', tempat_lahir: '', tanggal_lahir: '',
    jenis_kelamin: '', alamat: '', asal_sekolah: '', no_telp: '',
    email: '', nama_ayah: '', nama_ibu: '', nilai: '',
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [deletingFoto, setDeletingFoto] = useState(false)
  const [kelasList, setKelasList] = useState([])
  const [konversiOpen, setKonversiOpen] = useState(false)
  const [konversiForm, setKonversiForm] = useState({ nis: '', id_kelas: '' })
  const [konversiLoading, setKonversiLoading] = useState(false)
  const [konversiPendaftar, setKonversiPendaftar] = useState(null)
  const [tanggalMulai, setTanggalMulai] = useState('')
  const [tanggalSelesai, setTanggalSelesai] = useState('')

  // ── Quick Date Presets ──
  const todayStr = () => new Date().toISOString().split('T')[0]
  const daysAgo = (days) => {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.toISOString().split('T')[0]
  }
  const monthStart = () => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
  }
  const datePresets = [
    { label: 'Hari Ini', getMulai: todayStr, getSelesai: todayStr },
    { label: '7 Hari', getMulai: () => daysAgo(7), getSelesai: todayStr },
    { label: '30 Hari', getMulai: () => daysAgo(30), getSelesai: todayStr },
    { label: 'Bulan Ini', getMulai: monthStart, getSelesai: todayStr },
  ]
  const perPage = 25

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, per_page: perPage }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      if (tanggalMulai) params.tanggal_mulai = tanggalMulai
      if (tanggalSelesai) params.tanggal_selesai = tanggalSelesai
      const res = await getPpdbList(params)
      setData(res.data.data)
      setTotal(res.data.total)
      setTotalPages(res.data.total_pages)
    } catch (error) {
      toast.error('Gagal memuat data PPDB')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, tanggalMulai, tanggalSelesai])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleStatusFilter = (status) => {
    setStatusFilter(status)
    setPage(1)
  }

  const handleUpdateStatus = async (id, status) => {
    try {
      const label = status === 'diterima' ? 'Diterima' : status === 'ditolak' ? 'Ditolak' : 'Menunggu'
      const res = await updateStatusPpdb(id, { status })
      const msg = `Status berhasil diubah menjadi ${label}`
      if (res.data?.email_notified) {
        toast.success(`${msg} 📧 Notifikasi email terkirim ke ${res.data.email_sent_to}`)
      } else if (status === 'diterima' || status === 'ditolak') {
        toast.success(msg, { icon: '✅' })
        toast('Email tidak dikirim — pendaftar tidak memiliki email atau SMTP belum dikonfigurasi', { icon: 'ℹ️', style: { background: '#fef3c7', color: '#92400e' } })
      } else {
        toast.success(msg)
      }
      fetchData()
      if (selectedPendaftar?.id === id) {
        setSelectedPendaftar(prev => ({ ...prev, status }))
      }
    } catch (error) {
      toast.error('Gagal mengupdate status')
    }
  }

  const handleEdit = (pendaftar) => {
    setEditForm({
      nisn: pendaftar.nisn || '',
      nama_lengkap: pendaftar.nama_lengkap || '',
      tempat_lahir: pendaftar.tempat_lahir || '',
      tanggal_lahir: pendaftar.tanggal_lahir ? pendaftar.tanggal_lahir.split('T')[0] : '',
      jenis_kelamin: pendaftar.jenis_kelamin || '',
      alamat: pendaftar.alamat || '',
      asal_sekolah: pendaftar.asal_sekolah || '',
      no_telp: pendaftar.no_telp || '',
      email: pendaftar.email || '',
      nama_ayah: pendaftar.nama_ayah || '',
      nama_ibu: pendaftar.nama_ibu || '',
      nilai: pendaftar.nilai || '',
    })
    setSelectedPendaftar(pendaftar)
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editForm.nisn || !editForm.nama_lengkap || !editForm.no_telp) {
      toast.error('NISN, Nama Lengkap, dan No. Telepon harus diisi')
      return
    }
    setSavingEdit(true)
    try {
      await updatePpdb(selectedPendaftar.id, editForm)
      toast.success('Data pendaftar berhasil diupdate')
      setEditOpen(false)
      setDetailOpen(false)
      setSelectedPendaftar(null)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal mengupdate data')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus data ini?')) return
    try {
      await deletePpdb(id)
      toast.success('Data berhasil dihapus')
      setDetailOpen(false)
      setSelectedPendaftar(null)
      fetchData()
    } catch (error) {
      toast.error('Gagal menghapus data')
    }
  }

  const openKonversi = async (pendaftar) => {
    setKonversiPendaftar(pendaftar)
    setKonversiForm({ nis: '', id_kelas: '' })
    try {
      const res = await getKelas()
      setKelasList(res.data || [])
    } catch (error) {
      toast.error('Gagal memuat data kelas')
    }
    setKonversiOpen(true)
  }

  const handleKonversi = async () => {
    if (!konversiForm.nis || !konversiForm.id_kelas) {
      toast.error('NIS dan Kelas harus diisi')
      return
    }
    if (!confirm('Yakin ingin mengkonversi pendaftar ini menjadi siswa?')) return
    setKonversiLoading(true)
    try {
      await konversiPpdbSiswa(konversiPendaftar.id, konversiForm)
      toast.success('Pendaftar berhasil dikonversi menjadi siswa!')
      setKonversiOpen(false)
      setDetailOpen(false)
      setSelectedPendaftar(null)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal mengkonversi pendaftar')
    } finally {
      setKonversiLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (tanggalMulai) params.tanggal_mulai = tanggalMulai
      if (tanggalSelesai) params.tanggal_selesai = tanggalSelesai
      const res = await exportPpdb(params)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'data_ppdb.xlsx'
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Data berhasil diexport')
    } catch (error) {
      toast.error('Gagal mengexport data')
    }
  }

  const handleExportPdf = async () => {
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      if (tanggalMulai) params.tanggal_mulai = tanggalMulai
      if (tanggalSelesai) params.tanggal_selesai = tanggalSelesai
      const res = await exportPpdbPdf(params)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'data_ppdb.pdf'
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('PDF berhasil diexport')
    } catch (error) {
      toast.error('Gagal mengexport PDF')
    }
  }

  const handleExportPdfBulk = async (status) => {
    setBulkPdfLoading(status)
    setBulkPdfOpen(false)
    try {
      const params = { status }
      if (tanggalMulai) params.tanggal_mulai = tanggalMulai
      if (tanggalSelesai) params.tanggal_selesai = tanggalSelesai
      const res = await exportPpdbPdfBulk(params)
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      const statusLabel = status === 'diterima' ? 'Diterima' : 'Ditolak'
      a.download = `ppdb_${status}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success(`PDF massal pendaftar ${statusLabel} berhasil dicetak`)
    } catch (error) {
      if (error.response?.status === 404) {
        const statusLabel = status === 'diterima' ? 'diterima' : 'ditolak'
        toast.error(`Belum ada pendaftar berstatus ${statusLabel}`)
      } else {
        toast.error('Gagal mengexport PDF massal')
      }
    } finally {
      setBulkPdfLoading(null)
    }
  }

  const handleImport = async () => {
    if (!importFile) return
    setImporting(true)
    try {
      const res = await importPpdb(importFile)
      setImportResult(res.data)
      toast.success('Import selesai')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal mengimport data')
    } finally {
      setImporting(false)
    }
  }

  const handleKirimEmail = async (pendaftar) => {
    setSendingEmail(true)
    setEmailSent(null)
    try {
      const res = await kirimEmailNotifPpdb(pendaftar.id)
      setEmailSent('success')
      toast.success(`Notifikasi email berhasil dikirim ulang ke ${pendaftar.email}`)
      // Refresh email logs
      const logRes = await getPpdbEmailLog({ ppdb_id: pendaftar.id })
      setEmailLogs(logRes.data)
    } catch (error) {
      setEmailSent('error')
      toast.error(error.response?.data?.message || 'Gagal mengirim email')
    } finally {
      setSendingEmail(false)
    }
  }

  const handleCetakPdf = async (id, nama) => {
    try {
      const res = await cetakPpdbPdf(id)
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `ppdb_${id}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success(`PDF hasil pendaftaran ${nama} berhasil dicetak`)
    } catch (error) {
      toast.error('Gagal mencetak PDF')
    }
  }

  const handleCetakKartu = async (id, nama, noPendaftaran) => {
    setCetakKartuLoading(id)
    try {
      const res = await cetakPpdbKartu(id)
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `kartu_ppdb_${noPendaftaran}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success(`Kartu pendaftaran ${nama} berhasil dicetak`)
    } catch (error) {
      toast.error('Gagal mencetak kartu pendaftaran')
    } finally {
      setCetakKartuLoading(null)
    }
  }

  const loadPpdbSettings = async () => {
    setLoadingSettings(true)
    try {
      const res = await getPpdbSettings()
      const s = res.data
      const taRes = await getTahunAjaranAktif()
      const taAktif = taRes.data?.tahun_ajaran || ''
      setKartuSettings({
        kartu_warna_utama: s.kartu_warna_utama || '#15803D',
        kartu_warna_header: s.kartu_warna_header || '#15803D',
        kartu_warna_aksen: s.kartu_warna_aksen || '#F0FDF4',
        kartu_tampilkan_field: s.kartu_tampilkan_field || 'no_pendaftaran,nisn,nama_lengkap,tempat_lahir,tanggal_lahir,jenis_kelamin,asal_sekolah',
        kartu_tampilkan_qr: s.kartu_tampilkan_qr ?? '1',
        kartu_judul: s.kartu_judul || 'KARTU PENDAFTARAN',
        tahun_ajaran: taAktif,
      })
    } catch (error) {
      toast.error('Gagal memuat pengaturan')
    } finally {
      setLoadingSettings(false)
    }
  }

  const handleSavePpdbSettings = async () => {
    setSavingSettings(true)
    try {
      await updatePpdbSettings({
        kartu_warna_utama: kartuSettings.kartu_warna_utama,
        kartu_warna_header: kartuSettings.kartu_warna_header,
        kartu_warna_aksen: kartuSettings.kartu_warna_aksen,
        kartu_tampilkan_field: kartuSettings.kartu_tampilkan_field,
        kartu_tampilkan_qr: kartuSettings.kartu_tampilkan_qr,
        kartu_judul: kartuSettings.kartu_judul,
      })
      toast.success('Pengaturan kartu pendaftaran berhasil disimpan!')
      setSettingsOpen(false)
    } catch (error) {
      toast.error('Gagal menyimpan pengaturan')
    } finally {
      setSavingSettings(false)
    }
  }

  const openDetail = async (pendaftar) => {
    setSelectedPendaftar(pendaftar)
    setDetailOpen(true)
    setEmailSent(null)
    // Fetch email logs
    setLoadingEmailLog(true)
    try {
      const res = await getPpdbEmailLog({ ppdb_id: pendaftar.id })
      setEmailLogs(res.data)
    } catch (error) {
      setEmailLogs([])
    } finally {
      setLoadingEmailLog(false)
    }
  }

  const StatusBadge = ({ status }) => {
    const s = STATUS_BADGE[status] || STATUS_BADGE.menunggu
    const Icon = s.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
        <Icon className="w-3 h-3" />
        {s.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">PPDB</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola pendaftaran peserta didik baru
            {total > 0 && <span className="ml-1">— <strong>{total}</strong> pendaftar</span>}
          </p>
        </div>
        <button onClick={handleExport} className="btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2 px-4 py-2.5 self-start">
          <FileSpreadsheet className="w-4 h-4" />
          Export Excel
        </button>
        <button onClick={handleExportPdf} className="btn-primary bg-annajah-600 hover:bg-annajah-700 flex items-center gap-2 px-4 py-2.5 self-start">
          <FileText className="w-4 h-4" />
          Export PDF
        </button>
        {/* Cetak PDF Massal Dropdown */}
        <div className="relative self-start">
          <button
            onClick={() => setBulkPdfOpen(!bulkPdfOpen)}
            disabled={bulkPdfLoading !== null}
            className="btn-primary bg-amber-600 hover:bg-amber-700 flex items-center gap-2 px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4" />
            {bulkPdfLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Cetak PDF Massal</>
            ) : (
              'Cetak PDF Massal'
            )}
          </button>
          {bulkPdfOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setBulkPdfOpen(false)} />
              <div className="absolute right-0 mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-200 py-1 min-w-[180px] animate-fade-in">
                <button
                  onClick={() => handleExportPdfBulk('diterima')}
                  disabled={bulkPdfLoading !== null}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  {bulkPdfLoading === 'diterima' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Menggenerate...</>
                  ) : (
                    'PDF — Semua Diterima'
                  )}
                </button>
                <button
                  onClick={() => handleExportPdfBulk('ditolak')}
                  disabled={bulkPdfLoading !== null}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4 text-red-500" />
                  {bulkPdfLoading === 'ditolak' ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Menggenerate...</>
                  ) : (
                    'PDF — Semua Ditolak'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
        <button onClick={() => { setImportOpen(true); setImportFile(null); setImportResult(null) }} className="btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2 px-4 py-2.5 self-start">
          <Upload className="w-4 h-4" />
          Import Excel
        </button>
        <button
          onClick={() => { loadPpdbSettings(); setSettingsOpen(true) }}
          className="btn-primary bg-gray-600 hover:bg-gray-700 flex items-center gap-2 px-4 py-2.5 self-start"
        >
          <Settings className="w-4 h-4" />
          Pengaturan
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama, no. pendaftaran, atau NISN..."
              className="input-field pl-10"
            />
          </form>
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleStatusFilter(opt.value)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border ${
                  statusFilter === opt.value
                    ? 'border-annajah-300 bg-annajah-50 text-annajah-700 shadow-sm'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="date"
                value={tanggalMulai}
                onChange={e => { setTanggalMulai(e.target.value); setPage(1) }}
                className="pl-8 pr-2.5 py-2 rounded-lg text-xs border border-gray-200 focus:border-annajah-400 focus:ring-1 focus:ring-annajah-400 outline-none transition-all duration-200 text-gray-600"
                title="Tanggal Mulai"
              />
            </div>
            <span className="text-xs text-gray-400">—</span>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="date"
                value={tanggalSelesai}
                onChange={e => { setTanggalSelesai(e.target.value); setPage(1) }}
                className="pl-8 pr-2.5 py-2 rounded-lg text-xs border border-gray-200 focus:border-annajah-400 focus:ring-1 focus:ring-annajah-400 outline-none transition-all duration-200 text-gray-600"
                title="Tanggal Selesai"
              />
            </div>
            {/* Quick Presets */}
            <div className="flex items-center gap-1 ml-1">
              {datePresets.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setTanggalMulai(preset.getMulai())
                    setTanggalSelesai(preset.getSelesai())
                    setPage(1)
                  }}
                  className={`px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 border ${
                    tanggalMulai === preset.getMulai() && tanggalSelesai === preset.getSelesai()
                      ? 'bg-annajah-100 text-annajah-700 border-annajah-300'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => { setSearch(''); setSearchInput(''); setStatusFilter(''); setTanggalMulai(''); setTanggalSelesai(''); setPage(1) }}
            className="px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 border border-gray-200 transition-all duration-200 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">No</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">No. Pendaftaran</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">NISN</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Nama</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Asal Sekolah</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">No. Telp</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Email</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Lokasi</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Nilai</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-annajah-500 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Memuat data...</p>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-16">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-400 font-medium">Belum ada pendaftar</p>
                    <p className="text-xs text-gray-400 mt-1">Belum ada calon peserta didik yang mendaftar.</p>
                  </td>
                </tr>
              ) : data.map((d, i) => (
                <tr
                  key={d.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => openDetail(d)}
                >
                  <td className="px-4 py-3 text-sm text-gray-500">{(page - 1) * perPage + i + 1}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono font-medium text-gray-800">{d.no_pendaftaran}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{d.nisn}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-800">{d.nama_lengkap}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{d.asal_sekolah || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{d.no_telp || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {d.email || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {d.gps_masuk ? (
                      <span
                        className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-600 cursor-help"
                        title={(() => { try {
                          const g = JSON.parse(d.gps_masuk);
                          const parts = [];
                          if (g.kelurahan) parts.push(`Kel. ${g.kelurahan}`);
                          if (g.kecamatan) parts.push(`Kec. ${g.kecamatan}`);
                          if (g.kabupaten) parts.push(g.kabupaten);
                          if (g.provinsi) parts.push(g.provinsi);
                          return parts.length > 0 ? parts.join(', ') : `(${g.lat}, ${g.lng})`;
                        } catch { return d.gps_masuk; } })()}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-300">
                        <MapPin className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {d.nilai !== null && d.nilai !== undefined ? (
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">{d.nilai}</span>
                    ) : (
                      <span className="text-gray-300 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <StatusBadge status={d.status} />
                      {d.dikonversi ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-700">
                          <GraduationCap className="w-3 h-3" />
                          Siswa
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                      {d.status !== 'diterima' && (
                        <button
                          onClick={() => handleUpdateStatus(d.id, 'diterima')}
                          className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-200"
                          title="Terima"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {d.status !== 'ditolak' && (
                        <button
                          onClick={() => handleUpdateStatus(d.id, 'ditolak')}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
                          title="Tolak"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      {d.status !== 'menunggu' && (
                        <button
                          onClick={() => handleUpdateStatus(d.id, 'menunggu')}
                          className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-50 hover:text-amber-600 transition-all duration-200"
                          title="Kembalikan ke Menunggu"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleCetakKartu(d.id, d.nama_lengkap, d.no_pendaftaran)}
                        disabled={cetakKartuLoading === d.id}
                        className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Cetak Kartu Pendaftaran"
                      >
                        {cetakKartuLoading === d.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Printer className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(d)}
                        className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200"
                        title="Edit Data"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {!d.dikonversi ? (
                        <button
                          onClick={() => openKonversi(d)}
                          className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-200"
                          title="Konversi ke Siswa"
                        >
                          <GraduationCap className="w-4 h-4" />
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-500">
              Menampilkan {(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} dari {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <span className="text-xs font-medium text-gray-600 px-2">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {/* Import Modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setImportOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Upload className="w-5 h-5 text-annajah-500" />
                Import Data Pendaftar PPDB
              </h2>
              <button
                onClick={() => setImportOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {!importResult ? (
              <div className="space-y-5">
                {/* Download Template */}
                <div className="p-4 bg-annajah-50 rounded-xl border border-annajah-200">
                  <div className="flex items-start gap-3">
                    <FileDown className="w-5 h-5 text-annajah-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-annajah-800">Download Template Import</p>
                      <p className="text-xs text-annajah-600 mt-1">
                        Gunakan template Excel untuk memudahkan pengisian data pendaftar.
                        Kolom wajib: <strong>NISN, Nama Lengkap, No. Telepon</strong>.
                      </p>
                      <button
                        onClick={async () => {
                          try {
                            const res = await downloadTemplatePpdb()
                            const url = window.URL.createObjectURL(new Blob([res.data]))
                            const a = document.createElement('a')
                            a.href = url
                            a.download = 'template_import_ppdb.xlsx'
                            a.click()
                            window.URL.revokeObjectURL(url)
                            toast.success('Template berhasil diunduh')
                          } catch (error) {
                            toast.error('Gagal mengunduh template')
                          }
                        }}
                        className="mt-2 flex items-center gap-1.5 text-sm font-medium text-annajah-700 hover:text-annajah-800 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download Template
                      </button>
                    </div>
                  </div>
                </div>

                {/* Upload File */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pilih File Excel (.xlsx / .xls / .csv)
                  </label>
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${importFile ? 'border-emerald-300 bg-emerald-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault()
                      const file = e.dataTransfer.files[0]
                      if (file) setImportFile(file)
                    }}
                  >
                    {importFile ? (
                      <div className="space-y-2">
                        <FileSpreadsheet className="w-10 h-10 text-emerald-500 mx-auto" />
                        <p className="text-sm font-medium text-gray-800">{importFile.name}</p>
                        <p className="text-xs text-gray-500">{(importFile.size / 1024).toFixed(1)} KB</p>
                        <button
                          onClick={() => setImportFile(null)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Hapus file
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-10 h-10 text-gray-400 mx-auto" />
                        <p className="text-sm text-gray-600">
                          Tarik file ke sini atau{' '}
                          <label className="text-annajah-600 font-medium hover:text-annajah-700 cursor-pointer">
                            klik untuk memilih
                            <input
                              type="file"
                              accept=".xlsx,.xls,.csv"
                              className="hidden"
                              onChange={e => {
                                if (e.target.files[0]) setImportFile(e.target.files[0])
                              }}
                            />
                          </label>
                        </p>
                        <p className="text-xs text-gray-400">Maksimal 5MB</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleImport}
                  disabled={!importFile || importing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-annajah-600 text-white rounded-xl text-sm font-medium hover:bg-annajah-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mengimport data...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import Data
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Import Result */
              <div className="space-y-4">
                <div className={`p-4 rounded-xl flex items-start gap-3 ${importResult.error_count > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                  {importResult.error_count > 0 ? (
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${importResult.error_count > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                      {importResult.message}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span className="text-emerald-600 font-medium">✓ {importResult.success_count} berhasil</span>
                      {importResult.error_count > 0 && (
                        <span className="text-red-500 font-medium">✗ {importResult.error_count} gagal</span>
                      )}
                      <span className="text-gray-500">Total: {importResult.total_row} baris</span>
                    </div>
                  </div>
                </div>

                {/* Error Details */}
                {importResult.errors?.length > 0 && (
                  <div className="border border-red-200 rounded-xl overflow-hidden">
                    <div className="bg-red-50 px-4 py-2 border-b border-red-200">
                      <p className="text-xs font-semibold text-red-700">Detail Error</p>
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-red-100">
                      {importResult.errors.map((err, i) => (
                        <div key={i} className="px-4 py-2.5">
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-mono text-gray-400 mt-0.5 shrink-0">#{err.row}</span>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{err.nama || '-'}</p>
                              <p className="text-xs text-gray-500">{err.nisn || err.nis || '-'}</p>
                              {err.errors?.map((e, ei) => (
                                <p key={ei} className="text-xs text-red-500 mt-0.5">• {e}</p>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => { setImportOpen(false); setImportResult(null); setImportFile(null); fetchData() }}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all duration-200"
                  >
                    Tutup
                  </button>
                  <button
                    onClick={() => { setImportResult(null); setImportFile(null) }}
                    className="flex-1 px-4 py-2.5 bg-annajah-600 text-white rounded-xl text-sm font-medium hover:bg-annajah-700 transition-all duration-200"
                  >
                    Import Lagi
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailOpen && selectedPendaftar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDetailOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <User className="w-5 h-5 text-annajah-500" />
                Detail Pendaftar
              </h2>
              <button
                onClick={() => setDetailOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-sm font-medium text-gray-600">Status</span>
                <StatusBadge status={selectedPendaftar.status} />
              </div>

              {/* Foto */}
              <div className="flex flex-col items-center p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-24 h-28 rounded-xl overflow-hidden border-2 border-gray-200 bg-white flex items-center justify-center mb-2">
                  {selectedPendaftar.foto ? (
                    <img
                      src={`/api/ppdb/foto/${selectedPendaftar.foto}`}
                      alt="Foto pendaftar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-gray-300" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setUploadingFoto(true)
                        try {
                          const res = await uploadFotoPpdb(selectedPendaftar.id, file)
                          toast.success('Foto berhasil diupload')
                          setSelectedPendaftar(prev => ({ ...prev, foto: res.data.foto }))
                        } catch (error) {
                          toast.error(error.response?.data?.message || 'Gagal mengupload foto')
                        } finally {
                          setUploadingFoto(false)
                        }
                      }}
                    />
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-annajah-50 text-annajah-700 rounded-lg hover:bg-annajah-100 border border-annajah-200 transition-colors">
                      {uploadingFoto ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Upload className="w-3 h-3" />
                      )}
                      {uploadingFoto ? 'Uploading...' : 'Upload Foto'}
                    </span>
                  </label>
                  {selectedPendaftar.foto && (
                    <button
                      onClick={async () => {
                        if (!confirm('Yakin ingin menghapus foto?')) return
                        setDeletingFoto(true)
                        try {
                          await deleteFotoPpdb(selectedPendaftar.id)
                          toast.success('Foto berhasil dihapus')
                          setSelectedPendaftar(prev => ({ ...prev, foto: null }))
                        } catch (error) {
                          toast.error('Gagal menghapus foto')
                        } finally {
                          setDeletingFoto(false)
                        }
                      }}
                      disabled={deletingFoto}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-200 transition-colors"
                    >
                      {deletingFoto ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              <DetailRow icon={<Calendar className="w-4 h-4" />} label="No. Pendaftaran" value={selectedPendaftar.no_pendaftaran} mono />
              <DetailRow icon={<User className="w-4 h-4" />} label="NISN" value={selectedPendaftar.nisn} />
              <DetailRow label="Nama Lengkap" value={selectedPendaftar.nama_lengkap} />
              <DetailRow label="Tempat Lahir" value={selectedPendaftar.tempat_lahir || '-'} />
              <DetailRow label="Tanggal Lahir" value={selectedPendaftar.tanggal_lahir ? new Date(selectedPendaftar.tanggal_lahir).toLocaleDateString('id-ID') : '-'} />
              <DetailRow label="Jenis Kelamin" value={selectedPendaftar.jenis_kelamin === 'L' ? 'Laki-laki' : selectedPendaftar.jenis_kelamin === 'P' ? 'Perempuan' : '-'} />
              <DetailRow icon={<MapPin className="w-4 h-4" />} label="Alamat" value={selectedPendaftar.alamat || '-'} />
              <DetailRow icon={<SchoolIcon className="w-4 h-4" />} label="Asal Sekolah" value={selectedPendaftar.asal_sekolah || '-'} />
              <DetailRow icon={<Phone className="w-4 h-4" />} label="No. Telepon" value={selectedPendaftar.no_telp || '-'} />
              <DetailRow label="Email" value={selectedPendaftar.email || '-'} />
              <DetailRow label="Nama Ayah" value={selectedPendaftar.nama_ayah || '-'} />
              <DetailRow label="Nilai" value={selectedPendaftar.nilai !== null && selectedPendaftar.nilai !== undefined ? selectedPendaftar.nilai : '-'} />
              <DetailRow label="Nama Ibu" value={selectedPendaftar.nama_ibu || '-'} />

              {/* Lokasi GPS */}
              <DetailRow
                icon={<MapPin className="w-4 h-4" />}
                label="Lokasi GPS"
                value={(() => {
                  if (!selectedPendaftar.gps_masuk) return '-'
                  const parsed = parseGpsData(selectedPendaftar.gps_masuk)
                  return parsed?.display || selectedPendaftar.gps_masuk
                })()}
              />

              {selectedPendaftar.keterangan && (
                <DetailRow label="Keterangan" value={selectedPendaftar.keterangan} />
              )}
              <DetailRow label="Tanggal Daftar" value={new Date(selectedPendaftar.created_at).toLocaleString('id-ID')} />

              {/* Actions */}
              <div className="border-t border-gray-100 pt-4 mt-6">
                <p className="text-xs font-medium text-gray-500 mb-3">Ubah Status:</p>
                <div className="flex gap-2">
                  {selectedPendaftar.status !== 'diterima' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedPendaftar.id, 'diterima')}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-all duration-200"
                    >
                      <CheckCircle className="w-4 h-4" /> Terima
                    </button>
                  )}
                  {selectedPendaftar.status !== 'ditolak' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedPendaftar.id, 'ditolak')}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-all duration-200"
                    >
                      <XCircle className="w-4 h-4" /> Tolak
                    </button>
                  )}
                  {selectedPendaftar.status !== 'menunggu' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedPendaftar.id, 'menunggu')}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-all duration-200"
                    >
                      <Clock className="w-4 h-4" /> Tunggu
                    </button>
                  )}
                </div>
          <button
            onClick={() => handleDelete(selectedPendaftar.id)}
            className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition-all duration-200"
          >
            <Trash2 className="w-4 h-4" /> Hapus Data
          </button>
        </div>

        {/* Konversi / Status Dikonversi */}
        {selectedPendaftar.dikonversi ? (
          <div className="mt-3 p-3 bg-indigo-50 rounded-xl border border-indigo-200 flex items-center gap-2.5">
            <GraduationCap className="w-5 h-5 text-indigo-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-indigo-700">Sudah Dikonversi ke Siswa</p>
              <p className="text-xs text-indigo-500">Pendaftar ini sudah dikonversi menjadi data siswa</p>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <button
              onClick={() => openKonversi(selectedPendaftar)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200
                bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
            >
              <GraduationCap className="w-4 h-4" />
              Konversi ke Siswa
            </button>
          </div>
        )}

        {/* Kirim Ulang Email */}
        {selectedPendaftar.email && selectedPendaftar.status !== 'menunggu' && (
          <div className="mt-3">
            <button
              onClick={() => handleKirimEmail(selectedPendaftar)}
              disabled={sendingEmail}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100"
            >
              {sendingEmail ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              {sendingEmail ? 'Mengirim email...' : 'Kirim Ulang Notifikasi Email'}
            </button>
            {emailSent === 'success' && (
              <p className="mt-1.5 text-xs text-emerald-600 font-medium text-center">
                ✓ Email terkirim ke {selectedPendaftar.email}
              </p>
            )}
            {emailSent === 'error' && (
              <p className="mt-1.5 text-xs text-red-500 font-medium text-center">
                ✗ Gagal mengirim. Periksa konfigurasi SMTP.
              </p>
            )}
          </div>
        )}

        {/* Riwayat Email */}
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Riwayat Email</span>
          </div>
          {loadingEmailLog ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          ) : emailLogs.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3 italic">
              Belum ada riwayat pengiriman email
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {emailLogs.map((log, i) => (
                <div
                  key={log.id || i}
                  className={`p-2.5 rounded-lg border text-xs ${
                    log.status_kirim === 'sukses'
                      ? 'bg-emerald-50 border-emerald-100'
                      : 'bg-red-50 border-red-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${log.status_kirim === 'sukses' ? 'text-emerald-700' : 'text-red-700'}`}>
                      {log.status_kirim === 'sukses' ? '✓ Terkirim' : '✗ Gagal'}
                    </span>
                    <span className="text-gray-400">
                      {new Date(log.created_at).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-0.5 truncate" title={log.subjek}>
                    {log.email_tujuan}
                  </p>
                  {log.status_kirim === 'gagal' && log.pesan_error && (
                    <p className="text-red-500 mt-0.5 truncate" title={log.pesan_error}>
                      {log.pesan_error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cetak PDF */}
        <button
          onClick={() => handleCetakPdf(selectedPendaftar.id, selectedPendaftar.nama_lengkap)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-annajah-50 text-annajah-700 rounded-xl text-sm font-medium border border-annajah-200 hover:bg-annajah-100 transition-all duration-200"
        >
          <FileText className="w-4 h-4" />
          Cetak Hasil Pendaftaran
        </button>
        <button
          onClick={() => handleCetakKartu(selectedPendaftar.id, selectedPendaftar.nama_lengkap, selectedPendaftar.no_pendaftaran)}
          disabled={cetakKartuLoading === selectedPendaftar.id}
          className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium border border-emerald-200 hover:bg-emerald-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cetakKartuLoading === selectedPendaftar.id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Printer className="w-4 h-4" />
          )}
          {cetakKartuLoading === selectedPendaftar.id ? 'Mencetak...' : 'Cetak Kartu Pendaftaran'}
        </button>
      </div>
    </div>
  </div>
  )}

      {/* Edit Modal */}
      {editOpen && selectedPendaftar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-blue-500" />
                Edit Data Pendaftar
              </h2>
              <button
                onClick={() => setEditOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Foto & Kode Rahasia */}
            <div className="flex items-start gap-5 mb-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
              {/* Foto */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div className="w-20 h-24 rounded-xl overflow-hidden border-2 border-gray-200 bg-white flex items-center justify-center">
                  {selectedPendaftar.foto ? (
                    <img
                      src={`/api/ppdb/foto/${selectedPendaftar.foto}`}
                      alt="Foto"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-gray-300" />
                  )}
                </div>
                <span className="text-[10px] text-gray-400">Foto Pendaftar</span>
              </div>

              {/* Info */}
              <div className="flex-1 space-y-2">
                <div>
                  <span className="text-xs text-gray-500">No. Pendaftaran</span>
                  <p className="text-sm font-mono font-medium text-gray-800">{selectedPendaftar.no_pendaftaran}</p>
                </div>
                {selectedPendaftar.kode_rahasia && (
                  <div>
                    <span className="text-xs text-gray-500">Kode Rahasia</span>
                    <p className="text-sm font-mono font-bold text-amber-700">{selectedPendaftar.kode_rahasia}</p>
                    <p className="text-[10px] text-amber-500 mt-0.5">Gunakan kode ini untuk cek hasil & kartu pendaftaran</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">NISN <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editForm.nisn}
                  onChange={e => setEditForm(prev => ({ ...prev, nisn: e.target.value }))}
                  className="input-field"
                  placeholder="NISN"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nama Lengkap <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editForm.nama_lengkap}
                  onChange={e => setEditForm(prev => ({ ...prev, nama_lengkap: e.target.value }))}
                  className="input-field"
                  placeholder="Nama lengkap"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Tempat Lahir</label>
                <input
                  type="text"
                  value={editForm.tempat_lahir}
                  onChange={e => setEditForm(prev => ({ ...prev, tempat_lahir: e.target.value }))}
                  className="input-field"
                  placeholder="Tempat lahir"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Tanggal Lahir</label>
                <input
                  type="date"
                  value={editForm.tanggal_lahir}
                  onChange={e => setEditForm(prev => ({ ...prev, tanggal_lahir: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Jenis Kelamin</label>
                <select
                  value={editForm.jenis_kelamin}
                  onChange={e => setEditForm(prev => ({ ...prev, jenis_kelamin: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Pilih jenis kelamin</option>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">No. Telepon <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editForm.no_telp}
                  onChange={e => setEditForm(prev => ({ ...prev, no_telp: e.target.value }))}
                  className="input-field"
                  placeholder="No. telepon"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  className="input-field"
                  placeholder="email@example.com"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Alamat</label>
                <textarea
                  value={editForm.alamat}
                  onChange={e => setEditForm(prev => ({ ...prev, alamat: e.target.value }))}
                  className="input-field"
                  rows={2}
                  placeholder="Alamat lengkap"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Asal Sekolah</label>
                <input
                  type="text"
                  value={editForm.asal_sekolah}
                  onChange={e => setEditForm(prev => ({ ...prev, asal_sekolah: e.target.value }))}
                  className="input-field"
                  placeholder="Asal sekolah"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nama Ayah</label>
                <input
                  type="text"
                  value={editForm.nama_ayah}
                  onChange={e => setEditForm(prev => ({ ...prev, nama_ayah: e.target.value }))}
                  className="input-field"
                  placeholder="Nama ayah"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nama Ibu</label>
                <input
                  type="text"
                  value={editForm.nama_ibu}
                  onChange={e => setEditForm(prev => ({ ...prev, nama_ibu: e.target.value }))}
                  className="input-field"
                  placeholder="Nama ibu"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nilai</label>
                <input
                  type="number"
                  value={editForm.nilai}
                  onChange={e => setEditForm(prev => ({ ...prev, nilai: e.target.value }))}
                  className="input-field"
                  placeholder="Nilai (angka)"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setEditOpen(false)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all duration-200"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="btn-primary flex items-center gap-2 px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingEdit ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Konversi Modal */}
      {konversiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setKonversiOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-500" />
                Konversi ke Siswa
              </h2>
              <button
                onClick={() => setKonversiOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Info Pendaftar */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Pendaftar</p>
                <p className="text-sm font-semibold text-gray-800">{konversiPendaftar?.nama_lengkap}</p>
                <p className="text-xs text-gray-400 font-mono">{konversiPendaftar?.no_pendaftaran} · {konversiPendaftar?.nisn}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  NIS <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={konversiForm.nis}
                  onChange={e => setKonversiForm(prev => ({ ...prev, nis: e.target.value }))}
                  className="input-field"
                  placeholder="Nomor Induk Siswa"
                />
                <p className="text-[10px] text-gray-400 mt-1">NIS akan menjadi identitas siswa di sistem</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Kelas <span className="text-red-500">*</span>
                </label>
                <select
                  value={konversiForm.id_kelas}
                  onChange={e => setKonversiForm(prev => ({ ...prev, id_kelas: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Pilih kelas</option>
                  {kelasList.map(k => (
                    <option key={k.id} value={k.id}>{k.nama_kelas} (Kelas {k.tingkat})</option>
                  ))}
                </select>
              </div>

              {/* Info mapping data */}
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs font-medium text-blue-700 mb-1.5">Data yang akan dikonversi:</p>
                <ul className="text-[11px] text-blue-600 space-y-0.5">
                  <li>✓ Nama, NISN, Tempat/Tanggal Lahir</li>
                  <li>✓ Jenis Kelamin, Alamat, No. Telepon</li>
                  <li>✓ Asal Sekolah, Foto</li>
                  <li className="text-blue-400 mt-1 italic">Status PPDB akan otomatis menjadi "Diterima"</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={handleKonversi}
                disabled={konversiLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {konversiLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Mengkonversi...</>
                ) : (
                  <><GraduationCap className="w-4 h-4" /> Konversi ke Siswa</>
                )}
              </button>
              <button
                onClick={() => setKonversiOpen(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all duration-200"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal — Kartu Pendaftaran */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSettingsOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500" />
                Pengaturan Kartu Pendaftaran
              </h2>
              <button
                onClick={() => setSettingsOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {loadingSettings ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-annajah-500" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left Column — Form Controls */}
                <div className="lg:col-span-3 space-y-5">
                  {/* Warna */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Palette className="w-4 h-4 text-gray-400" />
                      Warna Kartu
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Warna Utama</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={kartuSettings.kartu_warna_utama}
                            onChange={e => setKartuSettings(prev => ({ ...prev, kartu_warna_utama: e.target.value }))}
                            className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={kartuSettings.kartu_warna_utama}
                            onChange={e => setKartuSettings(prev => ({ ...prev, kartu_warna_utama: e.target.value }))}
                            className="input-field flex-1 text-xs font-mono"
                            placeholder="#15803D"
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Border, judul, QR outline</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Warna Header</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={kartuSettings.kartu_warna_header}
                            onChange={e => setKartuSettings(prev => ({ ...prev, kartu_warna_header: e.target.value }))}
                            className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={kartuSettings.kartu_warna_header}
                            onChange={e => setKartuSettings(prev => ({ ...prev, kartu_warna_header: e.target.value }))}
                            className="input-field flex-1 text-xs font-mono"
                            placeholder="#15803D"
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Background header</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Warna Aksen</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={kartuSettings.kartu_warna_aksen}
                            onChange={e => setKartuSettings(prev => ({ ...prev, kartu_warna_aksen: e.target.value }))}
                            className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={kartuSettings.kartu_warna_aksen}
                            onChange={e => setKartuSettings(prev => ({ ...prev, kartu_warna_aksen: e.target.value }))}
                            className="input-field flex-1 text-xs font-mono"
                            placeholder="#F0FDF4"
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Baris data berselang</p>
                      </div>
                    </div>
                  </div>

                  {/* Judul */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Judul Kartu</label>
                    <input
                      type="text"
                      value={kartuSettings.kartu_judul}
                      onChange={e => setKartuSettings(prev => ({ ...prev, kartu_judul: e.target.value }))}
                      className="input-field"
                      placeholder="KARTU PENDAFTARAN"
                    />
                  </div>

                  {/* Info yang Ditampilkan */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                      <Eye className="w-4 h-4 text-gray-400" />
                      Informasi yang Ditampilkan
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { key: 'no_pendaftaran', label: 'No. Pendaftaran' },
                        { key: 'nisn', label: 'NISN' },
                        { key: 'nama_lengkap', label: 'Nama Lengkap' },
                        { key: 'tempat_lahir', label: 'Tempat Lahir' },
                        { key: 'tanggal_lahir', label: 'Tanggal Lahir' },
                        { key: 'jenis_kelamin', label: 'Jenis Kelamin' },
                        { key: 'alamat', label: 'Alamat' },
                        { key: 'asal_sekolah', label: 'Asal Sekolah' },
                        { key: 'no_telp', label: 'No. Telepon' },
                        { key: 'email', label: 'Email' },
                        { key: 'nama_ayah', label: 'Nama Ayah' },
                        { key: 'nama_ibu', label: 'Nama Ibu' },
                        { key: 'nilai', label: 'Nilai' },
  
                      ].map(field => {
                        const selectedFields = kartuSettings.kartu_tampilkan_field.split(',').map(f => f.trim()).filter(Boolean)
                        const isChecked = selectedFields.includes(field.key)
                        return (
                          <label
                            key={field.key}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all duration-200 ${
                              isChecked
                                ? 'border-annajah-300 bg-annajah-50 text-annajah-700'
                                : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                const current = selectedFields
                                const updated = isChecked
                                  ? current.filter(f => f !== field.key)
                                  : [...current, field.key]
                                setKartuSettings(prev => ({ ...prev, kartu_tampilkan_field: updated.join(',') }))
                              }}
                              className="rounded border-gray-300 text-annajah-600 focus:ring-annajah-400"
                            />
                            <span className="text-xs font-medium">{field.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {/* QR Code Toggle */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2">
                        {kartuSettings.kartu_tampilkan_qr === '1' ? (
                          <Eye className="w-4 h-4 text-annajah-600" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        )}
                        <div>
                          <span className="text-sm font-semibold text-gray-700">QR Code</span>
                          <p className="text-[10px] text-gray-400">Tampilkan QR code di kartu pendaftaran</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setKartuSettings(prev => ({ ...prev, kartu_tampilkan_qr: prev.kartu_tampilkan_qr === '1' ? '0' : '1' }))}
                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                          kartuSettings.kartu_tampilkan_qr === '1' ? 'bg-annajah-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                            kartuSettings.kartu_tampilkan_qr === '1' ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </label>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setSettingsOpen(false)}
                      className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all duration-200"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleSavePpdbSettings}
                      disabled={savingSettings}
                      className="btn-primary flex items-center gap-2 px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingSettings ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}
                    </button>
                  </div>
                </div>

                {/* Right Column — Preview */}
                <div className="lg:col-span-2">
                  <div className="sticky top-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Printer className="w-4 h-4 text-gray-400" />
                      Preview Kartu
                    </h3>
                    <div className="bg-gray-100 rounded-xl p-3 flex items-center justify-center">
                      <div
                        className="bg-white rounded-lg shadow-lg overflow-hidden"
                        style={{
                          width: 220,
                          minHeight: 340,
                          border: `2px solid ${kartuSettings.kartu_warna_utama}`,
                        }}
                      >
                        {/* Preview Header */}
                        <div
                          className="px-3 py-2.5 text-center"
                          style={{ background: kartuSettings.kartu_warna_header }}
                        >
                          <p className="text-white font-bold text-[9px] leading-tight">
                            SMA ANNAJAH
                          </p>
                          <p className="text-white/80 text-[6px]">
                            PPDB TAHUN AJARAN {kartuSettings.tahun_ajaran || '2025/2026'}
                          </p>
                        </div>

                        {/* Preview Title */}
                        <div className="px-3 py-1.5 text-center">
                          <p
                            className="font-bold text-[9px]"
                            style={{ color: kartuSettings.kartu_warna_utama }}
                          >
                            {kartuSettings.kartu_judul || 'KARTU PENDAFTARAN'}
                          </p>
                          <div
                            className="h-px mx-auto mt-1"
                            style={{
                              width: 80,
                              background: kartuSettings.kartu_warna_utama,
                            }}
                          />
                        </div>

                        {/* Preview Data Fields */}
                        <div className="px-3 pb-2">
                          {(() => {
                            const selectedFields = kartuSettings.kartu_tampilkan_field.split(',').map(f => f.trim()).filter(Boolean)
                            const previewFields = selectedFields.slice(0, 4)
                            return previewFields.map((key, i) => {
                              const labels = {
                                no_pendaftaran: 'No. Pendaftaran',
                                nisn: 'NISN',
                                nama_lengkap: 'Nama Lengkap',
                                tempat_lahir: 'Tempat Lahir',
                                tanggal_lahir: 'Tanggal Lahir',
                                jenis_kelamin: 'Jenis Kelamin',
                                alamat: 'Alamat',
                                asal_sekolah: 'Asal Sekolah',
                                no_telp: 'No. Telepon',
                                email: 'Email',
                                nama_ayah: 'Nama Ayah',
                                nama_ibu: 'Nama Ibu',
                              }
                              const values = {
                                no_pendaftaran: 'PPDB202500001',
                                nisn: '0012345678',
                                nama_lengkap: 'Andi Pratama',
                                tempat_lahir: 'Jakarta',
                                tanggal_lahir: '15 Jan 2009',
                                jenis_kelamin: 'Laki-laki',
                                alamat: 'Jl. Contoh No. 1',
                                asal_sekolah: 'SMP Contoh',
                                no_telp: '081234567890',
                                email: 'andi@email.com',
                                nama_ayah: 'Budi',
                                nama_ibu: 'Siti',
                                nilai: '85',
                              }
                              return (
                                <div
                                  key={key}
                                  className="flex items-center py-1"
                                  style={{
                                    background: i % 2 === 0 ? kartuSettings.kartu_warna_aksen : 'transparent',
                                  }}
                                >
                                  <span className="text-[6px] text-gray-500 w-[55px] shrink-0">{labels[key]}</span>
                                  <span className="text-[7px] font-medium text-gray-800 truncate">{values[key]}</span>
                                </div>
                              )
                            })
                          })()}
                          {(() => {
                            const selectedFields = kartuSettings.kartu_tampilkan_field.split(',').map(f => f.trim()).filter(Boolean)
                            if (selectedFields.length > 4) {
                              return (
                                <p className="text-[6px] text-gray-400 text-center mt-1">
                                  ...dan {selectedFields.length - 4} field lainnya
                                </p>
                              )
                            }
                            return null
                          })()}
                        </div>

                        {/* Preview QR (placeholder) */}
                        {kartuSettings.kartu_tampilkan_qr === '1' && (
                          <div className="px-3 pb-3 flex flex-col items-center">
                            <div
                              className="w-16 h-16 rounded border-2 flex items-center justify-center"
                              style={{
                                borderColor: kartuSettings.kartu_warna_utama,
                              }}
                            >
                              <div className="grid grid-cols-5 gap-0.5">
                                {Array.from({ length: 25 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className="w-1.5 h-1.5"
                                    style={{
                                      background: Math.random() > 0.4 ? kartuSettings.kartu_warna_utama : 'white',
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-[5px] mt-1" style={{ color: kartuSettings.kartu_warna_utama }}>
                              SCAN UNTUK VERIFIKASI
                            </p>
                          </div>
                        )}

                        {/* Preview Footer */}
                        <div className="px-3 py-1.5 border-t border-gray-100">
                          <p className="text-[5px] text-gray-400 text-center">
                            Dokumen ini adalah bukti pendaftaran resmi.
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 text-center mt-2 italic">
                      Preview hanya ilustrasi — hasil aktual di PDF mungkin berbeda
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ icon, label, value, mono }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-50 last:border-b-0">
      <div className="flex items-center gap-2">
        {icon && <span className="text-gray-400 shrink-0">{icon}</span>}
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <span className={`text-sm font-medium text-gray-800 text-right max-w-[60%] ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  )
}
