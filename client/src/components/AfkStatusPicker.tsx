import React, { useState, useEffect, useCallback, useRef } from 'react'
import styled, { keyframes } from 'styled-components'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'
import { useAppSelector } from '../hooks'

const AFK_REASONS = [
  { key: 'coffee', label: 'Pause cafe', icon: '\u2615' },
  { key: 'lunch', label: 'Lunch', icon: '\uD83C\uDF7D\uFE0F' },
  { key: 'errand', label: 'Commission', icon: '\uD83D\uDEB6' },
  { key: 'wellness', label: 'Pause bien-etre', icon: '\uD83E\uDDD8' },
  { key: 'brb', label: 'De retour bientot', icon: '\u23F0' },
] as const

export { AFK_REASONS }

// ─── Animations ──────────────────────────────────────────────────────────

const fadeIn = keyframes`
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`

// ─── Styled Components ──────────────────────────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.35);
`

const PickerCard = styled(Paper)`
  && {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 101;
    background: #1a1e30;
    border: 1px solid #333;
    border-radius: 16px;
    padding: 24px 28px;
    min-width: 300px;
    max-width: 360px;
    animation: ${fadeIn} 0.2s ease-out;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  }
`

const Title = styled(Typography)`
  && {
    color: #eee;
    font-size: 16px;
    font-weight: 600;
    text-align: center;
    margin-bottom: 16px;
  }
`

const ChipGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
`

const ReasonChip = styled(Chip)`
  && {
    background: #222639;
    border: 1px solid #3a3f5a;
    color: #ddd;
    font-size: 13px;
    padding: 4px 6px;
    height: auto;
    transition: all 0.15s;

    &:hover {
      background: #14b8a6;
      border-color: #14b8a6;
      color: #fff;
    }

    .MuiChip-label {
      padding: 6px 10px;
    }
  }
`

// ─── Composant ──────────────────────────────────────────────────────────

export default function AfkStatusPicker(): JSX.Element | null {
  const [visible, setVisible] = useState(false)
  const [hasChosen, setHasChosen] = useState(false)
  const lastZoneRef = useRef('')
  const loggedIn = useAppSelector((s) => s.user.loggedIn)

  // Re-lire la zone a chaque changement dans playerZoneMap (force re-render)
  useAppSelector((s) => s.user.playerZoneMap)

  // Detecter l'entree dans la zone AFK
  useEffect(() => {
    if (!loggedIn) return

    const checkZone = () => {
      try {
        const game = phaserGame.scene.keys.game as Game
        const zone = game?.myPlayer?.currentZone || ''
        if (zone === 'afk' && lastZoneRef.current !== 'afk') {
          // Le joueur vient d'entrer dans la zone AFK
          setHasChosen(false)
          setVisible(true)
        } else if (zone !== 'afk' && lastZoneRef.current === 'afk') {
          // Le joueur quitte la zone AFK
          setVisible(false)
          setHasChosen(false)
        }
        lastZoneRef.current = zone
      } catch {
        // Phaser pas pret
      }
    }

    // Verifier immediatement et a intervalle regulier
    checkZone()
    const interval = setInterval(checkZone, 500)
    return () => clearInterval(interval)
  }, [loggedIn])

  const selectReason = useCallback((reasonKey: string) => {
    try {
      const game = phaserGame.scene.keys.game as Game
      game.network.updatePlayerAfkReason(reasonKey)
    } catch {
      // Phaser pas pret
    }
    setHasChosen(true)
    setVisible(false)
  }, [])

  const handleOverlayClick = useCallback(() => {
    // Par defaut: 'brb'
    selectReason('brb')
  }, [selectReason])

  // Fermer avec Escape (defaut 'brb')
  useEffect(() => {
    if (!visible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        selectReason('brb')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visible, selectReason])

  if (!visible || hasChosen) return null

  return (
    <>
      <Overlay onClick={handleOverlayClick} />
      <PickerCard elevation={8}>
        <Title>Vous etes en pause. Quelle est la raison ?</Title>
        <ChipGrid>
          {AFK_REASONS.map((r) => (
            <ReasonChip
              key={r.key}
              label={`${r.icon} ${r.label}`}
              onClick={() => selectReason(r.key)}
              clickable
            />
          ))}
        </ChipGrid>
      </PickerCard>
    </>
  )
}
