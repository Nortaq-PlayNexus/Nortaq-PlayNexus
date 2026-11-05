import { useMemo, useState } from 'react'
import { RepoData } from '../types'
import Constellation3D from './Constellation3D'
import Dossier from './Dossier'
import HeaderBar from './HeaderBar'
import { colorFor, statusOf } from '../theme'

interface Props {
  repos: RepoData[]
}

export default function NetworkView({ repos }: Props) {
  const [filter, setFilter] = useState('ALL')
  const [selected, setSelected] = useState<RepoData | null>(null)

  const active = useMemo(() => repos.filter(r => !r.archived && !r.fork), [repos])

  const domains = useMemo(() => {
    const counts: Record<string, { total: number; live: number }> = {}
    active.forEach(r => {
      if (!counts[r.domain]) counts[r.domain] = { total: 0, live: 0 }
      counts[r.domain].total++
      if (r.days_since_push < 30) counts[r.domain].live++
    })
    return Object.entries(counts).sort((a, b) => b[1].total - a[1].total)
  }, [active])

  const fieldStats = useMemo(() => {
    const live = active.filter(r => r.days_since_push < 30).length
    const dormant = active.filter(r => r.days_since_push >= 90).length
    const linked = active.filter(r => r.language).length
    const topHub = [...active].sort((a, b) => b.stargazers_count - a.stargazers_count)[0]
    const hottest = [...active].sort((a, b) => a.days_since_push - b.days_since_push)[0]
    return { live, dormant, linked, topHub, hottest }
  }, [active])

  const filteredCount = filter === 'ALL' ? active.length : active.filter(r => r.domain === filter).length
  const filteredLive = filter === 'ALL'
    ? fieldStats.live
    : active.filter(r => r.domain === filter && r.days_since_push < 30).length

  return (
    <div>
      <HeaderBar title="NETWORK // CONSTELLATION" status={<><span className="status-dot" /> {filteredCount} SIGNALS · {filteredLive} LIVE</>} />

      <div className="constellation-filters" style={{ position: 'relative', top: 0, right: 0, marginBottom: '0.8rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button className={`filter-btn ${filter === 'ALL' ? 'active' : ''}`} onClick={() => setFilter('ALL')}>
          ALL
        </button>
        {domains.map(([d]) => (
          <button
            key={d}
            className={`filter-btn ${filter === d ? 'active' : ''}`}
            onClick={() => setFilter(d)}
            style={filter === d ? { borderColor: colorFor(d), color: colorFor(d), background: `${colorFor(d)}11` } : undefined}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="constellation-container" style={{ height: '520px', position: 'relative' }}>
        <Constellation3D repos={repos} filter={filter} onSelect={setSelected} />
      </div>

      <div className="grid-2" style={{ marginTop: '1rem' }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">FIELD STATS</span>
          </div>
          <div className="health-row"><span>LIVE NODES (&lt;30d)</span><span style={{ color: 'var(--green)' }}>{fieldStats.live}</span></div>
          <div className="health-row"><span>DORMANT (&gt;90d)</span><span style={{ color: 'var(--amber)' }}>{fieldStats.dormant}</span></div>
          <div className="health-row"><span>CHANNEL-LINKED (LANGUAGE)</span><span>{fieldStats.linked} / {active.length}</span></div>
          <div className="health-row"><span>HIGHEST DECORATION</span><span>{fieldStats.topHub ? `${fieldStats.topHub.name} · ${fieldStats.topHub.stargazers_count}★` : '—'}</span></div>
          <div className="health-row"><span>MOST RECENT CONTACT</span><span>{fieldStats.hottest ? `${fieldStats.hottest.name} · ${statusOf(fieldStats.hottest)}` : '—'}</span></div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">SECTOR BREAKDOWN</span>
          </div>
          {domains.map(([domain, info]) => (
            <div key={domain} className="tech-bar-row">
              <span className="tech-bar-label">{domain}</span>
              <div className="tech-bar-track">
                <div
                  className="tech-bar-fill"
                  style={{ width: `${(info.total / domains[0][1].total) * 100}%`, background: colorFor(domain) }}
                />
              </div>
              <span className="tech-bar-value">{info.live}/{info.total}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {domains.map(([domain]) => (
          <div key={domain} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.6rem', color: 'var(--text-dim)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colorFor(domain), display: 'inline-block' }} />
            {domain}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.6rem', color: 'var(--text-dim)' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', border: '1px solid var(--text-dim)', display: 'inline-block' }} />
          SIZE = STARS · BRIGHT = PUSHED &lt;30d
        </div>
      </div>

      {selected && <Dossier repo={selected} onClose={() => setSelected(null)} siblings={active.filter(r => filter === 'ALL' || r.domain === filter)} onNavigate={setSelected} />}
    </div>
  )
}
