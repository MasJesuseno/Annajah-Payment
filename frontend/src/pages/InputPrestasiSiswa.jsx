import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSiswa, createPrestasiSiswa, getPrestasiSiswaById, updatePrestasiSiswa, deleteFotoPrestasiSiswa } from '../api'
import { Trophy, Search, ChevronLeft, Upload, X, Camera, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const PRESTASI_OPTIONS = [
  'Juara 1', 'Juara 2', 'Juara 3', 'Harapan 1', 'Harapan 2',
  'Harapan 3', 'Medali Emas', 'Medali Perak', 'Medali Perunggu',
  'Finalis', 'Peserta Terbaik', 'Terbaik 1', 'Terbaik 2', 'Terbaik 3',
  'Best Performance', 'Favorit', 'Lainnya'
]

export default function InputPrestasiSiswa() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id')
  const isEdit = !!editId

  const [siswaList, setSiswaList] = useState([])
  const [search, setSearch] = useState('')
  const [selectedSiswa, setSelectedSiswa] = useState(null)
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    penyelenggara: '',
    nama_agenda: '',
    prestasi: '',
  })
  const [fotoFile, setFotoFile] = useState(null)
  const [fotoPreview, setFotoPreview] = useState(null)
  const [existingFoto, setExistingFoto] = useState(null)
  const [customPrestasi, setCustomPrestasi] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(isEdit)

  useEffect(() => {
    loadSiswa()
  }, [])

  const loadSiswa = async () => {
    try {
      const res = await getSiswa({ per_page: 9999 })
      const list = res.data.data || res.data || []
      setSiswaList(list)

      const idSiswaParam = searchParams.get('id_siswa')
      if (idSiswaParam && !editId) {
        const found = list.find(s => s.id === parseInt(idSiswaParam))
        if (found) {
          setSelectedSiswa({ id: found.id, nama: found.nama, nis: found.nis, nama_kelas: found.nama_kelas })
        }
      }

      if (editId) loadEditData()
    } catch {
      toast.error('Gagal memuat data siswa')
    }
  }

  const loadEditData = async () => {
    try {
      setLoadingEdit(true)
      const res = await getPrestasiSiswaById(editId)
      const d = res.data
      setForm({
        tanggal: d.tanggal ? d.tanggal.split('T')[0] : '',
        penyelenggara: d.penyelenggara || '',
        nama_agenda: d.nama_agenda || '',
        prestasi: d.prestasi || '',
      })
      setSelectedSiswa({ id: d.id_siswa, nama: d.nama_siswa })
      if (d.foto) {
        setExistingFoto(d.foto)
      }
    } catch {
      toast.error('Gagal memuat data prestasi')
    } finally {
      setLoadingEdit(false)
    }
  }

  const filteredSiswa = search
    ? siswaList.filter(s =>
        s.nama?.toLowerCase().includes(search.toLowerCase()) ||
        s.nis?.includes(search)
      )
    : []

  const handleSelectSiswa = (siswa) => {
    setSelectedSiswa(siswa)
    setSearch('')
  }

  const handleFotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format foto tidak didukung. Gunakan JPG, PNG, GIF, atau WebP')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 2MB')
      return
    }

    setFotoFile(file)
    setFotoPreview(URL.createObjectURL(file))
    setExistingFoto(null)
  }

  const handleRemoveFoto = () => {
    setFotoFile(null)
    setFotoPreview(null)
    setExistingFoto(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedSiswa) {
      toast.error('Pilih siswa terlebih dahulu')
      return
    }
    if (!form.tanggal || !form.penyelenggara || !form.nama_agenda || !form.prestasi) {
      toast.error('Semua field harus diisi')
      return
    }

    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('tanggal', form.tanggal)
      formData.append('id_siswa', selectedSiswa.id)
      formData.append('penyelenggara', form.penyelenggara)
      formData.append('nama_agenda', form.nama_agenda)
      formData.append('prestasi', form.prestasi)
      if (fotoFile) {
        formData.append('foto', fotoFile)
      }

      if (isEdit) {
        await updatePrestasiSiswa(editId, formData)
        toast.success('Data prestasi berhasil diupdate')
      } else {
        await createPrestasiSiswa(formData)
        toast.success('Data prestasi berhasil ditambahkan')
      }
      navigate('/prestasi-siswa')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan data prestasi')
    } finally {
      setLoading(false)
    }
  }

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (fotoPreview) URL.revokeObjectURL(fotoPreview)
    }
  }, [fotoPreview])

  if (loadingEdit) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-annajah-600"></div></div>
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/prestasi-siswa')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{isEdit ? 'Edit' : 'Input'} Prestasi Siswa</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isEdit ? 'Ubah data prestasi siswa' : 'Catat prestasi yang diraih siswa'}
          </p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pilih Siswa */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Siswa <span className="text-red-400">*</span></label>
            {selectedSiswa ? (
              <div className="flex items-center justify-between p-3 bg-annajah-50 border border-annajah-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-annajah-200 flex items-center justify-center text-annajah-700 font-bold text-sm">
                    {selectedSiswa.nama?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{selectedSiswa.nama}</p>
                    {selectedSiswa.nis && (
                      <p className="text-xs text-gray-400 font-mono">{selectedSiswa.nis} {selectedSiswa.nama_kelas ? `• ${selectedSiswa.nama_kelas}` : ''}</p>
                    )}
                  </div>
                </div>
                {!isEdit && (
                  <button type="button" onClick={() => setSelectedSiswa(null)}
                    className="text-sm text-gray-400 hover:text-red-500 transition-colors">
                    Ganti
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" className="input-field pl-10" placeholder="Cari nama atau NIS siswa..."
                  value={search} onChange={e => setSearch(e.target.value)} />
                {search && filteredSiswa.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {filteredSiswa.map(s => (
                      <button key={s.id} type="button" onClick={() => handleSelectSiswa(s)}
                        className="w-full text-left px-4 py-2.5 hover:bg-annajah-50 transition-colors text-sm flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold shrink-0">
                          {s.nama?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">{s.nama}</p>
                          <p className="text-xs text-gray-400 font-mono">{s.nis} {s.nama_kelas ? `- ${s.nama_kelas}` : ''}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tanggal */}
          <div className="sm:w-64">
            <label className="block text-sm font-medium text-gray-600 mb-1">Tanggal <span className="text-red-400">*</span></label>
            <input type="date" className="input-field" value={form.tanggal}
              onChange={e => setForm({ ...form, tanggal: e.target.value })} required />
          </div>

          {/* Penyelenggara */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Penyelenggara <span className="text-red-400">*</span></label>
            <input type="text" className="input-field" value={form.penyelenggara}
              onChange={e => setForm({ ...form, penyelenggara: e.target.value })}
              placeholder="Nama penyelenggara kegiatan (contoh: Kementerian Pendidikan, Dinas Kota, dll)" required />
          </div>

          {/* Nama Agenda */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Nama Agenda <span className="text-red-400">*</span></label>
            <input type="text" className="input-field" value={form.nama_agenda}
              onChange={e => setForm({ ...form, nama_agenda: e.target.value })}
              placeholder="Nama kegiatan/lomba (contoh: Olimpiade Sains Nasional)" required />
          </div>

          {/* Prestasi */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Prestasi <span className="text-red-400">*</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
              {PRESTASI_OPTIONS.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    if (opt !== 'Lainnya') setCustomPrestasi('')
                    setForm({ ...form, prestasi: opt })
                  }}
                  className={`p-2 rounded-xl border-2 text-sm font-medium transition-all ${
                    form.prestasi === opt
                      ? 'border-annajah-500 bg-annajah-50 text-annajah-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {form.prestasi === 'Lainnya' && (
              <input type="text" className="input-field mt-2" value={customPrestasi}
                onChange={e => { setCustomPrestasi(e.target.value); setForm({ ...form, prestasi: e.target.value }) }}
                placeholder="Tulis prestasi lainnya..." />
            )}
          </div>

          {/* Upload Foto */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Upload Foto</label>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-annajah-400 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('foto-prestasi-input')?.click()}>
                  <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Klik untuk upload foto prestasi</p>
                  <p className="text-xs text-gray-400 mt-1">Max 2MB. Format: JPG, PNG, GIF, WebP</p>
                </div>
                <input id="foto-prestasi-input" type="file" accept=".jpg,.jpeg,.png,.gif,.webp"
                  className="hidden" onChange={handleFotoChange} />
              </div>

              {/* Preview Foto */}
              {(fotoPreview || existingFoto) && (
                <div className="relative w-40 h-40 rounded-xl overflow-hidden border border-gray-200 shrink-0 group">
                  <img
                    src={fotoPreview || `/uploads/prestasi/${existingFoto}`}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button type="button" onClick={handleRemoveFoto}
                      className="p-2 bg-white/90 rounded-full text-red-500 hover:bg-white transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tombol */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button type="submit" disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Menyimpan...</>
              ) : (
                <>{isEdit ? 'Simpan Perubahan' : 'Simpan Prestasi'}</>
              )}
            </button>
            <button type="button" onClick={() => navigate('/prestasi-siswa')}
              className="btn-secondary flex-1">Batal</button>
          </div>
        </form>
      </div>
    </div>
  )
}
