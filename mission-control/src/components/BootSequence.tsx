import { useState, useEffect } from 'react'

const STAGES = [
  { label: 'GITHUB CONNECTION', delay: 200 },
  { label: 'REPOSITORY INDEX', delay: 400 },
  { label: 'TELEMETRY STREAM', delay: 300 },
  { label: 'PROJECT GRAPH', delay: 350 },
  { label: 'SIGNAL VERIFICATION', delay: 250 },
  { label: 'CONSTELLATION MAP', delay: 300 },
  { label: 'ARCHIVE DECRYPT', delay: 200 },
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
        <div className="boot-subtitle">MISSION CONTROL</div>

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
              <span className="ok">ACCESS GRANTED</span>
            ) : (
              <span style={{ color: 'var(--amber)' }}>SYSTEM LOADING...</span>
            )}
          </div>
        </div>

        {done && (
          <button className="boot-enter" onClick={handleEnter}>
            {'>'} ENTER NETWORK {'<'}
          </button>
        )}
      </div>
    </div>
  )
}
