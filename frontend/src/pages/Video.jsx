import { useState, useEffect } from 'react'
import { getVideoTv, createVideoTv, updateVideoTv, deleteVideoTv } from '../api'
import { Video, Plus, Edit2, Trash2, X, Eye, EyeOff, Youtube } from 'lucide-react'
import toast from 'react-hot-toast'

export default function VideoTv() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ link_video: '', deskripsi: '', tampil: 'Ya' })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await getVideoTv()
      setData(res.data)
    } catch {
      toast.error('Gagal memuat data video')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditItem(null)
    setForm({ link_video: '', deskripsi: '', tampil: 'Ya' })
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({ link_video: item.link_video, deskripsi: item.deskripsi || '', tampil: item.tampil })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.link_video) {
      toast.error('Link video harus diisi')
      return
    }
    try {
      setSaving(true)
      if (editItem) {
        await updateVideoTv(editItem.id, form)
        toast.success('Video berhasil diupdate')
      } else {
        await createVideoTv(form)
        toast.success('Video berhasil ditambahkan')
      }
      setShowModal(false)
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan video')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus video ini?')) return
    try {
      await deleteVideoTv(id)
      toast.success('Video berhasil dihapus')
      loadData()
    } catch {
      toast.error('Gagal menghapus video')
    }
  }

  const toggleTampil = async (item) => {
    try {
      const newTampil = item.tampil === 'Ya' ? 'Tidak' : 'Ya'
      await updateVideoTv(item.id, { ...item, tampil: newTampil })
      toast.success(`Video ${newTampil === 'Ya' ? 'ditampilkan' : 'disembunyikan'}`)
      loadData()
    } catch {
      toast.error('Gagal mengubah status tampil')
    }
  }

  const getYoutubeId = (url) => {
    if (!url) return null
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ]
    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Video</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola video untuk ditampilkan di TV</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Tambah Video
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Video className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{data.length}</p>
              <p className="text-xs text-gray-500">Total Video</p>
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
                <th className="table-header">Link Video</th>
                <th className="table-header">Deskripsi</th>
                <th className="table-header text-center w-28">Tampil</th>
                <th className="table-header text-right w-24">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>                    <td colSpan="5" className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-annajah-600 mx-auto"></div>
                </td></tr>
              ) : data.length === 0 ? (
                <tr>                    <td colSpan="5" className="text-center py-12 text-gray-400">
                  <Video className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  Belum ada video
                </td></tr>
              ) : data.map((item, idx) => {
                const youtubeId = getYoutubeId(item.link_video)
                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell text-center text-sm text-gray-500">{idx + 1}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-7 rounded bg-gray-100 flex items-center justify-center shrink-0">
                          {youtubeId ? (
                            <img src={`https://img.youtube.com/vi/${youtubeId}/default.jpg`} alt=""
                              className="w-full h-full object-cover rounded"
                              onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<svg class=\"w-4 h-4 text-red-500\" ...>' }} />
                          ) : (
                            <Youtube className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm text-gray-700 break-all">{item.link_video}</span>
                          {youtubeId && (
                            <p className="text-[10px] text-gray-400 mt-0.5">YouTube ID: {youtubeId}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="text-sm text-gray-600 line-clamp-2">{item.deskripsi || '-'}</span>
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
                )
              })}
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
                    {editItem ? 'Edit Video' : 'Tambah Video Baru'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {editItem ? 'Ubah link video' : 'Masukkan link video YouTube untuk ditampilkan di TV'}
                  </p>
                </div>
                <button onClick={() => setShowModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link Video <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                    <input type="text" className="input-field pl-10"
                      value={form.link_video}
                      onChange={e => setForm({ ...form, link_video: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=... atau ID YouTube" autoFocus />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Masukkan link YouTube atau ID video YouTube</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                  <textarea
                    className="input-field min-h-[80px] resize-y"
                    value={form.deskripsi}
                    onChange={e => setForm({ ...form, deskripsi: e.target.value })}
                    placeholder="Masukkan deskripsi video (akan ditampilkan di TV)"
                    rows={3}
                  />
                  <p className="text-xs text-gray-400 mt-1">Deskripsi akan ditampilkan di bawah video pada halaman TV</p>
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

                {/* Preview */}
                {form.link_video && getYoutubeId(form.link_video) && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-2">Preview:</p>
                    <div className="aspect-video rounded-lg overflow-hidden bg-black">
                      <iframe
                        src={`https://www.youtube.com/embed/${getYoutubeId(form.link_video)}`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Preview Video"
                      />
                    </div>
                  </div>
                )}

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
