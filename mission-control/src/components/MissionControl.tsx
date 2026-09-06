import { useMemo } from 'react'
import { RepoData, TelemetryData, Page } from '../types'
import ConstellationMini from './ConstellationMini'
import ActivityGraph from './ActivityGraph'
import LiveFeed from './LiveFeed'

interface Props {
  repos: RepoData[]
  telemetry: TelemetryData | null
  onNavigate: (page: Page) => void
}

export default function MissionControl({ repos, telemetry, onNavigate }: Props) {
  const activeRepos = useMemo(() =>
    repos.filter(r => !r.archived && !r.fork && r.days_since_push < 30),
    [repos]
  )

  const totalStars = useMemo(() =>
    repos.reduce((sum, r) => sum + r.stargazers_count, 0),
    [repos]
  )

  return (
    <div>
      <div className="header-bar">
        <span className="header-title">NORTAQ // MISSION CONTROL</span>
        <span className="header-status">
          <span className="status-dot" />
          SIGNAL CONNECTED
        </span>
      </div>

      <div className="grid-4" style={{ marginBottom: '1rem' }}>
        <div className="metric" onClick={() => onNavigate('projects')} style={{ cursor: 'pointer' }}>
          <div className="metric-value">{repos.length}</div>
          <div className="metric-label">REPOSITORIES</div>
        </div>
        <div className="metric">
          <div className="metric-value">{activeRepos.length}</div>
          <div className="metric-label">ACTIVE</div>
        </div>
        <div className="metric">
          <div className="metric-value">{totalStars}</div>
          <div className="metric-label">STARS</div>
        </div>
        <div className="metric">
          <div className="metric-value">{telemetry?.signal_percent ?? 0}%</div>
          <div className="metric-label">SIGNAL</div>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div className="section-heading">ACTIVITY // 52 WEEKS</div>
        <ActivityGraph repos={repos} />
      </div>

      <div className="grid-2" style={{ marginBottom: '1rem' }}>
        <div>
          <div className="section-heading">NETWORK CONSTELLATION</div>
          <div className="constellation-container" style={{ height: '280px' }}>
            <ConstellationMini repos={repos} />
          </div>
        </div>
        <div>
          <div className="section-heading">LATEST TRANSMISSIONS</div>
          <LiveFeed repos={repos} />
        </div>
      </div>

      <div className="section-heading">DOMAIN DISTRIBUTION</div>
      <div style={{ marginBottom: '1rem' }}>
        {Object.entries(telemetry?.domain_counts ?? {}).sort((a, b) => b[1] - a[1]).map(([domain, count]) => (
          <div key={domain} className="tech-bar-row">
            <span className="tech-bar-label">{domain}</span>
            <div className="tech-bar-track">
              <div
                className="tech-bar-fill"
                style={{ width: `${(count / Math.max(...Object.values(telemetry?.domain_counts ?? { x: 1 }))) * 100}%` }}
              />
            </div>
            <span className="tech-bar-value">{count}</span>
          </div>
        ))}
      </div>

      <div className="section-heading">QUICK ACCESS</div>
      <div className="grid-3">
        {activeRepos.slice(0, 6).map(repo => (
          <div key={repo.name} className="repo-card" onClick={() => onNavigate('projects')}>
            <div className="repo-name">{repo.name}</div>
            <div className="repo-desc">{repo.description || 'No description'}</div>
            <div className="repo-meta">
              {repo.language && <span>{repo.language}</span>}
              <span>{repo.stargazers_count} ★</span>
              <span className="repo-domain">{repo.domain}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
