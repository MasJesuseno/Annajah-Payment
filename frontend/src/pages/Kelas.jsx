import { useState, useEffect } from 'react'
import { getKelas, createKelas, updateKelas, deleteKelas, getGuru, getSiswa } from '../api'
import { Plus, Edit2, Trash2, GraduationCap, Users, User, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Kelas() {
  const [kelas, setKelas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ nama_kelas: '', tingkat: '10', id_wali: '' })
  const [guruList, setGuruList] = useState([])
  const [siswaModal, setSiswaModal] = useState(false)
  const [siswaList, setSiswaList] = useState([])
  const [selectedKelas, setSelectedKelas] = useState(null)
  const [loadingSiswa, setLoadingSiswa] = useState(false)

  useEffect(() => { loadKelas(); loadGuru() }, [])

  const loadKelas = async () => {
    try {
      const res = await getKelas()
      setKelas(res.data)
    } catch (error) {
      toast.error('Gagal memuat data kelas')
    } finally {
      setLoading(false)
    }
  }

  const loadGuru = async () => {
    try {
      const res = await getGuru()
      setGuruList(res.data)
    } catch {
      // Abaikan error
    }
  }

  const loadSiswaKelas = async (kelasItem) => {
    setSelectedKelas(kelasItem)
    setSiswaModal(true)
    setLoadingSiswa(true)
    try {
      const res = await getSiswa({ kelas: kelasItem.id, per_page: 100 })
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || [])
      setSiswaList(list)
    } catch {
      setSiswaList([])
      toast.error('Gagal memuat daftar siswa')
    } finally {
      setLoadingSiswa(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nama_kelas) {
      toast.error('Nama kelas harus diisi')
      return
    }
    try {
      const payload = {
        nama_kelas: form.nama_kelas,
        tingkat: form.tingkat,
        id_wali: form.id_wali || null,
      }
      if (editing) {
        await updateKelas(editing.id, payload)
        toast.success('Kelas berhasil diupdate')
      } else {
        await createKelas(payload)
        toast.success('Kelas berhasil ditambahkan')
      }
      setShowModal(false)
      setEditing(null)
      setForm({ nama_kelas: '', tingkat: '10', id_wali: '' })
      loadKelas()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Terjadi kesalahan')
    }
  }

  const handleEdit = (item) => {
    setEditing(item)
    setForm({ nama_kelas: item.nama_kelas, tingkat: item.tingkat, id_wali: item.id_wali || '' })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus kelas ini?')) return
    try {
      await deleteKelas(id)
      toast.success('Kelas berhasil dihapus')
      loadKelas()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menghapus kelas')
    }
  }

  const groupByTingkat = (items) => {
    const groups = { '10': [], '11': [], '12': [] }
    items.forEach((item) => {
      if (groups[item.tingkat]) groups[item.tingkat].push(item)
    })
    return groups
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-annajah-600"></div></div>

  const grouped = groupByTingkat(kelas)
  const tingkatLabel = { '10': 'Kelas X', '11': 'Kelas XI', '12': 'Kelas XII' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Data Kelas</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola kelas dan wali kelas SMA Annajah</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ nama_kelas: '', tingkat: '10', id_wali: '' }); setShowModal(true) }}
          className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Tambah Kelas
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(grouped).map(([tingkat, items]) => (
          <div key={tingkat} className="card">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-annajah-600" />
              {tingkatLabel[tingkat]}
              <span className="badge badge-info ml-2">{items.length} kelas</span>
            </h3>
            <div className="space-y-2">
              {items.map((item) => {
                const totalWaliUntukGuru = item.id_wali
                  ? kelas.filter(k => k.id_wali === item.id_wali).length
                  : 0
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-700">{item.nama_kelas}</span>
                      {item.wali_kelas && (
                        <p className="text-[11px] text-annajah-600 mt-0.5 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          WK: {item.wali_kelas}
                          {totalWaliUntukGuru > 1 && (
                            <span className="ml-1 text-[10px] bg-annajah-100 text-annajah-700 px-1.5 py-0.5 rounded-full font-medium">
                              {totalWaliUntukGuru} kelas
                            </span>
                          )}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        <Users className="w-3 h-3 text-gray-400" />
                        <button
                          onClick={() => loadSiswaKelas(item)}
                          className="text-xs text-annajah-600 hover:text-annajah-700 font-medium transition-colors"
                        >
                          {item.jumlah_siswa ?? 0} siswa
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                      <button onClick={() => handleEdit(item)} className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors">
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-100 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">
                {editing ? 'Edit Kelas' : 'Tambah Kelas Baru'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Nama Kelas</label>
                  <input type="text" className="input-field" value={form.nama_kelas}
                    onChange={e => setForm({ ...form, nama_kelas: e.target.value })}
                    placeholder="Contoh: X-A, XI-B, XII-C" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Tingkat</label>
                  <select className="input-field" value={form.tingkat}
                    onChange={e => setForm({ ...form, tingkat: e.target.value })}>
                    <option value="10">Kelas X</option>
                    <option value="11">Kelas XI</option>
                    <option value="12">Kelas XII</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                      Wali Kelas
                    </span>
                  </label>
                  <p className="text-xs text-gray-400 mb-2">Pilih guru yang menjadi wali kelas ini (opsional).</p>
                  {guruList.length === 0 ? (
                    <p className="text-xs text-amber-500">Belum ada data guru. Tambah guru terlebih dahulu.</p>
                  ) : (
                    <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-1">
                      <label
                        className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors
                          ${!form.id_wali ? 'bg-annajah-50 border border-annajah-200' : 'hover:bg-gray-50 border border-transparent'}`}
                      >
                        <input
                          type="radio"
                          name="wali_kelas"
                          className="w-4 h-4 text-annajah-600 border-gray-300 focus:ring-annajah-500"
                          checked={!form.id_wali}
                          onChange={() => setForm({ ...form, id_wali: '' })}
                        />
                        <span className="text-sm text-gray-500">— Tidak ada (kosongkan wali) —</span>
                        {!form.id_wali && <CheckCircle className="w-3.5 h-3.5 text-annajah-600 ml-auto" />}
                      </label>
                      {guruList.map(g => {
                        const selected = form.id_wali === g.id
                        const totalWali = kelas.filter(k => k.id_wali === g.id).length
                        return (
                          <label
                            key={g.id}
                            className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors
                              ${selected ? 'bg-annajah-50 border border-annajah-200' : 'hover:bg-gray-50 border border-transparent'}`}
                          >
                            <input
                              type="radio"
                              name="wali_kelas"
                              className="w-4 h-4 text-annajah-600 border-gray-300 focus:ring-annajah-500"
                              checked={selected}
                              onChange={() => setForm({ ...form, id_wali: g.id })}
                            />
                            <div className="flex items-center justify-between flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-annajah-100 flex items-center justify-center shrink-0">
                                  {g.foto ? (
                                    <img src={`/uploads/guru/${g.foto}`} alt="" className="w-full h-full rounded-full object-cover"
                                      onError={(e) => {
                                        const span = document.createElement('span')
                                        span.className = 'text-xs font-bold text-annajah-600'
                                        span.textContent = g.nama.charAt(0).toUpperCase()
                                        e.target.style.display = 'none'
                                        e.target.parentElement.appendChild(span)
                                      }} />
                                  ) : (
                                    <span className="text-xs font-bold text-annajah-600">{g.nama.charAt(0).toUpperCase()}</span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <span className="text-sm font-medium text-gray-700 truncate block">{g.nama}</span>
                                  <div className="flex items-center gap-2">
                                    {g.nik && <span className="text-[10px] text-gray-400">NIK: {g.nik}</span>}
                                    {totalWali > 0 && (
                                      <span className="text-[10px] bg-annajah-100 text-annajah-700 px-1.5 py-0.5 rounded-full font-medium">
                                        {totalWali} kelas
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {selected && <CheckCircle className="w-3.5 h-3.5 text-annajah-600 ml-2 shrink-0" />}
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="btn-primary flex-1">
                    {editing ? 'Simpan' : 'Tambah'}
                  </button>
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Batal</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Daftar Siswa */}
      {siswaModal && (
        <div className="modal-overlay" onClick={() => setSiswaModal(false)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    <span className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-annajah-600" />
                      {selectedKelas?.nama_kelas}
                    </span>
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Daftar siswa — {selectedKelas?.jumlah_siswa ?? 0} siswa
                  </p>
                </div>
                <button onClick={() => setSiswaModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {loadingSiswa ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-annajah-600"></div>
                </div>
              ) : siswaList.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Belum ada siswa di kelas ini</p>
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-1">
                  <div className="grid grid-cols-[auto_1fr_auto] gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <span>No</span>
                    <span>Nama Siswa</span>
                    <span>NIS</span>
                  </div>
                  {siswaList.map((s, idx) => (
                    <div key={s.id} className="grid grid-cols-[auto_1fr_auto] gap-2 items-center px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <span className="text-xs text-gray-400 w-6 text-right">{idx + 1}.</span>
                      <span className="text-sm text-gray-700 truncate">{s.nama}</span>
                      <span className="text-xs text-gray-400 font-mono">{s.nis}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                <button onClick={() => setSiswaModal(false)} className="btn-secondary text-sm">Tutup</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
