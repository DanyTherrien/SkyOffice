import { createSlice, PayloadAction } from '@reduxjs/toolkit'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Badge {
  id: string
  name: string
  description: string
  icon: string // emoji
  unlockedAt: number | null // epoch ms, null si pas debloque
  progress: number // 0-100
  target: number // valeur cible
  current: number // valeur actuelle
}

export interface BadgeState {
  badges: Badge[]
  showBadgePanel: boolean
  newBadgeId: string | null // pour l'animation de celebration
}

// ─── Definitions des badges ───────────────────────────────────────────────────

export const BADGE_DEFINITIONS: Omit<Badge, 'unlockedAt' | 'progress' | 'current'>[] = [
  { id: 'deep_focus_1h', name: 'Concentre', description: '1h cumulative en Deep Work', icon: '\u{1F9D8}', target: 60 },
  { id: 'deep_focus_10h', name: 'Moine du code', description: '10h cumulative en Deep Work', icon: '\u{1F3D4}\uFE0F', target: 600 },
  { id: 'brainstorm_5', name: "Generateur d'idees", description: '5 sessions de Brainstorm', icon: '\u{1F4A1}', target: 5 },
  { id: 'brainstorm_20', name: 'Cerveau en feu', description: '20 sessions de Brainstorm', icon: '\u{1F525}', target: 20 },
  { id: 'sales_calls_10', name: 'Vendeur junior', description: '10 sessions en Sales', icon: '\u{1F4DE}', target: 10 },
  { id: 'sales_calls_50', name: 'Closer', description: '50 sessions en Sales', icon: '\u{1F4B0}', target: 50 },
  { id: 'meetings_10', name: 'Reunioniste', description: '10 reunions', icon: '\u{1F4CB}', target: 10 },
  { id: 'first_day', name: 'Bienvenue!', description: 'Premier jour au bureau', icon: '\u{1F389}', target: 1 },
  { id: 'early_bird', name: 'Leve-tot', description: 'Connecte avant 8h', icon: '\u{1F305}', target: 1 },
  { id: 'night_owl', name: 'Oiseau de nuit', description: 'Connecte apres 22h', icon: '\u{1F989}', target: 1 },
  { id: 'social_butterfly', name: 'Papillon social', description: 'Visite les 6 zones en une journee', icon: '\u{1F98B}', target: 6 },
  { id: 'team_player', name: "Joueur d'equipe", description: '5 sessions 1-on-1', icon: '\u{1F91D}', target: 5 },
]

// ─── Cle localStorage ─────────────────────────────────────────────────────────

const STORAGE_KEY = 'capturia-badges'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createDefaultBadges(): Badge[] {
  return BADGE_DEFINITIONS.map((def) => ({
    ...def,
    unlockedAt: null,
    progress: 0,
    current: 0,
  }))
}

function loadBadgesFromStorage(): Badge[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultBadges()
    const saved: Badge[] = JSON.parse(raw)
    // Fusionner avec les definitions pour ajouter de nouveaux badges
    const savedMap = new Map(saved.map((b) => [b.id, b]))
    return BADGE_DEFINITIONS.map((def) => {
      const existing = savedMap.get(def.id)
      if (existing) {
        // Mettre a jour le nom/description/icon si la definition a change
        return { ...existing, name: def.name, description: def.description, icon: def.icon, target: def.target }
      }
      return { ...def, unlockedAt: null, progress: 0, current: 0 }
    })
  } catch {
    return createDefaultBadges()
  }
}

function saveBadgesToStorage(badges: Badge[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(badges))
  } catch {
    // Silencieusement ignorer (quota depasse, mode prive, etc.)
  }
}

// ─── Slice ────────────────────────────────────────────────────────────────────

const initialState: BadgeState = {
  badges: loadBadgesFromStorage(),
  showBadgePanel: false,
  newBadgeId: null,
}

export const badgeSlice = createSlice({
  name: 'badge',
  initialState,
  reducers: {
    updateBadgeProgress(
      state,
      action: PayloadAction<{ badgeId: string; current: number }>
    ) {
      const badge = state.badges.find((b) => b.id === action.payload.badgeId)
      if (!badge || badge.unlockedAt) return // deja debloque, ne rien faire
      badge.current = action.payload.current
      badge.progress = Math.min(100, Math.floor((badge.current / badge.target) * 100))
      saveBadgesToStorage(state.badges)
    },

    unlockBadge(state, action: PayloadAction<string>) {
      const badge = state.badges.find((b) => b.id === action.payload)
      if (!badge || badge.unlockedAt) return // deja debloque
      badge.unlockedAt = Date.now()
      badge.current = badge.target
      badge.progress = 100
      state.newBadgeId = badge.id
      saveBadgesToStorage(state.badges)
    },

    toggleBadgePanel(state) {
      state.showBadgePanel = !state.showBadgePanel
    },

    setShowBadgePanel(state, action: PayloadAction<boolean>) {
      state.showBadgePanel = action.payload
    },

    setNewBadge(state, action: PayloadAction<string | null>) {
      state.newBadgeId = action.payload
    },

    clearNewBadge(state) {
      state.newBadgeId = null
    },
  },
})

export const {
  updateBadgeProgress,
  unlockBadge,
  toggleBadgePanel,
  setShowBadgePanel,
  setNewBadge,
  clearNewBadge,
} = badgeSlice.actions

export default badgeSlice.reducer
