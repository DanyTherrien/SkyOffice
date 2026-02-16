/** Noms francais des zones — source unique de verite */
export const ZONE_NAMES: Record<string, string> = {
  brainstorm: 'Remue-meninges',
  meeting: 'Salle de reunion',
  deep_work: 'Travail profond',
  sales: 'Salle de ventes',
}

/** Ordre d'affichage des zones dans les listes */
export const ZONE_ORDER = ['brainstorm', 'meeting', 'deep_work', 'sales'] as const

/** Zones qui declenchent automatiquement une reunion */
export const MEETING_ZONES = ['brainstorm', 'meeting', 'sales'] as const

/** Cle localStorage pour l'onboarding */
export const ONBOARDING_DONE_KEY = 'capturia-onboarding-done'

/** Cle localStorage pour les preferences de notifications */
export const NOTIFICATION_PREFS_KEY = 'capturia-notification-prefs'
