import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { IChatMessage } from '../../../types/IOfficeState'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'
import { ZONE_NAMES } from '../constants'

export enum MessageType {
  PLAYER_JOINED,
  PLAYER_LEFT,
  REGULAR_MESSAGE,
  ZONE_ENTER,
  ZONE_LEAVE,
  BOT_MESSAGE,
}

export const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    chatMessages: new Array<{ messageType: MessageType; chatMessage: IChatMessage; zone: string }>(),
    focused: false,
    showChat: true,
    chatTab: 'zone' as 'zone' | 'general',
    unreadGeneralCount: 0,
    unreadZoneCount: 0,
    botTyping: false,
  },
  reducers: {
    pushChatMessage: (state, action: PayloadAction<IChatMessage>) => {
      state.chatMessages.push({
        messageType: MessageType.REGULAR_MESSAGE,
        chatMessage: action.payload,
        zone: action.payload.zone || '',
      })
      // Incrementer les compteurs de non-lus
      const zone = action.payload.zone || ''
      if (zone === '' && state.chatTab !== 'general') {
        state.unreadGeneralCount++
      }
      if (zone !== '' && state.chatTab !== 'zone') {
        state.unreadZoneCount++
      }
    },
    pushPlayerJoinedMessage: (state, action: PayloadAction<string>) => {
      state.chatMessages.push({
        messageType: MessageType.PLAYER_JOINED,
        chatMessage: {
          createdAt: new Date().getTime(),
          author: action.payload,
          content: 'a rejoint le bureau',
        } as IChatMessage,
        zone: '',
      })
    },
    pushPlayerLeftMessage: (state, action: PayloadAction<string>) => {
      state.chatMessages.push({
        messageType: MessageType.PLAYER_LEFT,
        chatMessage: {
          createdAt: new Date().getTime(),
          author: action.payload,
          content: 'a quitte le bureau',
        } as IChatMessage,
        zone: '',
      })
    },
    pushZoneEnterMessage: (
      state,
      action: PayloadAction<{ name: string; zone: string }>
    ) => {
      state.chatMessages.push({
        messageType: MessageType.ZONE_ENTER,
        chatMessage: {
          createdAt: new Date().getTime(),
          author: action.payload.name,
          content: `est entre(e) dans ${ZONE_NAMES[action.payload.zone] || action.payload.zone}`,
        } as IChatMessage,
        zone: action.payload.zone,
      })
    },
    pushZoneLeaveMessage: (
      state,
      action: PayloadAction<{ name: string; zone: string }>
    ) => {
      state.chatMessages.push({
        messageType: MessageType.ZONE_LEAVE,
        chatMessage: {
          createdAt: new Date().getTime(),
          author: action.payload.name,
          content: `a quitte ${ZONE_NAMES[action.payload.zone] || action.payload.zone}`,
        } as IChatMessage,
        zone: action.payload.zone,
      })
    },
    pushAfkEnterMessage: (state, action: PayloadAction<string>) => {
      state.chatMessages.push({
        messageType: MessageType.ZONE_ENTER,
        chatMessage: {
          createdAt: new Date().getTime(),
          author: action.payload,
          content: 'est en pause',
        } as IChatMessage,
        zone: 'afk',
      })
    },
    pushAfkLeaveMessage: (state, action: PayloadAction<string>) => {
      state.chatMessages.push({
        messageType: MessageType.ZONE_LEAVE,
        chatMessage: {
          createdAt: new Date().getTime(),
          author: action.payload,
          content: 'est de retour',
        } as IChatMessage,
        zone: 'afk',
      })
    },
    pushBotMessage: (state, action: PayloadAction<string>) => {
      state.chatMessages.push({
        messageType: MessageType.BOT_MESSAGE,
        chatMessage: {
          createdAt: new Date().getTime(),
          author: 'Crea \uD83E\uDD16',
          content: action.payload,
        } as IChatMessage,
        zone: 'brainstorm',
      })
      // Incrementer le compteur non-lu si on n'est pas sur l'onglet zone
      if (state.chatTab !== 'zone') {
        state.unreadZoneCount++
      }
      // Desactiver l'indicateur de reflexion
      state.botTyping = false
    },
    setBotTyping: (state, action: PayloadAction<boolean>) => {
      state.botTyping = action.payload
    },
    setChatTab: (state, action: PayloadAction<'zone' | 'general'>) => {
      state.chatTab = action.payload
      if (action.payload === 'general') {
        state.unreadGeneralCount = 0
      } else {
        state.unreadZoneCount = 0
      }
    },
    clearUnreadGeneral: (state) => {
      state.unreadGeneralCount = 0
    },
    clearUnreadZone: (state) => {
      state.unreadZoneCount = 0
    },
    setFocused: (state, action: PayloadAction<boolean>) => {
      const game = phaserGame.scene.keys.game as Game
      action.payload ? game.disableKeys() : game.enableKeys()
      state.focused = action.payload

      // 3A — Envoyer le statut de typing au serveur + mettre a jour le sprite local
      game.myPlayer?.updateTypingIndicator(action.payload)
      game.network?.sendTypingStatus(action.payload)
    },
    setShowChat: (state, action: PayloadAction<boolean>) => {
      state.showChat = action.payload
    },
  },
})

export const {
  pushChatMessage,
  pushPlayerJoinedMessage,
  pushPlayerLeftMessage,
  pushZoneEnterMessage,
  pushZoneLeaveMessage,
  pushAfkEnterMessage,
  pushAfkLeaveMessage,
  pushBotMessage,
  setBotTyping,
  setChatTab,
  clearUnreadGeneral,
  clearUnreadZone,
  setFocused,
  setShowChat,
} = chatSlice.actions

export default chatSlice.reducer
