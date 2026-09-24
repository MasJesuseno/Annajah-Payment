import {
  Clock, User, History, ClipboardList, CheckSquare,
  ClipboardCheck, HeartHandshake, Trophy, Users,
} from 'lucide-react'

import KehadiranGuruSaya from '../KehadiranGuruSaya'
import ProfilSaya from '../ProfilSaya'
import DaftarKehadiranSaya from '../DaftarKehadiranSaya'
import SiswaWali from '../SiswaWali'
import KehadiranWali from '../KehadiranWali'
import InputKehadiranWali from '../InputKehadiranWali'
import DaftarNilaiSiswa from '../DaftarNilaiSiswa'
import DaftarBimbinganKonseling from '../DaftarBimbinganKonseling'
import DaftarPrestasiSiswa from '../DaftarPrestasiSiswa'

/**
 * Daftar menu Panel /Internal (mobile karyawan).
 *
 * `permission` adalah path menu yang dipakai pada tabel `role_permissions`,
 * sehingga tampil/tidaknya menu mengikuti hak akses role yang sudah ada
 * (sama seperti sidebar admin).
 * `key` dipakai pada URL: /internal/<key>
 */
export const internalMenus = [
  {
    key: 'absen',
    label: 'Absen Kehadiran',
    description: 'Absen masuk & keluar',
    icon: Clock,
    permission: '/kehadiran-guru-saya',
    component: KehadiranGuruSaya,
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'shadow-emerald-500/30',
  },
  {
    key: 'profil',
    label: 'Profil Saya',
    description: 'Data diri & akun',
    icon: User,
    permission: '/profil-saya',
    component: ProfilSaya,
    gradient: 'from-violet-500 to-purple-600',
    glow: 'shadow-violet-500/30',
  },
  {
    key: 'riwayat-kehadiran',
    label: 'Riwayat Kehadiran',
    description: 'Absensi pribadi',
    icon: History,
    permission: '/daftar-kehadiran-saya',
    component: DaftarKehadiranSaya,
    gradient: 'from-sky-500 to-blue-600',
    glow: 'shadow-sky-500/30',
  },
  {
    key: 'siswa-wali',
    label: 'Siswa Wali Kelas',
    description: 'Daftar siswa',
    icon: ClipboardList,
    permission: '/siswa-wali',
    component: SiswaWali,
    gradient: 'from-blue-500 to-indigo-600',
    glow: 'shadow-blue-500/30',
  },
  {
    key: 'kehadiran-wali',
    label: 'Kehadiran Siswa',
    description: 'Kehadiran siswa',
    icon: Users,
    permission: '/kehadiran-wali',
    component: KehadiranWali,
    gradient: 'from-cyan-500 to-sky-600',
    glow: 'shadow-cyan-500/30',
  },
  {
    key: 'input-kehadiran',
    label: 'Input Kehadiran',
    description: 'Absensi masal',
    icon: CheckSquare,
    permission: '/input-kehadiran-wali',
    component: InputKehadiranWali,
    gradient: 'from-amber-500 to-orange-600',
    glow: 'shadow-amber-500/30',
  },
  {
    key: 'nilai',
    label: 'Nilai Siswa',
    description: 'Input & rekap nilai',
    icon: ClipboardCheck,
    permission: '/nilai-siswa',
    component: DaftarNilaiSiswa,
    gradient: 'from-rose-500 to-pink-600',
    glow: 'shadow-rose-500/30',
  },
  {
    key: 'bk',
    label: 'Bimbingan Konseling',
    description: 'Catatan BK',
    icon: HeartHandshake,
    permission: '/bimbingan-konseling',
    component: DaftarBimbinganKonseling,
    gradient: 'from-fuchsia-500 to-purple-600',
    glow: 'shadow-fuchsia-500/30',
  },
  {
    key: 'prestasi',
    label: 'Prestasi Siswa',
    description: 'Prestasi & piagam',
    icon: Trophy,
    permission: '/prestasi-siswa',
    component: DaftarPrestasiSiswa,
    gradient: 'from-yellow-500 to-amber-600',
    glow: 'shadow-yellow-500/30',
  },
]

export function findMenuByKey(key) {
  return internalMenus.find((m) => m.key === key) || null
}

/**
 * Filter menu sesuai peta hak akses role.
 * `permissions` = { [menu_path]: boolean } — jika null/undefined, semua menu tampil.
 */
export function filterMenusByPermission(menus, permissions) {
  if (!permissions) return menus
  return menus.filter((m) => {
    if (m.permission in permissions) return permissions[m.permission]
    return false
  })
}

export function isMenuAllowed(menu, permissions) {
  if (!menu) return false
  if (!permissions) return true
  if (menu.permission in permissions) return permissions[menu.permission]
  return false
}
