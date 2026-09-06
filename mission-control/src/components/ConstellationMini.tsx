import { useMemo } from 'react'
import { RepoData } from '../types'

const DOMAIN_COLORS: Record<string, string> = {
  AI: '#B8FF1E',
  AUDIO: '#00e5ff',
  SYSTEMS: '#ffaa00',
  EARTH: '#4CAF50',
  GAMING: '#b388ff',
  DATA: '#ff3b3b',
  WEB: '#00bcd4',
  LANG: '#ff9800',
  OTHER: '#5a6488',
}

interface Props {
  repos: RepoData[]
}

export default function ConstellationMini({ repos }: Props) {
  const nodes = useMemo(() => {
    const active = repos.filter(r => !r.archived && !r.fork)
    const cx = 200
    const cy = 140
    return active.map((repo, i) => {
      const angle = (i / active.length) * Math.PI * 2
      const radius = 80 + (repo.stargazers_count * 5)
      return {
        id: repo.name,
        x: cx + Math.cos(angle) * Math.min(radius, 120),
        y: cy + Math.sin(angle) * Math.min(radius, 120),
        size: Math.max(3, Math.min(8, 3 + repo.stargazers_count)),
        color: DOMAIN_COLORS[repo.domain] || '#5a6488',
        active: repo.days_since_push < 30,
      }
    })
  }, [repos])

  const edges = useMemo(() => {
    const langMap: Record<string, string[]> = {}
    repos.filter(r => !r.archived && !r.fork).forEach(r => {
      if (r.language) {
        if (!langMap[r.language]) langMap[r.language] = []
        langMap[r.language].push(r.name)
      }
    })
    const result: { from: string; to: string }[] = []
    Object.values(langMap).forEach(group => {
      for (let i = 0; i < group.length - 1 && i < 4; i++) {
        result.push({ from: group[i], to: group[i + 1] })
      }
    })
    return result.slice(0, 30)
  }, [repos])

  return (
    <svg viewBox="0 0 400 280" style={{ width: '100%', height: '100%' }}>
      {edges.map((edge, i) => {
        const from = nodes.find(n => n.id === edge.from)
        const to = nodes.find(n => n.id === edge.to)
        if (!from || !to) return null
        return (
          <line
            key={i}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="#1a2244"
            strokeWidth="0.5"
          />
        )
      })}
      {nodes.map(node => (
        <g key={node.id}>
          {node.active && (
            <circle
              cx={node.x}
              cy={node.y}
              r={node.size + 4}
              fill="none"
              stroke={node.color}
              strokeWidth="0.3"
              opacity="0.3"
            />
          )}
          <circle
            cx={node.x}
            cy={node.y}
            r={node.size}
            fill={node.color}
            opacity={node.active ? 0.9 : 0.3}
          />
          <text
            x={node.x}
            y={node.y + node.size + 8}
            textAnchor="middle"
            fill="#5a6488"
            fontSize="4"
            fontFamily="JetBrains Mono, monospace"
          >
            {node.id.length > 14 ? node.id.slice(0, 12) + '..' : node.id}
          </text>
        </g>
      ))}
    </svg>
  )
}
