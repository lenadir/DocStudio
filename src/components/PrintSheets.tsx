import { createPortal } from 'react-dom'
import type { Card, Field, Side } from '../types'
import CardFace from './CardFace'

interface Props {
  card: Card
  images: { front: string | null; back: string | null }
  fields: Field[]
  rows: Record<string, string>[]
  sides: Side[]
}

/**
 * One printed page per row per side, at the exact millimetre size of the card.
 * Rendered with the same component as the editor, so the preview is the print.
 */
/** One page per row per side — front before back, rows in sheet order. */
export function buildPages(rows: Record<string, string>[], sides: Side[]) {
  return rows.flatMap((values, index) =>
    sides.map((side) => ({ key: `${index}-${side}`, side, values })),
  )
}

export default function PrintSheets({ card, images, fields, rows, sides }: Props) {
  const u = (mm: number) => `${mm}mm`
  const pages = buildPages(rows, sides)

  return createPortal(
    <div className="print-root">
      <style>{`@page { size: ${card.w}mm ${card.h}mm; margin: 0; }`}</style>
      {pages.map((page) => (
        <div
          className="print-page"
          key={page.key}
          style={{ width: u(card.w), height: u(card.h) }}
        >
          <CardFace
            side={page.side}
            card={card}
            image={images[page.side]}
            fields={fields}
            values={page.values}
            u={u}
          />
        </div>
      ))}
    </div>,
    document.body,
  )
}
