import React from 'react'
import styled from 'styled-components'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import CircleIcon from '@mui/icons-material/Circle'
import { useAppSelector } from '../hooks'

// Noms francais des zones
const zoneNames: Record<string, string> = {
  hall: "Hall d'entrée",
  sales: 'Salle de ventes',
  deep_work: 'Travail profond',
  brainstorm: 'Remue-méninges',
  cafe: 'Café / Pause',
  war_room: 'Salle de stratégie',
}

// Ordre d'affichage des zones
const zoneOrder = ['hall', 'sales', 'deep_work', 'brainstorm', 'cafe', 'war_room']

const PanelWrapper = styled.div`
  position: fixed;
  top: 16px;
  right: 16px;
  width: 260px;
  max-height: 80vh;
  background: #222639ee;
  border-radius: 16px;
  box-shadow: 0px 0px 10px #0000006f;
  color: #eee;
  overflow-y: auto;
  z-index: 50;
  padding: 16px;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  h3 {
    margin: 0;
    font-size: 16px;
  }
`

const ZoneSection = styled.div`
  margin-bottom: 10px;
`

const ZoneTitle = styled.div`
  font-size: 13px;
  font-weight: bold;
  color: #14b8a6;
  margin-bottom: 4px;
  padding-bottom: 2px;
  border-bottom: 1px solid #14b8a633;
`

const PlayerRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0 3px 8px;
  font-size: 13px;
`

const PlayerName = styled.span`
  color: #eee;
`

const PlayerRole = styled.span`
  color: #999;
  font-size: 11px;
`

const CountBadge = styled.span`
  font-size: 12px;
  color: #999;
  margin-left: 4px;
`

interface UserListPanelProps {
  onClose: () => void
}

export default function UserListPanel({ onClose }: UserListPanelProps) {
  const playerNameMap = useAppSelector((state) => state.user.playerNameMap)
  const playerZoneMap = useAppSelector((state) => state.user.playerZoneMap)
  const playerRoleMap = useAppSelector((state) => state.user.playerRoleMap)

  // Regrouper les joueurs par zone
  const playersByZone: Record<string, { id: string; name: string; role: string }[]> = {}
  for (const zone of zoneOrder) {
    playersByZone[zone] = []
  }

  playerNameMap.forEach((name, id) => {
    const zone = playerZoneMap.get(id) || 'hall'
    const role = playerRoleMap.get(id) || ''
    if (!playersByZone[zone]) playersByZone[zone] = []
    playersByZone[zone].push({ id, name, role })
  })

  // +1 pour inclure le joueur local (qui n'est pas dans playerNameMap)
  const totalPlayers = playerNameMap.size + 1

  return (
    <PanelWrapper>
      <Header>
        <h3>En ligne ({totalPlayers})</h3>
        <IconButton size="small" onClick={onClose} sx={{ color: '#eee' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Header>
      {zoneOrder.map((zone) => {
        const players = playersByZone[zone]
        if (!players || players.length === 0) return null
        return (
          <ZoneSection key={zone}>
            <ZoneTitle>
              {zoneNames[zone] || zone}
              <CountBadge>({players.length})</CountBadge>
            </ZoneTitle>
            {players.map((player) => (
              <PlayerRow key={player.id}>
                <CircleIcon sx={{ fontSize: 8, color: '#4ade80' }} />
                <PlayerName>{player.name}</PlayerName>
                {player.role && <PlayerRole>· {player.role}</PlayerRole>}
              </PlayerRow>
            ))}
          </ZoneSection>
        )
      })}
    </PanelWrapper>
  )
}
