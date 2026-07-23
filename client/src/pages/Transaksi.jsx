import { useState, useEffect, useRef } from 'react'
import { getTransaksi, createTransaksi, updateTransaksi, deleteTransaksi, getTransaksiById, getSiswa, getPembayaran, cekSppSiswa, getKwitansi, downloadExcelTransaksi, downloadPdfTransaksi, downloadExcel, kirimKwitansiEmail } from '../api'
import { Plus, Trash2, Search, Download, Receipt, CheckCircle, XCircle, DollarSign, FileSpreadsheet, FileText, Send, Printer, Pencil, Calendar, Mail, MailX, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import KirimEmail from '../components/KirimEmail'

export default function Transaksi() {
  const [transaksi, setTransaksi] = useState([])
  const [siswa, setSiswa] = useState([])
  const [pembayaran, setPembayaran] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterJenis, setFilterJenis] = useState('')
  const [sppStatus, setSppStatus] = useState(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showKeluarModal, setShowKeluarModal] = useState(false)
  const [showPemasukanNonSiswaModal, setShowPemasukanNonSiswaModal] = useState(false)
  const [emailKwitansiData, setEmailKwitansiData] = useState(null)
  const [sendingKwitansi, setSendingKwitansi] = useState(false)
  const searchTimeoutRef = useRef(null)
  const initialMount = useRef(true)
  const [form, setForm] = useState({
    id_siswa: '', id_jenis_pembayaran: '', jumlah_bayar: '',
    bulan_bayar: '', keterangan: '', tanggal_bayar: '', jenis_transaksi: 'Masuk'
  })
  const [keluarForm, setKeluarForm] = useState({
    nama_pengeluaran: '', jumlah_bayar: '', tanggal_bayar: new Date().toISOString().split('T')[0], keterangan: ''
  })
  const [pemasukanNonSiswaForm, setPemasukanNonSiswaForm] = useState({
    nama_pemasukan: '', jumlah_bayar: '', tanggal_bayar: new Date().toISOString().split('T')[0], keterangan: ''
  })
  // Student search in modal
  const [siswaOptions, setSiswaOptions] = useState([])
  const [siswaFilter, setSiswaFilter] = useState('')
  const [loadingSiswa, setLoadingSiswa] = useState(false)
  const modalSiswaTimeout = useRef(null)

  const bulanOptions = [
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'
  ]

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [search])

  useEffect(() => { loadData() }, [])

  // Re-fetch when search changes (skip initial mount)
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false
      return
    }
    loadData()
  }, [debouncedSearch, filterJenis])

  const loadData = async (customSearch) => {
    try {
      const params = { limit: 50 }
      const activeSearch = customSearch !== undefined ? customSearch : debouncedSearch
      if (activeSearch) params.search = activeSearch
      if (filterJenis) params.jenis_transaksi = filterJenis
      const [trxRes, siswaRes, pembayaranRes] = await Promise.all([
        getTransaksi(params),
        getSiswa(),
        getPembayaran({ status: 'aktif' })
      ])
      setTransaksi(trxRes.data)
      setSiswa(siswaRes.data)
      setPembayaran(pembayaranRes.data)
    } catch (error) {
      console.error('Gagal memuat data transaksi:', error?.response?.data || error.message || error)
      toast.error(error?.response?.data?.message || 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  // Debounced search siswa for modal (skip in edit mode — siswa is read-only)
  useEffect(() => {
    if (showModal && siswaFilter && !editingId) {
      if (modalSiswaTimeout.current) clearTimeout(modalSiswaTimeout.current)
      modalSiswaTimeout.current = setTimeout(() => loadSiswaOptions(), 300)
    }
  }, [siswaFilter, showModal])

  const loadSiswaOptions = async () => {
    setLoadingSiswa(true)
    try {
      const params = { per_page: 200 }
      if (siswaFilter) params.search = siswaFilter
      const res = await getSiswa(params)
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || [])
      setSiswaOptions(list.filter(s => s.status === 'aktif'))
    } catch {
      setSiswaOptions([])
    } finally {
      setLoadingSiswa(false)
    }
  }

  const handleSiswaPilih = async (idSiswa, nama) => {
    setForm({ ...form, id_siswa: idSiswa })
    setSiswaFilter(nama)
    if (idSiswa) {
      try {
        const res = await cekSppSiswa(idSiswa)
        setSppStatus(res.data)
      } catch { setSppStatus(null) }
    } else {
      setSppStatus(null)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm({ id_siswa: '', id_jenis_pembayaran: '', jumlah_bayar: '', bulan_bayar: '', keterangan: '', tanggal_bayar: '', jenis_transaksi: 'Masuk' })
    setSiswaFilter('')
    setSppStatus(null)
  }

  const openAddModal = () => {
    const today = new Date().toISOString().split('T')[0]
    setEditingId(null)
    setShowModal(true)
    setSiswaFilter('')
    setSiswaOptions([])
    setSppStatus(null)
    setForm({ id_siswa: '', id_jenis_pembayaran: '', jumlah_bayar: '', bulan_bayar: '', keterangan: '', tanggal_bayar: today, jenis_transaksi: 'Masuk' })
  }

  const handleEdit = async (id) => {
    try {
      const res = await getTransaksiById(id)
      const t = res.data
      setEditingId(id)
      // Format tanggal_bayar ke YYYY-MM-DD untuk input[type=date]
      const tglBayar = t.tanggal_bayar
        ? new Date(t.tanggal_bayar).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
      setForm({
        id_siswa: t.id_siswa,
        id_jenis_pembayaran: String(t.id_jenis_pembayaran),
        jumlah_bayar: t.jumlah_bayar,
        bulan_bayar: t.bulan_bayar || '',
        keterangan: t.keterangan || '',
        tanggal_bayar: tglBayar,
        jenis_transaksi: t.jenis_transaksi || 'Masuk'
      })
      setSiswaFilter(t.nama_siswa || (t.jenis_transaksi === 'Keluar' ? 'Pengeluaran' : 'Non-Siswa'))
      setSppStatus(null)
      setShowModal(true)
    } catch {
      toast.error('Gagal memuat data transaksi')
    }
  }

  const handlePembayaranChange = (id) => {
    const selected = pembayaran.find(p => p.id === parseInt(id))
    setForm({ ...form, id_jenis_pembayaran: id, jumlah_bayar: selected ? selected.nominal : '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.id_jenis_pembayaran || !form.jumlah_bayar) {
      toast.error('Lengkapi semua data transaksi')
      return
    }
    try {
      if (editingId) {
        await updateTransaksi(editingId, {
          id_jenis_pembayaran: form.id_jenis_pembayaran,
          jumlah_bayar: parseInt(form.jumlah_bayar),
          bulan_bayar: form.bulan_bayar || null,
          keterangan: form.keterangan || null,
          tanggal_bayar: form.tanggal_bayar || null,
          jenis_transaksi: form.jenis_transaksi || 'Masuk'
        })
        toast.success('Transaksi berhasil diperbarui!')
      } else {
        if (!form.id_siswa) {
          toast.error('Pilih siswa terlebih dahulu')
          return
        }
        await createTransaksi({
          ...form,
          jumlah_bayar: parseInt(form.jumlah_bayar),
          jenis_transaksi: form.jenis_transaksi || 'Masuk'
        })
        toast.success('Transaksi berhasil dicatat!')
      }
      closeModal()
      loadData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan transaksi')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus transaksi ini?')) return
    try {
      await deleteTransaksi(id)
      toast.success('Transaksi berhasil dihapus')
      loadData()
    } catch { toast.error('Gagal menghapus transaksi') }
  }

  const handleExportExcel = async () => {
    try {
      await downloadExcel(downloadExcelTransaksi, {}, 'transaksi.xlsx')
      toast.success('Data transaksi berhasil diunduh (Excel)')
    } catch { toast.error('Gagal export Excel') }
  }

  const downloadPdfBlob = async (fetcher, params, filename, successMsg) => {
    try {
      const res = await fetcher(params)
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
      window.URL.revokeObjectURL(url)
      toast.success(successMsg)
    } catch { toast.error('Gagal export PDF') }
  }

  const handleExportPdf = () => downloadPdfBlob(downloadPdfTransaksi, {}, 'transaksi_pembayaran.pdf', 'Data transaksi berhasil diunduh (PDF)')

  const handleCetakKwitansi = async (id) => {
    try {
      const res = await getKwitansi(id)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const win = window.open(url, '_blank')
      if (!win) {
        // Popup diblokir — fallback ke download
        const a = document.createElement('a')
        a.href = url
        a.download = `kwitansi_${id}.pdf`
        a.click()
        toast.success('Kwitansi berhasil diunduh (popup diblokir)')
      } else {
        toast.success('Kwitansi dibuka di tab baru')
        win.focus()
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 15000)
    } catch {
      toast.error('Gagal memuat kwitansi')
    }
  }

  const handleDownloadKwitansi = async (id) => {
    try {
      const res = await getKwitansi(id)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `kwitansi_${id}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Kwitansi berhasil diunduh')
    } catch {
      toast.error('Gagal mengunduh kwitansi')
    }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-annajah-600"></div></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Transaksi Pembayaran</h1>
          <p className="text-gray-500 text-sm mt-1">Catat dan kelola transaksi pembayaran</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Transaksi Baru
          </button>
          <button onClick={() => {
            setShowPemasukanNonSiswaModal(true)
            setPemasukanNonSiswaForm({
              nama_pemasukan: '', jumlah_bayar: '',
              tanggal_bayar: new Date().toISOString().split('T')[0], keterangan: ''
            })
          }} className="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> Pemasukan Non-Siswa
          </button>
          <button onClick={() => {
            setShowKeluarModal(true)
            setKeluarForm({
              nama_pengeluaran: '', jumlah_bayar: '',
              tanggal_bayar: new Date().toISOString().split('T')[0], keterangan: ''
            })
          }} className="btn-primary flex items-center gap-2 bg-red-600 hover:bg-red-700">
            <Plus className="w-4 h-4" /> Transaksi Keluar
          </button>
          <button onClick={handleExportExcel} className="btn-secondary flex items-center gap-1.5 text-sm">
            <FileSpreadsheet className="w-4 h-4 text-green-600" /> Excel
          </button>
          <button onClick={handleExportPdf} className="btn-secondary flex items-center gap-1.5 text-sm">
            <FileText className="w-4 h-4 text-red-500" /> PDF
          </button>
          <button onClick={() => setShowEmailModal(true)} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Send className="w-4 h-4 text-annajah-600" /> Email
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" className="input-field pl-10" placeholder="Cari berdasarkan nama siswa atau NIS..."
              value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
                  setDebouncedSearch(search)
                }
              }} />
          </div>
          <div className="flex-shrink-0">
            <select
              className="input-field"
              value={filterJenis}
              onChange={e => setFilterJenis(e.target.value)}
            >
              <option value="">Semua Jenis</option>
              <option value="Masuk">Masuk (Pemasukan)</option>
              <option value="Keluar">Keluar (Pengeluaran)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">No. Kwitansi</th>
                <th className="table-header">Tanggal</th>
                <th className="table-header">Jenis</th>
                <th className="table-header hidden sm:table-cell">NIS</th>
                <th className="table-header">Nama Siswa</th>
                <th className="table-header hidden md:table-cell">Pembayaran</th>
                <th className="table-header hidden sm:table-cell">Bulan</th>
                <th className="table-header text-right">Jumlah</th>
                <th className="table-header text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {transaksi.length === 0 ? (
                <tr><td colSpan="9" className="text-center py-12 text-gray-400">
                  <Receipt className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  Belum ada transaksi
                </td></tr>
              ) : transaksi.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell font-mono text-xs">{t.no_kwitansi || '-'}</td>
                  <td className="table-cell text-xs">{new Date(t.tanggal_bayar).toLocaleDateString('id-ID')}</td>
                  <td className="table-cell">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      t.jenis_transaksi === 'Masuk'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {t.jenis_transaksi || 'Masuk'}
                    </span>
                  </td>
                  <td className="table-cell font-mono text-xs hidden sm:table-cell">{t.nis || <span className="text-gray-400">–</span>}</td>
                  <td className="table-cell font-medium">
                    {t.nama_siswa || (
                      t.jenis_transaksi === 'Keluar'
                        ? <span className="text-red-500 text-xs font-semibold">Pengeluaran</span>
                        : <span className="text-emerald-500 text-xs font-semibold">Non-Siswa</span>
                    )}
                  </td>
                  <td className="table-cell hidden md:table-cell">{t.nama_pembayaran}</td>
                  <td className="table-cell hidden sm:table-cell">{t.bulan_bayar || '-'}</td>
                  <td className="table-cell text-right font-semibold text-annajah-600">
                    Rp {parseInt(t.jumlah_bayar).toLocaleString('id-ID')}
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleCetakKwitansi(t.id)} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-annajah-50 hover:bg-annajah-100 text-annajah-700 rounded-lg text-xs font-medium transition-colors whitespace-nowrap" title="Cetak Kwitansi">
                        <Printer className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Cetak</span>
                      </button>
                      <button onClick={() => handleEdit(t.id)} className="p-1.5 hover:bg-amber-100 rounded-lg transition-colors" title="Edit">
                        <Pencil className="w-3.5 h-3.5 text-amber-600" />
                      </button>
                      <button onClick={() => handleDownloadKwitansi(t.id)} className="p-1.5 hover:bg-green-100 rounded-lg transition-colors" title="Download PDF">
                        <Download className="w-3.5 h-3.5 text-green-600" />
                      </button>
                      {t.email ? (
                        <button onClick={() => setEmailKwitansiData(t)} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors whitespace-nowrap" title="Kirim Kwitansi via Email">
                          <Mail className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Email</span>
                        </button>
                      ) : t.nama_siswa ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-gray-300" title="Siswa tidak memiliki alamat email">
                          <MailX className="w-3.5 h-3.5 text-gray-300" />
                          <span className="hidden sm:inline text-gray-300">Tdk Ada</span>
                        </span>
                      ) : null}
                      <button onClick={() => handleDelete(t.id)} className="p-1.5 hover:bg-red-100 rounded-lg transition-colors" title="Hapus">
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
          Total: {transaksi.length} transaksi
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-annajah-600" />
                {editingId ? 'Edit Transaksi' : 'Catat Pembayaran Baru'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Siswa *</label>
                  {editingId ? (
                    <div className="input-field mb-2 bg-gray-50 text-gray-500 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-annajah-500" />
                      {form.id_siswa ? siswaFilter : (
                        <span className={form.jenis_transaksi === 'Keluar' ? 'text-red-500 font-semibold' : 'text-emerald-600 font-semibold'}>
                          {form.jenis_transaksi === 'Keluar' ? 'Pengeluaran' : 'Non-Siswa'}
                        </span>
                      )}
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        className="input-field mb-2"
                        placeholder="Cari siswa..."
                        value={siswaFilter}
                        onChange={e => {
                          setSiswaFilter(e.target.value)
                          if (!e.target.value) {
                            setForm({ ...form, id_siswa: '' })
                            setSppStatus(null)
                          }
                          if (modalSiswaTimeout.current) clearTimeout(modalSiswaTimeout.current)
                          modalSiswaTimeout.current = setTimeout(() => loadSiswaOptions(), 300)
                        }}
                      />
                      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl p-1">
                        {loadingSiswa ? (
                          <div className="flex justify-center py-4">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-annajah-600"></div>
                          </div>
                        ) : siswaOptions.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-4">
                            {siswaFilter ? 'Tidak ada siswa ditemukan' : 'Ketik nama untuk mencari siswa...'}
                          </p>
                        ) : (
                          siswaOptions.map(s => {
                            const selected = form.id_siswa === s.id
                            return (
                              <label
                                key={s.id}
                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                  selected ? 'bg-annajah-50 border border-annajah-200' : 'hover:bg-gray-50 border border-transparent'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="id_siswa_modal"
                                  className="w-4 h-4 text-annajah-600 border-gray-300 focus:ring-annajah-500"
                                  checked={selected}
                                  onChange={() => handleSiswaPilih(s.id, s.nama)}
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium text-gray-700 truncate block">{s.nama}</span>
                                  <span className="text-xs text-gray-400 font-mono">{s.nis} {s.nama_kelas ? `— ${s.nama_kelas}` : ''}</span>
                                </div>
                              </label>
                            )
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* SPP Status */}
                {sppStatus && (
                  <div className="p-4 bg-annajah-50 rounded-xl">
                    <p className="text-sm font-medium text-annajah-800 mb-2">Status SPP</p>
                    <div className="flex flex-wrap gap-2">
                      {sppStatus.bulan_lunas.map(b => (
                        <span key={b} className="badge badge-success flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> {b}
                        </span>
                      ))}
                      {sppStatus.bulan_belum_lunas.map(b => (
                        <span key={b} className="badge badge-danger flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> {b}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Nominal SPP: Rp {parseInt(sppStatus.spp_nominal).toLocaleString('id-ID')}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Jenis Pembayaran *</label>
                    <select className="input-field" value={form.id_jenis_pembayaran}
                      onChange={e => handlePembayaranChange(e.target.value)} required>
                      <option value="">Pilih Pembayaran</option>
                      {pembayaran.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nama_pembayaran} - Rp {parseInt(p.nominal).toLocaleString('id-ID')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Jumlah Bayar *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
                      <input type="number" className="input-field pl-10" value={form.jumlah_bayar}
                        onChange={e => setForm({ ...form, jumlah_bayar: e.target.value })} required />
                    </div>
                  </div>
                </div>

                {/* Tanggal Transaksi */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Tanggal Transaksi</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="date" className="input-field pl-10" value={form.tanggal_bayar}
                      onChange={e => setForm({ ...form, tanggal_bayar: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Bulan Pembayaran</label>
                  <select className="input-field" value={form.bulan_bayar}
                    onChange={e => setForm({ ...form, bulan_bayar: e.target.value })}>
                    <option value="">Pilih Bulan (jika SPP)</option>
                    {bulanOptions.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Keterangan</label>
                  <textarea className="input-field" rows="2" value={form.keterangan}
                    onChange={e => setForm({ ...form, keterangan: e.target.value })}
                    placeholder="Keterangan tambahan (opsional)"></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Jenis Transaksi</label>
                  <div className="flex gap-3">
                    <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all flex-1 ${
                      form.jenis_transaksi === 'Masuk'
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="jenis_transaksi"
                        value="Masuk"
                        className="w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500"
                        checked={form.jenis_transaksi === 'Masuk'}
                        onChange={e => setForm({ ...form, jenis_transaksi: e.target.value })}
                      />
                      <div>
                        <span className="text-sm font-semibold">Masuk</span>
                        <p className="text-xs opacity-70">Pemasukan / Pembayaran</p>
                      </div>
                    </label>
                    <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all flex-1 ${
                      form.jenis_transaksi === 'Keluar'
                        ? 'border-red-400 bg-red-50 text-red-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="jenis_transaksi"
                        value="Keluar"
                        className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                        checked={form.jenis_transaksi === 'Keluar'}
                        onChange={e => setForm({ ...form, jenis_transaksi: e.target.value })}
                      />
                      <div>
                        <span className="text-sm font-semibold">Keluar</span>
                        <p className="text-xs opacity-70">Pengeluaran / Refund</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" className="btn-primary flex-1 py-3">
                    {editingId ? (
                      <><Pencil className="w-4 h-4 inline-block mr-1" /> Simpan Perubahan</>
                    ) : (
                      <><Receipt className="w-4 h-4 inline-block mr-1" /> Catat Transaksi</>
                    )}
                  </button>
                  <button type="button" onClick={closeModal} className="btn-secondary flex-1">Batal</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Transaksi Keluar ── */}
      {showKeluarModal && (
        <div className="modal-overlay" onClick={() => setShowKeluarModal(false)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-red-500" />
                Catat Pengeluaran Baru
              </h2>
              <form onSubmit={async (e) => {
                e.preventDefault()
                if (!keluarForm.nama_pengeluaran || !keluarForm.jumlah_bayar) {
                  toast.error('Lengkapi nama pengeluaran dan jumlah')
                  return
                }
                try {
                  // Cari jenis_pembayaran 'Pengeluaran' atau buat default
                  let pengeluaranId = pembayaran.find(p => p.nama_pembayaran === 'Pengeluaran')?.id
                  if (!pengeluaranId && pembayaran.length > 0) {
                    // Fallback ke jenis pembayaran pertama jika 'Pengeluaran' belum ada
                    pengeluaranId = pembayaran[0].id
                  }
                  await createTransaksi({
                    id_siswa: null,
                    id_jenis_pembayaran: pengeluaranId,
                    jumlah_bayar: parseInt(keluarForm.jumlah_bayar),
                    tanggal_bayar: keluarForm.tanggal_bayar,
                    keterangan: `Pengeluaran: ${keluarForm.nama_pengeluaran}${keluarForm.keterangan ? ' — ' + keluarForm.keterangan : ''}`,
                    jenis_transaksi: 'Keluar'
                  })
                  toast.success('Pengeluaran berhasil dicatat!')
                  setShowKeluarModal(false)
                  loadData()
                } catch (error) {
                  toast.error(error.response?.data?.message || 'Gagal menyimpan pengeluaran')
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Nama Pengeluaran *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Contoh: Biaya Listrik, Operasional, dll"
                    value={keluarForm.nama_pengeluaran}
                    onChange={e => setKeluarForm({ ...keluarForm, nama_pengeluaran: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Jumlah *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
                    <input type="number" className="input-field pl-10"
                      value={keluarForm.jumlah_bayar}
                      onChange={e => setKeluarForm({ ...keluarForm, jumlah_bayar: e.target.value })}
                      placeholder="0" required />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Tanggal</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="date" className="input-field pl-10"
                      value={keluarForm.tanggal_bayar}
                      onChange={e => setKeluarForm({ ...keluarForm, tanggal_bayar: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Keterangan Tambahan</label>
                  <textarea className="input-field" rows="2"
                    value={keluarForm.keterangan}
                    onChange={e => setKeluarForm({ ...keluarForm, keterangan: e.target.value })}
                    placeholder="Keterangan opsional..."></textarea>
                </div>

                {/* Preview badge */}
                {keluarForm.nama_pengeluaran && keluarForm.jumlah_bayar && (
                  <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-red-700">{keluarForm.nama_pengeluaran}</span>
                      <span className="font-bold text-red-600">
                        Rp {parseInt(keluarForm.jumlah_bayar || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {keluarForm.tanggal_bayar ? new Date(keluarForm.tanggal_bayar + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                    <Receipt className="w-4 h-4" /> Catat Pengeluaran
                  </button>
                  <button type="button" onClick={() => setShowKeluarModal(false)} className="btn-secondary flex-1">Batal</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Pemasukan Non-Siswa ── */}
      {showPemasukanNonSiswaModal && (
        <div className="modal-overlay" onClick={() => setShowPemasukanNonSiswaModal(false)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                Catat Pemasukan Non-Siswa
              </h2>
              <form onSubmit={async (e) => {
                e.preventDefault()
                if (!pemasukanNonSiswaForm.nama_pemasukan || !pemasukanNonSiswaForm.jumlah_bayar) {
                  toast.error('Lengkapi nama pemasukan dan jumlah')
                  return
                }
                try {
                  // Cari jenis_pembayaran 'Pemasukan Non-Siswa'
                  let idPembayaran = pembayaran.find(p => p.nama_pembayaran === 'Pemasukan Non-Siswa')?.id
                  if (!idPembayaran && pembayaran.length > 0) {
                    // Fallback ke jenis pembayaran pertama
                    idPembayaran = pembayaran[0].id
                  }
                  await createTransaksi({
                    id_siswa: null,
                    id_jenis_pembayaran: idPembayaran,
                    jumlah_bayar: parseInt(pemasukanNonSiswaForm.jumlah_bayar),
                    tanggal_bayar: pemasukanNonSiswaForm.tanggal_bayar,
                    keterangan: `Pemasukan Non-Siswa: ${pemasukanNonSiswaForm.nama_pemasukan}${pemasukanNonSiswaForm.keterangan ? ' — ' + pemasukanNonSiswaForm.keterangan : ''}`,
                    jenis_transaksi: 'Masuk'
                  })
                  toast.success('Pemasukan non-siswa berhasil dicatat!')
                  setShowPemasukanNonSiswaModal(false)
                  loadData()
                } catch (error) {
                  toast.error(error.response?.data?.message || 'Gagal menyimpan pemasukan')
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Nama Pemasukan *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Contoh: Donasi, Bantuan, dll"
                    value={pemasukanNonSiswaForm.nama_pemasukan}
                    onChange={e => setPemasukanNonSiswaForm({ ...pemasukanNonSiswaForm, nama_pemasukan: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Jumlah *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
                    <input type="number" className="input-field pl-10"
                      value={pemasukanNonSiswaForm.jumlah_bayar}
                      onChange={e => setPemasukanNonSiswaForm({ ...pemasukanNonSiswaForm, jumlah_bayar: e.target.value })}
                      placeholder="0" required />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Tanggal</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="date" className="input-field pl-10"
                      value={pemasukanNonSiswaForm.tanggal_bayar}
                      onChange={e => setPemasukanNonSiswaForm({ ...pemasukanNonSiswaForm, tanggal_bayar: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Keterangan Tambahan</label>
                  <textarea className="input-field" rows="2"
                    value={pemasukanNonSiswaForm.keterangan}
                    onChange={e => setPemasukanNonSiswaForm({ ...pemasukanNonSiswaForm, keterangan: e.target.value })}
                    placeholder="Keterangan opsional..."></textarea>
                </div>

                {/* Preview badge */}
                {pemasukanNonSiswaForm.nama_pemasukan && pemasukanNonSiswaForm.jumlah_bayar && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-emerald-700">{pemasukanNonSiswaForm.nama_pemasukan}</span>
                      <span className="font-bold text-emerald-600">
                        Rp {parseInt(pemasukanNonSiswaForm.jumlah_bayar || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {pemasukanNonSiswaForm.tanggal_bayar ? new Date(pemasukanNonSiswaForm.tanggal_bayar + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                    <Receipt className="w-4 h-4" /> Catat Pemasukan
                  </button>
                  <button type="button" onClick={() => setShowPemasukanNonSiswaModal(false)} className="btn-secondary flex-1">Batal</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Kirim Email Modal */}
      <KirimEmail
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        jenis="transaksi"
        params={{}}
        label="Transaksi Pembayaran"
      />

      {/* ── Modal Kirim Kwitansi via Email ── */}
      {emailKwitansiData && (
        <div className="modal-overlay" onClick={() => setEmailKwitansiData(null)}>
          <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">Kirim Kwitansi via Email</h2>
                    <p className="text-xs text-gray-400">Kwitansi akan dikirim sebagai lampiran PDF</p>
                  </div>
                </div>
                <button onClick={() => setEmailKwitansiData(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr>
                        <td className="py-1.5 pr-4 text-gray-500 whitespace-nowrap">Siswa</td>
                        <td className="py-1.5 font-medium text-gray-800">{emailKwitansiData.nama_siswa}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 pr-4 text-gray-500 whitespace-nowrap">Pembayaran</td>
                        <td className="py-1.5 font-medium text-gray-800">{emailKwitansiData.nama_pembayaran}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 pr-4 text-gray-500 whitespace-nowrap">Jumlah</td>
                        <td className="py-1.5 font-medium text-emerald-700">
                          Rp {parseInt(emailKwitansiData.jumlah_bayar).toLocaleString('id-ID')}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 pr-4 text-gray-500 whitespace-nowrap">Email Tujuan</td>
                        <td className="py-1.5 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="font-medium text-blue-700">{emailKwitansiData.email}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {sendingKwitansi ? (
                  <div className="flex flex-col items-center py-6 text-center">
                    <Loader2 className="w-8 h-8 text-annajah-600 animate-spin mb-3" />
                    <p className="text-sm text-gray-500">Mengirim kwitansi...</p>
                    <p className="text-xs text-gray-400 mt-1">Mohon tunggu, proses generate PDF & kirim email</p>
                  </div>
                ) : (
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={async () => {
                        setSendingKwitansi(true)
                        try {
                          await kirimKwitansiEmail(emailKwitansiData.id)
                          toast.success(`Kwitansi berhasil dikirim ke ${emailKwitansiData.email}`)
                          setEmailKwitansiData(null)
                        } catch (error) {
                          toast.error(error.response?.data?.message || 'Gagal mengirim email')
                        } finally {
                          setSendingKwitansi(false)
                        }
                      }}
                      className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Kirim Kwitansi
                    </button>
                    <button
                      onClick={() => setEmailKwitansiData(null)}
                      className="btn-secondary flex-1"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
