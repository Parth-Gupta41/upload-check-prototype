import { useSyncExternalStore } from 'react'
import type { Analysis, AnalyzeOptions, Mode } from '../engine/analyze'
import { analyzeText, fixIsSafe } from '../engine/analyze'
import { NO_FIXES, type Fixes, type TableRecord } from '../engine/table'
import AnalyzeWorker from '../engine/worker?worker'

export interface Upload {
  id: number
  scenarioId?: string
  fileName: string
  bytes: number
  text: string
  analysis: Analysis | null
  fixes: Fixes
  opts: AnalyzeOptions
  tableName: string
  emulateExcel: boolean
  metricColumn?: string
  notice: string | null
  error: string | null
}

export interface EventItem { t: number; name: string; props: Record<string, unknown> }

export interface State {
  mode: Mode
  theme: 'dark' | 'light'
  upload: Upload | null
  tables: Record<string, TableRecord>
  uploadsByTable: Record<string, Upload>
  events: EventItem[]
  logOpen: boolean
}

const prefersLight = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches
let state: State = { mode: 'proposed', theme: prefersLight ? 'light' : 'dark', upload: null, tables: {}, uploadsByTable: {}, events: [], logOpen: false }
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())

export function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const p = typeof patch === 'function' ? patch(state) : patch
  state = { ...state, ...p }
  emit()
}
export function getState() { return state }
export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb) }, () => sel(state))
}

export function log(name: string, props: Record<string, unknown> = {}) {
  setState((s) => ({ events: [{ t: Date.now(), name, props }, ...s.events].slice(0, 500) }))
}

export function patchUpload(p: Partial<Upload> | ((u: Upload) => Partial<Upload>)) {
  setState((s) => (s.upload ? { upload: { ...s.upload, ...(typeof p === 'function' ? p(s.upload) : p) } } : {}))
}

let worker: Worker | null = null
let nextId = 1
function runAnalysis(text: string, fileName: string, bytes: number, opts: AnalyzeOptions): Promise<Analysis> {
  if (text.length < 1_000_000 || typeof Worker === 'undefined') return Promise.resolve(analyzeText(text, fileName, bytes, opts))
  worker ??= new AnalyzeWorker()
  const id = nextId++
  return new Promise((resolve, reject) => {
    const w = worker!
    const onMsg = (e: MessageEvent) => {
      if (e.data.id !== id) return
      w.removeEventListener('message', onMsg)
      if (e.data.error) reject(new Error(e.data.error)); else resolve(e.data.result)
    }
    w.addEventListener('message', onMsg)
    w.postMessage({ id, text, fileName, bytes, opts })
  })
}

export const MAX_BYTES = 200 * 1024 * 1024

export function tableNameFrom(file: string) {
  return file.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'new_table'
}

export async function loadFile(p: { text: string; fileName: string; bytes: number; scenarioId?: string; emulateExcel?: boolean; metricColumn?: string }) {
  const id = nextId++
  const u: Upload = {
    id, scenarioId: p.scenarioId, fileName: p.fileName, bytes: p.bytes, text: p.text, analysis: null,
    fixes: { ...NO_FIXES, renames: {} }, opts: {}, tableName: tableNameFrom(p.fileName), emulateExcel: !!p.emulateExcel,
    metricColumn: p.metricColumn, notice: null, error: null,
  }
  setState({ upload: u })
  log('file_loaded', { scenario: p.scenarioId ?? 'own', bytes: p.bytes })
  await reanalyze({})
}

export async function reanalyze(opts: AnalyzeOptions) {
  const u = getState().upload
  if (!u) return
  patchUpload({ analysis: null, opts })
  try {
    const an = await runAnalysis(u.text, u.fileName, u.bytes, opts)
    if (getState().upload?.id !== u.id) return
    patchUpload({ analysis: an })
    const result = an.rowState !== 'clean' ? (an.rowState === 'guard' ? 'guard' : 'rows')
      : an.columnsA.blank.length || an.columnsA.duplicates.length || an.columnsA.comma.length ? 'columns'
      : an.columnsA.headerSuspect ? 'possible' : 'clean'
    log('check_completed', { mode: getState().mode, result, file_rows: an.rowState === 'fixable' ? an.B.rows : an.A.rows, table_rows: an.A.rows, bad_rows: an.A.bad, ms: Math.round(an.ms) })
    if (getState().mode === 'proposed' && result !== 'clean') log('check_panel_shown', { level: result === 'possible' ? 'possible' : 'confirmed' })
    if (an.rowState === 'guard') log('fix_rejected_guard', { a_good: an.A.good, b_good: an.B.good })
  } catch (e) {
    patchUpload({ error: String(e) })
  }
}

/** Manual change of the "Rows span multiple lines" switch. Guarded in Proposed mode. */
export function setMultiline(on: boolean, source: 'fix' | 'switch') {
  const s = getState()
  const an = s.upload?.analysis
  if (!an) return
  if (on && s.mode === 'proposed' && source === 'switch' && !fixIsSafe(an.A, an.B)) {
    patchUpload({ notice: `worse:${an.B.rows}:${an.A.rows}` })
    log('fix_rejected_guard', { a_good: an.A.good, b_good: an.B.good, source })
    return
  }
  patchUpload((u) => ({ fixes: { ...u.fixes, multiline: on }, notice: null }))
  if (on) log(source === 'fix' ? 'fix_applied' : 'setting_changed', { rows_after: an.B.rows, bad_after: an.B.bad })
  else log('fix_undone', {})
}
