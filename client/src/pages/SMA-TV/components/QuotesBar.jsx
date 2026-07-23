import { Sparkles } from 'lucide-react'

export default function QuotesBar({ kataBijak, namaSekolah }) {
  if (!kataBijak?.length) {
    return (
      <div className="relative bg-gradient-to-r from-annajah-900/50 via-annajah-800/40 to-gray-900/50 backdrop-blur-sm border-t border-white/5 py-3 shrink-0 overflow-hidden z-10">
        <div className="flex items-center justify-center gap-3 text-white/30">
          <Sparkles className="w-4 h-4" />
          <p className="text-sm font-light">Selamat datang di {namaSekolah || 'SMA Annajah'}</p>
          <Sparkles className="w-4 h-4" />
        </div>
      </div>
    )
  }

  const duration = Math.max(kataBijak.length * 20, 35)

  return (
    <div className="relative bg-gradient-to-r from-annajah-900/50 via-annajah-800/40 to-gray-900/50 backdrop-blur-sm border-t border-white/5 py-3 shrink-0 overflow-hidden z-10">
      <div className="relative">
        {/* Decorative quote marks */}
        <span className="absolute left-8 top-1/2 -translate-y-1/2 text-annajah-400/20 text-4xl font-serif leading-none pointer-events-none select-none">
          ❝
        </span>

        <div
          className="whitespace-nowrap animate-marquee"
          style={{ animationDuration: `${duration}s` }}
        >
          {kataBijak.map((item) => (
            <span key={item.id} className="inline-flex items-center mx-8">
              <span className="text-white/90 text-base font-light tracking-wide">{item.kata_bijak}</span>
              <span className="mx-8 text-white/10 text-lg">✦</span>
            </span>
          ))}
        </div>

        {/* Decorative end quote */}
        <span className="absolute right-8 top-1/2 -translate-y-1/2 text-annajah-400/20 text-4xl font-serif leading-none pointer-events-none select-none">
          ❞
        </span>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee ${duration}s linear infinite;
        }
      `}</style>
    </div>
  )
}
