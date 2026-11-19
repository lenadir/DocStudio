import { useRef } from 'react'
import type { SheetData, Side } from '../types'

interface Props {
  images: { front: string | null; back: string | null }
  onPickImage: (side: Side, file: File) => void
  onClearImage: (side: Side) => void

  excelName: string | null
  sheets: SheetData[]
  sheetIndex: number
  onPickExcel: (file: File) => void
  onPickSheet: (index: number) => void

  columns: string[]
  placed: Record<string, number>
  onAddColumn: (column: string) => void
  onAddStatic: () => void

  onSave: () => void
  onLoad: () => void
  onExport: () => void
  onImport: (file: File) => void
  onClearFields: () => void
}

export default function Sidebar(p: Props) {
  const excelRef = useRef<HTMLInputElement | null>(null)
  const importRef = useRef<HTMLInputElement | null>(null)

  return (
    <aside className="sidebar">
      <section className="panel">
        <h2>
          <span className="step">1</span> Certificate template
        </h2>
        {(['front', 'back'] as Side[]).map((side) => (
          <div className="upload-row" key={side}>
            <div className="thumb">
              {p.images[side] ? <img src={p.images[side]!} alt={side} /> : <span>{side}</span>}
            </div>
            <div className="upload-actions">
              <label className="btn btn--small">
                {p.images[side] ? `Replace ${side}` : `Upload ${side}`}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) p.onPickImage(side, f)
                    e.target.value = ''
                  }}
                />
              </label>
              {p.images[side] && (
                <button className="btn btn--ghost btn--small" onClick={() => p.onClearImage(side)}>
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="panel">
        <h2>
          <span className="step">2</span> Excel data
        </h2>
        <label className="btn btn--small btn--block">
          {p.excelName ? 'Replace spreadsheet' : 'Upload .xlsx / .xls / .csv'}
          <input
            ref={excelRef}
            type="file"
            accept=".xlsx,.xls,.xlsm,.csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) p.onPickExcel(f)
              e.target.value = ''
            }}
          />
        </label>
        {p.excelName && (
          <>
            <p className="file-name" title={p.excelName}>
              {p.excelName}
            </p>
            {p.sheets.length > 1 && (
              <label className="control">
                <span>Sheet</span>
                <select
                  value={p.sheetIndex}
                  onChange={(e) => p.onPickSheet(Number(e.target.value))}
                >
                  {p.sheets.map((s, i) => (
                    <option key={s.name} value={i}>
                      {s.name} ({s.rows.length})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <p className="hint">
              {p.sheets[p.sheetIndex]?.rows.length ?? 0} rows · {p.columns.length} columns
            </p>
          </>
        )}
      </section>

      <section className="panel panel--grow">
        <h2>
          <span className="step">3</span> Drag variables onto the card
        </h2>
        {p.columns.length === 0 ? (
          <p className="hint">Upload a spreadsheet to list its columns here.</p>
        ) : (
          <div className="chips">
            {p.columns.map((c) => (
              <div
                key={c}
                className="chip"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-column', c)
                  e.dataTransfer.setData('text/plain', c)
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                onDoubleClick={() => p.onAddColumn(c)}
                title={`Drag onto the card, or double-click to drop it in the middle`}
              >
                <span className="chip-grip" aria-hidden>
                  ⠿
                </span>
                {c}
                {p.placed[c] ? <span className="chip-count">{p.placed[c]}</span> : null}
              </div>
            ))}
          </div>
        )}
        <button className="btn btn--ghost btn--small btn--block" onClick={p.onAddStatic}>
          + Add fixed text
        </button>
      </section>

      <section className="panel">
        <h2>Layout</h2>
        <div className="btn-grid">
          <button className="btn btn--small" onClick={p.onSave}>
            Save
          </button>
          <button className="btn btn--small" onClick={p.onLoad}>
            Restore
          </button>
          <button className="btn btn--small" onClick={p.onExport}>
            Export
          </button>
          <label className="btn btn--small">
            Import
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) p.onImport(f)
                e.target.value = ''
              }}
            />
          </label>
        </div>
        <button className="btn btn--ghost btn--small btn--block" onClick={p.onClearFields}>
          Remove all fields
        </button>
      </section>
    </aside>
  )
}
