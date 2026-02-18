import bcrypt from 'bcrypt'
import { Room, Client, ServerError } from 'colyseus'
import { Dispatcher } from '@colyseus/command'
import { Player, OfficeState, Computer, Whiteboard } from './schema/OfficeState'
import { Message } from '../../types/Messages'
import { IRoomData } from '../../types/Rooms'
import { whiteboardRoomIds } from './schema/OfficeState'
import PlayerUpdateCommand from './commands/PlayerUpdateCommand'
import PlayerUpdateNameCommand from './commands/PlayerUpdateNameCommand'
import {
  ComputerAddUserCommand,
  ComputerRemoveUserCommand,
} from './commands/ComputerUpdateArrayCommand'
import {
  WhiteboardAddUserCommand,
  WhiteboardRemoveUserCommand,
} from './commands/WhiteboardUpdateArrayCommand'
import ChatMessageUpdateCommand from './commands/ChatMessageUpdateCommand'
import { AiBotService } from '../services/AiBotService'
import { generateToken, isCallZone } from '../services/LiveKitTokenService'
import { saveMessage, getRecentMessages } from '../database/messages'
import {
  saveStickyNote,
  deleteStickyNote as dbDeleteStickyNote,
  getStickyNotes,
  updateVotes as dbUpdateVotes,
  clearStickyNotes,
} from '../database/stickyNotes'

export class SkyOffice extends Room<OfficeState> {
  private dispatcher = new Dispatcher(this)
  private name: string
  private description: string
  private password: string | null = null
  private aiBotService = new AiBotService()

  // Etat transient des outils de reunion (non persiste dans le schema Colyseus)
  private meetingToolsState = {
    timerRunning: false,
    timerStartTime: null as number | null,
    timerDuration: null as number | null,
    agenda: '',
    notes: '',
  }

  // Etat transient des sticky notes du brainstorm (non persiste dans le schema)
  private brainstormNotes: Map<string, {
    id: string
    text: string
    color: string
    authorName: string
    authorId: string
    votes: Set<string>
    timestamp: number
  }> = new Map()
  private brainstormNoteCounter = 0

  async onCreate(options: IRoomData): Promise<void> {
    const { name, description, password, autoDispose } = options
    this.name = name
    this.description = description
    this.autoDispose = autoDispose

    let hasPassword = false
    if (password) {
      const salt = await bcrypt.genSalt(10)
      this.password = await bcrypt.hash(password, salt)
      hasPassword = true
    }
    this.setMetadata({ name, description, hasPassword })

    this.setState(new OfficeState())

    // 6 ordinateurs repartis dans les 4 salles
    for (let i = 0; i < 6; i++) {
      this.state.computers.set(String(i), new Computer())
    }

    // 2 tableaux blancs (brainstorm + meeting)
    for (let i = 0; i < 2; i++) {
      this.state.whiteboards.set(String(i), new Whiteboard())
    }

    // when a player connect to a computer, add to the computer connectedUser array
    this.onMessage(Message.CONNECT_TO_COMPUTER, (client, message: { computerId: string }) => {
      this.dispatcher.dispatch(new ComputerAddUserCommand(), {
        client,
        computerId: message.computerId,
      })
    })

    // when a player disconnect from a computer, remove from the computer connectedUser array
    this.onMessage(Message.DISCONNECT_FROM_COMPUTER, (client, message: { computerId: string }) => {
      this.dispatcher.dispatch(new ComputerRemoveUserCommand(), {
        client,
        computerId: message.computerId,
      })
    })

    // when a player stop sharing screen
    this.onMessage(Message.STOP_SCREEN_SHARE, (client, message: { computerId: string }) => {
      const computer = this.state.computers.get(message.computerId)
      computer.connectedUser.forEach((id) => {
        this.clients.forEach((cli) => {
          if (cli.sessionId === id && cli.sessionId !== client.sessionId) {
            cli.send(Message.STOP_SCREEN_SHARE, client.sessionId)
          }
        })
      })
    })

    // when a player connect to a whiteboard, add to the whiteboard connectedUser array
    this.onMessage(Message.CONNECT_TO_WHITEBOARD, (client, message: { whiteboardId: string }) => {
      this.dispatcher.dispatch(new WhiteboardAddUserCommand(), {
        client,
        whiteboardId: message.whiteboardId,
      })
    })

    // when a player disconnect from a whiteboard, remove from the whiteboard connectedUser array
    this.onMessage(
      Message.DISCONNECT_FROM_WHITEBOARD,
      (client, message: { whiteboardId: string }) => {
        this.dispatcher.dispatch(new WhiteboardRemoveUserCommand(), {
          client,
          whiteboardId: message.whiteboardId,
        })
      }
    )

    // when receiving updatePlayer message, call the PlayerUpdateCommand
    this.onMessage(
      Message.UPDATE_PLAYER,
      (client, message: { x: number; y: number; anim: string }) => {
        this.dispatcher.dispatch(new PlayerUpdateCommand(), {
          client,
          x: message.x,
          y: message.y,
          anim: message.anim,
        })
      }
    )

    // when receiving updatePlayerName message, call the PlayerUpdateNameCommand
    this.onMessage(Message.UPDATE_PLAYER_NAME, (client, message: { name: string }) => {
      this.dispatcher.dispatch(new PlayerUpdateNameCommand(), {
        client,
        name: message.name,
      })
    })

    // when a player is ready to connect, call the PlayerReadyToConnectCommand
    this.onMessage(Message.READY_TO_CONNECT, (client) => {
      const player = this.state.players.get(client.sessionId)
      if (player) player.readyToConnect = true
    })

    // when a player is ready to connect, call the PlayerReadyToConnectCommand
    this.onMessage(Message.VIDEO_CONNECTED, (client) => {
      const player = this.state.players.get(client.sessionId)
      if (player) player.videoConnected = true
    })

    // when a player disconnect a stream, broadcast the signal to the other player connected to the stream
    this.onMessage(Message.DISCONNECT_STREAM, (client, message: { clientId: string }) => {
      this.clients.forEach((cli) => {
        if (cli.sessionId === message.clientId) {
          cli.send(Message.DISCONNECT_STREAM, client.sessionId)
        }
      })
    })

    // quand un joueur change de zone
    this.onMessage(Message.UPDATE_PLAYER_ZONE, (client, message: { zone: string }) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) return

      // Verifier la capacite pour la zone one_on_one (max 2 joueurs)
      if (message.zone === 'one_on_one' && player.zone !== 'one_on_one') {
        const count = this.getZonePlayerCount('one_on_one')
        if (count >= 2) {
          client.send(Message.ZONE_FULL, { zone: 'one_on_one', maxCapacity: 2 })
          return
        }
      }

      const oldZone = player.zone
      player.zone = message.zone
      // Si le joueur quitte la zone AFK, effacer sa raison AFK
      if (message.zone !== 'afk') {
        player.afkReason = ''
      }
      // Si le joueur quitte la zone Sales, effacer son statut de vente
      if (message.zone !== 'sales') {
        player.salesStatus = ''
      }
      // Si le joueur quitte la zone Sales alors qu'il observe quelqu'un, arreter l'observation
      if (oldZone === 'sales' && message.zone !== 'sales' && player.observingTarget) {
        const targetId = player.observingTarget
        player.observingTarget = ''
        this.clients.forEach((cli) => {
          if (cli.sessionId === targetId) {
            cli.send(Message.OBSERVER_REMOVED, { observerId: client.sessionId })
          }
        })
      }
      // Broadcaster la liste des membres mise a jour pour les deux zones
      this.broadcastZoneMembers(oldZone)
      this.broadcastZoneMembers(message.zone)

      // Envoyer automatiquement un token LiveKit si la nouvelle zone est une zone d'appel
      if (isCallZone(message.zone)) {
        generateToken(player.name, client.sessionId, message.zone)
          .then((token) => {
            client.send(Message.LIVEKIT_TOKEN, { token, zone: message.zone })
          })
          .catch((err) => console.error('Erreur token LiveKit:', err))
      }

      // Si le joueur entre dans la zone meeting, synchroniser les outils de reunion
      if (message.zone === 'meeting' && oldZone !== 'meeting') {
        this.syncMeetingToolsToClient(client)
      }

      // Si le joueur entre dans la zone brainstorm, synchroniser les sticky notes existantes
      if (message.zone === 'brainstorm' && oldZone !== 'brainstorm') {
        this.syncBrainstormNotesToClient(client)
      }
    })

    // quand un joueur met a jour son role
    this.onMessage(Message.UPDATE_PLAYER_ROLE, (client, message: { role: string }) => {
      const player = this.state.players.get(client.sessionId)
      if (player) player.role = message.role
    })

    // quand un joueur met a jour son statut (available, meeting, dnd)
    this.onMessage(Message.UPDATE_PLAYER_STATUS, (client, message: { status: string }) => {
      const player = this.state.players.get(client.sessionId)
      if (player) player.status = message.status
    })

    // quand un joueur met a jour son statut Slack-like (preset + custom + DND)
    this.onMessage(Message.UPDATE_STATUS, (client, message: { preset: string; custom: string; dnd: boolean }) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) return
      player.status = message.preset || 'available'
      player.statusCustom = message.custom || ''
      player.dnd = message.dnd ?? false
    })

    // quand un joueur met a jour son statut de vente (on_call, available, preparing)
    this.onMessage(Message.UPDATE_SALES_STATUS, (client, message: { salesStatus: string }) => {
      const player = this.state.players.get(client.sessionId)
      if (player) player.salesStatus = message.salesStatus
    })

    // quand un joueur met a jour sa raison AFK (coffee, lunch, errand, etc.)
    this.onMessage(Message.UPDATE_PLAYER_AFK_REASON, (client, message: { reason: string }) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) return
      player.afkReason = message.reason
    })

    // quand un joueur envoie un message de chat zone
    this.onMessage(Message.ADD_ZONE_CHAT_MESSAGE, (client, message: { content: string }) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) return
      const zone = player.zone

      // Stocker le message avec la zone (pour les joueurs qui rejoignent plus tard)
      this.dispatcher.dispatch(new ChatMessageUpdateCommand(), {
        client,
        content: message.content,
        zone,
      })

      // Persister le message dans SQLite
      try {
        saveMessage(zone, null, player.name, message.content)
      } catch (err) {
        console.error('Erreur persistence message zone:', err)
      }

      // Broadcaster seulement aux joueurs de la meme zone
      this.clients.forEach((cli) => {
        if (cli.sessionId === client.sessionId) return
        const cliPlayer = this.state.players.get(cli.sessionId)
        if (cliPlayer?.zone === zone) {
          cli.send(Message.ZONE_CHAT_MESSAGE, {
            clientId: client.sessionId,
            content: message.content,
            zone,
          })
        }
      })

      // Declencher le bot IA si le joueur est dans la zone brainstorm et mentionne @crea
      if (zone === 'brainstorm' && /^@crea\b/i.test(message.content.trim())) {
        const prompt = message.content.trim().replace(/^@crea\s*/i, '')
        if (prompt) {
          this.handleAiBotRequest(player.name, prompt)
        }
      }
    })

    // Requete explicite au bot IA (depuis le panneau BrainstormBot)
    this.onMessage(Message.AI_BOT_REQUEST, (client, message: { prompt: string }) => {
      const player = this.state.players.get(client.sessionId)
      if (!player || player.zone !== 'brainstorm') return
      if (message.prompt) {
        this.handleAiBotRequest(player.name, message.prompt)
      }
    })

    // quand un joueur arrete le screen share de zone
    this.onMessage(Message.STOP_ZONE_SCREEN_SHARE, (client) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) return
      // Notifier les autres membres de la zone
      this.clients.forEach((cli) => {
        if (cli.sessionId === client.sessionId) return
        const cliPlayer = this.state.players.get(cli.sessionId)
        if (cliPlayer?.zone === player.zone) {
          cli.send(Message.ZONE_SCREEN_SHARE_STOPPED, client.sessionId)
        }
      })
    })

    // quand un joueur envoie une reaction emoji, broadcaster a tous les autres
    this.onMessage(Message.EMOJI_REACTION, (client, message: { emoji: string }) => {
      this.broadcast(
        Message.EMOJI_REACTION,
        { playerId: client.sessionId, emoji: message.emoji },
        { except: client }
      )
    })

    // quand un joueur commence/arrete de taper, broadcaster a tous les autres
    this.onMessage(Message.TYPING_STATUS, (client, message: { typing: boolean }) => {
      this.broadcast(
        Message.TYPING_STATUS,
        { playerId: client.sessionId, typing: message.typing },
        { except: client }
      )
    })

    // quand un joueur passe en AFK ou revient, broadcaster a tous les autres
    this.onMessage(Message.AFK_STATUS, (client, message: { afk: boolean }) => {
      this.broadcast(
        Message.AFK_STATUS,
        { playerId: client.sessionId, afk: message.afk },
        { except: client }
      )
    })

    // Quand un joueur frappe a la porte de la salle Sales (Knock)
    this.onMessage(
      Message.KNOCK_REQUEST,
      (client, message: { targetId: string; message?: string }) => {
        const knocker = this.state.players.get(client.sessionId)
        if (!knocker) return
        const target = this.state.players.get(message.targetId)
        if (!target || target.zone !== 'sales') return

        // Trouver le client cible et lui envoyer la notification de knock
        this.clients.forEach((cli) => {
          if (cli.sessionId === message.targetId) {
            cli.send(Message.KNOCK_RECEIVED, {
              knockerId: client.sessionId,
              knockerName: knocker.name,
              message: message.message,
            })
          }
        })
      }
    )

    // Quand un rep Sales repond a un knock
    this.onMessage(
      Message.KNOCK_RESPONSE,
      (client, message: { knockerId: string; response: 'accept' | 'refuse' | 'later' }) => {
        const responder = this.state.players.get(client.sessionId)
        if (!responder) return

        // Trouver le client qui a frappe et lui envoyer le resultat
        this.clients.forEach((cli) => {
          if (cli.sessionId === message.knockerId) {
            cli.send(Message.KNOCK_RESULT, {
              targetId: client.sessionId,
              targetName: responder.name,
              response: message.response,
            })
          }
        })
      }
    )

    // Quand un manager commence a observer un rep Sales (shadow mode)
    this.onMessage(Message.START_OBSERVING, (client, message: { targetId: string }) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) return
      const target = this.state.players.get(message.targetId)
      if (!target || target.zone !== 'sales') return

      // Arreter une observation precedente si existante
      if (player.observingTarget) {
        this.clients.forEach((cli) => {
          if (cli.sessionId === player.observingTarget) {
            cli.send(Message.OBSERVER_REMOVED, { observerId: client.sessionId })
          }
        })
      }

      player.observingTarget = message.targetId

      // Notifier la cible qu'elle est observee
      this.clients.forEach((cli) => {
        if (cli.sessionId === message.targetId) {
          cli.send(Message.OBSERVER_ADDED, {
            observerId: client.sessionId,
            observerName: player.name,
          })
        }
      })
    })

    // Quand un manager arrete d'observer
    this.onMessage(Message.STOP_OBSERVING, (client) => {
      const player = this.state.players.get(client.sessionId)
      if (!player || !player.observingTarget) return

      const targetId = player.observingTarget
      player.observingTarget = ''

      // Notifier la cible que l'observation est terminee
      this.clients.forEach((cli) => {
        if (cli.sessionId === targetId) {
          cli.send(Message.OBSERVER_REMOVED, { observerId: client.sessionId })
        }
      })
    })

    // Quand un joueur invite quelqu'un au booth 1-on-1
    this.onMessage(Message.INVITE_TO_BOOTH, (client, message: { targetId: string }) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) return

      // Verifier que la zone one_on_one a de la place (max 2)
      const count = this.getZonePlayerCount('one_on_one')
      if (count >= 2) {
        client.send(Message.ZONE_FULL, { zone: 'one_on_one', maxCapacity: 2 })
        return
      }

      // Envoyer l'invitation a la cible
      this.clients.forEach((cli) => {
        if (cli.sessionId === message.targetId) {
          cli.send(Message.BOOTH_INVITE_RECEIVED, {
            inviterId: client.sessionId,
            inviterName: player.name,
          })
        }
      })
    })

    // Quand un joueur repond a une invitation 1-on-1
    this.onMessage(
      Message.BOOTH_INVITE_RESPONSE,
      (client, message: { inviterId: string; accepted: boolean }) => {
        const player = this.state.players.get(client.sessionId)
        if (!player) return

        // Envoyer le resultat a l'inviteur
        this.clients.forEach((cli) => {
          if (cli.sessionId === message.inviterId) {
            cli.send(Message.BOOTH_INVITE_RESULT, {
              targetId: client.sessionId,
              targetName: player.name,
              accepted: message.accepted,
            })
          }
        })
      }
    )

    // Quand un joueur demarre l'enregistrement audio, notifier tous les membres de la zone
    this.onMessage(Message.START_RECORDING, (client) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) return
      const zone = player.zone
      const recorderName = player.name
      // Broadcaster a tous les joueurs de la meme zone (y compris l'enregistreur)
      this.clients.forEach((cli) => {
        const cliPlayer = this.state.players.get(cli.sessionId)
        if (cliPlayer?.zone === zone) {
          cli.send(Message.RECORDING_STARTED, { recorderName })
        }
      })
    })

    // Quand un joueur arrete l'enregistrement audio, notifier tous les membres de la zone
    this.onMessage(Message.STOP_RECORDING, (client) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) return
      const zone = player.zone
      const recorderName = player.name
      // Broadcaster a tous les joueurs de la meme zone
      this.clients.forEach((cli) => {
        const cliPlayer = this.state.players.get(cli.sessionId)
        if (cliPlayer?.zone === zone) {
          cli.send(Message.RECORDING_STOPPED, { recorderName })
        }
      })
    })

    // ─── Outils de reunion structuree (Meeting Room) ────────────────────────────

    // Quand un participant demarre le minuteur
    this.onMessage(Message.MEETING_TIMER_START, (client, message: { duration?: number }) => {
      const player = this.state.players.get(client.sessionId)
      if (!player || player.zone !== 'meeting') return

      this.meetingToolsState.timerRunning = true
      this.meetingToolsState.timerStartTime = Date.now()
      this.meetingToolsState.timerDuration = message.duration ?? null

      // Broadcaster a tous les joueurs dans la zone meeting
      this.broadcastToMeetingZone(Message.MEETING_TIMER_SYNC, {
        running: true,
        startTime: this.meetingToolsState.timerStartTime,
        duration: this.meetingToolsState.timerDuration,
      })
    })

    // Quand un participant arrete le minuteur
    this.onMessage(Message.MEETING_TIMER_STOP, (client) => {
      const player = this.state.players.get(client.sessionId)
      if (!player || player.zone !== 'meeting') return

      this.meetingToolsState.timerRunning = false

      // Broadcaster a tous les joueurs dans la zone meeting
      this.broadcastToMeetingZone(Message.MEETING_TIMER_SYNC, {
        running: false,
        startTime: this.meetingToolsState.timerStartTime,
        duration: this.meetingToolsState.timerDuration,
      })
    })

    // Quand un participant met a jour l'ordre du jour
    this.onMessage(Message.MEETING_AGENDA_UPDATE, (client, message: { agenda: string }) => {
      const player = this.state.players.get(client.sessionId)
      if (!player || player.zone !== 'meeting') return

      this.meetingToolsState.agenda = message.agenda

      // Broadcaster aux autres joueurs dans la zone meeting (sauf l'emetteur)
      this.clients.forEach((cli) => {
        if (cli.sessionId === client.sessionId) return
        const cliPlayer = this.state.players.get(cli.sessionId)
        if (cliPlayer?.zone === 'meeting') {
          cli.send(Message.MEETING_AGENDA_UPDATE, { agenda: message.agenda })
        }
      })
    })

    // Quand un participant met a jour les notes collaboratives
    this.onMessage(Message.MEETING_NOTES_UPDATE, (client, message: { notes: string }) => {
      const player = this.state.players.get(client.sessionId)
      if (!player || player.zone !== 'meeting') return

      this.meetingToolsState.notes = message.notes

      // Broadcaster aux autres joueurs dans la zone meeting (sauf l'emetteur)
      this.clients.forEach((cli) => {
        if (cli.sessionId === client.sessionId) return
        const cliPlayer = this.state.players.get(cli.sessionId)
        if (cliPlayer?.zone === 'meeting') {
          cli.send(Message.MEETING_NOTES_UPDATE, { notes: message.notes })
        }
      })
    })

    // ─── Outils de brainstorm — sticky notes + votes ──────────────────────────

    // Quand un joueur ajoute une sticky note
    this.onMessage(Message.ADD_STICKY_NOTE, (client, message: { text: string; color: string }) => {
      const player = this.state.players.get(client.sessionId)
      if (!player || player.zone !== 'brainstorm') return

      const noteId = `note_${++this.brainstormNoteCounter}_${Date.now()}`
      const note = {
        id: noteId,
        text: message.text,
        color: message.color,
        authorName: player.name,
        authorId: client.sessionId,
        votes: new Set<string>(),
        timestamp: Date.now(),
      }
      this.brainstormNotes.set(noteId, note)

      // Persister la sticky note dans SQLite
      try {
        saveStickyNote(noteId, 'brainstorm', null, player.name, message.text, message.color)
      } catch (err) {
        console.error('Erreur persistence sticky note:', err)
      }

      // Broadcaster a tous les joueurs dans la zone brainstorm
      this.broadcastToBrainstormZone(Message.STICKY_NOTE_ADDED, {
        noteId,
        text: note.text,
        color: note.color,
        authorName: note.authorName,
        authorId: note.authorId,
        timestamp: note.timestamp,
      })
    })

    // Quand un joueur supprime une note (seul l'auteur peut supprimer)
    this.onMessage(Message.REMOVE_STICKY_NOTE, (client, message: { noteId: string }) => {
      const player = this.state.players.get(client.sessionId)
      if (!player || player.zone !== 'brainstorm') return

      const note = this.brainstormNotes.get(message.noteId)
      if (!note || note.authorId !== client.sessionId) return

      this.brainstormNotes.delete(message.noteId)

      // Supprimer de SQLite
      try {
        dbDeleteStickyNote(message.noteId)
      } catch (err) {
        console.error('Erreur suppression sticky note:', err)
      }

      this.broadcastToBrainstormZone(Message.STICKY_NOTE_REMOVED, {
        noteId: message.noteId,
      })
    })

    // Quand un joueur vote pour une note (toggle)
    this.onMessage(Message.VOTE_NOTE, (client, message: { noteId: string }) => {
      const player = this.state.players.get(client.sessionId)
      if (!player || player.zone !== 'brainstorm') return

      const note = this.brainstormNotes.get(message.noteId)
      if (!note) return

      if (note.votes.has(client.sessionId)) {
        note.votes.delete(client.sessionId)
      } else {
        note.votes.add(client.sessionId)
      }

      // Persister les votes dans SQLite
      try {
        dbUpdateVotes(message.noteId, JSON.stringify(Array.from(note.votes)))
      } catch (err) {
        console.error('Erreur persistence votes:', err)
      }

      this.broadcastToBrainstormZone(Message.VOTE_UPDATED, {
        noteId: message.noteId,
        votes: note.votes.size,
        voters: Array.from(note.votes),
      })
    })

    // Quand un joueur retire son vote
    this.onMessage(Message.UNVOTE_NOTE, (client, message: { noteId: string }) => {
      const player = this.state.players.get(client.sessionId)
      if (!player || player.zone !== 'brainstorm') return

      const note = this.brainstormNotes.get(message.noteId)
      if (!note) return

      note.votes.delete(client.sessionId)

      // Persister les votes dans SQLite
      try {
        dbUpdateVotes(message.noteId, JSON.stringify(Array.from(note.votes)))
      } catch (err) {
        console.error('Erreur persistence votes:', err)
      }

      this.broadcastToBrainstormZone(Message.VOTE_UPDATED, {
        noteId: message.noteId,
        votes: note.votes.size,
        voters: Array.from(note.votes),
      })
    })

    // Quand un joueur efface tout le tableau de brainstorm
    this.onMessage(Message.CLEAR_BOARD, (client) => {
      const player = this.state.players.get(client.sessionId)
      if (!player || player.zone !== 'brainstorm') return

      this.brainstormNotes.clear()

      // Supprimer toutes les sticky notes de la zone brainstorm dans SQLite
      try {
        clearStickyNotes('brainstorm')
      } catch (err) {
        console.error('Erreur nettoyage sticky notes:', err)
      }

      this.broadcastToBrainstormZone(Message.BOARD_CLEARED, {})
    })

    // when a player send a chat message, update the message array and broadcast to all connected clients except the sender
    this.onMessage(Message.ADD_CHAT_MESSAGE, (client, message: { content: string }) => {
      // update the message array (so that players join later can also see the message)
      this.dispatcher.dispatch(new ChatMessageUpdateCommand(), {
        client,
        content: message.content,
      })

      // Persister le message global dans SQLite
      try {
        const player = this.state.players.get(client.sessionId)
        if (player) {
          saveMessage('', null, player.name, message.content)
        }
      } catch (err) {
        console.error('Erreur persistence message global:', err)
      }

      // broadcast to all currently connected clients except the sender (to render in-game dialog on top of the character)
      this.broadcast(
        Message.ADD_CHAT_MESSAGE,
        { clientId: client.sessionId, content: message.content },
        { except: client }
      )
    })

    // Quand un joueur demande un token LiveKit pour une zone
    this.onMessage(Message.REQUEST_LIVEKIT_TOKEN, async (client, message: { zone: string }) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) return
      const zone = message.zone || player.zone
      if (!isCallZone(zone)) return
      try {
        const token = await generateToken(player.name, client.sessionId, zone)
        client.send(Message.LIVEKIT_TOKEN, { token, zone })
      } catch (err) {
        console.error('Erreur generation token LiveKit:', err)
      }
    })
  }

  // Broadcaster la liste des membres d'une zone a tous les clients dans cette zone
  private broadcastZoneMembers(zone: string) {
    const memberIds: string[] = []
    this.state.players.forEach((player, id) => {
      if (player.zone === zone) memberIds.push(id)
    })
    this.clients.forEach((cli) => {
      const p = this.state.players.get(cli.sessionId)
      if (p?.zone === zone) {
        cli.send(Message.ZONE_MEMBERS_UPDATE, { zone, memberIds })
      }
    })
  }

  // Broadcaster un message a tous les clients dans la zone 'meeting'
  private broadcastToMeetingZone(messageType: Message, data: any) {
    this.clients.forEach((cli) => {
      const p = this.state.players.get(cli.sessionId)
      if (p?.zone === 'meeting') {
        cli.send(messageType, data)
      }
    })
  }

  // Envoyer l'etat actuel des outils de reunion a un client qui rejoint la zone meeting
  private syncMeetingToolsToClient(client: Client) {
    // Synchroniser le minuteur
    client.send(Message.MEETING_TIMER_SYNC, {
      running: this.meetingToolsState.timerRunning,
      startTime: this.meetingToolsState.timerStartTime,
      duration: this.meetingToolsState.timerDuration,
    })
    // Synchroniser l'ordre du jour
    if (this.meetingToolsState.agenda) {
      client.send(Message.MEETING_AGENDA_UPDATE, {
        agenda: this.meetingToolsState.agenda,
      })
    }
    // Synchroniser les notes
    if (this.meetingToolsState.notes) {
      client.send(Message.MEETING_NOTES_UPDATE, {
        notes: this.meetingToolsState.notes,
      })
    }
  }

  // Envoyer toutes les sticky notes existantes a un client qui rejoint la zone brainstorm
  private syncBrainstormNotesToClient(client: Client) {
    // Restaurer depuis la BDD si le serveur a redemarre (notes en memoire vides)
    if (this.brainstormNotes.size === 0) {
      try {
        const dbNotes = getStickyNotes('brainstorm')
        for (const n of dbNotes) {
          const voters = JSON.parse(n.votes_json || '[]') as string[]
          this.brainstormNotes.set(n.id, {
            id: n.id,
            text: n.content,
            color: n.color,
            authorName: n.author_name,
            authorId: '', // Perdu apres redemarrage serveur
            votes: new Set(voters),
            timestamp: new Date(n.created_at).getTime(),
          })
        }
      } catch (err) {
        console.error('Erreur restauration sticky notes depuis SQLite:', err)
      }
    }

    if (this.brainstormNotes.size === 0) return
    const notes = Array.from(this.brainstormNotes.values()).map((note) => ({
      noteId: note.id,
      text: note.text,
      color: note.color,
      authorName: note.authorName,
      authorId: note.authorId,
      votes: note.votes.size,
      voters: Array.from(note.votes),
      timestamp: note.timestamp,
    }))
    client.send(Message.SYNC_BOARD, { notes })
  }

  // Envoyer un message a tous les clients dans la zone 'brainstorm'
  private broadcastToBrainstormZone(messageType: Message, data: any) {
    this.clients.forEach((cli) => {
      const p = this.state.players.get(cli.sessionId)
      if (p?.zone === 'brainstorm') {
        cli.send(messageType, data)
      }
    })
  }

  // Gerer une requete au bot IA: envoyer l'indicateur de reflexion, generer la reponse, et la broadcaster
  private async handleAiBotRequest(userName: string, prompt: string) {
    // Envoyer l'indicateur de reflexion a tous les membres de la zone brainstorm
    this.broadcastToBrainstormZone(Message.AI_BOT_THINKING, { zone: 'brainstorm' })

    try {
      const botResponse = await this.aiBotService.generateResponse(prompt, userName)
      // Envoyer la reponse du bot a tous les membres de la zone brainstorm
      this.broadcastToBrainstormZone(Message.AI_BOT_MESSAGE, {
        content: botResponse,
        zone: 'brainstorm',
      })
    } catch (error) {
      console.error('AI Bot handler error:', error)
    }
  }

  // Compter le nombre de joueurs dans une zone donnee
  private getZonePlayerCount(zone: string): number {
    let count = 0
    this.state.players.forEach((player) => {
      if (player.zone === zone) count++
    })
    return count
  }

  async onAuth(_client: Client, options: any): Promise<boolean> {
    // En production, verifier le JWT si Google SSO est configure
    if (process.env.NODE_ENV === 'production' && process.env.GOOGLE_CLIENT_ID) {
      if (!options?.token) {
        throw new ServerError(401, 'Token d\'authentification requis')
      }
      try {
        const { verifyJwt } = require('../auth/googleAuth')
        verifyJwt(options.token)
      } catch {
        throw new ServerError(401, 'Token invalide')
      }
    }
    // En dev ou si pas de Google Client ID configure, on accepte tout
    if (this.password) {
      const validPassword = await bcrypt.compare(options?.password, this.password)
      if (!validPassword) {
        throw new ServerError(403, 'Mot de passe incorrect !')
      }
    }
    return true
  }

  onJoin(client: Client): void {
    this.state.players.set(client.sessionId, new Player())
    client.send(Message.SEND_ROOM_DATA, {
      id: this.roomId,
      name: this.name,
      description: this.description,
    })

    // Envoyer l'historique de chat global depuis SQLite
    try {
      const globalHistory = getRecentMessages('')
      if (globalHistory.length > 0) {
        client.send(Message.CHAT_HISTORY, { messages: globalHistory })
      }
    } catch (err) {
      console.error('Erreur chargement historique chat:', err)
    }

    // Notifier les membres existants de la zone par defaut du nouveau joueur
    const player = this.state.players.get(client.sessionId)
    if (player?.zone) {
      this.broadcastZoneMembers(player.zone)
    }
  }

  onLeave(client: Client): void {
    // Sauvegarder la zone avant de supprimer le joueur pour broadcaster la mise a jour
    const player = this.state.players.get(client.sessionId)
    const playerZone = player?.zone

    // Si le joueur observait quelqu'un, notifier la cible
    if (player?.observingTarget) {
      const targetId = player.observingTarget
      this.clients.forEach((cli) => {
        if (cli.sessionId === targetId) {
          cli.send(Message.OBSERVER_REMOVED, { observerId: client.sessionId })
        }
      })
    }

    if (this.state.players.has(client.sessionId)) {
      this.state.players.delete(client.sessionId)
    }
    this.state.computers.forEach((computer) => {
      if (computer.connectedUser.has(client.sessionId)) {
        computer.connectedUser.delete(client.sessionId)
      }
    })
    this.state.whiteboards.forEach((whiteboard) => {
      if (whiteboard.connectedUser.has(client.sessionId)) {
        whiteboard.connectedUser.delete(client.sessionId)
      }
    })

    // Notifier les autres membres de la zone que ce joueur est parti
    if (playerZone) {
      this.broadcastZoneMembers(playerZone)
    }
  }

  onDispose(): void {
    this.state.whiteboards.forEach((whiteboard) => {
      if (whiteboardRoomIds.has(whiteboard.roomId)) whiteboardRoomIds.delete(whiteboard.roomId)
    })

    console.log('room', this.roomId, 'disposing...')
    this.dispatcher.stop()
  }
}
