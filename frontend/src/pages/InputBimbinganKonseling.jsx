import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSiswa, createBimbinganKonseling, getBimbinganKonselingById, updateBimbinganKonseling } from '../api'
import { HeartHandshake, Search, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function InputBimbinganKonseling() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id')
  const isEdit = !!editId

  const [siswaList, setSiswaList] = useState([])
  const [search, setSearch] = useState('')
  const [selectedSiswa, setSelectedSiswa] = useState(null)
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    kasus: '',
    tindakan: '',
  })
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

      // Auto-select siswa from query param (from DetailSiswa link)
      const idSiswaParam = searchParams.get('id_siswa')
      if (idSiswaParam && !editId) {
        const found = list.find(s => s.id === parseInt(idSiswaParam))
        if (found) {
          setSelectedSiswa({ id: found.id, nama: found.nama })
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
      const res = await getBimbinganKonselingById(editId)
      const d = res.data
      setForm({ tanggal: d.tanggal ? d.tanggal.split('T')[0] : '', kasus: d.kasus || '', tindakan: d.tindakan || '' })
      setSelectedSiswa({ id: d.id_siswa, nama: d.nama_siswa })
    } catch {
      toast.error('Gagal memuat data BK')
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedSiswa) {
      toast.error('Pilih siswa terlebih dahulu')
      return
    }
    if (!form.tanggal || !form.kasus || !form.tindakan) {
      toast.error('Semua field harus diisi')
      return
    }

    try {
      setLoading(true)
      const data = {
        id_siswa: selectedSiswa.id,
        tanggal: form.tanggal,
        kasus: form.kasus,
        tindakan: form.tindakan,
      }

      if (isEdit) {
        await updateBimbinganKonseling(editId, data)
        toast.success('Data BK berhasil diupdate')
      } else {
        await createBimbinganKonseling(data)
        toast.success('Data BK berhasil ditambahkan')
      }
      navigate('/bimbingan-konseling')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan data BK')
    } finally {
      setLoading(false)
    }
  }

  if (loadingEdit) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-annajah-600"></div></div>
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/bimbingan-konseling')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{isEdit ? 'Edit' : 'Input'} Bimbingan Konseling</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isEdit ? 'Ubah data bimbingan konseling' : 'Catat bimbingan konseling untuk siswa'}
          </p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Pilih Siswa */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Siswa *</label>
            {selectedSiswa ? (
              <div className="flex items-center justify-between p-3 bg-annajah-50 border border-annajah-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-annajah-200 flex items-center justify-center text-annajah-700 font-bold text-sm">
                    {selectedSiswa.nama?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{selectedSiswa.nama}</p>
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
            <label className="block text-sm font-medium text-gray-600 mb-1">Tanggal *</label>
            <input type="date" className="input-field" value={form.tanggal}
              onChange={e => setForm({ ...form, tanggal: e.target.value })} required />
          </div>

          {/* Kasus */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Kasus *</label>
            <textarea className="input-field" rows="3" value={form.kasus}
              onChange={e => setForm({ ...form, kasus: e.target.value })}
              placeholder="Deskripsikan kasus/masalah yang dihadapi siswa..."
              required />
          </div>

          {/* Tindakan */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Tindakan *</label>
            <textarea className="input-field" rows="3" value={form.tindakan}
              onChange={e => setForm({ ...form, tindakan: e.target.value })}
              placeholder="Tindakan yang telah dilakukan..."
              required />
          </div>

          {/* Tombol */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button type="submit" disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Menyimpan...</>
              ) : (
                <>{isEdit ? 'Simpan Perubahan' : 'Simpan Data BK'}</>
              )}
            </button>
            <button type="button" onClick={() => navigate('/bimbingan-konseling')}
              className="btn-secondary flex-1">Batal</button>
          </div>
        </form>
      </div>
    </div>
  )
}
