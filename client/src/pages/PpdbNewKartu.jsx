import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, SearchCheck, Loader2, Printer, AlertCircle, GraduationCap, CheckCircle, Clock, XCircle, User, Calendar, MapPin, Download } from 'lucide-react'
import { getLogoPublic, cekPpdbNew, downloadKartuPpdbNew, getPengaturanPublic } from '../api'
import toast from 'react-hot-toast'

export default function PpdbNewKartu() {
  const [logoUrl, setLogoUrl] = useState(null)
  const [tahunAjaran, setTahunAjaran] = useState('')
  const [noPendaftaran, setNoPendaftaran] = useState('')
  const [kodeRahasia, setKodeRahasia] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [downloadingKartu, setDownloadingKartu] = useState(false)
  const cardRef = useRef(null)

  useEffect(() => {
    Promise.allSettled([getLogoPublic(), getPengaturanPublic()]).then(([logoRes, sekolahRes]) => {
      if (logoRes.status === 'fulfilled' && logoRes.value.data?.logo) setLogoUrl(logoRes.value.data.logo)
      if (sekolahRes.status === 'fulfilled' && sekolahRes.value.data?.tahun_ajaran_aktif) setTahunAjaran(sekolahRes.value.data.tahun_ajaran_aktif)
    })
    if (!tahunAjaran) {
      const year = new Date().getFullYear()
      setTahunAjaran(`${year}/${year + 1}`)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!noPendaftaran.trim()) { toast.error('Masukkan nomor pendaftaran'); return }
    setLoading(true); setResult(null); setError(null)
    try {
      const res = await cekPpdbNew(noPendaftaran.trim(), kodeRahasia.trim())
      setResult(res.data)
    } catch (error) {
      setError(error.response?.data?.message || 'Gagal memeriksa data')
    } finally { setLoading(false) }
  }

  const handleDownload = async () => {
    if (!result?.no_pendaftaran) return
    setDownloadingKartu(true)
    try {
      await downloadKartuPpdbNew(result.no_pendaftaran)
      toast.success('Kartu pendaftaran berhasil diunduh')
    } catch { toast.error('Gagal mengunduh kartu') }
    finally { setDownloadingKartu(false) }
  }

  const handlePrint = () => {
    if (!cardRef.current) return
    const printContent = cardRef.current.innerHTML
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) { toast.error('Izinkan popup untuk mencetak'); return }
    const printStyles = Array.from(document.styleSheets).map(sheet => {
      try { return Array.from(sheet.cssRules || []).map(rule => rule.cssText).join('') } catch { return '' }
    }).join('')
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Kartu Pendaftaran PPDB</title>
      <style>${printStyles} @page { size: landscape; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; padding: 20px; background: #f3f4f6; } .no-print { display: none !important; }</style>
      </head><body>${printContent}<script>window.onload = function() { window.print(); window.close(); }<\/script></body></html>
    `)
    printWindow.document.close()
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'diterima': return { icon: CheckCircle, bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', label: 'DITERIMA' }
      case 'ditolak': return { icon: XCircle, bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: 'DITOLAK' }
      default: return { icon: Clock, bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', label: 'MENUNGGU' }
    }
  }

  const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-annajah-500/20 focus:border-annajah-500 outline-none transition-all duration-200 bg-white"

  return (
    <div className="min-h-screen bg-gradient-to-br from-annajah-900 via-annajah-700 to-annajah-500 flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white opacity-5 rounded-full"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white opacity-5 rounded-full"></div>
      </div>
      <div className="relative z-10 px-4 py-4">
        <Link to="/ppdbnew" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Link>
      </div>
      <div className="flex-1 flex items-start justify-center px-4 pb-12 relative z-10">
        <div className="w-full max-w-lg">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-xl mb-4 overflow-hidden">
              {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1.5" /> : <GraduationCap className="w-8 h-8 text-annajah-600" />}
            </div>
            <h1 className="text-2xl font-bold text-white">Kartu Pendaftaran</h1>
            <p className="text-annajah-200 text-sm">Masukkan nomor pendaftaran & kode rahasia</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Nomor Pendaftaran</label>
                <input type="text" value={noPendaftaran} onChange={(e) => setNoPendaftaran(e.target.value.toUpperCase())}
                  className={inputClass} placeholder="Contoh: PPDB2026000001" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Kode Rahasia</label>
                <input type="text" value={kodeRahasia} onChange={(e) => setKodeRahasia(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={inputClass} placeholder="6 digit kode rahasia" inputMode="numeric" maxLength={6} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-annajah-500 to-annajah-600 text-white font-medium py-3 px-6 rounded-xl hover:from-annajah-600 hover:to-annajah-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <SearchCheck className="w-5 h-5" />}
                {loading ? 'Memeriksa...' : 'Cari Kartu'}
              </button>
            </form>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center animate-fade-in">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-red-600 font-medium text-sm">{error}</p>
            </div>
          )}

          {result && (
            <div className="animate-fade-in space-y-4">
              {/* Card */}
              <div ref={cardRef}>
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-annajah-200 max-w-md mx-auto">
                  <div className="bg-gradient-to-r from-annajah-600 to-annajah-700 px-6 py-5 text-white text-center">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-md shrink-0">
                        {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" /> : <GraduationCap className="w-5 h-5 text-annajah-600" />}
                      </div>
                      <div className="text-left">
                        <h2 className="font-bold text-sm leading-tight">SMA Annajah</h2>
                        <p className="text-[10px] text-annajah-200">Penerimaan Peserta Didik Baru</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/20">
                      <p className="text-[10px] text-annajah-200 uppercase tracking-wider">Kartu Pendaftaran</p>
                      <p className="text-xs text-annajah-200">{tahunAjaran}</p>
                    </div>
                  </div>

                  <div className="px-6 py-4 text-center border-b border-gray-100">
                    {result.foto && (
                      <div className="flex justify-center mb-3">
                        <div className="w-20 h-24 rounded-xl overflow-hidden border-2 border-annajah-200 shadow-sm">
                          <img src={`/api/ppdbnew/foto/${result.foto}`} alt="Foto" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Nomor Pendaftaran</p>
                    <p className="text-xl font-bold text-annajah-700 font-mono tracking-wider">{result.no_pendaftaran}</p>
                  </div>

                  {(() => {
                    const badge = getStatusBadge(result.status)
                    const Icon = badge.icon
                    return (
                      <div className="px-6 py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                          <Icon className="w-3.5 h-3.5" /> {badge.label}
                        </span>
                      </div>
                    )
                  })()}

                  <div className="px-6 pb-4">
                    <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                      <table className="w-full text-xs">
                        <tbody>
                          {[
                            { icon: User, label: 'NISN', value: result.nisn },
                            { icon: User, label: 'Nama Lengkap', value: result.nama_lengkap, bold: true },
                            { icon: null, label: 'Status Pembayaran', value: result.status_pembayaran === 'lunas' ? '✓ Lunas' : 'Belum Lunas', bold: true, color: result.status_pembayaran === 'lunas' ? 'text-emerald-600' : 'text-amber-600' },
                            { icon: MapPin, label: 'Tempat Lahir', value: result.tempat_lahir || '-' },
                            { icon: Calendar, label: 'Tanggal Lahir', value: result.tanggal_lahir ? new Date(result.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-' },
                            { icon: User, label: 'Jenis Kelamin', value: result.jenis_kelamin || '-' },
                            { icon: MapPin, label: 'Asal Sekolah', value: result.asal_sekolah || '-' },
                            { icon: Calendar, label: 'Tanggal Daftar', value: result.tanggal_daftar ? new Date(result.tanggal_daftar).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-' },
                          ].map((item, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                              <td className="px-3 py-2.5 text-gray-400 w-8">{item.icon && <item.icon className="w-3.5 h-3.5" />}</td>
                              <td className="px-2 py-2.5 text-gray-500 whitespace-nowrap">{item.label}</td>
                              <td className={`px-3 py-2.5 text-right ${item.bold ? 'font-semibold' : ''} ${item.color || 'text-gray-700'}`}>{item.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="px-6 py-3 bg-gradient-to-r from-annajah-50 to-annajah-100 border-t border-annajah-200 text-center">
                    <p className="text-[9px] text-annajah-400">Kartu ini adalah bukti pendaftaran resmi. Simpan sebagai bukti.</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white text-annajah-700 font-medium rounded-xl border border-annajah-200 hover:bg-annajah-50 transition-all"
                >
                  <Printer className="w-4 h-4" /> Cetak
                </button>
                <button onClick={handleDownload} disabled={downloadingKartu}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-annajah-500 text-white font-medium rounded-xl hover:bg-annajah-600 transition-all disabled:opacity-50"
                >
                  {downloadingKartu ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Download PDF
                </button>
              </div>

              <div className="text-center">
                <Link to="/ppdbnew" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Kembali
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
