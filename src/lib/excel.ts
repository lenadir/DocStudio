import * as XLSX from 'xlsx'
import type { SheetData } from '../types'

const cellText = (v: unknown) => String(v ?? '').trim()
const filledCount = (row: string[] = []) => row.reduce((n, c) => n + (c !== '' ? 1 : 0), 0)

function dedupe(names: string[]): string[] {
  const seen = new Map<string, number>()
  return names.map((n) => {
    const count = seen.get(n) ?? 0
    seen.set(n, count + 1)
    return count === 0 ? n : `${n} (${count + 1})`
  })
}

/**
 * The sheet's real extent, measured from the cells that actually exist.
 *
 * `!ref` cannot be trusted: exporters write ranges that are too small (data gets cut off --
 * the sheet reads as e.g. 10 rows when it holds 400) and Excel itself writes ranges that are
 * far too large after formatting is applied to empty cells (hundreds of phantom columns).
 */
export function usedRange(ws: XLSX.WorkSheet): XLSX.Range | null {
  let minR = Infinity
  let minC = Infinity
  let maxR = -1
  let maxC = -1

  for (const key of Object.keys(ws)) {
    if (key.charCodeAt(0) === 33) continue // '!ref', '!merges', ... metadata
    let cell
    try {
      cell = XLSX.utils.decode_cell(key)
    } catch {
      continue
    }
    if (!Number.isFinite(cell.r) || !Number.isFinite(cell.c)) continue
    if (cell.r < minR) minR = cell.r
    if (cell.c < minC) minC = cell.c
    if (cell.r > maxR) maxR = cell.r
    if (cell.c > maxC) maxC = cell.c
  }

  if (maxR < 0) return null
  // Always start at A1 so a grid index maps to the spreadsheet's own row/column numbers --
  // the "Header row" box in the UI then means the same row the user sees in Excel.
  // Leading empty rows and columns are dropped later, by deriveSheet.
  void minR
  void minC
  return { s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } }
}

/**
 * Which row holds the column names. Spreadsheets routinely open with a title and some
 * spacing above the real header, so row 1 is a bad assumption.
 *
 * A title row is recognised by being much emptier than the rows under it: it fills one or
 * two cells where the table fills many. The first row that is at least half as full as the
 * rows below it wins.
 */
export function detectHeaderRow(matrix: string[][]): number {
  for (let i = 0; i < Math.min(matrix.length, 25); i++) {
    const here = filledCount(matrix[i])
    if (here === 0) continue

    const below = matrix
      .slice(i + 1, i + 6)
      .map(filledCount)
      .filter((n) => n > 0)
      .sort((a, b) => a - b)
    if (!below.length) return i

    const typical = below[Math.floor(below.length / 2)]
    if (here >= Math.max(2, typical / 2)) return i
  }
  return 0
}

/** Builds the columns and records from a grid, treating `headerRow` as the column names. */
export function deriveSheet(name: string, matrix: string[][], headerRow: number): SheetData {
  const safeHeader = Math.min(Math.max(headerRow, 0), Math.max(matrix.length - 1, 0))
  const width = matrix.reduce((m, r) => Math.max(m, r.length), 0)
  const head = matrix[safeHeader] ?? []
  const body = matrix.slice(safeHeader + 1).filter((r) => r.some((c) => c !== ''))

  // Keep a column only if the header names it or any record fills it. Drops the phantom
  // columns that come from an over-wide range, without touching gaps inside the table.
  const keep: number[] = []
  for (let c = 0; c < width; c++) {
    if (cellText(head[c]) !== '' || body.some((r) => cellText(r[c]) !== '')) keep.push(c)
  }

  // A header cell may be blank while the column holds data, so fall back to its letter.
  const columns = dedupe(
    keep.map((c) => cellText(head[c]) || `Column ${XLSX.utils.encode_col(c)}`),
  )
  const rows = body.map((r) => {
    const o: Record<string, string> = {}
    keep.forEach((c, i) => {
      o[columns[i]] = cellText(r[c])
    })
    return o
  })

  return { name, columns, rows, headerRow: safeHeader }
}

/** Reads every sheet of an .xlsx / .xls / .csv file. */
export async function parseWorkbook(file: File): Promise<SheetData[]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { cellDates: true })

  return wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name]
    const range = usedRange(ws)
    if (!range) return { name, columns: [], rows: [], headerRow: 0 }

    // raw:false renders dates and numbers the way Excel displays them.
    // blankrows:true keeps the grid aligned with the real row numbers.
    const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      raw: false,
      defval: '',
      blankrows: true,
      range,
    })
    const matrix = grid.map((r) => (Array.isArray(r) ? r.map(cellText) : []))

    return deriveSheet(name, matrix, detectHeaderRow(matrix))
  })
}
