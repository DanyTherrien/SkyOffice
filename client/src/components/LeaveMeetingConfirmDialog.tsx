import React from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'

import { useAppSelector, useAppDispatch } from '../hooks'
import { setShowLeaveConfirmDialog, setOverlayOpen } from '../stores/MeetingStore'
import { liveKitService } from '../web/LiveKitService'

const zoneNames: Record<string, string> = {
  brainstorm: 'Remue-meninges',
  meeting: 'Salle de reunion',
  deep_work: 'Travail profond',
  sales: 'Salle de ventes',
}

export default function LeaveMeetingConfirmDialog(): JSX.Element {
  const dispatch = useAppDispatch()
  const show = useAppSelector((state) => state.meeting.showLeaveConfirmDialog)
  const activeZone = useAppSelector((state) => state.meeting.activeZone)

  const displayName = activeZone ? zoneNames[activeZone] || activeZone : ''

  const handleCancel = () => {
    dispatch(setShowLeaveConfirmDialog(false))
  }

  const handleLeave = () => {
    dispatch(setShowLeaveConfirmDialog(false))
    dispatch(setOverlayOpen(false))
    liveKitService.disconnect()
  }

  return (
    <Dialog
      open={show}
      onClose={handleCancel}
      PaperProps={{
        sx: {
          background: '#222639',
          color: '#eee',
          borderRadius: '12px',
          minWidth: 320,
        },
      }}
    >
      <DialogTitle>Quitter la reunion ?</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: '#ccc' }}>
          Vous allez vous deconnecter de {displayName}. Continuer ?
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ padding: '12px 24px 16px' }}>
        <Button
          onClick={handleCancel}
          variant="outlined"
          sx={{ color: '#ccc', borderColor: '#555' }}
        >
          Annuler
        </Button>
        <Button
          onClick={handleLeave}
          variant="contained"
          sx={{ background: '#d32f2f', '&:hover': { background: '#b71c1c' } }}
          autoFocus
        >
          Quitter
        </Button>
      </DialogActions>
    </Dialog>
  )
}
