import type { Layout } from '../types'

const KEY = 'badge-filler.layout.v1'

/** Saves the layout (templates included) to the browser. Returns an error message, or null. */
export function saveLayout(layout: Layout): string | null {
  try {
    localStorage.setItem(KEY, JSON.stringify(layout))
    return null
  } catch {
    // Too big. Drop the template backgrounds first (they are the heaviest, and only a guide)...
    const noTemplates: Layout = { ...layout, images: { front: null, back: null } }
    try {
      localStorage.setItem(KEY, JSON.stringify(noTemplates))
      return 'Saved field positions only — the template images were too large for browser storage. Use Export to keep them.'
    } catch {
      // ...then the pictures placed as fields, so positions and text still survive.
      const bare: Layout = {
        ...noTemplates,
        fields: noTemplates.fields.map((f) => (f.kind === 'image' ? { ...f, src: '' } : f)),
      }
      try {
        localStorage.setItem(KEY, JSON.stringify(bare))
        return 'Saved text fields and positions only — the images were too large for browser storage. Use Export to keep them.'
      } catch {
        return 'Could not save to this browser. Use Export instead.'
      }
    }
  }
}

export function loadLayout(): Layout | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Layout
    return parsed && parsed.version === 1 ? parsed : null
  } catch {
    return null
  }
}

export function exportLayout(layout: Layout) {
  const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'card-layout.json'
  a.click()
  URL.revokeObjectURL(url)
}

export async function importLayout(file: File): Promise<Layout> {
  const parsed = JSON.parse(await file.text()) as Layout
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.fields)) {
    throw new Error('Not a card layout file')
  }
  return parsed
}

export function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(new Error('Could not read image'))
    fr.readAsDataURL(file)
  })
}

/** Natural aspect ratio (h / w) of a data-URL image. */
export function imageAspect(src: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img.naturalHeight / img.naturalWidth || 1)
    img.onerror = () => resolve(1)
    img.src = src
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode image'))
    img.src = src
  })
}

/**
 * Reads a picture to be placed as a field (logo, signature, stamp, photo).
 *
 * Big uploads are scaled down so a few of them still fit in browser storage when the user
 * clicks Save: 1600 px on the long side is ~135 dpi at full card width and far more for the
 * usual quarter-width logo. PNG/WebP stay PNG so transparency survives (signatures and
 * stamps need it); JPEG stays JPEG. SVG is kept untouched, it is already resolution-free.
 */
export async function prepareFieldImage(
  file: File,
  maxPx = 1600,
): Promise<{ src: string; aspect: number }> {
  const raw = await readImage(file)
  if (file.type === 'image/svg+xml') return { src: raw, aspect: await imageAspect(raw) }

  const img = await loadImage(raw)
  const { naturalWidth: w, naturalHeight: h } = img
  const scale = Math.min(1, maxPx / Math.max(w, h))
  const aspect = h / w || 1
  if (scale === 1 && file.size < 400 * 1024) return { src: raw, aspect }

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w * scale))
  canvas.height = Math.max(1, Math.round(h * scale))
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  const jpeg = file.type === 'image/jpeg'
  return { src: canvas.toDataURL(jpeg ? 'image/jpeg' : 'image/png', 0.9), aspect }
}
