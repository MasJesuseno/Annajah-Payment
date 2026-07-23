import { useState, useEffect, useRef } from 'react'
import { Calendar } from 'lucide-react'

export default function AgendaPanel({ agenda }) {
  const containerRef = useRef(null)
  const contentRef = useRef(null)
  const [scrollState, setScrollState] = useState({ active: false, distance: 0 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Detect agenda overflow and calculate scroll distance
  useEffect(() => {
    if (!containerRef.current || !contentRef.current || !agenda?.length) {
      setScrollState({ active: false, distance: 0 })
      return
    }
    const container = containerRef.current
    const content = contentRef.current
    const distance = content.scrollHeight - container.clientHeight
    setScrollState({
      active: distance > 0,
      distance: Math.max(distance, 0),
    })
  }, [agenda])

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '-'
    const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    const bulan = [
      'Januari', 'Februari', 'Maret', 'April',      'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ]
    return `${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`
  }

  if (!agenda?.length) {
    return (
      <div className="flex-[3] bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5 min-h-0 flex flex-col items-center justify-center transition-all duration-300 hover:border-white/10">
        <div className="w-16 h-16 rounded-2xl border border-white/5 flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-white/20" />
        </div>
        <p className="text-sm font-light text-white/20">Belum ada agenda</p>
        <p className="text-xs text-white/10 mt-1">Untuk 7 hari ke depan</p>
      </div>
    )
  }

  const scrollId = `scroll-agenda-${agenda?.length || 0}`

  return (
    <div
      ref={containerRef}
      className="flex-[3] bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5 overflow-hidden min-h-0 transition-all duration-300 hover:border-white/10"
    >
      {/* Dynamic scroll keyframes for agenda overflow */}
      {scrollState.active && (
        <style>{`
          @keyframes ${scrollId} {
            0% { transform: translateY(0); }
            10% { transform: translateY(0); }
            75% { transform: translateY(-${scrollState.distance}px); }
            90% { transform: translateY(-${scrollState.distance}px); }
            100% { transform: translateY(0); }
          }
        `}</style>
      )}
      <div className="flex items-center gap-3 mb-5 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-annajah-500/20 to-annajah-500/5 flex items-center justify-center border border-annajah-500/10">
          <Calendar className="w-4 h-4 text-annajah-300" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white/90">Agenda Sekolah</h3>
          <p className="text-[10px] text-white/30">Jadwal kegiatan sekolah</p>
        </div>
      </div>

      <div className="relative">
        {/* Timeline vertical line */}
        <div className="absolute left-[15px] top-0 bottom-0 w-px bg-gradient-to-b from-annajah-500/30 via-annajah-500/10 to-transparent pointer-events-none" />

        {/* Gradient fade at top/bottom when scrolling */}
        {scrollState.active && (
          <>
            <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-gray-950 to-transparent z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-gray-950 to-transparent z-10 pointer-events-none" />
          </>
        )}

        <div
          ref={contentRef}
          className="space-y-0"
          style={
            scrollState.active
              ? {
                  animation: `scroll-agenda-${agenda.length} ${Math.max(agenda.length * 4, 15)}s linear infinite`,
                }
              : {}
          }
        >
          {agenda.map((item, idx) => {
            const itemDate = new Date(item.tanggal)
            const isToday = itemDate.getTime() === today.getTime()
            const isPast = itemDate < today
            return (
              <div
                key={item.id}
                className={`relative flex gap-4 py-2.5 transition-all duration-300 group/item ${
                  isToday ? 'scale-[1.02]' : ''
                }`}
              >
                {/* Timeline dot */}
                <div className="relative flex flex-col items-center shrink-0">
                  <div
                    className={`w-[30px] h-[30px] rounded-full flex items-center justify-center transition-all duration-300 ${
                      isToday
                        ? 'bg-gradient-to-br from-annajah-400 to-annajah-600 shadow-lg shadow-annajah-500/30'
                        : isPast
                        ? 'bg-white/5 border border-white/5'
                        : 'bg-white/5 border border-white/10 group-hover/item:border-annajah-400/30'
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        isToday
                          ? 'bg-white'
                          : isPast
                          ? 'bg-white/20'
                          : 'bg-white/30 group-hover/item:bg-annajah-300'
                      }`}
                    />
                  </div>
                </div>

                {/* Content */}
                <div
                  className={`flex-1 min-w-0 pb-2 ${
                    idx < agenda.length - 1 ? 'border-b border-white/[0.03]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {isToday && (
                      <span className="text-[9px] font-bold bg-gradient-to-r from-annajah-500 to-annajah-400 text-white px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                        Hari Ini
                      </span>
                    )}
                    {isPast && (
                      <span className="text-[9px] font-medium text-white/20 border border-white/10 px-2 py-0.5 rounded-full">
                        ✓ Selesai
                      </span>
                    )}
                    <span
                      className={`text-[11px] font-medium ${
                        isToday
                          ? 'text-annajah-300'
                          : isPast
                          ? 'text-white/30'
                          : 'text-white/50'
                      }`}
                    >
                      {formatDate(item.tanggal)}
                    </span>
                  </div>
                  <p
                    className={`text-[13px] leading-relaxed ${
                      isToday
                        ? 'text-white font-medium'
                        : isPast
                        ? 'text-white/30 line-through'
                        : 'text-white/70'
                    }`}
                  >
                    {item.agenda}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
