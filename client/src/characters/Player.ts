import Phaser from 'phaser'
import { PlayerBehavior } from '../../../types/PlayerBehavior'
/**
 * shifting distance for sitting animation
 * format: direction: [xShift, yShift, depthShift]
 */
export const sittingShiftData = {
  up: [0, 3, -10],
  down: [0, 3, 1],
  left: [0, -8, 10],
  right: [0, -8, 10],
}

export default class Player extends Phaser.Physics.Arcade.Sprite {
  playerId: string
  playerTexture: string
  playerBehavior = PlayerBehavior.IDLE
  readyToConnect = false
  videoConnected = false
  currentZone = 'brainstorm'
  playerName: Phaser.GameObjects.Text
  playerRoleText: Phaser.GameObjects.Text
  playerContainer: Phaser.GameObjects.Container
  private playerNameBg: Phaser.GameObjects.Graphics
  private playerDialogBubble: Phaser.GameObjects.Container
  private timeoutID?: number

  // Indicateurs visuels de statut
  private playerStatusDot: Phaser.GameObjects.Graphics
  private playerMeetingIcon: Phaser.GameObjects.Text
  private currentStatus = ''
  private isInMyMeeting = false

  // Indicateur de parole (cercle pulsant autour du sprite)
  private speakingIndicator: Phaser.GameObjects.Graphics
  private isSpeakingNow = false
  private speakingPulsePhase = 0

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    id: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, frame)

    this.playerId = id
    this.playerTexture = texture
    this.setDepth(this.y)

    this.anims.play(`${this.playerTexture}_idle_down`, true)

    this.playerContainer = this.scene.add.container(this.x, this.y - 30).setDepth(5000)

    // add dialogBubble to playerContainer
    this.playerDialogBubble = this.scene.add.container(0, 0).setDepth(5000)
    this.playerContainer.add(this.playerDialogBubble)

    // Fond semi-transparent derriere le nom (ajoute avant le texte pour le z-order)
    this.playerNameBg = this.scene.add.graphics()
    this.playerContainer.add(this.playerNameBg)

    // add playerName to playerContainer
    this.playerName = this.scene.add
      .text(0, 0, '')
      .setFontFamily('Arial')
      .setFontSize(12)
      .setColor('#ffffff')
      .setOrigin(0.5)
    this.playerContainer.add(this.playerName)

    // Texte du role sous le nom
    this.playerRoleText = this.scene.add
      .text(0, 12, '')
      .setFontFamily('Arial')
      .setFontSize(10)
      .setColor('#aaaaaa')
      .setOrigin(0.5)
    this.playerContainer.add(this.playerRoleText)

    // Point de statut colore (vert/orange/rouge) a gauche du nom
    this.playerStatusDot = this.scene.add.graphics()
    this.playerContainer.add(this.playerStatusDot)

    // Icone camera au-dessus du nom (visible si le joueur est dans la meme reunion)
    this.playerMeetingIcon = this.scene.add
      .text(0, -18, '📷')
      .setFontSize(14)
      .setOrigin(0.5)
      .setVisible(false)
    this.playerContainer.add(this.playerMeetingIcon)

    // Cercle pulsant pour indiquer la parole active
    this.speakingIndicator = this.scene.add.graphics()
    this.speakingIndicator.setVisible(false)

    this.scene.physics.world.enable(this.playerContainer)
    const playContainerBody = this.playerContainer.body as Phaser.Physics.Arcade.Body
    const collisionScale = [0.5, 0.2]
    playContainerBody
      .setSize(this.width * collisionScale[0], this.height * collisionScale[1])
      .setOffset(-8, this.height * (1 - collisionScale[1]) + 6)
  }

  setPlayerRole(role: string) {
    this.playerRoleText.setText(role)
  }

  /** Met a jour le fond semi-transparent derriere le nom du joueur */
  protected updateNameBackground() {
    this.playerNameBg.clear()
    if (!this.playerName.text) return
    const padding = 6
    const w = this.playerName.width + padding * 2
    const h = this.playerName.height + 4
    this.playerNameBg.fillStyle(0x000000, 0.5)
    this.playerNameBg.fillRoundedRect(-w / 2, -h / 2, w, h, 4)
    // Repositionner le dot de statut (la largeur du nom a pu changer)
    if (this.currentStatus) {
      const saved = this.currentStatus
      this.currentStatus = '' // forcer le redraw
      this.updateStatusDot(saved)
    }
  }

  updateDialogBubble(content: string) {
    this.clearDialogBubble()

    // preprocessing for dialog bubble text (maximum 70 characters)
    const dialogBubbleText = content.length <= 70 ? content : content.substring(0, 70).concat('...')

    const innerText = this.scene.add
      .text(0, 0, dialogBubbleText, { wordWrap: { width: 165, useAdvancedWrap: true } })
      .setFontFamily('Arial')
      .setFontSize(12)
      .setColor('#000000')
      .setOrigin(0.5)

    // set dialogBox slightly larger than the text in it
    const innerTextHeight = innerText.height
    const innerTextWidth = innerText.width

    innerText.setY(-innerTextHeight / 2 - this.playerName.height / 2)
    const dialogBoxWidth = innerTextWidth + 10
    const dialogBoxHeight = innerTextHeight + 3
    const dialogBoxX = innerText.x - innerTextWidth / 2 - 5
    const dialogBoxY = innerText.y - innerTextHeight / 2 - 2

    this.playerDialogBubble.add(
      this.scene.add
        .graphics()
        .fillStyle(0xffffff, 1)
        .fillRoundedRect(dialogBoxX, dialogBoxY, dialogBoxWidth, dialogBoxHeight, 3)
        .lineStyle(1, 0x000000, 1)
        .strokeRoundedRect(dialogBoxX, dialogBoxY, dialogBoxWidth, dialogBoxHeight, 3)
    )
    this.playerDialogBubble.add(innerText)

    // After 6 seconds, clear the dialog bubble
    this.timeoutID = window.setTimeout(() => {
      this.clearDialogBubble()
    }, 6000)
  }

  private clearDialogBubble() {
    clearTimeout(this.timeoutID)
    this.playerDialogBubble.removeAll(true)
  }

  /** Met a jour le point de statut colore a gauche du nom */
  updateStatusDot(status: string) {
    if (this.currentStatus === status) return
    this.currentStatus = status

    this.playerStatusDot.clear()

    let color = 0x4ade80 // vert = disponible
    if (status === 'meeting') color = 0xf59e0b // orange
    else if (status === 'dnd') color = 0xef4444 // rouge

    // Positionne le dot 12px a gauche du texte du nom
    const dotX = -this.playerName.width / 2 - 12
    this.playerStatusDot.fillStyle(color, 1.0)
    this.playerStatusDot.fillCircle(dotX, 0, 4)
  }

  /** Affiche ou cache l'icone camera (collegue dans la meme reunion) */
  updateMeetingIcon(visible: boolean) {
    if (this.isInMyMeeting === visible) return
    this.isInMyMeeting = visible
    this.playerMeetingIcon.setVisible(visible)
  }

  /** Met a jour l'indicateur de parole (cercle pulsant vert autour du sprite) */
  updateSpeakingIndicator(speaking: boolean) {
    if (this.isSpeakingNow === speaking) return
    this.isSpeakingNow = speaking
    this.speakingIndicator.setVisible(speaking)
    if (!speaking) {
      this.speakingIndicator.clear()
      this.speakingPulsePhase = 0
    }
  }

  /** Appelée a chaque frame pour animer le cercle pulsant */
  updateSpeakingPulse() {
    if (!this.isSpeakingNow) return

    this.speakingPulsePhase += 0.08
    const alpha = 0.3 + 0.2 * Math.sin(this.speakingPulsePhase)
    const radius = 14 + 2 * Math.sin(this.speakingPulsePhase)

    this.speakingIndicator.clear()
    this.speakingIndicator.lineStyle(2, 0x14b8a6, alpha)
    this.speakingIndicator.strokeCircle(this.x, this.y - 4, radius)
    this.speakingIndicator.setDepth(this.depth - 1)
  }
}
