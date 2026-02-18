import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useAppSelector, useAppDispatch } from '../hooks'
import { clearKnockResults } from '../stores/KnockStore'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'
import { fadeIn } from '../styles/animations'

const KnockBtn = styled.button`
  background: #f59e0b22;
  border: 1px solid #f59e0b44;
  border-radius: 6px;
  color: #f59e0b;
  font-size: 10px;
  padding: 2px 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  transition: all 0.15s;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    background: #f59e0b33;
    border-color: #f59e0b;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const DoorIcon = styled.span`
  font-size: 11px;
`

const FeedbackText = styled.div<{ $type: 'accept' | 'refuse' | 'later' | 'pending' }>`
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 6px;
  animation: ${fadeIn} 0.2s ease-out;
  white-space: nowrap;
  color: ${({ $type }) =>
    $type === 'accept'
      ? '#4ade80'
      : $type === 'refuse'
        ? '#ef4444'
        : $type === 'later'
          ? '#f59e0b'
          : '#9ca3af'};
  background: ${({ $type }) =>
    $type === 'accept'
      ? '#4ade8022'
      : $type === 'refuse'
        ? '#ef444422'
        : $type === 'later'
          ? '#f59e0b22'
          : '#9ca3af22'};
`

interface KnockButtonProps {
  targetId: string
  targetName: string
}

export default function KnockButton({ targetId, targetName }: KnockButtonProps): JSX.Element {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [waitingFor, setWaitingFor] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    type: 'accept' | 'refuse' | 'later'
    name: string
  } | null>(null)

  const knockResults = useAppSelector((state) => state.knock.knockResults)
  const dispatch = useAppDispatch()

  // Surveiller les resultats de knock pour la cible
  useEffect(() => {
    if (!waitingFor) return
    const result = knockResults.find((r) => r.targetId === waitingFor)
    if (result) {
      setFeedback({ type: result.response, name: result.targetName })
      setWaitingFor(null)
      dispatch(clearKnockResults())
      // Auto-dismiss le feedback apres 5 secondes
      const timer = setTimeout(() => setFeedback(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [knockResults, waitingFor, dispatch])

  const handleKnock = useCallback(() => {
    setDialogOpen(true)
  }, [])

  const handleSend = useCallback(() => {
    try {
      const game = phaserGame.scene.keys.game as Game
      game.network.sendKnock(targetId, message || undefined)
      setWaitingFor(targetId)
      setDialogOpen(false)
      setMessage('')
    } catch {
      // Scene pas encore prete
    }
  }, [targetId, message])

  const handleClose = useCallback(() => {
    setDialogOpen(false)
    setMessage('')
  }, [])

  // Afficher le feedback si present
  if (feedback) {
    const feedbackMessages = {
      accept: `${feedback.name} vous attend !`,
      refuse: `${feedback.name} n'est pas disponible`,
      later: `${feedback.name} vous rappellera dans 5 min`,
    }
    return <FeedbackText $type={feedback.type}>{feedbackMessages[feedback.type]}</FeedbackText>
  }

  // Afficher "en attente" si on attend la reponse
  if (waitingFor) {
    return <FeedbackText $type="pending">En attente...</FeedbackText>
  }

  return (
    <>
      <KnockBtn onClick={handleKnock}>
        <DoorIcon>&#128682;</DoorIcon> Frapper
      </KnockBtn>

      <Dialog
        open={dialogOpen}
        onClose={handleClose}
        PaperProps={{
          sx: {
            background: '#1e2240',
            color: '#eee',
            borderRadius: '12px',
            minWidth: 320,
          },
        }}
      >
        <DialogTitle sx={{ fontSize: 15, fontWeight: 600, pb: 1 }}>
          Frapper a la porte de {targetName}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2, fontSize: 12 }}>
            Ajoutez un message optionnel pour expliquer la raison de votre visite.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            placeholder="Ex: J'ai une question rapide sur le devis..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSend()
              }
            }}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#eee',
                fontSize: 13,
                '& fieldset': { borderColor: '#3a3f5a' },
                '&:hover fieldset': { borderColor: '#f59e0b88' },
                '&.Mui-focused fieldset': { borderColor: '#f59e0b' },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} sx={{ color: '#999', textTransform: 'none', fontSize: 12 }}>
            Annuler
          </Button>
          <Button
            onClick={handleSend}
            variant="contained"
            sx={{
              background: '#f59e0b',
              color: '#000',
              textTransform: 'none',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: '8px',
              '&:hover': { background: '#d97706' },
            }}
          >
            Frapper
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
