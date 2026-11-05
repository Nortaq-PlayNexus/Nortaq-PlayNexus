import type { RepoData, TelemetryData } from '../types'

export type { RepoData, TelemetryData } from '../types'

export type GhostSeverity = 'WARN' | 'CRIT'

export interface GhostDetection {
  repo: RepoData
  severity: GhostSeverity
  zScore: number
  daysOver: number
  cause: string
}

// Aliases for consumers that may use alternate names.
export type Ghost = GhostDetection
export type GhostRepo = GhostDetection
export type GhostResult = GhostDetection
export type GhostFinding = GhostDetection
export type GhostEntry = GhostDetection
export type GhostRecord = GhostDetection
export type GhostReport = GhostDetection
export type DetectedGhost = GhostDetection

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid]
  return (sorted[mid - 1] + sorted[mid]) / 2
}

function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0
  const m = mean(values)
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

export function detectGhosts(
  repos: RepoData[] | null | undefined,
  telemetry: TelemetryData | null | undefined,
): GhostDetection[] {
  if (!Array.isArray(repos) || repos.length === 0) return []
  if (!telemetry || !Array.isArray(telemetry.activity_by_week)) return []

  const eligible = repos.filter((r) => !r.archived && !r.fork)
  if (eligible.length === 0) return []

  // Historical push cadence derived from weekly activity gaps.
  const activeWeeks: number[] = []
  telemetry.activity_by_week.forEach((count, index) => {
    if (typeof count === 'number' && count > 0) activeWeeks.push(index)
  })

  const gaps: number[] = []
  for (let i = 1; i < activeWeeks.length; i++) {
    gaps.push((activeWeeks[i] - activeWeeks[i - 1]) * 7)
  }
  if (gaps.length === 0) return []

  const baselineMean = mean(gaps)
  const baselineStd = stdDev(gaps)
  const baselineMedian = median(gaps)

  const cohortMedianSilence = median(eligible.map((r) => r.days_since_push))

  const threshold = baselineMean + 2.5 * baselineStd

  const results: GhostDetection[] = []
  for (const repo of eligible) {
    const silence = repo.days_since_push
    if (!(silence > threshold)) continue
    if (!(silence > cohortMedianSilence)) continue

    const zScore =
      baselineStd > 0
        ? (silence - baselineMean) / baselineStd
        : silence > baselineMean
          ? Infinity
          : 0

    if (!(zScore > 2.5)) continue

    const severity: GhostSeverity = zScore > 3 ? 'CRIT' : 'WARN'
    const daysOver = silence - baselineMedian
    const cause = `went dark ${silence}d ago vs. ${baselineMedian}d median`

    results.push({ repo, severity, zScore, daysOver, cause })
  }

  return results
}