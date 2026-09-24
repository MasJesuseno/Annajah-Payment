import { ShieldCheck } from 'lucide-react'
import { similarityPercent } from '../utils/faceMatch'

/**
 * Badge hasil verifikasi wajah saat absen masuk/keluar.
 *
 * Foto absen tidak lagi disimpan — yang dicatat adalah skor kemiripan wajah
 * (`skor_wajah_masuk` / `skor_wajah_keluar`, jarak face descriptor).
 *
 * @param {number|string|null} skorMasuk  - jarak descriptor saat absen masuk
 * @param {number|string|null} skorKeluar - jarak descriptor saat absen keluar
 * @param {boolean} withLabel             - tampilkan label "Masuk/Keluar"
 */
export default function VerifikasiWajah({ skorMasuk, skorKeluar, withLabel = false }) {
  const items = [
    skorMasuk != null && { label: 'Masuk', value: Number(skorMasuk) },
    skorKeluar != null && { label: 'Keluar', value: Number(skorKeluar) },
  ].filter(Boolean)

  if (items.length === 0) {
    return <span className="text-[10px] text-gray-400">-</span>
  }

  return (
    <div className="flex flex-col gap-0.5">
      {items.map((item) => (
        <span
          key={item.label}
          className="text-[10px] font-medium text-emerald-600 flex items-center gap-1"
          title={`Verifikasi wajah absen ${item.label.toLowerCase()}: kemiripan ${similarityPercent(item.value)}%`}
        >
          <ShieldCheck className="w-3 h-3 shrink-0" />
          {withLabel && `${item.label}: `}{similarityPercent(item.value)}%
        </span>
      ))}
    </div>
  )
}
