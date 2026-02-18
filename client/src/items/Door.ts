import { ItemType } from '../../../types/Items'
import Item from './Item'

export interface DoorTarget {
  x: number
  y: number
}

export default class Door extends Item {
  /** Cote A de la porte (gauche ou haut) */
  sideA: DoorTarget = { x: 0, y: 0 }
  /** Cote B de la porte (droite ou bas) */
  sideB: DoorTarget = { x: 0, y: 0 }
  /** Orientation: 'vertical' = mur vertical (passage gauche↔droite), 'horizontal' = mur horizontal (passage haut↔bas) */
  orientation: 'vertical' | 'horizontal' = 'vertical'

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, frame)
    this.itemType = ItemType.DOOR
  }

  onOverlapDialog(): void {
    this.setDialogBox('Appuie sur E pour entrer')
  }

  /** Retourne la destination de teleportation (cote oppose au joueur) */
  getTeleportTarget(playerX: number, playerY: number): DoorTarget {
    if (this.orientation === 'vertical') {
      return playerX < this.x ? this.sideB : this.sideA
    } else {
      return playerY < this.y ? this.sideB : this.sideA
    }
  }
}
