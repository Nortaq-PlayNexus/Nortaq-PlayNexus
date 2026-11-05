import { useId, useMemo } from 'react'

interface Props {
  data: number[]
  color?: string
  width?: number
  height?: number
  animated?: boolean
}

export default function Sparkline({
  data,
  color = 'var(--neon-cyan)',
  width = 80,
  height = 24,
  animated = true,
}: Props) {
  const gradId = `spark-${useId().replace(/:/g, '')}`

  const points = useMemo(() => {
    const n = data.length
    if (n === 0) {
      return [
        { x: 0, y: height / 2 },
        { x: width, y: height / 2 },
      ]
    }
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const pad = 1
    const innerH = Math.max(1, height - pad * 2)
    if (n === 1) {
      const y = pad + innerH * (1 - (data[0] - min) / range)
      return [
        { x: 0, y },
        { x: width, y },
      ]
    }
    return data.map((v, i) => ({
      x: (i / (n - 1)) * width,
      y: pad + innerH * (1 - (v - min) / range),
    }))
  }, [data, width, height])

  const linePoints = points.map((p) => `${p.x},${p.y}`).join(' ')
  const areaPoints = [
    ...points.map((p) => `${p.x},${p.y}`),
    `${width},${height}`,
    `0,${height}`,
  ].join(' ')

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: 'visible', display: 'block' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <style>{`
        @keyframes sparklineDraw { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
        @keyframes sparklineFade { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      <polygon
        points={areaPoints}
        fill={`url(#${gradId})`}
        stroke="none"
        style={{
          animation: animated ? 'sparklineFade 0.9s ease-out 0.1s both' : undefined,
          opacity: animated ? 0 : 1,
        }}
      />
      <polyline
        points={linePoints}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        style={{
          strokeDasharray: 100,
          strokeDashoffset: animated ? 100 : 0,
          animation: animated ? 'sparklineDraw 0.9s cubic-bezier(0.2,0.85,0.25,1) forwards' : undefined,
          filter: `drop-shadow(0 0 3px ${color})`,
        }}
      />
    </svg>
  )
}