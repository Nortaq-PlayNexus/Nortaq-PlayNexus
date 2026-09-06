import { useMemo } from 'react'
import { RepoData } from '../types'

interface Props {
  repos: RepoData[]
}

export default function ReleasesView({ repos }: Props) {
  const sorted = useMemo(() => {
    return [...repos]
      .filter(r => !r.archived && !r.fork)
      .sort((a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())
  }, [repos])

  return (
    <div>
      <div className="header-bar">
        <span className="header-title">RELEASES // DISCOGRAPHY</span>
        <span className="header-status">{sorted.length} RELEASES</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {sorted.map((repo, i) => {
          const pushed = new Date(repo.pushed_at)
          const dateStr = pushed.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
          const phnt = `PHNT-${String(i + 1).padStart(3, '0')}`
          return (
            <a
              key={repo.name}
              href={repo.html_url}
              target="_blank"
              rel="noopener"
              style={{ textDecoration: 'none' }}
            >
              <div className="release-card">
                <div className="release-version" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
                  {phnt}
                </div>
                <div style={{ width: '1px', height: '30px', background: 'var(--border)' }} />
                <div className="release-info">
                  <div className="release-repo" style={{ color: 'var(--green)' }}>{repo.name}</div>
                  <div className="release-date">{dateStr}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {repo.language && (
                    <span className="release-tag">{repo.language}</span>
                  )}
                  <span className="release-tag">{repo.domain}</span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>{repo.stargazers_count}★</span>
                </div>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
