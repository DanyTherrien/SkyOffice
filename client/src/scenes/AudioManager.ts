import Phaser from 'phaser'

const AUDIO_PREFS_KEY = 'capturia-audio-prefs'

// ─── Types ───────────────────────────────────────────────────────────────

export interface AudioPrefs {
  ambientEnabled: boolean
  sfxEnabled: boolean
  ambientVolume: number
  sfxVolume: number
}

const DEFAULT_PREFS: AudioPrefs = {
  ambientEnabled: false,
  sfxEnabled: true,
  ambientVolume: 0.3,
  sfxVolume: 0.5,
}

// ─── Cles SFX exportees ─────────────────────────────────────────────────

export const SFX = {
  ZONE_CHIME: 'sfx_zone_chime',
  CHAT_POP: 'sfx_chat_pop',
  PLAYER_JOIN: 'sfx_player_join',
  PLAYER_LEAVE: 'sfx_player_leave',
  MEETING_START: 'sfx_meeting_start',
  UI_CLICK: 'sfx_ui_click',
  NOTIFICATION: 'sfx_notification',
} as const

// ─── Mapping zone → cle audio ambiante ──────────────────────────────────

const ZONE_AMBIENT: Record<string, string> = {
  brainstorm: 'ambient_brainstorm',
  meeting: 'ambient_meeting',
  deep_work: 'ambient_deepwork',
  sales: 'ambient_sales',
  afk: 'ambient_afk',
  one_on_one: 'ambient_one_on_one',
}

const CROSSFADE_MS = 1000

// ─── AudioManager ───────────────────────────────────────────────────────

/**
 * Gere l'audio d'ambiance (boucles par zone avec crossfade)
 * et les effets sonores ponctuels.
 * Respecte les preferences utilisateur (localStorage).
 */
export default class AudioManager {
  private scene: Phaser.Scene
  private prefs: AudioPrefs
  private currentAmbient: Phaser.Sound.BaseSound | null = null
  private currentZone = ''

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.prefs = this.loadPrefs()
  }

  // ─── Ambient par zone ─────────────────────────────────────────────────

  /** Crossfade vers la boucle ambiante de la nouvelle zone */
  setZone(zoneName: string): void {
    if (zoneName === this.currentZone) return
    this.currentZone = zoneName

    const newKey = ZONE_AMBIENT[zoneName]

    // Fade out le son actuel
    this.fadeOutCurrent()

    if (!newKey || !this.prefs.ambientEnabled) return
    if (!this.scene.cache.audio.exists(newKey)) return

    // Creer et fade in le nouveau son
    const newSound = this.scene.sound.add(newKey, { loop: true, volume: 0 })
    newSound.play()
    this.currentAmbient = newSound

    this.scene.tweens.add({
      targets: newSound,
      volume: this.prefs.ambientVolume,
      duration: CROSSFADE_MS,
    })
  }

  /** Fade out et detruit le son ambient courant */
  private fadeOutCurrent(): void {
    if (!this.currentAmbient) return
    const old = this.currentAmbient
    this.currentAmbient = null

    if ((old as Phaser.Sound.WebAudioSound).isPlaying) {
      this.scene.tweens.add({
        targets: old,
        volume: 0,
        duration: CROSSFADE_MS,
        onComplete: () => {
          old.stop()
          old.destroy()
        },
      })
    } else {
      old.destroy()
    }
  }

  // ─── Effets sonores ───────────────────────────────────────────────────

  /** Joue un effet sonore ponctuel */
  playSFX(key: string, volume?: number): void {
    if (!this.prefs.sfxEnabled) return
    if (!this.scene.cache.audio.exists(key)) return
    this.scene.sound.play(key, { volume: volume ?? this.prefs.sfxVolume })
  }

  // ─── Preferences ──────────────────────────────────────────────────────

  getPrefs(): AudioPrefs {
    return { ...this.prefs }
  }

  setAmbientEnabled(enabled: boolean): void {
    this.prefs.ambientEnabled = enabled
    this.savePrefs()
    if (enabled) {
      // Relancer l'ambient de la zone actuelle
      const zone = this.currentZone
      this.currentZone = ''
      this.setZone(zone)
    } else {
      this.fadeOutCurrent()
    }
  }

  setSfxEnabled(enabled: boolean): void {
    this.prefs.sfxEnabled = enabled
    this.savePrefs()
  }

  setAmbientVolume(volume: number): void {
    this.prefs.ambientVolume = Math.max(0, Math.min(1, volume))
    this.savePrefs()
    // Appliquer immediatement au son courant
    if (
      this.currentAmbient &&
      (this.currentAmbient as Phaser.Sound.WebAudioSound).isPlaying
    ) {
      const ambient = this.currentAmbient as Phaser.Sound.WebAudioSound
      ambient.volume = this.prefs.ambientVolume
    }
  }

  setSfxVolume(volume: number): void {
    this.prefs.sfxVolume = Math.max(0, Math.min(1, volume))
    this.savePrefs()
  }

  private loadPrefs(): AudioPrefs {
    try {
      const raw = localStorage.getItem(AUDIO_PREFS_KEY)
      if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
    } catch {
      // Preferences invalides, utiliser les defauts
    }
    return { ...DEFAULT_PREFS }
  }

  private savePrefs(): void {
    try {
      localStorage.setItem(AUDIO_PREFS_KEY, JSON.stringify(this.prefs))
    } catch {
      // localStorage plein ou indisponible
    }
  }

  /** Arrete tout et libere les ressources */
  destroy(): void {
    this.fadeOutCurrent()
  }
}
