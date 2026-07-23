import { useState, useEffect } from 'react'
import { kirimEmailLaporan, getPengaturan } from '../api'
import { Send, X, Mail, MessageSquare, FileText, Settings, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function KirimEmail({ isOpen, onClose, jenis, params, label }) {
  const [form, setForm] = useState({
    email_tujuan: '',
    subject: '',
    pesan: '',
  })
  const [sending, setSending] = useState(false)
  const [smtpConfigured, setSmtpConfigured] = useState(null)
  const [ceking, setCeking] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setForm({
        email_tujuan: '',
        subject: `Laporan ${label} - SMA Annajah`,
        pesan: '',
      })
      cekSmtpStatus()
    }
  }, [isOpen])

  const cekSmtpStatus = async () => {
    setCeking(true)
    try {
      const res = await getPengaturan()
      const s = res.data
      if (s.smtp_host && s.smtp_user && s.smtp_pass) {
        setSmtpConfigured(true)
      } else {
        setSmtpConfigured(false)
      }
    } catch {
      setSmtpConfigured(false)
    } finally {
      setCeking(false)
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!form.email_tujuan) {
      toast.error('Masukkan alamat email tujuan')
      return
    }

    setSending(true)
    try {
      await kirimEmailLaporan({
        jenis,
        params: params || {},
        email_tujuan: form.email_tujuan,
        subject: form.subject || `Laporan ${label} - SMA Annajah`,
        pesan: form.pesan,
      })
      toast.success(`Laporan berhasil dikirim ke ${form.email_tujuan}`)
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal mengirim email')
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-annajah-100 rounded-xl flex items-center justify-center">
                <Send className="w-5 h-5 text-annajah-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Kirim via Email</h2>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* SMTP Status */}
          {ceking ? (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl mb-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-annajah-600"></div>
              <span className="text-sm text-gray-500">Memeriksa konfigurasi email...</span>
            </div>
          ) : !smtpConfigured ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">SMTP belum dikonfigurasi</p>
                  <p className="text-xs text-amber-600 mt-1">
                    Silakan atur SMTP di menu <strong>Pengaturan → Konfigurasi Email</strong> terlebih dahulu.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl mb-4">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-green-700">Email siap digunakan</span>
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-4">
            {/* Email Tujuan */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Email Tujuan <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  className="input-field pl-10"
                  placeholder="contoh@email.com"
                  value={form.email_tujuan}
                  onChange={e => setForm({ ...form, email_tujuan: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Subjek</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  className="input-field pl-10"
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                />
              </div>
            </div>

            {/* Pesan */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Pesan Tambahan</label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  className="input-field pl-10 min-h-[80px]"
                  placeholder="Tulis pesan tambahan (opsional)..."
                  value={form.pesan}
                  onChange={e => setForm({ ...form, pesan: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={sending || !smtpConfigured}
                className="btn-primary flex-1 py-3 flex items-center justify-center gap-2">
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Kirim Email
                  </>
                )}
              </button>
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Batal</button>
            </div>
          </form>

          {!smtpConfigured && !ceking && (
            <div className="mt-4 p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 flex items-center gap-2">
                <Settings className="w-3.5 h-3.5" />
                Butuh bantuan konfigurasi SMTP? Gunakan <strong>smtp.gmail.com</strong> dengan App Password untuk Gmail.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
