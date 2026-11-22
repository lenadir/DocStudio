import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Editor from './components/Editor'
import Inspector from './components/Inspector'
import PrintSheets from './components/PrintSheets'
import Sidebar from './components/Sidebar'
import { parseWorkbook } from './lib/excel'
import {
  exportLayout,
  imageAspect,
  importLayout,
  loadLayout,
  prepareFieldImage,
  readImage,
  saveLayout,
} from './lib/storage'
import { DEFAULT_STYLE, PRESETS, uid } from './types'
import type { Card, Field, FieldStyle, Layout, SheetData, Side } from './types'

const round2 = (v: number) => Math.round(v * 100) / 100

const normalizeField = (f: Field): Field => ({
  ...f,
  side: f.side === 'back' ? 'back' : 'front',
  // Layouts saved before image fields existed have neither property.
  kind: f.kind === 'image' ? 'image' : 'text',
  src: f.src ?? '',
  column: f.column ?? '',
  text: f.text ?? '',
  prefix: f.prefix ?? '',
  suffix: f.suffix ?? '',
  style: { ...DEFAULT_STYLE, ...f.style },
})

export default function App() {
  const [card, setCard] = useState<Card>({ w: PRESETS[0].w, h: PRESETS[0].h })
  const [images, setImages] = useState<{ front: string | null; back: string | null }>({
    front: null,
    back: null,
  })
  const [fields, setFields] = useState<Field[]>([])

  const [excelName, setExcelName] = useState<string | null>(null)
  const [sheets, setSheets] = useState<SheetData[]>([])
  const [sheetIndex, setSheetIndex] = useState(0)
  const [rowIndex, setRowIndex] = useState(0)

  const [side, setSide] = useState<Side>('front')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [snap, setSnap] = useState(true)

  const [printSides, setPrintSides] = useState({ front: true, back: true })
  const [rotateBack, setRotateBack] = useState(false)
  const [printRows, setPrintRows] = useState<Record<string, string>[] | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const imagesRef = useRef(images)
  useEffect(() => {
    imagesRef.current = images
  }, [images])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 6000)
    return () => window.clearTimeout(id)
  }, [toast])

  /* ---------- sizing: fit the card into the canvas ---------- */

  const canvasRef = useRef<HTMLDivElement | null>(null)
  const [box, setBox] = useState({ w: 900, h: 600 })

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const ppm = useMemo(() => {
    const fit = Math.min((box.w - 56) / card.w, (box.h - 56) / card.h)
    return Math.max(0.4, fit * zoom)
  }, [box, card, zoom])

  /* ---------- data ---------- */

  const sheet = sheets[sheetIndex]
  const columns = sheet?.columns ?? []
  const rows = sheet?.rows ?? []
  const values = rows[rowIndex] ?? {}

  const placed = useMemo(() => {
    const counts: Record<string, number> = {}
    fields.forEach((f) => {
      if (f.column) counts[f.column] = (counts[f.column] ?? 0) + 1
    })
    return counts
  }, [fields])

  const selected = fields.find((f) => f.id === selectedId) ?? null

  /* ---------- field editing ---------- */

  const makeField = useCallback(
    (column: string, text: string, cx: number, cy: number): Field => {
      const style: FieldStyle = { ...DEFAULT_STYLE }
      const halfLine = (((style.fontSize * 1.2) / card.h) * 100) / 2
      return {
        id: uid(),
        side,
        kind: 'text',
        src: '',
        column,
        text,
        prefix: '',
        suffix: '',
        x: round2(cx - style.width / 2),
        y: round2(cy - halfLine),
        style,
      }
    },
    [card.h, side],
  )

  const addField = useCallback(
    (column: string, text: string, cx: number, cy: number) => {
      const f = makeField(column, text, cx, cy)
      setFields((prev) => [...prev, f])
      setSelectedId(f.id)
    },
    [makeField],
  )

  /** Adds an uploaded picture (logo, signature, stamp, photo) as a field, centred on the card. */
  const addImageField = useCallback(
    async (file: File) => {
      try {
        const { src, aspect } = await prepareFieldImage(file)
        const style: FieldStyle = { ...DEFAULT_STYLE, width: 25 }
        // Height follows the picture, so centre using its real proportions.
        const heightPct = (((style.width / 100) * card.w * aspect) / card.h) * 100
        const f: Field = {
          id: uid(),
          side,
          kind: 'image',
          src,
          column: '',
          text: '',
          prefix: '',
          suffix: '',
          x: round2(50 - style.width / 2),
          y: round2(50 - heightPct / 2),
          style,
        }
        setFields((prev) => [...prev, f])
        setSelectedId(f.id)
      } catch {
        setToast('Could not read that image.')
      }
    },
    [card.w, card.h, side],
  )

  const replaceFieldImage = useCallback(async (id: string, file: File) => {
    try {
      const { src } = await prepareFieldImage(file)
      setFields((prev) => prev.map((f) => (f.id === id ? { ...f, src } : f)))
    } catch {
      setToast('Could not read that image.')
    }
  }, [])

  const updateField = useCallback((id: string, patch: Partial<Field>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }, [])

  const updateStyle = useCallback((id: string, patch: Partial<FieldStyle>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, style: { ...f.style, ...patch } } : f)),
    )
  }, [])

  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id))
    setSelectedId((cur) => (cur === id ? null : cur))
  }, [])

  const duplicateField = useCallback((id: string) => {
    setFields((prev) => {
      const f = prev.find((x) => x.id === id)
      if (!f) return prev
      const copy: Field = { ...f, id: uid(), y: round2(f.y + 6) }
      return [...prev, copy]
    })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && /^(input|select|textarea)$/i.test(t.tagName)) return
      if (!selectedId) return

      if (e.key === 'Escape') {
        setSelectedId(null)
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        removeField(selectedId)
        return
      }
      if (!e.key.startsWith('Arrow')) return

      e.preventDefault()
      const step = e.shiftKey ? 2 : 0.25
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
      const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
      setFields((prev) =>
        prev.map((f) =>
          f.id === selectedId ? { ...f, x: round2(f.x + dx), y: round2(f.y + dy) } : f,
        ),
      )
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, removeField])

  /* ---------- uploads ---------- */

  const pickImage = useCallback(async (target: Side, file: File) => {
    try {
      const src = await readImage(file)
      const isFirstFront = target === 'front' && imagesRef.current.front === null
      setImages((prev) => ({ ...prev, [target]: src }))
      if (isFirstFront) {
        const aspect = await imageAspect(src)
        setCard((c) => ({ w: c.w, h: Math.round(c.w * aspect * 10) / 10 }))
        setToast('Card height matched to your template. Set the exact paper size in the toolbar.')
      }
    } catch {
      setToast('Could not read that image.')
    }
  }, [])

  const pickExcel = useCallback(async (file: File) => {
    try {
      const parsed = await parseWorkbook(file)
      const withRows = parsed.filter((s) => s.rows.length > 0)
      const list = withRows.length ? withRows : parsed
      setSheets(list)
      setSheetIndex(0)
      setRowIndex(0)
      setExcelName(file.name)
      if (!list.length || !list[0].columns.length) {
        setToast('No columns found. Row 1 of the sheet must hold the column names.')
      }
    } catch {
      setToast('Could not read that spreadsheet.')
    }
  }, [])

  /* ---------- layout persistence ---------- */

  const currentLayout = (): Layout => ({ version: 1, card, fields, images })

  const applyLayout = (l: Layout) => {
    setCard(l.card ?? { w: PRESETS[0].w, h: PRESETS[0].h })
    setFields((l.fields ?? []).map(normalizeField))
    setImages({ front: l.images?.front ?? null, back: l.images?.back ?? null })
    setSelectedId(null)
  }

  const handleImport = async (file: File) => {
    try {
      applyLayout(await importLayout(file))
      setToast('Layout imported.')
    } catch {
      setToast('That file is not a card layout.')
    }
  }

  /* ---------- printing ---------- */

  const hasBack = images.back !== null || fields.some((f) => f.side === 'back')

  const activeSides = useMemo<Side[]>(() => {
    const out: Side[] = []
    if (printSides.front) out.push('front')
    if (printSides.back && hasBack) out.push('back')
    return out
  }, [printSides, hasBack])

  const startPrint = (which: 'current' | 'all') => {
    if (!activeSides.length) {
      setToast('Choose at least one side to print.')
      return
    }
    const data = rows.length ? (which === 'current' ? [values] : rows) : [{}]
    setPrintRows(data)
    if (activeSides.length === 2) {
      setToast(
        `${data.length} sheet${data.length > 1 ? 's' : ''}: recto then verso for each record. ` +
          'In the print dialog turn on Two-sided so both land on the same sheet.',
      )
    }
  }

  useEffect(() => {
    if (!printRows) return
    const after = () => setPrintRows(null)
    window.addEventListener('afterprint', after)
    const id = window.setTimeout(() => window.print(), 150)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('afterprint', after)
    }
  }, [printRows])

  /* ---------- toolbar helpers ---------- */

  const presetIndex = PRESETS.findIndex((p) => p.w === card.w && p.h === card.h)

  const fitToTemplate = async () => {
    const src = images[side]
    if (!src) {
      setToast('Upload a template image first.')
      return
    }
    const aspect = await imageAspect(src)
    setCard((c) => ({ w: c.w, h: Math.round(c.w * aspect * 10) / 10 }))
  }

  const rowLabel = columns.length ? values[columns[0]] || '—' : '—'

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <strong>Certificate Filler</strong>
          <span>Excel → template → print</span>
        </div>

        <div className="toolbar">
          <label className="control control--inline">
            <span>Paper</span>
            <select
              value={presetIndex}
              onChange={(e) => {
                const i = Number(e.target.value)
                if (i >= 0) setCard({ w: PRESETS[i].w, h: PRESETS[i].h })
              }}
            >
              {presetIndex === -1 && <option value={-1}>Custom</option>}
              {PRESETS.map((p, i) => (
                <option key={p.label} value={i}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <label className="control control--inline control--tiny">
            <span>W mm</span>
            <input
              type="number"
              min={10}
              step={0.1}
              value={card.w}
              onChange={(e) => setCard((c) => ({ ...c, w: Number(e.target.value) || c.w }))}
            />
          </label>
          <label className="control control--inline control--tiny">
            <span>H mm</span>
            <input
              type="number"
              min={10}
              step={0.1}
              value={card.h}
              onChange={(e) => setCard((c) => ({ ...c, h: Number(e.target.value) || c.h }))}
            />
          </label>
          <button className="btn btn--small" onClick={fitToTemplate} title="Match the card height to the template image">
            Fit to image
          </button>

          <label className="control control--inline">
            <span>Zoom {Math.round(zoom * 100)}%</span>
            <input
              type="range"
              min={0.4}
              max={2.5}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>

          <label className="check">
            <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
            Snap
          </label>
        </div>
      </header>

      <main className="workspace">
        <Sidebar
          images={images}
          onPickImage={pickImage}
          onClearImage={(s) => setImages((prev) => ({ ...prev, [s]: null }))}
          excelName={excelName}
          sheets={sheets}
          sheetIndex={sheetIndex}
          onPickExcel={pickExcel}
          onPickSheet={(i) => {
            setSheetIndex(i)
            setRowIndex(0)
          }}
          columns={columns}
          placed={placed}
          onAddColumn={(c) => addField(c, '', 50, 50)}
          onAddStatic={() => addField('', 'Text', 50, 50)}
          onAddImage={addImageField}
          onSave={() => setToast(saveLayout(currentLayout()) ?? 'Layout saved in this browser.')}
          onLoad={() => {
            const l = loadLayout()
            if (!l) {
              setToast('Nothing saved yet.')
              return
            }
            applyLayout(l)
            setToast('Saved layout restored.')
          }}
          onExport={() => exportLayout(currentLayout())}
          onImport={handleImport}
          onClearFields={() => {
            setFields([])
            setSelectedId(null)
          }}
        />

        <section className="canvas-wrap">
          <div className="canvas-bar">
            <div className="tabs">
              {(['front', 'back'] as Side[]).map((s) => (
                <button
                  key={s}
                  className={`tab${side === s ? ' is-on' : ''}`}
                  onClick={() => {
                    setSide(s)
                    setSelectedId(null)
                  }}
                >
                  {s === 'front' ? 'Front' : 'Back'}
                  <span className="tab-count">{fields.filter((f) => f.side === s).length}</span>
                </button>
              ))}
            </div>

            <div className="record-nav">
              <button
                className="btn btn--icon"
                disabled={rowIndex <= 0}
                onClick={() => setRowIndex((i) => Math.max(0, i - 1))}
                title="Previous row"
              >
                ‹
              </button>
              <span className="record-label">
                {rows.length ? (
                  <>
                    Row {rowIndex + 1} / {rows.length}
                    <em>{rowLabel}</em>
                  </>
                ) : (
                  'No data yet'
                )}
              </span>
              <button
                className="btn btn--icon"
                disabled={rowIndex >= rows.length - 1}
                onClick={() => setRowIndex((i) => Math.min(rows.length - 1, i + 1))}
                title="Next row"
              >
                ›
              </button>
            </div>

            <div className="print-group">
              <label className="check">
                <input
                  type="checkbox"
                  checked={printSides.front}
                  onChange={(e) => setPrintSides((p) => ({ ...p, front: e.target.checked }))}
                />
                Front (recto)
              </label>
              <label className={`check${hasBack ? '' : ' is-disabled'}`}>
                <input
                  type="checkbox"
                  disabled={!hasBack}
                  checked={printSides.back && hasBack}
                  onChange={(e) => setPrintSides((p) => ({ ...p, back: e.target.checked }))}
                />
                Back (verso)
              </label>
              <label
                className={`check${hasBack && printSides.back ? '' : ' is-disabled'}`}
                title="Turn every back page upside down. Use it if the verso comes out rotated on your printer."
              >
                <input
                  type="checkbox"
                  disabled={!hasBack || !printSides.back}
                  checked={rotateBack}
                  onChange={(e) => setRotateBack(e.target.checked)}
                />
                Flip verso 180°
              </label>
              <button className="btn btn--small" onClick={() => startPrint('current')}>
                Print this one
              </button>
              <button className="btn btn--primary btn--small" onClick={() => startPrint('all')}>
                Print all{rows.length ? ` (${rows.length})` : ''}
              </button>
            </div>
          </div>

          <div className="canvas" ref={canvasRef}>
            <Editor
              card={card}
              side={side}
              image={images[side]}
              fields={fields}
              values={values}
              ppm={ppm}
              snap={snap}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onUpdate={updateField}
              onUpdateStyle={updateStyle}
              onDropColumn={(column, x, y) => addField(column, '', x, y)}
              onDropImage={(file) => pickImage(side, file)}
            />
          </div>
        </section>

        <Inspector
          field={selected}
          columns={columns}
          onUpdate={updateField}
          onUpdateStyle={updateStyle}
          onDuplicate={duplicateField}
          onDelete={removeField}
          onReplaceImage={replaceFieldImage}
        />
      </main>

      {toast && (
        <div className="toast" role="status" onClick={() => setToast(null)}>
          {toast}
        </div>
      )}

      {printRows && (
        <PrintSheets
          card={card}
          fields={fields}
          rows={printRows}
          sides={activeSides}
          rotateBack={rotateBack}
        />
      )}
    </div>
  )
}
