import React, { useEffect, useCallback } from 'react'
import styled from 'styled-components'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { useAppSelector, useAppDispatch } from '../hooks'
import { removePendingKnock } from '../stores/KnockStore'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'
import { slideInRight } from '../styles/animations'

const NotificationStack = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 200;
  display: flex;
  flex-direction: column-reverse;
  gap: 12px;
  max-height: 60vh;
  overflow-y: auto;
  pointer-events: none;

  & > * {
    pointer-events: auto;
  }
`

const KnockCard = styled(Paper)`
  && {
    padding: 16px;
    min-width: 300px;
    max-width: 360px;
    background: #1e2240;
    border: 1px solid #3a3f5a;
    border-left: 4px solid #f59e0b;
    border-radius: 12px;
    animation: ${slideInRight} 0.3s ease-out;
  }
`

const KnockHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`

const DoorIcon = styled.span`
  font-size: 20px;
`

const KnockMessage = styled(Typography)`
  && {
    color: #9ca3af;
    font-size: 12px;
    font-style: italic;
    margin-bottom: 12px;
    padding: 6px 10px;
    background: rgba(255, 255, 255, 0.04);
    border-radius: 6px;
  }
`

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
`

const AcceptButton = styled(Button)`
  && {
    background: #16a34a;
    color: #fff;
    font-size: 12px;
    text-transform: none;
    padding: 4px 12px;
    border-radius: 8px;

    &:hover {
      background: #15803d;
    }
  }
`

const RefuseButton = styled(Button)`
  && {
    background: #dc2626;
    color: #fff;
    font-size: 12px;
    text-transform: none;
    padding: 4px 12px;
    border-radius: 8px;

    &:hover {
      background: #b91c1c;
    }
  }
`

const LaterButton = styled(Button)`
  && {
    background: #d97706;
    color: #fff;
    font-size: 12px;
    text-transform: none;
    padding: 4px 12px;
    border-radius: 8px;

    &:hover {
      background: #b45309;
    }
  }
`

const TimerBar = styled.div<{ $duration: number }>`
  height: 2px;
  background: #f59e0b;
  margin-top: 10px;
  border-radius: 1px;
  animation: shrink ${({ $duration }) => $duration}ms linear forwards;

  @keyframes shrink {
    from { width: 100%; }
    to { width: 0%; }
  }
`

const AUTO_DISMISS_MS = 30_000

export default function KnockNotification(): JSX.Element | null {
  const pendingKnocks = useAppSelector((state) => state.knock.pendingKnocks)
  const dispatch = useAppDispatch()

  const handleRespond = useCallback(
    (knockId: string, knockerId: string, response: 'accept' | 'refuse' | 'later') => {
      try {
        const game = phaserGame.scene.keys.game as Game
        game.network.sendKnockResponse(knockerId, response)
      } catch {
        // Scene pas encore prete
      }
      dispatch(removePendingKnock(knockId))
    },
    [dispatch]
  )

  // Auto-dismiss apres 30 secondes (compte comme 'refuse')
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    for (const knock of pendingKnocks) {
      const elapsed = Date.now() - knock.timestamp
      const remaining = Math.max(AUTO_DISMISS_MS - elapsed, 0)
      const timer = setTimeout(() => {
        handleRespond(knock.id, knock.knockerId, 'refuse')
      }, remaining)
      timers.push(timer)
    }
    return () => timers.forEach(clearTimeout)
  }, [pendingKnocks, handleRespond])

  if (pendingKnocks.length === 0) return null

  return (
    <NotificationStack>
      {pendingKnocks.map((knock) => (
        <KnockCard key={knock.id} elevation={6}>
          <KnockHeader>
            <DoorIcon>&#128682;</DoorIcon>
            <Typography sx={{ color: '#eee', fontWeight: 600, fontSize: 14 }}>
              {knock.knockerName} frappe a la porte
            </Typography>
          </KnockHeader>
          {knock.message && (
            <KnockMessage variant="body2">
              &laquo; {knock.message} &raquo;
            </KnockMessage>
          )}
          <ButtonRow>
            <AcceptButton
              size="small"
              onClick={() => handleRespond(knock.id, knock.knockerId, 'accept')}
            >
              Accepter
            </AcceptButton>
            <RefuseButton
              size="small"
              onClick={() => handleRespond(knock.id, knock.knockerId, 'refuse')}
            >
              Refuser
            </RefuseButton>
            <LaterButton
              size="small"
              onClick={() => handleRespond(knock.id, knock.knockerId, 'later')}
            >
              Dans 5 min
            </LaterButton>
          </ButtonRow>
          <TimerBar $duration={AUTO_DISMISS_MS} />
        </KnockCard>
      ))}
    </NotificationStack>
  )
}
