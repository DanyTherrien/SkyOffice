import { createSlice, PayloadAction } from '@reduxjs/toolkit'

/**
 * Store Redux pour l'enregistrement audio des reunions.
 * Gere l'etat de l'enregistrement local et distant (notification de consentement).
 */

interface RecordingState {
  isRecording: boolean // un enregistrement est en cours (local ou distant)
  recorderName: string // nom de la personne qui enregistre
  startTime: number | null // timestamp du debut de l'enregistrement
  isLocalRecording: boolean // c'est moi qui enregistre
}

const initialState: RecordingState = {
  isRecording: false,
  recorderName: '',
  startTime: null,
  isLocalRecording: false,
}

export const recordingSlice = createSlice({
  name: 'recording',
  initialState,
  reducers: {
    // Demarre un enregistrement local (je suis l'enregistreur)
    startRecording: (state, action: PayloadAction<{ recorderName: string }>) => {
      state.isRecording = true
      state.recorderName = action.payload.recorderName
      state.startTime = Date.now()
      state.isLocalRecording = true
    },
    // Arrete l'enregistrement local
    stopRecording: (state) => {
      state.isRecording = false
      state.recorderName = ''
      state.startTime = null
      state.isLocalRecording = false
    },
    // Un autre joueur a demarre un enregistrement (notification de consentement)
    setRemoteRecording: (state, action: PayloadAction<{ recorderName: string }>) => {
      state.isRecording = true
      state.recorderName = action.payload.recorderName
      state.startTime = Date.now()
      // Ne pas ecraser isLocalRecording si c'est moi qui ai demarre
      // (le serveur broadcaster aussi a l'enregistreur)
    },
    // Un autre joueur a arrete l'enregistrement
    clearRemoteRecording: (state) => {
      state.isRecording = false
      state.recorderName = ''
      state.startTime = null
      state.isLocalRecording = false
    },
  },
})

export const {
  startRecording,
  stopRecording,
  setRemoteRecording,
  clearRemoteRecording,
} = recordingSlice.actions

export default recordingSlice.reducer
