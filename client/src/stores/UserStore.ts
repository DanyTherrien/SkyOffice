import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { sanitizeId } from '../util'
import { BackgroundMode } from '../../../types/BackgroundMode'

import phaserGame from '../PhaserGame'
import Bootstrap from '../scenes/Bootstrap'

export function getInitialBackgroundMode() {
  const currentHour = new Date().getHours()
  return currentHour > 6 && currentHour <= 18 ? BackgroundMode.DAY : BackgroundMode.NIGHT
}

export const userSlice = createSlice({
  name: 'user',
  initialState: {
    backgroundMode: getInitialBackgroundMode(),
    sessionId: '',
    videoConnected: false,
    loggedIn: false,
    playerNameMap: new Map<string, string>(),
    playerZoneMap: new Map<string, string>(),
    playerRoleMap: new Map<string, string>(),
    playerStatusMap: new Map<string, string>(),
    showJoystick: window.innerWidth < 650,
  },
  reducers: {
    toggleBackgroundMode: (state) => {
      const newMode =
        state.backgroundMode === BackgroundMode.DAY ? BackgroundMode.NIGHT : BackgroundMode.DAY

      state.backgroundMode = newMode
      const bootstrap = phaserGame.scene.keys.bootstrap as Bootstrap
      bootstrap.changeBackgroundMode(newMode)
    },
    setSessionId: (state, action: PayloadAction<string>) => {
      state.sessionId = action.payload
    },
    setVideoConnected: (state, action: PayloadAction<boolean>) => {
      state.videoConnected = action.payload
    },
    setLoggedIn: (state, action: PayloadAction<boolean>) => {
      state.loggedIn = action.payload
    },
    setPlayerNameMap: (state, action: PayloadAction<{ id: string; name: string }>) => {
      state.playerNameMap.set(sanitizeId(action.payload.id), action.payload.name)
    },
    removePlayerNameMap: (state, action: PayloadAction<string>) => {
      state.playerNameMap.delete(sanitizeId(action.payload))
    },
    setPlayerZoneMap: (state, action: PayloadAction<{ id: string; zone: string }>) => {
      state.playerZoneMap.set(sanitizeId(action.payload.id), action.payload.zone)
    },
    removePlayerZoneMap: (state, action: PayloadAction<string>) => {
      state.playerZoneMap.delete(sanitizeId(action.payload))
    },
    setPlayerRoleMap: (state, action: PayloadAction<{ id: string; role: string }>) => {
      state.playerRoleMap.set(sanitizeId(action.payload.id), action.payload.role)
    },
    removePlayerRoleMap: (state, action: PayloadAction<string>) => {
      state.playerRoleMap.delete(sanitizeId(action.payload))
    },
    setPlayerStatusMap: (state, action: PayloadAction<{ id: string; status: string }>) => {
      state.playerStatusMap.set(sanitizeId(action.payload.id), action.payload.status)
    },
    removePlayerStatusMap: (state, action: PayloadAction<string>) => {
      state.playerStatusMap.delete(sanitizeId(action.payload))
    },
    setShowJoystick: (state, action: PayloadAction<boolean>) => {
      state.showJoystick = action.payload
    },
  },
})

export const {
  toggleBackgroundMode,
  setSessionId,
  setVideoConnected,
  setLoggedIn,
  setPlayerNameMap,
  removePlayerNameMap,
  setPlayerZoneMap,
  removePlayerZoneMap,
  setPlayerRoleMap,
  removePlayerRoleMap,
  setPlayerStatusMap,
  removePlayerStatusMap,
  setShowJoystick,
} = userSlice.actions

export default userSlice.reducer
