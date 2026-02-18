import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface ActivityEvent {
  id: string
  playerName: string
  zone: string
  previousZone: string
  timestamp: number
  details?: string // statut sales, raison AFK, etc.
}

interface DashboardState {
  isOpen: boolean
  activityFeed: ActivityEvent[] // derniers 50 evenements
}

const MAX_ACTIVITY_EVENTS = 50

const initialState: DashboardState = {
  isOpen: false,
  activityFeed: [],
}

export const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    toggleDashboard: (state) => {
      state.isOpen = !state.isOpen
    },
    openDashboard: (state) => {
      state.isOpen = true
    },
    closeDashboard: (state) => {
      state.isOpen = false
    },
    addActivityEvent: (state, action: PayloadAction<ActivityEvent>) => {
      state.activityFeed.unshift(action.payload)
      // Garder seulement les derniers 50 evenements
      if (state.activityFeed.length > MAX_ACTIVITY_EVENTS) {
        state.activityFeed = state.activityFeed.slice(0, MAX_ACTIVITY_EVENTS)
      }
    },
    clearActivityFeed: (state) => {
      state.activityFeed = []
    },
  },
})

export const {
  toggleDashboard,
  openDashboard,
  closeDashboard,
  addActivityEvent,
  clearActivityFeed,
} = dashboardSlice.actions

export default dashboardSlice.reducer
