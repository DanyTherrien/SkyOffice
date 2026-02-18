import Phaser from 'phaser'

/** Couleurs de particules par zone */
const ZONE_COLORS: Record<string, number> = {
  brainstorm: 0xfbbf24, // jaune/or — etincelles d'idees
  meeting: 0xe0e0e0, // blanc/gris — documents flottants
  deep_work: 0x8b5cf6, // violet — zen meditatif
  sales: 0x22c55e, // vert — energie
  afk: 0x6b7280, // gris — subtil, repos
  one_on_one: 0xec4899, // rose — prive, chaleureux
}

/** Config des particules ambiantes par zone */
const AMBIENT_CONFIG: Record<
  string,
  { speed: number; freq: number; life: number; alpha: number; scale: number }
> = {
  brainstorm: { speed: 12, freq: 2500, life: 4000, alpha: 0.35, scale: 0.5 },
  meeting: { speed: 15, freq: 3000, life: 3000, alpha: 0.2, scale: 0.3 },
  deep_work: { speed: 6, freq: 4000, life: 5000, alpha: 0.25, scale: 0.4 },
  sales: { speed: 25, freq: 1800, life: 2500, alpha: 0.45, scale: 0.5 },
  afk: { speed: 4, freq: 5000, life: 6000, alpha: 0.15, scale: 0.3 },
  one_on_one: { speed: 10, freq: 3000, life: 3500, alpha: 0.3, scale: 0.4 },
}

export default class ZoneParticleManager {
  private scene: Phaser.Scene
  private zones: Map<string, Phaser.Geom.Rectangle>
  private currentZone = ''

  // Burst (one-shot)
  private burstManager: Phaser.GameObjects.Particles.ParticleEmitterManager
  private burstColor = 0xffffff
  private burstEmitter: Phaser.GameObjects.Particles.ParticleEmitter

  // Ambient (continuous)
  private ambientManager: Phaser.GameObjects.Particles.ParticleEmitterManager | null = null

  // Banniere de transition
  private bannerText: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene, zones: Map<string, Phaser.Geom.Rectangle>) {
    this.scene = scene
    this.zones = zones

    // Systeme de burst reutilisable
    this.burstManager = scene.add.particles('particle_white')
    this.burstManager.setDepth(950)

    this.burstEmitter = this.burstManager.createEmitter({
      speed: { min: 40, max: 140 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 600,
      blendMode: 'ADD',
      tint: { onEmit: () => this.burstColor },
      on: false,
    })

    // Banniere de nom de zone (fixe a la camera)
    this.bannerText = scene.add
      .text(0, 0, '', {
        fontSize: '36px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setOrigin(0.5)
      .setDepth(1100)
      .setAlpha(0)
  }

  /** Appele quand le joueur change de zone */
  onZoneChanged(zoneName: string, playerX: number, playerY: number, displayName: string): void {
    if (zoneName === this.currentZone) return
    this.currentZone = zoneName

    const color = ZONE_COLORS[zoneName]
    if (color === undefined) return

    // 1. Burst colore a la position du joueur
    this.burstColor = color
    this.burstEmitter.explode(12, playerX, playerY)

    // 2. Banniere du nom de zone
    this.showBanner(displayName, color)

    // 3. Relancer les particules ambiantes
    this.startAmbient(zoneName)
  }

  /** Affiche le nom de zone au centre de l'ecran avec fade in/out */
  private showBanner(name: string, color: number): void {
    const hex = '#' + color.toString(16).padStart(6, '0')
    this.bannerText.setText(name)
    this.bannerText.setColor(hex)

    // Centrer dans la camera
    const cam = this.scene.cameras.main
    this.bannerText.setPosition(cam.width / 2, cam.height / 2 - 40)

    // Animation: zoom-in + fade in → hold → fade out
    this.scene.tweens.killTweensOf(this.bannerText)
    this.bannerText.setAlpha(0).setScale(0.8)

    this.scene.tweens.add({
      targets: this.bannerText,
      alpha: 1,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut',
      yoyo: true,
      hold: 700,
      onComplete: () => {
        this.bannerText.setAlpha(0)
      },
    })
  }

  /** Demarre les particules ambiantes pour une zone */
  private startAmbient(zoneName: string): void {
    // Detruire les precedentes
    if (this.ambientManager) {
      this.ambientManager.destroy()
      this.ambientManager = null
    }

    const zone = this.zones.get(zoneName)
    const color = ZONE_COLORS[zoneName]
    const cfg = AMBIENT_CONFIG[zoneName]
    if (!zone || color === undefined || !cfg) return

    this.ambientManager = this.scene.add.particles('particle_white')
    this.ambientManager.setDepth(900)

    this.ambientManager.createEmitter({
      speed: { min: cfg.speed * 0.3, max: cfg.speed },
      angle: { min: 0, max: 360 },
      scale: { start: cfg.scale, end: 0 },
      alpha: { start: cfg.alpha, end: 0 },
      lifespan: cfg.life,
      blendMode: 'ADD',
      tint: color,
      frequency: cfg.freq,
      quantity: 1,
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(zone.x, zone.y, zone.width, zone.height) as any,
      },
    })
  }

  /** Burst vert — un joueur rejoint le bureau */
  burstJoin(x: number, y: number): void {
    this.burstColor = 0x22c55e
    this.burstEmitter.explode(8, x, y)
  }

  /** Burst gris — un joueur quitte le bureau */
  burstLeave(x: number, y: number): void {
    this.burstColor = 0x888888
    this.burstEmitter.explode(6, x, y)
  }
}
