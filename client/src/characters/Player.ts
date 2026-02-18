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
  private playerStatusEmoji: Phaser.GameObjects.Text
  private currentStatus = ''
  private currentStatusEmoji = ''
  private isInMyMeeting = false

  // 3A — Cercle avatar colore (premiere lettre du nom)
  private avatarCircle: Phaser.GameObjects.Graphics
  private avatarLetter: Phaser.GameObjects.Text

  // 3A — Indicateur de typing ("..." anime)
  private typingIndicator: Phaser.GameObjects.Text
  private isTyping = false
  private typingDotPhase = 0

  // 3C — AFK / idle
  private afkText: Phaser.GameObjects.Text
  private isAfk = false
  private afkBobPhase = 0

  // Indicateur de parole (cercle pulsant autour du sprite)
  private speakingIndicator: Phaser.GameObjects.Graphics
  private isSpeakingNow = false
  private speakingPulsePhase = 0

  // 5D — Animations idle variees
  private idleTimer = 0
  private idleBobTween?: Phaser.Tweens.Tween

  // 6.2 — Ombre dynamique sous le joueur
  private playerShadow: Phaser.GameObjects.Graphics

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

    // 3A — Cercle avatar colore (premiere lettre du nom) a gauche du nom
    this.avatarCircle = this.scene.add.graphics()
    this.playerContainer.add(this.avatarCircle)

    this.avatarLetter = this.scene.add
      .text(0, 0, '')
      .setFontFamily('Arial')
      .setFontSize(9)
      .setFontStyle('bold')
      .setColor('#ffffff')
      .setOrigin(0.5)
    this.playerContainer.add(this.avatarLetter)

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

    // 3A — Indicateur de typing ("..." anime) sous le nom
    this.typingIndicator = this.scene.add
      .text(0, 14, '', { fontSize: '10px', fontFamily: 'Arial' })
      .setColor('#14b8a6')
      .setOrigin(0.5)
      .setVisible(false)
    this.playerContainer.add(this.typingIndicator)

    // 3C — Texte "zzz" AFK au-dessus de la tete
    this.afkText = this.scene.add
      .text(0, -22, '💤', { fontSize: '12px' })
      .setOrigin(0.5)
      .setVisible(false)
    this.playerContainer.add(this.afkText)

    // Icone camera au-dessus du nom (visible si le joueur est dans la meme reunion)
    this.playerMeetingIcon = this.scene.add
      .text(0, -18, '\uD83D\uDCF7')
      .setFontSize(14)
      .setOrigin(0.5)
      .setVisible(false)
    this.playerContainer.add(this.playerMeetingIcon)

    // Emoji de statut au-dessus du nom (visible si statut non-disponible)
    this.playerStatusEmoji = this.scene.add
      .text(0, -18, '')
      .setFontSize(12)
      .setOrigin(0.5)
      .setVisible(false)
    this.playerContainer.add(this.playerStatusEmoji)

    // Cercle pulsant pour indiquer la parole active
    this.speakingIndicator = this.scene.add.graphics()
    this.speakingIndicator.setVisible(false)

    // 6.2 — Ombre dynamique (ellipse noire sous le sprite)
    this.playerShadow = this.scene.add.graphics()
    this.playerShadow.fillStyle(0x000000, 0.3)
    this.playerShadow.fillEllipse(0, 0, 16, 6)
    this.playerShadow.setDepth(this.y - 1)

    this.scene.physics.world.enable(this.playerContainer)
    const playContainerBody = this.playerContainer.body as Phaser.Physics.Arcade.Body
    const collisionScale = [0.5, 0.2]
    playContainerBody
      .setSize(this.width * collisionScale[0], this.height * collisionScale[1])
      .setOffset(-8, this.height * (1 - collisionScale[1]) + 6)
  }

  // 6.2 — Mise a jour de l'ombre dynamique chaque frame
  preUpdate(t: number, dt: number): void {
    super.preUpdate(t, dt)
    if (this.playerShadow) {
      this.playerShadow.setPosition(this.x, this.y + 12)
      this.playerShadow.setDepth(this.depth - 1)
    }
  }

  destroy(fromScene?: boolean): void {
    this.playerShadow?.destroy()
    super.destroy(fromScene)
  }

  setPlayerRole(role: string): void {
    this.playerRoleText.setText(role)
  }

  /** Met a jour le fond semi-transparent derriere le nom du joueur + cercle avatar */
  protected updateNameBackground(): void {
    this.playerNameBg.clear()
    this.avatarCircle.clear()
    if (!this.playerName.text) return

    // 3A — Cercle avatar avec premiere lettre du nom
    const avatarRadius = 7
    const avatarOffset = -this.playerName.width / 2 - avatarRadius - 6
    const avatarColor = this.getNameColor(this.playerName.text)
    this.avatarCircle.fillStyle(avatarColor, 1)
    this.avatarCircle.fillCircle(avatarOffset, 0, avatarRadius)
    this.avatarLetter.setText(this.playerName.text.charAt(0).toUpperCase())
    this.avatarLetter.setPosition(avatarOffset, 0)

    // Fond semi-transparent elargi pour inclure le cercle avatar
    const padding = 6
    const extraLeft = avatarRadius * 2 + 4
    const w = this.playerName.width + padding * 2 + extraLeft
    const h = this.playerName.height + 4
    const bgX = -this.playerName.width / 2 - padding - extraLeft
    this.playerNameBg.fillStyle(0x000000, 0.5)
    this.playerNameBg.fillRoundedRect(bgX, -h / 2, w, h, 4)

    // Repositionner le dot de statut (la largeur du nom a pu changer)
    if (this.currentStatus) {
      const saved = this.currentStatus
      this.currentStatus = '' // forcer le redraw
      this.updateStatusDot(saved)
    }
  }

  /** Retourne une couleur deterministe basee sur le nom du joueur */
  private getNameColor(name: string): number {
    const colors = [0x7bf1a8, 0xff7e50, 0x9acd32, 0xdaa520, 0xff69b4, 0xc085f6, 0x1e90ff, 0x5f9da0]
    return colors[Math.floor(name.charCodeAt(0) % colors.length)]
  }

  updateDialogBubble(content: string): void {
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
  updateStatusDot(status: string): void {
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

  /** Met a jour l'emoji de statut au-dessus du nom */
  updateStatusEmoji(emoji: string): void {
    if (this.currentStatusEmoji === emoji) return
    this.currentStatusEmoji = emoji
    if (emoji) {
      this.playerStatusEmoji.setText(emoji)
      this.playerStatusEmoji.setVisible(true)
      // Positionner a droite du nom
      const xPos = this.playerName.width / 2 + 12
      this.playerStatusEmoji.setPosition(xPos, 0)
    } else {
      this.playerStatusEmoji.setVisible(false)
    }
  }

  /** Affiche ou cache l'icone camera (collegue dans la meme reunion) */
  updateMeetingIcon(visible: boolean): void {
    if (this.isInMyMeeting === visible) return
    this.isInMyMeeting = visible
    this.playerMeetingIcon.setVisible(visible)
  }

  /** Affiche un emoji qui monte et fade au-dessus du joueur */
  showEmoji(emoji: string): void {
    const emojiText = this.scene.add
      .text(this.x, this.y - 40, emoji, { fontSize: '24px' })
      .setOrigin(0.5)
      .setDepth(6000)

    this.scene.tweens.add({
      targets: emojiText,
      y: this.y - 80,
      alpha: { from: 1, to: 0 },
      duration: 2000,
      ease: 'Power2',
      onComplete: () => emojiText.destroy(),
    })
  }

  /** Met a jour l'indicateur de parole (cercle pulsant vert autour du sprite) */
  updateSpeakingIndicator(speaking: boolean): void {
    if (this.isSpeakingNow === speaking) return
    this.isSpeakingNow = speaking
    this.speakingIndicator.setVisible(speaking)
    if (!speaking) {
      this.speakingIndicator.clear()
      this.speakingPulsePhase = 0
    }
  }

  /** Appelée a chaque frame pour animer le cercle pulsant */
  updateSpeakingPulse(): void {
    if (!this.isSpeakingNow) return

    this.speakingPulsePhase += 0.08
    const alpha = 0.3 + 0.2 * Math.sin(this.speakingPulsePhase)
    const radius = 14 + 2 * Math.sin(this.speakingPulsePhase)

    this.speakingIndicator.clear()
    this.speakingIndicator.lineStyle(2, 0x14b8a6, alpha)
    this.speakingIndicator.strokeCircle(this.x, this.y - 4, radius)
    this.speakingIndicator.setDepth(this.depth - 1)
  }

  // ─── 3A — Typing indicator ──────────────────────────────────────────────

  /** Met a jour la visibilite de l'indicateur de typing */
  updateTypingIndicator(typing: boolean): void {
    if (this.isTyping === typing) return
    this.isTyping = typing
    this.typingIndicator.setVisible(typing)
    if (!typing) {
      this.typingDotPhase = 0
      this.typingIndicator.setText('')
    }
  }

  /** Anime les "..." du typing indicator (appeler chaque frame) */
  updateTypingAnimation(): void {
    if (!this.isTyping) return
    this.typingDotPhase += 0.05
    const dotCount = (Math.floor(this.typingDotPhase) % 3) + 1
    this.typingIndicator.setText('.'.repeat(dotCount))
  }

  // ─── 3C — AFK / idle status ─────────────────────────────────────────────

  /** Met a jour l'indicateur AFK (zzz au-dessus de la tete) */
  updateAfkStatus(afk: boolean): void {
    if (this.isAfk === afk) return
    this.isAfk = afk
    this.afkText.setVisible(afk)
    if (afk) {
      // Demarrer l'animation de bob du zzz
      this.scene.tweens.add({
        targets: this.afkText,
        y: { from: -22, to: -28 },
        alpha: { from: 1, to: 0.5 },
        duration: 1500,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      })
    } else {
      this.scene.tweens.killTweensOf(this.afkText)
      this.afkText.setY(-22).setAlpha(1)
    }
  }

  /** Anime un subtil balancement du corps quand AFK (appeler chaque frame) */
  updateAfkAnimation(): void {
    if (!this.isAfk) return
    this.afkBobPhase += 0.02
    // Subtle scale oscillation
    const scaleX = 1 + 0.015 * Math.sin(this.afkBobPhase)
    this.setScale(scaleX, 1)
  }

  // ─── 5D — Animations idle variees ────────────────────────────────────────

  /** Gere le timer d'idle et lance l'animation bob apres 5s immobile */
  updateIdleAnimation(dt: number, isMoving: boolean): void {
    if (isMoving || this.isAfk) {
      this.idleTimer = 0
      if (this.idleBobTween) {
        this.idleBobTween.stop()
        this.idleBobTween = undefined
        this.setScale(1, 1)
      }
      return
    }

    this.idleTimer += dt
    if (this.idleTimer > 5000 && !this.idleBobTween) {
      // Subtil bob vertical
      this.idleBobTween = this.scene.tweens.add({
        targets: this,
        y: this.y - 1.5,
        duration: 1200,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      })
    }
  }
}
