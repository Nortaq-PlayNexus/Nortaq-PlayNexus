import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
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

const DOMAIN_LIST = ['ALL', 'AI', 'AUDIO', 'SYSTEMS', 'EARTH', 'GAMING', 'DATA', 'WEB', 'LANG']

interface Props {
  repos: RepoData[]
}

export default function NetworkView({ repos }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [filter, setFilter] = useState('ALL')
  const [hovered, setHovered] = useState<RepoData | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const nodes = useMemo(() => {
    const active = repos.filter(r => !r.archived && !r.fork)
    const canvas = canvasRef.current
    const w = canvas?.width || 800
    const h = canvas?.height || 500
    const cx = w / 2
    const cy = h / 2

    const groups: Record<string, RepoData[]> = {}
    active.forEach(r => {
      if (!groups[r.domain]) groups[r.domain] = []
      groups[r.domain].push(r)
    })

    const result: { repo: RepoData; x: number; y: number; size: number }[] = []
    const domainKeys = Object.keys(groups)
    domainKeys.forEach((domain, di) => {
      const angle = (di / domainKeys.length) * Math.PI * 2 - Math.PI / 2
      const domainCx = cx + Math.cos(angle) * 150
      const domainCy = cy + Math.sin(angle) * 150

      groups[domain].forEach((repo, ri) => {
        const subAngle = (ri / groups[domain].length) * Math.PI * 2
        const subRadius = 30 + (groups[domain].length * 8)
        result.push({
          repo,
          x: domainCx + Math.cos(subAngle) * Math.min(subRadius, 80),
          y: domainCy + Math.sin(subAngle) * Math.min(subRadius, 80),
          size: Math.max(4, Math.min(12, 4 + repo.stargazers_count * 2)),
        })
      })
    })
    return result
  }, [repos])

  const filteredNodes = useMemo(() => {
    if (filter === 'ALL') return nodes
    return nodes.filter(n => n.repo.domain === filter)
  }, [nodes, filter])

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
      for (let i = 0; i < group.length - 1 && i < 5; i++) {
        result.push({ from: group[i], to: group[i + 1] })
      }
    })
    return result.slice(0, 50)
  }, [repos])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    ctx.strokeStyle = '#1a2244'
    ctx.lineWidth = 0.5
    edges.forEach(edge => {
      const from = nodes.find(n => n.repo.name === edge.from)
      const to = nodes.find(n => n.repo.name === edge.to)
      if (!from || !to) return
      if (filter !== 'ALL' && from.repo.domain !== filter && to.repo.domain !== filter) return
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
    })

    filteredNodes.forEach(node => {
      const color = DOMAIN_COLORS[node.repo.domain] || '#5a6488'
      if (node.repo.days_since_push < 30) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.size + 6, 0, Math.PI * 2)
        ctx.strokeStyle = color
        ctx.lineWidth = 0.5
        ctx.globalAlpha = 0.2
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      ctx.beginPath()
      ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.globalAlpha = node.repo.days_since_push < 30 ? 0.9 : 0.3
      ctx.fill()
      ctx.globalAlpha = 1

      ctx.fillStyle = '#5a6488'
      ctx.font = '8px JetBrains Mono'
      ctx.textAlign = 'center'
      const label = node.repo.name.length > 16 ? node.repo.name.slice(0, 14) + '..' : node.repo.name
      ctx.fillText(label, node.x, node.y + node.size + 10)
    })
  }, [edges, nodes, filteredNodes, filter])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.scale(2, 2)
    draw()
  }, [draw])

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = canvas.offsetWidth * 2
      canvas.height = canvas.offsetHeight * 2
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(2, 2)
      draw()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [draw])

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const found = filteredNodes.find(n => {
      const dx = n.x - mx
      const dy = n.y - my
      return Math.sqrt(dx * dx + dy * dy) < n.size + 4
    })
    setHovered(found?.repo || null)
    setTooltipPos({ x: e.clientX, y: e.clientY })
  }

  return (
    <div>
      <div className="header-bar">
        <span className="header-title">NETWORK // CONSTELLATION</span>
        <span className="header-status">
          <span className="status-dot" />
          {filteredNodes.length} NODES
        </span>
      </div>

      <div className="constellation-filters" style={{ position: 'relative', top: 0, right: 0, marginBottom: '0.8rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {DOMAIN_LIST.map(d => (
          <button
            key={d}
            className={`filter-btn ${filter === d ? 'active' : ''}`}
            onClick={() => setFilter(d)}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="constellation-container" style={{ height: '500px', position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHovered(null)}
        />
        {hovered && (
          <div
            style={{
              position: 'fixed',
              left: tooltipPos.x + 12,
              top: tooltipPos.y + 12,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              padding: '0.6rem 0.8rem',
              fontSize: '0.7rem',
              zIndex: 100,
              pointerEvents: 'none',
              maxWidth: '250px',
            }}
          >
            <div style={{ color: DOMAIN_COLORS[hovered.domain] || 'var(--text)', fontWeight: 600 }}>{hovered.name}</div>
            <div style={{ color: 'var(--text-dim)', marginTop: '0.2rem' }}>{hovered.domain} / {hovered.language || 'UNKNOWN'}</div>
            <div style={{ color: 'var(--text-dim)', fontSize: '0.6rem', marginTop: '0.2rem' }}>
              {hovered.stargazers_count}★ {hovered.forks_count} forks
            </div>
            <div style={{ marginTop: '0.3rem' }}>
              <a href={hovered.html_url} target="_blank" rel="noopener" style={{ color: 'var(--green)', fontSize: '0.6rem', textDecoration: 'none' }}>
                VIEW ON GITHUB →
              </a>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {Object.entries(DOMAIN_COLORS).map(([domain, color]) => (
          <div key={domain} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.6rem', color: 'var(--text-dim)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }} />
            {domain}
          </div>
        ))}
      </div>
    </div>
  )
}
