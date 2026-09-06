import { useMemo } from 'react'
import { RepoData } from '../types'

interface Props {
  repos: RepoData[]
}

export default function SystemView({ repos }: Props) {
  const totalRepos = repos.length
  const activeRepos = useMemo(() => repos.filter(r => !r.archived && !r.fork && r.days_since_push < 30).length, [repos])
  const now = new Date().toISOString()

  const healthItems = [
    { label: 'GITHUB API', status: 'online' },
    { label: 'DATA COLLECTION', status: 'online' },
    { label: 'STATIC BUILD', status: 'online' },
    { label: 'GITHUB ACTIONS', status: 'online' },
    { label: 'MISSION CONTROL', status: 'online' },
  ]

  const indexItems = [
    { label: 'REPOSITORY INDEX', status: 'online', detail: `${totalRepos} indexed` },
    { label: 'TELEMETRY', status: 'online', detail: 'current' },
    { label: 'PROJECT GRAPH', status: 'online', detail: `${activeRepos} active nodes` },
    { label: 'CONSTELLATION', status: 'online', detail: 'rendered' },
  ]

  return (
    <div>
      <div className="header-bar">
        <span className="header-title">SYSTEM // HEALTH</span>
        <span className="header-status">
          <span className="status-dot" />
          ALL SYSTEMS NOMINAL
        </span>
      </div>

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">SYSTEM STATUS</span>
            <span className="card-badge online">ONLINE</span>
          </div>
          {healthItems.map(item => (
            <div key={item.label} className="health-row">
              <span>{item.label}</span>
              <div className="health-status">
                <span className={`health-dot ${item.status}`} />
                <span style={{ color: item.status === 'online' ? 'var(--green)' : 'var(--red)' }}>
                  {item.status.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">INDEX STATUS</span>
            <span className="card-badge online">CURRENT</span>
          </div>
          {indexItems.map(item => (
            <div key={item.label} className="health-row">
              <span>{item.label}</span>
              <div className="health-status">
                <span className={`health-dot ${item.status}`} />
                <span style={{ color: 'var(--text-dim)', fontSize: '0.65rem' }}>{item.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section-heading">LAST SYNCHRONIZATION</div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text)' }}>
          {new Date(now).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div className="section-heading">COMMAND REFERENCE</div>
      <div className="card">
        <div className="help-row"><span className="help-key">/</span><span className="help-desc">Search</span></div>
        <div className="help-row"><span className="help-key">1-8</span><span className="help-desc">Navigate panels</span></div>
        <div className="help-row"><span className="help-key">?</span><span className="help-desc">Command help</span></div>
        <div className="help-row"><span className="help-key">ESC</span><span className="help-desc">Close panel</span></div>
        <div className="help-row"><span className="help-key">↑↑↓↓←→←→BA</span><span className="help-desc">Konami code</span></div>
      </div>
    </div>
  )
}
