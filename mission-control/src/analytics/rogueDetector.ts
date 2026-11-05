import { RepoData } from '../types'

export interface RogueFactor {
  feature: string
  zScore: number
  direction: 'high' | 'low'
}

export interface RogueResult {
  repo: RepoData
  score: number
  factors: RogueFactor[]
}

const FEATURES: readonly string[] = [
  'stars',
  'forks',
  'issues',
  'size',
  'days_since_push',
  'activity_score',
  'domain_baseline',
]

function safeNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

function robustZScores(values: number[]): number[] {
  const n = values.length
  if (n === 0) return []
  const med = median(values)
  const deviations = values.map((v) => Math.abs(v - med))
  const mad = median(deviations)

  if (mad !== 0) {
    // 1.4826 scales MAD to a std-equivalent for normal data
    const scale = mad * 1.4826
    return values.map((v) => (v - med) / scale)
  }

  // Fallback for degenerate (zero MAD) distributions
  const mean = values.reduce((sum, v) => sum + v, 0) / n
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n
  const std = Math.sqrt(variance)
  if (std === 0) return values.map(() => 0)
  return values.map((v) => (v - mean) / std)
}

export function detectRogues(repos: RepoData[]): RogueResult[] {
  if (!Array.isArray(repos) || repos.length === 0) return []

  const validRepos = repos.filter((r): r is RepoData => !!r && typeof r === 'object')

  if (validRepos.length === 0) return []

  // Domain baseline: how common the repo's domain is across the set
  const domainCounts: Record<string, number> = {}
  for (const repo of validRepos) {
    const domain = repo.domain ?? 'unknown'
    domainCounts[domain] = (domainCounts[domain] ?? 0) + 1
  }

  const featureMatrix: number[][] = validRepos.map((repo) => [
    safeNumber(repo.stargazers_count),
    safeNumber(repo.forks_count),
    safeNumber(repo.open_issues_count),
    safeNumber(repo.size),
    safeNumber(repo.days_since_push),
    safeNumber(repo.activity_score),
    safeNumber(domainCounts[repo.domain ?? 'unknown'] ?? 1),
  ])

  // Transpose to compute per-feature z-scores
  const zMatrix: number[][] = validRepos.map(() => new Array(FEATURES.length).fill(0))
  for (let f = 0; f < FEATURES.length; f++) {
    const column = featureMatrix.map((row) => row[f])
    const zs = robustZScores(column)
    for (let i = 0; i < validRepos.length; i++) {
      zMatrix[i][f] = zs[i]
    }
  }

  const results: RogueResult[] = []
  for (let i = 0; i < validRepos.length; i++) {
    const factors: RogueFactor[] = []
    let maxAbsZ = 0
    for (let f = 0; f < FEATURES.length; f++) {
      const z = zMatrix[i][f]
      if (!Number.isFinite(z)) continue
      if (Math.abs(z) > 2) {
        factors.push({
          feature: FEATURES[f],
          zScore: z,
          direction: z > 0 ? 'high' : 'low',
        })
      }
      if (Math.abs(z) > maxAbsZ) maxAbsZ = Math.abs(z)
    }

    if (factors.length > 0) {
      // Sort factors by absolute z-score descending for readability
      factors.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore))
      results.push({
        repo: validRepos[i],
        score: maxAbsZ,
        factors,
      })
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results
}