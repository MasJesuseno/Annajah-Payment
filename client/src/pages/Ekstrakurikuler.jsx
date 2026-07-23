import { useState, useEffect } from 'react'
import { getEkstrakurikuler, createEkstrakurikuler, updateEkstrakurikuler, deleteEkstrakurikuler, getPesertaEkstrakurikuler, addPesertaEkstrakurikuler, removePesertaEkstrakurikuler, getSiswa } from '../api'
import { Plus, Edit2, Trash2, Clock, User, CalendarDays, Power, PowerOff, Medal, Phone, Users, X, Search, UserPlus, UserMinus, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const HARI_OPTIONS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

const defaultForm = { nama: '', pelatih: '', kontak_pelatih: '', hari: 'Senin', jam_mulai: '14:00', jam_selesai: '16:00', status: 'Aktif' }

export default function Ekstrakurikuler() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...defaultForm })
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [pesertaModal, setPesertaModal] = useState(null)
  const [pesertaList, setPesertaList] = useState([])
  const [loadingPeserta, setLoadingPeserta] = useState(false)
  const [siswaSearch, setSiswaSearch] = useState('')
  const [siswaOptions, setSiswaOptions] = useState([])
  const [loadingSiswa, setLoadingSiswa] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const res = await getEkstrakurikuler()
      setData(res.data)
    } catch (error) {
      toast.error('Gagal memuat data ekstrakurikuler')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ ...defaultForm })
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      nama: item.nama,
      pelatih: item.pelatih,
      kontak_pelatih: item.kontak_pelatih || '',
      hari: item.hari,
      jam_mulai: item.jam_mulai.slice(0, 5),
      jam_selesai: item.jam_selesai.slice(0, 5),
      status: item.status,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nama || !form.pelatih || !form.jam_mulai || !form.jam_selesai) {
      return toast.error('Semua field harus diisi')
    }
    if (form.jam_mulai >= form.jam_selesai) {
      return toast.error('Jam selesai harus setelah jam mulai')
    }
    try {
      if (editing) {
        await updateEkstrakurikuler(editing.id, form)
        toast.success('Ekstrakurikuler berhasil diupdate')
      } else {
        await createEkstrakurikuler(form)
        toast.success('Ekstrakurikuler berhasil ditambahkan')
      }
      setShowModal(false)
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan data')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteEkstrakurikuler(id)
      toast.success('Ekstrakurikuler berhasil dihapus')
      setDeleteConfirm(null)
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menghapus data')
    }
  }

  const openPeserta = async (item) => {
    setPesertaModal(item)
    setLoadingPeserta(true)
    setSiswaSearch('')
    setSiswaOptions([])
    try {
      const res = await getPesertaEkstrakurikuler(item.id)
      setPesertaList(res.data)
    } catch {
      setPesertaList([])
      toast.error('Gagal memuat data peserta')
    } finally {
      setLoadingPeserta(false)
    }
  }

  const searchSiswa = async (q) => {
    setSiswaSearch(q)
    if (q.length < 2) {
      setSiswaOptions([])
      return
    }
    setLoadingSiswa(true)
    try {
      const res = await getSiswa({ search: q, per_page: 20 })
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || [])
      // Filter out already added students
      const addedIds = new Set(pesertaList.map(p => p.id_siswa))
      setSiswaOptions(list.filter(s => !addedIds.has(s.id)))
    } catch {
      setSiswaOptions([])
    } finally {
      setLoadingSiswa(false)
    }
  }

  const addPeserta = async (siswa) => {
    try {
      await addPesertaEkstrakurikuler(pesertaModal.id, { id_siswa: siswa.id })
      setPesertaList(prev => [...prev, {
        peserta_id: Date.now(),
        id_ekstrakurikuler: pesertaModal.id,
        id_siswa: siswa.id,
        nis: siswa.nis,
        nama_siswa: siswa.nama,
        nama_kelas: siswa.nama_kelas
      }])
      setSiswaOptions(prev => prev.filter(s => s.id !== siswa.id))
      setSiswaSearch('')
      toast.success('Peserta berhasil ditambahkan')
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menambah peserta')
    }
  }

  const removePeserta = async (peserta) => {
    if (!confirm(`Hapus ${peserta.nama_siswa} dari ${pesertaModal.nama}?`)) return
    try {
      await removePesertaEkstrakurikuler(pesertaModal.id, peserta.peserta_id)
      setPesertaList(prev => prev.filter(p => p.peserta_id !== peserta.peserta_id))
      toast.success('Peserta berhasil dihapus')
      loadData()
    } catch (error) {
      toast.error('Gagal menghapus peserta')
    }
  }

  const groupByHari = (items) => {
    const groups = {}
    HARI_OPTIONS.forEach(h => { groups[h] = [] })
    items.forEach(item => {
      if (groups[item.hari]) groups[item.hari].push(item)
    })
    return groups
  }

  const grouped = groupByHari(data)

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-annajah-600"></div></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ekstrakurikuler</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola kegiatan ekstrakurikuler SMA Annajah</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Tambah Ekstrakurikuler
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-2xl font-bold text-gray-800">{data.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Ekstrakurikuler</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-emerald-600">{data.filter(d => d.status === 'Aktif').length}</p>
          <p className="text-xs text-gray-500 mt-1">Aktif</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-gray-400">{data.filter(d => d.status === 'Tidak').length}</p>
          <p className="text-xs text-gray-500 mt-1">Tidak Aktif</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl font-bold text-annajah-600">{new Set(data.map(d => d.pelatih)).size}</p>
          <p className="text-xs text-gray-500 mt-1">Jumlah Pelatih</p>
        </div>
      </div>

      {/* Cards by Day */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {HARI_OPTIONS.map(hari => {
          const items = grouped[hari]
          if (items.length === 0) return null
          return (
            <div key={hari} className="card">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-annajah-600" />
                {hari}
                <span className="badge badge-info ml-auto">{items.length} kegiatan</span>
              </h3>
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.id} className={`p-3 rounded-lg transition-colors group relative ${
                    item.status === 'Aktif' ? 'bg-gray-50 hover:bg-gray-100' : 'bg-gray-100/50 hover:bg-gray-200/50'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium truncate ${
                            item.status === 'Aktif' ? 'text-gray-800' : 'text-gray-400 line-through'
                          }`}>
                            {item.nama}
                          </span>
                          {item.status === 'Aktif' ? (
                            <span className="shrink-0 w-2 h-2 rounded-full bg-emerald-500" title="Aktif" />
                          ) : (
                            <span className="shrink-0 w-2 h-2 rounded-full bg-gray-300" title="Tidak Aktif" />
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                          <span className={`text-xs flex items-center gap-1 ${
                            item.status === 'Aktif' ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            <User className="w-3 h-3" />
                            {item.pelatih}
                          </span>
                          {item.kontak_pelatih && (
                            <span className={`text-xs flex items-center gap-1 ${
                              item.status === 'Aktif' ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                              <Phone className="w-3 h-3" />
                              {item.kontak_pelatih}
                            </span>
                          )}
                          <span className={`text-xs flex items-center gap-1 ${
                            item.status === 'Aktif' ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            <Clock className="w-3 h-3" />
                            {item.jam_mulai.slice(0, 5)} - {item.jam_selesai.slice(0, 5)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <button
                            onClick={() => openPeserta(item)}
                            className={`text-xs flex items-center gap-1 font-medium transition-colors ${
                              item.status === 'Aktif'
                                ? 'text-annajah-600 hover:text-annajah-700'
                                : 'text-gray-400'
                            }`}
                          >
                            <Users className="w-3 h-3" />
                            {item.jumlah_peserta ?? 0} peserta
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                        <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors">
                          <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                        <button onClick={() => setDeleteConfirm(item)} className="p-1.5 hover:bg-red-100 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        {data.length === 0 && (
          <div className="col-span-full text-center py-16">
            <Medal className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Belum ada data ekstrakurikuler</p>
            <p className="text-gray-400 text-xs mt-1">Klik tombol "Tambah Ekstrakurikuler" untuk menambahkan</p>
          </div>
        )}
      </div>

      {/* Modal Tambah/Edit */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">
                {editing ? 'Edit Ekstrakurikuler' : 'Tambah Ekstrakurikuler Baru'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nama Ekstrakurikuler */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Nama Ekstrakurikuler <span className="text-red-400">*</span></label>
                  <input type="text" className="input-field" value={form.nama}
                    onChange={e => setForm({ ...form, nama: e.target.value })}
                    placeholder="Contoh: Pramuka, Futsal, Marawis" />
                </div>

                {/* Pelatih */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Pelatih <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" className="input-field pl-10" value={form.pelatih}
                        onChange={e => setForm({ ...form, pelatih: e.target.value })}
                        placeholder="Nama pelatih/pembina" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Kontak Pelatih</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" className="input-field pl-10" value={form.kontak_pelatih}
                        onChange={e => setForm({ ...form, kontak_pelatih: e.target.value })}
                        placeholder="No. telepon/WA" />
                    </div>
                  </div>
                </div>

                {/* Hari */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Hari <span className="text-red-400">*</span></label>
                  <div className="grid grid-cols-3 gap-2">
                    {HARI_OPTIONS.map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setForm({ ...form, hari: h })}
                        className={`p-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                          form.hari === h
                            ? 'border-annajah-500 bg-annajah-50 text-annajah-700'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Jam Mulai & Jam Selesai */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Jam Mulai <span className="text-red-400">*</span></label>
                    <input type="time" className="input-field" value={form.jam_mulai}
                      onChange={e => setForm({ ...form, jam_mulai: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Jam Selesai <span className="text-red-400">*</span></label>
                    <input type="time" className="input-field" value={form.jam_selesai}
                      onChange={e => setForm({ ...form, jam_selesai: e.target.value })} />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, status: 'Aktif' })}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        form.status === 'Aktif'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <Power className="w-4 h-4" />
                      Aktif
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, status: 'Tidak' })}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        form.status === 'Tidak'
                          ? 'border-red-400 bg-red-50 text-red-600'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <PowerOff className="w-4 h-4" />
                      Tidak Aktif
                    </button>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="btn-primary flex-1">
                    {editing ? 'Simpan Perubahan' : 'Tambah'}
                  </button>
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Batal</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Peserta */}
      {pesertaModal && (
        <div className="modal-overlay" onClick={() => { setPesertaModal(null); loadData() }}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Users className="w-5 h-5 text-annajah-600" />
                    {pesertaModal.nama}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {pesertaList.length} peserta terdaftar
                  </p>
                </div>
                <button onClick={() => { setPesertaModal(null); loadData() }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Search & Add Siswa */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  className="input-field pl-10"
                  placeholder="Cari nama siswa... (min 2 karakter)"
                  value={siswaSearch}
                  onChange={e => searchSiswa(e.target.value)}
                />
              </div>

              {siswaSearch.length >= 2 && (
                <div className="mb-4 max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-1">
                  {loadingSiswa ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-annajah-600"></div>
                    </div>
                  ) : siswaOptions.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-4">
                      {siswaSearch.length < 2 ? '' : 'Tidak ada siswa ditemukan atau sudah terdaftar semua'}
                    </p>
                  ) : (
                    <div className="space-y-0.5">
                      {siswaOptions.map(s => (
                        <button
                          key={s.id}
                          onClick={() => addPeserta(s)}
                          className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-annajah-50 transition-colors text-left group"
                        >
                          <div className="w-8 h-8 rounded-full bg-annajah-100 flex items-center justify-center shrink-0">
                            <UserPlus className="w-4 h-4 text-annajah-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 truncate">{s.nama}</p>
                            <p className="text-xs text-gray-400">
                              {s.nis} {s.nama_kelas ? `\u2022 ${s.nama_kelas}` : ''}
                            </p>
                          </div>
                          <span className="text-xs text-annajah-600 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                            Tambah
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Daftar Peserta */}
              {loadingPeserta ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-annajah-600"></div>
                </div>
              ) : pesertaList.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Belum ada peserta</p>
                  <p className="text-xs text-gray-400 mt-1">Cari dan tambah siswa di atas</p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto space-y-1">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <span>Nama Siswa</span>
                    <span>NIS</span>
                    <span></span>
                  </div>
                  {pesertaList.map(p => (
                    <div key={p.peserta_id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group">
                      <span className="text-sm text-gray-700 truncate">{p.nama_siswa}</span>
                      <span className="text-xs text-gray-400 font-mono">{p.nis}</span>
                      <button
                        onClick={() => removePeserta(p)}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                        title="Hapus peserta"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                <button onClick={() => { setPesertaModal(null); loadData() }} className="btn-secondary text-sm">Tutup</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Hapus Ekstrakurikuler?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Yakin ingin menghapus <strong className="text-gray-700">{deleteConfirm.nama}</strong>?
                Tindakan ini tidak bisa dibatalkan.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Batal</button>
                <button onClick={() => handleDelete(deleteConfirm.id)} className="btn-danger flex-1 flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" /> Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
