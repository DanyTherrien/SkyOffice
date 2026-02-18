import { enableMapSet } from 'immer'
import { configureStore } from '@reduxjs/toolkit'
import userReducer from './UserStore'
import computerReducer from './ComputerStore'
import whiteboardReducer from './WhiteboardStore'
import chatReducer from './ChatStore'
import roomReducer from './RoomStore'
import meetingReducer from './MeetingStore'
import mediaSettingsReducer from './MediaSettingsStore'
import notificationReducer from './NotificationStore'
import toastReducer from './ToastStore'
import deferredMessageReducer from './DeferredMessageStore'
import knockReducer from './KnockStore'
import observeReducer from './ObserveStore'
import boothInviteReducer from './BoothInviteStore'
import recordingReducer from './RecordingStore'
import meetingToolsReducer from './MeetingToolsStore'
import brainstormReducer from './BrainstormStore'
import dashboardReducer from './DashboardStore'
import analyticsReducer from './AnalyticsStore'
import badgeReducer from './BadgeStore'

enableMapSet()

const store = configureStore({
  reducer: {
    user: userReducer,
    computer: computerReducer,
    whiteboard: whiteboardReducer,
    chat: chatReducer,
    room: roomReducer,
    meeting: meetingReducer,
    mediaSettings: mediaSettingsReducer,
    notification: notificationReducer,
    toast: toastReducer,
    deferredMessage: deferredMessageReducer,
    knock: knockReducer,
    observe: observeReducer,
    boothInvite: boothInviteReducer,
    recording: recordingReducer,
    meetingTools: meetingToolsReducer,
    brainstorm: brainstormReducer,
    dashboard: dashboardReducer,
    analytics: analyticsReducer,
    badge: badgeReducer,
  },
  // Temporary disable serialize check for redux as we store MediaStream in ComputerStore.
  // https://stackoverflow.com/a/63244831
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch

// Persister les parametres media et notifications dans localStorage a chaque changement
const MEDIA_SETTINGS_KEY = 'capturia-media-settings'
const NOTIF_SETTINGS_KEY = 'capturia-notification-prefs'
store.subscribe(() => {
  try {
    const { dialogOpen, ...mediaSettings } = store.getState().mediaSettings
    localStorage.setItem(MEDIA_SETTINGS_KEY, JSON.stringify(mediaSettings))
    const notifSettings = store.getState().notification
    localStorage.setItem(NOTIF_SETTINGS_KEY, JSON.stringify(notifSettings))
  } catch {
    // Silencieusement ignorer (quota depasse, mode prive, etc.)
  }
})

export default store
