import { ItemType } from '../../../types/Items'
import store from '../stores'
import Item from './Item'
import Network from '../services/Network'
import { openComputerDialog } from '../stores/ComputerStore'

export default class Computer extends Item {
  id?: string
  currentUsers = new Set<string>()

  // Effet glow quand l'ordinateur est utilise
  private glowGraphics?: Phaser.GameObjects.Graphics
  private glowTween?: Phaser.Tweens.Tween

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
    super(scene, x, y, texture, frame)

    this.itemType = ItemType.COMPUTER
  }

  /** Demarre le cercle lumineux pulsant derriere l'ordinateur */
  private startGlow(): void {
    if (this.glowGraphics) return

    this.glowGraphics = this.scene.add.graphics()
    this.glowGraphics.fillStyle(0x88ccff, 0.3)
    this.glowGraphics.fillCircle(this.x, this.y, 40)
    this.glowGraphics.setDepth(this.depth - 1)
    this.glowGraphics.setAlpha(0.3)

    this.glowTween = this.scene.tweens.add({
      targets: this.glowGraphics,
      alpha: { from: 0.3, to: 0.6 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  /** Arrete le glow */
  private stopGlow(): void {
    if (this.glowTween) {
      this.glowTween.destroy()
      this.glowTween = undefined
    }
    if (this.glowGraphics) {
      this.glowGraphics.destroy()
      this.glowGraphics = undefined
    }
  }

  private updateStatus() {
    if (!this.currentUsers) return
    const numberOfUsers = this.currentUsers.size
    this.clearStatusBox()
    if (numberOfUsers === 1) {
      this.setStatusBox(`${numberOfUsers} utilisateur`)
    } else if (numberOfUsers > 1) {
      this.setStatusBox(`${numberOfUsers} utilisateurs`)
    }
  }

  onOverlapDialog(): void {
    if (this.currentUsers.size === 0) {
      this.setDialogBox('Appuie sur R pour utiliser l\'ordinateur')
    } else {
      this.setDialogBox('Appuie sur R pour rejoindre')
    }
  }

  addCurrentUser(userId: string): void {
    if (!this.currentUsers || this.currentUsers.has(userId)) return
    this.currentUsers.add(userId)
    this.updateStatus()
    if (this.currentUsers.size === 1) this.startGlow()
  }

  removeCurrentUser(userId: string): void {
    if (!this.currentUsers || !this.currentUsers.has(userId)) return
    this.currentUsers.delete(userId)
    this.updateStatus()
    if (this.currentUsers.size === 0) this.stopGlow()
  }

  openDialog(playerId: string, network: Network): void {
    if (!this.id) return
    store.dispatch(openComputerDialog({ computerId: this.id, myUserId: playerId }))
    network.connectToComputer(this.id)
  }
}
