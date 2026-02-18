import React, { useState, useMemo, useCallback } from 'react'
import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import AddIcon from '@mui/icons-material/Add'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import SortIcon from '@mui/icons-material/Sort'
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined'
import CloseIcon from '@mui/icons-material/Close'

import { useAppSelector } from '../hooks'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'
import StickyNote from './StickyNote'
import { pushToast } from '../stores/ToastStore'
import store from '../stores'

// ─── Couleurs pastel pour les notes ──────────────────────────────────────────

const NOTE_COLORS = [
  { key: 'yellow', hex: '#fef3c7' },
  { key: 'pink', hex: '#fce7f3' },
  { key: 'blue', hex: '#dbeafe' },
  { key: 'green', hex: '#d1fae5' },
  { key: 'purple', hex: '#ede9fe' },
]

type SortMode = 'newest' | 'votes'

// ─── Styled Components ──────────────────────────────────────────────────────

const BoardWrapper = styled.div`
  position: fixed;
  top: 80px;
  left: 16px;
  width: 340px;
  max-height: calc(100vh - 120px);
  background: #1a1d30;
  border: 1px solid #333;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 45;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #eee;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #222639;
  border-bottom: 1px solid #333;
`

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;

  h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
  }
`

const NoteCountBadge = styled.span`
  background: #3b82f6;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
`

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-bottom: 1px solid #2a2e44;
`

const ToolbarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`

const SortButton = styled.button<{ $active: boolean }>`
  background: ${({ $active }) => ($active ? '#3b82f6' : 'transparent')};
  color: ${({ $active }) => ($active ? '#fff' : '#94a3b8')};
  border: 1px solid ${({ $active }) => ($active ? '#3b82f6' : '#444')};
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: ${({ $active }) => ($active ? '#2563eb' : '#333')};
    color: #fff;
  }
`

const NotesGrid = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  align-content: start;
`

const EmptyState = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 32px 16px;
  color: #64748b;

  p {
    margin: 8px 0 0;
    font-size: 13px;
  }
`

// ─── Dialog de creation ─────────────────────────────────────────────────────

const ColorPicker = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
`

const ColorSwatch = styled.button<{ $color: string; $selected: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  border: 3px solid ${({ $selected }) => ($selected ? '#3b82f6' : 'transparent')};
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;
  outline: none;

  &:hover {
    transform: scale(1.1);
    border-color: ${({ $selected }) => ($selected ? '#3b82f6' : '#94a3b8')};
  }
`

// ─── Toggle Button (pour afficher/masquer le panneau) ────────────────────────

const ToggleButton = styled.button`
  position: fixed;
  top: 80px;
  left: 16px;
  background: #222639;
  border: 1px solid #3b82f6;
  border-radius: 8px;
  color: #fff;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  z-index: 44;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: background 0.15s;

  &:hover {
    background: #2a2e44;
  }
`

// ─── Composant principal ────────────────────────────────────────────────────

export default function StickyNotesBoard(): JSX.Element | null {
  const activeZone = useAppSelector((state) => state.meeting.activeZone)
  const notes = useAppSelector((state) => state.brainstorm.notes)
  const sessionId = useAppSelector((state) => state.user.sessionId)

  const [boardVisible, setBoardVisible] = useState(true)
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [newNoteText, setNewNoteText] = useState('')
  const [newNoteColor, setNewNoteColor] = useState(NOTE_COLORS[0].hex)

  const getNetwork = () => {
    const game = phaserGame.scene.keys.game as Game
    return game.network
  }

  // Trier les notes
  const sortedNotes = useMemo(() => {
    const copy = [...notes]
    if (sortMode === 'votes') {
      copy.sort((a, b) => b.votes - a.votes || b.timestamp - a.timestamp)
    } else {
      copy.sort((a, b) => b.timestamp - a.timestamp)
    }
    return copy
  }, [notes, sortMode])

  // Handlers
  const handleAddNote = useCallback(() => {
    const text = newNoteText.trim()
    if (!text) return
    getNetwork().addStickyNote(text, newNoteColor)
    setNewNoteText('')
    setNewNoteColor(NOTE_COLORS[0].hex)
    setShowAddDialog(false)
  }, [newNoteText, newNoteColor])

  const handleVote = useCallback((noteId: string) => {
    getNetwork().voteNote(noteId)
  }, [])

  const handleDelete = useCallback((noteId: string) => {
    getNetwork().removeStickyNote(noteId)
  }, [])

  const handleClearBoard = useCallback(() => {
    getNetwork().clearBrainstormBoard()
    setShowClearConfirm(false)
  }, [])

  const handleExport = useCallback(() => {
    if (notes.length === 0) {
      store.dispatch(pushToast({ message: 'Aucune note a exporter', type: 'warning' }))
      return
    }
    const sorted = [...notes].sort((a, b) => b.votes - a.votes)
    const lines = sorted.map(
      (n, i) => `${i + 1}. [${n.votes} vote${n.votes !== 1 ? 's' : ''}] ${n.text} — ${n.authorName}`
    )
    const text = `Brainstorm — ${new Date().toLocaleDateString('fr-CA')}\n${'─'.repeat(40)}\n${lines.join('\n')}`
    navigator.clipboard.writeText(text).then(() => {
      store.dispatch(pushToast({ message: 'Notes copiees dans le presse-papiers', type: 'success' }))
    })
  }, [notes])

  // Empecher les clics de se propager au canvas Phaser en dessous
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  // Ne pas afficher si on n'est pas dans la zone brainstorm
  if (activeZone !== 'brainstorm') return null

  // ─── Toggle button quand le panneau est masque ─────────────────────────────

  if (!boardVisible) {
    return (
      <ToggleButton onClick={() => setBoardVisible(true)} onMouseDown={stopPropagation}>
        <StickyNote2OutlinedIcon sx={{ fontSize: 18 }} />
        Notes ({notes.length})
      </ToggleButton>
    )
  }

  // ─── Panneau principal ────────────────────────────────────────────────────

  return (
    <>
      <BoardWrapper onMouseDown={stopPropagation}>
        {/* En-tete */}
        <Header>
          <HeaderTitle>
            <StickyNote2OutlinedIcon sx={{ fontSize: 18, color: '#3b82f6' }} />
            <h4>Tableau de notes</h4>
            <NoteCountBadge>{notes.length}</NoteCountBadge>
          </HeaderTitle>
          <HeaderActions>
            <Tooltip title="Ajouter une note" arrow>
              <IconButton
                size="small"
                onClick={() => setShowAddDialog(true)}
                sx={{ color: '#3b82f6', padding: '4px' }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Exporter les notes" arrow>
              <IconButton
                size="small"
                onClick={handleExport}
                sx={{ color: '#94a3b8', padding: '4px' }}
              >
                <ContentCopyIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Effacer le tableau" arrow>
              <IconButton
                size="small"
                onClick={() => setShowClearConfirm(true)}
                sx={{ color: '#ef4444', padding: '4px' }}
              >
                <DeleteSweepIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Masquer" arrow>
              <IconButton
                size="small"
                onClick={() => setBoardVisible(false)}
                sx={{ color: '#999', padding: '4px' }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </HeaderActions>
        </Header>

        {/* Barre de tri */}
        <Toolbar>
          <ToolbarLeft>
            <SortIcon sx={{ fontSize: 16, color: '#64748b' }} />
            <SortButton
              $active={sortMode === 'newest'}
              onClick={() => setSortMode('newest')}
            >
              Recentes
            </SortButton>
            <SortButton
              $active={sortMode === 'votes'}
              onClick={() => setSortMode('votes')}
            >
              Top votes
            </SortButton>
          </ToolbarLeft>
        </Toolbar>

        {/* Grille des notes */}
        <NotesGrid>
          {sortedNotes.length === 0 ? (
            <EmptyState>
              <StickyNote2OutlinedIcon sx={{ fontSize: 36, color: '#475569' }} />
              <p>Aucune note pour le moment.</p>
              <p>Cliquez sur + pour en ajouter une.</p>
            </EmptyState>
          ) : (
            sortedNotes.map((note) => (
              <StickyNote
                key={note.id}
                note={note}
                isAuthor={note.authorId === sessionId}
                hasVoted={note.voters.includes(sessionId)}
                onVote={handleVote}
                onDelete={handleDelete}
              />
            ))
          )}
        </NotesGrid>
      </BoardWrapper>

      {/* Dialog d'ajout de note */}
      <Dialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            background: '#222639',
            color: '#eee',
            borderRadius: '12px',
          },
        }}
      >
        <DialogTitle sx={{ fontSize: 16, fontWeight: 600 }}>
          Nouvelle note
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            multiline
            minRows={2}
            maxRows={5}
            fullWidth
            placeholder="Votre idee..."
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleAddNote()
              }
            }}
            inputProps={{ maxLength: 300 }}
            sx={{
              mt: 1,
              '& .MuiInputBase-root': {
                color: '#eee',
                background: '#1a1d30',
                borderRadius: '8px',
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#444',
              },
            }}
          />
          <ColorPicker>
            {NOTE_COLORS.map((c) => (
              <Tooltip key={c.key} title={c.key} arrow>
                <ColorSwatch
                  $color={c.hex}
                  $selected={newNoteColor === c.hex}
                  onClick={() => setNewNoteColor(c.hex)}
                />
              </Tooltip>
            ))}
          </ColorPicker>
        </DialogContent>
        <DialogActions sx={{ padding: '8px 24px 16px' }}>
          <Button
            onClick={() => setShowAddDialog(false)}
            sx={{ color: '#94a3b8' }}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handleAddNote}
            disabled={!newNoteText.trim()}
            sx={{
              background: '#3b82f6',
              '&:hover': { background: '#2563eb' },
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmation pour effacer */}
      <Dialog
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        PaperProps={{
          sx: {
            background: '#222639',
            color: '#eee',
            borderRadius: '12px',
          },
        }}
      >
        <DialogTitle sx={{ fontSize: 16, fontWeight: 600 }}>
          Effacer le tableau ?
        </DialogTitle>
        <DialogContent>
          Toutes les notes seront supprimees pour tous les participants. Cette action est irreversible.
        </DialogContent>
        <DialogActions sx={{ padding: '8px 24px 16px' }}>
          <Button
            onClick={() => setShowClearConfirm(false)}
            sx={{ color: '#94a3b8' }}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleClearBoard}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Effacer tout
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
