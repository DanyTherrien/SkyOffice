import Phaser from 'phaser'
import PlayerSelector from './PlayerSelector'
import { PlayerBehavior } from '../../../types/PlayerBehavior'
import { sittingShiftData } from './Player'
import Player from './Player'
import Network from '../services/Network'
import Chair from '../items/Chair'
import Computer from '../items/Computer'
import Door from '../items/Door'
import Whiteboard from '../items/Whiteboard'

import { phaserEvents, Event } from '../events/EventCenter'
import store from '../stores'
import { pushPlayerJoinedMessage } from '../stores/ChatStore'
import { ItemType } from '../../../types/Items'
import { NavKeys } from '../../../types/KeyboardState'
import { JoystickMovement } from '../components/Joystick'

export default class MyPlayer extends Player {
  private playContainerBody: Phaser.Physics.Arcade.Body
  private chairOnSit?: Chair
  public joystickMovement?: JoystickMovement

  // 6.3 — Particules de poussiere subtiles quand le joueur bouge
  private dustEmitter?: Phaser.GameObjects.Particles.ParticleEmitter
  private dustManager?: Phaser.GameObjects.Particles.ParticleEmitterManager
  private lastDustTime = 0

  // 2E — Cercle de proximite / aura subtil
  private proximityAura?: Phaser.GameObjects.Graphics
  private auraBaseAlpha = 0.08
  private auraPulsePhase = 0

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    id: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, id, frame)
    this.playContainerBody = this.playerContainer.body as Phaser.Physics.Arcade.Body
  }

  setPlayerName(name: string): void {
    this.playerName.setText(name)
    this.updateNameBackground()
    this.updateStatusDot('available')
    phaserEvents.emit(Event.MY_PLAYER_NAME_CHANGE, name)
    store.dispatch(pushPlayerJoinedMessage(name))
  }

  setPlayerTexture(texture: string): void {
    this.playerTexture = texture
    this.anims.play(`${this.playerTexture}_idle_down`, true)
    phaserEvents.emit(Event.MY_PLAYER_TEXTURE_CHANGE, this.x, this.y, this.anims.currentAnim.key)
  }

  handleJoystickMovement(movement: JoystickMovement): void {
    this.joystickMovement = movement
  }

  /** Initialise le cercle d'aura de proximite */
  private initProximityAura() {
    if (this.proximityAura) return
    this.proximityAura = this.scene.add.graphics()
    this.proximityAura.setDepth(this.depth - 2)
  }

  /** Met a jour l'aura chaque frame — pulse quand un autre joueur est proche */
  updateProximityAura(hasNearbyPlayer: boolean): void {
    this.initProximityAura()
    if (!this.proximityAura) return

    this.proximityAura.clear()
    this.proximityAura.setPosition(this.x, this.y)

    // Pulse brievement quand un joueur est proche
    if (hasNearbyPlayer) {
      this.auraPulsePhase += 0.12
      const pulse = 0.04 * Math.sin(this.auraPulsePhase)
      const alpha = this.auraBaseAlpha + pulse + 0.04
      this.proximityAura.fillStyle(0x14b8a6, alpha)
      this.proximityAura.fillCircle(0, 0, 48)
    } else {
      this.auraPulsePhase = 0
      this.proximityAura.fillStyle(0x14b8a6, this.auraBaseAlpha)
      this.proximityAura.fillCircle(0, 0, 48)
    }
  }

  private initDustEmitter() {
    if (this.dustEmitter || !this.scene.textures.exists('particle_white')) return
    this.dustManager = this.scene.add.particles('particle_white')
    this.dustManager.setDepth(1)
    this.dustEmitter = this.dustManager.createEmitter({
      speed: { min: 5, max: 15 },
      alpha: { start: 0.2, end: 0 },
      scale: { start: 0.3, end: 0.1 },
      lifespan: 300,
      on: false,
      tint: 0xccccaa,
    })
  }

  update(
    playerSelector: PlayerSelector,
    cursors: NavKeys,
    keyE: Phaser.Input.Keyboard.Key,
    keyR: Phaser.Input.Keyboard.Key,
    network: Network
  ): void {
    if (!cursors) return

    const item = playerSelector.selectedItem

    if (Phaser.Input.Keyboard.JustDown(keyR)) {
      switch (item?.itemType) {
        case ItemType.COMPUTER: {
          const computer = item as Computer
          computer.openDialog(this.playerId, network)
          break
        }
        case ItemType.WHITEBOARD: {
          const whiteboard = item as Whiteboard
          whiteboard.openDialog(network)
          break
        }
        case ItemType.VENDINGMACHINE:
          // Afficher une bulle de dialogue amusante
          this.updateDialogBubble('☕ Mmm, bon café !')
          break
      }
    }

    switch (this.playerBehavior) {
      case PlayerBehavior.IDLE: {
        // if press E in front of selected chair
        if (Phaser.Input.Keyboard.JustDown(keyE) && item?.itemType === ItemType.CHAIR) {
          const chairItem = item as Chair
          /**
           * move player to the chair and play sit animation
           * a delay is called to wait for player movement (from previous velocity) to end
           * as the player tends to move one more frame before sitting down causing player
           * not sitting at the center of the chair
           */
          this.scene.time.addEvent({
            delay: 10,
            callback: () => {
              // update character velocity and position
              this.setVelocity(0, 0)
              if (chairItem.itemDirection) {
                this.setPosition(
                  chairItem.x + sittingShiftData[chairItem.itemDirection][0],
                  chairItem.y + sittingShiftData[chairItem.itemDirection][1]
                ).setDepth(chairItem.depth + sittingShiftData[chairItem.itemDirection][2])
                // also update playerNameContainer velocity and position
                this.playContainerBody.setVelocity(0, 0)
                this.playerContainer.setPosition(
                  chairItem.x + sittingShiftData[chairItem.itemDirection][0],
                  chairItem.y + sittingShiftData[chairItem.itemDirection][1] - 30
                )
              }

              this.play(`${this.playerTexture}_sit_${chairItem.itemDirection}`, true)
              playerSelector.selectedItem = undefined
              if (chairItem.itemDirection === 'up') {
                playerSelector.setPosition(this.x, this.y - this.height)
              } else {
                playerSelector.setPosition(0, 0)
              }
              // send new location and anim to server
              network.updatePlayer(this.x, this.y, this.anims.currentAnim.key)
            },
            loop: false,
          })
          // set up new dialog as player sits down
          chairItem.clearDialogBox()
          chairItem.setDialogBox('Appuie sur E pour quitter')
          this.chairOnSit = chairItem
          this.playerBehavior = PlayerBehavior.SITTING
          return
        }

        // Appuyer sur E devant une porte → teleportation de l'autre cote
        if (Phaser.Input.Keyboard.JustDown(keyE) && item?.itemType === ItemType.DOOR) {
          const door = item as Door
          const target = door.getTeleportTarget(this.x, this.y)

          this.setVelocity(0, 0)
          this.setPosition(target.x, target.y)
          this.playContainerBody.setVelocity(0, 0)
          this.playerContainer.setPosition(target.x, target.y - 30)

          door.clearDialogBox()
          playerSelector.selectedItem = undefined

          network.updatePlayer(this.x, this.y, this.anims.currentAnim.key)
          return
        }

        const speed = 250
        let vx = 0
        let vy = 0

        let joystickLeft = false
        let joystickRight = false
        let joystickUp = false
        let joystickDown = false

        if (this.joystickMovement?.isMoving) {
          joystickLeft = this.joystickMovement.direction.left
          joystickRight = this.joystickMovement.direction.right
          joystickUp = this.joystickMovement.direction.up
          joystickDown = this.joystickMovement.direction.down
        }

        if (cursors.left?.isDown || cursors.A?.isDown || joystickLeft) vx -= speed
        if (cursors.right?.isDown || cursors.D?.isDown || joystickRight) vx += speed
        if (cursors.up?.isDown || cursors.W?.isDown || joystickUp) {
          vy -= speed
          this.setDepth(this.y) //change player.depth if player.y changes
        }
        if (cursors.down?.isDown || cursors.S?.isDown || joystickDown) {
          vy += speed
          this.setDepth(this.y) //change player.depth if player.y changes
        }
        // update character velocity
        this.setVelocity(vx, vy)
        this.body.velocity.setLength(speed)
        // also update playerNameContainer velocity
        this.playContainerBody.setVelocity(vx, vy)
        this.playContainerBody.velocity.setLength(speed)

        // 6.3 — Particules de poussiere subtiles quand le joueur bouge
        if (vx !== 0 || vy !== 0) {
          const now = this.scene.time.now
          if (now - this.lastDustTime > 80) {
            this.lastDustTime = now
            this.initDustEmitter()
            this.dustEmitter?.emitParticleAt?.(this.x, this.y + 12, 1)
          }
        }

        // update animation according to velocity and send new location and anim to server
        if (vx !== 0 || vy !== 0) network.updatePlayer(this.x, this.y, this.anims.currentAnim.key)
        if (vx > 0) {
          this.play(`${this.playerTexture}_run_right`, true)
        } else if (vx < 0) {
          this.play(`${this.playerTexture}_run_left`, true)
        } else if (vy > 0) {
          this.play(`${this.playerTexture}_run_down`, true)
        } else if (vy < 0) {
          this.play(`${this.playerTexture}_run_up`, true)
        } else {
          const parts = this.anims.currentAnim.key.split('_')
          parts[1] = 'idle'
          const newAnim = parts.join('_')
          // this prevents idle animation keeps getting called
          if (this.anims.currentAnim.key !== newAnim) {
            this.play(parts.join('_'), true)
            // send new location and anim to server
            network.updatePlayer(this.x, this.y, this.anims.currentAnim.key)
          }
        }
        break
      }

      case PlayerBehavior.SITTING:
        // back to idle if player press E while sitting
        if (Phaser.Input.Keyboard.JustDown(keyE)) {
          const parts = this.anims.currentAnim.key.split('_')
          parts[1] = 'idle'
          this.play(parts.join('_'), true)
          this.playerBehavior = PlayerBehavior.IDLE
          this.chairOnSit?.clearDialogBox()
          playerSelector.setPosition(this.x, this.y)
          playerSelector.update(this, cursors)
          network.updatePlayer(this.x, this.y, this.anims.currentAnim.key)
        }
        break
    }
  }
}

declare global {
  namespace Phaser.GameObjects {
    interface GameObjectFactory {
      myPlayer(x: number, y: number, texture: string, id: string, frame?: string | number): MyPlayer
    }
  }
}

Phaser.GameObjects.GameObjectFactory.register(
  'myPlayer',
  function (
    this: Phaser.GameObjects.GameObjectFactory,
    x: number,
    y: number,
    texture: string,
    id: string,
    frame?: string | number
  ) {
    const sprite = new MyPlayer(this.scene, x, y, texture, id, frame)

    this.displayList.add(sprite)
    this.updateList.add(sprite)

    this.scene.physics.world.enableBody(sprite, Phaser.Physics.Arcade.DYNAMIC_BODY)

    const collisionScale = [0.5, 0.2]
    sprite.body
      .setSize(sprite.width * collisionScale[0], sprite.height * collisionScale[1])
      .setOffset(
        sprite.width * (1 - collisionScale[0]) * 0.5,
        sprite.height * (1 - collisionScale[1])
      )

    return sprite
  }
)
