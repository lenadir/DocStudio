import type { CSSProperties, DragEvent, PointerEvent, Ref } from 'react'
import type { Card, Field, Side } from '../types'

/** Converts millimetres into a CSS length: real mm for print, scaled px for the screen. */
export type Unit = (mm: number) => string

export function fieldText(f: Field, values: Record<string, string>): string {
  const raw = f.column ? values[f.column] ?? '' : f.text
  const body = `${f.prefix}${raw}${f.suffix}`
  return f.style.uppercase ? body.toUpperCase() : body
}

interface Props {
  side: Side
  card: Card
  image: string | null
  fields: Field[]
  values: Record<string, string>
  u: Unit
  /** Draws outlines, placeholders and handles. Off for printing. */
  interactive?: boolean
  selectedId?: string | null
  innerRef?: Ref<HTMLDivElement>
  onFieldPointerDown?: (e: PointerEvent<HTMLElement>, f: Field) => void
  onResizePointerDown?: (e: PointerEvent<HTMLElement>, f: Field) => void
  onPointerDown?: () => void
  onDrop?: (e: DragEvent<HTMLDivElement>) => void
  onDragOver?: (e: DragEvent<HTMLDivElement>) => void
  onDragLeave?: (e: DragEvent<HTMLDivElement>) => void
}

export default function CardFace({
  side,
  card,
  image,
  fields,
  values,
  u,
  interactive = false,
  selectedId = null,
  innerRef,
  onFieldPointerDown,
  onResizePointerDown,
  onPointerDown,
  onDrop,
  onDragOver,
  onDragLeave,
}: Props) {
  return (
    <div
      ref={innerRef}
      className={`card ${interactive ? 'card--edit' : 'card--print'}`}
      style={{ width: u(card.w), height: u(card.h) }}
      onPointerDown={onPointerDown}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {image ? (
        <img className="card-bg" src={image} alt="" draggable={false} />
      ) : interactive ? (
        <div className="card-placeholder">
          <strong>No {side} template</strong>
          <span>Upload an image in step 1, or drop one here</span>
        </div>
      ) : null}

      {fields
        .filter((f) => f.side === side)
        .map((f) => {
          const text = fieldText(f, values)
          const empty = text === ''
          const s = f.style
          const style: CSSProperties = {
            left: `${f.x}%`,
            top: `${f.y}%`,
            width: `${s.width}%`,
            fontSize: u(s.fontSize),
            fontFamily: s.fontFamily,
            color: s.color,
            fontWeight: s.bold ? 700 : 400,
            fontStyle: s.italic ? 'italic' : 'normal',
            textAlign: s.align,
            letterSpacing: u(s.letterSpacing),
            transform: s.rotation ? `rotate(${s.rotation}deg)` : undefined,
          }

          if (!interactive) {
            return (
              <div key={f.id} className="field" style={style}>
                {text}
              </div>
            )
          }

          return (
            <div
              key={f.id}
              className={`field field--edit${selectedId === f.id ? ' is-selected' : ''}${
                empty ? ' is-empty' : ''
              }`}
              style={style}
              onPointerDown={(e) => onFieldPointerDown?.(e, f)}
              title={f.column || 'Static text'}
            >
              {empty ? f.column || 'text' : text}
              {selectedId === f.id && (
                <span
                  className="field-handle"
                  onPointerDown={(e) => onResizePointerDown?.(e, f)}
                  title="Drag to set the text box width"
                />
              )}
            </div>
          )
        })}
    </div>
  )
}
