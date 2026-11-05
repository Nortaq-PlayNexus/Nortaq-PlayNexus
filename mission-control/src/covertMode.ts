import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'covert'
const EVENT_NAME = 'covertchange'

export function isCovert(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function setCovert(on: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, String(on))
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
  try {
    window.dispatchEvent(new CustomEvent<boolean>(EVENT_NAME, { detail: on }))
  } catch {
    try {
      const evt = document.createEvent('Event')
      evt.initEvent(EVENT_NAME, true, true)
      window.dispatchEvent(evt)
    } catch {
      // ignore
    }
  }
}

export function useCovertMode(): [boolean, (on: boolean) => void] {
  const [value, setValue] = useState<boolean>(() => isCovert())

  useEffect(() => {
    if (typeof window === 'undefined') return
    const sync = () => setValue(isCovert())
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === null) sync()
    }
    const onCovertChange = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail
      if (typeof detail === 'boolean') setValue(detail)
      else sync()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(EVENT_NAME, onCovertChange as EventListener)
    sync()
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(EVENT_NAME, onCovertChange as EventListener)
    }
  }, [])

  const set = useCallback((on: boolean) => {
    setCovert(on)
    setValue(on)
  }, [])

  return [value, set]
}

export function initShakeDetector(onShake: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  let lastX = 0
  let lastY = 0
  let lastZ = 0
  let lastTime = 0
  const threshold = 15

  const handler = (e: DeviceMotionEvent) => {
    const acc = e.accelerationIncludingGravity
    if (!acc) return
    const x = acc.x
    const y = acc.y
    const z = acc.z
    if (x === null || y === null || z === null) return
    const now = Date.now()
    if (now - lastTime < 100) return
    if (lastTime !== 0) {
      const delta = Math.abs(x - lastX) + Math.abs(y - lastY) + Math.abs(z - lastZ)
      if (delta > threshold) {
        onShake()
      }
    }
    lastX = x
    lastY = y
    lastZ = z
    lastTime = now
  }

  window.addEventListener('devicemotion', handler as EventListener)
  return () => window.removeEventListener('devicemotion', handler as EventListener)
}
