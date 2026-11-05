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
  followers: number | null
  contributions: number | null
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

export interface ProfileData {
  login: string
  name: string | null
  bio: string | null
  company: string | null
  location: string | null
  blog: string | null
  twitter: string | null
  avatar_url: string | null
  followers: number
  following: number
  public_repos: number
  public_gists: number
  created_at: string
  updated_at: string
  html_url: string
}

export interface OrganizationData {
  login: string
  description: string | null
  avatar_url: string | null
  url: string
}

export interface StarredRepoData {
  name: string
  full_name: string
  description: string | null
  html_url: string
  language: string | null
  stargazers_count: number
  owner: string
}

export interface GistData {
  id: string
  description: string | null
  html_url: string
  created_at: string
  updated_at: string
  files: string[]
  public: boolean
}

export interface ZenodoRecord {
  id: number
  title: string
  description: string
  type: string
  subtype: string
  creators: string[]
  keywords: string[]
  publication_date: string
  license: string
  doi: string
  files: { key: string; size: number; checksum: string }[]
  downloads: number
  views: number
  html_url: string
  doi_url: string
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

export type Page = 'mission-control' | 'network' | 'projects' | 'telemetry' | 'technology' | 'archive' | 'releases' | 'signal' | 'system' | 'zenodo'
