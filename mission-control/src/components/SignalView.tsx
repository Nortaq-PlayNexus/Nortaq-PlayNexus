import { useMemo } from 'react'
import { TelemetryData, RepoData } from '../types'
import CountUp from './CountUp'
import HeaderBar from './HeaderBar'
import { showToast } from '../toast'
import { copyToClipboard } from '../utils/clipboard'

interface Props {
  telemetry: TelemetryData | null
  repos: RepoData[]
}

export default function SignalView({ telemetry, repos }: Props) {
  const hash = telemetry?.signal_hash ?? '—'
  const phase = telemetry?.phase ?? 7
  const frequency = telemetry?.frequency ?? '103.7'
  const percent = telemetry?.signal_percent ?? 0

  const activeRepos = useMemo(() =>
    repos.filter(r => !r.archived && !r.fork && r.days_since_push < 30).length,
    [repos]
  )

  const weatherWeeks = useMemo(() => {
    const now = Date.now()
    const weekMs = 7 * 24 * 60 * 60 * 1000
    const result: number[] = []
    for (let i = 51; i >= 0; i--) {
      const weekStart = now - (i + 1) * weekMs
      const weekEnd = now - i * weekMs
      const count = repos.filter(r => {
        const p = new Date(r.pushed_at).getTime()
        return p >= weekStart && p < weekEnd
      }).length
      result.push(count)
    }
    return result
  }, [repos])

  const weatherMax = Math.max(...weatherWeeks, 1)

  return (
    <div>
      <HeaderBar title="CIPHER // SIGNAL VERIFICATION" status={<><span className="status-dot" /> LOCKED</>} />

      <div className="signal-panel" style={{ marginBottom: '1.5rem' }}>
        <div className="grid-2" style={{ gap: '2rem' }}>
          <div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.15em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              SIGNAL INTEGRITY
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.3rem' }}>
              <svg className="radial-gauge" width={110} height={110} viewBox="0 0 110 110">
                <circle className="track" cx={55} cy={55} r={46} strokeWidth={8} />
                <circle
                  className="fill"
                  cx={55} cy={55} r={46}
                  strokeWidth={8}
                  strokeDasharray={2 * Math.PI * 46}
                  style={{
                    ['--circ' as any]: 2 * Math.PI * 46,
                    ['--off' as any]: 2 * Math.PI * 46 * (1 - percent / 100),
                  }}
                />
                <text x={55} y={55} textAnchor="middle" dominantBaseline="middle" fill="var(--green)" fontFamily="var(--font-display)" fontSize={22} fontWeight={800}>
                  {percent}%
                </text>
              </svg>
            </div>
            <div className="tech-bar-track" style={{ height: '8px', marginBottom: '1rem' }}>
              <div className="tech-bar-fill" style={{ width: `${percent}%` }} />
            </div>
            <div className="health-row"><span>PHASE</span><span style={{ color: 'var(--green)' }}>{phase}</span></div>
            <div className="health-row"><span>FREQUENCY</span><span>{frequency} FM</span></div>
            <div className="health-row"><span>ACTIVE NODES</span><span>{activeRepos}</span></div>
          </div>
          <div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.15em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              HASH
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--green)',
              letterSpacing: '0.15em',
              fontFamily: 'var(--font-mono)',
              marginBottom: '1rem',
              padding: '0.8rem',
              border: '1px solid var(--green-dim)',
              background: 'rgba(245, 185, 66, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.6rem',
            }}>
              <span style={{ wordBreak: 'break-all' }}>{hash}</span>
              <button
                className="back-btn"
                onClick={async () => {
                  const ok = await copyToClipboard(hash)
                  showToast(ok ? 'SIGNAL HASH COPIED' : 'COPY FAILED', 3000, ok ? 'info' : 'error')
                }}
                style={{ flexShrink: 0 }}
              >
                COPY
              </button>
            </div>
            <div className="health-row"><span>SOURCE</span><span>PUBLIC GITHUB DATA</span></div>
            <div className="health-row"><span>SALT</span><span style={{ fontSize: '0.6rem' }}>PHANTOMTAPE::SIGNAL::V1</span></div>
            <div className="health-row"><span>STATUS</span><span style={{ color: 'var(--green)' }}>● VALID</span></div>
          </div>
        </div>
      </div>

      <div className="section-heading">HOW IT WORKS</div>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text)', lineHeight: 1.8 }}>
          <div style={{ color: 'var(--green)', marginBottom: '0.5rem' }}>SIGNAL VERIFICATION IS PUBLICLY REPRODUCIBLE</div>
          <div className="console-line"><span className="action">1. Collect</span> public GitHub data (repos, stars, commits, languages)</div>
          <div className="console-line"><span className="action">2. Normalize</span> into a canonical string</div>
          <div className="console-line"><span className="action">3. Prepend</span> the signal salt: <span style={{ color: 'var(--amber)' }}>PHANTOMTAPE::SIGNAL::V1</span></div>
          <div className="console-line"><span className="action">4. Hash</span> with SHA-256</div>
          <div className="console-line"><span className="action">5. Truncate</span> to 6 hex characters</div>
          <div className="console-line" style={{ marginTop: '0.5rem' }}>
            <span className="action">Result:</span> <span style={{ color: 'var(--green)' }}>{hash}</span>
          </div>
        </div>
      </div>

      <div className="section-heading">SIGNAL WEATHER</div>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '80px' }}>
          {weatherWeeks.map((count, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${Math.max(2, (count / weatherMax) * 100)}%`,
                background: 'var(--green)',
                opacity: count > 0 ? 0.4 + (count / weatherMax) * 0.6 : 0.1,
              }}
              title={`Week ${52 - i}: ${count} pushes`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
