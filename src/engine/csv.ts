// Two CSV readers.
// Reader A emulates the upload screen with "Rows span multiple lines" off:
//   every non-blank physical line is one row; quotes cannot span lines.
// Reader B emulates the setting turned on: standard RFC 4180 over the whole text.

export function normalize(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  return text.replace(/\r\n?/g, '\n')
}

/** Parse one physical line. Quotes cannot span lines; an unterminated quote runs to end of line. */
export function parseLine(line: string): string[] {
  const out: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += c
    } else if (c === '"' && field === '') {
      inQuotes = true
    } else if (c === ',') {
      out.push(field); field = ''
    } else field += c
  }
  out.push(field)
  return out
}

export interface ReaderAResult {
  header: string[]
  rows: string[][]
  /** physical line index (0-based in normalized text) for each data row */
  rowLine: Int32Array
  /** for each physical line, the data row index it produced, or -1 */
  lineRow: Int32Array
  headerLine: number
  lines: string[]
}

export function readerA(text: string, headerRow = 1): ReaderAResult {
  const lines = text.split('\n')
  const lineRow = new Int32Array(lines.length).fill(-1)
  const rows: string[][] = []
  const rowLineArr: number[] = []
  let header: string[] = []
  let seen = 0
  let headerLine = -1
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (l.trim() === '') continue
    seen++
    if (seen < headerRow) continue
    if (seen === headerRow) { header = parseLine(l); headerLine = i; continue }
    lineRow[i] = rows.length
    rows.push(parseLine(l))
    rowLineArr.push(i)
  }
  return { header, rows, rowLine: Int32Array.from(rowLineArr), lineRow, headerLine, lines }
}

export interface ReaderBResult {
  header: string[]
  rows: string[][]
  /** [startLine, endLine] physical lines for each data row */
  rowStart: Int32Array
  rowEnd: Int32Array
}

export function readerB(text: string, headerRow = 1): ReaderBResult {
  const records: string[][] = []
  const starts: number[] = []
  const ends: number[] = []
  let field = ''
  let rec: string[] = []
  let inQuotes = false
  let line = 0
  let recStart = 0
  let fieldStarted = false
  const n = text.length
  const endRecord = () => {
    rec.push(field)
    const empty = rec.length === 1 && rec[0] === '' && !fieldStarted
    if (!empty) { records.push(rec); starts.push(recStart); ends.push(line) }
    rec = []; field = ''; fieldStarted = false
  }
  for (let i = 0; i < n; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else {
        if (c === '\n') line++
        field += c
      }
      continue
    }
    if (c === '"' && field === '') { inQuotes = true; fieldStarted = true }
    else if (c === ',') { rec.push(field); field = ''; fieldStarted = true }
    else if (c === '\n') { endRecord(); line++; recStart = line }
    else { field += c; fieldStarted = true }
  }
  if (field !== '' || rec.length > 0 || fieldStarted) endRecord()
  // whitespace-only records are skipped too (blank lines)
  const keep: number[] = []
  for (let r = 0; r < records.length; r++) {
    const x = records[r]
    if (x.length === 1 && x[0].trim() === '') continue
    keep.push(r)
  }
  const h = keep[headerRow - 1]
  const header = h === undefined ? [] : records[h]
  const dataIdx = keep.slice(headerRow)
  return {
    header,
    rows: dataIdx.map((i) => records[i]),
    rowStart: Int32Array.from(dataIdx.map((i) => starts[i])),
    rowEnd: Int32Array.from(dataIdx.map((i) => ends[i])),
  }
}
