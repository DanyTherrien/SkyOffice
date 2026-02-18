import React from 'react'
import styled from 'styled-components'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import { useAppSelector } from '../hooks'
import phaserGame from '../PhaserGame'
import Game from '../scenes/Game'
import { slideUp } from '../styles/animations'

// ─── Sales Glass Room — Indicateur de statut d'activite ──────────────────────

type SalesStatus = 'on_call' | 'available' | 'preparing' | ''

const SALES_STATUSES: { key: SalesStatus; label: string; icon: string; color: string }[] = [
  { key: 'on_call', label: 'En appel', icon: '\uD83D\uDCDE', color: '#ef4444' },
  { key: 'available', label: 'Disponible', icon: '\u2705', color: '#22c55e' },
  { key: 'preparing', label: 'En preparation', icon: '\uD83D\uDCCB', color: '#eab308' },
]

const PanelCard = styled(Paper)`
  position: fixed;
  top: 80px;
  right: 16px;
  z-index: 60;
  padding: 14px 16px;
  background: #1a1e30ee !important;
  border-radius: 12px !important;
  color: #eee;
  min-width: 200px;
  animation: ${slideUp} 0.25s ease-out;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4) !important;
`

const Title = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #f59e0b;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
`

const ChipRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export default function SalesStatusIndicator(): JSX.Element | null {
  const sessionId = useAppSelector((state) => state.user.sessionId)
  const playerSalesStatusMap = useAppSelector((state) => state.user.playerSalesStatusMap)

  // Determiner la zone du joueur local via Phaser
  const game = phaserGame.scene.keys.game as Game
  const myZone = game?.myPlayer?.currentZone

  // Ne rendre le composant que si le joueur est dans la zone sales
  if (myZone !== 'sales') return null

  // Statut actuel du joueur local (via la map ou via le sanitized id)
  const sanitizedId = sessionId.replace(/[^0-9a-z]/gi, 'G')
  const currentStatus = playerSalesStatusMap.get(sanitizedId) || ''

  const handleStatusClick = (status: SalesStatus) => {
    if (!game?.network) return
    // Si on clique sur le statut deja actif, on le desactive
    const newStatus = currentStatus === status ? '' : status
    game.network.updateSalesStatus(newStatus)
  }

  return (
    <PanelCard elevation={4}>
      <Title>
        <span>{'\uD83D\uDCCA'}</span> Mon statut Sales
      </Title>
      <ChipRow>
        {SALES_STATUSES.map(({ key, label, icon, color }) => {
          const isActive = currentStatus === key
          return (
            <Chip
              key={key}
              label={`${icon} ${label}`}
              onClick={() => handleStatusClick(key)}
              variant={isActive ? 'filled' : 'outlined'}
              sx={{
                justifyContent: 'flex-start',
                color: isActive ? '#fff' : '#ccc',
                backgroundColor: isActive ? `${color}44` : 'transparent',
                borderColor: isActive ? color : '#444',
                fontWeight: isActive ? 600 : 400,
                fontSize: '12px',
                '&:hover': {
                  backgroundColor: `${color}33`,
                  borderColor: color,
                },
                transition: 'all 0.15s',
              }}
            />
          )
        })}
      </ChipRow>
    </PanelCard>
  )
}
