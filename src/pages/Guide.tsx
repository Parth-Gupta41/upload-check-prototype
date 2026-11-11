import { useNavigate } from 'react-router-dom'
import { Download, FileText } from 'lucide-react'
import { SCENARIOS, scenarioText } from '../scenarios'
import { openScenario } from './Upload'
import { copy } from '../copy'
import { setState } from '../state/store'

function download(id: string) {
  const s = SCENARIOS.find((x) => x.id === id)!
  const url = URL.createObjectURL(new Blob([scenarioText(id)], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url; a.download = s.fileName; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function GuidePage() {
  const nav = useNavigate()
  const open = (id: string, mode?: 'today' | 'proposed') => { if (mode) setState({ mode }); openScenario(id); nav('/upload') }
  return (
    <div className="prose">
      <p className="muted small">{copy.banner}</p>
      <h1>Does your table match your file?</h1>
      <p className="lede">A prototype of a check on the file upload screen. It catches tables that don't match the file they came from, before anyone builds on them.</p>

      <h2>Try it in three minutes</h2>
      <ol className="steps">
        <li>Open <strong>Customer reviews</strong> in Today mode and click Create table. Note the row count and the quick check on the table page.</li>
        <li>Click <strong>Open in Proposed mode</strong> on that page. Read the panel above the preview, look at the example row, and click <strong>Keep line breaks inside cells</strong>.</li>
        <li>Create the table again and compare the row count, the quick check and the upload check line.</li>
        <li>Try <strong>Stray quote</strong> to see why the fix is never applied automatically, and <strong>Clean file</strong> to see that nothing gets in the way when the file is fine.</li>
      </ol>
      <p><button className="btn primary" onClick={() => open('reviews', 'today')}>Start with Customer reviews in Today mode</button></p>

      <h2>Demo files</h2>
      <p className="muted">All demo files are generated in your browser. Numbers on screen come from reading the file, not from a script.</p>
      <div className="cards">
        {SCENARIOS.map((s) => (
          <div className="scard" key={s.id}>
            <h3><FileText size={14} style={{ verticalAlign: '-2px' }} /> {s.title}</h3>
            <p>{s.blurb}</p>
            <div className="row">
              <button className="btn small" onClick={() => open(s.id)}>Open in upload</button>
              <button className="btn small link" onClick={() => download(s.id)} aria-label={`Download ${s.fileName}`}><Download size={13} /> CSV</button>
            </div>
          </div>
        ))}
        <div className="scard">
          <h3><FileText size={14} style={{ verticalAlign: '-2px' }} /> Your own file</h3>
          <p>Drop in any CSV. It stays in your browser.</p>
          <div className="row"><button className="btn small" onClick={() => { setState({ upload: null }); nav('/upload') }}>Open upload</button></div>
        </div>
      </div>

      <h2>Try it with the public Yelp sample</h2>
      <p>Download <code>yelp.csv</code> from the public GitHub repository justmarkham/DAT8 (data folder) and drop it in. Today mode gives 29,307 rows and an average rating of 3.30. The fix gives 10,000 rows and 3.78. Those are the same numbers a Databricks trial workspace produced for this file.</p>
    </div>
  )
}
