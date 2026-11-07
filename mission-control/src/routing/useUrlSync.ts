import { useEffect, useRef } from 'react'
import { parseHash, buildHash, type RouteState } from './urlState'

export interface UseUrlSyncOptions {
  state: RouteState
  onState: (s: RouteState) => void
}

export function useUrlSync({ state, onState }: UseUrlSyncOptions): void {
  const skipRef = useRef(false)

  // hydrate from URL on mount
  useEffect(() => {
    const apply = () => {
      skipRef.current = true
      onState(parseHash(window.location.hash))
      // reset skip after microtask
      setTimeout(() => { skipRef.current = false }, 0)
    }
    apply()
    const handler = () => apply()
    window.addEventListener('hashchange', handler)
    window.addEventListener('popstate', handler)
    return () => {
      window.removeEventListener('hashchange', handler)
      window.removeEventListener('popstate', handler)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // push state to URL when it changes
  useEffect(() => {
    if (skipRef.current) return
    const h = buildHash(state)
    if (window.location.hash !== h) {
      try { history.pushState(null, '', h) } catch { /* ignore */ }
    }
  }, [state])
}
