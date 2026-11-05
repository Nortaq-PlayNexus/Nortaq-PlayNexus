import { useState } from 'react'

interface Props {
  data: [string, number][]
  colorFor: (d: string) => string
  size?: number
}

export default function DomainDonut({ data, colorFor, size = 180 }: Props) {
  const total = data.reduce((s, [, n]) => s + n, 0) || 1
  const r = size / 2 - 14
  const circ = 2 * Math.PI * r
  const [hover, setHover] = useState<string | null>(null)

  let acc = 0
  const segs = data.map(([d, n]) => {
    const len = (n / total) * circ
    const off = acc
    acc += len
    return { d, n, len, off }
  })

  const hovered = segs.find(s => s.d === hover)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={14} />
        {segs.map((s, i) => (
          <circle
            key={s.d}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={colorFor(s.d)}
            strokeWidth={hover === s.d ? 18 : 14}
            strokeDasharray={`${s.len} ${circ - s.len}`}
            strokeDashoffset={-s.off}
            style={{
              ['--off' as any]: -s.off,
              ['--len' as any]: s.len,
              transition: 'stroke-width 0.18s ease, opacity 0.18s ease',
              opacity: hover && hover !== s.d ? 0.35 : 1,
              filter: hover === s.d ? 'drop-shadow(0 0 6px ' + colorFor(s.d) + ')' : 'none',
              animation: 'donutDraw 1.1s cubic-bezier(0.2,0.85,0.25,1) both',
              animationDelay: `${i * 0.07}s`,
              cursor: 'pointer',
            }}
            onMouseEnter={() => setHover(s.d)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        <g style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}>
          <text x={size / 2} y={size / 2 - 6} textAnchor="middle" fill="var(--text)" fontFamily="var(--font-display)" fontSize={size > 160 ? 20 : 16} fontWeight={800}>
            {hovered ? hovered.n : total}
          </text>
          <text x={size / 2} y={size / 2 + 12} textAnchor="middle" fill="var(--text-dim)" fontFamily="var(--font-mono)" fontSize={9} letterSpacing={1}>
            {hovered ? hovered.d : 'TOTAL'}
          </text>
        </g>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.62rem' }}>
        {segs.map(s => (
          <div
            key={s.d}
            onMouseEnter={() => setHover(s.d)}
            onMouseLeave={() => setHover(null)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: hover === s.d ? colorFor(s.d) : 'var(--text-dim)', cursor: 'pointer', transition: 'color 0.15s' }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: colorFor(s.d), boxShadow: `0 0 6px ${colorFor(s.d)}` }} />
            <span style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.08em' }}>{s.d}</span>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>{s.n}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
