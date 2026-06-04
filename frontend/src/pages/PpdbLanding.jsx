import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  School, UserPlus, SearchCheck, ArrowRight, GraduationCap, BookOpen,
  CreditCard, MapPin, Phone, Mail, Globe, Clock, CheckCircle, ExternalLink,
  Users, Star, Award, TrendingUp, Shield, BookMarked,
  Quote, Sun, Flag, Sprout, ChefHat, Music, Camera, Trophy, Leaf, Palette
} from 'lucide-react'
import { getLogoPublic, getPengaturanPublic } from '../api'

// ─── Scroll Animation Hook ───
function useScrollAnimation(threshold = 0.15) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return [ref, visible]
}

// ─── Animated Section Wrapper ───
function AnimatedSection({ children, className = '', delay = 0 }) {
  const [ref, visible] = useScrollAnimation()
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

// ─── Floating Particles ───
function Particles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    size: Math.random() * 6 + 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 10 + 8,
    delay: Math.random() * 5,
    opacity: Math.random() * 0.15 + 0.03,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: p.opacity,
            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
      {/* Decorative rings */}
      <div className="absolute -top-60 -right-60 w-96 h-96 border border-white/10 rounded-full animate-spin-slow" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 border border-white/5 rounded-full animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '25s' }} />
      <div className="absolute top-1/3 left-1/2 w-64 h-64 border border-white/5 rounded-full animate-spin-slow" style={{ animationDuration: '30s' }} />
    </div>
  )
}

// ─── Section Badge ───
function SectionBadge({ text }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--cu)]/10 border border-[var(--cu)]/20 text-[var(--cu)] text-xs font-semibold mb-4">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--cu)] animate-pulse-slow" />
      {text}
    </div>
  )
}

// ─── Section Title ───
function SectionTitle({ children, className = '' }) {
  return (
    <h2 className={`text-3xl sm:text-4xl font-bold text-gray-900 mb-3 ${className}`}>
      {children}
    </h2>
  )
}

// ─── Section Subtitle ───
function SectionSubtitle({ children }) {
  return (
    <p className="text-gray-500 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
      {children}
    </p>
  )
}

// ─── Program Card ───
function ProgramCard({ icon: Icon, title, desc, color = 'annajah' }) {
  const colorMap = {
    annajah: { from: 'from-[var(--cu)]', to: 'to-[var(--cu)]', bg: 'bg-[var(--cu)]/5', text: 'text-[var(--cu)]', border: 'border-[var(--cu)]/10' },
    emerald: { from: 'from-[var(--cs)]', to: 'to-[var(--cs)]', bg: 'bg-[var(--cs)]/5', text: 'text-[var(--cs)]', border: 'border-[var(--cs)]/10' },
    violet: { from: 'from-[var(--ca)]', to: 'to-[var(--ca)]', bg: 'bg-[var(--ca)]/5', text: 'text-[var(--ca)]', border: 'border-[var(--ca)]/10' },
    amber: { from: 'from-amber-500', to: 'to-amber-600', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    rose: { from: 'from-rose-500', to: 'to-rose-600', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
    sky: { from: 'from-sky-500', to: 'to-sky-600', bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-100' },
  }
  const c = colorMap[color] || colorMap.annajah

  return (
    <div className={`group bg-white rounded-2xl p-6 border ${c.border} hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
      <div className={`w-12 h-12 ${c.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className={`w-6 h-6 ${c.text}`} />
      </div>
      <h3 className="font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  )
}

// ─── Timeline Step ───
function TimelineStep({ number, title, desc, icon: Icon, isLast }) {
  return (
    <div className="relative flex gap-5">
      {/* Connecting line */}
      {!isLast && (
        <div className="absolute left-[19px] top-11 bottom-0 w-0.5 bg-gradient-to-b from-[var(--cu)]/30 to-[var(--cu)]/10" />
      )}

      {/* Step circle */}
      <div className="relative shrink-0">
        <div className="w-10 h-10 bg-gradient-to-br from-[var(--cu)] to-[var(--cu)] rounded-xl flex items-center justify-center shadow-lg shadow-[var(--cu)]/20">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-white border-2 border-[var(--cu)] rounded-full flex items-center justify-center text-[10px] font-bold text-[var(--cu)]">
          {number}
        </div>
      </div>

      {/* Content */}
      <div className="pb-8">
        <h3 className="font-bold text-gray-800 mb-1">{title}</h3>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
    </div>
  )
}

// ─── Ekstrakurikuler Color Map ───
const EXTRAKULIKULER_COLORS = {
  annajah: { bg: 'bg-[var(--cu)]/5', text: 'text-[var(--cu)]', border: 'border-[var(--cu)]/20', gradient: 'from-[var(--cu)]', shadow: 'shadow-[var(--cu)]/20', ring: 'ring-[var(--cu)]/20' },
  emerald: { bg: 'bg-[var(--cs)]/5', text: 'text-[var(--cs)]', border: 'border-[var(--cs)]/20', gradient: 'from-[var(--cs)]', shadow: 'shadow-[var(--cs)]/20', ring: 'ring-[var(--cs)]/20' },
  violet: { bg: 'bg-[var(--ca)]/5', text: 'text-[var(--ca)]', border: 'border-[var(--ca)]/20', gradient: 'from-[var(--ca)]', shadow: 'shadow-[var(--ca)]/20', ring: 'ring-[var(--ca)]/20' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', gradient: 'from-amber-500', shadow: 'shadow-amber-500/20', ring: 'ring-amber-200' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', gradient: 'from-rose-500', shadow: 'shadow-rose-500/20', ring: 'ring-rose-200' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200', gradient: 'from-sky-500', shadow: 'shadow-sky-500/20', ring: 'ring-sky-200' },
}

// ─── Main Component ───
export default function PpdbLanding() {
  const [logoUrl, setLogoUrl] = useState(null)
  const [logoError, setLogoError] = useState(false)
  const [sekolah, setSekolah] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [logoRes, sekolahRes] = await Promise.allSettled([
        getLogoPublic(),
        getPengaturanPublic(),
      ])
      if (logoRes.status === 'fulfilled' && logoRes.value.data?.logo) {
        setLogoUrl(logoRes.value.data.logo)
      }
      if (sekolahRes.status === 'fulfilled' && sekolahRes.value.data) {
        setSekolah(sekolahRes.value.data)
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false)
    }
  }

  const namaSekolah = sekolah?.nama_sekolah || 'SMA Annajah'
  const alamatLengkap = 'Yayasan Keluarga Besar Annajah, Kp. Cikoleang RT. 01/04, Jl. Raya Cikoleang-LAPAN No.Ds, Sukamulya, Kec. Rumpin, Kabupaten Bogor, Jawa Barat 16350'
  const npsn = '20246436'
  const kepalaSekolah = sekolah?.kepala_sekolah || ''

  // ─── Dynamic Colors ───
  const warnaUtama = sekolah?.warna_utama || '#15803d'
  const warnaSekunder = sekolah?.warna_sekunder || '#059669'
  const warnaAksen = sekolah?.warna_aksen || '#7C3AED'
  const warnaTulisanPpdb = sekolah?.warna_tulisan_ppdb || '#ffffff'
  const warnaFooterBg = sekolah?.warna_footer_bg || '#111827'
  const warnaFooterText = sekolah?.warna_footer_text || '#9CA3AF'
  const warnaFooterJudul = sekolah?.warna_footer_judul || '#ffffff'

  const tahunAjaran = sekolah?.tahun_ajaran_aktif || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`

  return (
    <div className="min-h-screen bg-white" style={{ '--cu': warnaUtama, '--cs': warnaSekunder, '--ca': warnaAksen, '--ctp': warnaTulisanPpdb, '--cfbg': warnaFooterBg, '--cftxt': warnaFooterText, '--cfjudul': warnaFooterJudul }}>
      {/* ============================== */}
      {/* HERO SECTION */}
      {/* ============================== */}          <section className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${warnaUtama} 25%, black), color-mix(in srgb, ${warnaUtama} 35%, black), color-mix(in srgb, ${warnaUtama} 25%, black))` }}>
        <Particles />

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none" />

        {/* Nav */}
        <nav className="relative z-20 flex items-center justify-between px-4 sm:px-8 py-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/90 flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105">
              {logoUrl && !logoError ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1"
                  onError={() => setLogoError(true)} />
              ) : (
                <School className="w-5 h-5 text-[var(--cu)]" />
              )}
            </div>
            <div className="text-white">
              <h1 className="font-bold text-sm leading-tight">{namaSekolah}</h1>
              <p className="text-[10px] text-[var(--cu)]/70">PPDB Online {tahunAjaran}</p>
            </div>
          </Link>

          <a href="#info" className="hidden sm:inline-flex text-xs text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-all duration-200">
            Informasi
          </a>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-4xl text-center">
            {/* Badge */}
            <div className="animate-blur-in anim-delay-1 mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-xs font-medium backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-[var(--cu)] animate-pulse-slow" />
                Penerimaan Peserta Didik Baru {tahunAjaran}
              </span>
            </div>

            {/* Logo */}
            <div className="animate-blur-in anim-delay-2 mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white/95 rounded-3xl shadow-2xl overflow-hidden transition-transform duration-500 hover:scale-105">
                {logoUrl && !logoError ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-3"
                    onError={() => setLogoError(true)} />
                ) : (
                  <GraduationCap className="w-12 h-12 text-[var(--cu)]" />
                )}
              </div>
            </div>

            {/* Title */}
            <h1 className="animate-blur-in anim-delay-3 text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
              <span className="inline-block">Selamat Datang di</span>{' '}
              <span className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-[var(--cu)]/30 via-[var(--cs)]/30 to-[var(--cu)]/20">
                {namaSekolah}
              </span>
            </h1>

            <p className="animate-blur-in anim-delay-4 text-base sm:text-lg text-[var(--ctp)] mb-10 max-w-xl mx-auto leading-relaxed">
              Bergabunglah bersama kami untuk meraih masa depan gemilang.
              Daftarkan diri Anda sekarang juga!
            </p>

            {/* CTA Buttons */}
            <div className="animate-slide-up anim-delay-5 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/ppdb/daftar"
                className="group relative inline-flex items-center gap-2.5 bg-white text-[var(--cu)] font-bold py-3.5 px-8 rounded-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 shadow-lg overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2.5">
                  <UserPlus className="w-5 h-5" />
                  Daftar Sekarang
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--cu)]/5 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>

              <div className="flex gap-3">
                <Link
                  to="/ppdb/hasil"
                  className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white border border-white/20 font-medium py-3.5 px-6 rounded-xl hover:bg-white/20 transition-all duration-300"
                >
                  <SearchCheck className="w-4 h-4" />
                  Cek Hasil
                </Link>
                <Link
                  to="/ppdb/kartu"
                  className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white border border-white/20 font-medium py-3.5 px-6 rounded-xl hover:bg-white/20 transition-all duration-300"
                >
                  <CreditCard className="w-4 h-4" />
                  Kartu
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="relative z-10 flex justify-center pb-8 animate-bounce-gentle">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-white/60 animate-pulse-slow" />
          </div>
        </div>
      </section>

      {/* ============================== */}
      {/* HIGHLIGHTS / STATS SECTION */}
      {/* ============================== */}
      <section className="relative -mt-16 z-20 px-4 pb-16">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: GraduationCap, label: 'Tahun Berdiri', value: '1981', bg: 'bg-[var(--cu)]/5', text: 'text-[var(--cu)]' },
              { icon: Users, label: 'Total Siswa', value: '1.500+', bg: 'bg-[var(--cs)]/5', text: 'text-[var(--cs)]' },
              { icon: Star, label: 'Program Studi', value: '2', bg: 'bg-[var(--ca)]/5', text: 'text-[var(--ca)]' },
              { icon: Award, label: 'Pendidik', value: '25+', bg: 'bg-amber-50', text: 'text-amber-600' },
            ].map((item, i) => (
              <AnimatedSection key={i} delay={i * 100}>
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 text-center hover:shadow-2xl transition-all duration-300">
                  <div className={`w-12 h-12 ${item.bg} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                    <item.icon className={`w-6 h-6 ${item.text}`} />
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{item.value}</p>
                  <p className="text-xs text-gray-500">{item.label}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============================== */}
      {/* KENAPA PILIH SECTION */}
      {/* ============================== */}
      <section className="px-4 py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <SectionBadge text="Mengapa Kami?" />
            <SectionTitle>Kenapa Memilih {namaSekolah}?</SectionTitle>
            <SectionSubtitle>
              Kami berkomitmen memberikan pendidikan terbaik dengan pendekatan modern dan nilai-nilai islami
            </SectionSubtitle>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Shield, title: 'Kurikulum Terpadu', desc: 'Menggabungkan kurikulum nasional dengan pendidikan karakter dan nilai-nilai islami yang kuat.', color: 'annajah' },
              { icon: TrendingUp, title: 'Prestasi Akademik', desc: 'Catatan prestasi membanggakan di berbagai olimpiade sains, olahraga, dan seni tingkat daerah hingga nasional.', color: 'emerald' },
              { icon: Users, title: 'Tenaga Pendidik Profesional', desc: 'Didukung oleh guru-guru berkualitas dan berpengalaman di bidangnya masing-masing.', color: 'violet' },
              { icon: BookMarked, title: 'Fasilitas Lengkap', desc: 'Laboratorium, perpustakaan, lapangan olahraga, dan ruang belajar yang nyaman dan memadai.', color: 'amber' },
              { icon: Star, title: 'Serapan Universitas', desc: 'Banyak alumni yang berhasil lolos di berbagai Universitas Negeri di Indonesia.', color: 'rose' },
              { icon: Globe, title: 'Pengembangan Karakter', desc: 'Kegiatan ekstrakurikuler beragam untuk mengembangkan bakat, minat, dan kepribadian siswa.', color: 'sky' },
            ].map((item, i) => (
              <AnimatedSection key={i} delay={i * 80}>
                <ProgramCard {...item} />
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============================== */}
      {/* PROGRAM UNGGULAN */}
      {/* ============================== */}
      <section className="px-4 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <SectionBadge text="Program Unggulan" />
            <SectionTitle>Pilihan Program Kami</SectionTitle>
            <SectionSubtitle>
              Tersedia berbagai program unggulan yang dapat disesuaikan dengan minat dan bakat siswa
            </SectionSubtitle>
          </AnimatedSection>

          <div className="grid sm:grid-cols-3 gap-5">
            {[{ icon: BookOpen,
                title: 'Jurusan',
                desc: 'Pilihan program peminatan akademik untuk mengembangkan kompetensi sesuai minat dan bakat siswa.',
                features: ['MIPA (Matematika dan Ilmu Pengetahuan Alam)', 'IPS (Ilmu Pengetahuan Sosial)'],
                style: { from: 'from-[var(--cu)]/5', to: 'to-[var(--cu)]', toGrad: 'from-[var(--cu)]', border: 'border-[var(--cu)]/10', check: 'text-[var(--cu)]' },
              },
              {
                icon: Sun,
                title: 'Pembiasaan',
                desc: 'Rutinitas pagi sebelum pelajaran untuk membentuk karakter islami dan kebiasaan positif siswa setiap hari.',
                features: ['Tadarus', 'Shalat Duha', 'Kajian Tematik'],
                style: { from: 'from-amber-50', to: 'to-amber-600', toGrad: 'from-amber-500', border: 'border-amber-100', check: 'text-amber-500' },
              },
              {
                icon: Star,
                title: 'Ekstrakurikuler',
                desc: 'Beragam kegiatan pengembangan diri mulai dari olahraga, seni, pramuka, hingga organisasi siswa.',
                features: ['Pramuka', 'Hidroponik', 'Pencak Silat', 'Tata Boga', 'Seni Musik', 'Multimedia', 'Futsal', 'Budidaya', 'Crafting'],
                style: { from: 'from-[var(--ca)]/5', to: 'to-[var(--ca)]', toGrad: 'from-[var(--ca)]', border: 'border-[var(--ca)]/10', check: 'text-[var(--ca)]' },
              },
            ].map((prog, i) => (
              <AnimatedSection key={i} delay={i * 120}>
                <div className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className={`p-6 bg-gradient-to-br ${prog.style.from} to-white border-b ${prog.style.border}`}>
                    <div className={`w-14 h-14 bg-gradient-to-br ${prog.style.toGrad} ${prog.style.toGrad.replace('from-', 'to-').replace('500', '600')} rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <prog.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-800 text-lg mb-2">{prog.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{prog.desc}</p>
                  </div>
                  <div className="p-5 space-y-2">
                    {prog.features.map((f, fi) => (
                      <div key={fi} className="flex items-center gap-2 text-xs text-gray-600">
                        <CheckCircle className={`w-3.5 h-3.5 ${prog.style.check}`} />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ============================== */}
      {/* EKSTRAKURIKULER */}
      {/* ============================== */}
      <section className="px-4 py-20 bg-gradient-to-b from-[var(--cu)]/[0.03] via-white to-white overflow-hidden relative">
        {/* Decorative background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-40 left-0 w-72 h-72 bg-[var(--cu)]/[0.05] rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-0 w-96 h-96 bg-[var(--ca)]/[0.05] rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <SectionBadge text="Ekstrakurikuler" />
            <SectionTitle>Kegiatan Ekstrakurikuler</SectionTitle>
            <SectionSubtitle>
              Beragam kegiatan pengembangan bakat, minat, dan kreativitas siswa di luar jam pelajaran
            </SectionSubtitle>
          </AnimatedSection>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-5">
            {[
              { icon: Flag, name: 'Pramuka', desc: 'Membentuk karakter mandiri, disiplin, dan jiwa kepemimpinan melalui kegiatan kepramukaan.', color: 'annajah', image: 'https://smaannajah.sch.id/wp-content/uploads/2021/12/slider4.png' },
              { icon: Sprout, name: 'Hidroponik', desc: 'Belajar teknik bercocok tanam modern tanpa tanah, mengembangkan wawasan agrikultur.', color: 'emerald', image: 'https://smaannajah.sch.id/wp-content/uploads/2021/12/hidroponik_1-1.png' },
              { icon: Shield, name: 'Pencak Silat', desc: 'Melestarikan seni bela diri tradisional dengan pembinaan fisik dan mental yang kuat.', color: 'rose', image: 'https://smaannajah.sch.id/wp-content/uploads/2022/12/IMG_5829.jpg' },
              { icon: ChefHat, name: 'Tata Boga', desc: 'Mengasah keterampilan memasak dan menyajikan hidangan kreatif bernilai gizi.', color: 'amber', image: 'https://smaannajah.sch.id/wp-content/uploads/2022/12/IMG_5953.jpg' },
              { icon: Music, name: 'Seni Musik', desc: 'Mengembangkan bakat musik melalui vokal, instrumen, dan apresiasi seni suara.', color: 'violet', image: 'https://smaannajah.sch.id/wp-content/uploads/2022/12/1664600061709.jpg' },
              { icon: Camera, name: 'Multimedia', desc: 'Eksplorasi dunia desain grafis, fotografi, videografi, dan produksi konten digital.', color: 'sky', image: 'https://smaannajah.sch.id/wp-content/uploads/2022/12/WhatsApp-Image-2022-12-03-at-00.45.41.jpeg' },
              { icon: Trophy, name: 'Futsal', desc: 'Pembinaan olahraga futsal untuk mengembangkan jiwa sportivitas dan kerja sama tim.', color: 'annajah', image: 'https://smaannajah.sch.id/wp-content/uploads/2024/03/WhatsApp-Image-2024-03-13-at-10.52.38-1-1024x768.jpeg' },
              { icon: Leaf, name: 'Budidaya', desc: 'Praktik budidaya tanaman dan perawatan lingkungan hijau yang berkelanjutan.', color: 'emerald', image: 'https://smaannajah.sch.id/wp-content/uploads/2022/12/WhatsApp-Image-2022-12-03-at-00.03.00.jpeg' },
              { icon: Palette, name: 'Crafting', desc: 'Mengembangkan kreativitas seni kerajinan tangan dari berbagai bahan daur ulang.', color: 'violet', image: 'https://smaannajah.sch.id/wp-content/uploads/2024/03/WhatsApp-Image-2024-03-13-at-10.53.57-1024x658.jpeg' },
            ].map((ekskul, i) => {
              const c = EXTRAKULIKULER_COLORS[ekskul.color]
              return (
                <AnimatedSection key={ekskul.name} delay={i * 80}>
                  <div className={`group relative bg-white rounded-2xl border ${c.border} hover:shadow-xl ${c.shadow} transition-all duration-300 hover:-translate-y-1 overflow-hidden`}>
                    {/* Image container */}
                    <div className="relative h-36 sm:h-40 overflow-hidden">
                      <img
                        src={ekskul.image}
                        alt={ekskul.name}
                        className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out`}
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.nextElementSibling?.classList.remove('from-black/50')
                          e.target.nextElementSibling?.classList.add('from-[var(--cu)]/30')
                        }}
                      />
                      {/* Gradient overlay on image */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                      {/* Icon badge floating on image */}
                      <div className={`absolute bottom-3 left-3 w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center shadow-lg ring-2 ${c.ring} ring-offset-1`}>
                        <ekskul.icon className={`w-5 h-5 ${c.text}`} />
                      </div>
                      {/* Name overlaid on image */}
                      <h3 className="absolute bottom-3 right-3 text-white font-bold text-sm sm:text-base drop-shadow-lg">
                        {ekskul.name}
                      </h3>
                    </div>

                    {/* Content */}
                    <div className="p-4 sm:p-5">
                      <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                        {ekskul.desc}
                      </p>
                      {/* Bottom accent line */}
                      <div className={`mt-4 h-0.5 w-0 group-hover:w-full ${c.bg} rounded-full transition-all duration-500 ease-out`} />
                    </div>
                  </div>
                </AnimatedSection>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============================== */}
      {/* CARA DAFTAR (TIMELINE) */}
      {/* ============================== */}
      <section className="px-4 py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <SectionBadge text="Panduan" />
            <SectionTitle>Cara Mendaftar</SectionTitle>
            <SectionSubtitle>
              Ikuti langkah-langkah berikut untuk mendaftar menjadi calon peserta didik baru
            </SectionSubtitle>
          </AnimatedSection>

          <AnimatedSection>
            <div className="max-w-md mx-auto">
              <TimelineStep
                number={1}
                icon={UserPlus}
                title="Daftar Online"
                desc="Klik tombol 'Daftar Sekarang' dan isi formulir pendaftaran dengan data diri yang lengkap dan benar."
              />
              <TimelineStep
                number={2}
                icon={Clock}
                title="Proses Verifikasi"
                desc="Pihak sekolah akan memverifikasi data pendaftaran Anda. Pantau status melalui menu 'Cek Hasil'."
              />
              <TimelineStep
                number={3}
                icon={CheckCircle}
                title="Pengumuman"
                desc="Hasil seleksi akan diumumkan melalui sistem. Anda akan mendapat notifikasi email jika status berubah."
                isLast
              />
            </div>
          </AnimatedSection>

          <AnimatedSection className="text-center mt-8" delay={200}>              <Link
                to="/ppdb/daftar"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[var(--cu)] to-[var(--cu)] text-white font-bold py-3.5 px-8 rounded-xl hover:from-[var(--cu)] hover:to-[var(--cu)] transition-all duration-300 shadow-lg shadow-[var(--cu)]/25 hover:shadow-xl hover:-translate-y-0.5"
            >
              <UserPlus className="w-5 h-5" />
              Mulai Daftar Sekarang
              <ArrowRight className="w-4 h-4" />
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* ============================== */}
      {/* TESTIMONIAL / QUOTE */}
      {/* ============================== */}
      {kepalaSekolah && (
        <section style={{ backgroundColor: `color-mix(in srgb, ${warnaUtama} 25%, black)` }} className="px-4 py-20 relative overflow-hidden">
          <Particles />
          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <AnimatedSection>
              <Quote className="w-12 h-12 text-[var(--cu)]/30 mx-auto mb-6" />
              <blockquote className="text-lg sm:text-xl text-white/90 leading-relaxed mb-8 italic">
                "Kami berkomitmen untuk mencetak generasi yang unggul dalam ilmu pengetahuan,
                berkarakter mulia, dan siap menghadapi tantangan masa depan."
              </blockquote>
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--cu)] flex items-center justify-center text-white font-bold text-sm">
                  {kepalaSekolah.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-[var(--ctp)] text-sm">{kepalaSekolah}</p>
                  <p className="text-xs text-[var(--ctp)] opacity-70">Kepala Sekolah</p>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </section>
      )}

      {/* ============================== */}
      {/* INFO SEKOLAH & KONTAK */}
      {/* ============================== */}
      <section id="info" className="px-4 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <SectionBadge text="Kontak & Informasi" />
            <SectionTitle>Hubungi Kami</SectionTitle>
            <SectionSubtitle>
              Silakan hubungi kami untuk informasi lebih lanjut tentang pendaftaran dan program sekolah
            </SectionSubtitle>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 gap-6">
            <AnimatedSection>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
                <div className="w-12 h-12 bg-[var(--cu)]/5 rounded-xl flex items-center justify-center mb-4">
                  <School className="w-6 h-6 text-[var(--cu)]" />
                </div>
                <h3 className="font-bold text-gray-800 mb-3">Informasi Sekolah</h3>
                <div className="space-y-3 text-sm">
                  {npsn && (
                    <div className="flex items-start gap-3">
                      <Award className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-gray-400 text-xs">NPSN</p>
                        <p className="text-gray-700 font-medium">{npsn}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-gray-400 text-xs">Alamat</p>
                      <p className="text-gray-700">{alamatLengkap}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Globe className="w-4 h-4 text-[var(--cu)] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-gray-400 text-xs">Lokasi GPS</p>
                      <a href="https://maps.app.goo.gl/KEpEXnzGMZzTtanF6" target="_blank" rel="noopener noreferrer" className="text-[var(--cu)] hover:text-[var(--cu)] font-medium inline-flex items-center gap-1 transition-colors">
                        Buka Google Maps
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={100}>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
                <div className="w-12 h-12 bg-[var(--cu)]/5 rounded-xl flex items-center justify-center mb-4">
                  <Phone className="w-6 h-6 text-[var(--cu)]" />
                </div>
                <h3 className="font-bold text-gray-800 mb-3">Kontak</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-gray-700">WA: +62895331205472 / +6285781454905</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-gray-700">info@smaannajah.sch.id</span>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>

          {/* Action Cards Bottom */}
          <AnimatedSection delay={200}>
            <div className="mt-10">
              <h3 className="text-center font-bold text-gray-800 mb-5">Layanan PPDB Online</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <Link
                  to="/ppdb/daftar"
                  className="group bg-gradient-to-br from-[var(--cu)] to-[var(--cu)] rounded-2xl p-6 text-white text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                >
                  <UserPlus className="w-8 h-8 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                  <h4 className="font-bold text-sm mb-1">Daftar Baru</h4>
                  <p className="text-xs text-white/70">Isi formulir pendaftaran online</p>
                </Link>

                <Link
                  to="/ppdb/hasil"
                  className="group bg-gradient-to-br from-[var(--cs)] to-[var(--cs)] rounded-2xl p-6 text-white text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                >
                  <SearchCheck className="w-8 h-8 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                  <h4 className="font-bold text-sm mb-1">Cek Hasil</h4>
                  <p className="text-xs text-white/70">Lihat status pendaftaran</p>
                </Link>

                <Link
                  to="/ppdb/kartu"
                  className="group bg-gradient-to-br from-[var(--ca)] to-[var(--ca)] rounded-2xl p-6 text-white text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                >
                  <CreditCard className="w-8 h-8 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                  <h4 className="font-bold text-sm mb-1">Kartu Pendaftaran</h4>
                  <p className="text-xs text-white/70">Cetak kartu pendaftaran</p>
                </Link>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ============================== */}
      {/* FOOTER */}
      {/* ============================== */}
      <footer className="bg-[var(--cfbg)] text-[var(--cftxt)]">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="grid sm:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center">
                  {logoUrl && !logoError ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <School className="w-5 h-5 text-[var(--cu)]" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-[var(--cfjudul)] text-sm">{namaSekolah}</h3>
                  <p className="text-[10px] text-[var(--cftxt)]/60">PPDB Online {tahunAjaran}</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed">
                Lembaga pendidikan unggulan yang berkomitmen mencetak generasi berprestasi dan berakhlak mulia.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold text-[var(--cfjudul)] text-sm mb-4">Layanan</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="/ppdb/daftar" className="hover:text-[var(--cu)] transition-colors">Pendaftaran Baru</Link>
                </li>
                <li>
                  <Link to="/ppdb/hasil" className="hover:text-[var(--cu)] transition-colors">Cek Hasil</Link>
                </li>
                <li>
                  <Link to="/ppdb/kartu" className="hover:text-[var(--cu)] transition-colors">Kartu Pendaftaran</Link>
                </li>

              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-[var(--cfjudul)] text-sm mb-4">Kontak</h4>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  WA: +62895331205472 / +6285781454905
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  info@smaannajah.sch.id
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{alamatLengkap}</span>
                </li>
                <li>
                  <a href="https://maps.app.goo.gl/KEpEXnzGMZzTtanF6" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[var(--cu)] transition-colors">
                    <Globe className="w-3.5 h-3.5 shrink-0" />
                    Buka Google Maps
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[var(--cfbg)]/30 pt-6 text-center text-xs">
            <p>&copy; {new Date().getFullYear()} {namaSekolah}. All rights reserved.</p>
            <p className="mt-1 text-[var(--cftxt)]/60">Sistem Penerimaan Peserta Didik Baru Online</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
