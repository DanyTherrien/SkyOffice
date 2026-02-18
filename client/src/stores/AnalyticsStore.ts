import { createSlice, PayloadAction } from '@reduxjs/toolkit'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ZoneTimeEntry {
  zone: string
  enterTime: number   // epoch ms
  exitTime: number | null  // null si encore dans la zone
}

export interface PlayerAnalytics {
  playerId: string
  playerName: string
  zoneTimes: ZoneTimeEntry[]   // historique de toutes les visites de zone
}

interface AnalyticsState {
  playerAnalytics: Record<string, PlayerAnalytics>  // cle = playerId
  panelOpen: boolean
}

// ─── localStorage persistence ───────────────────────────────────────────────

function getTodayKey(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `capturia-analytics-${yyyy}-${mm}-${dd}`
}

function loadTodayAnalytics(): Record<string, PlayerAnalytics> {
  try {
    const raw = localStorage.getItem(getTodayKey())
    if (raw) {
      return JSON.parse(raw)
    }
  } catch {
    // Silencieusement ignorer
  }
  return {}
}

function saveTodayAnalytics(data: Record<string, PlayerAnalytics>) {
  try {
    localStorage.setItem(getTodayKey(), JSON.stringify(data))
  } catch {
    // Silencieusement ignorer (quota depasse, mode prive, etc.)
  }
}

// ─── Etat initial ───────────────────────────────────────────────────────────

const initialState: AnalyticsState = {
  playerAnalytics: loadTodayAnalytics(),
  panelOpen: false,
}

// ─── Slice ──────────────────────────────────────────────────────────────────

export const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    recordZoneEntry: (
      state,
      action: PayloadAction<{ playerId: string; playerName: string; zone: string }>
    ) => {
      const { playerId, playerName, zone } = action.payload
      if (!state.playerAnalytics[playerId]) {
        state.playerAnalytics[playerId] = {
          playerId,
          playerName,
          zoneTimes: [],
        }
      }
      // Mettre a jour le nom au cas ou il aurait change
      state.playerAnalytics[playerId].playerName = playerName
      state.playerAnalytics[playerId].zoneTimes.push({
        zone,
        enterTime: Date.now(),
        exitTime: null,
      })
      saveTodayAnalytics(state.playerAnalytics)
    },

    recordZoneExit: (state, action: PayloadAction<{ playerId: string }>) => {
      const { playerId } = action.payload
      const analytics = state.playerAnalytics[playerId]
      if (!analytics) return
      // Fermer la derniere entree ouverte (parcours inverse)
      for (let i = analytics.zoneTimes.length - 1; i >= 0; i--) {
        if (analytics.zoneTimes[i].exitTime === null) {
          analytics.zoneTimes[i].exitTime = Date.now()
          break
        }
      }
      saveTodayAnalytics(state.playerAnalytics)
    },

    toggleAnalyticsPanel: (state) => {
      state.panelOpen = !state.panelOpen
    },

    openAnalyticsPanel: (state) => {
      state.panelOpen = true
    },

    closeAnalyticsPanel: (state) => {
      state.panelOpen = false
    },

    clearAnalytics: (state) => {
      state.playerAnalytics = {}
      saveTodayAnalytics(state.playerAnalytics)
    },
  },
})

export const {
  recordZoneEntry,
  recordZoneExit,
  toggleAnalyticsPanel,
  openAnalyticsPanel,
  closeAnalyticsPanel,
  clearAnalytics,
} = analyticsSlice.actions

// ─── Selecteurs helper ──────────────────────────────────────────────────────

/** Temps total (ms) passe par un joueur dans une zone specifique */
export function getPlayerTimeInZone(
  analytics: Record<string, PlayerAnalytics>,
  playerId: string,
  zone: string
): number {
  const player = analytics[playerId]
  if (!player) return 0
  return player.zoneTimes
    .filter((e) => e.zone === zone)
    .reduce((total, e) => {
      const end = e.exitTime ?? Date.now()
      return total + (end - e.enterTime)
    }, 0)
}

/** Distribution totale du temps par zone, tous joueurs confondus */
export function getZoneDistribution(
  analytics: Record<string, PlayerAnalytics>
): Record<string, number> {
  const dist: Record<string, number> = {}
  Object.values(analytics).forEach((player) => {
    player.zoneTimes.forEach((e) => {
      const end = e.exitTime ?? Date.now()
      const duration = end - e.enterTime
      dist[e.zone] = (dist[e.zone] || 0) + duration
    })
  })
  return dist
}

/** Filtrer uniquement les entrees d'aujourd'hui */
export function getTodayStats(
  analytics: Record<string, PlayerAnalytics>
): Record<string, PlayerAnalytics> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startOfDay = today.getTime()

  const result: Record<string, PlayerAnalytics> = {}
  Object.entries(analytics).forEach(([id, player]) => {
    const todayEntries = player.zoneTimes.filter(
      (e) => e.enterTime >= startOfDay || (e.exitTime !== null && e.exitTime >= startOfDay)
    )
    if (todayEntries.length > 0) {
      result[id] = { ...player, zoneTimes: todayEntries }
    }
  })
  return result
}

/** Temps total en ligne d'un joueur (somme de toutes les entrees) */
export function getPlayerTotalTime(
  analytics: Record<string, PlayerAnalytics>,
  playerId: string
): number {
  const player = analytics[playerId]
  if (!player) return 0
  return player.zoneTimes.reduce((total, e) => {
    const end = e.exitTime ?? Date.now()
    return total + (end - e.enterTime)
  }, 0)
}

/** Plus longue session continue dans une zone donnee */
export function getLongestSession(
  analytics: Record<string, PlayerAnalytics>,
  playerId: string,
  zone: string
): number {
  const player = analytics[playerId]
  if (!player) return 0
  return player.zoneTimes
    .filter((e) => e.zone === zone)
    .reduce((longest, e) => {
      const end = e.exitTime ?? Date.now()
      const duration = end - e.enterTime
      return Math.max(longest, duration)
    }, 0)
}

/** Distribution du temps par zone pour un joueur specifique */
export function getPlayerZoneDistribution(
  analytics: Record<string, PlayerAnalytics>,
  playerId: string
): Record<string, number> {
  const player = analytics[playerId]
  if (!player) return {}
  const dist: Record<string, number> = {}
  player.zoneTimes.forEach((e) => {
    const end = e.exitTime ?? Date.now()
    const duration = end - e.enterTime
    dist[e.zone] = (dist[e.zone] || 0) + duration
  })
  return dist
}

export default analyticsSlice.reducer
