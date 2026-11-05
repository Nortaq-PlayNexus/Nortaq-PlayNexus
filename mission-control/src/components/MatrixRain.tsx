import { useEffect, useRef } from 'react'

interface MatrixRainProps {
  color?: string
  opacity?: number
  speed?: number
  density?: number
  className?: string
}

const KATAKANA = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ'
const LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const DIGITS = '0123456789'
const CHARS = KATAKANA + LATIN + DIGITS

const FONT_SIZE = 14

export default function MatrixRain({
  color = '#2ff3e0',
  opacity = 0.12,
  speed = 1,
  density = 1,
  className,
}: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)

    let reduced = false
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')

    let width = 0
    let height = 0
    let columns = 0
    let drops: number[] = []
    let speeds: number[] = []
    let columnWidth = FONT_SIZE

    let raf = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, Math.floor(rect.width))
      height = Math.max(1, Math.floor(rect.height))
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const colCount = Math.max(1, Math.floor((width / FONT_SIZE) * density))
      columns = colCount
      columnWidth = width / columns
      drops = Array.from({ length: columns }, () => Math.random() * -20)
      speeds = Array.from({ length: columns }, () => 0.4 + Math.random() * 1.6)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    const tick = () => {
      if (reduced) {
        raf = 0
        return
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.07)'
      ctx.fillRect(0, 0, width, height)

      ctx.fillStyle = color
      ctx.font = `${FONT_SIZE}px monospace`
      ctx.textBaseline = 'top'

      for (let i = 0; i < columns; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)]
        const x = i * columnWidth
        const y = drops[i] * FONT_SIZE
        ctx.fillText(char, x, y)

        if (y > height && Math.random() > 0.975) {
          drops[i] = Math.random() * -10
          speeds[i] = 0.4 + Math.random() * 1.6
        } else {
          drops[i] += speeds[i] * speed
        }
      }

      raf = requestAnimationFrame(tick)
    }

    const stop = () => {
      if (raf) {
        cancelAnimationFrame(raf)
        raf = 0
      }
    }
    const start = () => {
      if (raf || reduced) return
      raf = requestAnimationFrame(tick)
    }

    const updateReduced = () => {
      reduced = mq.matches
      if (reduced) stop()
      else start()
    }

    reduced = mq.matches
    mq.addEventListener('change', updateReduced)
    if (!reduced) start()

    return () => {
      stop()
      ro.disconnect()
      mq.removeEventListener('change', updateReduced)
    }
  }, [color, opacity, speed, density])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity,
      }}
      aria-hidden="true"
    />
  )
}
