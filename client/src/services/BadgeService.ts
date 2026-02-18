import store from '../stores'
import { updateBadgeProgress, unlockBadge } from '../stores/BadgeStore'
import { pushToast } from '../stores/ToastStore'
import { ZONE_ORDER } from '../constants'

// ─── Cles localStorage pour le suivi persistant ──────────────────────────────

const ZONE_TIME_KEY = 'capturia-badge-zone-time'       // Record<zone, minutes cumulees>
const ZONE_VISITS_KEY = 'capturia-badge-zone-visits'    // Record<zone, nombre de sessions>
const DAILY_ZONES_KEY = 'capturia-badge-daily-zones'    // { date: string, zones: string[] }
const ONE_ON_ONE_KEY = 'capturia-badge-one-on-one'      // nombre de sessions 1-on-1

// ─── Helpers de persistance ──────────────────────────────────────────────────

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Silencieusement ignorer
  }
}

// ─── BadgeService ────────────────────────────────────────────────────────────

class BadgeService {
  private zoneEntryTime: number | null = null
  private currentZone: string | null = null
  private timeCheckInterval: ReturnType<typeof setInterval> | null = null

  /** Demarre le suivi periodique (appeler une seule fois au login) */
  start() {
    // Verifier les badges de connexion
    this.checkLoginBadges()

    // Verifier le temps passe chaque minute
    this.timeCheckInterval = setInterval(() => {
      this.tickTimeInZone()
    }, 60_000) // 1 minute
  }

  /** Arrete le suivi (appeler au logout si necessaire) */
  stop() {
    // Enregistrer le temps restant dans la zone courante
    this.flushCurrentZoneTime()
    if (this.timeCheckInterval) {
      clearInterval(this.timeCheckInterval)
      this.timeCheckInterval = null
    }
  }

  /** Appele quand le joueur entre dans une nouvelle zone */
  checkZoneEntry(zone: string) {
    // Enregistrer le temps passe dans l'ancienne zone
    this.flushCurrentZoneTime()

    // Demarrer le chrono pour la nouvelle zone
    this.currentZone = zone
    this.zoneEntryTime = Date.now()

    // Incrementer le compteur de visites de cette zone
    this.incrementZoneVisitCount(zone)

    // Verifier le badge "Papillon social" (6 zones en une journee)
    this.checkSocialButterfly(zone)

    // Verifier les badges de sessions par zone
    this.checkZoneSessionBadges(zone)
  }

  /** Verifie les badges lies a l'heure de connexion */
  checkLoginBadges() {
    const state = store.getState().badge
    const hour = new Date().getHours()

    // Badge "Bienvenue!" — premier jour
    const firstDayBadge = state.badges.find((b) => b.id === 'first_day')
    if (firstDayBadge && !firstDayBadge.unlockedAt) {
      this.awardBadge('first_day')
    }

    // Badge "Leve-tot" — connecte avant 8h
    if (hour < 8) {
      const earlyBadge = state.badges.find((b) => b.id === 'early_bird')
      if (earlyBadge && !earlyBadge.unlockedAt) {
        this.awardBadge('early_bird')
      }
    }

    // Badge "Oiseau de nuit" — connecte apres 22h
    if (hour >= 22) {
      const nightBadge = state.badges.find((b) => b.id === 'night_owl')
      if (nightBadge && !nightBadge.unlockedAt) {
        this.awardBadge('night_owl')
      }
    }
  }

  // ─── Methodes internes ────────────────────────────────────────────────────

  /** Enregistre le temps passe dans la zone courante */
  private flushCurrentZoneTime() {
    if (!this.currentZone || !this.zoneEntryTime) return
    const minutes = (Date.now() - this.zoneEntryTime) / 60_000
    if (minutes < 0.1) return // ignorer les micro-visites

    const zoneTime = loadJSON<Record<string, number>>(ZONE_TIME_KEY, {})
    zoneTime[this.currentZone] = (zoneTime[this.currentZone] || 0) + minutes
    saveJSON(ZONE_TIME_KEY, zoneTime)

    // Reset le chrono
    this.zoneEntryTime = Date.now()

    // Verifier les badges de temps
    this.checkTimeBadges(zoneTime)
  }

  /** Tick periodique: enregistre le temps dans la zone courante */
  private tickTimeInZone() {
    this.flushCurrentZoneTime()
  }

  /** Verifie les badges lies au temps cumule dans les zones */
  private checkTimeBadges(zoneTime: Record<string, number>) {
    const deepWorkMinutes = zoneTime['deep_work'] || 0

    // Badge "Concentre" — 1h en Deep Work
    const focus1h = store.getState().badge.badges.find((b) => b.id === 'deep_focus_1h')
    if (focus1h && !focus1h.unlockedAt) {
      store.dispatch(updateBadgeProgress({ badgeId: 'deep_focus_1h', current: Math.floor(deepWorkMinutes) }))
      if (deepWorkMinutes >= 60) {
        this.awardBadge('deep_focus_1h')
      }
    }

    // Badge "Moine du code" — 10h en Deep Work
    const focus10h = store.getState().badge.badges.find((b) => b.id === 'deep_focus_10h')
    if (focus10h && !focus10h.unlockedAt) {
      store.dispatch(updateBadgeProgress({ badgeId: 'deep_focus_10h', current: Math.floor(deepWorkMinutes) }))
      if (deepWorkMinutes >= 600) {
        this.awardBadge('deep_focus_10h')
      }
    }
  }

  /** Incremente le compteur de visites d'une zone */
  private incrementZoneVisitCount(zone: string) {
    const visits = loadJSON<Record<string, number>>(ZONE_VISITS_KEY, {})
    visits[zone] = (visits[zone] || 0) + 1
    saveJSON(ZONE_VISITS_KEY, visits)

    // Mettre a jour le compteur 1-on-1 separement
    if (zone === 'one_on_one') {
      const oneOnOneCount = loadJSON<number>(ONE_ON_ONE_KEY, 0) + 1
      saveJSON(ONE_ON_ONE_KEY, oneOnOneCount)
      this.checkTeamPlayerBadge(oneOnOneCount)
    }
  }

  /** Verifie les badges de sessions par zone */
  private checkZoneSessionBadges(zone: string) {
    const visits = loadJSON<Record<string, number>>(ZONE_VISITS_KEY, {})

    if (zone === 'brainstorm') {
      const count = visits['brainstorm'] || 0
      // Badge "Generateur d'idees" — 5 sessions
      const bs5 = store.getState().badge.badges.find((b) => b.id === 'brainstorm_5')
      if (bs5 && !bs5.unlockedAt) {
        store.dispatch(updateBadgeProgress({ badgeId: 'brainstorm_5', current: count }))
        if (count >= 5) this.awardBadge('brainstorm_5')
      }
      // Badge "Cerveau en feu" — 20 sessions
      const bs20 = store.getState().badge.badges.find((b) => b.id === 'brainstorm_20')
      if (bs20 && !bs20.unlockedAt) {
        store.dispatch(updateBadgeProgress({ badgeId: 'brainstorm_20', current: count }))
        if (count >= 20) this.awardBadge('brainstorm_20')
      }
    }

    if (zone === 'sales') {
      const count = visits['sales'] || 0
      // Badge "Vendeur junior" — 10 sessions
      const s10 = store.getState().badge.badges.find((b) => b.id === 'sales_calls_10')
      if (s10 && !s10.unlockedAt) {
        store.dispatch(updateBadgeProgress({ badgeId: 'sales_calls_10', current: count }))
        if (count >= 10) this.awardBadge('sales_calls_10')
      }
      // Badge "Closer" — 50 sessions
      const s50 = store.getState().badge.badges.find((b) => b.id === 'sales_calls_50')
      if (s50 && !s50.unlockedAt) {
        store.dispatch(updateBadgeProgress({ badgeId: 'sales_calls_50', current: count }))
        if (count >= 50) this.awardBadge('sales_calls_50')
      }
    }

    if (zone === 'meeting') {
      const count = visits['meeting'] || 0
      // Badge "Reunioniste" — 10 reunions
      const m10 = store.getState().badge.badges.find((b) => b.id === 'meetings_10')
      if (m10 && !m10.unlockedAt) {
        store.dispatch(updateBadgeProgress({ badgeId: 'meetings_10', current: count }))
        if (count >= 10) this.awardBadge('meetings_10')
      }
    }
  }

  /** Verifie le badge "Papillon social" — 6 zones en une journee */
  private checkSocialButterfly(zone: string) {
    const today = new Date().toISOString().slice(0, 10)
    const data = loadJSON<{ date: string; zones: string[] }>(DAILY_ZONES_KEY, { date: today, zones: [] })

    // Reset si c'est un nouveau jour
    if (data.date !== today) {
      data.date = today
      data.zones = []
    }

    // Ajouter la zone si pas encore visitee aujourd'hui
    if (!data.zones.includes(zone)) {
      data.zones.push(zone)
    }
    saveJSON(DAILY_ZONES_KEY, data)

    // Mettre a jour la progression
    const badge = store.getState().badge.badges.find((b) => b.id === 'social_butterfly')
    if (badge && !badge.unlockedAt) {
      store.dispatch(updateBadgeProgress({ badgeId: 'social_butterfly', current: data.zones.length }))

      // Verifier si toutes les zones ont ete visitees
      const allZones = ZONE_ORDER as readonly string[]
      const visitedAll = allZones.every((z) => data.zones.includes(z))
      if (visitedAll) {
        this.awardBadge('social_butterfly')
      }
    }
  }

  /** Verifie le badge "Joueur d'equipe" — 5 sessions 1-on-1 */
  private checkTeamPlayerBadge(count: number) {
    const badge = store.getState().badge.badges.find((b) => b.id === 'team_player')
    if (badge && !badge.unlockedAt) {
      store.dispatch(updateBadgeProgress({ badgeId: 'team_player', current: count }))
      if (count >= 5) this.awardBadge('team_player')
    }
  }

  /** Debloque un badge et affiche un toast de celebration */
  private awardBadge(badgeId: string) {
    const state = store.getState().badge
    const badge = state.badges.find((b) => b.id === badgeId)
    if (!badge || badge.unlockedAt) return // deja debloque

    store.dispatch(unlockBadge(badgeId))

    // Toast de celebration
    const updatedBadge = store.getState().badge.badges.find((b) => b.id === badgeId)
    if (updatedBadge) {
      store.dispatch(
        pushToast({
          message: `\u{1F3C6} Badge debloque : ${updatedBadge.name} !`,
          type: 'success',
        })
      )
    }
  }
}

// Singleton
const badgeService = new BadgeService()
export default badgeService
