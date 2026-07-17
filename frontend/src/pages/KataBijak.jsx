import { useState, useEffect } from 'react'
import { getKataBijakTv, createKataBijakTv, updateKataBijakTv, deleteKataBijakTv } from '../api'
import { Quote, Plus, Edit2, Trash2, X, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function KataBijak() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ kata_bijak: '', tampil: 'Ya' })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await getKataBijakTv()
      setData(res.data)
    } catch {
      toast.error('Gagal memuat data kata bijak')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditItem(null)
    setForm({ kata_bijak: '', tampil: 'Ya' })
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({ kata_bijak: item.kata_bijak, tampil: item.tampil })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.kata_bijak) {
      toast.error('Kata bijak harus diisi')
      return
    }
    try {
      setSaving(true)
      if (editItem) {
        await updateKataBijakTv(editItem.id, form)
        toast.success('Kata bijak berhasil diupdate')
      } else {
        await createKataBijakTv(form)
        toast.success('Kata bijak berhasil ditambahkan')
      }
      setShowModal(false)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan kata bijak')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus kata bijak ini?')) return
    try {
      await deleteKataBijakTv(id)
      toast.success('Kata bijak berhasil dihapus')
      loadData()
    } catch {
      toast.error('Gagal menghapus kata bijak')
    }
  }

  const toggleTampil = async (item) => {
    try {
      const newTampil = item.tampil === 'Ya' ? 'Tidak' : 'Ya'
      await updateKataBijakTv(item.id, { ...item, tampil: newTampil })
      toast.success(`Kata bijak ${newTampil === 'Ya' ? 'ditampilkan' : 'disembunyikan'}`)
      loadData()
    } catch {
      toast.error('Gagal mengubah status tampil')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kata Bijak</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola kata bijak untuk ditampilkan di TV</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Tambah Kata Bijak
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Quote className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{data.length}</p>
              <p className="text-xs text-gray-500">Total Kata Bijak</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Eye className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{data.filter(d => d.tampil === 'Ya').length}</p>
              <p className="text-xs text-gray-500">Ditampilkan</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <EyeOff className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{data.filter(d => d.tampil === 'Tidak').length}</p>
              <p className="text-xs text-gray-500">Disembunyikan</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">No</th>
                <th className="table-header">Kata Bijak</th>
                <th className="table-header text-center w-28">Tampil</th>
                <th className="table-header text-right w-24">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-annajah-600 mx-auto"></div>
                </td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-12 text-gray-400">
                  <Quote className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  Belum ada kata bijak
                </td></tr>
              ) : data.map((item, idx) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell text-center text-sm text-gray-500">{idx + 1}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <Quote className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="text-sm text-gray-700 italic">"{item.kata_bijak}"</span>
                    </div>
                  </td>
                  <td className="table-cell text-center">
                    <button
                      onClick={() => toggleTampil(item)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                        item.tampil === 'Ya'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      {item.tampil === 'Ya' ? (
                        <><Eye className="w-3 h-3" /> Ya</>
                      ) : (
                        <><EyeOff className="w-3 h-3" /> Tidak</>
                      )}
                    </button>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(item)}
                        className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors" title="Edit">
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      </button>
                      <button onClick={() => handleDelete(item.id)}
                        className="p-1.5 hover:bg-red-100 rounded-lg transition-colors" title="Hapus">
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">
                    {editItem ? 'Edit Kata Bijak' : 'Tambah Kata Bijak Baru'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {editItem ? 'Ubah kata bijak' : 'Masukkan kata bijak baru untuk ditampilkan di TV'}
                  </p>
                </div>
                <button onClick={() => setShowModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kata Bijak <span className="text-red-500">*</span></label>
                  <textarea className="input-field min-h-[120px]"
                    value={form.kata_bijak}
                    onChange={e => setForm({ ...form, kata_bijak: e.target.value })}
                    placeholder="Masukkan kata bijak/mutiara..." autoFocus />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tampilkan di TV</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="tampil" value="Ya"
                        checked={form.tampil === 'Ya'}
                        onChange={e => setForm({ ...form, tampil: e.target.value })}
                        className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm text-gray-700">Ya</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="tampil" value="Tidak"
                        checked={form.tampil === 'Tidak'}
                        onChange={e => setForm({ ...form, tampil: e.target.value })}
                        className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-gray-700">Tidak</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="btn-secondary">Batal</button>
                  <button type="submit" disabled={saving}
                    className="btn-primary flex items-center gap-2 min-w-[120px] justify-center">
                    {saving ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Menyimpan...</>
                    ) : (
                      <><Plus className="w-4 h-4" /> {editItem ? 'Update' : 'Simpan'}</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
