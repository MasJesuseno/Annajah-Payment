import { useState, useEffect } from 'react'
import { getTahunAjaran, createTahunAjaran, updateTahunAjaran, deleteTahunAjaran } from '../api'
import { Calendar, Plus, Edit2, Trash2, CheckCircle, X, AlertCircle, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TahunAjaran() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ tahun_ajaran: '', status: 'tidak_aktif' })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await getTahunAjaran()
      setData(res.data)
    } catch {
      toast.error('Gagal memuat data tahun ajaran')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditItem(null)
    setForm({ tahun_ajaran: '', status: 'tidak_aktif' })
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({ tahun_ajaran: item.tahun_ajaran, status: item.status })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.tahun_ajaran) {
      toast.error('Tahun ajaran harus diisi')
      return
    }
    try {
      setSaving(true)
      if (editItem) {
        await updateTahunAjaran(editItem.id, form)
        toast.success('Tahun ajaran berhasil diupdate')
      } else {
        await createTahunAjaran(form)
        toast.success('Tahun ajaran berhasil ditambahkan')
      }
      setShowModal(false)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    if (!confirm(`Yakin ingin menghapus tahun ajaran ${item.tahun_ajaran}?`)) return
    try {
      await deleteTahunAjaran(item.id)
      toast.success('Tahun ajaran berhasil dihapus')
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus')
    }
  }

  const handleSetAktif = async (item) => {
    if (item.status === 'aktif') return
    if (!confirm(`Aktifkan tahun ajaran ${item.tahun_ajaran}?`)) return
    try {
      await updateTahunAjaran(item.id, { ...item, status: 'aktif' })
      toast.success(`Tahun ajaran ${item.tahun_ajaran} diaktifkan`)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengaktifkan')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-annajah-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Master Tahun Pelajaran</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola daftar tahun ajaran akademik</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Tambah Tahun Ajaran
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{data.length}</p>
              <p className="text-xs text-gray-500">Total Tahun Ajaran</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {data.filter(d => d.status === 'aktif').length}
              </p>
              <p className="text-xs text-gray-500">Aktif</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {data.filter(d => d.status !== 'aktif').length}
              </p>
              <p className="text-xs text-gray-500">Tidak Aktif</p>
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
                <th className="table-header">Tahun Ajaran</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-12 text-gray-400">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  Belum ada data tahun ajaran
                </td></tr>
              ) : data.map((item, idx) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell text-center text-sm text-gray-500">{idx + 1}</td>
                  <td className="table-cell">
                    <span className="text-sm font-medium">{item.tahun_ajaran}</span>
                  </td>
                  <td className="table-cell">
                    {item.status === 'aktif' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle className="w-3 h-3" /> Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                        Tidak Aktif
                      </span>
                    )}
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex justify-end gap-1">
                      {item.status !== 'aktif' && (
                        <button onClick={() => handleSetAktif(item)}
                          className="p-1.5 hover:bg-emerald-100 rounded-lg transition-colors"
                          title="Aktifkan">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                      )}
                      <button onClick={() => openEdit(item)}
                        className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Edit">
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      </button>
                      <button onClick={() => handleDelete(item)}
                        className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
                        title="Hapus">
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

      {/* Modal Add/Edit */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-annajah-600" />
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">
                      {editItem ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {editItem ? 'Ubah data tahun ajaran' : 'Masukkan tahun ajaran baru'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tahun Ajaran <span className="text-red-500">*</span>
                  </label>
                  <input type="text" className="input-field"
                    placeholder="Contoh: 2025/2026"
                    value={form.tahun_ajaran}
                    onChange={e => setForm({ ...form, tahun_ajaran: e.target.value })}
                    autoFocus />
                  <p className="text-xs text-gray-400 mt-1">Format: YYYY/YYYY (contoh: 2025/2026)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className="input-field" value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="aktif">Aktif</option>
                    <option value="tidak_aktif">Tidak Aktif</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    {form.status === 'aktif' ? 'Akan menonaktifkan tahun ajaran lain yang sedang aktif' : ''}
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="btn-secondary">Batal</button>
                  <button type="submit" disabled={saving}
                    className="btn-primary flex items-center gap-2 min-w-[120px] justify-center">
                    {saving ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Menyimpan...</>
                    ) : (
                      <><Save className="w-4 h-4" /> {editItem ? 'Update' : 'Simpan'}</>
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
