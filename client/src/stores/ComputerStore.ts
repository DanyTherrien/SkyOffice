import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import ShareScreenManager from '../web/ShareScreenManager'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'

interface ComputerState {
  computerDialogOpen: boolean
  computerId: null | string
  myStream: null | MediaStream
  shareScreenManager: null | ShareScreenManager
}

const initialState: ComputerState = {
  computerDialogOpen: false,
  computerId: null,
  myStream: null,
  shareScreenManager: null,
}

export const computerSlice = createSlice({
  name: 'computer',
  initialState,
  reducers: {
    openComputerDialog: (
      state,
      action: PayloadAction<{ computerId: string; myUserId: string }>
    ) => {
      if (!state.shareScreenManager) {
        state.shareScreenManager = new ShareScreenManager(action.payload.myUserId)
      }
      const game = phaserGame.scene.keys.game as Game
      game.disableKeys()
      state.shareScreenManager.onOpen()
      state.computerDialogOpen = true
      state.computerId = action.payload.computerId
    },
    closeComputerDialog: (state) => {
      const game = phaserGame.scene.keys.game as Game
      game.enableKeys()
      if (state.computerId) {
        game.network.disconnectFromComputer(state.computerId)
      }
      state.shareScreenManager?.onClose()
      state.computerDialogOpen = false
      state.myStream = null
      state.computerId = null
    },
    setMyStream: (state, action: PayloadAction<null | MediaStream>) => {
      state.myStream = action.payload
    },
  },
})

export const {
  closeComputerDialog,
  openComputerDialog,
  setMyStream,
} = computerSlice.actions

export default computerSlice.reducer
