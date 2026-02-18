import Phaser from 'phaser'
import { ItemType } from '../../../types/Items'

export default class Item extends Phaser.Physics.Arcade.Sprite {
  private dialogBox!: Phaser.GameObjects.Container
  private statusBox!: Phaser.GameObjects.Container
  itemType!: ItemType

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
    super(scene, x, y, texture, frame)

    // add dialogBox and statusBox containers on top of everything which we can add text in later
    this.dialogBox = this.scene.add.container().setDepth(10000)
    this.statusBox = this.scene.add.container().setDepth(10000)
  }

  // add texts into dialog box container (styled dark prompt)
  setDialogBox(text: string): void {
    // Extraire le badge touche si le texte contient "Appuie sur X" ou "Press X"
    const keyMatch = text.match(/(?:Appuie sur|Press)\s+(\w)/i)
    const keyLabel = keyMatch ? keyMatch[1].toUpperCase() : ''
    const displayText = keyLabel ? text : text

    const innerText = this.scene.add
      .text(0, 0, displayText)
      .setFontFamily('Arial')
      .setFontSize(11)
      .setColor('#e2e8f0')

    // Badge touche [R] en teal
    let badgeWidth = 0
    let badge: Phaser.GameObjects.Text | null = null
    if (keyLabel) {
      badge = this.scene.add
        .text(0, 0, `[${keyLabel}]`)
        .setFontFamily('Arial')
        .setFontSize(11)
        .setFontStyle('bold')
        .setColor('#14b8a6')
      badgeWidth = badge.width + 6
    }

    const padding = 8
    const dialogBoxWidth = innerText.width + badgeWidth + padding * 2
    const dialogBoxHeight = innerText.height + padding
    const dialogBoxX = this.x - dialogBoxWidth * 0.5
    const dialogBoxY = this.y - this.height * 0.5 - dialogBoxHeight - 4

    // Fond sombre arrondi avec bordure teal
    const bg = this.scene.add.graphics()
    bg.fillStyle(0x222639, 0.92)
    bg.fillRoundedRect(dialogBoxX, dialogBoxY, dialogBoxWidth, dialogBoxHeight, 5)
    bg.lineStyle(1.5, 0x14b8a6, 0.8)
    bg.strokeRoundedRect(dialogBoxX, dialogBoxY, dialogBoxWidth, dialogBoxHeight, 5)

    this.dialogBox.add(bg)

    if (badge) {
      badge.setPosition(dialogBoxX + padding, dialogBoxY + padding * 0.5)
      this.dialogBox.add(badge)
      innerText.setPosition(dialogBoxX + padding + badgeWidth, dialogBoxY + padding * 0.5)
    } else {
      innerText.setPosition(dialogBoxX + padding, dialogBoxY + padding * 0.5)
    }
    this.dialogBox.add(innerText)

    // Animation bounce-in
    this.dialogBox.setScale(0.5)
    this.dialogBox.setAlpha(0)
    this.scene.tweens.add({
      targets: this.dialogBox,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 250,
      ease: 'Back.easeOut',
    })
  }

  // remove everything in the dialog box container
  clearDialogBox(): void {
    this.dialogBox.removeAll(true)
  }

  // add text into status box container (styled dark prompt)
  setStatusBox(text: string): void {
    const innerText = this.scene.add
      .text(0, 0, text)
      .setFontFamily('Arial')
      .setFontSize(11)
      .setColor('#e2e8f0')

    const padding = 8
    const statusBoxWidth = innerText.width + padding * 2
    const statusBoxHeight = innerText.height + padding
    const statusBoxX = this.x - statusBoxWidth * 0.5
    const statusBoxY = this.y - this.height * 0.25

    const bg = this.scene.add.graphics()
    bg.fillStyle(0x222639, 0.92)
    bg.fillRoundedRect(statusBoxX, statusBoxY, statusBoxWidth, statusBoxHeight, 5)
    bg.lineStyle(1.5, 0x14b8a6, 0.8)
    bg.strokeRoundedRect(statusBoxX, statusBoxY, statusBoxWidth, statusBoxHeight, 5)

    this.statusBox.add(bg)
    this.statusBox.add(innerText.setPosition(statusBoxX + padding, statusBoxY + padding * 0.5))
  }

  // remove everything in the status box container
  clearStatusBox(): void {
    this.statusBox.removeAll(true)
  }
}
