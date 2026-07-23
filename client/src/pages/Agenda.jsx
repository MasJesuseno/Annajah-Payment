import { useState, useEffect } from 'react'
import { getAgendaTv, createAgendaTv, updateAgendaTv, deleteAgendaTv } from '../api'
import { CalendarDays, Plus, Edit2, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Agenda() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ tanggal: '', agenda: '' })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await getAgendaTv()
      setData(res.data)
    } catch {
      toast.error('Gagal memuat data agenda')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditItem(null)
    setForm({ tanggal: new Date().toISOString().split('T')[0], agenda: '' })
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({ tanggal: item.tanggal?.split('T')[0] || item.tanggal, agenda: item.agenda })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.tanggal || !form.agenda) {
      toast.error('Tanggal dan agenda harus diisi')
      return
    }
    try {
      setSaving(true)
      if (editItem) {
        await updateAgendaTv(editItem.id, form)
        toast.success('Agenda berhasil diupdate')
      } else {
        await createAgendaTv(form)
        toast.success('Agenda berhasil ditambahkan')
      }
      setShowModal(false)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan agenda')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus agenda ini?')) return
    try {
      await deleteAgendaTv(id)
      toast.success('Agenda berhasil dihapus')
      loadData()
    } catch {
      toast.error('Gagal menghapus agenda')
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Daftar Agenda</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola agenda untuk ditampilkan di TV</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Tambah Agenda
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{data.length}</p>
              <p className="text-xs text-gray-500">Total Agenda</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {data.filter(d => {
                  const today = new Date(); today.setHours(0,0,0,0)
                  const tgl = new Date(d.tanggal + 'T00:00:00')
                  return tgl >= today
                }).length}
              </p>
              <p className="text-xs text-gray-500">Akan Datang</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {data.filter(d => {
                  const today = new Date(); today.setHours(0,0,0,0)
                  const tgl = new Date(d.tanggal + 'T00:00:00')
                  return tgl < today
                }).length}
              </p>
              <p className="text-xs text-gray-500">Terlewat</p>
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
                <th className="table-header">Tanggal</th>
                <th className="table-header">Agenda</th>
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
                  <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  Belum ada agenda
                </td></tr>
              ) : data.map((item, idx) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell text-center text-sm text-gray-500">{idx + 1}</td>
                  <td className="table-cell">
                    <span className="text-sm font-medium">{formatDate(item.tanggal)}</span>
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-700">{item.agenda}</span>
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
                    {editItem ? 'Edit Agenda' : 'Tambah Agenda Baru'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {editItem ? 'Ubah data agenda' : 'Masukkan agenda baru untuk ditampilkan di TV'}
                  </p>
                </div>
                <button onClick={() => setShowModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal <span className="text-red-500">*</span></label>
                  <input type="date" className="input-field"
                    value={form.tanggal}
                    onChange={e => setForm({ ...form, tanggal: e.target.value })}
                    autoFocus />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agenda <span className="text-red-500">*</span></label>
                  <textarea className="input-field min-h-[100px]"
                    value={form.agenda}
                    onChange={e => setForm({ ...form, agenda: e.target.value })}
                    placeholder="Masukkan deskripsi agenda..." />
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
