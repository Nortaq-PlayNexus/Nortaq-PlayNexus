import { RepoData, TelemetryData } from '../types'

export interface SitrepBullet {
  severity: 'info' | 'warn' | 'crit'
  text: string
}

export interface SitrepResult {
  headline: string
  bullets: SitrepBullet[]
  generatedAt: number
}

const SEVERITY_RANK: Record<SitrepBullet['severity'], number> = {
  crit: 0,
  warn: 1,
  info: 2,
}

function parseDate(value: string | null | undefined): number {
  if (!value) return NaN
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : NaN
}

function daysBetween(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Infinity
  return Math.max(0, (b - a) / 86400000)
}

function isLive(repo: RepoData): boolean {
  return !repo.archived && !repo.fork
}

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString() : '0'
}

export function generateSitrep(
  repos: readonly RepoData[] | null | undefined,
  telemetry: TelemetryData | null | undefined,
): SitrepResult {
  const list: RepoData[] = Array.isArray(repos) ? [...repos] : []
  const tel = telemetry ?? null
  const now = Date.now()
  const live = list.filter(isLive)
  const liveCount = live.length
  const totalRepos = tel?.total_repos ?? list.length
  const totalStars = tel?.total_stars ?? list.reduce((s, r) => s + (r.stargazers_count || 0), 0)
  const totalIssues = tel?.total_issues ?? list.reduce((s, r) => s + (r.open_issues_count || 0), 0)

  // New assets: created within the last 7 days.
  const newAssets = live.filter((r) => {
    const created = parseDate(r.created_at)
    if (!Number.isFinite(created)) return false
    return daysBetween(created, now) <= 7
  })

  // Revived assets: older assets (created > 7d ago) with a push within the last 7 days.
  const revivedAssets = live.filter((r) => {
    const created = parseDate(r.created_at)
    if (!Number.isFinite(created)) return false
    if (daysBetween(created, now) <= 7) return false
    return (r.days_since_push ?? Infinity) <= 7
  })

  // Dormant assets: no push in 90+ days.
  const dormantAssets = live.filter((r) => (r.days_since_push ?? 0) >= 90)

  const dormantPct = liveCount > 0 ? (dormantAssets.length / liveCount) * 100 : 0

  // Star velocity: share of stars sitting in assets pushed within the last 30 days.
  const recentStars = live
    .filter((r) => (r.days_since_push ?? Infinity) < 30)
    .reduce((s, r) => s + (r.stargazers_count || 0), 0)
  const starVelocityPct = totalStars > 0 ? (recentStars / totalStars) * 100 : 0

  // Language mix: overall vs. recently created (<=30d) assets.
  const overallLang: Record<string, number> = {}
  const recentLang: Record<string, number> = {}
  live.forEach((r) => {
    if (r.language) overallLang[r.language] = (overallLang[r.language] || 0) + 1
  })
  live.forEach((r) => {
    const created = parseDate(r.created_at)
    if (!Number.isFinite(created)) return
    if (daysBetween(created, now) > 30) return
    if (r.language) recentLang[r.language] = (recentLang[r.language] || 0) + 1
  })
  const overallTop = Object.entries(overallLang).sort((a, b) => b[1] - a[1])[0]
  const recentTop = Object.entries(recentLang).sort((a, b) => b[1] - a[1])[0]
  const overallTopShare = overallTop && liveCount > 0 ? (overallTop[1] / liveCount) * 100 : 0

  // Top anomaly: highest open-issue load, else most stale dormant asset, else top-starred.
  let anomaly: { name: string; metric: string } | null = null
  const issueSorted = [...live].sort((a, b) => (b.open_issues_count || 0) - (a.open_issues_count || 0))
  if (issueSorted.length > 0 && (issueSorted[0].open_issues_count || 0) > 0) {
    anomaly = {
      name: issueSorted[0].name,
      metric: `${fmt(issueSorted[0].open_issues_count || 0)} open issues`,
    }
  } else if (dormantAssets.length > 0) {
    const mostStale = [...dormantAssets].sort((a, b) => (b.days_since_push || 0) - (a.days_since_push || 0))[0]
    anomaly = {
      name: mostStale.name,
      metric: `${fmt(mostStale.days_since_push || 0)}d since last push`,
    }
  } else if (live.length > 0) {
    const topStarred = [...live].sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))[0]
    anomaly = {
      name: topStarred.name,
      metric: `${fmt(topStarred.stargazers_count || 0)} stars (top asset)`,
    }
  }

  // Signal integrity.
  const signalPercent = tel?.signal_percent ?? Math.max(0, Math.min(99, Math.round(100 - dormantPct)))
  const signalHash = tel?.signal_hash ?? 'n/a'
  const activeRepos = tel?.active_repos ?? live.filter((r) => (r.days_since_push ?? Infinity) < 30).length
  const avgDays = tel?.avg_days_since_push ?? (live.length > 0
    ? live.reduce((s, r) => s + (r.days_since_push || 0), 0) / live.length
    : 0)

  const bullets: SitrepBullet[] = []

  // Assets bullet.
  bullets.push({
    severity: dormantAssets.length > 0 && dormantPct >= 30 ? 'crit' : dormantAssets.length > 0 && dormantPct >= 10 ? 'warn' : 'info',
    text: `Assets: ${fmt(newAssets.length)} new (<=7d), ${fmt(revivedAssets.length)} revived (push <=7d), ${fmt(dormantAssets.length)} dormant (>=90d) of ${fmt(liveCount)} live assets.`,
  })

  // Star velocity bullet.
  bullets.push({
    severity: 'info',
    text: `Star velocity: ${fmt(totalStars)} stars total; ${fmt(recentStars)} stars (${starVelocityPct.toFixed(1)}%) in assets pushed <30d.`,
  })

  // Language mix bullet.
  if (overallTop) {
    const shiftNote = recentTop && recentTop[0] !== overallTop[0]
      ? `shift detected: recent top is ${recentTop[0]} (${recentTop[1]} of ${Object.values(recentLang).reduce((a, b) => a + b, 0)}) vs baseline ${overallTop[0]}`
      : `stable: ${overallTop[0]} leads both windows`
    bullets.push({
      severity: recentTop && recentTop[0] !== overallTop[0] ? 'warn' : 'info',
      text: `Language mix: ${overallTop[0]} leads overall with ${overallTop[1]} of ${liveCount} assets (${overallTopShare.toFixed(1)}%); ${shiftNote}.`,
    })
  } else {
    bullets.push({ severity: 'info', text: 'Language mix: no language data on record.' })
  }

  // Top anomaly bullet.
  if (anomaly) {
    const issueCount = issueSorted.length > 0 ? (issueSorted[0].open_issues_count || 0) : 0
    const sev: SitrepBullet['severity'] = issueCount > 50 ? 'crit' : issueCount > 10 ? 'warn' : 'info'
    bullets.push({
      severity: sev,
      text: `Top anomaly: ${anomaly.name} — ${anomaly.metric} (${fmt(totalIssues)} open issues total).`,
    })
  } else {
    bullets.push({ severity: 'info', text: 'Top anomaly: none detected (no live assets).' })
  }

  // Signal integrity bullet.
  bullets.push({
    severity: signalPercent < 50 ? 'crit' : signalPercent < 80 ? 'warn' : 'info',
    text: `Signal integrity: ${fmt(signalPercent)}% (hash ${signalHash}); ${fmt(activeRepos)}/${fmt(totalRepos)} active assets; avg ${typeof avgDays === 'number' ? avgDays.toFixed(1) : avgDays}d since push.`,
  })

  // Empty-data graceful bullet.
  if (list.length === 0) {
    bullets.push({ severity: 'warn', text: 'No assets on record; SITREP baseline is empty.' })
  }

  bullets.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])

  const headlineParts: string[] = []
  headlineParts.push(`SITREP: ${fmt(totalRepos)} assets on record`)
  if (liveCount > 0) {
    headlineParts.push(`${fmt(live.filter((r) => (r.days_since_push ?? Infinity) < 30).length)} active`)
  }
  headlineParts.push(`${fmt(dormantAssets.length)} dormant`)
  headlineParts.push(`${fmt(totalStars)} stars`)
  if (overallTop) headlineParts.push(`top language ${overallTop[0]}`)
  headlineParts.push(`signal integrity ${fmt(signalPercent)}%`)
  const headline = `${headlineParts.join('; ')}.`

  return {
    headline,
    bullets,
    generatedAt: now,
  }
}

export default generateSitrep