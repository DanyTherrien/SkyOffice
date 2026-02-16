import { createSlice, PayloadAction } from '@reduxjs/toolkit'

const STORAGE_KEY = 'capturia-media-settings'

export interface MediaSettingsState {
  /** ID du peripherique camera ('' = defaut systeme) */
  selectedCameraId: string
  /** ID du peripherique microphone ('' = defaut systeme) */
  selectedMicrophoneId: string
  /** ID du peripherique haut-parleur ('' = defaut systeme) */
  selectedSpeakerId: string

  /** Activer la suppression du bruit */
  noiseSuppression: boolean
  /** Activer l'annulation d'echo */
  echoCancellation: boolean
  /** Activer le controle automatique du gain */
  autoGainControl: boolean

  /** Miroir horizontal de la camera locale */
  mirrorCamera: boolean
  /** Volume du haut-parleur (0.0 a 1.0) */
  speakerVolume: number

  /** Dialog ouvert */
  dialogOpen: boolean
}

/** Charge les parametres depuis localStorage */
function loadFromStorage(): Partial<MediaSettingsState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // Ignore les erreurs de parsing
  }
  return {}
}

const defaults: MediaSettingsState = {
  selectedCameraId: '',
  selectedMicrophoneId: '',
  selectedSpeakerId: '',
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
  mirrorCamera: true,
  speakerVolume: 1.0,
  dialogOpen: false,
}

const initialState: MediaSettingsState = {
  ...defaults,
  ...loadFromStorage(),
  dialogOpen: false, // Toujours ferme au demarrage
}

export const mediaSettingsSlice = createSlice({
  name: 'mediaSettings',
  initialState,
  reducers: {
    setSelectedCamera(state, action: PayloadAction<string>) {
      state.selectedCameraId = action.payload
    },
    setSelectedMicrophone(state, action: PayloadAction<string>) {
      state.selectedMicrophoneId = action.payload
    },
    setSelectedSpeaker(state, action: PayloadAction<string>) {
      state.selectedSpeakerId = action.payload
    },
    setNoiseSuppression(state, action: PayloadAction<boolean>) {
      state.noiseSuppression = action.payload
    },
    setEchoCancellation(state, action: PayloadAction<boolean>) {
      state.echoCancellation = action.payload
    },
    setAutoGainControl(state, action: PayloadAction<boolean>) {
      state.autoGainControl = action.payload
    },
    setMirrorCamera(state, action: PayloadAction<boolean>) {
      state.mirrorCamera = action.payload
    },
    setSpeakerVolume(state, action: PayloadAction<number>) {
      state.speakerVolume = Math.max(0, Math.min(1, action.payload))
    },
    openMediaSettings(state) {
      state.dialogOpen = true
    },
    closeMediaSettings(state) {
      state.dialogOpen = false
    },
  },
})

export const {
  setSelectedCamera,
  setSelectedMicrophone,
  setSelectedSpeaker,
  setNoiseSuppression,
  setEchoCancellation,
  setAutoGainControl,
  setMirrorCamera,
  setSpeakerVolume,
  openMediaSettings,
  closeMediaSettings,
} = mediaSettingsSlice.actions

export default mediaSettingsSlice.reducer
