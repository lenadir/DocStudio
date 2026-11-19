import type { Align, Field, FieldStyle, Side } from '../types'
import { FONTS } from '../types'

interface Props {
  field: Field | null
  columns: string[]
  onUpdate: (id: string, patch: Partial<Field>) => void
  onUpdateStyle: (id: string, patch: Partial<FieldStyle>) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

export default function Inspector({
  field,
  columns,
  onUpdate,
  onUpdateStyle,
  onDuplicate,
  onDelete,
}: Props) {
  if (!field) {
    return (
      <aside className="inspector inspector--empty">
        <h2>Field</h2>
        <p className="hint">
          Drag a variable from the left onto the card, then click it here to set font, size, colour
          and position.
        </p>
        <ul className="hint hint--list">
          <li>Drag a field to move it</li>
          <li>Arrow keys nudge · Shift = bigger steps</li>
          <li>Delete removes the selected field</li>
        </ul>
      </aside>
    )
  }

  const f = field
  const s = f.style
  const missing = f.column !== '' && !columns.includes(f.column)
  const set = (patch: Partial<Field>) => onUpdate(f.id, patch)
  const setStyle = (patch: Partial<FieldStyle>) => onUpdateStyle(f.id, patch)

  return (
    <aside className="inspector">
      <h2>Field</h2>

      <label className="control">
        <span>Value</span>
        <select value={f.column} onChange={(e) => set({ column: e.target.value })}>
          <option value="">— Fixed text —</option>
          {missing && <option value={f.column}>{f.column} (not in this sheet)</option>}
          {columns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      {missing && <p className="warn">This column is not in the selected sheet.</p>}

      {f.column === '' && (
        <label className="control">
          <span>Text</span>
          <input value={f.text} onChange={(e) => set({ text: e.target.value })} />
        </label>
      )}

      <div className="control-row">
        <label className="control">
          <span>Prefix</span>
          <input value={f.prefix} onChange={(e) => set({ prefix: e.target.value })} />
        </label>
        <label className="control">
          <span>Suffix</span>
          <input value={f.suffix} onChange={(e) => set({ suffix: e.target.value })} />
        </label>
      </div>

      <label className="control">
        <span>Font</span>
        <select value={s.fontFamily} onChange={(e) => setStyle({ fontFamily: e.target.value })}>
          {FONTS.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </label>

      <div className="control-row">
        <label className="control">
          <span>Size (mm)</span>
          <input
            type="number"
            min={1}
            max={100}
            step={0.5}
            value={s.fontSize}
            onChange={(e) => setStyle({ fontSize: Number(e.target.value) || 1 })}
          />
        </label>
        <label className="control">
          <span>Colour</span>
          <input
            type="color"
            className="color"
            value={s.color}
            onChange={(e) => setStyle({ color: e.target.value })}
          />
        </label>
      </div>

      <div className="control">
        <span>Style</span>
        <div className="toggles">
          <button
            className={`toggle${s.bold ? ' is-on' : ''}`}
            onClick={() => setStyle({ bold: !s.bold })}
            title="Bold"
          >
            B
          </button>
          <button
            className={`toggle toggle--italic${s.italic ? ' is-on' : ''}`}
            onClick={() => setStyle({ italic: !s.italic })}
            title="Italic"
          >
            I
          </button>
          <button
            className={`toggle${s.uppercase ? ' is-on' : ''}`}
            onClick={() => setStyle({ uppercase: !s.uppercase })}
            title="UPPERCASE"
          >
            AA
          </button>
          <span className="toggle-sep" />
          {(['left', 'center', 'right'] as Align[]).map((a) => (
            <button
              key={a}
              className={`toggle${s.align === a ? ' is-on' : ''}`}
              onClick={() => setStyle({ align: a })}
              title={`Align ${a}`}
            >
              {a === 'left' ? '⯇' : a === 'center' ? '≡' : '⯈'}
            </button>
          ))}
        </div>
      </div>

      <div className="control-row">
        <label className="control">
          <span>Box width (%)</span>
          <input
            type="number"
            min={4}
            max={150}
            step={1}
            value={s.width}
            onChange={(e) => setStyle({ width: Number(e.target.value) || 4 })}
          />
        </label>
        <label className="control">
          <span>Spacing (mm)</span>
          <input
            type="number"
            min={-2}
            max={10}
            step={0.1}
            value={s.letterSpacing}
            onChange={(e) => setStyle({ letterSpacing: Number(e.target.value) || 0 })}
          />
        </label>
      </div>

      <div className="control-row">
        <label className="control">
          <span>X (%)</span>
          <input
            type="number"
            step={0.5}
            value={f.x}
            onChange={(e) => set({ x: Number(e.target.value) })}
          />
        </label>
        <label className="control">
          <span>Y (%)</span>
          <input
            type="number"
            step={0.5}
            value={f.y}
            onChange={(e) => set({ y: Number(e.target.value) })}
          />
        </label>
        <label className="control">
          <span>Rotate (°)</span>
          <input
            type="number"
            step={1}
            min={-180}
            max={180}
            value={s.rotation}
            onChange={(e) => setStyle({ rotation: Number(e.target.value) || 0 })}
          />
        </label>
      </div>

      <label className="control">
        <span>Side</span>
        <select value={f.side} onChange={(e) => set({ side: e.target.value as Side })}>
          <option value="front">Front</option>
          <option value="back">Back</option>
        </select>
      </label>

      <div className="btn-grid">
        <button
          className="btn btn--small"
          onClick={() => set({ x: Math.round((100 - s.width) / 2 * 100) / 100 })}
          title="Centre the text box across the card"
        >
          Centre
        </button>
        <button className="btn btn--small" onClick={() => onDuplicate(f.id)}>
          Duplicate
        </button>
      </div>
      <button className="btn btn--danger btn--small btn--block" onClick={() => onDelete(f.id)}>
        Delete field
      </button>
    </aside>
  )
}
