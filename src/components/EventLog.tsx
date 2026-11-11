import { useState } from 'react'
import { X } from 'lucide-react'
import { copy } from '../copy'
import { setState, useStore } from '../state/store'

const METRIC: Record<string, string> = {
  check_completed: 'Primary: share of upload tables with misread rows',
  fix_applied: 'Secondary: share of flagged uploads fixed',
  fix_rejected_guard: 'Guardrail: a fix never makes things worse',
  table_created: 'Lagging: tables replaced within 24 hours',
  create_anyway: 'Guardrail: trust in warnings',
}

export function EventLog() {
  const events = useStore((s) => s.events)
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'fail'>('idle')
  const copyJson = async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(events, null, 2)); setCopyState('ok') } catch { setCopyState('fail') }
    window.setTimeout(() => setCopyState('idle'), 2000)
  }
  return (
    <aside className="drawer" aria-label="Event log">
      <header>
        <h2>Event log</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn small" onClick={copyJson} aria-live="polite">{copyState === 'ok' ? copy.copied : copyState === 'fail' ? copy.copyFailed : 'Copy as JSON'}</button>
          <button className="btn small" onClick={() => setState({ events: [] })}>Clear</button>
          <button className="iconbtn" aria-label="Close event log" onClick={() => setState({ logOpen: false })}><X size={16} /></button>
        </div>
      </header>
      <div className="dbody">
        <p className="muted small">The events this design would send, so its metrics can be measured. Kept in memory only.</p>
        {events.length === 0 && <p className="muted">Nothing yet. Load a file to start.</p>}
        {events.map((e, i) => (
          <div className="ev" key={i}>
            <div><code>{e.name}</code> <span className="muted small">{new Date(e.t).toLocaleTimeString()}</span></div>
            {Object.keys(e.props).length > 0 && <div className="props">{Object.entries(e.props).map(([k, v]) => `${k}: ${typeof v === 'number' ? v.toLocaleString('en-US') : String(v)}`).join(' · ')}</div>}
            {METRIC[e.name] && <div className="metric">{METRIC[e.name]}</div>}
          </div>
        ))}
      </div>
    </aside>
  )
}
