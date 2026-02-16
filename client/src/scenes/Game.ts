import Phaser from 'phaser'

// import { debugDraw } from '../utils/debug'
import { createCharacterAnims } from '../anims/CharacterAnims'

import Item from '../items/Item'
import Chair from '../items/Chair'
import Computer from '../items/Computer'
import Whiteboard from '../items/Whiteboard'
import VendingMachine from '../items/VendingMachine'
import '../characters/MyPlayer'
import '../characters/OtherPlayer'
import MyPlayer from '../characters/MyPlayer'
import OtherPlayer from '../characters/OtherPlayer'
import PlayerSelector from '../characters/PlayerSelector'
import Network from '../services/Network'
import { IPlayer } from '../../../types/IOfficeState'
import { PlayerBehavior } from '../../../types/PlayerBehavior'
import { ItemType } from '../../../types/Items'

import store from '../stores'
import { setFocused, setShowChat } from '../stores/ChatStore'
import {
  setShowMeetingPreview,
  setPendingZone,
  setShowZoneEntryBanner,
} from '../stores/MeetingStore'
import { NavKeys, Keyboard } from '../../../types/KeyboardState'
import { sanitizeId } from '../util'
import { ZONE_NAMES, MEETING_ZONES } from '../constants'

// Limites du zoom camera (ajuste pour la carte compacte 24x18)
const MIN_ZOOM = 1.5
const MAX_ZOOM = 3.5
const ZOOM_STEP = 0.25

export default class Game extends Phaser.Scene {
  network!: Network
  private cursors!: NavKeys
  private keyE!: Phaser.Input.Keyboard.Key
  private keyR!: Phaser.Input.Keyboard.Key
  private map!: Phaser.Tilemaps.Tilemap
  myPlayer!: MyPlayer
  private playerSelector!: Phaser.GameObjects.Zone
  private otherPlayers!: Phaser.Physics.Arcade.Group
  private otherPlayerMap = new Map<string, OtherPlayer>()
  computerMap = new Map<string, Computer>()
  private whiteboardMap = new Map<string, Whiteboard>()

  // Detection de zones
  private zones: Map<string, Phaser.Geom.Rectangle> = new Map()
  private currentZone = ''

  // Grace period et banniere d'entree en zone de reunion
  private keyM!: Phaser.Input.Keyboard.Key
  private zoneEntryTimer: ReturnType<typeof setTimeout> | null = null
  private bannerAutoHideTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    super('game')
  }

  registerKeys() {
    this.cursors = {
      ...this.input.keyboard.createCursorKeys(),
      ...(this.input.keyboard.addKeys('W,S,A,D') as Keyboard),
    }

    // maybe we can have a dedicated method for adding keys if more keys are needed in the future
    this.keyE = this.input.keyboard.addKey('E')
    this.keyR = this.input.keyboard.addKey('R')
    this.keyM = this.input.keyboard.addKey('M')
    this.input.keyboard.disableGlobalCapture()
    this.input.keyboard.on('keydown-ENTER', (event) => {
      store.dispatch(setShowChat(true))
      store.dispatch(setFocused(true))
    })
    this.input.keyboard.on('keydown-ESC', (event) => {
      store.dispatch(setShowChat(false))
    })
  }

  disableKeys() {
    this.input.keyboard.enabled = false
  }

  enableKeys() {
    this.input.keyboard.enabled = true
  }

  create(data: { network: Network }) {
    if (!data.network) {
      throw new Error('server instance missing')
    } else {
      this.network = data.network
    }

    createCharacterAnims(this.anims)

    this.map = this.make.tilemap({ key: 'tilemap' })
    const FloorAndGround = this.map.addTilesetImage('FloorAndGround', 'tiles_wall')

    const groundLayer = this.map.createLayer('Ground', FloorAndGround)
    groundLayer.setCollisionByProperty({ collides: true })

    // debugDraw(groundLayer, this)

    // Spawn au centre du carrefour (carte compacte 24x18, centre a tile 12,9)
    this.myPlayer = this.add.myPlayer(384, 288, 'adam', this.network.mySessionId)
    this.playerSelector = new PlayerSelector(this, 0, 0, 16, 16)

    // Charger les zones depuis le layer Zone de la tilemap
    const zoneLayer = this.map.getObjectLayer('Zone')
    if (zoneLayer) {
      zoneLayer.objects.forEach((zoneObj) => {
        const zoneName = zoneObj.name || 'unknown'
        this.zones.set(
          zoneName,
          new Phaser.Geom.Rectangle(zoneObj.x!, zoneObj.y!, zoneObj.width!, zoneObj.height!)
        )
      })
    }

    // Afficher les labels de zones sur la carte
    for (const [name, rect] of this.zones) {
      const label = ZONE_NAMES[name] || name
      this.add
        .text(rect.x + rect.width / 2, rect.y + 16, label, {
          fontSize: '14px',
          color: '#ffffff',
          fontFamily: 'Arial',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(1000)
        .setAlpha(0.7)
    }

    // Charger les chaises depuis la tilemap
    const chairs = this.physics.add.staticGroup({ classType: Chair })
    const chairLayer = this.map.getObjectLayer('Chair')
    if (chairLayer) {
      chairLayer.objects.forEach((chairObj) => {
        const item = this.addObjectFromTiled(chairs, chairObj, 'chairs', 'chair') as Chair
        // custom properties[0] is the object direction specified in Tiled
        item.itemDirection = chairObj.properties?.[0]?.value
      })
    }

    // Charger les ordinateurs depuis la tilemap
    const computers = this.physics.add.staticGroup({ classType: Computer })
    const computerLayer = this.map.getObjectLayer('Computer')
    if (computerLayer) {
      computerLayer.objects.forEach((obj, i) => {
        const item = this.addObjectFromTiled(computers, obj, 'computers', 'computer') as Computer
        item.setDepth(item.y + item.height * 0.27)
        const id = `${i}`
        item.id = id
        this.computerMap.set(id, item)
      })
    }

    // Charger les tableaux blancs depuis la tilemap
    const whiteboards = this.physics.add.staticGroup({ classType: Whiteboard })
    const whiteboardLayer = this.map.getObjectLayer('Whiteboard')
    if (whiteboardLayer) {
      whiteboardLayer.objects.forEach((obj, i) => {
        const item = this.addObjectFromTiled(
          whiteboards,
          obj,
          'whiteboards',
          'whiteboard'
        ) as Whiteboard
        const id = `${i}`
        item.id = id
        this.whiteboardMap.set(id, item)
      })
    }

    // Charger les machines distributrices depuis la tilemap
    const vendingMachines = this.physics.add.staticGroup({ classType: VendingMachine })
    const vendingMachineLayer = this.map.getObjectLayer('VendingMachine')
    if (vendingMachineLayer) {
      vendingMachineLayer.objects.forEach((obj, i) => {
        this.addObjectFromTiled(vendingMachines, obj, 'vendingmachines', 'vendingmachine')
      })
    }

    // Charger les objets decoratifs (avec null checks pour les layers optionnels)
    this.addGroupFromTiled('Wall', 'tiles_wall', 'FloorAndGround', false)
    this.addGroupFromTiled('Objects', 'office', 'Modern_Office_Black_Shadow', false)
    this.addGroupFromTiled('ObjectsOnCollide', 'office', 'Modern_Office_Black_Shadow', true)
    this.addGroupFromTiled('GenericObjects', 'generic', 'Generic', false)
    this.addGroupFromTiled('GenericObjectsOnCollide', 'generic', 'Generic', true)
    this.addGroupFromTiled('Basement', 'basement', 'Basement', true)

    this.otherPlayers = this.physics.add.group({ classType: OtherPlayer })

    this.cameras.main.zoom = 2.0
    this.cameras.main.startFollow(this.myPlayer, true)

    // Limiter la camera aux bords de la carte
    const mapWidth = this.map.widthInPixels
    const mapHeight = this.map.heightInPixels
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight)

    // Zoom molette de souris
    this.input.on('wheel', (_pointer: any, _gameObjects: any, _dx: number, dy: number) => {
      const cam = this.cameras.main
      if (dy > 0) {
        cam.zoom = Math.max(MIN_ZOOM, cam.zoom - ZOOM_STEP)
      } else if (dy < 0) {
        cam.zoom = Math.min(MAX_ZOOM, cam.zoom + ZOOM_STEP)
      }
    })

    // Zoom clavier +/-
    this.input.keyboard.on('keydown-PLUS', () => {
      this.cameras.main.zoom = Math.min(MAX_ZOOM, this.cameras.main.zoom + ZOOM_STEP)
    })
    this.input.keyboard.on('keydown-MINUS', () => {
      this.cameras.main.zoom = Math.max(MIN_ZOOM, this.cameras.main.zoom - ZOOM_STEP)
    })

    this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], groundLayer)
    this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], vendingMachines)

    this.physics.add.overlap(
      this.playerSelector,
      [chairs, computers, whiteboards, vendingMachines],
      this.handleItemSelectorOverlap,
      undefined,
      this
    )

    // register network event listeners
    this.network.onPlayerJoined(this.handlePlayerJoined, this)
    this.network.onPlayerLeft(this.handlePlayerLeft, this)
    this.network.onMyPlayerReady(this.handleMyPlayerReady, this)
    this.network.onMyPlayerVideoConnected(this.handleMyVideoConnected, this)
    this.network.onPlayerUpdated(this.handlePlayerUpdated, this)
    this.network.onItemUserAdded(this.handleItemUserAdded, this)
    this.network.onItemUserRemoved(this.handleItemUserRemoved, this)
    this.network.onChatMessageAdded(this.handleChatMessageAdded, this)
  }

  private handleItemSelectorOverlap(playerSelector, selectionItem) {
    const currentItem = playerSelector.selectedItem as Item
    // currentItem is undefined if nothing was perviously selected
    if (currentItem) {
      // if the selection has not changed, do nothing
      if (currentItem === selectionItem || currentItem.depth >= selectionItem.depth) {
        return
      }
      // if selection changes, clear pervious dialog
      if (this.myPlayer.playerBehavior !== PlayerBehavior.SITTING) currentItem.clearDialogBox()
    }

    // set selected item and set up new dialog
    playerSelector.selectedItem = selectionItem
    selectionItem.onOverlapDialog()
  }

  private addObjectFromTiled(
    group: Phaser.Physics.Arcade.StaticGroup,
    object: Phaser.Types.Tilemaps.TiledObject,
    key: string,
    tilesetName: string
  ) {
    const actualX = object.x! + object.width! * 0.5
    const actualY = object.y! - object.height! * 0.5
    const obj = group
      .get(actualX, actualY, key, object.gid! - this.map.getTileset(tilesetName).firstgid)
      .setDepth(actualY)
    return obj
  }

  private addGroupFromTiled(
    objectLayerName: string,
    key: string,
    tilesetName: string,
    collidable: boolean
  ) {
    const group = this.physics.add.staticGroup()
    const objectLayer = this.map.getObjectLayer(objectLayerName)
    if (!objectLayer) return // le layer n'existe pas ou est vide
    objectLayer.objects.forEach((object) => {
      const actualX = object.x! + object.width! * 0.5
      const actualY = object.y! - object.height! * 0.5
      group
        .get(actualX, actualY, key, object.gid! - this.map.getTileset(tilesetName).firstgid)
        .setDepth(actualY)
    })
    if (this.myPlayer && collidable)
      this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], group)
  }

  // function to add new player to the otherPlayer group
  private handlePlayerJoined(newPlayer: IPlayer, id: string) {
    const otherPlayer = this.add.otherPlayer(newPlayer.x, newPlayer.y, 'adam', id, newPlayer.name)
    this.otherPlayers.add(otherPlayer)
    this.otherPlayerMap.set(id, otherPlayer)
  }

  // function to remove the player who left from the otherPlayer group
  private handlePlayerLeft(id: string) {
    if (this.otherPlayerMap.has(id)) {
      const otherPlayer = this.otherPlayerMap.get(id)
      if (!otherPlayer) return
      this.otherPlayers.remove(otherPlayer, true, true)
      this.otherPlayerMap.delete(id)
    }
  }

  private handleMyPlayerReady() {
    this.myPlayer.readyToConnect = true
  }

  private handleMyVideoConnected() {
    this.myPlayer.videoConnected = true
  }

  // function to update target position upon receiving player updates
  private handlePlayerUpdated(field: string, value: number | string, id: string) {
    const otherPlayer = this.otherPlayerMap.get(id)
    otherPlayer?.updateOtherPlayer(field, value)
  }

  private handleItemUserAdded(playerId: string, itemId: string, itemType: ItemType) {
    if (itemType === ItemType.COMPUTER) {
      const computer = this.computerMap.get(itemId)
      computer?.addCurrentUser(playerId)
    } else if (itemType === ItemType.WHITEBOARD) {
      const whiteboard = this.whiteboardMap.get(itemId)
      whiteboard?.addCurrentUser(playerId)
    }
  }

  private handleItemUserRemoved(playerId: string, itemId: string, itemType: ItemType) {
    if (itemType === ItemType.COMPUTER) {
      const computer = this.computerMap.get(itemId)
      computer?.removeCurrentUser(playerId)
    } else if (itemType === ItemType.WHITEBOARD) {
      const whiteboard = this.whiteboardMap.get(itemId)
      whiteboard?.removeCurrentUser(playerId)
    }
  }

  private handleChatMessageAdded(playerId: string, content: string) {
    const otherPlayer = this.otherPlayerMap.get(playerId)
    otherPlayer?.updateDialogBubble(content)
  }

  // ─── Grace period et banniere d'entree en zone de reunion ──────────────

  /** Demarre un timer de 1.5s : si le joueur reste dans la zone, rejoint automatiquement la reunion */
  private startZoneEntryGracePeriod(zoneName: string): void {
    this.clearZoneEntryTimer()
    this.zoneEntryTimer = setTimeout(() => {
      this.zoneEntryTimer = null
      // Rejoindre automatiquement la reunion de zone
      this.network.zoneMeetingManager?.joinZone(zoneName)
      console.log(`[Capturia] Auto-join reunion: ${ZONE_NAMES[zoneName] || zoneName}`)
    }, 1500)
  }

  /** Annule le timer de grace period */
  private clearZoneEntryTimer(): void {
    if (this.zoneEntryTimer) {
      clearTimeout(this.zoneEntryTimer)
      this.zoneEntryTimer = null
    }
  }

  /** Cache la banniere et annule le timer d'auto-hide */
  private hideBanner(): void {
    const s = store.getState().meeting
    if (s.showZoneEntryBanner) {
      store.dispatch(setShowZoneEntryBanner(false))
    }
    if (this.bannerAutoHideTimer) {
      clearTimeout(this.bannerAutoHideTimer)
      this.bannerAutoHideTimer = null
    }
  }

  /** Gere l'appui sur la touche M : ouvre le preview de reunion */
  private handleMKeyPress(): void {
    const meetingState = store.getState().meeting
    const chatState = store.getState().chat

    // Ne pas interferer avec le chat
    if (chatState.focused) return
    // Deja en reunion
    if (meetingState.activeZone) return

    const isMeetingZone = (MEETING_ZONES as readonly string[]).includes(this.currentZone)

    if (meetingState.showZoneEntryBanner || isMeetingZone) {
      this.clearZoneEntryTimer()
      this.hideBanner()
      store.dispatch(setPendingZone(meetingState.bannerZoneName || this.currentZone))
      store.dispatch(setShowMeetingPreview(true))
    }
  }

  update(t: number, dt: number) {
    if (this.myPlayer && this.network) {
      // Ne rien faire si les touches ne sont pas encore enregistrees (avant login)
      if (!this.cursors) return
      this.playerSelector.update(this.myPlayer, this.cursors)
      this.myPlayer.update(this.playerSelector, this.cursors, this.keyE, this.keyR, this.network)

      // Detection de zone: verifier si le joueur a change de zone
      for (const [name, rect] of this.zones) {
        if (Phaser.Geom.Rectangle.Contains(rect, this.myPlayer.x, this.myPlayer.y)) {
          if (name !== this.currentZone) {
            this.currentZone = name
            this.myPlayer.currentZone = name
            this.network.updatePlayerZone(name)
            // Mettre a jour le statut de presence selon la zone
            if (name === 'deep_work') {
              this.network.updatePlayerStatus('dnd')
            } else if (name === 'meeting' || name === 'sales') {
              this.network.updatePlayerStatus('meeting')
            } else {
              this.network.updatePlayerStatus('available')
            }
            console.log(`[Capturia] Zone changee: ${ZONE_NAMES[name] || name}`)

            // Declencher join/leave de la reunion de zone
            this.clearZoneEntryTimer()
            this.hideBanner()

            if (name === 'deep_work') {
              this.network.zoneMeetingManager?.leaveZone()
            } else {
              // Si deja en meeting actif, changer de zone directement
              const meetingState = store.getState().meeting
              if (meetingState.activeZone) {
                this.network.zoneMeetingManager?.joinZone(name)
              } else {
                // Grace period de 1.5s avant d'afficher la banniere
                this.startZoneEntryGracePeriod(name)
              }
            }
          }
          break
        }
      }

      // Touche M : ouvrir le preview de reunion si dans une zone de reunion
      if (Phaser.Input.Keyboard.JustDown(this.keyM)) {
        this.handleMKeyPress()
      }

      // Mise a jour des indicateurs de statut sur les avatars
      const userState = store.getState().user
      const meetingState = store.getState().meeting

      const myId = sanitizeId(this.network.mySessionId)
      this.myPlayer.updateStatusDot(userState.playerStatusMap.get(myId) || 'available')
      this.myPlayer.updateMeetingIcon(false)

      for (const [sessionId, otherPlayer] of this.otherPlayerMap) {
        const sid = sanitizeId(sessionId)
        otherPlayer.updateStatusDot(userState.playerStatusMap.get(sid) || 'available')
        const inMyMeeting =
          meetingState.activeZone !== null && meetingState.zoneMemberIds.includes(sid)
        otherPlayer.updateMeetingIcon(inMyMeeting)
        // Indicateur de parole (cercle pulsant)
        const isSpeaking = meetingState.speakingPeerIds.has(sid)
        otherPlayer.updateSpeakingIndicator(isSpeaking)
        otherPlayer.updateSpeakingPulse()
      }
    }
  }
}
