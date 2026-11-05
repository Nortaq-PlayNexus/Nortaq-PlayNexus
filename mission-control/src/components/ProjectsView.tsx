import { useState, useMemo } from 'react'
import { RepoData } from '../types'
import Dossier from './Dossier'
import HeaderBar from './HeaderBar'
import { LANG_COLORS, colorFor, contactLabel, statusOf } from '../theme'

type SortKey = 'name' | 'updated' | 'stars' | 'activity'

interface Props {
  repos: RepoData[]
}

export default function ProjectsView({ repos }: Props) {
  const [selected, setSelected] = useState<RepoData | null>(null)
  const [sort, setSort] = useState<SortKey>('updated')
  const [domainFilter, setDomainFilter] = useState<string>('ALL')

  const domains = useMemo(() => {
    const set = new Set(repos.map(r => r.domain))
    return ['ALL', ...Array.from(set).sort()]
  }, [repos])

  const sorted = useMemo(() => {
    const filtered = domainFilter === 'ALL' ? repos : repos.filter(r => r.domain === domainFilter)
    return [...filtered].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'stars') return b.stargazers_count - a.stargazers_count
      if (sort === 'activity') return a.days_since_push - b.days_since_push
      return new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime()
    })
  }, [repos, sort, domainFilter])

  return (
    <div>
      <HeaderBar title="CASE FILES // ARCHIVE" status={<>{sorted.length} FILES</>} />

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>SORT:</span>
        {(['updated', 'name', 'stars', 'activity'] as SortKey[]).map(s => (
          <button key={s} className={`filter-btn ${sort === s ? 'active' : ''}`} onClick={() => setSort(s)}>
            {s.toUpperCase()}
          </button>
        ))}
        <span style={{ margin: '0 0.5rem', color: 'var(--border)' }}>|</span>
        {domains.map(d => (
          <button
            key={d}
            className={`filter-btn ${domainFilter === d ? 'active' : ''}`}
            onClick={() => setDomainFilter(d)}
            style={d !== 'ALL' && domainFilter === d ? { borderColor: colorFor(d), color: colorFor(d), background: `${colorFor(d)}11` } : undefined}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="repo-grid">
        {sorted.map((repo, i) => {
          const status = statusOf(repo)
          return (
            <div
              key={repo.name}
              className={`repo-card ${selected?.name === repo.name ? 'active' : ''}`}
              onClick={() => setSelected(repo)}
            >
              <div className="repo-card-top">
                <span className="case-id">FILE {String(i + 1).padStart(3, '0')}</span>
                <span className={`status-chip st-${status.toLowerCase()}`}>{status}</span>
              </div>
              <div className="repo-name">{repo.name}</div>
              <div className="repo-desc">{repo.description || 'No description'}</div>
              <div className="repo-meta">
                {repo.language && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span className="repo-lang-dot" style={{ background: LANG_COLORS[repo.language] || '#8a8577' }} />
                    {repo.language}
                  </span>
                )}
                <span>{repo.stargazers_count} ★</span>
                <span>{repo.forks_count} ⑂</span>
                <span className="repo-domain" style={{ borderColor: colorFor(repo.domain), color: colorFor(repo.domain) }}>
                  {repo.domain}
                </span>
              </div>
              <div className="repo-card-foot">
                <div className="tech-bar-track" style={{ height: '3px' }}>
                  <div className="tech-bar-fill" style={{ width: `${Math.max(2, repo.activity_score)}%`, opacity: 0.6 }} />
                </div>
                <span className="last-contact">{contactLabel(repo.days_since_push)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {selected && <Dossier repo={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
