import { useEffect, useState } from 'react'
import type { OpsLogEntry } from '../opslog'
import { exportOpsLog } from '../opslog'

interface Props {
  entries: OpsLogEntry[]
  onExport?: () => void
  collapsed?: boolean
}

function formatTs(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export default function OpsLog({ entries, onExport, collapsed = false }: Props) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(!!collapsed)

  useEffect(() => {
    setIsCollapsed(!!collapsed)
  }, [collapsed])

  const handleExport = () => {
    if (onExport) onExport()
    else exportOpsLog()
  }

  return (
    <div className="opslog-panel">
      <style>{`
        .opslog-panel {
          background: var(--bg-card, #101312);
          border: 1px solid var(--border, #232a26);
          border-radius: 6px;
          font-family: var(--font-mono, monospace);
          color: var(--text, #c9cec4);
          overflow: hidden;
        }
        .opslog-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          cursor: pointer;
          user-select: none;
          background: var(--bg-hover, #171b18);
          border-bottom: 1px solid var(--border, #232a26);
        }
        .opslog-title {
          font-family: var(--font-display, Orbitron, sans-serif);
          font-size: 0.75rem;
          letter-spacing: 0.15em;
          color: var(--green, #f5b942);
        }
        .opslog-toggle {
          font-size: 0.7rem;
          color: var(--text-dim, #737a70);
        }
        .opslog-body {
          display: flex;
          flex-direction: column;
        }
        .opslog-list {
          max-height: 240px;
          overflow-y: auto;
          padding: 6px 0;
        }
        .opslog-entry {
          display: grid;
          grid-template-columns: 150px 1fr;
          gap: 8px;
          padding: 4px 12px;
          font-size: 0.7rem;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .opslog-ts {
          color: var(--text-dim, #737a70);
          white-space: nowrap;
        }
        .opslog-action {
          color: var(--text-bright, #eef0e6);
        }
        .opslog-detail {
          color: var(--text-dim, #737a70);
          margin-left: 6px;
        }
        .opslog-empty {
          padding: 12px;
          font-size: 0.7rem;
          color: var(--text-dim, #737a70);
          text-align: center;
        }
        .opslog-footer {
          padding: 8px 12px;
          border-top: 1px solid var(--border, #232a26);
        }
        .opslog-export {
          background: transparent;
          border: 1px solid var(--border-bright, #3a443d);
          color: var(--green, #f5b942);
          font-family: var(--font-mono, monospace);
          font-size: 0.7rem;
          padding: 4px 10px;
          cursor: pointer;
          border-radius: 4px;
        }
        .opslog-export:hover {
          background: var(--green-glow, rgba(245,185,66,0.15));
        }
      `}</style>

      <div className="opslog-header" onClick={() => setIsCollapsed((v) => !v)} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsCollapsed((v) => !v) }}>
        <span className="opslog-title">OPS LOG</span>
        <span className="opslog-toggle">{isCollapsed ? '▸ expand' : '▾ collapse'} · {entries.length}</span>
      </div>

      {!isCollapsed && (
        <div className="opslog-body">
          <div className="opslog-list">
            {entries.length === 0 ? (
              <div className="opslog-empty">NO ENTRIES RECORDED</div>
            ) : (
              [...entries].reverse().map((e, i) => (
                <div className="opslog-entry" key={`${e.ts}-${i}`}>
                  <span className="opslog-ts">{formatTs(e.ts)}</span>
                  <span className="opslog-action">
                    {e.action}
                    {e.detail ? <span className="opslog-detail">— {e.detail}</span> : null}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="opslog-footer">
            <button className="opslog-export" type="button" onClick={handleExport}>EXPORT JSON</button>
          </div>
        </div>
      )}
    </div>
  )
}
