import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface DeferredMessage {
  id: string           // identifiant unique (Date.now + random)
  type: 'chat' | 'zone_enter' | 'zone_leave' | 'knock'
  from: string         // nom du joueur
  content: string      // contenu du message ou description de l'evenement
  zone: string         // zone concernee
  timestamp: number    // moment de l'evenement
}

interface DeferredMessageState {
  messages: DeferredMessage[]
  isQueuing: boolean   // true quand le joueur est en deep_work ou afk
}

const initialState: DeferredMessageState = {
  messages: [],
  isQueuing: false,
}

export const deferredMessageSlice = createSlice({
  name: 'deferredMessage',
  initialState,
  reducers: {
    startQueuing: (state) => {
      state.isQueuing = true
    },
    stopQueuing: (state) => {
      state.isQueuing = false
    },
    addDeferredMessage: (state, action: PayloadAction<Omit<DeferredMessage, 'id'>>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      state.messages.push({ ...action.payload, id })
    },
    clearDeferredMessages: (state) => {
      state.messages = []
    },
  },
})

export const {
  startQueuing,
  stopQueuing,
  addDeferredMessage,
  clearDeferredMessages,
} = deferredMessageSlice.actions

export default deferredMessageSlice.reducer
