import { useEffect, useRef, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  PanelLeft, Search, Plus, Folder, Clock, Shapes, Workflow, Cloud, Compass, Store, SquareTerminal, FileCode,
  LayoutDashboard, Bell, History, Server, ListChecks, Network, Layers, Sun, Moon, Activity, ChevronDown,
} from 'lucide-react'
import { copy } from '../copy'
import { setState, useStore } from '../state/store'
import { EventLog } from './EventLog'

function ModeToggle() {
  const mode = useStore((s) => s.mode)
  return (
    <span className="mode-toggle" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span id="mode-label">Experience</span>
      <span className="seg" role="radiogroup" aria-labelledby="mode-label">
        <button role="radio" aria-checked={mode === 'today'} className={mode === 'today' ? 'on' : ''} onClick={() => setState({ mode: 'today' })}>Today</button>
        <button role="radio" aria-checked={mode === 'proposed'} className={mode === 'proposed' ? 'on' : ''} onClick={() => setState({ mode: 'proposed' })}>Proposed</button>
      </span>
    </span>
  )
}

const I = 16
function Nav({ to, icon, label }: { to?: string; icon: ReactNode; label: string }) {
  if (to) return <NavLink to={to} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>{icon}{label}</NavLink>
  return <div className="nav-item" aria-disabled="true">{icon}{label}</div>
}

export function Shell({ children }: { children: ReactNode }) {
  const theme = useStore((s) => s.theme)
  const events = useStore((s) => s.events.length)
  const logOpen = useStore((s) => s.logOpen)
  const lastTable = useStore((s) => Object.keys(s.tables).slice(-1)[0])
  const loc = useLocation()
  const uid = useStore((s) => s.upload?.id)
  useEffect(() => { document.getElementById('main')?.scrollTo(0, 0) }, [loc.pathname, uid])
  // Drawers open below the banner, so the mode switch stays usable while one is open.
  const bannerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = bannerRef.current
    if (!el) return
    const set = () => document.documentElement.style.setProperty('--banner-h', `${el.offsetHeight}px`)
    set()
    const ro = new ResizeObserver(set)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div className="app">
      <div className="banner" role="note" ref={bannerRef}>
        <span><strong>{copy.banner}</strong></span>
        <nav aria-label="Prototype">
          <Link to="/">Guide</Link>
          <ModeToggle />
          <button className="linklike" style={{ background: 'none', border: 0, cursor: 'pointer', display: 'inline-flex', gap: 4, alignItems: 'center' }} onClick={() => setState({ logOpen: !logOpen })}>
            <Activity size={13} /> Event log {events > 0 && <span className="badge">{events}</span>}
          </button>
          <button className="linklike" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} style={{ background: 'none', border: 0, cursor: 'pointer', display: 'inline-flex' }} onClick={() => setState({ theme: theme === 'dark' ? 'light' : 'dark' })}>
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </nav>
      </div>
      <header className="topbar">
        <div className="brand">
          <span className="iconbtn" aria-hidden="true"><PanelLeft size={18} /></span>
          <Layers size={18} aria-hidden="true" />
          <span>{copy.product}</span>
        </div>
        <div className="search" aria-hidden="true"><Search size={15} /> <span className="search-text">Search data, notebooks, recents, and more...</span> <kbd>⌘ + P</kbd></div>
        <div className="top-right">
          <span className="ws">workspace <ChevronDown size={12} style={{ verticalAlign: 'middle' }} /></span>
          <span className="avatar" aria-label="Signed in as Maya">M</span>
        </div>
      </header>
      <div className="body">
        <aside className="sidebar" aria-label="Workspace navigation (decorative)">
          <div className="new-btn" aria-hidden="true"><Plus size={18} /> New</div>
          <Nav icon={<Folder size={I} />} label="Workspace" />
          <Nav icon={<Clock size={I} />} label="Recents" />
          <Nav to={lastTable ? `/table/${lastTable}` : '/catalog'} icon={<Shapes size={I} />} label="Catalog" />
          <Nav icon={<Workflow size={I} />} label="Jobs & Pipelines" />
          <Nav icon={<Cloud size={I} />} label="Compute" />
          <Nav icon={<Compass size={I} />} label="Discover" />
          <Nav icon={<Store size={I} />} label="Marketplace" />
          <div className="nav-sec">SQL</div>
          <Nav icon={<SquareTerminal size={I} />} label="SQL Editor" />
          <Nav icon={<FileCode size={I} />} label="Queries" />
          <Nav icon={<LayoutDashboard size={I} />} label="Dashboards" />
          <Nav icon={<Bell size={I} />} label="Alerts" />
          <Nav icon={<History size={I} />} label="Query History" />
          <Nav icon={<Server size={I} />} label="SQL Warehouses" />
          <div className="nav-sec">Data Engineering</div>
          <Nav icon={<ListChecks size={I} />} label="Runs" />
          <Nav to="/upload" icon={<Network size={I} />} label="Data Ingestion" />
        </aside>
        <main className="main" id="main">{children}</main>
      </div>
      {logOpen && <EventLog />}
    </div>
  )
}
