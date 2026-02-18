import Phaser from 'phaser'
import { ItemType } from '../../../types/Items'
import Item from './Item'

export default class VendingMachine extends Item {
  private steamParticles?: Phaser.GameObjects.Particles.ParticleEmitterManager

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
    super(scene, x, y, texture, frame)

    this.itemType = ItemType.VENDINGMACHINE
  }

  /** Demarre les particules de vapeur permanentes au-dessus de la machine */
  startSteam(): void {
    if (this.steamParticles) return
    if (!this.scene.textures.exists('particle_white')) return

    this.steamParticles = this.scene.add.particles('particle_white')
    this.steamParticles.setDepth(this.depth + 1)

    this.steamParticles.createEmitter({
      x: this.x,
      y: this.y - this.height * 0.4,
      speed: { min: 8, max: 25 },
      angle: { min: -100, max: -80 },
      scale: { start: 0.4, end: 0.05 },
      alpha: { start: 0.25, end: 0 },
      lifespan: 2000,
      frequency: 400,
      quantity: 1,
      tint: 0xcccccc,
      blendMode: 'ADD',
    })
  }

  onOverlapDialog(): void {
    this.setDialogBox('Appuie sur R pour prendre un café :)')
  }
}
