import { useState, useEffect, useRef } from 'react'
import {
  Database as DatabaseIcon, Download, Upload, Trash2, RefreshCw,
  AlertTriangle, CheckCircle, Clock, HardDrive, FileText, Table,
  Plus, X, FileArchive
} from 'lucide-react'
import { getBackups, createBackup, downloadBackup, restoreDatabase, deleteBackup, getDatabaseInfo } from '../api'
import toast from 'react-hot-toast'

export default function Database() {
  const [backups, setBackups] = useState([])
  const [dbInfo, setDbInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [backupsRes, infoRes] = await Promise.all([
        getBackups(),
        getDatabaseInfo()
      ])
      setBackups(backupsRes.data)
      setDbInfo(infoRes.data)
    } catch {
      toast.error('Gagal memuat data database')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBackup = async () => {
    setCreating(true)
    try {
      const res = await createBackup()
      setBackups(prev => [res.data, ...prev])
      toast.success('Backup berhasil dibuat!')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal membuat backup')
    } finally {
      setCreating(false)
    }
  }

  const handleDownload = async (filename) => {
    try {
      const res = await downloadBackup(filename)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('Mengunduh backup...')
    } catch {
      toast.error('Gagal mengunduh backup')
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await deleteBackup(confirmDelete.filename)
      setBackups(prev => prev.filter(b => b.filename !== confirmDelete.filename))
      toast.success('File backup berhasil dihapus')
      setConfirmDelete(null)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menghapus backup')
    }
  }

  const handleFileSelect = (file) => {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (ext !== 'db' && ext !== 'sqlite') {
      toast.error('Hanya file .db atau .sqlite yang diperbolehkan')
      return
    }
    setSelectedFile(file)
    setShowRestoreConfirm(true)
  }

  const handleRestore = async () => {
    if (!selectedFile) return
    setRestoring(true)
    try {
      const res = await restoreDatabase(selectedFile)
      // Reload data setelah restore
      await loadData()
      toast.success(res.data.message || 'Database berhasil direstore!')
      setShowRestoreConfirm(false)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal merestore database')
    } finally {
      setRestoring(false)
    }
  }

  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-annajah-600 mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Memuat data database...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Backup & Restore Database</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola backup database sistem pembayaran</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={handleCreateBackup} disabled={creating} className="btn-primary flex items-center gap-2">
            {creating ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {creating ? 'Membuat...' : 'Buat Backup'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Database */}
        <div className="lg:col-span-2 space-y-6">
          {/* Database Info Cards */}
          {dbInfo && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <HardDrive className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Ukuran</p>
                  <p className="text-sm font-semibold text-gray-700">{dbInfo.sizeFormatted}</p>
                </div>
              </div>
              <div className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Table className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Tabel</p>
                  <p className="text-sm font-semibold text-gray-700">{dbInfo.tableCount}</p>
                </div>
              </div>
              <div className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                  <DatabaseIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Records</p>
                  <p className="text-sm font-semibold text-gray-700">{dbInfo.totalRecords?.toLocaleString('id-ID')}</p>
                </div>
              </div>
              <div className="card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                  <FileArchive className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Backup</p>
                  <p className="text-sm font-semibold text-gray-700">{backups.length}</p>
                </div>
              </div>
            </div>
          )}

          {/* Table Info */}
          {dbInfo && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Detail Tabel Database</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Tabel</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Jumlah Record</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dbInfo.tables.map(t => (
                      <tr key={t.name} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 text-sm text-gray-700 font-medium">{t.name.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-2.5 text-sm text-gray-600 text-right">{t.count.toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Daftar Backup */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Riwayat Backup</h3>
              <span className="text-xs text-gray-400">{backups.length} file</span>
            </div>
            {backups.length === 0 ? (
              <div className="p-8 text-center">
                <FileArchive className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p className="text-sm text-gray-400">Belum ada backup</p>
                <p className="text-xs text-gray-300 mt-1">Klik "Buat Backup" untuk membuat backup pertama</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Nama File</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Ukuran</th>
                      <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Tanggal</th>
                      <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2.5">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {backups.map(backup => (
                      <tr key={backup.filename} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileArchive className="w-4 h-4 text-amber-500 shrink-0" />
                            <span className="text-sm text-gray-700 truncate max-w-[200px] sm:max-w-xs">{backup.filename}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{backup.sizeFormatted}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Clock className="w-3.5 h-3.5" />
                            {backup.createdAtFormatted}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleDownload(backup.filename)}
                              className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Download backup"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(backup)}
                              className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                              title="Hapus backup"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Side Panel — Restore */}
        <div className="space-y-6">
          {/* Restore Section */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <Upload className="w-4 h-4 text-red-500" />
              </div>
              <h3 className="text-sm font-semibold text-gray-700">Restore Database</h3>
            </div>

            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                dragging
                  ? 'border-annajah-400 bg-annajah-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); handleFileSelect(e.dataTransfer.files[0]) }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500 font-medium">
                {dragging ? 'Lepaskan file di sini...' : 'Klik atau drag file .db'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Maksimal 50MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".db,.sqlite"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files[0])}
              />
            </div>

            {selectedFile && (
              <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-sm text-blue-700 truncate">{selectedFile.name}</span>
                </div>
              </div>
            )}

            <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-amber-700">Peringatan</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Restore akan mengganti seluruh data saat ini. Backup otomatis akan dibuat sebelum restore.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Info Penting</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-xs text-gray-500">
                <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                Backup menggunakan format SQLite standar
              </li>
              <li className="flex items-start gap-2 text-xs text-gray-500">
                <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                Backup otomatis dibuat sebelum restore
              </li>
              <li className="flex items-start gap-2 text-xs text-gray-500">
                <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                File backup disimpan di folder server
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal Konfirmasi Restore */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowRestoreConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Restore Database?</h3>
              <p className="text-sm text-gray-500 mt-2">
                Yakin ingin merestore database dari file <strong className="text-gray-700">{selectedFile?.name}</strong>?
              </p>
              <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-3 py-1.5 rounded-lg">
                Backup otomatis akan dibuat sebelum restore sebagai jaga-jaga.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowRestoreConfirm(false); setSelectedFile(null) }} className="btn-secondary flex-1">
                Batal
              </button>
              <button onClick={handleRestore} disabled={restoring} className="btn-danger flex-1 flex items-center justify-center gap-2">
                {restoring ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {restoring ? 'Merestore...' : 'Restore Database'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Backup */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">Hapus Backup?</h3>
              <p className="text-sm text-gray-500 mt-2">
                Hapus <strong className="text-gray-700">{confirmDelete.filename}</strong>?
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Batal</button>
              <button onClick={handleDelete} className="btn-danger flex-1 flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
