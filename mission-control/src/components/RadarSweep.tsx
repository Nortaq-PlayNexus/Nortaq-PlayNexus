import { useMemo } from 'react'

interface RadarBlip {
  angle: number
  distance: number
  label?: string
}

interface Props {
  size?: number
  blips?: RadarBlip[]
  color?: string
  speed?: number
}

const DEG = Math.PI / 180

export default function RadarSweep({ size = 120, blips = [], color = 'var(--neon-cyan)', speed = 4 }: Props) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 4

  const rings = useMemo(() => [0.33, 0.66, 1].map((f) => f * r), [r])

  const blipNodes = useMemo(() => {
    return blips.map((b, i) => {
      const d = Math.max(0, Math.min(1, b.distance))
      const ang = b.angle * DEG
      const x = cx + d * r * Math.cos(ang)
      const y = cy + d * r * Math.sin(ang)
      return { ...b, x, y, i }
    })
  }, [blips, cx, cy, r])

  const wedgePoints = useMemo(() => {
    const a1 = 0
    const a2 = -Math.PI / 4
    const x1 = cx + r * Math.cos(a1)
    const y1 = cy + r * Math.sin(a1)
    const x2 = cx + r * Math.cos(a2)
    const y2 = cy + r * Math.sin(a2)
    return `${cx},${cy} ${x1},${y1} ${x2},${y2}`
  }, [cx, cy, r])

  const leadingEnd = useMemo(() => {
    return { x: cx + r, y: cy }
  }, [cx, cy, r])

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
      <style>{`
        @keyframes radarSweepSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes radarBlipPulse {
          0%, 100% { opacity: 0.35; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
        <defs>
          <radialGradient id={`radarGlow-${size}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.08" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* background glow */}
        <circle cx={cx} cy={cy} r={r} fill={`url(#radarGlow-${size})`} />

        {/* concentric rings */}
        {rings.map((rr, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={rr}
            fill="none"
            stroke={color}
            strokeOpacity={0.18}
            strokeWidth={1}
            strokeDasharray={i === rings.length - 1 ? 'none' : '2 4'}
          />
        ))}

        {/* crosshairs */}
        <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke={color} strokeOpacity={0.25} strokeWidth={1} />
        <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke={color} strokeOpacity={0.25} strokeWidth={1} />

        {/* sweep beam */}
        <g
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            transformBox: 'view-box',
            animation: `radarSweepSpin ${speed}s linear infinite`,
          }}
        >
          <polygon points={wedgePoints} fill={color} fillOpacity={0.16} />
          <line
            x1={cx}
            y1={cy}
            x2={leadingEnd.x}
            y2={leadingEnd.y}
            stroke={color}
            strokeWidth={1.5}
            strokeOpacity={0.9}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </g>

        {/* blips */}
        {blipNodes.map((b) => (
          <g key={b.i} transform={`translate(${b.x}, ${b.y})`}>
            <circle
              cx={0}
              cy={0}
              r={3}
              fill={color}
              style={{
                transformOrigin: 'center',
                transformBox: 'fill-box',
                animation: 'radarBlipPulse 1.4s ease-in-out infinite',
                animationDelay: `${(b.i % 5) * 0.15}s`,
                filter: `drop-shadow(0 0 4px ${color})`,
              }}
            />
            {b.label ? (
              <text
                x={4}
                y={-4}
                fill={color}
                fontSize={8}
                fontFamily="var(--font-mono, monospace)"
                style={{ opacity: 0.85 }}
              >
                {b.label}
              </text>
            ) : null}
          </g>
        ))}

        {/* center dot */}
        <circle cx={cx} cy={cy} r={2} fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      </svg>
    </div>
  )
}
