import { useState, useEffect } from 'react'
import { getPrestasiSiswa, deletePrestasiSiswa, getSiswa, exportExcelPrestasiSiswa, cetakPiagamPrestasi, kirimPiagamEmail } from '../api'
import { Trophy, Plus, Edit2, Trash2, X, Filter, Search, CalendarDays, Users, Award, Image as ImageIcon, FileDown, Printer, Mail, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function DaftarPrestasiSiswa() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSiswa, setFilterSiswa] = useState('')
  const [filterPenyelenggara, setFilterPenyelenggara] = useState('')
  const [filterTanggalMulai, setFilterTanggalMulai] = useState('')
  const [filterTanggalSelesai, setFilterTanggalSelesai] = useState('')
  const [siswaList, setSiswaList] = useState([])
  const [previewFoto, setPreviewFoto] = useState(null)
  const [loadingCetak, setLoadingCetak] = useState(null)
  const [kirimEmail, setKirimEmail] = useState(null) // data prestasi untuk dikirim email
  const [emailTujuan, setEmailTujuan] = useState('')
  const [loadingEmail, setLoadingEmail] = useState(false)

  useEffect(() => {
    loadSiswa()
    loadData()
  }, [])

  const loadSiswa = async () => {
    try {
      const res = await getSiswa({ per_page: 9999 })
      setSiswaList(res.data.data || res.data || [])
    } catch { /* ignore */ }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const params = {}
      if (search) params.search = search
      if (filterSiswa) params.id_siswa = filterSiswa
      if (filterPenyelenggara) params.penyelenggara = filterPenyelenggara
      if (filterTanggalMulai) params.tanggal_mulai = filterTanggalMulai
      if (filterTanggalSelesai) params.tanggal_selesai = filterTanggalSelesai
      const res = await getPrestasiSiswa(params)
      setData(res.data)
    } catch {
      toast.error('Gagal memuat data prestasi')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    loadData()
  }

  const resetFilters = () => {
    setSearch('')
    setFilterSiswa('')
    setFilterPenyelenggara('')
    setFilterTanggalMulai('')
    setFilterTanggalSelesai('')
    setTimeout(() => loadData(), 0)
  }

  const hasFilters = search || filterSiswa || filterPenyelenggara || filterTanggalMulai || filterTanggalSelesai

  const handleExportExcel = async () => {
    try {
      const params = {}
      if (search) params.search = search
      if (filterSiswa) params.id_siswa = filterSiswa
      if (filterPenyelenggara) params.penyelenggara = filterPenyelenggara
      if (filterTanggalMulai) params.tanggal_mulai = filterTanggalMulai
      if (filterTanggalSelesai) params.tanggal_selesai = filterTanggalSelesai
      const res = await exportExcelPrestasiSiswa(params)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `data_prestasi_siswa_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Data prestasi berhasil diexport')
    } catch {
      toast.error('Gagal mengexport data prestasi')
    }
  }

  const handlePreviewPiagam = async (item) => {
    try {
      const res = await cetakPiagamPrestasi(item.id)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => window.URL.revokeObjectURL(url), 30000)
    } catch {
      toast.error('Gagal memuat preview piagam')
    }
  }

  const handleCetakPiagam = async (item) => {
    try {
      setLoadingCetak(item.id)
      const res = await cetakPiagamPrestasi(item.id)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      // Gunakan download link (lebih aman dari popup blocker)
      const a = document.createElement('a')
      a.href = url
      a.download = `piagam_${item.nama_siswa.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => window.URL.revokeObjectURL(url), 10000)
      toast.success('Piagam berhasil di-generate')
    } catch {
      toast.error('Gagal mencetak piagam')
    } finally {
      setLoadingCetak(null)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus data prestasi ini?')) return
    try {
      await deletePrestasiSiswa(id)
      toast.success('Data prestasi berhasil dihapus')
      loadData()
    } catch {
      toast.error('Gagal menghapus data prestasi')
    }
  }

  const openKirimEmail = (item) => {
    setKirimEmail(item)
    // Isi otomatis dengan email siswa jika tersedia (dari data siswa yang dimuat)
    const siswa = siswaList.find(s => s.id === item.id_siswa)
    setEmailTujuan(siswa?.email || '')
  }

  const handleKirimEmail = async () => {
    if (!emailTujuan) {
      toast.error('Email tujuan harus diisi')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTujuan)) {
      toast.error('Format email tidak valid')
      return
    }
    try {
      setLoadingEmail(true)
      await kirimPiagamEmail(kirimEmail.id, { email_tujuan: emailTujuan })
      toast.success(`Piagam berhasil dikirim ke ${emailTujuan}`)
      setKirimEmail(null)
      setEmailTujuan('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengirim email. Periksa konfigurasi SMTP.')
    } finally {
      setLoadingEmail(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Daftar Prestasi Siswa</h1>
          <p className="text-gray-500 text-sm mt-1">Riwayat prestasi yang diraih siswa</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportExcel} className="btn-secondary flex items-center gap-2">
            <FileDown className="w-4 h-4" /> Export
          </button>
          <Link to="/prestasi-siswa/input" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Tambah Prestasi
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-annajah-100 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-annajah-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{data.length}</p>
              <p className="text-xs text-gray-500">Total Prestasi</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{new Set(data.map(d => d.id_siswa)).size}</p>
              <p className="text-xs text-gray-500">Siswa Berprestasi</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Award className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{new Set(data.map(d => d.prestasi)).size}</p>
              <p className="text-xs text-gray-500">Jenis Prestasi</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{data.filter(d => d.foto).length}</p>
              <p className="text-xs text-gray-500">Dengan Foto</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" className="input-field pl-10" placeholder="Cari nama siswa, agenda, atau prestasi..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="w-full sm:w-52 relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select className="input-field pl-10" value={filterSiswa}
              onChange={e => setFilterSiswa(e.target.value)}>
              <option value="">Semua Siswa</option>
              {siswaList.map(s => <option key={s.id} value={s.id}>{s.nama} ({s.nis})</option>)}
            </select>
          </div>
          <div className="w-full sm:w-48">
            <input type="text" className="input-field" placeholder="Filter penyelenggara..."
              value={filterPenyelenggara} onChange={e => setFilterPenyelenggara(e.target.value)} />
          </div>
          <div className="w-full sm:w-40">
            <input type="date" className="input-field" value={filterTanggalMulai}
              onChange={e => setFilterTanggalMulai(e.target.value)}
              placeholder="Dari tanggal" />
          </div>
          <div className="w-full sm:w-40">
            <input type="date" className="input-field" value={filterTanggalSelesai}
              onChange={e => setFilterTanggalSelesai(e.target.value)}
              placeholder="Sampai tanggal" />
          </div>
          <button type="submit" className="btn-primary">Cari</button>
          {hasFilters && (
            <button type="button" onClick={resetFilters} className="btn-secondary flex items-center gap-2">
              <X className="w-4 h-4" /> Reset
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Siswa</th>
                <th className="table-header hidden sm:table-cell">Tanggal</th>
                <th className="table-header hidden md:table-cell">Penyelenggara</th>
                <th className="table-header">Agenda</th>
                <th className="table-header">Prestasi</th>
                <th className="table-header text-center w-16">Foto</th>
                <th className="table-header text-right w-24">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-annajah-600 mx-auto"></div>
                </td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-12 text-gray-400">
                  <Trophy className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  Belum ada data prestasi siswa
                </td></tr>
              ) : data.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-2.5">
                      {item.foto_siswa ? (
                        <img
                          src={`/uploads/siswa/${item.foto_siswa}`}
                          alt={item.nama_siswa}
                          className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-200"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${item.foto_siswa ? 'hidden' : 'bg-annajah-100 text-annajah-600'}`}
                      >
                        {item.nama_siswa?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{item.nama_siswa}</div>
                        <div className="text-xs text-gray-400 font-mono">{item.nis}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell hidden sm:table-cell">
                    <span className="text-sm flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      {new Date(item.tanggal).toLocaleDateString('id-ID')}
                    </span>
                  </td>
                  <td className="table-cell hidden md:table-cell">
                    <span className="text-sm text-gray-600">{item.penyelenggara}</span>
                  </td>
                  <td className="table-cell max-w-xs">
                    <p className="text-sm text-gray-700 line-clamp-2">{item.nama_agenda}</p>
                  </td>
                  <td className="table-cell">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <Trophy className="w-3 h-3" />
                      {item.prestasi}
                    </span>
                  </td>
                  <td className="table-cell text-center">
                    {item.foto ? (
                      <button onClick={() => setPreviewFoto(item)}
                        className="p-1.5 hover:bg-annajah-50 rounded-lg transition-colors"
                        title="Lihat foto">
                        <ImageIcon className="w-4 h-4 text-annajah-600" />
                      </button>
                    ) : (
                      <span className="text-gray-300 text-xs">-</span>
                    )}
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => handlePreviewPiagam(item)}
                        className="p-1.5 hover:bg-purple-100 rounded-lg transition-colors"
                        title="Preview Piagam">
                        <Eye className="w-3.5 h-3.5 text-purple-600" />
                      </button>
                      <button onClick={() => handleCetakPiagam(item)}
                        disabled={loadingCetak === item.id}
                        className={`p-1.5 rounded-lg transition-colors ${loadingCetak === item.id
                          ? 'bg-amber-50 cursor-wait'
                          : 'hover:bg-amber-100'}`}
                        title="Cetak Piagam">
                        <Printer className={`w-3.5 h-3.5 ${loadingCetak === item.id
                          ? 'text-amber-400 animate-pulse'
                          : 'text-amber-600'}`} />
                      </button>
                      <button onClick={() => openKirimEmail(item)}
                        className="p-1.5 hover:bg-emerald-100 rounded-lg transition-colors"
                        title="Kirim via Email">
                        <Mail className="w-3.5 h-3.5 text-emerald-600" />
                      </button>
                      <Link to={`/prestasi-siswa/input?id=${item.id}`}
                        className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors">
                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      </Link>
                      <button onClick={() => handleDelete(item.id)}
                        className="p-1.5 hover:bg-red-100 rounded-lg transition-colors">
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

      {/* Modal Kirim Email */}
      {kirimEmail && (
        <div className="modal-overlay" onClick={() => { setKirimEmail(null); setEmailTujuan('') }}>
          <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">Kirim Piagam via Email</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {kirimEmail.nama_siswa} - {kirimEmail.prestasi}
                  </p>
                </div>
                <button onClick={() => { setKirimEmail(null); setEmailTujuan('') }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Tujuan</label>
                  <input type="email" className="input-field"
                    placeholder="contoh@email.com"
                    value={emailTujuan}
                    onChange={e => setEmailTujuan(e.target.value)}
                    autoFocus />
                  <p className="text-xs text-gray-400 mt-1">
                    Piagam akan dikirim sebagai lampiran PDF ke alamat email ini
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs text-amber-700">
                    <strong>Perhatian:</strong>                    Pastikan konfigurasi SMTP sudah diatur di menu Pengaturan &gt; Konfigurasi Email sebelum mengirim.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => { setKirimEmail(null); setEmailTujuan('') }}
                  className="btn-secondary">Batal</button>
                <button onClick={handleKirimEmail}
                  disabled={loadingEmail}
                  className="btn-primary flex items-center gap-2">
                  {loadingEmail ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" /> Kirim Email
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview Foto */}
      {previewFoto && (
        <div className="modal-overlay" onClick={() => setPreviewFoto(null)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800">{previewFoto.nama_agenda}</h3>
                  <p className="text-xs text-gray-500">{previewFoto.nama_siswa} - {previewFoto.prestasi}</p>
                </div>
                <button onClick={() => setPreviewFoto(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              {previewFoto.foto && (
                <img
                  src={`/uploads/prestasi/${previewFoto.foto}`}
                  alt="Foto Prestasi"
                  className="w-full rounded-xl"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
