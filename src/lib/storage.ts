import type { Layout } from '../types'

const KEY = 'badge-filler.layout.v1'

/** Saves the layout (templates included) to the browser. Returns an error message, or null. */
export function saveLayout(layout: Layout): string | null {
  try {
    localStorage.setItem(KEY, JSON.stringify(layout))
    return null
  } catch {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ ...layout, images: { front: null, back: null } }),
      )
      return 'Saved field positions only — the template images were too large for browser storage. Use Export to keep them.'
    } catch {
      return 'Could not save to this browser. Use Export instead.'
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
