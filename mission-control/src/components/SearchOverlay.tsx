import { useState, useRef, useEffect, useMemo } from 'react'
import { RepoData } from '../types'
import { colorFor } from '../theme'

interface NavItem { id: string; icon: string; label: string; page: string }
const NAV: NavItem[] = [
  { id: 'mission-control', icon: '◉', label: 'COMMAND CENTER', page: 'mission-control' },
  { id: 'network', icon: '◈', label: 'CONSTELLATION (3D)', page: 'network' },
  { id: 'projects', icon: '▤', label: 'CASE FILES', page: 'projects' },
  { id: 'telemetry', icon: '▣', label: 'TELEMETRY', page: 'telemetry' },
  { id: 'technology', icon: '⌘', label: 'TECH MATRIX', page: 'technology' },
  { id: 'releases', icon: '◫', label: 'DISPATCHES', page: 'releases' },
  { id: 'signal', icon: '◎', label: 'CIPHER', page: 'signal' },
  { id: 'system', icon: '⚙', label: 'SAFEHOUSE', page: 'system' },
]

interface Props {
  repos: RepoData[]
  onSelectRepo: (repo: RepoData) => void
  onNavigate: (page: string) => void
  onClose: () => void
}

type Result =
  | { kind: 'repo'; repo: RepoData }
  | { kind: 'page'; nav: NavItem }

export default function SearchOverlay({ repos, onSelectRepo, onNavigate, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase()
    const live = repos.filter(r => !r.archived && !r.fork)
    const out: Result[] = []

    // pages first when matching
    const pages = q
      ? NAV.filter(n => n.label.toLowerCase().includes(q) || n.id.includes(q))
      : NAV
    pages.forEach(n => out.push({ kind: 'page', nav: n }))

    // repos
    const repoList = q
      ? live.filter(r =>
          r.name.toLowerCase().includes(q) ||
          (r.description || '').toLowerCase().includes(q) ||
          r.domain.toLowerCase().includes(q) ||
          (r.language || '').toLowerCase().includes(q) ||
          r.topics.some(t => t.toLowerCase().includes(q)))
      : live.slice(0, 8)
    repoList.slice(0, 12).forEach(r => out.push({ kind: 'repo', repo: r }))

    return out
  }, [repos, query])

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { setSelectedIdx(0) }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && results[selectedIdx]) {
      const r = results[selectedIdx]
      if (r.kind === 'repo') onSelectRepo(r.repo)
      else onNavigate(r.nav.page)
      onClose()
    }
  }

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-box" onClick={e => e.stopPropagation()}>
        <div className="search-input-wrapper">
          <span className="search-prompt">{'>'}</span>
          <input
            ref={inputRef}
            className="search-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="search dossiers, sectors, commands..."
          />
        </div>
        <div className="search-results">
          {results.length === 0 && (
            <div style={{ padding: '1rem', fontSize: '0.7rem', color: 'var(--text-dim)' }}>NO MATCHING RECORDS</div>
          )}
          {results.map((r, i) => {
            if (r.kind === 'page') {
              return (
                <div
                  key={`p-${r.nav.id}`}
                  className={`search-result ${i === selectedIdx ? 'selected' : ''}`}
                  onClick={() => { onNavigate(r.nav.page); onClose() }}
                >
                  <span className="search-result-index">{r.nav.icon}</span>
                  <span className="search-result-name">{r.nav.label}</span>
                  <span className="search-result-domain">PAGE</span>
                </div>
              )
            }
            const repo = r.repo
            return (
              <div
                key={`r-${repo.name}`}
                className={`search-result ${i === selectedIdx ? 'selected' : ''}`}
                onClick={() => { onSelectRepo(repo); onClose() }}
              >
                <span className="search-result-index">{String(i + 1).padStart(2, '0')}</span>
                <span className="search-result-name" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: colorFor(repo.domain), display: 'inline-block' }} />
                  {repo.name}
                </span>
                <span className="search-result-domain">{repo.domain} · {repo.stargazers_count}★</span>
              </div>
            )
          })}
        </div>
        <div style={{ padding: '0.5rem 0.8rem', borderTop: '1px solid var(--border)', fontSize: '0.55rem', color: 'var(--text-dim)', letterSpacing: '0.1em', display: 'flex', gap: '1rem' }}>
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  )
}
