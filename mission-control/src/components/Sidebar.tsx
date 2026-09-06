import { Page } from '../types'

const NAV_ITEMS: { id: Page; icon: string; label: string; key: string }[] = [
  { id: 'mission-control', icon: '◉', label: 'MISSION CONTROL', key: '1' },
  { id: 'network', icon: '◈', label: 'NETWORK', key: '2' },
  { id: 'projects', icon: '◇', label: 'PROJECTS', key: '3' },
  { id: 'telemetry', icon: '▣', label: 'TELEMETRY', key: '4' },
  { id: 'technology', icon: '▤', label: 'TECHNOLOGY', key: '5' },
  { id: 'releases', icon: '◫', label: 'RELEASES', key: '6' },
  { id: 'signal', icon: '◎', label: 'SIGNAL', key: '7' },
  { id: 'system', icon: '⚙', label: 'SYSTEM', key: '8' },
]

interface Props {
  page: Page
  onNavigate: (page: Page) => void
}

export default function Sidebar({ page, onNavigate }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>NORTAQ</h1>
        <p>MISSION CONTROL</p>
      </div>

      <div className="nav-section">
        <div className="nav-section-label">OPERATIONS</div>
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
        <div className="nav-section-label">SYSTEMS</div>
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
        <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.15em' }}>
          SIGNAL 103.7 FM
        </div>
        <div style={{ fontSize: '0.5rem', color: 'var(--green-dim)', marginTop: '0.2rem' }}>
          PHANTOMTAPE OS v7.4
        </div>
        <div style={{ fontSize: '0.5rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>
          / search &nbsp; ? help
        </div>
      </div>
    </aside>
  )
}
