import { useState, useEffect, useRef } from 'react'
import { getPengaturan, updatePengaturan, testSmtpConnection, uploadLogo, deleteLogo, getTahunAjaran } from '../api'
import { Building2, Save, MapPin, Phone, Mail, Globe, Hash, BookOpen, User, Shield, Send, Server, Key, CheckCircle, XCircle, Image, Upload, Clock, Palette, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Pengaturan() {
  const [settings, setSettings] = useState({
    nama_sekolah: '',
    alamat_sekolah: '',
    kota: '',
    provinsi: '',
    kode_pos: '',
    no_telp: '',
    email: '',
    website: '',
    npsn: '',
    tahun_ajaran_aktif: '',
    kepala_sekolah: '',
    bendahara: '',
    logo: '',
    warna_utama: '#1A56DB',
    warna_sekunder: '#059669',
    warna_aksen: '#7C3AED',
    warna_tulisan_ppdb: '#ffffff',
    warna_footer_bg: '#111827',
    warna_footer_text: '#9CA3AF',
    warna_footer_judul: '#ffffff',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingSmtp, setTestingSmtp] = useState(false)
  const [smtpTestResult, setSmtpTestResult] = useState(null)
  const [smtpTestError, setSmtpTestError] = useState(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [deletingLogo, setDeletingLogo] = useState(false)
  const [logoPreview, setLogoPreview] = useState(null)
  const [tahunAjaranList, setTahunAjaranList] = useState([])
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const [res, resTA] = await Promise.all([
        getPengaturan(),
        getTahunAjaran(),
      ])
      setSettings(prev => ({ ...prev, ...res.data }))
      setTahunAjaranList(resTA.data || [])
      if (res.data.logo) {
        setLogoPreview(res.data.logo)
      }
    } catch {
      toast.error('Gagal memuat pengaturan')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updatePengaturan(settings)
      toast.success('Pengaturan berhasil disimpan!')
    } catch {
      toast.error('Gagal menyimpan pengaturan')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validasi ukuran (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 2MB')
      return
    }

    // Validasi tipe
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format file tidak didukung. Gunakan JPG/JPEG, PNG, GIF, atau WebP.')
      return
    }

    // Preview lokal
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target.result)
    reader.readAsDataURL(file)

    setUploadingLogo(true)
    try {
      const res = await uploadLogo(file)
      setSettings(prev => ({ ...prev, logo: res.data.logo }))
      setLogoPreview(res.data.logo)
      toast.success('Logo berhasil diupload!')
    } catch (error) {
      // Kembalikan preview ke logo lama
      setLogoPreview(settings.logo || null)
      toast.error(error.response?.data?.message || 'Gagal mengupload logo')
    } finally {
      setUploadingLogo(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleResetColors = () => {
    if (!confirm('Reset semua warna ke default?')) return
    setSettings(prev => ({
      ...prev,
      warna_utama: '#1A56DB',
      warna_sekunder: '#059669',
      warna_aksen: '#7C3AED',
      warna_tulisan_ppdb: '#ffffff',
      warna_footer_bg: '#111827',
      warna_footer_text: '#9CA3AF',
      warna_footer_judul: '#ffffff',
    }))
    toast.success('Warna direset ke default')
  }

  const handleDeleteLogo = async () => {
    if (!confirm('Hapus logo sekolah?')) return

    setDeletingLogo(true)
    try {
      await deleteLogo()
      setSettings(prev => ({ ...prev, logo: '' }))
      setLogoPreview(null)
      toast.success('Logo berhasil dihapus')
    } catch {
      toast.error('Gagal menghapus logo')
    } finally {
      setDeletingLogo(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-annajah-600"></div>
      </div>
    )
  }

  const fields = [
    { key: 'nama_sekolah', label: 'Nama Sekolah', icon: Building2, type: 'text', col: 'full', required: true },
    { key: 'npsn', label: 'NPSN', icon: Hash, type: 'text', col: 'half' },
    { key: 'tahun_ajaran_aktif', label: 'Tahun Ajaran Aktif', icon: BookOpen, type: 'select', col: 'half' },
    { key: 'alamat_sekolah', label: 'Alamat', icon: MapPin, type: 'text', col: 'full' },
    { key: 'kota', label: 'Kota', icon: MapPin, type: 'text', col: 'third' },
    { key: 'provinsi', label: 'Provinsi', icon: MapPin, type: 'text', col: 'third' },
    { key: 'kode_pos', label: 'Kode Pos', icon: MapPin, type: 'text', col: 'third' },
    { key: 'no_telp', label: 'No. Telepon', icon: Phone, type: 'text', col: 'half', placeholder: '(021) 12345678' },
    { key: 'email', label: 'Email', icon: Mail, type: 'email', col: 'half', placeholder: 'info@smaannajah.sch.id' },
    { key: 'website', label: 'Website', icon: Globe, type: 'text', col: 'half', placeholder: 'www.smaannajah.sch.id' },
    { key: 'kepala_sekolah', label: 'Kepala Sekolah', icon: User, type: 'text', col: 'half' },
    { key: 'bendahara', label: 'Bendahara', icon: Shield, type: 'text', col: 'half' },
  ]

  const smtpFields = [
    { key: 'smtp_host', label: 'SMTP Host', icon: Server, type: 'text', placeholder: 'smtp.gmail.com' },
    { key: 'smtp_port', label: 'SMTP Port', icon: Server, type: 'text', placeholder: '587' },
    { key: 'smtp_user', label: 'SMTP Username', icon: Mail, type: 'text', placeholder: 'email@gmail.com' },
    { key: 'smtp_pass', label: 'SMTP Password', icon: Key, type: 'password', placeholder: 'App Password / Password' },
    { key: 'smtp_email_pengirim', label: 'Email Pengirim', icon: Send, type: 'email', placeholder: 'noreply@smaannajah.sch.id' },
    { key: 'smtp_nama_pengirim', label: 'Nama Pengirim', icon: User, type: 'text', placeholder: 'SMA Annajah' },
  ]

  const handleTestSmtp = async () => {
    setTestingSmtp(true)
    setSmtpTestResult(null)
    setSmtpTestError(null)
    try {
      await testSmtpConnection()
      setSmtpTestResult('success')
      toast.success('Koneksi SMTP berhasil!')
    } catch (error) {
      setSmtpTestResult('error')
      const errorMessage = error.response?.data?.error || error.message || ''
      const serverMessage = error.response?.data?.message || 'Koneksi SMTP gagal'
      setSmtpTestError({ message: serverMessage, detail: errorMessage })
      toast.error(serverMessage)
    } finally {
      setTestingSmtp(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Pengaturan Sekolah</h1>
        <p className="text-gray-500 text-sm mt-1">Kelola informasi profil sekolah</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo Sekolah */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
              <Image className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Logo Sekolah</h2>
              <p className="text-xs text-gray-400">Upload logo sekolah untuk tampil di sidebar, laporan, dan kwitansi</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Preview */}
            <div className="shrink-0">
              {logoPreview ? (
                <div className="relative group">
                  <div className="w-28 h-28 rounded-xl border-2 border-gray-200 overflow-hidden bg-white flex items-center justify-center shadow-sm">
                    <img
                      src={logoPreview}
                      alt="Logo Sekolah"
                      className="max-w-full max-h-full object-contain p-2"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteLogo}
                    disabled={deletingLogo}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md opacity-0 group-hover:opacity-100"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-gray-400">
                  <Image className="w-8 h-8 mb-1 opacity-50" />
                  <span className="text-[10px]">Belum ada logo</span>
                </div>
              )}
            </div>

            {/* Upload controls */}
            <div className="flex-1 space-y-3">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-all duration-200 text-sm font-medium text-gray-700 shadow-sm hover:shadow-md"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingLogo ? 'Mengupload...' : 'Pilih File Gambar'}
                </label>
              </div>
              <p className="text-xs text-gray-400">
                Format: JPG/JPEG, PNG, GIF, WebP. Maksimal 2MB.
              </p>
              {uploadingLogo && (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-annajah-600"></div>
                  <span className="text-sm text-gray-500">Mengupload logo...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Informasi Umum */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-annajah-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-annajah-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Informasi Umum</h2>
              <p className="text-xs text-gray-400">Data pokok sekolah</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fields.slice(0, 7).map(field => (
              <div key={field.key} className={field.col === 'full' ? 'md:col-span-2 lg:col-span-3' : field.col === 'half' ? 'md:col-span-1 lg:col-span-1' : field.col === 'third' ? 'md:col-span-1' : ''}>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  {field.label} {field.required && <span className="text-red-400">*</span>}
                </label>
                <div className="relative">
                  <field.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  {field.type === 'select' ? (
                    <select
                      className="input-field pl-10"
                      value={settings[field.key] || ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      required={field.required}
                    >
                      <option value="">Pilih Tahun Ajaran</option>
                      {tahunAjaranList.map(ta => (
                        <option key={ta.id} value={ta.tahun_ajaran}>{ta.tahun_ajaran} {ta.status === 'aktif' ? '(Aktif)' : ''}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type || 'text'}
                      className="input-field pl-10"
                      value={settings[field.key] || ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder || `Masukkan ${field.label.toLowerCase()}`}
                      required={field.required}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kontak */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Kontak & Media</h2>
              <p className="text-xs text-gray-400">Informasi kontak sekolah</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.slice(7, 10).map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">{field.label}</label>
                <div className="relative">
                  <field.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={field.type || 'text'}
                    className="input-field pl-10"
                    value={settings[field.key] || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder || `Masukkan ${field.label.toLowerCase()}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pejabat */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Pejabat Sekolah</h2>
              <p className="text-xs text-gray-400">Nama pejabat untuk tanda tangan laporan & kwitansi</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Kepala Sekolah</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  className="input-field pl-10"
                  value={settings.kepala_sekolah || ''}
                  onChange={e => handleChange('kepala_sekolah', e.target.value)}
                  placeholder="Nama Kepala Sekolah"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Bendahara</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  className="input-field pl-10"
                  value={settings.bendahara || ''}
                  onChange={e => handleChange('bendahara', e.target.value)}
                  placeholder="Nama Bendahara"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Preview Tanda Tangan</h3>
            <div className="grid grid-cols-2 gap-8 text-center text-xs text-gray-500">
              <div>
                <div className="border-b border-dashed border-gray-300 mb-1 pb-1">ttd</div>
                <p className="font-medium text-gray-700">{settings.kepala_sekolah || '(Nama Kepala Sekolah)'}</p>
                <p>Kepala Sekolah</p>
              </div>
              <div>
                <div className="border-b border-dashed border-gray-300 mb-1 pb-1">ttd</div>
                <p className="font-medium text-gray-700">{settings.bendahara || '(Nama Bendahara)'}</p>
                <p>Bendahara</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pengaturan Kehadiran */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Pengaturan Kehadiran</h2>
              <p className="text-xs text-gray-400">Jam default yang akan terisi otomatis saat input kehadiran bulk</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Jam Masuk Default</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="time"
                  className="input-field pl-10"
                  value={settings.jam_masuk_default || ''}
                  onChange={e => handleChange('jam_masuk_default', e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Otomatis terisi di field Jam Masuk saat input kehadiran (contoh: 07:15)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Jam Keluar Default</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="time"
                  className="input-field pl-10"
                  value={settings.jam_keluar_default || ''}
                  onChange={e => handleChange('jam_keluar_default', e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Otomatis terisi di field Jam Keluar saat input kehadiran (contoh: 13:30)</p>
            </div>
          </div>
        </div>

        {/* Warna Tampilan */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
              <Palette className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Warna Tampilan</h2>
              <p className="text-xs text-gray-400">Sesuaikan warna tema tampilan aplikasi</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Warna Utama</label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white"
                    value={settings.warna_utama || '#1A56DB'}
                    onChange={e => handleChange('warna_utama', e.target.value)}
                  />
                </div>
                <input
                  type="text"
                  className="input-field flex-1 font-mono text-sm"
                  value={settings.warna_utama || ''}
                  onChange={e => handleChange('warna_utama', e.target.value)}
                  placeholder="#1A56DB"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Warna utama untuk tombol, header, dan aksen penting</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Warna Sekunder</label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white"
                    value={settings.warna_sekunder || '#059669'}
                    onChange={e => handleChange('warna_sekunder', e.target.value)}
                  />
                </div>
                <input
                  type="text"
                  className="input-field flex-1 font-mono text-sm"
                  value={settings.warna_sekunder || ''}
                  onChange={e => handleChange('warna_sekunder', e.target.value)}
                  placeholder="#059669"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Warna pendamping untuk aksen sekunder dan badge</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Warna Aksen</label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white"
                    value={settings.warna_aksen || '#7C3AED'}
                    onChange={e => handleChange('warna_aksen', e.target.value)}
                  />
                </div>
                <input
                  type="text"
                  className="input-field flex-1 font-mono text-sm"
                  value={settings.warna_aksen || ''}
                  onChange={e => handleChange('warna_aksen', e.target.value)}
                  placeholder="#7C3AED"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Warna aksen untuk menyoroti elemen khusus</p>
            </div>
          </div>

          {/* Baris ke-4: Warna Tulisan PPDB */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="max-w-sm">
              <label className="block text-sm font-medium text-gray-600 mb-2">Warna Tulisan Hero PPDB</label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white"
                    value={settings.warna_tulisan_ppdb || '#ffffff'}
                    onChange={e => handleChange('warna_tulisan_ppdb', e.target.value)}
                  />
                </div>
                <input
                  type="text"
                  className="input-field flex-1 font-mono text-sm"
                  value={settings.warna_tulisan_ppdb || ''}
                  onChange={e => handleChange('warna_tulisan_ppdb', e.target.value)}
                  placeholder="#ffffff"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Warna teks "Bergabunglah bersama kami..." di hero halaman PPDB</p>
            </div>
          </div>

          {/* Baris ke-5: Warna Footer */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">Warna Footer PPDB</h4>
            <p className="text-xs text-gray-400 mb-4">Sesuaikan warna latar, teks, dan judul di footer halaman PPDB</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Latar Footer</label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white"
                      value={settings.warna_footer_bg || '#111827'}
                      onChange={e => handleChange('warna_footer_bg', e.target.value)}
                    />
                  </div>
                  <input
                    type="text"
                    className="input-field flex-1 font-mono text-sm"
                    value={settings.warna_footer_bg || ''}
                    onChange={e => handleChange('warna_footer_bg', e.target.value)}
                    placeholder="#111827"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Teks Footer</label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white"
                      value={settings.warna_footer_text || '#9CA3AF'}
                      onChange={e => handleChange('warna_footer_text', e.target.value)}
                    />
                  </div>
                  <input
                    type="text"
                    className="input-field flex-1 font-mono text-sm"
                    value={settings.warna_footer_text || ''}
                    onChange={e => handleChange('warna_footer_text', e.target.value)}
                    placeholder="#9CA3AF"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Warna teks body, link, dan ikon di footer</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Judul Footer</label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white"
                      value={settings.warna_footer_judul || '#ffffff'}
                      onChange={e => handleChange('warna_footer_judul', e.target.value)}
                    />
                  </div>
                  <input
                    type="text"
                    className="input-field flex-1 font-mono text-sm"
                    value={settings.warna_footer_judul || ''}
                    onChange={e => handleChange('warna_footer_judul', e.target.value)}
                    placeholder="#ffffff"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Warna judul section dan nama sekolah di footer</p>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Preview Warna</h3>
              <button
                type="button"
                onClick={handleResetColors}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-pink-600 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset ke Default
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: settings.warna_utama || '#1A56DB' }} />
                <span className="text-xs text-gray-500">Utama</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: settings.warna_sekunder || '#059669' }} />
                <span className="text-xs text-gray-500">Sekunder</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: settings.warna_aksen || '#7C3AED' }} />
                <span className="text-xs text-gray-500">Aksen</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-500 mb-2">Footer</h4>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: settings.warna_footer_bg || '#111827' }} />
                  <span className="text-xs text-gray-500">Latar</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg border border-gray-200" style={{ backgroundColor: settings.warna_footer_text || '#9CA3AF' }} />
                  <span className="text-xs text-gray-500">Teks</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: settings.warna_footer_judul || '#ffffff' }} />
                  <span className="text-xs text-gray-500">Judul</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Konfigurasi Email (SMTP) */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <Send className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Konfigurasi Email</h2>
              <p className="text-xs text-gray-400">Pengaturan SMTP untuk kirim laporan via email</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {smtpFields.map(field => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">{field.label}</label>
                  <div className="relative">
                    <field.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={field.type || 'text'}
                      className="input-field pl-10"
                      value={settings[field.key] || ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button type="button" onClick={handleTestSmtp} disabled={testingSmtp}
                className="btn-secondary flex items-center gap-2">
                {testingSmtp ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-annajah-600"></div>
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {testingSmtp ? 'Menguji...' : 'Test Koneksi SMTP'}
              </button>
              {smtpTestResult === 'success' && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" /> Tersambung
                </span>
              )}
              {smtpTestResult === 'error' && (
                <span className="flex items-center gap-1 text-sm text-red-500">
                  <XCircle className="w-4 h-4" /> Gagal — periksa pengaturan
                </span>
              )}
            </div>
            {smtpTestError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="text-sm text-red-700">
                    <p className="font-medium">{smtpTestError.message}</p>
                    {smtpTestError.detail && (
                      <pre className="mt-1.5 text-xs text-red-600 bg-red-100/50 p-2 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono max-h-[200px] overflow-y-auto">
                        {smtpTestError.detail}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button type="submit" disabled={saving}
            className="btn-primary flex items-center gap-2 px-8 py-3 text-base">
            <Save className="w-5 h-5" />
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </form>
    </div>
  )
}
