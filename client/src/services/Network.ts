import { Client, Room } from 'colyseus.js'
import { IComputer, IOfficeState, IPlayer, IWhiteboard } from '../../../types/IOfficeState'
import { Message } from '../../../types/Messages'
import { IRoomData, RoomType } from '../../../types/Rooms'
import { ItemType } from '../../../types/Items'
import ZoneMeetingManager from '../web/ZoneMeetingManager'
import { phaserEvents, Event } from '../events/EventCenter'
import store from '../stores'
import {
  setSessionId,
  setPlayerNameMap,
  removePlayerNameMap,
  setPlayerZoneMap,
  removePlayerZoneMap,
  setPlayerRoleMap,
  removePlayerRoleMap,
  setPlayerStatusMap,
  removePlayerStatusMap,
} from '../stores/UserStore'
import {
  setLobbyJoined,
  setJoinedRoomData,
  setAvailableRooms,
  addAvailableRooms,
  removeAvailableRooms,
} from '../stores/RoomStore'
import {
  pushChatMessage,
  pushPlayerJoinedMessage,
  pushPlayerLeftMessage,
  pushZoneEnterMessage,
  pushZoneLeaveMessage,
} from '../stores/ChatStore'
import {
  notifyPlayerEnteredZone,
  notifyPlayerLeftZone,
  notifyChatMessage,
  notifyPlayerJoinedOffice,
  notifyPlayerLeftOffice,
} from '../web/notificationService'
import { setWhiteboardUrls } from '../stores/WhiteboardStore'
import { removePeerScreenStream } from '../stores/MeetingStore'

export default class Network {
  private client: Client
  private room?: Room<IOfficeState>
  private lobby!: Room
  zoneMeetingManager?: ZoneMeetingManager

  mySessionId!: string

  constructor() {
    const protocol = window.location.protocol.replace('http', 'ws')
    const endpoint =
      process.env.NODE_ENV === 'production'
        ? import.meta.env.VITE_SERVER_URL
        : `${protocol}//${window.location.hostname}:2567`
    this.client = new Client(endpoint)
    this.joinLobbyRoom().then(() => {
      store.dispatch(setLobbyJoined(true))
    })

    phaserEvents.on(Event.MY_PLAYER_NAME_CHANGE, this.updatePlayerName, this)
    phaserEvents.on(Event.MY_PLAYER_TEXTURE_CHANGE, this.updatePlayer, this)
  }

  /**
   * method to join Colyseus' built-in LobbyRoom, which automatically notifies
   * connected clients whenever rooms with "realtime listing" have updates
   */
  async joinLobbyRoom() {
    this.lobby = await this.client.joinOrCreate(RoomType.LOBBY)

    this.lobby.onMessage('rooms', (rooms) => {
      store.dispatch(setAvailableRooms(rooms))
    })

    this.lobby.onMessage('+', ([roomId, room]) => {
      store.dispatch(addAvailableRooms({ roomId, room }))
    })

    this.lobby.onMessage('-', (roomId) => {
      store.dispatch(removeAvailableRooms(roomId))
    })
  }

  // method to join the public lobby
  async joinOrCreatePublic() {
    this.room = await this.client.joinOrCreate(RoomType.PUBLIC)
    this.initialize()
  }

  // method to join a custom room
  async joinCustomById(roomId: string, password: string | null) {
    this.room = await this.client.joinById(roomId, { password })
    this.initialize()
  }

  // method to create a custom room
  async createCustom(roomData: IRoomData) {
    const { name, description, password, autoDispose } = roomData
    this.room = await this.client.create(RoomType.CUSTOM, {
      name,
      description,
      password,
      autoDispose,
    })
    this.initialize()
  }

  // set up all network listeners before the game starts
  initialize() {
    if (!this.room) return

    this.lobby.leave()
    this.mySessionId = this.room.sessionId
    store.dispatch(setSessionId(this.room.sessionId))
    // Creer le gestionnaire de reunions par zone
    this.zoneMeetingManager = new ZoneMeetingManager(this.mySessionId, (type, data) => {
      this.room?.send(type, data)
    })

    // new instance added to the players MapSchema
    this.room.state.players.onAdd = (player: IPlayer, key: string) => {
      if (key === this.mySessionId) return

      // track changes on every child object inside the players MapSchema
      player.onChange = (changes) => {
        changes.forEach((change) => {
          const { field, value } = change
          phaserEvents.emit(Event.PLAYER_UPDATED, field, value, key)

          // when a new player finished setting up player name
          if (field === 'name' && value !== '') {
            phaserEvents.emit(Event.PLAYER_JOINED, player, key)
            store.dispatch(setPlayerNameMap({ id: key, name: value }))
            store.dispatch(pushPlayerJoinedMessage(value))
            notifyPlayerJoinedOffice(value)
          }

          // Dispatcher les changements de zone au Redux store + notifications
          if (field === 'zone' && typeof value === 'string') {
            const previousZone = store.getState().user.playerZoneMap.get(
              key.replace(/[^0-9a-z]/gi, 'G')
            )
            store.dispatch(setPlayerZoneMap({ id: key, zone: value }))

            // Notifications d'entree/sortie de zone
            const playerName = store.getState().user.playerNameMap.get(
              key.replace(/[^0-9a-z]/gi, 'G')
            )
            if (playerName) {
              // Recuperer la zone du joueur local
              const myZone = store.getState().user.playerZoneMap.get(
                this.mySessionId.replace(/[^0-9a-z]/gi, 'G')
              )
              // Quelqu'un entre dans notre zone
              if (value === myZone) {
                store.dispatch(pushZoneEnterMessage({ name: playerName, zone: value }))
                notifyPlayerEnteredZone(playerName, value)
              }
              // Quelqu'un quitte notre zone
              if (previousZone && previousZone === myZone && value !== myZone) {
                store.dispatch(pushZoneLeaveMessage({ name: playerName, zone: previousZone }))
                notifyPlayerLeftZone(playerName, previousZone)
              }
            }
          }

          // Dispatcher les changements de role au Redux store
          if (field === 'role' && typeof value === 'string') {
            store.dispatch(setPlayerRoleMap({ id: key, role: value }))
          }

          // Dispatcher les changements de statut au Redux store
          if (field === 'status' && typeof value === 'string') {
            store.dispatch(setPlayerStatusMap({ id: key, status: value }))
          }
        })
      }
    }

    // an instance removed from the players MapSchema
    this.room.state.players.onRemove = (player: IPlayer, key: string) => {
      phaserEvents.emit(Event.PLAYER_LEFT, key)
      store.dispatch(pushPlayerLeftMessage(player.name))
      notifyPlayerLeftOffice(player.name)
      store.dispatch(removePlayerNameMap(key))
      store.dispatch(removePlayerZoneMap(key))
      store.dispatch(removePlayerRoleMap(key))
      store.dispatch(removePlayerStatusMap(key))
    }

    // new instance added to the computers MapSchema
    this.room.state.computers.onAdd = (computer: IComputer, key: string) => {
      // track changes on every child object's connectedUser
      computer.connectedUser.onAdd = (item, index) => {
        phaserEvents.emit(Event.ITEM_USER_ADDED, item, key, ItemType.COMPUTER)
      }
      computer.connectedUser.onRemove = (item, index) => {
        phaserEvents.emit(Event.ITEM_USER_REMOVED, item, key, ItemType.COMPUTER)
      }
    }

    // new instance added to the whiteboards MapSchema
    this.room.state.whiteboards.onAdd = (whiteboard: IWhiteboard, key: string) => {
      store.dispatch(
        setWhiteboardUrls({
          whiteboardId: key,
          roomId: whiteboard.roomId,
        })
      )
      // track changes on every child object's connectedUser
      whiteboard.connectedUser.onAdd = (item, index) => {
        phaserEvents.emit(Event.ITEM_USER_ADDED, item, key, ItemType.WHITEBOARD)
      }
      whiteboard.connectedUser.onRemove = (item, index) => {
        phaserEvents.emit(Event.ITEM_USER_REMOVED, item, key, ItemType.WHITEBOARD)
      }
    }

    // new instance added to the chatMessages ArraySchema
    this.room.state.chatMessages.onAdd = (item, index) => {
      store.dispatch(pushChatMessage(item))
    }

    // when the server sends room data
    this.room.onMessage(Message.SEND_ROOM_DATA, (content) => {
      store.dispatch(setJoinedRoomData(content))
    })

    // when a user sends a message
    this.room.onMessage(Message.ADD_CHAT_MESSAGE, ({ clientId, content }) => {
      phaserEvents.emit(Event.UPDATE_DIALOG_BUBBLE, clientId, content)
    })

    // when a computer user stops sharing screen
    this.room.onMessage(Message.STOP_SCREEN_SHARE, (clientId: string) => {
      const computerState = store.getState().computer
      computerState.shareScreenManager?.onUserLeft(clientId)
    })

    // Quand le serveur envoie une mise a jour des membres de zone
    this.room.onMessage(Message.ZONE_MEMBERS_UPDATE, (data: { zone: string; memberIds: string[] }) => {
      this.zoneMeetingManager?.onZoneMembersChanged(data.memberIds)
    })

    // Quand un joueur de la meme zone envoie un message chat (dialog bubble seulement, le message Redux est gere par chatMessages.onAdd)
    this.room.onMessage(Message.ZONE_CHAT_MESSAGE, ({ clientId, content }) => {
      phaserEvents.emit(Event.UPDATE_DIALOG_BUBBLE, clientId, content)
      // Notification sonore pour les messages de zone
      const senderName = store.getState().user.playerNameMap.get(
        clientId.replace(/[^0-9a-z]/gi, 'G')
      ) || ''
      notifyChatMessage(senderName, content)
    })

    // Quand un joueur de la meme zone arrete son partage d'ecran
    this.room.onMessage(Message.ZONE_SCREEN_SHARE_STOPPED, (clientId: string) => {
      this.zoneMeetingManager?.onPeerScreenShareStopped(clientId)
    })
  }

  // method to register event listener and call back function when a item user added
  onChatMessageAdded(callback: (playerId: string, content: string) => void, context?: any) {
    phaserEvents.on(Event.UPDATE_DIALOG_BUBBLE, callback, context)
  }

  // method to register event listener and call back function when a item user added
  onItemUserAdded(
    callback: (playerId: string, key: string, itemType: ItemType) => void,
    context?: any
  ) {
    phaserEvents.on(Event.ITEM_USER_ADDED, callback, context)
  }

  // method to register event listener and call back function when a item user removed
  onItemUserRemoved(
    callback: (playerId: string, key: string, itemType: ItemType) => void,
    context?: any
  ) {
    phaserEvents.on(Event.ITEM_USER_REMOVED, callback, context)
  }

  // method to register event listener and call back function when a player joined
  onPlayerJoined(callback: (Player: IPlayer, key: string) => void, context?: any) {
    phaserEvents.on(Event.PLAYER_JOINED, callback, context)
  }

  // method to register event listener and call back function when a player left
  onPlayerLeft(callback: (key: string) => void, context?: any) {
    phaserEvents.on(Event.PLAYER_LEFT, callback, context)
  }

  // method to register event listener and call back function when myPlayer is ready to connect
  onMyPlayerReady(callback: (key: string) => void, context?: any) {
    phaserEvents.on(Event.MY_PLAYER_READY, callback, context)
  }

  // method to register event listener and call back function when my video is connected
  onMyPlayerVideoConnected(callback: (key: string) => void, context?: any) {
    phaserEvents.on(Event.MY_PLAYER_VIDEO_CONNECTED, callback, context)
  }

  // method to register event listener and call back function when a player updated
  onPlayerUpdated(
    callback: (field: string, value: number | string, key: string) => void,
    context?: any
  ) {
    phaserEvents.on(Event.PLAYER_UPDATED, callback, context)
  }

  // method to send player updates to Colyseus server
  updatePlayer(currentX: number, currentY: number, currentAnim: string) {
    this.room?.send(Message.UPDATE_PLAYER, { x: currentX, y: currentY, anim: currentAnim })
  }

  // method to send player name to Colyseus server
  updatePlayerName(currentName: string) {
    this.room?.send(Message.UPDATE_PLAYER_NAME, { name: currentName })
  }

  // method to send ready-to-connect signal to Colyseus server
  readyToConnect() {
    this.room?.send(Message.READY_TO_CONNECT)
    phaserEvents.emit(Event.MY_PLAYER_READY)
  }

  // method to send ready-to-connect signal to Colyseus server
  videoConnected() {
    this.room?.send(Message.VIDEO_CONNECTED)
    phaserEvents.emit(Event.MY_PLAYER_VIDEO_CONNECTED)
  }

  connectToComputer(id: string) {
    this.room?.send(Message.CONNECT_TO_COMPUTER, { computerId: id })
  }

  disconnectFromComputer(id: string) {
    this.room?.send(Message.DISCONNECT_FROM_COMPUTER, { computerId: id })
  }

  connectToWhiteboard(id: string) {
    this.room?.send(Message.CONNECT_TO_WHITEBOARD, { whiteboardId: id })
  }

  disconnectFromWhiteboard(id: string) {
    this.room?.send(Message.DISCONNECT_FROM_WHITEBOARD, { whiteboardId: id })
  }

  onStopScreenShare(id: string) {
    this.room?.send(Message.STOP_SCREEN_SHARE, { computerId: id })
  }

  addChatMessage(content: string) {
    this.room?.send(Message.ADD_CHAT_MESSAGE, { content: content })
  }

  // Envoyer un message de chat scope a la zone actuelle
  addZoneChatMessage(content: string) {
    this.room?.send(Message.ADD_ZONE_CHAT_MESSAGE, { content })
  }

  // Envoyer le changement de zone au serveur
  updatePlayerZone(zone: string) {
    this.room?.send(Message.UPDATE_PLAYER_ZONE, { zone })
  }

  // Envoyer le role du joueur au serveur
  updatePlayerRole(role: string) {
    this.room?.send(Message.UPDATE_PLAYER_ROLE, { role })
  }

  // Envoyer le statut du joueur au serveur (available, meeting, dnd)
  updatePlayerStatus(status: string) {
    this.room?.send(Message.UPDATE_PLAYER_STATUS, { status })
  }
}
