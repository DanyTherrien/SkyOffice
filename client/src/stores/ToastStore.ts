import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface Toast {
  id: string
  message: string
  type: 'info' | 'success' | 'warning'
}

interface ToastState {
  toasts: Toast[]
}

const initialState: ToastState = {
  toasts: [],
}

let nextId = 0

export const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    pushToast(state, action: PayloadAction<{ message: string; type?: Toast['type'] }>) {
      state.toasts.push({
        id: String(++nextId),
        message: action.payload.message,
        type: action.payload.type || 'info',
      })
      // Garder max 5 toasts pour eviter l'accumulation
      if (state.toasts.length > 5) {
        state.toasts.shift()
      }
    },
    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload)
    },
  },
})

export const { pushToast, removeToast } = toastSlice.actions

export default toastSlice.reducer
