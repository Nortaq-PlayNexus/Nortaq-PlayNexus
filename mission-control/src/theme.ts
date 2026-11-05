// Shared intelligence-theme constants: dossier palette, domain inks, helpers.

export const DOMAIN_COLORS: Record<string, string> = {
  AI: '#f5b942',
  AUDIO: '#4fd1c5',
  SYSTEMS: '#e08a3c',
  EARTH: '#8fae5a',
  GAMING: '#a585d4',
  DATA: '#e04b3f',
  WEB: '#5b8db8',
  LANG: '#c9a227',
  TOOLS: '#b08968',
  OTHER: '#8a8577',
}

export const LANG_COLORS: Record<string, string> = {
  Python: '#f5b942',
  JavaScript: '#e8d472',
  TypeScript: '#5b8db8',
  Rust: '#c98a5b',
  CSharp: '#8fae5a',
  HTML: '#e08a3c',
  CSS: '#a585d4',
  Shell: '#4fd1c5',
  Go: '#5b9fb8',
  Lua: '#7a7ad4',
  Dart: '#4fd1c5',
  Kotlin: '#a585d4',
}

export function colorFor(domain: string): string {
  return DOMAIN_COLORS[domain] || DOMAIN_COLORS.OTHER
}

/** Stable case-file id for a repo name (PX-XXXXXX). */
export function caseFile(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return `PX-${h.toString(36).toUpperCase().padStart(6, '0').slice(0, 6)}`
}

export type DossierStatus = 'ACTIVE' | 'MONITORED' | 'DORMANT' | 'ARCHIVED'

export function statusOf(repo: { archived: boolean; days_since_push: number }): DossierStatus {
  if (repo.archived) return 'ARCHIVED'
  if (repo.days_since_push < 30) return 'ACTIVE'
  if (repo.days_since_push < 90) return 'MONITORED'
  return 'DORMANT'
}

/** "3d ago" / "5mo ago" style contact label. */
export function contactLabel(days: number): string {
  if (days <= 0) return 'TODAY'
  if (days === 1) return '1 DAY AGO'
  if (days < 30) return `${days} DAYS AGO`
  if (days < 365) {
    const m = Math.floor(days / 30)
    return `${m} MONTH${m > 1 ? 'S' : ''} AGO`
  }
  const y = Math.floor(days / 365)
  return `${y} YEAR${y > 1 ? 'S' : ''} AGO`
}
