import Phaser from 'phaser'

// import { debugDraw } from '../utils/debug'
import { createCharacterAnims } from '../anims/CharacterAnims'

import Item from '../items/Item'
import Chair from '../items/Chair'
import Computer from '../items/Computer'
import Whiteboard from '../items/Whiteboard'
import VendingMachine from '../items/VendingMachine'
import Door from '../items/Door'
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
import { startQueuing, stopQueuing } from '../stores/DeferredMessageStore'
import {
  setShowMeetingPreview,
  setPendingZone,
  setShowZoneEntryBanner,
} from '../stores/MeetingStore'
import { pushToast } from '../stores/ToastStore'
import { NavKeys, Keyboard } from '../../../types/KeyboardState'
import { sanitizeId } from '../util'
import { ZONE_NAMES, MEETING_ZONES } from '../constants'
import LightingManager from './LightingManager'
import ZoneParticleManager from './ZoneParticleManager'
import AudioManager, { SFX } from './AudioManager'
import badgeService from '../services/BadgeService'

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
  private doorGroup!: Phaser.Physics.Arcade.StaticGroup

  // Detection de zones
  private zones: Map<string, Phaser.Geom.Rectangle> = new Map()
  private currentZone = ''

  // Eclairage & atmosphere
  private lightingManager!: LightingManager

  // Particules & feedback visuel
  private particleManager!: ZoneParticleManager

  // Audio ambiant & effets sonores (public pour acces depuis React/MediaSettings)
  audioManager!: AudioManager

  // Grace period et banniere d'entree en zone de reunion
  private keyM!: Phaser.Input.Keyboard.Key
  private zoneEntryTimer: ReturnType<typeof setTimeout> | null = null
  private bannerAutoHideTimer: ReturnType<typeof setTimeout> | null = null

  // Suivi des joins recents pour camera shake multi-join
  private recentJoinTimestamps: number[] = []

  // Cinematique d'entree (jouee une seule fois au login)
  private entrancePlayed = false

  // 3C — Detection AFK (3 min sans input)
  private afkTimer = 0
  private isAfk = false
  private readonly AFK_TIMEOUT = 180000 // 3 minutes en ms

  constructor() {
    super('game')
  }

  registerKeys(): void {
    this.cursors = {
      ...this.input.keyboard.createCursorKeys(),
      ...(this.input.keyboard.addKeys('W,S,A,D') as Keyboard),
    }

    // maybe we can have a dedicated method for adding keys if more keys are needed in the future
    this.keyE = this.input.keyboard.addKey('E')
    this.keyR = this.input.keyboard.addKey('R')
    this.keyM = this.input.keyboard.addKey('M')
    this.input.keyboard.disableGlobalCapture()
    this.input.keyboard.on('keydown-ENTER', () => {
      store.dispatch(setShowChat(true))
      store.dispatch(setFocused(true))
    })
    this.input.keyboard.on('keydown-ESC', () => {
      store.dispatch(setShowChat(false))
    })

    // Jouer la cinematique d'entree une seule fois
    if (!this.entrancePlayed) {
      this.entrancePlayed = true
      this.playEntranceCinematic()
      // Demarrer le suivi des badges
      badgeService.start()
    }
  }

  /** Cinematique d'entree: zoom camera + fade-in joueur + toast de bienvenue */
  private playEntranceCinematic() {
    const cam = this.cameras.main

    // Demarrer zoome out, puis tween vers le zoom par defaut
    cam.zoom = 1.5
    this.tweens.add({
      targets: cam,
      zoom: 2.0,
      duration: 1500,
      ease: 'Cubic.easeOut',
    })

    // Fade-in du joueur
    this.myPlayer.setAlpha(0)
    this.tweens.add({
      targets: this.myPlayer,
      alpha: 1,
      duration: 800,
      ease: 'Power2',
    })

    // Burst de particules a la position du joueur
    this.particleManager?.burstJoin(this.myPlayer.x, this.myPlayer.y)

    // Toast de bienvenue (apres un court delai)
    this.time.delayedCall(600, () => {
      const zoneName = this.currentZone
        ? ZONE_NAMES[this.currentZone] || this.currentZone
        : 'le bureau'
      const playerName = this.myPlayer.playerName?.text || ''
      const msg = playerName
        ? `Bienvenue, ${playerName} ! Vous etes dans ${zoneName}.`
        : `Bienvenue dans ${zoneName} !`
      store.dispatch(pushToast({ message: msg, type: 'success' }))
    })
  }

  disableKeys(): void {
    this.input.keyboard.enabled = false
  }

  enableKeys(): void {
    this.input.keyboard.enabled = true
  }

  create(data: { network: Network }): void {
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

    // Spawn au centre de la salle Remue-meninges (brainstorm)
    this.myPlayer = this.add.myPlayer(192, 144, 'adam', this.network.mySessionId)
    this.playerSelector = new PlayerSelector(this, 0, 0, 16, 16)

    // Charger les zones depuis le layer Zone de la tilemap
    const zoneLayer = this.map.getObjectLayer('Zone')
    if (zoneLayer) {
      zoneLayer.objects.forEach((zoneObj) => {
        const zoneName = zoneObj.name || 'unknown'
        const zx = zoneObj.x ?? 0
        const zy = zoneObj.y ?? 0
        const zw = zoneObj.width ?? 0
        const zh = zoneObj.height ?? 0
        this.zones.set(zoneName, new Phaser.Geom.Rectangle(zx, zy, zw, zh))
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

    // Dessiner les murs visibles entre les salles
    this.drawRoomWalls()

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
      vendingMachineLayer.objects.forEach((obj) => {
        this.addObjectFromTiled(vendingMachines, obj, 'vendingmachines', 'vendingmachine')
      })
    }

    // Charger les objets decoratifs (avec null checks pour les layers optionnels)
    const objectsGroup = this.addGroupFromTiled('Objects', 'office', 'Modern_Office_Black_Shadow', false)
    const objectsCollideGroup = this.addGroupFromTiled('ObjectsOnCollide', 'office', 'Modern_Office_Black_Shadow', true)
    const genericGroup = this.addGroupFromTiled('GenericObjects', 'generic', 'Generic', false)
    const genericCollideGroup = this.addGroupFromTiled('GenericObjectsOnCollide', 'generic', 'Generic', true)

    // 6.1 — Animer les objets decoratifs (plantes, ecrans, posters)
    this.animateDecorativeObjects(
      objectsGroup, objectsCollideGroup,
      genericGroup, genericCollideGroup
    )

    // Creer les murs et portes entre les salles
    this.createWallsAndDoors()

    this.otherPlayers = this.physics.add.group({ classType: OtherPlayer })

    this.cameras.main.zoom = 2.0
    this.cameras.main.startFollow(this.myPlayer, true, 0.08, 0.08)
    this.cameras.main.setDeadzone(40, 40)

    // Limiter la camera aux bords de la carte
    const mapWidth = this.map.widthInPixels
    const mapHeight = this.map.heightInPixels
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight)

    // Zoom molette de souris (smooth tween)
    this.input.on('wheel', (_pointer: any, _gameObjects: any, _dx: number, dy: number) => {
      const cam = this.cameras.main
      const target = dy > 0
        ? Math.max(MIN_ZOOM, cam.zoom - ZOOM_STEP)
        : Math.min(MAX_ZOOM, cam.zoom + ZOOM_STEP)
      this.tweens.add({ targets: cam, zoom: target, duration: 200, ease: 'Sine.easeOut' })
    })

    // Zoom clavier +/- (smooth tween)
    this.input.keyboard.on('keydown-PLUS', () => {
      const cam = this.cameras.main
      const target = Math.min(MAX_ZOOM, cam.zoom + ZOOM_STEP)
      this.tweens.add({ targets: cam, zoom: target, duration: 200, ease: 'Sine.easeOut' })
    })
    this.input.keyboard.on('keydown-MINUS', () => {
      const cam = this.cameras.main
      const target = Math.max(MIN_ZOOM, cam.zoom - ZOOM_STEP)
      this.tweens.add({ targets: cam, zoom: target, duration: 200, ease: 'Sine.easeOut' })
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
    this.network.onEmojiReaction(this.handleEmojiReaction, this)
    this.network.onTypingStatus(this.handleTypingStatus, this)
    this.network.onAfkStatus(this.handleAfkStatus, this)

    // ─── Eclairage & atmosphere ───────────────────────────────────────────
    this.lightingManager = new LightingManager(this)

    // Appliquer Light2D sur le sol et les groupes decoratifs
    this.lightingManager.enableLightOnLayer(groundLayer)
    this.lightingManager.enableLightOnGroup(chairs)
    this.lightingManager.enableLightOnGroup(computers)
    this.lightingManager.enableLightOnGroup(whiteboards)
    this.lightingManager.enableLightOnGroup(vendingMachines)

    // Ajouter des lumieres centrales par zone
    this.lightingManager.addZoneLights(this.zones)

    // Ajouter des lumieres ponctuelles sur les ordinateurs
    computers.getChildren().forEach((child) => {
      if (child instanceof Phaser.GameObjects.Sprite) {
        this.lightingManager.addPointLight(child.x, child.y, 0x88ccff, 60, 0.6)
      }
    })

    // Ajouter des ombres sous les objets decoratifs et items
    this.lightingManager.addShadowsToGroup(chairs)
    this.lightingManager.addShadowsToGroup(computers)
    this.lightingManager.addShadowsToGroup(whiteboards)
    this.lightingManager.addShadowsToGroup(vendingMachines)

    // Ecouter les changements de mode jour/nuit depuis la scene Background
    this.events.on('background-mode-changed', (mode: number) => {
      // BackgroundMode.DAY = 0, BackgroundMode.NIGHT = 1
      this.lightingManager.setNightMode(mode === 1)
    })

    // ─── Particules & feedback visuel ─────────────────────────────────────
    // Generer la texture de particule (petit cercle blanc 8x8)
    if (!this.textures.exists('particle_white')) {
      const gfx = this.make.graphics({ x: 0, y: 0, add: false })
      gfx.fillStyle(0xffffff, 1)
      gfx.fillCircle(4, 4, 4)
      gfx.generateTexture('particle_white', 8, 8)
      gfx.destroy()
    }

    this.particleManager = new ZoneParticleManager(this, this.zones)

    // ─── Audio ambiant & effets sonores ───────────────────────────────────
    this.audioManager = new AudioManager(this)

    // Activer la vapeur sur les machines distributrices
    vendingMachines.getChildren().forEach((child) => {
      if (child instanceof VendingMachine) {
        child.startSteam()
      }
    })
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
      // 6.4 — Retirer le glow de l'ancien item
      currentItem.clearTint()
    }

    // set selected item and set up new dialog
    playerSelector.selectedItem = selectionItem
    selectionItem.onOverlapDialog()
    // 6.4 — Glow vert sur l'item survole
    selectionItem.setTint(0xaaffaa)
  }

  // ─── 6.1 — Tweens sur objets decoratifs ──────────────────────────────────
  private animateDecorativeObjects(...groups: Phaser.Physics.Arcade.StaticGroup[]) {
    // Frame indices par tileset pour chaque type d'objet
    const PLANT_FRAMES: Record<string, number[]> = {
      office: [69],
      generic: [180, 181, 182, 183, 184, 185, 186, 187, 448, 449, 450, 451],
    }
    const SCREEN_FRAMES: Record<string, number[]> = {
      office: [71, 88, 89, 104, 105],
    }
    const POSTER_FRAMES: Record<string, number[]> = {
      office: [70, 96, 97, 98, 99],
      generic: [188, 189],
    }

    for (const group of groups) {
      group.getChildren().forEach((child) => {
        if (!(child instanceof Phaser.GameObjects.Sprite)) return
        const key = child.texture.key
        const frame = parseInt(child.frame.name, 10)

        // Plantes: tween scale 1.0↔1.05 (balancement doux)
        if (PLANT_FRAMES[key]?.includes(frame)) {
          this.tweens.add({
            targets: child,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 2000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
            delay: Math.random() * 2000,
          })
        }

        // Ecrans: flicker alpha 0.9↔1.0 (intervalle aleatoire)
        if (SCREEN_FRAMES[key]?.includes(frame)) {
          this.tweens.add({
            targets: child,
            alpha: 0.9,
            duration: 100 + Math.random() * 200,
            ease: 'Power1',
            yoyo: true,
            repeat: -1,
            repeatDelay: 1000 + Math.random() * 3000,
          })
        }

        // Posters: rotation ±2deg (onde sinusoidale lente)
        if (POSTER_FRAMES[key]?.includes(frame)) {
          this.tweens.add({
            targets: child,
            angle: { from: -2, to: 2 },
            duration: 3000 + Math.random() * 2000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
          })
        }
      })
    }
  }

  private addObjectFromTiled(
    group: Phaser.Physics.Arcade.StaticGroup,
    object: Phaser.Types.Tilemaps.TiledObject,
    key: string,
    tilesetName: string
  ): Phaser.GameObjects.GameObject {
    const actualX = (object.x ?? 0) + (object.width ?? 0) * 0.5
    const actualY = (object.y ?? 0) - (object.height ?? 0) * 0.5
    const tileset = this.map.getTileset(tilesetName)
    const firstgid = tileset ? tileset.firstgid : 0
    const obj = group
      .get(actualX, actualY, key, (object.gid ?? 0) - firstgid)
      .setDepth(actualY)
    return obj
  }

  private addGroupFromTiled(
    objectLayerName: string,
    key: string,
    tilesetName: string,
    collidable: boolean
  ): Phaser.Physics.Arcade.StaticGroup {
    const group = this.physics.add.staticGroup()
    const objectLayer = this.map.getObjectLayer(objectLayerName)
    if (!objectLayer) return group // le layer n'existe pas ou est vide
    const tileset = this.map.getTileset(tilesetName)
    const firstgid = tileset ? tileset.firstgid : 0
    objectLayer.objects.forEach((object) => {
      const actualX = (object.x ?? 0) + (object.width ?? 0) * 0.5
      const actualY = (object.y ?? 0) - (object.height ?? 0) * 0.5
      group
        .get(actualX, actualY, key, (object.gid ?? 0) - firstgid)
        .setDepth(actualY)
    })
    if (this.myPlayer && collidable)
      this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], group)
    return group
  }

  // ─── Murs visibles entre les salles ──────────────────────────────────────
  private drawRoomWalls() {
    const wallColor = 0x1a1a2e
    const wallAlpha = 0.85
    const borderColor = 0x334155
    const doorColor = 0x14b8a6

    const gfx = this.add.graphics().setDepth(997)

    // Segments de murs (memes positions que les zones de collision, sans les portes)
    const wallRects = [
      // Mur vertical: brainstorm↔meeting
      [352, 32, 64, 96],   // au-dessus de la porte A
      [352, 160, 64, 96],  // en-dessous de la porte A
      // Mur vertical: deep_work↔sales
      [352, 320, 64, 96],  // au-dessus de la porte B
      [352, 448, 64, 96],  // en-dessous de la porte B
      // Mur horizontal: brainstorm↔deep_work
      [32, 256, 144, 64],  // a gauche de la porte C
      [208, 256, 144, 64], // a droite de la porte C
      // Mur horizontal: meeting↔sales
      [416, 256, 144, 64], // a gauche de la porte D
      [592, 256, 144, 64], // a droite de la porte D
      // Intersection centrale
      [352, 256, 64, 64],
    ]

    for (const [x, y, w, h] of wallRects) {
      gfx.fillStyle(wallColor, wallAlpha)
      gfx.fillRect(x, y, w, h)
      gfx.lineStyle(1, borderColor, 0.5)
      gfx.strokeRect(x, y, w, h)
    }

    // Ouvertures de portes — surlignage subtil
    const doorGaps = [
      [352, 128, 64, 32],  // porte A
      [352, 416, 64, 32],  // porte B
      [176, 256, 32, 64],  // porte C
      [560, 256, 32, 64],  // porte D
    ]
    for (const [x, y, w, h] of doorGaps) {
      gfx.fillStyle(doorColor, 0.12)
      gfx.fillRect(x, y, w, h)
      gfx.lineStyle(1, doorColor, 0.3)
      gfx.strokeRect(x, y, w, h)
    }
  }

  // ─── Murs et portes entre les salles ─────────────────────────────────────
  private createWallsAndDoors() {
    const wallZones: Phaser.GameObjects.Zone[] = []

    // Helper: creer un rectangle de collision invisible
    const addWallRect = (x: number, y: number, w: number, h: number) => {
      const zone = this.add.zone(x + w / 2, y + h / 2, w, h)
      this.physics.add.existing(zone, true) // true = statique
      wallZones.push(zone)
      return zone
    }

    // Mur A (vertical): entre brainstorm et meeting — x=352..416, y=32..256
    // Porte au centre a y=128..160 (gap de 32px)
    addWallRect(352, 32, 64, 96)   // au-dessus de la porte: y=32..128
    addWallRect(352, 160, 64, 96)  // en-dessous de la porte: y=160..256

    // Mur B (vertical): entre deep_work et sales — x=352..416, y=320..544
    // Porte au centre a y=416..448
    addWallRect(352, 320, 64, 96)  // au-dessus de la porte: y=320..416
    addWallRect(352, 448, 64, 96)  // en-dessous de la porte: y=448..544

    // Mur C (horizontal): entre brainstorm et deep_work — x=32..352, y=256..320
    // Porte au centre a x=176..208
    addWallRect(32, 256, 144, 64)  // a gauche de la porte: x=32..176
    addWallRect(208, 256, 144, 64) // a droite de la porte: x=208..352

    // Mur D (horizontal): entre meeting et sales — x=416..736, y=256..320
    // Porte au centre a x=560..592
    addWallRect(416, 256, 144, 64) // a gauche de la porte: x=416..560
    addWallRect(592, 256, 144, 64) // a droite de la porte: x=592..736

    // Bloc central: intersection x=352..416, y=256..320 (entierement bloque)
    addWallRect(352, 256, 64, 64)

    // Ajouter les colliders pour tous les murs
    for (const wz of wallZones) {
      this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], wz)
    }

    // ─── Portes interactives ──────────────────────────────────────────────
    this.doorGroup = this.physics.add.staticGroup({ classType: Door })

    const doorDefs = [
      // Porte A: brainstorm ↔ meeting (mur vertical)
      { x: 384, y: 144, orientation: 'vertical' as const,
        sideA: { x: 344, y: 144 }, sideB: { x: 424, y: 144 } },
      // Porte B: deep_work ↔ sales (mur vertical)
      { x: 384, y: 432, orientation: 'vertical' as const,
        sideA: { x: 344, y: 432 }, sideB: { x: 424, y: 432 } },
      // Porte C: brainstorm ↔ deep_work (mur horizontal)
      { x: 192, y: 288, orientation: 'horizontal' as const,
        sideA: { x: 192, y: 248 }, sideB: { x: 192, y: 328 } },
      // Porte D: meeting ↔ sales (mur horizontal)
      { x: 576, y: 288, orientation: 'horizontal' as const,
        sideA: { x: 576, y: 248 }, sideB: { x: 576, y: 328 } },
    ]

    for (const def of doorDefs) {
      const door = new Door(this, def.x, def.y, 'generic', 0)
      door.orientation = def.orientation
      door.sideA = def.sideA
      door.sideB = def.sideB
      door.setVisible(false)
      this.doorGroup.add(door)
      this.physics.add.existing(door, true)
      const body = door.body as Phaser.Physics.Arcade.StaticBody
      body.setSize(32, 32)
      body.setOffset(door.x - 16, door.y - 16)

    }

    // Enregistrer la detection d'overlap avec les portes
    this.physics.add.overlap(
      this.playerSelector,
      this.doorGroup,
      this.handleItemSelectorOverlap,
      undefined,
      this
    )
  }

  // function to add new player to the otherPlayer group
  private handlePlayerJoined(newPlayer: IPlayer, id: string) {
    const otherPlayer = this.add.otherPlayer(newPlayer.x, newPlayer.y, 'adam', id, newPlayer.name)
    this.otherPlayers.add(otherPlayer)
    this.otherPlayerMap.set(id, otherPlayer)
    // Burst vert a la position de spawn + SFX
    this.particleManager?.burstJoin(newPlayer.x, newPlayer.y)
    this.audioManager?.playSFX(SFX.PLAYER_JOIN)

    // 6.5 — Camera shake si 3+ joueurs rejoignent en moins de 2s
    const now = Date.now()
    this.recentJoinTimestamps.push(now)
    this.recentJoinTimestamps = this.recentJoinTimestamps.filter((ts) => now - ts < 2000)
    if (this.recentJoinTimestamps.length >= 3) {
      this.cameras.main.shake(150, 0.003)
      this.recentJoinTimestamps = []
    }
  }

  // function to remove the player who left from the otherPlayer group
  private handlePlayerLeft(id: string) {
    if (this.otherPlayerMap.has(id)) {
      const otherPlayer = this.otherPlayerMap.get(id)
      if (!otherPlayer) return
      // Burst gris + fade-out avant suppression + SFX
      this.particleManager?.burstLeave(otherPlayer.x, otherPlayer.y)
      this.audioManager?.playSFX(SFX.PLAYER_LEAVE)
      this.tweens.add({
        targets: otherPlayer,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          this.otherPlayers.remove(otherPlayer, true, true)
          this.otherPlayerMap.delete(id)
        },
      })
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
    this.audioManager?.playSFX(SFX.CHAT_POP)
  }

  private handleEmojiReaction(playerId: string, emoji: string) {
    const otherPlayer = this.otherPlayerMap.get(playerId)
    otherPlayer?.showEmoji(emoji)
  }

  private handleTypingStatus(playerId: string, typing: boolean) {
    const otherPlayer = this.otherPlayerMap.get(playerId)
    otherPlayer?.updateTypingIndicator(typing)
  }

  private handleAfkStatus(playerId: string, afk: boolean) {
    const otherPlayer = this.otherPlayerMap.get(playerId)
    otherPlayer?.updateAfkStatus(afk)
  }

  // ─── Grace period et banniere d'entree en zone de reunion ──────────────

  /** Demarre un timer de 1.5s : si le joueur reste dans la zone, rejoint automatiquement la reunion */
  private startZoneEntryGracePeriod(zoneName: string): void {
    this.clearZoneEntryTimer()
    this.zoneEntryTimer = setTimeout(() => {
      this.zoneEntryTimer = null
      // Rejoindre automatiquement la reunion de zone
      this.network.zoneMeetingManager?.joinZone(zoneName)
      // 6.5 — Camera shake subtil au demarrage de la reunion
      this.cameras.main.shake(100, 0.002)
      // Auto-join reunion de zone
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

  update(_t: number, dt: number): void {
    if (this.myPlayer && this.network) {
      // Ne rien faire si les touches ne sont pas encore enregistrees (avant login)
      if (!this.cursors) return
      this.playerSelector.update(this.myPlayer, this.cursors)
      this.myPlayer.update(this.playerSelector, this.cursors, this.keyE, this.keyR, this.network)

      // 6.4 — Retirer le glow si le joueur s'eloigne de l'item selectionne
      const selector = this.playerSelector as any
      const selectedItem = selector.selectedItem as Item
      if (selectedItem && this.myPlayer.playerBehavior !== PlayerBehavior.SITTING) {
        const dx = Math.abs(this.myPlayer.x - selectedItem.x)
        const dy = Math.abs(this.myPlayer.y - selectedItem.y)
        if (dx > 40 || dy > 40) {
          selectedItem.clearTint()
          selectedItem.clearDialogBox()
          selector.selectedItem = undefined
        }
      }

      // 3C — Detection AFK : reset le timer si un input est detecte
      const hasInput =
        this.cursors.left?.isDown || this.cursors.right?.isDown ||
        this.cursors.up?.isDown || this.cursors.down?.isDown ||
        this.cursors.W?.isDown || this.cursors.A?.isDown ||
        this.cursors.S?.isDown || this.cursors.D?.isDown ||
        this.input.activePointer?.isDown
      if (hasInput) {
        if (this.isAfk) {
          this.isAfk = false
          this.myPlayer.updateAfkStatus(false)
          this.network.sendAfkStatus(false)
        }
        this.afkTimer = 0
      } else {
        this.afkTimer += dt
        if (!this.isAfk && this.afkTimer >= this.AFK_TIMEOUT) {
          this.isAfk = true
          this.myPlayer.updateAfkStatus(true)
          this.network.sendAfkStatus(true)
        }
      }

      // 5D — Animations idle variees (bob subtil apres 5s immobile)
      const isMoving = this.myPlayer.body?.velocity?.length() > 5
      this.myPlayer.updateIdleAnimation(dt, isMoving)

      // 3C — Animation AFK du joueur local
      this.myPlayer.updateAfkAnimation()

      // 2D — Transparence quand les joueurs se chevauchent
      let hasNearbyPlayer = false
      for (const [, otherPlayer] of this.otherPlayerMap) {
        const dist = Phaser.Math.Distance.Between(
          this.myPlayer.x, this.myPlayer.y,
          otherPlayer.x, otherPlayer.y
        )
        if (dist < 48) hasNearbyPlayer = true
        const targetAlpha = dist < 24 ? 0.5 : 1
        if (Math.abs(otherPlayer.alpha - targetAlpha) > 0.01) {
          this.tweens.add({
            targets: otherPlayer,
            alpha: targetAlpha,
            duration: 200,
            ease: 'Sine.easeOut',
          })
        }
      }

      // 2E — Mise a jour de l'aura de proximite
      this.myPlayer.updateProximityAura(hasNearbyPlayer)

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
            } else if (name === 'afk') {
              this.network.updatePlayerStatus('afk')
            } else if (name === 'meeting' || name === 'sales' || name === 'one_on_one') {
              this.network.updatePlayerStatus('meeting')
            } else {
              this.network.updatePlayerStatus('available')
            }
            // Mettre a jour l'eclairage, les particules et l'audio de zone
            this.lightingManager.setZone(name)
            this.particleManager.onZoneChanged(
              name,
              this.myPlayer.x,
              this.myPlayer.y,
              ZONE_NAMES[name] || name
            )
            this.audioManager.setZone(name)
            this.audioManager.playSFX(SFX.ZONE_CHIME)

            // Suivi des badges : entree dans une nouvelle zone
            badgeService.checkZoneEntry(name)

            // 2F — Flash rapide blanc + tween overlay dramatique
            this.cameras.main.flash(50, 255, 255, 255, false, undefined, 0.15)
            this.lightingManager.flashTransition()

            // Declencher join/leave de la reunion de zone
            this.clearZoneEntryTimer()
            this.hideBanner()

            if (name === 'deep_work' || name === 'afk') {
              // Activer le mode file d'attente des messages
              store.dispatch(startQueuing())
              this.network.zoneMeetingManager?.leaveZone()
            } else {
              // Desactiver le mode file d'attente (le resume sera affiche par React)
              const wasQueuing = store.getState().deferredMessage.isQueuing
              if (wasQueuing) {
                store.dispatch(stopQueuing())
              }
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
      // 3A — Animer le typing indicator du joueur local
      this.myPlayer.updateTypingAnimation()

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
        // 3A — Animer les typing indicators des autres joueurs
        otherPlayer.updateTypingAnimation()
        // 3C — Animer les AFK des autres joueurs
        otherPlayer.updateAfkAnimation()
        // 5D — Animer les idle des autres joueurs
        const otherIsMoving = otherPlayer.body?.velocity?.length() > 5
        otherPlayer.updateIdleAnimation(dt, otherIsMoving)
      }
    }
  }
}
