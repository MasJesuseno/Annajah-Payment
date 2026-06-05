import { useState, useEffect } from 'react'
import { getRolePermissions, updateRolePermissions } from '../api'
import { Shield, Save, Loader2, CheckCircle, XCircle, Search, Lock, GraduationCap, CreditCard, Users } from 'lucide-react'
import toast from 'react-hot-toast'

const ROLE_CONFIG = [
  { id: 'admin', label: 'Admin', icon: Shield, color: 'purple' },
  { id: 'bendahara', label: 'Bendahara', icon: CreditCard, color: 'blue' },
  { id: 'guru', label: 'Karyawan', icon: GraduationCap, color: 'emerald' },
]

const MENU_GROUPS = [
  {
    label: 'Utama',
    items: [
      { path: '/dashboard', label: 'Dashboard' },
      { path: '/guru-dashboard', label: 'Dashboard (Karyawan)' },
      { path: '/profil-saya', label: 'Profil Saya' },
      { path: '/daftar-kehadiran-saya', label: 'Daftar Kehadiran Saya' },
      { path: '/kehadiran-guru-saya', label: 'Absen Kehadiran' },
    ],
  },
  {
    label: 'Kepegawaian',
    items: [
      { path: '/guru', label: 'Data Karyawan' },
      { path: '/kehadiran-guru', label: 'Kehadiran Karyawan' },
      { path: '/rekap-kehadiran-guru', label: 'Rekap Kehadiran Karyawan' },
    ],
  },
  {
    label: 'Kesiswaan',
    items: [
      { path: '/siswa-wali', label: 'Daftar Siswa (Wali Kelas)' },
      { path: '/kehadiran-wali', label: 'Kehadiran Siswa (Wali Kelas)' },
      { path: '/input-kehadiran-wali', label: 'Input Kehadiran Masal (Wali)' },
      { path: '/siswa', label: 'Data Siswa' },
      { path: '/alumni', label: 'Alumni' },
      { path: '/kelas', label: 'Kelas' },
      { path: '/kehadiran', label: 'Kehadiran Siswa' },
      { path: '/kehadiran/bulk', label: 'Input Kehadiran Masal' },
    ],
  },
  {
    label: 'Ekstrakurikuler',
    items: [
      { path: '/ekstrakurikuler', label: 'Data Ekstrakurikuler' },
      { path: '/ekstrakurikuler/peserta', label: 'Peserta Ekstrakurikuler' },
      { path: '/ekstrakurikuler/input-peserta', label: 'Input Peserta' },
      { path: '/ekstrakurikuler/rekap', label: 'Rekap Peserta' },
    ],
  },
  {
    label: 'Bimbingan Konseling',
    items: [
      { path: '/bimbingan-konseling', label: 'Daftar BK' },
      { path: '/bimbingan-konseling/input', label: 'Input BK' },
      { path: '/bimbingan-konseling/rekap', label: 'Rekap BK' },
    ],
  },
  {
    label: 'Nilai Siswa',
    items: [
      { path: '/nilai-siswa', label: 'Daftar Nilai' },
      { path: '/nilai-siswa/input', label: 'Input Nilai' },
      { path: '/nilai-siswa/rekap', label: 'Rekap Nilai' },
      { path: '/periode-penilaian', label: 'Periode Penilaian' },
    ],
  },
  {
    label: 'Prestasi Siswa',
    items: [
      { path: '/prestasi-siswa', label: 'Daftar Prestasi' },
      { path: '/prestasi-siswa/input', label: 'Input Prestasi' },
      { path: '/prestasi-siswa/rekap', label: 'Rekap Prestasi' },
      { path: '/prestasi-siswa/pengaturan', label: 'Template Piagam' },
    ],
  },
  {
    label: 'Mata Pelajaran',
    items: [
      { path: '/mata-pelajaran', label: 'Mata Pelajaran' },
    ],
  },
  {
    label: 'PPDB',
    items: [
      { path: '/ppdb/admin', label: 'Data PPDB' },
      { path: '/ppdb/pengaturan', label: 'Pengaturan PPDB' },
    ],
  },
  {
    label: 'Transaksi & Laporan',
    items: [
      { path: '/transaksi', label: 'Transaksi' },
      { path: '/laporan', label: 'Laporan' },
      { path: '/pembayaran', label: 'Jenis Pembayaran' },
    ],
  },
  {
    label: 'Pengaturan',
    items: [
      { path: '/pengaturan', label: 'Pengaturan Sekolah' },
      { path: '/tahun-ajaran', label: 'Tahun Pelajaran' },
      { path: '/users', label: 'Manajemen User' },
      { path: '/database', label: 'Backup Database' },
      { path: '/role-permissions', label: 'Hak Akses Menu' },
      { path: '/log-aktivitas', label: 'Log Aktivitas' },
    ],
  },
]

export default function RolePermissions() {
  const [permissions, setPermissions] = useState({}) // { role: { path: bool } }
  const [selectedRole, setSelectedRole] = useState('guru')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadPermissions()
  }, [])

  const loadPermissions = async () => {
    setLoading(true)
    try {
      const res = await getRolePermissions()
      const grouped = { admin: {}, bendahara: {}, guru: {} }
      for (const row of res.data) {
        if (!grouped[row.role]) continue
        grouped[row.role][row.menu_path] = Boolean(row.can_access)
      }
      setPermissions(grouped)
    } catch {
      toast.error('Gagal memuat data permission')
    } finally {
      setLoading(false)
    }
  }

  const togglePermission = (role, path) => {
    setPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [path]: !prev[role]?.[path],
      },
    }))
  }

  const setAllForRole = (role, value) => {
    setPermissions(prev => {
      const updated = { ...prev }
      const rolePerms = { ...(updated[role] || {}) }
      for (const path of Object.keys(rolePerms)) {
        rolePerms[path] = value
      }
      updated[role] = rolePerms
      return updated
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateRolePermissions(selectedRole, { permissions: permissions[selectedRole] })
      toast.success(`Permission untuk ${selectedRole} berhasil disimpan`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan permission')
    } finally {
      setSaving(false)
    }
  }

  const colorMap = {
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', active: 'bg-purple-500', ring: 'ring-purple-400' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', active: 'bg-blue-500', ring: 'ring-blue-400' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', active: 'bg-emerald-500', ring: 'ring-emerald-400' },
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-annajah-600"></div>
      </div>
    )
  }

  const currentRole = ROLE_CONFIG.find(r => r.id === selectedRole)
  const rolePerms = permissions[selectedRole] || {}

  // Filter menu groups based on search
  const filteredGroups = MENU_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item =>
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.path.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(g => g.items.length > 0)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Hak Akses Menu</h1>
        <p className="text-gray-500 text-sm mt-1">
          Atur menu apa saja yang dapat diakses oleh setiap role pengguna
        </p>
      </div>

      {/* Role Selection */}
      <div className="flex flex-wrap gap-3">
        {ROLE_CONFIG.map(role => {
          const Icon = role.icon
          const c = colorMap[role.color]
          const isActive = selectedRole === role.id
          return (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? `${c.bg} ${c.border} ${c.text} shadow-sm scale-[1.02]`
                  : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isActive ? `bg-gradient-to-br ${role.id === 'admin' ? 'from-purple-500 to-purple-600' : role.id === 'bendahara' ? 'from-blue-500 to-blue-600' : 'from-emerald-500 to-emerald-600'} text-white` : 'bg-gray-100 text-gray-400'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">{role.label}</p>
                <p className="text-[10px] font-normal opacity-70">
                  {isActive ? 'Sedang diedit' : 'Klik untuk edit'}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Cari menu..."
          className="input-field pl-10"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Bulk Actions */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 font-medium">Set Semua:</span>
        <button
          onClick={() => setAllForRole(selectedRole, true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors border border-green-200"
        >
          <CheckCircle className="w-3.5 h-3.5" /> Aktif
        </button>
        <button
          onClick={() => setAllForRole(selectedRole, false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors border border-red-200"
        >
          <XCircle className="w-3.5 h-3.5" /> Nonaktif
        </button>
      </div>

      {/* Menu Groups */}
      <div className="space-y-4">
        {filteredGroups.map(group => (
          <div key={group.label} className="card overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700">{group.label}</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {group.items.map(item => {
                const isChecked = rolePerms[item.path] ?? false
                const c = colorMap[currentRole?.color || 'purple']

                return (
                  <label
                    key={item.path}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 cursor-pointer transition-colors group"
                  >
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isChecked}
                        onChange={() => togglePermission(selectedRole, item.path)}
                        disabled={selectedRole === 'admin'}
                      />
                      <div className={`w-10 h-6 rounded-full transition-colors duration-200 ${
                        isChecked ? `${c.active}` : 'bg-gray-300'
                      } ${selectedRole === 'admin' ? 'opacity-60 cursor-not-allowed' : ''}`}>
                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                          isChecked ? 'translate-x-5' : 'translate-x-1'
                        } mt-1`} />
                      </div>
                      {selectedRole === 'admin' && (
                        <Lock className="w-3 h-3 text-gray-400 ml-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                        {item.label}
                      </span>
                      <p className="text-[11px] text-gray-400 font-mono truncate">{item.path}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      isChecked
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {isChecked ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between sticky bottom-0 bg-gray-50/80 backdrop-blur-sm -mx-6 -mb-6 px-6 py-4 border-t border-gray-200 rounded-b-2xl">
        <p className="text-xs text-gray-400">
          {selectedRole === 'admin'
            ? 'Admin memiliki akses penuh ke semua menu (tidak dapat diubah)'
            : `Mengatur akses menu untuk role ${currentRole?.label}`}
        </p>
        <button
          onClick={handleSave}
          disabled={saving || selectedRole === 'admin'}
          className="btn-primary flex items-center gap-2 px-6 py-2.5"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>
    </div>
  )
}
