import { useState, useEffect } from 'react'
import { getRekapLaporan, getLaporanPerBulan, getLaporanSiswa, getSiswa, downloadExcelRekap, downloadExcelPerBulan, downloadExcelSiswa, downloadPdfRekap, downloadPdfPerBulan, downloadPdfSiswa, downloadExcel, getPerbandinganStatus, getWaliKelasPerTingkat, getKehadiranRekap, getKehadiranSiswa, getKelas, downloadExcelKehadiranKelas, downloadExcelKehadiranSiswa, downloadPdfKehadiranKelas, downloadPdfKehadiranSiswa, getRingkasanKeuangan, downloadExcelRingkasanKeuangan, downloadPdfRingkasanKeuangan, getPembayaran, getLaporanTransaksiGabungan, downloadExcelTransaksiGabungan, downloadPdfTransaksiGabungan,
  downloadExcelWaliKelas, downloadPdfWaliKelas } from '../api'
import { FileText, Download, Calendar, Search, Printer, FileSpreadsheet, Send, Users, TrendingUp, School, GraduationCap, UserCheck, UserX, Clock, Activity, AlertCircle, ArrowLeftRight, TrendingDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import toast from 'react-hot-toast'
import KirimEmail from '../components/KirimEmail'

const COLORS = ['#16a34a', '#2563eb', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']

const tingkatLabels = {
  X: 'Kelas X',
  XI: 'Kelas XI',
  XII: 'Kelas XII',
}

const tingkatColors = {
  X: 'from-blue-500 to-blue-600',
  XI: 'from-emerald-500 to-emerald-600',
  XII: 'from-purple-500 to-purple-600',
}

const tingkatBgColors = {
  X: 'bg-blue-50 border-blue-200',
  XI: 'bg-emerald-50 border-emerald-200',
  XII: 'bg-purple-50 border-purple-200',
}

function WaliCard({ guru }) {
  const initials = guru?.nama
    ?.split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  return (
    <div className="flex items-center gap-2.5">
      {guru?.foto ? (
        <img
          src={`/uploads/guru/${guru.foto}`}
          alt=""
          className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm"
          onError={(e) => {
            e.target.style.display = 'none'
            const parent = e.target.parentElement
            const span = document.createElement('span')
            span.className = 'w-8 h-8 rounded-full bg-gradient-to-br from-annajah-400 to-annajah-600 flex items-center justify-center text-white text-xs font-bold shrink-0'
            span.textContent = initials
            parent.prepend(span)
          }}
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-annajah-400 to-annajah-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {initials}
        </div>
      )}
      {guru ? (
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{guru.nama}</p>
          {guru.nik && <p className="text-[11px] text-gray-400">NIK: {guru.nik}</p>}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">Belum ada wali</p>
      )}
    </div>
  )
}

export default function Laporan() {
  const [tab, setTab] = useState('rekap')
  const [rekap, setRekap] = useState(null)
  const [perBulan, setPerBulan] = useState(null)
  const [laporanSiswa, setLaporanSiswa] = useState(null)
  const [siswa, setSiswa] = useState([])
  const [selectedSiswa, setSelectedSiswa] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterStatusRekap, setFilterStatusRekap] = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [emailModal, setEmailModal] = useState({ open: false, jenis: '', params: {}, label: '' })
  const [dateRange, setDateRange] = useState({
    tanggal_awal: '',
    tanggal_akhir: new Date().toISOString().split('T')[0]
  })
  const [dateRangeSiswa, setDateRangeSiswa] = useState({
    tanggal_awal: '',
    tanggal_akhir: ''
  })
  const [tahun, setTahun] = useState(new Date().getFullYear().toString())
  const [filterJenisPerBulan, setFilterJenisPerBulan] = useState('')
  const [filterJenisPerSiswa, setFilterJenisPerSiswa] = useState('')
  const [tahunPerbandingan, setTahunPerbandingan] = useState(new Date().getFullYear().toString())
  const [perbandinganStatus, setPerbandinganStatus] = useState(null)
  const [waliKelasData, setWaliKelasData] = useState(null)

  // Ringkasan Keuangan
  const [ringkasanKeuangan, setRingkasanKeuangan] = useState(null)
  const [ringkasanDateRange, setRingkasanDateRange] = useState({
    tanggal_awal: '',
    tanggal_akhir: new Date().toISOString().split('T')[0],
  })
  const [ringkasanGrup, setRingkasanGrup] = useState('bulan')
  const [ringkasanFilterJenis, setRingkasanFilterJenis] = useState('')
  const [jenisPembayaranList, setJenisPembayaranList] = useState([])
  const [loadingRingkasan, setLoadingRingkasan] = useState(true)

  // Kehadiran
  const [kehadiranRekap, setKehadiranRekap] = useState(null)
  const [kehadiranSiswa, setKehadiranSiswa] = useState(null)
  const [kelasList, setKelasList] = useState([])
  const [filterKehadiranKelas, setFilterKehadiranKelas] = useState('')
  const [filterKehadiranTanggalAwal, setFilterKehadiranTanggalAwal] = useState('')
  const [filterKehadiranTanggalAkhir, setFilterKehadiranTanggalAkhir] = useState(new Date().toISOString().split('T')[0])
  const [loadingKehadiran, setLoadingKehadiran] = useState(false)

  // Transaksi Gabungan
  const [transaksiGabungan, setTransaksiGabungan] = useState(null)
  const [loadingGabungan, setLoadingGabungan] = useState(false)
  const [gabunganDateRange, setGabunganDateRange] = useState({
    tanggal_awal: '',
    tanggal_akhir: new Date().toISOString().split('T')[0],
  })
  const [gabunganFilterJenis, setGabunganFilterJenis] = useState('')
  const [gabunganFilterJenisTransaksi, setGabunganFilterJenisTransaksi] = useState('')
  const [gabunganSearch, setGabunganSearch] = useState('')

  const tabs = [
    { id: 'rekap', label: 'Rekap Pembayaran' },
    { id: 'perbulan', label: 'Per Bulan' },
    { id: 'persiswa', label: 'Per Siswa' },
    { id: 'walikelas', label: 'Wali Kelas' },
    { id: 'kehadiran', label: 'Kehadiran' },
    { id: 'ringkasan', label: 'Ringkasan Keuangan' },
    { id: 'transaksigabungan', label: 'Transaksi Gabungan' },
  ]

  useEffect(() => {
    setLoading(true)
    if (tab === 'rekap') {
      loadRekap()
      getPerbandinganStatus({ tahun: tahunPerbandingan }).then(r => setPerbandinganStatus(r.data)).catch(() => {})
    } else if (tab === 'perbulan') loadPerBulan()
    else if (tab === 'persiswa') {
      loadSiswaList(filterStatus)
      setLoading(false)
    } else if (tab === 'walikelas') {
      loadWaliKelas()
    } else if (tab === 'ringkasan') {
      loadRingkasanKeuangan()
    } else if (tab === 'kehadiran') {
      loadKehadiranRekap()
    } else if (tab === 'transaksigabungan') {
      loadTransaksiGabungan()
    } else {
      setLoading(false)
    }
  }, [tab])

  const loadSiswaList = async (statusFilter) => {
    try {
      const params = {}
      if (statusFilter) params.status = statusFilter
      const res = await getSiswa(params)
      setSiswa(res.data)
    } catch {}
  }

  const loadRekap = async () => {
    try {
      const params = { ...dateRange }
      if (filterStatusRekap) params.status_siswa = filterStatusRekap
      const res = await getRekapLaporan(params)
      setRekap(res.data)
    } catch { toast.error('Gagal memuat rekap') }
  }

  const loadPerBulan = async () => {
    try {
      const params = { tahun }
      if (filterJenisPerBulan) params.jenis_transaksi = filterJenisPerBulan
      const res = await getLaporanPerBulan(params)
      setPerBulan(res.data)
    } catch { toast.error('Gagal memuat laporan per bulan') }
  }

  const loadLaporanSiswa = async () => {
    if (!selectedSiswa) return toast.error('Pilih siswa terlebih dahulu')
    try {
      const params = { id_siswa: selectedSiswa }
      if (dateRangeSiswa.tanggal_awal) params.tanggal_awal = dateRangeSiswa.tanggal_awal
      if (dateRangeSiswa.tanggal_akhir) params.tanggal_akhir = dateRangeSiswa.tanggal_akhir
      if (filterJenisPerSiswa) params.jenis_transaksi = filterJenisPerSiswa
      const res = await getLaporanSiswa(params)
      setLaporanSiswa(res.data)
    } catch { toast.error('Gagal memuat laporan siswa') }
  }

  const loadWaliKelas = async () => {
    try {
      const res = await getWaliKelasPerTingkat()
      setWaliKelasData(res.data)
    } catch { toast.error('Gagal memuat data wali kelas') }
    finally { setLoading(false) }
  }

  // Load kelas list and jenis pembayaran list once on mount for filter dropdowns
  useEffect(() => {
    getKelas().then(r => setKelasList(r.data || [])).catch(() => {})
    getPembayaran().then(r => setJenisPembayaranList(r.data || [])).catch(() => {})
  }, [])

  const getRingkasanParams = () => ({
    ...ringkasanDateRange,
    grup: ringkasanGrup,
    id_jenis_pembayaran: ringkasanFilterJenis || undefined,
    tanggal_awal: ringkasanDateRange.tanggal_awal || undefined,
    tanggal_akhir: ringkasanDateRange.tanggal_akhir || undefined,
  })

  const handleExportRingkasanExcel = async () => {
    setExporting(true)
    try {
      await downloadExcel(downloadExcelRingkasanKeuangan, getRingkasanParams(), 'ringkasan_keuangan.xlsx')
      toast.success('Ringkasan keuangan berhasil diunduh (Excel)')
    } catch { toast.error('Gagal export Excel') }
    finally { setExporting(false) }
  }

  const getGabunganParams = () => {
    const params = { ...gabunganDateRange }
    if (!params.tanggal_awal) delete params.tanggal_awal
    if (!params.tanggal_akhir) delete params.tanggal_akhir
    if (gabunganFilterJenis) params.id_jenis_pembayaran = gabunganFilterJenis
    if (gabunganFilterJenisTransaksi) params.jenis_transaksi = gabunganFilterJenisTransaksi
    if (gabunganSearch) params.search = gabunganSearch
    return params
  }

  const handleExportGabunganExcel = async () => {
    setExporting(true)
    try {
      await downloadExcel(downloadExcelTransaksiGabungan, getGabunganParams(), 'transaksi_gabungan.xlsx')
      toast.success('Transaksi gabungan berhasil diunduh (Excel)')
    } catch { toast.error('Gagal export Excel') }
    finally { setExporting(false) }
  }

  const handleExportGabunganPdf = () => downloadPdfBlob(
    downloadPdfTransaksiGabungan,
    getGabunganParams(),
    'transaksi_gabungan.pdf',
    'Transaksi gabungan berhasil diunduh (PDF)'
  )

  const handleExportRingkasanPdf = () => downloadPdfBlob(
    downloadPdfRingkasanKeuangan,
    getRingkasanParams(),
    'ringkasan_keuangan.pdf',
    'Ringkasan keuangan berhasil diunduh (PDF)'
  )

  const loadRingkasanKeuangan = async () => {
    setLoadingRingkasan(true)
    try {
      const params = { ...ringkasanDateRange, grup: ringkasanGrup }
      if (!params.tanggal_awal) delete params.tanggal_awal
      if (!params.tanggal_akhir) delete params.tanggal_akhir
      const res = await getRingkasanKeuangan(params)
      setRingkasanKeuangan(res.data)
    } catch {
      toast.error('Gagal memuat ringkasan keuangan')
    } finally {
      setLoadingRingkasan(false)
    }
  }

  const loadTransaksiGabungan = async () => {
    setLoadingGabungan(true)
    try {
      const res = await getLaporanTransaksiGabungan(getGabunganParams())
      setTransaksiGabungan(res.data)
    } catch {
      toast.error('Gagal memuat transaksi gabungan')
    } finally {
      setLoadingGabungan(false)
      setLoading(false)
    }
  }

  const loadKehadiranRekap = async () => {
    setLoadingKehadiran(true)
    try {
      const params = {}
      if (filterKehadiranTanggalAwal) params.tanggal_awal = filterKehadiranTanggalAwal
      if (filterKehadiranTanggalAkhir) params.tanggal_akhir = filterKehadiranTanggalAkhir
      if (filterKehadiranKelas) params.id_kelas = filterKehadiranKelas

      const [rekapRes, siswaRes] = await Promise.all([
        getKehadiranRekap(params),
        getKehadiranSiswa(params),
      ])
      setKehadiranRekap(rekapRes.data)
      setKehadiranSiswa(siswaRes.data)
    } catch {
      toast.error('Gagal memuat rekap kehadiran')
    } finally {
      setLoadingKehadiran(false)
      setLoading(false)
    }
  }

  const getKehadiranParams = () => ({
    tanggal_awal: filterKehadiranTanggalAwal || undefined,
    tanggal_akhir: filterKehadiranTanggalAkhir || undefined,
    id_kelas: filterKehadiranKelas || undefined,
  })

  const handleExportKehadiranKelas = async () => {
    setExporting(true)
    try {
      await downloadExcel(downloadExcelKehadiranKelas, getKehadiranParams(), 'rekap_kehadiran_kelas.xlsx')
      toast.success('Rekap kehadiran per kelas berhasil diunduh (Excel)')
    } catch { toast.error('Gagal export Excel') }
    finally { setExporting(false) }
  }

  const handleExportKehadiranSiswa = async () => {
    setExporting(true)
    try {
      await downloadExcel(downloadExcelKehadiranSiswa, getKehadiranParams(), 'rekap_kehadiran_siswa.xlsx')
      toast.success('Rekap kehadiran per siswa berhasil diunduh (Excel)')
    } catch { toast.error('Gagal export Excel') }
    finally { setExporting(false) }
  }

  const handlePdfKehadiranKelas = () => downloadPdfBlob(downloadPdfKehadiranKelas, getKehadiranParams(), 'rekap_kehadiran_kelas.pdf', 'Rekap kehadiran per kelas berhasil diunduh (PDF)')

  const handlePdfKehadiranSiswa = () => downloadPdfBlob(downloadPdfKehadiranSiswa, getKehadiranParams(), 'rekap_kehadiran_siswa.pdf', 'Rekap kehadiran per siswa berhasil diunduh (PDF)')

  const loadSiswa = () => setLoading(false)

  const formatRupiah = (val) => `Rp ${(val || 0).toLocaleString('id-ID')}`

  const handlePrint = () => window.print()

  const getRekapParams = () => {
    const params = { ...dateRange }
    if (filterStatusRekap) params.status_siswa = filterStatusRekap
    return params
  }

  const handleExportRekap = async () => {
    setExporting(true)
    try {
      await downloadExcel(downloadExcelRekap, getRekapParams(), `rekap_pembayaran.xlsx`)
      toast.success('Rekap berhasil diunduh (Excel)')
    } catch { toast.error('Gagal export Excel') }
    finally { setExporting(false) }
  }

  const handleExportPerBulan = async () => {
    setExporting(true)
    try {
      const params = { tahun }
      if (filterJenisPerBulan) params.jenis_transaksi = filterJenisPerBulan
      await downloadExcel(downloadExcelPerBulan, params, `pembayaran_${tahun}.xlsx`)
      toast.success('Laporan per bulan berhasil diunduh (Excel)')
    } catch { toast.error('Gagal export Excel') }
    finally { setExporting(false) }
  }

  const handleExportSiswa = async () => {
    if (!selectedSiswa) return toast.error('Pilih siswa terlebih dahulu')
    setExporting(true)
    try {
      const params = { id_siswa: selectedSiswa }
      if (filterJenisPerSiswa) params.jenis_transaksi = filterJenisPerSiswa
      await downloadExcel(downloadExcelSiswa, params, `riwayat_siswa.xlsx`)
      toast.success('Riwayat siswa berhasil diunduh (Excel)')
    } catch { toast.error('Gagal export Excel') }
    finally { setExporting(false) }
  }

  // Shared blob download helper
  const downloadPdfBlob = async (fetcher, params, filename, successMsg) => {
    setExporting(true)
    try {
      const res = await fetcher(params)
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
      window.URL.revokeObjectURL(url)
      toast.success(successMsg)
    } catch { toast.error('Gagal export PDF') }
    finally { setExporting(false) }
  }

  const handlePdfRekap = () => downloadPdfBlob(downloadPdfRekap, getRekapParams(), 'rekap_pembayaran.pdf', 'Rekap berhasil diunduh (PDF)')

  const handlePdfPerBulan = () => {
    const params = { tahun }
    if (filterJenisPerBulan) params.jenis_transaksi = filterJenisPerBulan
    return downloadPdfBlob(downloadPdfPerBulan, params, `pembayaran_${tahun}.pdf`, 'Laporan per bulan berhasil diunduh (PDF)')
  }

  const handleExportWaliKelasExcel = async () => {
    setExporting(true)
    try {
      await downloadExcel(downloadExcelWaliKelas, {}, 'wali_kelas.xlsx')
      toast.success('Wali kelas berhasil diunduh (Excel)')
    } catch { toast.error('Gagal export Excel') }
    finally { setExporting(false) }
  }

  const handleExportWaliKelasPdf = () => downloadPdfBlob(
    downloadPdfWaliKelas,
    {},
    'wali_kelas.pdf',
    'Wali kelas berhasil diunduh (PDF)'
  )

  const handlePdfSiswa = () => {
    if (!selectedSiswa) return toast.error('Pilih siswa terlebih dahulu')
    const params = { id_siswa: selectedSiswa }
    if (filterJenisPerSiswa) params.jenis_transaksi = filterJenisPerSiswa
    return downloadPdfBlob(downloadPdfSiswa, params, 'riwayat_siswa.pdf', 'Riwayat siswa berhasil diunduh (PDF)')
  }

  const ExportBtns = ({ onExcel, onPdf, loading }) => (
    <div className="flex gap-2">
      <button onClick={onExcel} disabled={loading}
        className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2">
        <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
        {loading ? '...' : 'Excel'}
      </button>
      <button onClick={onPdf} disabled={loading}
        className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2">
        <FileText className="w-3.5 h-3.5 text-red-500" />
        {loading ? '...' : 'PDF'}
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Laporan Keuangan</h1>
          <p className="text-gray-500 text-sm mt-1">Rekapitulasi laporan pembayaran SMA Annajah</p>
        </div>
        <button onClick={handlePrint} className="btn-secondary flex items-center gap-2">
          <Printer className="w-4 h-4" /> Cetak
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
              tab === t.id ? 'bg-white text-annajah-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Rekap */}
      {tab === 'rekap' && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[120px]">
                <label className="block text-sm font-medium text-gray-600 mb-1">Dari Tanggal</label>
                <input type="date" className="input-field" value={dateRange.tanggal_awal}
                  onChange={e => setDateRange({ ...dateRange, tanggal_awal: e.target.value })} />
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="block text-sm font-medium text-gray-600 mb-1">Sampai Tanggal</label>
                <input type="date" className="input-field" value={dateRange.tanggal_akhir}
                  onChange={e => setDateRange({ ...dateRange, tanggal_akhir: e.target.value })} />
              </div>
              <div className="w-full sm:w-36">
                <label className="block text-sm font-medium text-gray-600 mb-1">Status Siswa</label>
                <select className="input-field" value={filterStatusRekap}
                  onChange={e => { setFilterStatusRekap(e.target.value); }}>
                  <option value="">Semua Status</option>
                  <option value="aktif">Aktif</option>
                  <option value="lulus">Lulus</option>
                  <option value="keluar">Keluar</option>
                </select>
              </div>
              <button onClick={loadRekap} className="btn-primary flex items-center gap-2">
                <Search className="w-4 h-4" /> Tampilkan
              </button>
              {rekap && (
                <ExportBtns onExcel={handleExportRekap} onPdf={handlePdfRekap} loading={exporting} />
              )}
              {rekap && (
                <button onClick={() => setEmailModal({ open: true, jenis: 'rekap', params: getRekapParams(), label: 'Rekap Pembayaran' })}
                  className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2">
                  <Send className="w-3.5 h-3.5 text-annajah-600" /> Email
                </button>
              )}
            </div>
          </div>

          {/* Comparison Chart — independent of rekap data */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-800">Perbandingan Pembayaran berdasarkan Status Siswa</h3>
                <p className="text-xs text-gray-400 mt-0.5">Total pembayaran siswa Aktif vs Lulus vs Keluar</p>
              </div>
              <select className="input-field w-auto text-sm py-1.5" value={tahunPerbandingan}
                onChange={e => {
                  setTahunPerbandingan(e.target.value)
                  getPerbandinganStatus({ tahun: e.target.value }).then(r => setPerbandinganStatus(r.data)).catch(() => {})
                }}>
                {['2024', '2025', '2026'].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {(() => {
              const ps = perbandinganStatus?.data || []
              const hasData = ps.some(d => d.total > 0)
              return hasData ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={ps} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 13, fontWeight: 500 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => `${(val / 1000000).toFixed(1)}jt`} />
                    <Tooltip
                      formatter={(val) => formatRupiah(val)}
                      labelFormatter={(label) => `Status: ${label}`}
                    />
                    <Bar dataKey="total" name="Total Pembayaran" radius={[8, 8, 0, 0]} maxBarSize={60}>
                      {ps.map((entry, i) => (
                        <Cell key={i} fill={entry.color || '#16a34a'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-[280px] text-gray-400">
                  <TrendingUp className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">Belum ada data pembayaran untuk tahun {tahunPerbandingan}</p>
                </div>
              )
            })()}
          </div>

          {rekap && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="card">
                <h3 className="font-semibold text-gray-800 mb-4">Distribusi Pembayaran</h3>
                {rekap.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={rekap.data} dataKey="total" nameKey="nama_pembayaran" cx="50%" cy="50%" outerRadius={100}
                        label={({ nama_pembayaran, percent }) => `${(percent * 100).toFixed(0)}%`}>
                        {rekap.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(val) => formatRupiah(val)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">Belum ada data</div>
                )}
              </div>

              {/* Rekap Table */}
              <div className="card p-0 overflow-hidden">
                <h3 className="font-semibold text-gray-800 p-4 border-b border-gray-100">Detail Rekapitulasi</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">Jenis Pembayaran</th>
                        <th className="table-header text-right">Jumlah</th>
                        <th className="table-header text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rekap.data.length === 0 ? (
                        <tr><td colSpan="3" className="text-center py-8 text-gray-400">Belum ada data</td></tr>
                      ) : rekap.data.map((d, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="table-cell">{d.nama_pembayaran}</td>
                          <td className="table-cell text-right">{d.jumlah_transaksi}x</td>
                          <td className="table-cell text-right font-semibold">{formatRupiah(d.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-800">Grand Total</td>
                        <td></td>
                        <td className="px-4 py-3 text-right font-bold text-annajah-600 text-lg">
                          {formatRupiah(rekap.grand_total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Per Bulan */}
      {tab === 'perbulan' && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex flex-wrap items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400 shrink-0" />
              <select className="input-field w-auto" value={tahun} onChange={e => { setTahun(e.target.value); setLoading(true); }}>
                {['2024', '2025', '2026'].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select className="input-field w-auto" value={filterJenisPerBulan}
                onChange={e => setFilterJenisPerBulan(e.target.value)}>
                <option value="">Semua Transaksi</option>
                <option value="Masuk">Masuk (Pemasukan)</option>
                <option value="Keluar">Keluar (Pengeluaran)</option>
              </select>
              <button onClick={() => { setLoading(true); loadPerBulan() }} className="btn-primary text-sm py-2">Tampilkan</button>
              {perBulan && (
                <ExportBtns onExcel={handleExportPerBulan} onPdf={handlePdfPerBulan} loading={exporting} />
              )}
              {perBulan && (
                <button onClick={() => {
                  const params = { tahun }
                  if (filterJenisPerBulan) params.jenis_transaksi = filterJenisPerBulan
                  setEmailModal({ open: true, jenis: 'per-bulan', params, label: 'Per Bulan ' + tahun })
                }}
                  className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2">
                  <Send className="w-3.5 h-3.5 text-annajah-600" /> Email
                </button>
              )}
            </div>
          </div>

          {perBulan && (
            <>
              <div className="card">
                <h3 className="font-semibold text-gray-800 mb-4">Grafik Pembayaran {tahun}</h3>
                {perBulan.data.some(d => d.total > 0) ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={perBulan.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="bulan" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => `${(val / 1000000).toFixed(1)}jt`} />
                      <Tooltip formatter={(val) => formatRupiah(val)} />
                      <Bar dataKey="total" fill="#16a34a" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[350px] text-gray-400 text-sm">Belum ada data transaksi di tahun {tahun}</div>
                )}
              </div>

              <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">Bulan</th>
                        <th className="table-header text-right">Jumlah Transaksi</th>
                        <th className="table-header text-right">Total Pembayaran</th>
                      </tr>
                    </thead>
                    <tbody>
                      {perBulan.data.map((d, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="table-cell font-medium">{d.bulan}</td>
                          <td className="table-cell text-right">{d.jumlah_transaksi}</td>
                          <td className="table-cell text-right font-semibold">{formatRupiah(d.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td className="px-4 py-3 font-semibold">Total</td>
                        <td className="px-4 py-3 text-right font-semibold">{perBulan.data.reduce((s, d) => s + d.jumlah_transaksi, 0)}</td>
                        <td className="px-4 py-3 text-right font-bold text-annajah-600">{formatRupiah(perBulan.grand_total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Per Siswa */}
      {tab === 'persiswa' && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-[2]">
                <label className="block text-sm font-medium text-gray-600 mb-1">Pilih Siswa</label>
                <div className="flex gap-2">
                  <select className="input-field flex-1" value={selectedSiswa}
                    onChange={e => { setSelectedSiswa(e.target.value); setLaporanSiswa(null); }}>
                    <option value="">Pilih Siswa</option>
                    {siswa.map(s => (
                      <option key={s.id} value={s.id}>{s.nis} - {s.nama}</option>
                    ))}
                  </select>
                  <div className="relative w-36">
                    <select className="input-field pl-9" value={filterStatus}
                      onChange={e => {
                        setFilterStatus(e.target.value)
                        setSelectedSiswa('')
                        setLaporanSiswa(null)
                        loadSiswaList(e.target.value)
                      }}>
                      <option value="">Semua Status</option>
                      <option value="aktif">Aktif</option>
                      <option value="lulus">Lulus</option>
                      <option value="keluar">Keluar</option>
                    </select>
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-[110px]">
                <label className="block text-sm font-medium text-gray-600 mb-1">Dari Tanggal</label>
                <input type="date" className="input-field" value={dateRangeSiswa.tanggal_awal}
                  onChange={e => setDateRangeSiswa({ ...dateRangeSiswa, tanggal_awal: e.target.value })} />
              </div>
              <div className="flex-1 min-w-[110px]">
                <label className="block text-sm font-medium text-gray-600 mb-1">Sampai Tanggal</label>
                <input type="date" className="input-field" value={dateRangeSiswa.tanggal_akhir}
                  onChange={e => setDateRangeSiswa({ ...dateRangeSiswa, tanggal_akhir: e.target.value })} />
              </div>
              <div className="w-36">
                <label className="block text-sm font-medium text-gray-600 mb-1">Jenis Transaksi</label>
                <select className="input-field" value={filterJenisPerSiswa}
                  onChange={e => setFilterJenisPerSiswa(e.target.value)}>
                  <option value="">Semua</option>
                  <option value="Masuk">Masuk</option>
                  <option value="Keluar">Keluar</option>
                </select>
              </div>
              <button onClick={loadLaporanSiswa} className="btn-primary flex items-center gap-2 sm:mt-6">
                <Search className="w-4 h-4" /> Cari
              </button>
              {laporanSiswa && (
                <ExportBtns onExcel={handleExportSiswa} onPdf={handlePdfSiswa} loading={exporting} />
              )}
              {laporanSiswa && (
                <button onClick={() => {
                  const params = { id_siswa: selectedSiswa }
                  if (filterJenisPerSiswa) params.jenis_transaksi = filterJenisPerSiswa
                  setEmailModal({ open: true, jenis: 'siswa', params, label: 'Riwayat Siswa' })
                }}
                  className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2">
                  <Send className="w-3.5 h-3.5 text-annajah-600" /> Email
                </button>
              )}
            </div>
          </div>

          {laporanSiswa && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">
                  Riwayat Pembayaran {laporanSiswa.data[0]?.nama_siswa || ''}
                </h3>
                <p className="text-sm text-gray-500">
                  Total: <span className="font-bold text-annajah-600">{formatRupiah(laporanSiswa.total_bayar)}</span>
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-header">Tanggal</th>
                      <th className="table-header">Jenis Pembayaran</th>
                      <th className="table-header">Bulan</th>
                      <th className="table-header text-right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {laporanSiswa.data.length === 0 ? (
                      <tr><td colSpan="4" className="text-center py-8 text-gray-400">Belum ada transaksi</td></tr>
                    ) : laporanSiswa.data.map((t, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="table-cell">{new Date(t.tanggal_bayar).toLocaleDateString('id-ID')}</td>
                        <td className="table-cell">{t.nama_pembayaran}</td>
                        <td className="table-cell">{t.bulan_bayar || '-'}</td>
                        <td className="table-cell text-right font-semibold">{formatRupiah(t.jumlah_bayar)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Wali Kelas */}
      {tab === 'walikelas' && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Daftar Wali Kelas per Tingkat</h2>
                <p className="text-sm text-gray-400 mt-0.5">Rekapitulasi wali kelas beserta jumlah siswa per kelas</p>
              </div>
              <div className="flex gap-2">
                {waliKelasData && (
                  <>
                    <button onClick={handleExportWaliKelasExcel} disabled={exporting}
                      className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
                      {exporting ? '...' : 'Excel'}
                    </button>
                    <button onClick={handleExportWaliKelasPdf} disabled={exporting}
                      className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2">
                      <FileText className="w-3.5 h-3.5 text-red-500" />
                      {exporting ? '...' : 'PDF'}
                    </button>
                  </>
                )}
                <button
                  onClick={loadWaliKelas}
                  className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="space-y-6 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="space-y-3">
                    <div className="h-5 bg-gray-200 rounded w-24" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[1, 2].map(j => (
                        <div key={j} className="h-28 bg-gray-100 rounded-xl" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : waliKelasData?.data?.length > 0 ? (
              <div className="space-y-6">
                {waliKelasData.data.map((tingkatGroup) => (
                  <div key={tingkatGroup.tingkat}>
                    {/* Tingkat Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tingkatColors[tingkatGroup.tingkat] || 'from-gray-500 to-gray-600'} flex items-center justify-center shadow-sm`}>
                        <GraduationCap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800 text-base">
                          {tingkatLabels[tingkatGroup.tingkat] || `Tingkat ${tingkatGroup.tingkat}`}
                        </h3>
                        <p className="text-xs text-gray-400">
                          {tingkatGroup.total_kelas} kelas · {tingkatGroup.total_siswa} siswa
                        </p>
                      </div>
                    </div>

                    {/* Class Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {tingkatGroup.kelas.map((kls) => (
                        <div
                          key={kls.id}
                          className={`card border ${tingkatBgColors[tingkatGroup.tingkat] || 'bg-gray-50 border-gray-200'} hover:shadow-md transition-all duration-200`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <School className={`w-4 h-4 ${tingkatGroup.tingkat === 'X' ? 'text-blue-500' : tingkatGroup.tingkat === 'XI' ? 'text-emerald-500' : 'text-purple-500'}`} />
                              <h4 className="font-bold text-gray-800 text-sm">{kls.nama_kelas}</h4>
                            </div>
                            <span className="text-xs font-semibold text-gray-500 bg-white/80 px-2 py-0.5 rounded-full">
                              {kls.jumlah_siswa} siswa
                            </span>
                          </div>

                          <div className="border-t border-white/60 pt-2.5">
                            <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-1.5">Wali Kelas</p>
                            <WaliCard guru={kls.wali} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <School className="w-16 h-16 mb-4 opacity-20" />
                <h3 className="text-lg font-semibold text-gray-500">Belum Ada Data Wali Kelas</h3>
                <p className="text-sm mt-1 text-center max-w-md">
                  Belum ada kelas yang memiliki wali kelas. Tetapkan wali kelas di menu Kelas untuk menampilkan laporan ini.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Kehadiran */}
      {tab === 'kehadiran' && (
        <div className="space-y-6">
          {/* Filter */}
          <div className="card">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[120px]">
                <label className="block text-sm font-medium text-gray-600 mb-1">Dari Tanggal</label>
                <input type="date" className="input-field" value={filterKehadiranTanggalAwal}
                  onChange={e => setFilterKehadiranTanggalAwal(e.target.value)} />
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="block text-sm font-medium text-gray-600 mb-1">Sampai Tanggal</label>
                <input type="date" className="input-field" value={filterKehadiranTanggalAkhir}
                  onChange={e => setFilterKehadiranTanggalAkhir(e.target.value)} />
              </div>
              <div className="w-full sm:w-44">
                <label className="block text-sm font-medium text-gray-600 mb-1">Kelas</label>
                <select className="input-field" value={filterKehadiranKelas}
                  onChange={e => setFilterKehadiranKelas(e.target.value)}>
                  <option value="">Semua Kelas</option>
                  {kelasList.map(k => (
                    <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                  ))}
                </select>
              </div>
              <button onClick={() => { setLoading(true); loadKehadiranRekap() }} className="btn-primary flex items-center gap-2">
                <Search className="w-4 h-4" /> Tampilkan
              </button>
              {kehadiranRekap && !loadingKehadiran && (
                <>
                  <button onClick={handleExportKehadiranKelas} disabled={exporting}
                    className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
                    {exporting ? '...' : 'Excel K'}
                  </button>
                  <button onClick={handlePdfKehadiranKelas} disabled={exporting}
                    className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2">
                    <FileText className="w-3.5 h-3.5 text-red-500" />
                    {exporting ? '...' : 'PDF K'}
                  </button>
                  <button onClick={handleExportKehadiranSiswa} disabled={exporting}
                    className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
                    {exporting ? '...' : 'Excel S'}
                  </button>
                  <button onClick={handlePdfKehadiranSiswa} disabled={exporting}
                    className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2">
                    <FileText className="w-3.5 h-3.5 text-red-500" />
                    {exporting ? '...' : 'PDF S'}
                  </button>
                </>
              )}
              {(filterKehadiranTanggalAwal || filterKehadiranTanggalAkhir || filterKehadiranKelas) && (
                <button onClick={() => {
                  setFilterKehadiranTanggalAwal('')
                  setFilterKehadiranTanggalAkhir(new Date().toISOString().split('T')[0])
                  setFilterKehadiranKelas('')
                }} className="btn-secondary text-sm">Reset</button>
              )}
            </div>
          </div>

          {/* Ringkasan Cards */}
          {!loadingKehadiran && kehadiranRekap?.grand_total && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Hadir', value: kehadiranRekap.grand_total.hadir, icon: UserCheck, color: 'green' },
                { label: 'Ijin', value: kehadiranRekap.grand_total.ijin, icon: Clock, color: 'yellow' },
                { label: 'Sakit', value: kehadiranRekap.grand_total.sakit, icon: Activity, color: 'blue' },
                { label: 'Alpa', value: kehadiranRekap.grand_total.alpa, icon: AlertCircle, color: 'red' },
              ].map(c => {
                const colorMap = {
                  green: 'from-green-50 to-green-100/50 border-green-200 text-green-700',
                  yellow: 'from-yellow-50 to-yellow-100/50 border-yellow-200 text-yellow-700',
                  blue: 'from-blue-50 to-blue-100/50 border-blue-200 text-blue-700',
                  red: 'from-red-50 to-red-100/50 border-red-200 text-red-700',
                }
                const bgMap = {
                  green: 'bg-green-200/60',
                  yellow: 'bg-yellow-200/60',
                  blue: 'bg-blue-200/60',
                  red: 'bg-red-200/60',
                }
                const Icon = c.icon
                const pct = kehadiranRekap.grand_total.total > 0
                  ? ((c.value / kehadiranRekap.grand_total.total) * 100).toFixed(1)
                  : 0
                return (
                  <div key={c.label} className={`rounded-xl border bg-gradient-to-br ${colorMap[c.color]} p-4 transition-all duration-200 hover:shadow-md`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider opacity-75">{c.label}</span>
                      <div className={`w-8 h-8 rounded-lg ${bgMap[c.color]} flex items-center justify-center`}>
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold">{c.value}</p>
                    <p className="text-xs opacity-60 mt-1">{pct}% dari total</p>
                  </div>
                )
              })}
            </div>
          )}

          {loadingKehadiran ? (
            <div className="card">
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-annajah-600"></div>
              </div>
            </div>
          ) : kehadiranRekap?.data?.length > 0 ? (
            <>
              {/* Chart Rekap per Kelas */}
              <div className="card">
                <h3 className="font-semibold text-gray-800 mb-4">Grafik Kehadiran per Kelas</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={kehadiranRekap.data} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="nama_kelas" tick={{ fontSize: 12, fontWeight: 500 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="hadir" name="Hadir" fill="#16a34a" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="ijin" name="Ijin" fill="#eab308" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="sakit" name="Sakit" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="alpa" name="Alpa" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tabel Rekap per Kelas */}
              <div className="card p-0 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">Rekap Kehadiran per Kelas</h3>
                  <span className="badge badge-info text-xs">
                    {kehadiranRekap.grand_total?.total || 0} total
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">Kelas</th>
                        <th className="table-header text-center">Tingkat</th>
                        <th className="table-header text-center text-green-700">Hadir</th>
                        <th className="table-header text-center text-yellow-700">Ijin</th>
                        <th className="table-header text-center text-blue-700">Sakit</th>
                        <th className="table-header text-center text-red-700">Alpa</th>
                        <th className="table-header text-center">Total</th>
                        <th className="table-header text-center">Kehadiran</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kehadiranRekap.data.map((row, i) => {
                        const pct = row.total > 0 ? ((row.hadir / row.total) * 100).toFixed(1) : 0
                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="table-cell font-medium">{row.nama_kelas}</td>
                            <td className="table-cell text-center text-gray-500">
                              {row.tingkat === '10' ? 'X' : row.tingkat === '11' ? 'XI' : row.tingkat === '12' ? 'XII' : row.tingkat}
                            </td>
                            <td className="table-cell text-center font-semibold text-green-700">{row.hadir}</td>
                            <td className="table-cell text-center text-yellow-700">{row.ijin}</td>
                            <td className="table-cell text-center text-blue-700">{row.sakit}</td>
                            <td className="table-cell text-center text-red-700">{row.alpa}</td>
                            <td className="table-cell text-center font-medium">{row.total}</td>
                            <td className="table-cell text-center">
                              <div className="flex items-center gap-2 justify-center">
                                <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-semibold ${
                                  pct >= 80 ? 'text-green-700' : pct >= 60 ? 'text-yellow-700' : 'text-red-700'
                                }`}>{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-800">Grand Total</td>
                        <td></td>
                        <td className="px-4 py-3 text-center font-semibold text-green-700">{kehadiranRekap.grand_total?.hadir || 0}</td>
                        <td className="px-4 py-3 text-center font-semibold text-yellow-700">{kehadiranRekap.grand_total?.ijin || 0}</td>
                        <td className="px-4 py-3 text-center font-semibold text-blue-700">{kehadiranRekap.grand_total?.sakit || 0}</td>
                        <td className="px-4 py-3 text-center font-semibold text-red-700">{kehadiranRekap.grand_total?.alpa || 0}</td>
                        <td className="px-4 py-3 text-center font-bold text-gray-800">{kehadiranRekap.grand_total?.total || 0}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Tabel Rekap per Siswa */}
              {kehadiranSiswa?.data?.length > 0 && (
                <div className="card p-0 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-800">Rekap Kehadiran per Siswa</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {kehadiranSiswa.data.length} siswa — Diurutkan berdasarkan kelas
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="table-header">No</th>
                          <th className="table-header">Nama Siswa</th>
                          <th className="table-header">NIS</th>
                          <th className="table-header">Kelas</th>
                          <th className="table-header text-center text-green-700">Hadir</th>
                          <th className="table-header text-center text-yellow-700">Ijin</th>
                          <th className="table-header text-center text-blue-700">Sakit</th>
                          <th className="table-header text-center text-red-700">Alpa</th>
                          <th className="table-header text-center">Kehadiran</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kehadiranSiswa.data.map((row, i) => {
                          const totalRow = row.hadir + row.ijin + row.sakit + row.alpa
                          const pct = totalRow > 0 ? ((row.hadir / totalRow) * 100).toFixed(1) : 0
                          return (
                            <tr key={row.id_siswa} className="hover:bg-gray-50">
                              <td className="table-cell text-gray-400 text-xs">{i + 1}</td>
                              <td className="table-cell font-medium">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                                    {row.foto ? (
                                      <img src={`/uploads/siswa/${row.foto}`} alt="" className="w-full h-full object-cover"
                                        onError={(e) => { e.target.style.display = 'none' }} />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">
                                        {row.nama_siswa?.charAt(0) || '?'}
                                      </div>
                                    )}
                                  </div>
                                  <span className="truncate">{row.nama_siswa}</span>
                                </div>
                              </td>
                              <td className="table-cell text-gray-500 font-mono text-xs">{row.nis}</td>
                              <td className="table-cell text-gray-500">{row.nama_kelas || '-'}</td>
                              <td className="table-cell text-center font-semibold text-green-700">{row.hadir}</td>
                              <td className="table-cell text-center text-yellow-700">{row.ijin}</td>
                              <td className="table-cell text-center text-blue-700">{row.sakit}</td>
                              <td className="table-cell text-center text-red-700">{row.alpa}</td>
                              <td className="table-cell text-center">
                                <div className="flex items-center gap-2 justify-center">
                                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${Math.min(pct, 100)}%` }}
                                    />
                                  </div>
                                  <span className={`text-xs font-semibold ${
                                    pct >= 80 ? 'text-green-700' : pct >= 60 ? 'text-yellow-700' : 'text-red-700'
                                  }`}>{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : !loadingKehadiran ? (
            <div className="card">
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Calendar className="w-14 h-14 mb-3 opacity-30" />
                <p className="text-sm font-medium text-gray-500">Belum ada data kehadiran</p>
                <p className="text-xs text-gray-300 mt-1">
                  Atur filter tanggal dan kelas, atau tambah data kehadiran terlebih dahulu
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Tab: Ringkasan Keuangan */}
      {tab === 'ringkasan' && (
        <div className="space-y-6">
          {/* Filter */}
          <div className="card">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[120px]">
                <label className="block text-sm font-medium text-gray-600 mb-1">Dari Tanggal</label>
                <input type="date" className="input-field" value={ringkasanDateRange.tanggal_awal}
                  onChange={e => setRingkasanDateRange({ ...ringkasanDateRange, tanggal_awal: e.target.value })} />
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="block text-sm font-medium text-gray-600 mb-1">Sampai Tanggal</label>
                <input type="date" className="input-field" value={ringkasanDateRange.tanggal_akhir}
                  onChange={e => setRingkasanDateRange({ ...ringkasanDateRange, tanggal_akhir: e.target.value })} />
              </div>
              <div className="w-full sm:w-44">
                <label className="block text-sm font-medium text-gray-600 mb-1">Jenis Pembayaran</label>
                <select className="input-field" value={ringkasanFilterJenis}
                  onChange={e => setRingkasanFilterJenis(e.target.value)}>
                  <option value="">Semua Pembayaran</option>
                  {jenisPembayaranList.map(jp => (
                    <option key={jp.id} value={jp.id}>{jp.nama_pembayaran}</option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-36">
                <label className="block text-sm font-medium text-gray-600 mb-1">Grup Per</label>
                <select className="input-field" value={ringkasanGrup}
                  onChange={e => setRingkasanGrup(e.target.value)}>
                  <option value="hari">Per Hari</option>
                  <option value="bulan">Per Bulan</option>
                  <option value="tahun">Per Tahun</option>
                </select>
              </div>
              <button onClick={loadRingkasanKeuangan} className="btn-primary flex items-center gap-2">
                <Search className="w-4 h-4" /> Tampilkan
              </button>
              {ringkasanKeuangan && (
                <>
                  <button onClick={handleExportRingkasanExcel} disabled={exporting}
                    className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
                    {exporting ? '...' : 'Excel'}
                  </button>
                  <button onClick={handleExportRingkasanPdf} disabled={exporting}
                    className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2">
                    <FileText className="w-3.5 h-3.5 text-red-500" />
                    {exporting ? '...' : 'PDF'}
                  </button>
                  <button onClick={handlePrint} className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2">
                    <Printer className="w-3.5 h-3.5" /> Cetak
                  </button>
                </>
              )}
            </div>
          </div>

          {loadingRingkasan ? (
            <div className="card">
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-annajah-600"></div>
              </div>
            </div>
          ) : ringkasanKeuangan?.data?.length > 0 ? (
            <>
              {/* Grafik Bar */}
              <div className="card">
                <h3 className="font-semibold text-gray-800 mb-4">
                  Grafik Pemasukan & Pengeluaran
                  {ringkasanGrup === 'hari' ? ' (Per Hari)' : ringkasanGrup === 'tahun' ? ' (Per Tahun)' : ' (Per Bulan)'}
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={ringkasanKeuangan.data} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="periode" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => `${(val / 1000000).toFixed(1)}jt`} />
                    <Tooltip
                      formatter={(val, name) => {
                        const labels = { pemasukan: 'Pemasukan', pengeluaran: 'Pengeluaran', selisih: 'Selisih' }
                        return [formatRupiah(val), labels[name] || name]
                      }}
                      labelFormatter={(label) => `Periode: ${label}`}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="pemasukan" name="Pemasukan" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart Distribusi */}
              <div className="card">
                <h3 className="font-semibold text-gray-800 mb-4">Distribusi Pemasukan vs Pengeluaran</h3>
                {(() => {
                  const gt = ringkasanKeuangan.grand_total
                  const total = (gt.pemasukan || 0) + (gt.pengeluaran || 0)
                  if (total === 0) {
                    return (
                      <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">Belum ada data</div>
                    )
                  }
                  const pieData = [
                    { name: 'Pemasukan', value: gt.pemasukan || 0, color: '#16a34a' },
                    { name: 'Pengeluaran', value: gt.pengeluaran || 0, color: '#ef4444' },
                  ]
                  const pctMasuk = ((gt.pemasukan || 0) / total * 100).toFixed(1)
                  const pctKeluar = ((gt.pengeluaran || 0) / total * 100).toFixed(1)
                  return (
                    <>
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={110}
                            paddingAngle={4}
                            strokeWidth={2}
                            stroke="#fff"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {pieData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val) => formatRupiah(val)}
                            labelFormatter={(label) => `Jenis: ${label}`}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-2 gap-4 mt-4 max-w-md mx-auto">
                        <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                          <p className="text-2xl font-bold text-green-700">{pctMasuk}%</p>
                          <p className="text-xs text-green-600 font-medium mt-1">Pemasukan</p>
                          <p className="text-sm text-green-600 font-semibold mt-0.5">{formatRupiah(gt.pemasukan)}</p>
                        </div>
                        <div className="bg-red-50 rounded-xl p-4 text-center border border-red-100">
                          <p className="text-2xl font-bold text-red-700">{pctKeluar}%</p>
                          <p className="text-xs text-red-600 font-medium mt-1">Pengeluaran</p>
                          <p className="text-sm text-red-600 font-semibold mt-0.5">{formatRupiah(gt.pengeluaran)}</p>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>

              {/* Tabel */}
              <div className="card p-0 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800">Detail Pemasukan & Pengeluaran</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {ringkasanGrup === 'hari' ? 'Per Hari' : ringkasanGrup === 'tahun' ? 'Per Tahun' : 'Per Bulan'}
                      {ringkasanDateRange.tanggal_awal && ` — ${new Date(ringkasanDateRange.tanggal_awal).toLocaleDateString('id-ID')}`}
                      {ringkasanDateRange.tanggal_akhir && ` s.d. ${new Date(ringkasanDateRange.tanggal_akhir).toLocaleDateString('id-ID')}`}
                    </p>
                  </div>
                  <span className="badge badge-info text-xs">
                    {ringkasanKeuangan.data.length} periode
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">Periode</th>
                        <th className="table-header text-right text-green-700">Pemasukan</th>
                        <th className="table-header text-right text-red-700">Pengeluaran</th>
                        <th className="table-header text-right">Selisih</th>
                        <th className="table-header text-center">Transaksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ringkasanKeuangan.data.map((d, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="table-cell font-medium">{d.periode}</td>
                          <td className="table-cell text-right font-semibold text-green-700">{formatRupiah(d.pemasukan)}</td>
                          <td className="table-cell text-right font-semibold text-red-700">{formatRupiah(d.pengeluaran)}</td>
                          <td className={`table-cell text-right font-semibold ${
                            d.selisih >= 0 ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {d.selisih >= 0 ? '+' : ''}{formatRupiah(d.selisih)}
                          </td>
                          <td className="table-cell text-center text-gray-500 text-sm">
                            <span className="text-green-700 font-medium">{d.jumlah_pemasukan}</span> Masuk / <span className="text-red-700 font-medium">{d.jumlah_pengeluaran}</span> Keluar
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-800">Grand Total</td>
                        <td className="px-4 py-3 text-right font-bold text-green-700">
                          {formatRupiah(ringkasanKeuangan.grand_total.pemasukan)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-red-700">
                          {formatRupiah(ringkasanKeuangan.grand_total.pengeluaran)}
                        </td>
                        <td className={`px-4 py-3 text-right font-bold ${
                          ringkasanKeuangan.grand_total.selisih >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {ringkasanKeuangan.grand_total.selisih >= 0 ? '+' : ''}
                          {formatRupiah(ringkasanKeuangan.grand_total.selisih)}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-gray-800">
                          {ringkasanKeuangan.grand_total.total_transaksi}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          ) : !loadingRingkasan ? (
            <div className="card">
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <TrendingUp className="w-14 h-14 mb-3 opacity-30" />
                <p className="text-sm font-medium text-gray-500">Belum ada data transaksi</p>
                <p className="text-xs text-gray-300 mt-1">Atur filter tanggal dan klik Tampilkan</p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Tab: Transaksi Gabungan */}
      {tab === 'transaksigabungan' && (
        <div className="space-y-6">
          {/* Filter */}
          <div className="card">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[120px]">
                <label className="block text-sm font-medium text-gray-600 mb-1">Dari Tanggal</label>
                <input type="date" className="input-field" value={gabunganDateRange.tanggal_awal}
                  onChange={e => setGabunganDateRange({ ...gabunganDateRange, tanggal_awal: e.target.value })} />
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="block text-sm font-medium text-gray-600 mb-1">Sampai Tanggal</label>
                <input type="date" className="input-field" value={gabunganDateRange.tanggal_akhir}
                  onChange={e => setGabunganDateRange({ ...gabunganDateRange, tanggal_akhir: e.target.value })} />
              </div>
              <div className="w-full sm:w-44">
                <label className="block text-sm font-medium text-gray-600 mb-1">Jenis Pembayaran</label>
                <select className="input-field" value={gabunganFilterJenis}
                  onChange={e => setGabunganFilterJenis(e.target.value)}>
                  <option value="">Semua Pembayaran</option>
                  {jenisPembayaranList.map(jp => (
                    <option key={jp.id} value={jp.id}>{jp.nama_pembayaran}</option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-36">
                <label className="block text-sm font-medium text-gray-600 mb-1">Jenis Transaksi</label>
                <select className="input-field" value={gabunganFilterJenisTransaksi}
                  onChange={e => setGabunganFilterJenisTransaksi(e.target.value)}>
                  <option value="">Semua</option>
                  <option value="Masuk">Masuk</option>
                  <option value="Keluar">Keluar</option>
                </select>
              </div>
              <div className="flex-1 min-w-[140px]">
                <label className="block text-sm font-medium text-gray-600 mb-1">Cari Siswa</label>
                <input type="text" className="input-field" placeholder="Nama / NIS..." value={gabunganSearch}
                  onChange={e => setGabunganSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadTransaksiGabungan()} />
              </div>
              <button onClick={loadTransaksiGabungan} className="btn-primary flex items-center gap-2">
                <Search className="w-4 h-4" /> Tampilkan
              </button>
              {transaksiGabungan && (
                <>
                  <button onClick={handleExportGabunganExcel} disabled={exporting}
                    className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
                    {exporting ? '...' : 'Excel'}
                  </button>
                  <button onClick={handleExportGabunganPdf} disabled={exporting}
                    className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-2">
                    <FileText className="w-3.5 h-3.5 text-red-500" />
                    {exporting ? '...' : 'PDF'}
                  </button>
                </>
              )}
            </div>
          </div>

          {loadingGabungan ? (
            <div className="card">
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-annajah-600"></div>
              </div>
            </div>
          ) : transaksiGabungan?.data?.length > 0 ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Masuk', value: transaksiGabungan.ringkasan.total_masuk, icon: TrendingDown, color: 'green' },                    { label: 'Total Keluar', value: transaksiGabungan.ringkasan.total_keluar, icon: TrendingUp, color: 'red' },
                  {
                    label: 'Selisih',
                    value: transaksiGabungan.ringkasan.selisih,
                    icon: ArrowLeftRight,
                    color: transaksiGabungan.ringkasan.selisih >= 0 ? 'green' : 'red',
                  },
                  { label: 'Total Transaksi', value: transaksiGabungan.total_transaksi, icon: FileText, color: 'blue' },
                ].map(c => {
                  const colorMap = {
                    green: 'from-green-50 to-green-100/50 border-green-200 text-green-700',
                    red: 'from-red-50 to-red-100/50 border-red-200 text-red-700',
                    blue: 'from-blue-50 to-blue-100/50 border-blue-200 text-blue-700',
                  }
                  const bgMap = {
                    green: 'bg-green-200/60',
                    red: 'bg-red-200/60',
                    blue: 'bg-blue-200/60',
                  }
                  const Icon = c.icon
                  return (
                    <div key={c.label} className={`rounded-xl border bg-gradient-to-br ${colorMap[c.color]} p-4 transition-all duration-200 hover:shadow-md`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider opacity-75">{c.label}</span>
                        <div className={`w-8 h-8 rounded-lg ${bgMap[c.color]} flex items-center justify-center`}>
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold">
                        {c.label === 'Total Transaksi' ? c.value : formatRupiah(c.value)}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Ringkasan Masuk & Keluar */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-green-700">Masuk</span>
                    <span className="text-sm font-bold text-green-700">{transaksiGabungan.ringkasan.jumlah_masuk} transaksi</span>
                  </div>
                  <p className="text-lg font-bold text-green-700">{formatRupiah(transaksiGabungan.ringkasan.total_masuk)}</p>
                  <div className="mt-2 w-full h-2 bg-green-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${transaksiGabungan.ringkasan.total_masuk + transaksiGabungan.ringkasan.total_keluar > 0
                          ? (transaksiGabungan.ringkasan.total_masuk / (transaksiGabungan.ringkasan.total_masuk + transaksiGabungan.ringkasan.total_keluar)) * 100
                          : 50}%`
                      }} />
                  </div>
                </div>
                <div className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-red-700">Keluar</span>
                    <span className="text-sm font-bold text-red-700">{transaksiGabungan.ringkasan.jumlah_keluar} transaksi</span>
                  </div>
                  <p className="text-lg font-bold text-red-700">{formatRupiah(transaksiGabungan.ringkasan.total_keluar)}</p>
                  <div className="mt-2 w-full h-2 bg-red-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${transaksiGabungan.ringkasan.total_masuk + transaksiGabungan.ringkasan.total_keluar > 0
                          ? (transaksiGabungan.ringkasan.total_keluar / (transaksiGabungan.ringkasan.total_masuk + transaksiGabungan.ringkasan.total_keluar)) * 100
                          : 50}%`
                      }} />
                  </div>
                </div>
              </div>

              {/* Tabel Detail Transaksi */}
              <div className="card p-0 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800">Detail Transaksi Masuk & Keluar</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {transaksiGabungan.total_transaksi} transaksi ditemukan
                      {gabunganDateRange.tanggal_awal && ` — ${new Date(gabunganDateRange.tanggal_awal).toLocaleDateString('id-ID')}`}
                      {gabunganDateRange.tanggal_akhir && ` s.d. ${new Date(gabunganDateRange.tanggal_akhir).toLocaleDateString('id-ID')}`}
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">Tanggal</th>
                        <th className="table-header">Jenis</th>
                        <th className="table-header">Siswa</th>
                        <th className="table-header">NIS</th>
                        <th className="table-header">Pembayaran</th>
                        <th className="table-header">Keterangan</th>
                        <th className="table-header">Petugas</th>
                        <th className="table-header text-right">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transaksiGabungan.data.map((t, i) => (
                        <tr key={t.id || i} className="hover:bg-gray-50 transition-colors">
                          <td className="table-cell text-sm whitespace-nowrap">
                            {new Date(t.tanggal_bayar).toLocaleDateString('id-ID')}
                          </td>
                          <td className="table-cell">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              t.jenis_transaksi === 'Masuk'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {t.jenis_transaksi === 'Masuk' ? (
                                <TrendingDown className="w-3 h-3" />
                              ) : (
                                <TrendingUp className="w-3 h-3" />
                              )}
                              {t.jenis_transaksi}
                            </span>
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              {t.nama_siswa ? (
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold shrink-0">
                                  {t.nama_siswa.charAt(0).toUpperCase()}
                                </div>
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-amber-600 text-xs font-bold shrink-0">
                                  N
                                </div>
                              )}
                              <span className={t.nama_siswa ? '' : 'text-gray-400 italic'}>
                                {t.nama_siswa || 'Non-Siswa'}
                              </span>
                            </div>
                          </td>
                          <td className="table-cell text-gray-500 font-mono text-xs">{t.nis || '-'}</td>
                          <td className="table-cell">{t.nama_pembayaran}</td>
                          <td className="table-cell text-gray-500 text-sm max-w-[200px] truncate" title={t.keterangan}>
                            {t.keterangan || '-'}
                          </td>
                          <td className="table-cell text-gray-500 text-sm">{t.nama_user || '-'}</td>
                          <td className={`table-cell text-right font-semibold whitespace-nowrap ${
                            t.jenis_transaksi === 'Masuk' ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {t.jenis_transaksi === 'Masuk' ? '' : '-'}{formatRupiah(t.jumlah_bayar)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td colSpan="7" className="px-4 py-3 font-semibold text-gray-800">Grand Total</td>
                        <td className={`px-4 py-3 text-right font-bold ${
                          transaksiGabungan.ringkasan.selisih >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {transaksiGabungan.ringkasan.selisih >= 0 ? '+' : ''}
                          {formatRupiah(transaksiGabungan.ringkasan.total_masuk + transaksiGabungan.ringkasan.total_keluar)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          ) : !loadingGabungan ? (
            <div className="card">
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <ArrowLeftRight className="w-14 h-14 mb-3 opacity-30" />
                <p className="text-sm font-medium text-gray-500">Belum ada data transaksi</p>
                <p className="text-xs text-gray-300 mt-1">Atur filter tanggal dan klik Tampilkan</p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Kirim Email Modal */}
      <KirimEmail
        isOpen={emailModal.open}
        onClose={() => setEmailModal({ open: false, jenis: '', params: {}, label: '' })}
        jenis={emailModal.jenis}
        params={emailModal.params}
        label={emailModal.label}
      />
    </div>
  )
}
