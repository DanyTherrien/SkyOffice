import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface StickyNote {
  id: string
  text: string
  color: string
  authorName: string
  authorId: string
  votes: number
  voters: string[]
  timestamp: number
}

interface BrainstormState {
  notes: StickyNote[]
  selectedNoteId: string | null
}

const initialState: BrainstormState = {
  notes: [],
  selectedNoteId: null,
}

export const brainstormSlice = createSlice({
  name: 'brainstorm',
  initialState,
  reducers: {
    addNote(state, action: PayloadAction<StickyNote>) {
      state.notes.push(action.payload)
    },
    removeNote(state, action: PayloadAction<string>) {
      state.notes = state.notes.filter((n) => n.id !== action.payload)
    },
    updateVotes(
      state,
      action: PayloadAction<{ noteId: string; votes: number; voters: string[] }>
    ) {
      const note = state.notes.find((n) => n.id === action.payload.noteId)
      if (note) {
        note.votes = action.payload.votes
        note.voters = action.payload.voters
      }
    },
    clearBoard(state) {
      state.notes = []
      state.selectedNoteId = null
    },
    setNotes(state, action: PayloadAction<StickyNote[]>) {
      state.notes = action.payload
    },
    setSelectedNoteId(state, action: PayloadAction<string | null>) {
      state.selectedNoteId = action.payload
    },
  },
})

export const { addNote, removeNote, updateVotes, clearBoard, setNotes, setSelectedNoteId } =
  brainstormSlice.actions

export default brainstormSlice.reducer
