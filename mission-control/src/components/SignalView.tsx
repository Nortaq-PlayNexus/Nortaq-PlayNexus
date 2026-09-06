import { useMemo } from 'react'
import { TelemetryData, RepoData } from '../types'

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

  return (
    <div>
      <div className="header-bar">
        <span className="header-title">SIGNAL // VERIFICATION</span>
        <span className="header-status">
          <span className="status-dot" />
          LOCKED
        </span>
      </div>

      <div className="signal-panel" style={{ marginBottom: '1.5rem' }}>
        <div className="grid-2" style={{ gap: '2rem' }}>
          <div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.15em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              SIGNAL INTEGRITY
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--green)', lineHeight: 1, marginBottom: '0.3rem' }}>
              {percent}%
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
              background: 'rgba(184, 255, 30, 0.03)',
            }}>
              {hash}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {Array.from({ length: 52 }, (_, i) => {
            const now = Date.now()
            const weekAgo = now - (52 - i) * 7 * 24 * 60 * 60 * 1000
            const weekNow = weekAgo + 7 * 24 * 60 * 60 * 1000
            const count = repos.filter(r => {
              const p = new Date(r.pushed_at).getTime()
              return p >= weekAgo && p < weekNow
            }).length
            const maxH = 20
            const h = Math.max(1, (count / Math.max(...repos.map(() => 1))) * maxH)
            return (
              <div
                key={i}
                style={{
                  width: '3px',
                  height: `${h}px`,
                  background: 'var(--green)',
                  opacity: count > 0 ? 0.4 + (count / 5) * 0.6 : 0.1,
                  alignSelf: 'flex-end',
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
