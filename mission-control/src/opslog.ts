// Persistent ops log stored in sessionStorage (last 50 entries).

export interface OpsLogEntry {
  ts: number
  action: string
  detail?: string
}

const STORAGE_KEY = 'opslog'
const MAX_ENTRIES = 50

function isEntry(value: unknown): value is OpsLogEntry {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.ts === 'number' && typeof v.action === 'string' && (v.detail === undefined || typeof v.detail === 'string')
}

function readEntries(): OpsLogEntry[] {
  try {
    if (typeof sessionStorage === 'undefined') return []
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isEntry)
  } catch {
    return []
  }
}

function writeEntries(entries: OpsLogEntry[]): void {
  try {
    if (typeof sessionStorage === 'undefined') return
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)))
  } catch {
    // ignore storage errors
  }
}

export function logAction(action: string, detail?: string): void {
  const entries = readEntries()
  entries.push({ ts: Date.now(), action, detail })
  writeEntries(entries)
}

export function getOpsLog(): OpsLogEntry[] {
  return readEntries().slice()
}

export function clearOpsLog(): void {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function exportOpsLog(): void {
  try {
    const data = JSON.stringify(getOpsLog(), null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `opslog-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch {
    // ignore
  }
}
