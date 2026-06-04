import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getSiswa, getKelasByWali, createKehadiranBulk, getKehadiran, getPengaturan } from '../api'
import {
  Calendar, Check, X, UserCheck, UserX, Clock, Activity,
  Save, Loader2, Users, School,
  AlertCircle, ArrowLeft, Edit3, History
} from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = [
  { value: 'hadir', label: 'Hadir', icon: UserCheck, color: 'green' },
  { value: 'ijin', label: 'Ijin', icon: Clock, color: 'yellow' },
  { value: 'sakit', label: 'Sakit', icon: Activity, color: 'blue' },
  { value: 'alpa', label: 'Alpa', icon: UserX, color: 'red' },
]

function StatusSelector({ selected, onChange }) {
  return (
    <div className="flex gap-1.5">
      {STATUS_OPTIONS.map(opt => {
        const isActive = selected === opt.value
        const colorMap = {
          green: isActive
            ? 'bg-green-100 text-green-700 border-green-300 ring-2 ring-green-300'
            : 'border-gray-200 text-gray-400 hover:bg-green-50 hover:text-green-600 hover:border-green-200',
          yellow: isActive
            ? 'bg-yellow-100 text-yellow-700 border-yellow-300 ring-2 ring-yellow-300'
            : 'border-gray-200 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-200',
          blue: isActive
            ? 'bg-blue-100 text-blue-700 border-blue-300 ring-2 ring-blue-300'
            : 'border-gray-200 text-gray-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200',
          red: isActive
            ? 'bg-red-100 text-red-700 border-red-300 ring-2 ring-red-300'
            : 'border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200',
        }
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150 ${colorMap[opt.color]}`}
            title={opt.label}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function SkeletonTable() {
  return (
    <div className="animate-pulse space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-40" />
            <div className="h-3 bg-gray-100 rounded w-24" />
          </div>
          <div className="flex gap-2">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="w-16 h-8 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function InputKehadiranWali() {
  const { user } = useAuth()
  const guruId = user?.guru_id

  const [kelasList, setKelasList] = useState([])
  const [selectedKelas, setSelectedKelas] = useState('')
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0])
  const [siswa, setSiswa] = useState([])
  const [statuses, setStatuses] = useState({})
  const [loadingKelas, setLoadingKelas] = useState(true)
  const [loadingSiswa, setLoadingSiswa] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [step, setStep] = useState('select') // 'select' | 'input'
  const [existingCount, setExistingCount] = useState(0) // jumlah data kehadiran yang sudah ada
  const [jamDefault, setJamDefault] = useState({ masuk: '', keluar: '' })

  // Load pengaturan dulu, baru kelas — agar jam default siap sebelum loadSiswa
  useEffect(() => {
    if (!guruId) return
    init()
  }, [guruId])

  const init = async () => {
    // Load pengaturan kehadiran dulu agar jam default tersedia
    try {
      const res = await getPengaturan()
      const data = res.data || {}
      setJamDefault({
        masuk: data.jam_masuk_default || '',
        keluar: data.jam_keluar_default || '',
      })
    } catch {
      // Abaikan, tetap pakai default kosong
    }
    // Baru load kelas (bisa memicu loadSiswa via useEffect)
    await loadKelas()
  }

  const loadKelas = async () => {
    setLoadingKelas(true)
    try {
      const res = await getKelasByWali(guruId)
      const data = res.data || []
      setKelasList(data)
      if (data.length === 1) {
        setSelectedKelas(String(data[0].id))
        setStep('input')
      }
    } catch (error) {
      toast.error('Gagal memuat data kelas')
    } finally {
      setLoadingKelas(false)
    }
  }

  // Load siswa + existing attendance when kelas or tanggal changes
  useEffect(() => {
    if (!selectedKelas) {
      setSiswa([])
      setStatuses({})
      return
    }
    loadSiswa()
  }, [selectedKelas, tanggal])

  const loadSiswa = async () => {
    setLoadingSiswa(true)
    try {
      const res = await getSiswa({ kelas: selectedKelas, per_page: 500, status: 'aktif' })
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || [])
      setSiswa(list)

      // Load existing attendance for this date + kelas
      let existingMap = {}
      let hasExisting = false
      if (tanggal) {
        try {
          setLoadingExisting(true)
          const existingRes = await getKehadiran({
            id_kelas: selectedKelas,
            tanggal_awal: tanggal,
            tanggal_akhir: tanggal,
            per_page: 500,
          })
          const existingList = existingRes.data?.data || []
          hasExisting = existingList.length > 0
          existingList.forEach(item => {
            existingMap[item.id_siswa] = {
              status: item.status,
              jam_masuk: item.jam_masuk ? item.jam_masuk.slice(0, 5) : '',
              jam_keluar: item.jam_keluar ? item.jam_keluar.slice(0, 5) : '',
            }
          })
          setExistingCount(existingList.length)
        } catch (e) {
          setExistingCount(0)
        } finally {
          setLoadingExisting(false)
        }
      }

      // Initialize statuses — pre-fill with existing data if available
      const initial = {}
      list.forEach(s => {
        if (existingMap[s.id]) {
          initial[s.id] = { ...existingMap[s.id] }
        } else {
          initial[s.id] = { status: 'hadir', jam_masuk: jamDefault.masuk, jam_keluar: jamDefault.keluar }
        }
      })
      setStatuses(initial)
      setSubmitted(hasExisting)
    } catch (error) {
      toast.error('Gagal memuat data siswa')
    } finally {
      setLoadingSiswa(false)
    }
  }

  const setAllStatus = (status) => {
    const updated = {}
    Object.keys(statuses).forEach(id => {
      updated[id] = { ...statuses[id], status }
    })
    setStatuses(updated)
  }

  const updateStudentStatus = (siswaId, status) => {
    setStatuses(prev => ({
      ...prev,
      [siswaId]: { ...prev[siswaId], status }
    }))
  }

  const updateStudentJam = (siswaId, field, value) => {
    setStatuses(prev => ({
      ...prev,
      [siswaId]: { ...prev[siswaId], [field]: value }
    }))
  }

  const handleSubmit = async () => {
    if (!selectedKelas || !tanggal) {
      toast.error('Pilih kelas dan tanggal terlebih dahulu')
      return
    }

    const items = siswa.map(s => ({
      id_siswa: s.id,
      tanggal,
      jam_masuk: statuses[s.id]?.jam_masuk || null,
      jam_keluar: statuses[s.id]?.jam_keluar || null,
      status: statuses[s.id]?.status || 'hadir',
    }))

    setSubmitting(true)
    try {
      const res = await createKehadiranBulk({ items })
      toast.success(res.data?.message || 'Kehadiran berhasil disimpan')
      setSubmitted(true)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan kehadiran')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    const initial = {}
    siswa.forEach(s => {        initial[s.id] = { status: 'hadir', jam_masuk: jamDefault.masuk, jam_keluar: jamDefault.keluar }
    })
    setStatuses(initial)
    setSubmitted(false)
  }

  // Stats
  const countStatus = (status) =>
    Object.values(statuses).filter(v => v.status === status).length

  // ── Guard: no guru ID ──
  if (!guruId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <AlertCircle className="w-16 h-16 mb-4 opacity-30" />
        <h2 className="text-lg font-semibold text-gray-500">Akun karyawan tidak ditemukan</h2>
        <p className="text-sm mt-1">Hubungi administrator untuk informasi lebih lanjut.</p>
      </div>
    )
  }

  const totalSiswa = siswa.length
  const filledCount = Object.keys(statuses).length

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Input Kehadiran</h1>
          <p className="text-gray-500 text-sm mt-1">Catat kehadiran siswa per kelas secara kolektif</p>
        </div>
        {step === 'input' && (
          <button
            onClick={() => setStep('select')}
            className="btn-secondary flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Ganti Kelas
          </button>
        )}
      </div>

      {/* ── Step 1: Pilih Kelas & Tanggal ── */}
      <div className={`card transition-all duration-300 ${step === 'input' ? 'opacity-70 hover:opacity-100' : ''}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Pilih Kelas */}
          <div className="relative">
            <School className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              className="input-field pl-10"
              value={selectedKelas}
              onChange={e => { setSelectedKelas(e.target.value); setStep('input') }}
              disabled={loadingKelas}
            >
              <option value="">Pilih kelas...</option>
              {kelasList.map(k => (
                <option key={k.id} value={k.id}>{k.nama_kelas}</option>
              ))}
            </select>
          </div>

          {/* Tanggal */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              className="input-field pl-10"
              value={tanggal}
              onChange={e => setTanggal(e.target.value)}
            />
          </div>

          {/* Quick date buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTanggal(new Date().toISOString().split('T')[0])}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                tanggal === new Date().toISOString().split('T')[0]
                  ? 'bg-annajah-50 border-annajah-200 text-annajah-700'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date()
                d.setDate(d.getDate() - 1)
                setTanggal(d.toISOString().split('T')[0])
              }}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                tanggal === (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0] })()
                  ? 'bg-annajah-50 border-annajah-200 text-annajah-700'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              Kemarin
            </button>
          </div>
        </div>
      </div>

      {/* ── Step 2: Input Kehadiran ── */}
      {selectedKelas && step === 'input' && (
        <>
          {/* Existing data indicator */}
          {!loadingSiswa && !loadingExisting && siswa.length > 0 && (
            <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 text-sm ${
              existingCount > 0
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}>
              {existingCount > 0 ? (
                <>
                  <Edit3 className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>{existingCount}</strong> data kehadiran sudah ada untuk tanggal ini.
                    Edit dan simpan untuk memperbarui.
                  </span>
                </>
              ) : (
                <>
                  <History className="w-4 h-4 shrink-0" />
                  <span>Belum ada data kehadiran untuk tanggal ini. Isi dan simpan untuk mencatat.</span>
                </>
              )}
            </div>
          )}

          {/* Loading existing */}
          {loadingExisting && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center gap-3 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Memeriksa data kehadiran yang sudah ada...</span>
            </div>
          )}

          {/* Stats Bar */}
          {siswa.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {STATUS_OPTIONS.map(opt => {
                const count = countStatus(opt.value)
                const pct = totalSiswa > 0 ? ((count / totalSiswa) * 100).toFixed(0) : 0
                const colorMap = {
                  green: 'bg-green-50 text-green-700 border-green-200',
                  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
                  blue: 'bg-blue-50 text-blue-700 border-blue-200',
                  red: 'bg-red-50 text-red-700 border-red-200',
                }
                const Icon = opt.icon
                return (
                  <div key={opt.value} className={`rounded-xl border p-3 ${colorMap[opt.color]}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wider opacity-80">{opt.label}</span>
                      <Icon className="w-3.5 h-3.5 opacity-60" />
                    </div>
                    <p className="text-xl font-bold">{count} <span className="text-sm font-normal opacity-60">({pct}%)</span></p>
                  </div>
                )
              })}
            </div>
          )}

          {/* Quick Actions */}
          {siswa.length > 0 && (
            <div className="card">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Set Semua:</span>
                {STATUS_OPTIONS.map(opt => {
                  const Icon = opt.icon
                  const colorMap = {
                    green: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200',
                    yellow: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200',
                    blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200',
                    red: 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200',
                  }
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAllStatus(opt.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${colorMap[opt.color]}`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Student Table */}
          <div className="card p-0 overflow-hidden">
            {loadingSiswa ? (
              <div className="p-5">
                <SkeletonTable />
              </div>
            ) : siswa.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Users className="w-14 h-14 mb-3 opacity-30" />
                <p className="text-sm font-medium text-gray-500">Tidak ada siswa aktif di kelas ini</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <div className="col-span-4 flex items-center gap-3">
                    <span className="w-10" />
                    <span>Nama Siswa</span>
                  </div>
                  <div className="col-span-1">NIS</div>
                  <div className="col-span-1">Jam Masuk</div>
                  <div className="col-span-1">Jam Keluar</div>
                  <div className="col-span-5">Status Kehadiran</div>
                </div>

                <div className="divide-y divide-gray-50">
                  {siswa.map((s, idx) => {
                    const current = statuses[s.id] || { status: 'hadir', jam_masuk: '', jam_keluar: '' }
                    return (
                      <div
                        key={s.id}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-3 px-5 py-3 hover:bg-annajah-50/40 transition-all duration-150 items-center"
                      >
                        {/* Nama + Foto */}
                        <div className="sm:col-span-4 flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 border-2 border-gray-100">
                            {s.foto ? (
                              <img
                                src={`/uploads/siswa/${s.foto}`}
                                alt={s.nama}
                                className="w-full h-full object-cover"
                                onError={e => { e.target.style.display = 'none' }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">
                                {s.nama?.charAt(0) || '?'}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-700 truncate">{s.nama}</p>
                            <p className="text-xs text-gray-400">{s.nama_kelas || '-'}</p>
                          </div>
                        </div>

                        {/* NIS */}
                        <div className="hidden sm:block col-span-1">
                          <span className="text-xs text-gray-500 font-mono">{s.nis || '-'}</span>
                        </div>

                        {/* Jam Masuk */}
                        <div className="hidden sm:block col-span-1">
                          <input
                            type="time"
                            value={current.jam_masuk}
                            onChange={e => updateStudentJam(s.id, 'jam_masuk', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-annajah-400 focus:border-annajah-400 outline-none"
                            placeholder="--:--"
                          />
                        </div>

                        {/* Jam Keluar */}
                        <div className="hidden sm:block col-span-1">
                          <input
                            type="time"
                            value={current.jam_keluar}
                            onChange={e => updateStudentJam(s.id, 'jam_keluar', e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-annajah-400 focus:border-annajah-400 outline-none"
                            placeholder="--:--"
                          />
                        </div>

                        {/* Status */}
                        <div className="sm:col-span-5">
                          <StatusSelector
                            selected={current.status}
                            onChange={status => updateStudentStatus(s.id, status)}
                          />
                        </div>

                        {/* Mobile: jam */}
                        <div className="sm:hidden flex items-center gap-3 text-xs text-gray-400">
                          <div className="relative">
                            <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                            <input
                              type="time"
                              value={current.jam_masuk}
                              onChange={e => updateStudentJam(s.id, 'jam_masuk', e.target.value)}
                              className="pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-annajah-400 focus:border-annajah-400 outline-none w-28"
                              placeholder="Masuk"
                            />
                          </div>
                          <span className="text-gray-300">—</span>
                          <div className="relative">
                            <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                            <input
                              type="time"
                              value={current.jam_keluar}
                              onChange={e => updateStudentJam(s.id, 'jam_keluar', e.target.value)}
                              className="pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-annajah-400 focus:border-annajah-400 outline-none w-28"
                              placeholder="Keluar"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Submit & Actions */}
          {siswa.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 card">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                <span>{totalSiswa} siswa — {filledCount} diisi</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  disabled={submitting}
                  className="btn-secondary flex items-center gap-1.5 text-sm"
                >
                  <X className="w-4 h-4" /> Reset
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || totalSiswa === 0}
                  className="btn-primary flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : submitted ? (
                    <>
                      <Check className="w-4 h-4" /> Tersimpan
                    </>
                  ) : existingCount > 0 ? (
                    <>
                      <Save className="w-4 h-4" /> Perbarui Kehadiran
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Simpan Kehadiran
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
