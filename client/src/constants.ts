/** Noms francais des zones — source unique de verite */
export const ZONE_NAMES: Record<string, string> = {
  brainstorm: 'Remue-m\u00e9ninges',
  meeting: 'Salle de r\u00e9union',
  deep_work: 'Travail profond',
  sales: 'Salle de ventes',
  afk: 'Pause',
  one_on_one: '1-on-1',
}

/** Ordre d'affichage des zones dans les listes */
export const ZONE_ORDER = ['brainstorm', 'meeting', 'deep_work', 'sales', 'one_on_one', 'afk'] as const

/** Zones qui declenchent automatiquement une reunion */
export const MEETING_ZONES = ['brainstorm', 'meeting', 'sales', 'one_on_one'] as const

/** Couleurs hex des zones (pour l'UI) */
export const ZONE_COLORS: Record<string, string> = {
  brainstorm: '#3b82f6',
  meeting: '#f59e0b',
  deep_work: '#8b5cf6',
  sales: '#22c55e',
  afk: '#6b7280',
  one_on_one: '#ec4899',
}

/** Cle localStorage pour l'onboarding */
export const ONBOARDING_DONE_KEY = 'capturia-onboarding-done'

/** Cle localStorage pour les preferences de notifications */
export const NOTIFICATION_PREFS_KEY = 'capturia-notification-prefs'
