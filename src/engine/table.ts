import type { Analysis, ColumnIssues, ReaderSummary, Mode } from './analyze'
import { suggestName } from './analyze'

export interface Fixes {
  multiline: boolean
  keepBlank: boolean
  keepDuplicates: boolean
  renameCommas: boolean
  renames: Record<number, string>
}

export const NO_FIXES: Fixes = { multiline: false, keepBlank: false, keepDuplicates: false, renameCommas: false, renames: {} }

export interface FinalColumn { src: number; name: string }

export function active(an: Analysis, f: Fixes): { s: ReaderSummary; cols: ColumnIssues } {
  return f.multiline ? { s: an.B, cols: an.columnsB } : { s: an.A, cols: an.columnsA }
}

/** The columns the table would get, given the mode and the fixes applied. */
export function finalColumns(an: Analysis, f: Fixes, mode: Mode, emulateExcel: boolean): { cols: FinalColumn[]; dropped: number[] } {
  const { s, cols: issues } = active(an, f)
  const out: FinalColumn[] = []
  const dropped: number[] = []
  const dupIdx = new Set(issues.duplicates.map((d) => d.idx))
  const used = new Set<string>()
  s.header.forEach((raw, idx) => {
    let name = raw.trim()
    if (name === '') {
      if (mode === 'proposed' && f.keepBlank) name = `column_${idx + 1}`
      else if (emulateExcel) name = `_c${idx}`
      else { dropped.push(idx); return }
    }
    if (dupIdx.has(idx)) {
      if (mode === 'proposed' && f.keepDuplicates) {
        const base = suggestName(name).toLowerCase().replace(/[^a-z0-9_]+/g, '_')
        let n = 2
        while (used.has(`${base}_${n}`)) n++
        name = `${base}_${n}`
      } else { dropped.push(idx); return }
    }
    if (name.includes(',') && mode === 'proposed' && (f.renameCommas || f.renames[idx] !== undefined)) name = f.renames[idx] ?? suggestName(name)
    used.add(name.toLowerCase())
    out.push({ src: idx, name })
  })
  return { cols: out, dropped }
}

export function hasCommaNames(cols: FinalColumn[]): boolean {
  return cols.some((c) => c.name.includes(','))
}

export interface TableRecord {
  name: string
  catalog: string
  schema: string
  fileName: string
  mode: Mode
  createdAt: string
  rows: number
  fileRows: number | null
  badRows: number
  asIs: boolean
  columns: { name: string; type: string }[]
  sample: string[][]
  metric: { column: string; avg: number } | null
  renamed: { from: string; to: string }[]
  droppedCount: number
  headerUnconfirmed?: boolean
}
