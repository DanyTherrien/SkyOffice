import { createSlice, PayloadAction } from '@reduxjs/toolkit'

/**
 * Store Redux pour le systeme de reunions par zone.
 * Gere les streams video/audio, le partage d'ecran et l'etat de l'overlay de meeting.
 */

interface MeetingState {
  activeZone: string | null // zone de meeting active (null si deep_work ou deconnecte)
  overlayOpen: boolean // overlay visible
  overlayMinimized: boolean // overlay minimise en barre compacte

  myVideoStream: MediaStream | null
  myScreenStream: MediaStream | null
  micEnabled: boolean // micro desactive par defaut (opt-in)
  cameraEnabled: boolean // camera desactivee par defaut (opt-in)

  // Streams video des pairs (webcam) — cle = sessionId sanitize
  peerVideoStreams: Map<string, { stream: MediaStream; playerName: string }>
  // Streams screen share des pairs — cle = sessionId sanitize
  peerScreenStreams: Map<string, { stream: MediaStream; playerName: string }>

  focusedScreenId: string | null // ecran en focus (null = vue grille)
  zoneMemberIds: string[] // membres dans notre zone (du serveur)

  // Etat de connexion par pair (pour les indicateurs visuels dans VideoTileGrid)
  peerConnectionStates: Map<string, 'connecting' | 'connected' | 'error'>

  // Portail pre-reunion : preview media avant de joindre une zone
  showMeetingPreview: boolean
  pendingZone: string | null // zone en attente de confirmation
  mediaError: string | null // erreur media non-bloquante (remplace window.alert)

  // Banniere non-bloquante d'entree en zone de reunion
  showZoneEntryBanner: boolean
  bannerZoneName: string | null

  // Dialog de confirmation avant de quitter une reunion
  showLeaveConfirmDialog: boolean

  // IDs des pairs en train de parler (pour l'indicateur sur les avatars)
  speakingPeerIds: Set<string>
}

const initialState: MeetingState = {
  activeZone: null,
  overlayOpen: false,
  overlayMinimized: false,
  myVideoStream: null,
  myScreenStream: null,
  micEnabled: false,
  cameraEnabled: false,
  peerVideoStreams: new Map(),
  peerScreenStreams: new Map(),
  focusedScreenId: null,
  zoneMemberIds: [],
  peerConnectionStates: new Map(),
  showMeetingPreview: false,
  pendingZone: null,
  mediaError: null,
  showZoneEntryBanner: false,
  bannerZoneName: null,
  showLeaveConfirmDialog: false,
  speakingPeerIds: new Set(),
}

export const meetingSlice = createSlice({
  name: 'meeting',
  initialState,
  reducers: {
    // Definit la zone active. Si null ou 'deep_work', ferme l'overlay automatiquement.
    setActiveZone: (state, action: PayloadAction<string | null>) => {
      state.activeZone = action.payload
      if (action.payload === null || action.payload === 'deep_work') {
        state.overlayOpen = false
      }
    },
    setOverlayOpen: (state, action: PayloadAction<boolean>) => {
      state.overlayOpen = action.payload
    },
    setOverlayMinimized: (state, action: PayloadAction<boolean>) => {
      state.overlayMinimized = action.payload
    },
    setMyVideoStream: (state, action: PayloadAction<MediaStream | null>) => {
      state.myVideoStream = action.payload
    },
    setMyScreenStream: (state, action: PayloadAction<MediaStream | null>) => {
      state.myScreenStream = action.payload
    },
    // Bascule l'etat du micro
    toggleMic: (state) => {
      state.micEnabled = !state.micEnabled
    },
    // Bascule l'etat de la camera
    toggleCamera: (state) => {
      state.cameraEnabled = !state.cameraEnabled
    },
    // Ajoute le stream video (webcam) d'un pair
    addPeerVideoStream: (
      state,
      action: PayloadAction<{ id: string; stream: MediaStream; playerName: string }>
    ) => {
      state.peerVideoStreams.set(action.payload.id, {
        stream: action.payload.stream,
        playerName: action.payload.playerName,
      })
    },
    // Retire le stream video d'un pair par son id
    removePeerVideoStream: (state, action: PayloadAction<string>) => {
      state.peerVideoStreams.delete(action.payload)
    },
    // Ajoute le stream de partage d'ecran d'un pair
    addPeerScreenStream: (
      state,
      action: PayloadAction<{ id: string; stream: MediaStream; playerName: string }>
    ) => {
      state.peerScreenStreams.set(action.payload.id, {
        stream: action.payload.stream,
        playerName: action.payload.playerName,
      })
    },
    // Retire le stream de partage d'ecran d'un pair. Reinitialise le focus si necessaire.
    removePeerScreenStream: (state, action: PayloadAction<string>) => {
      state.peerScreenStreams.delete(action.payload)
      if (state.focusedScreenId === action.payload) {
        state.focusedScreenId = null
      }
    },
    // Definit l'ecran en focus (null = vue grille)
    setFocusedScreen: (state, action: PayloadAction<string | null>) => {
      state.focusedScreenId = action.payload
    },
    // Met a jour la liste des membres dans la zone (provient du serveur)
    setZoneMemberIds: (state, action: PayloadAction<string[]>) => {
      state.zoneMemberIds = action.payload
    },
    // Portail pre-reunion
    setShowMeetingPreview: (state, action: PayloadAction<boolean>) => {
      state.showMeetingPreview = action.payload
    },
    setPendingZone: (state, action: PayloadAction<string | null>) => {
      state.pendingZone = action.payload
    },
    setMediaError: (state, action: PayloadAction<string | null>) => {
      state.mediaError = action.payload
    },
    // Met a jour l'etat de connexion d'un pair (connecting → connected → error)
    setPeerConnectionState: (
      state,
      action: PayloadAction<{ id: string; status: 'connecting' | 'connected' | 'error' }>
    ) => {
      state.peerConnectionStates.set(action.payload.id, action.payload.status)
    },
    // Retire l'etat de connexion d'un pair (quand il quitte la zone)
    removePeerConnectionState: (state, action: PayloadAction<string>) => {
      state.peerConnectionStates.delete(action.payload)
    },
    // Banniere d'entree en zone de reunion
    setShowZoneEntryBanner: (state, action: PayloadAction<boolean>) => {
      state.showZoneEntryBanner = action.payload
      if (!action.payload) state.bannerZoneName = null
    },
    setBannerZoneName: (state, action: PayloadAction<string | null>) => {
      state.bannerZoneName = action.payload
    },
    // Dialog de confirmation de sortie de reunion
    setShowLeaveConfirmDialog: (state, action: PayloadAction<boolean>) => {
      state.showLeaveConfirmDialog = action.payload
    },
    // Mettre a jour l'etat de parole d'un pair
    setPeerSpeaking: (state, action: PayloadAction<{ id: string; speaking: boolean }>) => {
      if (action.payload.speaking) {
        state.speakingPeerIds.add(action.payload.id)
      } else {
        state.speakingPeerIds.delete(action.payload.id)
      }
    },
    // Reinitialise tout l'etat du meeting (utilise en quittant une zone)
    clearMeetingState: (state) => {
      state.activeZone = null
      state.overlayOpen = false
      state.overlayMinimized = false
      state.myVideoStream = null
      state.myScreenStream = null
      state.micEnabled = false
      state.cameraEnabled = false
      state.peerVideoStreams.clear()
      state.peerScreenStreams.clear()
      state.peerConnectionStates.clear()
      state.focusedScreenId = null
      state.zoneMemberIds = []
      state.showMeetingPreview = false
      state.pendingZone = null
      state.mediaError = null
      state.showZoneEntryBanner = false
      state.bannerZoneName = null
      state.showLeaveConfirmDialog = false
      state.speakingPeerIds.clear()
    },
  },
})

export const {
  setActiveZone,
  setOverlayOpen,
  setOverlayMinimized,
  setMyVideoStream,
  setMyScreenStream,
  toggleMic,
  toggleCamera,
  addPeerVideoStream,
  removePeerVideoStream,
  addPeerScreenStream,
  removePeerScreenStream,
  setFocusedScreen,
  setZoneMemberIds,
  setShowMeetingPreview,
  setPendingZone,
  setMediaError,
  setPeerConnectionState,
  removePeerConnectionState,
  setShowZoneEntryBanner,
  setBannerZoneName,
  setShowLeaveConfirmDialog,
  setPeerSpeaking,
  clearMeetingState,
} = meetingSlice.actions

export default meetingSlice.reducer
