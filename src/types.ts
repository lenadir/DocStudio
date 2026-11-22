export type Side = 'front' | 'back'

export type Align = 'left' | 'center' | 'right'

/** Card dimensions in millimetres — what gets printed. */
export interface Card {
  w: number
  h: number
}

export interface FieldStyle {
  /** mm — printed text height, so what you see is what you get on paper. */
  fontSize: number
  fontFamily: string
  color: string
  bold: boolean
  italic: boolean
  uppercase: boolean
  align: Align
  /** mm */
  letterSpacing: number
  /** degrees */
  rotation: number
  /** % of card width — the text box the value is laid out in */
  width: number
}

export type FieldKind = 'text' | 'image'

export interface Field {
  id: string
  side: Side
  /**
   * 'text'  = a value from Excel (or fixed text).
   * 'image' = an uploaded picture (logo, signature, stamp, photo). Unlike the template
   *           background, image fields ARE printed.
   */
  kind: FieldKind
  /** Image fields only: the picture as a data URL. Empty for text fields. */
  src: string
  /** Excel column name this field is bound to. Empty string = static text. */
  column: string
  /** Used when column is empty. */
  text: string
  prefix: string
  suffix: string
  /** % of card width / height, top-left corner of the text box */
  x: number
  y: number
  style: FieldStyle
}

export interface SheetData {
  name: string
  columns: string[]
  rows: Record<string, string>[]
  /** The whole grid as text, kept so the header row can be changed without re-reading the file. */
  matrix: string[][]
  /** 0-based index into `matrix` of the row holding the column names. */
  headerRow: number
}

export interface Layout {
  version: 1
  card: Card
  fields: Field[]
  images: { front: string | null; back: string | null }
}

export const DEFAULT_STYLE: FieldStyle = {
  fontSize: 5,
  fontFamily: 'Helvetica, Arial, sans-serif',
  color: '#111111',
  bold: false,
  italic: false,
  uppercase: false,
  align: 'center',
  letterSpacing: 0,
  rotation: 0,
  width: 60,
}

export const PRESETS: { label: string; w: number; h: number }[] = [
  { label: 'A4 landscape (297 × 210)', w: 297, h: 210 },
  { label: 'A4 portrait (210 × 297)', w: 210, h: 297 },
  { label: 'A5 landscape (210 × 148)', w: 210, h: 148 },
  { label: 'Letter landscape (279 × 216)', w: 279.4, h: 215.9 },
  { label: 'Badge CR80 landscape (85.6 × 54)', w: 85.6, h: 54 },
  { label: 'Badge CR80 portrait (54 × 85.6)', w: 54, h: 85.6 },
]

export const FONTS = [
  { label: 'Helvetica / Arial', value: 'Helvetica, Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Garamond', value: 'Garamond, Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
]

export const uid = () => Math.random().toString(36).slice(2, 10)
