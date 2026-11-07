import { useEffect, type RefObject } from 'react'

import { useState } from 'react'

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    try { mq.addEventListener('change', handler) } catch { mq.addListener(handler) }
    return () => {
      try { mq.removeEventListener('change', handler) } catch { mq.removeListener(handler) }
    }
  }, [])
  return reduced
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  })
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    try { mq.addEventListener('change', handler) } catch { mq.addListener(handler) }
    setMatches(mq.matches)
    return () => {
      try { mq.removeEventListener('change', handler) } catch { mq.removeListener(handler) }
    }
  }, [query])
  return matches
}

export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !ref.current) return
    const el = ref.current
    const selector = 'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
    const getFocusable = () => Array.from(el.querySelectorAll<HTMLElement>(selector)).filter(x => x.offsetParent !== null || x === document.activeElement)
    // focus first
    const focusables = getFocusable()
    if (focusables.length) focusables[0].focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const f = getFocusable()
      if (f.length === 0) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [ref, active])
}
