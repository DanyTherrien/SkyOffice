import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface BoothInvite {
  inviterId: string
  inviterName: string
  timestamp: number
}

interface BoothInviteState {
  pendingInvite: BoothInvite | null
  waitingForResponse: boolean
  lastResult: { targetName: string; accepted: boolean } | null
}

const initialState: BoothInviteState = {
  pendingInvite: null,
  waitingForResponse: false,
  lastResult: null,
}

export const boothInviteSlice = createSlice({
  name: 'boothInvite',
  initialState,
  reducers: {
    setInvite(state, action: PayloadAction<BoothInvite>) {
      state.pendingInvite = action.payload
    },
    clearInvite(state) {
      state.pendingInvite = null
    },
    setWaiting(state, action: PayloadAction<boolean>) {
      state.waitingForResponse = action.payload
    },
    setResult(state, action: PayloadAction<{ targetName: string; accepted: boolean }>) {
      state.lastResult = action.payload
      state.waitingForResponse = false
    },
    clearResult(state) {
      state.lastResult = null
    },
  },
})

export const { setInvite, clearInvite, setWaiting, setResult, clearResult } =
  boothInviteSlice.actions

export default boothInviteSlice.reducer
