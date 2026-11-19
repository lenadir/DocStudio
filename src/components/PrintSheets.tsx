import { createPortal } from 'react-dom'
import type { Card, Field, Side } from '../types'
import CardFace from './CardFace'

interface Props {
  card: Card
  images: { front: string | null; back: string | null }
  fields: Field[]
  rows: Record<string, string>[]
  sides: Side[]
  /** Turn every back page 180 degrees, for printers whose two-sided mode flips the verso upside down. */
  rotateBack?: boolean
}

/**
 * One page per row per side, in the order recto, verso, recto, verso...
 * With two-sided printing on, page 1 + page 2 land on the two faces of the same sheet,
 * page 3 + page 4 on the next sheet, and so on. Every record always yields the same number
 * of pages, so a record's verso can never slip onto the next record's sheet.
 */
export function buildPages(rows: Record<string, string>[], sides: Side[]) {
  return rows.flatMap((values, index) =>
    sides.map((side) => ({ key: `${index}-${side}`, index, side, values })),
  )
}

export default function PrintSheets({ card, images, fields, rows, sides, rotateBack = false }: Props) {
  const u = (mm: number) => `${mm}mm`
  const pages = buildPages(rows, sides)

  return createPortal(
    <div className="print-root">
      <style>{`@page { size: ${card.w}mm ${card.h}mm; margin: 0; }`}</style>
      {pages.map((page) => (
        <div
          className="print-page"
          key={page.key}
          data-record={page.index + 1}
          data-side={page.side}
          style={{ width: u(card.w), height: u(card.h) }}
        >
          <div
            style={{
              width: u(card.w),
              height: u(card.h),
              transform: rotateBack && page.side === 'back' ? 'rotate(180deg)' : undefined,
            }}
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
        </div>
      ))}
    </div>,
    document.body,
  )
}
