import { useEffect, useRef, useState } from 'react'

interface TypewriterTextProps {
  text: string
  speed?: number
  cursor?: boolean
  loop?: boolean
  onComplete?: () => void
}

export default function TypewriterText({
  text,
  speed = 30,
  cursor = true,
  loop = false,
  onComplete,
}: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState('')
  const [cursorVisible, setCursorVisible] = useState(true)

  const indexRef = useRef(0)
  const timeoutRef = useRef<number | null>(null)
  const cancelledRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    cancelledRef.current = false
    setDisplayed('')
    indexRef.current = 0

    const clearTimer = () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }

    const typeNext = () => {
      if (cancelledRef.current) return
      if (indexRef.current < text.length) {
        indexRef.current += 1
        setDisplayed(text.slice(0, indexRef.current))
        timeoutRef.current = window.setTimeout(typeNext, speed)
      } else {
        if (!loop) {
          onCompleteRef.current?.()
        } else {
          timeoutRef.current = window.setTimeout(() => {
            if (cancelledRef.current) return
            setDisplayed('')
            indexRef.current = 0
            typeNext()
          }, Math.max(speed * 10, 500))
        }
      }
    }

    timeoutRef.current = window.setTimeout(typeNext, speed)

    return () => {
      cancelledRef.current = true
      clearTimer()
    }
  }, [text, speed, loop])

  useEffect(() => {
    if (!cursor) return
    const id = window.setInterval(() => {
      setCursorVisible((v) => !v)
    }, 500)
    return () => clearInterval(id)
  }, [cursor])

  return (
    <span>
      {displayed}
      {cursor && (
        <span
          aria-hidden="true"
          style={{ opacity: cursorVisible ? 1 : 0, marginLeft: 1 }}
        >
          |
        </span>
      )}
    </span>
  )
}
