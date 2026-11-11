import { normalize, readerA, readerB } from './csv'

export type ColType = 'bigint' | 'double' | 'date' | 'string'
export type Mode = 'today' | 'proposed'

export interface ReaderSummary {
  header: string[]
  width: number
  rows: number
  bad: number
  good: number
  preview: string[][]
  /** row numbers (1-based, in this reader's table) of rows that don't fit, up to 200 */
  badRows: { n: number; text: string }[]
  /** numeric sum and count per column, over every row (what AVG() would see) */
  numSum: number[]
  numCount: number[]
  typesAll: ColType[] // from first 1,000 fitting rows
  typesFirst50: ColType[] // from first 50 rows, fitting or not
  row2: string[] | null // first data row, for survey label detection
  firstRows: string[][] // first 10 rows (raw), for the header picker
}

export interface ColumnIssues {
  blank: number[] // 0-based positions with empty names
  duplicates: { idx: number; name: string; firstIdx: number }[]
  comma: { idx: number; name: string; suggestion: string }[]
  headerSuspect: { blank: number; total: number; suggestedRow: number } | null
  row2Labels: boolean
}

export interface Analysis {
  fileName: string
  bytes: number
  ms: number
  headerRow: number
  A: ReaderSummary
  B: ReaderSummary
  rowState: 'clean' | 'fixable' | 'guard'
  example: { recordNo: number; parts: string[] } | null
  columnsA: ColumnIssues
  columnsB: ColumnIssues
  encodingWarning: boolean
}

const INT = /^-?\d+$/
const NUM = /^-?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

function inferTypes(rows: string[][], width: number): ColType[] {
  const t: ColType[] = []
  for (let c = 0; c < width; c++) {
    let isInt = true, isNum = true, isDate = true, any = false
    for (const r of rows) {
      const v = (r[c] ?? '').trim()
      if (v === '') continue
      any = true
      if (isInt && !INT.test(v)) isInt = false
      if (isNum && !NUM.test(v)) isNum = false
      if (isDate && !DATE.test(v)) isDate = false
      if (!isInt && !isNum && !isDate) break
    }
    t.push(!any ? 'string' : isInt ? 'bigint' : isNum ? 'double' : isDate ? 'date' : 'string')
  }
  return t
}

function summarize(header: string[], rows: string[][]): ReaderSummary {
  const width = header.length
  let bad = 0
  const badRows: { n: number; text: string }[] = []
  const numSum = new Array(width).fill(0)
  const numCount = new Array(width).fill(0)
  const fitSample: string[][] = []
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (r.length !== width) {
      bad++
      if (badRows.length < 200) badRows.push({ n: i + 1, text: r.join(',') })
    } else if (fitSample.length < 1000) fitSample.push(r)
    for (let c = 0; c < width; c++) {
      const v = r[c]
      if (v !== undefined && v !== '' && NUM.test(v.trim())) { numSum[c] += Number(v); numCount[c]++ }
    }
  }
  return {
    header, width, rows: rows.length, bad, good: rows.length - bad,
    preview: rows.slice(0, 50),
    badRows, numSum, numCount,
    typesAll: inferTypes(fitSample, width),
    typesFirst50: inferTypes(rows.slice(0, 50), width),
    row2: rows[0] ?? null,
    firstRows: rows.slice(0, 10),
  }
}

/**
 * The fix (reading line breaks inside quotes) is safe only if it reduces the rows that don't fit
 * and keeps at least half of the rows that already fit. Split fragments can accidentally fit,
 * so "keep all of them" is too strict; a stray quote that swallows the file fails this easily.
 */
export function fixIsSafe(A: { bad: number; good: number }, B: { bad: number; good: number }): boolean {
  return B.bad < A.bad && B.good >= 0.5 * A.good
}

export function suggestName(name: string): string {
  return name.trim().replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'column'
}

export function columnIssues(s: ReaderSummary): ColumnIssues {
  const h = s.header
  const blank: number[] = []
  const duplicates: ColumnIssues['duplicates'] = []
  const comma: ColumnIssues['comma'] = []
  const seen = new Map<string, number>()
  h.forEach((name, idx) => {
    const t = name.trim()
    if (t === '') { blank.push(idx); return }
    const k = t.toLowerCase()
    if (seen.has(k)) duplicates.push({ idx, name: t, firstIdx: seen.get(k)! })
    else seen.set(k, idx)
    if (t.includes(',')) comma.push({ idx, name: t, suggestion: suggestName(t) })
  })
  let row2Labels = false
  if (blank.length > 0 && s.row2) {
    const vals = blank.map((i) => (s.row2![i] ?? '').trim())
    const textish = vals.filter((v) => v !== '' && v.length <= 60 && !NUM.test(v)).length
    row2Labels = textish >= Math.ceil(blank.length * 0.6)
  }
  let headerSuspect: ColumnIssues['headerSuspect'] = null
  const total = h.length
  const longFirst = (h[0] ?? '').trim().length > 60
  if (!row2Labels && total > 1 && (blank.length > total / 2 || (longFirst && blank.length >= (total - 1) / 2))) {
    let suggestedRow = 0
    for (let i = 0; i < s.firstRows.length; i++) {
      const r = s.firstRows[i]
      if (r.length >= total && r.slice(0, total).every((v) => v.trim() !== '')) { suggestedRow = i + 2; break }
    }
    headerSuspect = { blank: blank.length, total, suggestedRow }
  }
  return { blank, duplicates, comma, headerSuspect, row2Labels }
}

/** Combine a header with a second label row (survey exports). */
export function combineHeader(h: string[], row2: string[]): string[] {
  let lastNamed = ''
  return h.map((name, i) => {
    const t = name.trim()
    const lab = (row2[i] ?? '').trim()
    if (t !== '') {
      lastNamed = t
      const nextBlank = i + 1 < h.length && h[i + 1].trim() === ''
      return nextBlank && lab !== '' ? `${t}: ${lab}` : t
    }
    return lastNamed && lab ? `${lastNamed}: ${lab}` : lab
  })
}

export interface AnalyzeOptions { headerRow?: number; row2AsHeader?: boolean }

export function analyzeText(raw: string, fileName: string, bytes: number, opts: AnalyzeOptions = {}): Analysis {
  const headerRow = opts.headerRow ?? 1
  const t0 = performance.now()
  const encodingWarning = raw.includes('�')
  const text = normalize(raw)
  const a = readerA(text, headerRow)
  const b = readerB(text, headerRow)
  if (opts.row2AsHeader) {
    if (a.rows.length) { a.header = combineHeader(a.header, a.rows[0]); a.lineRow[a.rowLine[0]] = -1; a.rows = a.rows.slice(1); a.rowLine = a.rowLine.slice(1); for (let i = 0; i < a.lineRow.length; i++) if (a.lineRow[i] > 0) a.lineRow[i]-- }
    if (b.rows.length) { b.header = combineHeader(b.header, b.rows[0]); b.rows = b.rows.slice(1); b.rowStart = b.rowStart.slice(1); b.rowEnd = b.rowEnd.slice(1) }
  }
  const A = summarize(a.header, a.rows)
  const B = summarize(b.header, b.rows)

  let rowState: Analysis['rowState'] = 'clean'
  if (A.bad > 0) rowState = fixIsSafe(A, B) ? 'fixable' : 'guard'

  let example: Analysis['example'] = null
  if (rowState === 'fixable') {
    for (let r = 0; r < b.rows.length; r++) {
      if (b.rows[r].some((v) => v.includes('\n'))) {
        const parts: string[] = []
        for (let line = b.rowStart[r]; line <= b.rowEnd[r]; line++) {
          if (a.lineRow[line] >= 0) parts.push(a.lines[line])
        }
        example = { recordNo: r + 1, parts }
        break
      }
    }
  }
  return {
    fileName, bytes, ms: performance.now() - t0, headerRow,
    A, B, rowState, example,
    columnsA: columnIssues(A), columnsB: columnIssues(B),
    encodingWarning,
  }
}
