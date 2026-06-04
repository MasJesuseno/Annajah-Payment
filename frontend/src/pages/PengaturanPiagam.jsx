import { useState, useEffect } from 'react'
import { getPiagamSettings, updatePiagamSettings } from '../api'
import {
  Palette, Type, Quote, Save, RefreshCw, Eye, Edit3,
  Loader2, Image, FileText, Layout, AlignLeft, AlignCenter, AlignJustify
} from 'lucide-react'
import toast from 'react-hot-toast'

const DEFAULT_SETTINGS = {
  judul_piagam: 'PIAGAM PENGHARGAAN',
  subtitle_piagam: 'Diberikan kepada:',
  teks_prestasi: 'Telah berhasil meraih prestasi',
  kutipan: '"Sesungguhnya bersama kesulitan ada kemudahan" (QS. Al-Insyirah: 6)',
  warna_aksen: '#D4A853',
  warna_teks_judul: '#D4A853',
  warna_teks_utama: '#1C1917',
  ukuran_judul: '22',
  ukuran_nama: '28',
  tampilkan_logo: '1',
  tampilkan_kutipan: '1',
  tampilkan_footer: '1',
  alignment: 'center',
}

export default function PengaturanPiagam() {
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await getPiagamSettings()
      setSettings(prev => ({ ...prev, ...res.data }))
    } catch {
      toast.error('Gagal memuat pengaturan piagam')
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
      await updatePiagamSettings(settings)
      toast.success('Pengaturan template piagam berhasil disimpan!')
    } catch {
      toast.error('Gagal menyimpan pengaturan')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Reset semua pengaturan template piagam ke default?')) return
    setSaving(true)
    try {
      await updatePiagamSettings(DEFAULT_SETTINGS)
      setSettings({ ...DEFAULT_SETTINGS })
      toast.success('Pengaturan piagam berhasil di-reset ke default')
    } catch {
      toast.error('Gagal mereset pengaturan')
    } finally {
      setSaving(false)
    }
  }

  const ColorField = ({ label, settingKey, description }) => (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-white border border-gray-100">
      <div className="relative">
        <input
          type="color"
          value={settings[settingKey]}
          onChange={e => handleChange(settingKey, e.target.value)}
          className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer bg-white p-0.5"
        />
        <div className="absolute inset-0 rounded-lg border border-gray-200 pointer-events-none" />
      </div>
      <div className="flex-1 min-w-0">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {description && <p className="text-xs text-gray-400">{description}</p>}
      </div>
      <input
        type="text"
        value={settings[settingKey]}
        onChange={e => handleChange(settingKey, e.target.value)}
        className="w-24 text-xs font-mono text-center input-field py-1.5"
      />
    </div>
  )

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-annajah-600"></div></div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-annajah-50 flex items-center justify-center">
            <Layout className="w-5 h-5 text-annajah-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Pengaturan Template Piagam</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Kustomisasi tampilan piagam/sertifikat prestasi siswa
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPreview(!preview)} className={`btn-secondary text-sm flex items-center gap-2 ${preview ? 'bg-annajah-50 border-annajah-200' : ''}`}>
            {preview ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button onClick={handleReset} className="btn-secondary text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      {preview ? (
        /* ── Preview Card ── */
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-r from-stone-50 to-white p-8 border-b border-stone-200">
            {/* Preview Piagam Mini */}
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ border: `3px solid ${settings.warna_aksen}` }}>
              {/* Decorative top */}
              <div className="h-2" style={{ background: settings.warna_aksen }} />
              <div className={`p-8 space-y-3 ${settings.alignment === 'center' ? 'text-center' : settings.alignment === 'left' ? 'text-left' : 'text-justify'}`}>
                <div className={`w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center ${settings.alignment === 'center' ? 'mx-auto' : ''}`}>
                  <Image className="w-7 h-7 text-stone-400" />
                </div>
                <p className="text-sm font-semibold" style={{ color: settings.warna_teks_utama }}>SMA Annajah</p>
                <div className={`w-32 h-0.5 ${settings.alignment === 'center' ? 'mx-auto' : ''}`} style={{ background: settings.warna_aksen }} />
                <h2 className="font-bold tracking-wider text-center" style={{ color: settings.warna_teks_judul, fontSize: `${settings.ukuran_judul}pt` }}>
                  {settings.judul_piagam}
                </h2>
                <p className="text-xs text-stone-500 text-center">{settings.subtitle_piagam}</p>
                <p className="font-bold text-center" style={{ color: settings.warna_teks_utama, fontSize: `${settings.ukuran_nama}pt` }}>
                  Ahmad Fauzi
                </p>
                <p className="text-sm text-stone-600">{settings.teks_prestasi}</p>
                <p className="font-bold" style={{ color: settings.warna_aksen, fontSize: '18pt' }}>
                  Juara 1
                </p>
                <p className="text-xs text-stone-500">Olimpiade Sains Nasional, diselenggarakan oleh Kemendikbud</p>
                {settings.tampilkan_kutipan === '1' && settings.kutipan && (
                  <p className="text-xs text-stone-400 italic">{settings.kutipan}</p>
                )}
                <div className="pt-4 text-center">
                  <div className="w-36 h-0.5 mx-auto mb-2" style={{ background: settings.warna_teks_utama }} />
                  <p className="text-sm font-semibold" style={{ color: settings.warna_teks_utama }}>Kepala Sekolah</p>
                </div>
              </div>
              <div className="h-2" style={{ background: settings.warna_aksen }} />
            </div>
          </div>
          <div className="p-4 text-center text-xs text-stone-400">
            Preview menggunakan data sampel — simpan pengaturan untuk melihat hasil di piagam sebenarnya
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Teks Piagam ── */}
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <FileText className="w-5 h-5 text-annajah-600" />
              <h3 className="font-semibold text-gray-800 text-sm">Teks Piagam</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Judul Piagam</label>
                <input type="text" className="input-field" value={settings.judul_piagam}
                  onChange={e => handleChange('judul_piagam', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Subtitle</label>
                <input type="text" className="input-field" value={settings.subtitle_piagam}
                  onChange={e => handleChange('subtitle_piagam', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Teks Prestasi</label>
                <input type="text" className="input-field" value={settings.teks_prestasi}
                  onChange={e => handleChange('teks_prestasi', e.target.value)}
                  placeholder="Telah berhasil meraih prestasi" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Kutipan</label>
                <div className="relative">
                  <Quote className="absolute left-3 top-3 w-4 h-4 text-gray-300" />
                  <input type="text" className="input-field pl-9" value={settings.kutipan}
                    onChange={e => handleChange('kutipan', e.target.value)}
                    placeholder="Kutipan inspiratif..." />
                </div>
              </div>
            </div>
          </div>

          {/* ── Warna ── */}
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <Palette className="w-5 h-5 text-annajah-600" />
              <h3 className="font-semibold text-gray-800 text-sm">Warna</h3>
            </div>
            <div className="space-y-2">
              <ColorField label="Warna Aksen (border, dekorasi)" settingKey="warna_aksen" />
              <ColorField label="Warna Teks Judul" settingKey="warna_teks_judul" />
              <ColorField label="Warna Teks Utama (nama siswa)" settingKey="warna_teks_utama" />
            </div>
          </div>

          {/* ── Ukuran Font ── */}
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <Type className="w-5 h-5 text-annajah-600" />
              <h3 className="font-semibold text-gray-800 text-sm">Ukuran Font</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Ukuran Judul</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="14" max="32" value={settings.ukuran_judul}
                    onChange={e => handleChange('ukuran_judul', e.target.value)}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-annajah-600" />
                  <span className="text-sm font-medium text-gray-700 w-10 text-right">{settings.ukuran_judul}pt</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Ukuran Nama Siswa</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="18" max="42" value={settings.ukuran_nama}
                    onChange={e => handleChange('ukuran_nama', e.target.value)}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-annajah-600" />
                  <span className="text-sm font-medium text-gray-700 w-10 text-right">{settings.ukuran_nama}pt</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Alignment ── */}
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <AlignLeft className="w-5 h-5 text-annajah-600" />
              <h3 className="font-semibold text-gray-800 text-sm">Perataan Teks</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4 -mt-3">Mempengaruhi teks deskripsi prestasi, agenda, tanggal, dan kutipan</p>
            <div className="flex gap-3">
              {[
                { value: 'left', label: 'Rata Kiri', icon: AlignLeft },
                { value: 'center', label: 'Rata Tengah', icon: AlignCenter },
                { value: 'justify', label: 'Kiri-Kanan', icon: AlignJustify },
              ].map(opt => {
                const Icon = opt.icon
                return (
                  <button key={opt.value} type="button" onClick={() => handleChange('alignment', opt.value)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl border-2 transition-all flex-1 ${
                      settings.alignment === opt.value
                        ? 'border-annajah-400 bg-annajah-50 text-annajah-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}>
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Opsi Tampilan ── */}
          <div className="card">
            <div className="flex items-center gap-2 mb-5">
              <Image className="w-5 h-5 text-annajah-600" />
              <h3 className="font-semibold text-gray-800 text-sm">Opsi Tampilan</h3>
            </div>
            <div className="space-y-3">
              {[
                { key: 'tampilkan_logo', label: 'Tampilkan Logo Sekolah', desc: 'Logo sekolah akan ditampilkan di bagian atas piagam' },
                { key: 'tampilkan_kutipan', label: 'Tampilkan Kutipan', desc: 'Kutipan inspiratif di bagian bawah sebelum tanda tangan' },
                { key: 'tampilkan_footer', label: 'Tampilkan Footer', desc: 'Teks footer \"Dicetak dari Sistem Administrasi...\" di bagian paling bawah' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div>
                    <label className="text-sm font-medium text-gray-700">{item.label}</label>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer"
                      checked={settings[item.key] === '1'}
                      onChange={e => handleChange(item.key, e.target.checked ? '1' : '0')} />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-annajah-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-annajah-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <button type="submit" disabled={saving}
              className="btn-primary flex items-center gap-2 px-8 py-3 text-base">
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
