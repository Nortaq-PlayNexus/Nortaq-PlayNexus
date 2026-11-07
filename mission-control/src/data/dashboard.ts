import { DashboardError, normalizeDashboard, type Dashboard } from './schema'

export const DATA_URL = `${import.meta.env.BASE_URL}data/dashboard.json`
export const FALLBACK_URL = 'https://raw.githubusercontent.com/Nortaq-PlayNexus/Nortaq-PlayNexus/refs/heads/main/mission-control/data/dashboard.json'

const TIMEOUT_MS = 10000

export interface LoadOptions {
  signal?: AbortSignal
  url?: string
  fallback?: boolean
  timeoutMs?: number
}

async function fetchWithTimeout(url: string, signal?: AbortSignal, timeoutMs = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onAbort, { once: true })
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    return res
  } catch (err) {
    if (controller.signal.aborted) {
      if (signal?.aborted) throw new DashboardError('aborted', 'Request aborted', false)
      throw new DashboardError('timeout', `Request timed out after ${timeoutMs}ms`, true)
    }
    throw new DashboardError('network', err instanceof Error ? err.message : 'Network error', true)
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onAbort)
  }
}

async function tryLoad(url: string, signal?: AbortSignal, timeoutMs = TIMEOUT_MS): Promise<Dashboard> {
  const res = await fetchWithTimeout(url, signal, timeoutMs)
  if (!res.ok) {
    throw new DashboardError('http', `HTTP ${res.status} from ${url}`, res.status >= 500 || res.status === 429, res.status)
  }
  const etag = res.headers.get('etag')
  let raw: unknown
  try {
    raw = await res.json()
  } catch {
    throw new DashboardError('parse', 'Failed to parse dashboard JSON', true)
  }
  return normalizeDashboard(raw, etag)
}

export async function loadDashboard(options: LoadOptions = {}): Promise<Dashboard> {
  const { signal, url, fallback = true, timeoutMs } = options
  const primary = url ?? DATA_URL
  try {
    return await tryLoad(primary, signal, timeoutMs)
  } catch (err) {
    if (err instanceof DashboardError && (err.code === 'aborted' || !fallback)) throw err
    // fallback to remote
    try {
      return await tryLoad(FALLBACK_URL, signal, timeoutMs)
    } catch (err2) {
      if (err2 instanceof DashboardError) throw err2
      throw new DashboardError('network', err2 instanceof Error ? err2.message : 'Network error', true)
    }
  }
}
