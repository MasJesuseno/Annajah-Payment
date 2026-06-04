import { useState, useEffect } from 'react'
import { getUsers, createUser, updateUser, deleteUser } from '../api'
import { Users as UsersIcon, Plus, Pencil, Trash2, Shield, User, Key, X, Search, AlertTriangle, CheckCircle, GraduationCap, CreditCard, Hash, DoorOpen } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const [form, setForm] = useState({
    username: '',
    password: '',
    nama: '',
    role: 'bendahara',
    nik: '',
    jenis_kelamin: 'L',
    no_telp: '',
    ppdb_access: false,
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const res = await getUsers()
      setUsers(res.data)
    } catch {
      toast.error('Gagal memuat data user')
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingUser(null)
    setForm({ username: '', password: '', nama: '', role: 'bendahara', nik: '', jenis_kelamin: 'L', no_telp: '', ppdb_access: false })
    setShowModal(true)
  }

  const openEditModal = (user) => {
    setEditingUser(user)
    setForm({
      username: user.username,
      password: '',
      nama: user.nama,
      role: user.role,
      nik: user.guru_nik || '',
      jenis_kelamin: user.guru_jenis_kelamin || 'L',
      no_telp: user.guru_no_telp || '',
      ppdb_access: Boolean(user.ppdb_access),
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username || !form.nama) {
      return toast.error('Username dan nama harus diisi')
    }
    if (!editingUser && !form.password) {
      return toast.error('Password harus diisi untuk user baru')
    }
    if (form.password && form.password.length < 6) {
      return toast.error('Password minimal 6 karakter')
    }

    setSaving(true)
    try {
      const payload = {
        username: form.username,
        nama: form.nama,
        role: form.role,
      }
      if (form.password) payload.password = form.password
      if (form.role === 'guru') {
        payload.nik = form.nik || undefined
        payload.jenis_kelamin = form.jenis_kelamin || undefined
        payload.no_telp = form.no_telp || undefined
        payload.ppdb_access = form.ppdb_access
      }

      if (editingUser) {
        const res = await updateUser(editingUser.id, payload)
        setUsers(prev => prev.map(u => u.id === editingUser.id ? res.data : u))
        toast.success('User berhasil diupdate')
      } else {
        const res = await createUser(payload)
        setUsers(prev => [res.data, ...prev])
        toast.success('User baru berhasil ditambahkan')
      }
      setShowModal(false)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan user')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteUser(id)
      setUsers(prev => prev.filter(u => u.id !== id))
      toast.success('User berhasil dihapus')
      setDeleteConfirm(null)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menghapus user')
    }
  }

  const filtered = users.filter(u =>
    u.nama.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  )

  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
          <Shield className="w-3 h-3" /> Admin
        </span>
      )
    }
    if (role === 'guru') {
      return (              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
          <GraduationCap className="w-3 h-3" /> Karyawan
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        <CreditCard className="w-3 h-3" /> Bendahara
      </span>
    )
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
          <h1 className="text-2xl font-bold text-gray-800">Manajemen User</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola pengguna sistem pembayaran — termasuk akun karyawan & bendahara</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Tambah User
        </button>
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Cari user..."
          className="input-field pl-10"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Nama</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Username</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Role</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Tanggal Dibuat</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-annajah-100 flex items-center justify-center shrink-0">
                        {user.role === 'guru' ? (
                          <GraduationCap className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <UsersIcon className="w-4 h-4 text-annajah-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{user.nama}</p>
                        {user.guru_nik && (
                          <p className="text-xs text-gray-400">NIK: {user.guru_nik}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{user.username}</span>
                  </td>
                  <td className="px-4 py-3">{getRoleBadge(user.role)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit user"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(user)}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        title="Hapus user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    <UsersIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Tidak ada user ditemukan</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah/Edit User */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {editingUser ? 'Edit User' : 'Tambah User Baru'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {editingUser ? 'Ubah data pengguna' : 'Buat akun baru untuk pengguna'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nama */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Nama Lengkap <span className="text-red-400">*</span></label>
                <div className="relative">
                  <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    className="input-field pl-10"
                    placeholder="Nama pengguna"
                    value={form.nama}
                    onChange={e => setForm(prev => ({ ...prev, nama: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Username <span className="text-red-400">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    className="input-field pl-10"
                    placeholder="username"
                    value={form.username}
                    onChange={e => setForm(prev => ({ ...prev, username: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Password {!editingUser && <span className="text-red-400">*</span>}
                  {editingUser && <span className="text-gray-400 text-xs font-normal"> (kosongkan jika tidak diubah)</span>}
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    className="input-field pl-10"
                    placeholder={editingUser ? 'Biarkan kosong jika tidak diubah' : 'Minimal 6 karakter'}
                    value={form.password}
                    onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                    required={!editingUser}
                    minLength={6}
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Role</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, role: 'admin' }))}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      form.role === 'admin'
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Shield className="w-5 h-5 mx-auto mb-1" />
                    Admin
                    <p className="text-[10px] font-normal mt-0.5 opacity-70">Akses penuh</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, role: 'bendahara' }))}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      form.role === 'bendahara'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 mx-auto mb-1" />
                    Bendahara
                    <p className="text-[10px] font-normal mt-0.5 opacity-70">Transaksi & Laporan</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, role: 'guru' }))}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      form.role === 'guru'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <GraduationCap className="w-5 h-5 mx-auto mb-1" />
                    Karyawan
                    <p className="text-[10px] font-normal mt-0.5 opacity-70">Login sebagai karyawan</p>
                  </button>
                </div>
              </div>

              {/* Extra fields untuk Guru */}
              {form.role === 'guru' && (
                <>
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Data Karyawan</p>
                    <div className="space-y-4">
                      {/* NIK */}
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">NIK</label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            className="input-field pl-10"
                            placeholder="Nomor Induk Kependudukan"
                            value={form.nik}
                            onChange={e => setForm(prev => ({ ...prev, nik: e.target.value }))}
                          />
                        </div>
                      </div>

                      {/* Jenis Kelamin */}
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Jenis Kelamin</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, jenis_kelamin: 'L' }))}
                            className={`p-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                              form.jenis_kelamin === 'L'
                                ? 'border-annajah-500 bg-annajah-50 text-annajah-700'
                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                          >
                            Laki-laki
                          </button>
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, jenis_kelamin: 'P' }))}
                            className={`p-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                              form.jenis_kelamin === 'P'
                                ? 'border-pink-500 bg-pink-50 text-pink-700'
                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                          >
                            Perempuan
                          </button>
                        </div>
                      </div>

                      {/* No. Telepon */}
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">No. Telepon</label>
                        <div className="relative">
                          <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            className="input-field pl-10"
                            placeholder="Contoh: 08123456789"
                            value={form.no_telp}
                            onChange={e => setForm(prev => ({ ...prev, no_telp: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Info untuk guru */}
              {form.role === 'guru' && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="flex items-start gap-2">
                    <GraduationCap className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-emerald-700">
                      Akun karyawan akan otomatis terhubung dengan data karyawan untuk login dan wali kelas.
                    </p>
                  </div>
                </div>
              )}

              {/* Hak Akses PPDB — hanya untuk role guru */}
              {form.role === 'guru' && (
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Hak Akses</p>
                  <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 hover:border-annajah-200 cursor-pointer transition-all">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={form.ppdb_access}
                        onChange={e => setForm(prev => ({ ...prev, ppdb_access: e.target.checked }))}
                      />
                      <div className={`w-10 h-6 rounded-full transition-colors ${
                        form.ppdb_access ? 'bg-annajah-500' : 'bg-gray-300'
                      }`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                          form.ppdb_access ? 'translate-x-5' : 'translate-x-1'
                        } mt-1`} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-700">Akses Menu PPDB</span>
                      <p className="text-xs text-gray-400">
                        Jika diaktifkan, karyawan dapat mengakses menu Data PPDB dan Pengaturan PPDB
                      </p>
                    </div>
                    <DoorOpen className={`w-5 h-5 ${
                      form.ppdb_access ? 'text-annajah-500' : 'text-gray-300'
                    } transition-colors`} />
                  </label>
                </div>
              )}

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {saving ? 'Menyimpan...' : editingUser ? 'Simpan Perubahan' : 'Tambah User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Hapus User?</h3>
              <p className="text-sm text-gray-500 mt-1">
                Yakin ingin menghapus <strong className="text-gray-700">{deleteConfirm.nama}</strong>?
                {deleteConfirm.role === 'guru' && (
                  <> Data karyawan terkait juga akan dihapus.</>
                )}
                Tindakan ini tidak bisa dibatalkan.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Batal</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="btn-danger flex-1 flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
