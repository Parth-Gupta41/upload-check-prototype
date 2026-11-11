import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Table2, CircleCheck, TriangleAlert, Info } from 'lucide-react'
import { copy } from '../copy'
import { setState, useStore } from '../state/store'

const n = (x: number) => x.toLocaleString('en-US')
const TOPIC: Record<string, string> = {
  customer_reviews: 'customer reviews, including ratings and review text',
  store_sales: 'store orders with products, quantities and prices',
  survey_export: 'survey responses about viewing habits',
  population_report: 'population estimates by area and year',
  clean_orders: 'customer orders with products and amounts',
  stray_quote: 'people records with a city and a score',
  yelp: 'business reviews, including ratings and review text',
}

export function TablePage() {
  const { name = '' } = useParams()
  const t = useStore((s) => s.tables[name])
  const upload = useStore((s) => s.uploadsByTable[name])
  const nav = useNavigate()
  const [tab, setTab] = useState<'overview' | 'sample'>('overview')
  if (!t) return <div className="page"><p>No table named {name}. <Link to="/upload">Upload a file</Link>.</p></div>
  const date = new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const topic = TOPIC[t.fileName.replace(/\.[^.]+$/, '').toLowerCase()] ?? `data from ${t.fileName}`
  const reopen = () => { if (upload) { setState({ upload, mode: t.mode }); nav('/upload') } }
  const receipt = (
    <div className="card" aria-label="Upload check">
      <h3>Upload check</h3>
      {t.asIs ? (
        <div className="okline warnish"><TriangleAlert size={16} className="ico" />
          <div>
            {t.badRows > 0 ? (t.fileRows ? copy.receiptAsIs(t.fileName, t.rows, t.fileRows, t.badRows) : copy.receiptAsIsNoCount(t.fileName, t.rows, t.badRows)) : `Created as is from ${t.fileName}: ${n(t.rows)} rows.`}
            {t.droppedCount > 0 && <> {copy.receiptDropped(t.droppedCount)}</>}
            {upload && <> <button className="linkbtn" onClick={reopen}>{copy.seeCheck}</button></>}
          </div>
        </div>
      ) : (
        <div className="okline"><CircleCheck size={16} className="ico" />
          <div>{copy.receiptOk(t.fileName, date, t.rows, t.columns.length)}{t.renamed.map((r) => <div key={r.from} className="muted">{copy.receiptRenamed(r.from, r.to)}</div>)}</div>
        </div>
      )}
    </div>
  )
  return (
    <div className="page">
      <div className="crumb"><span>Catalog Explorer</span> › <span>{t.catalog}</span> › <span>{t.schema}</span> ›</div>
      <h1 className="title" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Table2 size={20} /> {t.name}
        <span className="pill">Created in {t.mode === 'today' ? 'Today' : 'Proposed'} mode</span>
      </h1>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'overview'} className={tab === 'overview' ? 'on' : ''} onClick={() => setTab('overview')}>Overview</button>
        <button role="tab" aria-selected={tab === 'sample'} className={tab === 'sample' ? 'on' : ''} onClick={() => setTab('sample')}>Sample Data</button>
      </div>
      {tab === 'overview' ? (
        <div className="tlayout">
          <div>
            {t.mode === 'proposed' && receipt}
            <div className="card">
              <h3>Description</h3>
              <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 6 }}><span className="muted">Suggested description</span><span className="sim" title={copy.simNote}>(simulated)</span></div>
              <p style={{ margin: 0 }}>{copy.todayDescription(topic)}</p>
              <p className="muted small" style={{ marginTop: 8 }}><Info size={12} style={{ verticalAlign: 'middle' }} /> {copy.simNote}</p>
            </div>
            {t.metric && (
              <div className="card">
                <h3 style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{copy.quickCheck} <span className="demo-tag">{copy.quickCheckNote}</span></h3>
                <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 12 }} className="muted">SELECT AVG({t.metric.column}) FROM {t.catalog}.{t.schema}.{t.name}</div>
                <div style={{ fontSize: 22, fontWeight: 600, marginTop: 6 }}>{t.metric.avg.toFixed(2)}</div>
              </div>
            )}
            <div className="card">
              <h3>Columns</h3>
              <table className="coltable"><thead><tr><th>Column</th><th>Type</th></tr></thead>
                <tbody>{t.columns.map((c) => <tr key={c.name}><td>{c.name}</td><td className="muted">{c.type}</td></tr>)}</tbody></table>
            </div>
          </div>
          <div>
            <div className="card">
              <h3>About this table</h3>
              <div className="kv">
                <div>Rows</div><div>{n(t.rows)}</div>
                <div>Columns</div><div>{n(t.columns.length)}</div>
                <div>Source file</div><div>{t.fileName}</div>
                <div>Created</div><div>{date}</div>
                <div>Owner</div><div>Maya</div>
              </div>
            </div>
            <div className="card">
              <h3>Try the other mode</h3>
              <p style={{ margin: 0 }} className="muted">Load the same file again with the {t.mode === 'today' ? 'Proposed' : 'Today'} experience to compare.</p>
              {upload && <button className="btn" style={{ marginTop: 10 }} onClick={() => { setState({ upload: { ...upload, fixes: { multiline: false, keepBlank: false, keepDuplicates: false, renameCommas: false, renames: {} }, notice: null }, mode: t.mode === 'today' ? 'proposed' : 'today' }); nav('/upload') }}>Open in {t.mode === 'today' ? 'Proposed' : 'Today'} mode</button>}
            </div>
          </div>
        </div>
      ) : (
        <div className="gridwrap">
          <table className="grid">
            <thead><tr>{t.columns.map((c) => <th key={c.name}><div className="th"><span className="tname">{c.name}</span></div></th>)}</tr></thead>
            <tbody>{t.sample.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v === '' ? <span className="null">null</span> : v.replace(/\n/g, ' ')}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function CatalogPage() {
  const tables = useStore((s) => Object.values(s.tables))
  return (
    <div className="page">
      <div className="crumb"><span>Catalog Explorer</span> › workspace › default ›</div>
      <h1 className="title">Tables</h1>
      {tables.length === 0 ? <p className="muted">No tables yet. <Link to="/upload">Create one from a file</Link>.</p> : (
        <table className="coltable"><thead><tr><th>Name</th><th>Rows</th><th>Created in</th><th>Source file</th></tr></thead>
          <tbody>{tables.map((t) => <tr key={t.name}><td><Link to={`/table/${t.name}`}>{t.name}</Link></td><td>{n(t.rows)}</td><td>{t.mode === 'today' ? 'Today' : 'Proposed'} mode</td><td>{t.fileName}</td></tr>)}</tbody></table>
      )}
    </div>
  )
}
