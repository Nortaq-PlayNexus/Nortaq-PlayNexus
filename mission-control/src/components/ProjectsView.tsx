import { useState, useMemo } from 'react'
import { RepoData } from '../types'

const DOMAIN_COLORS: Record<string, string> = {
  AI: '#B8FF1E', AUDIO: '#00e5ff', SYSTEMS: '#ffaa00', EARTH: '#4CAF50',
  GAMING: '#b388ff', DATA: '#ff3b3b', WEB: '#00bcd4', LANG: '#ff9800', OTHER: '#5a6488',
}

const LANG_COLORS: Record<string, string> = {
  Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#3178c6', Rust: '#dea584',
  CSharp: '#178600', HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051',
  Go: '#00ADD8', Lua: '#000080', Dart: '#00B4AB', Kotlin: '#A97BFF',
}

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

  const maxActivity = useMemo(() => Math.max(...repos.map(r => 100 - Math.min(r.days_since_push, 100)), 1), [repos])

  const getLanguagePercent = (repo: RepoData) => {
    if (!repo.language) return []
    const langs: [string, number][] = [[repo.language, 70]]
    if (repo.topics.length > 0) {
      repo.topics.slice(0, 3).forEach(t => langs.push([t, Math.floor(Math.random() * 20) + 5]))
    }
    return langs
  }

  return (
    <div>
      <div className="header-bar">
        <span className="header-title">PROJECTS // BROWSER</span>
        <span className="header-status">{sorted.length} REPOSITORIES</span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>SORT:</span>
        {(['updated', 'name', 'stars', 'activity'] as SortKey[]).map(s => (
          <button key={s} className={`filter-btn ${sort === s ? 'active' : ''}`} onClick={() => setSort(s)}>
            {s.toUpperCase()}
          </button>
        ))}
        <span style={{ margin: '0 0.5rem', color: 'var(--border)' }}>|</span>
        {domains.map(d => (
          <button key={d} className={`filter-btn ${domainFilter === d ? 'active' : ''}`} onClick={() => setDomainFilter(d)}>
            {d}
          </button>
        ))}
      </div>

      {selected && (
        <div className="dna-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="dna-title">{selected.name}</div>
              <div className="dna-subtitle">{selected.domain} // PROJECT DNA</div>
            </div>
            <button className="back-btn" onClick={() => setSelected(null)}>ESC CLOSE</button>
          </div>

          <div className="grid-2" style={{ gap: '1.5rem' }}>
            <div>
              <div className="dna-section">
                <div className="dna-section-title">LANGUAGES</div>
                {getLanguagePercent(selected).map(([lang, pct]) => (
                  <div key={lang} className="tech-bar-row">
                    <span className="tech-bar-label">{lang}</span>
                    <div className="tech-bar-track">
                      <div className="tech-bar-fill" style={{ width: `${pct}%`, background: LANG_COLORS[lang] || 'var(--green)' }} />
                    </div>
                    <span className="tech-bar-value">{pct}%</span>
                  </div>
                ))}
              </div>

              <div className="dna-section">
                <div className="dna-section-title">TOPICS</div>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {(selected.topics.length > 0 ? selected.topics : [selected.domain.toLowerCase()]).map(t => (
                    <span key={t} style={{ fontSize: '0.55rem', padding: '0.15rem 0.4rem', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>{t}</span>
                  ))}
                </div>
              </div>

              <div className="dna-section">
                <div className="dna-section-title">DESCRIPTION</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text)' }}>{selected.description || 'No description available'}</div>
              </div>
            </div>

            <div>
              <div className="dna-section">
                <div className="dna-section-title">STATS</div>
                <div className="health-row"><span>Stars</span><span style={{ color: 'var(--green)' }}>{selected.stargazers_count}</span></div>
                <div className="health-row"><span>Forks</span><span>{selected.forks_count}</span></div>
                <div className="health-row"><span>Open Issues</span><span>{selected.open_issues_count}</span></div>
                <div className="health-row"><span>Size</span><span>{(selected.size / 1024).toFixed(1)} MB</span></div>
                <div className="health-row"><span>Created</span><span>{new Date(selected.created_at).toLocaleDateString()}</span></div>
                <div className="health-row"><span>Last Push</span><span>{new Date(selected.pushed_at).toLocaleDateString()}</span></div>
              </div>

              <div className="dna-section">
                <div className="dna-section-title">ACTIVITY</div>
                <div className="tech-bar-track" style={{ height: '12px' }}>
                  <div className="tech-bar-fill" style={{ width: `${Math.max(2, 100 - selected.days_since_push)}%` }} />
                </div>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
                  {selected.days_since_push === 0 ? 'ACTIVE TODAY' :
                   selected.days_since_push < 7 ? `${selected.days_since_push} DAYS AGO` :
                   selected.days_since_push < 30 ? `${Math.floor(selected.days_since_push / 7)} WEEKS AGO` :
                   `${Math.floor(selected.days_since_push / 30)} MONTHS AGO`}
                </div>
              </div>

              <div className="dna-section">
                <a
                  href={selected.html_url}
                  target="_blank"
                  rel="noopener"
                  style={{
                    display: 'inline-block',
                    padding: '0.4rem 1rem',
                    border: '1px solid var(--green)',
                    color: 'var(--green)',
                    textDecoration: 'none',
                    fontSize: '0.65rem',
                    letterSpacing: '0.1em',
                  }}
                >
                  VIEW ON GITHUB →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="repo-grid">
        {sorted.map(repo => (
          <div
            key={repo.name}
            className={`repo-card ${selected?.name === repo.name ? 'active' : ''}`}
            onClick={() => setSelected(selected?.name === repo.name ? null : repo)}
          >
            <div className="repo-name">{repo.name}</div>
            <div className="repo-desc">{repo.description || 'No description'}</div>
            <div className="repo-meta">
              {repo.language && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span className="repo-lang-dot" style={{ background: LANG_COLORS[repo.language] || '#5a6488' }} />
                  {repo.language}
                </span>
              )}
              <span>{repo.stargazers_count} ★</span>
              <span>{repo.forks_count} ⑂</span>
              <span className="repo-domain">{repo.domain}</span>
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <div className="tech-bar-track" style={{ height: '3px' }}>
                <div className="tech-bar-fill" style={{ width: `${Math.max(2, 100 - repo.days_since_push)}%`, opacity: 0.5 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
