import { useState, useEffect, useCallback } from 'react'
import {
  Users, Search, Trash2, CheckCircle, XCircle, Clock, X,
  ChevronLeft, ChevronRight, Loader2, RefreshCw,
  Mail, Phone, MapPin, Calendar, School as SchoolIcon, User,
  Printer, Save, Pencil, GraduationCap, Download, FileText,
  AlertTriangle
} from 'lucide-react'
import { getPpdbList, updatePpdb, updateStatusPpdb, deletePpdb, cetakPpdbKartu, uploadFotoPpdb, deleteFotoPpdb, getKelas, konversiPpdbSiswa } from '../api'
import { parseGpsData } from '../utils/formatGps'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = [
  { value: '', label: 'Semua', color: 'bg-gray-100 text-gray-600' },
  { value: 'menunggu', label: 'Menunggu', color: 'bg-amber-100 text-amber-700' },
  { value: 'diterima', label: 'Diterima', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'ditolak', label: 'Ditolak', color: 'bg-red-100 text-red-700' },
]

const STATUS_BADGE = {
  menunggu: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock, label: 'Menunggu' },
  diterima: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle, label: 'Diterima' },
  ditolak: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, label: 'Ditolak' },
}

const perPage = 25

export default function PpdbNewAdmin() {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [statusBayarFilter, setStatusBayarFilter] = useState('')
  const [tanggalMulai, setTanggalMulai] = useState('')
  const [tanggalSelesai, setTanggalSelesai] = useState('')

  // Detail
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedPendaftar, setSelectedPendaftar] = useState(null)

  // Edit
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)

  // Konversi
  const [konversiOpen, setKonversiOpen] = useState(false)
  const [konversiForm, setKonversiForm] = useState({ nis: '', id_kelas: '' })
  const [konversiLoading, setKonversiLoading] = useState(false)
  const [konversiPendaftar, setKonversiPendaftar] = useState(null)
  const [kelasList, setKelasList] = useState([])

  // Cetak
  const [cetakKartuLoading, setCetakKartuLoading] = useState(null)

  // Date presets
  const today = () => new Date().toISOString().split('T')[0]
  const daysAgo = (d) => { const dt = new Date(); dt.setDate(dt.getDate() - d); return dt.toISOString().split('T')[0] }
  const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0] }
  const datePresets = [
    { label: 'Hari Ini', m: today, s: today },
    { label: '7 Hari', m: () => daysAgo(7), s: today },
    { label: '30 Hari', m: () => daysAgo(30), s: today },
    { label: 'Bulan Ini', m: monthStart, s: today },
  ]

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, per_page: perPage }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      if (statusBayarFilter) params.status_pembayaran = statusBayarFilter
      if (tanggalMulai) params.tanggal_mulai = tanggalMulai
      if (tanggalSelesai) params.tanggal_selesai = tanggalSelesai
      const res = await getPpdbList(params)
      setData(res.data.data)
      setTotal(res.data.total)
      setTotalPages(res.data.total_pages)
    } catch { toast.error('Gagal memuat data') }
    finally { setLoading(false) }
  }, [page, search, statusFilter, tanggalMulai, tanggalSelesai])

  useEffect(() => { fetchData() }, [fetchData])

  const handleUpdateStatus = async (id, status) => {
    try {
      const label = status === 'diterima' ? 'Diterima' : status === 'ditolak' ? 'Ditolak' : 'Menunggu'
      await updateStatusPpdb(id, { status })
      toast.success(`Status diubah menjadi ${label}`)
      fetchData()
      if (selectedPendaftar?.id === id) setSelectedPendaftar(prev => ({ ...prev, status }))
    } catch { toast.error('Gagal mengupdate status') }
  }

  const openDetail = (pendaftar) => {
    setSelectedPendaftar(pendaftar)
    setDetailOpen(true)
  }

  const handleEdit = (pendaftar) => {
    setEditForm({
      nisn: pendaftar.nisn || '',
      nama_lengkap: pendaftar.nama_lengkap || '',
      tempat_lahir: pendaftar.tempat_lahir || '',
      tanggal_lahir: pendaftar.tanggal_lahir ? pendaftar.tanggal_lahir.split('T')[0] : '',
      jenis_kelamin: pendaftar.jenis_kelamin || '',
      alamat: pendaftar.alamat || '',
      asal_sekolah: pendaftar.asal_sekolah || '',
      no_telp: pendaftar.no_telp || '',
      email: pendaftar.email || '',
      nama_ayah: pendaftar.nama_ayah || '',
      nama_ibu: pendaftar.nama_ibu || '',
      nilai: pendaftar.nilai || '',
      status_pembayaran: pendaftar.status_pembayaran || 'belum_lunas',
    })
    setSelectedPendaftar(pendaftar)
    setEditOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editForm.nisn || !editForm.nama_lengkap || !editForm.no_telp) {
      toast.error('NISN, Nama, No. Telepon harus diisi'); return
    }
    setSavingEdit(true)
    try {
      await updatePpdb(selectedPendaftar.id, editForm)
      toast.success('Data berhasil diupdate')
      setEditOpen(false)
      setDetailOpen(false)
      setSelectedPendaftar(null)
      fetchData()
    } catch (error) { toast.error(error.response?.data?.message || 'Gagal mengupdate') }
    finally { setSavingEdit(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus data ini?')) return
    try {
      await deletePpdb(id)
      toast.success('Data berhasil dihapus')
      setDetailOpen(false)
      setSelectedPendaftar(null)
      fetchData()
    } catch { toast.error('Gagal menghapus') }
  }

  const handleCetakKartu = async (id, nama, noPendaftaran) => {
    setCetakKartuLoading(id)
    try {
      const res = await cetakPpdbKartu(id)
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `kartu_ppdb_${noPendaftaran}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success(`Kartu ${nama} berhasil dicetak`)
    } catch { toast.error('Gagal mencetak kartu') }
    finally { setCetakKartuLoading(null) }
  }

  const openKonversi = async (pendaftar) => {
    setKonversiPendaftar(pendaftar)
    setKonversiForm({ nis: '', id_kelas: '' })
    try {
      const res = await getKelas()
      setKelasList(res.data || [])
    } catch { toast.error('Gagal memuat kelas') }
    setKonversiOpen(true)
  }

  const handleToggleBayar = async (id, statusSekarang) => {
    const baru = statusSekarang === 'lunas' ? 'belum_lunas' : 'lunas'
    try {
      await updatePpdb(id, { status_pembayaran: baru })
      toast.success(`Status pembayaran diubah menjadi ${baru === 'lunas' ? 'Lunas' : 'Belum Lunas'}`)
      fetchData()
      if (selectedPendaftar?.id === id) setSelectedPendaftar(prev => ({ ...prev, status_pembayaran: baru }))
    } catch { toast.error('Gagal mengubah status pembayaran') }
  }

  const handleKonversi = async () => {
    if (!konversiForm.nis || !konversiForm.id_kelas) { toast.error('NIS dan Kelas harus diisi'); return }
    if (!confirm('Yakin ingin mengkonversi pendaftar ini menjadi siswa?')) return
    setKonversiLoading(true)
    try {
      await konversiPpdbSiswa(konversiPendaftar.id, konversiForm)
      toast.success('Pendaftar berhasil dikonversi menjadi siswa!')
      setKonversiOpen(false); setDetailOpen(false); setSelectedPendaftar(null)
      fetchData()
    } catch (error) { toast.error(error.response?.data?.message || 'Gagal konversi') }
    finally { setKonversiLoading(false) }
  }

  const StatusBadge = ({ status }) => {
    const s = STATUS_BADGE[status] || STATUS_BADGE.menunggu
    const Icon = s.icon
    return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}><Icon className="w-3 h-3" />{s.label}</span>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">PPDB Baru</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola pendaftar PPDB — data dari /ppdbnew{total > 0 && <span className="ml-1">— <strong>{total}</strong> pendaftar</span>}</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1) }} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Cari nama, no. pendaftaran, atau NISN..." className="input-field pl-10" />
          </form>

          {/* Status filter */}
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => { setStatusFilter(opt.value); setPage(1) }}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${statusFilter === opt.value ? 'border-annajah-300 bg-annajah-50 text-annajah-700 shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >{opt.label}</button>
            ))}
          </div>

          {/* Payment status filter */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { setStatusBayarFilter(''); setPage(1) }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${!statusBayarFilter ? 'border-annajah-300 bg-annajah-50 text-annajah-700 shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >Semua Bayar</button>
            <button onClick={() => { setStatusBayarFilter('belum_lunas'); setPage(1) }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${statusBayarFilter === 'belum_lunas' ? 'border-annajah-300 bg-annajah-50 text-annajah-700 shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >Belum Lunas</button>
            <button onClick={() => { setStatusBayarFilter('lunas'); setPage(1) }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${statusBayarFilter === 'lunas' ? 'border-annajah-300 bg-annajah-50 text-annajah-700 shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >Lunas</button>
          </div>

          {/* Date range */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="date" value={tanggalMulai} onChange={e => { setTanggalMulai(e.target.value); setPage(1) }}
                className="pl-8 pr-2.5 py-2 rounded-lg text-xs border border-gray-200 outline-none" title="Tanggal Mulai" />
            </div>
            <span className="text-xs text-gray-400">—</span>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="date" value={tanggalSelesai} onChange={e => { setTanggalSelesai(e.target.value); setPage(1) }}
                className="pl-8 pr-2.5 py-2 rounded-lg text-xs border border-gray-200 outline-none" title="Tanggal Selesai" />
            </div>
            <div className="flex gap-1">
              {datePresets.map(p => (
                <button key={p.label} onClick={() => { setTanggalMulai(p.m()); setTanggalSelesai(p.s()); setPage(1) }}
                  className={`px-2 py-1.5 rounded-md text-xs font-medium border ${tanggalMulai === p.m() && tanggalSelesai === p.s() ? 'bg-annajah-100 text-annajah-700 border-annajah-300' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                >{p.label}</button>
              ))}
            </div>
          </div>

          <button onClick={() => { setSearch(''); setSearchInput(''); setStatusFilter(''); setStatusBayarFilter(''); setTanggalMulai(''); setTanggalSelesai(''); setPage(1) }}
            className="px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 border border-gray-200 flex items-center gap-1.5"
          ><RefreshCw className="w-3.5 h-3.5" /> Reset</button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">No</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">No. Pendaftaran</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">NISN</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Nama</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Email</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Bukti Trf</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Lokasi</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-annajah-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Memuat data...</p>
                </td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-16">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 font-medium">Belum ada pendaftar</p>
                </td></tr>
              ) : data.map((d, i) => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => openDetail(d)}>
                  <td className="px-4 py-3 text-sm text-gray-500">{(page - 1) * perPage + i + 1}</td>
                  <td className="px-4 py-3"><span className="text-sm font-mono font-medium text-gray-800">{d.no_pendaftaran}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-600">{d.nisn}</td>
                  <td className="px-4 py-3"><span className="text-sm font-medium text-gray-800">{d.nama_lengkap}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-500">{d.email || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    {d.bukti_transfer ? (
                      <a href={`/api/ppdbnew/bukti-transfer/${d.bukti_transfer}`} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                        title="Lihat bukti transfer">
                        <FileText className="w-3.5 h-3.5" /> Ada
                      </a>
                    ) : (
                      <span className="text-xs text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {d.gps_masuk ? (() => {
                      const parsed = parseGpsData(d.gps_masuk);
                      return (
                        <span className="inline-flex items-center gap-1.5 text-xs text-blue-700" title={parsed?.display || d.gps_masuk}>
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="break-words min-w-0">{parsed?.display || d.gps_masuk}</span>
                        </span>
                      );
                    })() : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-300">
                        <MapPin className="w-3.5 h-3.5" />
                        -
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <StatusBadge status={d.status} />
                      {d.dikonversi ? <span className="text-[10px] font-medium bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">Siswa</span> : null}
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${d.status_pembayaran === 'lunas' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {d.status_pembayaran === 'lunas' ? 'Lunas' : 'Blm Lunas'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                      {d.status !== 'diterima' && <button onClick={() => handleUpdateStatus(d.id, 'diterima')} className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 transition-all" title="Terima"><CheckCircle className="w-4 h-4" /></button>}
                      {d.status !== 'ditolak' && <button onClick={() => handleUpdateStatus(d.id, 'ditolak')} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-all" title="Tolak"><XCircle className="w-4 h-4" /></button>}
                      {d.status !== 'menunggu' && <button onClick={() => handleUpdateStatus(d.id, 'menunggu')} className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-50 transition-all" title="Kembalikan ke Menunggu"><Clock className="w-4 h-4" /></button>}
                      <button onClick={(e) => { e.stopPropagation(); handleToggleBayar(d.id, d.status_pembayaran); }} className={`p-1.5 rounded-lg transition-all ${d.status_pembayaran === 'lunas' ? 'text-emerald-500 hover:bg-emerald-50' : 'text-amber-500 hover:bg-amber-50'}`}
                        title={d.status_pembayaran === 'lunas' ? 'Ubah ke Belum Lunas' : 'Ubah ke Lunas'}>
                        <span className="text-xs font-bold">{d.status_pembayaran === 'lunas' ? 'Rp' : '$'}</span>
                      </button>
                      <button onClick={() => handleCetakKartu(d.id, d.nama_lengkap, d.no_pendaftaran)} disabled={cetakKartuLoading === d.id} className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-50 transition-all disabled:opacity-40" title="Cetak Kartu">
                        {cetakKartuLoading === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleEdit(d)} className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-50 transition-all" title="Edit"><Pencil className="w-4 h-4" /></button>
                      {!d.dikonversi && <button onClick={() => openKonversi(d)} className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-50 transition-all" title="Konversi ke Siswa"><GraduationCap className="w-4 h-4" /></button>}
                      <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all" title="Hapus"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-500">Menampilkan {(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} dari {total}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-30 transition-all"
              ><ChevronLeft className="w-4 h-4 text-gray-600" /></button>
              <span className="text-xs font-medium text-gray-600 px-2">{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white disabled:opacity-30 transition-all"
              ><ChevronRight className="w-4 h-4 text-gray-600" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detailOpen && selectedPendaftar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDetailOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><User className="w-5 h-5 text-annajah-500" /> Detail Pendaftar</h2>
              <button onClick={() => setDetailOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-sm font-medium text-gray-600">Status</span>
                <StatusBadge status={selectedPendaftar.status} />
              </div>
              <DetailRow icon={<Calendar className="w-4 h-4" />} label="No. Pendaftaran" value={selectedPendaftar.no_pendaftaran} mono />
              <DetailRow label="Kode Rahasia" value={selectedPendaftar.kode_rahasia || '-'} mono />
              <DetailRow label="NISN" value={selectedPendaftar.nisn} />
              <DetailRow label="Nama Lengkap" value={selectedPendaftar.nama_lengkap} bold />
              <DetailRow label="Tempat Lahir" value={selectedPendaftar.tempat_lahir || '-'} />
              <DetailRow label="Tanggal Lahir" value={selectedPendaftar.tanggal_lahir ? new Date(selectedPendaftar.tanggal_lahir).toLocaleDateString('id-ID') : '-'} />
              <DetailRow label="Jenis Kelamin" value={selectedPendaftar.jenis_kelamin === 'L' ? 'Laki-laki' : selectedPendaftar.jenis_kelamin === 'P' ? 'Perempuan' : '-'} />
              <DetailRow icon={<MapPin className="w-4 h-4" />} label="Alamat" value={selectedPendaftar.alamat || '-'} />
              <DetailRow icon={<SchoolIcon className="w-4 h-4" />} label="Asal Sekolah" value={selectedPendaftar.asal_sekolah || '-'} />
              <DetailRow icon={<Phone className="w-4 h-4" />} label="No. Telepon" value={selectedPendaftar.no_telp || '-'} />
              <DetailRow icon={<Mail className="w-4 h-4" />} label="Email" value={selectedPendaftar.email || '-'} />
              <DetailRow label="Nama Ayah" value={selectedPendaftar.nama_ayah || '-'} />
              <DetailRow label="Nama Ibu" value={selectedPendaftar.nama_ibu || '-'} />
              <DetailRow label="Nilai" value={selectedPendaftar.nilai !== null && selectedPendaftar.nilai !== undefined ? selectedPendaftar.nilai : '-'} />
              <DetailRow label="Status Bayar" value={selectedPendaftar.status_pembayaran === 'lunas' ? '✓ Lunas' : 'Belum Lunas'} bold={selectedPendaftar.status_pembayaran === 'lunas'} />
              {/* Lokasi GPS */}
              <DetailRow
                icon={<MapPin className="w-4 h-4" />}
                label="Lokasi GPS"
                value={(() => {
                  if (!selectedPendaftar.gps_masuk) return '-'
                  const parsed = parseGpsData(selectedPendaftar.gps_masuk)
                  return parsed?.display || selectedPendaftar.gps_masuk
                })()}
              />
              {selectedPendaftar.keterangan && <DetailRow label="Keterangan" value={selectedPendaftar.keterangan} />}
              <DetailRow label="Tanggal Daftar" value={new Date(selectedPendaftar.created_at).toLocaleString('id-ID')} />

              <div className="border-t border-gray-100 pt-4 mt-6">
                <p className="text-xs font-medium text-gray-500 mb-3">Ubah Status:</p>
                <div className="flex gap-2">
                  {selectedPendaftar.status !== 'diterima' && <button onClick={() => handleUpdateStatus(selectedPendaftar.id, 'diterima')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-all"><CheckCircle className="w-4 h-4" /> Terima</button>}
                  {selectedPendaftar.status !== 'ditolak' && <button onClick={() => handleUpdateStatus(selectedPendaftar.id, 'ditolak')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-all"><XCircle className="w-4 h-4" /> Tolak</button>}
                  {selectedPendaftar.status !== 'menunggu' && <button onClick={() => handleUpdateStatus(selectedPendaftar.id, 'menunggu')} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-all"><Clock className="w-4 h-4" /> Tunggu</button>}
                </div>
              </div>

              <button onClick={() => handleDelete(selectedPendaftar.id)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition-all"><Trash2 className="w-4 h-4" /> Hapus Data</button>

              {selectedPendaftar.dikonversi ? (
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 flex items-center gap-2.5">
                  <GraduationCap className="w-5 h-5 text-indigo-500 shrink-0" />
                  <div><p className="text-sm font-medium text-indigo-700">Sudah Dikonversi ke Siswa</p></div>
                </div>
              ) : (
                <button onClick={() => openKonversi(selectedPendaftar)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 transition-all"><GraduationCap className="w-4 h-4" /> Konversi ke Siswa</button>
              )}

              <button onClick={() => handleCetakKartu(selectedPendaftar.id, selectedPendaftar.nama_lengkap, selectedPendaftar.no_pendaftaran)} disabled={cetakKartuLoading === selectedPendaftar.id}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium border border-emerald-200 hover:bg-emerald-100 transition-all disabled:opacity-50"
              >{cetakKartuLoading === selectedPendaftar.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} Cetak Kartu Pendaftaran</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && selectedPendaftar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Pencil className="w-5 h-5 text-blue-500" /> Edit Data Pendaftar</h2>
              <button onClick={() => setEditOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
            </div>

            <div className="flex items-start gap-4 mb-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className="w-20 h-24 rounded-xl overflow-hidden border-2 border-gray-200 bg-white flex items-center justify-center">
                  {selectedPendaftar.foto ? <img src={`/api/ppdb/foto/${selectedPendaftar.foto}`} alt="Foto" className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-gray-300" />}
                </div>
              </div>
              <div className="text-sm">
                <p className="text-gray-500">No. Pendaftaran: <span className="font-mono font-medium text-gray-800">{selectedPendaftar.no_pendaftaran}</span></p>
                {selectedPendaftar.kode_rahasia && <p className="text-gray-500 mt-1">Kode Rahasia: <span className="font-mono font-bold text-amber-700">{selectedPendaftar.kode_rahasia}</span></p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">NISN *</label>
                <input type="text" value={editForm.nisn} onChange={e => setEditForm(p => ({ ...p, nisn: e.target.value }))} className="input-field" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Nama Lengkap *</label>
                <input type="text" value={editForm.nama_lengkap} onChange={e => setEditForm(p => ({ ...p, nama_lengkap: e.target.value }))} className="input-field" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Tempat Lahir</label>
                <input type="text" value={editForm.tempat_lahir} onChange={e => setEditForm(p => ({ ...p, tempat_lahir: e.target.value }))} className="input-field" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Tanggal Lahir</label>
                <input type="date" value={editForm.tanggal_lahir} onChange={e => setEditForm(p => ({ ...p, tanggal_lahir: e.target.value }))} className="input-field" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Jenis Kelamin</label>
                <select value={editForm.jenis_kelamin} onChange={e => setEditForm(p => ({ ...p, jenis_kelamin: e.target.value }))} className="input-field">
                  <option value="">Pilih</option><option value="L">Laki-laki</option><option value="P">Perempuan</option>
                </select></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">No. Telepon *</label>
                <input type="text" value={editForm.no_telp} onChange={e => setEditForm(p => ({ ...p, no_telp: e.target.value }))} className="input-field" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} className="input-field" /></div>
              <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1.5">Alamat</label>
                <textarea value={editForm.alamat} onChange={e => setEditForm(p => ({ ...p, alamat: e.target.value }))} className="input-field" rows={2} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Asal Sekolah</label>
                <input type="text" value={editForm.asal_sekolah} onChange={e => setEditForm(p => ({ ...p, asal_sekolah: e.target.value }))} className="input-field" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Nama Ayah</label>
                <input type="text" value={editForm.nama_ayah} onChange={e => setEditForm(p => ({ ...p, nama_ayah: e.target.value }))} className="input-field" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Nama Ibu</label>
                <input type="text" value={editForm.nama_ibu} onChange={e => setEditForm(p => ({ ...p, nama_ibu: e.target.value }))} className="input-field" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Nilai</label>
                <input type="number" value={editForm.nilai} onChange={e => setEditForm(p => ({ ...p, nilai: e.target.value }))} className="input-field" min="0" max="100" /></div>
              <div className="sm:col-span-2"><label className="block text-xs font-medium text-gray-600 mb-1.5">Status Pembayaran</label>
                <select value={editForm.status_pembayaran} onChange={e => setEditForm(p => ({ ...p, status_pembayaran: e.target.value }))} className="input-field">
                  <option value="belum_lunas">Belum Lunas</option>
                  <option value="lunas">Lunas</option>
                </select></div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => setEditOpen(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">Batal</button>
              <button onClick={handleSaveEdit} disabled={savingEdit} className="btn-primary flex items-center gap-2 px-5 py-2.5 disabled:opacity-50">
                {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savingEdit ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Konversi Modal */}
      {konversiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setKonversiOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><GraduationCap className="w-5 h-5 text-indigo-500" /> Konversi ke Siswa</h2>
              <button onClick={() => setKonversiOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="space-y-5">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Pendaftar</p>
                <p className="text-sm font-semibold text-gray-800">{konversiPendaftar?.nama_lengkap}</p>
                <p className="text-xs text-gray-400 font-mono">{konversiPendaftar?.no_pendaftaran} · {konversiPendaftar?.nisn}</p>
              </div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">NIS *</label>
                <input type="text" value={konversiForm.nis} onChange={e => setKonversiForm(p => ({ ...p, nis: e.target.value }))} className="input-field" placeholder="Nomor Induk Siswa" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Kelas *</label>
                <select value={konversiForm.id_kelas} onChange={e => setKonversiForm(p => ({ ...p, id_kelas: e.target.value }))} className="input-field">
                  <option value="">Pilih kelas</option>
                  {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama_kelas} (Kelas {k.tingkat})</option>)}
                </select></div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs font-medium text-blue-700 mb-1.5">Data yang akan dikonversi:</p>
                <ul className="text-[11px] text-blue-600 space-y-0.5">
                  <li>✓ Nama, NISN, Tempat/Tanggal Lahir</li>
                  <li>✓ Jenis Kelamin, Alamat, No. Telepon</li>
                  <li>✓ Asal Sekolah, Foto</li>
                </ul>
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              <button onClick={handleKonversi} disabled={konversiLoading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-all">
                {konversiLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengkonversi...</> : <><GraduationCap className="w-4 h-4" /> Konversi</>}
              </button>
              <button onClick={() => setKonversiOpen(false)} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ icon, label, value, mono, bold }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-gray-50 last:border-b-0">
      <div className="flex items-center gap-2">
        {icon && <span className="text-gray-400 shrink-0">{icon}</span>}
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <span className={`text-sm text-right max-w-[60%] ${bold ? 'font-semibold' : 'font-medium'} text-gray-800 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
