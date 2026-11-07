import { type ReactNode, type KeyboardEvent } from 'react'

interface Props {
  children: ReactNode
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
  disabled?: boolean
}

export default function InteractiveCard({ children, onClick, className, style, disabled }: Props) {
  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.()
    }
  }
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={className}
      style={style}
      onClick={disabled ? undefined : onClick}
      onKeyDown={handleKey}
    >
      {children}
    </div>
  )
}
