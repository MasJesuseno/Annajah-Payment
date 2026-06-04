import { useState, useEffect, useRef } from 'react'
import { getSiswa, updateSiswa, getKelas, exportSiswa } from '../api'
import { Edit2, Search, Filter, User, X, Download, FileDown, GraduationCap, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AlumniSiswa() {
  const [siswa, setSiswa] = useState([])
  const [kelas, setKelas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [filterKelas, setFilterKelas] = useState('')
  const searchTimeoutRef = useRef(null)
  const [form, setForm] = useState({
    nis: '', nisn: '', nama: '', jenis_kelamin: 'L', tempat_lahir: '',
    tanggal_lahir: '', alamat: '', no_telp: '', id_kelas: '', status: 'lulus'
  })

  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [search])

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    loadData()
  }, [filterKelas, debouncedSearch])

  const loadData = async () => {
    try {
      setLoading(true)
      const params = { status: 'lulus,keluar' }
      if (filterKelas) params.kelas = filterKelas
      if (debouncedSearch) params.search = debouncedSearch
      const [siswaRes, kelasRes] = await Promise.all([getSiswa(params), getKelas()])
      setSiswa(siswaRes.data)
      setKelas(kelasRes.data)
    } catch (error) {
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const params = { status: 'lulus,keluar' }
      if (filterKelas) params.kelas = filterKelas
      if (search) params.search = search
      const res = await exportSiswa(params)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `data_alumni_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Data alumni berhasil diexport')
    } catch (error) {
      toast.error('Gagal mengexport data')
    }
  }

  const handleEdit = (item) => {
    setEditing(item)
    setForm({        nis: item.nis, nisn: item.nisn || '', nama: item.nama,
        jenis_kelamin: item.jenis_kelamin, tempat_lahir: item.tempat_lahir || '',
        tanggal_lahir: item.tanggal_lahir ? new Date(item.tanggal_lahir).toLocaleDateString('en-CA') : '', alamat: item.alamat || '',
        no_telp: item.no_telp || '', id_kelas: item.id_kelas || '', status: item.status || 'lulus'
      })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nis || !form.nama) {
      toast.error('NIS dan Nama harus diisi')
      return
    }
    try {
      await updateSiswa(editing.id, form)
      const isReactivated = form.status === 'aktif'
      toast.success(isReactivated ? 'Siswa berhasil diaktifkan kembali' : 'Data alumni berhasil diperbarui')
      setShowModal(false)
      setEditing(null)
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Terjadi kesalahan')
    }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-annajah-600"></div></div>

  const alumniCount = siswa.length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Data Alumni</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola data siswa lulus dan keluar</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <FileDown className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">
              {siswa.filter(s => s.status === 'lulus').length}
            </p>
            <p className="text-sm text-gray-500">Lulus</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">
              {siswa.filter(s => s.status === 'keluar').length}
            </p>
            <p className="text-sm text-gray-500">Keluar</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" className="input-field pl-10" placeholder="Cari nama atau NIS..."
              value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
                  setDebouncedSearch(search)
                }
              }} />
          </div>
          <div className="w-full sm:w-48 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select className="input-field pl-10" value={filterKelas} onChange={e => setFilterKelas(e.target.value)}>
              <option value="">Semua Kelas</option>
              {kelas.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
            </select>
          </div>
          {(search || filterKelas) && (
            <button onClick={() => { setSearch(''); setDebouncedSearch(''); setFilterKelas('') }} className="btn-secondary flex items-center gap-2">
              <X className="w-4 h-4" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">NIS</th>
                <th className="table-header">NISN</th>
                <th className="table-header">Nama</th>
                <th className="table-header hidden sm:table-cell">JK</th>
                <th className="table-header hidden sm:table-cell">Kelas</th>
                <th className="table-header hidden md:table-cell">No. Telp</th>
                <th className="table-header hidden sm:table-cell">Status</th>
                <th className="table-header text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {siswa.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-12 text-gray-400">
                  <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  Belum ada data alumni
                </td></tr>
              ) : siswa.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell font-mono text-xs">{s.nis}</td>
                  <td className="table-cell font-mono text-xs">{s.nisn || '-'}</td>
                  <td className="table-cell font-medium">{s.nama}</td>
                  <td className="table-cell hidden sm:table-cell">{s.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                  <td className="table-cell hidden sm:table-cell">{s.nama_kelas || '-'}</td>
                  <td className="table-cell hidden md:table-cell">{s.no_telp || '-'}</td>
                  <td className="table-cell hidden sm:table-cell">
                    <span className={`badge ${s.status === 'lulus' ? 'badge-info' : 'badge-danger'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handleEdit(s)} className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Edit data alumni">
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
          <span>Total: {alumniCount} alumni</span>
          <button onClick={loadData} className="flex items-center gap-1 text-annajah-600 hover:text-annajah-700 transition-colors"><RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-6">
                Edit Data Alumni
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">NIS *</label>
                    <input type="text" className="input-field" value={form.nis}
                      onChange={e => setForm({ ...form, nis: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">NISN</label>
                    <input type="text" className="input-field" value={form.nisn}
                      onChange={e => setForm({ ...form, nisn: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-600 mb-1">Nama Lengkap *</label>
                    <input type="text" className="input-field" value={form.nama}
                      onChange={e => setForm({ ...form, nama: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Jenis Kelamin</label>
                    <select className="input-field" value={form.jenis_kelamin}
                      onChange={e => setForm({ ...form, jenis_kelamin: e.target.value })}>
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Kelas</label>
                    <select className="input-field" value={form.id_kelas}
                      onChange={e => setForm({ ...form, id_kelas: e.target.value })}>
                      <option value="">Pilih Kelas</option>
                      {kelas.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Tempat Lahir</label>
                    <input type="text" className="input-field" value={form.tempat_lahir}
                      onChange={e => setForm({ ...form, tempat_lahir: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Tanggal Lahir</label>
                    <input type="date" className="input-field" value={form.tanggal_lahir}
                      onChange={e => setForm({ ...form, tanggal_lahir: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-600 mb-1">Alamat</label>
                    <textarea className="input-field" rows="2" value={form.alamat}
                      onChange={e => setForm({ ...form, alamat: e.target.value })}></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">No. Telepon</label>
                    <input type="text" className="input-field" value={form.no_telp}
                      onChange={e => setForm({ ...form, no_telp: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                    <select className="input-field" value={form.status}
                      onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option value="lulus">Lulus</option>
                      <option value="keluar">Keluar</option>
                      <option value="aktif">Aktif (Aktifkan Kembali)</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Pilih "Aktif" untuk mengembalikan siswa ke data aktif</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="submit" className="btn-primary flex-1">Simpan Perubahan</button>
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Batal</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
