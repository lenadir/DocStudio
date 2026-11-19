import * as XLSX from 'xlsx'
import type { SheetData } from '../types'

function dedupe(names: string[]): string[] {
  const seen = new Map<string, number>()
  return names.map((n) => {
    const count = seen.get(n) ?? 0
    seen.set(n, count + 1)
    return count === 0 ? n : `${n} (${count + 1})`
  })
}

/** Reads every sheet of an .xlsx / .xls / .csv file. Row 1 is treated as the header. */
export async function parseWorkbook(file: File): Promise<SheetData[]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { cellDates: true })

  return wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name]
    // raw:false renders dates and numbers the way Excel displays them.
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      raw: false,
      defval: '',
      blankrows: false,
    })
    if (!matrix.length) return { name, columns: [], rows: [] }

    const header = (matrix[0] as unknown[]).map(
      (h, i) => String(h ?? '').trim() || `Column ${i + 1}`,
    )
    const columns = dedupe(header)
    const rows = (matrix.slice(1) as unknown[][])
      .filter((r) => r.some((c) => String(c ?? '').trim() !== ''))
      .map((r) => {
        const o: Record<string, string> = {}
        columns.forEach((c, i) => {
          o[c] = String(r[i] ?? '').trim()
        })
        return o
      })

    return { name, columns, rows }
  })
}
