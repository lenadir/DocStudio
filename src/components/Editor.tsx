import { useCallback, useEffect, useRef, useState } from 'react'
import type { DragEvent, PointerEvent } from 'react'
import type { Card, Field, FieldStyle, Side } from '../types'
import CardFace from './CardFace'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const round2 = (v: number) => Math.round(v * 100) / 100

type Drag =
  | {
      mode: 'move'
      id: string
      startX: number
      startY: number
      origX: number
      origY: number
      w: number
      h: number
    }
  | { mode: 'resize'; id: string; startX: number; origW: number; w: number }

interface Props {
  card: Card
  side: Side
  image: string | null
  fields: Field[]
  values: Record<string, string>
  /** screen pixels per millimetre */
  ppm: number
  snap: boolean
  selectedId: string | null
  onSelect: (id: string | null) => void
  onUpdate: (id: string, patch: Partial<Field>) => void
  onUpdateStyle: (id: string, patch: Partial<FieldStyle>) => void
  onDropColumn: (column: string, x: number, y: number) => void
  onDropImage: (file: File) => void
}

export default function Editor({
  card,
  side,
  image,
  fields,
  values,
  ppm,
  snap,
  selectedId,
  onSelect,
  onUpdate,
  onUpdateStyle,
  onDropColumn,
  onDropImage,
}: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const [dragging, setDragging] = useState(false)
  const [hover, setHover] = useState(false)

  const u = useCallback((mm: number) => `${mm * ppm}px`, [ppm])

  const beginMove = (e: PointerEvent<HTMLElement>, f: Field) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    onSelect(f.id)
    dragRef.current = {
      mode: 'move',
      id: f.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: f.x,
      origY: f.y,
      w: rect.width,
      h: rect.height,
    }
    setDragging(true)
  }

  const beginResize = (e: PointerEvent<HTMLElement>, f: Field) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    dragRef.current = {
      mode: 'resize',
      id: f.id,
      startX: e.clientX,
      origW: f.style.width,
      w: rect.width,
    }
    setDragging(true)
  }

  useEffect(() => {
    if (!dragging) return

    const move = (e: globalThis.PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      if (d.mode === 'move') {
        const dx = ((e.clientX - d.startX) / d.w) * 100
        const dy = ((e.clientY - d.startY) / d.h) * 100
        let x = clamp(d.origX + dx, -25, 125)
        let y = clamp(d.origY + dy, -25, 125)
        if (snap) {
          x = Math.round(x * 2) / 2
          y = Math.round(y * 2) / 2
        }
        onUpdate(d.id, { x: round2(x), y: round2(y) })
      } else {
        const dx = ((e.clientX - d.startX) / d.w) * 100
        onUpdateStyle(d.id, { width: round2(clamp(d.origW + dx, 4, 150)) })
      }
    }
    const up = () => {
      dragRef.current = null
      setDragging(false)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [dragging, snap, onUpdate, onUpdateStyle])

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    if (!hover) setHover(true)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setHover(false)
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return

    const imageFile = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'))
    if (imageFile) {
      onDropImage(imageFile)
      return
    }

    const column =
      e.dataTransfer.getData('application/x-column') || e.dataTransfer.getData('text/plain')
    if (!column) return
    const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100)
    const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100)
    onDropColumn(column, round2(x), round2(y))
  }

  return (
    <div className={`stage${hover ? ' is-dropping' : ''}${dragging ? ' is-dragging' : ''}`}>
      <CardFace
        side={side}
        card={card}
        image={image}
        fields={fields}
        values={values}
        u={u}
        interactive
        selectedId={selectedId}
        innerRef={cardRef}
        onFieldPointerDown={beginMove}
        onResizePointerDown={beginResize}
        onPointerDown={() => onSelect(null)}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setHover(false)}
      />
    </div>
  )
}
