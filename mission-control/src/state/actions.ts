import type { Page } from '../types'
import type { RepoData, TelemetryData } from '../types'
import type { DashboardError } from '../types'

export type Filters = {
  domain?: string
  sort?: string
  q?: string
}

export type Preferences = {
  defaultSort?: string
  defaultDomain?: string
  verbosity?: number
  reducedMotion?: boolean | null
}

export type Action =
  | { type: 'NAVIGATE'; page: Page }
  | { type: 'SET_DATA'; repos: RepoData[]; telemetry: TelemetryData | null; profile?: any; organizations?: any[]; starred?: any[]; gists?: any[]; zenodoRecords?: any[] }
  | { type: 'SET_STATUS'; status: 'idle' | 'loading' | 'success' | 'error' | 'stale' }
  | { type: 'SET_ERROR'; error: DashboardError | null }
  | { type: 'SET_FILTER'; filter: Partial<Filters> }
  | { type: 'SELECT_REPO'; repo: RepoData | null }
  | { type: 'SET_PREF'; key: keyof Preferences; value: Preferences[keyof Preferences] }
  | { type: 'SET_OPSLOG'; entries: any[] }
