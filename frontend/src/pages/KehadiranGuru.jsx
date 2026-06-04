import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, Search, RefreshCw, ChevronLeft, ChevronRight, Users, Edit3, X, Loader2, CheckCircle } from 'lucide-react'
import { getKehadiranGuru, getGuru, createKehadiranGuru, updateKehadiranGuru, downloadExcelKehadiranGuru, backfillGpsKehadiranGuru } from '../api'
import { parseGpsData } from '../utils/formatGps'
import { useAuth } from '../context/AuthContext'

function formatTanggal(tgl) {
  if (!tgl) return '-'
  const d = new Date(tgl)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatJam(jam) {
  if (!jam) return '-'
  return jam.slice(0, 5)
}

// Convert ISO date to YYYY-MM-DD for input[type=date]
function toDateInput(tgl) {
  if (!tgl) return ''
  const d = new Date(tgl)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const statusColors = {
  hadir: 'bg-green-100 text-green-700',
  alpa: 'bg-red-100 text-red-700',
}

export default function KehadiranGuru() {
  const { user } = useAuth()
  const [data, setData] = useState([])
  const [guruList, setGuruList] = useState([])
  const [loading, setLoading] = useState(true)
  const [tanggalAwal, setTanggalAwal] = useState('')
  const [tanggalAkhir, setTanggalAkhir] = useState('')
  const [idGuru, setIdGuru] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ id_guru: '', tanggal: '', jam_masuk: '', jam_keluar: '' })

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({ tanggal: '', jam_masuk: '', jam_keluar: '' })
  const [saving, setSaving] = useState(false)

  // Backfill GPS state
  const [showBackfillModal, setShowBackfillModal] = useState(false)
  const [backfillStatus, setBackfillStatus] = useState('idle') // idle, running, done
  const [backfillResult, setBackfillResult] = useState(null)

  const loadData = async (p) => {
    try {
      setLoading(true)
      const params = { page: p || page, per_page: 25 }
      if (tanggalAwal) params.tanggal_awal = tanggalAwal
      if (tanggalAkhir) params.tanggal_akhir = tanggalAkhir
      if (idGuru) params.id_guru = idGuru
      if (statusFilter) params.status = statusFilter
      const res = await getKehadiranGuru(params)
      setData(res.data.data || [])
      setTotal(res.data.total || 0)
      setTotalPages(res.data.total_pages || 1)
      setPage(res.data.page || 1)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadGuru = async () => {
    try {
      const res = await getGuru()
      setGuruList(res.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadGuru()
    loadData(1)
  }, [])

  const handleFilter = () => {
    setPage(1)
    loadData(1)
  }

  const handleReset = () => {
    setTanggalAwal('')
    setTanggalAkhir('')
    setIdGuru('')
    setStatusFilter('')
    setPage(1)
    loadData(1)
  }

  const getStatusKehadiran = (item) => {
    if (item.jam_masuk) return 'hadir'
    return 'alpa'
  }

  const openEdit = (item) => {
    setEditing(item)
    setEditForm({
      tanggal: toDateInput(item.tanggal),
      jam_masuk: item.jam_masuk ? item.jam_masuk.slice(0, 5) : '',
      jam_keluar: item.jam_keluar ? item.jam_keluar.slice(0, 5) : '',
    })
    setShowEditModal(true)
  }

  const handleExportExcel = async () => {
    try {
      const params = {}
      if (tanggalAwal) params.tanggal_awal = tanggalAwal
      if (tanggalAkhir) params.tanggal_akhir = tanggalAkhir
      if (idGuru) params.id_guru = idGuru
      if (statusFilter) params.status = statusFilter

      const res = await downloadExcelKehadiranGuru(params)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      const filename = `kehadiran_karyawan_${tanggalAwal || 'all'}_${tanggalAkhir || 'all'}.xlsx`
      a.download = filename
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert('Gagal export Excel')
    }
  }

  const handleEditSave = async () => {
    if (!editing) return
    try {
      setSaving(true)
      const payload = {
        tanggal: editForm.tanggal || null,
        jam_masuk: editForm.jam_masuk || null,
        jam_keluar: editForm.jam_keluar || null,
      }
      await updateKehadiranGuru(editing.id, payload)
      setShowEditModal(false)
      setEditing(null)
      loadData(page)
    } catch (err) {
      console.error(err)
      alert(err.response?.data?.message || 'Gagal menyimpan perubahan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Kehadiran Karyawan</h1>
          <p className="text-gray-500 text-sm mt-1">Pantau absensi seluruh karyawan</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tambah
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowBackfillModal(true)}
              className="btn-secondary text-sm flex items-center gap-2"
              title="Reverse geocode data GPS lama untuk menambahkan informasi wilayah"
            >
              <MapPin className="w-4 h-4" />
              Backfill GPS
            </button>
          )}
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
          <button onClick={() => loadData(page)} className="btn-secondary text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="w-full sm:w-48">
            <label className="block text-xs font-medium text-gray-500 mb-1">Tanggal Awal</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={tanggalAwal}
                onChange={(e) => setTanggalAwal(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-xs font-medium text-gray-500 mb-1">Tanggal Akhir</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={tanggalAkhir}
                onChange={(e) => setTanggalAkhir(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="w-full sm:w-56">
            <label className="block text-xs font-medium text-gray-500 mb-1">Guru</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select value={idGuru} onChange={(e) => setIdGuru(e.target.value)} className="input-field pl-10">
                <option value="">Semua Guru</option>
                {guruList.map((g) => (
                  <option key={g.id} value={g.id}>{g.nama}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="w-full sm:w-36">
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field">
              <option value="">Semua Status</option>
              <option value="hadir">Hadir (Lengkap)</option>
              <option value="belum_keluar">Belum Keluar</option>
              <option value="alpa">Alpa</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleFilter} className="btn-primary text-sm px-4 py-2.5">
              <Search className="w-4 h-4 inline mr-1" /> Cari
            </button>
            {(tanggalAwal || tanggalAkhir || idGuru || statusFilter) && (
              <button onClick={handleReset} className="btn-secondary text-sm px-4 py-2.5">
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">          <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <div className="col-span-3">Nama Guru</div>
          <div className="col-span-2">Tanggal</div>
          <div className="col-span-2">Jam Masuk</div>
          <div className="col-span-2">Jam Keluar</div>
          <div className="col-span-2">GPS</div>
          <div className="col-span-1">Status</div>
        </div>

        {loading ? (
          <div className="divide-y divide-gray-50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 px-5 py-4 animate-pulse">
                <div className="col-span-3 h-4 bg-gray-200 rounded" />
                <div className="col-span-2 h-4 bg-gray-200 rounded" />
                <div className="col-span-2 h-4 bg-gray-200 rounded" />
                <div className="col-span-2 h-4 bg-gray-200 rounded" />
                <div className="col-span-2 h-4 bg-gray-200 rounded" />
                <div className="col-span-1 h-4 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Users className="w-14 h-14 mb-3 opacity-30" />
            <p className="text-sm font-medium text-gray-500">Belum ada data kehadiran guru</p>
            <p className="text-xs text-gray-300 mt-1">Data akan muncul setelah karyawan melakukan absen</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 px-5 py-3.5 hover:bg-annajah-50/40 transition-all duration-150 items-center">
                <div className="col-span-12 sm:col-span-3">
                  <span className="text-sm font-medium text-gray-800">{item.nama_guru}</span>
                  {item.nik && <span className="text-xs text-gray-400 ml-2">({item.nik})</span>}
                </div>
                <div className="col-span-12 sm:col-span-2">
                  <span className="text-sm text-gray-600">{formatTanggal(item.tanggal)}</span>
                </div>
                <div className="col-span-12 sm:col-span-2">
                  {item.jam_masuk ? (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                      <Clock className="w-3.5 h-3.5" /> {formatJam(item.jam_masuk)}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </div>
                <div className="col-span-12 sm:col-span-2">
                  {item.jam_keluar ? (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      <Clock className="w-3.5 h-3.5" /> {formatJam(item.jam_keluar)}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </div>
                <div className="col-span-12 sm:col-span-2">
                  <div className="flex flex-col gap-0.5">
                    {(() => {
                      const gpsMasuk = parseGpsData(item.gps_masuk)
                      const gpsKeluar = parseGpsData(item.gps_keluar)
                      return (
                        <>
                          {gpsMasuk ? (
                            <span className="text-[10px] text-gray-500 flex items-center gap-1" title={gpsMasuk.lat ? `(${gpsMasuk.lat}, ${gpsMasuk.lng})` : ''}>
                              <MapPin className="w-3 h-3" /> Masuk: {gpsMasuk.display}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">-</span>
                          )}
                          {gpsKeluar ? (
                            <span className="text-[10px] text-gray-500 flex items-center gap-1" title={gpsKeluar.lat ? `(${gpsKeluar.lat}, ${gpsKeluar.lng})` : ''}>
                              <MapPin className="w-3 h-3" /> Keluar: {gpsKeluar.display}
                            </span>
                          ) : null}
                        </>
                      )
                    })()}
                  </div>
                </div>
                <div className="col-span-12 sm:col-span-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[getStatusKehadiran(item)]}`}>
                      {getStatusKehadiran(item)}
                    </span>
                    <button
                      onClick={() => openEdit(item)}
                      className="p-1 rounded-lg hover:bg-annajah-100 text-annajah-400 hover:text-annajah-600 transition-all"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Mobile detail */}
                <div className="col-span-12 sm:hidden -mt-1 flex items-center gap-2 text-xs text-gray-400">
                  {(() => {
                    const gpsMasuk = parseGpsData(item.gps_masuk)
                    return gpsMasuk ? <span><MapPin className="w-3 h-3 inline" /> {gpsMasuk.display}</span> : null
                  })()}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[getStatusKehadiran(item)]}`}>
                    {getStatusKehadiran(item)}
                  </span>
                  <button
                    onClick={() => openEdit(item)}
                    className="p-1 rounded-lg hover:bg-annajah-100 text-annajah-400 hover:text-annajah-600 transition-all"
                    title="Edit"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-400">Halaman {page} dari {totalPages} ({total} data)</p>
            <div className="flex items-center gap-2">
              <button onClick={() => loadData(page - 1)} disabled={page <= 1}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                return p > totalPages ? null : (
                  <button key={p} onClick={() => loadData(p)}
                    className={`w-7 h-7 text-xs font-medium rounded-lg transition-all ${p === page ? 'bg-annajah-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>
                    {p}
                  </button>
                )
              })}
              <button onClick={() => loadData(page + 1)} disabled={page >= totalPages}
                className="p-1.5 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Tambah Kehadiran Karyawan</h2>
                <p className="text-sm text-gray-500 mt-0.5">Input manual data kehadiran</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-all">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Karyawan <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={addForm.id_guru}
                    onChange={(e) => setAddForm({ ...addForm, id_guru: e.target.value })}
                    className="input-field pl-10"
                  >
                    <option value="">Pilih Karyawan</option>
                    {guruList.map((g) => (
                      <option key={g.id} value={g.id}>{g.nama} {g.nik ? `(${g.nik})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Tanggal <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={addForm.tanggal}
                  onChange={(e) => setAddForm({ ...addForm, tanggal: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Jam Masuk</label>
                <input
                  type="time"
                  value={addForm.jam_masuk}
                  onChange={(e) => setAddForm({ ...addForm, jam_masuk: e.target.value })}
                  className="input-field"
                />
                <p className="text-xs text-gray-400 mt-1">Kosongkan jika tidak hadir</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Jam Keluar</label>
                <input
                  type="time"
                  value={addForm.jam_keluar}
                  onChange={(e) => setAddForm({ ...addForm, jam_keluar: e.target.value })}
                  className="input-field"
                />
              </div>

              {/* Info status */}
              <div className="p-3 rounded-xl text-xs bg-gray-50 text-gray-500">
                Status akan ditentukan otomatis:
                <br />✔️ Jam Masuk terisi → <strong>Hadir</strong>
                <br />✔️ Jam Masuk kosong → <strong>Alpa</strong>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button
                onClick={async () => {
                  if (!addForm.id_guru || !addForm.tanggal) {
                    alert('Harap pilih karyawan dan tanggal')
                    return
                  }
                  try {
                    setSaving(true)
                    const payload = {
                      id_guru: addForm.id_guru,
                      tanggal: addForm.tanggal,
                      jam_masuk: addForm.jam_masuk || null,
                      jam_keluar: addForm.jam_keluar || null,
                    }
                    await createKehadiranGuru(payload)
                    setShowAddModal(false)
                    setAddForm({ id_guru: '', tanggal: '', jam_masuk: '', jam_keluar: '' })
                    loadData(page)
                  } catch (err) {
                    console.error(err)
                    alert(err.response?.data?.message || 'Gagal menambah data kehadiran')
                  } finally {
                    setSaving(false)
                  }
                }}
                disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                disabled={saving}
                className="btn-secondary flex-1"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backfill GPS Modal */}
      {showBackfillModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { if (backfillStatus !== 'running') setShowBackfillModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Backfill GPS</h2>
                <p className="text-sm text-gray-500 mt-0.5">Tambahkan informasi wilayah ke data GPS lama</p>
              </div>
              <button
                onClick={() => { if (backfillStatus !== 'running') setShowBackfillModal(false) }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-all"
                disabled={backfillStatus === 'running'}
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5">
              {backfillStatus === 'idle' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                    <p className="font-medium mb-1">⚠️ Perhatian</p>
                    <p>Fitur ini akan memproses data GPS yang masih berupa koordinat mentah untuk dilengkapi dengan informasi wilayah (kelurahan, kecamatan, kabupaten, provinsi) menggunakan API Nominatim (OpenStreetMap).</p>
                    <p className="mt-2 text-xs text-amber-600">Proses bisa memakan waktu karena ada batasan 1 request per detik dari API.</p>
                  </div>
                </div>
              )}

              {backfillStatus === 'running' && (
                <div className="text-center py-6 space-y-4">
                  <Loader2 className="w-10 h-10 animate-spin text-annajah-600 mx-auto" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Memproses data...</p>
                    <p className="text-xs text-gray-400 mt-1">Harap tunggu, jangan tutup halaman ini</p>
                  </div>
                  {backfillResult && (
                    <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
                      Diproses: {backfillResult.processed || 0} / {backfillResult.total || '?'}
                    </div>
                  )}
                </div>
              )}

              {backfillStatus === 'done' && backfillResult && (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700">Backfill Selesai!</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-gray-800">{backfillResult.total || 0}</p>
                      <p className="text-xs text-gray-500">Total Data</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-green-700">{backfillResult.processed || 0}</p>
                      <p className="text-xs text-green-600">Berhasil</p>
                    </div>
                    {backfillResult.failed > 0 && (
                      <div className="bg-red-50 rounded-xl p-3 text-center col-span-2">
                        <p className="text-lg font-bold text-red-700">{backfillResult.failed}</p>
                        <p className="text-xs text-red-600">Gagal</p>
                      </div>
                    )}
                  </div>
                  {backfillResult.errors?.length > 0 && (
                    <details className="text-xs text-gray-500">
                      <summary className="cursor-pointer font-medium">Detail Error</summary>
                      <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                        {backfillResult.errors.map((e, i) => (
                          <li key={i}>ID {e.id} ({e.field}): {e.error}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 border-t border-gray-100">
              {backfillStatus === 'idle' && (
                <>
                  <button
                    onClick={async () => {
                      try {
                        setBackfillStatus('running')
                        const res = await backfillGpsKehadiranGuru()
                        setBackfillResult(res.data)
                        setBackfillStatus('done')
                        loadData(page)
                      } catch (err) {
                        setBackfillResult({
                          total: 0,
                          processed: 0,
                          failed: 1,
                          errors: [{ error: err.response?.data?.message || err.message }]
                        })
                        setBackfillStatus('done')
                      }
                    }}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    Mulai Backfill
                  </button>
                  <button onClick={() => setShowBackfillModal(false)} className="btn-secondary flex-1">
                    Batal
                  </button>
                </>
              )}
              {backfillStatus === 'done' && (
                <button
                  onClick={() => {
                    setShowBackfillModal(false)
                    setBackfillStatus('idle')
                    setBackfillResult(null)
                  }}
                  className="btn-primary flex-1"
                >
                  Tutup
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Edit Kehadiran Karyawan</h2>
                <p className="text-sm text-gray-500 mt-0.5">{editing.nama_guru}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-all">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Tanggal</label>
                <input
                  type="date"
                  value={editForm.tanggal}
                  onChange={(e) => setEditForm({ ...editForm, tanggal: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Jam Masuk</label>
                <input
                  type="time"
                  value={editForm.jam_masuk}
                  onChange={(e) => setEditForm({ ...editForm, jam_masuk: e.target.value })}
                  className="input-field"
                />
                <p className="text-xs text-gray-400 mt-1">Kosongkan jika tidak hadir</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Jam Keluar</label>
                <input
                  type="time"
                  value={editForm.jam_keluar}
                  onChange={(e) => setEditForm({ ...editForm, jam_keluar: e.target.value })}
                  className="input-field"
                />
              </div>

              {/* Info status */}
              <div className="p-3 rounded-xl text-xs bg-gray-50 text-gray-500">
                Status akan ditentukan otomatis:
                <br />✔️ Jam Masuk terisi → <strong>Hadir</strong>
                <br />✔️ Jam Masuk kosong → <strong>Alpa</strong>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button
                onClick={handleEditSave}
                disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                disabled={saving}
                className="btn-secondary flex-1"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
