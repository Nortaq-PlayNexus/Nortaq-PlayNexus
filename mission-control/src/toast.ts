import { useState, useEffect } from 'react'

export interface ToastItem {
  id: number
  msg: string
  type: 'info' | 'error'
}

type Listener = (items: ToastItem[]) => void
const listeners = new Set<Listener>()
let queue: ToastItem[] = []
let nextId = 1
const MAX = 3

function notify() {
  const snapshot = [...queue]
  listeners.forEach(l => l(snapshot))
}

export function showToast(msg: string, ms = 3000, type: 'info' | 'error' = 'info'): number {
  const id = nextId++
  queue = [...queue, { id, msg, type }].slice(-MAX)
  notify()
  if (ms > 0) {
    setTimeout(() => dismissToast(id), ms)
  }
  return id
}

export function dismissToast(id: number): void {
  queue = queue.filter(t => t.id !== id)
  notify()
}

export function useToast(): ToastItem[] {
  const [items, setItems] = useState<ToastItem[]>([...queue])
  useEffect(() => {
    const l: Listener = (q) => setItems(q)
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [])
  return items
}
