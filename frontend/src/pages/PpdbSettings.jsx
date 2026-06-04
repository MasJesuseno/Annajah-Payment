import { useState, useEffect } from 'react'
import { getPpdbSettings, updatePpdbSettings, testKirimPpdbEmail } from '../api'
import { Mail, Save, RefreshCw, Eye, Edit3, Loader2, AlertTriangle, Send, X, CheckCircle2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const PLACEHOLDERS = [
  { key: '{sekolah}', desc: 'Nama sekolah' },
  { key: '{tahun_ajaran}', desc: 'Tahun ajaran aktif' },
  { key: '{no_pendaftaran}', desc: 'Nomor pendaftaran' },
  { key: '{nisn}', desc: 'NISN pendaftar' },
  { key: '{nama_lengkap}', desc: 'Nama lengkap pendaftar' },
  { key: '{status}', desc: 'Status (DITERIMA/DITOLAK)' },
  { key: '{keterangan}', desc: 'Keterangan dari admin' },
  { key: '{keterangan_html}', desc: 'Keterangan dalam format HTML' },
  { key: '{kontak_sekolah}', desc: 'Info kontak sekolah' },
  { key: '{no_telp}', desc: 'No. telepon sekolah' },
  { key: '{email_sekolah}', desc: 'Email sekolah' },
  { key: '{alamat_sekolah}', desc: 'Alamat sekolah' },
  { key: '{tanggal}', desc: 'Tanggal saat ini' },
]

export default function PpdbSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    diterima_subject: '',
    diterima_body: '',
    ditolak_subject: '',
    ditolak_body: '',
  })
  const [previewMode, setPreviewMode] = useState({ diterima: false, ditolak: false })
  const [testingEmail, setTestingEmail] = useState(false)
  const [testModal, setTestModal] = useState({ show: false, type: 'diterima', subject: '', body: '' })
  const [testEmailAddress, setTestEmailAddress] = useState('')
  const [testResult, setTestResult] = useState(null) // { success: true/false, message: '' }

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await getPpdbSettings()
      setSettings(res.data)
    } catch {
      toast.error('Gagal memuat pengaturan email PPDB')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updatePpdbSettings(settings)
      toast.success('Pengaturan email PPDB berhasil disimpan!')
    } catch {
      toast.error('Gagal menyimpan pengaturan')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async (type) => {
    if (!confirm(`Reset template email ${type === 'diterima' ? '"Diterima"' : '"Ditolak"'} ke default?`)) return
    try {
      await updatePpdbSettings({
        [`${type}_subject`]: '',
        [`${type}_body`]: '',
      })
      await loadSettings()
      toast.success(`Template ${type} berhasil di-reset ke default`)
    } catch {
      toast.error('Gagal mereset template')
    }
  }

  const getPreviewHtml = (type) => {
    const body = type === 'diterima' ? settings.diterima_body : settings.ditolak_body
    let html = body
    // Replace placeholders with sample data
    const sample = {
      '{sekolah}': '<strong>SMA Annajah</strong>',
      '{tahun_ajaran}': '<strong>2025/2026</strong>',
      '{no_pendaftaran}': '<strong>PPDB2025000001</strong>',
      '{nisn}': '<strong>0012345678</strong>',
      '{nama_lengkap}': '<strong>Andi Pratama</strong>',
      '{status}': `<strong style="color:${type === 'diterima' ? '#059669' : '#dc2626'}">${type === 'diterima' ? 'DITERIMA' : 'DITOLAK'}</strong>`,
      '{keterangan}': 'Silakan daftar ulang pada 1-10 Juli 2025',
      '{keterangan_html}': '<div style="background:#fef3c7;padding:12px;border-radius:8px;margin:15px 0"><strong>Catatan:</strong><br/>Silakan daftar ulang pada 1-10 Juli 2025</div>',
      '{kontak_sekolah}': 'Telp: (021) 12345678<br/>Email: info@smaannajah.sch.id',
      '{no_telp}': '(021) 12345678',
      '{email_sekolah}': 'info@smaannajah.sch.id',
      '{alamat_sekolah}': 'Jl. Pendidikan No. 1',
      '{tanggal}': new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    }
    for (const [key, val] of Object.entries(sample)) {
      html = html.split(key).join(val)
    }
    return html.includes('<') ? html : html.replace(/\n/g, '<br/>')
  }

  const TemplateSection = ({ type, label }) => {
    const isDiterima = type === 'diterima'
    const preview = previewMode[type]
    const subjectKey = `${type}_subject`
    const bodyKey = `${type}_body`

    return (
      <div className="card border-l-4" style={{ borderLeftColor: isDiterima ? '#059669' : '#DC2626' }}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDiterima ? 'bg-emerald-100' : 'bg-red-100'}`}>
            <Mail className={`w-5 h-5 ${isDiterima ? 'text-emerald-600' : 'text-red-600'}`} />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-800">Template Email {label}</h2>
            <p className="text-xs text-gray-400">
              Dikirim saat status pendaftar diubah menjadi <strong>{label.toLowerCase()}</strong>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPreviewMode(prev => ({ ...prev, [type]: !prev[type] }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                preview ? 'bg-annajah-50 border-annajah-200 text-annajah-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {preview ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {preview ? 'Edit' : 'Preview'}
            </button>
            <button
              type="button"
              onClick={() => {
                setTestModal({ show: true, type, subject: settings[`${type}_subject`], body: settings[`${type}_body`] })
                setTestEmailAddress('')
                setTestResult(null)
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-amber-200 text-amber-600 hover:bg-amber-50 transition-all duration-200"
            >
              <Send className="w-3.5 h-3.5" />
              Test Kirim
            </button>
            <button
              type="button"
              onClick={() => handleReset(type)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all duration-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>

        {preview ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Subject:</label>
              <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 font-mono">
                {settings[subjectKey] || '-'}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Preview Body:</label>
              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 text-xs text-gray-400 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-2">Preview Email — data sampel ditampilkan</span>
                </div>
                <div className="p-4 bg-white">
                  <div dangerouslySetInnerHTML={{ __html: getPreviewHtml(type) }} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Subject Email <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                className="input-field font-mono text-sm"
                value={settings[subjectKey]}
                onChange={e => handleChange(subjectKey, e.target.value)}
                placeholder={`[PPDB {sekolah}] ... — ${isDiterima ? 'DITERIMA' : 'DITOLAK'}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                Body Email (HTML) <span className="text-red-400">*</span>
                <span className="text-xs text-gray-400 font-normal ml-2">— Gunakan placeholder { } untuk data dinamis</span>
              </label>
              <textarea
                className="input-field font-mono text-sm min-h-[300px] resize-y"
                value={settings[bodyKey]}
                onChange={e => handleChange(bodyKey, e.target.value)}
                placeholder={`<div style="...">\n  ...\n</div>`}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-annajah-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Pengaturan Email PPDB</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kustomisasi template notifikasi email untuk pendaftar PPDB
          </p>
        </div>
      </div>

      {/* Placeholder Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">Placeholder yang tersedia</p>
            <p className="text-xs text-blue-600 mt-1">
              Gunakan placeholder berikut di template subject dan body. Akan diganti dengan data sebenarnya saat email dikirim.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {PLACEHOLDERS.map(p => (
                <span
                  key={p.key}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-md border border-blue-200 text-xs font-mono text-blue-700"
                  title={p.desc}
                >
                  <code>{p.key}</code>
                  <span className="text-blue-400 font-sans">— {p.desc}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Template Diterima */}
        <TemplateSection type="diterima" label="Diterima" />

        {/* Template Ditolak */}
        <TemplateSection type="ditolak" label="Ditolak" />

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2 px-8 py-3 text-base"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      </form>

      {/* Test Email Modal */}
      {testModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setTestModal({ ...testModal, show: false })}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className={`px-6 py-4 ${testModal.type === 'diterima' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gradient-to-r from-red-500 to-red-600'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Send className="w-5 h-5 text-white" />
                  <div>
                    <h3 className="text-white font-semibold text-base">Test Kirim Email</h3>
                    <p className="text-white/80 text-xs mt-0.5">
                      Template: <strong>{testModal.type === 'diterima' ? 'Diterima' : 'Ditolak'}</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setTestModal({ ...testModal, show: false })}
                  className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Tujuan <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  className="input-field"
                  value={testEmailAddress}
                  onChange={e => { setTestEmailAddress(e.target.value); setTestResult(null) }}
                  placeholder="contoh@email.com"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  Email akan dikirim menggunakan data sampel (nama: Andi Pratama, no: PPDB{tahun}000001) dengan label <strong>[TEST]</strong> di subject dan watermark di body.
                </p>
              </div>

              {/* Result */}
              {testResult && (
                <div className={`flex items-start gap-3 p-4 rounded-xl ${
                  testResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${testResult.success ? 'text-emerald-800' : 'text-red-800'}`}>
                      {testResult.success ? 'Email berhasil dikirim!' : 'Gagal mengirim email'}
                    </p>
                    <p className={`text-xs mt-1 ${testResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
                      {testResult.message}
                    </p>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTestModal({ ...testModal, show: false })}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={testingEmail || !testEmailAddress}
                  onClick={async () => {
                    if (!testEmailAddress) return
                    setTestingEmail(true)
                    setTestResult(null)
                    try {
                      const res = await testKirimPpdbEmail({
                        type: testModal.type,
                        email_tujuan: testEmailAddress,
                        subject_template: testModal.subject,
                        body_template: testModal.body,
                      })
                      setTestResult({ success: true, message: res.data.message })
                      toast.success('Email uji coba berhasil dikirim!')
                    } catch (err) {
                      const msg = err.response?.data?.message || 'Gagal mengirim email uji coba'
                      setTestResult({ success: false, message: msg })
                      toast.error(msg)
                    } finally {
                      setTestingEmail(false)
                    }
                  }}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                    testingEmail || !testEmailAddress
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : testModal.type === 'diterima'
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                        : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200'
                  }`}
                >
                  {testingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {testingEmail ? 'Mengirim...' : 'Kirim Email Uji Coba'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
