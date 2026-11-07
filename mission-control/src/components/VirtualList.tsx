import { useRef, useState, useEffect, type ReactNode } from 'react'

interface Props<T> {
  items: T[]
  itemHeight: number
  height: number
  renderItem: (item: T, index: number) => ReactNode
  overscan?: number
}

export default function VirtualList<T>({ items, itemHeight, height, renderItem, overscan = 4 }: Props<T>) {
  const ref = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onScroll = () => setScrollTop(el.scrollTop)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const visibleCount = Math.ceil(height / itemHeight) + overscan * 2
  const end = Math.min(items.length, start + visibleCount)
  const topPad = start * itemHeight
  const bottomPad = (items.length - end) * itemHeight
  return (
    <div ref={ref} style={{ height, overflow: 'auto', position: 'relative' }}>
      <div style={{ height: topPad }} />
      {items.slice(start, end).map((item, i) => (
        <div key={start + i} style={{ height: itemHeight }}>{renderItem(item, start + i)}</div>
      ))}
      <div style={{ height: bottomPad }} />
    </div>
  )
}
