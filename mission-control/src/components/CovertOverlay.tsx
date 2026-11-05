import React, { useEffect } from 'react'
import { useCovertMode } from '../covertMode'

export default function CovertOverlay(): React.JSX.Element | null {
  const [covert, setCovert] = useCovertMode()

  useEffect(() => {
    if (typeof document === 'undefined') return
    const body = document.body
    if (covert) {
      body.classList.add('covert-mode')
    } else {
      body.classList.remove('covert-mode')
    }
    return () => {
      body.classList.remove('covert-mode')
    }
  }, [covert])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault()
        setCovert(!covert)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [covert, setCovert])

  if (!covert) return null

  return (
    <div
      className="covert-overlay"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9997,
        pointerEvents: 'none',
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(6px) saturate(0.4) brightness(0.6)',
        WebkitBackdropFilter: 'blur(6px) saturate(0.4) brightness(0.6)',
        filter: 'grayscale(0.85) brightness(0.7)',
        mixBlendMode: 'multiply',
      }}
    />
  )
}
