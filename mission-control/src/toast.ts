import { useState, useEffect } from 'react'

type Listener = (msg: string | null) => void
const listeners = new Set<Listener>()
let current: string | null = null
let timer: ReturnType<typeof setTimeout> | null = null

export function showToast(msg: string, ms = 3000) {
  current = msg
  listeners.forEach(l => l(current))
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    current = null
    listeners.forEach(l => l(null))
  }, ms)
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(current)
  useEffect(() => {
    const l: Listener = (m) => setMsg(m)
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [])
  return msg
}
