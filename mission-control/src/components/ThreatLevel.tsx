import { useEffect, useState } from 'react'

interface ThreatLevelProps {
  level: number
  label?: string
  animated?: boolean
}

const DEFAULT_LABELS: Record<number, string> = {
  1: 'CRITICAL',
  2: 'SEVERE',
  3: 'ELEVATED',
  4: 'GUARDED',
  5: 'LOW',
}

function colorForLevel(level: number): string {
  switch (level) {
    case 5:
      return 'var(--green)'
    case 4:
      return 'var(--neon-cyan)'
    case 3:
      return 'var(--amber)'
    case 2:
      return '#ff6b35'
    case 1:
    default:
      return 'var(--red)'
  }
}

export default function ThreatLevel({ level, label, animated = true }: ThreatLevelProps) {
  const clamped = Math.min(5, Math.max(1, Math.round(level)))
  const color = colorForLevel(clamped)
  const filledCount = clamped
  const text = label ?? DEFAULT_LABELS[clamped]
  const critical = clamped <= 2

  // Trigger animated fill on mount / level change
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    if (!animated) {
      setMounted(true)
      return
    }
    setMounted(false)
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [clamped, animated])

  const segments = Array.from({ length: 5 }, (_, i) => i + 1)

  return (
    <div
      className={`threat-level${critical ? ' threat-critical' : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        padding: '0.6rem 0.8rem',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        ['--tl-color' as any]: color,
      }}
    >
      <style>{`
        @keyframes threatSegFill {
          from { transform: scaleX(0); opacity: 0.25; filter: brightness(0.6); }
          to { transform: scaleX(1); opacity: 1; filter: brightness(1); }
        }
        @keyframes threatPulse {
          0%, 100% { box-shadow: 0 0 0 0 transparent; opacity: 1; }
          50% { box-shadow: 0 0 14px 2px var(--tl-color); opacity: 0.75; }
        }
        .threat-level { position: relative; }
        .threat-level.threat-critical { animation: threatPulse 1.1s ease-in-out infinite; }
        .threat-bar { display: flex; gap: 3px; height: 10px; }
        .threat-seg {
          flex: 1;
          background: rgba(255,255,255,0.06);
          border: 1px solid var(--border);
          transform-origin: left center;
          transition: background 0.3s ease, box-shadow 0.3s ease;
        }
        .threat-seg.filled {
          background: var(--tl-color);
          box-shadow: 0 0 8px var(--tl-color);
        }
        .threat-seg.filled.anim {
          animation: threatSegFill 0.5s cubic-bezier(0.2, 0.85, 0.25, 1) both;
        }
        .threat-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.65rem;
          letter-spacing: 0.15em;
        }
        .threat-num {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 1.1rem;
          color: var(--tl-color);
          text-shadow: 0 0 10px var(--tl-color);
        }
        .threat-label {
          color: var(--text-dim);
          text-transform: uppercase;
        }
      `}</style>

      <div className="threat-head">
        <span className="threat-label">THREAT LEVEL</span>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
          <span className="threat-num">{clamped}</span>
          <span style={{ color: 'var(--tl-color)', fontSize: '0.6rem', letterSpacing: '0.12em' }}>{text}</span>
        </span>
      </div>

      <div className="threat-bar" role="meter" aria-valuenow={clamped} aria-valuemin={1} aria-valuemax={5}>
        {segments.map((seg) => {
          const filled = seg <= filledCount
          return (
            <div
              key={seg}
              className={`threat-seg${filled ? ' filled' : ''}${animated && mounted && filled ? ' anim' : ''}`}
              style={
                animated && mounted && filled
                  ? { animationDelay: `${(seg - 1) * 0.1}s` }
                  : undefined
              }
            />
          )
        })}
      </div>
    </div>
  )
}