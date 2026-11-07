import type { Dashboard } from './schema'

export interface CacheEntry {
  data: Dashboard
  fetchedAt: number
  url: string
}

const cache = new Map<string, CacheEntry>()

export function getCache(url: string): CacheEntry | undefined {
  return cache.get(url)
}

export function setCache(url: string, data: Dashboard): CacheEntry {
  const entry: CacheEntry = { data, fetchedAt: Date.now(), url }
  cache.set(url, entry)
  return entry
}

export function clearCache(url?: string): void {
  if (url) cache.delete(url)
  else cache.clear()
}

export function isStale(entry: CacheEntry, maxAgeMs = 60_000): boolean {
  return Date.now() - entry.fetchedAt > maxAgeMs
}
