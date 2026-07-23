import { useState, useEffect } from 'react'
import { createNilaiSiswa, updateNilaiSiswa, getNilaiSiswaById, getMataPelajaran, getPeriodePenilaian, getSiswa, getGuru, getTahunAjaran } from '../api'
import { Save, ArrowLeft } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function InputNilaiSiswa() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id')

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mataPelajaranList, setMataPelajaranList] = useState([])
  const [periodeList, setPeriodeList] = useState([])
  const [siswaList, setSiswaList] = useState([])
  const [guruList, setGuruList] = useState([])
  const [tahunAjaranList, setTahunAjaranList] = useState([])

  const [form, setForm] = useState({
    tahun_pelajaran: '',
    id_siswa: '',
    id_mata_pelajaran: '',
    id_periode_penilaian: '',
    id_guru: '',
    nilai: '',
    kkm: '75',
    keterangan: '',
  })

  useEffect(() => {
    Promise.all([loadReferensi(), loadEditData()])
  }, [])

  const loadReferensi = async () => {
    try {
      const [resMapel, resPeriode, resSiswa, resGuru, resTA] = await Promise.all([
        getMataPelajaran({}),
        getPeriodePenilaian(),
        getSiswa({ per_page: 9999 }),
        getGuru(),
        getTahunAjaran(),
      ])
      setMataPelajaranList(resMapel.data || [])
      setPeriodeList(resPeriode.data || [])
      setSiswaList(resSiswa.data?.data || resSiswa.data || [])
      setGuruList(resGuru.data || [])
      setTahunAjaranList(resTA.data || [])
    } catch { /* ignore */ }
  }

  const loadEditData = async () => {
    if (!editId) return
    try {
      setLoading(true)
      const res = await getNilaiSiswaById(editId)
      const item = res.data
      setForm({
        tahun_pelajaran: item.tahun_pelajaran || '',
        id_siswa: String(item.id_siswa),
        id_mata_pelajaran: String(item.id_mata_pelajaran),
        id_periode_penilaian: String(item.id_periode_penilaian),
        id_guru: item.id_guru ? String(item.id_guru) : '',
        nilai: String(item.nilai),
        kkm: String(item.kkm || 75),
        keterangan: item.keterangan || '',
      })
    } catch {
      toast.error('Gagal memuat data nilai')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.tahun_pelajaran || !form.id_siswa || !form.id_mata_pelajaran || !form.id_periode_penilaian || form.nilai === '') {
      toast.error('Lengkapi semua field yang wajib diisi')
      return
    }
    try {
      setSaving(true)
      const payload = {
        ...form,
        id_siswa: parseInt(form.id_siswa),
        id_mata_pelajaran: parseInt(form.id_mata_pelajaran),
        id_periode_penilaian: parseInt(form.id_periode_penilaian),
        id_guru: form.id_guru ? parseInt(form.id_guru) : null,
        kkm: parseInt(form.kkm) || 75,
        nilai: parseFloat(form.nilai),
      }
      if (editId) {
        await updateNilaiSiswa(editId, payload)
        toast.success('Nilai berhasil diupdate')
      } else {
        await createNilaiSiswa(payload)
        toast.success('Nilai berhasil ditambahkan')
      }
      navigate('/nilai-siswa')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan nilai')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/nilai-siswa')}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {editId ? 'Edit Nilai Siswa' : 'Input Nilai Siswa'}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {editId ? 'Ubah data nilai akademik siswa' : 'Masukkan nilai akademik siswa baru'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="card">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tahun Pelajaran <span className="text-red-500">*</span>
              </label>
              <select className="input-field"
                value={form.tahun_pelajaran}
                onChange={handleChange('tahun_pelajaran')}
                autoFocus>
                <option value="">Pilih Tahun Ajaran</option>
                {tahunAjaranList.map(ta => (
                  <option key={ta.id} value={ta.tahun_ajaran}>{ta.tahun_ajaran} {ta.status === 'aktif' ? '(Aktif)' : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Siswa <span className="text-red-500">*</span>
              </label>
              <select className="input-field" value={form.id_siswa}
                onChange={handleChange('id_siswa')}>
                <option value="">Pilih Siswa</option>
                {siswaList.map(s => (
                  <option key={s.id} value={s.id}>{s.nama} ({s.nis})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mata Pelajaran <span className="text-red-500">*</span>
              </label>
              <select className="input-field" value={form.id_mata_pelajaran}
                onChange={handleChange('id_mata_pelajaran')}>
                <option value="">Pilih Mata Pelajaran</option>
                {mataPelajaranList.map(m => (
                  <option key={m.id} value={m.id}>{m.nama_pelajaran}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Guru
              </label>
              <select className="input-field" value={form.id_guru}
                onChange={handleChange('id_guru')}>
                <option value="">Pilih Guru (opsional)</option>
                {guruList.map(g => (
                  <option key={g.id} value={g.id}>{g.nama}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Periode Penilaian <span className="text-red-500">*</span>
              </label>
              <select className="input-field" value={form.id_periode_penilaian}
                onChange={handleChange('id_periode_penilaian')}>
                <option value="">Pilih Periode</option>
                {periodeList.map(p => (
                  <option key={p.id} value={p.id}>{p.periode}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nilai <span className="text-red-500">*</span>
              </label>
              <input type="number" className="input-field" step="0.01" min="0" max="100"
                placeholder="0 - 100"
                value={form.nilai}
                onChange={handleChange('nilai')} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                KKM
              </label>
              <input type="number" className="input-field" min="0" max="100"
                placeholder="75"
                value={form.kkm}
                onChange={handleChange('kkm')} />
              <p className="text-xs text-gray-400 mt-1">Kriteria Ketuntasan Minimal (default: 75)</p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Keterangan
              </label>
              <textarea className="input-field" rows="3"
                placeholder="Catatan tambahan (opsional)"
                value={form.keterangan}
                onChange={handleChange('keterangan')} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => navigate('/nilai-siswa')}
              className="btn-secondary">Batal</button>
            <button type="submit" disabled={saving}
              className="btn-primary flex items-center gap-2 min-w-[140px] justify-center">
              {saving ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Menyimpan...</>
              ) : (
                <><Save className="w-4 h-4" /> {editId ? 'Update' : 'Simpan'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
