import { useEffect, useRef, useState } from 'react'

const GLYPHS = '▸◆◇▣◈◎⌘⚙⊕⊗∴≡'

function scramble(target: string, revealed: number): string {
  let s = ''
  for (let i = 0; i < target.length; i++) {
    if (target[i] === ' ') { s += ' '; continue }
    if (i < revealed) s += target[i]
    else s += GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
  }
  return s
}

export default function ScrambleText({ text, duration = 420 }: { text: string; duration?: number }) {
  const [out, setOut] = useState(text)
  const rafRef = useRef<number>(0)
  const prevRef = useRef(text)

  useEffect(() => {
    const target = text
    if (target === prevRef.current) return
    prevRef.current = target
    const start = performance.now()
    const len = Math.max(target.length, out.length)
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const revealed = Math.floor(t * target.length)
      setOut(scramble(target, revealed))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else setOut(target)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [text, duration, out.length])

  // initial mount: scramble once
  useEffect(() => {
    const target = text
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const revealed = Math.floor(t * target.length)
      setOut(scramble(target, revealed))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else setOut(target)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>{out}</>
}
