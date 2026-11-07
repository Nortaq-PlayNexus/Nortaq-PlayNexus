import { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { Page, RepoData, TelemetryData } from '../types'
import type { DashboardError } from '../types'
import type { Action, Filters, Preferences } from './actions'

export interface AppState {
  page: Page
  repos: RepoData[]
  telemetry: TelemetryData | null
  profile: any
  organizations: any[]
  starred: any[]
  gists: any[]
  zenodoRecords: any[]
  status: 'idle' | 'loading' | 'success' | 'error' | 'stale'
  error: DashboardError | null
  filters: Filters
  selection: RepoData | null
  preferences: Preferences
  opsLog: any[]
}

const initialState: AppState = {
  page: 'mission-control',
  repos: [],
  telemetry: null,
  profile: null,
  organizations: [],
  starred: [],
  gists: [],
  zenodoRecords: [],
  status: 'idle',
  error: null,
  filters: {},
  selection: null,
  preferences: {},
  opsLog: [],
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'NAVIGATE': return { ...state, page: action.page }
    case 'SET_DATA': return {
      ...state,
      repos: action.repos,
      telemetry: action.telemetry,
      profile: action.profile ?? state.profile,
      organizations: action.organizations ?? state.organizations,
      starred: action.starred ?? state.starred,
      gists: action.gists ?? state.gists,
      zenodoRecords: action.zenodoRecords ?? state.zenodoRecords,
    }
    case 'SET_STATUS': return { ...state, status: action.status }
    case 'SET_ERROR': return { ...state, error: action.error }
    case 'SET_FILTER': return { ...state, filters: { ...state.filters, ...action.filter } }
    case 'SELECT_REPO': return { ...state, selection: action.repo }
    case 'SET_PREF': return { ...state, preferences: { ...state.preferences, [action.key]: action.value } }
    case 'SET_OPSLOG': return { ...state, opsLog: action.entries }
    default: return state
  }
}

interface Ctx { state: AppState; dispatch: (a: Action) => void }
const StoreContext = createContext<Ctx | null>(null)

export function AppStoreProvider({ children, initial }: { children: ReactNode; initial?: Partial<AppState> }) {
  const [state, dispatch] = useReducer(reducer, { ...initialState, ...initial })
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>
}

export function useAppStore(): AppState {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider')
  return ctx.state
}

export function useAppDispatch(): (a: Action) => void {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useAppDispatch must be used within AppStoreProvider')
  return ctx.dispatch
}
