import { useMemo } from 'react'
import { RepoData } from '../types'

interface Props {
  repos: RepoData[]
}

export default function ActivityGraph({ repos }: Props) {
  const weeks = useMemo(() => {
    const now = Date.now()
    const weekMs = 7 * 24 * 60 * 60 * 1000
    const result: number[] = []
    for (let i = 51; i >= 0; i--) {
      const weekStart = now - (i + 1) * weekMs
      const weekEnd = now - i * weekMs
      const count = repos.filter(r => {
        const pushed = new Date(r.pushed_at).getTime()
        return pushed >= weekStart && pushed < weekEnd
      }).length
      result.push(count)
    }
    return result
  }, [repos])

  const max = Math.max(...weeks, 1)

  return (
    <div className="card">
      <div className="activity-bar">
        {weeks.map((count, i) => (
          <div
            key={i}
            className="bar"
            style={{
              height: `${Math.max(2, (count / max) * 100)}%`,
              opacity: count > 0 ? 0.4 + (count / max) * 0.6 : 0.1,
            }}
            title={`Week ${52 - i}: ${count} events`}
          />
        ))}
      </div>
    </div>
  )
}
