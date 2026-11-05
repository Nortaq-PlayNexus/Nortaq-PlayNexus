import { useMemo } from 'react'
import { RepoData, TelemetryData } from '../types'

interface Props {
  repos: RepoData[]
  telemetry: TelemetryData | null
}

export default function TelemetryView({ repos, telemetry }: Props) {
  const totalStars = useMemo(() => repos.reduce((s, r) => s + r.stargazers_count, 0), [repos])
  const totalForks = useMemo(() => repos.reduce((s, r) => s + r.forks_count, 0), [repos])
  const totalIssues = useMemo(() => repos.reduce((s, r) => s + r.open_issues_count, 0), [repos])
  const activeRepos = useMemo(() => repos.filter(r => !r.archived && !r.fork && r.days_since_push < 30).length, [repos])
  const staleRepos = useMemo(() => repos.filter(r => !r.archived && !r.fork && r.days_since_push > 90).length, [repos])

  const topLangs = useMemo(() => {
    const map: Record<string, number> = {}
    const stars: Record<string, number> = {}
    repos.filter(r => !r.archived && !r.fork && r.language).forEach(r => {
      map[r.language!] = (map[r.language!] || 0) + 1
      stars[r.language!] = (stars[r.language!] || 0) + r.stargazers_count
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([lang, count]) => [lang, count, stars[lang]] as [string, number, number])
  }, [repos])

  const creationTimeline = useMemo(() => {
    // Monthly buckets: years collapse to one bar on a young account.
    const byMonth: Record<string, number> = {}
    repos.forEach(r => {
      if (r.fork) return
      const m = r.created_at.slice(0, 7)
      if (m) byMonth[m] = (byMonth[m] || 0) + 1
    })
    return Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0]))
  }, [repos])

  const maxYear = Math.max(...creationTimeline.map(([, n]) => n), 1)

  const repoSize = useMemo(() => repos.reduce((s, r) => s + r.size, 0), [repos])

  const domainCounts = useMemo(() => {
    const map: Record<string, number> = {}
    repos.filter(r => !r.archived && !r.fork).forEach(r => {
      map[r.domain] = (map[r.domain] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [repos])

  const activityBars = useMemo(() => {
    const now = Date.now()
    const weeks: number[] = []
    for (let i = 11; i >= 0; i--) {
      const weekStart = now - (i + 1) * 7 * 24 * 60 * 60 * 1000
      const weekEnd = now - i * 7 * 24 * 60 * 60 * 1000
      const count = repos.filter(r => {
        const p = new Date(r.pushed_at).getTime()
        return p >= weekStart && p < weekEnd
      }).length
      weeks.push(count)
    }
    return weeks
  }, [repos])

  const maxWeek = Math.max(...activityBars, 1)

  return (
    <div>
      <div className="header-bar">
        <span className="header-title">TELEMETRY // FIELD DASHBOARD</span>
        <span className="header-status">
          <span className="status-dot" />
          LIVE DATA
        </span>
      </div>

      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="metric">
          <div className="metric-value">{repos.length}</div>
          <div className="metric-label">REPOSITORIES</div>
        </div>
        <div className="metric">
          <div className="metric-value">{totalStars}</div>
          <div className="metric-label">TOTAL STARS</div>
        </div>
        <div className="metric">
          <div className="metric-value">{totalForks}</div>
          <div className="metric-label">TOTAL FORKS</div>
        </div>
        <div className="metric">
          <div className="metric-value">{totalIssues}</div>
          <div className="metric-label">OPEN ISSUES</div>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="metric">
          <div className="metric-value">{activeRepos}</div>
          <div className="metric-label">ACTIVE PROJECTS</div>
        </div>
        <div className="metric">
          <div className="metric-value">{staleRepos}</div>
          <div className="metric-label">STALE (&gt;90d)</div>
        </div>
        <div className="metric">
          <div className="metric-value">{topLangs.length}</div>
          <div className="metric-label">LANGUAGES</div>
        </div>
        <div className="metric">
          <div className="metric-value">{telemetry?.contributions ?? '—'}</div>
          <div className="metric-label">CONTRIBUTIONS</div>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="metric">
          <div className="metric-value" style={{ fontSize: '1.3rem' }}>{telemetry?.followers ?? '—'}</div>
          <div className="metric-label">FOLLOWERS</div>
        </div>
        <div className="metric">
          <div className="metric-value" style={{ fontSize: '1.3rem' }}>{telemetry ? `${telemetry.avg_days_since_push}d` : '—'}</div>
          <div className="metric-label">AVG SINCE CONTACT</div>
        </div>
        <div className="metric">
          <div className="metric-value" style={{ fontSize: '1.3rem' }}>{(repoSize / 1024).toFixed(0)}</div>
          <div className="metric-label">ARCHIVE SIZE (MB)</div>
        </div>
        <div className="metric">
          <div className="metric-value" style={{ fontSize: '1.3rem' }}>{creationTimeline.length}</div>
          <div className="metric-label">RECRUITING MONTHS</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">ACTIVITY // 12 WEEKS</span>
          </div>
          <div className="activity-bar" style={{ height: '60px' }}>
            {activityBars.map((count, i) => (
              <div
                key={i}
                className="bar"
                style={{
                  height: `${Math.max(2, (count / maxWeek) * 100)}%`,
                  opacity: count > 0 ? 0.4 + (count / maxWeek) * 0.6 : 0.1,
                }}
                title={`Week ${12 - i}: ${count}`}
              />
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">DOMAIN DISTRIBUTION</span>
          </div>
          {domainCounts.map(([domain, count]) => (
            <div key={domain} className="tech-bar-row">
              <span className="tech-bar-label">{domain}</span>
              <div className="tech-bar-track">
                <div className="tech-bar-fill" style={{ width: `${(count / domainCounts[0][1]) * 100}%` }} />
              </div>
              <span className="tech-bar-value">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">TOP LANGUAGES // REPOS · STARS</span>
          </div>
          {topLangs.slice(0, 10).map(([lang, count, stars]) => (
            <div key={lang} className="tech-bar-row">
              <span className="tech-bar-label">{lang}</span>
              <div className="tech-bar-track">
                <div className="tech-bar-fill" style={{ width: `${(count / topLangs[0][1]) * 100}%` }} />
              </div>
              <span className="tech-bar-value">{count} repos · {stars}★</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">RECRUITMENT // BY MONTH</span>
          </div>
          <div className="timeline-row" style={{ height: '70px', marginBottom: '0.5rem' }}>
            {creationTimeline.map(([month, n]) => (
              <div key={month} className="timeline-col" title={`${month}: ${n} new records`}>
                <div className="timeline-bar" style={{ height: `${Math.max(6, (n / maxYear) * 100)}%` }} />
                <span className="timeline-year">{month.slice(5)}</span>
                <span className="timeline-n">{n}</span>
              </div>
            ))}
          </div>
          <div className="health-row"><span>FIRST RECORD</span><span>{creationTimeline[0]?.[0] ?? '—'}</span></div>
          <div className="health-row"><span>LATEST RECRUIT</span><span>{creationTimeline[creationTimeline.length - 1]?.[0] ?? '—'}</span></div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: '1rem' }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">SIGNAL INTEGRITY</span>
            <span className="card-badge online">VALID</span>
          </div>
          <div className="health-row"><span>SIGNAL HASH</span><span style={{ color: 'var(--green)' }}>{telemetry?.signal_hash ?? '—'}</span></div>
          <div className="health-row"><span>PHASE</span><span>{telemetry?.phase ?? '—'}</span></div>
          <div className="health-row"><span>FREQUENCY</span><span>{telemetry?.frequency ?? '—'} FM</span></div>
          <div className="health-row"><span>SIGNAL STRENGTH</span><span>{telemetry?.signal_percent ?? 0}%</span></div>
          <div className="health-row"><span>SOURCE</span><span>PUBLIC GITHUB DATA</span></div>
          <div style={{ marginTop: '0.8rem' }}>
            <div className="tech-bar-track" style={{ height: '10px' }}>
              <div className="tech-bar-fill" style={{ width: `${telemetry?.signal_percent ?? 0}%` }} />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">DATA PROVENANCE // HOW THIS WAS BUILT</span>
          </div>
          <div className="health-row"><span>COLLECTOR</span><span style={{ fontSize: '0.65rem' }}>collect-data.py</span></div>
          <div className="health-row"><span>REFRESH</span><span>NIGHTLY (03:17 UTC)</span></div>
          <div className="health-row"><span>SOURCES</span><span>REST + GRAPHQL API</span></div>
          <div className="health-row"><span>CONTRIBUTIONS</span><span>{telemetry?.contributions != null ? 'CALENDAR (VERIFIED)' : 'NO TOKEN — UNAVAILABLE'}</span></div>
          <div className="health-row"><span>FOLLOWERS</span><span>{telemetry?.followers != null ? 'USER ENDPOINT' : 'UNAVAILABLE'}</span></div>
          <div className="health-row"><span>INVENTED DATA</span><span style={{ color: 'var(--green)' }}>NONE</span></div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', marginTop: '0.6rem', lineHeight: 1.7 }}>
            Every number here is recomputed from live public GitHub facts at
            build time. Unavailable values degrade to honest placeholders,
            never to guesses. Verify: <span style={{ color: 'var(--green)' }}>docs/how-to-verify.md</span>
          </div>
        </div>
      </div>
    </div>
  )
}
