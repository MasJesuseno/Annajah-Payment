import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { School, ArrowLeft, UserPlus, CheckCircle, Loader2, GraduationCap, Camera, Download, User, Calendar, MapPin, BookOpen, Clock, Mail, X, HelpCircle, RefreshCw } from 'lucide-react'
import { getLogoPublic, daftarPpdb, downloadKartuPpdb, kirimEmailKartuPpdb, getCaptcha, getPengaturanPublic } from '../api'
import toast from 'react-hot-toast'

export default function PpdbDaftar() {
  const [logoUrl, setLogoUrl] = useState(null)
  const [logoError, setLogoError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [form, setForm] = useState({
    nisn: '',
    nama_lengkap: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    jenis_kelamin: '',
    alamat: '',
    asal_sekolah: '',
    no_telp: '',
    email: '',
    nama_ayah: '',
    nama_ibu: '',
  })
  const [foto, setFoto] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [downloadingKartu, setDownloadingKartu] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  // Captcha state
  const [tahunAjaran, setTahunAjaran] = useState('')
  const [captcha, setCaptcha] = useState(null)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [captchaLoading, setCaptchaLoading] = useState(false)

  useEffect(() => {
    loadLogo()
    fetchCaptcha()
    loadTahunAjaran()
  }, [])

  const loadLogo = async () => {
    try {
      const res = await getLogoPublic()
      if (res.data?.logo) setLogoUrl(res.data.logo)
    } catch { /* fallback */ }
  }

  const loadTahunAjaran = async () => {
    try {
      const res = await getPengaturanPublic()
      if (res.data?.tahun_ajaran_aktif) {
        setTahunAjaran(res.data.tahun_ajaran_aktif)
        return
      }
    } catch { /* fallback */ }
    const year = new Date().getFullYear()
    setTahunAjaran(`${year}/${year + 1}`)
  }

  const fetchCaptcha = async () => {
    setCaptchaLoading(true)
    setCaptchaAnswer('')
    try {
      const res = await getCaptcha()
      setCaptcha(res.data)
    } catch {
      console.error('Gagal memuat captcha')
    } finally {
      setCaptchaLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.nisn.trim() || !form.nama_lengkap.trim() || !form.no_telp.trim()) {
      toast.error('NISN, Nama Lengkap, dan No. Telepon harus diisi')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value)
      })
      if (foto) {
        formData.append('foto', foto)
      }
      // Ambil lokasi GPS secara diam-diam saat submit
      const lokasi = await getLocationSilently()
      if (lokasi) {
        formData.append('gps_latitude', lokasi.lat)
        formData.append('gps_longitude', lokasi.lng)
      }
      // Sertakan captcha
      if (captcha) {
        formData.append('captcha_token', captcha.token)
        formData.append('captcha_answer', captchaAnswer)
      }
      const res = await daftarPpdb(formData)
      setSuccess(res.data)
      toast.success('Pendaftaran berhasil!')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal mendaftarkan')
      fetchCaptcha() // Refresh captcha jika gagal (token sudah terpakai)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadKartu = async () => {
    if (!success?.no_pendaftaran) return
    setDownloadingKartu(true)
    try {
      await downloadKartuPpdb(success.no_pendaftaran)
      toast.success('Kartu pendaftaran berhasil diunduh')
    } catch (error) {
      toast.error('Gagal mengunduh kartu pendaftaran')
    } finally {
      setDownloadingKartu(false)
    }
  }

  const handleSendEmail = async () => {
    if (!success?.no_pendaftaran) return
    const emailTujuan = form.email || ''
    if (!emailTujuan.trim()) {
      toast.error('Anda belum mengisi email saat pendaftaran')
      return
    }
    setSendingEmail(true)
    try {
      await kirimEmailKartuPpdb({
        no_pendaftaran: success.no_pendaftaran,
        email_tujuan: emailTujuan.trim(),
      })
      toast.success(`Kartu pendaftaran berhasil dikirim ke ${emailTujuan.trim()}`)
      setEmailSent(true)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal mengirim email. Periksa konfigurasi SMTP.')
    } finally {
      setSendingEmail(false)
    }
  }

  // Sukses
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-annajah-900 via-annajah-700 to-annajah-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Pendaftaran Berhasil!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Simpan nomor pendaftaran Anda untuk mengecek hasil seleksi.
          </p>
          <div className="space-y-3 mb-6">
            <div className="bg-annajah-50 rounded-xl p-5 border border-annajah-100">
              <p className="text-xs text-gray-500 mb-1">Nomor Pendaftaran</p>
              <p className="text-2xl font-bold text-annajah-700 tracking-wider font-mono">
                {success.no_pendaftaran}
              </p>
            </div>
            <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
              <p className="text-xs text-amber-600 mb-1">Kode Rahasia <span className="font-bold">(simpan kode ini)</span></p>
              <p className="text-2xl font-bold text-amber-700 tracking-wider font-mono">
                {success.kode_rahasia}
              </p>
              <p className="text-[10px] text-amber-500 mt-1">Kode ini diperlukan untuk mengecek hasil pendaftaran</p>
            </div>
          </div>

          {/* Preview Kartu Pendaftaran */}
          <div className="mb-6 animate-fade-in">
            <p className="text-xs text-gray-400 mb-3 text-center">Preview Kartu Pendaftaran</p>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-annajah-200 max-w-sm mx-auto">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-annajah-600 to-annajah-700 px-5 py-4 text-white text-center">
                <div className="flex items-center justify-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-md shrink-0">
                    {logoUrl && !logoError ? (
                      <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <School className="w-4 h-4 text-annajah-600" />
                    )}
                  </div>
                  <div className="text-left">
                    <h2 className="font-bold text-xs leading-tight">SMA Annajah</h2>
                    <p className="text-[9px] text-annajah-200">Penerimaan Peserta Didik Baru</p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-white/20">
                  <p className="text-[9px] text-annajah-200 uppercase tracking-wider">Kartu Pendaftaran</p>
                  <p className="text-xs text-annajah-200">{tahunAjaran}</p>
                </div>
              </div>

              {/* Foto + No Pendaftaran */}
              <div className="px-5 py-3 text-center border-b border-gray-100">
                {(fotoPreview || success.foto) && (
                  <div className="flex justify-center mb-2.5">
                    <div className="w-16 h-20 rounded-xl overflow-hidden border-2 border-annajah-200 shadow-sm">
                      <img
                        src={fotoPreview || `/api/ppdb/foto/${success.foto}`}
                        alt="Foto"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">Nomor Pendaftaran</p>
                <p className="text-base font-bold text-annajah-700 font-mono tracking-wider">{success.no_pendaftaran}</p>
                <p className="text-[9px] text-gray-400 mt-1">
                  Kode:{' '}
                  <span className="font-mono font-bold text-amber-600">{success.kode_rahasia}</span>
                </p>
              </div>

              {/* Status - Menunggu */}
              <div className="px-5 py-2.5 text-center">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-bold border bg-amber-100 text-amber-700 border-amber-300">
                  <Clock className="w-3 h-3" />
                  MENUNGGU
                </span>
              </div>

              {/* Identitas */}
              <div className="px-5 pb-4">
                <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                  <table className="w-full text-[11px]">
                    <tbody>
                      {[
                        { icon: User, label: 'NISN', value: form.nisn },
                        { icon: User, label: 'Nama Lengkap', value: form.nama_lengkap, bold: true },
                        { icon: MapPin, label: 'Tempat Lahir', value: form.tempat_lahir || '-' },
                        { icon: Calendar, label: 'Tanggal Lahir', value: form.tanggal_lahir ? new Date(form.tanggal_lahir + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-' },
                        { icon: User, label: 'Jenis Kelamin', value: form.jenis_kelamin === 'L' ? 'Laki-laki' : form.jenis_kelamin === 'P' ? 'Perempuan' : '-' },
                        { icon: MapPin, label: 'Asal Sekolah', value: form.asal_sekolah || '-' },
                        { icon: Calendar, label: 'No. Telepon', value: form.no_telp || '-' },
                      ].map((item, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="px-2.5 py-2 text-gray-400 w-7">
                            <item.icon className="w-3 h-3" />
                          </td>
                          <td className="px-1.5 py-2 text-gray-500 whitespace-nowrap">{item.label}</td>
                          <td className={`px-2.5 py-2 text-right ${item.bold ? 'font-semibold text-gray-800' : 'text-gray-700'}`}>{item.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-2.5 bg-gradient-to-r from-annajah-50 to-annajah-100 border-t border-annajah-200 text-center">
                <p className="text-[8px] text-annajah-400">
                  Kartu ini adalah bukti pendaftaran resmi. Simpan sebagai bukti.
                </p>
              </div>
            </div>
          </div>

          {/* Download Kartu Pendaftaran */}
          <button
            onClick={handleDownloadKartu}
            disabled={downloadingKartu}
            className="w-full mb-3 px-4 py-3 bg-gradient-to-r from-annajah-500 to-annajah-600 text-white rounded-xl text-sm font-medium hover:from-annajah-600 hover:to-annajah-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
          >
            {downloadingKartu ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {downloadingKartu ? 'Mengunduh...' : 'Download Kartu Pendaftaran (PDF)'}
          </button>

          {/* Kirim via Email */}
          <button
            onClick={handleSendEmail}
            disabled={sendingEmail || emailSent}
            className={`w-full mb-4 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2 ${
              emailSent
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                : 'bg-white text-gray-700 border-2 border-annajah-200 hover:border-annajah-400 hover:bg-annajah-50'
            }`}
          >
            {sendingEmail ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className={`w-4 h-4 ${emailSent ? 'text-emerald-500' : 'text-annajah-500'}`} />
            )}
            {sendingEmail
              ? 'Mengirim...'
              : emailSent
                ? `Terkirim ke ${form.email || ''}`
                : `Kirim via Email${form.email ? ` (${form.email})` : ''}`
            }
          </button>

          <div className="flex gap-3">
            <Link
              to="/ppdb"
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all duration-200"
            >
              Kembali
            </Link>
            <Link
              to="/ppdb/hasil"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-annajah-500 to-annajah-600 text-white rounded-xl text-sm font-medium hover:from-annajah-600 hover:to-annajah-700 transition-all duration-200 shadow-md"
            >
              Cek Hasil
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-annajah-500/20 focus:border-annajah-500 outline-none transition-all duration-200 bg-white"
  const labelClass = "block text-sm font-medium text-gray-600 mb-1.5"
  const selectClass = inputClass

  const handleFotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validasi ukuran (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 2MB')
      e.target.value = ''
      return
    }

    // Validasi tipe
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format foto harus JPG, PNG, atau WebP')
      e.target.value = ''
      return
    }

    setFoto(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const handleRemoveFoto = () => {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview)
    setFoto(null)
    setFotoPreview(null)
    // Reset file input
    const fileInput = document.getElementById('foto-upload')
    if (fileInput) fileInput.value = ''
  }

  const getLocationSilently = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude.toFixed(6),
            lng: position.coords.longitude.toFixed(6),
          })
        },
        () => {
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 8000 }
      )
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-annajah-900 via-annajah-700 to-annajah-500 flex flex-col relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white opacity-5 rounded-full"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white opacity-5 rounded-full"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 px-4 py-4">
        <Link to="/ppdb" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Link>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-start justify-center px-4 pb-12 relative z-10">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-xl mb-4 overflow-hidden">
              {logoUrl && !logoError ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1.5"
                  onError={() => setLogoError(true)} />
              ) : (
                <GraduationCap className="w-8 h-8 text-annajah-600" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-white">Formulir Pendaftaran</h1>
            <p className="text-annajah-200 text-sm">PPDB SMA Annajah TA {tahunAjaran}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Data Diri */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-annajah-500 rounded-full"></span>
                  Data Diri Calon Peserta Didik
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>NISN <span className="text-red-500">*</span></label>
                    <input type="text" name="nisn" value={form.nisn} onChange={handleChange}
                      className={inputClass} placeholder="Nomor Induk Siswa Nasional" required />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Nama Lengkap <span className="text-red-500">*</span></label>
                    <input type="text" name="nama_lengkap" value={form.nama_lengkap} onChange={handleChange}
                      className={inputClass} placeholder="Nama lengkap sesuai ijazah" required />
                  </div>
                  <div>
                    <label className={labelClass}>Tempat Lahir</label>
                    <input type="text" name="tempat_lahir" value={form.tempat_lahir} onChange={handleChange}
                      className={inputClass} placeholder="Kota kelahiran" />
                  </div>
                  <div>
                    <label className={labelClass}>Tanggal Lahir</label>
                    <input type="date" name="tanggal_lahir" value={form.tanggal_lahir} onChange={handleChange}
                      className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Jenis Kelamin</label>
                    <select name="jenis_kelamin" value={form.jenis_kelamin} onChange={handleChange} className={selectClass}>
                      <option value="">Pilih...</option>
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelClass}>Alamat</label>
                    <textarea name="alamat" value={form.alamat} onChange={handleChange}
                      className={inputClass} rows="2" placeholder="Alamat lengkap"></textarea>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Asal Sekolah</label>
                    <input type="text" name="asal_sekolah" value={form.asal_sekolah} onChange={handleChange}
                      className={inputClass} placeholder="Nama sekolah sebelumnya" />
                  </div>

                  {/* Foto */}
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Foto</label>
                    <div className="mt-1">
                      {fotoPreview ? (
                        <div className="relative inline-block">
                          <img
                            src={fotoPreview}
                            alt="Preview"
                            className="w-36 h-44 object-cover rounded-xl border-2 border-gray-200 shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveFoto}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-36 h-44 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-annajah-400 hover:bg-annajah-50/30 transition-all duration-200 group">
                          <Camera className="w-8 h-8 text-gray-300 group-hover:text-annajah-400 transition-colors duration-200" />
                          <span className="mt-2 text-xs text-gray-400 group-hover:text-annajah-500 transition-colors duration-200">Upload Foto</span>
                          <span className="mt-0.5 text-[10px] text-gray-300">JPG/PNG/WebP, max 2MB</span>
                          <input
                            id="foto-upload"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleFotoChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Kontak */}
              <div className="border-t border-gray-100 pt-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-annajah-500 rounded-full"></span>
                  Kontak
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>No. Telepon/WA <span className="text-red-500">*</span></label>
                    <input type="tel" name="no_telp" value={form.no_telp} onChange={handleChange}
                      className={inputClass} placeholder="No. telepon orang tua/wali" required />
                  </div>
                  <div>
                    <label className={labelClass}>Email</label>
                    <input type="email" name="email" value={form.email} onChange={handleChange}
                      className={inputClass} placeholder="email@contoh.com" />
                  </div>
                </div>
              </div>

              {/* Orang Tua */}
              <div className="border-t border-gray-100 pt-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-annajah-500 rounded-full"></span>
                  Data Orang Tua
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Nama Ayah</label>
                    <input type="text" name="nama_ayah" value={form.nama_ayah} onChange={handleChange}
                      className={inputClass} placeholder="Nama ayah" />
                  </div>
                  <div>
                    <label className={labelClass}>Nama Ibu</label>
                    <input type="text" name="nama_ibu" value={form.nama_ibu} onChange={handleChange}
                      className={inputClass} placeholder="Nama ibu" />
                  </div>
                </div>
              </div>

              {/* Captcha */}
              <div className="border-t border-gray-100 pt-5">
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-600">
                    <span className="inline-flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      Verifikasi Keamanan
                    </span>
                  </label>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="flex-1 min-w-0">
                      {captchaLoading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Memuat captcha...
                        </div>
                      ) : captcha ? (
                        <span className="inline-flex items-center gap-2 text-base font-bold tracking-widest text-gray-700 bg-white px-3 py-1.5 rounded-lg border border-gray-200 select-none">
                          {captcha.question} = ?
                        </span>
                      ) : (
                        <span className="text-sm text-red-500">Gagal memuat captcha</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={fetchCaptcha}
                      disabled={captchaLoading}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all flex-shrink-0"
                      title="Muat ulang captcha"
                    >
                      <RefreshCw className={`w-4 h-4 ${captchaLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    className="input-field text-center font-bold tracking-wider"
                    placeholder="Masukkan jawaban"
                    autoComplete="off"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="border-t border-gray-100 pt-5">
                <button
                  type="submit"
                  disabled={loading || !captchaAnswer.trim()}
                  className="w-full bg-gradient-to-r from-annajah-500 to-annajah-600 text-white font-medium py-3 px-6 rounded-xl hover:from-annajah-600 hover:to-annajah-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <UserPlus className="w-5 h-5" />
                  )}
                  {loading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
                </button>
                <p className="text-xs text-gray-400 mt-3 text-center">
                  Dengan mendaftar, Anda menyetujui ketentuan yang berlaku di SMA Annajah.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
