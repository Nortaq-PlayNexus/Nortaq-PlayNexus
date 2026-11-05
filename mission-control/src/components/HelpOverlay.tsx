interface Props {
  onClose: () => void
}

export default function HelpOverlay({ onClose }: Props) {
  const shortcuts = [
    { key: '/', desc: 'Search dossiers' },
    { key: '1', desc: 'Command center' },
    { key: '2', desc: 'Constellation (3D)' },
    { key: '3', desc: 'Case files' },
    { key: '4', desc: 'Telemetry' },
    { key: '5', desc: 'Tech matrix' },
    { key: '6', desc: 'Dispatches' },
    { key: '7', desc: 'Cipher' },
    { key: '8', desc: 'Safehouse' },
    { key: '?', desc: 'This briefing' },
    { key: 'ESC', desc: 'Close file' },
  ]

  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-box" onClick={e => e.stopPropagation()}>
        <div className="help-title">FIELD OPERATIONS // COMMAND REFERENCE</div>
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
