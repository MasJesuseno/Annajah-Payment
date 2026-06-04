/**
 * Helper to create a cropped image Blob from an image source URL and crop pixel data.
 * Uses the HTML5 Canvas API — no external dependencies needed.
 *
 * @param {string} imageSrc - Data URL or object URL of the original image
 * @param {{ x: number, y: number, width: number, height: number }} pixelCrop - The cropped area in pixels
 * @param {number} [outputSize=400] - Desired output width/height for the final square image (it'll be max of w/h)
 * @returns {Promise<Blob>} - Cropped image as a Blob (JPEG format)
 */
export async function getCroppedImg(imageSrc, pixelCrop, outputSize = 400) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imageSrc
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(new Error('Gagal memuat gambar untuk crop'))
  })

  // Calculate the output dimensions (resize to a max of outputSize while keeping aspect ratio)
  const { width: cropW, height: cropH } = pixelCrop
  const maxDim = Math.max(cropW, cropH)
  const scale = maxDim > outputSize ? outputSize / maxDim : 1
  const outW = Math.round(cropW * scale)
  const outH = Math.round(cropH * scale)

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')

  // Draw the cropped region onto the canvas, scaled down to output size
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, cropW, cropH,
    0, 0, outW, outH
  )

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9)
  })
}

/**
 * Convert a Blob to a File object with a given filename.
 */
export function blobToFile(blob, filename = 'foto_siswa.jpg') {
  return new File([blob], filename, { type: 'image/jpeg' })
}
