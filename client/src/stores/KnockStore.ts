import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface KnockRequest {
  id: string
  knockerId: string
  knockerName: string
  message?: string
  timestamp: number
}

export interface KnockResult {
  targetId: string
  targetName: string
  response: 'accept' | 'refuse' | 'later'
  timestamp: number
}

interface KnockState {
  pendingKnocks: KnockRequest[]   // knocks recus (en tant que rep Sales)
  knockResults: KnockResult[]     // reponses a mes knocks
}

const initialState: KnockState = {
  pendingKnocks: [],
  knockResults: [],
}

let nextKnockId = 0

export const knockSlice = createSlice({
  name: 'knock',
  initialState,
  reducers: {
    addPendingKnock(
      state,
      action: PayloadAction<{
        knockerId: string
        knockerName: string
        message?: string
      }>
    ) {
      state.pendingKnocks.push({
        id: String(++nextKnockId),
        knockerId: action.payload.knockerId,
        knockerName: action.payload.knockerName,
        message: action.payload.message,
        timestamp: Date.now(),
      })
    },
    removePendingKnock(state, action: PayloadAction<string>) {
      state.pendingKnocks = state.pendingKnocks.filter((k) => k.id !== action.payload)
    },
    addKnockResult(
      state,
      action: PayloadAction<{
        targetId: string
        targetName: string
        response: 'accept' | 'refuse' | 'later'
      }>
    ) {
      state.knockResults.push({
        targetId: action.payload.targetId,
        targetName: action.payload.targetName,
        response: action.payload.response,
        timestamp: Date.now(),
      })
    },
    clearKnockResults(state) {
      state.knockResults = []
    },
  },
})

export const { addPendingKnock, removePendingKnock, addKnockResult, clearKnockResults } =
  knockSlice.actions

export default knockSlice.reducer
