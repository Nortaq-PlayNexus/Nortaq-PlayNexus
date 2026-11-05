import { useEffect, useRef, useState } from 'react'

/** Animates a number from 0 (or previous) to `value` with an ease-out curve.
 *  Mounts trigger a fresh count-up, so view transitions re-run it. */
export default function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value)
      return
    }
    let cancelled = false
    const start = performance.now()
    const from = display
    const to = value
    const tick = (now: number) => {
      if (cancelled) return
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + (to - from) * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  return <>{display.toLocaleString('en-US')}</>
}
