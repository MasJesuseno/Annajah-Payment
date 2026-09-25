import { useState, useEffect } from 'react'
import {
  Calendar, Clock, Search, RefreshCw, Users, Hash, BarChart3, UserX, ArrowUpDown
} from 'lucide-react'
import { getRekapKehadiranKaryawan, downloadExcelRekapKehadiranKaryawan } from '../api'

function formatJam(jam) {
  if (!jam) return '-'
  return String(jam).slice(0, 5)
}

function toDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Default rentang tanggal: bulan berjalan
function getFirstDayOfMonth() {
  const now = new Date()
  return toDateStr(new Date(now.getFullYear(), now.getMonth(), 1))
}

function getLastDayOfMonth() {
  const now = new Date()
  return toDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0))
}

export default function RekapKehadiranGuru() {
  const [tanggalAwal, setTanggalAwal] = useState(getFirstDayOfMonth)
  const [tanggalAkhir, setTanggalAkhir] = useState(getLastDayOfMonth)
  const [nik, setNik] = useState('')
  const [nama, setNama] = useState('')
  // Urutan data pilihan: kolom (nik/nama) + arah (asc/desc)
  const [urut, setUrut] = useState('nama-asc')

  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const getFilter = () => ({
    tanggal_awal: tanggalAwal,
    tanggal_akhir: tanggalAkhir,
    nik: nik.trim(),
    nama: nama.trim(),
    urut,
  })

  const buildParams = (filter) => {
    const params = {}
    if (filter.tanggal_awal) params.tanggal_awal = filter.tanggal_awal
    if (filter.tanggal_akhir) params.tanggal_akhir = filter.tanggal_akhir
    if (filter.nik) params.nik = filter.nik
    if (filter.nama) params.nama = filter.nama

    const [kolomUrut, arahUrut] = String(filter.urut || 'nama-asc').split('-')
    params.urut = kolomUrut
    params.arah = arahUrut
    return params
  }

  const loadData = async (filter) => {
    try {
      setLoading(true)
      const res = await getRekapKehadiranKaryawan(buildParams(filter))
      setData(res.data.data || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      console.error(err)
      setData([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(getFilter())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFilter = () => loadData(getFilter())

  const handleReset = () => {
    setTanggalAwal('')
    setTanggalAkhir('')
    setNik('')
    setNama('')
    loadData({ tanggal_awal: '', tanggal_akhir: '', nik: '', nama: '', urut })
  }

  // Ganti urutan (berdasarkan NIK / Nama) langsung tanpa tombol Cari
  const handleUrutChange = (value) => {
    setUrut(value)
    loadData({ ...getFilter(), urut: value })
  }

  // Export data sesuai filter & urutan yang sedang aktif
  const handleExportExcel = async () => {
    try {
      const filter = getFilter()
      const res = await downloadExcelRekapKehadiranKaryawan(buildParams(filter))
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `rekap_kehadiran_karyawan_${filter.tanggal_awal || 'semua'}_${filter.tanggal_akhir || 'semua'}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert('Gagal export Excel')
    }
  }

  const hasFilter = tanggalAwal || tanggalAkhir || nik || nama

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleFilter()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-annajah-50 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-annajah-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Rekap Kehadiran Karyawan</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Jumlah kehadiran serta rata-rata jam masuk dan jam keluar karyawan
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button onClick={handleExportExcel} className="btn-secondary text-sm flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="8" y1="13" x2="16" y2="13" />
              <line x1="8" y1="17" x2="16" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Export Excel
          </button>
          <button onClick={() => loadData(getFilter())} className="btn-secondary text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-3 items-end">
          <div className="w-full lg:w-48">
            <label className="block text-xs font-medium text-gray-500 mb-1">Tanggal Awal</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={tanggalAwal}
                onChange={(e) => setTanggalAwal(e.target.value)}
                onKeyDown={handleKeyDown}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="w-full lg:w-48">
            <label className="block text-xs font-medium text-gray-500 mb-1">Tanggal Akhir</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={tanggalAkhir}
                onChange={(e) => setTanggalAkhir(e.target.value)}
                onKeyDown={handleKeyDown}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="w-full lg:w-48">
            <label className="block text-xs font-medium text-gray-500 mb-1">NIK</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={nik}
                onChange={(e) => setNik(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Cari NIK..."
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="w-full lg:w-56">
            <label className="block text-xs font-medium text-gray-500 mb-1">Nama</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Cari nama karyawan..."
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="w-full lg:w-56">
            <label className="block text-xs font-medium text-gray-500 mb-1">Urutkan Data</label>
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={urut}
                onChange={(e) => handleUrutChange(e.target.value)}
                className="input-field pl-10"
              >
                <option value="nama-asc">Nama (A - Z)</option>
                <option value="nama-desc">Nama (Z - A)</option>
                <option value="nik-asc">NIK (Naik)</option>
                <option value="nik-desc">NIK (Turun)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleFilter} className="btn-primary text-sm px-4 py-2.5">
              <Search className="w-4 h-4 inline mr-1" /> Cari
            </button>
            {hasFilter && (
              <button onClick={handleReset} className="btn-secondary text-sm px-4 py-2.5">
                Reset
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
          <BarChart3 className="w-3.5 h-3.5" />
          {loading ? 'Memuat data...' : `Menampilkan ${total} karyawan`}
          {hasFilter && !loading && (
            <span className="text-gray-300">
              • Filter: {tanggalAwal || '...'} s/d {tanggalAkhir || '...'}
              {nik && ` • NIK: ${nik}`}
              {nama && ` • Nama: ${nama}`}
            </span>
          )}
          {!loading && (
            <span className="text-gray-300">
              • Urutkan: {urut.startsWith('nik') ? 'NIK' : 'Nama'} ({urut.endsWith('desc') ? 'Turun' : urut.startsWith('nik') ? 'Naik' : 'A - Z'})
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <div className="col-span-1">No</div>
          <div className="col-span-2">NIK</div>
          <div className="col-span-3">Nama Karyawan</div>
          <div className="col-span-2 text-center">Jumlah Kehadiran</div>
          <div className="col-span-2 text-center">Rata-rata Jam Masuk</div>
          <div className="col-span-2 text-center">Rata-rata Jam Keluar</div>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-50">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 px-5 py-4 animate-pulse">
                <div className="col-span-1 h-4 bg-gray-200 rounded" />
                <div className="col-span-2 h-4 bg-gray-200 rounded" />
                <div className="col-span-3 h-4 bg-gray-200 rounded" />
                <div className="col-span-2 h-4 bg-gray-200 rounded" />
                <div className="col-span-2 h-4 bg-gray-200 rounded" />
                <div className="col-span-2 h-4 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <UserX className="w-14 h-14 mb-3 opacity-30" />
            <p className="text-sm font-medium text-gray-500">Tidak ada data kehadiran</p>
            <p className="text-xs text-gray-300 mt-1">Ubah rentang tanggal, NIK, atau nama untuk menampilkan data lain</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.map((item, idx) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-4 px-5 py-3.5 hover:bg-annajah-50/40 transition-all duration-150 items-center"
              >
                <div className="col-span-12 sm:col-span-1 order-last sm:order-none text-xs text-gray-400">
                  <span className="sm:hidden font-semibold uppercase mr-1">No</span>
                  {idx + 1}
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <span className="sm:hidden text-[10px] font-semibold uppercase text-gray-400 mr-1.5">NIK</span>
                  <span className="text-sm font-mono text-gray-700">{item.nik || '-'}</span>
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <span className="sm:hidden text-[10px] font-semibold uppercase text-gray-400 mr-1.5">Nama</span>
                  <span className="text-sm font-medium text-gray-800">{item.nama}</span>
                </div>
                <div className="col-span-4 sm:col-span-2 text-center">
                  <span className="sm:hidden text-[10px] font-semibold uppercase text-gray-400 mr-1.5">Hadir</span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    <Calendar className="w-3.5 h-3.5" />
                    {item.jumlah_kehadiran} hari
                  </span>
                </div>
                <div className="col-span-4 sm:col-span-2 text-center">
                  <span className="sm:hidden text-[10px] font-semibold uppercase text-gray-400 mr-1.5">Masuk</span>
                  {item.rata_rata_jam_masuk ? (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full">
                      <Clock className="w-3.5 h-3.5" />
                      {formatJam(item.rata_rata_jam_masuk)}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </div>
                <div className="col-span-4 sm:col-span-2 text-center">
                  <span className="sm:hidden text-[10px] font-semibold uppercase text-gray-400 mr-1.5">Keluar</span>
                  {item.rata_rata_jam_keluar ? (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                      <Clock className="w-3.5 h-3.5" />
                      {formatJam(item.rata_rata_jam_keluar)}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
