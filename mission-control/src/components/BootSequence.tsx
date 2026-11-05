import { useState, useEffect } from 'react'

const STAGES = [
  { label: 'SECURE UPLINK', delay: 200 },
  { label: 'CASE FILE INDEX', delay: 400 },
  { label: 'TELEMETRY STREAM', delay: 300 },
  { label: 'ASSET GRAPH', delay: 350 },
  { label: 'CIPHER VERIFY', delay: 250 },
  { label: 'CONSTELLATION 3D', delay: 300 },
  { label: 'DOSSIER DECRYPT', delay: 200 },
]

interface Props {
  onComplete: () => void
}

export default function BootSequence({ onComplete }: Props) {
  const [progress, setProgress] = useState(0)
  const [completedStages, setCompletedStages] = useState<number[]>([])
  const [done, setDone] = useState(false)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    let i = 0
    const runStage = () => {
      if (i >= STAGES.length) {
        setProgress(100)
        setDone(true)
        return
      }
      const stage = STAGES[i]
      setCompletedStages(prev => [...prev, i])
      setProgress(Math.round(((i + 1) / STAGES.length) * 100))
      i++
      setTimeout(runStage, stage.delay)
    }
    setTimeout(runStage, 500)
  }, [])

  const handleEnter = () => {
    setFading(true)
    setTimeout(onComplete, 800)
  }

  return (
    <div className={`boot-screen ${fading ? 'fading' : ''}`}>
      <div className="boot-box">
        <div className="boot-title">NORTAQ</div>
        <div className="boot-subtitle">FIELD OPERATIONS // CLEARANCE OMEGA</div>

        <div className="boot-progress-container">
          <div className="boot-progress-bar" style={{ width: `${progress}%` }} />
          <span className="boot-progress-text">{progress}%</span>
        </div>

        <div className="boot-log">
          {STAGES.map((stage, i) => (
            <div key={i}>
              {stage.label} {'.'}{'.'.repeat(30 - stage.label.length)}{' '}
              {completedStages.includes(i) ? (
                <span className="ok">{done && i === STAGES.length - 1 ? 'READY' : 'ONLINE'}</span>
              ) : (
                <span style={{ color: 'var(--text-dim)' }}>INITIALIZING</span>
              )}
            </div>
          ))}
          <div style={{ marginTop: '0.5rem' }}>
            {'─'.repeat(45)}
          </div>
          <div>
            {done ? (
              <span className="ok">CLEARANCE VERIFIED // ACCESS GRANTED</span>
            ) : (
              <span style={{ color: 'var(--amber)' }}>VERIFYING IDENTITIES...</span>
            )}
          </div>
        </div>

        {done && (
          <button className="boot-enter" onClick={handleEnter}>
            {'>'} ENTER THE FIELD {'<'}
          </button>
        )}
      </div>
    </div>
  )
}
