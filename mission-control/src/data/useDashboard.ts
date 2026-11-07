import { useCallback, useEffect, useRef, useState } from 'react'
import { loadDashboard, DATA_URL } from './dashboard'
import { getCache, setCache } from './cache'
import { DashboardError, type Dashboard } from './schema'

export type LoadStatus = 'idle' | 'loading' | 'success' | 'error' | 'stale'

export interface UseDashboardResult {
  data: Dashboard | null
  status: LoadStatus
  error: DashboardError | null
  isRefreshing: boolean
  lastUpdatedAt: number | null
  refresh: () => Promise<void>
}

const MAX_AGE = 60_000

export function useDashboard(): UseDashboardResult {
  const [data, setData] = useState<Dashboard | null>(() => getCache(DATA_URL)?.data ?? null)
  const [status, setStatus] = useState<LoadStatus>(() => (getCache(DATA_URL) ? 'success' : 'idle'))
  const [error, setError] = useState<DashboardError | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(() => getCache(DATA_URL)?.fetchedAt ?? null)
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  const refresh = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    if (!opts.silent) {
      if (data) setStatus('stale')
      else setStatus('loading')
    }
    setIsRefreshing(true)
    try {
      const fresh = await loadDashboard({ signal: controller.signal })
      if (!mountedRef.current) return
      const cached = getCache(DATA_URL)
      const changed = !cached || cached.data.generatedAt !== fresh.generatedAt
      setCache(DATA_URL, fresh)
      setData(fresh)
      setError(null)
      setStatus('success')
      setLastUpdatedAt(Date.now())
      return
    } catch (err) {
      if (!mountedRef.current) return
      if (err instanceof DashboardError && err.code === 'aborted') return
      const de = err instanceof DashboardError ? err : new DashboardError('network', String(err), true)
      setError(de)
      // keep stale data if available
      if (data) setStatus('stale')
      else setStatus('error')
    } finally {
      if (mountedRef.current) setIsRefreshing(false)
    }
  }, [data])

  // initial load / SWR on mount
  useEffect(() => {
    mountedRef.current = true
    const cached = getCache(DATA_URL)
    if (cached) {
      setData(cached.data)
      setStatus('success')
      setLastUpdatedAt(cached.fetchedAt)
      // revalidate in background if stale
      if (Date.now() - cached.fetchedAt > MAX_AGE) {
        void refresh({ silent: true })
      }
    } else {
      void refresh()
    }
    return () => { mountedRef.current = false; abortRef.current?.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // revalidate on focus / online
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh({ silent: true })
    }
    const onOnline = () => void refresh({ silent: true })
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [refresh])

  return { data, status, error, isRefreshing, lastUpdatedAt, refresh: () => refresh() }
}
