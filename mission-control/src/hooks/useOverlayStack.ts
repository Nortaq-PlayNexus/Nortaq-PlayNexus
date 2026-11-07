import { useCallback, useRef, useState } from 'react'

export function useOverlayStack() {
  const [stack, setStack] = useState<string[]>([])
  const push = useCallback((id: string) => setStack(s => [...s, id]), [])
  const pop = useCallback((id?: string) => setStack(s => {
    if (id) return s.filter(x => x !== id)
    return s.slice(0, -1)
  }), [])
  const top = stack.length ? stack[stack.length - 1] : null
  const isOpen = useCallback((id: string) => stack.includes(id), [stack])
  return { stack, push, pop, top, isOpen }
}
