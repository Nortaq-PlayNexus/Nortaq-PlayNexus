import { useMemo } from 'react'
import { RepoData } from '../types'

interface Props {
  repos: RepoData[]
  limit?: number
}

export default function LiveFeed({ repos, limit = 10 }: Props) {
  const items = useMemo(() => {
    return repos
      .filter(r => !r.archived && !r.fork)
      .sort((a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())
      .slice(0, limit)
      .map(r => {
        const now = Date.now()
        const pushed = new Date(r.pushed_at).getTime()
        const diffMs = now - pushed
        const mins = Math.floor(diffMs / 60000)
        const hours = Math.floor(mins / 60)
        const days = Math.floor(hours / 24)
        let timeStr = ''
        if (days > 0) timeStr = `${days}d ago`
        else if (hours > 0) timeStr = `${hours}h ago`
        else if (mins > 0) timeStr = `${mins}m ago`
        else timeStr = 'just now'

        return {
          repo: r.name,
          time: timeStr,
          action: r.days_since_push < 1 ? 'commit detected' : r.days_since_push < 7 ? 'recent activity' : 'last known transmission',
        }
      })
  }, [repos, limit])

  if (items.length === 0) {
    return (
      <div className="live-feed" style={{ padding: '1rem', color: 'var(--text-dim)', fontSize: '0.7rem' }}>
        NETWORK QUIET<br />
        No new transmissions detected.
      </div>
    )
  }

  return (
    <div className="live-feed">
      {items.map((item, i) => (
        <div key={i} className="feed-item">
          <span className="feed-time">{item.time}</span>
          <span className="feed-repo">{item.repo}</span>
          <span className="feed-action">{item.action}</span>
        </div>
      ))}
    </div>
  )
}
