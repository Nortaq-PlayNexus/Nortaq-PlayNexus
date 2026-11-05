import { useMemo } from 'react'
import { RepoData, TelemetryData, Page } from '../types'
import Constellation3D from './Constellation3D'
import ActivityGraph from './ActivityGraph'
import LiveFeed from './LiveFeed'
import CountUp from './CountUp'
import HeaderBar from './HeaderBar'
import { colorFor, contactLabel, statusOf } from '../theme'

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

  const liveRepos = useMemo(() => repos.filter(r => !r.archived && !r.fork), [repos])

  const totalStars = useMemo(() =>
    repos.reduce((sum, r) => sum + r.stargazers_count, 0),
    [repos]
  )

  const topStarred = useMemo(() =>
    [...liveRepos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 5),
    [liveRepos]
  )

  const watchlist = useMemo(() =>
    [...liveRepos]
      .filter(r => r.days_since_push >= 90)
      .sort((a, b) => b.days_since_push - a.days_since_push)
      .slice(0, 5),
    [liveRepos]
  )

  const issueLoad = useMemo(() =>
    [...liveRepos]
      .filter(r => r.open_issues_count > 0)
      .sort((a, b) => b.open_issues_count - a.open_issues_count)
      .slice(0, 5),
    [liveRepos]
  )

  const recruitTimeline = useMemo(() => {
    // Monthly buckets: the account is young, so years would collapse to one bar.
    const byMonth: Record<string, number> = {}
    repos.forEach(r => {
      if (r.fork) return
      const m = r.created_at.slice(0, 7)
      if (m) byMonth[m] = (byMonth[m] || 0) + 1
    })
    return Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]))
  }, [repos])

  const maxTimeline = Math.max(...recruitTimeline.map(([, n]) => n), 1)

  const freshness = useMemo(() => {
    const fresh = liveRepos.filter(r => r.days_since_push < 7).length
    const warm = liveRepos.filter(r => r.days_since_push >= 7 && r.days_since_push < 30).length
    const cold = liveRepos.filter(r => r.days_since_push >= 30 && r.days_since_push < 90).length
    const dark = liveRepos.filter(r => r.days_since_push >= 90).length
    return [
      { label: 'FRESH <7d', count: fresh, cls: 'online' },
      { label: 'WARM 7-30d', count: warm, cls: 'online' },
      { label: 'COOL 30-90d', count: cold, cls: 'warning' },
      { label: 'DARK >90d', count: dark, cls: 'error' },
    ]
  }, [liveRepos])

  return (
    <div>
      <HeaderBar title="NORTAQ // COMMAND CENTER" status={<><span className="status-dot" /> SIGNAL CONNECTED · {telemetry?.signal_hash ?? '——————'}</>} />

      <div className="grid-4" style={{ marginBottom: '1rem' }}>
        <div className="metric" onClick={() => onNavigate('projects')} style={{ cursor: 'pointer' }}>
          <div className="metric-value"><CountUp value={repos.length} /></div>
          <div className="metric-label">RECORDS</div>
        </div>
        <div className="metric" onClick={() => onNavigate('network')} style={{ cursor: 'pointer' }}>
          <div className="metric-value"><CountUp value={activeRepos.length} /></div>
          <div className="metric-label">ACTIVE ASSETS</div>
        </div>
        <div className="metric" onClick={() => onNavigate('telemetry')} style={{ cursor: 'pointer' }}>
          <div className="metric-value"><CountUp value={totalStars} /></div>
          <div className="metric-label">STARS EARNED</div>
        </div>
        <div className="metric" onClick={() => onNavigate('signal')} style={{ cursor: 'pointer' }}>
          <div className="metric-value"><CountUp value={telemetry?.signal_percent ?? 0} />%</div>
          <div className="metric-label">SIGNAL</div>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: '1rem' }}>
        <div className="metric" onClick={() => onNavigate('telemetry')} style={{ cursor: 'pointer' }}>
          <div className="metric-value" style={{ fontSize: '1.3rem' }}>{telemetry?.contributions != null ? <CountUp value={telemetry.contributions} /> : '—'}</div>
          <div className="metric-label">CONTRIBUTIONS / YR</div>
        </div>
        <div className="metric" onClick={() => onNavigate('telemetry')} style={{ cursor: 'pointer' }}>
          <div className="metric-value" style={{ fontSize: '1.3rem' }}>{telemetry?.total_issues != null ? <CountUp value={telemetry.total_issues} /> : '—'}</div>
          <div className="metric-label">OPEN CASES</div>
        </div>
        <div className="metric" onClick={() => onNavigate('telemetry')} style={{ cursor: 'pointer' }}>
          <div className="metric-value" style={{ fontSize: '1.3rem' }}>{telemetry?.followers != null ? <CountUp value={telemetry.followers} /> : '—'}</div>
          <div className="metric-label">ALLIES</div>
        </div>
        <div className="metric" onClick={() => onNavigate('telemetry')} style={{ cursor: 'pointer' }}>
          <div className="metric-value" style={{ fontSize: '1.3rem' }}>{telemetry ? `${telemetry.avg_days_since_push}d` : '—'}</div>
          <div className="metric-label">AVG TIME SINCE CONTACT</div>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div className="section-heading">ACTIVITY // 52 WEEKS</div>
        <ActivityGraph repos={repos} />
      </div>

      <div className="grid-2" style={{ marginBottom: '1rem' }}>
        <div>
          <div className="section-heading">NETWORK CONSTELLATION // 3D</div>
          <div className="constellation-container" style={{ height: '300px' }}>
            <Constellation3D repos={repos} compact onSelect={() => onNavigate('network')} />
          </div>
        </div>
        <div>
          <div className="section-heading">LATEST TRANSMISSIONS</div>
          <LiveFeed repos={repos} />
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '1rem' }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">WATCHLIST // DORMANT &gt;90d</span>
            <span className={`card-badge ${watchlist.length > 0 ? 'warning' : 'online'}`}>
              {watchlist.length} FLAGGED
            </span>
          </div>
          {watchlist.length === 0 && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>All assets in recent contact.</div>
          )}
          {watchlist.map(r => (
            <div key={r.name} className="health-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: colorFor(r.domain) }} />
                {r.name}
              </span>
              <span style={{ color: 'var(--amber)', fontSize: '0.7rem' }}>{contactLabel(r.days_since_push)}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">TOP DECORATED // BY STARS</span>
          </div>
          {topStarred.map((r, i) => (
            <div key={r.name} className="health-row">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="rank-badge">#{i + 1}</span>
                {r.name}
              </span>
              <span style={{ color: 'var(--green)', fontSize: '0.7rem' }}>{r.stargazers_count.toLocaleString()}★</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '1rem' }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">OPEN CASE LOAD</span>
            <span className="card-badge warning">{issueLoad.length} LOADED</span>
          </div>
          {issueLoad.length === 0 && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>No open cases on record.</div>
          )}
          {issueLoad.map(r => (
            <div key={r.name} className="tech-bar-row">
              <span className="tech-bar-label">{r.name.length > 14 ? r.name.slice(0, 12) + '…' : r.name}</span>
              <div className="tech-bar-track">
                <div className="tech-bar-fill" style={{ width: `${(r.open_issues_count / issueLoad[0].open_issues_count) * 100}%`, background: 'var(--amber)' }} />
              </div>
              <span className="tech-bar-value">{r.open_issues_count.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">RECRUITMENT TIMELINE // BY MONTH</span>
          </div>
          <div className="timeline-row">
            {recruitTimeline.map(([month, n]) => (
              <div key={month} className="timeline-col" title={`${month}: ${n} new records`}>
                <div className="timeline-bar" style={{ height: `${Math.max(6, (n / maxTimeline) * 100)}%` }} />
                <span className="timeline-year">{month.slice(5)}</span>
                <span className="timeline-n">{n}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.1em', marginTop: '0.4rem' }}>
            MONTH · {recruitTimeline[0]?.[0] ?? '—'} → {recruitTimeline[recruitTimeline.length - 1]?.[0] ?? '—'}
          </div>
        </div>
      </div>

      <div className="section-heading">SIGNAL FRESHNESS</div>
      <div className="grid-4" style={{ marginBottom: '1rem' }}>
        {freshness.map(f => (
          <div key={f.label} className="freshness-cell">
            <span className={`health-dot ${f.cls}`} />
            <span className="freshness-n"><CountUp value={f.count} /></span>
            <span className="freshness-label">{f.label}</span>
          </div>
        ))}
      </div>

      <div className="section-heading">DOMAIN DISTRIBUTION</div>
      <div style={{ marginBottom: '1rem' }}>
        {Object.entries(telemetry?.domain_counts ?? {}).sort((a, b) => b[1] - a[1]).map(([domain, count]) => (
          <div key={domain} className="tech-bar-row">
            <span className="tech-bar-label">{domain}</span>
            <div className="tech-bar-track">
              <div
                className="tech-bar-fill"
                style={{
                  width: `${(count / Math.max(...Object.values(telemetry?.domain_counts ?? { x: 1 }))) * 100}%`,
                  background: colorFor(domain),
                }}
              />
            </div>
            <span className="tech-bar-value">{count.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="section-heading">FIELD SHORTLIST // RECENT ACTIVE</div>
      <div className="grid-3">
        {activeRepos.slice(0, 6).map(repo => (
          <div key={repo.name} className="repo-card" onClick={() => onNavigate('projects')}>
            <div className="repo-name">{repo.name}</div>
            <div className="repo-desc">{repo.description || 'No description'}</div>
            <div className="repo-meta">
              {repo.language && <span>{repo.language}</span>}
              <span>{repo.stargazers_count} ★</span>
              <span className="repo-domain" style={{ borderColor: colorFor(repo.domain), color: colorFor(repo.domain) }}>
                {repo.domain}
              </span>
              <span style={{ marginLeft: 'auto', color: 'var(--text-dim)' }}>{statusOf(repo)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
