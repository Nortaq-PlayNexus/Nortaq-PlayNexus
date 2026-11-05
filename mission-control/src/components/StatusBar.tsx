import { useEffect, useState } from 'react'

function utc(): string {
  const d = new Date()
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')}Z`
}

export default function StatusBar({ page, repoCount }: { page: string; repoCount: number }) {
  const [clock, setClock] = useState(utc())
  const [fps, setFps] = useState(60)

  useEffect(() => {
    const id = setInterval(() => setClock(utc()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let frames = 0
    let last = performance.now()
    let raf = 0
    let running = true
    const loop = (now: number) => {
      if (!running) return
      if (document.hidden) { raf = requestAnimationFrame(loop); return }
      frames++
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)))
        frames = 0
        last = now
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { running = false; cancelAnimationFrame(raf) }
  }, [])

  return (
    <div className="status-bar" aria-hidden="true">
      <span className="status-bar-item">PAGE // {page.toUpperCase().replace('-', ' ')}</span>
      <span className="status-bar-item">{repoCount.toLocaleString()} RECORDS</span>
      <span className="status-bar-item">CLEARANCE OMEGA</span>
      <span className="status-bar-item">UTC {clock}</span>
      <span className="status-bar-item">FPS {fps}</span>
      <span className="status-bar-item">/ SEARCH · ? BRIEFING</span>
    </div>
  )
}
