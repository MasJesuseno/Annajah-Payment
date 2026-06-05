import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth
export const login = (data) => api.post('/auth/login', data)
export const getMe = () => api.get('/auth/me')
export const ubahPassword = (data) => api.put('/auth/ubah-password', data)
export const getCaptcha = () => api.get('/auth/captcha')

// Kelas
export const getKelas = () => api.get('/kelas')
export const createKelas = (data) => api.post('/kelas', data)
export const updateKelas = (id, data) => api.put(`/kelas/${id}`, data)
export const deleteKelas = (id) => api.delete(`/kelas/${id}`)

// Siswa
export const getSiswa = (params) => api.get('/siswa', { params })
export const getSiswaById = (id) => api.get(`/siswa/${id}`)
export const createSiswa = (data) => api.post('/siswa', data)
export const updateSiswa = (id, data) => api.put(`/siswa/${id}`, data)
export const deleteSiswa = (id) => api.delete(`/siswa/${id}`)
export const uploadFotoSiswa = (id, file) => {
  const formData = new FormData()
  formData.append('foto', file)
  return api.put(`/siswa/${id}/foto`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
export const deleteFotoSiswa = (id) => api.delete(`/siswa/${id}/foto`)
export const importSiswa = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/siswa/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
}
export const downloadTemplateSiswa = () => api.get('/siswa/import/template', { responseType: 'blob' })
export const exportSiswa = (params) => api.get('/siswa/export', { params, responseType: 'blob' })
export const getFilterOptionsSiswa = () => api.get('/siswa/filter-options')

// Pembayaran (Jenis Pembayaran)
export const getPembayaran = (params) => api.get('/pembayaran', { params })
export const getPembayaranById = (id) => api.get(`/pembayaran/${id}`)
export const createPembayaran = (data) => api.post('/pembayaran', data)
export const updatePembayaran = (id, data) => api.put(`/pembayaran/${id}`, data)
export const deletePembayaran = (id) => api.delete(`/pembayaran/${id}`)
export const importPembayaran = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/pembayaran/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
}
export const downloadTemplatePembayaran = () => api.get('/pembayaran/import/template', { responseType: 'blob' })
export const exportPembayaran = (params) => api.get('/pembayaran/export', { params, responseType: 'blob' })

// Transaksi
export const getTransaksi = (params) => api.get('/transaksi', { params })
export const getTransaksiById = (id) => api.get(`/transaksi/${id}`)
export const createTransaksi = (data) => api.post('/transaksi', data)
export const updateTransaksi = (id, data) => api.put(`/transaksi/${id}`, data)
export const deleteTransaksi = (id) => api.delete(`/transaksi/${id}`)
export const kirimKwitansiEmail = (id) => api.post(`/transaksi/${id}/kirim-email`)
export const cekSppSiswa = (idSiswa) => api.get(`/transaksi/cek-spp/${idSiswa}`)

// Laporan
export const getRekapLaporan = (params) => api.get('/laporan/rekap', { params })
export const getLaporanPerBulan = (params) => api.get('/laporan/per-bulan', { params })
export const getLaporanSiswa = (params) => api.get('/laporan/siswa', { params })
export const getDashboard = (params) => api.get('/laporan/dashboard', { params })
export const getPerbandinganStatus = (params) => api.get('/laporan/perbandingan-status', { params })
export const getPpdbStatistik = (params) => api.get('/laporan/ppdb-statistik', { params })
export const getWaliKelasPerTingkat = () => api.get('/laporan/wali-kelas-per-tingkat')
export const getKehadiranTren = (params) => api.get('/laporan/kehadiran-tren', { params })
export const getKehadiranRekap = (params) => api.get('/laporan/kehadiran-rekap', { params })
export const getKehadiranSiswa = (params) => api.get('/laporan/kehadiran-siswa', { params })
export const downloadExcelKehadiranKelas = (params) => api.get('/laporan/excel/kehadiran-rekap', { params, responseType: 'blob' })
export const downloadExcelKehadiranSiswa = (params) => api.get('/laporan/excel/kehadiran-siswa', { params, responseType: 'blob' })
export const getKwitansi = (id) => api.get(`/laporan/kwitansi/${id}`, { responseType: 'blob' })

// Excel Export
export const downloadExcelRekap = (params) => api.get('/laporan/excel/rekap', { params, responseType: 'blob' })
export const downloadExcelPerBulan = (params) => api.get('/laporan/excel/per-bulan', { params, responseType: 'blob' })
export const downloadExcelSiswa = (params) => api.get('/laporan/excel/siswa', { params, responseType: 'blob' })
export const downloadExcelTransaksi = (params) => api.get('/laporan/excel/transaksi', { params, responseType: 'blob' })

// PDF Export
export const downloadPdfRekap = (params) => api.get('/laporan/pdf/rekap', { params, responseType: 'blob' })
export const downloadPdfPerBulan = (params) => api.get('/laporan/pdf/per-bulan', { params, responseType: 'blob' })
export const downloadPdfSiswa = (params) => api.get('/laporan/pdf/siswa', { params, responseType: 'blob' })
export const downloadPdfTransaksi = (params) => api.get('/laporan/pdf/transaksi', { params, responseType: 'blob' })
export const downloadPdfKehadiranKelas = (params) => api.get('/laporan/pdf/kehadiran-rekap', { params, responseType: 'blob' })
export const downloadPdfKehadiranSiswa = (params) => api.get('/laporan/pdf/kehadiran-siswa', { params, responseType: 'blob' })
export const downloadExcelKehadiranWali = (guruId, params) => api.get(`/laporan/excel/kehadiran-wali/${guruId}`, { params, responseType: 'blob' })
export const downloadPdfKehadiranWali = (guruId, params) => api.get(`/laporan/pdf/kehadiran-wali/${guruId}`, { params, responseType: 'blob' })

// Ringkasan Keuangan (Pemasukan vs Pengeluaran)
export const getRingkasanKeuangan = (params) => api.get('/laporan/ringkasan-keuangan', { params })
export const downloadExcelRingkasanKeuangan = (params) => api.get('/laporan/excel/ringkasan-keuangan', { params, responseType: 'blob' })
export const downloadPdfRingkasanKeuangan = (params) => api.get('/laporan/pdf/ringkasan-keuangan', { params, responseType: 'blob' })

// Transaksi Gabungan (Laporan Masuk & Keluar)
export const getLaporanTransaksiGabungan = (params) => api.get('/laporan/transaksi-gabungan', { params })
export const downloadExcelTransaksiGabungan = (params) => api.get('/laporan/excel/transaksi-gabungan', { params, responseType: 'blob' })
export const downloadPdfTransaksiGabungan = (params) => api.get('/laporan/pdf/transaksi-gabungan', { params, responseType: 'blob' })

// Wali Kelas Export
export const downloadExcelWaliKelas = (params) => api.get('/laporan/excel/wali-kelas', { params, responseType: 'blob' })
export const downloadPdfWaliKelas = (params) => api.get('/laporan/pdf/wali-kelas', { params, responseType: 'blob' })

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(new Blob([blob]))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

export const downloadExcel = async (endpoint, params, filename) => {
  try {
    const res = await endpoint(params)
    downloadBlob(res.data, filename)
    return true
  } catch (error) {
    throw error
  }
}

// Pengaturan Sekolah
export const getPengaturan = () => api.get('/pengaturan')
export const getPengaturanPublic = () => api.get('/pengaturan/public')
export const getLogoPublic = () => api.get('/pengaturan/logo')
export const updatePengaturan = (data) => api.put('/pengaturan', data)
export const uploadLogo = (file) => {
  const formData = new FormData()
  formData.append('logo', file)
  return api.post('/pengaturan/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
export const deleteLogo = () => api.delete('/pengaturan/logo')

// Email Laporan
export const kirimEmailLaporan = (data) => api.post('/email/kirim', data)
export const testSmtpConnection = () => api.post('/email/test')

// Database Backup & Restore
export const getBackups = () => api.get('/database/backups')
export const createBackup = () => api.post('/database/backup')
export const downloadBackup = (filename) => api.get(`/database/backup/${filename}`, { responseType: 'blob' })
export const restoreDatabase = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/database/restore', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
}
export const deleteBackup = (filename) => api.delete(`/database/backup/${filename}`)
export const getDatabaseInfo = () => api.get('/database/info')

// Manajemen User
export const getUsers = () => api.get('/users')
export const createUser = (data) => api.post('/users', data)
export const updateUser = (id, data) => api.put(`/users/${id}`, data)
export const deleteUser = (id) => api.delete(`/users/${id}`)

// Guru
export const getGuru = () => api.get('/guru')
export const getGuruById = (id) => api.get(`/guru/${id}`)
export const createGuru = (data) => api.post('/guru', data)
export const updateGuru = (id, data) => api.put(`/guru/${id}`, data)
export const deleteGuru = (id) => api.delete(`/guru/${id}`)
export const uploadFotoGuru = (id, file) => {
  const formData = new FormData()
  formData.append('foto', file)
  return api.put(`/guru/${id}/foto`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
export const deleteFotoGuru = (id) => api.delete(`/guru/${id}/foto`)

export const getKelasByWali = (guruId) => api.get(`/kelas/by-wali/${guruId}`)

// Kehadiran
export const getKehadiran = (params) => api.get('/kehadiran', { params })
export const getCekKehadiranHarian = () => api.get('/kehadiran/cek-harian')
export const getKehadiranById = (id) => api.get(`/kehadiran/${id}`)
export const createKehadiran = (data) => api.post('/kehadiran', data)
export const updateKehadiran = (id, data) => api.put(`/kehadiran/${id}`, data)
export const deleteKehadiran = (id) => api.delete(`/kehadiran/${id}`)
export const getKehadiranByWali = (guruId, params) => api.get(`/kehadiran/by-wali/${guruId}`, { params })
export const getRekapMingguanKehadiran = (guruId) => api.get(`/kehadiran/rekap-mingguan/${guruId}`)
export const createKehadiranBulk = (data) => api.post('/kehadiran/bulk', data)

// Import Guru
export const importGuru = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/guru/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
}
export const downloadTemplateGuru = () => api.get('/guru/import/template', { responseType: 'blob' })

// Export Guru
export const exportGuru = (params) => api.get('/guru/export', { params, responseType: 'blob' })
export const exportGuruPdf = (params) => api.get('/guru/export/pdf', { params, responseType: 'blob' })

// Riwayat Pendidikan Guru
export const getRiwayatPendidikan = (guruId) => api.get(`/guru/${guruId}/riwayat-pendidikan`)
export const createRiwayatPendidikan = (data) => api.post('/guru/riwayat-pendidikan', data)
export const updateRiwayatPendidikan = (id, data) => api.put(`/guru/riwayat-pendidikan/${id}`, data)
export const deleteRiwayatPendidikan = (id) => api.delete(`/guru/riwayat-pendidikan/${id}`)

// PPDB
export const daftarPpdb = (data) => api.post('/ppdb/daftar', data, {
  headers: { 'Content-Type': 'multipart/form-data' },
})
export const cekPpdb = (noPendaftaran, kodeRahasia) => api.get(`/ppdb/cek/${noPendaftaran}`, { params: { kode_rahasia: kodeRahasia } })
export const getPpdbList = (params) => api.get('/ppdb', { params })
export const getPpdbById = (id) => api.get(`/ppdb/${id}`)
export const updatePpdb = (id, data) => api.put(`/ppdb/${id}`, data)
export const updateStatusPpdb = (id, data) => api.put(`/ppdb/${id}/status`, data)
export const deletePpdb = (id) => api.delete(`/ppdb/${id}`)
export const exportPpdb = (params) => api.get('/ppdb/export', { params, responseType: 'blob' })
export const exportPpdbPdf = (params) => api.get('/ppdb/export/pdf', { params, responseType: 'blob' })
export const exportPpdbPdfBulk = (params) => api.get('/ppdb/export/pdf-bulk', { params, responseType: 'blob' })
export const importPpdb = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/ppdb/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
}
export const downloadTemplatePpdb = () => api.get('/ppdb/import/template', { responseType: 'blob' })
export const cetakPpdbPdf = (id) => api.get(`/ppdb/${id}/cetak-pdf`, { responseType: 'blob' })
export const cetakPpdbKartu = (id) => api.get(`/ppdb/${id}/cetak-kartu`, { responseType: 'blob' })
// Kehadiran Guru (Absen Guru)
export const getKehadiranGuru = (params) => api.get('/kehadiran-guru', { params })
export const getKehadiranGuruSaya = (params) => api.get('/kehadiran-guru/saya', { params })
export const getStatusKehadiranGuru = () => api.get('/kehadiran-guru/status-hari-ini')
export const absenMasukGuru = (data) => api.post('/kehadiran-guru/absen-masuk', data)
export const absenKeluarGuru = (id, data) => api.put(`/kehadiran-guru/absen-keluar/${id}`, data)
export const createKehadiranGuru = (data) => api.post('/kehadiran-guru', data)
export const updateKehadiranGuru = (id, data) => api.put(`/kehadiran-guru/${id}`, data)
export const downloadExcelKehadiranGuru = (params) => api.get('/kehadiran-guru/export-excel', { params, responseType: 'blob' })
export const getKehadiranGuruTrend = (params) => api.get('/kehadiran-guru/trend', { params })
export const getKehadiranGuruRingkasan = () => api.get('/kehadiran-guru/ringkasan')
export const getRekapKehadiranGuru = (params) => api.get('/kehadiran-guru/rekap-bulanan', { params })
export const backfillGpsKehadiranGuru = () => api.post('/kehadiran-guru/backfill-gps')

export const downloadKartuPpdb = async (noPendaftaran) => {
  try {
    const res = await api.get(`/ppdb/cetak-kartu/${noPendaftaran}`, { responseType: 'blob' })
    downloadBlob(res.data, `kartu_ppdb_${noPendaftaran}.pdf`)
    return true
  } catch (error) {
    throw error
  }
}
export const kirimEmailNotifPpdb = (id) => api.post(`/ppdb/${id}/kirim-email`)
export const getPpdbEmailLog = (params) => api.get('/ppdb/email-log', { params })
export const getPpdbSettings = () => api.get('/ppdb/settings')
export const updatePpdbSettings = (data) => api.put('/ppdb/settings', data)
export const testKirimPpdbEmail = (data) => api.post('/ppdb/settings/test-kirim', data)
export const kirimEmailKartuPpdb = (data) => api.post('/ppdb/kirim-kartu-email', data)

export const konversiPpdbSiswa = (id, data) => api.post(`/ppdb/${id}/konversi-siswa`, data)

// Ekstrakurikuler
export const getEkstrakurikuler = () => api.get('/ekstrakurikuler')
export const getEkstrakurikulerById = (id) => api.get(`/ekstrakurikuler/${id}`)
export const createEkstrakurikuler = (data) => api.post('/ekstrakurikuler', data)
export const updateEkstrakurikuler = (id, data) => api.put(`/ekstrakurikuler/${id}`, data)
export const deleteEkstrakurikuler = (id) => api.delete(`/ekstrakurikuler/${id}`)
export const getPesertaEkstrakurikuler = (id) => api.get(`/ekstrakurikuler/${id}/peserta`)
export const addPesertaEkstrakurikuler = (id, data) => api.post(`/ekstrakurikuler/${id}/peserta`, data)
export const removePesertaEkstrakurikuler = (id, pesertaId) => api.delete(`/ekstrakurikuler/${id}/peserta/${pesertaId}`)
export const getSemuaPesertaEkstrakurikuler = (params) => api.get('/ekstrakurikuler/semua-peserta', { params })
export const getEkskulBySiswa = (idSiswa) => api.get(`/ekstrakurikuler/by-siswa/${idSiswa}`)
export const simpanPesertaEkstrakurikuler = (data) => api.post('/ekstrakurikuler/siswa-peserta', data)
export const exportExcelPesertaEkstrakurikuler = (params) => api.get('/ekstrakurikuler/export-excel', { params, responseType: 'blob' })
export const getRekapEkstrakurikuler = () => api.get('/ekstrakurikuler/rekap')
export const exportExcelRekapEkstrakurikuler = () => api.get('/ekstrakurikuler/export-excel-rekap', { responseType: 'blob' })

// Bimbingan Konseling
export const getBimbinganKonseling = (params) => api.get('/bimbingan-konseling', { params })
export const getBimbinganKonselingById = (id) => api.get(`/bimbingan-konseling/${id}`)
export const createBimbinganKonseling = (data) => api.post('/bimbingan-konseling', data)
export const updateBimbinganKonseling = (id, data) => api.put(`/bimbingan-konseling/${id}`, data)
export const deleteBimbinganKonseling = (id) => api.delete(`/bimbingan-konseling/${id}`)
export const exportExcelBk = (params) => api.get('/bimbingan-konseling/export-excel', { params, responseType: 'blob' })
export const getRekapBk = () => api.get('/bimbingan-konseling/rekap')

// Prestasi Siswa
export const getPrestasiSiswa = (params) => api.get('/prestasi-siswa', { params })
export const getPrestasiSiswaById = (id) => api.get(`/prestasi-siswa/${id}`)
export const createPrestasiSiswa = (data) => {
  return api.post('/prestasi-siswa', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
export const updatePrestasiSiswa = (id, data) => {
  return api.put(`/prestasi-siswa/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
export const deletePrestasiSiswa = (id) => api.delete(`/prestasi-siswa/${id}`)
export const deleteFotoPrestasiSiswa = (id) => api.delete(`/prestasi-siswa/${id}/foto`)
export const getRekapPrestasiSiswa = () => api.get('/prestasi-siswa/rekap')
export const exportExcelPrestasiSiswa = (params) => api.get('/prestasi-siswa/export-excel', { params, responseType: 'blob' })
export const cetakPiagamPrestasi = (id) => api.get(`/prestasi-siswa/cetak-piagam/${id}`, { responseType: 'blob' })
export const getPiagamSettings = () => api.get('/prestasi-siswa/piagam-settings')
export const updatePiagamSettings = (data) => api.put('/prestasi-siswa/piagam-settings', data)
export const kirimPiagamEmail = (id, data) => api.post(`/prestasi-siswa/${id}/kirim-piagam`, data)

// Mata Pelajaran
export const getMataPelajaran = (params) => api.get('/mata-pelajaran', { params })
export const getMataPelajaranById = (id) => api.get(`/mata-pelajaran/${id}`)
export const createMataPelajaran = (data) => api.post('/mata-pelajaran', data)
export const updateMataPelajaran = (id, data) => api.put(`/mata-pelajaran/${id}`, data)
export const deleteMataPelajaran = (id) => api.delete(`/mata-pelajaran/${id}`)
export const exportExcelMataPelajaran = (params) => api.get('/mata-pelajaran/export', { params, responseType: 'blob' })
export const importMataPelajaran = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/mata-pelajaran/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
}
export const downloadTemplateMataPelajaran = () => api.get('/mata-pelajaran/import/template', { responseType: 'blob' })

export const uploadFotoPpdb = (id, file) => {
  const formData = new FormData()
  formData.append('foto', file)
  return api.put(`/ppdb/${id}/foto`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
export const deleteFotoPpdb = (id) => api.delete(`/ppdb/${id}/foto`)

// Periode Penilaian
export const getPeriodePenilaian = () => api.get('/periode-penilaian')
export const getPeriodePenilaianById = (id) => api.get(`/periode-penilaian/${id}`)
export const createPeriodePenilaian = (data) => api.post('/periode-penilaian', data)
export const updatePeriodePenilaian = (id, data) => api.put(`/periode-penilaian/${id}`, data)
export const deletePeriodePenilaian = (id) => api.delete(`/periode-penilaian/${id}`)

// Nilai Siswa
export const getNilaiSiswa = (params) => api.get('/nilai-siswa', { params })
export const getNilaiSiswaById = (id) => api.get(`/nilai-siswa/${id}`)
export const createNilaiSiswa = (data) => api.post('/nilai-siswa', data)
export const updateNilaiSiswa = (id, data) => api.put(`/nilai-siswa/${id}`, data)
export const deleteNilaiSiswa = (id) => api.delete(`/nilai-siswa/${id}`)
export const getRekapNilaiSiswa = (params) => api.get('/nilai-siswa/rekap', { params })
export const exportExcelNilaiSiswa = (params) => api.get('/nilai-siswa/export', { params, responseType: 'blob' })
export const importNilaiSiswa = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/nilai-siswa/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
}
export const downloadTemplateNilaiSiswa = () => api.get('/nilai-siswa/import/template', { responseType: 'blob' })

// Tahun Ajaran Master
export const getTahunAjaran = () => api.get('/tahun-ajaran')
export const getTahunAjaranAktif = () => api.get('/tahun-ajaran/aktif')
export const createTahunAjaran = (data) => api.post('/tahun-ajaran', data)
export const updateTahunAjaran = (id, data) => api.put(`/tahun-ajaran/${id}`, data)
export const deleteTahunAjaran = (id) => api.delete(`/tahun-ajaran/${id}`)

// Role Permissions
export const getRolePermissions = () => api.get('/role-permissions')
export const getRolePermissionsByRole = (role) => api.get(`/role-permissions/${role}`)
export const updateRolePermissions = (role, data) => api.put(`/role-permissions/${role}`, data)

// Activity Log
export const getActivityLog = (params) => api.get('/activity-log', { params })
export const createActivityLog = (data) => api.post('/activity-log', data)

export default api

