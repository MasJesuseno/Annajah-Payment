import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader2, GraduationCap, Camera, CheckCircle, Upload, Info, AlertCircle, FileUp, Building2, CreditCard } from 'lucide-react'
import { getLogoPublic, cekPpdbNew, editPpdbNew, uploadFotoPpdbNew, uploadBuktiTransferPpdbNew } from '../api'
import toast from 'react-hot-toast'

export default function PpdbNewEdit() {
  const [searchParams] = useSearchParams()
  const [logoUrl, setLogoUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [uploadingBukti, setUploadingBukti] = useState(false)
  const [data, setData] = useState(null)
  const [form, setForm] = useState({})
  const [foto, setFoto] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [success, setSuccess] = useState(null)
  const [step, setStep] = useState('login') // login | edit | success

  // Auth
  const [noPendaftaran, setNoPendaftaran] = useState(searchParams.get('no') || '')
  const [kodeRahasia, setKodeRahasia] = useState(searchParams.get('kode') || '')
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    getLogoPublic().then(res => { if (res.data?.logo) setLogoUrl(res.data.logo) }).catch(() => {})
    if (noPendaftaran && kodeRahasia) {
      loadData(noPendaftaran, kodeRahasia)
    } else {
      setLoading(false)
    }
  }, [])

  const loadData = async (no, kode) => {
    setLoading(true)
    setAuthError(null)
    try {
      const res = await cekPpdbNew(no, kode)
      setData(res.data)
      setForm({
        nama_lengkap: res.data.nama_lengkap || '',
        tempat_lahir: res.data.tempat_lahir || '',
        tanggal_lahir: res.data.tanggal_lahir || '',
        jenis_kelamin: res.data.jenis_kelamin === 'Laki-laki' ? 'L' : res.data.jenis_kelamin === 'Perempuan' ? 'P' : '',
        alamat: res.data.alamat || '',
        asal_sekolah: res.data.asal_sekolah || '',
        no_telp: res.data.no_telp || '',
        nama_ayah: res.data.nama_ayah || '',
        nama_ibu: res.data.nama_ibu || '',
      })
      setStep('edit')
    } catch (error) {
      setAuthError(error.response?.data?.message || 'Gagal memuat data. Periksa nomor pendaftaran dan kode rahasia.')
    } finally {
      setLoading(false)
    }
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    if (!noPendaftaran.trim() || !kodeRahasia.trim()) {
      toast.error('Nomor pendaftaran dan kode rahasia harus diisi')
      return
    }
    await loadData(noPendaftaran.trim(), kodeRahasia.trim())
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await editPpdbNew(noPendaftaran, { ...form, kode_rahasia: kodeRahasia })
      setSuccess('Data berhasil diperbarui!')
      toast.success('Data pendaftaran berhasil diperbarui')
      // Reload data
      const res = await cekPpdbNew(noPendaftaran, kodeRahasia)
      setData(res.data)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan data')
    } finally {
      setSaving(false)
    }
  }

  const handleFotoChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Ukuran foto maksimal 2MB'); e.target.value = ''; return }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) { toast.error('Format foto harus JPG, PNG, atau WebP'); e.target.value = ''; return }

    setUploadingFoto(true)
    try {
      const formData = new FormData()
      formData.append('foto', file)
      formData.append('kode_rahasia', kodeRahasia)
      const res = await uploadFotoPpdbNew(noPendaftaran, formData)
      toast.success('Foto berhasil diperbarui')
      // Reload data
      const dataRes = await cekPpdbNew(noPendaftaran, kodeRahasia)
      setData(dataRes.data)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal mengupload foto')
    } finally {
      setUploadingFoto(false)
      e.target.value = ''
    }
  }

  const inputClass = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-annajah-500/20 focus:border-annajah-500 outline-none transition-all duration-200 bg-white"
  const labelClass = "block text-sm font-medium text-gray-600 mb-1.5"

  // Step 1: Login with no_pendaftaran + kode_rahasia
  if (step === 'login') {
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
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-xl mb-4 overflow-hidden">
                {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1.5" /> : <GraduationCap className="w-8 h-8 text-annajah-600" />}
              </div>
              <h1 className="text-2xl font-bold text-white">Edit Data Pendaftaran</h1>
              <p className="text-annajah-200 text-sm">Masukkan nomor pendaftaran & kode rahasia</p>
            </div>

            <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Nomor Pendaftaran</label>
                  <input type="text" value={noPendaftaran} onChange={(e) => setNoPendaftaran(e.target.value.toUpperCase())}
                    className={inputClass} placeholder="Contoh: PPDB2026000001" autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Kode Rahasia</label>
                  <input type="text" value={kodeRahasia} onChange={(e) => setKodeRahasia(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className={inputClass} placeholder="6 digit kode rahasia" inputMode="numeric" maxLength={6} />
                </div>
                {authError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-600">{authError}</p>
                  </div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full bg-gradient-to-r from-annajah-500 to-annajah-600 text-white font-medium py-3 px-6 rounded-xl hover:from-annajah-600 hover:to-annajah-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {loading ? 'Memeriksa...' : 'Lanjutkan'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
              {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1.5" /> : <GraduationCap className="w-8 h-8 text-annajah-600" />}
            </div>
            <h1 className="text-2xl font-bold text-white">Edit Data Pendaftaran</h1>
            <p className="text-annajah-200 text-sm">No. {data?.no_pendaftaran}</p>
          </div>

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center mb-6 animate-fade-in">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-emerald-700 font-medium">{success}</p>
            </div>
          )}

          {/* Foto Section */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 mb-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Camera className="w-4 h-4 text-annajah-500" /> Foto
            </h3>
            <div className="flex items-center gap-5">
              <div className="w-28 h-32 rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-50 flex items-center justify-center shrink-0">
                {data?.foto ? (
                  <img src={`/api/ppdbnew/foto/${data.foto}`} alt="Foto" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-10 h-10 text-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-2">
                  {data?.foto ? 'Foto saat ini. Upload ulang jika ingin mengganti.' : 'Belum ada foto.'}
                </p>
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all ${
                  uploadingFoto ? 'bg-gray-200 text-gray-500' : 'bg-annajah-50 text-annajah-700 border border-annajah-200 hover:bg-annajah-100'
                }`}>
                  {uploadingFoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadingFoto ? 'Mengupload...' : 'Upload Ulang Foto'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFotoChange} className="hidden" disabled={uploadingFoto} />
                </label>
                <p className="text-[10px] text-gray-400 mt-1">JPG/PNG/WebP, max 2MB</p>
              </div>
            </div>
          </div>

          {/* Upload Bukti Transfer */}
          <div className="bg-white rounded-2xl shadow-2xl p-6 mb-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileUp className="w-4 h-4 text-emerald-500" /> Bukti Transfer
            </h3>
            <div className="flex items-center gap-5">
              <div className="w-28 h-32 rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-50 flex items-center justify-center shrink-0">
                {data?.bukti_transfer ? (
                  data.bukti_transfer.endsWith('.pdf') ? (
                    <div className="flex flex-col items-center text-center p-2">
                      <FileUp className="w-10 h-10 text-red-400 mb-1" />
                      <span className="text-[10px] text-gray-400">File PDF</span>
                    </div>
                  ) : (
                    <img src={`/api/ppdbnew/bukti-transfer/${data.bukti_transfer}`} alt="Bukti Transfer" className="w-full h-full object-cover" />
                  )
                ) : (
                  <FileUp className="w-10 h-10 text-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-2">
                  {data?.bukti_transfer ? 'Bukti transfer sudah diupload. Upload ulang jika ingin mengganti.' : 'Upload bukti transfer biaya pendaftaran.'}
                </p>
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all ${
                  uploadingBukti ? 'bg-gray-200 text-gray-500' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                }`}>
                  {uploadingBukti ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadingBukti ? 'Mengupload...' : data?.bukti_transfer ? 'Ganti Bukti Transfer' : 'Upload Bukti Transfer'}
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={async (e) => {
                    const file = e.target.files[0]
                    if (!file) return
                    if (file.size > 2 * 1024 * 1024) { toast.error('Ukuran file maksimal 2MB'); e.target.value = ''; return }

                    setUploadingBukti(true)
                    try {
                      const formData = new FormData()
                      formData.append('bukti_transfer', file)
                      formData.append('kode_rahasia', kodeRahasia)
                      await uploadBuktiTransferPpdbNew(noPendaftaran, formData)
                      toast.success('Bukti transfer berhasil diupload')
                      // Reload data
                      const dataRes = await cekPpdbNew(noPendaftaran, kodeRahasia)
                      setData(dataRes.data)
                    } catch (error) {
                      toast.error(error.response?.data?.message || 'Gagal mengupload bukti transfer')
                    } finally {
                      setUploadingBukti(false)
                      e.target.value = ''
                    }
                  }} className="hidden" disabled={uploadingBukti} />
                </label>
                <p className="text-[10px] text-gray-400 mt-1">JPG/PNG/WebP/PDF, max 2MB</p>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="bg-white rounded-2xl shadow-2xl p-6">
            <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-200 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">NISN dan Email tidak dapat diedit. Hubungi admin jika ada kesalahan pada NISN atau Email.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>NISN <span className="text-gray-400">(tidak bisa diubah)</span></label>
                  <input type="text" value={data?.nisn || ''} disabled className={`${inputClass} bg-gray-50 text-gray-500`} />
                </div>
                <div>
                  <label className={labelClass}>Email <span className="text-gray-400">(tidak bisa diubah)</span></label>
                  <input type="text" value={data?.email || ''} disabled className={`${inputClass} bg-gray-50 text-gray-500`} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Nama Lengkap <span className="text-red-500">*</span></label>
                  <input type="text" name="nama_lengkap" value={form.nama_lengkap} onChange={handleChange}
                    className={inputClass} required />
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
                <div>
                  <label className={labelClass}>No. Telepon <span className="text-red-500">*</span></label>
                  <input type="tel" name="no_telp" value={form.no_telp} onChange={handleChange}
                    className={inputClass} required />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Alamat</label>
                  <textarea name="alamat" value={form.alamat} onChange={handleChange}
                    className={inputClass} rows="2"></textarea>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Asal Sekolah</label>
                  <input type="text" name="asal_sekolah" value={form.asal_sekolah} onChange={handleChange}
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Nama Ayah</label>
                  <input type="text" name="nama_ayah" value={form.nama_ayah} onChange={handleChange}
                    className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Nama Ibu</label>
                  <input type="text" name="nama_ibu" value={form.nama_ibu} onChange={handleChange}
                    className={inputClass} />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 flex gap-3">
                <Link to="/ppdbnew" className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all text-center">
                  Batal
                </Link>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-annajah-500 to-annajah-600 text-white rounded-xl text-sm font-medium hover:from-annajah-600 hover:to-annajah-700 transition-all disabled:opacity-50 shadow-lg"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
