/**
 * Verifikasi wajah (face recognition) untuk absen kehadiran karyawan.
 *
 * Foto profil (uploads/guru) dipakai sebagai foto identitas. Saat absen, foto
 * yang diambil dari kamera dibandingkan dengan foto identitas tersebut memakai
 * face descriptor 128-dimensi dari model Face Recognition (face-api.js).
 *
 * Library & model dimuat malas (dynamic import) supaya bundle utama tetap
 * ringan, dan model disajikan dari `client/public/models` (satu origin, jadi
 * bisa jalan tanpa internet). Untuk memperbarui model:
 *   cp node_modules/@vladmandic/face-api/model/{tiny_face_detector,face_landmark_68,face_recognition}_model* client/public/models/
 */

export const MODEL_URL = '/models'
export const FOTO_GURU_BASE_URL = '/uploads/guru/'

/**
 * Jarak (euclidean) maksimum antar descriptor agar dianggap orang yang sama.
 * Nilai <= 0.6 direkomendasikan face-api.js. Dipakai juga di backend
 * (routes/kehadiran-guru.js) sebagai pengaman — ubah keduanya bila diubah.
 */
export const MATCH_THRESHOLD = 0.6

const CACHE_PREFIX = 'faceDescriptor:'
let faceapiPromise = null
let modelsPromise = null
let modelsReady = false

/** Tolak setelah `ms` detik — agar inisialisasi backend tidak menggantung */
const rejectAfter = (ms, message) =>
  new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))

/**
 * Siapkan backend TensorFlow: WebGL bila berfungsi, fallback ke CPU.
 * Inisialisasi WebGL bisa gagal ATAU hang di perangkat tanpa akselerasi
 * hardware (GPU terblokir, mode hemat daya, remote desktop) — tanpa fallback
 * ini, verifikasi wajah berhenti total dengan pesan "koneksi lambat".
 */
async function initTfBackend(tf) {
  if (!tf) return

  try {
    const ok = await Promise.race([
      Promise.resolve().then(() => tf.setBackend('webgl')).catch(() => false),
      rejectAfter(10000, 'Inisialisasi WebGL timeout'),
    ])
    if (!ok) throw new Error('WebGL tidak tersedia')
    await Promise.race([tf.ready(), rejectAfter(10000, 'WebGL siap timeout')])
    // Uji cepat — pastikan shader & texture benar-benar dapat dijalankan
    const probe = tf.tidy(() => tf.zeros([2, 2]).sum())
    await Promise.race([probe.data(), rejectAfter(5000, 'Uji WebGL timeout')])
    return
  } catch (err) {
    console.warn('WebGL tidak berfungsi — verifikasi wajah memakai CPU:', err)
  }

  try {
    const ok = await Promise.race([
      Promise.resolve().then(() => tf.setBackend('cpu')).catch(() => false),
      rejectAfter(5000, 'Inisialisasi CPU timeout'),
    ])
    if (!ok) throw new Error('CPU backend gagal')
    await Promise.race([tf.ready(), rejectAfter(5000, 'CPU siap timeout')])
    console.info('Backend CPU siap untuk verifikasi wajah.')
  } catch (err) {
    console.warn('Backend CPU gagal dimuat:', err)
  }
}

/** Muat modul face-api (beserta tensorflow.js) hanya saat dibutuhkan */
function getFaceApi() {
  if (!faceapiPromise) {
    faceapiPromise = import('@vladmandic/face-api')
  }
  return faceapiPromise
}

/** URL foto identitas (foto profil guru) */
export function getProfileFotoUrl(foto) {
  if (!foto) return null
  if (foto.startsWith('/') || foto.startsWith('http')) return foto
  return `${FOTO_GURU_BASE_URL}${foto}`
}

/**
 * Muat model face-api sekali saja per sesi browser.
 * WebGL dipakai bila tersedia (jauh lebih cepat di HP), fallback ke CPU.
 * @returns {Promise<object>} modul face-api yang sudah siap
 */
export function loadFaceModels() {
  if (!modelsPromise) {
    modelsPromise = (async () => {
      const faceapi = await getFaceApi()
      await initTfBackend(faceapi.tf)
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      modelsReady = true
      return faceapi
    })().catch((err) => {
      // Jangan simpan promise gagal — biarkan percobaan berikutnya memuat ulang
      modelsPromise = null
      throw err
    })
  }
  return modelsPromise
}

/** Panggil saat modal kamera dibuka agar model terunduh lebih awal */
export function preloadFaceModels() {
  loadFaceModels().catch((err) => console.warn('Gagal memuat model wajah:', err))
}

/** True bila model wajah sudah selesai dimuat (siap dipakai verifikasi) */
export function isFaceModelReady() {
  return modelsReady
}

/** Muat gambar dari URL menjadi HTMLImageElement siap deteksi (dibatasi waktu agar permintaan yang menggantung tidak menghentikan verifikasi) */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const timer = setTimeout(() => {
      img.src = ''
      reject(new Error('Timeout memuat gambar'))
    }, 20000)
    img.onload = () => { clearTimeout(timer); resolve(img) }
    img.onerror = () => { clearTimeout(timer); reject(new Error('Gagal memuat gambar')) }
    img.src = src
  })
}

/**
 * Perkecil gambar beresolusi besar menjadi maksimal `maxDim` px.
 * Foto profil lama bisa beresolusi tinggi — deteksi wajah di gambar besar
 * lambat dan bisa memakan memori GPU (WebGL), bikin verifikasi lama.
 */
function downscaleImage(img, maxDim = 640) {
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  if (!w || !h || (w <= maxDim && h <= maxDim)) return img
  const scale = Math.min(maxDim / w, maxDim / h)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas
}

/**
 * Ambil face descriptor (128 angka) dari sebuah gambar.
 * Menerima elemen gambar ATAU string (URL/base64) — string dimuat dulu menjadi
 * elemen <img> karena face-api menafsirkan string sebagai ID elemen HTML,
 * bukan sebagai gambar (error "toNetInput - string passed...").
 * @returns {Promise<number[]|null>} null jika wajah tidak terdeteksi
 */
export async function getFaceDescriptor(imageSource) {
  const faceapi = await loadFaceModels()
  try {
    const input = typeof imageSource === 'string'
      ? await loadImage(imageSource)
      : imageSource
    const detections = await faceapi
      .detectSingleFace(
        input,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 })
      )
      .withFaceLandmarks()
      .withFaceDescriptor()

    if (!detections?.descriptor) return null
    return Array.from(detections.descriptor)
  } catch (err) {
    // face-api melempar error saat wajah tidak terdeteksi — anggap tidak ada
    // wajah (null), bukan kegagalan sistem. Error model tetap terlempar di
    // loadFaceModels() sebelum blok ini.
    console.warn('Deteksi wajah gagal:', err)
    return null
  }
}

/**
 * Descriptor foto identitas, di-cache di sessionStorage agar tidak perlu
 * dihitung ulang setiap kali membuka kamera absen.
 */
export async function getProfileDescriptor(fotoUrl) {
  if (!fotoUrl) return null

  const cacheKey = `${CACHE_PREFIX}${fotoUrl}`
  try {
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (Array.isArray(parsed) && parsed.length === 128) return parsed
    }
  } catch {
    // sessionStorage tidak tersedia — lanjut hitung ulang
  }

  const img = await loadImage(fotoUrl)
  const descriptor = await getFaceDescriptor(downscaleImage(img))
  if (descriptor) {
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(descriptor))
    } catch {
      // abaikan bila storage penuh
    }
  }
  return descriptor
}

/** Jarak euclidean antara dua descriptor (semakin kecil = semakin mirip) */
export function faceDistance(descriptorA, descriptorB) {
  if (!descriptorA || !descriptorB) return null
  let sum = 0
  for (let i = 0; i < descriptorA.length; i++) {
    const diff = descriptorA[i] - descriptorB[i]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}

/** True bila dua descriptor dianggap orang yang sama */
export function isFaceMatch(descriptorA, descriptorB, threshold = MATCH_THRESHOLD) {
  const distance = faceDistance(descriptorA, descriptorB)
  return distance !== null && distance <= threshold
}

/** Persentase kemiripan untuk ditampilkan ke pengguna */
export function similarityPercent(distance) {
  if (distance === null || distance === undefined) return null
  const percent = (1 - distance) * 100
  return Math.max(0, Math.min(100, Math.round(percent)))
}
