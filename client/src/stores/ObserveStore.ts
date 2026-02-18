import { createSlice, PayloadAction } from '@reduxjs/toolkit'

/**
 * Store Redux pour le mode observation / shadow (Sales Room).
 * Gere l'etat d'observation du joueur local et la liste des observateurs.
 */

interface ObserveState {
  isObserving: boolean
  observingTargetId: string
  observingTargetName: string
  observers: Array<{ id: string; name: string }> // personnes qui m'observent
}

const initialState: ObserveState = {
  isObserving: false,
  observingTargetId: '',
  observingTargetName: '',
  observers: [],
}

export const observeSlice = createSlice({
  name: 'observe',
  initialState,
  reducers: {
    // Le joueur local commence a observer quelqu'un
    startObserving: (
      state,
      action: PayloadAction<{ targetId: string; targetName: string }>
    ) => {
      state.isObserving = true
      state.observingTargetId = action.payload.targetId
      state.observingTargetName = action.payload.targetName
    },
    // Le joueur local arrete d'observer
    stopObserving: (state) => {
      state.isObserving = false
      state.observingTargetId = ''
      state.observingTargetName = ''
    },
    // Quelqu'un commence a m'observer
    addObserver: (state, action: PayloadAction<{ id: string; name: string }>) => {
      // Eviter les doublons
      if (!state.observers.find((o) => o.id === action.payload.id)) {
        state.observers.push(action.payload)
      }
    },
    // Quelqu'un arrete de m'observer
    removeObserver: (state, action: PayloadAction<string>) => {
      state.observers = state.observers.filter((o) => o.id !== action.payload)
    },
    // Reinitialiser la liste des observateurs
    clearObservers: (state) => {
      state.observers = []
    },
  },
})

export const { startObserving, stopObserving, addObserver, removeObserver, clearObservers } =
  observeSlice.actions

export default observeSlice.reducer
