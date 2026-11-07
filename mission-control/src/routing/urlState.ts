import type { Page } from '../types'

export interface RouteState {
  page: Page
  q?: string
  sort?: string
  domain?: string
  repo?: string
}

const VALID_PAGES = new Set<Page>(['mission-control','network','projects','telemetry','technology','releases','signal','system','zenodo'])

export function parseHash(hash: string): RouteState {
  const raw = hash.replace(/^#/, '')
  const [pagePart, queryPart] = raw.split('?')
  const page = (VALID_PAGES.has(pagePart as Page) ? pagePart : 'mission-control') as Page
  const params = new URLSearchParams(queryPart || '')
  const state: RouteState = { page }
  if (params.has('q')) state.q = params.get('q') || undefined
  if (params.has('sort')) state.sort = params.get('sort') || undefined
  if (params.has('domain')) state.domain = params.get('domain') || undefined
  if (params.has('repo')) state.repo = params.get('repo') || undefined
  return state
}

export function buildHash(state: RouteState): string {
  const params = new URLSearchParams()
  if (state.q) params.set('q', state.q)
  if (state.sort) params.set('sort', state.sort)
  if (state.domain) params.set('domain', state.domain)
  if (state.repo) params.set('repo', state.repo)
  const qs = params.toString()
  return qs ? `#${state.page}?${qs}` : `#${state.page}`
}
