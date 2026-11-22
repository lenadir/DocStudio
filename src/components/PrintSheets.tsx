import { createPortal } from 'react-dom'
import type { Card, Field, Side } from '../types'
import CardFace from './CardFace'

interface Props {
  card: Card
  // No `images` prop on purpose: the print output must never carry the uploaded
  // template. Not accepting it at all makes that impossible to undo by accident.
  fields: Field[]
  rows: Record<string, string>[]
  sides: Side[]
  /** Turn every back page 180 degrees, for printers whose two-sided mode flips the verso upside down. */
  rotateBack?: boolean
}

/**
 * Prints the placed values ONLY -- never the uploaded front/back template, which exists
 * purely to position fields on screen. Sheets are expected to be pre-printed stock that
 * goes through the printer to receive the variable text.
 *
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

export default function PrintSheets({ card, fields, rows, sides, rotateBack = false }: Props) {
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
              // The template is a positioning guide for the screen only. Printing happens
              // onto pre-printed stock, so the background must never be put on paper --
              // only the values placed on top of it. Passing null keeps the image out of
              // the print tree entirely (print.css also hides .card-bg as a safety net).
              image={null}
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
