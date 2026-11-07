import { type ReactNode } from 'react'

interface Props {
  missing: string[]
  onRetry?: () => void
  children?: ReactNode
}

export default function PartialDataBanner({ missing, onRetry }: Props) {
  if (!missing || missing.length === 0) return null
  return (
    <div role="status" style={{ padding: '0.5rem 0.75rem', margin: '0.5rem 0', border: '1px solid var(--amber, #f5a623)', color: 'var(--amber, #f5a623)', fontSize: '0.7rem', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <span>PARTIAL DATA // MISSING: {missing.join(', ').toUpperCase()}</span>
      {onRetry && <button onClick={onRetry} style={{ marginLeft: 'auto' }}>RETRY</button>}
    </div>
  )
}
