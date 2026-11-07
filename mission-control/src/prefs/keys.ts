export const PREFS_NAMESPACE = 'nortaq.prefs.v1'

export const PREF_KEYS = {
  defaultSort: 'defaultSort',
  defaultDomain: 'defaultDomain',
  verbosity: 'verbosity',
  reducedMotion: 'reducedMotion',
  tourProgress: 'tour.progress',
  tourClearance: 'tour.clearance',
  blackbox: 'blackbox',
  phantom: 'phantom',
} as const

export type PrefKey = (typeof PREF_KEYS)[keyof typeof PREF_KEYS]
