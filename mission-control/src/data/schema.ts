import type {
  RepoData, TelemetryData, ProfileData, OrganizationData,
  StarredRepoData, GistData, ZenodoRecord,
} from '../types'

export type DashboardErrorCode = 'network' | 'timeout' | 'http' | 'parse' | 'schema' | 'aborted'

export class DashboardError extends Error {
  code: DashboardErrorCode
  retryable: boolean
  status?: number
  constructor(code: DashboardErrorCode, message: string, retryable = true, status?: number) {
    super(message)
    this.name = 'DashboardError'
    this.code = code
    this.retryable = retryable
    this.status = status
  }
}

export interface Dashboard {
  generatedAt: string
  repos: RepoData[]
  telemetry: TelemetryData | null
  profile: ProfileData | null
  organizations: OrganizationData[]
  starred: StarredRepoData[]
  gists: GistData[]
  zenodoRecords: ZenodoRecord[]
  etag: string | null
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function asBool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback
}

function asArray<T>(v: unknown, map: (x: unknown) => T | null): T[] {
  if (!Array.isArray(v)) return []
  const out: T[] = []
  for (const item of v) {
    const m = map(item)
    if (m !== null) out.push(m)
  }
  return out
}

function normalizeRepo(raw: unknown): RepoData | null {
  if (!isObject(raw)) return null
  const r = raw
  return {
    name: asString(r.name),
    full_name: asString(r.full_name, asString(r.name)),
    description: r.description === null ? null : (typeof r.description === 'string' ? r.description : null),
    html_url: asString(r.html_url),
    language: r.language === null ? null : (typeof r.language === 'string' ? r.language : null),
    topics: Array.isArray(r.topics) ? r.topics.filter((t): t is string => typeof t === 'string') : [],
    stargazers_count: asNumber(r.stargazers_count),
    forks_count: asNumber(r.forks_count),
    open_issues_count: asNumber(r.open_issues_count),
    created_at: asString(r.created_at),
    updated_at: asString(r.updated_at),
    pushed_at: asString(r.pushed_at),
    archived: asBool(r.archived),
    fork: asBool(r.fork),
    size: asNumber(r.size),
    default_branch: asString(r.default_branch, 'main'),
    homepage: r.homepage === null ? null : (typeof r.homepage === 'string' ? r.homepage : null),
    domain: asString(r.domain, 'unknown'),
    activity_score: asNumber(r.activity_score),
    days_since_push: asNumber(r.days_since_push),
  }
}

function normalizeTelemetry(raw: unknown): TelemetryData | null {
  if (raw === null || raw === undefined) return null
  if (!isObject(raw)) return null
  const t = raw
  const languages: Record<string, number> = {}
  if (isObject(t.languages)) {
    for (const [k, v] of Object.entries(t.languages)) {
      if (typeof v === 'number') languages[k] = v
    }
  }
  const domainCounts: Record<string, number> = {}
  if (isObject(t.domain_counts)) {
    for (const [k, v] of Object.entries(t.domain_counts)) {
      if (typeof v === 'number') domainCounts[k] = v
    }
  }
  const weeks = Array.isArray(t.activity_by_week)
    ? t.activity_by_week.filter((x): x is number => typeof x === 'number')
    : []
  return {
    total_repos: asNumber(t.total_repos),
    total_stars: asNumber(t.total_stars),
    total_forks: asNumber(t.total_forks),
    total_issues: asNumber(t.total_issues),
    public_repos: asNumber(t.public_repos),
    followers: t.followers === null ? null : (typeof t.followers === 'number' ? t.followers : null),
    contributions: t.contributions === null ? null : (typeof t.contributions === 'number' ? t.contributions : null),
    languages,
    domain_counts: domainCounts,
    activity_by_week: weeks,
    active_repos: asNumber(t.active_repos),
    stale_repos: asNumber(t.stale_repos),
    avg_days_since_push: asNumber(t.avg_days_since_push),
    signal_hash: asString(t.signal_hash),
    signal_percent: asNumber(t.signal_percent),
    phase: asNumber(t.phase),
    frequency: asString(t.frequency),
  }
}

function normalizeProfile(raw: unknown): ProfileData | null {
  if (raw === null || raw === undefined) return null
  if (!isObject(raw)) return null
  const p = raw
  return {
    login: asString(p.login),
    name: p.name === null ? null : (typeof p.name === 'string' ? p.name : null),
    bio: p.bio === null ? null : (typeof p.bio === 'string' ? p.bio : null),
    company: p.company === null ? null : (typeof p.company === 'string' ? p.company : null),
    location: p.location === null ? null : (typeof p.location === 'string' ? p.location : null),
    blog: p.blog === null ? null : (typeof p.blog === 'string' ? p.blog : null),
    twitter: p.twitter === null ? null : (typeof p.twitter === 'string' ? p.twitter : null),
    avatar_url: p.avatar_url === null ? null : (typeof p.avatar_url === 'string' ? p.avatar_url : null),
    followers: asNumber(p.followers),
    following: asNumber(p.following),
    public_repos: asNumber(p.public_repos),
    public_gists: asNumber(p.public_gists),
    created_at: asString(p.created_at),
    updated_at: asString(p.updated_at),
    html_url: asString(p.html_url),
  }
}

function normalizeOrg(raw: unknown): OrganizationData | null {
  if (!isObject(raw)) return null
  const o = raw
  return {
    login: asString(o.login),
    description: o.description === null ? null : (typeof o.description === 'string' ? o.description : null),
    avatar_url: o.avatar_url === null ? null : (typeof o.avatar_url === 'string' ? o.avatar_url : null),
    url: asString(o.url),
  }
}

function normalizeStarred(raw: unknown): StarredRepoData | null {
  if (!isObject(raw)) return null
  const s = raw
  return {
    name: asString(s.name),
    full_name: asString(s.full_name, asString(s.name)),
    description: s.description === null ? null : (typeof s.description === 'string' ? s.description : null),
    html_url: asString(s.html_url),
    language: s.language === null ? null : (typeof s.language === 'string' ? s.language : null),
    stargazers_count: asNumber(s.stargazers_count),
    owner: asString(s.owner),
  }
}

function normalizeGist(raw: unknown): GistData | null {
  if (!isObject(raw)) return null
  const g = raw
  return {
    id: asString(g.id),
    description: g.description === null ? null : (typeof g.description === 'string' ? g.description : null),
    html_url: asString(g.html_url),
    created_at: asString(g.created_at),
    updated_at: asString(g.updated_at),
    files: Array.isArray(g.files) ? g.files.filter((f): f is string => typeof f === 'string') : [],
    public: asBool(g.public),
  }
}

function normalizeZenodo(raw: unknown): ZenodoRecord | null {
  if (!isObject(raw)) return null
  const z = raw
  return {
    id: asNumber(z.id),
    title: asString(z.title),
    description: asString(z.description),
    type: asString(z.type),
    subtype: asString(z.subtype),
    creators: Array.isArray(z.creators) ? z.creators.filter((c): c is string => typeof c === 'string') : [],
    keywords: Array.isArray(z.keywords) ? z.keywords.filter((k): k is string => typeof k === 'string') : [],
    publication_date: asString(z.publication_date),
    license: asString(z.license),
    doi: asString(z.doi),
    files: Array.isArray(z.files)
      ? z.files
          .filter(isObject)
          .map(f => ({ key: asString(f.key), size: asNumber(f.size), checksum: asString(f.checksum) }))
      : [],
    downloads: asNumber(z.downloads),
    views: asNumber(z.views),
    html_url: asString(z.html_url),
    doi_url: asString(z.doi_url),
  }
}

export function isDashboard(raw: unknown): boolean {
  if (!isObject(raw)) return false
  if (!Array.isArray(raw.repos)) return false
  if (typeof raw.generated_at !== 'string' && raw.generated_at !== undefined) return false
  return true
}

export function normalizeDashboard(raw: unknown, etag: string | null = null): Dashboard {
  if (!isObject(raw)) {
    throw new DashboardError('schema', 'Dashboard payload is not an object', false)
  }
  if (!Array.isArray(raw.repos)) {
    throw new DashboardError('schema', 'Dashboard payload missing repos array', false)
  }
  const repos = asArray(raw.repos, normalizeRepo)
  if (repos.length === 0 && (raw.repos as unknown[]).length > 0) {
    throw new DashboardError('schema', 'Dashboard repos failed to normalize', false)
  }
  return {
    generatedAt: asString(raw.generated_at, new Date().toISOString()),
    repos,
    telemetry: normalizeTelemetry(raw.telemetry),
    profile: normalizeProfile(raw.profile),
    organizations: asArray(raw.organizations, normalizeOrg),
    starred: asArray(raw.starred, normalizeStarred),
    gists: asArray(raw.gists, normalizeGist),
    zenodoRecords: asArray(raw.zenodo_records, normalizeZenodo),
    etag,
  }
}
