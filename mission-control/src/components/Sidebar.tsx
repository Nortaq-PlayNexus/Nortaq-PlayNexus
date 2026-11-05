import { Page } from '../types'

const NAV_ITEMS: { id: Page; icon: string; label: string; key: string }[] = [
  { id: 'mission-control', icon: '◉', label: 'COMMAND', key: '1' },
  { id: 'network', icon: '◈', label: 'CONSTELLATION', key: '2' },
  { id: 'projects', icon: '▤', label: 'CASE FILES', key: '3' },
  { id: 'telemetry', icon: '▣', label: 'TELEMETRY', key: '4' },
  { id: 'technology', icon: '⌘', label: 'TECH MATRIX', key: '5' },
  { id: 'releases', icon: '◫', label: 'DISPATCHES', key: '6' },
  { id: 'signal', icon: '◎', label: 'CIPHER', key: '7' },
  { id: 'system', icon: '⚙', label: 'SAFEHOUSE', key: '8' },
]

interface Props {
  page: Page
  onNavigate: (page: Page) => void
}

export default function Sidebar({ page, onNavigate }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-stamp">CLASSIFIED</div>
        <h1>NORTAQ</h1>
        <p>FIELD OPERATIONS</p>
      </div>

      <div className="nav-section">
        <div className="nav-section-label">FIELD OPS</div>
        {NAV_ITEMS.slice(0, 4).map(item => (
          <div
            key={item.id}
            className={`nav-item ${page === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
            <span className="key">{item.key}</span>
          </div>
        ))}
      </div>

      <div className="nav-section">
        <div className="nav-section-label">SUPPORT</div>
        {NAV_ITEMS.slice(4).map(item => (
          <div
            key={item.id}
            className={`nav-item ${page === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
            <span className="key">{item.key}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', padding: '0.8rem 1rem', borderTop: '1px solid var(--border)' }}>
        <div className="sidebar-clearance">
          CLEARANCE: OMEGA
        </div>
        <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.15em' }}>
          FREQ 103.7 FM · ENCRYPTED
        </div>
        <div style={{ fontSize: '0.5rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>
          / search &nbsp; ? briefing
        </div>
      </div>
    </aside>
  )
}
