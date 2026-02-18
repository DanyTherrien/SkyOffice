/**
 * Service de notifications centralisé.
 * Joue des sons et envoie des notifications desktop selon les preferences utilisateur.
 */
import store from '../stores'
import { pushToast } from '../stores/ToastStore'
import { playNotificationSound } from './notificationSounds'
import { ZONE_NAMES } from '../constants'

/** Verifie si les sons sont actives dans le store */
function isSoundEnabled(): boolean {
  return store.getState().notification.soundEnabled
}

/** Verifie si les notifications desktop sont activees */
function isDesktopEnabled(): boolean {
  return store.getState().notification.desktopEnabled
}

/** Verifie si l'onglet du navigateur est visible */
function isPageHidden(): boolean {
  return typeof document !== 'undefined' && document.hidden
}

/** Envoie une notification desktop si l'onglet est en arriere-plan */
function sendDesktopNotification(title: string, body: string) {
  if (!isDesktopEnabled()) return
  if (!isPageHidden()) return
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return

  try {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'capturia-' + Date.now(),
    })
  } catch {
    // Certains navigateurs ne supportent pas le constructeur Notification
  }
}

/** Demande la permission pour les notifications desktop */
export async function requestDesktopPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false

  try {
    const result = await Notification.requestPermission()
    return result === 'granted'
  } catch {
    return false
  }
}

/** Verifie si le joueur local est dans la zone AFK (pas besoin de notifications) */
function isLocalPlayerAfk(): boolean {
  const state = store.getState().user
  if (!state.sessionId) return false
  const sanitizedId = state.sessionId.replace(/[^0-9a-z]/gi, 'G')
  const myZone = state.playerZoneMap.get(sanitizedId)
  return myZone === 'afk'
}

// ─── Notifications specifiques ──────────────────────────────────────────────

/** Un collegue entre dans votre zone */
export function notifyPlayerEnteredZone(playerName: string, zone: string): void {
  if (isLocalPlayerAfk()) return
  if (isSoundEnabled()) {
    playNotificationSound('enter')
  }
  const zoneName = ZONE_NAMES[zone] || zone
  store.dispatch(pushToast({ message: `${playerName} est entre(e) dans ${zoneName}` }))
  sendDesktopNotification(
    'Capturia Office',
    `${playerName} est entre(e) dans ${zoneName}`
  )
}

/** Un collegue quitte votre zone */
export function notifyPlayerLeftZone(playerName: string, zone: string): void {
  if (isLocalPlayerAfk()) return
  if (isSoundEnabled()) {
    playNotificationSound('leave')
  }
  const zoneName = ZONE_NAMES[zone] || zone
  store.dispatch(pushToast({ message: `${playerName} a quitte ${zoneName}` }))
  sendDesktopNotification(
    'Capturia Office',
    `${playerName} a quitte ${zoneName}`
  )
}

/** Nouveau message de chat */
export function notifyChatMessage(author: string, content: string): void {
  if (isLocalPlayerAfk()) return
  if (isSoundEnabled()) {
    playNotificationSound('message')
  }
  const preview = content.length > 60 ? content.slice(0, 60) + '...' : content
  sendDesktopNotification(
    `Message de ${author}`,
    preview
  )
}

/** Un collegue rejoint le bureau */
export function notifyPlayerJoinedOffice(playerName: string): void {
  if (isLocalPlayerAfk()) return
  if (isSoundEnabled()) {
    playNotificationSound('enter')
  }
  store.dispatch(pushToast({ message: `${playerName} a rejoint le bureau`, type: 'success' }))
  sendDesktopNotification(
    'Capturia Office',
    `${playerName} a rejoint le bureau`
  )
}

/** Un collegue quitte le bureau */
export function notifyPlayerLeftOffice(playerName: string): void {
  if (isLocalPlayerAfk()) return
  if (isSoundEnabled()) {
    playNotificationSound('leave')
  }
  store.dispatch(pushToast({ message: `${playerName} a quitte le bureau`, type: 'warning' }))
  sendDesktopNotification(
    'Capturia Office',
    `${playerName} a quitte le bureau`
  )
}
