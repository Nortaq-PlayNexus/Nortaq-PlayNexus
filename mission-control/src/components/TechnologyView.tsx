import { useMemo } from 'react'
import { RepoData } from '../types'

interface Props {
  repos: RepoData[]
}

export default function TechnologyView({ repos }: Props) {
  const activeRepos = useMemo(() => repos.filter(r => !r.archived && !r.fork), [repos])

  const languages = useMemo(() => {
    const map: Record<string, number> = {}
    activeRepos.forEach(r => {
      if (r.language) map[r.language] = (map[r.language] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [activeRepos])

  const frameworks = useMemo(() => {
    const map: Record<string, number> = {}
    const keywords = ['react', 'electron', 'tauri', 'node', 'three.js', 'nextjs', 'flask', 'fastapi', 'django', 'express', 'vue', 'svelte', 'rust', 'wasm']
    activeRepos.forEach(r => {
      const text = [r.name, r.description || '', ...r.topics].join(' ').toLowerCase()
      keywords.forEach(kw => {
        if (text.includes(kw)) {
          const label = kw.toUpperCase()
          map[label] = (map[label] || 0) + 1
        }
      })
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, [activeRepos])

  const domains = useMemo(() => {
    const map: Record<string, number> = {}
    activeRepos.forEach(r => {
      map[r.domain] = (map[r.domain] || 0) + 1
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [activeRepos])

  const maxLang = languages[0]?.[1] || 1
  const maxFw = frameworks[0]?.[1] || 1
  const maxDom = domains[0]?.[1] || 1

  return (
    <div>
      <div className="header-bar">
        <span className="header-title">TECHNOLOGY // MATRIX</span>
        <span className="header-status">{languages.length} LANGUAGES</span>
      </div>

      <div className="grid-3">
        <div className="card">
          <div className="card-header">
            <span className="card-title">LANGUAGES</span>
          </div>
          {languages.map(([lang, count]) => (
            <div key={lang} className="tech-bar-row">
              <span className="tech-bar-label">{lang}</span>
              <div className="tech-bar-track">
                <div className="tech-bar-fill" style={{ width: `${(count / maxLang) * 100}%` }} />
              </div>
              <span className="tech-bar-value">{count}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">FRAMEWORKS</span>
          </div>
          {frameworks.length === 0 && (
            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', padding: '0.5rem 0' }}>No detected frameworks</div>
          )}
          {frameworks.map(([fw, count]) => (
            <div key={fw} className="tech-bar-row">
              <span className="tech-bar-label">{fw}</span>
              <div className="tech-bar-track">
                <div className="tech-bar-fill" style={{ width: `${(count / maxFw) * 100}%`, background: 'var(--cyan)' }} />
              </div>
              <span className="tech-bar-value">{count}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">DOMAINS</span>
          </div>
          {domains.map(([domain, count]) => (
            <div key={domain} className="tech-bar-row">
              <span className="tech-bar-label">{domain}</span>
              <div className="tech-bar-track">
                <div className="tech-bar-fill" style={{ width: `${(count / maxDom) * 100}%`, background: 'var(--amber)' }} />
              </div>
              <span className="tech-bar-value">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <div className="section-heading">TECHNOLOGY SPREAD</div>
        <div className="card">
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {languages.map(([lang, count]) => {
              const size = Math.max(0.55, 0.55 + (count / maxLang) * 0.6)
              return (
                <span
                  key={lang}
                  style={{
                    fontSize: `${size}rem`,
                    padding: '0.3rem 0.6rem',
                    border: '1px solid var(--border)',
                    color: count >= 3 ? 'var(--green)' : 'var(--text-dim)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {lang} <span style={{ opacity: 0.5 }}>{count}</span>
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
