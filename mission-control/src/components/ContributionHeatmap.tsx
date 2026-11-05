import { useMemo } from 'react'
import { RepoData } from '../types'

interface Props {
  repos: RepoData[]
}

const DAY_MS = 24 * 60 * 60 * 1000

function level(n: number, max: number): number {
  if (n === 0) return 0
  const r = n / Math.max(1, max)
  if (r < 0.25) return 1
  if (r < 0.5) return 2
  if (r < 0.75) return 3
  return 4
}

export default function ContributionHeatmap({ repos }: Props) {
  const { grid, max, total, weeks } = useMemo(() => {
    const now = new Date()
    // align to the Sunday of the current week
    const end = new Date(now)
    end.setHours(0, 0, 0, 0)
    const dayOfWeek = end.getDay() // 0 Sun
    // start 52 weeks ago on a Sunday
    const start = new Date(end.getTime() - (52 * 7 + dayOfWeek) * DAY_MS)
    // count pushes per day
    const counts: Record<string, number> = {}
    repos.forEach(r => {
      if (r.fork) return
      const p = new Date(r.pushed_at)
      p.setHours(0, 0, 0, 0)
      const key = p.getTime()
      counts[key] = (counts[key] || 0) + 1
    })
    // build 53 weeks x 7 days
    const weeksArr: { date: Date; count: number }[][] = []
    let cursor = new Date(start)
    let curWeek: { date: Date; count: number }[] = []
    // pad leading days
    const leading = start.getDay() // 0..6
    for (let i = 0; i < leading; i++) curWeek.push({ date: new Date(start.getTime() - (leading - i) * DAY_MS), count: 0 })
    // Actually simpler: iterate day by day for 53*7 days
    const days: { date: Date; count: number }[] = []
    for (let i = 0; i < 53 * 7; i++) {
      const d = new Date(start.getTime() + i * DAY_MS)
      d.setHours(0, 0, 0, 0)
      days.push({ date: d, count: counts[d.getTime()] || 0 })
    }
    // chunk into weeks (7 per week)
    for (let i = 0; i < days.length; i += 7) {
      weeksArr.push(days.slice(i, i + 7))
    }
    const maxCount = Math.max(...days.map(d => d.count), 1)
    const totalPushes = days.reduce((s, d) => s + d.count, 0)
    return { grid: weeksArr, max: maxCount, total: totalPushes, weeks: weeksArr.length }
  }, [repos])

  const months = useMemo(() => {
    const labels: { label: string; col: number }[] = []
    let lastMonth = -1
    grid.forEach((week, wi) => {
      const m = week[0]?.date.getMonth()
      if (m !== undefined && m !== lastMonth) {
        labels.push({ label: week[0].date.toLocaleString('en-US', { month: 'short' }), col: wi })
        lastMonth = m
      }
    })
    return labels
  }, [grid])

  const colors = ['#161b19', '#1f3a2e', '#2d6a4f', '#40916c', '#52b788']

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.12em' }}>
          {total} PUSHES IN THE LAST YEAR
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.55rem', color: 'var(--text-dim)' }}>
          <span>LESS</span>
          {colors.map((c, i) => (
            <span key={i} style={{ width: '9px', height: '9px', background: c, border: '1px solid rgba(255,255,255,0.06)' }} />
          ))}
          <span>MORE</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '3px', overflowX: 'auto', paddingBottom: '0.3rem' }}>
        {/* month labels row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginRight: '4px' }}>
          {['', 'M', '', 'W', '', 'F', ''].map((d, i) => (
            <span key={i} style={{ height: '9px', fontSize: '0.5rem', color: 'var(--text-dim)', lineHeight: '9px' }}>{d}</span>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '3px', marginBottom: '2px', height: '12px', position: 'relative' }}>
            {months.map((m, i) => (
              <span key={i} style={{ position: 'absolute', left: m.col * 12, fontSize: '0.5rem', color: 'var(--text-dim)' }}>{m.label}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '3px' }}>
            {grid.map((week, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {week.map((day, di) => (
                  <div
                    key={di}
                    title={`${day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}: ${day.count} push${day.count !== 1 ? 'es' : ''}`}
                    style={{
                      width: '9px',
                      height: '9px',
                      background: colors[level(day.count, max)],
                      border: '1px solid rgba(255,255,255,0.04)',
                      transition: 'transform 0.12s ease',
                      cursor: 'default',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.4)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
