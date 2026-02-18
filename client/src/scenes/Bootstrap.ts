import Phaser from 'phaser'
import Network from '../services/Network'
import { BackgroundMode } from '../../../types/BackgroundMode'
import { AVATARS } from '../characters/avatarConfig'
import store from '../stores'
import { setRoomJoined } from '../stores/RoomStore'

export default class Bootstrap extends Phaser.Scene {
  private preloadComplete = false
  network!: Network

  constructor() {
    super('bootstrap')
  }

  preload(): void {
    this.load.atlas(
      'cloud_day',
      'assets/background/cloud_day.png',
      'assets/background/cloud_day.json'
    )
    this.load.image('backdrop_day', 'assets/background/backdrop_day.png')
    this.load.atlas(
      'cloud_night',
      'assets/background/cloud_night.png',
      'assets/background/cloud_night.json'
    )
    this.load.image('backdrop_night', 'assets/background/backdrop_night.png')
    this.load.image('sun_moon', 'assets/background/sun_moon.png')

    this.load.tilemapTiledJSON('tilemap', 'assets/map/map.json')
    this.load.spritesheet('tiles_wall', 'assets/map/FloorAndGround.png', {
      frameWidth: 32,
      frameHeight: 32,
    })
    this.load.spritesheet('chairs', 'assets/items/chair.png', {
      frameWidth: 32,
      frameHeight: 64,
    })
    this.load.spritesheet('computers', 'assets/items/computer.png', {
      frameWidth: 96,
      frameHeight: 64,
    })
    this.load.spritesheet('whiteboards', 'assets/items/whiteboard.png', {
      frameWidth: 64,
      frameHeight: 64,
    })
    this.load.spritesheet('vendingmachines', 'assets/items/vendingmachine.png', {
      frameWidth: 48,
      frameHeight: 72,
    })
    this.load.spritesheet('office', 'assets/tileset/Modern_Office_Black_Shadow.png', {
      frameWidth: 32,
      frameHeight: 32,
    })
    this.load.spritesheet('generic', 'assets/tileset/Generic.png', {
      frameWidth: 32,
      frameHeight: 32,
    })
    // Charger tous les avatars du registre
    for (const avatar of AVATARS) {
      this.load.spritesheet(avatar.name, `assets/character/${avatar.name}.png`, {
        frameWidth: 32,
        frameHeight: 48,
      })
    }

    // ─── Audio: boucles ambiantes par zone ───────────────────────────────
    this.load.audio('ambient_brainstorm', 'assets/audio/ambient_brainstorm.wav')
    this.load.audio('ambient_meeting', 'assets/audio/ambient_meeting.wav')
    this.load.audio('ambient_deepwork', 'assets/audio/ambient_deepwork.wav')
    this.load.audio('ambient_sales', 'assets/audio/ambient_sales.wav')

    // ─── Audio: effets sonores ───────────────────────────────────────────
    this.load.audio('sfx_zone_chime', 'assets/audio/sfx_zone_chime.wav')
    this.load.audio('sfx_chat_pop', 'assets/audio/sfx_chat_pop.wav')
    this.load.audio('sfx_player_join', 'assets/audio/sfx_player_join.wav')
    this.load.audio('sfx_player_leave', 'assets/audio/sfx_player_leave.wav')
    this.load.audio('sfx_meeting_start', 'assets/audio/sfx_meeting_start.wav')
    this.load.audio('sfx_ui_click', 'assets/audio/sfx_ui_click.wav')
    this.load.audio('sfx_notification', 'assets/audio/sfx_notification.wav')

    this.load.on('complete', () => {
      this.preloadComplete = true
      this.launchBackground(store.getState().user.backgroundMode)
    })
  }

  init(): void {
    this.network = new Network()
  }

  private launchBackground(backgroundMode: BackgroundMode) {
    this.scene.launch('background', { backgroundMode })
  }

  launchGame(): void {
    if (!this.preloadComplete) return
    this.scene.launch('game', {
      network: this.network,
    })

    // update Redux state
    store.dispatch(setRoomJoined(true))
  }

  changeBackgroundMode(backgroundMode: BackgroundMode): void {
    this.scene.stop('background')
    this.launchBackground(backgroundMode)
  }
}
