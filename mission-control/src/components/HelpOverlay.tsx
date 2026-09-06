interface Props {
  onClose: () => void
}

export default function HelpOverlay({ onClose }: Props) {
  const shortcuts = [
    { key: '/', desc: 'Search' },
    { key: '1', desc: 'Mission Control' },
    { key: '2', desc: 'Network' },
    { key: '3', desc: 'Projects' },
    { key: '4', desc: 'Telemetry' },
    { key: '5', desc: 'Technology' },
    { key: '6', desc: 'Releases' },
    { key: '7', desc: 'Signal' },
    { key: '8', desc: 'System' },
    { key: '?', desc: 'Command help' },
    { key: 'ESC', desc: 'Close panel' },
  ]

  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-box" onClick={e => e.stopPropagation()}>
        <div className="help-title">MISSION CONTROL // COMMAND REFERENCE</div>
        {shortcuts.map(s => (
          <div key={s.key} className="help-row">
            <span className="help-key">{s.key}</span>
            <span className="help-desc">{s.desc}</span>
          </div>
        ))}
        <div style={{ marginTop: '1rem', paddingTop: '0.8rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
            PRESS ESC TO CLOSE
          </div>
        </div>
      </div>
    </div>
  )
}
