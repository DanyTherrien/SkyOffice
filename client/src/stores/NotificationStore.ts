import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { NOTIFICATION_PREFS_KEY } from '../constants'

export interface NotificationState {
  /** Sons de notification actives */
  soundEnabled: boolean
  /** Notifications desktop (API Notification) activees */
  desktopEnabled: boolean
  /** Permission desktop deja demandee */
  desktopPermissionAsked: boolean
}

function loadFromStorage(): Partial<NotificationState> {
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {}
}

const defaults: NotificationState = {
  soundEnabled: true,
  desktopEnabled: false,
  desktopPermissionAsked: false,
}

const initialState: NotificationState = {
  ...defaults,
  ...loadFromStorage(),
}

export const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    setSoundEnabled(state, action: PayloadAction<boolean>) {
      state.soundEnabled = action.payload
    },
    setDesktopEnabled(state, action: PayloadAction<boolean>) {
      state.desktopEnabled = action.payload
    },
    setDesktopPermissionAsked(state, action: PayloadAction<boolean>) {
      state.desktopPermissionAsked = action.payload
    },
  },
})

export const {
  setSoundEnabled,
  setDesktopEnabled,
  setDesktopPermissionAsked,
} = notificationSlice.actions

export default notificationSlice.reducer
