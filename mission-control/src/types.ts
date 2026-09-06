export interface RepoData {
  name: string
  full_name: string
  description: string | null
  html_url: string
  language: string | null
  topics: string[]
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  created_at: string
  updated_at: string
  pushed_at: string
  archived: boolean
  fork: boolean
  size: number
  default_branch: string
  homepage: string | null
  domain: string
  activity_score: number
  days_since_push: number
}

export interface TelemetryData {
  total_repos: number
  total_stars: number
  total_forks: number
  total_issues: number
  public_repos: number
  followers: number
  contributions: number
  languages: Record<string, number>
  domain_counts: Record<string, number>
  activity_by_week: number[]
  active_repos: number
  stale_repos: number
  avg_days_since_push: number
  signal_hash: string
  signal_percent: number
  phase: number
  frequency: string
}

export interface ConstellationNode {
  id: string
  name: string
  domain: string
  x: number
  y: number
  size: number
  stars: number
  active: boolean
}

export interface ConstellationEdge {
  from: string
  to: string
}

export interface NetworkData {
  nodes: ConstellationNode[]
  edges: ConstellationEdge[]
  domains: string[]
}

export type Page = 'mission-control' | 'network' | 'projects' | 'telemetry' | 'technology' | 'archive' | 'releases' | 'signal' | 'system'
