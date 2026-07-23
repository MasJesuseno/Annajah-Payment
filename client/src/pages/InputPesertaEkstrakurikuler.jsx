import { useState, useEffect } from 'react'
import { getSiswa, getEkstrakurikuler, getEkskulBySiswa, simpanPesertaEkstrakurikuler } from '../api'
import { Medal, Search, User, GraduationCap, Clock, CalendarDays, Save, CheckCircle, X, School } from 'lucide-react'
import toast from 'react-hot-toast'

const HARI_LABEL = { Senin: 'Senin', Selasa: 'Selasa', Rabu: 'Rabu', Kamis: 'Kamis', Jumat: 'Jumat', Sabtu: 'Sabtu' }

export default function InputPesertaEkstrakurikuler() {
  const [search, setSearch] = useState('')
  const [siswaList, setSiswaList] = useState([])
  const [selectedSiswa, setSelectedSiswa] = useState(null)
  const [allEkskul, setAllEkskul] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const searchSiswa = async (q) => {
    setSearch(q)
    if (q.length < 2) {
      setSiswaList([])
      return
    }
    setLoading(true)
    try {
      const res = await getSiswa({ search: q, per_page: 20 })
      setSiswaList(Array.isArray(res.data) ? res.data : (res.data?.data || []))
    } catch {
      setSiswaList([])
    } finally {
      setLoading(false)
    }
  }

  const pilihSiswa = async (siswa) => {
    setSelectedSiswa(siswa)
    setSiswaList([])
    setSearch('')
    setLoading(true)
    try {
      // Load all extracurriculars
      const ekskulRes = await getEkstrakurikuler()
      setAllEkskul(ekskulRes.data)

      // Load student's current enrollments
      const enrolledRes = await getEkskulBySiswa(siswa.id)
      const enrolledIds = new Set(enrolledRes.data.map(e => e.id))
      setSelectedIds(enrolledIds)
    } catch {
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  const toggleEkskul = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    if (!selectedSiswa) return
    setSaving(true)
    try {
      await simpanPesertaEkstrakurikuler({
        id_siswa: selectedSiswa.id,
        id_ekstrakurikuler_list: Array.from(selectedIds)
      })
      toast.success(`Data peserta berhasil disimpan untuk ${selectedSiswa.nama}`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan data')
    } finally {
      setSaving(false)
    }
  }

  const groupByHari = (items) => {
    const groups = {}
    items.forEach(item => {
      if (!groups[item.hari]) groups[item.hari] = []
      groups[item.hari].push(item)
    })
    return groups
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Medal className="w-6 h-6 text-annajah-600" />
          Input Peserta Ekstrakurikuler
        </h1>
        <p className="text-gray-500 text-sm mt-1">Cari siswa dan pilih ekstrakurikuler yang diikuti</p>
      </div>

      {/* Search Student */}
      <div className="card">
        <div className="p-4">
          <label className="block text-sm font-medium text-gray-600 mb-2">Cari Siswa</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="input-field pl-10"
              placeholder="Ketik nama atau NIS siswa... (min 2 karakter)"
              value={search}
              onChange={e => searchSiswa(e.target.value)}
            />
          </div>

          {/* Search Results */}
          {search.length >= 2 && (
            <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl">
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-annajah-600"></div>
                </div>
              ) : siswaList.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-4">Tidak ada siswa ditemukan</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {siswaList.map(s => (
                    <button
                      key={s.id}
                      onClick={() => pilihSiswa(s)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-annajah-50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-annajah-100 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-annajah-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700">{s.nama}</p>
                        <p className="text-xs text-gray-400">
                          {s.nis} {s.nama_kelas ? `• ${s.nama_kelas}` : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Student Info */}
        {selectedSiswa && (
          <div className="border-t border-gray-100 px-4 py-3 bg-annajah-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-annajah-100 flex items-center justify-center shrink-0">
                <School className="w-5 h-5 text-annajah-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{selectedSiswa.nama}</p>
                <p className="text-xs text-gray-500">
                  NIS: {selectedSiswa.nis}
                  {selectedSiswa.nama_kelas ? ` • Kelas: ${selectedSiswa.nama_kelas}` : ''}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ekstrakurikuler Selection */}
      {selectedSiswa && (
        <div className="card">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Medal className="w-4 h-4 text-annajah-600" />
                Pilih Ekstrakurikuler
              </h3>
              <span className="text-xs text-gray-400">
                {selectedIds.size} terpilih dari {allEkskul.length}
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-annajah-600"></div>
              </div>
            ) : allEkskul.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">Belum ada data ekstrakurikuler</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {allEkskul.map(e => {
                  const isSelected = selectedIds.has(e.id)
                  const isActive = e.status === 'Aktif'
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => toggleEkskul(e.id)}
                      disabled={!isActive && !isSelected}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-annajah-500 bg-annajah-50'
                          : isActive
                            ? 'border-gray-200 hover:border-gray-300 bg-white'
                            : 'border-gray-100 bg-gray-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 shrink-0 transition-all ${
                          isSelected
                            ? 'bg-annajah-600 border-annajah-600'
                            : 'border-gray-300'
                        }`}>
                          {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            isSelected ? 'text-annajah-800' : 'text-gray-700'
                          }`}>
                            {e.nama}
                          </p>
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                            <span className="text-xs text-gray-400 flex items-center gap-0.5">
                              <CalendarDays className="w-3 h-3" />
                              {e.hari}
                            </span>
                            <span className="text-xs text-gray-400 flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {e.jam_mulai?.slice(0, 5)}-{e.jam_selesai?.slice(0, 5)}
                            </span>
                          </div>
                          {!isActive && (
                            <span className="text-[10px] text-gray-400 mt-0.5 block">Tidak aktif</span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Save Button */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  Satu siswa dapat mengikuti lebih dari satu ekstrakurikuler
                </span>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedSiswa && (
        <div className="card">
          <div className="p-12 text-center">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Cari siswa terlebih dahulu</p>
            <p className="text-gray-400 text-xs mt-1">
              Ketik nama atau NIS siswa di atas, lalu pilih ekstrakurikuler yang diikuti
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
