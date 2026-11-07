import { PREFS_NAMESPACE } from './keys'

const VERSION = 1
const VERSION_KEY = `${PREFS_NAMESPACE}.version`

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

export function migrate(): void {
  const s = storage()
  if (!s) return
  try {
    const v = s.getItem(VERSION_KEY)
    if (v === null) {
      s.setItem(VERSION_KEY, String(VERSION))
      return
    }
    const n = Number(v)
    if (Number.isNaN(n) || n < VERSION) {
      // future migrations would go here
      s.setItem(VERSION_KEY, String(VERSION))
    }
  } catch {
    // ignore
  }
}

export function getPref<T>(key: string, defaultValue: T): T {
  migrate()
  const s = storage()
  if (!s) return defaultValue
  try {
    const raw = s.getItem(`${PREFS_NAMESPACE}.${key}`)
    if (raw === null) return defaultValue
    return JSON.parse(raw) as T
  } catch {
    return defaultValue
  }
}

export function setPref<T>(key: string, value: T): void {
  const s = storage()
  if (!s) return
  try {
    s.setItem(`${PREFS_NAMESPACE}.${key}`, JSON.stringify(value))
  } catch {
    // ignore quota / private mode
  }
}

export function removePref(key: string): void {
  const s = storage()
  if (!s) return
  try { s.removeItem(`${PREFS_NAMESPACE}.${key}`) } catch { /* ignore */ }
}

export function exportPrefs(): string {
  const s = storage()
  if (!s) return '{}'
  const out: Record<string, unknown> = {}
  try {
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i)
      if (!k || !k.startsWith(`${PREFS_NAMESPACE}.`)) continue
      const v = s.getItem(k)
      if (v === null) continue
      try { out[k] = JSON.parse(v) } catch { out[k] = v }
    }
  } catch {
    // ignore
  }
  return JSON.stringify(out, null, 2)
}

export function importPrefs(json: string): boolean {
  const s = storage()
  if (!s) return false
  try {
    const obj = JSON.parse(json) as Record<string, unknown>
    for (const [k, v] of Object.entries(obj)) {
      if (!k.startsWith(`${PREFS_NAMESPACE}.`)) continue
      s.setItem(k, JSON.stringify(v))
    }
    return true
  } catch {
    return false
  }
}
