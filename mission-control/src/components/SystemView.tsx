import { useMemo } from 'react'
import { RepoData, ProfileData } from '../types'
import HeaderBar from './HeaderBar'

interface Props {
  repos: RepoData[]
  profile?: ProfileData | null
}

export default function SystemView({ repos, profile }: Props) {
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
      <HeaderBar title="SAFEHOUSE // SYSTEM HEALTH" status={<><span className="status-dot" /> ALL SYSTEMS NOMINAL</>} />

      {profile && (
        <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {profile.avatar_url && (
            <img src={profile.avatar_url} alt={profile.login} style={{ width: '64px', height: '64px', borderRadius: '50%', border: '2px solid var(--neon-cyan)', boxShadow: '0 0 16px rgba(47,243,224,0.4)' }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="repo-name" style={{ fontSize: '1.1rem' }}>{profile.name || profile.login}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '0.4rem' }}>{profile.bio || 'No bio on file.'}</div>
            <div className="repo-meta" style={{ flexWrap: 'wrap' }}>
              {profile.company && <span>{profile.company}</span>}
              {profile.location && <span>{profile.location}</span>}
              {profile.blog && <a href={profile.blog} target="_blank" rel="noopener" style={{ color: 'var(--neon-cyan)' }}>SITE</a>}
              {profile.twitter && <span>@{profile.twitter}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexShrink: 0 }}>
            <div style={{ textAlign: 'center' }}>
              <div className="metric-value" style={{ fontSize: '1.4rem' }}>{profile.followers.toLocaleString()}</div>
              <div className="metric-label">FOLLOWERS</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="metric-value" style={{ fontSize: '1.4rem' }}>{profile.following.toLocaleString()}</div>
              <div className="metric-label">FOLLOWING</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="metric-value" style={{ fontSize: '1.4rem' }}>{profile.public_repos.toLocaleString()}</div>
              <div className="metric-label">REPOS</div>
            </div>
          </div>
        </div>
      )}

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
