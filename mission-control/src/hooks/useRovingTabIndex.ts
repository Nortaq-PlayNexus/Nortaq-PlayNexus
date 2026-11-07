import { useCallback, useRef, type KeyboardEvent } from 'react'

export function useRovingTabIndex(length: number) {
  const indexRef = useRef(0)
  const onKeyDown = useCallback((e: KeyboardEvent, onActivate: (i: number) => void) => {
    let next = indexRef.current
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { next = Math.min(length - 1, next + 1); e.preventDefault() }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { next = Math.max(0, next - 1); e.preventDefault() }
    else if (e.key === 'Home') { next = 0; e.preventDefault() }
    else if (e.key === 'End') { next = Math.max(0, length - 1); e.preventDefault() }
    else if (e.key === 'Enter' || e.key === ' ') { onActivate(indexRef.current); e.preventDefault(); return }
    else return
    indexRef.current = next
    onActivate(next)
  }, [length])
  return { indexRef, onKeyDown }
}
