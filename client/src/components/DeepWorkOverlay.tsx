import React, { useState, useEffect, useRef } from 'react'
import styled, { keyframes } from 'styled-components'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Button from '@mui/material/Button'
import TimerIcon from '@mui/icons-material/Timer'
import LogoutIcon from '@mui/icons-material/Logout'
import { useAppSelector } from '../hooks'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'
import { slideDown } from '../styles/animations'

// ─── Deep Work Overlay — Banniere mode focus ───────────────────────────────

const dndPulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`

const BannerWrapper = styled.div`
  position: fixed;
  top: 36px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 58;
  animation: ${slideDown} 0.35s ease-out;
  pointer-events: auto;
`

const BannerContent = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: #1a1e30ee;
  border: 1px solid #8b5cf644;
  border-radius: 12px;
  padding: 8px 16px;
  color: #eee;
  font-size: 13px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  white-space: nowrap;
`

const DndIconPulse = styled.span`
  font-size: 16px;
  animation: ${dndPulse} 2.5s ease-in-out infinite;
`

const ModeLabel = styled.span`
  font-weight: 600;
  color: #8b5cf6;
`

const ElapsedTime = styled.span`
  color: #888;
  font-size: 12px;
  font-family: 'JetBrains Mono', 'Courier New', monospace;
`

const Separator = styled.span`
  color: #444;
  font-size: 10px;
`

const ActionButton = styled(Button)`
  && {
    font-size: 11px;
    padding: 2px 10px;
    border-radius: 8px;
    text-transform: none;
    min-width: 0;
  }
`

// ─── Component ─────────────────────────────────────────────────────────────

interface DeepWorkOverlayProps {
  onTogglePomodoro: () => void
  pomodoroVisible: boolean
}

export default function DeepWorkOverlay({ onTogglePomodoro, pomodoroVisible }: DeepWorkOverlayProps): JSX.Element | null {
  const loggedIn = useAppSelector((state) => state.user.loggedIn)
  const [currentZone, setCurrentZone] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const entryTimeRef = useRef<number>(0)

  // Detecter la zone courante du joueur local (polling legers)
  useEffect(() => {
    if (!loggedIn) return
    const check = () => {
      try {
        const game = phaserGame.scene.keys.game as Game
        const zone = game?.myPlayer?.currentZone || ''
        setCurrentZone(zone)
      } catch {
        // Phaser pas pret
      }
    }
    check()
    const interval = setInterval(check, 1000)
    return () => clearInterval(interval)
  }, [loggedIn])

  // Tracker le temps ecoule dans deep_work
  useEffect(() => {
    if (currentZone === 'deep_work') {
      if (entryTimeRef.current === 0) {
        entryTimeRef.current = Date.now()
      }
      const tick = setInterval(() => {
        setElapsed(Math.floor((Date.now() - entryTimeRef.current) / 1000))
      }, 1000)
      return () => clearInterval(tick)
    } else {
      entryTimeRef.current = 0
      setElapsed(0)
    }
  }, [currentZone])

  if (!loggedIn || currentZone !== 'deep_work') return null

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <BannerWrapper>
      <BannerContent>
        <DndIconPulse>🔇</DndIconPulse>
        <ModeLabel>Mode Travail profond</ModeLabel>
        <Separator>|</Separator>
        <ElapsedTime>{formatElapsed(elapsed)}</ElapsedTime>
        <Separator>|</Separator>
        <Tooltip title={pomodoroVisible ? 'Masquer le Pomodoro' : 'Afficher le Pomodoro'} arrow>
          <ActionButton
            variant={pomodoroVisible ? 'contained' : 'outlined'}
            size="small"
            startIcon={<TimerIcon sx={{ fontSize: 14 }} />}
            onClick={onTogglePomodoro}
            sx={{
              borderColor: '#8b5cf644',
              color: pomodoroVisible ? '#fff' : '#8b5cf6',
              backgroundColor: pomodoroVisible ? '#8b5cf6' : 'transparent',
              '&:hover': {
                borderColor: '#8b5cf6',
                backgroundColor: pomodoroVisible ? '#7c3aed' : '#8b5cf611',
              },
            }}
          >
            Pomodoro
          </ActionButton>
        </Tooltip>
        <Tooltip title="Quitter le mode focus (deplacez-vous hors de la zone)" arrow>
          <IconButton
            size="small"
            sx={{ color: '#666', padding: '4px' }}
          >
            <LogoutIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </BannerContent>
    </BannerWrapper>
  )
}
