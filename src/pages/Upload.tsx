import { useEffect, useRef, useState, type ReactNode } from "react"
import { useNavigate } from 'react-router-dom'
import {
  FileText, X, Info, TriangleAlert, CircleCheck, LoaderCircle, Table2, List, Database, Folder, ChevronDown, Calendar,
} from 'lucide-react'
import { clip, copy } from '../copy'
import { SCENARIOS, scenarioText } from '../scenarios'
import { getState, loadFile, log, MAX_BYTES, patchUpload, reanalyze, setMultiline, setState, useStore, type Upload as U } from '../state/store'
import { active, finalColumns, type FinalColumn, type TableRecord } from '../engine/table'
import type { Analysis, ColType } from '../engine/analyze'
import { suggestName } from '../engine/analyze'

const n = (x: number) => x.toLocaleString('en-US')
const fmtBytes = (b: number) => (b < 1024 * 1024 ? (b / 1024).toFixed(2) + 'KB' : (b / 1024 / 1024).toFixed(2) + 'MB')

export function UploadPage() {
  const upload = useStore((s) => s.upload)
  return (
    <div className="page">
      <div className="crumb"><a href="#/upload">Add data</a> <span>›</span></div>
      <div className="top-row">
        <h1 className="title">Create or modify table from files</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Info size={14} className="muted" aria-hidden="true" />
          <div className="input select warehouse" aria-label="Compute (decorative)"><span><span style={{ color: 'var(--ok)' }}>●</span> Serverless warehouse</span><ChevronDown size={14} /></div>
        </div>
      </div>
      {upload ? <Preview u={upload} /> : <Empty />}
    </div>
  )
}

function readFile(f: File) {
  if (f.size > MAX_BYTES) {
    alertLarge()
    return
  }
  const r = new FileReader()
  r.onload = () => loadFile({ text: String(r.result), fileName: f.name, bytes: f.size })
  r.readAsText(f)
}
function alertLarge() {
  setState({ upload: null })
  window.setTimeout(() => window.dispatchEvent(new CustomEvent('too-large')), 0)
}

export function openScenario(id: string) {
  const s = SCENARIOS.find((x) => x.id === id)!
  const text = scenarioText(id)
  loadFile({ text, fileName: s.fileName, bytes: new Blob([text]).size, scenarioId: id, emulateExcel: s.emulateExcel, metricColumn: s.metricColumn })
}

function Empty() {
  const [drag, setDrag] = useState(false)
  const [tooLarge, setTooLarge] = useState(false)
  const inp = useRef<HTMLInputElement>(null)
  useEffect(() => { const h = () => setTooLarge(true); window.addEventListener("too-large", h); return () => window.removeEventListener("too-large", h) }, [])
  return (
    <>
      <div style={{ display: 'flex', gap: 8 }}>
        <span className="chip on"><FileText size={14} /> File upload</span>
        <span className="chip" aria-disabled="true"><Folder size={14} /> Volume</span>
        <span className="chip" aria-disabled="true"><Database size={14} /> Cloud storage</span>
      </div>
      <div
        className={'dropzone' + (drag ? ' drag' : '')}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) readFile(f) }}
      >
        <FileText size={32} className="muted" aria-hidden="true" />
        <div>Drop a CSV file here, or <button className="linkbtn" onClick={() => inp.current?.click()}>browse</button></div>
        <input ref={inp} type="file" accept=".csv,.tsv,.txt,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f) }} />
        <div className="muted">This prototype reads CSV files up to 200 MB in your browser. The real screen accepts up to 10 files and 2 GB.</div>
        {tooLarge && <div role="alert" style={{ color: 'var(--warn)' }}>Files this large are beyond what this prototype handles in a browser. The real upload screen accepts up to 2 GB.</div>}
        <div style={{ marginTop: 12 }}><strong>Or try a demo file</strong></div>
        <div className="demo-files">
          {SCENARIOS.map((s) => <button key={s.id} className="btn" onClick={() => openScenario(s.id)}><FileText size={14} />{s.title}</button>)}
        </div>
        <div className="muted small" style={{ marginTop: 8 }}>{copy.privacy}</div>
      </div>
    </>
  )
}

/* ---------- derived view model ---------- */
interface VM {
  an: Analysis
  cols: FinalColumn[]
  dropped: number[]
  rowsProblem: 'none' | 'fixable' | 'guard' | 'leftover'
  blankOpen: number[]
  dupOpen: { idx: number; name: string }[]
  commaOpen: FinalColumn[]
  headerSuspect: Analysis['columnsA']['headerSuspect']
  row2Labels: boolean
  confirmed: boolean
  // What the panel shows. While the header question is open, a comma in row 1 is a symptom of the
  // wrong header, so it isn't shown as its own problem (Create still renames it if row 1 is kept).
  commaPanel: FinalColumn[]
  confirmedPanel: boolean
}

function viewModel(u: U, mode: 'today' | 'proposed'): VM | null {
  const an = u.analysis
  if (!an) return null
  const f = u.fixes
  const { s, cols: issues } = active(an, f)
  const { cols, dropped } = finalColumns(an, f, mode, u.emulateExcel)
  let rowsProblem: VM['rowsProblem'] = 'none'
  if (f.multiline) rowsProblem = s.bad > 0 ? 'leftover' : 'none'
  else if (an.rowState === 'fixable') rowsProblem = 'fixable'
  else if (an.rowState === 'guard') rowsProblem = 'guard'
  const blankOpen = u.emulateExcel || f.keepBlank ? [] : issues.blank
  const dupOpen = f.keepDuplicates ? [] : issues.duplicates.map((d) => ({ idx: d.idx, name: d.name }))
  const commaOpen = cols.filter((c) => c.name.includes(','))
  const headerSuspect = (u.opts.headerRow ?? 1) === 1 ? issues.headerSuspect : null
  const row2Labels = !u.opts.row2AsHeader && issues.row2Labels && blankOpen.length > 0
  const confirmed = rowsProblem === 'fixable' || rowsProblem === 'guard' || blankOpen.length > 0 || dupOpen.length > 0 || commaOpen.length > 0
  const commaPanel = headerSuspect ? [] : commaOpen
  const confirmedPanel = rowsProblem === 'fixable' || rowsProblem === 'guard' || blankOpen.length > 0 || dupOpen.length > 0 || commaPanel.length > 0
  return { an, cols, dropped, rowsProblem, blankOpen, dupOpen, commaOpen, headerSuspect, row2Labels, confirmed, commaPanel, confirmedPanel }
}

/* ---------- preview screen ---------- */
function Preview({ u }: { u: U }) {
  const mode = useStore((s) => s.mode)
  const nav = useNavigate()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [adv, setAdv] = useState(false)
  const [modal, setModal] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [tip, setTip] = useState(false)
  const vm = viewModel(u, mode)
  const an = u.analysis
  const todayBlocked = mode === 'today' && !!vm && vm.commaOpen.length > 0

  const onCreate = () => {
    if (!vm) return
    log('create_clicked', { open_confirmed: vm.confirmed, open_possible: !!vm.headerSuspect })
    if (todayBlocked) { setTip(true); return }
    if (mode === 'proposed' && vm.confirmed) { setModal(true); log('create_confirm_shown', { reason: vm.rowsProblem !== 'none' ? 'rows' : vm.commaOpen.length ? 'comma' : 'columns' }); return }
    finish(false)
  }
  const finish = (fixAll: boolean, renameCommasOnly = false) => {
    const cur = getState().upload!
    let fixes = cur.fixes
    if (fixAll) fixes = { ...fixes, multiline: fixes.multiline || cur.analysis!.rowState === 'fixable', keepBlank: true, keepDuplicates: true, renameCommas: true }
    if (renameCommasOnly) fixes = { ...fixes, renameCommas: true }
    const name = createTable({ ...cur, fixes }, getState().mode)
    if (fixAll && cur.analysis!.rowState === 'fixable' && !cur.fixes.multiline) log('fix_applied', { rows_after: cur.analysis!.B.rows, bad_after: cur.analysis!.B.bad, via: 'modal' })
    nav(`/table/${name}`)
  }

  return (
    <>
      <div className="grid-form">
        <div className="filechip">
          <span><strong>{u.fileName} uploaded</strong> <span className="small">{fmtBytes(u.bytes)}</span></span>
          <button className="iconbtn" aria-label="Remove file" style={{ marginLeft: 'auto' }} onClick={() => setState({ upload: null })}><X size={16} /></button>
        </div>
        <div className="input select" aria-label="Create new table (decorative)"><span>Create new table</span><ChevronDown size={14} /></div>
      </div>
      <div className="form-row" style={{ marginTop: 12 }}>
        <div className="field"><span className="lbl">Preview mode</span>
          <div className="seg" role="radiogroup" aria-label="Preview mode">
            <button role="radio" aria-checked={view === 'grid'} aria-label="Grid" className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')}><Table2 size={15} /></button>
            <button role="radio" aria-checked={view === 'list'} aria-label="List" className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}><List size={15} /></button>
          </div>
        </div>
        <div className="field"><span className="lbl">Catalog</span><div className="input select"><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Folder size={14} />workspace</span><ChevronDown size={14} /></div></div>
        <div className="field"><span className="lbl">Schema</span><div className="input select"><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Database size={14} />default</span><ChevronDown size={14} /></div></div>
        <div className="field"><label htmlFor="tname">Table name</label>
          <div className="input"><Table2 size={14} className="muted" /><input id="tname" value={u.tableName} onChange={(e) => patchUpload({ tableName: e.target.value.replace(/[^A-Za-z0-9_]/g, '_') })} /></div>
        </div>
      </div>
      <div className="form-row2">
        <label className="check"><input type="checkbox" checked readOnly /> First row contains the header</label>
        <button className="linkbtn" onClick={() => setAdv(true)}>Advanced attributes</button>
      </div>

      {mode === 'proposed' && <CheckArea u={u} vm={vm} onView={() => setDrawer(true)} />}

      <div className="preview-meta"><Info size={13} /> {an ? `Previewing ${Math.min(50, active(an, u.fixes).s.rows)} rows, ${vm!.cols.length} columns` : 'Loading preview...'}</div>
      {an && vm && (view === 'grid' ? <Grid u={u} vm={vm} mode={mode} /> : <ListView u={u} vm={vm} />)}

      <div className="footer">
        <button className="btn link" onClick={() => setState({ upload: null })}>Cancel</button>
        <span style={{ position: 'relative' }} onMouseLeave={() => setTip(false)}>
          {tip && todayBlocked && <span role="tooltip" style={{ position: 'absolute', bottom: 40, right: 0, background: 'var(--text)', color: 'var(--panel)', borderRadius: 4, padding: '6px 10px', whiteSpace: 'nowrap', fontSize: 12 }}>{copy.todayBlocked}</span>}
          <button className="btn primary" aria-disabled={todayBlocked || !an} onMouseEnter={() => setTip(true)} onFocus={() => setTip(true)} onBlur={() => setTip(false)} onClick={onCreate}>
            {!an ? 'Checking...' : 'Create table'}
          </button>
        </span>
      </div>

      {adv && <AdvancedDialog u={u} onClose={() => setAdv(false)} />}
      {modal && vm && <CreateModal vm={vm} u={u} onClose={() => setModal(false)} onFix={() => { setModal(false); finish(true) }} onAsIs={() => { setModal(false); log('create_anyway', { rows: active(vm.an, u.fixes).s.rows, file_rows: vm.an.B.rows }); finish(false, true) }} />}
      {drawer && an && <RowsDrawer u={u} onClose={() => setDrawer(false)} />}
    </>
  )
}

/* ---------- the check area ---------- */
function CheckArea({ u, vm, onView }: { u: U; vm: VM | null; onView: () => void }) {
  if (!vm) return <div className="check-area" aria-live="polite"><div className="checking"><LoaderCircle size={16} className="spin" />{copy.checking}</div></div>
  const { an } = vm
  const f = u.fixes
  const act = active(an, f).s
  const notice = u.notice?.startsWith('worse:') ? u.notice.split(':').map(Number) : null
  const timing = <div className="muted small">{copy.checkedIn(an.A.rows + an.B.rows > 0 ? Math.max(an.A.rows, an.B.rows) : 0, an.ms)}</div>
  const keptAll = vm.dropped.length === 0 && Object.keys(f.renames).length === 0 && !f.renameCommas && !f.keepBlank && !f.keepDuplicates

  const rowsOkLine = (
    <div className={'okline' + (vm.rowsProblem === 'leftover' && act.bad / Math.max(1, act.rows) > 0.01 ? ' warnish' : '')}>
      {vm.rowsProblem === 'leftover' && act.bad / Math.max(1, act.rows) > 0.01 ? <TriangleAlert size={16} className="ico" /> : <CircleCheck size={16} className="ico" />}
      <div>
        <div>
          {vm.rowsProblem === 'leftover'
            ? <>{n(act.rows)} rows. {copy.leftover(act.bad)} <button className="linkbtn" onClick={onView}>{copy.view(act.bad)}</button></>
            : vm.confirmedPanel ? `${n(act.rows)} rows, matching your file.` : keptAll ? copy.okMatch(act.rows, vm.cols.length) : copy.okMatchSome(act.rows, vm.cols.length)}
        </div>
        {f.multiline && <div className="muted">{copy.okFixed} <button className="linkbtn" onClick={() => setMultiline(false, 'fix')}>{copy.undo}</button></div>}
        {!vm.confirmedPanel && timing}
      </div>
    </div>
  )

  const colsBlockPresent = vm.blankOpen.length > 0 || vm.dupOpen.length > 0 || vm.commaPanel.length > 0
  const rowsBlock: ReactNode =
    vm.rowsProblem === 'fixable' ? (
      <div className="rows-split">
        <div>
          <p>{copy.rowsCompare(an.B.rows, an.A.rows)} {copy.rowsCause}</p>
          <div className="actions">
            <button className="btn primary" onClick={() => { log('fix_clicked', {}); setMultiline(true, 'fix') }}>{copy.fixRows}</button>
            <button className="linkbtn" onClick={onView}>{copy.viewBad(an.A.bad)}</button>
          </div>
          <div className="subnote">{copy.settingName}{!colsBlockPresent && <> · {copy.checkedIn(Math.max(an.A.rows, an.B.rows), an.ms)}</>}</div>
        </div>
        {an.example && (
          <div className="example">
            <div>{copy.example(an.example.recordNo, an.example.parts.length)}</div>
            <pre>{an.example.parts.slice(0, 3).map((p, i) => <div key={i}><span className="rowtag">{String(i + 1).padStart(2, ' ')}  </span>{p.length > 90 ? p.slice(0, 90) + '...' : p}</div>)}{an.example.parts.length > 3 && <div className="rowtag">    and {an.example.parts.length - 3} more</div>}</pre>
          </div>
        )}
      </div>
    ) : vm.rowsProblem === 'guard' ? (
      <>
        <p>{copy.guardRows(an.A.bad)} <button className="linkbtn" onClick={onView}>{copy.view(an.A.bad)}</button></p>
        <p className="muted">{copy.guardWhy(an.B.rows, an.A.rows)}</p>
      </>
    ) : null

  const colsBlock = (vm.blankOpen.length > 0 || vm.dupOpen.length > 0 || vm.commaPanel.length > 0) && (
    <div className={rowsBlock || vm.rowsProblem !== 'none' ? 'cols' : ''}>
      {(rowsBlock || vm.rowsProblem !== 'none') && <h4>{copy.columns}</h4>}
      {vm.blankOpen.length > 0 && (
        <div className="colitem">
          {copy.blankCols(vm.blankOpen.length)}
          <div className="actions">
            <button className="btn" onClick={() => { patchUpload((x) => ({ fixes: { ...x.fixes, keepBlank: true } })); log('column_fix_applied', { type: 'blank' }) }}>{copy.keepBlank(vm.blankOpen.map((i) => i + 1))}</button>
            {vm.row2Labels && <><span className="muted">{copy.row2Hint}</span><button className="btn" onClick={() => { log('column_fix_applied', { type: 'row2' }); reanalyze({ ...u.opts, row2AsHeader: true }) }}>{copy.row2Action}</button></>}
          </div>
        </div>
      )}
      {vm.dupOpen.length > 0 && (
        <div className="colitem">
          {vm.dupOpen.length === 1 ? copy.dupCols(vm.dupOpen[0].name) : copy.dupColsMany(vm.dupOpen.length)}
          <div className="actions">
            <button className="btn" onClick={() => { patchUpload((x) => ({ fixes: { ...x.fixes, keepDuplicates: true } })); log('column_fix_applied', { type: 'duplicate' }) }}>
              {vm.dupOpen.length === 1 ? copy.keepDup(vm.dupOpen[0].name.toLowerCase().replace(/[^a-z0-9]+/g, '_')) : copy.keepDupMany}
            </button>
          </div>
        </div>
      )}
      {vm.commaPanel.length === 1 && <CommaOne col={vm.commaPanel[0]} />}
      {vm.commaPanel.length > 1 && (
        <div className="colitem">
          {copy.commaColMany(vm.commaPanel.length)}
          <div className="actions">
            <button className="btn" onClick={() => { patchUpload((x) => ({ fixes: { ...x.fixes, renameCommas: true } })); log('column_fix_applied', { type: 'comma', count: vm.commaPanel.length }) }}>
              {copy.renameAll(clip(suggestName(vm.commaPanel[0].name), 48))}
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="check-area" aria-live="polite">
      {notice && (
        <div className="alert warn" style={{ marginBottom: 8 }} role="status">
          <TriangleAlert size={16} className="ico" /><div className="content">{copy.madeWorse(notice[1], notice[2])}</div>
          <button className="iconbtn" aria-label="Dismiss" onClick={() => patchUpload({ notice: null })}><X size={14} /></button>
        </div>
      )}
      {vm.headerSuspect && <HeaderSuspect u={u} hs={vm.headerSuspect} rows={act.firstRows} />}
      {vm.confirmedPanel ? (
        <div className="alert warn" style={vm.headerSuspect ? { marginTop: 8 } : undefined}>
          <TriangleAlert size={16} className="ico" />
          <div className="content">
            <h3>{copy.wontMatch}</h3>
            {rowsBlock}
            {!rowsBlock && vm.rowsProblem !== 'none' && rowsOkLine}
            {!rowsBlock && vm.rowsProblem === 'none' && f.multiline && rowsOkLine}
            {colsBlock}
            {(vm.rowsProblem !== 'fixable' || colsBlockPresent) && <div style={{ marginTop: 8 }}>{timing}</div>}
          </div>
        </div>
      ) : (
        !vm.headerSuspect && rowsOkLine
      )}
    </div>
  )
}

function CommaOne({ col }: { col: FinalColumn }) {
  const [val, setVal] = useState(suggestName(col.name))
  return (
    <div className="colitem">
      {copy.commaCol(col.name)}
      <div className="actions rename">
        <span>{copy.renameTo}</span>
        <span className="input"><input aria-label={`New name for ${col.name}`} value={val} onChange={(e) => setVal(e.target.value)} /></span>
        <button className="btn" onClick={() => { if (!val.trim() || val.includes(',')) return; patchUpload((x) => ({ fixes: { ...x.fixes, renames: { ...x.fixes.renames, [col.src]: val.trim() } } })); log('column_fix_applied', { type: 'comma' }) }}>{copy.rename}</button>
      </div>
    </div>
  )
}

function HeaderSuspect({ u, hs, rows }: { u: U; hs: NonNullable<VM['headerSuspect']>; rows: string[][] }) {
  const [row, setRow] = useState(hs.suggestedRow || 2)
  return (
    <div className="alert info">
      <Info size={16} className="ico" />
      <div className="content">
        <h3>{copy.mayNotMatch}</h3>
        <p>{copy.headerSuspect(hs.blank, hs.total)}</p>
        <div className="actions">
          <span>{copy.headerAsk}</span>
          <span className="input select" style={{ height: 28, maxWidth: 360 }}>
            <select aria-label="Header row" value={row} onChange={(e) => setRow(Number(e.target.value))} style={{ border: 0, background: 'transparent', width: '100%' }}>
              {rows.slice(0, 8).map((r, i) => <option key={i} value={i + 2}>Row {i + 2}: {clip(r.filter((x) => x.trim()).slice(0, 3).join(', '), 50) || '(blank)'}</option>)}
            </select>
          </span>
          <button className="btn" onClick={() => { log('column_fix_applied', { type: 'header_row', row }); reanalyze({ ...u.opts, headerRow: row }) }}>{copy.useRow}</button>
        </div>
      </div>
    </div>
  )
}

/* ---------- grid ---------- */
function TypeIcon({ t }: { t: ColType }) {
  if (t === 'date') return <Calendar size={13} className="muted" aria-label="date" />
  return <span className="ticon" aria-label={t}>{t === 'string' ? 'ABC' : t === 'bigint' ? '123' : '1.2'}</span>
}

function Grid({ u, vm, mode }: { u: U; vm: VM; mode: 'today' | 'proposed' }) {
  const s = active(vm.an, u.fixes).s
  const types = s.typesAll
  return (
    <div className="gridwrap" tabIndex={0} aria-label="Preview of the first 50 rows">
      <table className="grid">
        <thead><tr>{vm.cols.map((c) => <th key={c.src} scope="col"><div className="th"><span className="tname"><TypeIcon t={types[c.src]} /> <span title={c.name}>{c.name}</span></span><ChevronDown size={13} className="muted" /></div></th>)}</tr></thead>
        <tbody>
          {s.preview.map((r, i) => (
            <tr key={i} className={mode === 'proposed' && r.length !== s.width ? 'misfit' : ''} title={mode === 'proposed' && r.length !== s.width ? "This row doesn't fit the columns" : undefined}>
              {vm.cols.map((c) => { const v = r[c.src]; return <td key={c.src} title={v}>{v === undefined || v === '' ? <span className="null">null</span> : v.replace(/\n/g, ' ')}</td> })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ListView({ u, vm }: { u: U; vm: VM }) {
  const s = active(vm.an, u.fixes).s
  return (
    <div className="gridwrap">
      {s.preview.slice(0, 20).map((r, i) => (
        <div key={i} style={{ borderBottom: '1px solid var(--grid-line)', padding: '8px 0' }}>
          {vm.cols.map((c) => <div key={c.src}><span className="muted">{c.name}: </span>{r[c.src] ?? <span className="null">null</span>}</div>)}
        </div>
      ))}
    </div>
  )
}

/* ---------- overlays ---------- */
function AdvancedDialog({ u, onClose }: { u: U; onClose: () => void }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="adv-title" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="modal">
        <header><h2 id="adv-title">Advanced attributes</h2><button className="iconbtn" aria-label="Close" onClick={onClose} autoFocus><X size={18} /></button></header>
        <div className="mbody" style={{ display: 'grid', gap: 14 }}>
          <label className="check"><input type="checkbox" checked readOnly /> Automatically detect file type</label>
          <div style={{ display: 'flex', gap: 16 }}>
            <div className="field"><span className="lbl">Column delimiter</span><div className="input" style={{ width: 120 }}>,</div></div>
            <div className="field"><span className="lbl">Escape character</span><div className="input" style={{ width: 120 }}>"</div></div>
          </div>
          <label className="check"><input type="checkbox" checked readOnly /> First row contains the header</label>
          <label className="check"><input type="checkbox" checked readOnly /> Automatically detect column types</label>
          <label className="check"><input type="checkbox" checked={u.fixes.multiline} onChange={(e) => setMultiline(e.target.checked, 'switch')} /> Rows span multiple lines</label>
          <label className="check"><input type="checkbox" checked readOnly disabled /> Merge schema across multiple files</label>
        </div>
      </div>
    </div>
  )
}

function CreateModal({ vm, u, onClose, onFix, onAsIs }: { vm: VM; u: U; onClose: () => void; onFix: () => void; onAsIs: () => void }) {
  const act = active(vm.an, u.fixes).s
  const commaOnly = vm.commaOpen.length > 0 && vm.rowsProblem === 'none' && vm.blankOpen.length === 0 && vm.dupOpen.length === 0
  const rowsOpen = vm.rowsProblem === 'fixable' || vm.rowsProblem === 'guard'
  const colsOpen = vm.blankOpen.length + vm.dupOpen.length
  const canFix = vm.rowsProblem === 'fixable' || colsOpen > 0 || vm.commaOpen.length > 0
  const rename = (c: FinalColumn) => suggestName(c.name)
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="cm-title" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="modal">
        <header><h2 id="cm-title">{commaOnly ? copy.modalCommaTitle : copy.modalRowsTitle}</h2><button className="iconbtn" aria-label="Close" onClick={onClose}><X size={18} /></button></header>
        <div className="mbody">
          {rowsOpen && vm.rowsProblem === 'fixable' && <p>{copy.modalRowsBody(act.rows, vm.an.B.rows)}</p>}
          {rowsOpen && <p>{copy.modalRowsBad(act.bad)}</p>}
          {colsOpen > 0 && <p>{copy.modalColsDropped(colsOpen)}</p>}
          {vm.commaOpen.slice(0, 3).map((c) => <p key={c.src}>{copy.modalComma(c.name, rename(c))}</p>)}
          {vm.commaOpen.length > 3 && <p className="muted">and {vm.commaOpen.length - 3} more</p>}
        </div>
        <footer>
          <button className="btn" onClick={onClose}>{copy.cancel}</button>
          {commaOnly ? (
            <button className="btn primary" autoFocus onClick={onAsIs}>{copy.renameAndCreate}</button>
          ) : (
            <>
              <button className="btn" onClick={onAsIs}>{copy.createAsIs}</button>
              {canFix && <button className="btn primary" autoFocus onClick={onFix}>{vm.rowsProblem === 'fixable' ? copy.fixAndCreate : copy.keepAndCreate}</button>}
            </>
          )}
        </footer>
      </div>
    </div>
  )
}

function RowsDrawer({ u, onClose }: { u: U; onClose: () => void }) {
  const s = active(u.analysis!, u.fixes).s
  return (
    <aside className="drawer" aria-label="Rows that didn't read cleanly">
      <header><h2>Rows that didn't read cleanly ({n(s.bad)})</h2><button className="iconbtn" aria-label="Close" onClick={onClose} autoFocus><X size={16} /></button></header>
      <div className="dbody">
        <p className="muted small">Each of these has a different number of fields than the header ({s.width}).</p>
        {s.badRows.map((r) => <div className="badrow" key={r.n}><span className="muted">Row {n(r.n)}: </span>{r.text.length > 300 ? r.text.slice(0, 300) + '...' : r.text}</div>)}
        {s.bad > s.badRows.length && <p className="muted">and {n(s.bad - s.badRows.length)} more</p>}
      </div>
    </aside>
  )
}

/* ---------- table creation ---------- */
function createTable(u: U, mode: 'today' | 'proposed'): string {
  const an = u.analysis!
  const { s } = active(an, u.fixes)
  const { cols, dropped } = finalColumns(an, u.fixes, mode, u.emulateExcel)
  const types = s.typesAll
  const metricName = u.metricColumn ?? cols.find((c) => /^(stars|rating|score)$/i.test(c.name))?.name
  const mcol = metricName ? cols.find((c) => c.name === metricName || s.header[c.src] === metricName) : undefined
  const metric = mcol && s.numCount[mcol.src] > 0 ? { column: mcol.name, avg: s.numSum[mcol.src] / s.numCount[mcol.src] } : null
  const fileRows = an.rowState === 'fixable' ? an.B.rows : an.A.bad === 0 ? an.A.rows : null
  const renamed = cols.filter((c) => s.header[c.src].trim() !== '' && c.name !== s.header[c.src].trim() && s.header[c.src].includes(',')).map((c) => ({ from: s.header[c.src], to: c.name }))
  const name = (u.tableName || 'new_table').toLowerCase()
  const headerUnconfirmed = mode === 'proposed' && (u.opts.headerRow ?? 1) === 1 && !!active(an, u.fixes).cols.headerSuspect
  const rec: TableRecord = {
    name, catalog: 'workspace', schema: 'default', fileName: u.fileName, mode,
    createdAt: new Date().toISOString(), rows: s.rows, fileRows, badRows: s.bad,
    asIs: s.bad > 0 || dropped.length > 0 || headerUnconfirmed,
    columns: cols.map((c) => ({ name: c.name, type: types[c.src] })),
    sample: s.preview.map((r) => cols.map((c) => r[c.src] ?? '')),
    metric, renamed, droppedCount: dropped.length, headerUnconfirmed,
  }
  setState((st) => ({ tables: { ...st.tables, [name]: rec }, uploadsByTable: { ...st.uploadsByTable, [name]: u } }))
  log('table_created', { as_is: rec.asIs, rows: rec.rows, file_rows: rec.fileRows ?? 'unknown', header_unconfirmed: headerUnconfirmed, mode })
  return name
}
