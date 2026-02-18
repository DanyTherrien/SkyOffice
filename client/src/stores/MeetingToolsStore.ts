import { createSlice, PayloadAction } from '@reduxjs/toolkit'

/**
 * Store Redux pour les outils de reunion structuree (Meeting Room).
 * Gere le minuteur partage, l'ordre du jour et les notes collaboratives.
 * L'etat est synchronise via le serveur Colyseus pour que tous les participants
 * de la zone 'meeting' voient les memes donnees.
 */

interface MeetingToolsState {
  // Minuteur partage
  timerRunning: boolean
  timerStartTime: number | null     // epoch ms quand le minuteur a demarre
  timerDuration: number | null      // duree cible en secondes (null = chronometre ascendant)

  // Ordre du jour
  agenda: string

  // Notes collaboratives
  notes: string

  // UI: panneau ouvert/ferme
  panelOpen: boolean
}

const initialState: MeetingToolsState = {
  timerRunning: false,
  timerStartTime: null,
  timerDuration: null,
  agenda: '',
  notes: '',
  panelOpen: false,
}

export const meetingToolsSlice = createSlice({
  name: 'meetingTools',
  initialState,
  reducers: {
    // Demarre le minuteur avec un temps de depart et une duree optionnelle
    startTimer: (state, action: PayloadAction<{ startTime: number; duration: number | null }>) => {
      state.timerRunning = true
      state.timerStartTime = action.payload.startTime
      state.timerDuration = action.payload.duration
    },
    // Arrete le minuteur
    stopTimer: (state) => {
      state.timerRunning = false
    },
    // Reinitialise le minuteur completement
    resetTimer: (state) => {
      state.timerRunning = false
      state.timerStartTime = null
      state.timerDuration = null
    },
    // Definit la duree cible du minuteur (avant de demarrer)
    setTimerDuration: (state, action: PayloadAction<number | null>) => {
      state.timerDuration = action.payload
    },
    // Synchronise l'etat du minuteur depuis le serveur
    syncTimer: (state, action: PayloadAction<{ running: boolean; startTime: number | null; duration: number | null }>) => {
      state.timerRunning = action.payload.running
      state.timerStartTime = action.payload.startTime
      state.timerDuration = action.payload.duration
    },
    // Met a jour l'ordre du jour
    setAgenda: (state, action: PayloadAction<string>) => {
      state.agenda = action.payload
    },
    // Met a jour les notes collaboratives
    setNotes: (state, action: PayloadAction<string>) => {
      state.notes = action.payload
    },
    // Ouvre/ferme le panneau d'outils
    togglePanel: (state) => {
      state.panelOpen = !state.panelOpen
    },
    setPanelOpen: (state, action: PayloadAction<boolean>) => {
      state.panelOpen = action.payload
    },
    // Reinitialise tout l'etat des outils (quand on quitte la zone meeting)
    clearMeetingTools: (state) => {
      state.timerRunning = false
      state.timerStartTime = null
      state.timerDuration = null
      state.agenda = ''
      state.notes = ''
      state.panelOpen = false
    },
  },
})

export const {
  startTimer,
  stopTimer,
  resetTimer,
  setTimerDuration,
  syncTimer,
  setAgenda,
  setNotes,
  togglePanel,
  setPanelOpen,
  clearMeetingTools,
} = meetingToolsSlice.actions

export default meetingToolsSlice.reducer
