import Phaser from 'phaser'

/** Couleurs et intensites d'eclairage par zone */
const ZONE_LIGHT_CONFIG: Record<string, { color: number; intensity: number; ambient: number }> = {
  brainstorm: { color: 0x3b82f6, intensity: 1.5, ambient: 0x6688aa },
  meeting: { color: 0xffa500, intensity: 1.3, ambient: 0x887766 },
  deep_work: { color: 0x8b5cf6, intensity: 1.0, ambient: 0x555566 },
  sales: { color: 0x22c55e, intensity: 1.4, ambient: 0x668866 },
  afk: { color: 0x6b7280, intensity: 0.8, ambient: 0x666666 },
  one_on_one: { color: 0xec4899, intensity: 1.2, ambient: 0x886677 },
}

/** Ambient de base selon le mode jour/nuit */
const DAY_AMBIENT = 0x888888
const NIGHT_AMBIENT = 0x334455

export default class LightingManager {
  private scene: Phaser.Scene
  private zoneLights: Phaser.GameObjects.Light[] = []
  private originalIntensities = new Map<Phaser.GameObjects.Light, number>()
  private isNight = false
  private currentZone = ''

  // Overlay colore pour la teinte de zone
  private zoneOverlay!: Phaser.GameObjects.Rectangle
  private currentOverlayColor = 0x000000
  private targetOverlayAlpha = 0

  constructor(scene: Phaser.Scene) {
    this.scene = scene

    // Activer le systeme de lumieres
    this.scene.lights.enable()
    this.scene.lights.setAmbientColor(DAY_AMBIENT)

    // Overlay semi-transparent pour la teinte de zone
    this.zoneOverlay = this.scene.add
      .rectangle(0, 0, 2000, 2000, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(999)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setOrigin(0)
  }

  /** Applique le pipeline Light2D sur un tilemap layer */
  enableLightOnLayer(layer: Phaser.Tilemaps.TilemapLayer): void {
    layer.setPipeline('Light2D')
  }

  /** Applique le pipeline Light2D sur tous les sprites d'un static group */
  enableLightOnGroup(group: Phaser.Physics.Arcade.StaticGroup): void {
    group.getChildren().forEach((child) => {
      if (child instanceof Phaser.GameObjects.Sprite || child instanceof Phaser.GameObjects.Image) {
        child.setPipeline('Light2D')
      }
    })
  }

  /** Ajoute des point lights aux positions strategiques d'une zone */
  addZoneLights(zones: Map<string, Phaser.Geom.Rectangle>): void {
    for (const [name, rect] of zones) {
      const config = ZONE_LIGHT_CONFIG[name]
      if (!config) continue

      // Lumiere centrale de la zone
      const centerX = rect.x + rect.width / 2
      const centerY = rect.y + rect.height / 2
      const light = this.scene.lights.addLight(centerX, centerY, 200, config.color, config.intensity)
      this.zoneLights.push(light)
      this.originalIntensities.set(light, config.intensity)
    }
  }

  /** Ajoute un point light a une position specifique (ordinateur, lampe, etc.) */
  addPointLight(x: number, y: number, color = 0xffffff, radius = 80, intensity = 0.8): Phaser.GameObjects.Light {
    const light = this.scene.lights.addLight(x, y, radius, color, intensity)
    this.zoneLights.push(light)
    this.originalIntensities.set(light, intensity)
    return light
  }

  /** Met a jour l'eclairage quand le joueur change de zone */
  setZone(zoneName: string): void {
    if (zoneName === this.currentZone) return
    this.currentZone = zoneName

    const config = ZONE_LIGHT_CONFIG[zoneName]
    if (!config) return

    // Mettre a jour l'ambient en combinant zone + jour/nuit
    const baseAmbient = this.isNight ? NIGHT_AMBIENT : DAY_AMBIENT
    const blended = this.blendColors(baseAmbient, config.ambient, 0.5)
    this.scene.lights.setAmbientColor(blended)

    // Tween l'overlay de zone
    const overlayColor = config.color
    const overlayAlpha = this.isNight ? 0.08 : 0.04

    this.zoneOverlay.setFillStyle(overlayColor, 1)
    this.scene.tweens.add({
      targets: this.zoneOverlay,
      alpha: overlayAlpha,
      duration: 800,
      ease: 'Sine.easeInOut',
    })
  }

  /** Bascule entre mode jour et nuit */
  setNightMode(isNight: boolean): void {
    this.isNight = isNight

    const config = ZONE_LIGHT_CONFIG[this.currentZone]
    const baseAmbient = isNight ? NIGHT_AMBIENT : DAY_AMBIENT
    const finalAmbient = config ? this.blendColors(baseAmbient, config.ambient, 0.5) : baseAmbient

    this.scene.lights.setAmbientColor(finalAmbient)

    // Ajuster l'intensite de toutes les lumieres de zone (a partir de la valeur originale)
    this.zoneLights.forEach((light) => {
      const base = this.originalIntensities.get(light) ?? light.intensity
      light.setIntensity(isNight ? base * 1.3 : base)
    })

    // Ajuster l'overlay
    if (config) {
      this.targetOverlayAlpha = isNight ? 0.08 : 0.04
      this.scene.tweens.add({
        targets: this.zoneOverlay,
        alpha: this.targetOverlayAlpha,
        duration: 1000,
        ease: 'Sine.easeInOut',
      })
    }
  }

  /** Melange deux couleurs avec un ratio (0 = colorA, 1 = colorB) */
  private blendColors(colorA: number, colorB: number, ratio: number): number {
    const rA = (colorA >> 16) & 0xff
    const gA = (colorA >> 8) & 0xff
    const bA = colorA & 0xff
    const rB = (colorB >> 16) & 0xff
    const gB = (colorB >> 8) & 0xff
    const bB = colorB & 0xff

    const r = Math.round(rA + (rB - rA) * ratio)
    const g = Math.round(gA + (gB - gA) * ratio)
    const b = Math.round(bA + (bB - bA) * ratio)

    return (r << 16) | (g << 8) | b
  }

  /** 2F — Flash de transition de zone: double brievement l'alpha de l'overlay puis settle */
  flashTransition(): void {
    const peakAlpha = Math.min((this.zoneOverlay.alpha || 0.04) * 2.5, 0.25)
    const settleAlpha = this.isNight ? 0.08 : 0.04
    this.scene.tweens.add({
      targets: this.zoneOverlay,
      alpha: peakAlpha,
      duration: 80,
      ease: 'Sine.easeIn',
      yoyo: true,
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.zoneOverlay,
          alpha: settleAlpha,
          duration: 400,
          ease: 'Sine.easeOut',
        })
      },
    })
  }

  /** Ajoute des ombres elliptiques sous chaque sprite d'un group */
  addShadowsToGroup(group: Phaser.Physics.Arcade.StaticGroup): void {
    group.getChildren().forEach((child) => {
      if (child instanceof Phaser.GameObjects.Sprite) {
        const shadow = this.scene.add.ellipse(
          child.x + 2,
          child.y + child.height * 0.3,
          child.width * 0.7,
          8,
          0x000000,
          0.25
        )
        shadow.setDepth(child.depth - 1)
      }
    })
  }

  /** Ajoute une ombre sous un item individuel */
  addShadowToItem(item: Phaser.GameObjects.Sprite): void {
    const shadow = this.scene.add.ellipse(
      item.x + 2,
      item.y + item.height * 0.25,
      item.width * 0.6,
      6,
      0x000000,
      0.2
    )
    shadow.setDepth(item.depth - 1)
  }
}
