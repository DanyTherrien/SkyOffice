import React, { useEffect, useCallback, useRef } from 'react'
import styled from 'styled-components'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { useAppSelector, useAppDispatch } from '../hooks'
import { clearInvite, clearResult, setWaiting } from '../stores/BoothInviteStore'
import { pushToast } from '../stores/ToastStore'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'
import { scaleIn } from '../styles/animations'

// Coordonnees du centre de la zone one_on_one
const BOOTH_X = 631
const BOOTH_Y = 144

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  pointer-events: none;
`

const InviteCard = styled(Paper)`
  && {
    pointer-events: auto;
    padding: 24px;
    min-width: 340px;
    max-width: 400px;
    background: #1e2240;
    border: 1px solid #3a3f5a;
    border-top: 4px solid #ec4899;
    border-radius: 14px;
    animation: ${scaleIn} 0.25s ease-out;
    text-align: center;
  }
`

const DoorIcon = styled.span`
  font-size: 28px;
  display: block;
  margin-bottom: 8px;
`

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 16px;
`

const AcceptButton = styled(Button)`
  && {
    background: #16a34a;
    color: #fff;
    font-size: 13px;
    text-transform: none;
    padding: 6px 20px;
    border-radius: 8px;
    font-weight: 600;

    &:hover {
      background: #15803d;
    }
  }
`

const RefuseButton = styled(Button)`
  && {
    background: #dc2626;
    color: #fff;
    font-size: 13px;
    text-transform: none;
    padding: 6px 20px;
    border-radius: 8px;
    font-weight: 600;

    &:hover {
      background: #b91c1c;
    }
  }
`

const TimerBar = styled.div<{ $duration: number }>`
  height: 3px;
  background: #ec4899;
  margin-top: 14px;
  border-radius: 2px;
  animation: shrink ${({ $duration }) => $duration}ms linear forwards;

  @keyframes shrink {
    from { width: 100%; }
    to { width: 0%; }
  }
`

const AUTO_DISMISS_MS = 20_000

function teleportToBooth() {
  try {
    const game = phaserGame.scene.keys.game as Game
    if (game?.myPlayer) {
      game.myPlayer.setPosition(BOOTH_X, BOOTH_Y)
    }
  } catch {
    // Scene pas encore prete
  }
}

export default function BoothInviteNotification(): JSX.Element | null {
  const pendingInvite = useAppSelector((state) => state.boothInvite.pendingInvite)
  const lastResult = useAppSelector((state) => state.boothInvite.lastResult)
  const dispatch = useAppDispatch()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleRespond = useCallback(
    (accepted: boolean) => {
      if (!pendingInvite) return
      try {
        const game = phaserGame.scene.keys.game as Game
        game.network.respondToBoothInvite(pendingInvite.inviterId, accepted)
      } catch {
        // Scene pas encore prete
      }
      if (accepted) {
        teleportToBooth()
      }
      dispatch(clearInvite())
    },
    [pendingInvite, dispatch]
  )

  // Auto-dismiss apres 20 secondes (compte comme refus)
  useEffect(() => {
    if (!pendingInvite) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      handleRespond(false)
    }, AUTO_DISMISS_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [pendingInvite, handleRespond])

  // Quand le resultat de l'invitation arrive (pour l'inviteur)
  useEffect(() => {
    if (!lastResult) return
    if (lastResult.accepted) {
      dispatch(
        pushToast({
          message: `${lastResult.targetName} a accepte votre invitation 1-on-1`,
          type: 'success',
        })
      )
      teleportToBooth()
    } else {
      dispatch(
        pushToast({
          message: `${lastResult.targetName} a decline votre invitation 1-on-1`,
          type: 'warning',
        })
      )
    }
    dispatch(setWaiting(false))
    dispatch(clearResult())
  }, [lastResult, dispatch])

  if (!pendingInvite) return null

  return (
    <Overlay>
      <InviteCard elevation={8}>
        <DoorIcon>&#128682;</DoorIcon>
        <Typography sx={{ color: '#eee', fontWeight: 700, fontSize: 16, mb: 0.5 }}>
          Invitation 1-on-1
        </Typography>
        <Typography sx={{ color: '#ccc', fontSize: 14 }}>
          <strong>{pendingInvite.inviterName}</strong> vous invite pour un 1-on-1
        </Typography>
        <ButtonRow>
          <AcceptButton size="small" onClick={() => handleRespond(true)}>
            Accepter
          </AcceptButton>
          <RefuseButton size="small" onClick={() => handleRespond(false)}>
            Refuser
          </RefuseButton>
        </ButtonRow>
        <TimerBar $duration={AUTO_DISMISS_MS} />
      </InviteCard>
    </Overlay>
  )
}
