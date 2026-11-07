import type { RepoData } from '../types'

export function selectActiveRepos(repos: RepoData[]): RepoData[] {
  return repos.filter(r => !r.archived && !r.fork)
}

export function selectLiveRepos(repos: RepoData[]): RepoData[] {
  return repos.filter(r => !r.archived && !r.fork && r.days_since_push < 30)
}

export function selectDomainCounts(repos: RepoData[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of repos) {
    if (r.archived || r.fork) continue
    out[r.domain] = (out[r.domain] || 0) + 1
  }
  return out
}

export function selectLanguageCounts(repos: RepoData[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of repos) {
    if (!r.language) continue
    out[r.language] = (out[r.language] || 0) + 1
  }
  return out
}

export function selectTopStarred(repos: RepoData[], n = 10): RepoData[] {
  return [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, n)
}
