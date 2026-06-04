import { useState, useEffect } from 'react'
import { getPeriodePenilaian, createPeriodePenilaian, updatePeriodePenilaian, deletePeriodePenilaian } from '../api'
import { ClipboardCheck, Plus, Edit2, Trash2, X, CalendarDays } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PeriodePenilaian() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ periode: '' })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await getPeriodePenilaian()
      setData(res.data)
    } catch {
      toast.error('Gagal memuat data periode penilaian')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditItem(null)
    setForm({ periode: '' })
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({ periode: item.periode })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.periode.trim()) {
      toast.error('Periode penilaian harus diisi')
      return
    }
    try {
      setSaving(true)
      if (editItem) {
        await updatePeriodePenilaian(editItem.id, form)
        toast.success('Periode penilaian berhasil diupdate')
      } else {
        await createPeriodePenilaian(form)
        toast.success('Periode penilaian berhasil ditambahkan')
      }
      setShowModal(false)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan periode penilaian')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus periode penilaian ini?')) return
    try {
      await deletePeriodePenilaian(id)
      toast.success('Periode penilaian berhasil dihapus')
      loadData()
    } catch {
      toast.error('Gagal menghapus periode penilaian')
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Periode Penilaian</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola periode penilaian akademik siswa</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{data.length}</p>
              <p className="text-xs text-gray-500">Total Periode Penilaian</p>
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
                  const created = new Date(d.created_at)
                  const now = new Date()
                  return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
                }).length}
              </p>
              <p className="text-xs text-gray-500">Bulan Ini</p>
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
                  const created = new Date(d.created_at)
                  const now = new Date()
                  return created.getFullYear() === now.getFullYear()
                }).length}
              </p>
              <p className="text-xs text-gray-500">Tahun Ini</p>
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
                <th className="table-header">Periode Penilaian</th>
                <th className="table-header hidden sm:table-cell">Tanggal Dibuat</th>
                <th className="table-header text-right w-24">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                </td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-12 text-gray-400">
                  <ClipboardCheck className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  Belum ada periode penilaian
                </td></tr>
              ) : data.map((item, idx) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell text-center text-sm text-gray-500">{idx + 1}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <ClipboardCheck className="w-4 h-4 text-indigo-500" />
                      </div>
                      <span className="font-medium text-sm">{item.periode}</span>
                    </div>
                  </td>
                  <td className="table-cell hidden sm:table-cell">
                    <span className="text-sm text-gray-500">{formatDate(item.created_at)}</span>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(item)}
                        className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Edit">
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      </button>
                      <button onClick={() => handleDelete(item.id)}
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

      {/* Modal Form */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">
                    {editItem ? 'Edit Periode Penilaian' : 'Tambah Periode Penilaian'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {editItem ? 'Ubah periode penilaian' : 'Masukkan periode penilaian baru'}
                  </p>
                </div>
                <button onClick={() => setShowModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Periode Penilaian <span className="text-red-500">*</span>
                  </label>
                  <input type="text" className="input-field"
                    placeholder="Contoh: Semester Ganjil 2024/2025"
                    value={form.periode}
                    onChange={e => setForm({ ...form, periode: e.target.value })}
                    autoFocus />
                  <p className="text-xs text-gray-400 mt-1">
                    Contoh: Penilaian Tengah Semester Ganjil 2024/2025, Ujian Akhir Semester Genap 2024/2025
                  </p>
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
