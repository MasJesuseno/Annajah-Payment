import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Siswa from './pages/Siswa'
import SiswaWali from './pages/SiswaWali'
import DetailSiswa from './pages/DetailSiswa'
import AlumniSiswa from './pages/AlumniSiswa'
import Kelas from './pages/Kelas'
import JenisPembayaran from './pages/JenisPembayaran'
import Transaksi from './pages/Transaksi'
import Laporan from './pages/Laporan'
import Pengaturan from './pages/Pengaturan'
import Users from './pages/Users'
import Guru from './pages/Guru'
import DetailGuru from './pages/DetailGuru'
import GuruDashboard from './pages/GuruDashboard'
import ProfilSaya from './pages/ProfilSaya'
import KehadiranWali from './pages/KehadiranWali'
import InputKehadiranWali from './pages/InputKehadiranWali'
import Database from './pages/Database'
import Kehadiran from './pages/Kehadiran'
import InputKehadiranBulk from './pages/InputKehadiranBulk'
import PpdbDaftar from './pages/PpdbDaftar'
import PpdbHasil from './pages/PpdbHasil'
import PpdbKartu from './pages/PpdbKartu'
import PpdbAdmin from './pages/PpdbAdmin'
import PpdbSettings from './pages/PpdbSettings'
import PpdbNewLanding from './pages/PpdbNewLanding'
import PpdbNewDaftar from './pages/PpdbNewDaftar'
import PpdbNewHasil from './pages/PpdbNewHasil'
import PpdbNewKartu from './pages/PpdbNewKartu'
import PpdbNewEdit from './pages/PpdbNewEdit'
import PpdbNewAdmin from './pages/PpdbNewAdmin'
import KehadiranGuru from './pages/KehadiranGuru'
import KehadiranGuruSaya from './pages/KehadiranGuruSaya'
import DaftarKehadiranSaya from './pages/DaftarKehadiranSaya'
import RekapKehadiranGuru from './pages/RekapKehadiranGuru'
import Ekstrakurikuler from './pages/Ekstrakurikuler'
import PesertaEkstrakurikuler from './pages/PesertaEkstrakurikuler'
import InputPesertaEkstrakurikuler from './pages/InputPesertaEkstrakurikuler'
import RekapEkstrakurikuler from './pages/RekapEkstrakurikuler'
import DaftarBimbinganKonseling from './pages/DaftarBimbinganKonseling'
import InputBimbinganKonseling from './pages/InputBimbinganKonseling'
import RekapBimbinganKonseling from './pages/RekapBimbinganKonseling'
import DaftarPrestasiSiswa from './pages/DaftarPrestasiSiswa'
import InputPrestasiSiswa from './pages/InputPrestasiSiswa'
import RekapPrestasiSiswa from './pages/RekapPrestasiSiswa'
import PengaturanPiagam from './pages/PengaturanPiagam'
import MataPelajaran from './pages/MataPelajaran'
import PeriodePenilaian from './pages/PeriodePenilaian'
import DaftarNilaiSiswa from './pages/DaftarNilaiSiswa'
import InputNilaiSiswa from './pages/InputNilaiSiswa'
import RekapNilaiSiswa from './pages/RekapNilaiSiswa'
import TahunAjaran from './pages/TahunAjaran'
import RolePermissions from './pages/RolePermissions'
import ActivityLog from './pages/ActivityLog'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-annajah-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Memuat...</p>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) {
    // Guru diarahkan ke dashboard guru, bukan ke dashboard admin
    const defaultPath = user.role === 'guru' ? '/guru-dashboard' : '/dashboard'
    return <Navigate to={defaultPath} replace />
  }
  return children
}

// Komponen untuk redirect default berdasarkan role
function DefaultRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'guru') return <Navigate to="/guru-dashboard" replace />
  return <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute><Login /></PublicRoute>
      } />
      {/* Public PPDB Routes */}
      <Route path="/ppdb" element={<Navigate to="/ppdbnew" replace />} />
      <Route path="/ppdb/daftar" element={<PpdbDaftar />} />
      <Route path="/ppdb/hasil" element={<PpdbHasil />} />
      <Route path="/ppdb/kartu" element={<PpdbKartu />} />
      {/* Public PPDB New Routes */}
      <Route path="/ppdbnew" element={<PpdbNewLanding />} />
      <Route path="/ppdbnew/daftar" element={<PpdbNewDaftar />} />
      <Route path="/ppdbnew/hasil" element={<PpdbNewHasil />} />
      <Route path="/ppdbnew/kartu" element={<PpdbNewKartu />} />
      <Route path="/ppdbnew/edit" element={<PpdbNewEdit />} />
      <Route path="/" element={
        <ProtectedRoute><Layout /></ProtectedRoute>
      }>
        <Route index element={<DefaultRedirect />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="guru-dashboard" element={<GuruDashboard />} />
        <Route path="siswa" element={<Siswa />} />
        <Route path="siswa-wali" element={<SiswaWali />} />
        <Route path="siswa-wali/:id" element={<DetailSiswa />} />
        <Route path="siswa/:id" element={<DetailSiswa />} />
        <Route path="guru" element={<Guru />} />
        <Route path="guru/:id" element={<DetailGuru />} />
        <Route path="kehadiran-wali" element={<KehadiranWali />} />
        <Route path="input-kehadiran-wali" element={<InputKehadiranWali />} />
        <Route path="profil-saya" element={<ProfilSaya />} />
        <Route path="alumni" element={<AlumniSiswa />} />
        <Route path="kelas" element={<Kelas />} />
        <Route path="pembayaran" element={<JenisPembayaran />} />
        <Route path="transaksi" element={<Transaksi />} />
        <Route path="laporan" element={<Laporan />} />
        <Route path="pengaturan" element={<Pengaturan />} />          <Route path="kehadiran" element={<Kehadiran />} />
          <Route path="kehadiran/bulk" element={<InputKehadiranBulk />} />
        <Route path="kehadiran-guru" element={<KehadiranGuru />} />
        <Route path="rekap-kehadiran-guru" element={<RekapKehadiranGuru />} />
        <Route path="kehadiran-guru-saya" element={<KehadiranGuruSaya />} />
        <Route path="daftar-kehadiran-saya" element={<DaftarKehadiranSaya />} />
        <Route path="users" element={<Users />} />
        <Route path="database" element={<Database />} />
        <Route path="ppdb/admin" element={<PpdbAdmin />} />
        <Route path="ppdb/pengaturan" element={<PpdbSettings />} />
        <Route path="ppdbnew/admin" element={<PpdbNewAdmin />} />
        <Route path="ekstrakurikuler" element={<Ekstrakurikuler />} />
        <Route path="ekstrakurikuler/peserta" element={<PesertaEkstrakurikuler />} />
        <Route path="ekstrakurikuler/input-peserta" element={<InputPesertaEkstrakurikuler />} />
        <Route path="ekstrakurikuler/rekap" element={<RekapEkstrakurikuler />} />
        <Route path="bimbingan-konseling" element={<DaftarBimbinganKonseling />} />
        <Route path="bimbingan-konseling/input" element={<InputBimbinganKonseling />} />
        <Route path="bimbingan-konseling/rekap" element={<RekapBimbinganKonseling />} />
        <Route path="prestasi-siswa" element={<DaftarPrestasiSiswa />} />
        <Route path="prestasi-siswa/input" element={<InputPrestasiSiswa />} />
        <Route path="prestasi-siswa/rekap" element={<RekapPrestasiSiswa />} />
        <Route path="prestasi-siswa/pengaturan" element={<PengaturanPiagam />} />
        <Route path="mata-pelajaran" element={<MataPelajaran />} />
        <Route path="periode-penilaian" element={<PeriodePenilaian />} />
        <Route path="nilai-siswa" element={<DaftarNilaiSiswa />} />
        <Route path="nilai-siswa/input" element={<InputNilaiSiswa />} />
        <Route path="nilai-siswa/rekap" element={<RekapNilaiSiswa />} />
        <Route path="tahun-ajaran" element={<TahunAjaran />} />
        <Route path="role-permissions" element={<RolePermissions />} />
        <Route path="log-aktivitas" element={<ActivityLog />} />
      </Route>
      <Route path="*" element={<DefaultRedirect />} />
    </Routes>
  )
}
