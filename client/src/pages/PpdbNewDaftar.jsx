import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { School, ArrowLeft, UserPlus, CheckCircle, Loader2, GraduationCap, Camera, Mail, X, HelpCircle, RefreshCw, Info, Download, AlertTriangle, Building2, CreditCard } from 'lucide-react'
import { getLogoPublic, daftarPpdbNew, downloadKartuPpdbNew, getCaptcha, getPengaturanPublic } from '../api'
import toast from 'react-hot-toast'

export default function PpdbNewDaftar() {
  const [logoUrl, setLogoUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [form, setForm] = useState({
    nisn: '', nama_lengkap: '', tempat_lahir: '', tanggal_lahir: '',
    jenis_kelamin: '', alamat: '', asal_sekolah: '', no_telp: '',
    email: '', nama_ayah: '', nama_ibu: '',
  })
  const [foto, setFoto] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [tahunAjaran, setTahunAjaran] = useState('')
  const [captcha, setCaptcha] = useState(null)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [captchaLoading, setCaptchaLoading] = useState(false)
  const [downloadingKartu, setDownloadingKartu] = useState(false)
  const [sekolah, setSekolah] = useState(null)

  useEffect(() => {
    loadData()
    fetchCaptcha()
  }, [])

  const loadData = async () => {
    try {
      const [logoRes, sekolahRes] = await Promise.allSettled([getLogoPublic(), getPengaturanPublic()])
      if (logoRes.status === 'fulfilled' && logoRes.value.data?.logo) setLogoUrl(logoRes.value.data.logo)
      if (sekolahRes.status === 'fulfilled' && sekolahRes.value.data) {
        setSekolah(sekolahRes.value.data)
        if (sekolahRes.value.data.tahun_ajaran_aktif) {
          setTahunAjaran(sekolahRes.value.data.tahun_ajaran_aktif)
          return
        }
      }
    } catch {}
    const year = new Date().getFullYear()
    setTahunAjaran(`${year}/${year + 1}`)
  }

  const fetchCaptcha = async () => {
    setCaptchaLoading(true)
    setCaptchaAnswer('')
    try {
      const res = await getCaptcha()
      setCaptcha(res.data)
    } catch { console.error('Gagal memuat captcha') }
    finally { setCaptchaLoading(false) }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.nisn.trim() || !form.nama_lengkap.trim() || !form.no_telp.trim() || !form.email.trim()) {
      toast.error('NISN, Nama Lengkap, No. Telepon, dan Email harus diisi')
      return
    }

    // Validasi format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email.trim())) {
      toast.error('Format email tidak valid')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      Object.entries(form).forEach(([key, value]) => formData.append(key, value))
      if (foto) formData.append('foto', foto)

      // Ambil GPS secara diam-diam
      const lokasi = await getLocationSilently()
      if (lokasi) {
        formData.append('gps_latitude', lokasi.lat)
        formData.append('gps_longitude', lokasi.lng)
      }

      if (captcha) {
        formData.append('captcha_token', captcha.token)
        formData.append('captcha_answer', captchaAnswer)
      }

      const res = await daftarPpdbNew(formData)
      setSuccess(res.data)
      toast.success('Pendaftaran berhasil! Cek email Anda.')
    } catch (error) {
      const errMsg = error.response?.data
      if (errMsg?.nisnTerdaftar) {
        toast.error(errMsg.message, { duration: 6000 })
      } else {
        toast.error(errMsg?.message || 'Gagal mendaftarkan')
      }
      fetchCaptcha()
    } finally {
      setLoading(false)
    }
  }

  const getLocationSilently = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude.toFixed(6), lng: position.coords.longitude.toFixed(6) }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000 }
      )
    })
  }

  const handleDownloadKartu = async () => {
    if (!success?.no_pendaftaran) return
    setDownloadingKartu(true)
    try {
      await downloadKartuPpdbNew(success.no_pendaftaran)
      toast.success('Kartu pendaftaran berhasil diunduh')
    } catch { toast.error('Gagal mengunduh kartu') }
    finally { setDownloadingKartu(false) }
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
            Data Anda telah berhasil didaftarkan. Cek email untuk detail pendaftaran.
          </p>

          <div className="space-y-3 mb-6">
            <div className="bg-annajah-50 rounded-xl p-5 border border-annajah-100">
              <p className="text-xs text-gray-500 mb-1">Nomor Pendaftaran</p>
              <p className="text-2xl font-bold text-annajah-700 tracking-wider font-mono">{success.no_pendaftaran}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
              <p className="text-xs text-amber-600 mb-1">Kode Rahasia <span className="font-bold">(simpan kode ini)</span></p>
              <p className="text-2xl font-bold text-amber-700 tracking-wider font-mono">{success.kode_rahasia}</p>
              <p className="text-[10px] text-amber-500 mt-1">Gunakan untuk edit data, upload foto, cek hasil & cetak kartu</p>
            </div>
            {success.email_terkirim ? (
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 flex items-center gap-3">
                <Mail className="w-5 h-5 text-emerald-500 shrink-0" />
                <div className="text-left text-sm">
                  <p className="font-medium text-emerald-800">Email terkirim!</p>
                  <p className="text-emerald-600 text-xs">Cek inbox/spam <strong>{success.email}</strong></p>
                </div>
              </div>
            ) : success.email ? (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="text-left text-sm">
                  <p className="font-medium text-amber-800">Email belum terkirim</p>
                  <p className="text-amber-600 text-xs">Konfigurasi SMTP belum diatur. Catat nomor pendaftaran & kode rahasia di atas.</p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Download Kartu */}
          <button onClick={handleDownloadKartu} disabled={downloadingKartu}
            className="w-full mb-3 px-4 py-3 bg-gradient-to-r from-annajah-500 to-annajah-600 text-white rounded-xl text-sm font-medium hover:from-annajah-600 hover:to-annajah-700 transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
          >
            {downloadingKartu ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {downloadingKartu ? 'Mengunduh...' : 'Download Kartu Pendaftaran (PDF)'}
          </button>

          <div className="flex gap-3">
            <Link to="/ppdbnew" className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">Kembali</Link>
            <Link to="/ppdbnew/hasil" className="flex-1 px-4 py-2.5 bg-gradient-to-r from-annajah-500 to-annajah-600 text-white rounded-xl text-sm font-medium hover:from-annajah-600 hover:to-annajah-700 transition-all shadow-md">Cek Hasil</Link>
          </div>
        </div>
      </div>
    )
  }

  const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-annajah-500/20 focus:border-annajah-500 outline-none transition-all duration-200 bg-white"
  const labelClass = "block text-sm font-medium text-gray-600 mb-1.5"

  return (
    <div className="min-h-screen bg-gradient-to-br from-annajah-900 via-annajah-700 to-annajah-500 flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white opacity-5 rounded-full"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white opacity-5 rounded-full"></div>
      </div>

      <div className="relative z-10 px-4 py-4">
        <Link to="/ppdbnew" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Link>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pb-12 relative z-10">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-xl mb-4 overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1.5" />
              ) : (
                <GraduationCap className="w-8 h-8 text-annajah-600" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-white">Formulir Pendaftaran</h1>
            <p className="text-annajah-200 text-sm">PPDB {tahunAjaran}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
            {/* Info Biaya Pendaftaran & Rekening */}
            <div className="mb-5 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-emerald-800">Informasi Pembayaran</h3>
              </div>
              <p className="text-xs text-emerald-700 mb-2">
                Setelah mendaftar, lakukan transfer biaya pendaftaran sebesar{' '}
                <strong className="text-emerald-800">
                  Rp {((sekolah?.biaya_pendaftaran && parseInt(sekolah.biaya_pendaftaran)) || 350000).toLocaleString('id-ID')}
                </strong>
                {' '}ke rekening berikut:
              </p>
              <div className="bg-white rounded-xl p-3 border border-emerald-100 space-y-1.5">
                {(sekolah?.rekening_bank || sekolah?.rekening_nomor || sekolah?.rekening_atas_nama) ? (
                  <>
                    <p className="text-xs text-gray-600 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-gray-400">Bank:</span>
                      <span className="font-semibold text-gray-800">{sekolah.rekening_bank}</span>
                    </p>
                    <p className="text-xs text-gray-600 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-gray-400">No. Rek:</span>
                      <span className="font-semibold text-gray-800 font-mono">{sekolah.rekening_nomor}</span>
                    </p>
                    <p className="text-xs text-gray-600 flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-gray-400">A/n:</span>
                      <span className="font-semibold text-gray-800">{sekolah.rekening_atas_nama}</span>
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    Biaya Pendaftaran: Rp {((sekolah?.biaya_pendaftaran && parseInt(sekolah.biaya_pendaftaran)) || 350000).toLocaleString('id-ID')}
                    {' '}(Info rekening menyusul)
                  </p>
                )}
              </div>
              <p className="text-[10px] text-emerald-500 mt-1.5">Simpan bukti transfer untuk verifikasi pendaftaran.</p>
            </div>

            {/* Info email mandatory */}
            <div className="mb-5 p-3 bg-blue-50 rounded-xl border border-blue-200 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                <strong>Email wajib diisi.</strong> Setelah mendaftar, Anda akan menerima email berisi Nomor Pendaftaran dan Kode Rahasia.
                Gunakan kedua nomor tersebut untuk <strong>mengedit data</strong>, <strong>mengunggah ulang foto</strong>, mengecek hasil, dan mencetak kartu pendaftaran.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Data Diri */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-annajah-500 rounded-full"></span>
                  Data Diri
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
                    <select name="jenis_kelamin" value={form.jenis_kelamin} onChange={handleChange} className={inputClass}>
                      <option value="">Pilih...</option>
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Lokasi</label>
                    <textarea name="alamat" value={form.alamat} onChange={handleChange}
                      className={inputClass} rows="2" placeholder="Lokasi lengkap"></textarea>
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
                          <img src={fotoPreview} alt="Preview" className="w-36 h-44 object-cover rounded-xl border-2 border-gray-200 shadow-sm" />
                          <button type="button" onClick={() => { if (fotoPreview) URL.revokeObjectURL(fotoPreview); setFoto(null); setFotoPreview(null) }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                          ><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-36 h-44 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-annajah-400 hover:bg-annajah-50/30 transition-all duration-200 group">
                          <Camera className="w-8 h-8 text-gray-300 group-hover:text-annajah-400 transition-colors" />
                          <span className="mt-2 text-xs text-gray-400 group-hover:text-annajah-500 transition-colors">Upload Foto</span>
                          <span className="mt-0.5 text-[10px] text-gray-300">JPG/PNG/WebP, max 2MB</span>
                          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => {
                            const file = e.target.files[0]
                            if (!file) return
                            if (file.size > 2 * 1024 * 1024) { toast.error('Ukuran foto maksimal 2MB'); e.target.value = ''; return }
                            setFoto(file)
                            setFotoPreview(URL.createObjectURL(file))
                          }} className="hidden" />
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
                  Kontak <span className="text-xs text-red-400 font-normal">(email wajib diisi)</span>
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>No. Telepon/WA <span className="text-red-500">*</span></label>
                    <input type="tel" name="no_telp" value={form.no_telp} onChange={handleChange}
                      className={inputClass} placeholder="No. telepon orang tua/wali" required />
                  </div>
                  <div>
                    <label className={labelClass}>Email <span className="text-red-500">*</span></label>
                    <input type="email" name="email" value={form.email} onChange={handleChange}
                      className={inputClass} placeholder="email@contoh.com" required />
                    <p className="text-[10px] text-gray-400 mt-1">Email akan digunakan untuk mengirim data pendaftaran</p>
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
                          <Loader2 className="w-4 h-4 animate-spin" /> Memuat captcha...
                        </div>
                      ) : captcha ? (
                        <span className="inline-flex items-center gap-2 text-base font-bold tracking-widest text-gray-700 bg-white px-3 py-1.5 rounded-lg border border-gray-200 select-none">
                          {captcha.question} = ?
                        </span>
                      ) : (
                        <span className="text-sm text-red-500">Gagal memuat captcha</span>
                      )}
                    </div>
                    <button type="button" onClick={fetchCaptcha} disabled={captchaLoading}
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all flex-shrink-0"
                      title="Muat ulang captcha"
                    ><RefreshCw className={`w-4 h-4 ${captchaLoading ? 'animate-spin' : ''}`} /></button>
                  </div>
                  <input type="text" value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)}
                    className="input-field text-center font-bold tracking-wider" placeholder="Masukkan jawaban"
                    autoComplete="off" inputMode="numeric" pattern="[0-9]*" required />
                </div>
              </div>

              {/* Submit */}
              <div className="border-t border-gray-100 pt-5">
                <button type="submit" disabled={loading || !captchaAnswer.trim()}
                  className="w-full bg-gradient-to-r from-annajah-500 to-annajah-600 text-white font-medium py-3 px-6 rounded-xl hover:from-annajah-600 hover:to-annajah-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                  {loading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
