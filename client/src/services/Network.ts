import { Client, Room } from 'colyseus.js'
import { IComputer, IOfficeState, IPlayer, IWhiteboard } from '../../../types/IOfficeState'
import { Message } from '../../../types/Messages'
import { IRoomData, RoomType } from '../../../types/Rooms'
import { ItemType } from '../../../types/Items'
import { liveKitService } from '../web/LiveKitService'
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
  setPlayerAfkReasonMap,
  removePlayerAfkReasonMap,
  setPlayerSalesStatusMap,
  removePlayerSalesStatusMap,
  setPlayerJoinTime,
  removePlayerJoinTime,
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
  pushAfkEnterMessage,
  pushAfkLeaveMessage,
  pushBotMessage,
  setBotTyping,
} from '../stores/ChatStore'
import {
  notifyPlayerEnteredZone,
  notifyPlayerLeftZone,
  notifyChatMessage,
  notifyPlayerJoinedOffice,
  notifyPlayerLeftOffice,
} from '../web/notificationService'
import { setZoneMemberIds, removePeerScreenStream } from '../stores/MeetingStore'
import { setWhiteboardUrls } from '../stores/WhiteboardStore'
import { pushToast } from '../stores/ToastStore'
import { addDeferredMessage } from '../stores/DeferredMessageStore'
import { addPendingKnock, addKnockResult } from '../stores/KnockStore'
import { addObserver, removeObserver } from '../stores/ObserveStore'
import { setInvite, setResult } from '../stores/BoothInviteStore'
import { setRemoteRecording, clearRemoteRecording } from '../stores/RecordingStore'
import { syncTimer, setAgenda, setNotes } from '../stores/MeetingToolsStore'
import {
  addNote,
  removeNote,
  updateVotes,
  clearBoard,
  setNotes as setBrainstormNotes,
} from '../stores/BrainstormStore'
import type { StickyNote } from '../stores/BrainstormStore'
import { addActivityEvent } from '../stores/DashboardStore'
import { recordZoneEntry, recordZoneExit } from '../stores/AnalyticsStore'

export default class Network {
  private client: Client
  private room?: Room<IOfficeState>
  private lobby!: Room

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
  async joinLobbyRoom(): Promise<void> {
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
  async joinOrCreatePublic(): Promise<void> {
    this.room = await this.client.joinOrCreate(RoomType.PUBLIC)
    this.initialize()
  }

  // method to join a custom room
  async joinCustomById(roomId: string, password: string | null): Promise<void> {
    this.room = await this.client.joinById(roomId, { password })
    this.initialize()
  }

  // method to create a custom room
  async createCustom(roomData: IRoomData): Promise<void> {
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
  initialize(): void {
    if (!this.room) return

    this.lobby.leave()
    this.mySessionId = this.room.sessionId
    store.dispatch(setSessionId(this.room.sessionId))
    // Configurer le service LiveKit pour qu'il puisse envoyer des messages Colyseus
    liveKitService.setMessageSender((type, data) => {
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
            store.dispatch(setPlayerJoinTime({ id: key, time: Date.now() }))
            store.dispatch(pushPlayerJoinedMessage(value))
            notifyPlayerJoinedOffice(value)
            // Analytics: enregistrer la zone initiale du joueur qui rejoint
            if (player.zone) {
              store.dispatch(recordZoneEntry({ playerId: key, playerName: value, zone: player.zone }))
            }
          }

          // Dispatcher les changements de zone au Redux store + notifications
          if (field === 'zone' && typeof value === 'string') {
            const previousZone = store.getState().user.playerZoneMap.get(
              key.replace(/[^0-9a-z]/gi, 'G')
            )
            // Toujours mettre a jour la presence (meme en mode queuing)
            store.dispatch(setPlayerZoneMap({ id: key, zone: value }))

            // ─── Analytics: enregistrer sortie de l'ancienne zone et entree dans la nouvelle
            const analyticsPlayerName = store.getState().user.playerNameMap.get(
              key.replace(/[^0-9a-z]/gi, 'G')
            ) || key
            if (previousZone) {
              store.dispatch(recordZoneExit({ playerId: key }))
            }
            store.dispatch(recordZoneEntry({ playerId: key, playerName: analyticsPlayerName, zone: value }))

            const isQueuing = store.getState().deferredMessage.isQueuing

            // Alimenter le flux d'activite du Dashboard
            const dashPlayerName = store.getState().user.playerNameMap.get(
              key.replace(/[^0-9a-z]/gi, 'G')
            )
            if (dashPlayerName) {
              let details: string | undefined
              const afkReason = store.getState().user.playerAfkReasonMap.get(
                key.replace(/[^0-9a-z]/gi, 'G')
              )
              const salesStatus = store.getState().user.playerSalesStatusMap.get(
                key.replace(/[^0-9a-z]/gi, 'G')
              )
              if (value === 'afk' && afkReason) details = afkReason
              if (value === 'sales' && salesStatus) details = salesStatus
              if (value === 'deep_work') details = 'dnd'

              store.dispatch(addActivityEvent({
                id: `${key}-${Date.now()}`,
                playerName: dashPlayerName,
                zone: value,
                previousZone: previousZone || '',
                timestamp: Date.now(),
                details,
              }))
            }

            // Notifications d'entree/sortie de zone
            const playerName = store.getState().user.playerNameMap.get(
              key.replace(/[^0-9a-z]/gi, 'G')
            )
            if (playerName) {
              // Recuperer la zone du joueur local
              const myZone = store.getState().user.playerZoneMap.get(
                this.mySessionId.replace(/[^0-9a-z]/gi, 'G')
              )

              // Si le joueur entre dans la zone AFK, message specifique sans notification sonore/desktop
              if (value === 'afk') {
                if (isQueuing) {
                  store.dispatch(addDeferredMessage({
                    type: 'zone_enter',
                    from: playerName,
                    content: 'est en pause',
                    zone: 'afk',
                    timestamp: Date.now(),
                  }))
                } else {
                  store.dispatch(pushAfkEnterMessage(playerName))
                }
              } else if (previousZone === 'afk') {
                // Le joueur revient de la zone AFK
                if (isQueuing) {
                  store.dispatch(addDeferredMessage({
                    type: 'zone_leave',
                    from: playerName,
                    content: 'est de retour',
                    zone: 'afk',
                    timestamp: Date.now(),
                  }))
                } else {
                  store.dispatch(pushAfkLeaveMessage(playerName))
                }
              }

              // Quelqu'un entre dans notre zone (sauf AFK — pas de notification)
              if (value === myZone && value !== 'afk') {
                if (isQueuing) {
                  store.dispatch(addDeferredMessage({
                    type: 'zone_enter',
                    from: playerName,
                    content: `est entre(e) dans la zone`,
                    zone: value,
                    timestamp: Date.now(),
                  }))
                } else {
                  store.dispatch(pushZoneEnterMessage({ name: playerName, zone: value }))
                  notifyPlayerEnteredZone(playerName, value)
                }
              }
              // Quelqu'un quitte notre zone (sauf si on est en AFK)
              if (previousZone && previousZone === myZone && value !== myZone && previousZone !== 'afk') {
                if (isQueuing) {
                  store.dispatch(addDeferredMessage({
                    type: 'zone_leave',
                    from: playerName,
                    content: `a quitte la zone`,
                    zone: previousZone,
                    timestamp: Date.now(),
                  }))
                } else {
                  store.dispatch(pushZoneLeaveMessage({ name: playerName, zone: previousZone }))
                  notifyPlayerLeftZone(playerName, previousZone)
                }
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

          // Dispatcher les changements de raison AFK au Redux store
          if (field === 'afkReason' && typeof value === 'string') {
            store.dispatch(setPlayerAfkReasonMap({ id: key, reason: value }))
          }

          // Dispatcher les changements de statut Sales au Redux store
          if (field === 'salesStatus' && typeof value === 'string') {
            store.dispatch(setPlayerSalesStatusMap({ id: key, salesStatus: value }))
          }
        })
      }
    }

    // an instance removed from the players MapSchema
    this.room.state.players.onRemove = (player: IPlayer, key: string) => {
      phaserEvents.emit(Event.PLAYER_LEFT, key)
      store.dispatch(pushPlayerLeftMessage(player.name))
      notifyPlayerLeftOffice(player.name)
      // Analytics: fermer la derniere entree de zone ouverte pour ce joueur
      store.dispatch(recordZoneExit({ playerId: key }))
      store.dispatch(removePlayerNameMap(key))
      store.dispatch(removePlayerZoneMap(key))
      store.dispatch(removePlayerRoleMap(key))
      store.dispatch(removePlayerStatusMap(key))
      store.dispatch(removePlayerAfkReasonMap(key))
      store.dispatch(removePlayerSalesStatusMap(key))
      store.dispatch(removePlayerJoinTime(key))
    }

    // new instance added to the computers MapSchema
    this.room.state.computers.onAdd = (computer: IComputer, key: string) => {
      // track changes on every child object's connectedUser
      computer.connectedUser.onAdd = (item) => {
        phaserEvents.emit(Event.ITEM_USER_ADDED, item, key, ItemType.COMPUTER)
      }
      computer.connectedUser.onRemove = (item) => {
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
      whiteboard.connectedUser.onAdd = (item) => {
        phaserEvents.emit(Event.ITEM_USER_ADDED, item, key, ItemType.WHITEBOARD)
      }
      whiteboard.connectedUser.onRemove = (item) => {
        phaserEvents.emit(Event.ITEM_USER_REMOVED, item, key, ItemType.WHITEBOARD)
      }
    }

    // new instance added to the chatMessages ArraySchema
    this.room.state.chatMessages.onAdd = (item) => {
      const isQueuing = store.getState().deferredMessage.isQueuing
      if (isQueuing) {
        store.dispatch(addDeferredMessage({
          type: 'chat',
          from: item.author || '',
          content: item.content || '',
          zone: item.zone || '',
          timestamp: item.createdAt || Date.now(),
        }))
      } else {
        store.dispatch(pushChatMessage(item))
      }
    }

    // when the server sends room data
    this.room.onMessage(Message.SEND_ROOM_DATA, (content) => {
      store.dispatch(setJoinedRoomData(content))
    })

    // when a user sends a message
    this.room.onMessage(Message.ADD_CHAT_MESSAGE, ({ clientId, content }) => {
      phaserEvents.emit(Event.UPDATE_DIALOG_BUBBLE, clientId, content)
    })

    // when a computer user stops sharing screen (no-op: peer streaming removed, zone LiveKit handles this)
    this.room.onMessage(Message.STOP_SCREEN_SHARE, (_clientId: string) => {
      // Anciennement: shareScreenManager.onUserLeft(clientId) via PeerJS
      // Le partage d'ecran de zone est maintenant gere par LiveKit
    })

    // Quand le serveur envoie une mise a jour des membres de zone
    this.room.onMessage(Message.ZONE_MEMBERS_UPDATE, (data: { zone: string; memberIds: string[] }) => {
      store.dispatch(setZoneMemberIds(data.memberIds))
    })

    // Quand un joueur de la meme zone envoie un message chat (dialog bubble seulement, le message Redux est gere par chatMessages.onAdd)
    this.room.onMessage(Message.ZONE_CHAT_MESSAGE, ({ clientId, content }) => {
      const isQueuing = store.getState().deferredMessage.isQueuing
      if (!isQueuing) {
        phaserEvents.emit(Event.UPDATE_DIALOG_BUBBLE, clientId, content)
        // Notification sonore pour les messages de zone
        const senderName = store.getState().user.playerNameMap.get(
          clientId.replace(/[^0-9a-z]/gi, 'G')
        ) || ''
        notifyChatMessage(senderName, content)
      }
      // En mode queuing, le message est deja defere via chatMessages.onAdd
    })

    // Quand un joueur de la meme zone arrete son partage d'ecran
    this.room.onMessage(Message.ZONE_SCREEN_SHARE_STOPPED, (clientId: string) => {
      store.dispatch(removePeerScreenStream(clientId))
    })

    // Quand le serveur envoie un token LiveKit pour rejoindre une reunion de zone
    this.room.onMessage(Message.LIVEKIT_TOKEN, async (message: { token: string; zone: string }) => {
      try {
        await liveKitService.connect(message.token, message.zone)
      } catch (err) {
        console.error('Erreur connexion LiveKit:', err)
      }
    })

    // Quand le serveur refuse l'entree dans une zone pleine (one_on_one max 2)
    this.room.onMessage(Message.ZONE_FULL, (data: { zone: string; maxCapacity: number }) => {
      store.dispatch(
        pushToast({
          message: `Cette salle est pleine (max ${data.maxCapacity} personnes)`,
          type: 'warning',
        })
      )
    })

    // Quand un joueur envoie une reaction emoji
    this.room.onMessage(
      Message.EMOJI_REACTION,
      ({ playerId, emoji }: { playerId: string; emoji: string }) => {
        phaserEvents.emit(Event.EMOJI_REACTION, playerId, emoji)
      }
    )

    // Quand un joueur commence/arrete de taper
    this.room.onMessage(
      Message.TYPING_STATUS,
      ({ playerId, typing }: { playerId: string; typing: boolean }) => {
        phaserEvents.emit(Event.TYPING_STATUS, playerId, typing)
      }
    )

    // Quand un joueur passe en AFK ou revient
    this.room.onMessage(
      Message.AFK_STATUS,
      ({ playerId, afk }: { playerId: string; afk: boolean }) => {
        phaserEvents.emit(Event.AFK_STATUS, playerId, afk)
      }
    )

    // Knock recu (en tant que rep Sales, quelqu'un frappe a la porte)
    this.room.onMessage(
      Message.KNOCK_RECEIVED,
      (data: { knockerId: string; knockerName: string; message?: string }) => {
        store.dispatch(addPendingKnock({
          knockerId: data.knockerId,
          knockerName: data.knockerName,
          message: data.message,
        }))
      }
    )

    // Resultat de mon knock (la reponse du rep Sales)
    this.room.onMessage(
      Message.KNOCK_RESULT,
      (data: { targetId: string; targetName: string; response: 'accept' | 'refuse' | 'later' }) => {
        store.dispatch(addKnockResult({
          targetId: data.targetId,
          targetName: data.targetName,
          response: data.response,
        }))
      }
    )

    // Observation / Shadow mode — quelqu'un commence a m'observer
    this.room.onMessage(
      Message.OBSERVER_ADDED,
      (data: { observerId: string; observerName: string }) => {
        store.dispatch(addObserver({ id: data.observerId, name: data.observerName }))
      }
    )

    // Observation / Shadow mode — quelqu'un arrete de m'observer
    this.room.onMessage(
      Message.OBSERVER_REMOVED,
      (data: { observerId: string }) => {
        store.dispatch(removeObserver(data.observerId))
      }
    )

    // Invitation 1-on-1 booth recue
    this.room.onMessage(
      Message.BOOTH_INVITE_RECEIVED,
      (data: { inviterId: string; inviterName: string }) => {
        store.dispatch(setInvite({
          inviterId: data.inviterId,
          inviterName: data.inviterName,
          timestamp: Date.now(),
        }))
      }
    )

    // Resultat de mon invitation 1-on-1
    this.room.onMessage(
      Message.BOOTH_INVITE_RESULT,
      (data: { targetId: string; targetName: string; accepted: boolean }) => {
        store.dispatch(setResult({
          targetName: data.targetName,
          accepted: data.accepted,
        }))
      }
    )

    // Quand un enregistrement demarre dans notre zone
    this.room.onMessage(
      Message.RECORDING_STARTED,
      (data: { recorderName: string }) => {
        store.dispatch(setRemoteRecording({ recorderName: data.recorderName }))
      }
    )

    // Quand un enregistrement s'arrete dans notre zone
    this.room.onMessage(
      Message.RECORDING_STOPPED,
      () => {
        store.dispatch(clearRemoteRecording())
      }
    )

    // ─── Outils de reunion structuree ──────────────────────────────────────────

    // Synchronisation du minuteur depuis le serveur
    this.room.onMessage(
      Message.MEETING_TIMER_SYNC,
      (data: { running: boolean; startTime: number | null; duration: number | null }) => {
        store.dispatch(syncTimer({
          running: data.running,
          startTime: data.startTime,
          duration: data.duration,
        }))
      }
    )

    // Mise a jour de l'ordre du jour depuis un autre participant
    this.room.onMessage(
      Message.MEETING_AGENDA_UPDATE,
      (data: { agenda: string }) => {
        store.dispatch(setAgenda(data.agenda))
      }
    )

    // Mise a jour des notes depuis un autre participant
    this.room.onMessage(
      Message.MEETING_NOTES_UPDATE,
      (data: { notes: string }) => {
        store.dispatch(setNotes(data.notes))
      }
    )

    // ─── Bot IA Brainstorm (Crea) ─────────────────────────────────────────────

    // Quand le bot IA envoie un message
    this.room.onMessage(
      Message.AI_BOT_MESSAGE,
      (data: { content: string; zone: string }) => {
        store.dispatch(pushBotMessage(data.content))
      }
    )

    // Quand le bot IA reflechit (indicateur de saisie)
    this.room.onMessage(
      Message.AI_BOT_THINKING,
      () => {
        store.dispatch(setBotTyping(true))
      }
    )

    // ─── Brainstorm — sticky notes + votes ────────────────────────────────────

    // Quand une sticky note est ajoutee
    this.room.onMessage(
      Message.STICKY_NOTE_ADDED,
      (data: {
        noteId: string
        text: string
        color: string
        authorName: string
        authorId: string
        timestamp: number
      }) => {
        store.dispatch(
          addNote({
            id: data.noteId,
            text: data.text,
            color: data.color,
            authorName: data.authorName,
            authorId: data.authorId,
            votes: 0,
            voters: [],
            timestamp: data.timestamp,
          })
        )
      }
    )

    // Quand une sticky note est supprimee
    this.room.onMessage(
      Message.STICKY_NOTE_REMOVED,
      (data: { noteId: string }) => {
        store.dispatch(removeNote(data.noteId))
      }
    )

    // Quand les votes d'une note sont mis a jour
    this.room.onMessage(
      Message.VOTE_UPDATED,
      (data: { noteId: string; votes: number; voters: string[] }) => {
        store.dispatch(
          updateVotes({
            noteId: data.noteId,
            votes: data.votes,
            voters: data.voters,
          })
        )
      }
    )

    // Quand le tableau est efface
    this.room.onMessage(Message.BOARD_CLEARED, () => {
      store.dispatch(clearBoard())
    })

    // Synchronisation initiale des notes quand on rejoint la zone brainstorm
    this.room.onMessage(
      Message.SYNC_BOARD,
      (data: {
        notes: Array<{
          noteId: string
          text: string
          color: string
          authorName: string
          authorId: string
          votes: number
          voters: string[]
          timestamp: number
        }>
      }) => {
        const notes: StickyNote[] = data.notes.map((n) => ({
          id: n.noteId,
          text: n.text,
          color: n.color,
          authorName: n.authorName,
          authorId: n.authorId,
          votes: n.votes,
          voters: n.voters,
          timestamp: n.timestamp,
        }))
        store.dispatch(setBrainstormNotes(notes))
      }
    )
  }

  // method to register event listener and call back function when a item user added
  onChatMessageAdded(callback: (playerId: string, content: string) => void, context?: unknown): void {
    phaserEvents.on(Event.UPDATE_DIALOG_BUBBLE, callback, context)
  }

  // method to register event listener and call back function when a item user added
  onItemUserAdded(
    callback: (playerId: string, key: string, itemType: ItemType) => void,
    context?: unknown
  ): void {
    phaserEvents.on(Event.ITEM_USER_ADDED, callback, context)
  }

  // method to register event listener and call back function when a item user removed
  onItemUserRemoved(
    callback: (playerId: string, key: string, itemType: ItemType) => void,
    context?: unknown
  ): void {
    phaserEvents.on(Event.ITEM_USER_REMOVED, callback, context)
  }

  // method to register event listener and call back function when a player joined
  onPlayerJoined(callback: (Player: IPlayer, key: string) => void, context?: unknown): void {
    phaserEvents.on(Event.PLAYER_JOINED, callback, context)
  }

  // method to register event listener and call back function when a player left
  onPlayerLeft(callback: (key: string) => void, context?: unknown): void {
    phaserEvents.on(Event.PLAYER_LEFT, callback, context)
  }

  // method to register event listener and call back function when myPlayer is ready to connect
  onMyPlayerReady(callback: (key: string) => void, context?: unknown): void {
    phaserEvents.on(Event.MY_PLAYER_READY, callback, context)
  }

  // method to register event listener and call back function when my video is connected
  onMyPlayerVideoConnected(callback: (key: string) => void, context?: unknown): void {
    phaserEvents.on(Event.MY_PLAYER_VIDEO_CONNECTED, callback, context)
  }

  // method to register event listener and call back function when a player updated
  onPlayerUpdated(
    callback: (field: string, value: number | string, key: string) => void,
    context?: unknown
  ): void {
    phaserEvents.on(Event.PLAYER_UPDATED, callback, context)
  }

  // method to send player updates to Colyseus server
  updatePlayer(currentX: number, currentY: number, currentAnim: string): void {
    this.room?.send(Message.UPDATE_PLAYER, { x: currentX, y: currentY, anim: currentAnim })
  }

  // method to send player name to Colyseus server
  updatePlayerName(currentName: string): void {
    this.room?.send(Message.UPDATE_PLAYER_NAME, { name: currentName })
  }

  // method to send ready-to-connect signal to Colyseus server
  readyToConnect(): void {
    this.room?.send(Message.READY_TO_CONNECT)
    phaserEvents.emit(Event.MY_PLAYER_READY)
  }

  // method to send ready-to-connect signal to Colyseus server
  videoConnected(): void {
    this.room?.send(Message.VIDEO_CONNECTED)
    phaserEvents.emit(Event.MY_PLAYER_VIDEO_CONNECTED)
  }

  connectToComputer(id: string): void {
    this.room?.send(Message.CONNECT_TO_COMPUTER, { computerId: id })
  }

  disconnectFromComputer(id: string): void {
    this.room?.send(Message.DISCONNECT_FROM_COMPUTER, { computerId: id })
  }

  connectToWhiteboard(id: string): void {
    this.room?.send(Message.CONNECT_TO_WHITEBOARD, { whiteboardId: id })
  }

  disconnectFromWhiteboard(id: string): void {
    this.room?.send(Message.DISCONNECT_FROM_WHITEBOARD, { whiteboardId: id })
  }

  onStopScreenShare(id: string): void {
    this.room?.send(Message.STOP_SCREEN_SHARE, { computerId: id })
  }

  addChatMessage(content: string): void {
    this.room?.send(Message.ADD_CHAT_MESSAGE, { content: content })
  }

  // Envoyer un message de chat scope a la zone actuelle
  addZoneChatMessage(content: string): void {
    this.room?.send(Message.ADD_ZONE_CHAT_MESSAGE, { content })
  }

  // Demander un token LiveKit au serveur pour rejoindre une reunion de zone
  requestLiveKitToken(zone: string): void {
    this.room?.send(Message.REQUEST_LIVEKIT_TOKEN, { zone })
  }

  // Envoyer le changement de zone au serveur
  updatePlayerZone(zone: string): void {
    this.room?.send(Message.UPDATE_PLAYER_ZONE, { zone })
  }

  // Envoyer le role du joueur au serveur
  updatePlayerRole(role: string): void {
    this.room?.send(Message.UPDATE_PLAYER_ROLE, { role })
  }

  // Envoyer le statut du joueur au serveur (available, meeting, dnd)
  updatePlayerStatus(status: string): void {
    this.room?.send(Message.UPDATE_PLAYER_STATUS, { status })
  }

  // Envoyer la raison AFK au serveur
  updatePlayerAfkReason(reason: string): void {
    this.room?.send(Message.UPDATE_PLAYER_AFK_REASON, { reason })
  }

  // Envoyer le statut Sales au serveur (on_call, available, preparing)
  updateSalesStatus(salesStatus: string): void {
    this.room?.send(Message.UPDATE_SALES_STATUS, { salesStatus })
  }

  // Envoyer une reaction emoji a tous les autres joueurs
  sendEmojiReaction(emoji: string): void {
    this.room?.send(Message.EMOJI_REACTION, { emoji })
  }

  // Ecouter les reactions emoji des autres joueurs
  onEmojiReaction(callback: (playerId: string, emoji: string) => void, context?: unknown): void {
    phaserEvents.on(Event.EMOJI_REACTION, callback, context)
  }

  // Envoyer le statut de typing
  sendTypingStatus(typing: boolean): void {
    this.room?.send(Message.TYPING_STATUS, { typing })
  }

  // Ecouter les changements de typing des autres joueurs
  onTypingStatus(callback: (playerId: string, typing: boolean) => void, context?: unknown): void {
    phaserEvents.on(Event.TYPING_STATUS, callback, context)
  }

  // Envoyer le statut AFK
  sendAfkStatus(afk: boolean): void {
    this.room?.send(Message.AFK_STATUS, { afk })
  }

  // Ecouter les changements AFK des autres joueurs
  onAfkStatus(callback: (playerId: string, afk: boolean) => void, context?: unknown): void {
    phaserEvents.on(Event.AFK_STATUS, callback, context)
  }

  // Ecouter les clics sur les joueurs (profil)
  onPlayerClicked(callback: (playerId: string) => void, context?: unknown): void {
    phaserEvents.on(Event.PLAYER_CLICKED, callback, context)
  }

  // Envoyer un knock a un rep Sales occupe
  sendKnock(targetId: string, message?: string): void {
    this.room?.send(Message.KNOCK_REQUEST, { targetId, message })
  }

  // Repondre a un knock recu (accept, refuse, later)
  sendKnockResponse(knockerId: string, response: 'accept' | 'refuse' | 'later'): void {
    this.room?.send(Message.KNOCK_RESPONSE, { knockerId, response })
  }

  // Commencer a observer un rep Sales (shadow mode)
  startObserving(targetId: string): void {
    this.room?.send(Message.START_OBSERVING, { targetId })
  }

  // Arreter d'observer
  stopObserving(): void {
    this.room?.send(Message.STOP_OBSERVING, {})
  }

  // Inviter un joueur au booth 1-on-1
  inviteToBooth(targetId: string): void {
    this.room?.send(Message.INVITE_TO_BOOTH, { targetId })
  }

  // Repondre a une invitation 1-on-1
  respondToBoothInvite(inviterId: string, accepted: boolean): void {
    this.room?.send(Message.BOOTH_INVITE_RESPONSE, { inviterId, accepted })
  }

  // Notifier le serveur que l'enregistrement audio a demarre
  startRecording(): void {
    this.room?.send(Message.START_RECORDING, {})
  }

  // Notifier le serveur que l'enregistrement audio est arrete
  stopRecording(): void {
    this.room?.send(Message.STOP_RECORDING, {})
  }

  // ─── Outils de reunion structuree ──────────────────────────────────────────

  // Demarrer le minuteur partage (avec duree optionnelle en secondes)
  startMeetingTimer(duration?: number): void {
    this.room?.send(Message.MEETING_TIMER_START, { duration })
  }

  // Arreter le minuteur partage
  stopMeetingTimer(): void {
    this.room?.send(Message.MEETING_TIMER_STOP, {})
  }

  // Mettre a jour l'ordre du jour partage
  updateMeetingAgenda(agenda: string): void {
    this.room?.send(Message.MEETING_AGENDA_UPDATE, { agenda })
  }

  // Mettre a jour les notes collaboratives partagees
  updateMeetingNotes(notes: string): void {
    this.room?.send(Message.MEETING_NOTES_UPDATE, { notes })
  }

  // Envoyer une requete au bot IA du brainstorm
  sendAiBotRequest(prompt: string): void {
    this.room?.send(Message.AI_BOT_REQUEST, { prompt })
  }

  // ─── Brainstorm — sticky notes + votes ──────────────────────────────────────

  // Ajouter une sticky note
  addStickyNote(text: string, color: string): void {
    this.room?.send(Message.ADD_STICKY_NOTE, { text, color })
  }

  // Supprimer une sticky note (seul l'auteur peut supprimer)
  removeStickyNote(noteId: string): void {
    this.room?.send(Message.REMOVE_STICKY_NOTE, { noteId })
  }

  // Voter pour une note (toggle)
  voteNote(noteId: string): void {
    this.room?.send(Message.VOTE_NOTE, { noteId })
  }

  // Retirer son vote
  unvoteNote(noteId: string): void {
    this.room?.send(Message.UNVOTE_NOTE, { noteId })
  }

  // Effacer tout le tableau
  clearBrainstormBoard(): void {
    this.room?.send(Message.CLEAR_BOARD, {})
  }
}
