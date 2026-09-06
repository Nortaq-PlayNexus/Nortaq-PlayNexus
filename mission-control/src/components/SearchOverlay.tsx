import { useState, useRef, useEffect, useMemo } from 'react'
import { RepoData } from '../types'

interface Props {
  repos: RepoData[]
  onSelect: (repo: RepoData) => void
  onClose: () => void
}

export default function SearchOverlay({ repos, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    if (!query.trim()) return repos.filter(r => !r.archived && !r.fork).slice(0, 10)
    const q = query.toLowerCase()
    return repos.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q) ||
      r.domain.toLowerCase().includes(q) ||
      (r.language || '').toLowerCase().includes(q) ||
      r.topics.some(t => t.toLowerCase().includes(q))
    ).slice(0, 10)
  }, [repos, query])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelectedIdx(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      onSelect(results[selectedIdx])
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
            placeholder="search repositories, languages, domains..."
          />
        </div>
        <div className="search-results">
          {results.map((repo, i) => (
            <div
              key={repo.name}
              className={`search-result ${i === selectedIdx ? 'selected' : ''}`}
              onClick={() => { onSelect(repo); onClose() }}
            >
              <span className="search-result-index">{String(i + 1).padStart(2, '0')}</span>
              <span className="search-result-name">{repo.name}</span>
              <span className="search-result-domain">{repo.domain}</span>
            </div>
          ))}
          {results.length === 0 && (
            <div style={{ padding: '1rem', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
              NO RESULTS FOUND
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
